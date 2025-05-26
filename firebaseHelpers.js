// firebaseHelpers.js

import {
  getDatabase,
  ref,
  push,
  set,
  get,
  onValue,
  onChildAdded,
  off
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Push data to a list (auto-generates key)
export function pushData(dbRef, data) {
  return push(dbRef, data);
}

// Set data at a specific reference
export function setData(dbRef, data) {
  return set(dbRef, data);
}

// Get data once from a reference
export function getData(dbRef) {
  return get(dbRef);
}

// Listen for any value changes at a reference
export function listenValue(dbRef, callback) {
  return onValue(dbRef, callback);
}

// ✅ Listen for new child entries being added (e.g., new messages)
export function listenChildAdded(dbRef, callback) {
  return onChildAdded(dbRef, callback);
}

// Stop listening to a specific event
export function removeListener(dbRef, eventType, callback) {
  return off(dbRef, eventType, callback);
}
