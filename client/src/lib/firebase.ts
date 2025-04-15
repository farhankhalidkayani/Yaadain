import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, User, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, orderBy, limit, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { apiRequest } from "./queryClient";
import { auth, firestore, storage } from "./firebaseConfig";

// Create provider for Google Sign-In
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const loginWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  
  // Create user profile in Firestore
  await setDoc(doc(firestore, "users", userCredential.user.uid), {
    email,
    displayName,
    createdAt: Timestamp.now(),
    subscription: "free",
    booksCount: 0,
    storiesCount: 0,
    photosCount: 0
  });
  
  return userCredential;
};

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Check if user profile exists in Firestore
  const userDoc = await getDoc(doc(firestore, "users", user.uid));
  
  if (!userDoc.exists()) {
    // Create user profile in Firestore if it doesn't exist
    await setDoc(doc(firestore, "users", user.uid), {
      email: user.email,
      displayName: user.displayName,
      createdAt: Timestamp.now(),
      subscription: "free",
      booksCount: 0,
      storiesCount: 0,
      photosCount: 0
    });
  }
  
  return result;
};

export const logoutUser = async () => {
  return signOut(auth);
};

// User functions
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const getUserProfile = async (userId: string) => {
  const userDoc = await getDoc(doc(firestore, "users", userId));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
};

export const updateUserProfile = async (userId: string, data: any) => {
  return updateDoc(doc(firestore, "users", userId), data);
};

// Memory stories functions
export const addMemory = async (data: any) => {
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
      storiesCount: (userData.storiesCount || 0) + 1
    });
  }
  
  return docRef.id;
};

export const getUserMemories = async (userId: string, limitCount = 10) => {
  const q = query(
    collection(firestore, "memories"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  const memories: any[] = [];
  
  querySnapshot.forEach((doc) => {
    memories.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return memories;
};

export const getMemory = async (id: string) => {
  const memoryDoc = await getDoc(doc(firestore, "memories", id));
  if (memoryDoc.exists()) {
    return {
      id: memoryDoc.id,
      ...memoryDoc.data()
    };
  }
  return null;
};

export const updateMemory = async (id: string, data: any) => {
  return updateDoc(doc(firestore, "memories", id), data);
};

export const deleteMemory = async (id: string) => {
  return deleteDoc(doc(firestore, "memories", id));
};

// Memory books functions
export const getUserBooks = async (userId: string) => {
  const q = query(
    collection(firestore, "books"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const books: any[] = [];
  
  querySnapshot.forEach((doc) => {
    books.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return books;
};

export const addBook = async (data: any) => {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  // Check user subscription and book limit
  const userDoc = await getDoc(doc(firestore, "users", user.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    if (userData.subscription === "free" && userData.booksCount >= 3) {
      throw new Error("Free users are limited to 3 memory books. Please upgrade to premium.");
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
      booksCount: (userData.booksCount || 0) + 1
    });
  }
  
  return docRef.id;
};

export const getBook = async (id: string) => {
  const bookDoc = await getDoc(doc(firestore, "books", id));
  if (bookDoc.exists()) {
    return {
      id: bookDoc.id,
      ...bookDoc.data()
    };
  }
  return null;
};

export const updateBook = async (id: string, data: any) => {
  return updateDoc(doc(firestore, "books", id), data);
};

export const deleteBook = async (id: string) => {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  await deleteDoc(doc(firestore, "books", id));
  
  // Update user stats
  const userRef = doc(firestore, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, {
      booksCount: Math.max(0, (userData.booksCount || 1) - 1)
    });
  }
};

// Storage functions
export const uploadAudio = async (file: File): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  const storageRef = ref(storage, `audio/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadImage = async (file: File): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  const storageRef = ref(storage, `images/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  // Update user stats
  const userRef = doc(firestore, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, {
      photosCount: (userData.photosCount || 0) + 1
    });
  }
  
  return url;
};

// Book Memory functions
export const addMemoryToBook = async (bookId: string, memoryId: string) => {
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
  
  // Update the book with the new memory reference
  const memories = bookData.memories || [];
  memories.push({
    id: memoryId,
    title: memoryData.title,
    createdAt: memoryData.createdAt
  });
  
  await updateDoc(doc(firestore, "books", bookId), {
    memories
  });
  
  return true;
};

export const removeMemoryFromBook = async (bookId: string, memoryId: string) => {
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
  const updatedMemories = memories.filter((memory: any) => memory.id !== memoryId);
  
  await updateDoc(doc(firestore, "books", bookId), {
    memories: updatedMemories
  });
  
  return true;
};

// Enhanced Story function (using the OpenAI service)
export const enhanceStory = async (text: string) => {
  if (!text) return { enhancedText: text };
  
  try {
    // Call the OpenAI service through our backend
    const response = await apiRequest("POST", "/api/enhance-story", { 
      text 
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error enhancing story:", error);
    // Return the original text if enhancement fails
    return { enhancedText: text };
  }
};

// Subscription functions
export const upgradeToSubscription = async () => {
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
};

export const getUserSubscriptionStatus = async (userId: string) => {
  const userDoc = await getDoc(doc(firestore, "users", userId));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return userData.subscription || "free";
  }
  return "free";
};
