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
} from "./firebaseHelpers.js";

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

// --- User Action Menu ---
let userMenu = null;
function showUserMenu(li, uid, isFriend) {
  if (userMenu) userMenu.remove();

  userMenu = document.createElement("div");
  userMenu.style.position = "absolute";
  userMenu.style.background = "var(--sidebar-bg)";
  userMenu.style.color = "var(--text)";
  userMenu.style.border = "1px solid var(--main)";
  userMenu.style.borderRadius = "8px";
  userMenu.style.boxShadow = "0 4px 16px #0004";
  userMenu.style.padding = "0.5rem 0";
  userMenu.style.zIndex = 1000;
  userMenu.style.minWidth = "150px";
  userMenu.style.fontSize = "1rem";
  const rect = li.getBoundingClientRect();
  userMenu.style.left = (rect.left + window.scrollX) + "px";
  userMenu.style.top = (rect.bottom + window.scrollY) + "px";

  const dmBtn = document.createElement("button");
  dmBtn.textContent = "Direct Message";
  dmBtn.style.display = "block";
  dmBtn.style.width = "100%";
  dmBtn.style.background = "none";
  dmBtn.style.border = "none";
  dmBtn.style.color = "inherit";
  dmBtn.style.padding = "0.5rem 1rem";
  dmBtn.style.textAlign = "left";
  dmBtn.style.cursor = "pointer";
  dmBtn.onmouseover = () => dmBtn.style.background = "var(--main)";
  dmBtn.onmouseout = () => dmBtn.style.background = "none";
  dmBtn.onclick = (e) => {
    e.stopPropagation();
    setChatContext({ type: "dm", uid });
    setSidebarSelected("dm", uid);
    if (userMenu) userMenu.remove();
    userMenu = null;
  };
  userMenu.appendChild(dmBtn);

  const friendBtn = document.createElement("button");
  friendBtn.textContent = isFriend ? "Remove Friend" : "Add Friend";
  friendBtn.style.display = "block";
  friendBtn.style.width = "100%";
  friendBtn.style.background = "none";
  friendBtn.style.border = "none";
  friendBtn.style.color = isFriend ? "var(--danger)" : "var(--accent)";
  friendBtn.style.padding = "0.5rem 1rem";
  friendBtn.style.textAlign = "left";
  friendBtn.style.cursor = "pointer";
  friendBtn.onmouseover = () => friendBtn.style.background = "var(--main)";
  friendBtn.onmouseout = () => friendBtn.style.background = "none";
  friendBtn.onclick = (e) => {
    e.stopPropagation();
    const myUid = auth.currentUser.uid;
    if (isFriend) {
      setData(ref(db, `friends/${myUid}/${uid}`), null);
      setData(ref(db, `friends/${uid}/${myUid}`), null);
    } else {
      setData(ref(db, `friends/${myUid}/${uid}`), true);
      setData(ref(db, `friends/${uid}/${myUid}`), true);
    }
    if (userMenu) userMenu.remove();
    userMenu = null;
  };
  userMenu.appendChild(friendBtn);

  userMenu.addEventListener("pointerdown", (e) => e.stopPropagation());
  setTimeout(() => {
    document.addEventListener("pointerdown", hideUserMenu, { once: true });
  }, 0);

  document.body.appendChild(userMenu);
}
function hideUserMenu(e) {
  if (userMenu && (!e || !userMenu.contains(e.target))) {
    userMenu.remove();
    userMenu = null;
  }
}

// --- Sidebar population ---
function updateUsersAndFriends() {
  usersList.innerHTML = "";
  friendsList.innerHTML = "";
  listenValue(ref(db, "users"), (snap) => {
    const users = snap.val() || {};
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    getData(ref(db, `friends/${myUid}`)).then(friendSnap => {
      const friends = friendSnap.exists() ? Object.keys(friendSnap.val()) : [];
      Object.entries(users).forEach(([uid, user]) => {
        if (myUid && uid === myUid) return;
        const li = document.createElement("li");
        li.textContent = user.displayName || "Anonymous";
        li.setAttribute("data-uid", uid);
        li.onclick = (e) => {
          e.preventDefault();
          showUserMenu(li, uid, friends.includes(uid));
        };
        usersList.appendChild(li);
      });
      friends.forEach(friendUid => {
        if (!users[friendUid]) return;
        const li = document.createElement("li");
        li.textContent = users[friendUid].displayName || "Anonymous";
        li.setAttribute("data-uid", friendUid);
        li.onclick = () => {
          setChatContext({ type: "dm", uid: friendUid });
          setSidebarSelected("dm", friendUid);
        };
        friendsList.appendChild(li);
      });
    });
  });
}
function updateGroups() {
  groupsList.innerHTML = "";
  myGroupsList.innerHTML = "";
  listenValue(ref(db, "groups"), (snap) => {
    const groups = snap.val() || {};
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    Object.entries(groups).forEach(([groupId, group]) => {
      const li = document.createElement("li");
      li.textContent = group.name;
      li.setAttribute("data-groupid", groupId);
      li.onclick = () => {
        setChatContext({ type: "group", groupId });
        setSidebarSelected("group", groupId);
      };
      groupsList.appendChild(li);
      if (myUid && group.createdBy === myUid) {
        const myLi = li.cloneNode(true);
        myLi.onclick = li.onclick;
        myGroupsList.appendChild(myLi);
      }
    });
  });
}

// --- Group creation ---
createGroupBtn.addEventListener("click", () => {
  if (!auth.currentUser) return alert("Sign in to create groups.");
  const name = prompt("Enter group name:");
  if (!name) return;
  pushData(ref(db, "groups"), {
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
  pushData(getChatRef(), newMsg)
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
    setData(ref(db, `users/${user.uid}`), {
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
    myGroupsList.innerHTML = "";
  }
// Attach a single event listener to handle all like buttons, including dynamically added ones
document.addEventListener('click', function(event) {
    if (event.target && event.target.classList.contains('like')) {
        // Extract message ID from the button's ID
        const messageId = event.target.id.replace('like_btn_', '');
        updateLike(messageId);
    }
});

// Update like count in UI and Firebase
function updateLike(messageId) {
    const countElem = document.getElementById('like_count_' + messageId);
    if (!countElem) return;

    // Increment like count in UI
    let likes = Number(countElem.textContent) || 0;
    likes++;
    countElem.textContent = likes;

    // Update like count in Firebase (if using Firebase)
    // Replace 'your_firebase_db_path' with your actual path
    if (typeof firebase !== "undefined" && firebase.database) {
        firebase.database().ref('messages/' + messageId).update({
            likes: likes
        });
    }
}

});
