
import type { GeoPoint } from '../types';

/**
 * Mocks a geocoding API call.
 * In a real application, this would use an API like Mapbox Geocoding or Google Places API.
 * @param postcode The postcode or city name to geocode.
 * @returns A promise that resolves to a GeoPoint object.
 */
export const geocode = async (postcode: string): Promise<GeoPoint> => {
  console.log(`Geocoding postcode: ${postcode}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return a mock location. A real implementation would have a map of postcodes to coordinates.
  if (postcode.toLowerCase().includes('london')) {
    return { latitude: 51.5074, longitude: -0.1278 };
  }
  if (postcode.toLowerCase().includes('manchester')) {
    return { latitude: 53.4808, longitude: -2.2426 };
  }
  
  // Default fallback
  return { latitude: 52.4862, longitude: -1.8904 }; // Birmingham
};
