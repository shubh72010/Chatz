import { friendSystem } from './friendSystem.js';
import { app } from './firebaseConfig.js';
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { authHandler } from './auth.js';
import { chatLogic } from './chatLogic.js';

const db = getDatabase(app);

class FriendUI {
  constructor() {
    this.friendListElement = document.getElementById('friendList');
    this.requestListElement = document.getElementById('requestList');
    this.addFriendButton = document.getElementById('addFriendButton');
    this.addFriendInput = document.getElementById('addFriendInput');
    this.init();
  }

  init() {
    // Set up event listeners
    this.addFriendButton?.addEventListener('click', () => this.handleAddFriend());
    this.addFriendInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddFriend();
    });

    // Listen for friend list changes
    friendSystem.onFriendsChange((friends) => this.updateFriendList(friends));
    friendSystem.onFriendRequestsChange((requests) => this.updateRequestList(requests));

    // Initial render
    this.updateFriendList(friendSystem.getFriends());
    this.updateRequestList(friendSystem.getPendingRequests());
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
      await friendSystem.sendFriendRequest(userId);
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

  updateFriendList(friends) {
    if (!this.friendListElement) return;

    this.friendListElement.innerHTML = '';
    if (friends.length === 0) {
      this.friendListElement.innerHTML = '<div class="empty-state">No friends yet</div>';
      return;
    }

    friends.forEach(([friendId, friendData]) => {
      const friendElement = this.createFriendElement(friendId, friendData);
      this.friendListElement.appendChild(friendElement);
    });
  }

  updateRequestList(requests) {
    if (!this.requestListElement) return;

    this.requestListElement.innerHTML = '';
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
    div.querySelector('.accept-button').addEventListener('click', () => this.acceptRequest(requestId));
    div.querySelector('.reject-button').addEventListener('click', () => this.rejectRequest(requestId));

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

  async removeFriend(userId) {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      await friendSystem.removeFriend(userId);
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Error removing friend');
    }
  }

  async acceptRequest(requestId) {
    try {
      await friendSystem.acceptFriendRequest(requestId);
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error accepting friend request');
    }
  }

  async rejectRequest(requestId) {
    try {
      await friendSystem.rejectFriendRequest(requestId);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting friend request');
    }
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

// Create and export a single instance
export const friendUI = new FriendUI(); 