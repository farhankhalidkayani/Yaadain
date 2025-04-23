import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { apiRequest } from "./queryClient";
import { auth, firestore, storage } from "./firebaseConfig";

// Create provider for Google Sign-In
export const googleProvider = new GoogleAuthProvider();

// Enhanced debugging helper function
interface OperationCallback<T> {
  (): Promise<T>;
}

const logOperation = async <T>(
  operation: string,
  callback: OperationCallback<T>
): Promise<T> => {
  console.log(`Starting operation: ${operation}`);
  try {
    const result = await callback();
    console.log(`${operation} completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`Error in ${operation}:`, error);

    // Special handling for Firestore permission errors
    if (error.code === "permission-denied") {
      console.error(
        `❌ Firebase Permission Error: ${operation} - This usually means your Firestore security rules are preventing this operation. Please check your Firebase Console.`
      );
    }

    throw error;
  }
};

// Authentication functions
export const loginWithEmail = async (email: string, password: string) => {
  return logOperation("Email login", () =>
    signInWithEmailAndPassword(auth, email, password)
  );
};

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  return logOperation("Email registration", async () => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(userCredential.user, { displayName });

    console.log(
      "Successfully created auth user, now creating Firestore profile..."
    );

    try {
      // Create user profile in Firestore
      await setDoc(doc(firestore, "users", userCredential.user.uid), {
        email,
        displayName,
        createdAt: Timestamp.now(),
        subscription: "free",
        booksCount: 0,
        storiesCount: 0,
        photosCount: 0,
      });
      console.log("Firestore user profile created successfully");
    } catch (error) {
      console.error("Error creating user profile in Firestore:", error);
      // Continue returning the user credential even if Firestore fails
    }

    return userCredential;
  });
};

export const loginWithGoogle = async () => {
  return logOperation("Google login", async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    console.log("Checking if user profile exists in Firestore...");

    try {
      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(firestore, "users", user.uid));

      if (!userDoc.exists()) {
        console.log("User profile does not exist, creating new profile...");
        // Create user profile in Firestore if it doesn't exist
        await setDoc(doc(firestore, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          createdAt: Timestamp.now(),
          subscription: "free",
          booksCount: 0,
          storiesCount: 0,
          photosCount: 0,
        });
        console.log("User profile created successfully");
      }
    } catch (error) {
      console.error(
        "Error checking or creating user profile in Firestore:",
        error
      );
    }

    return result;
  });
};

export const logoutUser = async () => {
  return logOperation("Logout", () => signOut(auth));
};

// User functions
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const getUserProfile = async (userId: string) => {
  return logOperation("Get user profile", async () => {
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  });
};

export const updateUserProfile = async (userId: string, data: any) => {
  return logOperation("Update user profile", () =>
    updateDoc(doc(firestore, "users", userId), data)
  );
};

// Memory stories functions
export const addMemory = async (data: any) => {
  return logOperation("Add memory", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Add story to Firestore
    const docRef = await addDoc(collection(firestore, "memories"), {
      userId: user.uid,
      ...data,
      createdAt: Timestamp.now(),
    });

    // Update user stats
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        storiesCount: (userData.storiesCount || 0) + 1,
      });
    }

    return docRef.id;
  });
};

export const getUserMemories = async (userId: string, limitCount = 10) => {
  return logOperation("Get user memories", async () => {
    try {
      // Try Firestore first
      const q = query(
        collection(firestore, "memories"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      try {
        const querySnapshot = await getDocs(q);
        const memories: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Properly convert timestamps
          memories.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt
              ? new Date(data.createdAt.toMillis())
              : new Date(),
            updatedAt: data.updatedAt
              ? new Date(data.updatedAt.toMillis())
              : new Date(),
          });
        });

        console.log(
          `Retrieved ${memories.length} memories directly from Firestore`
        );
        return memories;
      } catch (firestoreError) {
        console.error(
          "Error fetching memories from Firestore:",
          firestoreError
        );

        // Fall back to API
        console.log("Trying to fetch memories from backend API");
        try {
          const response = await fetch(`/api/memories?userId=${userId}`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          console.log(`Retrieved ${data.length} memories from backend API`);
          return data;
        } catch (apiError) {
          console.error("Error fetching memories from API:", apiError);
          throw apiError;
        }
      }
    } catch (error) {
      console.error(`Error in getUserMemories for userId ${userId}:`, error);
      // Return empty array instead of throwing
      return [];
    }
  });
};

export const getMemory = async (id: string) => {
  return logOperation("Get memory", async () => {
    const memoryDoc = await getDoc(doc(firestore, "memories", id));
    if (memoryDoc.exists()) {
      return {
        id: memoryDoc.id,
        ...memoryDoc.data(),
      };
    }
    return null;
  });
};

export const updateMemory = async (id: string, data: any) => {
  return logOperation("Update memory", () =>
    updateDoc(doc(firestore, "memories", id), data)
  );
};

export const deleteMemory = async (id: string) => {
  return logOperation("Delete memory", () =>
    deleteDoc(doc(firestore, "memories", id))
  );
};

// Memory books functions
export const getUserBooks = async (userId: string) => {
  return logOperation("Get user books", async () => {
    try {
      // First try to get books from Firestore directly
      const q = query(
        collection(firestore, "books"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      try {
        const querySnapshot = await getDocs(q);
        const books: any[] = [];

        querySnapshot.forEach((doc) => {
          // Process document data and handle timestamps
          const data = doc.data();
          books.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt
              ? new Date(data.createdAt.toMillis())
              : new Date(),
            updatedAt: data.updatedAt
              ? new Date(data.updatedAt.toMillis())
              : new Date(),
          });
        });

        console.log(`Retrieved ${books.length} books directly from Firestore`);
        return books;
      } catch (firestoreError) {
        console.error("Error fetching books from Firestore:", firestoreError);

        // If Firestore query fails, try backing up to the API
        console.log("Trying to fetch books from backend API");
        try {
          const response = await fetch(`/api/books?userId=${userId}`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          console.log(`Retrieved ${data.length} books from backend API`);
          return data;
        } catch (apiError) {
          console.error("Error fetching books from API:", apiError);
          throw apiError; // Re-throw the API error
        }
      }
    } catch (error) {
      console.error(`Error in getUserBooks for userId ${userId}:`, error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  });
};

export const addBook = async (data: any) => {
  return logOperation("Add book", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Check user subscription and book limit
    const userDoc = await getDoc(doc(firestore, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.subscription === "free" && userData.booksCount >= 3) {
        throw new Error(
          "Free users are limited to 3 memory books. Please upgrade to premium."
        );
      }
    }

    // Add book to Firestore
    const docRef = await addDoc(collection(firestore, "books"), {
      userId: user.uid,
      ...data,
      createdAt: Timestamp.now(),
    });

    // Update user stats
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        booksCount: (userData.booksCount || 0) + 1,
      });
    }

    return docRef.id;
  });
};

export const getBook = async (id: string) => {
  return logOperation("Get book", async () => {
    try {
      // First try Firebase API directly
      const bookDoc = await getDoc(doc(firestore, "books", id));
      if (bookDoc.exists()) {
        // Convert Firebase timestamp to JavaScript Date
        const data = bookDoc.data();
        const processedData = {
          id: bookDoc.id,
          ...data,
          createdAt: data.createdAt
            ? new Date(data.createdAt.toMillis())
            : new Date(),
          updatedAt: data.updatedAt
            ? new Date(data.updatedAt.toMillis())
            : new Date(),
        };

        console.log("Book data retrieved from Firestore:", processedData);
        return processedData;
      }

      // If not found directly in Firebase, try backend API
      console.log("Book not found in Firestore, trying backend API");
      try {
        const response = await fetch(`/api/books/${id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`);
        }

        const result = await response.json();
        if (result && result.book) {
          console.log("Book data retrieved from backend API:", result.book);
          return result.book;
        }
      } catch (apiError) {
        console.error("Error fetching from backend API:", apiError);
        // Continue with the flow, will return null at the end
      }

      console.log("Book not found in Firestore or API");
      return null;
    } catch (error) {
      console.error(`Error fetching book with ID ${id}:`, error);
      throw error;
    }
  });
};

export const updateBook = async (id: string, data: any) => {
  return logOperation("Update book", () =>
    updateDoc(doc(firestore, "books", id), data)
  );
};

export const deleteBook = async (id: string) => {
  return logOperation("Delete book", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await deleteDoc(doc(firestore, "books", id));

    // Update user stats
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        booksCount: Math.max(0, (userData.booksCount || 1) - 1),
      });
    }
  });
};

// Storage functions
export const uploadAudio = async (file: File): Promise<string> => {
  return logOperation("Upload audio", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const storageRef = ref(
      storage,
      `audio/${user.uid}/${Date.now()}_${file.name}`
    );
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  });
};

export const uploadImage = async (file: File): Promise<string> => {
  return logOperation("Upload image", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("image", file);
      formData.append("userId", user.uid);

      console.log("Sending image upload request to server...");

      // Make request to server endpoint
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Server responded with error:",
          response.status,
          errorText
        );
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Upload successful, server response:", data);

      if (!data.imageUrl) {
        throw new Error("Server did not return an image URL");
      }

      // Update user stats in background without blocking return
      updateUserPhotoStats(user.uid).catch((err) => {
        console.error("Error updating user photo stats:", err);
      });

      return data.imageUrl;
    } catch (error) {
      console.error("Error in uploadImage:", error);
      throw error;
    }
  });
};

// Helper function to update user photo stats
async function updateUserPhotoStats(userId: string): Promise<void> {
  const userRef = doc(firestore, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, {
      photosCount: (userData.photosCount || 0) + 1,
    });
  }
}

// Book Memory functions
export const addMemoryToBook = async (bookId: string, memoryId: string) => {
  return logOperation("Add memory to book", async () => {
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Get the book and memory to ensure they exist
      const bookDoc = await getDoc(doc(firestore, "books", bookId));
      const memoryDoc = await getDoc(doc(firestore, "memories", memoryId));

      if (!bookDoc.exists() || !memoryDoc.exists()) {
        throw new Error("Book or memory not found");
      }

      const bookData = bookDoc.data();

      // Ensure the user owns the book
      if (bookData.userId !== user.uid) {
        throw new Error("You don't have permission to modify this book");
      }

      // Get the memory details
      const memoryData = memoryDoc.data();

      // Properly format the memory data for storage
      const memoryForBook = {
        id: memoryId,
        title: memoryData.title || "Untitled Memory",
        createdAt: memoryData.createdAt || Timestamp.now(),
        order: (bookData.memories?.length || 0) + 1, // Add order property
      };

      // Update the book with the new memory reference
      const memories = bookData.memories || [];
      memories.push(memoryForBook);

      await updateDoc(doc(firestore, "books", bookId), {
        memories,
        updatedAt: Timestamp.now(),
      });

      // Try to add the memory via the backend API as well for redundancy
      try {
        await fetch(`/api/books/${bookId}/memories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memoryId }),
          credentials: "include",
        });
      } catch (apiError) {
        console.log(
          "Backend API call failed, but Firestore update succeeded:",
          apiError
        );
        // Non-blocking error, we continue because Firestore update worked
      }

      return true;
    } catch (error) {
      console.error(
        `Error adding memory ${memoryId} to book ${bookId}:`,
        error
      );
      throw error;
    }
  });
};

