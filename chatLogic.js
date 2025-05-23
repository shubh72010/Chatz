// chatLogic.js

import {
  auth,
  db,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  where,
} from "./firebaseHelpers.js";

// DOM elements
const signInBtn = document.getElementById("google-signin-btn");
const authContainer = document.getElementById("auth-container");
const userListEl = document.getElementById("user-list");
const globalChatToggle = document.getElementById("global-chat-toggle");
const chatHeader = document.getElementById("chat-header");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let currentUser = null;
let currentChatUser = null; // null = global chat
let unsubscribeMessages = null;

// SIGN IN / SIGN OUT HANDLERS

signInBtn.addEventListener("click", async () => {
  if (!currentUser) {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Google sign-in failed: " + error.message);
    }
  } else {
    await signOut(auth);
  }
});

// AUTH STATE CHANGE

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    signInBtn.textContent = "Sign Out";
    chatInput.disabled = false;
    sendBtn.disabled = false;
    loadUsers();
    openGlobalChat();
  } else {
    signInBtn.textContent = "Sign In with Google";
    chatInput.disabled = true;
    sendBtn.disabled = true;
    userListEl.innerHTML = "<h2>Users</h2>";
    chatMessages.innerHTML = "";
    chatHeader.textContent = "Select a user or Global Chat";
  }
});

// LOAD USERS LIST (all users except current user)

async function loadUsers() {
  const usersCol = collection(db, "users");

  // Listen to all users in real-time
  onSnapshot(usersCol, (snapshot) => {
    userListEl.innerHTML = "<h2>Users</h2>";
    snapshot.forEach((docSnap) => {
      const user = docSnap.data();
      if (user.uid === currentUser.uid) return; // skip self

      const userEl = document.createElement("div");
      userEl.classList.add("user-item");
      userEl.textContent = user.displayName || "Unnamed";
      userEl.dataset.uid = user.uid;
      userEl.addEventListener("click", () => openDM(user.uid, user.displayName));
      userListEl.appendChild(userEl);
    });
  });

  // Add or update current user in 'users' collection for discovery
  await setDoc(doc(db, "users", currentUser.uid), {
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    email: currentUser.email,
  });
}

// OPEN GLOBAL CHAT

function openGlobalChat() {
  currentChatUser = null;
  chatHeader.textContent = "Global Chat";
  setActiveUserInList(null);
  subscribeMessages("global");
}

// OPEN DIRECT MESSAGE

function openDM(uid, displayName) {
  currentChatUser = uid;
  chatHeader.textContent = `Chat with ${displayName}`;
  setActiveUserInList(uid);
  subscribeMessages(getDMRoomId(currentUser.uid, uid));
}

// SET ACTIVE USER STYLE

function setActiveUserInList(uid) {
  document.querySelectorAll(".user-item").forEach((el) => {
    if (el.dataset.uid === uid) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  if (uid === null) {
    globalChatToggle.classList.add("active");
  } else {
    globalChatToggle.classList.remove("active");
  }
}

// GLOBAL CHAT BUTTON CLICK

globalChatToggle.addEventListener("click", openGlobalChat);

// GENERATE ROOM ID FOR DM (consistent for both users)

function getDMRoomId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// SUBSCRIBE TO MESSAGES FOR ROOM

function subscribeMessages(roomId) {
  if (unsubscribeMessages) unsubscribeMessages();

  chatMessages.innerHTML = "<p style='color:#999; text-align:center;'>Loading messages...</p>";

  const messagesCol = collection(db, "messages");
  const q = query(
    messagesCol,
    where("roomId", "==", roomId),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    if (snapshot.empty) {
      chatMessages.innerHTML = "<p style='color:#999; text-align:center;'>No messages yet.</p>";
      return;
    }
    snapshot.forEach((docSnap) => {
      const message = docSnap.data();
      appendMessage(message);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// APPEND MESSAGE TO CHAT

function appendMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");

  if (message.sender === currentUser.uid) {
    div.classList.add("sent");
  } else {
    div.classList.add("received");
  }

  div.textContent = message.text;
  chatMessages.appendChild(div);
}

// SEND MESSAGE

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const roomId = currentChatUser
    ? getDMRoomId(currentUser.uid, currentChatUser)
    : "global";

  try {
    await addDoc(collection(db, "messages"), {
      roomId,
      sender: currentUser.uid,
      text,
      createdAt: serverTimestamp(),
    });
    chatInput.value = "";
  } catch (error) {
    alert("Failed to send message: " + error.message);
  }
});