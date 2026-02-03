// Google Places API using Google Maps JavaScript SDK
// This uses the Places Library which handles CORS automatically

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

// Cache for nearby restaurants to avoid repeated API calls
const restaurantCache = new Map<string, { data: NearbyRestaurant[], timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Wait for Google Maps to load
const waitForGoogleMaps = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }
    
    const checkLoaded = () => {
      if ((window as any).google?.maps?.places) {
        resolve();
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    
    if ((window as any).googleMapsLoaded) {
      checkLoaded();
    } else {
      window.addEventListener('google-maps-loaded', checkLoaded);
    }
    
    // Timeout after 10 seconds
    setTimeout(() => resolve(), 10000);
  });
};

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

  try {
    // Wait for Google Maps to be ready
    await waitForGoogleMaps();
    
    const google = (window as any).google;
    
    if (!google?.maps?.places) {
      console.warn('Google Maps Places library not loaded');
      return getMockRestaurants(lat, lng);
    }

    // Create a temporary div for PlacesService (required by API)
    const mapDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(mapDiv);
    
    const location = new google.maps.LatLng(lat, lng);
    
    const request = {
      location: location,
      radius: radius,
      type: 'restaurant',
      language: 'ja'
    };

    return new Promise((resolve) => {
      service.nearbySearch(request, (results: any[], status: string) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const restaurants: NearbyRestaurant[] = results.slice(0, 10).map((place: any) => ({
            placeId: place.place_id,
            name: place.name,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            priceLevel: place.price_level,
            address: place.vicinity || '',
            isOpen: place.opening_hours?.isOpen?.() ?? place.opening_hours?.open_now,
            distance: calculateDistance(
              lat, lng, 
              place.geometry.location.lat(), 
              place.geometry.location.lng()
            ),
            photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 200 }),
            types: place.types || []
          }));

          // Sort by distance
          restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));

          // Cache the results
          restaurantCache.set(cacheKey, { data: restaurants, timestamp: Date.now() });

          resolve(restaurants);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.error('Places API error:', status);
          resolve(getMockRestaurants(lat, lng));
        }
      });
    });
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
