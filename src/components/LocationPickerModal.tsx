import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Crosshair,
  X,
  CheckCircle2,
  Building2,
  Navigation,
  Loader2,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { Language, TRANSLATIONS } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (locationData: {
    address: string;
    neighborhood: string;
    city: string;
    lat: number;
    lng: number;
  }) => void;
  currentLang: Language;
  initialAddress?: string;
}

// Famous Iraqi/Regional neighborhoods dictionary for quick reverse fallback
const IRAQ_NEIGHBORHOODS = [
  { city: 'بغداد', name: 'المنصور - شارع الأميرات', lat: 33.3152, lng: 44.3661 },
  { city: 'بغداد', name: 'الكرادة - شارع العرصات', lat: 33.3008, lng: 44.4215 },
  { city: 'بغداد', name: 'الجادرية - قرب الجامعة', lat: 33.2785, lng: 44.3902 },
  { city: 'بغداد', name: 'زيونة - شارع الربيعي', lat: 33.328, lng: 44.455 },
  { city: 'بغداد', name: 'الحارثية - شارع الكندي', lat: 33.308, lng: 44.375 },
  { city: 'بغداد', name: 'حي الجامعة - الشارع العام', lat: 33.301, lng: 44.332 },
  { city: 'أربيل', name: 'عينكاوة - الشارع الرئيسي', lat: 36.2238, lng: 43.9926 },
  { city: 'أربيل', name: '100 متري - قرب مجدي مول', lat: 36.1912, lng: 44.0091 },
  { city: 'النجف', name: 'الحي الجامعي - شارع الكوفة', lat: 32.0259, lng: 44.3462 },
  { city: 'البصرة', name: 'الجزائر - شارع 14 تموز', lat: 30.5081, lng: 47.8183 },
  { city: 'السليمانية', name: 'سرتشinar - شارع سالم', lat: 35.557, lng: 45.435 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSaveLocation,
  currentLang,
  initialAddress = '',
}) => {
  const t = TRANSLATIONS[currentLang];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Default coordinates: Baghdad center
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 33.3152,
    lng: 44.3661,
  });

  const [city, setCity] = useState<string>('بغداد');
  const [neighborhood, setNeighborhood] = useState<string>('المنصور - شارع الأميرات');
  const [detailedNotes, setDetailedNotes] = useState<string>(initialAddress || '');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Initialize or re-center map when opened
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Create Map
        const map = L.map(mapContainerRef.current, {
          center: [coords.lat, coords.lng],
          zoom: 14,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Custom Pulsing Pin Icon
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; items-center; justify-content: center;">
              <div style="position: absolute; inset: 0; background-color: rgba(232, 163, 61, 0.35); border-radius: 50%; animation: ping 1.5s infinite;"></div>
              <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #e8a33d, #c97b3d); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <span style="font-size: 18px; line-height: 1;">📍</span>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const newPos = marker.getLatLng();
          updateLocationFromCoords(newPos.lat, newPos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          updateLocationFromCoords(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Function to update location details from lat/lng
  const updateLocationFromCoords = async (lat: number, lng: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    setCoords({ lat, lng });

    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
      markerInstanceRef.current.setLatLng([lat, lng]);
    }

    // Attempt reverse geocoding via Nominatim API with fallback to nearest neighborhood
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const detectedCity =
            data.address.city || data.address.state || data.address.governorate || 'بغداد';
          const detectedSub =
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.quarter ||
            data.address.road ||
            'حي سكني';

          setCity(detectedCity);
          setNeighborhood(`${detectedCity} - ${detectedSub}`);
          if (!detailedNotes) {
            setDetailedNotes(`${detectedCity}، ${detectedSub}`);
          }
          return;
        }
      }
    } catch {
      // Fallback: match closest Iraqi neighborhood in local list
    }

    // Fallback nearest neighborhood matching
    let closest = IRAQ_NEIGHBORHOODS[0];
    let minDistance = Number.MAX_VALUE;

    IRAQ_NEIGHBORHOODS.forEach((item) => {
      const dist = Math.hypot(item.lat - lat, item.lng - lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = item;
      }
    });

    setCity(closest.city);
    setNeighborhood(closest.name);
    if (!detailedNotes) {
      setDetailedNotes(`${closest.city}، ${closest.name}`);
    }
  };

  // Get User Current GPS Location
  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      alert(
        currentLang === 'en'
          ? 'Geolocation is not supported by your browser.'
          : 'تحديد الموقع الجغرافي غير مدعوم في متصفحك.'
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        updateLocationFromCoords(latitude, longitude);

        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        // Fallback to default Mansour Baghdad
        updateLocationFromCoords(33.3152, 44.3661);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick preset neighborhood select
  const handleSelectPresetNeighborhood = (item: (typeof IRAQ_NEIGHBORHOODS)[0]) => {
    updateLocationFromCoords(item.lat, item.lng);
  };

  // Save and submit
  const handleConfirmSave = () => {
    const finalAddressString = detailedNotes.trim()
      ? detailedNotes
      : `${city}، ${neighborhood}`;

    onSaveLocation({
      address: finalAddressString,
      neighborhood: neighborhood,
      city: city,
      lat: coords.lat,
      lng: coords.lng,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-[#1b1d28] border border-[#2e3140] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 bg-[#12131a] border-b border-[#2e3140] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8a33d]/20 to-[#c97b3d]/10 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                  {t.selectLocationOnMap}
                </h3>
                <p className="text-xs text-[#9b98a6] font-cairo">
                  حرك الخريطة أو اضغط على الزر لتثبيت حيّك وموقعك بالدقة
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              id="close-location-modal-btn"
              className="w-9 h-9 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#9b98a6] hover:text-[#f3efe6] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
            {/* GPS Detection Bar & Quick Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleDetectGPSLocation}
                disabled={isLocating}
                id="detect-gps-location-btn"
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-bold text-xs sm:text-sm font-cairo flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-[#e8a33d]/20 transition-all cursor-pointer shrink-0"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تحديد موقعك GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4" />
                    <span>{t.detectLocationBtn}</span>
                  </>
                )}
              </button>

              {/* Quick Search filter for preset neighborhoods */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن حي أو منطقة (مثل: المنصور، عينكاوة)..."
                  className="w-full h-11 px-3 pr-9 bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs sm:text-sm text-[#f3efe6] placeholder-[#9b98a6]/60 font-cairo outline-none"
                />
                <Search className="w-4 h-4 text-[#9b98a6] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Success Toast */}
            <AnimatePresence>
              {showSuccessToast && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-cairo flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t.locationDetectedSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Map Canvas Container */}
            <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#2e3140] bg-[#12131a]">
              <div ref={mapContainerRef} className="w-full h-full z-10" />

              {/* Map Floating Location Info Badge */}
              <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
                <div className="bg-[#12131a]/90 backdrop-blur-md p-2.5 rounded-xl border border-[#e8a33d]/30 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Navigation className="w-4 h-4 text-[#e8a33d] shrink-0 animate-bounce" />
                    <span className="text-xs font-bold text-[#f3efe6] font-cairo truncate">
                      {neighborhood}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#e8a33d] font-plex bg-[#e8a33d]/10 px-2 py-0.5 rounded-md border border-[#e8a33d]/20 shrink-0">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Preset Neighborhood Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#9b98a6] font-cairo block">
                اختر حياً سكنياً معروفاً بسرعة:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {IRAQ_NEIGHBORHOODS.filter(
                  (item) => !searchQuery || item.name.includes(searchQuery) || item.city.includes(searchQuery)
                ).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetNeighborhood(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-cairo border transition-all shrink-0 cursor-pointer ${
                      neighborhood === item.name
                        ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-[#e8a33d] font-bold'
                        : 'bg-[#232634] border-[#2e3140] text-[#9b98a6] hover:text-[#f3efe6] hover:border-[#9b98a6]'
                    }`}
                  >
                    📍 {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Neighborhood & Street Details Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#9b98a6] font-cairo block">
                تفاصيل العنوان والحي المخصص:
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={detailedNotes}
                  onChange={(e) => setDetailedNotes(e.target.value)}
                  placeholder="مثال: بغداد، المنصور - شارع 14 تموز قرب محطة البنزين"
                  className="w-full h-11 px-3 pr-10 bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs sm:text-sm text-[#f3efe6] placeholder-[#9b98a6]/60 font-cairo outline-none"
                />
                <Building2 className="w-4 h-4 text-[#9b98a6] absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-[#12131a] border-t border-[#2e3140] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              id="cancel-location-save-btn"
              className="h-11 px-4 rounded-xl bg-transparent border border-[#2e3140] hover:border-[#9b98a6] text-[#f3efe6] text-xs sm:text-sm font-cairo transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              id="save-selected-location-btn"
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-extrabold text-xs sm:text-sm font-cairo shadow-lg shadow-[#e8a33d]/25 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.saveLocationBtn}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
