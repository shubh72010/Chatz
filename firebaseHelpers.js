// firebaseHelper.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onChildAdded,
  onValue,
  get,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Your Firebase config — fixed storageBucket URL
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.appspot.com",  // fixed this line
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B",
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
  get,
};