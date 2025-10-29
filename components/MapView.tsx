import React, { useState, useEffect, useCallback } from 'react';
import type { Listing, GeoPoint } from '../types';
import { getNearbyListings } from '../services/firebaseService';
import { geocode } from '../services/geoService';
import { MapPinIcon, SearchIcon } from './icons';
import Spinner from './Spinner';
import { Category, ListingType, PostType } from '../types';

// --- MOCK React-Leaflet Components ---
// In a real project, you would `import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';`
const MapContainer: React.FC<{center: [number, number], zoom: number, children: React.ReactNode, className?: string}> = ({ center, zoom, children, className }) => (
    <div className={`relative bg-gray-200 border border-gray-300 rounded-lg overflow-hidden ${className}`} style={{ minHeight: '400px', backgroundImage: 'url(https://source.unsplash.com/random/1200x800?map)', backgroundSize: 'cover' }}>
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
            Map centered at [{center.join(', ')}] with zoom {zoom}
        </div>
        {children}
    </div>
);
const TileLayer: React.FC<{url: string, attribution: string}> = () => null; // This is purely for props compatibility in the mock.
const Marker: React.FC<{position: [number, number], children?: React.ReactNode, icon: React.ReactNode}> = ({ position, children, icon }) => {
    // A very basic approximation of marker positioning.
    const top = (90 - position[0]) / 180 * 100;
    const left = (position[1] + 180) / 360 * 100;
    return <div className="absolute" style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -100%)' }}>
        {icon}
        {children}
    </div>
};
const Popup: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="absolute bottom-full mb-2 w-64 bg-white rounded-lg shadow-xl p-2 z-10 hidden group-hover:block">
      {children}
    </div>
);
// --- END MOCK React-Leaflet Components ---


const MapView = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [center, setCenter] = useState<GeoPoint>({ latitude: 51.5074, longitude: -0.1278 });
  const [searchQuery, setSearchQuery] = useState('London');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');
  const [postTypeFilter, setPostTypeFilter] = useState<PostType | 'all'>(PostType.OFFER);


  const fetchListings = useCallback(async (location: GeoPoint) => {
    setIsLoading(true);
    setError(null);
    try {
      const nearbyListings = await getNearbyListings(location, 15); // 15km radius
      setListings(nearbyListings);
    } catch (err) {
      setError('Failed to fetch listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchListings(center);
  }, [center, fetchListings]);

  useEffect(() => {
    let result = listings;

    if (postTypeFilter !== 'all') {
      result = result.filter(l => l.postType === postTypeFilter);
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(l => l.category === categoryFilter);
    }

    if (listingTypeFilter !== 'all') {
      // This filter only applies to 'offer' post types
      result = result.filter(l => l.postType !== PostType.OFFER || l.listingType === listingTypeFilter);
    }
    
    setFilteredListings(result);
  }, [listings, postTypeFilter, categoryFilter, listingTypeFilter]);


  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsLoading(true);
    try {
        const newLocation = await geocode(searchQuery);
        setCenter(newLocation);
    } catch (err) {
        setError("Could not find that location. Please try another.");
        setIsLoading(false);
    }
  };
  
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: GeoPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCenter(newLocation);
          setSearchQuery("My Location");
        },
        (err) => {
          setError("Could not get your location. Please enable location services.");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };
  
  const FilterSelect: React.FC<{label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, disabled?: boolean}> = ({ label, id, value, onChange, children, disabled }) => (
    <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
            {children}
        </select>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a city or postcode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition shadow-sm disabled:bg-teal-300" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button type="button" onClick={handleUseMyLocation} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2" disabled={isLoading}>
            <MapPinIcon className="h-5 w-5"/> Use My Location
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        
        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
            <FilterSelect label="Show" id="post-type-filter" value={postTypeFilter} onChange={e => setPostTypeFilter(e.target.value as PostType | 'all')}>
                <option value={PostType.OFFER}>Offers</option>
                <option value={PostType.REQUEST}>Requests (ISO)</option>
                <option value="all">All Posts</option>
            </FilterSelect>
            <FilterSelect label="Category" id="category-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as Category | 'all')}>
                <option value="all">All Categories</option>
                {Object.values(Category).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </FilterSelect>
            <FilterSelect label="Deal Type" id="listing-type-filter" value={listingTypeFilter} onChange={e => setListingTypeFilter(e.target.value as ListingType | 'all')} disabled={postTypeFilter === PostType.REQUEST}>
                <option value="all">All Deal Types</option>
                {Object.values(ListingType).map(lt => <option key={lt} value={lt}>{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>)}
            </FilterSelect>
        </div>
      </div>
      
      <div className="relative">
        {isLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                <Spinner />
            </div>
        )}
        <MapContainer center={[center.latitude, center.longitude]} zoom={13} className="h-[60vh] w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredListings.map(listing => (
            <div key={listing.id} className="group">
              <Marker 
                position={[listing.location.latitude, listing.location.longitude]}
                icon={<MapPinIcon className={`h-8 w-8 ${listing.postType === PostType.OFFER ? 'text-red-500' : 'text-blue-600'} drop-shadow-lg`} />}
               >
                <Popup>
                    <div className="flex flex-col">
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-32 object-cover rounded-t-md" />
                        <div className="p-2">
                          <h3 className="font-bold text-gray-800">{listing.title}</h3>
                          <p className="text-sm text-gray-600">{listing.quantity}</p>
                           {listing.postType === PostType.OFFER ? (
                               <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                                   listing.listingType === ListingType.FREE ? 'bg-green-100 text-green-800' : 
                                   listing.listingType === ListingType.SWAP ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                   {listing.listingType.toUpperCase()}
                               </span>
                           ) : (
                               <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block bg-indigo-100 text-indigo-800">
                                   REQUEST
                               </span>
                           )}
                        </div>
                    </div>
                </Popup>
              </Marker>
            </div>
          ))}
        </MapContainer>
        {!isLoading && filteredListings.length === 0 && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-5 rounded-lg">
                <div className="text-center p-8">
                    <h3 className="text-xl font-semibold text-gray-700">No listings found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
