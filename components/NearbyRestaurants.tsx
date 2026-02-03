import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, ChevronDown, ChevronUp, Loader2, Navigation, ExternalLink } from 'lucide-react';
import { searchNearbyRestaurants, formatPriceLevel, formatDistance, NearbyRestaurant } from '../utils/places';

interface NearbyRestaurantsProps {
    lat: number;
    lng: number;
    locationName: string;
    isExpanded: boolean;
    onToggle: () => void;
}

export const NearbyRestaurants: React.FC<NearbyRestaurantsProps> = ({
    lat,
    lng,
    locationName,
    isExpanded,
    onToggle
}) => {
    const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isExpanded && restaurants.length === 0) {
            loadRestaurants();
        }
    }, [isExpanded]);

    const loadRestaurants = async () => {
        setLoading(true);
        setError(null);
        try {
            const results = await searchNearbyRestaurants(lat, lng, 500);
            setRestaurants(results);
        } catch (err) {
            setError('無法載入附近餐廳');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenMaps = (restaurant: NearbyRestaurant) => {
        const query = encodeURIComponent(restaurant.name + ' ' + restaurant.address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100 hover:from-orange-100 hover:to-amber-100 transition-all"
            >
                <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                    <span className="text-lg">🍜</span>
                    附近 500m 餐廳
                </div>
                {isExpanded ? (
                    <ChevronUp size={18} className="text-orange-500" />
                ) : (
                    <ChevronDown size={18} className="text-orange-500" />
                )}
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                    {loading && (
                        <div className="flex items-center justify-center py-8 text-orange-500">
                            <Loader2 className="animate-spin mr-2" size={20} />
                            <span className="text-sm">搜尋中...</span>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-4 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && restaurants.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            附近沒有找到餐廳
                        </div>
                    )}

                    {!loading && restaurants.map((restaurant) => (
                        <div
                            key={restaurant.placeId}
                            onClick={(e) => { e.stopPropagation(); handleOpenMaps(restaurant); }}
                            className="p-3 bg-white rounded-lg border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-gray-800 text-sm truncate group-hover:text-orange-600 transition-colors">
                                            {restaurant.name}
                                        </h4>
                                        {restaurant.isOpen !== undefined && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${restaurant.isOpen
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {restaurant.isOpen ? '營業中' : '休息中'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        {restaurant.rating && (
                                            <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                                <Star size={12} className="fill-current" />
                                                {restaurant.rating}
                                                {restaurant.userRatingsTotal && (
                                                    <span className="text-gray-400 ml-0.5">
                                                        ({restaurant.userRatingsTotal > 999
                                                            ? `${(restaurant.userRatingsTotal / 1000).toFixed(1)}k`
                                                            : restaurant.userRatingsTotal})
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        {restaurant.priceLevel && (
                                            <span className="text-green-600 font-medium">
                                                {formatPriceLevel(restaurant.priceLevel)}
                                            </span>
                                        )}
                                        {restaurant.distance && (
                                            <span className="flex items-center gap-0.5">
                                                <Navigation size={10} />
                                                {formatDistance(restaurant.distance)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                                        <MapPin size={10} />
                                        <span className="truncate">{restaurant.address}</span>
                                    </div>
                                </div>

                                <ExternalLink size={14} className="text-gray-300 group-hover:text-orange-400 flex-shrink-0 mt-1" />
                            </div>
                        </div>
                    ))}

                    {!loading && restaurants.length > 0 && (
                        <p className="text-center text-[10px] text-gray-400 pt-2">
                            點擊可在 Google Maps 查看詳情
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
