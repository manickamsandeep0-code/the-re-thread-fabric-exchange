
import type { GeoPoint } from '../types';

/**
 * Geocodes a location using OpenStreetMap's Nominatim API (free, no API key required).
 * For production, consider using Mapbox or Google Maps Geocoding API with proper rate limiting.
 * @param query The location query (city name, postcode, address, etc.)
 * @returns A promise that resolves to a GeoPoint object.
 */
export const geocode = async (query: string): Promise<GeoPoint> => {
  console.log(`Geocoding location: ${query}`);
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Re-Thread-Fabric-Exchange/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('Location not found');
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode location. Please try a different search term.');
  }
};
