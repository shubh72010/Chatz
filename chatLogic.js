// Original chat logic.js content here, untouched:

// Wait for auth state changes
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("main-chat").style.display = "block";
    document.getElementById("user-name").textContent = user.displayName;

    startGlobalChat();

    startGroupsListener(user.uid);
    startDmsListener(user.uid);

  } else {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("main-chat").style.display = "none";
  }
});

document.getElementById("login-btn").addEventListener("click", () => {
  signInWithGoogle().catch(console.error);
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut().catch(console.error);
});

// Global chat logic

const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

messageForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  const user = getCurrentUser();
  if (!user) return;

  addGlobalMessage({
    text: msg,
    userId: user.uid,
    userName: user.displayName,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  messageInput.value = "";
});

function startGlobalChat() {
  onGlobalMessages(messages => {
    messagesDiv.innerHTML = "";
    messages.forEach(m => {
      const div = document.createElement("div");
      div.textContent = `${m.userName}: ${m.text}`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Navigation between chats

const btnGlobalChat = document.getElementById("btn-global-chat");
const btnGroups = document.getElementById("btn-groups");
const btnDms = document.getElementById("btn-dms");

const globalChatDiv = document.getElementById("global-chat");
const groupsChatDiv = document.getElementById("groups-chat");
const dmsChatDiv = document.getElementById("dms-chat");

btnGlobalChat.addEventListener("click", () => {
  setActiveChat("global");
});
btnGroups.addEventListener("click", () => {
  setActiveChat("groups");
});
btnDms.addEventListener("click", () => {
  setActiveChat("dms");
});

function setActiveChat(type) {
  btnGlobalChat.classList.remove("active-nav");
  btnGroups.classList.remove("active-nav");
  btnDms.classList.remove("active-nav");
  globalChatDiv.style.display = "none";
  groupsChatDiv.style.display = "none";
  dmsChatDiv.style.display = "none";

  if (type === "global") {
    btnGlobalChat.classList.add("active-nav");
    globalChatDiv.style.display = "block";
  } else if (type === "groups") {
    btnGroups.classList.add("active-nav");
    groupsChatDiv.style.display = "block";
  } else if (type === "dms") {
    btnDms.classList.add("active-nav");
    dmsChatDiv.style.display = "block";
  }
}

// Groups logic

const groupsList = document.getElementById("groups-list");
const createGroupBtn = document.getElementById("create-group-btn");

const groupChatWindow = document.getElementById("group-chat-window");
const groupChatTitle = document.getElementById("group-chat-title");
const groupMessagesDiv = document.getElementById("group-messages");
const groupMessageForm = document.getElementById("group-message-form");
const groupMessageInput = document.getElementById("group-message-input");

let currentGroupId = null;
let unsubscribeGroupMessages = null;

createGroupBtn.addEventListener("click", async () => {
  const groupName = prompt("Enter group name:");
  if (!groupName) return;
  const user = getCurrentUser();
  if (!user) return;

  const groupId = await createGroup(groupName, user.uid);
  // auto open this group chat
  openGroupChat(groupId, groupName);
});

function startGroupsListener(userId) {
  getUserGroups(userId, groups => {
    groupsList.innerHTML = "";
    groups.forEach(group => {
      const li = document.createElement("li");
      li.textContent = group.name;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => openGroupChat(group.id, group.name));
      groupsList.appendChild(li);
    });
  });
}

function openGroupChat(groupId, groupName) {
  currentGroupId = groupId;
  groupChatTitle.textContent = groupName;
  groupChatWindow.style.display = "block";

  if (unsubscribeGroupMessages) unsubscribeGroupMessages();

  unsubscribeGroupMessages = onGroupMessages(groupId, messages => {
    groupMessagesDiv.innerHTML = "";
    messages.forEach(m => {
      const div = document.createElement("div");
      div.textContent = `${m.userName}: ${m.text}`;
      groupMessagesDiv.appendChild(div);
    });
    groupMessagesDiv.scrollTop = groupMessagesDiv.scrollHeight;
  });
}

groupMessageForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = groupMessageInput.value.trim();
  if (!msg || !currentGroupId) return;
  const user = getCurrentUser();
  if (!user) return;

  addGroupMessage(currentGroupId, {
    text: msg,
    userId: user.uid,
    userName: user.displayName,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  groupMessageInput.value = "";
});

// DMs logic

const dmList = document.getElementById("dm-list");
const startDmBtn = document.getElementById("start-dm-btn");

const dmChatWindow = document.getElementById("dm-chat-window");
const dmChatTitle = document.getElementById("dm-chat-title");
const dmMessagesDiv = document.getElementById("dm-messages");
const dmMessageForm = document.getElementById("dm-message-form");
const dmMessageInput = document.getElementById("dm-message-input");

let currentDmId = null;
let currentDmUserName = null;
let unsubscribeDmMessages = null;

startDmBtn.addEventListener("click", async () => {
  const userName = prompt("Enter the exact name of the user to DM:");
  if (!userName) return;

  // We have no username -> uid mapping in this example, so let's just alert and skip
  alert("You need to implement user search to get their UID for DM");
});

function startDmsListener(userId) {
  getUserDms(userId, dms => {
    dmList.innerHTML = "";
    dms.forEach(dm => {
      // For simplicity, show the other participant name(s)
      const otherParticipants = dm.participants.filter(uid => uid !== userId);
      // We only expect 1 other participant for DM
      const otherUserId = otherParticipants[0] || "Unknown";
      const li = document.createElement("li");
      li.textContent = `DM with ${otherUserId}`;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => openDmChat(dm.id, `User ${otherUserId}`));
      dmList.appendChild(li);
    });
  });
}

function openDmChat(dmId, otherUserName) {
  currentDmId = dmId;
  currentDmUserName = otherUserName;
  dmChatTitle.textContent = `DM with ${otherUserName}`;
  dmChatWindow.style.display = "block";

  if (unsubscribeDmMessages) unsubscribeDmMessages();

  unsubscribeDmMessages = onDmMessages(dmId, messages => {
    dmMessagesDiv.innerHTML = "";
    messages.forEach(m => {
      const div = document.createElement("div");
      div.textContent = `${m.userName}: ${m.text}`;
      dmMessagesDiv.appendChild(div);
    });
    dmMessagesDiv.scrollTop = dmMessagesDiv.scrollHeight;
  });
}

dmMessageForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = dmMessageInput.value.trim();
  if (!msg || !currentDmId) return;
  const user = getCurrentUser();
  if (!user) return;

  addDmMessage(currentDmId, {
    text: msg,
    userId: user.uid,
    userName: user.displayName,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  dmMessageInput.value = "";
});