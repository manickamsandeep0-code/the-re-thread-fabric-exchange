
import { Timestamp } from 'firebase/firestore';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export enum ListingType {
  FREE = 'free',
  SWAP = 'swap',
  SALE = 'sale',
}

export enum Category {
  DENIM = 'denim',
  YARN = 'yarn',
  COTTON = 'cotton',
  SILK = 'silk',
  WOOL = 'wool',
  LEATHER = 'leather',
  OTHER = 'other',
}

export enum PostType {
  OFFER = 'offer',
  REQUEST = 'request', // For "In Search Of"
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  postType: PostType;
  listingType: ListingType;
  category: Category;
  quantity: string;
  imageUrl: string;
  userId: string;
  user?: User; // Denormalized user data for easier display
  location: GeoPoint;
  locationName: string;
}

export interface GalleryPost {
  id: string;
  title: string;
  imageUrl: string;
  userId: string;
  user?: User;
  originalListingId?: string; // Optional link to the material source
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageText: string;
  updatedAt: Timestamp;
}

export interface ConversationWithUser extends Conversation {
  participant: User; // The other user in the conversation
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}
