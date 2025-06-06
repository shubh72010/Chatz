// chatLogic.js
import { app } from '../firebaseConfig.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  serverTimestamp,
  update,
  query,
  orderByChild,
  get,
  endBefore,
  limitToLast
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
let otherUserData = null;
let currentUserData = null;
let lastLoadedTimestamp = null;
let isLoading = false;

// --- Utility Functions ---
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function getAvatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=726dff&color=fff`;
}

// --- Chat Functions ---
function setupChat() {
  if (!auth.currentUser || !otherUserId) {
    window.location.href = '/Chatz/index.html';
    return;
  }

  // Set up chat ID (sort UIDs to ensure consistent chat ID)
  const uid1 = auth.currentUser.uid;
  const uid2 = otherUserId;
  chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

  // Update current user's data in Firebase
  const currentUserRef = ref(db, `users/${auth.currentUser.uid}`);
  currentUserData = {
    displayName: auth.currentUser.displayName || 'Anonymous',
    photoURL: auth.currentUser.photoURL || getAvatarUrl(auth.currentUser.displayName),
    online: true,
    lastSeen: serverTimestamp()
  };
  update(currentUserRef, currentUserData);

  // Load other user's info
  const otherUserRef = ref(db, `users/${otherUserId}`);
  onValue(otherUserRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      otherUserData = data;
      otherUserName.textContent = data.displayName || 'Anonymous';
      otherUserPic.src = data.photoURL || getAvatarUrl(data.displayName);
      otherUserStatus.textContent = data.online ? 'Online' : 'Offline';
    }
  });

  // Load initial messages
  const messagesRef = ref(db, `dms/${chatId}`);
  const messagesQuery = query(messagesRef, 
    orderByChild('timestamp'),
    limitToLast(20)
  );

  onValue(messagesQuery, (snapshot) => {
    const wasNearBottom = window.chatUI?.isNearBottom() ?? true;
    chatMessages.innerHTML = '';
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${data.uid === auth.currentUser.uid ? 'own' : ''}`;
      
      const isCurrentUser = data.uid === auth.currentUser.uid;
      const displayName = isCurrentUser ? currentUserData.displayName : (otherUserData?.displayName || 'Anonymous');
      const photoURL = isCurrentUser ? currentUserData.photoURL : (otherUserData?.photoURL || getAvatarUrl(displayName));
      
      messageDiv.innerHTML = `
        <img src="${photoURL}" alt="Profile" />
        <div class="message-content">
          <div class="message-sender">${escapeHtml(displayName)}</div>
          ${escapeHtml(data.message)}
          <div class="message-time">${formatTime(data.timestamp)}</div>
        </div>
      `;
      
      chatMessages.appendChild(messageDiv);
      lastLoadedTimestamp = data.timestamp;
    });
    
    if (wasNearBottom) {
      window.chatUI?.scrollToBottom(false);
    }
  });

  // Listen for load more messages event
  chatMessages.addEventListener('loadMoreMessages', async (event) => {
    if (isLoading) return;
    
    try {
      isLoading = true;
      const messagesRef = ref(db, `dms/${chatId}`);
      let messagesQuery = query(messagesRef, orderByChild('timestamp'));
      
      if (lastLoadedTimestamp) {
        messagesQuery = query(messagesRef, 
          orderByChild('timestamp'),
          endBefore(lastLoadedTimestamp),
          limitToLast(20)
        );
      }

      const snapshot = await get(messagesQuery);
      const messages = [];
      
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        messages.unshift(message); // Add to beginning of array
        lastLoadedTimestamp = message.timestamp;
      });

      // Prepend messages to chat
      messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.uid === auth.currentUser.uid ? 'own' : ''}`;
        
        const isCurrentUser = message.uid === auth.currentUser.uid;
        const displayName = isCurrentUser ? currentUserData.displayName : (otherUserData?.displayName || 'Anonymous');
        const photoURL = isCurrentUser ? currentUserData.photoURL : (otherUserData?.photoURL || getAvatarUrl(displayName));
        
        messageDiv.innerHTML = `
          <img src="${photoURL}" alt="Profile" />
          <div class="message-content">
            <div class="message-sender">${escapeHtml(displayName)}</div>
            ${escapeHtml(message.message)}
            <div class="message-time">${formatTime(message.timestamp)}</div>
          </div>
        `;
        
        chatMessages.insertBefore(messageDiv, chatMessages.firstChild);
      });

      // Adjust scroll position to maintain relative position
      if (messages.length > 0) {
        const firstMessage = chatMessages.firstChild;
        const scrollOffset = firstMessage.offsetHeight * messages.length;
        chatMessages.scrollTop += scrollOffset;
      }

      window.chatUI?.stopLoading();
    } catch (error) {
      console.error("Error loading more messages:", error);
      window.chatUI?.stopLoading();
    } finally {
      isLoading = false;
    }
  });

  // Listen for typing status
  const typingRef = ref(db, `typing/${chatId}`);
  onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data[otherUserId] && data[otherUserId].isTyping) {
      typingIndicator.textContent = `${otherUserData?.displayName || 'Anonymous'} is typing...`;
      typingIndicator.classList.add('active');
    } else {
      typingIndicator.classList.remove('active');
    }
  });

  // Set up online status
  window.addEventListener('beforeunload', () => {
    update(currentUserRef, {
      online: false,
      lastSeen: serverTimestamp()
    });
  });
}

// --- Event Listeners ---
function setupEventListeners() {
  sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (!message || !auth.currentUser) return;
    sendMessage(message);
  });

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = messageInput.value.trim();
      if (!message || !auth.currentUser) return;
      sendMessage(message);
    }
  });

  messageInput.addEventListener('input', () => {
    if (!auth.currentUser || !chatId) return;
    
    // Clear existing timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Update typing status
    const typingRef = ref(db, `typing/${chatId}/${auth.currentUser.uid}`);
    set(typingRef, {
      isTyping: true,
      timestamp: serverTimestamp()
    });
    
    // Set timeout to hide typing indicator
    typingTimeout = setTimeout(() => {
      set(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 1000);
  });
}

function sendMessage(message) {
  if (!message || !auth.currentUser || !chatId) return;

  const messagesRef = ref(db, `dms/${chatId}`);
  const newMessageRef = push(messagesRef);
  
  set(newMessageRef, {
    message: message,
    name: currentUserData.displayName,
    photoURL: currentUserData.photoURL,
    uid: auth.currentUser.uid,
    timestamp: serverTimestamp()
  });

  // Clear typing status
  const typingRef = ref(db, `typing/${chatId}/${auth.currentUser.uid}`);
  set(typingRef, {
    isTyping: false,
    timestamp: serverTimestamp()
  });

  messageInput.value = '';
  messageInput.focus();
  window.chatUI?.scrollToBottom(true);
}

// Initialize chat when auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupChat();
    setupEventListeners();
  } else {
    window.location.href = '/Chatz/index.html';
  }
});
