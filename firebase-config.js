// Firebase Configuration and Initialization
// 
// IMPORTANT: This is a template file. You need to:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Authentication (Google and GitHub providers)
// 3. Enable Firestore Database
// 4. Copy your config from Firebase Console and replace the placeholder below
//
// See FIREBASE_SETUP.md for detailed instructions

// TODO: Replace this with your actual Firebase configuration
// Get this from: Firebase Console → Project Settings → Your apps → Web app
firebaseConfig = {
    apiKey: "AIzaSyCKHoMS0hfEKwC8RC7c3FfmXc6muYntXuw",
    authDomain: "personal-budget-5b116.firebaseapp.com",
    projectId: "personal-budget-5b116",
    storageBucket: "personal-budget-5b116.firebasestorage.app",
    messagingSenderId: "820515428120",
    appId: "1:820515428120:web:a79629b092c33a0867b06d"
};

// Initialize Firebase (will be null if firebase libraries aren't loaded)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;

/**
 * Initialize Firebase if the SDK is available
 * @returns {boolean} True if initialized successfully
 */
function initializeFirebase() {
    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Using LocalStorage backend only.');
            return false;
        }

        // Check if config is set
        if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
            console.warn('Firebase not configured. Using LocalStorage backend only.');
            console.info('See FIREBASE_SETUP.md for configuration instructions.');
            return false;
        }

        // Initialize Firebase
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseFirestore = firebase.firestore();

        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        return false;
    }
}

/**
 * Get Firebase instances
 * @returns {object|null} Firebase instances or null if not initialized
 */
function getFirebase() {
    if (!firebaseApp) {
        return null;
    }
    return {
        app: firebaseApp,
        auth: firebaseAuth,
        db: firebaseFirestore
    };
}
