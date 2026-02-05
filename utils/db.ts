import { DayItinerary } from '../types';
import { ITINERARY_DATA } from '../constants';

const DB_NAME = 'fukuoka-trip-db';
const STORE_NAME = 'itineraries';
const DB_VERSION = 1;

/**
 * Initialize the database (Native API)
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' });
      }
    };
  });
};

/**
 * Get all itineraries from DB.
 * If DB is empty, seeds it with default data.
 */
export const getAllItineraries = async (): Promise<DayItinerary[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const items = request.result as DayItinerary[];
        if (items.length === 0) {
          // Seed DB with default data
          console.log('Seeding DB with default itinerary data...');
          await seedDatabase(db);
          resolve(ITINERARY_DATA); // Return default data immediately
        } else {
          resolve(items);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting itineraries:', error);
    return ITINERARY_DATA; // Fallback
  }
};

const seedDatabase = async (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    ITINERARY_DATA.forEach(day => {
      store.put(day);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Save a single day itinerary to DB
 */
export const saveDayItinerary = async (day: DayItinerary): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(day);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving itinerary:', error);
  }
};

/**
 * Reset DB to default data
 */
export const resetItineraries = async (): Promise<DayItinerary[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = async () => {
        // Re-seed is handled by getAllItineraries, but we can do it explicitly here or just let the app reload.
        // Better to re-seed here to return fresh data.
        seedDatabase(db).then(() => {
             resolve(ITINERARY_DATA);
        });
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (error) {
     console.error('Error resetting itineraries:', error);
     return ITINERARY_DATA;
  }
};
