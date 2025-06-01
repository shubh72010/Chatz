// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';
import { 
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { 
    getDatabase,
    ref as dbRef,
    set,
    remove,
    onValue,
    off
} from 'firebase/database';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Auth state observer
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// Firestore functions
export async function sendMessage(chatId, message) {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const docRef = await addDoc(messagesRef, message);
    return docRef.id;
}

export async function updateMessage(chatId, messageId, updates) {
    const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
    await updateDoc(messageRef, updates);
}

export async function deleteMessage(chatId, messageId) {
    const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
    await deleteDoc(messageRef);
}

export function listenToMessages(chatId, callback) {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, callback);
}

// Realtime Database functions
export function listenToTyping(chatId, callback) {
    const typingRef = dbRef(realtimeDb, `typing/${chatId}`);
    onValue(typingRef, callback);
    return () => off(typingRef);
}

export function listenToOnlineStatus(userId, callback) {
    const statusRef = dbRef(realtimeDb, `onlineStatus/${userId}`);
    onValue(statusRef, callback);
    return () => off(statusRef);
}

// Storage functions
export async function uploadFile(file, path) {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
}

// Cleanup function
export function cleanup() {
    // Clean up any listeners or resources
    off(dbRef(realtimeDb));
}

// Export Firebase instances
export {
    auth,
    db,
    storage,
    realtimeDb,
    currentUser
}; 