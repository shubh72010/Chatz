// End-to-End Encryption
const crypto = window.crypto.subtle;

// Key Management
const KEY_STORE_NAME = 'chatzKeys';
const KEY_VERSION = 1;

// Generate a new key pair
async function generateKeyPair() {
    try {
        const keyPair = await crypto.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
        return keyPair;
    } catch (error) {
        console.error('Error generating key pair:', error);
        throw new Error('Failed to generate encryption keys');
    }
}

// Export public key
async function exportPublicKey(publicKey) {
    try {
        const exported = await crypto.exportKey(
            "spki",
            publicKey
        );
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch (error) {
        console.error('Error exporting public key:', error);
        throw new Error('Failed to export public key');
    }
}

// Import public key
async function importPublicKey(publicKeyString) {
    try {
        const binaryDer = Uint8Array.from(atob(publicKeyString), c => c.charCodeAt(0));
        return await crypto.importKey(
            "spki",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            true,
            ["encrypt"]
        );
    } catch (error) {
        console.error('Error importing public key:', error);
        throw new Error('Failed to import public key');
    }
}

// Encrypt message
async function encryptMessage(message, publicKey) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        const encrypted = await crypto.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            data
        );
        
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw new Error('Failed to encrypt message');
    }
}

// Decrypt message
async function decryptMessage(encryptedMessage, privateKey) {
    try {
        const encryptedData = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
        
        const decrypted = await crypto.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedData
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Error decrypting message:', error);
        throw new Error('Failed to decrypt message');
    }
}

// Initialize IndexedDB for key storage
async function initKeyStore() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(KEY_STORE_NAME, KEY_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys', { keyPath: 'userId' });
            }
        };
    });
}

// Store private key
async function storePrivateKey(userId, privateKey) {
    try {
        const db = await initKeyStore();
        const transaction = db.transaction('keys', 'readwrite');
        const store = transaction.objectStore('keys');
        
        const exportedKey = await crypto.exportKey(
            "pkcs8",
            privateKey
        );
        
        await store.put({
            userId,
            privateKey: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error storing private key:', error);
        throw new Error('Failed to store private key');
    }
}

// Get private key
async function getPrivateKey(userId) {
    try {
        const db = await initKeyStore();
        const transaction = db.transaction('keys', 'readonly');
        const store = transaction.objectStore('keys');
        const result = await store.get(userId);
        
        if (!result) return null;
        
        const privateKeyData = Uint8Array.from(atob(result.privateKey), c => c.charCodeAt(0));
        return await crypto.importKey(
            "pkcs8",
            privateKeyData,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );
    } catch (error) {
        console.error('Error retrieving private key:', error);
        throw new Error('Failed to retrieve private key');
    }
}

// Message expiration
async function setMessageExpiration(messageId, duration) {
    try {
        const expirationTime = Date.now() + duration;
        await update(ref(db, `messages/${messageId}`), {
            expiresAt: expirationTime
        });
    } catch (error) {
        console.error('Error setting message expiration:', error);
        throw new Error('Failed to set message expiration');
    }
}

// Check and delete expired messages
async function checkExpiredMessages() {
    try {
        const messagesRef = ref(db, 'messages');
        const snapshot = await get(messagesRef);
        const now = Date.now();
        
        const deletePromises = [];
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            if (message.expiresAt && message.expiresAt < now) {
                deletePromises.push(remove(ref(db, `messages/${childSnapshot.key}`)));
            }
        });
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error checking expired messages:', error);
    }
}

// User blocking
async function blockUser(userId) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not authenticated');
        
        const userRef = ref(db, `users/${currentUser.uid}/blockedUsers/${userId}`);
        await set(userRef, {
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error blocking user:', error);
        throw new Error('Failed to block user');
    }
}

async function unblockUser(userId) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not authenticated');
        
        const userRef = ref(db, `users/${currentUser.uid}/blockedUsers/${userId}`);
        await remove(userRef);
    } catch (error) {
        console.error('Error unblocking user:', error);
        throw new Error('Failed to unblock user');
    }
}

async function isUserBlocked(userId) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return false;
        
        const blockedRef = ref(db, `users/${currentUser.uid}/blockedUsers/${userId}`);
        const snapshot = await get(blockedRef);
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking blocked status:', error);
        return false;
    }
}

// Report user
async function reportUser(userId, reason) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not authenticated');
        
        const reportRef = push(ref(db, 'reports'));
        await set(reportRef, {
            reporterId: currentUser.uid,
            reportedUserId: userId,
            reason: reason,
            timestamp: Date.now(),
            status: 'pending'
        });
    } catch (error) {
        console.error('Error reporting user:', error);
        throw new Error('Failed to report user');
    }
}

// Initialize security features
async function initializeSecurity() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not authenticated');
        
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists() || !snapshot.val().publicKey) {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            
            // Store public key in database
            await update(userRef, {
                publicKey: publicKey,
                lastActive: Date.now()
            });
            
            // Store private key in IndexedDB
            await storePrivateKey(currentUser.uid, keyPair.privateKey);
        }
        
        // Start checking for expired messages
        setInterval(checkExpiredMessages, 60000); // Check every minute
        
        return true;
    } catch (error) {
        console.error('Error initializing security:', error);
        throw new Error('Failed to initialize security features');
    }
}

// Export functions
export {
    generateKeyPair,
    exportPublicKey,
    importPublicKey,
    encryptMessage,
    decryptMessage,
    setMessageExpiration,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser,
    initializeSecurity,
    getPrivateKey
}; 