import React, { useState, useEffect } from 'react';
import {
  User,
  LogOut,
  Car,
  Star,
  Check,
  X,
  Bell,
  Phone,
  Navigation,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Menu,
  Wallet,
} from 'lucide-react';
import { MyWalletModal } from './MyWalletModal';
import {
  getUserWalletBalance,
  subscribeToWalletStore,
  deductDriverDailySubscription,
  DAILY_SUB_FEE,
} from '../lib/unifiedWalletStore';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { LiveCustomerMap } from './LiveCustomerMap';
import { SideDrawer } from './SideDrawer';
import {
  getDriverStats,
  recordCompletedTrip,
  DriverStats,
} from '../lib/driverDatabase';
import {
  getDriverSubscriptionStatus,
  renewDriverSubscription,
  DAILY_SUBSCRIPTION_FEE_IQD,
} from '../lib/driverSubscription';
import {
  getPricingConfig,
  getDriverPriceOptions,
  calculateCommission,
} from '../lib/pricingEngine';
import {
  getAllRides,
  getPendingRides,
  acceptRideRequestByDriver,
  updateRidePhase,
  completeRide,
  subscribeToRideUpdates,
  RideRequest,
} from '../lib/ridesDatabase';
import { getUsersFromDatabase } from '../lib/userDatabase';
import {
  getDriverFemaleOnlyPref,
  setDriverFemaleOnlyPref,
} from '../lib/femaleDriverServiceStore';
import {
  updateDriverLocationInFirebase,
  subscribeToDriverLocationInFirebase,
  DriverLocationData,
} from '../lib/driverLocationStore';

interface DriverHomeScreenProps {
  currentLang?: Language;
  driverId?: string;
  driverName?: string;
  driverRating?: string;
  onLogout: () => void;
}

export interface IncomingRideRequest {
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
  fareAmount: number;
  fareFormatted: string;
  distanceKm: number;
  femaleDriverOnly?: boolean;
}

