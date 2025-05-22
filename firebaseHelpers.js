import { 
  initializeApp 
} from "firebase/app";

import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "firebase/auth";

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  onChildAdded, 
  onValue, 
  onDisconnect 
} from "firebase/database";

// Firebase config (make sure your databaseURL is correct here!)
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

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const messagesRef = ref(db, "messages");
const typingRef = ref(db, "typingStatus");

// Auth helpers
const signInAnonymouslyUser = () => signInAnonymously(auth);

const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

const getCurrentUser = () => auth.currentUser;

// Send message to DB
const sendMessage = async (messageObj) => {
  await push(messagesRef, messageObj);
};

// Listen for new messages
const onNewMessage = (callback) => {
  onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};

// Typing status helpers
const setTypingStatus = (isTyping) => {
  const user = getCurrentUser();
  if (!user) return;

  const userTypingRef = ref(db, `typingStatus/${user.uid}`);
  set(userTypingRef, isTyping);

  if (isTyping) {
    // Remove typing status when user disconnects
    onDisconnect(userTypingRef).remove();
  }
};

const onTypingStatusChanged = (callback) => {
  onValue(typingRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
};

// Clean up typing status on disconnect for current user
const setupTypingStatusCleanup = () => {
  const user = getCurrentUser();
  if (!user) return;

  const userTypingRef = ref(db, `typingStatus/${user.uid}`);
  onDisconnect(userTypingRef).remove();
};

export const FirebaseHelpers = {
  signInAnonymously: signInAnonymouslyUser,
  onAuthStateChanged: onAuthChange,
  getCurrentUser,
  sendMessage,
  onNewMessage,
  setTypingStatus,
  onTypingStatusChanged,
  setupTypingStatusCleanup,
};