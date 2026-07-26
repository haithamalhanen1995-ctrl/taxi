import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Phone, MessageSquare, X, Car, Clock, Bell, Loader2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';
import { LiveCustomerMap, LocationPoint } from './LiveCustomerMap';
import { SnappTrackingMap } from './SnappTrackingMap';
import { searchLocations, searchLocationsDynamic, geocodeIraqLocationOnline, reverseGeocodeIraqLocation, IraqLocation, IRAQ_LOCATIONS } from '../data/iraqLocations';
import { CustomerFoodDelivery } from './CustomerFoodDelivery';
import { SideDrawer } from './SideDrawer';

import {
  createCustomerRideRequest,
  getCustomerActiveRide,
  getAllRides,
  subscribeToRideUpdates,
  clearActiveRide,
  setRideNoDriverAvailable,
  saveActiveRide,
  RideRequest,
} from '../lib/ridesDatabase';
import {
  isFemaleDriverServiceEnabledForAddress,
  getFemaleDriverServiceTimeout,
} from '../lib/femaleDriverServiceStore';
import {
  subscribeToDriverLocationInFirebase,
  DriverLocationData,
} from '../lib/driverLocationStore';
import {
  getPricingConfig,
  calculateRideBasePrice,
  PRICING_UPDATED_EVENT,
  PricingConfig
} from '../lib/pricingEngine';
import {
  getCustomerWalletBalance,
  topUpCustomerWallet,
  deductCustomerWallet,
} from '../lib/customerWalletStore';
import { subscribeToWalletStore } from '../lib/unifiedWalletStore';
import { MyWalletModal } from './MyWalletModal';

// Haversine formula to compute geographical distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 5.4;
  }
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const res = R * c;
  return Number.isFinite(res) ? res : 5.4;
}

