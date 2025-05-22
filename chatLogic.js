(() => {
  const chatContainer = document.getElementById("chat-container");
  const inputForm = document.getElementById("input-form");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const typingIndicator = document.getElementById("typing-indicator");

  let currentUser = null;
  let typingTimeout = null;
  const TYPING_TIMER_LENGTH = 1500; // ms

  // Format timestamp nicely
  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render a message bubble
  const renderMessage = (msg) => {
    // Avoid rendering if no username or text
    if (!msg.text || !msg.uid) return;

    const div = document.createElement("div");
    div.classList.add("message");

    // Different styles for self vs others
    if (msg.uid === currentUser.uid) {
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

    // Scroll to bottom for new messages
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // Handle form submit
  inputForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
    }
  });

  // Enable/disable send button on input change
  messageInput.addEventListener("input", () => {
    sendBtn.disabled = messageInput.value.trim().length === 0;
    setTyping(true);
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
    const othersTyping = Object.entries(typingUsers).filter(
      ([uid, typing]) => uid !== currentUser.uid && typing
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

  // Setup initial auth and cleanup
  FirebaseHelpers.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      FirebaseHelpers.setupTypingStatusCleanup();
      sendBtn.disabled = true;
    } else {
      // If signed out, sign in anonymously
      await FirebaseHelpers.signInAnonymously();
    }
  });

  // Kick things off by signing in if not already
  (async () => {
    if (!FirebaseHelpers.getCurrentUser()) {
      await FirebaseHelpers.signInAnonymously();
    }
  })();
})();