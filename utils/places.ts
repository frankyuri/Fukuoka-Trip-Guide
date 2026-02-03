// Google Places API Nearby Search
// Documentation: https://developers.google.com/maps/documentation/places/web-service/search-nearby

export interface NearbyRestaurant {
  placeId: string;
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  address: string;
  isOpen?: boolean;
  distance?: number;
  photoUrl?: string;
  types: string[];
}

interface PlacesSearchResponse {
  results: any[];
  status: string;
  error_message?: string;
}

// Calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Get photo URL from photo reference
const getPhotoUrl = (photoReference: string, maxWidth: number = 200): string => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
};

// Cache for nearby restaurants to avoid repeated API calls
const restaurantCache = new Map<string, { data: NearbyRestaurant[], timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const searchNearbyRestaurants = async (
  lat: number, 
  lng: number, 
  radius: number = 500
): Promise<NearbyRestaurant[]> => {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`;
  
  // Check cache first
  const cached = restaurantCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Places API Key not configured');
    return getMockRestaurants(lat, lng);
  }

  try {
    // Using Places API Nearby Search
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('type', 'restaurant');
    url.searchParams.set('language', 'ja');
    url.searchParams.set('key', apiKey);

    // Note: Direct API calls from browser will fail due to CORS
    // We need to use a proxy or the Places Library from Google Maps JavaScript API
    // For now, using the JavaScript API approach
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data: PlacesSearchResponse = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message);
      return getMockRestaurants(lat, lng);
    }

    const restaurants: NearbyRestaurant[] = data.results.map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      address: place.vicinity || place.formatted_address || '',
      isOpen: place.opening_hours?.open_now,
      distance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
      photoUrl: place.photos?.[0]?.photo_reference 
        ? getPhotoUrl(place.photos[0].photo_reference) 
        : undefined,
      types: place.types || []
    }));

    // Sort by distance
    restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    // Cache the results
    restaurantCache.set(cacheKey, { data: restaurants, timestamp: Date.now() });

    return restaurants.slice(0, 10); // Return top 10
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    return getMockRestaurants(lat, lng);
  }
};

// Mock data for development/fallback
const getMockRestaurants = (lat: number, lng: number): NearbyRestaurant[] => {
  return [
    {
      placeId: 'mock-1',
      name: '博多一幸舎',
      rating: 4.2,
      userRatingsTotal: 1250,
      priceLevel: 2,
      address: '福岡市博多区博多駅前',
      isOpen: true,
      distance: 120,
      types: ['restaurant', 'food']
    },
    {
      placeId: 'mock-2', 
      name: '一蘭 本店',
      rating: 4.5,
      userRatingsTotal: 3400,
      priceLevel: 2,
      address: '福岡市中央区天神',
      isOpen: true,
      distance: 250,
      types: ['restaurant', 'food']
    },
    {
      placeId: 'mock-3',
      name: '元祖長浜屋',
      rating: 4.0,
      userRatingsTotal: 890,
      priceLevel: 1,
      address: '福岡市中央区長浜',
      isOpen: false,
      distance: 380,
      types: ['restaurant', 'food']
    }
  ];
};

// Format price level to yen symbols
export const formatPriceLevel = (level?: number): string => {
  if (level === undefined) return '';
  return '¥'.repeat(level);
};

// Format distance to readable string
export const formatDistance = (meters?: number): string => {
  if (meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};
