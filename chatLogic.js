import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, onValue, set, update, get, child, off
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const firebaseConfig = {
  // ... your config ...
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.appspot.com",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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
const createGroupBtn = document.getElementById("create-group-btn");
const publicChatBtn = document.getElementById("public-chat");

let replyTo = null;
let chatContext = { type: "public" }; // {type: "public"} | {type:"dm", uid} | {type:"group", groupId}
let chatListener = null;

// --- Utility functions ---
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

// --- UI helpers ---
function clearChat() {
  chat.innerHTML = "";
}
function setChatContext(ctx) {
  chatContext = ctx;
  clearChat();
  if (chatListener) off(chatListener.ref, "child_added", chatListener.cb);
  loadMessages();
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

// --- Firebase helpers ---
function getChatRef() {
  if (chatContext.type === "public") {
    return ref(db, "messages");
  } else if (chatContext.type === "dm") {
    // DMs are stored under /dms/{uid1_uid2}/
    const uid1 = auth.currentUser.uid;
    const uid2 = chatContext.uid;
    const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    return ref(db, `dms/${chatId}`);
  } else if (chatContext.type === "group") {
    return ref(db, `groups/${chatContext.groupId}/messages`);
  }
}

// --- Load messages for current context ---
function loadMessages() {
  clearChat();
  const chatRef = getChatRef();
  chatListener = {
    ref: chatRef,
    cb: onChildAdded(chatRef, (snapshot) => {
      const data = snapshot.val();
      const msgDiv = document.createElement("div");
      msgDiv.className = "message";
      if (auth.currentUser && data.uid === auth.currentUser.uid) msgDiv.classList.add("own");
      let replyHTML = "";
      if (data.replyTo) {
        replyHTML = `<div style="font-size:0.75rem; opacity:0.7; margin-bottom:4px; border-left: 3px solid #a3a0ff; padding-left: 6px; color:#ccc;">
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
    })
  };
}

// --- Sidebar population ---
function updateUsersAndFriends() {
  usersList.innerHTML = "";
  friendsList.innerHTML = "";
  onValue(ref(db, "users"), (snap) => {
    const users = snap.val() || {};
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    Object.entries(users).forEach(([uid, user]) => {
      if (myUid && uid === myUid) return; // skip self
      const li = document.createElement("li");
      li.textContent = user.displayName || "Anonymous";
      li.setAttribute("data-uid", uid);
      // Add Friend/Remove Friend button
      if (auth.currentUser) {
        get(ref(db, `friends/${myUid}/${uid}`)).then(fSnap => {
          if (fSnap.exists()) {
            // Already friends
            li.innerHTML += `<button title="Remove Friend">−</button>`;
            friendsList.appendChild(li.cloneNode(true));
          } else {
            li.innerHTML += `<button title="Add Friend">+</button>`;
          }
          usersList.appendChild(li);
        });
      } else {
        usersList.appendChild(li);
      }
    });
    // Add click events after DOM update
    usersList.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
          // Add/remove friend
          const uid = li.getAttribute("data-uid");
          if (e.target.textContent === "+") {
            set(ref(db, `friends/${myUid}/${uid}`), true);
            set(ref(db, `friends/${uid}/${myUid}`), true);
          } else {
            set(ref(db, `friends/${myUid}/${uid}`), null);
            set(ref(db, `friends/${uid}/${myUid}`), null);
          }
        } else {
          // Start DM
          setChatContext({ type: "dm", uid: li.getAttribute("data-uid") });
          setSidebarSelected("dm", li.getAttribute("data-uid"));
        }
      });
    });
    friendsList.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", () => {
        setChatContext({ type: "dm", uid: li.getAttribute("data-uid") });
        setSidebarSelected("dm", li.getAttribute("data-uid"));
      });
    });
  });
}

function updateGroups() {
  groupsList.innerHTML = "";
  onValue(ref(db, "groups"), (snap) => {
    const groups = snap.val() || {};
    Object.entries(groups).forEach(([groupId, group]) => {
      const li = document.createElement("li");
      li.textContent = group.name;
      li.setAttribute("data-groupid", groupId);
      groupsList.appendChild(li);
    });
    groupsList.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", () => {
        setChatContext({ type: "group", groupId: li.getAttribute("data-groupid") });
        setSidebarSelected("group", li.getAttribute("data-groupid"));
      });
    });
  });
}

// --- Group creation ---
createGroupBtn.addEventListener("click", () => {
  if (!auth.currentUser) return alert("Sign in to create groups.");
  const name = prompt("Enter group name:");
  if (!name) return;
  const groupRef = push(ref(db, "groups"), {
    name,
    createdBy: auth.currentUser.uid,
    createdAt: Date.now()
  });
});

// --- Public chat click ---
publicChatBtn.addEventListener("click", () => {
  setChatContext({ type: "public" });
  setSidebarSelected("public");
});

// --- Reply cancel ---
cancelReplyBtn.addEventListener("click", () => {
  replyTo = null;
  replyPreview.style.display = "none";
});

// --- Send message ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!auth.currentUser) return alert("You must be signed in to send messages.");
  const msg = messageInput.value.trim();
  if (!msg) return;
  const newMsg = {
    uid: auth.currentUser.uid,
    name: auth.currentUser.displayName || "Anonymous",
    message: msg,
    timestamp: Date.now(),
  };
  if (replyTo) newMsg.replyTo = replyTo;
  push(getChatRef(), newMsg)
    .then(() => {
      messageInput.value = "";
      replyTo = null;
      replyPreview.style.display = "none";
    })
    .catch((err) => {
      console.error("Error sending message:", err);
    });
});

// --- Auth ---
signInBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((error) => {
    console.error("Sign-in error:", error);
  });
});
signOutBtn.addEventListener("click", () => {
  signOut(auth).catch((error) => {
    console.error("Sign-out error:", error);
  });
});
onAuthStateChanged(auth, (user) => {
  if (user) {
    usernameInput.value = user.displayName || "Anonymous";
    usernameInput.readOnly = true;
    usernameInput.style.userSelect = "none";
    messageInput.disabled = false;
    sendBtn.disabled = false;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
    usernameInput.placeholder = "";
    // Save user info
    set(ref(db, `users/${user.uid}`), {
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || ""
    });
    updateUsersAndFriends();
    updateGroups();
    setChatContext({ type: "public" });
    setSidebarSelected("public");
  } else {
    usernameInput.value = "";
    usernameInput.placeholder = "Sign in to chat";
    usernameInput.readOnly = true;
    messageInput.disabled = true;
    sendBtn.disabled = true;
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
    replyTo = null;
    replyPreview.style.display = "none";
    clearChat();
    usersList.innerHTML = "";
    friendsList.innerHTML = "";
    groupsList.innerHTML = "";
  }
});
