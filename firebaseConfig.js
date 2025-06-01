// Import Firebase modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { 
    getDatabase,
    ref as dbRef,
    set,
    remove,
    onValue,
    off
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
    authDomain: "chatz-45df4.firebaseapp.com",
    databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
    projectId: "chatz-45df4",
    storageBucket: "chatz-45df4.appspot.com",
    messagingSenderId: "463847844545",
    appId: "1:463847844545:web:5006247d061c3e0dc28240"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Track all active listeners
const activeListeners = {
    firestore: new Set(),
    realtime: new Set(),
    auth: null
};

// Auth state observer
let currentUser = null;
activeListeners.auth = onAuthStateChanged(auth, (user) => {
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
    const unsubscribe = onSnapshot(q, callback);
    activeListeners.firestore.add(unsubscribe);
    return () => {
        unsubscribe();
        activeListeners.firestore.delete(unsubscribe);
    };
}

// Realtime Database functions
export function listenToTyping(chatId, callback) {
    const typingRef = dbRef(realtimeDb, `typing/${chatId}`);
    onValue(typingRef, callback);
    const unsubscribe = () => off(typingRef);
    activeListeners.realtime.add(unsubscribe);
    return unsubscribe;
}

export function listenToOnlineStatus(userId, callback) {
    const statusRef = dbRef(realtimeDb, `onlineStatus/${userId}`);
    onValue(statusRef, callback);
    const unsubscribe = () => off(statusRef);
    activeListeners.realtime.add(unsubscribe);
    return unsubscribe;
}

// Storage functions
export async function uploadFile(file, path) {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
}

// Cleanup function
export function cleanup() {
    try {
        // Clean up Firestore listeners
        activeListeners.firestore.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        activeListeners.firestore.clear();
        
        // Clean up Realtime Database listeners
        activeListeners.realtime.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        activeListeners.realtime.clear();
        
        // Clean up auth state observer
        if (typeof activeListeners.auth === 'function') {
            activeListeners.auth();
            activeListeners.auth = null;
        }
        
        // Clean up any remaining listeners
        off(dbRef(realtimeDb, 'typing'));
        off(dbRef(realtimeDb, 'onlineStatus'));
        off(dbRef(realtimeDb, 'users'));
        off(dbRef(realtimeDb, 'chats'));
    } catch (error) {
        console.error('Error during cleanup:', error);
        // Attempt to clean up remaining listeners even if there was an error
        off(dbRef(realtimeDb));
    }
}

// Export Firebase instances
export {
    auth,
    db,
    storage,
    realtimeDb,
    currentUser
}; 