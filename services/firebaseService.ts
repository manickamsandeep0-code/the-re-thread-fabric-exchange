import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, Timestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import type { User, Listing, GalleryPost, GeoPoint } from '../types';
import { PostType, ListingType, Category } from '../types';

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- FIREBASE AUTH FUNCTIONS ---

/**
 * Converts Firebase User to our app's User type
 */
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  };
};

/**
 * Auth service object matching the original mock interface
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return convertFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide user-friendly error messages
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          throw new Error('Invalid email or password');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        case 'auth/user-disabled':
          throw new Error('This account has been disabled');
        case 'auth/too-many-requests':
          throw new Error('Too many failed login attempts. Please try again later');
        default:
          throw new Error('Failed to sign in. Please try again');
      }
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback(convertFirebaseUser(firebaseUser));
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  },

  /**
   * Create a new user with email and password
   */
  signUp: async (email: string, password: string, displayName: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name in Firebase Auth
      await updateProfile(userCredential.user, { displayName });
      
      // Store user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        displayName: displayName,
        createdAt: Timestamp.now(),
      });
      
      return convertFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('Email is already registered');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        case 'auth/weak-password':
          throw new Error('Password should be at least 6 characters');
        default:
          throw new Error('Failed to create account. Please try again');
      }
    }
  },
};

// --- FIREBASE STORAGE FUNCTIONS ---

/**
 * Upload an image to Firebase Storage and return the download URL
 * @param file The image file to upload
 * @returns Promise that resolves to the download URL
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `listings/${filename}`);
    
    // Upload the file
    console.log(`Uploading file: ${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File uploaded successfully:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};

// --- FIREBASE FIRESTORE FUNCTIONS ---

/**
 * Create a new listing in Firestore
 * @param listingData Listing data without id and user fields
 * @returns Promise that resolves to the created listing with id
 */
export const createListing = async (listingData: Omit<Listing, 'id' | 'user'>): Promise<Listing> => {
  try {
    // Add the listing to Firestore
    const docRef = await addDoc(collection(db, 'listings'), {
      ...listingData,
      createdAt: Timestamp.now(),
    });
    
    console.log('Created new listing with ID:', docRef.id);
    
    // Fetch the user data for the response
    let user: User | undefined;
    try {
      const userDoc = await getDoc(doc(db, 'users', listingData.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        user = {
          id: userDoc.id,
          email: userData.email,
          displayName: userData.displayName,
        };
      }
    } catch (error) {
      console.warn('Could not fetch user data:', error);
    }
    
    // Return the complete listing
    const newListing: Listing = {
      ...listingData,
      id: docRef.id,
      user,
    };
    
    return newListing;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw new Error('Failed to create listing. Please try again.');
  }
};

/**
 * Helper function to calculate distance between two coordinates using Haversine formula
 */
const haversineDistance = (coords1: GeoPoint, coords2: GeoPoint): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Get listings near a location
 * NOTE: For production, consider using geofire-common library or Cloud Functions
 * for more efficient geospatial queries. This implementation fetches all listings
 * and filters client-side, which works for small datasets but may not scale well.
 * 
 * @param center Center point for the search
 * @param radiusInKm Search radius in kilometers
 * @returns Promise that resolves to array of nearby listings
 */
export const getNearbyListings = async (center: GeoPoint, radiusInKm: number): Promise<Listing[]> => {
  try {
    console.log(`Fetching listings near ${JSON.stringify(center)} within ${radiusInKm}km`);
    
    // Fetch all listings from Firestore
    const listingsSnapshot = await getDocs(collection(db, 'listings'));
    
    // Convert to Listing objects and filter by distance
    const listings: Listing[] = [];
    
    for (const docSnapshot of listingsSnapshot.docs) {
      const data = docSnapshot.data();
      
      // Calculate distance from center
      const distance = haversineDistance(center, data.location);
      
      // Only include listings within radius
      if (distance <= radiusInKm) {
        // Fetch user data if userId exists
        let user: User | undefined;
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              user = {
                id: userDoc.id,
                email: userData.email,
                displayName: userData.displayName,
              };
            }
          } catch (error) {
            console.warn('Could not fetch user data for listing:', error);
          }
        }
        
        listings.push({
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          postType: data.postType,
          listingType: data.listingType,
          category: data.category,
          quantity: data.quantity,
          imageUrl: data.imageUrl,
          userId: data.userId,
          location: data.location,
          locationName: data.locationName,
          user,
        });
      }
    }
    
    console.log(`Found ${listings.length} listings within ${radiusInKm}km`);
    return listings;
  } catch (error) {
    console.error('Error fetching nearby listings:', error);
    throw new Error('Failed to fetch listings. Please try again.');
  }
};

/**
 * Get all gallery posts from Firestore
 * @returns Promise that resolves to array of gallery posts
 */
