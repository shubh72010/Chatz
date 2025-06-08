// Profile Modal Module
import { authHandler } from './auth.js';
import { db } from './firebaseConfig.js';
import {
  ref,
  update,
  get,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class ProfileModal {
  constructor() {
    this.modal = document.getElementById('profileModal');
    this.closeButton = document.getElementById('closeProfileModal');
    this.saveButton = document.getElementById('saveProfile');
    this.usernameInput = document.getElementById('profileUsername');
    this.statusInput = document.getElementById('profileStatus');
    this.avatarInput = document.getElementById('profileAvatar');
    this.avatarPreview = document.getElementById('avatarPreview');
    this.init();
  }

  init() {
    // Set up event listeners
    this.closeButton?.addEventListener('click', () => this.hide());
    this.saveButton?.addEventListener('click', () => this.saveProfile());
    this.avatarInput?.addEventListener('change', (e) => this.handleAvatarChange(e));

    // Listen for auth state changes
    authHandler.onAuthStateChanged((user) => {
      if (user) {
        this.loadProfile();
      } else {
        this.hide();
      }
    });

    // Listen for user data changes
    authHandler.onUserDataChange((userData) => {
      if (userData) {
        this.updateUI(userData);
      }
    });
  }

  async loadProfile() {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser) return;

    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        this.updateUI(userData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile');
    }
  }

  updateUI(userData) {
    if (!this.modal) return;

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
    const currentUser = authHandler.getCurrentUser();
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
      this.hide();
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

  show() {
    if (this.modal) {
      this.modal.style.display = 'block';
    }
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}

// Create and export a single instance
export const profileModal = new ProfileModal(); 