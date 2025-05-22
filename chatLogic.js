import {
  auth, database, signIn, signUserOut,
  onAuthStateChanged, ref, set, push, onValue, get
} from './firebaseHelper.js';

// DOM elements
const loginDiv = document.getElementById('login');
const profileSetupDiv = document.getElementById('profileSetup');
const chatAppDiv = document.getElementById('chatApp');

const googleSignInBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOutBtn');

const displayNameInput = document.getElementById('displayName');
const saveProfileBtn = document.getElementById('saveProfile');

const userNameSpan = document.getElementById('userName');
const chatRoomsDiv = document.getElementById('chatRooms'); // Fixed typo in variable name
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
let currentChatType = null;

// UI Functions
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

function clearMessages() {
  messagesDiv.innerHTML = '';
}

function addMessageToUI(msgObj, isCurrentUser) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (isCurrentUser) messageDiv.classList.add('self');
  
  const senderSpan = document.createElement('span');
  senderSpan.textContent = msgObj.senderName;
  senderSpan.style.fontWeight = 'bold';
  
  const messageContent = document.createElement('p');
  messageContent.textContent = msgObj.message;
  
  const timeSpan = document.createElement('small');
  timeSpan.textContent = new Date(msgObj.timestamp).toLocaleTimeString();
  
  messageDiv.append(senderSpan, messageContent, timeSpan);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function loadMessages(chatId) {
  clearMessages();
  const messagesRef = ref(database, `messages/${chatId}`);
  onValue(messagesRef, (snapshot) => {
    clearMessages();
    snapshot.forEach(childSnap => {
      const msg = childSnap.val();
      addMessageToUI(msg, msg.senderId === currentUser.uid);
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

// User Profile Functions
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
  }).catch(error => {
    console.error("Error checking profile:", error);
    showProfileSetup();
  });
}

// Chat Room Functions
function loadChatRooms() {
  chatRoomsDiv.innerHTML = '';
  const roomsRef = ref(database, 'rooms');
  onValue(roomsRef, (snapshot) => {
    chatRoomsDiv.innerHTML = '';
    snapshot.forEach(roomSnap => {
      const room = roomSnap.val();
      const roomElement = document.createElement('div');
      roomElement.className = 'chat-room';
      roomElement.textContent = room.name;
      roomElement.addEventListener('click', () => {
        currentChatId = roomSnap.key;
        currentChatType = 'room';
        currentChatNameSpan.textContent = `Room: ${room.name}`;
        loadMessages(currentChatId);
      });
      chatRoomsDiv.appendChild(roomElement);
    });
  });
}

createRoomBtn.addEventListener('click', () => {
  const name = newRoomNameInput.value.trim();
  if (!name) return alert('Room name required');
  
  const roomsRef = ref(database, 'rooms');
  push(roomsRef, { 
    name,
    createdBy: currentUser.uid,
    createdAt: Date.now()
  });
  newRoomNameInput.value = '';
});

// DM Functions
function loadDMs() {
  dmListDiv.innerHTML = '';
  const userChatsRef = ref(database, `userChats/${currentUser.uid}`);
  onValue(userChatsRef, (snapshot) => {
    dmListDiv.innerHTML = '';
    snapshot.forEach(chatSnap => {
      const chatInfo = chatSnap.val();
      const dmElement = document.createElement('div');
      dmElement.className = 'dm-item';
      dmElement.textContent = chatInfo.name || 'DM';
      dmElement.addEventListener('click', () => {
        currentChatId = chatSnap.key;
        currentChatType = 'dm';
        currentChatNameSpan.textContent = chatInfo.name;
        loadMessages(currentChatId);
      });
      dmListDiv.appendChild(dmElement);
    });
  });
}

function startDMByEmail(email) {
  if (!email) return alert('Email required');
  
  const usersRef = ref(database, 'users');
  get(usersRef).then(snapshot => {
    let targetUser = null;
    snapshot.forEach(userSnap => {
      if (userSnap.val().email === email) {
        targetUser = {
          id: userSnap.key,
          ...userSnap.val()
        };
      }
    });
    
    if (!targetUser) return alert('User not found');

    const chatUsers = [currentUser.uid, targetUser.id].sort();
    const dmChatId = chatUsers.join('_');

    const updates = {};
    updates[`userChats/${currentUser.uid}/${dmChatId}`] = { 
      name: `DM with ${targetUser.displayName || targetUser.email}`,
      withUser: targetUser.id
    };
    updates[`userChats/${targetUser.id}/${dmChatId}`] = { 
      name: `DM with ${currentUser.displayName || currentUser.email}`,
      withUser: currentUser.uid
    };

    set(ref(database), updates).then(() => {
      currentChatId = dmChatId;
      currentChatType = 'dm';
      currentChatNameSpan.textContent = `DM with ${targetUser.displayName || targetUser.email}`;
      loadMessages(currentChatId);
      dmEmailInput.value = '';
    });
  }).catch(error => {
    console.error("Error starting DM:", error);
    alert("Error starting DM conversation");
  });
}

// Event Listeners
startDMBtn.addEventListener('click', () => {
  startDMByEmail(dmEmailInput.value.trim());
});

saveProfileBtn.addEventListener('click', () => {
  const name = displayNameInput.value.trim();
  if (!name) return alert('Display name required');
  
  set(ref(database, `users/${currentUser.uid}`), {
    displayName: name,
    email: currentUser.email,
    createdAt: Date.now()
  }).then(() => {
    currentUser.displayName = name;
    userNameSpan.textContent = name;
    showChatApp();
    loadChatRooms();
    loadDMs();
  }).catch(error => {
    console.error("Error saving profile:", error);
    alert("Error saving profile");
  });
});

sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

googleSignInBtn.addEventListener('click', () => {
  signIn().catch(error => {
    console.error("Sign in error:", error);
    alert("Sign in failed. Please try again.");
  });
});

signOutBtn.addEventListener('click', () => {
  signUserOut().catch(error => {
    console.error("Sign out error:", error);
  });
});

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    checkProfileSetup(user);
  } else {
    currentUser = null;
    currentChatId = null;
    currentChatType = null;
    showLogin();
  }
});
