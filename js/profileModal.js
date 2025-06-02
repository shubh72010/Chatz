// Profile Modal Component
import { app } from './firebaseConfig.js';
import { friendSystem } from './friendSystem.js';
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
  serverTimestamp,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { authHandler } from './auth.js';

const auth = getAuth(app);
const db = getDatabase(app);

class ProfileModal {
  constructor() {
    this.modal = null;
    this.tooltip = null;
    this.currentUserId = null;
    this.isFriend = false;
    this.hasPendingRequest = false;
    this.init();
  }

  init() {
    // Create modal HTML
    this.modal = document.createElement('div');
    this.modal.className = 'profile-modal';
    this.modal.innerHTML = `
      <div class="profile-modal-content">
        <div class="profile-modal-header">
          <div class="profile-modal-avatar">
            <img src="" alt="Profile" id="modal-profile-pic" />
          </div>
          <div class="profile-modal-info">
            <h2 id="modal-profile-name"></h2>
            <p id="modal-profile-status"></p>
          </div>
          <button class="profile-modal-close">&times;</button>
        </div>
        <div class="profile-modal-body">
          <div class="profile-modal-bio" id="modal-profile-bio"></div>
          <div class="profile-modal-stats">
            <div class="stat">
              <span class="stat-value" id="modal-friends-count">0</span>
              <span class="stat-label">Friends</span>
            </div>
            <div class="stat">
              <span class="stat-value" id="modal-messages-count">0</span>
              <span class="stat-label">Messages</span>
            </div>
          </div>
        </div>
        <div class="profile-modal-actions">
          <button class="action-btn dm-btn" id="modal-dm-btn">
            <i class="fas fa-comment"></i> Message
          </button>
          <button class="action-btn friend-btn" id="modal-friend-btn">
            <i class="fas fa-user-plus"></i> Add Friend
          </button>
          <button class="action-btn block-btn" id="modal-block-btn">
            <i class="fas fa-ban"></i> Block
          </button>
        </div>
      </div>
    `;

    // Create tooltip HTML
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'profile-tooltip';
    this.tooltip.innerHTML = `
      <div class="profile-tooltip-header">
        <div class="profile-tooltip-avatar">
          <img src="" alt="Profile" id="tooltip-profile-pic" />
        </div>
        <div class="profile-tooltip-info">
          <h3 class="profile-tooltip-name" id="tooltip-profile-name"></h3>
          <p class="profile-tooltip-status" id="tooltip-profile-status"></p>
        </div>
      </div>
      <div class="profile-tooltip-bio" id="tooltip-profile-bio"></div>
      <div class="profile-tooltip-actions">
        <button class="profile-tooltip-btn dm" id="tooltip-dm-btn">
          <i class="fas fa-comment"></i> Message
        </button>
        <button class="profile-tooltip-btn friend" id="tooltip-friend-btn">
          <i class="fas fa-user-plus"></i> Add
        </button>
      </div>
    `;

    // Add modal and tooltip to body
    document.body.appendChild(this.modal);
    document.body.appendChild(this.tooltip);

    // Add event listeners for modal
    this.modal.querySelector('.profile-modal-close').onclick = () => this.hide();
    this.modal.querySelector('#modal-dm-btn').onclick = () => this.handleDM();
    this.modal.querySelector('#modal-friend-btn').onclick = () => this.handleFriendRequest();
    this.modal.querySelector('#modal-block-btn').onclick = () => this.handleBlock();

    // Add event listeners for tooltip
    this.tooltip.querySelector('#tooltip-dm-btn').onclick = (e) => {
      e.stopPropagation();
      this.handleDM();
    };
    this.tooltip.querySelector('#tooltip-friend-btn').onclick = (e) => {
      e.stopPropagation();
      this.handleFriendRequest();
    };

    // Close modal when clicking outside
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.hide();
    };

