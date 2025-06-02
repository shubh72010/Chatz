// Import Firebase configuration and helpers
import { app } from './firebaseConfig.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  onValue,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Initialize Firebase services
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Message types and status
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  GIF: 'gif'
};

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  ERROR: 'error'
};

// Chat state
let currentChatId = null;
let typingRef = null;

// Initialize chat
export function initializeChat(chatId) {
  currentChatId = chatId;
  typingRef = ref(db, `typing/${chatId}`);
}

// Send message
export async function sendMessage(message, type = MESSAGE_TYPES.TEXT) {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    if (!currentChatId) throw new Error('No active chat');

    const messageData = {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName,
      message,
      type,
      timestamp: Date.now(),
      status: MESSAGE_STATUS.SENT
    };

    const chatRef = ref(db, `chats/${currentChatId}/messages`);
    await push(chatRef, messageData);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Update typing status
export function updateTypingStatus(isTyping) {
  try {
    if (!typingRef) {
      throw new Error('Typing reference not initialized');
    }

    typingRef.child(auth.currentUser.uid).set(isTyping);
  } catch (error) {
    console.error('Error updating typing status:', error);
    throw error;
  }
}

// Setup message listeners
export function setupMessageListeners(callback) {
  if (!currentChatId) return;
  const chatRef = ref(db, `chats/${currentChatId}/messages`);
  return onChildAdded(chatRef, callback);
}

// Setup typing listener
export function setupTypingListener(callback) {
  if (!typingRef) return;
  return onValue(typingRef, callback);
}

// Load older messages
export async function loadOlderMessages(limit = 20) {
  try {
    if (!currentChatId) throw new Error('No active chat');
    const chatRef = ref(db, `chats/${currentChatId}/messages`);
    const snapshot = await get(chatRef);
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    return messages.slice(-limit);
  } catch (error) {
    console.error('Error loading messages:', error);
    throw error;
  }
}

// Export enhanced functions
export {
  addReaction,
  editMessage,
  initIndexedDB,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  getCachedMessage,
  setupMessageListeners,
  setupTypingListener,
  currentChatId,
  initializeChat,
  loadOlderMessages,
  sendMessage
}; 