export const removeMemoryFromBook = async (
  bookId: string,
  memoryId: string
) => {
  return logOperation("Remove memory from book", async () => {
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Get the book
      const bookDoc = await getDoc(doc(firestore, "books", bookId));

      if (!bookDoc.exists()) {
        throw new Error("Book not found");
      }

      const bookData = bookDoc.data();

      // Ensure the user owns the book
      if (bookData.userId !== user.uid) {
        throw new Error("You don't have permission to modify this book");
      }

      // Remove the memory from the book
      const memories = bookData.memories || [];
      const updatedMemories = memories.filter(
        (memory: any) => memory.id !== memoryId
      );

      // Update orders to ensure they're sequential after removal
      const reorderedMemories = updatedMemories.map(
        (memory: any, index: number) => ({
          ...memory,
          order: index + 1,
        })
      );

      await updateDoc(doc(firestore, "books", bookId), {
        memories: reorderedMemories,
        updatedAt: Timestamp.now(),
      });

      // Try to remove via API as well
      try {
        await fetch(`/api/books/${bookId}/memories/${memoryId}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (apiError) {
        console.log(
          "Backend API call failed, but Firestore update succeeded:",
          apiError
        );
        // Non-blocking error, we continue because Firestore update worked
      }

      return true;
    } catch (error) {
      console.error(
        `Error removing memory ${memoryId} from book ${bookId}:`,
        error
      );
      throw error;
    }
  });
};

// Enhanced Story function (using the OpenAI service)
export const enhanceStory = async (text: string) => {
  return logOperation("Enhance story", async () => {
    if (!text) return { enhancedText: text };

    try {
      // Call the OpenAI service through our backend
      const response = await apiRequest("POST", "/api/enhance-story", {
        text,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error enhancing story:", error);
      // Return the original text if enhancement fails
      return { enhancedText: text };
    }
  });
};

// Subscription functions
export const upgradeToSubscription = async () => {
  return logOperation("Upgrade to subscription", async () => {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    try {
      // Call the backend endpoint to create a subscription
      const response = await apiRequest("POST", "/api/create-subscription", {
        userId: user.uid,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  });
};

export const getUserSubscriptionStatus = async (userId: string) => {
  return logOperation("Get user subscription status", async () => {
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.subscription || "free";
    }
    return "free";
  });
};
