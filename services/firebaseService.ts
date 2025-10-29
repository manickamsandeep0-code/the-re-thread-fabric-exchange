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
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, Timestamp, setDoc } from 'firebase/firestore';
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

// --- MOCK DATABASE ---
const mockUsers: User[] = [
  { id: 'user1', email: 'crafter@example.com', displayName: 'Alice' },
  { id: 'user2', email: 'designer@example.com', displayName: 'Bob' },
];

const mockListings: Listing[] = [
  { id: 'listing1', title: 'Box of Denim Scraps', description: 'Various sizes of blue denim, perfect for patchwork.', postType: PostType.OFFER, listingType: ListingType.FREE, category: Category.DENIM, quantity: '5kg box', imageUrl: 'https://picsum.photos/seed/denim/600/400', userId: 'user1', location: { latitude: 51.51, longitude: -0.1 }, locationName: 'Central London' },
  { id: 'listing2', title: 'Leftover Wool Yarn', description: 'Assorted colors of wool yarn.', postType: PostType.OFFER, listingType: ListingType.SWAP, category: Category.YARN, quantity: '3 skeins', imageUrl: 'https://picsum.photos/seed/yarn/600/400', userId: 'user2', location: { latitude: 51.52, longitude: -0.14 }, locationName: 'Near Regent\'s Park' },
  { id: 'listing3', title: 'ISO: Silk remnants', description: 'Looking for any color silk pieces for a project.', postType: PostType.REQUEST, listingType: ListingType.SWAP, category: Category.SILK, quantity: 'Any amount', imageUrl: 'https://picsum.photos/seed/silk/600/400', userId: 'user1', location: { latitude: 51.49, longitude: -0.15 }, locationName: 'Hyde Park Area' }
];

const mockGallery: GalleryPost[] = [
    { id: 'gallery1', title: 'Patchwork Denim Jacket', imageUrl: 'https://picsum.photos/seed/jacket/600/800', userId: 'user1', originalListingId: 'listing1'},
    { id: 'gallery2', title: 'Colorful Wool Scarf', imageUrl: 'https://picsum.photos/seed/scarf/600/800', userId: 'user2', originalListingId: 'listing2'},
];

// --- MOCK SERVICE FUNCTIONS ---

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

// --- MOCK DATA & HELPER (for remaining mock functions) ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
