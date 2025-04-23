import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Enhanced logging for debugging
console.log("Loading Firebase configuration...");
console.log("Environment mode:", import.meta.env.MODE);

// Firebase configuration object
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log Firebase config for debugging (with sensitive details masked)
console.log("Firebase configuration loaded:", {
  apiKey: firebaseConfig.apiKey ? "Configured ✓" : "Missing ✗",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId
    ? "Configured ✓"
    : "Missing ✗",
  appId: firebaseConfig.appId ? "Configured ✓" : "Missing ✗",
});

// Check if Firebase is already initialized
const existingApps = getApps();
console.log(`Existing Firebase apps: ${existingApps.length}`);

// Initialize Firebase
let app;
try {
  // If we already have an initialized app, use it, otherwise initialize one
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log("Using existing Firebase app");
  } else {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error; // Re-throw to ensure we don't proceed with broken initialization
}

// Initialize services
console.log("Initializing Firebase services...");
export const auth = getAuth(app);
export const firestore = getFirestore(app); // Use getFirestore instead of initializeFirestore
export const storage = getStorage(app);
console.log("Firebase services initialized");

// Check if running in development environment
const isDev = import.meta.env.MODE === "development";

// Use emulators in development if needed
if (isDev && false) {
  // Set to true when you have emulators running
  try {
    connectFirestoreEmulator(firestore, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Connected to Firebase emulators");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export default app;
