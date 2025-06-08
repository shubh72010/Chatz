// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { 
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.firebasestorage.app",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Set persistence after auth initialization
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

const db = getDatabase(app);
const storage = getStorage(app);

// Configure database rules with proper indexes
const dbRules = {
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid",
        "username": {
          ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 20 && /^[a-zA-Z0-9_]+$/.test(newData.val())",
          ".write": "$uid === auth.uid"
        },
        "online": {
          ".read": true,
          ".write": "$uid === auth.uid"
        },
        "lastSeen": {
          ".read": true,
          ".write": "$uid === auth.uid"
        }
      }
    },
    "global_messages": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": "timestamp",
      "$messageId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && data.child('participants').child(auth.uid).exists()",
        ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || newData.child('participants').child(auth.uid).exists())",
        "messages": {
          ".indexOn": ["timestamp"],
          ".read": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()",
          ".write": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()"
        },
        "typing": {
          ".read": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()",
          ".write": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()"
        },
        "participants": {
          ".indexOn": [".value"],
          ".read": "auth != null && data.child(auth.uid).exists()",
          ".write": "auth != null && (data.child(auth.uid).exists() || newData.child(auth.uid).exists())"
        }
      }
    },
    "friend_requests": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "auth != null",
        ".indexOn": ["timestamp"]
      }
    },
    "friends": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".indexOn": ["timestamp"]
      }
    },
    "usernames": {
      ".read": true,
      ".write": "auth != null",
      ".indexOn": [".value"],
      "$username": {
        ".validate": "!data.exists() || data.val() === auth.uid",
        ".write": "auth != null && (!data.exists() || data.val() === auth.uid)"
      }
    }
  }
};

// Export initialized services
export { analytics, auth, db, storage, dbRules }; 