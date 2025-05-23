// Initialize Firebase
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Firebase Authentication Helpers
const authHelpers = {
    // Get current user
    getCurrentUser: () => {
        return new Promise((resolve, reject) => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            }, reject);
        });
    },

    // Sign out
    signOut: () => {
        return auth.signOut();
    },

    // Update user profile
    updateProfile: (displayName, photoURL) => {
        return auth.currentUser.updateProfile({ displayName, photoURL });
    }
};

// Firestore Helpers
const firestoreHelpers = {
    // User operations
    getUser: (userId) => {
        return db.collection('users').doc(userId).get();
    },

    updateUser: (userId, data) => {
        return db.collection('users').doc(userId).update(data);
    },

    // Friends operations
    getFriends: (userId) => {
        return db.collection('users').doc(userId).collection('friends').get();
    },

    addFriend: (userId, friendId) => {
        return db.collection('users').doc(userId).collection('friends').doc(friendId).set({
            uid: friendId,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    // Group operations
    createGroup: (groupData) => {
        return db.collection('groups').add(groupData);
    },

    getGroup: (groupId) => {
        return db.collection('groups').doc(groupId).get();
    },

    updateGroup: (groupId, data) => {
        return db.collection('groups').doc(groupId).update(data);
    },

    leaveGroup: (groupId, userId) => {
        return db.collection('groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayRemove(userId)
        });
    },

    // Message operations
    sendMessage: (conversationId, message) => {
        return db.collection('conversations').doc(conversationId).collection('messages').add(message);
    },

    getMessages: (conversationId) => {
        return db.collection('conversations').doc(conversationId).collection('messages')
            .orderBy('timestamp', 'asc').get();
    },

    // Real-time listeners
    listenForMessages: (conversationId, callback) => {
        return db.collection('conversations').doc(conversationId).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                const messages = [];
                snapshot.forEach(doc => {
                    messages.push({ id: doc.id, ...doc.data() });
                });
                callback(messages);
            });
    },

    listenForUserGroups: (userId, callback) => {
        return db.collection('groups').where('members', 'array-contains', userId)
            .onSnapshot(snapshot => {
                const groups = [];
                snapshot.forEach(doc => {
                    groups.push({ id: doc.id, ...doc.data() });
                });
                callback(groups);
            });
    }
};

// Storage Helpers
const storageHelpers = {
    uploadFile: (path, file) => {
        return storage.ref(path).put(file);
    },

    getDownloadURL: (path) => {
        return storage.ref(path).getDownloadURL();
    }
};

export { authHelpers, firestoreHelpers, storageHelpers };