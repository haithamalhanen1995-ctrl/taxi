import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { reverseGeocodeIraqLocation, fetchOsrmRoute } from '../data/iraqLocations';

export interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
}

interface LiveCustomerMapProps {
  pickupPoint?: LocationPoint | null;
  destinationPoint?: LocationPoint | null;
  pickupLat?: number;
  pickupLng?: number;
  pickupName?: string;
  destLat?: number;
  destLng?: number;
  destName?: string;
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
  } | null;
  distanceKm?: number | null;
  bookingStatus?: 'idle' | 'searching' | 'confirmed' | 'in_trip' | 'completed';
  onMapClick?: (lat: number, lng: number) => void;
  onPickupDragEnd?: (lat: number, lng: number) => void;
  onDestDragEnd?: (lat: number, lng: number) => void;
  onCenterLocationChange?: (lat: number, lng: number, name: string) => void;
  onRouteDistanceCalculated?: (distKm: number, durationMin: number) => void;
  onRecenterClick?: () => void;
}

export const LiveCustomerMap: React.FC<LiveCustomerMapProps> = ({
  pickupPoint,
  destinationPoint,
  pickupLat,
  pickupLng,
  pickupName,
  destLat,
  destLng,
  destName,
  driverLocation,
  distanceKm,
  bookingStatus = 'idle',
  onMapClick,
  onPickupDragEnd,
  onDestDragEnd,
  onCenterLocationChange,
  onRouteDistanceCalculated,
  onRecenterClick,
}) => {
  // Helper to validate lat/lng numbers
  const isValidCoord = (val: any): val is number => typeof val === 'number' && Number.isFinite(val);
  const isValidPoint = (p: LocationPoint | null | undefined): p is LocationPoint =>
    Boolean(p && isValidCoord(p.lat) && isValidCoord(p.lng));

  // Compute effective pickup & destination points safely
  const effectivePickupPoint: LocationPoint | null =
    pickupPoint && isValidPoint(pickupPoint)
      ? pickupPoint
      : (isValidCoord(pickupLat) && isValidCoord(pickupLng)
          ? { lat: pickupLat, lng: pickupLng, name: pickupName || 'موقع الانطلاق' }
          : null);

  const effectiveDestPoint: LocationPoint | null =
    destinationPoint && isValidPoint(destinationPoint)
      ? destinationPoint
      : (isValidCoord(destLat) && isValidCoord(destLng)
          ? { lat: destLat, lng: destLng, name: destName || 'الوجهة' }
          : null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const driverRoutePolylineRef = useRef<L.Polyline | null>(null);
  const taxiMarkersRef = useRef<L.Marker[]>([]);
  const activeTaxiMarkerRef = useRef<L.Marker | null>(null);
  const activeAnimFrameRef = useRef<number | null>(null);
  const activeLoopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callback refs to avoid stale closures in Leaflet events
  const onPickupDragEndRef = useRef(onPickupDragEnd);
  onPickupDragEndRef.current = onPickupDragEnd;
  const onDestDragEndRef = useRef(onDestDragEnd);
  onDestDragEndRef.current = onDestDragEnd;
  const onCenterLocationChangeRef = useRef(onCenterLocationChange);
  onCenterLocationChangeRef.current = onCenterLocationChange;
  const onRouteDistanceCalculatedRef = useRef(onRouteDistanceCalculated);
  onRouteDistanceCalculatedRef.current = onRouteDistanceCalculated;

  // Map Tile Style State & Layers Menu Toggle State
  const [mapType, setMapType] = useState<'osm' | 'google' | 'satellite' | 'dark'>('osm');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [activeTaxiProgress, setActiveTaxiProgress] = useState<number>(0);
  const [mapErrorMsg, setMapErrorMsg] = useState<string | null>(null);
  
  // Center Pin & Panning State (Uber/Snapp Style)
  const [isMapPanning, setIsMapPanning] = useState<boolean>(false);
  const [centerStreetName, setCenterStreetName] = useState<string>('جاري تحديد الشارع...');
  const [isGeocodingCenter, setIsGeocodingCenter] = useState<boolean>(false);

  // Kurdistan Region central initial point (covering Duhok, Erbil, Sulaymaniyah)
  const kurdistanCenterLat = 36.5000;
  const kurdistanCenterLng = 44.0000;

  const initialLat = isValidPoint(effectivePickupPoint) ? effectivePickupPoint.lat : kurdistanCenterLat;
  const initialLng = isValidPoint(effectivePickupPoint) ? effectivePickupPoint.lng : kurdistanCenterLng;
  const initialZoom = isValidPoint(effectivePickupPoint) ? 14 : 9;

  // Format Distance Display
  const formattedDistance = (isValidCoord(distanceKm) && distanceKm > 0)
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} متر`
      : `${distanceKm.toFixed(1)} كم`
    : null;

  // Helper function to create map tile layers
  const createTileLayer = (type: 'osm' | 'google' | 'satellite' | 'dark'): L.TileLayer => {
    if (type === 'osm') {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
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
        attribution: '&copy; Google Maps Satellite',
      });
    } else {
      return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; CartoDB',
      });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const initialLayer = createTileLayer(mapType);
    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Map Click
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick && e?.latlng && isValidCoord(e.latlng.lat) && isValidCoord(e.latlng.lng)) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Panning start / end listeners for Snapp/Uber center pin feedback
    map.on('movestart', () => {
      setIsMapPanning(true);
    });

    let moveendTimer: NodeJS.Timeout | null = null;
    map.on('moveend', () => {
      setIsMapPanning(false);
      if (moveendTimer) clearTimeout(moveendTimer);

      moveendTimer = setTimeout(async () => {
        const center = map.getCenter();
        if (center && isValidCoord(center.lat) && isValidCoord(center.lng)) {
          setIsGeocodingCenter(true);
          try {
            const street = await reverseGeocodeIraqLocation(center.lat, center.lng);
            setCenterStreetName(street);
          } catch {
            setCenterStreetName(`موقع (${center.lat.toFixed(3)}, ${center.lng.toFixed(3)})`);
          } finally {
            setIsGeocodingCenter(false);
          }
        }
      }, 300);
    });

    mapInstanceRef.current = map;
    setIsMapReady(true);

    // Initial reverse geocode for center
    reverseGeocodeIraqLocation(initialLat, initialLng).then((street) => {
      setCenterStreetName(street);
    }).catch(() => {
      setCenterStreetName('إقليم كردستان (أربيل، دهوك، السليمانية)');
    });

    // Live Moving Taxis in Kurdistan
    const createTaxiIcon = () =>
      L.divIcon({
        className: 'custom-taxi-icon',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: #e8a33d;
            border: 2px solid #12131a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 0 12px rgba(232, 163, 61, 0.6);
            transform: scale(1);
            transition: all 0.3s ease;
          ">
            🚕
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

    const cLat = initialLat;
    const cLng = initialLng;
    const taxis = [
      { lat: cLat + 0.005, lng: cLng + 0.004 },
      { lat: cLat - 0.004, lng: cLng - 0.006 },
      { lat: cLat + 0.003, lng: cLng - 0.007 },
    ].filter((p) => isValidCoord(p.lat) && isValidCoord(p.lng));

    const markers = taxis.map((pos) => L.marker([pos.lat, pos.lng], { icon: createTaxiIcon() }).addTo(map));
    taxiMarkersRef.current = markers;

    const interval = setInterval(() => {
      markers.forEach((m) => {
        const currentPos = m.getLatLng();
        if (currentPos && isValidCoord(currentPos.lat) && isValidCoord(currentPos.lng)) {
          const deltaLat = (Math.random() - 0.5) * 0.0012;
          const deltaLng = (Math.random() - 0.5) * 0.0012;
          const newLat = currentPos.lat + deltaLat;
          const newLng = currentPos.lng + deltaLng;
          if (isValidCoord(newLat) && isValidCoord(newLng)) {
            m.setLatLng([newLat, newLng]);
          }
        }
      });
    }, 2500);

    return () => {
      clearInterval(interval);
      if (moveendTimer) clearTimeout(moveendTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = createTileLayer(mapType);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Update Pickup, Destination, and OSRM Road Routing Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.invalidateSize();

    // 1. Pickup Marker (Turquoise #2fa6a6)
    if (isValidPoint(effectivePickupPoint)) {
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; cursor: grab;">
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                background: rgba(47, 166, 166, 0.45);
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                position: relative;
                width: 40px;
                height: 40px;
                background: #2fa6a6;
                border: 3px solid #12131a;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: bold;
                font-size: 20px;
                box-shadow: 0 0 25px rgba(47, 166, 166, 0.95);
              ">
                📍
              </div>
            </div>
            <div style="
              background: #12131a;
              color: #2fa6a6;
              border: 1.5px solid #2fa6a6;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 800;
              font-family: Cairo, sans-serif;
              margin-top: 3px;
              white-space: nowrap;
              box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            ">
              الانطلاق 🟢
            </div>
          </div>
        `,
        iconSize: [120, 75],
        iconAnchor: [60, 22],
      });

      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([effectivePickupPoint.lat, effectivePickupPoint.lng]);
        pickupMarkerRef.current.setIcon(pickupIcon);
        pickupMarkerRef.current.setZIndexOffset(4000);
      } else {
        const marker = L.marker([effectivePickupPoint.lat, effectivePickupPoint.lng], {
          icon: pickupIcon,
          draggable: true,
          zIndexOffset: 4000,
        }).addTo(map);

        marker.on('dragend', (e: L.LeafletEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          if (pos && isValidCoord(pos.lat) && isValidCoord(pos.lng)) {
            if (onPickupDragEndRef.current) {
              onPickupDragEndRef.current(pos.lat, pos.lng);
            }
          }
        });

        pickupMarkerRef.current = marker;
      }
    } else if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    // 2. Destination Marker (Purple #b15fce)
    if (isValidPoint(effectiveDestPoint)) {
      const destIcon = L.divIcon({
        className: 'custom-dest-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; cursor: grab;">
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                background: rgba(177, 95, 206, 0.45);
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                position: relative;
                width: 40px;
                height: 40px;
                background: #b15fce;
                border: 3px solid #12131a;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: bold;
                font-size: 20px;
                box-shadow: 0 0 25px rgba(177, 95, 206, 0.95);
              ">
                🏁
              </div>
            </div>
            <div style="
              background: #12131a;
              color: #b15fce;
              border: 1.5px solid #b15fce;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 800;
              font-family: Cairo, sans-serif;
              margin-top: 3px;
              white-space: nowrap;
              box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            ">
              الوجهة 🏁
            </div>
          </div>
        `,
        iconSize: [120, 75],
        iconAnchor: [60, 22],
      });

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([effectiveDestPoint.lat, effectiveDestPoint.lng]);
        destMarkerRef.current.setIcon(destIcon);
        destMarkerRef.current.setZIndexOffset(3500);
      } else {
        const marker = L.marker([effectiveDestPoint.lat, effectiveDestPoint.lng], {
          icon: destIcon,
          draggable: true,
          zIndexOffset: 3500,
        }).addTo(map);

        marker.on('dragend', (e: L.LeafletEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          if (pos && isValidCoord(pos.lat) && isValidCoord(pos.lng)) {
            if (onDestDragEndRef.current) {
              onDestDragEndRef.current(pos.lat, pos.lng);
            }
          }
        });

        destMarkerRef.current = marker;
      }
    } else if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    // 3. Driver Marker (if driverLocation provided)
    if (driverLocation && isValidCoord(driverLocation.lat) && isValidCoord(driverLocation.lng)) {
      const driverIcon = L.divIcon({
        className: 'custom-driver-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 110px;">
            <div style="
              width: 44px;
              height: 44px;
              background: linear-gradient(135deg, #2fa6a6 0%, #1e6b6b 100%);
              border: 3px solid #12131a;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              box-shadow: 0 0 25px rgba(47, 166, 166, 0.95);
            ">
              🚕
            </div>
            <div style="
              background: #12131a;
              color: #2fa6a6;
              border: 1.5px solid #2fa6a6;
              padding: 2px 7px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 800;
              margin-top: 2px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.8);
            ">
              موقع الكابتن (حي) 📡
            </div>
          </div>
        `,
        iconSize: [110, 70],
        iconAnchor: [55, 22],
      });

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      } else {
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: driverIcon,
          zIndexOffset: 4500,
        }).addTo(map);
      }

      // Draw real-time driver route line (from driver to pickup or destination)
      const targetPoint = isValidPoint(effectivePickupPoint) ? effectivePickupPoint : effectiveDestPoint;
      if (isValidPoint(targetPoint)) {
        const rawLineCoords: [number, number][] = [
          [driverLocation.lat, driverLocation.lng],
          [targetPoint.lat, targetPoint.lng],
        ];
        const lineCoords = rawLineCoords.filter(([lat, lng]) => isValidCoord(lat) && isValidCoord(lng));
        if (lineCoords.length === 2) {
          if (driverRoutePolylineRef.current) {
            driverRoutePolylineRef.current.setLatLngs(lineCoords as [number, number][]);
          } else {
            driverRoutePolylineRef.current = L.polyline(lineCoords as [number, number][], {
              color: '#2fa6a6',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.95,
            }).addTo(map);
          }
        }
      }
    } else {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      if (driverRoutePolylineRef.current) {
        map.removeLayer(driverRoutePolylineRef.current);
        driverRoutePolylineRef.current = null;
      }
    }

    // 4. OSRM Real Road Polyline Connection
    if (isValidPoint(effectivePickupPoint) && isValidPoint(effectiveDestPoint)) {
      let isCancelled = false;
      setMapErrorMsg(null);

      fetchOsrmRoute(
        effectivePickupPoint.lat,
        effectivePickupPoint.lng,
        effectiveDestPoint.lat,
        effectiveDestPoint.lng
      ).then((res) => {
        if (isCancelled || !mapInstanceRef.current) return;

        let routeCoords: [number, number][] = [
          [effectivePickupPoint.lat, effectivePickupPoint.lng],
          [effectiveDestPoint.lat, effectiveDestPoint.lng],
        ];

        if (res && res.geometry && Array.isArray(res.geometry) && res.geometry.length > 0) {
          const validGeom = res.geometry.filter(([lat, lng]) => isValidCoord(lat) && isValidCoord(lng));
          if (validGeom.length > 0) {
            routeCoords = validGeom;
            if (onRouteDistanceCalculatedRef.current && isValidCoord(res.distanceKm)) {
              onRouteDistanceCalculatedRef.current(
                res.distanceKm,
                res.durationMin || Math.ceil(res.distanceKm * 2.2 + 3)
              );
            }
          }
        } else {
          setMapErrorMsg('تعذّر تحميل مسار الشوارع المباشر، جاري التوصيل بخط تقديري');
        }

        const safeRouteCoords = routeCoords.filter(([lat, lng]) => isValidCoord(lat) && isValidCoord(lng));

        if (safeRouteCoords.length >= 2) {
          if (routePolylineRef.current) {
            routePolylineRef.current.setLatLngs(safeRouteCoords);
          } else {
            routePolylineRef.current = L.polyline(safeRouteCoords, {
              color: '#e8a33d',
              weight: 5,
              opacity: 0.9,
              lineJoin: 'round',
            }).addTo(mapInstanceRef.current);
          }

          try {
            const bounds = L.latLngBounds(safeRouteCoords);
            if (bounds && bounds.isValid()) {
              mapInstanceRef.current.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: 18,
                duration: 1.0,
              });
            }
          } catch (err) {
            console.warn('Invalid bounds in flyToBounds:', err);
          }
        }
      }).catch((err) => {
        console.warn('OSRM error handled:', err);
        setMapErrorMsg('تعذّر تحميل بيانات الموقع، حاول مرة أخرى');
      });

      return () => {
        isCancelled = true;
      };
    } else {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }

      if (isValidPoint(effectivePickupPoint)) {
        map.flyTo([effectivePickupPoint.lat, effectivePickupPoint.lng], 15, { duration: 1.0 });
      } else if (isValidPoint(effectiveDestPoint)) {
        map.flyTo([effectiveDestPoint.lat, effectiveDestPoint.lng], 15, { duration: 1.0 });
      }
    }
  }, [isMapReady, effectivePickupPoint?.lat, effectivePickupPoint?.lng, effectiveDestPoint?.lat, effectiveDestPoint?.lng, driverLocation?.lat, driverLocation?.lng]);

  // Active Driver Animation along route (Customer Tracking)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isValidPoint(effectivePickupPoint) || !isValidPoint(effectiveDestPoint) || bookingStatus === 'idle') {
      if (activeAnimFrameRef.current) cancelAnimationFrame(activeAnimFrameRef.current);
      if (activeLoopTimeoutRef.current) clearTimeout(activeLoopTimeoutRef.current);
      if (activeTaxiMarkerRef.current) {
        map.removeLayer(activeTaxiMarkerRef.current);
        activeTaxiMarkerRef.current = null;
      }
      setActiveTaxiProgress(0);
      return;
    }

    const dLat = effectiveDestPoint.lat - effectivePickupPoint.lat;
    const dLng = effectiveDestPoint.lng - effectivePickupPoint.lng;
    const bearingRad = Math.atan2(dLng, dLat);
    const bearingDeg = (bearingRad * 180) / Math.PI;

    const createActiveTaxiIcon = (heading: number, progressPct: number) =>
      L.divIcon({
        className: 'custom-active-taxi-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 140px;">
            <div style="
              position: relative;
              width: 50px;
              height: 50px;
              background: linear-gradient(135deg, #e8a33d 0%, #c97b3d 100%);
              border: 3px solid #12131a;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 25px rgba(232, 163, 61, 0.95);
            ">
              <div style="font-size: 26px; transform: rotate(${heading}deg);">
                🚕
              </div>
            </div>
            <div style="
              background: #12131a;
              color: #e8a33d;
              border: 1.5px solid #e8a33d;
              padding: 3px 9px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 900;
              font-family: Cairo, sans-serif;
              margin-top: 3px;
              white-space: nowrap;
              box-shadow: 0 4px 16px rgba(0,0,0,0.9);
            ">
              <span>${progressPct >= 100 ? 'وصل السائق 🏁' : `التاكسي بالدرب (${progressPct}%) 🚕`}</span>
            </div>
          </div>
        `,
        iconSize: [140, 85],
        iconAnchor: [70, 25],
      });

    if (activeTaxiMarkerRef.current) {
      map.removeLayer(activeTaxiMarkerRef.current);
    }

    const activeMarker = L.marker([effectivePickupPoint.lat, effectivePickupPoint.lng], {
      icon: createActiveTaxiIcon(bearingDeg, 0),
      zIndexOffset: 5000,
    }).addTo(map);

    activeTaxiMarkerRef.current = activeMarker;

    let startTime: number | null = null;
    const durationMs = 15000;

    const startAnimationLoop = () => {
      startTime = performance.now();

      const step = (now: number) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        let progress = elapsed / durationMs;
        if (progress > 1) progress = 1;

        const currentLat = effectivePickupPoint.lat + (effectiveDestPoint.lat - effectivePickupPoint.lat) * progress;
        const currentLng = effectivePickupPoint.lng + (effectiveDestPoint.lng - effectivePickupPoint.lng) * progress;
        const progressPct = Math.round(progress * 100);

        if (activeTaxiMarkerRef.current && isValidCoord(currentLat) && isValidCoord(currentLng)) {
          activeTaxiMarkerRef.current.setLatLng([currentLat, currentLng]);
          activeTaxiMarkerRef.current.setIcon(createActiveTaxiIcon(bearingDeg, progressPct));
        }

        setActiveTaxiProgress(progressPct);

        if (progress < 1) {
          activeAnimFrameRef.current = requestAnimationFrame(step);
        } else {
          activeLoopTimeoutRef.current = setTimeout(() => {
            startAnimationLoop();
          }, 2500);
        }
      };

      activeAnimFrameRef.current = requestAnimationFrame(step);
    };

    startAnimationLoop();

    return () => {
      if (activeAnimFrameRef.current) cancelAnimationFrame(activeAnimFrameRef.current);
      if (activeLoopTimeoutRef.current) clearTimeout(activeLoopTimeoutRef.current);
      if (activeTaxiMarkerRef.current) {
        map.removeLayer(activeTaxiMarkerRef.current);
        activeTaxiMarkerRef.current = null;
      }
    };
  }, [isMapReady, effectivePickupPoint?.lat, effectivePickupPoint?.lng, effectiveDestPoint?.lat, effectiveDestPoint?.lng, bookingStatus]);

  return (
    <div className="w-full h-[280px] sm:h-[320px] rounded-[20px] border border-[#2e3140] relative overflow-hidden shadow-2xl select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#12131a] z-0" />

      {/* Error Message Toast Overlay */}
      {mapErrorMsg && (
        <div className="absolute top-12 left-3 right-3 z-30 p-2 bg-amber-500/90 text-slate-950 font-bold text-xs font-cairo rounded-xl shadow-lg border border-amber-300 flex items-center justify-between">
          <span>⚠️ {mapErrorMsg}</span>
          <button
            onClick={() => setMapErrorMsg(null)}
            className="text-slate-950 hover:bg-amber-400/50 px-2 py-0.5 rounded-lg text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top Corner Compact Map Layer Switcher */}
      <div className="absolute top-2.5 left-2.5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title="طبقات الخارطة"
          aria-label="طبقات الخارطة"
          className="w-9 h-9 rounded-full bg-[#1b1d28]/95 hover:bg-[#232634] text-[#f3efe6] border border-[#2e3140] hover:border-[#e8a33d] shadow-xl flex items-center justify-center text-base transition-all cursor-pointer active:scale-90"
        >
          🗺️
        </button>

        {isLayerMenuOpen && (
          <div className="absolute top-11 left-0 w-36 bg-[#1b1d28]/98 backdrop-blur-md border border-[#2e3140] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-40">
            <button
              type="button"
              onClick={() => { setMapType('osm'); setIsLayerMenuOpen(false); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-right text-[11px] font-bold font-cairo flex items-center justify-between cursor-pointer ${
                mapType === 'osm' ? 'bg-[#e8a33d] text-[#12131a]' : 'text-[#f3efe6] hover:bg-[#232634]'
              }`}
            >
              <span>🗺️ الشوارع</span>
              {mapType === 'osm' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => { setMapType('google'); setIsLayerMenuOpen(false); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-right text-[11px] font-bold font-cairo flex items-center justify-between cursor-pointer ${
                mapType === 'google' ? 'bg-[#4285F4] text-white' : 'text-[#f3efe6] hover:bg-[#232634]'
              }`}
            >
              <span>🌐 كوكل</span>
              {mapType === 'google' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => { setMapType('satellite'); setIsLayerMenuOpen(false); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-right text-[11px] font-bold font-cairo flex items-center justify-between cursor-pointer ${
                mapType === 'satellite' ? 'bg-[#2fa6a6] text-white' : 'text-[#f3efe6] hover:bg-[#232634]'
              }`}
            >
              <span>🛰️ فضائي</span>
              {mapType === 'satellite' && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => { setMapType('dark'); setIsLayerMenuOpen(false); }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-right text-[11px] font-bold font-cairo flex items-center justify-between cursor-pointer ${
                mapType === 'dark' ? 'bg-[#b15fce] text-white' : 'text-[#f3efe6] hover:bg-[#232634]'
              }`}
            >
              <span>🌙 ليلي</span>
              {mapType === 'dark' && <span>✓</span>}
            </button>
          </div>
        )}
      </div>

      {/* Floating Circular Recenter/Location Button at Corner */}
      {onRecenterClick && (
        <div className="absolute top-2.5 right-2.5 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={onRecenterClick}
            id="recenter-map-btn"
            title="موقعي الحالي"
            aria-label="موقعي الحالي"
            className="w-9 h-9 rounded-full bg-[#1b1d28]/95 hover:bg-[#232634] text-[#2fa6a6] border border-[#2e3140] hover:border-[#2fa6a6] shadow-xl flex items-center justify-center text-base transition-all cursor-pointer active:scale-90"
          >
            🎯
          </button>
        </div>
      )}

      {/* Center Pin & Street Name Overlay (Uber / Snapp Style) */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
        <div
          className={`relative -mt-8 flex flex-col items-center transition-transform duration-200 ${
            isMapPanning ? '-translate-y-3 scale-105' : 'translate-y-0 scale-100'
          }`}
        >
          {/* Live Street / Area Name Banner */}
          <div className="px-3 py-1 mb-1 rounded-full bg-[#12131a]/95 text-[#f3efe6] border border-[#e8a33d] text-[11px] font-bold font-cairo shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[#2fa6a6] text-xs">📍</span>
            <span>{isGeocodingCenter ? 'جاري تحديد الشارع...' : centerStreetName}</span>
          </div>

          {/* Central Target Pin */}
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#e8a33d] to-[#f8c168] border-2 border-[#12131a] shadow-[0_0_25px_rgba(232,163,61,0.95)] flex items-center justify-center text-xl font-black text-[#12131a]">
            📍
          </div>

          {/* Dynamic Pin Shadow beneath */}
          <div
            className={`h-2.5 rounded-full bg-[#000000]/70 transition-all duration-200 -mt-1 ${
              isMapPanning ? 'w-3 opacity-30 blur-[2px]' : 'w-5 opacity-80 blur-[1px]'
            }`}
          />
        </div>
      </div>

      {/* Floating Distance & Quick Action Badges */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                const c = mapInstanceRef.current.getCenter();
                if (c && isValidCoord(c.lat) && isValidCoord(c.lng)) {
                  if (onPickupDragEndRef.current) {
                    onPickupDragEndRef.current(c.lat, c.lng);
                  } else if (onMapClick) {
                    onMapClick(c.lat, c.lng);
                  }
                }
              }
            }}
            className="px-3 py-1 rounded-full bg-[#2fa6a6] text-[#12131a] text-[11px] font-black font-cairo shadow-2xl hover:bg-[#258787] active:scale-95 transition-all cursor-pointer border border-[#ffffff]/40 whitespace-nowrap"
          >
            🟢 ثبّت الانطلاق بالمنتصف
          </button>

          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                const c = mapInstanceRef.current.getCenter();
                if (c && isValidCoord(c.lat) && isValidCoord(c.lng)) {
                  if (onDestDragEndRef.current) {
                    onDestDragEndRef.current(c.lat, c.lng);
                  } else if (onMapClick) {
                    onMapClick(c.lat, c.lng);
                  }
                }
              }
            }}
            className="px-3 py-1 rounded-full bg-[#b15fce] text-[#ffffff] text-[11px] font-black font-cairo shadow-2xl hover:bg-[#9745b3] active:scale-95 transition-all cursor-pointer border border-[#ffffff]/40 whitespace-nowrap"
          >
            🏁 ثبّت الوجهة بالمنتصف
          </button>
        </div>

        {formattedDistance && (
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] text-[11px] font-black font-cairo shadow-xl border border-[#f3efe6]/40 whitespace-nowrap">
            📏 {formattedDistance}
          </div>
        )}
      </div>
    </div>
  );
};
