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
    this.currentUser = null;
    this.targetUser = null;
    this.isFriend = false;
    this.isBlocked = false;
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

    // Add modal to body
    document.body.appendChild(this.modal);

    // Add event listeners
    this.modal.querySelector('.profile-modal-close').onclick = () => this.hide();
    this.modal.querySelector('#modal-dm-btn').onclick = () => this.handleDM();
    this.modal.querySelector('#modal-friend-btn').onclick = () => this.handleFriend();
    this.modal.querySelector('#modal-block-btn').onclick = () => this.handleBlock();

    // Close modal when clicking outside
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.hide();
    };

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
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