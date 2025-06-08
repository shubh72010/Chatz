// Friend System Module
import { authHandler } from './auth.js';
import { chatLogic } from './chatLogic.js';
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
    // Set up UI elements
    this.setupUI();

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

  setupUI() {
    // Get UI elements
    this.friendListElement = document.getElementById('friendList');
    this.requestListElement = document.getElementById('requestList');
    this.addFriendButton = document.getElementById('addFriendButton');
    this.addFriendInput = document.getElementById('addFriendInput');

    // Set up event listeners
    this.addFriendButton?.addEventListener('click', () => this.handleAddFriend());
    this.addFriendInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddFriend();
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
      this.updateFriendList();
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
      this.updateRequestList();
    });
  }

  async handleAddFriend() {
    const username = this.addFriendInput?.value.trim();
    if (!username) return;

    try {
      // Get user ID from username
      const userId = await this.getUserIdFromUsername(username);
      if (!userId) {
        alert('User not found');
        return;
      }

      // Send friend request
      await this.sendFriendRequest(userId);
      this.addFriendInput.value = '';
    } catch (error) {
      console.error('Error adding friend:', error);
      alert(error.message || 'Error adding friend');
    }
  }

  async getUserIdFromUsername(username) {
    // Query users collection to find user by username
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return null;

    for (const [userId, userData] of Object.entries(snapshot.val())) {
      if (userData.username === username) {
        return userId;
      }
    }
    return null;
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

  // UI Methods
  updateFriendList() {
    if (!this.friendListElement) return;

    this.friendListElement.innerHTML = '';
    const friends = Array.from(this.friends.entries());
    
    if (friends.length === 0) {
      this.friendListElement.innerHTML = '<div class="empty-state">No friends yet</div>';
      return;
    }

    friends.forEach(([friendId, friendData]) => {
      const friendElement = this.createFriendElement(friendId, friendData);
      this.friendListElement.appendChild(friendElement);
    });
  }

  updateRequestList() {
    if (!this.requestListElement) return;
    
    this.requestListElement.innerHTML = '';
    const requests = Array.from(this.pendingRequests.entries());
    
    if (requests.length === 0) {
      this.requestListElement.innerHTML = '<div class="empty-state">No pending requests</div>';
      return;
    }

    requests.forEach(([requestId, requestData]) => {
      const requestElement = this.createRequestElement(requestId, requestData);
      this.requestListElement.appendChild(requestElement);
    });
  }

  createFriendElement(friendId, friendData) {
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `
      <img src="${friendData.photoURL || 'default-avatar.png'}" alt="${friendData.displayName}" class="friend-avatar">
      <div class="friend-info">
        <div class="friend-name">${friendData.displayName}</div>
        <div class="friend-status ${friendData.online ? 'online' : 'offline'}">
          ${friendData.online ? 'Online' : 'Offline'}
        </div>
      </div>
      <div class="friend-actions">
        <button class="chat-button" data-user-id="${friendId}">Chat</button>
        <button class="remove-button" data-user-id="${friendId}">Remove</button>
      </div>
    `;

    // Add event listeners
    div.querySelector('.chat-button').addEventListener('click', () => this.startChat(friendId));
    div.querySelector('.remove-button').addEventListener('click', () => this.removeFriend(friendId));

    return div;
  }

  createRequestElement(requestId, requestData) {
    const div = document.createElement('div');
    div.className = 'request-item';
    div.innerHTML = `
      <img src="${requestData.senderPhoto || 'default-avatar.png'}" alt="${requestData.senderName}" class="request-avatar">
      <div class="request-info">
        <div class="request-name">${requestData.senderName}</div>
        <div class="request-time">${this.formatTimestamp(requestData.timestamp)}</div>
      </div>
      <div class="request-actions">
        <button class="accept-button" data-request-id="${requestId}">Accept</button>
        <button class="reject-button" data-request-id="${requestId}">Reject</button>
      </div>
    `;

    // Add event listeners
    div.querySelector('.accept-button').addEventListener('click', () => this.acceptFriendRequest(requestId));
    div.querySelector('.reject-button').addEventListener('click', () => this.rejectFriendRequest(requestId));

    return div;
  }

  async startChat(userId) {
    try {
      const chatId = await chatLogic.startChat(userId);
      if (chatId) {
        // Navigate to chat page or open chat modal
        window.location.href = `chat.html?chat=${chatId}`;
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Error starting chat');
    }
  }

  // Event Listener Methods
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

  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

// Create and export a single instance
export const friendSystem = new FriendSystem(); 