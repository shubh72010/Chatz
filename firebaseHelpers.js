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

// Firebase config with databaseURL included
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",  // <--- Must have this!
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.firebasestorage.app",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
};

// Initialize Firebase app, auth, and database
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let currentUser = null;

const FirebaseHelpers = {
  signInAnonymously: async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      currentUser = userCredential.user;
      console.log("Signed in anonymously:", currentUser.uid);
      return currentUser;
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      throw error;
    }
  },

  onAuthStateChanged: (callback) => {
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      callback(user);
    });
  },

  sendMessage: async (messageObj) => {
    if (!currentUser) throw new Error("Not signed in");
    const messagesRef = ref(database, "messages");
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      ...messageObj,
      uid: currentUser.uid,
      timestamp: Date.now(),
    });
  },

  onNewMessage: (callback) => {
    const messagesRef = ref(database, "messages");
    onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      message.key = snapshot.key;
      callback(message);
    });
  },

  setTypingStatus: (isTyping) => {
    if (!currentUser) return;
    const typingRef = ref(database, `typingStatus/${currentUser.uid}`);
    set(typingRef, isTyping).catch(console.error);
  },

  onTypingStatusChanged: (callback) => {
    const typingRef = ref(database, "typingStatus");
    onValue(typingRef, (snapshot) => {
      const typingUsers = snapshot.val() || {};
      callback(typingUsers);
    });
  },

  setupTypingStatusCleanup: () => {
    if (!currentUser) return;
    const typingRef = ref(database, `typingStatus/${currentUser.uid}`);
    onDisconnect(typingRef).remove().catch(console.error);
  },

  getCurrentUser: () => currentUser,
};

export default FirebaseHelpers;