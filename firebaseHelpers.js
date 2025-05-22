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
  getDoc,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.appspot.com",
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

// State variables
let currentUser = null;
let currentChat = null;
let unsubscribeMessages = null;
let unsubscribeRooms = null;
let unsubscribeDMs = null;

// Initialize the app
init();

function init() {
  setupEventListeners();
  checkAuthState();
}

function setupEventListeners() {
  googleSignInBtn.addEventListener('click', handleGoogleSignIn);
  signOutBtn.addEventListener('click', handleSignOut);
  saveProfileBtn.addEventListener('click', handleSaveProfile);
  createRoomBtn.addEventListener('click', handleCreateRoom);
  startDMBtn.addEventListener('click', handleStartDM);
  sendMessageBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function checkAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await checkUserProfile(user);
    } else {
      showLogin();
      cleanupSubscriptions();
    }
  });
}

async function checkUserProfile(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists() && userDoc.data().displayName) {
      // Profile exists
      userNameSpan.textContent = userDoc.data().displayName;
      showChatApp();
      loadChatData();
    } else {
      // Need profile setup
      displayNameInput.value = user.displayName || '';
      showProfileSetup();
    }
  } catch (error) {
    console.error("Error checking user profile:", error);
    alert("Error checking user profile. Please try again.");
  }
}

async function handleGoogleSignIn() {
  try {
    googleSignInBtn.disabled = true;
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google sign-in error:", error);
    alert("Sign-in failed. Please try again.");
  } finally {
    googleSignInBtn.disabled = false;
  }
}

async function handleSignOut() {
  try {
    signOutBtn.disabled = true;
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
  } finally {
    signOutBtn.disabled = false;
  }
}

async function handleSaveProfile() {
  const displayName = displayNameInput.value.trim();
  
  if (!displayName) {
    alert("Please enter a display name");
    return;
  }

  try {
    saveProfileBtn.disabled = true;
    
    await setDoc(doc(db, 'users', currentUser.uid), {
      displayName,
      email: currentUser.email,
      uid: currentUser.uid,
      createdAt: serverTimestamp()
    }, { merge: true });

    userNameSpan.textContent = displayName;
    showChatApp();
    loadChatData();
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Error saving profile. Please try again.");
  } finally {
    saveProfileBtn.disabled = false;
  }
}

function loadChatData() {
  loadChatRooms();
  loadDMs();
}

function loadChatRooms() {
  if (unsubscribeRooms) unsubscribeRooms();

  const q = query(
    collection(db, 'chatRooms'),
    orderBy('createdAt', 'desc')
  );

  unsubscribeRooms = onSnapshot(q, (snapshot) => {
    chatRoomsDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const room = doc.data();
      const roomElement = document.createElement('div');
      roomElement.className = 'chat-room';
      roomElement.textContent = room.name;
      roomElement.addEventListener('click', () => {
        selectChat({ type: 'room', id: doc.id, name: room.name });
      });
      chatRoomsDiv.appendChild(roomElement);
    });
  });
}

function loadDMs() {
  if (unsubscribeDMs) unsubscribeDMs();

  const q = query(
    collection(db, 'dms'),
    where('participants', 'array-contains', currentUser.email),
    orderBy('createdAt', 'desc')
  );

  unsubscribeDMs = onSnapshot(q, (snapshot) => {
    dmListDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const dm = doc.data();
      const otherUser = dm.participants.find(email => email !== currentUser.email);
      const dmElement = document.createElement('div');
      dmElement.className = 'dm-item';
      dmElement.textContent = `DM with ${otherUser}`;
      dmElement.addEventListener('click', () => {
        selectChat({ type: 'dm', id: doc.id, name: `DM with ${otherUser}` });
      });
      dmListDiv.appendChild(dmElement);
    });
  });
}

