// firebaseHelpers.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

// 🔥 Replace this with your Firebase config from console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ...other config values
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Auth functions
export const signIn = () => signInWithPopup(auth, provider);
export const signOutUser = () => signOut(auth);
export const onAuthStateChangedListener = (callback) =>
  onAuthStateChanged(auth, callback);

// Chat functions

// Get real-time query for DMs of a user
export const getChatsQuery = (userId) =>
  query(collection(db, "chats", userId, "messages"), orderBy("timestamp", "asc"));

// Send message to a specific user DM
export const sendMessage = async (userId, message) => {
  try {
    await addDoc(collection(db, "chats", userId, "messages"), message);
  } catch (error) {
    console.error("Error sending message: ", error);
  }
};

// Global chat query (all users share this)
export const getGlobalChatQuery = () =>
  query(collection(db, "globalMessages"), orderBy("timestamp", "asc"));

// Send message to global chat
export const sendGlobalMessage = async (message) => {
  try {
    await addDoc(collection(db, "globalMessages"), message);
  } catch (error) {
    console.error("Error sending global message: ", error);
  }
};