// chatLogic.js

(() => {
  const chatContainer = document.getElementById("chat-container");
  const inputForm = document.getElementById("input-form");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const typingIndicator = document.getElementById("typing-indicator");

  let typingTimeout = null;
  const TYPING_TIMER_LENGTH = 1500; // ms

  // Format timestamp nicely
  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render a message bubble
  const renderMessage = (msg) => {
    if (!msg.text || !msg.uid) return;

    const currentUser = FirebaseHelpers.getCurrentUser();

    const div = document.createElement("div");
    div.classList.add("message");

    if (currentUser && msg.uid === currentUser.uid) {
      div.classList.add("self");
    } else {
      div.classList.add("other");
    }

    const usernameEl = document.createElement("div");
    usernameEl.className = "username";
    usernameEl.textContent = msg.username || "Anon";

    const textEl = document.createElement("div");
    textEl.className = "text";
    textEl.textContent = msg.text;

    const timestampEl = document.createElement("div");
    timestampEl.className = "timestamp";
    timestampEl.textContent = formatTimestamp(msg.timestamp || Date.now());

    div.appendChild(usernameEl);
    div.appendChild(textEl);
    div.appendChild(timestampEl);

    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // Handle form submit
  inputForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentUser = FirebaseHelpers.getCurrentUser();
    if (!currentUser) {
      console.warn("No user signed in yet");
      return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    sendBtn.disabled = true;

    const messageObj = {
      text,
      uid: currentUser.uid,
      username: currentUser.isAnonymous ? "Anon" : currentUser.displayName || "User",
      timestamp: Date.now(),
    };

    try {
      await FirebaseHelpers.sendMessage(messageObj);
      messageInput.value = "";
      sendBtn.disabled = true;
      setTyping(false);
    } catch (err) {
      console.error("Failed to send message:", err);
      sendBtn.disabled = false; // re-enable on fail
    }
  });

  // Enable/disable send button and typing status on input
  messageInput.addEventListener("input", () => {
    sendBtn.disabled = messageInput.value.trim().length === 0;
    setTyping(messageInput.value.trim().length > 0);
  });

  // Manage typing status with debounce
  const setTyping = (isTyping) => {
    FirebaseHelpers.setTypingStatus(isTyping);
    if (typingTimeout) clearTimeout(typingTimeout);
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        FirebaseHelpers.setTypingStatus(false);
      }, TYPING_TIMER_LENGTH);
    }
  };

  // Show typing indicator if others typing
  FirebaseHelpers.onTypingStatusChanged((typingUsers) => {
    const currentUser = FirebaseHelpers.getCurrentUser();
    const othersTyping = Object.entries(typingUsers).filter(
      ([uid, typing]) => uid !== (currentUser ? currentUser.uid : null) && typing
    );

    if (othersTyping.length === 0) {
      typingIndicator.textContent = "";
    } else if (othersTyping.length === 1) {
      typingIndicator.textContent = "Someone is typing...";
    } else {
      typingIndicator.textContent = "Multiple people are typing...";
    }
  });

  // Listen for new messages and render them
  FirebaseHelpers.onNewMessage((msg) => {
    renderMessage(msg);
  });

  // Auth state change handler
  FirebaseHelpers.onAuthStateChanged(async (user) => {
    if (user) {
      FirebaseHelpers.setupTypingStatusCleanup();
      sendBtn.disabled = true; // disable send until user types something
    } else {
      // Not signed in, sign in anonymously once
      try {
        await FirebaseHelpers.signInAnonymously();
      } catch (err) {
        console.error("Anonymous sign-in failed:", err);
      }
    }
  });

  // No manual sign-in call here, just wait for auth state change

})();