export const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({
  currentLang = 'ar',
  driverId = 'user-seed-driver-active',
  driverName = 'عثمان الفهداوي',
  driverRating = '4.9',
  onLogout,
}) => {
  // Side Drawer state
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [displayedDriverName, setDisplayedDriverName] = useState(driverName);

  useEffect(() => {
    setDisplayedDriverName(driverName);
  }, [driverName]);

  // Driver Gender & Female Driver Service Preference State
  const driverRecord = getUsersFromDatabase().find(
    (u) => u.id === driverId || u.username === driverId || u.fullName === displayedDriverName
  );
  const isFemaleDriver =
    driverRecord?.gender === 'female' ||
    (displayedDriverName && (displayedDriverName.includes('مريم') || displayedDriverName.includes('زهراء')));
  const driverGender: 'male' | 'female' = isFemaleDriver ? 'female' : 'male';
  const [femaleOnlyPref, setFemaleOnlyPref] = useState<boolean>(() => getDriverFemaleOnlyPref(driverId));

  const handleToggleFemaleOnlyPref = () => {
    const newVal = !femaleOnlyPref;
    setFemaleOnlyPref(newVal);
    setDriverFemaleOnlyPref(driverId, newVal);
  };

  // Persistent stats state
  const [driverStats, setDriverStats] = useState<DriverStats>(() => getDriverStats(driverId));

  // Sync stats when driverId changes
  useEffect(() => {
    setDriverStats(getDriverStats(driverId));
  }, [driverId]);

  // Driver availability state
  const [isAvailable, setIsAvailable] = useState(true);

  // Driver Subscription state
  const [subStatus, setSubStatus] = useState(() => getDriverSubscriptionStatus(driverId));
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'qi_mastercard' | 'wallet' | 'cash'>('qi_mastercard');

  // Driver Wallet state
  const [driverWalletBalance, setDriverWalletBalance] = useState(() =>
    getUserWalletBalance(driverId, 'driver')
  );
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    const refreshWallet = () => {
      const b = getUserWalletBalance(driverId, 'driver');
      setDriverWalletBalance(b);
    };
    refreshWallet();
    const unsub = subscribeToWalletStore(refreshWallet);
    return () => unsub();
  }, [driverId]);

  // Sync subscription status periodically
  useEffect(() => {
    const status = getDriverSubscriptionStatus(driverId);
    setSubStatus(status);
    if (status.isExpiredAndLocked) {
      setIsAvailable(false);
    }
    const interval = setInterval(() => {
      const updated = getDriverSubscriptionStatus(driverId);
      setSubStatus(updated);
      if (updated.isExpiredAndLocked) {
        setIsAvailable(false);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [driverId]);

  const handleToggleAvailable = () => {
    const currentSub = getDriverSubscriptionStatus(driverId);
    if (currentSub.isExpiredAndLocked) {
      if (driverWalletBalance >= DAILY_SUB_FEE) {
        // Auto-renew using wallet balance!
        deductDriverDailySubscription({ driverId, driverName: displayedDriverName });
        renewDriverSubscription(driverId, 'wallet');
        setSubStatus(getDriverSubscriptionStatus(driverId));
        setIsAvailable(true);
        return;
      } else {
        setIsAvailable(false);
        setIsWalletModalOpen(true);
        return;
      }
    }
    setIsAvailable(!isAvailable);
  };

  const handlePaySubscription = () => {
    renewDriverSubscription(driverId, selectedPayMethod);
    const updated = getDriverSubscriptionStatus(driverId);
    setSubStatus(updated);
    setIsAvailable(true);
    setShowSubscriptionModal(false);
    setSuccessToast('✓ تم دفع الاشتراك اليومي (4,000 د.ع) بنجاح! تم تفعيل استقبال الطلبات.');
  };

  // Track user-declined ride IDs in memory
  const [declinedRideIds, setDeclinedRideIds] = useState<string[]>([]);

  // Incoming Ride Request Modal State
  const [incomingRequest, setIncomingRequest] = useState<IncomingRideRequest | null>(null);
  const [countdown, setCountdown] = useState<number>(12);

  // Active Ride Navigation State (null when not in trip)
  const [activeRide, setActiveRide] = useState<{
    request: IncomingRideRequest;
    phase: 'en_route_to_pickup' | 'en_route_to_destination';
  } | null>(null);

  // Success Toast state upon finishing a trip
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Driver Real-time GPS Location state (Firebase synced)
  const [driverGps, setDriverGps] = useState<{ lat: number; lng: number; heading: number; speedKmH: number }>({
    lat: 36.1912,
    lng: 44.0091,
    heading: 45,
    speedKmH: 40,
  });
  const [isGpsLive, setIsGpsLive] = useState<boolean>(true);

  // Periodic Firebase Live Location Synchronization
  useEffect(() => {
    let intervalId: any;

    if (isGpsLive && isAvailable) {
      intervalId = setInterval(() => {
        setDriverGps((prev) => {
          let targetLat = prev.lat;
          let targetLng = prev.lng;

          if (activeRide && activeRide.request) {
            const isPhase1 = activeRide.phase === 'en_route_to_pickup';
            const reqPickupLat = Number(activeRide.request.pickupLat);
            const reqPickupLng = Number(activeRide.request.pickupLng);
            const reqDestLat = Number(activeRide.request.destLat);
            const reqDestLng = Number(activeRide.request.destLng);

            const destLat = isPhase1
              ? (Number.isFinite(reqPickupLat) ? reqPickupLat : 36.1912)
              : (Number.isFinite(reqDestLat) ? reqDestLat : 36.2085);
            const destLng = isPhase1
              ? (Number.isFinite(reqPickupLng) ? reqPickupLng : 44.0091)
              : (Number.isFinite(reqDestLng) ? reqDestLng : 43.9855);

            const currLat = Number.isFinite(prev.lat) ? prev.lat : 36.1912;
            const currLng = Number.isFinite(prev.lng) ? prev.lng : 44.0091;

            const stepLat = (destLat - currLat) * 0.15;
            const stepLng = (destLng - currLng) * 0.15;

            targetLat = Math.abs(destLat - currLat) > 0.0002 ? currLat + stepLat : destLat;
            targetLng = Math.abs(destLng - currLng) > 0.0002 ? currLng + stepLng : destLng;
          } else {
            const currLat = Number.isFinite(prev.lat) ? prev.lat : 36.1912;
            const currLng = Number.isFinite(prev.lng) ? prev.lng : 44.0091;
            targetLat = currLat + (Math.random() - 0.5) * 0.00015;
            targetLng = currLng + (Math.random() - 0.5) * 0.00015;
          }

          if (!Number.isFinite(targetLat)) targetLat = 36.1912;
          if (!Number.isFinite(targetLng)) targetLng = 44.0091;

          const updatedLoc = {
            lat: targetLat,
            lng: targetLng,
            heading: (prev.heading + 5) % 360,
            speedKmH: activeRide ? 48 : 25,
          };

          // Broadcast to Firebase Firestore
          updateDriverLocationInFirebase({
            driverId,
            driverName: displayedDriverName,
            lat: updatedLoc.lat,
            lng: updatedLoc.lng,
            heading: updatedLoc.heading,
            speedKmH: updatedLoc.speedKmH,
            activeRideId: activeRide ? activeRide.request.id : undefined,
            isOnline: isAvailable,
            updatedAt: new Date().toISOString(),
          });

          return updatedLoc;
        });
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGpsLive, isAvailable, activeRide, driverId, displayedDriverName]);

  // Subscribe to shared ridesDatabase changes
  useEffect(() => {
    const handleCheckRideState = (ridesList: RideRequest[]) => {
      // 1. Check if driver currently has an active ride assigned to them in DB
      const assignedRide = ridesList.find(
        (r) => r.driverId === driverId && (r.status === 'accepted' || r.status === 'in_trip')
      );

      if (assignedRide) {
        setActiveRide({
          request: {
            id: assignedRide.id,
            customerName: assignedRide.customerName,
            customerPhone: assignedRide.customerPhone || '07501234567',
            customerRating: '4.8',
            pickupName: assignedRide.pickupName,
            pickupLat: assignedRide.pickupLat,
            pickupLng: assignedRide.pickupLng,
            destName: assignedRide.destName,
            destLat: assignedRide.destLat,
            destLng: assignedRide.destLng,
            fareAmount: assignedRide.fareAmount,
            fareFormatted: assignedRide.fareFormatted,
            distanceKm: assignedRide.distanceKm,
          },
          phase: assignedRide.driverPhase || 'en_route_to_pickup',
        });
        setIncomingRequest(null);
        return;
      }

      // If active ride locally, verify if it was completed or cancelled
      if (activeRide) {
        const stillActive = ridesList.some(
          (r) => r.id === activeRide.request.id && (r.status === 'accepted' || r.status === 'in_trip')
        );
        if (!stillActive) {
          setActiveRide(null);
        }
      }

      // 2. If pending driver and driver is available & not busy, show request modal for pending rides
      if (isAvailable && !activeRide) {
        const availablePendingRides = getPendingRides(driverGender, femaleOnlyPref);
        const pendingRide = availablePendingRides.find(
          (r) => !declinedRideIds.includes(r.id)
        );

        if (pendingRide) {
          if (!incomingRequest || incomingRequest.id !== pendingRide.id) {
            setIncomingRequest({
              id: pendingRide.id,
              customerName: pendingRide.customerName,
              customerPhone: pendingRide.customerPhone || '07501234567',
              customerRating: '4.8',
              pickupName: pendingRide.pickupName,
              pickupLat: pendingRide.pickupLat,
              pickupLng: pendingRide.pickupLng,
              destName: pendingRide.destName,
              destLat: pendingRide.destLat,
              destLng: pendingRide.destLng,
              fareAmount: pendingRide.fareAmount,
              fareFormatted: pendingRide.fareFormatted,
              distanceKm: pendingRide.distanceKm,
              femaleDriverOnly: pendingRide.femaleDriverOnly,
            });
            setCountdown(12);
          }
        } else {
          // If the pending ride was accepted by another driver or cancelled, dismiss modal
          if (incomingRequest) {
            const stillPending = ridesList.some(
              (r) => r.id === incomingRequest.id && r.status === 'pending_driver'
            );
            if (!stillPending) {
              setIncomingRequest(null);
            }
          }
        }
      }
    };

    // Initial check
    handleCheckRideState(getAllRides());

    // Subscribe
    const unsubscribe = subscribeToRideUpdates((rides) => {
      handleCheckRideState(rides);
    });

    return () => unsubscribe();
  }, [driverId, isAvailable, activeRide, declinedRideIds, incomingRequest]);

  // 1. Countdown timer effect for incoming ride request modal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (incomingRequest) {
      if (countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        // Auto-decline when countdown reaches 0
        handleDeclineRequest();
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [incomingRequest, countdown]);

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (successToast) {
      const timeout = setTimeout(() => {
        setSuccessToast(null);
      }, 4500);
      return () => clearTimeout(timeout);
    }
  }, [successToast]);

  // Helper to trigger a sample incoming ride request for demonstration
  const handleTriggerSampleRequest = () => {
    if (activeRide) return; // cannot receive new request while in trip
    setCountdown(12);
    setIncomingRequest({
      id: `req-${Date.now()}`,
      customerName: 'حيدر العبيدي',
      customerPhone: '07701234567',
      customerRating: '4.9',
      pickupName: 'المنصور - قرب مطعم صمد',
      pickupLat: 33.3128,
      pickupLng: 44.3542,
      destName: 'الكرادة - ساحة الواثق',
      destLat: 33.3052,
      destLng: 44.4225,
      fareAmount: 7250,
      fareFormatted: '7,250 د.ع',
      distanceKm: 5.8,
    });
  };

  // Decline Request Action
  const handleDeclineRequest = () => {
    if (incomingRequest) {
      setDeclinedRideIds((prev) => [...prev, incomingRequest.id]);
    }
    setIncomingRequest(null);
    setCountdown(12);
  };

  // Accept Request Action
  const handleAcceptRequest = () => {
    if (!incomingRequest) return;
    const req = incomingRequest;

    // Update shared database
    const accepted = acceptRideRequestByDriver(req.id, {
      driverId: driverId,
      driverName: driverName || 'عثمان الفهداوي',
      driverPhone: '07701234567',
      driverRating: driverRating || '4.9',
      vehicleModel: 'تويوتا كامري 2023 - أبيض',
      vehiclePlate: 'بغداد 84920 - أ',
    });

    if (accepted) {
      setIncomingRequest(null);
      setCountdown(12);
      // Driver becomes busy / in trip
      setActiveRide({
        request: req,
        phase: 'en_route_to_pickup',
      });
    } else {
      setIncomingRequest(null);
    }
  };

  // Advance Ride Phase / Finish Ride Action
  const handleAdvanceRidePhase = () => {
    if (!activeRide) return;

    if (activeRide.phase === 'en_route_to_pickup') {
      // Advance to Phase 2: En route to destination in shared db
      updateRidePhase(activeRide.request.id, 'en_route_to_destination');

      setActiveRide({
        ...activeRide,
        phase: 'en_route_to_destination',
      });
    } else {
      // Phase 2 -> Finish Ride
      const finishedReq = activeRide.request;

      // Update shared rides database
      completeRide(finishedReq.id);

      // 1. Record completed trip in persistent storage for this specific driver
      const updatedStats = recordCompletedTrip(driverId, {
        customerName: finishedReq.customerName,
        customerPhone: finishedReq.customerPhone,
        customerRating: finishedReq.customerRating,
        pickupName: finishedReq.pickupName,
        pickupLat: finishedReq.pickupLat,
        pickupLng: finishedReq.pickupLng,
        destName: finishedReq.destName,
        destLat: finishedReq.destLat,
        destLng: finishedReq.destLng,
        fareAmount: finishedReq.fareAmount,
        fareFormatted: finishedReq.fareFormatted,
      });

      // 2. Update local state
      setDriverStats(updatedStats);
      setActiveRide(null);
      setIsAvailable(true);

      // 3. Show persistent confirmation toast
      setSuccessToast(`✓ تم إنهاء الرحلة بنجاح، تم إضافة ${finishedReq.fareFormatted} لأرباحك`);
    }
  };

  // ==================== VIEW 1: ACTIVE RIDE NAVIGATION SCREEN ====================
  if (activeRide) {
    const { request, phase } = activeRide;
    const isPhase1 = phase === 'en_route_to_pickup';

    return (
      <div className="w-full text-right font-cairo space-y-4" dir="rtl">
        {/* Top Navigation Status Header */}
        <div
          className={`w-full p-4 rounded-[18px] border flex items-center justify-between gap-3 shadow-lg transition-colors ${
            isPhase1
              ? 'bg-[#1b1d28] border-[#e8a33d]/40 text-[#e8a33d]'
              : 'bg-[#122325] border-[#2fa6a6]/50 text-[#2fa6a6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-sm sm:text-base text-[#f3efe6]">
              {isPhase1 ? '🚗 في الطريق لاستلام الزبون' : '🏁 جارِ التوجه للوجهة'}
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isPhase1
                ? 'bg-[#e8a33d]/20 border-[#e8a33d]/40 text-[#e8a33d]'
                : 'bg-[#2fa6a6]/20 border-[#2fa6a6]/40 text-[#2fa6a6]'
            }`}
          >
            {isPhase1 ? 'المرحلة الأولى' : 'المرحلة الثانية'}
          </span>
        </div>

        {/* Live Navigation Map */}
        <div className="w-full h-64 sm:h-72 rounded-[20px] overflow-hidden border border-[#2e3140] shadow-xl relative">
          {/* Live Firebase GPS status overlay badge */}
          <div className="absolute top-2 right-2 z-20 bg-[#12131a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2fa6a6]/50 flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2fa6a6] animate-ping" />
            <span className="text-[11px] font-bold text-[#2fa6a6] font-cairo">
              📡 تتبع مباشر (Firebase Realtime)
            </span>
            <span className="text-[10px] text-[#f3efe6] font-mono dir-ltr">
              [{driverGps.lat.toFixed(4)}, {driverGps.lng.toFixed(4)}]
            </span>
          </div>

          <LiveCustomerMap
            pickupLat={request.pickupLat}
            pickupLng={request.pickupLng}
            pickupName={request.pickupName}
            destLat={request.destLat}
            destLng={request.destLng}
            destName={request.destName}
            driverLocation={{
              lat: driverGps.lat,
              lng: driverGps.lng,
              heading: driverGps.heading,
            }}
          />
        </div>

        {/* Customer Details Card */}
        <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-[#2e3140] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#232634] border border-[#2fa6a6]/40 flex items-center justify-center text-[#2fa6a6] shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-right">
                <span className="font-extrabold text-sm text-[#f3efe6]">
                  {request.customerName}
                </span>
                <div className="flex items-center gap-1 text-xs text-[#9b98a6]">
                  <Star className="w-3.5 h-3.5 text-[#e8a33d] fill-[#e8a33d]" />
                  <span className="font-bold text-[#f3efe6]">{request.customerRating}</span>
                  <span>• زبون مميز</span>
                </div>
              </div>
            </div>

            {/* Dummy Call Button */}
            <a
              href={`tel:${request.customerPhone}`}
              onClick={(e) => {
                e.preventDefault();
                alert(`اتصال هاتفي بالزبون: ${request.customerPhone}`);
              }}
              className="w-10 h-10 rounded-full bg-[#2fa6a6]/20 border border-[#2fa6a6] text-[#2fa6a6] hover:bg-[#2fa6a6] hover:text-[#12131a] flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md"
              title="اتصال بالزبون"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>

          {/* Route details summary */}
          <div className="space-y-2 text-xs bg-[#12131a] p-3 rounded-xl border border-[#2e3140]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#e8a33d] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#9b98a6] block text-[10px]">موقع الاستلام:</span>
                <span className="text-[#f3efe6] font-bold">{request.pickupName}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[#9b98a6] block text-[10px]">الوجهة النهائية:</span>
                <span className="text-[#f3efe6] font-bold">{request.destName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2e3140]">
              <span className="text-[#9b98a6]">أجرة الرحلة المستحقة:</span>
              <span className="text-sm font-black text-[#e8a33d] font-mono">
                {request.fareFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleAdvanceRidePhase}
          className={`w-full py-3.5 rounded-[16px] text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer active:scale-95 ${
            isPhase1
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] hover:brightness-110'
              : 'bg-gradient-to-r from-[#2fa6a6] to-[#1f7373] text-[#12131a] hover:brightness-110'
          }`}
        >
          {isPhase1 ? (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>وصلت لموقع الزبون</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>إنهاء الرحلة</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // ==================== VIEW 2: DRIVER HOME DASHBOARD ====================
  return (
    <div className="w-full text-right font-cairo space-y-6 relative" dir="rtl">
      {/* SUCCESS TOAST NOTIFICATION */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="bg-[#2fa6a6]/20 border border-[#2fa6a6] text-[#f3efe6] p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#2fa6a6]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-[#9b98a6] hover:text-[#f3efe6] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (رأس الصفحة) */}
      <div className="flex items-center justify-between gap-3 bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-3.5 sm:p-4 shadow-lg">
        {/* Right side: Menu button + Driver Profile Avatar, Name, Rating */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSideDrawerOpen(true)}
            id="driver-open-side-menu-btn"
            title="القائمة الجانبية"
            className="w-10 h-10 rounded-xl bg-[#232634] hover:bg-[#2e3140] border border-[#2e3140] hover:border-[#e8a33d]/60 text-[#f3efe6] hover:text-[#e8a33d] flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-11 h-11 rounded-full bg-[#232634] border border-[#e8a33d]/40 flex items-center justify-center shrink-0 text-[#e8a33d] relative">
            <User className="w-6 h-6" />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#12131a] ${
                isAvailable ? 'bg-[#2fa6a6]' : 'bg-[#9b98a6]'
              }`}
            />
          </div>

          <div className="flex flex-col text-right">
            <span className="font-extrabold text-sm sm:text-base text-[#f3efe6]">
              {displayedDriverName}
            </span>
            <div className="flex items-center gap-1 text-xs text-[#9b98a6] mt-0.5">
              <Star className="w-3.5 h-3.5 text-[#e8a33d] fill-[#e8a33d]" />
              <span className="font-bold text-[#f3efe6] font-mono">{driverRating}</span>
              <span className="text-[10px] text-[#9b98a6]">(كابتن موثق)</span>
            </div>
          </div>
        </div>

        {/* Left side: Outlined Logout Button */}
        <button
          onClick={onLogout}
          className="px-3.5 py-2 border border-[#2e3140] hover:border-red-500/50 hover:bg-red-500/10 text-[#f3efe6] hover:text-red-400 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          title="تسجيل الخروج"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>

      {/* DRIVER WALLET & SUBSCRIPTION SUMMARY CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Wallet Card */}
        <div className="bg-[#1b1d28] border border-[#2fa6a6]/40 rounded-2xl p-3.5 flex items-center justify-between text-right shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2fa6a6]/20 border border-[#2fa6a6]/40 flex items-center justify-center text-[#2fa6a6] shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#9b98a6] block">رصيد محفظة السائق</span>
              <span className="text-base font-black text-[#f3efe6] font-mono">
                {driverWalletBalance.toLocaleString()} د.ع
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#2fa6a6] hover:bg-[#258a8a] text-[#12131a] font-extrabold text-xs shadow cursor-pointer transition-all shrink-0"
          >
            إدارة المحفظة 💳
          </button>
        </div>

        {/* Subscription Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 shadow-md ${
            subStatus.isSubscribed
              ? 'bg-[#1b1d28] border-emerald-500/40 text-[#f3efe6]'
              : subStatus.inGracePeriod
              ? 'bg-[#e8a33d]/10 border-[#e8a33d]/50 text-[#f3efe6]'
              : 'bg-red-500/10 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {subStatus.isSubscribed ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            ) : subStatus.inGracePeriod ? (
              <span className="w-2.5 h-2.5 rounded-full bg-[#e8a33d] animate-ping shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            )}

            <div>
              <span className="block font-black text-xs">
                {subStatus.isSubscribed && `الاشتراك مفعّل ✅ (${subStatus.hoursRemainingInSub}س متبقية)`}
                {subStatus.inGracePeriod && `⚠️ سماح (${subStatus.minutesRemainingInGrace} دقيقة متبقية)`}
                {subStatus.isExpiredAndLocked && `🔒 غير مدفوع - الاستقبال موقوف`}
              </span>
              <span className="text-[10px] text-[#9b98a6] block font-normal">
                رسم اليوم: 4,000 د.ع (يُخصم تلقائياً من المحفظة)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#e8a33d] hover:bg-[#da8f3c] text-[#12131a] font-extrabold text-xs shrink-0 transition-all cursor-pointer shadow-md"
          >
            {subStatus.isSubscribed ? 'شحن / تجديد' : 'دفع 4,000 د.ع'}
          </button>
        </div>
      </div>

      {/* 2. PROMINENT STATUS TOGGLE SWITCH (مفتاح تبديل الحالة الرئيسي) */}
      <motion.div
        layout
        className={`w-full rounded-[18px] p-5 border transition-all duration-300 relative overflow-hidden shadow-xl ${
          isAvailable
            ? 'bg-gradient-to-r from-[#1b1d28] via-[#1c2e32] to-[#122325] border-[#2fa6a6]/50 shadow-[#2fa6a6]/10'
            : 'bg-[#1b1d28] border-[#2e3140] shadow-black/40'
        }`}
      >
        {/* Subtle Ambient Glow Effect inside card */}
        <div
          className={`absolute -left-10 -bottom-10 w-40 h-40 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
            isAvailable ? 'bg-[#2fa6a6]/20 opacity-100' : 'opacity-0'
          }`}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          {/* Right side: Status labels */}
          <div className="space-y-1 text-right">
            <span className="text-xs text-[#9b98a6] font-semibold block">
              الحالة الآن:
            </span>
            <span
              className={`text-base sm:text-lg font-black block transition-colors duration-300 ${
                isAvailable ? 'text-[#2fa6a6]' : 'text-[#9b98a6]'
              }`}
            >
              {isAvailable ? 'متاح لاستقبال الطلبات' : 'غير متاح حاليًا'}
            </span>
            <p className="text-[11px] text-[#9b98a6]/80 font-medium">
              {isAvailable
                ? 'سيتم توجيه الرحلات القريبة إليك تلقائيًا'
                : 'قم بتفعيل المفتاح لتلقي الطلبات الجديدة'}
            </p>
          </div>

          {/* Left side: Large Switch Component */}
          <button
            type="button"
            onClick={handleToggleAvailable}
            className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer shrink-0 flex items-center ${
              isAvailable ? 'bg-[#2fa6a6]' : 'bg-[#2e3140]'
            }`}
            aria-label="تبديل حالة التوفر"
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`w-7 h-7 rounded-full bg-[#f3efe6] shadow-md flex items-center justify-center text-[#12131a] ${
                isAvailable ? 'mr-auto' : 'ml-auto'
              }`}
            >
              {isAvailable ? (
                <Check className="w-4 h-4 text-[#2fa6a6] stroke-[3]" />
              ) : (
                <X className="w-4 h-4 text-[#9b98a6] stroke-[3]" />
              )}
            </motion.div>
          </button>
        </div>
      </motion.div>

      {/* Dedicated Female Driver Order Filter Toggle (Only visible for Female Drivers) */}
      {isFemaleDriver && (
        <div className="bg-gradient-to-r from-purple-950/40 to-pink-950/30 border border-purple-500/50 rounded-[20px] p-4 text-right shadow-lg space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center text-lg shrink-0">
                👩‍✈️
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                  <span>وضع السائقة: استقبال رحلات "النساء فقط"</span>
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.2 rounded-full font-bold">
                    خدمة حصرية 🌸
                  </span>
                </h4>
                <p className="text-[11px] text-purple-200/70 font-cairo mt-0.5">
                  {femaleOnlyPref
                    ? 'أنت تتلقين الآن فقط طلبات الزبونات اللاتي يطلبن سائقة نسائية مخصصة.'
                    : 'أنت تتلقين جميع الطلبات العامة بالإضافة إلى الرحلات النسائية المخصصة.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleFemaleOnlyPref}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer shrink-0 flex items-center ${
                femaleOnlyPref ? 'bg-purple-600' : 'bg-[#2e3140]'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[#12131a] ${
                  femaleOnlyPref ? 'mr-auto' : 'ml-auto'
                }`}
              >
                {femaleOnlyPref ? (
                  <Check className="w-3.5 h-3.5 text-purple-600 stroke-[3]" />
                ) : (
                  <X className="w-3.5 h-3.5 text-gray-400 stroke-[3]" />
                )}
              </motion.div>
            </button>
          </div>
        </div>
      )}

      {/* Demo Action: Trigger Sample Ride Request */}
      {isAvailable && (
        <div className="text-center">
          <button
            onClick={handleTriggerSampleRequest}
            className="w-full py-2.5 bg-[#232634] hover:bg-[#2e3140] border border-[#2fa6a6]/40 text-[#2fa6a6] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <Car className="w-4 h-4 text-[#e8a33d]" />
            <span>محاكاة استلام طلب رحلة جديد 🚕</span>
          </button>
        </div>
      )}

      {/* 3. QUICK STATS GRID (بطاقات إحصائية سريعة - عمودين) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Today's Earnings */}
        <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 text-right space-y-1 shadow-lg relative overflow-hidden group hover:border-[#e8a33d]/40 transition-colors">
          <span className="text-xs font-semibold text-[#9b98a6] block">
            أرباح اليوم (د.ع)
          </span>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-xl sm:text-2xl font-black text-[#e8a33d] font-mono tracking-tight">
              {driverStats.todayEarnings.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#9b98a6] font-extrabold">د.ع</span>
          </div>
          <div className="text-[10px] text-[#2fa6a6] font-bold pt-1 flex items-center gap-1">
            <span>↑ محدّث تلقائيًا</span>
          </div>
        </div>

        {/* Card 2: Today's Trips */}
        <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 text-right space-y-1 shadow-lg relative overflow-hidden group hover:border-[#2fa6a6]/40 transition-colors">
          <span className="text-xs font-semibold text-[#9b98a6] block">
            رحلات اليوم
          </span>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-xl sm:text-2xl font-black text-[#f3efe6] font-mono tracking-tight">
              {driverStats.todayTripsCount}
            </span>
            <span className="text-[10px] text-[#9b98a6] font-extrabold">رحلات مكتملة</span>
          </div>
          <div className="text-[10px] text-[#9b98a6] font-bold pt-1 flex items-center gap-1">
            <span>معدل قبول 100%</span>
          </div>
        </div>
      </div>

      {/* 4. RECENT COMPLETED TRIPS SECTION (قسم "آخر الرحلات") */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-[#2e3140] pb-2">
          <h3 className="text-xs sm:text-sm font-extrabold text-[#9b98a6]">
            آخر الرحلات المكتملة
          </h3>
          <span className="text-[10px] text-[#e8a33d] font-bold">
            {driverStats.completedTrips.length} رحلات مسجلة
          </span>
        </div>

        <div className="space-y-2.5">
          {driverStats.completedTrips.slice(0, 5).map((trip) => (
            <div
              key={trip.id}
              className="bg-[#1b1d28] border border-[#2e3140] hover:border-[#383c4e] rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors shadow-sm"
            >
              {/* Right: Taxi icon & Route details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#232634] border border-[#e8a33d]/30 text-[#e8a33d] flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-[#e8a33d]" />
                </div>

                <div className="flex flex-col text-right min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm text-[#f3efe6] truncate">
                    {trip.pickupName} <span className="text-[#e8a33d] px-1">←</span> {trip.destName}
                  </span>
                  <span className="text-[10px] text-[#9b98a6] mt-0.5">
                    الراكب: {trip.customerName} • {trip.completedAt}
                  </span>
                </div>
              </div>

              {/* Left: Price in Amber */}
              <div className="text-left shrink-0">
                <span className="font-black text-xs sm:text-sm text-[#e8a33d] font-mono block">
                  {trip.fareFormatted}
                </span>
                <span className="text-[9px] text-emerald-400 font-bold block">
                  مكتملة
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated Live Order Notification Banner when active */}
      <AnimatePresence>
        {isAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#2fa6a6]/10 border border-[#2fa6a6]/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-[#2fa6a6] font-bold text-right"
          >
            <Bell className="w-4 h-4 text-[#2fa6a6] shrink-0 animate-bounce" />
            <span>أنت متصل بالشبكة الآن وجاهز لتلقي طلبات الركاب بالقرب منك!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== INCOMING RIDE REQUEST MODAL (نافذة طلب رحلة جديد) ===================== */}
      <AnimatePresence>
        {incomingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md text-right">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`bg-[#1b1d28] border-2 rounded-[24px] w-full max-w-md p-5 space-y-4 shadow-2xl relative overflow-hidden ${
                incomingRequest.femaleDriverOnly ? 'border-purple-500 shadow-purple-900/40' : 'border-[#e8a33d]'
              }`}
            >
              {/* Female Driver Only Banner Badge */}
              {incomingRequest.femaleDriverOnly && (
                <div className="bg-purple-900/40 border border-purple-500/50 p-2 rounded-xl text-center text-xs font-black text-purple-200 flex items-center justify-center gap-1.5 shadow-inner">
                  <span>🌸 طلب خدمة نسائية مخصصة (سائقة لزبونة)</span>
                </div>
              )}

              {/* Top Countdown Bar & Pulse Indicator */}
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        incomingRequest.femaleDriverOnly ? 'bg-purple-400' : 'bg-[#e8a33d]'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        incomingRequest.femaleDriverOnly ? 'bg-purple-500' : 'bg-[#e8a33d]'
                      }`}
                    />
                  </span>
                  <h2 className="text-base font-black text-[#f3efe6]">
                    {incomingRequest.femaleDriverOnly ? 'طلب رحلة نسائية جديد! 🌸' : 'طلب رحلة جديد!'}
                  </h2>
                </div>

                {/* Real Countdown Timer */}
                <div className="flex items-center gap-1.5 bg-[#12131a] px-3 py-1 rounded-full border border-[#e8a33d]/40">
                  <Clock className="w-3.5 h-3.5 text-[#e8a33d] animate-spin" />
                  <span className="text-xs font-mono font-black text-[#e8a33d]">
                    {countdown} ثانية
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="flex items-center justify-between bg-[#12131a] p-3 rounded-xl border border-[#2e3140]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#232634] border border-[#2fa6a6] flex items-center justify-center text-[#2fa6a6] font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#f3efe6] block">
                      {incomingRequest.customerName}
                    </span>
                    <span className="text-[10px] text-[#9b98a6] flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#e8a33d] fill-[#e8a33d]" />
                      <span>{incomingRequest.customerRating} (تقييم ممتاز)</span>
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-xs font-black text-[#e8a33d] font-mono block">
                    {incomingRequest.fareFormatted}
                  </span>
                  <span className="text-[10px] text-[#9b98a6]">
                    المسافة: {incomingRequest.distanceKm} كم
                  </span>
                </div>
              </div>

              {/* Locations details */}
              <div className="space-y-2 text-xs bg-[#12131a] p-3 rounded-xl border border-[#2e3140]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#e8a33d] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#9b98a6] block text-[10px]">الانطلاق:</span>
                    <span className="text-[#f3efe6] font-bold">
                      {incomingRequest.pickupName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#9b98a6] block text-[10px]">الوجهة:</span>
                    <span className="text-[#f3efe6] font-bold">
                      {incomingRequest.destName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Driver Flexible Price Options (تعديل السائق بالسعر المسموح) */}
              {(() => {
                const driverPriceOpts = getDriverPriceOptions(incomingRequest.fareAmount);
                return (
                  <div className="bg-[#12131a] p-3 rounded-xl border border-[#2e3140] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#9b98a6] font-extrabold">مرونة تسعير السائق (±{getPricingConfig().allowedDriverDeviationPct}%):</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        نطاق مسموح: {driverPriceOpts.minAllowed.toLocaleString()} - {driverPriceOpts.maxAllowed.toLocaleString()} د.ع
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {driverPriceOpts.options.map((optPrice) => {
                        const isSelected = (incomingRequest.fareAmount === optPrice);
                        return (
                          <button
                            type="button"
                            key={optPrice}
                            onClick={() => {
                              setIncomingRequest({
                                ...incomingRequest,
                                fareAmount: optPrice,
                                fareFormatted: `${optPrice.toLocaleString()} د.ع`
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#e8a33d] text-[#12131a] border-[#e8a33d] shadow-md scale-105'
                                : 'bg-[#232634] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                            }`}
                          >
                            {optPrice.toLocaleString()} د.ع
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Buttons: Accept & Decline */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDeclineRequest}
                  className="py-3 bg-[#232634] hover:bg-red-500/20 hover:border-red-500/50 border border-[#2e3140] text-[#f3efe6] hover:text-red-400 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>رفض</span>
                </button>

                <button
                  onClick={handleAcceptRequest}
                  className="py-3 bg-gradient-to-r from-[#2fa6a6] to-[#1f7373] text-[#12131a] font-black rounded-xl text-xs transition-all shadow-lg hover:brightness-110 cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>قبول الطلب ({countdown}ث)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subscription Payment Modal (تجديد الاشتراك اليومي بـ 4,000 د.ع) */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-2xl space-y-4 text-right"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-2xl bg-[#e8a33d]/20 text-[#e8a33d]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#f3efe6]">تجديد الاشتراك اليومي 🚖</h3>
                    <p className="text-xs text-[#9b98a6]">اشتراك ثابت = 4,000 د.ع / 24 ساعة (0% عمولة)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="p-1.5 rounded-xl bg-[#12131a] text-[#9b98a6] hover:text-[#f3efe6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {subStatus.isExpiredAndLocked && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 space-y-1">
                  <p className="font-bold">⚠️ الحساب مقفل حالياً</p>
                  <p>انتهت مهلة السماح (ساعة واحدة بعد انتهاء وقت الاشتراك). يرجى دفع الاشتراك اليومي لتفعيل زر التوفر فوراً.</p>
                </div>
              )}

              {/* Payment Method Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#9b98a6]">طريقة الدفع السريعة:</label>

                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('qi_mastercard')}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-right cursor-pointer transition-all ${
                    selectedPayMethod === 'qi_mastercard'
                      ? 'bg-[#232634] border-[#e8a33d] text-[#f3efe6] ring-1 ring-[#e8a33d]/40 shadow-lg'
                      : 'bg-[#12131a] border-[#2e3140] text-[#9b98a6]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <span className="text-xs font-extrabold block text-[#f3efe6]">ماستر رافدين / كي كارد</span>
                      <span className="text-[10px] text-[#9b98a6]">دفع إلكتروني مباشر وآمن</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#e8a33d] bg-[#12131a] px-2.5 py-1 rounded-xl border border-[#2e3140]">
                    4,000 د.ع
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('wallet')}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-right cursor-pointer transition-all ${
                    selectedPayMethod === 'wallet'
                      ? 'bg-[#232634] border-[#e8a33d] text-[#f3efe6] ring-1 ring-[#e8a33d]/40 shadow-lg'
                      : 'bg-[#12131a] border-[#2e3140] text-[#9b98a6]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👛</span>
                    <div>
                      <span className="text-xs font-extrabold block text-[#f3efe6]">محفظة السائق الإلكترونية</span>
                      <span className="text-[10px] text-[#9b98a6]">خصم مباشر من رصيدك المتاح في المحفظة</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#2fa6a6] bg-[#12131a] px-2.5 py-1 rounded-xl border border-[#2e3140]">
                    4,000 د.ع
                  </span>
                </button>
              </div>

              {/* Confirm Payment Button */}
              <button
                type="button"
                onClick={handlePaySubscription}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-black text-sm font-cairo shadow-xl hover:brightness-110 cursor-pointer active:scale-95 transition-all mt-2"
              >
                تأكيد ودفع 4,000 د.ع وتفعيل الحساب ⚡
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Wallet Modal for Driver */}
      <MyWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={driverId}
        userName={displayedDriverName}
        userRole="driver"
      />

      {/* Side Menu Drawer */}
      <SideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        userId={driverId}
        userName={displayedDriverName}
        accountType="driver"
        currentLang={currentLang}
        onLogout={onLogout}
        onProfileUpdated={(newName) => {
          setDisplayedDriverName(newName);
        }}
      />
    </div>
  );
};
