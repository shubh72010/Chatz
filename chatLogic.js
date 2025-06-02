// chatLogic.js
import { app } from './firebaseConfig.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// --- Firebase Setup ---
const db = getDatabase(app);
const auth = getAuth(app);

// --- DOM Elements ---
const chatMessages = document.querySelector('.chat-messages');
const messageInput = document.querySelector('.message-input');
const sendBtn = document.querySelector('.send-btn');
const otherUserName = document.getElementById('other-user-name');
const otherUserPic = document.getElementById('other-user-pic');
const otherUserStatus = document.getElementById('other-user-status');
const typingIndicator = document.querySelector('.typing-indicator');

// Get other user's ID from URL
const urlParams = new URLSearchParams(window.location.search);
const otherUserId = urlParams.get('uid');

let chatId = null;
let typingTimeout = null;

// --- Utility Functions ---
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// --- Chat Functions ---
function setupChat() {
  if (!auth.currentUser || !otherUserId) {
    window.location.href = 'index.html';
    return;
  }

  // Set up chat ID (sort UIDs to ensure consistent chat ID)
  const uid1 = auth.currentUser.uid;
  const uid2 = otherUserId;
  chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

  // Load other user's info
  const otherUserRef = ref(db, `users/${otherUserId}`);
  onValue(otherUserRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      otherUserName.textContent = data.displayName || 'Anonymous';
      otherUserPic.src = data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'U')}&background=726dff&color=fff`;
      otherUserStatus.textContent = data.online ? 'Online' : 'Offline';
    }
  });

  // Load messages
  const messagesRef = ref(db, `dms/${chatId}`);
  onValue(messagesRef, (snapshot) => {
    chatMessages.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${data.uid === auth.currentUser.uid ? 'own' : ''}`;
      
      messageDiv.innerHTML = `
        <img src="${data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}&background=726dff&color=fff`}" alt="Profile" />
        <div class="message-content">
          <div class="message-sender">${escapeHtml(data.name)}</div>
          ${escapeHtml(data.message)}
          <div class="message-time">${formatTime(data.timestamp)}</div>
        </div>
      `;
      
      chatMessages.appendChild(messageDiv);
    });
    scrollToBottom();
  });
}

// --- Event Listeners ---
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  // Clear existing timeout
  if (typingTimeout) clearTimeout(typingTimeout);
  
  // Show typing indicator
  typingIndicator.classList.add('active');
  
  // Set timeout to hide typing indicator
  typingTimeout = setTimeout(() => {
    typingIndicator.classList.remove('active');
  }, 1000);
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !auth.currentUser) return;

  const messagesRef = ref(db, `dms/${chatId}`);
  const newMessageRef = push(messagesRef);
  
  set(newMessageRef, {
    message: message,
    name: auth.currentUser.displayName || 'Anonymous',
    photoURL: auth.currentUser.photoURL,
    uid: auth.currentUser.uid,
    timestamp: serverTimestamp()
  });

  messageInput.value = '';
  messageInput.focus();
}

// Initialize chat when auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupChat();
  } else {
    window.location.href = 'index.html';
  }
});
