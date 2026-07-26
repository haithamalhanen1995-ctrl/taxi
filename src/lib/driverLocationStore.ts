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

// Save or update driver location in Firebase Firestore & localStorage
export async function updateDriverLocationInFirebase(data: DriverLocationData): Promise<void> {
  try {
    const docRef = doc(db, 'driver_locations', data.driverId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    localStorage.setItem(`driver_loc_${data.driverId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Error updating driver location in Firebase:', err);
  }
}

// Subscribe to a specific driver's real-time location in Firebase Firestore
export function subscribeToDriverLocationInFirebase(
  driverId: string,
  onUpdate: (location: DriverLocationData | null) => void
): () => void {
  try {
    const docRef = doc(db, 'driver_locations', driverId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DriverLocationData;
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    }, (err) => {
      console.warn('Error subscribing to driver location in Firebase:', err);
    });
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscription failed:', err);
    return () => {};
  }
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
