// firebaseHelper.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase, ref, set, push, onValue, update, get, child
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase config - replace with your own config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// --- USER PROFILE HELPERS ---
function createUserProfile(uid, displayName, email) {
  return set(ref(database, `users/${uid}`), {
    displayName,
    email,
    createdAt: Date.now()
  });
}

function getUserProfile(uid) {
  return get(ref(database, `users/${uid}`));
}

// --- DIRECT MESSAGES HELPERS ---

// Generate unique DM ID based on user IDs sorted alphabetically to avoid duplicates
function getDMId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// Send DM message
function sendDMMessage(dmId, senderId, senderName, message) {
  const messagesRef = ref(database, `dms/${dmId}/messages`);
  return push(messagesRef, {
    senderId,
    senderName,
    message,
    timestamp: Date.now()
  });
}

// Listen for DM messages
function onDMMessage(dmId, callback) {
  const messagesRef = ref(database, `dms/${dmId}/messages`);
  onValue(messagesRef, snapshot => {
    callback(snapshot.val());
  });
}

// --- GROUP CHAT HELPERS ---

// Create group chat with name and members (array of uids)
function createGroup(name, members) {
  const groupsRef = ref(database, "groups");
  const newGroupRef = push(groupsRef);
  return set(newGroupRef, {
    name,
    members,
    createdAt: Date.now()
  }).then(() => newGroupRef.key);
}

// Send group message
function sendGroupMessage(groupId, senderId, senderName, message) {
  const messagesRef = ref(database, `groups/${groupId}/messages`);
  return push(messagesRef, {
    senderId,
    senderName,
    message,
    timestamp: Date.now()
  });
}

// Listen for group messages
function onGroupMessage(groupId, callback) {
  const messagesRef = ref(database, `groups/${groupId}/messages`);
  onValue(messagesRef, snapshot => {
    callback(snapshot.val());
  });
}

// Listen for user's groups
function onUserGroups(uid, callback) {
  const groupsRef = ref(database, "groups");
  onValue(groupsRef, snapshot => {
    const groups = snapshot.val() || {};
    // Filter groups where uid is member
    const userGroups = Object.entries(groups)
      .filter(([id, group]) => group.members && group.members.includes(uid))
      .map(([id, group]) => ({ id, ...group }));
    callback(userGroups);
  });
}

export {
  auth, database,
  createUserProfile, getUserProfile,
  getDMId, sendDMMessage, onDMMessage,
  createGroup, sendGroupMessage, onGroupMessage,
  onUserGroups,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged
};