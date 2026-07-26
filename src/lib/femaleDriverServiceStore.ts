import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getUsersFromDatabase } from './userDatabase';

export interface FemaleDriverZone {
  id: string;
  nameAr: string;
  enabled: boolean;
  activeFemaleDriversCount: number;
  totalRequests: number;
  matchedRequests: number;
  timeoutSeconds: number; // default 120 seconds (2 mins)
}

export interface FemaleServiceComplaint {
  id: string;
  reporterName: string;
  reporterRole: 'customer' | 'driver';
  phone: string;
  rideId?: string;
  subject: string;
  details: string;
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved';
  adminNotes?: string;
}

const ZONES_STORAGE_KEY = 'taksati_female_driver_zones_v1';
const COMPLAINTS_STORAGE_KEY = 'taksati_female_service_complaints_v1';
const DRIVER_PREF_PREFIX = 'taksati_female_driver_pref_';

const DEFAULT_ZONES: FemaleDriverZone[] = [
  {
    id: 'erbil_center',
    nameAr: 'أربيل - المركز والقلعة',
    enabled: true,
    activeFemaleDriversCount: 8,
    totalRequests: 142,
    matchedRequests: 131,
    timeoutSeconds: 120,
  },
  {
    id: 'baghdad_mansour',
    nameAr: 'بغداد - المنصور',
    enabled: true,
    activeFemaleDriversCount: 12,
    totalRequests: 215,
    matchedRequests: 198,
    timeoutSeconds: 120,
  },
  {
    id: 'baghdad_karrada',
    nameAr: 'بغداد - الكرادة والجادرية',
    enabled: true,
    activeFemaleDriversCount: 10,
    totalRequests: 180,
    matchedRequests: 165,
    timeoutSeconds: 120,
  },
  {
    id: 'najaf_center',
    nameAr: 'النجف - المركز والمدينة القديمة',
    enabled: true,
    activeFemaleDriversCount: 5,
    totalRequests: 89,
    matchedRequests: 78,
    timeoutSeconds: 120,
  },
  {
    id: 'basra_center',
    nameAr: 'البصرة - الجزاير والتايمز سكوير',
    enabled: false,
    activeFemaleDriversCount: 3,
    totalRequests: 45,
    matchedRequests: 36,
    timeoutSeconds: 120,
  },
  {
    id: 'sulaymaniyah_center',
    nameAr: 'السليمانية - شارع سالم والمركز',
    enabled: true,
    activeFemaleDriversCount: 7,
    totalRequests: 110,
    matchedRequests: 99,
    timeoutSeconds: 120,
  },
];

const DEFAULT_COMPLAINTS: FemaleServiceComplaint[] = [
  {
    id: 'f-comp-101',
    reporterName: 'زينب حسين الكرخي',
    reporterRole: 'customer',
    phone: '07801122334',
    rideId: 'ride-9921',
    subject: 'استفسار عن تأخير السائقة',
    details: 'طلبت سائقة في منطقة الكرادة واستغرقت 10 دقائق للوصول بسبب الازدحام المروري.',
    createdAt: 'اليوم 10:15 ص',
    status: 'resolved',
    adminNotes: 'تم التواصل مع السائقة والزبونة وتوضيح حالة الازدحام.',
  },
  {
    id: 'f-comp-102',
    reporterName: 'مريم علي الحسيني',
    reporterRole: 'driver',
    phone: '07703334455',
    rideId: 'ride-9988',
    subject: 'طلب توضيح عنوان التقاء شاق',
    details: 'الموقع المحدد على الخريطة كان داخل زقاق ضيق، يرجى توجيه الزبونة للانتظار في الشارع الرئيسي.',
    createdAt: 'منذ ساعتين',
    status: 'open',
  },
];

// Get zones
export function getFemaleDriverZones(): FemaleDriverZone[] {
  try {
    const raw = localStorage.getItem(ZONES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(DEFAULT_ZONES));
      return DEFAULT_ZONES;
    }
    const zones = JSON.parse(raw) as FemaleDriverZone[];
    
    // Dynamically calculate active female drivers count from userDatabase
    const users = getUsersFromDatabase();
    const activeFemaleDrivers = users.filter((u) => u.accountType === 'driver' && u.gender === 'female' && u.status === 'active');
    
    return zones.map((z) => ({
      ...z,
      activeFemaleDriversCount: Math.max(z.activeFemaleDriversCount, activeFemaleDrivers.length),
    }));
  } catch {
    return DEFAULT_ZONES;
  }
}

