// Friend System Module
import { authHandler } from './auth.js';
import { db } from './firebaseConfig.js';
import {
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class FriendSystem {
  constructor() {
    this.friends = new Map();
    this.pendingRequests = new Map();
    this.friendListeners = new Set();
    this.requestListeners = new Set();
    this.init();
  }

  init() {
    // Listen for auth state changes
    authHandler.onAuthStateChanged(async (user) => {
      if (user) {
        await this.loadFriends();
        await this.loadFriendRequests();
      } else {
        this.cleanup();
      }
    });
  }

  async loadFriends() {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser) return;

    const friendsRef = ref(db, `friends/${currentUser.uid}`);
    onValue(friendsRef, (snapshot) => {
      this.friends.clear();
      snapshot.forEach((childSnapshot) => {
        const friendData = childSnapshot.val();
        this.friends.set(childSnapshot.key, friendData);
      });
      this.notifyFriendListeners();
    });
  }

  async loadFriendRequests() {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser) return;

    const requestsRef = ref(db, `friend_requests/${currentUser.uid}`);
    onValue(requestsRef, (snapshot) => {
      this.pendingRequests.clear();
      snapshot.forEach((childSnapshot) => {
        const requestData = childSnapshot.val();
        this.pendingRequests.set(childSnapshot.key, requestData);
      });
      this.notifyRequestListeners();
    });
  }

  async sendFriendRequest(targetUserId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !targetUserId) return;

    try {
      // Check if request already exists
      const requestRef = ref(db, `friend_requests/${targetUserId}/${currentUser.uid}`);
      const requestSnapshot = await get(requestRef);
      if (requestSnapshot.exists()) {
        throw new Error('Friend request already sent');
      }

      // Check if already friends
      const friendRef = ref(db, `friends/${targetUserId}/${currentUser.uid}`);
      const friendSnapshot = await get(friendRef);
      if (friendSnapshot.exists()) {
        throw new Error('Already friends');
      }

      // Send request
      await set(requestRef, {
        from: currentUser.uid,
        timestamp: serverTimestamp(),
        status: 'pending'
      });

      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  async acceptFriendRequest(fromUserId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !fromUserId) return;

    try {
      // Get request data
      const requestRef = ref(db, `friend_requests/${currentUser.uid}/${fromUserId}`);
      const requestSnapshot = await get(requestRef);
      if (!requestSnapshot.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestSnapshot.val();
      if (requestData.status !== 'pending') {
        throw new Error('Invalid request status');
      }

      // Add to friends list for both users
      const batch = {};
      batch[`friends/${currentUser.uid}/${fromUserId}`] = {
        timestamp: serverTimestamp(),
        status: 'accepted'
      };
      batch[`friends/${fromUserId}/${currentUser.uid}`] = {
        timestamp: serverTimestamp(),
        status: 'accepted'
      };

      // Remove the request
      batch[`friend_requests/${currentUser.uid}/${fromUserId}`] = null;

      // Update all at once
      await update(ref(db), batch);

      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  async rejectFriendRequest(fromUserId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !fromUserId) return;

    try {
      const requestRef = ref(db, `friend_requests/${currentUser.uid}/${fromUserId}`);
      await remove(requestRef);
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  }

  async removeFriend(friendId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !friendId) return;

    try {
      const batch = {};
      batch[`friends/${currentUser.uid}/${friendId}`] = null;
      batch[`friends/${friendId}/${currentUser.uid}`] = null;
      await update(ref(db), batch);
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }

  onFriendsChange(callback) {
    this.friendListeners.add(callback);
    callback(Array.from(this.friends.entries()));
    return () => this.friendListeners.delete(callback);
  }

  onFriendRequestsChange(callback) {
    this.requestListeners.add(callback);
    callback(Array.from(this.pendingRequests.entries()));
    return () => this.requestListeners.delete(callback);
  }

  notifyFriendListeners() {
    const friendsList = Array.from(this.friends.entries());
    this.friendListeners.forEach(callback => callback(friendsList));
  }

  notifyRequestListeners() {
    const requestsList = Array.from(this.pendingRequests.entries());
    this.requestListeners.forEach(callback => callback(requestsList));
  }

  cleanup() {
    this.friends.clear();
    this.pendingRequests.clear();
    this.friendListeners.clear();
    this.requestListeners.clear();
  }

  getFriends() {
    return Array.from(this.friends.entries());
  }

  getPendingRequests() {
    return Array.from(this.pendingRequests.entries());
  }
}

// Create and export a single instance
export const friendSystem = new FriendSystem(); 