interface CustomerHomeScreenProps {
  currentLang: Language;
  customerId?: string;
  userName?: string;
  onLogout: () => void;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({
  currentLang,
  customerId = 'user-seed-1',
  userName = 'أحمد علي العراقي',
  onLogout,
}) => {
  const currentCustomerId = customerId || userName;
  const t = TRANSLATIONS[currentLang];
  const [activeTab, setActiveTab] = useState<'taxi' | 'food'>('taxi');
  const [selectedCategory, setSelectedCategory] = useState<'economy' | 'comfort' | 'vip'>('economy');

  // Side Drawer State
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [displayedUserName, setDisplayedUserName] = useState(userName);

  useEffect(() => {
    setDisplayedUserName(userName);
  }, [userName]);

  // Locations state
  const [pickupLocation, setPickupLocation] = useState('جاري تحديد موقعك الحالي...');
  const [destinationLocation, setDestinationLocation] = useState('');

  const [pickupPoint, setPickupPoint] = useState<LocationPoint | null>({
    lat: 36.1901,
    lng: 44.0091,
    name: 'أربيل - المركز والقاطون',
  });

  const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [roadDurationMin, setRoadDurationMin] = useState<number | null>(null);

  // Helper to reset calculated route distance and duration on location changes
  const resetRoadDistanceAndDuration = () => {
    setRoadDistanceKm(null);
    setRoadDurationMin(null);
  };

  // Auto-complete suggestion dropdown states & results
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Payment Method choice & E-Wallet state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [walletBalance, setWalletBalance] = useState(() => getCustomerWalletBalance(userName));
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(25000);
  const [topUpCardNumber, setTopUpCardNumber] = useState<string>('5284 **** **** 9012');
  const [walletToast, setWalletToast] = useState<string | null>(null);

  // Female Driver Only Option State
  const [femaleDriverOnly, setFemaleDriverOnly] = useState<boolean>(false);
  const [femaleCountdownSeconds, setFemaleCountdownSeconds] = useState<number | null>(null);
  const [showNoFemaleDriverAlertModal, setShowNoFemaleDriverAlertModal] = useState<boolean>(false);

  const refreshWallet = () => {
    setWalletBalance(getCustomerWalletBalance(userName));
  };

  useEffect(() => {
    refreshWallet();
    const unsub = subscribeToWalletStore(() => {
      refreshWallet();
    });
    return () => unsub();
  }, [userName]);

  const [pickupSearchResults, setPickupSearchResults] = useState<IraqLocation[]>([]);
  const [destSearchResults, setDestSearchResults] = useState<IraqLocation[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  // Automatically fetch live user position via Geolocation API on mount
  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  // Dynamic live search effect for Pickup input
  useEffect(() => {
    let isCancelled = false;
    if (!pickupLocation.trim()) {
      setPickupSearchResults(IRAQ_LOCATIONS.slice(0, 6));
      return;
    }

    setIsSearchingPickup(true);
    const timer = setTimeout(async () => {
      const results = await searchLocationsDynamic(pickupLocation);
      if (!isCancelled) {
        setPickupSearchResults(results);
        setIsSearchingPickup(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pickupLocation]);

  // Dynamic live search effect for Destination input
  useEffect(() => {
    let isCancelled = false;
    if (!destinationLocation.trim()) {
      setDestSearchResults(IRAQ_LOCATIONS.slice(0, 6));
      return;
    }

    setIsSearchingDest(true);
    const timer = setTimeout(async () => {
      const results = await searchLocationsDynamic(destinationLocation);
      if (!isCancelled) {
        setDestSearchResults(results);
        setIsSearchingDest(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [destinationLocation]);

  // Interactive Booking & Tracking State
  const [activeRideData, setActiveRideData] = useState<RideRequest | null>(() => getCustomerActiveRide(currentCustomerId, userName));
  const [bookingStatus, setBookingStatus] = useState<
    'idle' | 'searching' | 'confirmed' | 'in_trip' | 'completed' | 'no_driver_available'
  >(() => {
    const ride = getCustomerActiveRide(currentCustomerId, userName);
    if (!ride) return 'idle';
    if (ride.status === 'pending_driver') return 'searching';
    if (ride.status === 'accepted') return 'confirmed';
    if (ride.status === 'in_trip') return 'in_trip';
    if (ride.status === 'completed') return 'completed';
    if (ride.status === 'no_driver_available') return 'no_driver_available';
    return 'idle';
  });

  // Countdown timer effect for Female Driver search
  useEffect(() => {
    let timer: any;
    if (bookingStatus === 'searching' && femaleDriverOnly && femaleCountdownSeconds !== null) {
      if (femaleCountdownSeconds > 0) {
        timer = setInterval(() => {
          setFemaleCountdownSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);
      } else if (femaleCountdownSeconds === 0) {
        setShowNoFemaleDriverAlertModal(true);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [bookingStatus, femaleDriverOnly, femaleCountdownSeconds]);

  const [driverEta, setDriverEta] = useState(3); // minutes
  const [driverDistMeters, setDriverDistMeters] = useState(650); // meters
  const [driverArrivedAlert, setDriverArrivedAlert] = useState(false);

  // Real-time Firebase Driver Location State
  const [firebaseDriverLocation, setFirebaseDriverLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
    speedKmH?: number;
  } | null>(null);

  // Subscribe to real-time driver location in Firebase Firestore
  useEffect(() => {
    const driverIdToWatch = activeRideData?.driverId || 'user-seed-driver-active';
    const unsubscribe = subscribeToDriverLocationInFirebase(driverIdToWatch, (locationData) => {
      if (locationData && locationData.lat && locationData.lng) {
        setFirebaseDriverLocation({
          lat: locationData.lat,
          lng: locationData.lng,
          heading: locationData.heading || 0,
          speedKmH: locationData.speedKmH || 40,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeRideData?.driverId]);

  // Subscribe to real-time ridesDatabase changes
  useEffect(() => {
    const syncWithRideStore = (ridesList: RideRequest[]) => {
      const myRide = ridesList.find(
        (r) =>
          (r.customerId === currentCustomerId || r.customerName === userName) &&
          r.status !== 'completed' &&
          r.status !== 'cancelled'
      );

      setActiveRideData(myRide || null);

      if (!myRide) {
        setBookingStatus('idle');
        return;
      }

      if (myRide.status === 'pending_driver') {
        setBookingStatus('searching');
      } else if (myRide.status === 'accepted') {
        setBookingStatus('confirmed');
      } else if (myRide.status === 'in_trip') {
        setBookingStatus('in_trip');
        setDriverArrivedAlert(true);
      } else if (myRide.status === 'completed') {
        setBookingStatus('completed');
      } else if (myRide.status === 'no_driver_available') {
        setBookingStatus('no_driver_available');
      }
    };

    // Initial check
    syncWithRideStore(getAllRides());

    // Listener
    const unsubscribe = subscribeToRideUpdates((rides) => {
      syncWithRideStore(rides);
    });

    return () => unsubscribe();
  }, [currentCustomerId, userName]);

  // Calculated Real-time Distance (OSRM road distance preferred, with Haversine fallback * 1.25 for actual roads)
  const currentDistanceKm = (roadDistanceKm && Number.isFinite(roadDistanceKm))
    ? roadDistanceKm
    : (pickupPoint && Number.isFinite(pickupPoint.lat) && Number.isFinite(pickupPoint.lng) && destinationPoint && Number.isFinite(destinationPoint.lat) && Number.isFinite(destinationPoint.lng))
      ? calculateDistanceKm(pickupPoint.lat, pickupPoint.lng, destinationPoint.lat, destinationPoint.lng) * 1.25
      : 5.4;

  // Calculated Real-time Estimated Duration (OSRM duration preferred, with fallback estimate based on distance)
  const currentDurationMin = (roadDurationMin && Number.isFinite(roadDurationMin))
    ? roadDurationMin
    : Math.max(3, Math.ceil(currentDistanceKm * 2.2 + 3));

  // Sync pricing config from localStorage / admin updates
  const [pricingCfg, setPricingCfg] = useState<PricingConfig>(() => getPricingConfig());

  useEffect(() => {
    const handlePricingUpdate = () => {
      setPricingCfg(getPricingConfig());
    };
    window.addEventListener(PRICING_UPDATED_EVENT, handlePricingUpdate);
    return () => window.removeEventListener(PRICING_UPDATED_EVENT, handlePricingUpdate);
  }, []);

  // Calculate prices per vehicle category using official pricing engine
  const prices = {
    economy: calculateRideBasePrice({ distanceKm: currentDistanceKm, durationMin: currentDurationMin, vehicleType: 'economy', config: pricingCfg }).basePrice,
    comfort: calculateRideBasePrice({ distanceKm: currentDistanceKm, durationMin: currentDurationMin, vehicleType: 'comfort', config: pricingCfg }).basePrice,
    vip: calculateRideBasePrice({ distanceKm: currentDistanceKm, durationMin: currentDurationMin, vehicleType: 'vip', config: pricingCfg }).basePrice,
  };

  const durations = {
    economy: currentDurationMin,
    comfort: Math.max(2, Math.round(currentDurationMin * 0.9)),
    vip: Math.max(2, Math.round(currentDurationMin * 0.8)),
  };

  // Handle Geolocation with Reverse Geocoding
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const street = await reverseGeocodeIraqLocation(lat, lng);
          const name = street || `موقعي الحالي المباشر (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          
          setPickupLocation(name);
          setPickupPoint({ lat, lng, name });
          setIsLocating(false);
        },
        async () => {
          // Fallback location: Erbil Castle / Center
          const fallbackLat = 36.1912;
          const fallbackLng = 44.0091;
          const street = await reverseGeocodeIraqLocation(fallbackLat, fallbackLng);
          const name = street || 'أربيل - قلعة أربيل والمركز (موقعي الحالي)';
          
          setPickupLocation(name);
          setPickupPoint({ lat: fallbackLat, lng: fallbackLng, name });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      const fallbackLat = 36.1912;
      const fallbackLng = 44.0091;
      const name = 'أربيل - قلعة أربيل والمركز (موقعي الحالي)';
      
      setPickupLocation(name);
      setPickupPoint({ lat: fallbackLat, lng: fallbackLng, name });
      setIsLocating(false);
    }
  };

  // Handle click on map to set location points
  const handleMapClick = async (lat: number, lng: number) => {
    resetRoadDistanceAndDuration();
    const street = await reverseGeocodeIraqLocation(lat, lng);
    const latLngStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const locationName = street || `موقع على الخارطة (${latLngStr})`;

    if (!pickupPoint || (pickupPoint && destinationPoint)) {
      setPickupLocation(locationName);
      setPickupPoint({ lat, lng, name: locationName });
      setDestinationPoint(null);
      setDestinationLocation('');
    } else {
      setDestinationLocation(locationName);
      setDestinationPoint({ lat, lng, name: locationName });
    }
  };

  const handlePickupDragEnd = async (lat: number, lng: number) => {
    resetRoadDistanceAndDuration();
    const street = await reverseGeocodeIraqLocation(lat, lng);
    setPickupLocation(street);
    setPickupPoint({ lat, lng, name: street });
  };

  const handleDestDragEnd = async (lat: number, lng: number) => {
    resetRoadDistanceAndDuration();
    const street = await reverseGeocodeIraqLocation(lat, lng);
    setDestinationLocation(street);
    setDestinationPoint({ lat, lng, name: street });
  };

  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleGeocodePickupOnline = async (queryStr?: string) => {
    const query = queryStr || pickupLocation;
    if (!query || query.trim().length < 2) return;
    setIsGeocoding(true);
    const result = await geocodeIraqLocationOnline(query);
    setIsGeocoding(false);
    if (result) {
      resetRoadDistanceAndDuration();
      setPickupLocation(result.nameAr);
      setPickupPoint({ lat: result.lat, lng: result.lng, name: result.nameAr });
      setShowPickupSuggestions(false);
    }
  };

  const handleGeocodeDestOnline = async (queryStr?: string) => {
    const query = queryStr || destinationLocation;
    if (!query || query.trim().length < 2) return;
    setIsGeocoding(true);
    const result = await geocodeIraqLocationOnline(query);
    setIsGeocoding(false);
    if (result) {
      resetRoadDistanceAndDuration();
      setDestinationLocation(result.nameAr);
      setDestinationPoint({ lat: result.lat, lng: result.lng, name: result.nameAr });
      setShowDestSuggestions(false);
    }
  };

  const handleSelectPickupSuggestion = (loc: IraqLocation) => {
    resetRoadDistanceAndDuration();
    setPickupLocation(loc.nameAr);
    setPickupPoint({ lat: loc.lat, lng: loc.lng, name: loc.nameAr });
    setShowPickupSuggestions(false);
  };

  const handleSelectDestSuggestion = (loc: IraqLocation) => {
    resetRoadDistanceAndDuration();
    setDestinationLocation(loc.nameAr);
    setDestinationPoint({ lat: loc.lat, lng: loc.lng, name: loc.nameAr });
    setShowDestSuggestions(false);
  };

  // Handle Booking Action
  const handleStartBooking = () => {
    const price = prices[selectedCategory];

    // Check E-Wallet balance if wallet payment chosen
    if (paymentMethod === 'wallet') {
      const currentBal = getCustomerWalletBalance(userName);
      if (currentBal < price) {
        setShowWalletModal(true);
        setWalletToast(`رصيدك الحالي بالمحفظة (${currentBal.toLocaleString()} د.ع) غير كافٍ لسداد سعر الرحلة (${price.toLocaleString()} د.ع). يرجى شحن المحفظة عبر ماستر رافدين أو التحويل للدفع النقدي.`);
        return;
      }
      // Deduct from wallet
      deductCustomerWallet({
        customerId: userName,
        amount: price,
        title: `دفع أجرة رحلة تكسي (${selectedCategory.toUpperCase()})`,
        type: 'ride_payment',
      });
      refreshWallet();
    }

    // If destination is not selected yet, select default landmark so both pins render
    const effectiveDest = destinationPoint || { lat: 36.2085, lng: 43.9855, name: 'أربيل - فاميلي مول (شارع 100)' };
    if (!destinationPoint) {
      setDestinationLocation(effectiveDest.name);
      setDestinationPoint(effectiveDest);
    }
    const effectivePickup = pickupPoint || { lat: 36.1912, lng: 44.0091, name: 'أربيل - قلعة أربيل والمركز' };

    // Create persistent ride request in unified store
    const newRide = createCustomerRideRequest({
      customerId: currentCustomerId,
      customerName: userName,
      customerPhone: '07501234567',
      pickupName: effectivePickup.name,
      pickupLat: effectivePickup.lat,
      pickupLng: effectivePickup.lng,
      destName: effectiveDest.name,
      destLat: effectiveDest.lat,
      destLng: effectiveDest.lng,
      category: selectedCategory,
      fareAmount: price,
      fareFormatted: `${price.toLocaleString()} د.ع`,
      distanceKm: currentDistanceKm,
      durationMin: currentDurationMin,
      femaleDriverOnly: femaleDriverOnly,
    });

    setActiveRideData(newRide);
    setBookingStatus('searching');
    setDriverArrivedAlert(false);
    setDriverEta(3);
    setDriverDistMeters(650);

    if (femaleDriverOnly) {
      const timeoutSecs = getFemaleDriverServiceTimeout(effectivePickup.name);
      setFemaleCountdownSeconds(timeoutSecs);
    } else {
      setFemaleCountdownSeconds(null);
      // Normal 20-second timeout if no driver accepts request
      setTimeout(() => {
        const rides = getAllRides();
        const current = rides.find((r) => r.id === newRide.id);
        if (current && current.status === 'pending_driver') {
          setRideNoDriverAvailable(newRide.id);
          setBookingStatus('no_driver_available');
        }
      }, 20000);
    }
  };

  const handleCancelBooking = () => {
    if (activeRideData) {
      clearActiveRide(activeRideData.id);
    } else {
      clearActiveRide();
    }
    setBookingStatus('idle');
    setActiveRideData(null);
  };

  const handleRetryBooking = () => {
    handleStartBooking();
  };

  const handleSimulateArrival = () => {
    setDriverEta(0);
    setDriverDistMeters(0);
    setDriverArrivedAlert(true);
  };

  return (
    <div className="w-full flex flex-col dir-rtl" dir="rtl">
      {/* 1. Header (رأس الصفحة) */}
      <header className="flex items-center justify-between w-full mb-5 pb-3 border-b border-[#2e3140]/50">
        <div className="flex items-center gap-2.5 text-right">
          <button
            type="button"
            onClick={() => setIsSideDrawerOpen(true)}
            id="open-side-menu-btn"
            title="القائمة الجانبية"
            className="w-10 h-10 rounded-xl bg-[#1b1d28] hover:bg-[#232634] border border-[#2e3140] hover:border-[#e8a33d]/60 text-[#f3efe6] hover:text-[#e8a33d] flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#f3efe6] font-cairo">
              أهلاً، {displayedUserName}
            </h1>
            <p className="text-xs text-[#9b98a6] font-cairo mt-0.5">
              إلى أين نأخذك اليوم؟
            </p>
          </div>
        </div>
      </header>

      {/* 2. Mode Switcher Toggle Tabs (مبدّل وضعين) */}
      <div className="w-full bg-[#232634] border border-[#2e3140] rounded-xl p-1 flex items-center mb-4 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('taxi')}
          id="tab-taxi-booking"
          className={`flex-1 h-10 rounded-lg text-xs sm:text-sm font-bold font-cairo flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'taxi'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-md shadow-[#e8a33d]/25'
              : 'text-[#9b98a6] hover:text-[#f3efe6] bg-transparent'
          }`}
        >
          <span>🚕</span>
          <span>حجز تكسي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('food')}
          id="tab-food-delivery"
          className={`flex-1 h-10 rounded-lg text-xs sm:text-sm font-bold font-cairo flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'food'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-md shadow-[#e8a33d]/25'
              : 'text-[#9b98a6] hover:text-[#f3efe6] bg-transparent'
          }`}
        >
          <span>🍔</span>
          <span>توصيل طعام</span>
        </button>
      </div>

      {activeTab === 'food' ? (
        <CustomerFoodDelivery customerName={userName} currentLang={currentLang} />
      ) : (
        <>
          {/* 2.5 Active Trip Tracking Status Card (حالة تتبع الرحلة في الشاشة الرئيسية) */}
      <AnimatePresence>
        {bookingStatus === 'confirmed' && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            className={`w-full mb-5 rounded-2xl border p-4 shadow-2xl transition-all ${
              driverArrivedAlert
                ? 'bg-gradient-to-r from-emerald-950/90 via-[#1b1d28] to-emerald-900/90 border-emerald-500 ring-2 ring-emerald-500/40'
                : 'bg-[#1b1d28] border-[#e8a33d]/70 ring-1 ring-[#e8a33d]/30'
            }`}
          >
            {/* Header / Alert Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2e3140]">
              <div className="flex items-center gap-2.5">
                <span className={`p-2 rounded-xl text-xl shrink-0 ${driverArrivedAlert ? 'bg-emerald-500/20 text-emerald-400 animate-bounce' : 'bg-[#e8a33d]/20 text-[#e8a33d]'}`}>
                  {driverArrivedAlert ? '🚨' : '🚕'}
                </span>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                      {driverArrivedAlert ? 'وصل السائق إلى موقعك الآن! 🟢' : 'تتبع السائق قادم إليك...'}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-cairo ${driverArrivedAlert ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#e8a33d]/20 text-[#e8a33d] animate-pulse'}`}>
                      {driverArrivedAlert ? 'وصل الان' : 'تتبع مباشر'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9b98a6] font-cairo mt-0.5">
                    {driverArrivedAlert
                      ? 'الكابتن عثمان الفهداوي بانتظارك عند نقطة الانطلاق'
                      : `الكابتن عثمان الفهداوي • تويوتا كامري 2023 أبيض (أربيل 84920)`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBookingStatus('idle')}
                className="px-2.5 py-1 rounded-xl bg-[#12131a] hover:bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] border border-[#2e3140] text-xs font-cairo transition-colors cursor-pointer shrink-0"
              >
                إلغاء
              </button>
            </div>

            {/* Tracking Indicators */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-center font-cairo text-xs">
              <div className="p-2.5 rounded-xl bg-[#12131a] border border-[#2e3140]">
                <span className="text-[10px] text-[#9b98a6] block">المسافة المتبقية</span>
                <span className="font-extrabold text-[#2fa6a6] mt-0.5 block">
                  {driverDistMeters > 0 ? `${driverDistMeters} متر` : '0 متر (وصل)'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#12131a] border border-[#2e3140]">
                <span className="text-[10px] text-[#9b98a6] block">وقت الوصول</span>
                <span className="font-extrabold text-[#e8a33d] mt-0.5 block">
                  {driverEta > 0 ? `${driverEta} دقائق` : 'الآن'}
                </span>
              </div>

              <div className="p-1 rounded-xl bg-[#12131a] border border-[#2e3140] flex items-center justify-center">
                {!driverArrivedAlert ? (
                  <button
                    type="button"
                    onClick={handleSimulateArrival}
                    className="w-full h-full py-1.5 px-2 rounded-lg bg-[#e8a33d]/20 hover:bg-[#e8a33d]/30 text-[#e8a33d] font-bold text-[11px] font-cairo transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#e8a33d]/40"
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span>تنبيه الوصول 🔔</span>
                  </button>
                ) : (
                  <a
                    href="tel:07500000000"
                    className="w-full h-full py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-black text-[11px] font-cairo transition-all flex items-center justify-center gap-1 no-underline"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>اتصال</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Compact Search Inputs (حقلا بحث الموقع المضغوطان) */}
      <div className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-3 mb-4 space-y-2">
        {/* Field 1: Pickup Location */}
        <div className="space-y-1 text-right relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2fa6a6] ring-2 ring-[#2fa6a6]/30 shrink-0 inline-block" />
              <label
                htmlFor="pickup-location-input"
                className="text-[11px] font-bold text-[#9b98a6] font-cairo"
              >
                موقع الانطلاق (من أين؟)
              </label>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              id="use-current-location-btn"
              disabled={isLocating}
              className="text-[10px] font-bold text-[#2fa6a6] hover:underline font-cairo flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              <Navigation className={`w-3 h-3 text-[#2fa6a6] ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'جاري التحديد...' : '📍 موقعي الحالي'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              id="pickup-location-input"
              type="text"
              value={pickupLocation}
              onFocus={() => setShowPickupSuggestions(true)}
              onChange={(e) => {
                const val = e.target.value;
                setPickupLocation(val);
                setShowPickupSuggestions(true);
              }}
              placeholder="ابحث عن منطقة الانطلاق..."
              className="w-full h-9 px-3 bg-[#12131a] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-xs font-cairo outline-none transition-all"
            />

            {/* Pickup Auto-Complete Suggestions Dropdown with Live OSM Search */}
            {showPickupSuggestions && (
              <div className="absolute top-10 left-0 right-0 z-50 bg-[#12131a] border border-[#2e3140] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                <div className="px-3 py-1.5 bg-[#1b1d28] border-b border-[#2e3140] text-[10px] font-bold text-[#9b98a6] font-cairo flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {isSearchingPickup && <Loader2 className="w-3 h-3 animate-spin text-[#2fa6a6]" />}
                    <span>{isSearchingPickup ? 'جاري البحث...' : 'نتائج البحث:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPickupSuggestions(false)}
                    className="text-red-400 hover:underline cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
                {pickupSearchResults.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-[#9b98a6] font-cairo">
                    لم يتم العثور على نتائج. اكتب اسم المدينة أو الحي.
                  </div>
                ) : (
                  pickupSearchResults.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectPickupSuggestion(loc)}
                      className="w-full px-3 py-2 text-right hover:bg-[#232634] border-b border-[#2e3140]/40 text-xs text-[#f3efe6] font-cairo flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                        <MapPin className="w-3.5 h-3.5 text-[#2fa6a6] shrink-0" />
                        <span className="truncate">{loc.nameAr}</span>
                      </span>
                      <span className="text-[10px] text-[#2fa6a6] bg-[#2fa6a6]/10 px-1.5 py-0.5 rounded border border-[#2fa6a6]/30 shrink-0">
                        {loc.city}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visual Connecting Dashed Line */}
        <div className="pr-1 my-0.5">
          <div className="w-0.5 h-3 border-r-2 border-dashed border-[#2e3140] mr-[3px]" />
        </div>

        {/* Field 2: Destination Location */}
        <div className="space-y-1 text-right relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#b15fce] ring-2 ring-[#b15fce]/30 shrink-0 inline-block" />
              <label
                htmlFor="destination-location-input"
                className="text-[11px] font-bold text-[#9b98a6] font-cairo"
              >
                الوجهة (إلى أين؟)
              </label>
            </div>
            {destinationPoint && (
              <span className="text-[10px] text-[#b15fce] font-bold font-cairo">
                محدد ✓
              </span>
            )}
          </div>

          <div className="relative">
            <input
              id="destination-location-input"
              type="text"
              value={destinationLocation}
              onFocus={() => setShowDestSuggestions(true)}
              onChange={(e) => {
                const val = e.target.value;
                setDestinationLocation(val);
                setShowDestSuggestions(true);
              }}
              placeholder="ابحث عن منطقة الوجهة..."
              className="w-full h-9 px-3 bg-[#12131a] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-xs font-cairo outline-none transition-all"
            />

            {/* Collapsible Quick Destination Pills + Suggestions Dropdown (Shows on Focus) */}
            {showDestSuggestions && (
              <div className="absolute top-10 left-0 right-0 z-50 bg-[#12131a] border border-[#2e3140] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                {/* Collapsible Quick Destinations Header Bar */}
                <div className="p-2 bg-[#1b1d28] border-b border-[#2e3140] text-[10px] font-bold text-[#9b98a6] font-cairo space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#b15fce] flex items-center gap-1">
                      {isSearchingDest && <Loader2 className="w-3 h-3 animate-spin text-[#b15fce]" />}
                      <span>{isSearchingDest ? 'جاري البحث...' : 'وجهات سريعة واقتراحات:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDestSuggestions(false)}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>

                  {/* Kurdistan Quick Destinations Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                    {[
                      { id: 'p1', name: 'عنكاوا (أربيل)', lat: 36.2267, lng: 43.9961 },
                      { id: 'p2', name: 'قلعة أربيل', lat: 36.1912, lng: 44.0091 },
                      { id: 'p3', name: 'فاميلي مول (أربيل)', lat: 36.2085, lng: 43.9855 },
                      { id: 'p4', name: 'مازي مول (دهوك)', lat: 36.8520, lng: 42.9910 },
                      { id: 'p5', name: 'شارع سالم (السليمانية)', lat: 35.5570, lng: 45.4350 },
                      { id: 'p6', name: 'سرچنار (السليمانية)', lat: 35.5820, lng: 45.3880 },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => {
                          setDestinationLocation(pill.name);
                          setDestinationPoint({ lat: pill.lat, lng: pill.lng, name: pill.name });
                          setShowDestSuggestions(false);
                        }}
                        className="shrink-0 px-2 py-0.5 rounded-full bg-[#12131a] hover:bg-[#232634] border border-[#2e3140] hover:border-[#b15fce] text-[#f3efe6] transition-all cursor-pointer text-[10px] whitespace-nowrap"
                      >
                        📍 {pill.name}
                      </button>
                    ))}
                  </div>
                </div>

                {destSearchResults.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-[#9b98a6] font-cairo">
                    اكتب اسم المنطقة أو اختر من الوجهات السريعة أعلاه.
                  </div>
                ) : (
                  destSearchResults.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectDestSuggestion(loc)}
                      className="w-full px-3 py-2 text-right hover:bg-[#232634] border-b border-[#2e3140]/40 text-xs text-[#f3efe6] font-cairo flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                        <MapPin className="w-3.5 h-3.5 text-[#b15fce] shrink-0" />
                        <span className="truncate">{loc.nameAr}</span>
                      </span>
                      <span className="text-[10px] text-[#b15fce] bg-[#b15fce]/10 px-1.5 py-0.5 rounded border border-[#b15fce]/30 shrink-0">
                        {loc.city}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Live Map Component (الخارطة الحية التفاعلية المباشرة) */}
      <div className="w-full mb-5 relative">
        {/* Real-time Firebase Driver GPS tracking status badge overlay */}
        {firebaseDriverLocation && (
          <div className="absolute top-3 right-3 z-20 bg-[#12131a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2fa6a6]/50 flex items-center gap-2 shadow-lg text-right">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2fa6a6] animate-ping" />
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-[#2fa6a6] font-cairo flex items-center gap-1">
                📡 تتبع الكابتن المباشر (Firebase)
              </span>
              <span className="text-[10px] text-[#9b98a6] font-mono dir-ltr">
                [{firebaseDriverLocation.lat.toFixed(4)}, {firebaseDriverLocation.lng.toFixed(4)}] • {firebaseDriverLocation.speedKmH || 40} كم/س
              </span>
            </div>
          </div>
        )}

        <LiveCustomerMap
          pickupPoint={pickupPoint}
          destinationPoint={destinationPoint}
          driverLocation={firebaseDriverLocation}
          distanceKm={currentDistanceKm}
          bookingStatus={bookingStatus}
          onMapClick={handleMapClick}
          onPickupDragEnd={handlePickupDragEnd}
          onDestDragEnd={handleDestDragEnd}
          onRecenterClick={handleUseCurrentLocation}
          onRouteDistanceCalculated={(distKm, durationMin) => {
            setRoadDistanceKm(distKm);
            setRoadDurationMin(durationMin);
          }}
        />
      </div>

      {/* 5. Visual Separator & Calculation Summary (فاصل بصري وملخص حساب المسافة والسعر) */}
      <div className="relative flex items-center justify-center my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#2e3140]" />
        </div>
        <div className="relative px-3.5 bg-[#12131a] sm:bg-[#1b1d28] text-xs font-bold text-[#9b98a6] font-cairo flex items-center gap-2 flex-wrap justify-center">
          <span>اختر نوع الفئة</span>
          <span className="text-[11px] bg-[#232634] px-2.5 py-0.5 rounded-full text-[#e8a33d] border border-[#2e3140] font-extrabold flex items-center gap-1">
            📏 المسافة: {currentDistanceKm < 1 ? `${Math.round(currentDistanceKm * 1000)} متر` : `${currentDistanceKm.toFixed(1)} كم`}
          </span>
          <span className="text-[11px] bg-[#232634] px-2.5 py-0.5 rounded-full text-[#2fa6a6] border border-[#2e3140] font-extrabold flex items-center gap-1">
            ⏱️ الوقت المتوقع: {currentDurationMin} دقيقة
          </span>
          {pricingCfg.isPeakActive && (
            <span className="text-[11px] bg-amber-500/20 px-2.5 py-0.5 rounded-full text-amber-400 border border-amber-500/40 font-extrabold flex items-center gap-1 animate-pulse">
              ⚡ تسعير الذروة مفعل (+{Math.round((pricingCfg.peakMultiplier - 1) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* 6. Ride Option Cards (ثلاث بطاقات فئة رحلة بالحساب التلقائي المباشر) */}
      <div className="w-full space-y-3 mb-6">
        {/* Card 1: Economy (اقتصادي) */}
        <button
          type="button"
          onClick={() => setSelectedCategory('economy')}
          id="ride-category-economy"
          className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-right ${
            selectedCategory === 'economy'
              ? 'bg-[#232634] border-[#e8a33d] shadow-lg shadow-[#e8a33d]/15 ring-1 ring-[#e8a33d]/50'
              : 'bg-[#1b1d28] hover:bg-[#232634]/70 border-[#2e3140]'
          }`}
        >
          {/* Right side: Icon + Category Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-[#12131a] border border-[#2e3140] flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🚗
            </div>
            <div className="flex flex-col text-right">
              <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                <span>اقتصادي (Sedan)</span>
                <span className="text-[10px] bg-[#12131a] text-[#9b98a6] px-1.5 py-0.2 rounded font-mono border border-[#2e3140]">
                  ×{pricingCfg.vehicleTypeMultipliers.economy}
                </span>
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo mt-0.5">
                تكسي حديث، مكيف وبسعر موفر
              </p>
            </div>
          </div>

          {/* Left side: Price + Estimated Time */}
          <div className="flex flex-col items-end shrink-0 pl-1">
            <span className="text-base sm:text-lg font-bold text-[#e8a33d] font-plex tracking-tight">
              {prices.economy.toLocaleString()} د.ع
            </span>
            <span className="text-[11px] font-semibold text-[#9b98a6] font-cairo mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#2fa6a6]" />
              <span>{durations.economy} دقائق</span>
            </span>
          </div>
        </button>

        {/* Card 2: Comfort (مريح) */}
        <button
          type="button"
          onClick={() => setSelectedCategory('comfort')}
          id="ride-category-comfort"
          className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-right ${
            selectedCategory === 'comfort'
              ? 'bg-[#232634] border-[#e8a33d] shadow-lg shadow-[#e8a33d]/15 ring-1 ring-[#e8a33d]/50'
              : 'bg-[#1b1d28] hover:bg-[#232634]/70 border-[#2e3140]'
          }`}
        >
          {/* Right side: Icon + Category Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-[#12131a] border border-[#2e3140] flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🚙
            </div>
            <div className="flex flex-col text-right">
              <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                <span>مريح (Comfort)</span>
                <span className="text-[10px] bg-[#12131a] text-[#e8a33d] px-1.5 py-0.2 rounded font-mono border border-[#e8a33d]/30">
                  ×{pricingCfg.vehicleTypeMultipliers.comfort}
                </span>
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo mt-0.5">
                مساحة أوسع وراحة إضافية
              </p>
            </div>
          </div>

          {/* Left side: Price + Estimated Time */}
          <div className="flex flex-col items-end shrink-0 pl-1">
            <span className="text-base sm:text-lg font-bold text-[#e8a33d] font-plex tracking-tight">
              {prices.comfort.toLocaleString()} د.ع
            </span>
            <span className="text-[11px] font-semibold text-[#9b98a6] font-cairo mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#2fa6a6]" />
              <span>{durations.comfort} دقائق</span>
            </span>
          </div>
        </button>

        {/* Card 3: VIP */}
        <button
          type="button"
          onClick={() => setSelectedCategory('vip')}
          id="ride-category-vip"
          className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-right ${
            selectedCategory === 'vip'
              ? 'bg-[#232634] border-[#e8a33d] shadow-lg shadow-[#e8a33d]/15 ring-1 ring-[#e8a33d]/50'
              : 'bg-[#1b1d28] hover:bg-[#232634]/70 border-[#2e3140]'
          }`}
        >
          {/* Right side: Icon + Category Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-[#12131a] border border-[#2e3140] flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🚖
            </div>
            <div className="flex flex-col text-right">
              <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                <span>VIP</span>
                <span className="text-[10px] bg-[#12131a] text-[#e8a33d] px-1.5 py-0.2 rounded font-mono border border-[#e8a33d]/30">
                  ×2.4
                </span>
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo mt-0.5">
                سيارات فاخرة وسائقين مميزين
              </p>
            </div>
          </div>

          {/* Left side: Price + Estimated Time */}
          <div className="flex flex-col items-end shrink-0 pl-1">
            <span className="text-base sm:text-lg font-bold text-[#e8a33d] font-plex tracking-tight">
              {prices.vip.toLocaleString()} د.ع
            </span>
            <span className="text-[11px] font-semibold text-[#9b98a6] font-cairo mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#2fa6a6]" />
              <span>{durations.vip} دقائق</span>
            </span>
          </div>
        </button>
      </div>

      {/* Female Driver Only Option Card */}
      {(() => {
        const isFemaleServiceAvailable = isFemaleDriverServiceEnabledForAddress(pickupPoint?.name || '');
        return (
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-200 mb-3.5 text-right ${
              femaleDriverOnly
                ? 'bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-900/30 ring-1 ring-purple-500/50'
                : 'bg-[#1b1d28] border-[#2e3140] hover:border-[#3e4256]'
            }`}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    femaleDriverOnly
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/50 shadow-inner'
                      : 'bg-[#12131a] text-[#9b98a6] border border-[#2e3140]'
                  }`}
                >
                  👩‍✈️
                </div>
                <div className="flex flex-col text-right">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
                    <span>طلب سائقة نسائية مخصصة</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      بدون رسم إضافي 🌸
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#9b98a6] font-cairo mt-0.5">
                    سائقات موثقات ومجازات لضمان أقصى مستويات الراحة والأمان للزبونات
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!isFemaleServiceAvailable}
                onClick={() => setFemaleDriverOnly(!femaleDriverOnly)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                  !isFemaleServiceAvailable
                    ? 'bg-gray-800/60 text-gray-500 border-gray-700/60 cursor-not-allowed'
                    : femaleDriverOnly
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 font-black shadow-md'
                    : 'bg-[#232634] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
                }`}
              >
                <span>{femaleDriverOnly ? '✓ مفعل' : 'تفعيل الخيار'}</span>
              </button>
            </div>

            {!isFemaleServiceAvailable && (
              <p className="mt-2 text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 font-cairo text-right">
                ⚠️ الخدمة غير متوفرة في هذه المنطقة حالياً (متوفرة بالمناطق الرئيسية في أربيل، بغداد المنصور/الكرادة، السليمانية، النجف).
              </p>
            )}
          </div>
        );
      })()}

      {/* Payment Method Selector (اختيار الدفع فقط - بدون زر الشحن لتقليل الازدحام البصري) */}
      <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-3 sm:p-3.5 mb-3 space-y-2 text-right shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-[#9b98a6] shrink-0">طريقة الدفع:</span>
            
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                paymentMethod === 'cash'
                  ? 'bg-[#e8a33d] text-[#12131a] shadow-md font-black'
                  : 'bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6]'
              }`}
            >
              💵 نقدي
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('wallet');
                refreshWallet();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                paymentMethod === 'wallet'
                  ? 'bg-[#2fa6a6] text-[#12131a] shadow-md font-black'
                  : 'bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6]'
              }`}
            >
              <span>💳 المحفظة</span>
              <span className="text-[10px] bg-[#12131a]/40 px-1.5 py-0.5 rounded font-mono">
                {walletBalance.toLocaleString()} د.ع
              </span>
            </button>
          </div>
        </div>

        {/* Insufficient balance warning message if wallet selected */}
        {paymentMethod === 'wallet' && walletBalance < prices[selectedCategory] && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-2">
            <span>⚠️ رصيدك غير كافٍ، يرجى الشحن من صفحة حسابي</span>
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="px-2.5 py-1 bg-[#e8a33d] hover:bg-[#d8932d] text-[#12131a] rounded-lg font-black text-[11px] shrink-0 cursor-pointer shadow"
            >
              شحن الآن ➔
            </button>
          </div>
        )}
      </div>

      {/* 7. Sticky Booking Button (زر الحجز) */}
      <div className="sticky bottom-0 left-0 right-0 pt-3 pb-1 bg-gradient-to-t from-[#12131a] via-[#12131a]/95 to-transparent backdrop-blur-sm z-30">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleStartBooking}
          id="book-ride-now-btn"
          className="w-full h-13 sm:h-14 rounded-2xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] hover:brightness-110 active:brightness-95 text-[#12131a] font-black text-base sm:text-lg font-cairo shadow-lg shadow-[#e8a33d]/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          <span>حجز تكسي 🚕</span>
        </motion.button>
      </div>

      {/* 8. Interactive Ride Booking Confirmation Modal */}
      <AnimatePresence>
        {bookingStatus !== 'idle' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg bg-[#1b1d28] border border-[#2e3140] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 dir-rtl text-right"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#2e3140]">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#e8a33d]/15 text-[#e8a33d]">
                    <Car className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                      {bookingStatus === 'searching' && 'جاري البحث عن أقرب سائق...'}
                      {bookingStatus === 'no_driver_available' && 'لا يوجد سائق متاح حالياً ⚠️'}
                      {bookingStatus === 'confirmed' && 'تم قبول طلبك! السائق في الطريق إليك 🚕'}
                      {bookingStatus === 'in_trip' && 'الرحلة جارية الآن 🚕'}
                      {bookingStatus === 'completed' && 'تم إنهاء الرحلة بنجاح! 🏁'}
                    </h2>
                    <p className="text-xs text-[#9b98a6] font-cairo">
                      {bookingStatus === 'searching' && 'يرجى الانتظار لحين قبول السائق للطلب'}
                      {bookingStatus === 'no_driver_available' && 'يمكنك المحاولة مجدداً أو إلغاء الطلب'}
                      {bookingStatus === 'confirmed' && 'السائق متجه إلى موقع الانطلاق لاستلامك'}
                      {bookingStatus === 'in_trip' && 'أنتم في الطريق إلى الوجهة المحددة'}
                      {bookingStatus === 'completed' && 'نتمنى لك يوماً سعيداً وممتعاً'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelBooking}
                  className="p-1.5 rounded-xl bg-[#12131a] hover:bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Searching State View */}
              {bookingStatus === 'searching' && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`animate-ping absolute inline-flex h-20 w-20 rounded-full opacity-30 ${
                        femaleDriverOnly ? 'bg-purple-500' : 'bg-[#e8a33d]'
                      }`}
                    />
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl ${
                        femaleDriverOnly
                          ? 'bg-gradient-to-tr from-purple-600 to-pink-500 shadow-purple-900/50'
                          : 'bg-gradient-to-tr from-[#e8a33d] to-[#c97b3d] shadow-[#e8a33d]/30'
                      }`}
                    >
                      {femaleDriverOnly ? '👩‍✈️' : '🚕'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#f3efe6] font-cairo">
                      {femaleDriverOnly
                        ? 'جاري المطابقة مع أقرب سائقة نسائية مخصصة...'
                        : 'جاري إرسال الطلب للشركاء السائقين قرب:'}{' '}
                      <span className={femaleDriverOnly ? 'text-purple-300 font-extrabold' : 'text-[#2fa6a6]'}>
                        {pickupPoint?.name}
                      </span>
                    </p>
                    <p className="text-xs text-[#9b98a6] font-cairo">
                      {femaleDriverOnly
                        ? 'يتم اختيار سائقة موثقة ومتاحة بالقرب من موقعك للوصول بأمان.'
                        : 'سيصلك تنبيه فور قبول السائق للرحلة (تلقائي خلال ثوانٍ)...'}
                    </p>

                    {femaleDriverOnly && femaleCountdownSeconds !== null && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold">
                          ⏱️ مهلة الانتظار للمطابقة: {femaleCountdownSeconds} ثانية
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="mt-2 px-5 py-2 rounded-xl bg-[#232634] hover:bg-red-500/20 text-red-400 border border-[#2e3140] hover:border-red-500/40 text-xs font-bold font-cairo transition-colors cursor-pointer"
                  >
                    إلغاء الطلب
                  </button>
                </div>
              )}

              {/* No Driver Available View */}
              {bookingStatus === 'no_driver_available' && (
                <div className="py-4 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl shadow-lg">
                    ⚠️
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h3 className="text-sm font-bold text-[#f3efe6] font-cairo">
                      عذرًا، لا يوجد سائقون متاحون حاليًا في منطقتك
                    </h3>
                    <p className="text-xs text-[#9b98a6] font-cairo">
                      جميع السائقين مشغولون حالياً. يمكنك إعادة البحث مجدداً أو إلغاء الطلب.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full pt-2">
                    <button
                      type="button"
                      onClick={handleRetryBooking}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-black text-xs font-cairo transition-all cursor-pointer shadow-md"
                    >
                      المحاولة مرة أخرى 🔄
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      className="px-4 py-2.5 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#f3efe6] border border-[#2e3140] text-xs font-bold font-cairo transition-colors cursor-pointer"
                    >
                      إلغاء الطلب
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmed / In Trip View with Snapp Map */}
              {(bookingStatus === 'confirmed' || bookingStatus === 'in_trip') && (
                <div className="space-y-3">
                  {/* Snapp Realtime Map */}
                  <SnappTrackingMap
                    pickupPoint={{
                      lat: pickupPoint?.lat || 36.1901,
                      lng: pickupPoint?.lng || 44.0091,
                      name: pickupPoint?.name || 'موقع الانطلاق',
                    }}
                    destinationPoint={{
                      lat: destinationPoint?.lat || 36.1980,
                      lng: destinationPoint?.lng || 44.0200,
                      name: destinationPoint?.name || 'الوجهة',
                    }}
                    driverData={{
                      driverId: activeRideData?.driverId || 'seed-driver-1',
                      driverName: activeRideData?.driverName || 'الكابتن عثمان الفهداوي',
                      phone: activeRideData?.driverPhone || '07701234567',
                      vehicleDetails: activeRideData?.vehicleModel || 'تويوتا كامري 2023 - أبيض',
                      rating: activeRideData?.driverRating || '4.9',
                      lat: firebaseDriverLocation?.lat || (pickupPoint?.lat ? pickupPoint.lat - 0.005 : 36.1880),
                      lng: firebaseDriverLocation?.lng || (pickupPoint?.lng ? pickupPoint.lng - 0.005 : 44.0050),
                      heading: firebaseDriverLocation?.heading || 45,
                      speedKmH: firebaseDriverLocation?.speedKmH || 42,
                    }}
                    tripPhase={bookingStatus === 'in_trip' ? 'in_trip' : 'en_route_to_pickup'}
                    role="customer"
                    mapHeight="340px"
                    title="تتبع الخارطة المباشر — اسنپ 🚖"
                  />

                  {/* Ride & Tracking Summary Info */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-cairo">
                    <div className="p-2.5 rounded-xl bg-[#12131a] border border-[#2e3140]">
                      <span className="text-[10px] text-[#9b98a6] block">الفئة</span>
                      <span className="font-bold text-[#2fa6a6]">{activeRideData?.categoryNameAr || selectedCategory}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#12131a] border border-[#2e3140]">
                      <span className="text-[10px] text-[#9b98a6] block">مسافة الرحلة</span>
                      <span className="font-bold text-[#e8a33d]">
                        {currentDistanceKm < 1 ? `${Math.round(currentDistanceKm * 1000)}متر` : `${currentDistanceKm.toFixed(1)} كم`}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#12131a] border border-[#2e3140]">
                      <span className="text-[10px] text-[#9b98a6] block">الأجرة المحسوبة</span>
                      <span className="font-bold text-[#2fa6a6]">{activeRideData?.fareFormatted || `${prices[selectedCategory].toLocaleString()} د.ع`}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${activeRideData?.driverPhone || '07701234567'}`}
                      className="flex-1 h-11 rounded-xl bg-[#2fa6a6] hover:bg-[#258d8d] text-[#12131a] font-bold text-xs font-cairo flex items-center justify-center gap-1.5 transition-colors no-underline shadow-lg"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال بالسائق مباشرة</span>
                    </a>

                    <a
                      href={`https://wa.me/964${(activeRideData?.driverPhone || '07701234567').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-11 rounded-xl bg-[#25D366] hover:bg-[#1eb855] text-white font-bold text-xs font-cairo flex items-center justify-center gap-1.5 transition-colors no-underline shadow-lg"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>واتساب</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      className="px-4 h-11 rounded-xl bg-[#232634] hover:bg-red-500/20 text-red-400 border border-[#2e3140] hover:border-red-500/40 text-xs font-bold font-cairo transition-colors cursor-pointer"
                    >
                      إلغاء الطلب
                    </button>
                  </div>
                </div>
              )}

              {/* Completed State View */}
              {bookingStatus === 'completed' && (
                <div className="py-4 space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20">
                    🏁
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#f3efe6] font-cairo">
                      وصلت إلى وجهتك بالسلامة!
                    </h3>
                    <p className="text-xs text-[#9b98a6] font-cairo">
                      نتمنى لك رحلة يومية سعيدة مع تكسيتي.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#12131a] border border-[#2e3140] space-y-2 text-right">
                    <div className="flex items-center justify-between text-xs font-cairo">
                      <span className="text-[#9b98a6]">الأجرة الإجمالية المسددة:</span>
                      <span className="text-base font-bold text-[#e8a33d] font-plex">
                        {activeRideData?.fareFormatted || '6,750 د.ع'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-cairo pt-2 border-t border-[#2e3140]/60">
                      <span className="text-[#9b98a6]">السائق:</span>
                      <span className="font-bold text-[#f3efe6]">
                        {activeRideData?.driverName || 'الكابتن عثمان الفهداوي'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-cairo">
                      <span className="text-[#9b98a6]">الوجهة:</span>
                      <span className="font-bold text-[#2fa6a6] truncate max-w-[200px]">
                        {activeRideData?.destName || destinationPoint?.name}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-black text-sm font-cairo shadow-lg shadow-[#e8a33d]/20 transition-all cursor-pointer"
                  >
                    العودة للرئيسية 🚕
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Alert Modal when No Female Driver is Available after timeout */}
      <AnimatePresence>
        {showNoFemaleDriverAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#1b1d28] border border-purple-500/50 rounded-3xl p-5 shadow-2xl space-y-4 text-right"
            >
              <div className="flex items-center gap-3 border-b border-[#2e3140] pb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                  👩‍✈️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                    لم نجد سائقة متاحة حالياً بمنطقتك
                  </h3>
                  <p className="text-xs text-purple-300/80 font-cairo">
                    استغرق البحث دقيقتين دون قبول طلبك من سائقة كابتن.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#9b98a6] font-cairo leading-relaxed">
                عدد السائقات النشط في هذه المنطقة محدود حالياً. هل تفضلين الانتظار لمدة إضافية أم تحويل الطلب لسائق عادي ليصلك أسرع؟
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const timeoutSecs = getFemaleDriverServiceTimeout(pickupPoint?.name);
                    setFemaleCountdownSeconds(timeoutSecs);
                    setShowNoFemaleDriverAlertModal(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white font-extrabold text-xs font-cairo transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>⌛ الانتظار والبحث مجدداً (دقيقتين)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeRideData) {
                      saveActiveRide({ ...activeRideData, femaleDriverOnly: false });
                    }
                    setFemaleDriverOnly(false);
                    setFemaleCountdownSeconds(null);
                    setShowNoFemaleDriverAlertModal(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#232634] hover:bg-[#2e3140] text-[#f3efe6] border border-[#2e3140] font-extrabold text-xs font-cairo transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>👨 القبول بسائق عادي (تحويل الطلب)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowNoFemaleDriverAlertModal(false);
                    handleCancelBooking();
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs font-cairo transition-all cursor-pointer"
                >
                  إلغاء الطلب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

      {/* Integrated My Wallet Modal */}
      <MyWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        userId={userName}
        userName={userName}
        userRole="customer"
      />

      {/* Side Menu Drawer */}
      <SideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        userId={customerId}
        userName={displayedUserName}
        accountType="customer"
        currentLang={currentLang}
        onLogout={onLogout}
        onProfileUpdated={(newName) => {
          setDisplayedUserName(newName);
        }}
      />
    </div>
  );
};
