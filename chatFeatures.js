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

// Chat state
let currentChatId = null;
let messageListener = null;
let typingListener = null;
let onlineStatusListener = null;

// Initialize chat with a contact
async function initializeChat(contactId) {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Check if chat already exists
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        let chatDoc = null;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.participants.includes(contactId)) {
                chatDoc = doc;
            }
        });

        if (chatDoc) {
            currentChatId = chatDoc.id;
        } else {
            // Create new chat
            const chatData = {
                participants: [currentUser.uid, contactId],
                createdAt: Date.now(),
                lastMessage: null,
                type: 'direct'
            };
            const chatRef = await addDoc(chatsRef, chatData);
            currentChatId = chatRef.id;
        }

        // Clean up existing listeners
        if (messageListener) messageListener();
        if (typingListener) typingListener();
        if (onlineStatusListener) onlineStatusListener();

        // Set up new listeners
        messageListener = setupMessageListeners(currentChatId);
        typingListener = setupTypingListener(currentChatId);
        onlineStatusListener = listenToOnlineStatus(contactId, (snapshot) => {
            const status = snapshot.val();
            updateOnlineStatus(status);
        });

        // Initialize IndexedDB for offline support
        await initIndexedDB();

        return currentChatId;
    } catch (error) {
        await errorHandler.handleError(error, 'Initialize Chat');
        throw error;
    }
}

// Update online status in UI
function updateOnlineStatus(status) {
    const statusElement = document.querySelector('.chat-header-status');
    if (statusElement) {
        if (status?.online) {
            statusElement.textContent = 'Online';
            statusElement.classList.add('online');
        } else {
            const lastSeen = new Date(status?.lastSeen);
            statusElement.textContent = `Last seen ${lastSeen.toLocaleTimeString()}`;
            statusElement.classList.remove('online');
        }
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
        const messageRef = doc(db, `messages/${messageId}`);
        const message = await getDoc(messageRef);
        
        if (!message.exists()) return;
        
        const reactions = message.data().reactions || {};
        const userReaction = reactions[reaction] || [];
        
        if (userReaction.includes(currentUser.uid)) {
            userReaction.splice(userReaction.indexOf(currentUser.uid), 1);
        } else {
            userReaction.push(currentUser.uid);
        }
        
        reactions[reaction] = userReaction;
        
        await updateMessage(messageId, { reactions });
    } catch (error) {
        await errorHandler.handleError(error, 'Add Reaction', async () => {
            return await addReaction(messageId, reaction);
        });
    }
}

// Typing Indicator
let typingTimeout;
const typingRef = ref(realtimeDb, `typing/${currentChatId}`);

async function updateTypingStatus(isTyping) {
    try {
        if (!currentUser) return;
        
        const userTypingRef = ref(realtimeDb, `typing/${currentChatId}/${currentUser.uid}`);
        
        if (isTyping) {
            await set(userTypingRef, {
                timestamp: Date.now()
            });
        } else {
            await remove(userTypingRef);
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Update Typing Status');
    }
}

// Listen for typing status
const setupTypingListener = (chatId) => {
    const typingRef = ref(realtimeDb, `typing/${chatId}`);
    return onValue(typingRef, (snapshot) => {
        try {
            const typingUsers = snapshot.val() || {};
            
            // Remove expired typing indicators (older than 5 seconds)
            Object.entries(typingUsers).forEach(([userId, data]) => {
                if (Date.now() - data.timestamp > 5000) {
                    remove(ref(realtimeDb, `typing/${chatId}/${userId}`));
                }
            });
            
            // Show typing indicator if other users are typing
            const otherTypingUsers = Object.keys(typingUsers).filter(id => id !== currentUser?.uid);
            const typingIndicator = document.querySelector('.typing-indicator');
            
            if (otherTypingUsers.length > 0) {
                typingIndicator.classList.add('active');
                typingIndicator.innerHTML = `
                    <span>${otherTypingUsers.length} user${otherTypingUsers.length > 1 ? 's' : ''} typing</span>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                `;
            } else {
                typingIndicator.classList.remove('active');
            }
        } catch (error) {
            errorHandler.handleError(error, 'Typing Status Update');
        }
    });
};

// Enhanced Message Editing with time window
async function editMessage(messageId, newContent) {
    try {
        const messageRef = doc(db, `messages/${messageId}`);
        const message = await getDoc(messageRef);
        
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
            await sendMessage(message.content, message.chatId, message.type, message.options);
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Sync Offline Messages', async () => {
            return await syncOfflineMessages();
        });
    }
}

// Enhanced Message Sending with disappearing messages
async function sendMessage(content, chatId, type = MESSAGE_TYPES.TEXT, options = {}) {
    try {
        if (!navigator.onLine) {
            await storeOfflineMessage(content, chatId, type, options);
            return;
        }
        
        const message = {
            content,
            chatId,
            type,
            sender: currentUser.uid,
            timestamp: Date.now(),
            status: MESSAGE_STATUS.SENDING,
            ...options
        };
        
        let messageId;
        
        // Handle disappearing messages
        if (options.disappearAfter) {
            message.status = MESSAGE_STATUS.DISAPPEARING;
            messageId = await firebaseSendMessage(chatId, message);
            const timer = setTimeout(async () => {
                await deleteMessage(chatId, messageId);
            }, options.disappearAfter);
            DISAPPEAR_TIMERS.set(messageId, timer);
        } else {
            messageId = await firebaseSendMessage(chatId, message);
        }
        
        // Cache the message
        cacheMessage(messageId, message);
        
        return messageId;
    } catch (error) {
        await errorHandler.handleError(error, 'Send Message');
        throw error; // Re-throw the error instead of recursive call
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

// Setup message listeners
const setupMessageListeners = (chatId) => {
    const unsubscribe = listenToMessages(chatId, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                cacheMessage(change.doc.id, message);
                // Update UI with new message
                updateMessageUI(change.doc.id, message);
            } else if (change.type === 'modified') {
                const message = change.doc.data();
                cacheMessage(change.doc.id, message);
                // Update UI with modified message
                updateMessageUI(change.doc.id, message);
            } else if (change.type === 'removed') {
                // Remove message from UI
                removeMessageUI(change.doc.id);
            }
        });
    });
    
    return unsubscribe;
};

// Update message UI
function updateMessageUI(messageId, message) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        // Update existing message
        messageElement.innerHTML = createMessageHTML(message);
    } else {
        // Create new message
        const messagesContainer = document.querySelector('.chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender === currentUser.uid ? 'own' : ''}`;
        messageElement.setAttribute('data-message-id', messageId);
        messageElement.innerHTML = createMessageHTML(message);
        messagesContainer.appendChild(messageElement);
    }
}

// Remove message UI
function removeMessageUI(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

// Create message HTML
function createMessageHTML(message) {
    return `
        <div class="message-content">
            ${message.content}
            ${message.edited ? '<span class="edited-indicator">(edited)</span>' : ''}
            <div class="message-reactions">
                ${createReactionsHTML(message.reactions)}
            </div>
        </div>
    `;
}

// Create reactions HTML
function createReactionsHTML(reactions = {}) {
    return Object.entries(reactions)
        .map(([reaction, users]) => `
            <div class="reaction" data-reaction="${reaction}">
                ${reaction}
                <span class="reaction-count">${users.length}</span>
            </div>
        `)
        .join('');
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