import React, { useState, useEffect } from 'react';
import type { User, Listing } from '../types';
import { getListingsForUser } from '../services/firebaseService';
import Spinner from './Spinner';
import { PostType, ListingType } from '../types';

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserListings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userListings = await getListingsForUser(user.id);
        setListings(userListings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserListings();
  }, [user.id]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* User Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-3xl font-bold text-teal-700">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      {/* My Listings Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Listings</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">You haven't created any listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ListingCardProps {
  listing: Listing;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
      <img 
        src={listing.imageUrl} 
        alt={listing.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2">{listing.title}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{listing.quantity}</span>
          {listing.postType === PostType.OFFER ? (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              listing.listingType === ListingType.FREE ? 'bg-green-100 text-green-800' : 
              listing.listingType === ListingType.SWAP ? 'bg-blue-100 text-blue-800' : 
              'bg-yellow-100 text-yellow-800'
            }`}>
              {listing.listingType.toUpperCase()}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
              REQUEST
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">📍 {listing.locationName}</p>
      </div>
    </div>
  );
};

export default Profile;
