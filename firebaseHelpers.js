// firebaseHelpers.js

// Firebase config - replace with your own project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase app and database
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Exported object to wrap Firebase helper functions
const FirebaseHelpers = (() => {
  let currentUser = null;

  // Sign in anonymously (you can extend this later)
  const signInAnonymously = async () => {
    try {
      const result = await auth.signInAnonymously();
      currentUser = result.user;
      console.log("Signed in anonymously as", currentUser.uid);
      return currentUser;
    } catch (error) {
      console.error("Firebase anonymous sign-in error:", error);
      throw error;
    }
  };

  // Get current user
  const getCurrentUser = () => currentUser;

  // Listen for auth state changes
  const onAuthStateChanged = (callback) => {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      callback(user);
    });
  };

  // Push message to the Realtime Database
  const sendMessage = async (messageObj) => {
    try {
      const messagesRef = database.ref("messages");
      const newMessageRef = messagesRef.push();
      await newMessageRef.set(messageObj);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Listen for new messages
  const onNewMessage = (callback) => {
    const messagesRef = database.ref("messages");
    messagesRef.limitToLast(50).on("child_added", (snapshot) => {
      const message = snapshot.val();
      message.key = snapshot.key;
      callback(message);
    });
  };

  // Update typing status for current user
  const setTypingStatus = (isTyping) => {
    if (!currentUser) return;
    const typingRef = database.ref(`typingStatus/${currentUser.uid}`);
    typingRef.set(isTyping).catch(console.error);
  };

  // Listen for typing status of others
  const onTypingStatusChanged = (callback) => {
    const typingRef = database.ref("typingStatus");
    typingRef.on("value", (snapshot) => {
      const typingUsers = snapshot.val() || {};
      callback(typingUsers);
    });
  };

  // Remove typing status when user disconnects
  const setupTypingStatusCleanup = () => {
    if (!currentUser) return;
    const typingRef = database.ref(`typingStatus/${currentUser.uid}`);
    typingRef.onDisconnect().remove();
  };

  return {
    signInAnonymously,
    getCurrentUser,
    onAuthStateChanged,
    sendMessage,
    onNewMessage,
    setTypingStatus,
    onTypingStatusChanged,
    setupTypingStatusCleanup,
  };
})();