function selectChat(chat) {
  currentChat = chat;
  currentChatNameSpan.textContent = chat.name;
  messageInput.disabled = false;
  sendMessageBtn.disabled = false;
  loadMessages();
}

function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();

  if (!currentChat) {
    messagesDiv.innerHTML = '<div class="message">Select a chat to view messages</div>';
    return;
  }

  const messagesCollection = collection(
    db, 
    currentChat.type === 'room' ? `chatRooms/${currentChat.id}/messages` : `dms/${currentChat.id}/messages`
  );

  const q = query(messagesCollection, orderBy('createdAt'));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const msgElement = document.createElement('div');
      msgElement.className = `message ${msg.sender === currentUser.uid ? 'self' : ''}`;
      msgElement.innerHTML = `
        <strong>${msg.sender === currentUser.uid ? 'You' : msg.senderEmail}</strong>
        <p>${msg.text}</p>
        <small>${msg.createdAt?.toDate().toLocaleTimeString() || 'now'}</small>
      `;
      messagesDiv.appendChild(msgElement);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

async function handleCreateRoom() {
  const roomName = newRoomNameInput.value.trim();
  
  if (!roomName) {
    alert("Please enter a room name");
    return;
  }

  try {
    createRoomBtn.disabled = true;
    
    await addDoc(collection(db, 'chatRooms'), {
      name: roomName,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      members: [currentUser.uid]
    });

    newRoomNameInput.value = '';
  } catch (error) {
    console.error("Error creating room:", error);
    alert("Error creating room. Please try again.");
  } finally {
    createRoomBtn.disabled = false;
  }
}

async function handleStartDM() {
  const email = dmEmailInput.value.trim().toLowerCase();
  
  if (!email) {
    alert("Please enter an email");
    return;
  }

  if (email === currentUser.email) {
    alert("You can't start a DM with yourself");
    return;
  }

  try {
    startDMBtn.disabled = true;
    
    // Verify user exists
    const usersQuery = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      alert("User not found");
      return;
    }

    const otherUser = querySnapshot.docs[0].data();
    
    // Create DM ID (sorted emails to prevent duplicates)
    const dmId = [currentUser.email, email].sort().join('_');
    
    // Check if DM already exists
    const dmDoc = await getDoc(doc(db, 'dms', dmId));
    
    if (!dmDoc.exists()) {
      await setDoc(doc(db, 'dms', dmId), {
        participants: [currentUser.email, email],
        createdAt: serverTimestamp()
      });
    }

    dmEmailInput.value = '';
    selectChat({ type: 'dm', id: dmId, name: `DM with ${email}` });
  } catch (error) {
    console.error("Error starting DM:", error);
    alert("Error starting DM. Please try again.");
  } finally {
    startDMBtn.disabled = false;
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();
  
  if (!text || !currentChat) {
    return;
  }

  try {
    sendMessageBtn.disabled = true;
    messageInput.disabled = true;
    
    const messagesCollection = collection(
      db, 
      currentChat.type === 'room' ? `chatRooms/${currentChat.id}/messages` : `dms/${currentChat.id}/messages`
    );

    await addDoc(messagesCollection, {
      text,
      sender: currentUser.uid,
      senderEmail: currentUser.email,
      createdAt: serverTimestamp()
    });

    messageInput.value = '';
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Error sending message. Please try again.");
  } finally {
    sendMessageBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

function cleanupSubscriptions() {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeRooms) unsubscribeRooms();
  if (unsubscribeDMs) unsubscribeDMs();
  unsubscribeMessages = null;
  unsubscribeRooms = null;
  unsubscribeDMs = null;
}

function showLogin() {
  loginDiv.style.display = 'block';
  profileSetupDiv.style.display = 'none';
  chatAppDiv.style.display = 'none';
  currentChat = null;
  messagesDiv.innerHTML = '<div class="message">Please sign in to chat</div>';
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
  messageInput.disabled = true;
  sendMessageBtn.disabled = true;
}