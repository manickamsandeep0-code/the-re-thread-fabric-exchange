
import React, { useState } from 'react';
import { geocode } from '../services/geoService';
import { uploadImage, createListing } from '../services/firebaseService';
import type { User } from '../types';
import { ListingType, Category, PostType } from '../types';
import Spinner from './Spinner';

interface NewListingFormProps {
  user: User;
  onListingCreated: () => void;
}

const NewListingForm: React.FC<NewListingFormProps> = ({ user, onListingCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.OFFER);
  const [listingType, setListingType] = useState<ListingType>(ListingType.FREE);
  const [category, setCategory] = useState<Category>(Category.OTHER);
  const [quantity, setQuantity] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageFile || !user) {
      setError("Please fill all fields and add an image.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Geocode location
      const geoPoint = await geocode(locationName);
      
      // 2. Upload image to Storage
      const imageUrl = await uploadImage(imageFile);
      
      // 3. Create document in Firestore
      await createListing({
        title,
        description,
        postType,
        listingType,
        category,
        quantity,
        imageUrl,
        userId: user.id,
        location: geoPoint,
        locationName,
      });

      // Reset form and notify parent
      onListingCreated();

    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Listing</h2>
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

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Photo</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="mx-auto h-48 w-auto rounded-md" />
              ) : (
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400">
            {isLoading ? <Spinner /> : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewListingForm;
