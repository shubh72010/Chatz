// firebase-messaging-sw.js

// Import and initialize Firebase
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js");

// Your Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.firebasestorage.app",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Get notification settings from localStorage
function getNotificationSettings() {
  return {
    soundType: self.localStorage?.getItem('notificationSound') || 'default',
    volume: parseInt(self.localStorage?.getItem('notificationVolume') || '50'),
    enabled: self.localStorage?.getItem('notifications') !== 'none'
  };
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);
  
  const settings = getNotificationSettings();
  
  if (settings.enabled) {
    // Extract notification data
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message',
      icon: "/icon.png",
      badge: "/badge.png",
      tag: 'message-notification',
      renotify: true,
      requireInteraction: false,
      silent: false, // Enable sound
      sound: `/sounds/${settings.soundType}.mp3`, // Custom sound path
      data: payload.data // Additional data if needed
    };

    // Show the notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Focus or open the appropriate window/tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window/tab is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
