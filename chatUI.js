// Import chat features
import {
  initializeChat,
  sendMessage,
  setupMessageListeners,
  setupTypingListener,
  updateTypingStatus,
  loadOlderMessages
} from './chatFeatures.js';

// DOM Elements
const chat = document.getElementById('chat');
const form = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send-btn');
const replyPreview = document.getElementById('reply-preview');
const replyText = document.getElementById('reply-text');
const cancelReplyBtn = document.getElementById('cancel-reply');
const signInBtn = document.getElementById('sign-in');
const signOutBtn = document.getElementById('sign-out');
const friendsList = document.getElementById('friends-list');
const usersList = document.getElementById('users-list');
const groupsList = document.getElementById('groups-list');
const myGroupsList = document.getElementById('my-groups-list');
const createGroupBtn = document.getElementById('create-group-btn');
const publicChatBtn = document.getElementById('public-chat');

// Chat state
let replyTo = null;
let chatContext = { type: 'public' };
let chatListener = null;
let chatListenerRef = null;

// Initialize chat UI
export function initChatUI() {
  // Setup event listeners
  form.addEventListener('submit', handleSendMessage);
  messageInput.addEventListener('input', handleTyping);
  cancelReplyBtn.addEventListener('click', cancelReply);
  publicChatBtn.addEventListener('click', () => setChatContext({ type: 'public' }));
  
  // Load initial messages
  loadMessages();
}

// Handle sending messages
async function handleSendMessage(e) {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  try {
    await sendMessage(message);
    messageInput.value = '';
    cancelReply();
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Handle typing status
function handleTyping() {
  updateTypingStatus(true);
  setTimeout(() => updateTypingStatus(false), 1000);
}

// Cancel reply
function cancelReply() {
  replyTo = null;
  replyText.textContent = '';
  replyPreview.style.display = 'none';
}

// Set chat context
function setChatContext(ctx) {
  chatContext = ctx;
  clearChat();
  if (chatListenerRef && chatListener) {
    removeListener(chatListenerRef, 'child_added', chatListener);
  }
  loadMessages();
}

// Clear chat
function clearChat() {
  chat.innerHTML = '';
}

// Load messages
function loadMessages() {
  clearChat();
  const chatRef = getChatRef();
  chatListenerRef = chatRef;
  chatListener = setupMessageListeners((snapshot) => {
    const data = snapshot.val();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    if (auth.currentUser && data.uid === auth.currentUser.uid) msgDiv.classList.add('own');
    
    let replyHTML = '';
    if (data.replyTo) {
      replyHTML = `<div style="font-size:0.75rem; opacity:0.7; margin-bottom:4px; border-left: 3px solid var(--main); padding-left: 6px; color:#fff;">
        Reply to: <strong>${escapeHtml(data.replyTo.name)}</strong>: ${escapeHtml(truncate(data.replyTo.message, 40))}
      </div>`;
    }
    
    msgDiv.innerHTML = `
      ${replyHTML}
      <strong>${escapeHtml(data.name)}</strong>: ${escapeHtml(data.message)}
      <div class="meta">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    
    msgDiv.addEventListener('click', () => {
      if (!auth.currentUser) return;
      if (data.uid === auth.currentUser.uid) return;
      replyTo = { id: snapshot.key, name: data.name, message: data.message };
      replyText.textContent = `${replyTo.name}: ${truncate(replyTo.message, 50)}`;
      replyPreview.style.display = 'flex';
      messageInput.focus();
    });
    
    chat.appendChild(msgDiv);
    scrollToBottom();
  });
}

// Utility functions
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
}

function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + '…' : str;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// Export functions
export {
  initChatUI,
  setChatContext,
  loadMessages
}; 