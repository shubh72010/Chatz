// firebaseHelper.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, set, push, onChildAdded, onValue, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Paste your firebase config here:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const provider = new GoogleAuthProvider();

function signIn() {
  return signInWithPopup(auth, provider);
}
function signUserOut() {
  return signOut(auth);
}

export {
  auth,
  database,
  provider,
  signIn,
  signUserOut,
  onAuthStateChanged,
  ref,
  set,
  push,
  onChildAdded,
  onValue,
  get
};