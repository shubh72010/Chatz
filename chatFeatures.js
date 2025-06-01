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
    cleanup
} from './firebaseConfig.js';
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
export async function initializeChat(contactId) {
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
export async function sendMessage(content, chatId) {
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

// Update typing status with error handling
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

// Cleanup function
export function cleanup() {
    if (typingRef) {
        typingRef.off();
    }
    if (onlineStatusRef) {
        onlineStatusRef.off();
    }
    if (messagesRef) {
        messagesRef.onSnapshot(() => {});
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

// Add reaction to message with enhanced error handling
async function addReaction(messageId, reaction) {
    try {
        const messageRef = db.collection('messages').doc(messageId);
        const message = await messageRef.get();
        
        if (!message.exists()) return;
        
        const reactions = message.data().reactions || {};
        const userReaction = reactions[reaction] || [];
        
        if (userReaction.includes(auth.currentUser.uid)) {
            userReaction.splice(userReaction.indexOf(auth.currentUser.uid), 1);
        } else {
            userReaction.push(auth.currentUser.uid);
        }
        
        reactions[reaction] = userReaction;
        
        await updateMessage(messageId, { reactions });
    } catch (error) {
        await errorHandler.handleError(error, 'Add Reaction', async () => {
            return await addReaction(messageId, reaction);
        });
    }
}

// Enhanced Message Editing with time window
async function editMessage(messageId, newContent) {
    try {
        const messageRef = db.collection('messages').doc(messageId);
        const message = await messageRef.get();
        
        if (!message.exists()) return;
        
        const messageData = message.data();
        const editTime = Date.now() - messageData.timestamp;
        
        // Only allow editing within 1 minute
        if (editTime > EDIT_WINDOW) {
            throw new Error('Messages can only be edited within 1 minute of sending');
        }
        
        await updateMessage(messageId, {
            content: newContent,
            edited: true,
            editHistory: [...(messageData.editHistory || []), {
                content: messageData.content,
                timestamp: messageData.timestamp
            }]
        });
    } catch (error) {
        await errorHandler.handleError(error, 'Edit Message');
    }
}

// Enhanced Pull to Refresh with offline support
let isRefreshing = false;
let startY = 0;
const chatMessages = document.querySelector('.chat-messages');
const pullToRefresh = document.querySelector('.pull-to-refresh');

chatMessages.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
});

chatMessages.addEventListener('touchmove', (e) => {
    if (isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;
    
    if (pullDistance > 0 && chatMessages.scrollTop === 0) {
        pullToRefresh.classList.add('active');
        pullToRefresh.textContent = 'Refreshing...';
        
        if (pullDistance > 100) {
            isRefreshing = true;
            loadOlderMessages().then(() => {
                pullToRefresh.classList.remove('active');
                isRefreshing = false;
            }).catch(async (error) => {
                await errorHandler.handleError(error, 'Load Older Messages', async () => {
                    return await loadOlderMessages();
                });
                pullToRefresh.classList.remove('active');
                isRefreshing = false;
            });
        }
    }
});

chatMessages.addEventListener('touchend', () => {
    pullToRefresh.classList.remove('active');
});

// Enhanced Offline Support
let offlineMessages = [];
let isOnline = navigator.onLine;

window.addEventListener('online', async () => {
    isOnline = true;
    await syncOfflineMessages();
});

window.addEventListener('offline', () => {
    isOnline = false;
});

async function syncOfflineMessages() {
    try {
        while (offlineMessages.length > 0) {
            const message = offlineMessages.shift();
            await sendMessage(message.content, message.chatId);
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Sync Offline Messages', async () => {
            return await syncOfflineMessages();
        });
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

// Export enhanced functions
export {
    addReaction,
    updateTypingStatus,
    editMessage,
    sendMessage,
    initIndexedDB,
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    getCachedMessage,
    setupMessageListeners,
    setupTypingListener,
    cleanup,
    currentChatId,
    initializeChat
};