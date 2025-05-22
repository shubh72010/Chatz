// This is your original firebaseHelper.js content intact

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth helper functions
const signInWithGoogle = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider);
};

const signOut = () => {
  return auth.signOut();
};

const getCurrentUser = () => auth.currentUser;

// Firestore paths:
// Global chat: collection "globalMessages"
// Groups: collection "groups" > doc groupId > subcollection "messages"
// DMs: collection "dms" > doc dmId (sorted user ids joined) > subcollection "messages"

// Add message to global chat
const addGlobalMessage = (messageObj) => {
  return db.collection("globalMessages").add(messageObj);
};

// Listen to global chat messages realtime
const onGlobalMessages = (callback) => {
  return db.collection("globalMessages")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });
};

// Groups

// Create new group
const createGroup = async (groupName, creatorId) => {
  const groupRef = await db.collection("groups").add({
    name: groupName,
    members: [creatorId],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: creatorId
  });
  return groupRef.id;
};

// Get groups for user
const getUserGroups = (userId, callback) => {
  return db.collection("groups")
    .where("members", "array-contains", userId)
    .onSnapshot(snapshot => {
      const groups = [];
      snapshot.forEach(doc => {
        groups.push({ id: doc.id, ...doc.data() });
      });
      callback(groups);
    });
};

// Add message to group chat
const addGroupMessage = (groupId, messageObj) => {
  return db.collection("groups").doc(groupId)
    .collection("messages").add(messageObj);
};

// Listen to group messages realtime
const onGroupMessages = (groupId, callback) => {
  return db.collection("groups").doc(groupId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });
};

// Direct Messages

// Compose DM Id from two user ids (sorted to keep consistent)
const composeDmId = (userId1, userId2) => {
  return [userId1, userId2].sort().join("_");
};

// Add DM message
const addDmMessage = (dmId, messageObj) => {
  return db.collection("dms").doc(dmId)
    .collection("messages").add(messageObj);
};

// Listen to DM messages realtime
const onDmMessages = (dmId, callback) => {
  return db.collection("dms").doc(dmId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });
};

// Get DMs list for a user (all docs in "dms" where user is participant)
const getUserDms = (userId, callback) => {
  return db.collection("dms")
    .where("participants", "array-contains", userId)
    .onSnapshot(snapshot => {
      const dms = [];
      snapshot.forEach(doc => {
        dms.push({ id: doc.id, ...doc.data() });
      });
      callback(dms);
    });
};

// Create new DM doc (if not exists)
const createDmIfNotExists = async (userId1, userId2) => {
  const dmId = composeDmId(userId1, userId2);
  const dmRef = db.collection("dms").doc(dmId);
  const dmDoc = await dmRef.get();
  if (!dmDoc.exists) {
    await dmRef.set({
      participants: [userId1, userId2],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  return dmId;
};