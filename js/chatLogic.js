// chatLogic.js
import { app } from '/Chatz/js/firebaseConfig.js';
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
  onDisconnect,
  remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { authHandler } from './auth.js';

// Initialize Firebase
const db = getDatabase(app);
const storage = getStorage(app);

class ChatLogic {
  constructor() {
    this.currentChat = null;
    this.messages = new Map();
    this.typingUsers = new Map();
    this.chatListeners = new Set();
    this.messageListeners = new Set();
    this.typingListeners = new Set();
    this.init();
  }

  init() {
    // Listen for auth state changes
    authHandler.onAuthStateChanged(async (user) => {
      if (user) {
        // Reset state when user changes
        this.cleanup();
      }
    });
  }

  async startChat(userId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !userId) return null;

    try {
      // Check if chat already exists
      const existingChatId = await this.getChatId(userId);
      if (existingChatId) {
        this.currentChat = existingChatId;
        await this.setupChatListeners(existingChatId);
        return existingChatId;
      }

      // Create new chat
      const chatRef = push(ref(db, 'chats'));
      const newChatId = chatRef.key;

      // Set up chat data
      await set(chatRef, {
        participants: {
          [currentUser.uid]: true,
          [userId]: true
        },
        createdAt: serverTimestamp(),
        lastMessage: null,
        type: 'dm'
      });

      this.currentChat = newChatId;
      await this.setupChatListeners(newChatId);
      return newChatId;
    } catch (error) {
      console.error('Error starting chat:', error);
      throw error;
    }
  }

  async getChatId(userId) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !userId) return null;

    try {
      // Query chats where both users are participants
      const chatsRef = ref(db, 'chats');
      const snapshot = await get(chatsRef);
      
      if (!snapshot.exists()) return null;

      for (const [chatId, chatData] of Object.entries(snapshot.val())) {
        if (chatData.type === 'dm') {
          const participants = chatData.participants || {};
          if (participants[currentUser.uid] && participants[userId]) {
            return chatId;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting chat ID:', error);
      throw error;
    }
  }

  async setupChatListeners(chatId) {
    if (!chatId) return;

    // Listen for messages
    const messagesRef = query(
      ref(db, `chats/${chatId}/messages`),
      orderByChild('timestamp')
    );

    onValue(messagesRef, (snapshot) => {
      this.messages.clear();
      snapshot.forEach((childSnapshot) => {
        const messageData = childSnapshot.val();
        this.messages.set(childSnapshot.key, messageData);
      });
      this.notifyMessageListeners();
    });

    // Listen for typing status
    const typingRef = ref(db, `chats/${chatId}/typing`);
    onValue(typingRef, (snapshot) => {
      this.typingUsers.clear();
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.key !== authHandler.getCurrentUser()?.uid) {
            this.typingUsers.set(childSnapshot.key, childSnapshot.val());
          }
        });
      }
      this.notifyTypingListeners();
    });

    // Set up disconnect handling for typing status
    const userTypingRef = ref(db, `chats/${chatId}/typing/${authHandler.getCurrentUser()?.uid}`);
    onDisconnect(userTypingRef).remove();
  }

  async sendMessage(text, replyTo = null, fileData = null) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !this.currentChat || (!text && !fileData)) return null;

    try {
      const messageRef = push(ref(db, 'messages'));
      const messageId = messageRef.key;

      const messageData = {
        id: messageId,
        text: text || '',
        uid: currentUser.uid, // Use 'uid' for security rule compliance
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        timestamp: serverTimestamp(),
        read: false
      };

      if (replyTo) {
        messageData.replyTo = {
          messageId: replyTo.messageId,
          senderId: replyTo.senderId,
          senderName: replyTo.senderName,
          text: replyTo.text
        };
      }

      if (fileData) {
        Object.assign(messageData, fileData);
      }

      // Only update messages (not lastMessage) for security rule compliance
      await set(messageRef, messageData);
      return messageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async uploadFile(file) {
    if (!file) return null;

    try {
      const currentUser = authHandler.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      // Create a unique file path
      const filePath = `chats/${this.currentChat}/files/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, filePath);

      // Upload file
      await uploadBytes(fileRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async clearChat(chatId) {
    if (!chatId) return;

    try {
      const currentUser = authHandler.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      // Get all messages
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const snapshot = await get(messagesRef);

      if (snapshot.exists()) {
        // Delete all messages
        const updates = {};
        snapshot.forEach((childSnapshot) => {
          updates[`chats/${chatId}/messages/${childSnapshot.key}`] = null;
        });

        // Update last message
        updates[`chats/${chatId}/lastMessage`] = null;

        await update(ref(db), updates);
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
      throw error;
    }
  }

  async getChatInfo(chatId) {
    if (!chatId) return null;

    try {
      const chatRef = ref(db, `chats/${chatId}`);
      const snapshot = await get(chatRef);
      
      if (!snapshot.exists()) return null;

      const chatData = snapshot.val();
      const currentUser = authHandler.getCurrentUser();
      
      // Get other user's ID
      const otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);
      if (!otherUserId) return null;

      // Get other user's data
      const userRef = ref(db, `users/${otherUserId}`);
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) return null;

      return {
        chatId,
        otherUser: userSnapshot.val(),
        lastMessage: chatData.lastMessage
      };
    } catch (error) {
      console.error('Error getting chat info:', error);
      throw error;
    }
  }

  setTypingStatus(isTyping) {
    const currentUser = authHandler.getCurrentUser();
    if (!currentUser || !this.currentChat) return;

    const typingRef = ref(db, `chats/${this.currentChat}/typing/${currentUser.uid}`);
    
    if (isTyping) {
      set(typingRef, {
        isTyping: true,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp()
      });
    } else {
      remove(typingRef);
    }
  }

  // Event Listener Methods
  onChatChange(callback) {
    this.chatListeners.add(callback);
    callback(this.currentChat);
    return () => this.chatListeners.delete(callback);
  }

  onMessagesChange(callback) {
    this.messageListeners.add(callback);
    callback(Array.from(this.messages.entries()));
    return () => this.messageListeners.delete(callback);
  }

  onTypingChange(callback) {
    this.typingListeners.add(callback);
    callback(Array.from(this.typingUsers.entries()));
    return () => this.typingListeners.delete(callback);
  }

  notifyChatListeners() {
    this.chatListeners.forEach(callback => callback(this.currentChat));
  }

  notifyMessageListeners() {
    const messagesList = Array.from(this.messages.entries());
    this.messageListeners.forEach(callback => callback(messagesList));
  }

  notifyTypingListeners() {
    const typingList = Array.from(this.typingUsers.entries());
    this.typingListeners.forEach(callback => callback(typingList));
  }

  cleanup() {
    this.currentChat = null;
    this.messages.clear();
    this.typingUsers.clear();
    this.chatListeners.clear();
    this.messageListeners.clear();
    this.typingListeners.clear();
  }

  getCurrentChat() {
    return this.currentChat;
  }

  getMessages() {
    return Array.from(this.messages.entries());
  }

  getTypingUsers() {
    return Array.from(this.typingUsers.entries());
  }
}

// Create and export a single instance
export const chatLogic = new ChatLogic();
