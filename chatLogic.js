import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Firebase config (replace with your actual config if not already initialized)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;
let currentChatId = "default"; // Change if using multiple chats

const chatContainer = document.getElementById("chat");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    loadMessages();
  } else {
    console.error("Not logged in");
  }
});

// Load messages
async function loadMessages() {
  const messagesRef = collection(db, "users", currentUserId, "chats", currentChatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));
  const querySnapshot = await getDocs(q);

  chatContainer.innerHTML = ""; // Clear existing messages

  querySnapshot.forEach((doc) => {
    const message = doc.data();
    renderMessage(message.text, message.sender === "user");
  });

  scrollToBottom();
}

// Save message
async function saveMessage(text, sender) {
  const messagesRef = collection(db, "users", currentUserId, "chats", currentChatId, "messages");
  await addDoc(messagesRef, {
    text,
    sender,
    timestamp: serverTimestamp()
  });
}

// Send user message
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = messageInput.value.trim();
  if (!userMessage) return;

  renderMessage(userMessage, true);
  await saveMessage(userMessage, "user");
  messageInput.value = "";

  // Simulate AI response (replace with actual API call)
  const aiResponse = await getAIResponse(userMessage);
  renderMessage(aiResponse, false);
  await saveMessage(aiResponse, "ai");
});

// Render message
function renderMessage(text, isUser) {
  const msg = document.createElement("div");
  msg.classList.add("message", isUser ? "user-message" : "ai-message");
  msg.textContent = text;
  chatContainer.appendChild(msg);
}

// Simulated AI response
async function getAIResponse(userInput) {
  // Replace with your real backend call to Flask/OpenAI
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("This is a dummy AI response to: " + userInput);
    }, 500);
  });
}

// Scroll to bottom
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}
