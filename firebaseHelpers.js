// firebaseConfig.js

// Firebase imports
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.appspot.com",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Auth instance for user login, registration, etc.
const auth = getAuth(app);

// Realtime Database instance for reading/writing chat data
const database = getDatabase(app);

// Storage instance if you want to upload files, images, etc.
const storage = getStorage(app);

// Export what you need
export { app, auth, database, storage };