// firebasehelpers.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const FirebaseHelpers = {
  // Authentication
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  },

  signOutUser: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  },

  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Firestore Operations
  createUserProfile: async (userId, userData) => {
    try {
      await setDoc(doc(db, 'users', userId), userData);
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  },

  createChatRoom: async (roomData) => {
    try {
      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating chat room:", error);
      throw error;
    }
  },

  createDM: async (dmId, dmData) => {
    try {
      await setDoc(doc(db, 'dms', dmId), dmData);
    } catch (error) {
      console.error("Error creating DM:", error);
      throw error;
    }
  },

  getChatRooms: async (userId) => {
    try {
      const q = query(collection(db, 'rooms'), where('members', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting chat rooms:", error);
      throw error;
    }
  },

  getDMs: async (userId) => {
    try {
      const q = query(collection(db, 'dms'), where('users', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting DMs:", error);
      throw error;
    }
  },

  sendMessage: async (chatType, chatId, messageData) => {
    try {
      await addDoc(collection(db, `${chatType}s`, chatId, 'messages'), messageData);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  subscribeToMessages: (chatType, chatId, callback) => {
    const q = query(
      collection(db, `${chatType}s`, chatId, 'messages'),
      orderBy('timestamp')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  },

  // Utility
  getCurrentUser: () => {
    return auth.currentUser;
  },

  getServerTimestamp: () => {
    return serverTimestamp();
  },

  findUserByEmail: async (email) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }
};