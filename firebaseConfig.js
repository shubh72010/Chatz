// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDatabase, ref as dbRef, set, get, update, remove, push, onValue, off } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyAv4mVF8Y8lEKNK1vhBTy2Nj2Ya3l7ZJyQ",
    authDomain: "chatz-45df4.firebaseapp.com",
    databaseURL: "https://chatz-45df4-default-rtdb.firebaseio.com",
    projectId: "chatz-45df4",
    storageBucket: "chatz-45df4.firebasestorage.app",
    messagingSenderId: "463847844545",
    appId: "1:463847844545:web:5006247d061c3e0dc28240",
    measurementId: "G-2VHETC9V8B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Auth state observer
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // Update user's online status
        const userStatusRef = dbRef(realtimeDb, `status/${user.uid}`);
        set(userStatusRef, {
            online: true,
            lastSeen: Date.now()
        });
    }
});

// Database references
const getMessagesRef = (chatId) => collection(db, `chats/${chatId}/messages`);
const getChatsRef = () => collection(db, 'chats');
const getUsersRef = () => collection(db, 'users');
const getStorageRef = (path) => ref(storage, path);

// Real-time database references
const getTypingRef = (chatId) => dbRef(realtimeDb, `typing/${chatId}`);
const getOnlineStatusRef = (userId) => dbRef(realtimeDb, `status/${userId}`);

// Message handling
const sendMessage = async (chatId, message) => {
    try {
        const messagesRef = getMessagesRef(chatId);
        const docRef = await addDoc(messagesRef, {
            ...message,
            timestamp: Date.now(),
            status: 'sent'
        });
        return docRef.id;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

const updateMessage = async (chatId, messageId, updates) => {
    try {
        const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
        await updateDoc(messageRef, updates);
    } catch (error) {
        console.error('Error updating message:', error);
        throw error;
    }
};

const deleteMessage = async (chatId, messageId) => {
    try {
        const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
        await deleteDoc(messageRef);
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};

// File upload
const uploadFile = async (file, path) => {
    try {
        const storageRef = getStorageRef(path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

// Chat management
const createChat = async (participants) => {
    try {
        const chatsRef = getChatsRef();
        const docRef = await addDoc(chatsRef, {
            participants,
            createdAt: Date.now(),
            lastMessage: null
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating chat:', error);
        throw error;
    }
};

const updateChat = async (chatId, updates) => {
    try {
        const chatRef = doc(db, `chats/${chatId}`);
        await updateDoc(chatRef, updates);
    } catch (error) {
        console.error('Error updating chat:', error);
        throw error;
    }
};

// User management
const updateUserProfile = async (userId, updates) => {
    try {
        const userRef = doc(db, `users/${userId}`);
        await updateDoc(userRef, updates);
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// Real-time listeners
const listenToMessages = (chatId, callback) => {
    const messagesRef = getMessagesRef(chatId);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, callback);
};

const listenToTyping = (chatId, callback) => {
    const typingRef = getTypingRef(chatId);
    return onValue(typingRef, callback);
};

const listenToOnlineStatus = (userId, callback) => {
    const statusRef = getOnlineStatusRef(userId);
    return onValue(statusRef, callback);
};

// Cleanup function
const cleanup = () => {
    // Remove all real-time listeners
    off(dbRef(realtimeDb));
};

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
    createChat,
    updateChat,
    updateUserProfile,
    listenToMessages,
    listenToTyping,
    listenToOnlineStatus,
    cleanup
}; 