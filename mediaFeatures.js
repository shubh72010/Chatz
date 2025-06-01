// Import Firebase configuration and error handler
import { 
    auth, 
    db, 
    storage, 
    currentUser,
    uploadFile,
    sendMessage
} from './firebaseConfig.js';
import errorHandler from './errorHandler.js';
import noChancesBrowser from './noChancesBrowser.js';

// Media Types
const MEDIA_TYPES = {
    VOICE: 'voice',
    GIF: 'gif',
    STICKER: 'sticker'
};

// Voice Recording
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Media Features for Chatz
const noChances = noChancesBrowser;

// GIF API Configuration
const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY'; // Replace with your Giphy API key
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

// Start voice recording
export async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.start();
        showRecordingUI();
    } catch (error) {
        errorHandler.handleError(error, 'Failed to start voice recording');
        throw error; // Re-throw to update UI state
    }
}

// Stop voice recording
export async function stopVoiceRecording() {
    try {
        if (!mediaRecorder) {
            throw new Error('No active recording');
        }

        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = await uploadVoiceMessage(audioBlob);
                    hideRecordingUI();
                    resolve(audioUrl);
                } catch (error) {
                    reject(error);
                }
            };

            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        });
    } catch (error) {
        errorHandler.handleError(error, 'Failed to stop voice recording');
        throw error; // Re-throw to update UI state
    }
}

// Upload voice message
async function uploadVoiceMessage(audioBlob) {
    try {
        const fileName = `voice_${Date.now()}.webm`;
        const storageRef = storage.ref(`voice_messages/${fileName}`);
        
        await storageRef.put(audioBlob);
        return await storageRef.getDownloadURL();
    } catch (error) {
        errorHandler.handleError(error, 'Failed to upload voice message');
        throw error;
    }
}

// Get audio duration
async function getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(audioBlob);
        
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
            URL.revokeObjectURL(audio.src);
        };
        
        audio.onerror = (error) => {
            reject(error);
            URL.revokeObjectURL(audio.src);
        };
    });
}

// Auto-transcribe audio
async function transcribeAudio(audioBlob) {
    try {
        // Convert blob to base64
        const base64 = await blobToBase64(audioBlob);
        
        // Call transcription API
        const response = await fetch('YOUR_TRANSCRIPTION_API_ENDPOINT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY'
            },
            body: JSON.stringify({
                audio: base64,
                format: 'webm'
            })
        });
        
        const data = await response.json();
        return data.transcription;
    } catch (error) {
        await errorHandler.handleError(error, 'Transcribe Audio');
        return null;
    }
}

// Convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Show GIF picker
export function showGifPicker() {
    const gifPicker = document.querySelector('.gif-picker');
    gifPicker.style.display = 'block';
    
    // Load trending GIFs
    loadTrendingGifs().catch(error => {
        errorHandler.handleError(error, 'Failed to load GIFs');
    });
}

// Load trending GIFs
async function loadTrendingGifs() {
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`);
        const data = await response.json();
        displayGifs(data.data);
    } catch (error) {
        errorHandler.handleError(error, 'Failed to load trending GIFs');
    }
}

// Search GIFs
export async function searchGifs(query) {
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20`);
        const data = await response.json();
        displayGifs(data.data);
    } catch (error) {
        errorHandler.handleError(error, 'Failed to search GIFs');
    }
}

// Send GIF
export async function sendGif(gifUrl) {
    try {
        await sendMessage({
            type: 'gif',
            content: gifUrl
        });
        
        // Hide GIF picker
        const gifPicker = document.querySelector('.gif-picker');
        gifPicker.style.display = 'none';
    } catch (error) {
        errorHandler.handleError(error, 'Failed to send GIF');
    }
}

// Display GIFs in the results container
function displayGifs(gifs, container) {
    container.innerHTML = gifs.map(gif => `
        <div class="gif-item" data-url="${gif.images.original.url}" data-mp4="${gif.images.original.mp4}">
            <img src="${gif.images.fixed_height_small.url}" 
                 alt="${gif.title || 'GIF'}"
                 loading="lazy"
                 data-original="${gif.images.original.url}"
                 data-mp4="${gif.images.original.mp4}">
            <div class="gif-info">
                <span class="gif-title">${gif.title || 'Untitled GIF'}</span>
                <span class="gif-rating">${gif.rating.toUpperCase()}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const gifUrl = item.dataset.url;
            const gifMp4 = item.dataset.mp4;
            sendGif(gifUrl, gifMp4);
            document.querySelector('.gif-picker').remove();
        });
    });
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for GIF picker
const style = document.createElement('style');
style.textContent = `
    .gif-picker {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 320px;
        height: 450px;
        background: #1a1a1a;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .gif-picker-header {
        padding: 12px;
        border-bottom: 1px solid #333;
        display: flex;
        gap: 10px;
        background: #222;
        border-radius: 12px 12px 0 0;
    }

    .gif-search {
        flex: 1;
        padding: 10px;
        border: 1px solid #444;
        border-radius: 6px;
        background: #2a2a2a;
        color: #fff;
        font-size: 14px;
    }

    .gif-search:focus {
        outline: none;
        border-color: #666;
    }

    .close-picker {
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
    }

    .gif-results {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        background: #1a1a1a;
    }

    .gif-item {
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
        background: #222;
        position: relative;
    }

    .gif-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .gif-item img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
    }

    .gif-info {
        padding: 8px;
        background: rgba(0, 0, 0, 0.7);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
    }

    .gif-title {
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 70%;
    }

    .gif-rating {
        color: #aaa;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
    }

    /* Scrollbar styling */
    .gif-results::-webkit-scrollbar {
        width: 8px;
    }

    .gif-results::-webkit-scrollbar-track {
        background: #1a1a1a;
    }

    .gif-results::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    .gif-results::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;
document.head.appendChild(style);

// Show recording UI
function showRecordingUI() {
    const recordingUI = document.createElement('div');
    recordingUI.className = 'recording-ui';
    recordingUI.innerHTML = `
        <div class="recording-indicator">
            <div class="recording-dot"></div>
            Recording...
        </div>
        <button class="stop-recording-btn">
            <i class="fas fa-stop"></i>
        </button>
    `;
    
    document.body.appendChild(recordingUI);
    
    // Add stop recording handler
    recordingUI.querySelector('.stop-recording-btn').onclick = stopVoiceRecording;
}

// Hide recording UI
function hideRecordingUI() {
    const recordingUI = document.querySelector('.recording-ui');
    if (recordingUI) {
        recordingUI.remove();
    }
}

// Export enhanced functions
export {
    startVoiceRecording,
    stopVoiceRecording,
    searchGifs,
    sendGif,
    MEDIA_TYPES
}; 
