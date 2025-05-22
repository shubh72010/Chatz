// chatLogic.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.firebasestorage.app",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM elements
const loginDiv = document.getElementById('login');
const profileSetupDiv = document.getElementById('profileSetup');
const chatAppDiv = document.getElementById('chatApp');
const googleSignInBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOutBtn');
const saveProfileBtn = document.getElementById('saveProfile');
const displayNameInput = document.getElementById('displayName');
const userNameSpan = document.getElementById('userName');
const newRoomNameInput = document.getElementById('newRoomName');
const createRoomBtn = document.getElementById('createRoomBtn');
const chatRoomsDiv = document.getElementById('chatRooms');
const dmEmailInput = document.getElementById('dmEmail');
const startDMBtn = document.getElementById('startDMBtn');
const dmListDiv = document.getElementById('dmList');
const currentChatNameSpan = document.getElementById('currentChatName');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

let currentUser = null;
let currentChat = null;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    checkUserProfile(user);
  } else {
    // User is signed out
    showLogin();
  }
});

// Check if user has completed profile setup
async function checkUserProfile(user) {
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists() && userDoc.data().displayName) {
    // Profile exists, go to chat
    userNameSpan.textContent = userDoc.data().displayName;
    showChatApp();
    loadChatRooms();
    loadDMs();
  } else {
    // Need profile setup
    showProfileSetup();
  }
}

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

// Event Listeners
googleSignInBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .catch((error) => {
      console.error('Sign in error:', error);
    });
});

signOutBtn.addEventListener('click', () => {
  signOut(auth);
});

saveProfileBtn.addEventListener('click', async () => {
  const displayName = displayNameInput.value.trim();
  if (displayName) {
    await setDoc(doc(db, 'users', currentUser.uid), {
      displayName,
      email: currentUser.email,
      createdAt: serverTimestamp()
    });
    userNameSpan.textContent = displayName;
    showChatApp();
    loadChatRooms();
    loadDMs();
  }
});

createRoomBtn.addEventListener('click', async () => {
  const roomName = newRoomNameInput.value.trim();
  if (roomName && currentUser) {
    await addDoc(collection(db, 'chatRooms'), {
      name: roomName,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });
    newRoomNameInput.value = '';
  }
});

startDMBtn.addEventListener('click', async () => {
  const email = dmEmailInput.value.trim();
  if (email && currentUser) {
    // In a real app, you would verify the user exists first
    const dmId = [currentUser.uid, email].sort().join('_');
    await setDoc(doc(db, 'dms', dmId), {
      participants: [currentUser.email, email],
      createdAt: serverTimestamp()
    });
    dmEmailInput.value = '';
  }
});

sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (text && currentChat && currentUser) {
    let collectionPath;
    if (currentChat.type === 'room') {
      collectionPath = `chatRooms/${currentChat.id}/messages`;
    } else {
      collectionPath = `dms/${currentChat.id}/messages`;
    }

    await addDoc(collection(db, collectionPath), {
      text,
      sender: currentUser.uid,
      senderEmail: currentUser.email,
      createdAt: serverTimestamp()
    });
    messageInput.value = '';
  }
}

// Load chat rooms and DMs
async function loadChatRooms() {
  const q = query(collection(db, 'chatRooms'), orderBy('createdAt'));
  onSnapshot(q, (snapshot) => {
    chatRoomsDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const room = doc.data();
      const roomElement = document.createElement('div');
      roomElement.className = 'chat-room';
      roomElement.textContent = room.name;
      roomElement.addEventListener('click', () => {
        currentChat = { type: 'room', id: doc.id };
        currentChatNameSpan.textContent = room.name;
        loadMessages();
      });
      chatRoomsDiv.appendChild(roomElement);
    });
  });
}

async function loadDMs() {
  const q = query(collection(db, 'dms'), orderBy('createdAt'));
  onSnapshot(q, (snapshot) => {
    dmListDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const dm = doc.data();
      if (dm.participants.includes(currentUser.email)) {
        const dmElement = document.createElement('div');
        dmElement.className = 'dm-item';
        const otherUser = dm.participants.find(p => p !== currentUser.email);
        dmElement.textContent = otherUser;
        dmElement.addEventListener('click', () => {
          currentChat = { type: 'dm', id: doc.id };
          currentChatNameSpan.textContent = `DM with ${otherUser}`;
          loadMessages();
        });
        dmListDiv.appendChild(dmElement);
      }
    });
  });
}

function loadMessages() {
  if (!currentChat) return;

  let collectionPath;
  if (currentChat.type === 'room') {
    collectionPath = `chatRooms/${currentChat.id}/messages`;
  } else {
    collectionPath = `dms/${currentChat.id}/messages`;
  }

  const q = query(collection(db, collectionPath), orderBy('createdAt'));
  onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const msgElement = document.createElement('div');
      msgElement.className = `message ${msg.sender === currentUser.uid ? 'self' : ''}`;
      msgElement.innerHTML = `
        <strong>${msg.senderEmail}</strong>
        <p>${msg.text}</p>
        <small>${new Date(msg.createdAt?.toDate()).toLocaleTimeString()}</small>
      `;
      messagesDiv.appendChild(msgElement);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
