import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

export type RideStatus =
  | 'pending_driver'
  | 'accepted'
  | 'in_trip'
  | 'completed'
  | 'cancelled'
  | 'no_driver_available';

export interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  category: 'economy' | 'comfort' | 'vip';
  categoryNameAr: string;
  fareAmount: number;
  fareFormatted: string;
  distanceKm: number;
  durationMin: number;
  createdAt: string;
  status: RideStatus;
  femaleDriverOnly?: boolean;

  // Driver assignment details
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  driverPhase?: 'en_route_to_pickup' | 'en_route_to_destination';
}

export type StoredRide = RideRequest;

const RIDES_LIST_KEY = 'taksati_rides_list_v2';
const EVENT_NAME = 'taksati_ride_store_updated';

// Notify current window & storage listener across browser tabs/windows
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

// Get all ride requests in database
export function getAllRides(): RideRequest[] {
  try {
    const raw = localStorage.getItem(RIDES_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RideRequest[];
  } catch {
    return [];
  }
}

// Save entire rides list to localStorage and Firestore
export function saveAllRides(rides: RideRequest[]): void {
  try {
    localStorage.setItem(RIDES_LIST_KEY, JSON.stringify(rides));
    notifyChange();

    // Sync each ride to Firestore
    rides.forEach((ride) => {
      if (ride.id) {
        setDoc(doc(db, 'rides', ride.id), ride, { merge: true }).catch((err) =>
          console.warn('Firestore ride setDoc warning:', err)
        );
      }
    });
  } catch (e) {
    console.error('Failed to save rides list', e);
  }
}

// Real-time listener for Firestore rides collection
try {
  onSnapshot(collection(db, 'rides'), (snapshot) => {
    if (!snapshot.empty) {
      const firestoreRides: RideRequest[] = [];
      snapshot.forEach((docSnap) => {
        firestoreRides.push(docSnap.data() as RideRequest);
      });

      if (firestoreRides.length > 0) {
        const localRides = getAllRides();
        const rideMap = new Map<string, RideRequest>();
        localRides.forEach((r) => rideMap.set(r.id, r));
        firestoreRides.forEach((r) => rideMap.set(r.id, r));
        const merged = Array.from(rideMap.values());
        try {
          localStorage.setItem(RIDES_LIST_KEY, JSON.stringify(merged));
          notifyChange();
        } catch {
          // ignore
        }
      }
    }
  }, (err) => {
    console.warn('Firestore rides listener warning:', err);
  });
} catch (e) {
  console.warn('Firestore rides setup warning:', e);
}

// Legacy helper for single ride fetch (returns first non-completed/non-cancelled ride)
export function getActiveRide(): RideRequest | null {
  const rides = getAllRides();
  return rides.find((r) => r.status !== 'completed' && r.status !== 'cancelled') || null;
}

// Get active ride request specifically for a customer by ID or name
export function getCustomerActiveRide(customerId?: string, customerName?: string): RideRequest | null {
  const rides = getAllRides();
  const activeRides = rides.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');

  if (customerId) {
    const found = activeRides.find((r) => r.customerId === customerId);
    if (found) return found;
  }

  if (customerName) {
    const found = activeRides.find((r) => r.customerName === customerName);
    if (found) return found;
  }

  return activeRides[0] || null;
}

// Get active ride request assigned specifically to a driver
export function getDriverActiveRide(driverId: string): RideRequest | null {
  const rides = getAllRides();
  return (
    rides.find(
      (r) =>
        r.driverId === driverId &&
        (r.status === 'accepted' || r.status === 'in_trip')
    ) || null
  );
}

// Get all pending rides waiting for driver (with female driver filtering support)
export function getPendingRides(driverGender?: 'male' | 'female', femaleOnlyPref?: boolean): RideRequest[] {
  const rides = getAllRides();
  const pending = rides.filter((r) => r.status === 'pending_driver');

  if (driverGender === 'male') {
    // Male drivers CANNOT see or accept female-only rides
    return pending.filter((r) => !r.femaleDriverOnly);
  }

  if (driverGender === 'female') {
    if (femaleOnlyPref) {
      // Female driver enabled "Female Only" filter -> show only female-only rides
      return pending.filter((r) => r.femaleDriverOnly);
    }
    // Female driver receives all rides (both female-only and normal)
    return pending;
  }

  return pending;
}

// Save or update active ride request in list
export function saveActiveRide(ride: RideRequest): void {
  const rides = getAllRides();
  const index = rides.findIndex((r) => r.id === ride.id);
  if (index >= 0) {
    rides[index] = ride;
  } else {
    rides.push(ride);
  }
  saveAllRides(rides);
}

// Clear active ride for a specific customer or all
export function clearActiveRide(rideId?: string): void {
  const rides = getAllRides();
  if (rideId) {
    const updated = rides.map((r) => (r.id === rideId ? { ...r, status: 'cancelled' as RideStatus } : r));
    saveAllRides(updated);
  } else {
    // If no ID, mark latest active as cancelled
    const active = rides.find((r) => r.status !== 'completed' && r.status !== 'cancelled');
    if (active) {
      active.status = 'cancelled';
      saveAllRides(rides);
    }
  }
}

// Create new ride request from customer
export function createCustomerRideRequest(params: {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  category: 'economy' | 'comfort' | 'vip';
  fareAmount: number;
  fareFormatted: string;
  distanceKm: number;
  durationMin: number;
  femaleDriverOnly?: boolean;
}): RideRequest {
  const categoryNames = {
    economy: 'اقتصادي (Sedan)',
    comfort: 'مريح (Comfort)',
    vip: 'VIP (فاخر)',
  };

  const cid = params.customerId || params.customerName || `customer-${Date.now()}`;

  // Cancel any old active rides for this customer first so they don't have multiple duplicates
  const rides = getAllRides();
  const cleanedRides = rides.map((r) => {
    if ((r.customerId === cid || r.customerName === params.customerName) && r.status === 'pending_driver') {
      return { ...r, status: 'cancelled' as RideStatus };
    }
    return r;
  });

  const newRide: RideRequest = {
    id: `ride-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customerId: cid,
    customerName: params.customerName || 'أحمد علي العراقي',
    customerPhone: params.customerPhone || '07501234567',
    pickupName: params.pickupName,
    pickupLat: params.pickupLat,
    pickupLng: params.pickupLng,
    destName: params.destName,
    destLat: params.destLat,
    destLng: params.destLng,
    category: params.category,
    categoryNameAr: categoryNames[params.category],
    fareAmount: params.fareAmount,
    fareFormatted: params.fareFormatted,
    distanceKm: params.distanceKm,
    durationMin: params.durationMin,
    createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    status: 'pending_driver',
    femaleDriverOnly: !!params.femaleDriverOnly,
  };

  cleanedRides.push(newRide);
  saveAllRides(cleanedRides);
  return newRide;
}

// Driver accepts ride request
export function acceptRideRequestByDriver(
  rideId: string,
  driverInfo: {
    driverId?: string;
    driverName: string;
    driverPhone?: string;
    driverRating?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
  }
): RideRequest | null {
  const rides = getAllRides();
  const index = rides.findIndex((r) => r.id === rideId);
  if (index === -1) return null;

  const current = rides[index];
  // Ensure the ride is still pending
  if (current.status !== 'pending_driver') {
    return null; // Already accepted by someone else or cancelled
  }

  const updated: RideRequest = {
    ...current,
    status: 'accepted',
    driverPhase: 'en_route_to_pickup',
    driverId: driverInfo.driverId || 'user-seed-driver-active',
    driverName: driverInfo.driverName || 'عثمان الفهداوي',
    driverPhone: driverInfo.driverPhone || '07701234567',
    driverRating: driverInfo.driverRating || '4.9',
    vehicleModel: driverInfo.vehicleModel || 'تويوتا كامري 2023 - أبيض',
    vehiclePlate: driverInfo.vehiclePlate || 'بغداد 84920 - أ',
  };

  rides[index] = updated;
  saveAllRides(rides);
  return updated;
}

// Driver advances phase (arrived at pickup -> heading to destination)
export function updateRidePhase(
  rideId: string,
  phase: 'en_route_to_destination'
): RideRequest | null {
  const rides = getAllRides();
  const index = rides.findIndex((r) => r.id === rideId);
  if (index === -1) return null;

  const updated: RideRequest = {
    ...rides[index],
    status: 'in_trip',
    driverPhase: phase,
  };

  rides[index] = updated;
  saveAllRides(rides);
  return updated;
}

// Complete ride
export function completeRide(rideId: string): RideRequest | null {
  const rides = getAllRides();
  const index = rides.findIndex((r) => r.id === rideId);
  if (index === -1) return null;

  const updated: RideRequest = {
    ...rides[index],
    status: 'completed',
  };

  rides[index] = updated;
  saveAllRides(rides);
  return updated;
}

// Set ride as no driver available
export function setRideNoDriverAvailable(rideId: string): RideRequest | null {
  const rides = getAllRides();
  const index = rides.findIndex((r) => r.id === rideId);
  if (index === -1) return null;

  const current = rides[index];
  if (current.status !== 'pending_driver') return null;

  const updated: RideRequest = {
    ...current,
    status: 'no_driver_available',
  };

  rides[index] = updated;
  saveAllRides(rides);
  return updated;
}

// Hook-like listener helper for components
export function subscribeToRideUpdates(callback: (rides: RideRequest[]) => void) {
  const handler = () => {
    callback(getAllRides());
  };

  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
