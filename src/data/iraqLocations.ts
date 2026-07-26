export interface IraqLocation {
  id: string;
  nameAr: string;
  city: string;
  lat: number;
  lng: number;
}

export const IRAQ_LOCATIONS: IraqLocation[] = [
  // Erbil (أربيل) - الرئيسية
  { id: 'erbil-1', nameAr: 'أربيل - قلعة أربيل والمركز', city: 'أربيل', lat: 36.1912, lng: 44.0091 },
  { id: 'erbil-2', nameAr: 'أربيل - شارع 100 متري (قرب مجدي مول)', city: 'أربيل', lat: 36.1770, lng: 44.0320 },
  { id: 'erbil-3', nameAr: 'أربيل - حي عينكاوة', city: 'أربيل', lat: 36.2267, lng: 43.9961 },
  { id: 'erbil-4', nameAr: 'أربيل - فاميلي مول شارع 100', city: 'أربيل', lat: 36.2085, lng: 43.9855 },
  { id: 'erbil-5', nameAr: 'أربيل - مطار أربيل الدولي', city: 'أربيل', lat: 36.2370, lng: 43.9630 },
  { id: 'erbil-6', nameAr: 'أربيل - حي الشرطة (شارع 60)', city: 'أربيل', lat: 36.1820, lng: 44.0150 },

  // Duhok (دهوك)
  { id: 'duhok-1', nameAr: 'دهوك - المركز (شارع الكورنيش)', city: 'دهوك', lat: 36.8679, lng: 42.9880 },
  { id: 'duhok-2', nameAr: 'دهوك - مازي مول', city: 'دهوك', lat: 36.8520, lng: 42.9910 },
  { id: 'duhok-3', nameAr: 'دهوك - جامعة دهوك (حي مالطا)', city: 'دهوك', lat: 36.8450, lng: 42.9720 },
  { id: 'duhok-4', nameAr: 'دهوك - شارع KRO السريع', city: 'دهوك', lat: 36.8610, lng: 42.9800 },
  { id: 'duhok-5', nameAr: 'دهوك - زاخو (قرب الجسر العباسي)', city: 'دهوك', lat: 37.1460, lng: 42.6830 },

  // Sulaymaniyah (السليمانية)
  { id: 'suly-1', nameAr: 'السليمانية - شارع سالم والمركز', city: 'السليمانية', lat: 35.5570, lng: 45.4350 },
  { id: 'suly-2', nameAr: 'السليمانية - مجدي مول', city: 'السليمانية', lat: 35.5700, lng: 45.4100 },
  { id: 'suly-3', nameAr: 'السليمانية - سرچنار (متنزه سرچنار)', city: 'السليمانية', lat: 35.5820, lng: 45.3880 },
  { id: 'suly-4', nameAr: 'السليمانية - مطار السليمانية الدولي', city: 'السليمانية', lat: 35.5610, lng: 45.3180 },
  { id: 'suly-5', nameAr: 'السليمانية - عقرة / حلبجة', city: 'السليمانية', lat: 35.1770, lng: 45.9860 },

  // Baghdad (بغداد - العاصمة)
  { id: 'bgd-1', nameAr: 'بغداد - المنصور (شارع الاميرات)', city: 'بغداد', lat: 33.3150, lng: 44.3500 },
  { id: 'bgd-2', nameAr: 'بغداد - الكرادة الشرقية (شارع العرصات)', city: 'بغداد', lat: 33.3000, lng: 44.4200 },
  { id: 'bgd-10', nameAr: 'بغداد - الحارثية (قرب مول بغداد)', city: 'بغداد', lat: 33.3120, lng: 44.3700 },
  { id: 'bgd-12', nameAr: 'بغداد - مطار بغداد الدولي', city: 'بغداد', lat: 33.2625, lng: 44.2344 },

  // Najaf & Karbala & Basra
  { id: 'najaf-1', nameAr: 'النجف - شارع الكوفة والمركز', city: 'النجف', lat: 32.0250, lng: 44.3400 },
  { id: 'karbala-1', nameAr: 'كربلاء - شارع السعدية والمركز', city: 'كربلاء', lat: 32.6160, lng: 44.0320 },
  { id: 'basra-1', nameAr: 'البصرة - العشار (شارع الوطني)', city: 'البصرة', lat: 30.5080, lng: 47.8300 },
];

/**
 * Validates whether a location is within Kurdistan Region (Duhok, Erbil, Sulaymaniyah)
 */
export function isPointInKurdistanServiceArea(lat: number, lng: number, locationName?: string): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  const isGeoInKurdistan = lat >= 35.0 && lat <= 37.6 && lng >= 41.8 && lng <= 46.5;

  if (locationName) {
    const nameLower = locationName.toLowerCase();
    const isNameInKurdistan =
      nameLower.includes('أربيل') || nameLower.includes('erbil') || nameLower.includes('hawler') ||
      nameLower.includes('دهوك') || nameLower.includes('duhok') || nameLower.includes('dohuk') ||
      nameLower.includes('السليمانية') || nameLower.includes('sulaymaniyah') || nameLower.includes('slemani') ||
      nameLower.includes('زاخو') || nameLower.includes('سوران') || nameLower.includes('شقلاوة') ||
      nameLower.includes('حلبجة') || nameLower.includes('عقرة') || nameLower.includes('عمادية');

    return isGeoInKurdistan || isNameInKurdistan;
  }

  return isGeoInKurdistan;
}

export function searchLocations(query: string): IraqLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return IRAQ_LOCATIONS.slice(0, 6);
  return IRAQ_LOCATIONS.filter(
    (loc) =>
      Number.isFinite(loc.lat) &&
      Number.isFinite(loc.lng) &&
      (loc.nameAr.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q))
  );
}

