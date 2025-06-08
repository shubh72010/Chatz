// Profile Modal Module
import { auth, db } from '/Chatz/js/firebaseConfig.js';
import {
    ref,
    get,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class ProfileModal {
    constructor() {
        this.modal = null;
        this.currentUser = null;
        this.userData = null;
        this.init();
    }

    init() {
        // Create modal element
        this.modal = document.createElement('div');
        this.modal.className = 'profile-modal';
        this.modal.style.display = 'none';
        this.modal.innerHTML = `
            <div class="profile-modal-content">
                <div class="profile-modal-header">
                    <h2>Profile</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="profile-modal-body">
                    <div class="profile-picture">
                        <img src="" alt="Profile Picture" id="modal-profile-pic">
                    </div>
                    <div class="profile-info">
                        <div class="profile-name" id="modal-profile-name"></div>
                        <div class="profile-username" id="modal-profile-username"></div>
                        <div class="profile-bio" id="modal-profile-bio"></div>
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.modal);

        // Add event listeners
        this.modal.querySelector('.close-button').addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.loadUserData(user.uid);
            }
        });
    }

    async loadUserData(userId) {
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            this.userData = snapshot.val();
            this.updateModalContent();
        }

        // Listen for changes
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                this.userData = snapshot.val();
                this.updateModalContent();
            }
        });
    }

    updateModalContent() {
        if (!this.userData) return;

        const photoURL = this.userData.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userData.displayName || 'U')}&background=726dff&color=fff`;
        
        this.modal.querySelector('#modal-profile-pic').src = photoURL;
        this.modal.querySelector('#modal-profile-name').textContent = this.userData.displayName || 'Anonymous';
        this.modal.querySelector('#modal-profile-username').textContent = this.userData.username ? `@${this.userData.username}` : '';
        this.modal.querySelector('#modal-profile-bio').textContent = this.userData.bio || 'No bio yet';
    }

    show(userId) {
        if (userId) {
            this.loadUserData(userId);
        }
        this.modal.style.display = 'flex';
    }

    hide() {
        this.modal.style.display = 'none';
    }
}

// Create and export a singleton instance
export const profileModal = new ProfileModal(); 