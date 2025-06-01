// Import Firebase configuration and error handler
import { 
    auth, 
    db, 
    storage, 
    realtimeDb,
    currentUser,
    sendMessage as firebaseSendMessage,
    updateMessage,
    deleteMessage,
    uploadFile,
    listenToMessages,
    listenToTyping,
    listenToOnlineStatus,
    cleanup as firebaseCleanup
} from './firebaseConfig.js';
import { 
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import errorHandler from './errorHandler.js';
import noChancesBrowser from './noChancesBrowser.js';

// Initialize NoChances
const noChances = noChancesBrowser;

// Initialize Firebase references
let chatRef = null;
let messagesRef = null;
let typingRef = null;
let onlineStatusRef = null;

// Chat state
let currentChatId = null;
let messageListener = null;
let typingListener = null;
let onlineStatusListener = null;

// Initialize chat with a contact
async function initializeChat(contactId) {
    try {
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }

        // Create chat reference
        const chatId = [auth.currentUser.uid, contactId].sort().join('_');
        chatRef = db.collection('chats').doc(chatId);
        messagesRef = chatRef.collection('messages');
        typingRef = realtimeDb.ref(`typing/${chatId}`);
        onlineStatusRef = realtimeDb.ref(`onlineStatus/${contactId}`);

        // Initialize chat document if it doesn't exist
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) {
            await chatRef.set({
                participants: [auth.currentUser.uid, contactId],
                createdAt: new Date(),
                lastMessage: null,
                lastMessageTime: null
            });
        }

        // Set up listeners
        setupMessageListeners();
        setupTypingListener();
        setupOnlineStatusListener();

        return chatId;
    } catch (error) {
        console.error('Failed to initialize chat:', error);
        throw error;
    }
}

// Set up message listeners with error handling
function setupMessageListeners() {
    if (!messagesRef) {
        throw new Error('Messages reference not initialized');
    }

    return messagesRef
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        displayMessage(message);
                    }
                });
            },
            (error) => {
                console.error('Error listening to messages:', error);
                throw error;
            }
        );
}

// Set up typing listener with error handling
function setupTypingListener() {
    if (!typingRef) {
        throw new Error('Typing reference not initialized');
    }

    return typingRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data[auth.currentUser.uid]) {
            showTypingIndicator();
        } else {
            hideTypingIndicator();
        }
    });
}

// Set up online status listener with error handling
function setupOnlineStatusListener() {
    if (!onlineStatusRef) {
        throw new Error('Online status reference not initialized');
    }

    return onlineStatusRef.on('value', (snapshot) => {
        const isOnline = snapshot.val();
        updateOnlineStatus(isOnline);
    });
}

// Send message with error handling
async function sendMessage(content, chatId) {
    try {
        if (!messagesRef) {
            throw new Error('Messages reference not initialized');
        }

        const message = {
            content,
            senderId: auth.currentUser.uid,
            timestamp: new Date(),
            type: 'text',
            status: 'sent'
        };

        await firebaseSendMessage(chatId, message);
        await chatRef.update({
            lastMessage: content,
            lastMessageTime: new Date()
        });

        return message;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

// UI Helper functions
function displayMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === auth.currentUser.uid ? 'own' : ''}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-sender">${message.senderId === auth.currentUser.uid ? 'You' : 'Other User'}</div>
            <div class="message-text">${message.content}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
            <div class="message-status">${message.status}</div>
        </div>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.classList.add('active');
    }
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}

function updateOnlineStatus(isOnline) {
    const statusElement = document.querySelector('#other-user-status');
    if (statusElement) {
        statusElement.textContent = isOnline ? 'Online' : 'Offline';
        statusElement.className = `chat-header-status ${isOnline ? 'online' : 'offline'}`;
    }
}

// Message Reactions
const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];

// Message Types
const MESSAGE_TYPES = {
    TEXT: 'text',
    VOICE: 'voice',
    GIF: 'gif',
    STICKER: 'sticker'
};

// Message Status
const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    DISAPPEARING: 'disappearing'
};

// Message Cache with enhanced features
const messageCache = new Map();
const MESSAGE_CACHE_SIZE = 100;
const EDIT_WINDOW = 60000; // 1 minute edit window
const DISAPPEAR_TIMERS = new Map();

// Add reaction to message
export async function addReaction(messageId, reaction) {
    try {
        // Add reaction logic here
        await db.collection('messages').doc(messageId).update({
            reactions: firebase.firestore.FieldValue.arrayUnion({
                userId: currentUser.uid,
                reaction,
                timestamp: Date.now()
            })
        });
    } catch (error) {
        errorHandler.handleError(error, 'Failed to add reaction');
    }
}

// Edit message
export async function editMessage(messageId, newContent) {
    try {
        await db.collection('messages').doc(messageId).update({
            content: newContent,
            edited: true,
            editedAt: Date.now()
        });
    } catch (error) {
        errorHandler.handleError(error, 'Failed to edit message');
    }
}

// Load older messages
export async function loadOlderMessages() {
    try {
        // Load older messages logic here
        const messages = await db.collection('messages')
            .where('chatId', '==', currentChatId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        return messages.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        errorHandler.handleError(error, 'Failed to load older messages');
        return [];
    }
}

// Sync offline messages
export async function syncOfflineMessages() {
    try {
        const offlineMessages = await getOfflineMessages();
        for (const message of offlineMessages) {
            await sendMessage(message.content, message.chatId);
            await removeOfflineMessage(message.id);
        }
    } catch (error) {
        errorHandler.handleError(error, 'Failed to sync offline messages');
    }
}

// Store offline message
export async function storeOfflineMessage(content, chatId) {
    try {
        const message = {
            content,
            chatId,
            timestamp: Date.now(),
            senderId: currentUser.uid,
            status: 'pending'
        };
        await db.collection('offlineMessages').add(message);
    } catch (error) {
        errorHandler.handleError(error, 'Failed to store offline message');
    }
}

// Enhanced Message Caching
function cacheMessage(messageId, message) {
    if (messageCache.size >= MESSAGE_CACHE_SIZE) {
        const oldestKey = messageCache.keys().next().value;
        messageCache.delete(oldestKey);
    }
    messageCache.set(messageId, message);
}

function getCachedMessage(messageId) {
    return messageCache.get(messageId);
}

// Enhanced IndexedDB for offline storage
const dbName = 'chatzOffline';
const storeName = 'messages';

async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                store.createIndex('chatId', 'chatId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function storeOfflineMessage(content, chatId, type, options = {}) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.add({
            content,
            chatId,
            type,
            options,
            timestamp: Date.now()
        });
    } catch (error) {
        await errorHandler.handleError(error, 'Store Offline Message', async () => {
            return await storeOfflineMessage(content, chatId, type, options);
        });
    }
}

// Update typing status with error handling
function updateTypingStatus(isTyping) {
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
    sendMessage,
    updateTypingStatus
};
