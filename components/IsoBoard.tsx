
import React, { useState, useEffect } from 'react';
import type { Listing, User } from '../types';
import { getNearbyListings, getOrCreateConversation, sendMessage } from '../services/firebaseService';
import Spinner from './Spinner';
import { MessageCircleIcon, MapPinIcon } from './icons';

interface IsoBoardProps {
  user?: User | null;
}

const IsoBoard: React.FC<IsoBoardProps> = ({ user }) => {
  const [requests, setRequests] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch from a central point with a very large radius to get all items for this demo
        const allListings = await getNearbyListings({ latitude: 0, longitude: 0 }, 20000); 
        const isoRequests = allListings.filter(l => l.postType === 'request');
        setRequests(isoRequests);
      } catch (err) {
        setError('Failed to load requests.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequests();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">In Search Of (ISO) Board</h1>
        <p className="text-gray-600 mb-6">Looking for specific materials? See what your fellow crafters are searching for.</p>
        
        {/*
          Data Model Strategy Note (Feature 3.1):
          This component uses Option A: a single `listings` collection with a `postType` field.
          Pros:
          - Simpler Queries: You can fetch both 'offers' and 'requests' in a single query (e.g., for a user's dashboard).
          - Less Code: Only one set of functions is needed for creating, updating, and deleting listings.
          - Easier to switch: A user could potentially switch a request to an offer if they find the material elsewhere.
          Cons:
          - Indexing: May require more complex composite indexes in Firestore if you frequently query by postType AND other fields (like category).
          - Security Rules: Can be slightly more complex to write security rules that differentiate permissions between 'offer' and 'request' types within the same collection.

          Option B (separate `iso_requests` collection) is also valid, especially if the data structure or security rules for requests and offers were to diverge significantly in the future. For this app, a single collection is more efficient.
        */}

        {isLoading && <div className="flex justify-center p-12"><Spinner /></div>}
        {error && <p className="text-center text-red-500">{error}</p>}
        
        {!isLoading && requests.length === 0 && (
          <div className="text-center py-12 bg-gray-100 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-700">No requests yet!</h3>
            <p className="text-gray-500 mt-2">Be the first to post what you're looking for.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(request => (
            <div key={request.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col transition hover:shadow-xl">
              <img src={request.imageUrl} alt={request.title} className="w-full h-48 object-cover" />
              <div className="p-4 flex flex-col flex-grow">
                <span className="text-xs font-semibold text-indigo-800 bg-indigo-100 px-2 py-1 rounded-full self-start">{request.category.toUpperCase()}</span>
                <h3 className="font-bold text-lg text-gray-800 mt-2">{request.title}</h3>
                <p className="text-sm text-gray-600 mt-1 flex-grow">{request.description}</p>
                <div className="border-t border-gray-100 mt-4 pt-4 text-sm text-gray-500 space-y-2">
                    <p className="font-medium text-gray-700">Requested by: {request.user?.displayName || 'A user'}</p>
                    <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span>{request.locationName}</span>
                    </div>
                </div>
                <button 
                  onClick={() => handleHelp(request)}
                  disabled={!user || sendingMessageId === request.id}
                  className="w-full mt-4 py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2 disabled:bg-teal-300 disabled:cursor-not-allowed"
                >
                  {sendingMessageId === request.id ? (
                    <>
                      <Spinner />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircleIcon className="h-5 w-5" />
                      Can you help?
                    </>
                  )}
                </button>
                {!user && (
                  <p className="text-xs text-gray-500 text-center mt-2">Sign in to send messages</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  async function handleHelp(request: Listing) {
    if (!user) {
      alert('Please sign in to send messages');
      return;
    }
    
    if (user.id === request.userId) {
      alert('You cannot message yourself!');
      return;
    }
    
    setSendingMessageId(request.id);
    
    try {
      const convoId = await getOrCreateConversation(user.id, request.userId);
      await sendMessage(
        convoId,
        user.id,
        `Hi, I can help with your request for: ${request.title}`
      );
      alert('Message sent! They will be able to see your message in their conversations.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSendingMessageId(null);
    }
  }
};
export default IsoBoard;
