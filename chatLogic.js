// chatLogic.js
import {
  auth, createUserProfile, getUserProfile, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  getDMId, sendDMMessage, onDMMessage,
  createGroup, sendGroupMessage, onGroupMessage, onUserGroups
} from "./firebaseHelper.js";

let currentUser = null;
let currentChat = null; // { type: 'dm' | 'group', id: string, name: string }
let messageListenerUnsubscribe = null;

// UI Elements
const loginForm = document.getElementById("loginForm");
const chatContainer = document.getElementById("chatContainer");
const messageList = document.getElementById("messageList");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const dmListEl = document.getElementById("dmList");
const groupListEl = document.getElementById("groupList");

const newGroupForm = document.getElementById("newGroupForm");
const groupNameInput = document.getElementById("groupNameInput");
const groupMembersInput = document.getElementById("groupMembersInput"); // comma-separated user emails

// --- AUTH ---

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    // Load profile or create one
    const profileSnap = await getUserProfile(user.uid);
    if (!profileSnap.exists()) {
      // For demo: create profile with displayName from email prefix
      await createUserProfile(user.uid, user.email.split("@")[0], user.email);
    }
    loginForm.style.display = "none";
    chatContainer.style.display = "block";
    loadChats();
  } else {
    currentUser = null;
    loginForm.style.display = "block";
    chatContainer.style.display = "none";
  }
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch {
    try {
      // If sign in fails, create user
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("Auth error: " + err.message);
    }
  }
});

// --- LOAD CHATS ---

async function loadChats() {
  // Load groups current user belongs to
  onUserGroups(currentUser.uid, groups => {
    groupListEl.innerHTML = "";
    groups.forEach(group => {
      const li = document.createElement("li");
      li.textContent = group.name;
      li.onclick = () => openChat("group", group.id, group.name);
      groupListEl.appendChild(li);
    });
  });

  // Load DMs
  // For demo: list all users except current user and create clickable DMs
  const usersSnap = await fetchAllUsers();
  dmListEl.innerHTML = "";
  usersSnap.forEach(user => {
    if (user.uid !== currentUser.uid) {
      const li = document.createElement("li");
      li.textContent = user.displayName || user.email;
      li.onclick = () => {
        const dmId = getDMId(currentUser.uid, user.uid);
        openChat("dm", dmId, user.displayName || user.email);
      };
      dmListEl.appendChild(li);
    }
  });
}

async function fetchAllUsers() {
  // Simple fetch from `/users`
  return new Promise((resolve) => {
    import("./firebaseHelper.js").then(({database, ref, onValue}) => {
      const usersRef = ref(database, "users");
      onValue(usersRef, snapshot => {
        const usersObj = snapshot.val() || {};
        const users = Object.entries(usersObj).map(([uid, data]) => ({uid, ...data}));
        resolve(users);
      }, { onlyOnce: true });
    });
  });
}

// --- OPEN CHAT ---

function openChat(type, id, name) {
  if (messageListenerUnsubscribe) {
    messageListenerUnsubscribe();
  }
  currentChat = { type, id, name };
  messageList.innerHTML = "";
  document.getElementById("chatTitle").textContent = name;

  if (type === "dm") {
    onDMMessage(id, msgs => {
      renderMessages(msgs);
    });
  } else if (type === "group") {
    onGroupMessage(id, msgs => {
      renderMessages(msgs);
    });
  }
}

// --- RENDER MESSAGES ---

function renderMessages(messages) {
  messageList.innerHTML = "";
  if (!messages) return;
  const sortedMsgs = Object.entries(messages).sort((a, b) => a[1].timestamp - b[1].timestamp);
  sortedMsgs.forEach(([key, msg]) => {
    const div = document.createElement("div");
    div.className = msg.senderId === currentUser.uid ? "myMessage" : "otherMessage";
    div.textContent = `${msg.senderName}: ${msg.message}`;
    messageList.appendChild(div);
  });
  messageList.scrollTop = messageList.scrollHeight;
}

// --- SEND MESSAGE ---

sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  if (currentChat.type === "dm") {
    sendDMMessage(currentChat.id, currentUser.uid, currentUser.email.split("@")[0], text);
  } else if (currentChat.type === "group") {
    sendGroupMessage(currentChat.id, currentUser.uid, currentUser.email.split("@")[0], text);
  }

  messageInput.value = "";
};

// --- CREATE GROUP ---

newGroupForm.addEventListener("submit", async e => {
  e.preventDefault();
  const groupName = groupNameInput.value.trim();
  const memberEmails = groupMembersInput.value.split(",").map(e => e.trim()).filter(Boolean);

  if (!groupName || memberEmails.length === 0) {
    alert("Provide a group name and at least one member email");
    return;
  }

  // Resolve member emails to user IDs
  const allUsers = await fetchAllUsers();
  const members = [currentUser.uid]; // creator always member
  memberEmails.forEach(email => {
    const user = allUsers.find(u => u.email === email);
    if (user) members.push(user.uid);
  });

  if (members.length < 2) {
    alert("No valid members found");
    return;
  }

  const groupId = await createGroup(groupName, members);
  alert(`Group "${groupName}" created!`);
  groupNameInput.value = "";
  groupMembersInput.value = "";
  loadChats();
});