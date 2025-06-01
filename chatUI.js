// Import features
import { sendMessage, editMessage, addReaction } from './chatFeatures.js';
import { startVoiceRecording, stopVoiceRecording, searchGifs, sendGif } from './mediaFeatures.js';
import { MESSAGE_TYPES } from './chatFeatures.js';

// Create chat input UI
function createChatInput() {
    const chatInput = document.createElement('div');
    chatInput.className = 'chat-input-container';
    chatInput.innerHTML = `
        <div class="chat-input-wrapper">
            <button class="attach-btn" title="Attach">
                <i class="fas fa-paperclip"></i>
            </button>
            <div class="input-actions">
                <button class="voice-btn" title="Voice Message">
                    <i class="fas fa-microphone"></i>
                </button>
                <button class="gif-btn" title="Send GIF">
                    <i class="fas fa-gift"></i>
                </button>
                <button class="sticker-btn" title="Send Sticker">
                    <i class="fas fa-smile"></i>
                </button>
            </div>
            <div class="message-input-wrapper">
                <textarea class="message-input" placeholder="Type a message..."></textarea>
                <button class="send-btn" title="Send">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    // Add event listeners
    const messageInput = chatInput.querySelector('.message-input');
    const sendBtn = chatInput.querySelector('.send-btn');
    const voiceBtn = chatInput.querySelector('.voice-btn');
    const gifBtn = chatInput.querySelector('.gif-btn');
    const stickerBtn = chatInput.querySelector('.sticker-btn');
    const attachBtn = chatInput.querySelector('.attach-btn');

    // Send message
    sendBtn.onclick = () => {
        const content = messageInput.value.trim();
        if (content) {
            sendMessage(content, currentChatId, MESSAGE_TYPES.TEXT);
            messageInput.value = '';
        }
    };

    // Voice recording
    voiceBtn.onclick = () => {
        if (!isRecording) {
            startVoiceRecording();
            voiceBtn.classList.add('recording');
        } else {
            stopVoiceRecording();
            voiceBtn.classList.remove('recording');
        }
    };

    // GIF picker
    gifBtn.onclick = async () => {
        const gifPicker = document.createElement('div');
        gifPicker.className = 'gif-picker';
        gifPicker.innerHTML = `
            <div class="gif-search">
                <input type="text" placeholder="Search GIFs...">
                <button class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="gif-results"></div>
        `;

        document.body.appendChild(gifPicker);

        const searchInput = gifPicker.querySelector('input');
        const resultsContainer = gifPicker.querySelector('.gif-results');
        const closeBtn = gifPicker.querySelector('.close-btn');

        // Search GIFs
        let searchTimeout;
        searchInput.oninput = async () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = searchInput.value.trim();
                if (query) {
                    const gifs = await searchGifs(query);
                    resultsContainer.innerHTML = gifs.map(gif => `
                        <div class="gif-item" data-url="${gif.url}">
                            <img src="${gif.preview}" alt="${gif.title}">
                        </div>
                    `).join('');

                    // Add click handlers
                    resultsContainer.querySelectorAll('.gif-item').forEach(item => {
                        item.onclick = () => {
                            sendGif(item.dataset.url);
                            gifPicker.remove();
                        };
                    });
                }
            }, 500);
        };

        // Close picker
        closeBtn.onclick = () => gifPicker.remove();
    };

    // Sticker picker
    stickerBtn.onclick = () => {
        const stickerPicker = document.createElement('div');
        stickerPicker.className = 'sticker-picker';
        stickerPicker.innerHTML = `
            <div class="sticker-categories">
                <button class="active" data-category="recent">Recent</button>
                <button data-category="favorites">Favorites</button>
                <button data-category="custom">Custom</button>
            </div>
            <div class="sticker-grid"></div>
        `;

        document.body.appendChild(stickerPicker);

        // Add sticker categories
        const categories = stickerPicker.querySelector('.sticker-categories');
        categories.onclick = (e) => {
            if (e.target.matches('button')) {
                categories.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                // Load stickers for selected category
                loadStickers(e.target.dataset.category);
            }
        };

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!stickerPicker.contains(e.target) && e.target !== stickerBtn) {
                stickerPicker.remove();
            }
        });
    };

    // File attachment
    attachBtn.onclick = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*,video/*,audio/*';
        
        fileInput.onchange = async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                const path = `attachments/${currentUser.uid}/${Date.now()}_${file.name}`;
                const url = await uploadFile(file, path);
                
                let type = MESSAGE_TYPES.TEXT;
                if (file.type.startsWith('image/')) {
                    type = MESSAGE_TYPES.IMAGE;
                } else if (file.type.startsWith('video/')) {
                    type = MESSAGE_TYPES.VIDEO;
                } else if (file.type.startsWith('audio/')) {
                    type = MESSAGE_TYPES.AUDIO;
                }
                
                await sendMessage(url, currentChatId, type, {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });
            }
        };
        
        fileInput.click();
    };

    return chatInput;
}

// Create message actions menu
function createMessageActions(messageId, message) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
        <button class="edit-btn" title="Edit">
            <i class="fas fa-edit"></i>
        </button>
        <button class="react-btn" title="React">
            <i class="fas fa-smile"></i>
        </button>
        <button class="delete-btn" title="Delete">
            <i class="fas fa-trash"></i>
        </button>
    `;

    // Edit message
    actions.querySelector('.edit-btn').onclick = () => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const content = messageElement.querySelector('.message-content');
        const originalText = content.textContent;
        
        content.innerHTML = `
            <textarea class="edit-input">${originalText}</textarea>
            <div class="edit-actions">
                <button class="save-edit">Save</button>
                <button class="cancel-edit">Cancel</button>
            </div>
        `;
        
        const editInput = content.querySelector('.edit-input');
        const saveBtn = content.querySelector('.save-edit');
        const cancelBtn = content.querySelector('.cancel-edit');
        
        saveBtn.onclick = () => {
            const newContent = editInput.value.trim();
            if (newContent && newContent !== originalText) {
                editMessage(messageId, newContent);
            }
            content.innerHTML = originalText;
        };
        
        cancelBtn.onclick = () => {
            content.innerHTML = originalText;
        };
    };

    // Add reaction
    actions.querySelector('.react-btn').onclick = () => {
        const reactionPicker = document.createElement('div');
        reactionPicker.className = 'reaction-picker';
        reactionPicker.innerHTML = `
            <div class="reaction-grid">
                <button data-reaction="👍">👍</button>
                <button data-reaction="❤️">❤️</button>
                <button data-reaction="😂">😂</button>
                <button data-reaction="😮">😮</button>
                <button data-reaction="😢">😢</button>
                <button data-reaction="👏">👏</button>
            </div>
        `;
        
        document.body.appendChild(reactionPicker);
        
        reactionPicker.onclick = (e) => {
            if (e.target.matches('button')) {
                addReaction(messageId, e.target.dataset.reaction);
                reactionPicker.remove();
            }
        };
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!reactionPicker.contains(e.target) && e.target !== actions.querySelector('.react-btn')) {
                reactionPicker.remove();
            }
        });
    };

    // Delete message
    actions.querySelector('.delete-btn').onclick = () => {
        if (confirm('Are you sure you want to delete this message?')) {
            deleteMessage(currentChatId, messageId);
        }
    };

    return actions;
}

// Initialize chat UI
function initChatUI(chatId) {
    const chatContainer = document.querySelector('.chat-container');
    
    // Add chat input
    const chatInput = createChatInput();
    chatContainer.appendChild(chatInput);
    
    // Add message listeners
    setupMessageListeners(chatId);
    setupTypingListener(chatId);
    
    // Add pull-to-refresh
    const chatMessages = document.querySelector('.chat-messages');
    let startY = 0;
    
    chatMessages.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    });
    
    chatMessages.addEventListener('touchmove', (e) => {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0 && chatMessages.scrollTop === 0) {
            const pullToRefresh = document.querySelector('.pull-to-refresh');
            pullToRefresh.classList.add('active');
            
            if (pullDistance > 100) {
                loadOlderMessages().then(() => {
                    pullToRefresh.classList.remove('active');
                });
            }
        }
    });
}

export {
    createChatInput,
    createMessageActions,
    initChatUI
}; 