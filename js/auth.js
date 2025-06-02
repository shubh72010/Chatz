import { auth, db } from '../firebaseConfig.js';
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
  update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class AuthHandler {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = new Set();
    this.init();
  }

  init() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        // Update user's online status and basic info
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        const existingData = snapshot.exists() ? snapshot.val() : {};
        
        // Only update basic info if it doesn't exist or has changed
        const updates = {
          online: true,
          lastActive: serverTimestamp()
        };

        // Only update these fields if they don't exist or have changed
        if (!existingData.displayName || existingData.displayName !== user.displayName) {
          updates.displayName = user.displayName;
        }
        if (!existingData.email || existingData.email !== user.email) {
          updates.email = user.email;
        }
        if (!existingData.photoURL || existingData.photoURL !== user.photoURL) {
          updates.photoURL = user.photoURL;
        }

        // Update with only the changed fields
        await update(userRef, updates);
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      if (this.currentUser) {
        // Update user's online status before signing out
        const userRef = ref(db, `users/${this.currentUser.uid}`);
        await set(userRef, {
          online: false,
          lastActive: serverTimestamp()
        }, { merge: true });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  onAuthStateChanged(listener) {
    this.authStateListeners.add(listener);
    // Immediately call with current state
    if (this.currentUser) {
      listener(this.currentUser);
    }
    return () => this.authStateListeners.delete(listener);
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Create and export a single instance
export const authHandler = new AuthHandler(); 