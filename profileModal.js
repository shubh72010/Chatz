// Profile Modal Component
import { app } from './firebaseConfig.js';
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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const auth = getAuth(app);
const db = getDatabase(app);

class ProfileModal {
  constructor() {
    this.modal = null;
    this.tooltip = null;
    this.currentUser = null;
    this.targetUser = null;
    this.isFriend = false;
    this.isBlocked = false;
    this.tooltipTimeout = null;
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
    this.modal.querySelector('#modal-friend-btn').onclick = () => this.handleFriend();
    this.modal.querySelector('#modal-block-btn').onclick = () => this.handleBlock();

    // Add event listeners for tooltip
    this.tooltip.querySelector('#tooltip-dm-btn').onclick = (e) => {
      e.stopPropagation();
      this.handleDM();
    };
    this.tooltip.querySelector('#tooltip-friend-btn').onclick = (e) => {
      e.stopPropagation();
      this.handleFriend();
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
      if (this.targetUser) {
        this.show(this.targetUser.id);
      }
    });

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  async showTooltip(userId, anchorElement) {
    if (!this.currentUser || this.tooltipTimeout) return;

    try {
      // Get user data
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) return;

      this.targetUser = { id: userId, ...snapshot.val() };

      // Update tooltip content
      const profilePic = this.tooltip.querySelector('#tooltip-profile-pic');
      const profileName = this.tooltip.querySelector('#tooltip-profile-name');
      const profileStatus = this.tooltip.querySelector('#tooltip-profile-status');
      const profileBio = this.tooltip.querySelector('#tooltip-profile-bio');
      const friendBtn = this.tooltip.querySelector('#tooltip-friend-btn');

      // Set profile picture with fallback
      profilePic.src = this.targetUser.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(this.targetUser.nickname || this.targetUser.displayName || 'U')}&background=726dff&color=fff`;
      
      profileName.textContent = this.targetUser.nickname || this.targetUser.displayName || 'Anonymous';
      profileStatus.textContent = this.targetUser.online ? 'Online' : 'Offline';
      profileBio.textContent = this.targetUser.bio || 'No bio yet';

      // Check friendship status
      const friendshipRef = ref(db, `friends/${this.currentUser.uid}/${userId}`);
      const friendshipSnapshot = await get(friendshipRef);
      this.isFriend = friendshipSnapshot.exists();
      
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
      console.error('Error loading profile tooltip:', error);
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
    if (!this.currentUser) return;

    try {
      // Get user data
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        console.error('User not found');
        return;
      }

      this.targetUser = { id: userId, ...snapshot.val() };

      // Update modal content
      const profilePic = this.modal.querySelector('#modal-profile-pic');
      const profileName = this.modal.querySelector('#modal-profile-name');
      const profileStatus = this.modal.querySelector('#modal-profile-status');
      const profileBio = this.modal.querySelector('#modal-profile-bio');
      const friendsCount = this.modal.querySelector('#modal-friends-count');
      const messagesCount = this.modal.querySelector('#modal-messages-count');
      const friendBtn = this.modal.querySelector('#modal-friend-btn');
      const blockBtn = this.modal.querySelector('#modal-block-btn');

      // Set profile picture with fallback
      profilePic.src = this.targetUser.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(this.targetUser.nickname || this.targetUser.displayName || 'U')}&background=726dff&color=fff`;
      
      profileName.textContent = this.targetUser.nickname || this.targetUser.displayName || 'Anonymous';
      profileStatus.textContent = this.targetUser.online ? 'Online' : 'Offline';
      profileBio.textContent = this.targetUser.bio || 'No bio yet';
      
      // Get friends count
      const friendsRef = ref(db, `friends/${userId}`);
      const friendsSnapshot = await get(friendsRef);
      const friends = friendsSnapshot.val() || {};
      friendsCount.textContent = Object.keys(friends).length;

