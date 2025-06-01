import { 
    auth, 
    db, 
    storage, 
    realtimeDb,
    currentUser,
    sendMessage,
    updateMessage,
    deleteMessage,
    uploadFile,
    listenToMessages,
    listenToTyping,
    listenToOnlineStatus,
    cleanup as firebaseCleanup
} from './firebaseConfig.js';
import {
    addReaction,
    updateTypingStatus,
    editMessage,
    sendMessage as chatSendMessage,
    initIndexedDB,
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    getCachedMessage,
    setupMessageListeners,
    setupTypingListener,
    cleanup as chatCleanup,
    currentChatId,
    initializeChat
} from './chatFeatures.js';
import {
    startVoiceRecording,
    stopVoiceRecording,
    showGifPicker,
    sendGif
} from './mediaFeatures.js';
import {
    initializeSecurity,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser,
    setMessageExpiration
} from './security.js';
import errorHandler from './errorHandler.js';

// Initialize IndexedDB
initIndexedDB();

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const voiceButton = document.getElementById('voice-btn');
const gifButton = document.getElementById('emoji-btn');
const blockButton = document.getElementById('block-btn');
const reportButton = document.getElementById('report-btn');
const disappearButton = document.getElementById('disappear-btn');
const chatMessages = document.querySelector('.chat-messages');
let messageTimer = null;

// Get chat ID from URL
const urlParams = new URLSearchParams(window.location.search);
const contactId = urlParams.get('uid');

if (!contactId) {
    window.location.href = 'global.html';
}

// Initialize chat
initializeChat(contactId).catch(error => {
    console.error('Failed to initialize chat:', error);
    errorHandler.handleError(error, 'Chat Initialization');
});

// Typing indicator
let typingTimeout;
messageInput.addEventListener('input', () => {
    updateTypingStatus(true);
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        updateTypingStatus(false);
    }, 1000);
});

// Message input handling
sendButton.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (content) {
        try {
            await chatSendMessage(content, currentChatId);
            messageInput.value = '';
        } catch (error) {
            errorHandler.handleError(error, 'Send Message');
        }
    }
});

messageInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (content) {
            try {
                await chatSendMessage(content, currentChatId);
                messageInput.value = '';
            } catch (error) {
                errorHandler.handleError(error, 'Send Message');
            }
        }
    }
});

// Voice recording
let isRecording = false;
voiceButton.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            await startVoiceRecording();
            isRecording = true;
            voiceButton.classList.add('recording');
        } catch (error) {
            errorHandler.handleError(error, 'Start Voice Recording');
        }
    } else {
        try {
            await stopVoiceRecording();
            isRecording = false;
            voiceButton.classList.remove('recording');
        } catch (error) {
            errorHandler.handleError(error, 'Stop Voice Recording');
        }
    }
});

// GIF button handling
gifButton.addEventListener('click', () => {
    showGifPicker();
});

// Initialize security features
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await initializeSecurity();
    } else {
        window.location.href = 'index.html';
    }
});

// Block user handling
blockButton.addEventListener('click', async () => {
    const isBlocked = await isUserBlocked(contactId);
    
    if (isBlocked) {
        await unblockUser(contactId);
        blockButton.innerHTML = '<i class="fas fa-ban"></i>';
        blockButton.title = 'Block User';
    } else {
        await blockUser(contactId);
        blockButton.innerHTML = '<i class="fas fa-check"></i>';
        blockButton.title = 'Unblock User';
    }
});

// Report user handling
reportButton.addEventListener('click', () => {
    const reportModal = document.getElementById('report-modal');
    reportModal.style.display = 'flex';
});

document.getElementById('submit-report').addEventListener('click', async () => {
    const reason = document.getElementById('report-reason').value.trim();
    if (!reason) {
        alert('Please provide a reason for reporting');
        return;
    }

    await reportUser(contactId, reason);
    
    document.getElementById('report-modal').style.display = 'none';
    document.getElementById('report-reason').value = '';
    alert('User has been reported. Thank you for helping keep our community safe.');
});

// Message timer handling
disappearButton.addEventListener('click', () => {
    const disappearModal = document.getElementById('disappear-modal');
    disappearModal.style.display = 'flex';
});

document.querySelectorAll('.timer-options button').forEach(button => {
    button.addEventListener('click', () => {
        messageTimer = parseInt(button.dataset.time);
        document.getElementById('disappear-modal').style.display = 'none';
        disappearButton.classList.add('active');
    });
});

// Close modals
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    firebaseCleanup();
}); 