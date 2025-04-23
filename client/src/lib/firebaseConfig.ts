import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Log for debugging purposes
console.log("Creating mock authentication for testing");

// Firebase configuration object
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id"}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export default app;