// Save zones
export function saveFemaleDriverZones(zones: FemaleDriverZone[]): void {
  try {
    localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones));
    zones.forEach((z) => {
      setDoc(doc(db, 'female_driver_zones', z.id), z, { merge: true }).catch(() => {});
    });
  } catch (e) {
    console.error('Failed to save female driver zones', e);
  }
}

// Toggle zone
export function toggleFemaleDriverZone(zoneId: string, enabled: boolean): FemaleDriverZone[] {
  const zones = getFemaleDriverZones();
  const updated = zones.map((z) => (z.id === zoneId ? { ...z, enabled } : z));
  saveFemaleDriverZones(updated);
  return updated;
}

// Check if female service is enabled for an address
export function isFemaleDriverServiceEnabledForAddress(address: string): boolean {
  if (!address) return true; // Default fallback to enabled if no address
  const zones = getFemaleDriverZones();
  const cleanAddr = address.toLowerCase();

  // Find if matching any disabled zone specifically
  const matchedZone = zones.find((z) => {
    const keywords = z.nameAr.replace(/[-]/g, ' ').split(' ');
    return keywords.some((k) => k.length > 2 && cleanAddr.includes(k.toLowerCase()));
  });

  if (matchedZone) {
    return matchedZone.enabled;
  }

  // If no specific zone matched, return true default
  return true;
}

// Get timeout limit for zone in seconds
export function getFemaleDriverServiceTimeout(address?: string): number {
  const zones = getFemaleDriverZones();
  if (address) {
    const cleanAddr = address.toLowerCase();
    const matchedZone = zones.find((z) => {
      const keywords = z.nameAr.replace(/[-]/g, ' ').split(' ');
      return keywords.some((k) => k.length > 2 && cleanAddr.includes(k.toLowerCase()));
    });
    if (matchedZone) return matchedZone.timeoutSeconds || 120;
  }
  return zones[0]?.timeoutSeconds || 120;
}

// Update timeout limit for all zones
export function updateFemaleDriverTimeout(seconds: number): FemaleDriverZone[] {
  const zones = getFemaleDriverZones();
  const updated = zones.map((z) => ({ ...z, timeoutSeconds: seconds }));
  saveFemaleDriverZones(updated);
  return updated;
}

// Get female service complaints
export function getFemaleServiceComplaints(): FemaleServiceComplaint[] {
  try {
    const raw = localStorage.getItem(COMPLAINTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(DEFAULT_COMPLAINTS));
      return DEFAULT_COMPLAINTS;
    }
    return JSON.parse(raw) as FemaleServiceComplaint[];
  } catch {
    return DEFAULT_COMPLAINTS;
  }
}

// Add complaint
export function addFemaleServiceComplaint(complaint: Omit<FemaleServiceComplaint, 'id' | 'createdAt' | 'status'>): FemaleServiceComplaint {
  const list = getFemaleServiceComplaints();
  const newComp: FemaleServiceComplaint = {
    ...complaint,
    id: `f-comp-${Date.now()}`,
    createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    status: 'open',
  };
  const updated = [newComp, ...list];
  localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(updated));
  setDoc(doc(db, 'female_service_complaints', newComp.id), newComp, { merge: true }).catch(() => {});
  return newComp;
}

// Update complaint status
export function updateFemaleComplaintStatus(id: string, status: 'open' | 'investigating' | 'resolved', adminNotes?: string): FemaleServiceComplaint[] {
  const list = getFemaleServiceComplaints();
  const updated = list.map((item) => (item.id === id ? { ...item, status, adminNotes: adminNotes ?? item.adminNotes } : item));
  localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// Get Female Driver Preference (Female Drivers can choose: female-only orders or all orders)
export function getDriverFemaleOnlyPref(driverId: string): boolean {
  try {
    const key = `${DRIVER_PREF_PREFIX}${driverId}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    return false; // Default: receive all orders
  } catch {
    return false;
  }
}

// Save Female Driver Preference
export function setDriverFemaleOnlyPref(driverId: string, femaleOnlyPref: boolean): void {
  try {
    const key = `${DRIVER_PREF_PREFIX}${driverId}`;
    localStorage.setItem(key, JSON.stringify(femaleOnlyPref));
  } catch (e) {
    console.error('Failed to save driver female only pref', e);
  }
}
