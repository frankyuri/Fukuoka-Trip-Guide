import { useState, useEffect, useCallback } from 'react';
import { DayItinerary, ItineraryItem, TransportType } from '../types';
import { getAllItineraries, saveDayItinerary, resetItineraries } from '../utils/db';
import { ITINERARY_DATA } from '../constants'; // Fallback

export const useItinerary = () => {
  const [itinerary, setItinerary] = useState<DayItinerary[]>(ITINERARY_DATA); // Init with static first to prevent flash
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllItineraries();
        // Sort data based on original order to ensure days don't get mixed up
        // Simple sort by finding index in original data
        const sortedData = data.sort((a, b) => {
           const indexA = ITINERARY_DATA.findIndex(d => d.date === a.date);
           const indexB = ITINERARY_DATA.findIndex(d => d.date === b.date);
           return indexA - indexB;
        });
        setItinerary(sortedData);
      } catch (error) {
        console.error('Failed to load itinerary from DB:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sort items helper
  const sortItemsByTime = (items: ItineraryItem[]) => {
    return [...items].sort((a, b) => {
      // Simple string comparison works for HH:MM 24h format
      return a.time.localeCompare(b.time);
    });
  };

  const updateItem = useCallback(async (dayDate: string, updatedItem: ItineraryItem) => {
    setItinerary(prev => {
      const newItinerary = prev.map(day => {
        if (day.date !== dayDate) return day;
        
        // Update the specific item
        let newItems = day.items.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        );
        
        // Auto-sort if time changed
        newItems = sortItemsByTime(newItems);
        
        const updatedDay = { ...day, items: newItems };
        saveDayItinerary(updatedDay).catch(err => console.error('Save failed:', err));
        
        return updatedDay;
      });
      return newItinerary;
    });
  }, []);

  const addItem = useCallback(async (dayDate: string) => {
    setItinerary(prev => {
      const newItinerary = prev.map(day => {
        if (day.date !== dayDate) return day;

        const newItem: ItineraryItem = {
          id: `new-${Date.now()}`,
          time: '12:00',
          title: '新行程',
          description: '請輸入說明',
          address_jp: '福岡市',
          address_en: 'Fukuoka',
          coordinates: { lat: 33.5902, lng: 130.4017 }, // Default to Hakata
          transportType: TransportType.WALK,
          transportDetail: '步行',
          recommendedFood: [],
          nearbySpots: [],
          shoppingSideQuests: [],
          googleMapsQuery: ''
        };
        
        const newItems = sortItemsByTime([...day.items, newItem]);
        const updatedDay = { ...day, items: newItems };
        saveDayItinerary(updatedDay).catch(err => console.error('Save failed:', err));
        
        return updatedDay;
      });
      return newItinerary;
    });
  }, []);

  const deleteItem = useCallback(async (dayDate: string, itemId: string) => {
    if (!window.confirm('確定要刪除這個行程嗎？')) return;

    setItinerary(prev => {
      const newItinerary = prev.map(day => {
        if (day.date !== dayDate) return day;
        
        const newItems = day.items.filter(item => item.id !== itemId);
        const updatedDay = { ...day, items: newItems };
        saveDayItinerary(updatedDay).catch(err => console.error('Save failed:', err));
        
        return updatedDay;
      });
      return newItinerary;
    });
  }, []);

  const resetToDefault = useCallback(async () => {
    if (!window.confirm('確定要還原成預設行程嗎？您的修改將會消失。')) return;
    
    setLoading(true);
    try {
      const defaultData = await resetItineraries();
      setItinerary(defaultData);
    } catch (error) {
      console.error('Reset failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    itinerary,
    loading,
    isEditing,
    setIsEditing,
    updateItem,
    addItem,
    deleteItem,
    resetToDefault
  };
};
