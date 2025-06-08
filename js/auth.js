import { auth, db } from './firebaseConfig.js';
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
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class AuthHandler {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = new Set();
    this.userDataListeners = new Set();
    this.init();
  }

  init() {
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