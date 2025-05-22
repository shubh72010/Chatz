// chatLogic.js
import {
  auth, database, signIn, signUserOut,
  onAuthStateChanged, ref, set, push, onChildAdded, onValue, get
} from './firebaseHelper.js';

// UI elements
const loginDiv = document.getElementById('login');
const profileSetupDiv = document.getElementById('profileSetup');
const chatAppDiv = document.getElementById('chatApp');

const googleSignInBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOutBtn');

const displayNameInput = document.getElementById('displayName');
const saveProfileBtn = document.getElementById('saveProfile');

const userNameSpan = document.getElementById('userName');
const chatRoomsDiv = document.getElementById('chatRooms');
const newRoomNameInput = document.getElementById('newRoomName');
const createRoomBtn = document.getElementById('createRoomBtn');

const dmListDiv = document.getElementById('dmList');
const dmEmailInput = document.getElementById('dmEmail');
const startDMBtn = document.getElementById('startDMBtn');

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const currentChatNameSpan = document.getElementById('currentChatName');

let currentUser = null;
let currentChatId = null;
let currentChatType = null; // "room" or "dm"

// Helpers

function clearMessages() {
  messagesDiv.innerHTML = '';
}

function addMessageToUI(msgObj) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (msgObj.senderId === currentUser.uid) div.classList.add('self');
  div.textContent = `${msgObj.senderName}: ${msgObj.message}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function loadMessages(chatId) {
  clearMessages();
  const messagesRef = ref(database, `messages/${chatId}`);
  onValue(messagesRef, (snapshot) => {
    clearMessages();
    snapshot.forEach(childSnap => {
      addMessageToUI(childSnap.val());
    });
  });
}

function sendMessage() {
  if (!currentChatId) return alert('Select a chat first');
  const text = messageInput.value.trim();
  if (!text) return;
  const messagesRef = ref(database, `messages/${currentChatId}`);
  push(messagesRef, {
    senderId: currentUser.uid,
    senderName: currentUser.displayName || "Anonymous",
    message: text,
    timestamp: Date.now()
  });
  messageInput.value = '';
}

// Authentication & Profile Setup

function showLogin() {
  loginDiv.style.display = 'block';
  profileSetupDiv.style.display = 'none';
  chatAppDiv.style.display = 'none';
}

function showProfileSetup() {
  loginDiv.style.display = 'none';
  profileSetupDiv.style.display = 'block';
  chatAppDiv.style.display = 'none';
}

function showChatApp() {
  loginDiv.style.display = 'none';
  profileSetupDiv.style.display = 'none';
  chatAppDiv.style.display = 'block';
}

function checkProfileSetup(user) {
  const userRef = ref(database, `users/${user.uid}/displayName`);
  get(userRef).then(snapshot => {
    if (snapshot.exists()) {
      currentUser.displayName = snapshot.val();
      userNameSpan.textContent = currentUser.displayName;
      showChatApp();
      loadChatRooms();
      loadDMs();
    } else {
      showProfileSetup();
    }
  });
}

// Load and display chat rooms

function loadChatRooms() {
  chatRoomsDiv.innerHTML = '';
  const roomsRef = ref(database, 'rooms');
  onValue(roomsRef, (snapshot) => {
    chatRoomsDiv.innerHTML = '';
    snapshot.forEach(roomSnap => {
      const room = roomSnap.val();
      const btn = document.createElement('button');
      btn.textContent = room.name;
      btn.onclick = () => {
        currentChatId = roomSnap.key;
        currentChatType = 'room';
        currentChatNameSpan.textContent = `Room: ${room.name}`;
        loadMessages(currentChatId);
      };
      chatRoomsDiv.appendChild(btn);
    });
  });
}

createRoomBtn.onclick = () => {
  const name = newRoomNameInput.value.trim();
  if (!name) return alert('Room name required');
  const roomsRef = ref(database, 'rooms');
  push(roomsRef, { name });
  newRoomNameInput.value = '';
};

// Direct Messages (DM)

function loadDMs() {
  dmListDiv.innerHTML = '';
  const userChatsRef = ref(database, `userChats/${currentUser.uid}`);
  onValue(userChatsRef, (snapshot) => {
    dmListDiv.innerHTML = '';
    snapshot.forEach(chatSnap => {
      const chatId = chatSnap.key;
      const chatName = chatSnap.val().name || 'DM';
      const btn = document.createElement('button');
      btn.textContent = chatName;
      btn.onclick = () => {
        currentChatId = chatId;
        currentChatType = 'dm';
        currentChatNameSpan.textContent = `DM: ${chatName}`;
        loadMessages(currentChatId);
      };
      dmListDiv.appendChild(btn);
    });
  });
}

function startDMByEmail(email) {
  if (!email) return alert('Email required');
  // Find user by email
  const usersRef = ref(database, 'users');
  get(usersRef).then(snapshot => {
    let targetUserId = null;
    snapshot.forEach(userSnap => {
      if (userSnap.val().email === email) targetUserId = userSnap.key;
    });
    if (!targetUserId) return alert('User not found');

    // Create a unique DM chat ID combining two user IDs sorted
    const chatUsers = [currentUser.uid, targetUserId].sort();
    const dmChatId = chatUsers.join('_');

    // Add chat metadata for both users under userChats
    const updates = {};
    updates[`userChats/${currentUser.uid}/${dmChatId}`] = { name: `DM with ${email}` };
    updates[`userChats/${targetUserId}/${dmChatId}`] = { name: `DM with ${currentUser.displayName}` };

    set(ref(database), updates).then(() => {
      currentChatId = dmChatId;
      currentChatType = 'dm';
      currentChatNameSpan.textContent = `DM: ${email}`;
      loadMessages(currentChatId);
      dmEmailInput.value = '';
    });
  });
}

startDMBtn.onclick = () => {
  startDMByEmail(dmEmailInput.value.trim());
};

// Save profile

saveProfileBtn.onclick = () => {
  const name = displayNameInput.value.trim();
  if (!name) return alert('Display name required');
  set(ref(database, `users/${currentUser.uid}`), {
    displayName: name,
    email: currentUser.email
  }).then(() => {
    currentUser.displayName = name;
    userNameSpan.textContent = name;
    showChatApp();
    loadChatRooms();
    loadDMs();
  });
};

// Send message

sendMessageBtn.onclick = sendMessage;
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

// Auth state changes

googleSignInBtn.onclick = () => {
  signIn().catch(console.error);
};

signOutBtn.onclick = () => {
  signUserOut().catch(console.error);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    checkProfileSetup(user);
  } else {
    currentUser = null;
    showLogin();
  }
});