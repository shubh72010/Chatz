import { auth, db } from './firebaseConfig.js';
import { ref, push, onValue, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
const messageCount = document.getElementById('message-count');
const userCount = document.getElementById('user-count');
const loadingMessages = document.getElementById('loading-messages');

let currentUser = null;
let isNearBottom = true;

// Initialize
function init() {
    // Enable input once user is authenticated
    messageInput.removeAttribute('readonly');
    
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadMessages();
            updateUserCount();
        } else {
            window.location.href = '/Chatz/signin.html';
        }
    });

    // Event listeners
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);

    // Scroll detection
    chatMessages.addEventListener('scroll', () => {
        const scrollPosition = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
        isNearBottom = scrollPosition < 100;
        scrollBottomBtn.classList.toggle('visible', !isNearBottom);
    });

    scrollBottomBtn.addEventListener('click', scrollToBottom);
}

// Load messages
function loadMessages() {
    const messagesRef = ref(db, 'globalMessages');
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50));

    onValue(messagesQuery, (snapshot) => {
        loadingMessages.style.display = 'none';
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        
        displayMessages(messages);
        updateMessageCount(snapshot.size);
        
        if (isNearBottom) {
            scrollToBottom();
        }
    });
}

// Display messages
function displayMessages(messages) {
    chatMessages.innerHTML = messages.map(message => {
        const isOwnMessage = message.senderId === currentUser.uid;
        const messageClass = isOwnMessage ? 'message own' : 'message';
        const timestamp = new Date(message.timestamp);
        const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="${messageClass}">
                <div class="message-content">
                    <div class="message-sender">${message.senderName || 'Anonymous'}</div>
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Send message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;

    try {
        const messagesRef = ref(db, 'globalMessages');
        await push(messagesRef, {
            text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Anonymous',
            timestamp: Date.now()
        });

        messageInput.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Update user count
function updateUserCount() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        userCount.textContent = snapshot.size || 0;
    });
}

// Update message count
function updateMessageCount(count) {
    messageCount.textContent = count || 0;
}

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 
