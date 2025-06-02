// Friend System Module
import { app } from '../firebaseConfig.js';
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const auth = getAuth(app);
const db = getDatabase(app);

class FriendSystem {
  constructor() {
    this.currentUser = null;
    this.friends = new Map();
    this.pendingRequests = new Map();
    this.friendListeners = new Set();
    this.requestListeners = new Set();
    this.init();
  }

  init() {
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (user) {
        this.setupFriendListeners();
        this.setupRequestListeners();
      } else {
        this.friends.clear();
        this.pendingRequests.clear();
      }
    });
  }

  setupFriendListeners() {
    // Listen for friend list changes
    const friendsRef = ref(db, `friends/${this.currentUser.uid}`);
    onValue(friendsRef, (snapshot) => {
      this.friends.clear();
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const friendData = childSnapshot.val();
          this.friends.set(childSnapshot.key, {
            ...friendData,
            id: childSnapshot.key
          });
        });
      }
      this.notifyFriendListeners();
    });

    // Listen for incoming friend requests
    const requestsRef = ref(db, `friend_requests/${this.currentUser.uid}`);
    onValue(requestsRef, (snapshot) => {
      this.pendingRequests.clear();
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const requestData = childSnapshot.val();
          this.pendingRequests.set(childSnapshot.key, {
            ...requestData,
            id: childSnapshot.key
          });
        });
      }
      this.notifyRequestListeners();
    });
  }

  setupRequestListeners() {
    // Listen for friend request settings changes
    const userRef = ref(db, `users/${this.currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        this.friendRequestSettings = userData.friendRequests || 'everyone';
      }
    });
  }

  // Friend request methods
  async sendFriendRequest(userId) {
    if (!this.currentUser || !userId) return false;

    try {
      // Check if already friends
      const isFriend = await this.checkFriendship(userId);
      if (isFriend) return false;

      // Check if request already exists
      const requestRef = ref(db, `friend_requests/${userId}/${this.currentUser.uid}`);
      const requestSnapshot = await get(requestRef);
      if (requestSnapshot.exists()) return false;

      // Get user's friend request settings
      const userRef = ref(db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) return false;

      const userData = userSnapshot.val();
      const settings = userData.friendRequests || 'everyone';

      // Check if request is allowed based on settings
      if (settings === 'none') return false;
      if (settings === 'friends-of-friends') {
        const isFriendsOfFriends = await this.checkFriendsOfFriends(userId);
        if (!isFriendsOfFriends) return false;
      }

      // Send friend request
      await set(requestRef, {
        from: this.currentUser.uid,
        fromName: this.currentUser.displayName,
        fromPhoto: this.currentUser.photoURL,
        timestamp: serverTimestamp(),
        status: 'pending'
      });

      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async acceptFriendRequest(requestId) {
    if (!this.currentUser || !requestId) return false;

    try {
      const requestRef = ref(db, `friend_requests/${this.currentUser.uid}/${requestId}`);
      const requestSnapshot = await get(requestRef);
      
      if (!requestSnapshot.exists()) return false;
      
      const requestData = requestSnapshot.val();
      
      // Add to friends list for both users
      const timestamp = serverTimestamp();
      await set(ref(db, `friends/${this.currentUser.uid}/${requestId}`), {
        timestamp,
        status: 'accepted'
      });
      
      await set(ref(db, `friends/${requestId}/${this.currentUser.uid}`), {
        timestamp,
        status: 'accepted'
      });

      // Remove the request
      await remove(requestRef);

      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async declineFriendRequest(requestId) {
    if (!this.currentUser || !requestId) return false;

    try {
      const requestRef = ref(db, `friend_requests/${this.currentUser.uid}/${requestId}`);
      await remove(requestRef);
      return true;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  }

  async removeFriend(userId) {
    if (!this.currentUser || !userId) return false;

    try {
      // Remove from both users' friend lists
      await remove(ref(db, `friends/${this.currentUser.uid}/${userId}`));
      await remove(ref(db, `friends/${userId}/${this.currentUser.uid}`));
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  // Helper methods
  async checkFriendship(userId) {
    if (!this.currentUser || !userId) return false;
    const friendRef = ref(db, `friends/${this.currentUser.uid}/${userId}`);
    const snapshot = await get(friendRef);
    return snapshot.exists();
  }

  async checkFriendsOfFriends(userId) {
    if (!this.currentUser || !userId) return false;

    try {
      // Get current user's friends
      const userFriendsRef = ref(db, `friends/${this.currentUser.uid}`);
      const userFriendsSnapshot = await get(userFriendsRef);
      if (!userFriendsSnapshot.exists()) return false;

      // Get target user's friends
      const targetFriendsRef = ref(db, `friends/${userId}`);
      const targetFriendsSnapshot = await get(targetFriendsRef);
      if (!targetFriendsSnapshot.exists()) return false;

      // Check if there's any overlap
      const userFriends = new Set(Object.keys(userFriendsSnapshot.val()));
      const targetFriends = new Set(Object.keys(targetFriendsSnapshot.val()));

      for (const friend of userFriends) {
        if (targetFriends.has(friend)) return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking friends of friends:', error);
      return false;
    }
  }

  // Getter methods
  getFriends() {
    return Array.from(this.friends.values());
  }

  getPendingRequests() {
    return Array.from(this.pendingRequests.values());
  }

  // Listener methods
  addFriendListener(listener) {
    this.friendListeners.add(listener);
    // Immediately notify with current state
    listener(this.getFriends());
  }

  removeFriendListener(listener) {
    this.friendListeners.delete(listener);
  }

  addRequestListener(listener) {
    this.requestListeners.add(listener);
    // Immediately notify with current state
    listener(this.getPendingRequests());
  }

  removeRequestListener(listener) {
    this.requestListeners.delete(listener);
  }

  notifyFriendListeners() {
    const friends = this.getFriends();
    this.friendListeners.forEach(listener => listener(friends));
  }

  notifyRequestListeners() {
    const requests = this.getPendingRequests();
    this.requestListeners.forEach(listener => listener(requests));
  }
}

// Export singleton instance
export const friendSystem = new FriendSystem(); 