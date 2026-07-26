import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

export interface DriverLocationData {
  driverId: string;
  driverName?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmH?: number;
  activeRideId?: string;
  updatedAt: string;
  isOnline: boolean;
}

// Event name for instant local synchronization across components/tabs
const EVENT_NAME = 'taksati_driver_loc_updated';

// Save or update driver location in Firebase Firestore, localStorage & dispatch event
export async function updateDriverLocationInFirebase(data: DriverLocationData): Promise<void> {
  const fullData: DriverLocationData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`driver_loc_${data.driverId}`, JSON.stringify(fullData));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: fullData }));
  } catch {}

  try {
    const docRef = doc(db, 'driver_locations', data.driverId);
    await setDoc(docRef, fullData, { merge: true });
  } catch (err) {
    console.warn('Error updating driver location in Firebase:', err);
  }
}

// Get cached driver location synchronously
export function getCachedDriverLocation(driverId: string): DriverLocationData | null {
  try {
    const raw = localStorage.getItem(`driver_loc_${driverId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// Subscribe to a specific driver's real-time location in Firebase Firestore + Window Event
export function subscribeToDriverLocationInFirebase(
  driverId: string,
  onUpdate: (location: DriverLocationData | null) => void
): () => void {
  // Check cached initial location
  const initial = getCachedDriverLocation(driverId);
  if (initial) {
    onUpdate(initial);
  }

  // Handle local custom event
  const handleLocalEvent = (e: any) => {
    if (e.detail && e.detail.driverId === driverId) {
      onUpdate(e.detail);
    }
  };
  window.addEventListener(EVENT_NAME, handleLocalEvent);

  let unsubscribeFirestore = () => {};
  try {
    const docRef = doc(db, 'driver_locations', driverId);
    unsubscribeFirestore = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DriverLocationData;
          onUpdate(data);
          try {
            localStorage.setItem(`driver_loc_${driverId}`, JSON.stringify(data));
          } catch {}
        }
      },
      (err) => {
        console.warn('Error subscribing to driver location in Firebase:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription failed:', err);
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleLocalEvent);
    unsubscribeFirestore();
  };
}

// Subscribe to ALL active drivers' locations in Firebase Firestore
export function subscribeToAllDriversLocationsInFirebase(
  onUpdate: (locations: DriverLocationData[]) => void
): () => void {
  try {
    const colRef = collection(db, 'driver_locations');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: DriverLocationData[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DriverLocationData);
      });
      onUpdate(list);
    }, (err) => {
      console.warn('Error subscribing to all drivers locations:', err);
    });
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscription failed:', err);
    return () => {};
  }
}