      // Get messages count
      const messagesRef = ref(db, `dms`);
      const messagesSnapshot = await get(messagesRef);
      let messageCount = 0;
      messagesSnapshot.forEach((chatSnapshot) => {
        if (chatSnapshot.key.includes(userId)) {
          const messages = chatSnapshot.val().messages || {};
          messageCount += Object.keys(messages).length;
        }
      });
      messagesCount.textContent = messageCount;

      // Check friendship status
      const friendshipRef = ref(db, `friends/${this.currentUser.uid}/${userId}`);
      const friendshipSnapshot = await get(friendshipRef);
      this.isFriend = friendshipSnapshot.exists();
      
      // Update friend button
      friendBtn.innerHTML = this.isFriend ? 
        '<i class="fas fa-user-check"></i> Friends' : 
        '<i class="fas fa-user-plus"></i> Add Friend';
      friendBtn.className = `action-btn friend-btn ${this.isFriend ? 'is-friend' : ''}`;

      // Check block status
      const blockRef = ref(db, `blocks/${this.currentUser.uid}/${userId}`);
      const blockSnapshot = await get(blockRef);
      this.isBlocked = blockSnapshot.exists();
      
      // Update block button
      blockBtn.innerHTML = this.isBlocked ? 
        '<i class="fas fa-user-slash"></i> Unblock' : 
        '<i class="fas fa-ban"></i> Block';
      blockBtn.className = `action-btn block-btn ${this.isBlocked ? 'is-blocked' : ''}`;

      // Show modal
      this.modal.classList.add('active');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  hide() {
    this.modal.classList.remove('active');
    this.targetUser = null;
  }

  async handleDM() {
    if (!this.targetUser) return;
    window.location.href = `chat.html?uid=${this.targetUser.id}`;
  }

  async handleFriend() {
    if (!this.currentUser || !this.targetUser) return;

    try {
      const friendshipRef = ref(db, `friends/${this.currentUser.uid}/${this.targetUser.id}`);
      
      if (this.isFriend) {
        // Remove friend
        await set(friendshipRef, null);
        this.isFriend = false;
      } else {
        // Add friend
        await set(friendshipRef, {
          timestamp: serverTimestamp(),
          status: 'accepted'
        });
        this.isFriend = true;
      }

      // Update UI
      const friendBtn = this.modal.querySelector('#modal-friend-btn');
      friendBtn.innerHTML = this.isFriend ? 
        '<i class="fas fa-user-check"></i> Friends' : 
        '<i class="fas fa-user-plus"></i> Add Friend';
      friendBtn.className = `action-btn friend-btn ${this.isFriend ? 'is-friend' : ''}`;

      // Update friends count
      const friendsRef = ref(db, `friends/${this.targetUser.id}`);
      const friendsSnapshot = await get(friendsRef);
      const friends = friendsSnapshot.val() || {};
      this.modal.querySelector('#modal-friends-count').textContent = Object.keys(friends).length;

    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  }

  async handleBlock() {
    if (!this.currentUser || !this.targetUser) return;

    try {
      const blockRef = ref(db, `blocks/${this.currentUser.uid}/${this.targetUser.id}`);
      
      if (this.isBlocked) {
        // Unblock user
        await set(blockRef, null);
        this.isBlocked = false;
      } else {
        // Block user
        await set(blockRef, {
          timestamp: serverTimestamp(),
          reason: 'User blocked'
        });
        this.isBlocked = true;
      }

      // Update UI
      const blockBtn = this.modal.querySelector('#modal-block-btn');
      blockBtn.innerHTML = this.isBlocked ? 
        '<i class="fas fa-user-slash"></i> Unblock' : 
        '<i class="fas fa-ban"></i> Block';
      blockBtn.className = `action-btn block-btn ${this.isBlocked ? 'is-blocked' : ''}`;

    } catch (error) {
      console.error('Error handling block:', error);
    }
  }
}

// Export singleton instance
export const profileModal = new ProfileModal(); 