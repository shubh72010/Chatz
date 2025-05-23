// firebaseHelpers.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";

import {
  getMessaging,
  getToken,
  onMessage
} from "firebase/messaging";

// Your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const messaging = getMessaging(app);

// === AUTH HELPERS ===
export const login = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);
export const onUserChanged = (callback) => onAuthStateChanged(auth, callback);

// === FIRESTORE HELPERS ===
export const sendMessage = async (chatId, text, user) => {
  const messageRef = collection(db, "chats", chatId, "messages");
  await addDoc(messageRef, {
    text,
    sender: user.uid,
    senderName: user.displayName,
    timestamp: serverTimestamp()
  });
};

export const listenForMessages = (chatId, callback) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, callback);
};

// === FCM PUSH NOTIFICATIONS ===
export const requestPermissionAndGetToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permission denied");
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: "BNN-NaMj_9BHsAbKpWIJdeeJLTySio259mpWdSvlWczz4-9hBXQXyNKwccMoiqh_r-wbgHhJ2Cp2z6jYG_zFezg"
    });
    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("Error getting FCM token:", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Export Firebase objects if needed
export { auth, db, messaging };