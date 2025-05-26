// chatLogic.js
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getDatabase,
  ref
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import {
  pushData,
  setData,
  getData,
  listenValue,
  listenChildAdded,
  removeListener
} from "./firebaseHelpers.js"; // <-- relative path

// --- Firebase Setup ---
const db = getDatabase();
const auth = getAuth();
const provider = new GoogleAuthProvider();

// --- DOM ---
const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const replyPreview = document.getElementById("reply-preview");
const replyText = document.getElementById("reply-text");
const cancelReplyBtn = document.getElementById("cancel-reply");
const signInBtn = document.getElementById("sign-in");
const signOutBtn = document.getElementById("sign-out");
const friendsList = document.getElementById("friends-list");
const usersList = document.getElementById("users-list");
const groupsList = document.getElementById("groups-list");
const myGroupsList = document.getElementById("my-groups-list");
const createGroupBtn = document.getElementById("create-group-btn");
const publicChatBtn = document.getElementById("public-chat");

let replyTo = null;
let chatContext = { type: "public" };
let chatListener = null;
let chatListenerRef = null;

// --- Utility ---
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}
function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + "…" : str;
}
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}
function clearChat() {
  chat.innerHTML = "";
}
function setSidebarSelected(type, id) {
  document.querySelectorAll('.sidebar-list li').forEach(li => li.classList.remove('selected'));
  if (type === "public") publicChatBtn.classList.add('selected');
  else if (type === "dm") {
    const li = document.querySelector(`li[data-uid="${id}"]`);
    if (li) li.classList.add('selected');
  } else if (type === "group") {
    const li = document.querySelector(`li[data-groupid="${id}"]`);
    if (li) li.classList.add('selected');
  }
}
function getChatRef() {
  if (chatContext.type === "public") {
    return ref(db, "messages");
  } else if (chatContext.type === "dm") {
    const uid1 = auth.currentUser.uid;
    const uid2 = chatContext.uid;
    const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    return ref(db, `dms/${chatId}`);
  } else if (chatContext.type === "group") {
    return ref(db, `groups/${chatContext.groupId}/messages`);
  }
}
function setChatContext(ctx) {
  chatContext = ctx;
  clearChat();
  if (chatListenerRef && chatListener) {
    removeListener(chatListenerRef, "child_added", chatListener);
  }
  loadMessages();
}

// --- Chat History ---
function loadMessages() {
  clearChat();
  const chatRef = getChatRef();
  chatListenerRef = chatRef;
  chatListener = listenChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    const msgDiv = document.createElement("div");
    msgDiv.className = "message";
    if (auth.currentUser && data.uid === auth.currentUser.uid) msgDiv.classList.add("own");
    let replyHTML = "";
    if (data.replyTo) {
      replyHTML = `<div style="font-size:0.75rem; opacity:0.7; margin-bottom:4px; border-left: 3px solid var(--main); padding-left: 6px; color:#fff;">
        Reply to: <strong>${escapeHtml(data.replyTo.name)}</strong>: ${escapeHtml(truncate(data.replyTo.message, 40))}
      </div>`;
    }
    msgDiv.innerHTML = `
      ${replyHTML}
      <strong>${escapeHtml(data.name)}</strong>: ${escapeHtml(data.message)}
      <div class="meta">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    msgDiv.addEventListener("click", () => {
      if (!auth.currentUser) return;
      if (data.uid === auth.currentUser.uid) return;
      replyTo = { id: snapshot.key, name: data.name, message: data.message };
      replyText.textContent = `${replyTo.name}: ${truncate(replyTo.message, 50)}`;
      replyPreview.style.display = "flex";
      messageInput.focus();
    });
    chat.appendChild(msgDiv);
    scrollToBottom();
  });
}