/**
 * Async live location search using OpenStreetMap Nominatim
 * Priority search focused on Kurdistan Region (Duhok, Erbil, Sulaymaniyah) and Iraq
 */
export async function searchLocationsDynamic(query: string): Promise<IraqLocation[]> {
  const q = query.trim();
  if (!q) return IRAQ_LOCATIONS.slice(0, 6);

  // 1. Get preset local matches first
  const localMatches = IRAQ_LOCATIONS.filter(
    (loc) =>
      Number.isFinite(loc.lat) &&
      Number.isFinite(loc.lng) &&
      (loc.nameAr.toLowerCase().includes(q.toLowerCase()) || loc.city.toLowerCase().includes(q.toLowerCase()))
  );

  if (q.length < 2) return localMatches;

  try {
    // 2. Fetch live matching places in Kurdistan / Iraq from Nominatim API with bounding box
    // Viewbox covering Duhok, Erbil, Sulaymaniyah (41.5,37.8 to 46.5,34.8)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q + ' Iraq'
    )}&viewbox=41.5,37.8,46.5,34.8&limit=8&accept-language=ar`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const liveResults: IraqLocation[] = data
          .map((item: any, idx: number) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const mainTitle = item.display_name.split(',')[0] || q;
            const secondaryParts = item.display_name.split(',').slice(1, 3).join(',').trim();
            const cityTag = isPointInKurdistanServiceArea(lat, lng) ? 'كردستان العراق' : 'العراق';

            return {
              id: `nominatim-${idx}-${Date.now()}`,
              nameAr: secondaryParts ? `${mainTitle} (${secondaryParts})` : mainTitle,
              city: cityTag,
              lat,
              lng,
            };
          })
          .filter((item): item is IraqLocation => item !== null);

        // Combine unique results
        const combined = [...localMatches];
        for (const liveItem of liveResults) {
          if (!combined.some((c) => Math.abs(c.lat - liveItem.lat) < 0.003 && Math.abs(c.lng - liveItem.lng) < 0.003)) {
            combined.push(liveItem);
          }
        }
        return combined;
      }
    }
  } catch (err) {
    console.warn('Live search fetch error / timeout:', err);
  }

  return localMatches;
}

/**
 * Async geocoding function using OpenStreetMap / Nominatim
 */
export async function geocodeIraqLocationOnline(query: string): Promise<IraqLocation | null> {
  const q = query.trim();
  if (!q || q.length < 2) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + ' Kurdistan Iraq'
      )}&limit=1&accept-language=ar`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();

    if (data && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          id: `geo-${Date.now()}`,
          nameAr: item.display_name.split(',')[0] || q,
          city: 'إقليم كردستان',
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }

  return null;
}

/**
 * Async reverse geocoding function using OpenStreetMap / Nominatim
 * With smart fallback to nearest known Kurdistan neighborhood or clean coordinates
 */
export async function reverseGeocodeIraqLocation(lat: number, lng: number): Promise<string> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'موقع غير معروف';
  }

  // Find closest local location from IRAQ_LOCATIONS
  let closestLoc: IraqLocation | null = null;
  let minDistance = Infinity;

  for (const loc of IRAQ_LOCATIONS) {
    if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      const dLat = loc.lat - lat;
      const dLng = loc.lng - lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistance) {
        minDistance = distSq;
        closestLoc = loc;
      }
    }
  }

  // If very close to a landmark (under ~300 meters)
  if (closestLoc && minDistance < 0.00001) {
    return closestLoc.nameAr;
  }

  // Helper to test if string is meaningful Arabic address
  const isMeaningfulArabicAddress = (str: string) => {
    if (!str || str.trim().length < 3) return false;
    const hasArabic = /[\u0600-\u06FF]/.test(str);
    const isRawCode = /^(way|node|relation|\d+|_|\s)*$/i.test(str) || (/^[a-zA-Z0-9\s,._-]{2,25}$/i.test(str) && !hasArabic);
    return hasArabic && !isRawCode;
  };

  // Fetch live reverse geocode from Nominatim API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=ar`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.street || addr.footway || addr.path;
        const district = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.town || addr.city;

        let candidate = '';
        if (road && district && road !== district) {
          candidate = `${road}، ${district}`;
        } else if (road) {
          candidate = `${road}`;
        } else if (district) {
          candidate = `حي ${district}`;
        } else if (data.display_name) {
          const parts = data.display_name.split(',');
          candidate = parts.slice(0, 2).join(', ').trim();
        }

        if (isMeaningfulArabicAddress(candidate)) {
          return candidate;
        }
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  // Fallback 1: If close to a known local area (< ~5km)
  if (closestLoc && minDistance < 0.002) {
    return `قرب ${closestLoc.nameAr}`;
  }

  // Fallback 2: Formatted clean coordinates
  return `موقع (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

/**
 * Async OSRM road routing function
 * Fetches actual driving road path coordinates, exact road distance (km), and estimated duration (mins)
 */
export async function fetchOsrmRoute(
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; durationMin: number; geometry: [number, number][] } | null> {
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMin = Math.ceil(route.duration / 60);

        // GeoJSON coordinates are [lng, lat], convert to Leaflet [lat, lng]
        const geometry: [number, number][] = route.geometry.coordinates
          .map((coord: [number, number]) => [coord[1], coord[0]] as [number, number])
          .filter(([lat, lng]: [number, number]) => Number.isFinite(lat) && Number.isFinite(lng));

        if (Number.isFinite(distanceKm) && Number.isFinite(durationMin) && geometry.length > 0) {
          return {
            distanceKm,
            durationMin,
            geometry,
          };
        }
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch error / timeout:', err);
  }

  return null;
}