export const getGalleryPosts = async (): Promise<GalleryPost[]> => {
  try {
    const gallerySnapshot = await getDocs(collection(db, 'gallery'));
    
    const posts: GalleryPost[] = [];
    
    for (const docSnapshot of gallerySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Fetch user data if userId exists
      let user: User | undefined;
      if (data.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            user = {
              id: userDoc.id,
              email: userData.email,
              displayName: userData.displayName,
            };
          }
        } catch (error) {
          console.warn('Could not fetch user data for gallery post:', error);
        }
      }
      
      posts.push({
        id: docSnapshot.id,
        title: data.title,
        imageUrl: data.imageUrl,
        userId: data.userId,
        originalListingId: data.originalListingId,
        user,
      });
    }
    
    console.log(`Found ${posts.length} gallery posts`);
    return posts;
  } catch (error) {
    console.error('Error fetching gallery posts:', error);
    throw new Error('Failed to fetch gallery posts. Please try again.');
  }
};

/**
 * Get all listings for a specific user
 * @param userId The user ID to fetch listings for
 * @returns Promise that resolves to array of user's listings
 */
export const getListingsForUser = async (userId: string): Promise<Listing[]> => {
  try {
    console.log(`Fetching listings for user: ${userId}`);
    
    // Query listings where userId matches
    const q = query(collection(db, 'listings'), where('userId', '==', userId));
    const listingsSnapshot = await getDocs(q);
    
    const listings: Listing[] = [];
    
    for (const docSnapshot of listingsSnapshot.docs) {
      const data = docSnapshot.data();
      
      // Fetch user data if needed
      let user: User | undefined;
      if (data.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            user = {
              id: userDoc.id,
              email: userData.email,
              displayName: userData.displayName,
            };
          }
        } catch (error) {
          console.warn('Could not fetch user data for listing:', error);
        }
      }
      
      listings.push({
        id: docSnapshot.id,
        title: data.title,
        description: data.description,
        postType: data.postType,
        listingType: data.listingType,
        category: data.category,
        quantity: data.quantity,
        imageUrl: data.imageUrl,
        userId: data.userId,
        location: data.location,
        locationName: data.locationName,
        user,
      });
    }
    
    console.log(`Found ${listings.length} listings for user`);
    return listings;
  } catch (error) {
    console.error('Error fetching user listings:', error);
    throw new Error('Failed to fetch your listings. Please try again.');
  }
};

/**
 * Delete a listing from Firestore
 * @param listingId The ID of the listing to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteListing = async (listingId: string): Promise<void> => {
  try {
    console.log(`Deleting listing: ${listingId}`);
    await deleteDoc(doc(db, 'listings', listingId));
    console.log('Listing deleted successfully');
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw new Error('Failed to delete listing. Please try again.');
  }
};

/**
 * Update a listing in Firestore
 * @param listingId The ID of the listing to update
 * @param data Partial listing data to update
 * @returns Promise that resolves when update is complete
 */
export const updateListing = async (
  listingId: string, 
  data: Partial<Omit<Listing, 'id' | 'user'>>
): Promise<void> => {
  try {
    console.log(`Updating listing: ${listingId}`);
    const updateData: any = { ...data };
    
    // Add updated timestamp
    updateData.updatedAt = Timestamp.now();
    
    await updateDoc(doc(db, 'listings', listingId), updateData);
    console.log('Listing updated successfully');
  } catch (error) {
    console.error('Error updating listing:', error);
    throw new Error('Failed to update listing. Please try again.');
  }
};

// --- FIREBASE MESSAGING FUNCTIONS ---

/**
 * Get or create a conversation between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise that resolves to the conversation ID
 */
export const getOrCreateConversation = async (user1Id: string, user2Id: string): Promise<string> => {
  try {
    console.log(`Getting or creating conversation between ${user1Id} and ${user2Id}`);
    
    // Query for existing conversation with user1
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user1Id)
    );
    
    const conversationsSnapshot = await getDocs(q);
    
    // Find a conversation that also includes user2
    for (const docSnapshot of conversationsSnapshot.docs) {
      const data = docSnapshot.data();
      if (data.participantIds.includes(user2Id)) {
        console.log(`Found existing conversation: ${docSnapshot.id}`);
        return docSnapshot.id;
      }
    }
    
    // No existing conversation found, create a new one
    console.log('Creating new conversation');
    const newConversation = await addDoc(collection(db, 'conversations'), {
      participantIds: [user1Id, user2Id],
      lastMessageText: '',
      updatedAt: Timestamp.now(),
    });
    
    console.log(`Created new conversation: ${newConversation.id}`);
    return newConversation.id;
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw new Error('Failed to start conversation. Please try again.');
  }
};

/**
 * Send a message in a conversation
 * @param conversationId The conversation ID
 * @param senderId The sender's user ID
 * @param text The message text
 * @returns Promise that resolves when message is sent
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> => {
  try {
    console.log(`Sending message to conversation: ${conversationId}`);
    
    // Add message to messages subcollection
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId,
      text,
      createdAt: Timestamp.now(),
    });
    
    // Update conversation's last message and timestamp
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessageText: text,
      updatedAt: Timestamp.now(),
    });
    
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message. Please try again.');
  }
};
