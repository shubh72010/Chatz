import { app } from '../firebaseConfig.js';
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        const db = getDatabase(app);
        const testRef = ref(db, 'test-connection');
        
        // Try to write
        await set(testRef, {
            timestamp: Date.now(),
            status: 'connected'
        });
        
        // Try to read
        const snapshot = await get(testRef);
        console.log('Firebase connection successful:', snapshot.val());
        return true;
    } catch (error) {
        console.error('Firebase connection failed:', error);
        return false;
    }
}

// Run the test
testFirebaseConnection(); 