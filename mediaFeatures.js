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

// Start voice recording with enhanced error handling
async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await uploadVoiceMessage(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // Show recording UI
        showRecordingUI();
    } catch (error) {
        await errorHandler.handleError(error, 'Start Voice Recording', async () => {
            return await startVoiceRecording();
        });
    }
}

// Stop voice recording
async function stopVoiceRecording() {
    try {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            
            // Hide recording UI
            hideRecordingUI();
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Stop Voice Recording');
    }
}

// Upload voice message with auto-transcription
async function uploadVoiceMessage(audioBlob) {
    try {
        if (!currentUser) throw new Error('User not authenticated');
        
        // Get audio duration
        const duration = await getAudioDuration(audioBlob);
        
        // Upload to storage
        const path = `voice-messages/${currentUser.uid}/${Date.now()}.webm`;
        const url = await uploadFile(audioBlob, path);
        
        // Auto-transcribe for accessibility
        const transcription = await transcribeAudio(audioBlob);
        
        // Send message
        await sendMessage(url, currentChatId, MEDIA_TYPES.VOICE, {
            duration,
            transcription
        });
    } catch (error) {
        await errorHandler.handleError(error, 'Upload Voice Message', async () => {
            return await uploadVoiceMessage(audioBlob);
        });
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
export async function showGifPicker() {
    try {
        // Create GIF picker container
        const pickerContainer = document.createElement('div');
        pickerContainer.className = 'gif-picker';
        pickerContainer.innerHTML = `
            <div class="gif-picker-header">
                <input type="text" class="gif-search" placeholder="Search GIFs...">
                <button class="close-picker">×</button>
            </div>
            <div class="gif-results"></div>
        `;

        // Add to DOM
        document.body.appendChild(pickerContainer);

        // Setup event listeners
        const searchInput = pickerContainer.querySelector('.gif-search');
        const resultsContainer = pickerContainer.querySelector('.gif-results');
        const closeButton = pickerContainer.querySelector('.close-picker');

        // Search GIFs
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value;
            if (query.length < 2) return;

            try {
                const gifs = await searchGifs(query);
                displayGifs(gifs, resultsContainer);
            } catch (error) {
                noChances.handleError(error, 'GIF Search Error');
            }
        }, 300));

        // Close picker
        closeButton.addEventListener('click', () => {
            pickerContainer.remove();
        });

        // Load trending GIFs initially
        try {
            const trendingGifs = await getTrendingGifs();
            displayGifs(trendingGifs, resultsContainer);
        } catch (error) {
            noChances.handleError(error, 'Trending GIFs Error');
        }

    } catch (error) {
        noChances.handleError(error, 'Show GIF Picker Error');
    }
}

// Search GIFs from Giphy
async function searchGifs(query) {
    try {
        const response = await fetch(`${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        noChances.handleError(error, 'GIF Search API Error');
        return [];
    }
}

// Get trending GIFs
async function getTrendingGifs() {
    try {
        const response = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        noChances.handleError(error, 'Trending GIFs API Error');
        return [];
    }
}

// Display GIFs in the results container
function displayGifs(gifs, container) {
    container.innerHTML = gifs.map(gif => `
        <div class="gif-item" data-url="${gif.images.original.url}">
            <img src="${gif.images.fixed_height.url}" alt="${gif.title}">
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.gif-item').forEach(item => {
        item.addEventListener('click', () => {
            const gifUrl = item.dataset.url;
            sendGif(gifUrl);
            document.querySelector('.gif-picker').remove();
        });
    });
}

// Send GIF message
async function sendGif(gifUrl) {
    try {
        // Create a temporary link to download the GIF
        const response = await fetch(gifUrl);
        const blob = await response.blob();
        const file = new File([blob], 'gif.gif', { type: 'image/gif' });

        // Upload and send
        await uploadFile(file, 'gif');
    } catch (error) {
        noChances.handleError(error, 'Send GIF Error');
    }
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
        width: 300px;
        height: 400px;
        background: #1a1a1a;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .gif-picker-header {
        padding: 10px;
        border-bottom: 1px solid #333;
        display: flex;
        gap: 10px;
    }

    .gif-search {
        flex: 1;
        padding: 8px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #2a2a2a;
        color: #fff;
    }

    .close-picker {
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
    }

    .gif-results {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .gif-item {
        cursor: pointer;
        border-radius: 4px;
        overflow: hidden;
        transition: transform 0.2s;
    }

    .gif-item:hover {
        transform: scale(1.05);
    }

    .gif-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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