// firebaseHelpers.js
import { getDatabase, ref, push, set, get, onValue, onChildAdded, off } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Push a new message or group
export function pushData(dbRef, data) {
  return push(dbRef, data);
}

// Set data at a path (used for users, friends, etc.)
export function setData(dbRef, data) {
  return set(dbRef, data);
}

// Get data once from a path
export function getData(dbRef) {
  return get(dbRef);
}

// Listen for value changes (e.g., for users, groups, friends)
export function listenValue(dbRef, callback) {
  return onValue(dbRef, callback);
}

// Listen for new children (e.g., for chat messages)
export function listenChildAdded(dbRef, callback) {
  return onChildAdded(dbRef, callback);
}

// Remove a listener
export function removeListener(dbRef, eventType, callback) {
  return off(dbRef, eventType, callback);
}
