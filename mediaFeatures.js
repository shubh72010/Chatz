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

// Search GIFs with enhanced error handling
async function searchGifs(query) {
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=YOUR_GIPHY_API_KEY&q=${encodeURIComponent(query)}&limit=20`);
        const data = await response.json();
        
        if (!data.data) throw new Error('Invalid response from GIPHY API');
        
        return data.data.map(gif => ({
            id: gif.id,
            url: gif.images.original.url,
            preview: gif.images.preview_gif.url,
            title: gif.title
        }));
    } catch (error) {
        await errorHandler.handleError(error, 'Search GIFs', async () => {
            return await searchGifs(query);
        });
    }
}

// Send GIF with enhanced error handling
async function sendGif(gifUrl) {
    try {
        if (!currentUser) throw new Error('User not authenticated');
        
        await sendMessage(gifUrl, currentChatId, MEDIA_TYPES.GIF);
        
        // Close GIF picker
        const gifPicker = document.querySelector('.gif-picker');
        if (gifPicker) {
            gifPicker.remove();
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Send GIF', async () => {
            return await sendGif(gifUrl);
        });
    }
}

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