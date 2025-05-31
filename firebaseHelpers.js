// firebaseHelpers.js

// Import Firebase modules
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
import { 
  getMessaging, 
  getToken 
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// Initialize Firebase Database and Auth
const db = getDatabase();
const auth = getAuth();

// Database Operations
// Push data to a list (auto-generates key)
export function pushData(dbRef, data) {
  return push(dbRef, data);
}

// Set data at a specific reference
export function setData(dbRef, data) {
  return set(dbRef, data);
}

// Get data once from a reference
export function getData(dbRef) {
  return get(dbRef);
}

// Listen for any value changes at a reference
export function listenValue(dbRef, callback) {
  return onValue(dbRef, callback);
}

// Listen for new child entries being added (e.g., new messages)
export function listenChildAdded(dbRef, callback) {
  return onChildAdded(dbRef, callback);
}

// Stop listening to a specific event
export function removeListener(dbRef, eventType, callback) {
  return off(dbRef, eventType, callback);
}

// Notification Configuration
const notificationSounds = {
  default: '/sounds/default.mp3',
  chime: '/sounds/chime.mp3',
  bell: '/sounds/bell.mp3',
  message: '/sounds/message.mp3'
};

// Save notification settings to localStorage
export function saveNotificationSettings(settings) {
  localStorage.setItem('notificationSound', settings.soundType || 'default');
  localStorage.setItem('notificationVolume', settings.volume || '50');
  localStorage.setItem('notifications', settings.enabled ? 'all' : 'none');
}

// Get notification settings from localStorage
export function getNotificationSettings() {
  return {
    soundType: localStorage.getItem('notificationSound') || 'default',
    volume: parseInt(localStorage.getItem('notificationVolume') || '50'),
    enabled: localStorage.getItem('notifications') !== 'none'
  };
}

// Request notification permission and setup FCM
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging();
      // Get FCM token for this device
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY_HERE' // Replace with your VAPID key from Firebase Console
      });

      // Make sure user is authenticated
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Save the token to the user's profile in the database
        const userRef = ref(db, `users/${currentUser.uid}/fcmToken`);
        await setData(userRef, token);
        
        // Save notification preferences if not already set
        if (!localStorage.getItem('notifications')) {
          saveNotificationSettings({
            soundType: 'default',
            volume: 50,
            enabled: true
          });
        }
        
        return { granted: true, token };
      } else {
        console.warn('User must be authenticated to save FCM token');
        return { granted: true, token, warning: 'User not authenticated' };
      }
    }
    return { granted: false };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { granted: false, error };
  }
}

// Play notification sound
export function playNotificationSound(soundType = 'default', volume = 50) {
  try {
    const soundPath = notificationSounds[soundType] || notificationSounds.default;
    const audio = new Audio(soundPath);
    audio.volume = Math.min(Math.max(volume, 0), 100) / 100; // Ensure volume is between 0 and 1
    return audio.play().catch(error => {
      console.error('Error playing notification sound:', error);
      // Fallback to default sound if custom sound fails
      if (soundType !== 'default') {
        return playNotificationSound('default', volume);
      }
    });
  } catch (error) {
    console.error('Error creating audio object:', error);
  }
}

// Show notification with sound
export function showNotification(title, body, soundType = 'default', volume = 50) {
  const settings = getNotificationSettings();
  
  if (Notification.permission === 'granted' && settings.enabled) {
    try {
      // Create and show the notification
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'message-notification', // Group similar notifications
        renotify: true, // Show each notification even if there's already one with the same tag
        requireInteraction: false, // Auto-close notification
        silent: false, // Allow custom sound
        timestamp: Date.now() // Add timestamp for ordering
      });

      // Handle notification click
      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      // Handle notification error
      notification.onerror = function(error) {
        console.error('Notification error:', error);
      };

      // Play the notification sound
      playNotificationSound(settings.soundType, settings.volume);
      
      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  } else if (Notification.permission === 'denied') {
    console.warn('Notification permission denied by user');
  }
  return null;
}

// Export notification sound options for UI
export const notificationSoundOptions = Object.keys(notificationSounds).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1)
}));
