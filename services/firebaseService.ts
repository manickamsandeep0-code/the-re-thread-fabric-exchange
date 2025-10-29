
import type { User, Listing, GalleryPost, GeoPoint } from '../types';
import { PostType, ListingType, Category } from '../types';

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

// Simulates network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// AUTH
export const auth = {
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    // Simulate checking auth state on load
    setTimeout(() => {
       // To test logged out state, change mockUsers[0] to null
       callback(mockUsers[0]); 
    }, 500);
    return () => {}; // Return unsubscribe function
  },
  signIn: async (email: string, pass: string): Promise<User> => {
    await delay(1000);
    console.log(`Signing in with ${email} / ${pass}`);
    const user = mockUsers.find(u => u.email === email);
    if (!user) throw new Error("User not found");
    return user;
  },
  signOut: async (): Promise<void> => {
    await delay(500);
    console.log("Signing out");
  }
};

// STORAGE
export const uploadImage = async (file: File): Promise<string> => {
  await delay(1500);
  console.log(`Uploading file: ${file.name}`);
  // Return a placeholder image URL
  const randomSeed = Math.random().toString(36).substring(7);
  return `https://picsum.photos/seed/${randomSeed}/600/400`;
};

// FIRESTORE
export const createListing = async (listingData: Omit<Listing, 'id' | 'user'>): Promise<Listing> => {
  await delay(1000);
  const newListing: Listing = {
    ...listingData,
    id: `listing${mockListings.length + 1}`,
    user: mockUsers.find(u => u.id === listingData.userId)
  };
  mockListings.push(newListing);
  console.log("Created new listing:", newListing);
  return newListing;
};

/**
 * NOTE on Geo-Queries (Feature 2.2)
 * This is a mock of a complex backend function. In a real Firebase app,
 * this logic would live in a Cloud Function. It would use a library like
 * `geofire-common` to calculate a geohash for the search location, determine
 * the bounding box for the query radius (e.g., 15km), and then perform
 * multiple Firestore queries to cover that area. The function would then
 * filter the results on the server to remove documents outside the precise radius.
 * This client-side mock simulates that process by simply filtering the mock data.
 */
export const getNearbyListings = async (center: GeoPoint, radiusInKm: number): Promise<Listing[]> => {
    await delay(1200);
    console.log(`Fetching listings near ${JSON.stringify(center)} within ${radiusInKm}km`);
    
    const haversineDistance = (coords1: GeoPoint, coords2: GeoPoint) => {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371; // Earth radius in km

        const dLat = toRad(coords2.latitude - coords1.latitude);
        const dLon = toRad(coords2.longitude - coords1.longitude);
        const lat1 = toRad(coords1.latitude);
        const lat2 = toRad(coords2.latitude);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };
    
    const results = mockListings
        .map(listing => ({...listing, user: mockUsers.find(u => u.id === listing.userId)}))
        .filter(listing => {
            const distance = haversineDistance(center, listing.location);
            return distance <= radiusInKm;
        });

    return results;
};

export const getGalleryPosts = async (): Promise<GalleryPost[]> => {
    await delay(800);
    return mockGallery.map(post => ({...post, user: mockUsers.find(u => u.id === post.userId)}));
}
