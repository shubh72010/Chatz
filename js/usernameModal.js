import { auth, db } from './firebaseConfig.js';
import { ref, set, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

class UsernameModal {
    constructor() {
        this.modal = null;
        this.onUsernameSet = null;
    }

    init(onUsernameSet) {
        this.onUsernameSet = onUsernameSet;
        this.createModal();
    }

    createModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="username-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2>Choose Your Username</h2>
                    <p>Your username must be unique and can only contain letters, numbers, and underscores.</p>
                    <div class="username-form">
                        <input type="text" id="username-input" placeholder="Enter username (3-20 characters)" 
                               pattern="[a-zA-Z0-9_]+" minlength="3" maxlength="20" required>
                        <div id="username-error" class="error-message"></div>
                        <button id="set-username-btn" class="primary-button">Set Username</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .modal-content {
                background: var(--bg-light);
                padding: 2rem;
                border-radius: var(--border-radius-md);
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .modal h2 {
                color: var(--text);
                margin-bottom: 1rem;
                font-size: 1.5rem;
            }

            .modal p {
                color: var(--text-muted);
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }

            .username-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .username-form input {
                padding: 0.8rem;
                border: 2px solid var(--input-border);
                border-radius: var(--border-radius-sm);
                background: var(--input-bg);
                color: var(--text);
                font-size: 1rem;
                width: 100%;
                box-sizing: border-box;
            }

            .username-form input:focus {
                border-color: var(--main);
                outline: none;
            }

            .error-message {
                color: var(--danger);
                font-size: 0.9rem;
                min-height: 1.2rem;
            }

            .primary-button {
                background: var(--main);
                color: white;
                border: none;
                padding: 0.8rem;
                border-radius: var(--border-radius-sm);
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }

            .primary-button:hover {
                background: var(--main-dark);
            }

            .primary-button:disabled {
                background: var(--input-border);
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);

        // Get modal elements
        this.modal = document.getElementById('username-modal');
        const usernameInput = document.getElementById('username-input');
        const setUsernameBtn = document.getElementById('set-username-btn');
        const errorMessage = document.getElementById('username-error');

        // Add event listeners
        setUsernameBtn.addEventListener('click', () => this.handleUsernameSubmit(usernameInput, errorMessage));
        usernameInput.addEventListener('input', () => {
            errorMessage.textContent = '';
            usernameInput.setCustomValidity('');
        });
    }

    async handleUsernameSubmit(input, errorElement) {
        const username = input.value.trim().toLowerCase();
        
        // Validate username format
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorElement.textContent = 'Username can only contain letters, numbers, and underscores';
            return;
        }

        if (username.length < 3 || username.length > 20) {
            errorElement.textContent = 'Username must be between 3 and 20 characters';
            return;
        }

        try {
            // Check if username is taken
            const usernameRef = ref(db, 'usernames');
            const usernameQuery = query(usernameRef, orderByChild('username'), equalTo(username));
            const snapshot = await get(usernameQuery);

            if (snapshot.exists()) {
                errorElement.textContent = 'This username is already taken';
                return;
            }

            // Set username in both usernames and users nodes
            const user = auth.currentUser;
            if (!user) {
                errorElement.textContent = 'You must be logged in to set a username';
                return;
            }

            // Update usernames node
            await set(ref(db, `usernames/${username}`), user.uid);
            
            // Update user's profile
            await set(ref(db, `users/${user.uid}/username`), username);

            // Hide modal and trigger callback
            this.hide();
            if (this.onUsernameSet) {
                this.onUsernameSet(username);
            }
        } catch (error) {
            console.error('Error setting username:', error);
            errorElement.textContent = 'Failed to set username. Please try again.';
        }
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            document.getElementById('username-input').focus();
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

export const usernameModal = new UsernameModal(); 