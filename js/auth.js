import { auth, db } from '/Chatz/js/firebaseConfig.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref,
  set,
  get,
  serverTimestamp,
  update,
  onDisconnect,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class AuthHandler {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = new Set();
    this.userDataListeners = new Set();
    this.profileModal = null;
    this.init();
  }

  init() {
    // Set up profile modal
    this.setupProfileModal();

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.setupUserData(user);
        await this.setupOnlineStatus(user);
      } else {
        this.currentUser = null;
        this.cleanupUserData();
      }
      this.notifyAuthStateListeners(user);
    });
  }

  setupProfileModal() {
    // Get modal elements
    this.profileModal = document.getElementById('profileModal');
    this.closeButton = document.getElementById('closeProfileModal');
    this.saveButton = document.getElementById('saveProfile');
    this.usernameInput = document.getElementById('profileUsername');
    this.statusInput = document.getElementById('profileStatus');
    this.avatarInput = document.getElementById('profileAvatar');
    this.avatarPreview = document.getElementById('avatarPreview');

    // Set up event listeners
    this.closeButton?.addEventListener('click', () => this.hideProfileModal());
    this.saveButton?.addEventListener('click', () => this.saveProfile());
    this.avatarInput?.addEventListener('change', (e) => this.handleAvatarChange(e));
  }

  async setupUserData(user) {
    const userRef = ref(db, `users/${user.uid}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      // Create new user data
      await set(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        online: true
      });
    } else {
      // Update existing user data
      await update(userRef, {
        lastSeen: serverTimestamp(),
        online: true,
        photoURL: user.photoURL,
        displayName: user.displayName
      });
    }

    // Listen for user data changes
    onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      this.notifyUserDataListeners(userData);
      this.updateProfileUI(userData);
    });
  }

  async setupOnlineStatus(user) {
    const userStatusRef = ref(db, `users/${user.uid}/online`);
    const lastSeenRef = ref(db, `users/${user.uid}/lastSeen`);

    // Set user as online
    await set(userStatusRef, true);

    // Set up disconnect handling
    onDisconnect(userStatusRef).set(false);
    onDisconnect(lastSeenRef).set(serverTimestamp());
  }

  cleanupUserData() {
    // Clean up any listeners or data when user signs out
    this.userDataListeners.clear();
    this.hideProfileModal();
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      if (this.currentUser) {
        const userRef = ref(db, `users/${this.currentUser.uid}`);
        await update(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Profile Modal Methods
  showProfileModal() {
    if (this.profileModal) {
      this.profileModal.style.display = 'block';
      this.loadProfile();
    }
  }

  hideProfileModal() {
    if (this.profileModal) {
      this.profileModal.style.display = 'none';
    }
  }

  async loadProfile() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        this.updateProfileUI(userData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile');
    }
  }

  updateProfileUI(userData) {
    if (!this.profileModal) return;

    // Update form fields
    if (this.usernameInput) {
      this.usernameInput.value = userData.username || '';
    }
    if (this.statusInput) {
      this.statusInput.value = userData.status || '';
    }
    if (this.avatarPreview) {
      this.avatarPreview.src = userData.photoURL || 'default-avatar.png';
    }
  }

  async saveProfile() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const username = this.usernameInput?.value.trim();
    const status = this.statusInput?.value.trim();
    const avatarUrl = this.avatarPreview?.src;

    if (!username) {
      alert('Username is required');
      return;
    }

    try {
      // Check if username is taken
      if (username !== currentUser.displayName) {
        const usernameRef = ref(db, 'usernames');
        const snapshot = await get(usernameRef);
        
        if (snapshot.exists()) {
          const usernames = snapshot.val();
          if (usernames[username] && usernames[username] !== currentUser.uid) {
            alert('Username is already taken');
            return;
          }
        }
      }

      // Update user data
      const updates = {};
      updates[`users/${currentUser.uid}`] = {
        username,
        status,
        photoURL: avatarUrl,
        updatedAt: serverTimestamp()
      };
      updates[`usernames/${username}`] = currentUser.uid;

      // Remove old username if changed
      if (currentUser.displayName && currentUser.displayName !== username) {
        updates[`usernames/${currentUser.displayName}`] = null;
      }

      await update(ref(db), updates);
      this.hideProfileModal();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    }
  }

  handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.avatarPreview) {
        this.avatarPreview.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  // Event Listener Methods
  onAuthStateChanged(callback) {
    this.authStateListeners.add(callback);
    if (this.currentUser) {
      callback(this.currentUser);
    }
    return () => this.authStateListeners.delete(callback);
  }

  onUserDataChange(callback) {
    this.userDataListeners.add(callback);
    return () => this.userDataListeners.delete(callback);
  }

  notifyAuthStateListeners(user) {
    this.authStateListeners.forEach(callback => callback(user));
  }

  notifyUserDataListeners(userData) {
    this.userDataListeners.forEach(callback => callback(userData));
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Create and export a single instance
export const authHandler = new AuthHandler(); 