// firebaseHelpers.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  onValue,
  onChildAdded,
  off,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
  authDomain: "chatz-45df4.firebaseapp.com",
  databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
  projectId: "chatz-45df4",
  storageBucket: "chatz-45df4.appspot.com",
  messagingSenderId: "463847844545",
  appId: "1:463847844545:web:5006247d061c3e0dc28240",
  measurementId: "G-2VHETC9V8B"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// --- Authentication Helpers ---

/**
 * Sign in with Google popup.
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Google sign-in failed:", e);
    throw e;
  }
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign out failed:", e);
    throw e;
  }
}

/**
 * Listen for auth state changes.
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// --- Realtime Database Helpers ---

/**
 * Push data to a path (generates new unique key).
 * @param {string} path
 * @param {object} data
 * @returns {Promise<string>} new key
 */
export async function pushData(path, data) {
  try {
    const newRef = push(ref(db, path));
    await set(newRef, data);
    return newRef.key;
  } catch (e) {
    console.error(`Failed to push data to ${path}:`, e);
    throw e;
  }
}

/**
 * Set data at a specific path.
 * @param {string} path
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function setData(path, data) {
  try {
    await set(ref(db, path), data);
  } catch (e) {
    console.error(`Failed to set data at ${path}:`, e);
    throw e;
  }
}

/**
 * Get data once from a path.
 * @param {string} path
 * @returns {Promise<object|null>}
 */
export async function getData(path) {
  try {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (e) {
    console.error(`Failed to get data from ${path}:`, e);
    throw e;
  }
}

/**
 * Listen for value changes at a path.
 * @param {string} path
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onValueChange(path, callback) {
  const dbRef = ref(db, path);
  onValue(dbRef, callback);
  return () => off(dbRef, "value", callback);
}

/**
 * Listen for new child added at a path.
 * @param {string} path
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onChildAddedListener(path, callback) {
  const dbRef = ref(db, path);
  onChildAdded(dbRef, callback);
  return () => off(dbRef, "child_added", callback);
}

/**
 * Remove data at a path.
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function removeData(path) {
  try {
    await remove(ref(db, path));
  } catch (e) {
    console.error(`Failed to remove data at ${path}:`, e);
    throw e;
  }
}

/**
 * Update data at a path (partial update).
 * @param {string} path
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateData(path, data) {
  try {
    await update(ref(db, path), data);
  } catch (e) {
    console.error(`Failed to update data at ${path}:`, e);
    throw e;
  }
}

// --- Export raw Firebase objects if needed ---
export {
  auth,
  db,
  provider,
  ref,
  push,
  set,
  get,
  onValue,
  onChildAdded,
  off,
  remove,
  update
};
