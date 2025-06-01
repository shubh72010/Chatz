// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue, 
    off,
    push,
    child
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

// Get current user
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// Message handling functions
async function sendMessage(chatId, message) {
    try {
        const messageRef = collection(db, `chats/${chatId}/messages`);
        const docRef = await addDoc(messageRef, {
            ...message,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

async function updateMessage(messageId, updates) {
    try {
        const messageRef = doc(db, `messages/${messageId}`);
        await updateDoc(messageRef, updates);
    } catch (error) {
        console.error('Error updating message:', error);
        throw error;
    }
}

async function deleteMessage(chatId, messageId) {
    try {
        const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
        await deleteDoc(messageRef);
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}

// File upload function
async function uploadFile(file, path) {
    try {
        const storageReference = storageRef(storage, path);
        const snapshot = await uploadBytes(storageReference, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Real-time listeners
function listenToMessages(chatId, callback) {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return onSnapshot(q, callback);
}

function listenToTyping(chatId, callback) {
    const typingRef = ref(realtimeDb, `typing/${chatId}`);
    onValue(typingRef, callback);
    return () => off(typingRef);
}

function listenToOnlineStatus(userId, callback) {
    const statusRef = ref(realtimeDb, `status/${userId}`);
    onValue(statusRef, callback);
    return () => off(statusRef);
}

// Cleanup function
function cleanup() {
    // Cleanup any active listeners
    off(ref(realtimeDb));
}

// Export all necessary functions and variables
export {
    auth,
    db,
    storage,
    realtimeDb,
    currentUser,
    sendMessage,
    updateMessage,
    deleteMessage,
    uploadFile,
    listenToMessages,
    listenToTyping,
    listenToOnlineStatus,
    cleanup
}; 