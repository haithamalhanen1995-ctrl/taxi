import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Phone,
  Navigation,
  Clock,
  ShieldCheck,
  MapPin,
  Car,
  Star,
  Zap,
  RotateCcw,
  Layers,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchOsrmRoute, reverseGeocodeIraqLocation } from '../data/iraqLocations';

export interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface DriverTrackingData {
  driverId: string;
  driverName: string;
  phone: string;
  vehicleDetails: string;
  rating: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmH?: number;
}

interface SnappTrackingMapProps {
  pickupPoint: LocationPoint;
  destinationPoint: LocationPoint;
  driverData?: DriverTrackingData | null;
  tripPhase?: 'en_route_to_pickup' | 'arrived_at_pickup' | 'in_trip' | 'completed';
  role?: 'customer' | 'driver' | 'merchant';
  onCallClick?: () => void;
  onPhaseAdvance?: (nextPhase: 'arrived_at_pickup' | 'in_trip' | 'completed') => void;
  mapHeight?: string;
  title?: string;
}

export const SnappTrackingMap: React.FC<SnappTrackingMapProps> = ({
  pickupPoint,
  destinationPoint,
  driverData,
  tripPhase = 'en_route_to_pickup',
  role = 'customer',
  onCallClick,
  onPhaseAdvance,
  mapHeight = '420px',
  title,
}) => {
  const isValidCoord = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  const osrmRoutePolylineRef = useRef<L.Polyline | null>(null);
  const completedPathPolylineRef = useRef<L.Polyline | null>(null);

  const [mapType, setMapType] = useState<'osm' | 'google' | 'satellite' | 'dark'>('osm');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Live Calculated Metrics
  const [etaMin, setEtaMin] = useState<number>(4);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number>(1.8);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Default driver position fallback if none passed
  const currentDriverLat = driverData?.lat ?? pickupPoint.lat - 0.008;
  const currentDriverLng = driverData?.lng ?? pickupPoint.lng - 0.006;
  const currentHeading = driverData?.heading ?? 45;
  const currentSpeed = driverData?.speedKmH ?? (tripPhase === 'in_trip' ? 48 : 32);

  // Helper tile layer creator
  const createTileLayer = (type: 'osm' | 'google' | 'satellite' | 'dark'): L.TileLayer => {
    if (type === 'osm') {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      });
    } else if (type === 'google') {
      return L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      });
    } else if (type === 'satellite') {
      return L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Satellite',
      });
    } else {
      return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; CartoDB Dark',
      });
    }
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [pickupPoint.lat, pickupPoint.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    const layer = createTileLayer(mapType);
    layer.addTo(map);
    tileLayerRef.current = layer;

    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Tile layer updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const newLayer = createTileLayer(mapType);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // 3. Fetch OSRM Road Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Target depends on current trip phase
    const isPhase1 = tripPhase === 'en_route_to_pickup' || tripPhase === 'arrived_at_pickup';
    const targetPoint = isPhase1 ? pickupPoint : destinationPoint;

    fetchOsrmRoute(currentDriverLat, currentDriverLng, targetPoint.lat, targetPoint.lng).then((res) => {
      if (!mapInstanceRef.current) return;

      let coords: [number, number][] = [
        [currentDriverLat, currentDriverLng],
        [targetPoint.lat, targetPoint.lng],
      ];

      if (res && res.geometry && Array.isArray(res.geometry) && res.geometry.length > 0) {
        coords = res.geometry;
        if (isValidCoord(res.distanceKm)) {
          setDistanceRemainingKm(res.distanceKm);
          setEtaMin(Math.max(1, Math.ceil(res.distanceKm * 2.2 + 1)));
        }
      }

      setRouteCoordinates(coords);

      // Render polyline
      if (osrmRoutePolylineRef.current) {
        osrmRoutePolylineRef.current.setLatLngs(coords);
      } else {
        osrmRoutePolylineRef.current = L.polyline(coords, {
          color: isPhase1 ? '#2fa6a6' : '#e8a33d',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapInstanceRef.current);
      }

      // Fit bounds nicely to encompass driver & target
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 17,
          });
        }
      } catch {}
    });
  }, [currentDriverLat, currentDriverLng, pickupPoint.lat, pickupPoint.lng, destinationPoint.lat, destinationPoint.lng, tripPhase]);

  // 4. Update Pickup, Destination, and Driver Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Pickup Marker
    const pickupIcon = L.divIcon({
      className: 'custom-snapp-pickup',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; width: 110px;">
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(47, 166, 166, 0.4); animation: ping 1.8s infinite;"></div>
            <div style="position: relative; width: 38px; height: 38px; background: #2fa6a6; border: 3px solid #12131a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 0 20px rgba(47, 166, 166, 0.9);">
              📍
            </div>
          </div>
          <div style="background: #12131a; color: #2fa6a6; border: 1.5px solid #2fa6a6; padding: 2px 7px; border-radius: 9px; font-size: 10px; font-weight: 800; font-family: Cairo, sans-serif; margin-top: 2px; white-space: nowrap;">
            الانطلاق
          </div>
        </div>
      `,
      iconSize: [110, 65],
      iconAnchor: [55, 20],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickupPoint.lat, pickupPoint.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickupPoint.lat, pickupPoint.lng], {
        icon: pickupIcon,
        zIndexOffset: 3000,
      }).addTo(map);
    }

    // Destination Marker
    const destIcon = L.divIcon({
      className: 'custom-snapp-dest',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; width: 110px;">
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(232, 163, 61, 0.4); animation: ping 1.8s infinite;"></div>
            <div style="position: relative; width: 38px; height: 38px; background: #e8a33d; border: 3px solid #12131a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #12131a; font-weight: bold; font-size: 18px; box-shadow: 0 0 20px rgba(232, 163, 61, 0.9);">
              🏁
            </div>
          </div>
          <div style="background: #12131a; color: #e8a33d; border: 1.5px solid #e8a33d; padding: 2px 7px; border-radius: 9px; font-size: 10px; font-weight: 800; font-family: Cairo, sans-serif; margin-top: 2px; white-space: nowrap;">
            الوجهة
          </div>
        </div>
      `,
      iconSize: [110, 65],
      iconAnchor: [55, 20],
    });

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destinationPoint.lat, destinationPoint.lng]);
    } else {
      destMarkerRef.current = L.marker([destinationPoint.lat, destinationPoint.lng], {
        icon: destIcon,
        zIndexOffset: 3000,
      }).addTo(map);
    }

    // Snapp Rotating Driver Vehicle Marker
    const snappCarIcon = L.divIcon({
      className: 'custom-snapp-driver-car',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; width: 140px;">
          <div style="
            position: relative;
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #e8a33d 0%, #c97b3d 100%);
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(232, 163, 61, 0.95);
          ">
            <div style="
              font-size: 26px;
              transform: rotate(${currentHeading}deg);
              transition: transform 0.4s ease-out;
            ">
              🚕
            </div>
          </div>
          <div style="
            background: #12131a;
            color: #ffffff;
            border: 1.5px solid #e8a33d;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 900;
            font-family: Cairo, sans-serif;
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="color: #e8a33d;">⚡ ${currentSpeed} كم/س</span>
          </div>
        </div>
      `,
      iconSize: [140, 80],
      iconAnchor: [70, 24],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([currentDriverLat, currentDriverLng]);
      driverMarkerRef.current.setIcon(snappCarIcon);
    } else {
      driverMarkerRef.current = L.marker([currentDriverLat, currentDriverLng], {
        icon: snappCarIcon,
        zIndexOffset: 5000,
      }).addTo(map);
    }
  }, [currentDriverLat, currentDriverLng, currentHeading, currentSpeed, pickupPoint.lat, pickupPoint.lng, destinationPoint.lat, destinationPoint.lng]);

  // Recenter map handler
  const handleRecenterOnDriver = () => {
    if (mapInstanceRef.current && isValidCoord(currentDriverLat) && isValidCoord(currentDriverLng)) {
      mapInstanceRef.current.flyTo([currentDriverLat, currentDriverLng], 16, { duration: 0.8 });
    }
  };

  // Status banner text helper
  const getStatusBanner = () => {
    if (tripPhase === 'en_route_to_pickup') {
      return {
        text: 'الكابتن قادم إليك في الطريق (نقطة الانطلاق)',
        sub: `المسافة المتبقية: ${distanceRemainingKm.toFixed(1)} كم`,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: '🚕',
      };
    }
    if (tripPhase === 'arrived_at_pickup') {
      return {
        text: 'الكابتن وصل إلى موقع الانطلاق الآن 📍',
        sub: 'يرجى التوجه إلى السيارة لبدء الرحلة',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: '📍',
      };
    }
    if (tripPhase === 'in_trip') {
      return {
        text: 'جاري التوصيل المباشر إلى الوجهة 🏁',
        sub: `المسافة المتبقية للوصول: ${distanceRemainingKm.toFixed(1)} كم`,
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: '🏁',
      };
    }
    return {
      text: 'تم الوصول وإكمال الرحلة بنجاح 🎉',
      sub: 'شكراً لاستخدامك خدماتنا!',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: '✅',
    };
  };

  const statusInfo = getStatusBanner();

  return (
    <div className="w-full relative rounded-3xl overflow-hidden border border-[#2e3140] shadow-2xl bg-[#12131a] select-none font-cairo">
      {/* Optional Title Bar */}
      {title && (
        <div className="bg-[#1b1d28] px-4 py-2.5 border-b border-[#2e3140] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="text-xs font-black text-[#f3efe6]">{title}</h4>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e8a33d]/20 text-[#e8a33d] font-bold">
            تتبع أونلاين 📡
          </span>
        </div>
      )}

      {/* Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height: mapHeight }}
        className="w-full bg-[#12131a] relative z-0"
      />

      {/* 1. TOP OVERLAY: Snapp Floating Status Card */}
      <div className="absolute top-3 left-3 right-3 z-20 pointer-events-auto">
        <div className="bg-[#1b1d28]/95 backdrop-blur-md border border-[#2e3140] p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e8a33d] to-[#f8c168] text-[#12131a] flex items-center justify-center font-black text-lg shadow-lg">
              {statusInfo.icon}
            </div>
            <div>
              <p className="text-xs font-black text-[#f3efe6]">{statusInfo.text}</p>
              <p className="text-[10px] text-[#9b98a6]">{statusInfo.sub}</p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-[#e8a33d] font-mono">
              ⏳ {etaMin} دقيقة
            </span>
            <span className="text-[10px] text-[#2fa6a6] font-bold font-mono">
              📏 {distanceRemainingKm < 1 ? `${Math.round(distanceRemainingKm * 1000)}m` : `${distanceRemainingKm.toFixed(1)}km`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP RIGHT & LEFT CORNER MAP CONTROLS */}
      <div className="absolute top-20 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenterOnDriver}
          title="تمركز حول موقع السائق"
          className="w-9 h-9 rounded-full bg-[#1b1d28]/95 hover:bg-[#232634] text-[#2fa6a6] border border-[#2e3140] shadow-xl flex items-center justify-center text-base transition-all active:scale-90 cursor-pointer"
        >
          🎯
        </button>

        <button
          type="button"
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title="تبديل الخارطة"
          className="w-9 h-9 rounded-full bg-[#1b1d28]/95 hover:bg-[#232634] text-[#e8a33d] border border-[#2e3140] shadow-xl flex items-center justify-center text-base transition-all active:scale-90 cursor-pointer"
        >
          🗺️
        </button>

        {isLayerMenuOpen && (
          <div className="absolute top-20 right-0 w-32 bg-[#1b1d28] border border-[#2e3140] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-30 text-right">
            <button
              onClick={() => { setMapType('osm'); setIsLayerMenuOpen(false); }}
              className={`w-full p-1.5 rounded text-[11px] font-bold ${mapType === 'osm' ? 'bg-[#e8a33d] text-[#12131a]' : 'text-[#f3efe6]'}`}
            >
              شوارع 🗺️
            </button>
            <button
              onClick={() => { setMapType('google'); setIsLayerMenuOpen(false); }}
              className={`w-full p-1.5 rounded text-[11px] font-bold ${mapType === 'google' ? 'bg-blue-600 text-white' : 'text-[#f3efe6]'}`}
            >
              كوكل 🌐
            </button>
            <button
              onClick={() => { setMapType('satellite'); setIsLayerMenuOpen(false); }}
              className={`w-full p-1.5 rounded text-[11px] font-bold ${mapType === 'satellite' ? 'bg-teal-600 text-white' : 'text-[#f3efe6]'}`}
            >
              فضائي 🛰️
            </button>
          </div>
        )}
      </div>

      {/* 3. BOTTOM OVERLAY: Snapp Driver Profile Card */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
        <div className="bg-[#1b1d28]/95 backdrop-blur-md border border-[#2e3140] p-3 rounded-2xl shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2fa6a6] to-[#258787] text-white flex items-center justify-center font-black text-lg border-2 border-[#e8a33d] shadow-lg">
                  🚕
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#12131a]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-[#f3efe6]">
                    {driverData?.driverName || 'عثمان الفهداوي'}
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>{driverData?.rating || '4.9'}</span>
                  </span>
                </div>

                <p className="text-[10px] text-[#9b98a6] mt-0.5">
                  {driverData?.vehicleDetails || 'تويوتا كامري 2021 (تكسي بغداد)'}
                </p>
              </div>
            </div>

            {/* Direct Call Button */}
            {onCallClick ? (
              <button
                type="button"
                onClick={onCallClick}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 fill-[#12131a]" />
                <span>اتصال</span>
              </button>
            ) : (
              <a
                href={`tel:${driverData?.phone || '07709876543'}`}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5 fill-[#12131a]" />
                <span>اتصال</span>
              </a>
            )}
          </div>

          {/* Driver Controls Step Buttons (When role === 'driver') */}
          {role === 'driver' && onPhaseAdvance && (
            <div className="pt-2 border-t border-[#2e3140] flex items-center justify-between gap-2">
              {tripPhase === 'en_route_to_pickup' && (
                <button
                  type="button"
                  onClick={() => onPhaseAdvance('arrived_at_pickup')}
                  className="w-full py-2.5 rounded-xl bg-[#2fa6a6] hover:bg-[#258787] text-[#12131a] font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  📍 إعلام الزبون بالوصول لموقع الانطلاق
                </button>
              )}

              {tripPhase === 'arrived_at_pickup' && (
                <button
                  type="button"
                  onClick={() => onPhaseAdvance('in_trip')}
                  className="w-full py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#c97b3d] text-[#12131a] font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  🚀 بدء الرحلة بالتوصيل الآن
                </button>
              )}

              {tripPhase === 'in_trip' && (
                <button
                  type="button"
                  onClick={() => onPhaseAdvance('completed')}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  ✅ إنهاء الرحلة وتسليم الزبون
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
