import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface DriverTripRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  customerRating: string;
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  fareAmount: number; // e.g. 6750
  fareFormatted: string; // "6,750 د.ع"
  completedAt: string;
}

export interface DriverStats {
  todayEarnings: number;
  todayTripsCount: number;
  completedTrips: DriverTripRecord[];
}

const DRIVER_STATS_PREFIX = 'taksati_driver_stats_v2_';

const INITIAL_DRIVER_STATS: DriverStats = {
  todayEarnings: 245500,
  todayTripsCount: 8,
  completedTrips: [
    {
      id: 'trip-seed-1',
      customerName: 'أحمد علي العراقي',
      customerPhone: '07501234567',
      customerRating: '4.8',
      pickupName: 'المنصور - شارع 14 رمضان',
      pickupLat: 33.3128,
      pickupLng: 44.3542,
      destName: 'الكرادة - ساحة الواثق',
      destLat: 33.3052,
      destLng: 44.4225,
      fareAmount: 6750,
      fareFormatted: '6,750 د.ع',
      completedAt: 'منذ 25 دقيقة',
    },
    {
      id: 'trip-seed-2',
      customerName: 'سارة جاسم الخفاجي',
      customerPhone: '07701112233',
      customerRating: '4.9',
      pickupName: 'زيونة - قرب مول بغداد',
      pickupLat: 33.3250,
      pickupLng: 44.4380,
      destName: 'مطار بغداد الدولي',
      destLat: 33.2625,
      destLng: 44.2344,
      fareAmount: 14500,
      fareFormatted: '14,500 د.ع',
      completedAt: 'منذ ساعتين',
    },
    {
      id: 'trip-seed-3',
      customerName: 'عمر الملا',
      customerPhone: '07809998877',
      customerRating: '5.0',
      pickupName: 'حي الجامعة - تقاطع الخضراء',
      pickupLat: 33.3289,
      pickupLng: 44.3188,
      destName: 'شارع فلسطين - قرب النادي العربي',
      destLat: 33.3512,
      destLng: 44.4180,
      fareAmount: 8250,
      fareFormatted: '8,250 د.ع',
      completedAt: 'منذ 4 ساعات',
    },
  ],
};

export function getDriverStatsKey(driverId?: string): string {
  const cleanId = (driverId || 'user-seed-driver-active').trim();
  return `${DRIVER_STATS_PREFIX}${cleanId}`;
}

export function getDriverStats(driverId?: string): DriverStats {
  const key = getDriverStatsKey(driverId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // If it's the seed driver or default driver, initialize with seed stats
      const isSeed = !driverId || driverId === 'user-seed-driver-active' || driverId === 'othman';
      const initial = isSeed ? INITIAL_DRIVER_STATS : { todayEarnings: 0, todayTripsCount: 0, completedTrips: [] };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as DriverStats;
  } catch {
    return { todayEarnings: 0, todayTripsCount: 0, completedTrips: [] };
  }
}

export function saveDriverStats(stats: DriverStats, driverId?: string): void {
  const key = getDriverStatsKey(driverId);
  const cleanId = (driverId || 'user-seed-driver-active').trim();
  try {
    localStorage.setItem(key, JSON.stringify(stats));
    setDoc(doc(db, 'driver_stats', cleanId), { driverId: cleanId, ...stats }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error('Failed to save driver stats', e);
  }
}

export function recordCompletedTrip(
  driverId: string | undefined,
  newTrip: Omit<DriverTripRecord, 'id' | 'completedAt'>
): DriverStats {
  const current = getDriverStats(driverId);
  const nowStr = 'الآن';
  const tripRecord: DriverTripRecord = {
    ...newTrip,
    id: `trip-${Date.now()}`,
    completedAt: nowStr,
  };

  const updated: DriverStats = {
    todayEarnings: current.todayEarnings + newTrip.fareAmount,
    todayTripsCount: current.todayTripsCount + 1,
    completedTrips: [tripRecord, ...current.completedTrips],
  };

  saveDriverStats(updated, driverId);
  return updated;
}