    // Handle tooltip hover
    document.addEventListener('mouseover', (e) => {
      const avatar = e.target.closest('.message-avatar, .user-avatar');
      if (avatar && avatar.dataset.uid) {
        this.showTooltip(avatar.dataset.uid, avatar);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const avatar = e.target.closest('.message-avatar, .user-avatar');
      if (avatar && avatar.dataset.uid) {
        this.hideTooltip();
      }
    });

    // Handle tooltip click
    this.tooltip.addEventListener('click', (e) => {
      if (this.currentUserId) {
        this.show(this.currentUserId);
      }
    });

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.currentUserId = user.uid;
      } else {
        this.currentUserId = null;
      }
    });
  }

  async showTooltip(userId, anchorElement) {
    if (!userId || !anchorElement) return;
    this.currentUserId = userId;

    try {
      // Get user data
      const targetUserRef = ref(db, `users/${userId}`);
      const targetUserSnapshot = await get(targetUserRef);
      if (!targetUserSnapshot.exists()) return;

      const userData = targetUserSnapshot.val();
      const currentUser = auth.currentUser;

      // Update tooltip content
      const profilePic = this.tooltip.querySelector('#tooltip-profile-pic');
      const profileName = this.tooltip.querySelector('#tooltip-profile-name');
      const profileStatus = this.tooltip.querySelector('#tooltip-profile-status');
      const profileBio = this.tooltip.querySelector('#tooltip-profile-bio');
      const friendBtn = this.tooltip.querySelector('#tooltip-friend-btn');

      // Set profile picture with fallback
      profilePic.src = userData.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=726dff&color=fff`;
      
      profileName.textContent = userData.nickname || userData.displayName || 'Anonymous';
      profileStatus.textContent = userData.online ? 'Online' : 'Offline';
      profileBio.textContent = userData.bio || 'No bio yet';

      // Check friendship status
      this.isFriend = await friendSystem.checkFriendship(userId);
      this.hasPendingRequest = await this.checkPendingRequest(userId);
      
      // Update friend button
      friendBtn.innerHTML = this.isFriend ? 
        '<i class="fas fa-user-check"></i> Friends' : 
        '<i class="fas fa-user-plus"></i> Add';
      friendBtn.className = `profile-tooltip-btn friend ${this.isFriend ? 'is-friend' : ''}`;

      // Position tooltip
      const rect = anchorElement.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.bottom + 10;

      // Adjust if tooltip would go off screen
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top - tooltipRect.height - 10;
      }

      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;

      // Show tooltip with delay
      this.tooltipTimeout = setTimeout(() => {
        this.tooltip.classList.add('active');
      }, 300);

    } catch (error) {
      console.error('Error showing tooltip:', error);
    }
  }

  hideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
    this.tooltip.classList.remove('active');
  }

  async show(userId) {
    if (!userId) return;
    this.currentUserId = userId;

    try {
      // Get user data
      const targetUserRef = ref(db, `users/${userId}`);
      const targetUserSnapshot = await get(targetUserRef);
      if (!targetUserSnapshot.exists()) return;

      const userData = targetUserSnapshot.val();
      const currentUser = auth.currentUser;

      // Check friendship status
      this.isFriend = await friendSystem.checkFriendship(userId);
      this.hasPendingRequest = await this.checkPendingRequest(userId);

      // Update modal content
      const avatar = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=726dff&color=fff`;
      const name = userData.nickname || userData.displayName || 'Anonymous';
      const status = userData.status || 'Offline';
      const bio = userData.bio || 'No bio yet';

      // Get friends count
      const friendsRef = ref(db, `friends/${userId}`);
      const friendsSnapshot = await get(friendsRef);
      const friends = friendsSnapshot.val() || {};
      const friendsCount = this.modal.querySelector('#modal-friends-count');
      friendsCount.textContent = Object.keys(friends).length;

      // Get messages count
      const messagesRef = ref(db, `global_messages`);
      const messagesSnapshot = await get(messagesRef);
      let messageCount = 0;
      messagesSnapshot.forEach((chatSnapshot) => {
        if (chatSnapshot.key.includes(userId)) {
          const messages = chatSnapshot.val().messages || {};
          messageCount += Object.keys(messages).length;
        }
      });
      const messagesCount = this.modal.querySelector('#modal-messages-count');
      messagesCount.textContent = messageCount;

      // Update modal content
      const profilePic = this.modal.querySelector('#modal-profile-pic');
      const profileName = this.modal.querySelector('#modal-profile-name');
      const profileStatus = this.modal.querySelector('#modal-profile-status');
      const profileBio = this.modal.querySelector('#modal-profile-bio');
      const friendBtn = this.modal.querySelector('#modal-friend-btn');
      const blockBtn = this.modal.querySelector('#modal-block-btn');

      profilePic.src = avatar;
      profileName.textContent = name;
      profileStatus.textContent = status;
      profileBio.textContent = bio;
      
      // Update friend button
      friendBtn.innerHTML = this.isFriend ? 
        '<i class="fas fa-user-check"></i> Friends' : 
        '<i class="fas fa-user-plus"></i> Add Friend';
      friendBtn.className = `action-btn friend-btn ${this.isFriend ? 'is-friend' : ''}`;

      // Check block status
      const userRef = ref(db, `users/${currentUser.uid}`);
      const userSnapshot = await get(userRef);
      const blockedUsers = userSnapshot.val().blockedUsers || [];
      const isBlocked = blockedUsers.includes(userId);
      
      // Update block button
      blockBtn.innerHTML = isBlocked ? 
        '<i class="fas fa-user-slash"></i> Unblock' : 
        '<i class="fas fa-ban"></i> Block';
      blockBtn.className = `action-btn block-btn ${isBlocked ? 'is-blocked' : ''}`;

      // Show modal
      this.modal.classList.add('active');
    } catch (error) {
      console.error('Error showing profile:', error);
    }
  }

  hide() {
    this.modal.classList.remove('active');
    this.currentUserId = null;
  }

  async handleDM() {
    if (!this.currentUserId) return;
    window.location.href = `../pages/chat.html?uid=${this.currentUserId}`;
  }

  async handleFriendRequest() {
    if (!this.currentUserId || !auth.currentUser) return;

    try {
      if (this.isFriend) {
        // Remove friend
        if (confirm('Are you sure you want to remove this friend?')) {
          await friendSystem.removeFriend(this.currentUserId);
          this.isFriend = false;
          this.updateFriendButton();
        }
      } else if (this.hasPendingRequest) {
        // Cancel request
        const requestRef = ref(db, `friend_requests/${this.currentUserId}/${auth.currentUser.uid}`);
        await remove(requestRef);
        this.hasPendingRequest = false;
        this.updateFriendButton();
      } else {
        // Send friend request
        const success = await friendSystem.sendFriendRequest(this.currentUserId);
        if (success) {
          this.hasPendingRequest = true;
          this.updateFriendButton();
        }
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  }

  async handleBlock() {
    if (!this.currentUserId || !auth.currentUser) return;

    try {
      const currentUserRef = ref(db, `users/${auth.currentUser.uid}`);
      const currentUserSnapshot = await get(currentUserRef);
      const userData = currentUserSnapshot.val() || {};
      const blockedUsers = userData.blockedUsers || [];

      const isBlocked = blockedUsers.includes(this.currentUserId);
      let newBlockedUsers;

      if (isBlocked) {
        // Unblock user
        newBlockedUsers = blockedUsers.filter(uid => uid !== this.currentUserId);
      } else {
        // Block user
        newBlockedUsers = [...blockedUsers, this.currentUserId];
        // Remove from friends if they are friends
        if (this.isFriend) {
          await friendSystem.removeFriend(this.currentUserId);
          this.isFriend = false;
          this.updateFriendButton();
        }
      }

      await set(currentUserRef, {
        ...userData,
        blockedUsers: newBlockedUsers
      });

      // Update block button
      const blockBtn = this.modal.querySelector('#modal-block-btn');
      blockBtn.innerHTML = isBlocked ? 
        '<i class="fas fa-user-slash"></i> Unblock' : 
        '<i class="fas fa-ban"></i> Block';
      blockBtn.className = `action-btn block-btn ${isBlocked ? 'is-blocked' : ''}`;

    } catch (error) {
      console.error('Error handling block:', error);
    }
  }

  updateFriendButton() {
    const friendBtn = this.modal.querySelector('#modal-friend-btn');
    if (this.isFriend) {
      friendBtn.textContent = 'Remove Friend';
      friendBtn.classList.add('remove');
      friendBtn.classList.remove('pending');
    } else if (this.hasPendingRequest) {
      friendBtn.textContent = 'Cancel Request';
      friendBtn.classList.add('pending');
      friendBtn.classList.remove('remove');
    } else {
      friendBtn.textContent = 'Add Friend';
      friendBtn.classList.remove('remove', 'pending');
    }
  }

  async checkPendingRequest(userId) {
    if (!userId || !auth.currentUser) return false;
    const requestRef = ref(db, `friend_requests/${userId}/${auth.currentUser.uid}`);
    const snapshot = await get(requestRef);
    return snapshot.exists();
  }
}

// Export singleton instance
export const profileModal = new ProfileModal(); 