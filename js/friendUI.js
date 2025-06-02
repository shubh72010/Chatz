import { friendSystem } from './friendSystem.js';
import { app } from './firebaseConfig.js';
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase(app);

class FriendUI {
  constructor() {
    this.friendListContainer = null;
    this.requestListContainer = null;
    this.friendCount = 0;
    this.requestCount = 0;
    this.init();
  }

  init() {
    // Create friend list container
    this.friendListContainer = document.createElement('div');
    this.friendListContainer.className = 'friend-list-container';
    this.friendListContainer.innerHTML = `
      <div class="friend-list-header">
        <h3>Friends</h3>
        <span class="friend-count">0</span>
      </div>
      <div class="friend-list"></div>
    `;

    // Create friend requests container
    this.requestListContainer = document.createElement('div');
    this.requestListContainer.className = 'friend-requests-container';
    this.requestListContainer.innerHTML = `
      <div class="friend-requests-header">
        <h3>Friend Requests</h3>
        <span class="request-count">0</span>
      </div>
      <div class="friend-requests-list"></div>
    `;

    // Add styles
    this.addStyles();

    // Setup listeners
    this.setupListeners();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .friend-list-container,
      .friend-requests-container {
        background: var(--bg-light);
        border-radius: var(--border-radius-md);
        padding: 1rem;
        margin: 1rem 0;
        box-shadow: var(--header-shadow);
      }

      .friend-list-header,
      .friend-requests-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .friend-list-header h3,
      .friend-requests-header h3 {
        color: var(--text);
        font-size: 1.1rem;
        margin: 0;
      }

      .friend-count,
      .request-count {
        background: var(--main);
        color: white;
        padding: 0.2rem 0.6rem;
        border-radius: 1rem;
        font-size: 0.9rem;
      }

      .friend-list,
      .friend-requests-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }

      .friend-item,
      .request-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.8rem;
        background: var(--bg);
        border-radius: var(--border-radius-sm);
        transition: transform 0.2s;
      }

      .friend-item:hover,
      .request-item:hover {
        transform: translateY(-2px);
      }

      .friend-avatar,
      .request-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--main);
      }

      .friend-info,
      .request-info {
        flex: 1;
      }

      .friend-name,
      .request-name {
        color: var(--text);
        font-weight: 600;
        margin: 0;
      }

      .friend-status,
      .request-time {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin: 0;
      }

      .friend-actions,
      .request-actions {
        display: flex;
        gap: 0.5rem;
      }

      .friend-action-btn,
      .request-action-btn {
        background: var(--main);
        color: white;
        border: none;
        border-radius: var(--border-radius-sm);
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
      }

      .friend-action-btn:hover,
      .request-action-btn:hover {
        background: var(--main-dark);
      }

      .friend-action-btn.remove {
        background: var(--danger);
      }

      .friend-action-btn.remove:hover {
        background: #ff3333;
      }

      .request-action-btn.accept {
        background: #4CAF50;
      }

      .request-action-btn.accept:hover {
        background: #45a049;
      }

      .request-action-btn.decline {
        background: var(--danger);
      }

      .request-action-btn.decline:hover {
        background: #ff3333;
      }

      .no-friends,
      .no-requests {
        text-align: center;
        color: var(--text-muted);
        padding: 1rem;
        font-style: italic;
      }

      @media (max-width: 768px) {
        .friend-list-container,
        .friend-requests-container {
          margin: 0.5rem 0;
          padding: 0.8rem;
        }

        .friend-item,
        .request-item {
          padding: 0.6rem;
        }

        .friend-avatar,
        .request-avatar {
          width: 32px;
          height: 32px;
        }

        .friend-action-btn,
        .request-action-btn {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupListeners() {
    // Listen for friend list changes
    friendSystem.addFriendListener((friends) => {
      this.updateFriendList(friends);
    });

    // Listen for friend request changes
    friendSystem.addRequestListener((requests) => {
      this.updateRequestList(requests);
    });
  }

  async updateFriendList(friends) {
    const friendList = this.friendListContainer.querySelector('.friend-list');
    const friendCount = this.friendListContainer.querySelector('.friend-count');
    
    this.friendCount = friends.length;
    friendCount.textContent = this.friendCount;

    if (friends.length === 0) {
      friendList.innerHTML = '<div class="no-friends">No friends yet</div>';
      return;
    }

    friendList.innerHTML = '';
    
    for (const friend of friends) {
      try {
        // Get user data
        const userRef = ref(db, `users/${friend.id}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val() || {};

        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.innerHTML = `
          <img src="${userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=726dff&color=fff`}" 
               alt="${userData.displayName || 'User'}" 
               class="friend-avatar" />
          <div class="friend-info">
            <h4 class="friend-name">${userData.nickname || userData.displayName || 'Anonymous'}</h4>
            <p class="friend-status">${userData.status || 'Offline'}</p>
          </div>
          <div class="friend-actions">
            <button class="friend-action-btn message" data-uid="${friend.id}">Message</button>
            <button class="friend-action-btn remove" data-uid="${friend.id}">Remove</button>
          </div>
        `;

        // Add event listeners
        friendItem.querySelector('.message').onclick = () => {
          // TODO: Implement direct messaging
          console.log('Message friend:', friend.id);
        };

        friendItem.querySelector('.remove').onclick = async () => {
          if (confirm('Are you sure you want to remove this friend?')) {
            await friendSystem.removeFriend(friend.id);
          }
        };

        friendList.appendChild(friendItem);
      } catch (error) {
        console.error('Error updating friend item:', error);
      }
    }
  }

  updateRequestList(requests) {
    const requestList = this.requestListContainer.querySelector('.friend-requests-list');
    const requestCount = this.requestListContainer.querySelector('.request-count');
    
    this.requestCount = requests.length;
    requestCount.textContent = this.requestCount;

    if (requests.length === 0) {
      requestList.innerHTML = '<div class="no-requests">No pending requests</div>';
      return;
    }

    requestList.innerHTML = '';
    
    for (const request of requests) {
      const requestItem = document.createElement('div');
      requestItem.className = 'request-item';
      
      const timestamp = request.timestamp ? new Date(request.timestamp).toLocaleString() : 'Just now';
      
      requestItem.innerHTML = `
        <img src="${request.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.fromName || 'User')}&background=726dff&color=fff`}" 
             alt="${request.fromName || 'User'}" 
             class="request-avatar" />
        <div class="request-info">
          <h4 class="request-name">${request.fromName || 'Anonymous'}</h4>
          <p class="request-time">${timestamp}</p>
        </div>
        <div class="request-actions">
          <button class="request-action-btn accept" data-request-id="${request.id}">Accept</button>
          <button class="request-action-btn decline" data-request-id="${request.id}">Decline</button>
        </div>
      `;

      // Add event listeners
      requestItem.querySelector('.accept').onclick = async () => {
        await friendSystem.acceptFriendRequest(request.id);
      };

      requestItem.querySelector('.decline').onclick = async () => {
        await friendSystem.declineFriendRequest(request.id);
      };

      requestList.appendChild(requestItem);
    }
  }

  // Mount methods
  mountFriendList(container) {
    container.appendChild(this.friendListContainer);
  }

  mountRequestList(container) {
    container.appendChild(this.requestListContainer);
  }

  // Unmount methods
  unmountFriendList() {
    this.friendListContainer.remove();
  }

  unmountRequestList() {
    this.requestListContainer.remove();
  }
}

// Export singleton instance
export const friendUI = new FriendUI(); 