// firebaseHelpers.js
import { getDatabase, ref, push, set, get, onValue, onChildAdded, off } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

export function pushData(dbRef, data) {
  return push(dbRef, data);
}
export function setData(dbRef, data) {
  return set(dbRef, data);
}
export function getData(dbRef) {
  return get(dbRef);
}
export function listenValue(dbRef, callback) {
  return onValue(dbRef, callback);
}
export function listenChildAdded(dbRef, callback) {
  return onChildAdded(dbRef, callback);
}
export function removeListener(dbRef, eventType, callback) {
  return off(dbRef, eventType, callback);
}
