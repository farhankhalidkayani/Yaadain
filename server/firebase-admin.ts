import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Path to service account file
const serviceAccountPath = path.resolve(
  process.cwd(),
  "server/credentials/yaadain-b4f3f-firebase-adminsdk-fbsvc-67c8e4d34e.json"
);

// Initialize Firebase Admin SDK
let firebaseApp;
try {
  console.log("Initializing Firebase Admin SDK...");

  // Check if the service account file exists
  if (fs.existsSync(serviceAccountPath)) {
    // Load the service account credentials using ES modules
    const serviceAccountJson = fs.readFileSync(serviceAccountPath, "utf8");
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Initialize with the service account credentials
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "yaadain-b4f3f.appspot.com",
    });

    console.log(
      "Firebase Admin SDK initialized successfully with service account"
    );
  } else {
    console.error("Service account file not found at:", serviceAccountPath);
    // Initialize with default credentials as fallback
    firebaseApp = admin.initializeApp();
    console.log("Firebase Admin SDK initialized with default credentials");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
  throw error;
}

// Export the initialized services
export const auth = admin.auth();
export const firestore = admin.firestore();
export const storage = admin.storage();

// Helper function to get user's books from Firestore by Firebase UID
export async function getBooksByFirebaseUID(uid: string): Promise<any[]> {
  try {
    console.log(`Fetching books from Firestore for user ID: ${uid}`);

    // Remove orderBy to avoid needing a composite index
    const booksSnapshot = await firestore
      .collection("books")
      .where("userId", "==", uid)
      .get();

    if (booksSnapshot.empty) {
      console.log(`No books found for user ${uid}`);
      return [];
    }

    // Convert to array of books with IDs
    const books: any[] = [];
    booksSnapshot.forEach((doc) => {
      // Convert timestamps to Date objects
      const data = doc.data();
      books.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      });
    });

    // Sort in memory instead of using Firestore's orderBy
    books.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`Retrieved ${books.length} books for user ${uid}`);
    return books;
  } catch (error) {
    console.error(`Error fetching books for Firebase UID ${uid}:`, error);
    return [];
  }
}

// Helper function to get user's memories from Firestore by Firebase UID
export async function getMemoriesByFirebaseUID(uid: string): Promise<any[]> {
  try {
    console.log(`Fetching memories from Firestore for user ID: ${uid}`);
    const memoriesSnapshot = await firestore
      .collection("memories")
      .where("userId", "==", uid)
      .get();

    if (memoriesSnapshot.empty) {
      console.log(`No memories found for user ${uid}`);
      return [];
    }

    // Convert to array of memories with IDs
    const memories: any[] = [];
    memoriesSnapshot.forEach((doc) => {
      // Convert timestamps to Date objects
      const data = doc.data();
      memories.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      });
    });

    // Sort in memory instead of using Firestore's orderBy
    memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`Retrieved ${memories.length} memories for user ${uid}`);
    return memories;
  } catch (error) {
    console.error(`Error fetching memories for Firebase UID ${uid}:`, error);
    return [];
  }
}

export default firebaseApp;
