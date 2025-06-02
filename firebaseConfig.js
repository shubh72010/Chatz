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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Set persistence after auth initialization
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

const db = getDatabase(app);
const storage = getStorage(app);

// Configure database rules
const dbRules = {
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && (data.child('participants').child(auth.uid).exists() || !data.child('participants').exists())",
        ".write": "auth != null && (data.child('participants').child(auth.uid).exists() || !data.child('participants').exists())"
      }
    },
    "messages": {
      "$chatId": {
        ".read": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()",
        ".write": "auth != null && root.child('chats').child($chatId).child('participants').child(auth.uid).exists()"
      }
    }
  }
};

export { app, analytics, auth, db, storage, dbRules }; 