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
            <div id="username-modal" class="modal">
                <div class="modal-content">
                    <h2>Welcome to Chatz! 👋</h2>
                    <p>Before you can start chatting, you need to choose a username.</p>
                    <p class="username-requirements">Your username must be:</p>
                    <ul class="requirements-list">
                        <li>3-20 characters long</li>
                        <li>Only letters, numbers, and underscores</li>
                        <li>Unique (no one else can have the same username)</li>
                    </ul>
                    <div class="username-form">
                        <input type="text" id="username-input" placeholder="Enter your username" 
                               pattern="[a-zA-Z0-9_]+" minlength="3" maxlength="20" required
                               autocomplete="off" spellcheck="false">
                        <div id="username-error" class="error-message"></div>
                        <button id="set-username-btn" class="primary-button">Start Chatting</button>
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
                background: var(--bg);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }

            .modal-content {
                background: var(--bg-light);
                padding: 2.5rem;
                border-radius: var(--border-radius-lg);
                width: 90%;
                max-width: 450px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                border: 2px solid var(--main);
            }

            .modal h2 {
                color: var(--text);
                margin-bottom: 1rem;
                font-size: 1.8rem;
                text-align: center;
            }

            .modal p {
                color: var(--text-muted);
                margin-bottom: 1rem;
                font-size: 1rem;
                text-align: center;
            }

            .username-requirements {
                color: var(--text) !important;
                font-weight: 600;
                margin-top: 1.5rem !important;
            }

            .requirements-list {
                list-style: none;
                padding: 0;
                margin: 0.5rem 0 1.5rem 0;
                color: var(--text-muted);
            }

            .requirements-list li {
                padding: 0.3rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .requirements-list li::before {
                content: "•";
                color: var(--main);
                font-weight: bold;
            }

            .username-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .username-form input {
                padding: 1rem;
                border: 2px solid var(--input-border);
                border-radius: var(--border-radius-sm);
                background: var(--input-bg);
                color: var(--text);
                font-size: 1.1rem;
                width: 100%;
                box-sizing: border-box;
                text-align: center;
                letter-spacing: 0.5px;
            }

            .username-form input:focus {
                border-color: var(--main);
                outline: none;
                box-shadow: 0 0 0 3px var(--main-light);
            }

            .error-message {
                color: var(--danger);
                font-size: 0.9rem;
                min-height: 1.2rem;
                text-align: center;
            }

            .primary-button {
                background: var(--main);
                color: white;
                border: none;
                padding: 1rem;
                border-radius: var(--border-radius-sm);
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .primary-button:hover {
                background: var(--main-dark);
                transform: translateY(-1px);
            }

            .primary-button:disabled {
                background: var(--input-border);
                cursor: not-allowed;
                transform: none;
            }

            /* Prevent interaction with the rest of the page */
            body.modal-open {
                overflow: hidden;
            }

            body.modal-open > *:not(#username-modal) {
                filter: blur(5px);
                pointer-events: none;
                user-select: none;
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
        
        // Handle Enter key
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setUsernameBtn.click();
            }
        });

        // Clear error on input
        usernameInput.addEventListener('input', () => {
            errorMessage.textContent = '';
            usernameInput.setCustomValidity('');
            // Convert to lowercase as user types
            usernameInput.value = usernameInput.value.toLowerCase();
        });

        // Prevent closing the modal
        this.modal.addEventListener('click', (e) => {
            e.stopPropagation();
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
            document.body.classList.add('modal-open');
            const usernameInput = document.getElementById('username-input');
            usernameInput.focus();
            // Clear any previous input
            usernameInput.value = '';
            document.getElementById('username-error').textContent = '';
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }
}

export const usernameModal = new UsernameModal(); 