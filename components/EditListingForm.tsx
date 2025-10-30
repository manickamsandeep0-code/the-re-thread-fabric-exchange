
import React, { useState, useEffect } from 'react';
import { geocode } from '../services/geoService';
import { getListingById, updateListing } from '../services/firebaseService';
import type { User } from '../types';
import { ListingType, Category, PostType } from '../types';
import Spinner from './Spinner';

interface EditListingFormProps {
  user: User;
  listingId: string;
  onListingUpdated: () => void;
}

const EditListingForm: React.FC<EditListingFormProps> = ({ user, listingId, onListingUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.OFFER);
  const [listingType, setListingType] = useState<ListingType>(ListingType.FREE);
  const [category, setCategory] = useState<Category>(Category.OTHER);
  const [quantity, setQuantity] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the listing data on mount
  useEffect(() => {
    const fetchListing = async () => {
      try {
        setIsFetching(true);
        const listing = await getListingById(listingId);
        
        // Pre-populate form with existing data
        setTitle(listing.title);
        setDescription(listing.description);
        setPostType(listing.postType);
        setListingType(listing.listingType);
        setCategory(listing.category);
        setQuantity(listing.quantity);
        setLocationName(listing.locationName);
        setImagePreview(listing.imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listing');
      } finally {
        setIsFetching(false);
      }
    };

    fetchListing();
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError("User not found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Geocode location
      const geoPoint = await geocode(locationName);
      
      // 2. Update document in Firestore (no image upload - keep existing image)
      await updateListing(listingId, {
        title,
        description,
        postType,
        listingType,
        category,
        quantity,
        location: geoPoint,
        locationName,
      });

      // Notify parent
      onListingUpdated();

    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Listing</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post Type */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I want to...</label>
            <div className="flex gap-4">
                <button type="button" onClick={() => setPostType(PostType.OFFER)} className={`flex-1 py-2 px-4 rounded-md transition ${postType === PostType.OFFER ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>Offer materials</button>
                <button type="button" onClick={() => setPostType(PostType.REQUEST)} className={`flex-1 py-2 px-4 rounded-md transition ${postType === PostType.REQUEST ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>Request materials (ISO)</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{postType === PostType.OFFER ? "You are offering fabric/materials to others." : "You are 'In Search Of' materials."}</p>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"></textarea>
        </div>

        {/* Listing Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          { postType === PostType.OFFER && (
            <div>
              <label htmlFor="listingType" className="block text-sm font-medium text-gray-700">Listing Type</label>
              <select id="listingType" value={listingType} onChange={(e) => setListingType(e.target.value as ListingType)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500">
                {Object.values(ListingType).map(lt => <option key={lt} value={lt}>{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500">
                {Object.values(Category).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
            <input type="text" id="quantity" placeholder="e.g., 5kg box" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
          </div>
           <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Your City / Postcode</label>
            <input type="text" id="location" placeholder="e.g., London" value={locationName} onChange={(e) => setLocationName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
          </div>
        </div>

        {/* Image Preview (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Photo</label>
          {imagePreview && (
            <div className="border-2 border-gray-300 rounded-md p-4">
              <img src={imagePreview} alt="Current listing" className="mx-auto h-48 w-auto rounded-md" />
              <p className="text-xs text-gray-500 text-center mt-2">Image cannot be changed when editing</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button 
            type="button" 
            onClick={onListingUpdated}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400"
          >
            {isLoading ? <Spinner /> : 'Update Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditListingForm;
