// ============================================================================
// TAKSATI OFFICIAL PRICING ENGINE (نظام التسعير الكامل للرحلات وتوصيل الطعام)
// ============================================================================

export interface PricingConfig {
  // 1. Base Fare Parameters for Rides (الرحلات)
  baseFareRide: number;         // رسوم الانطلاق الثابتة للرحلات (د.ع)
  perKmRateRide: number;        // سعر الكيلومتر الواحد للرحلات (د.ع)
  perMinuteRateRide: number;    // سعر الدقيقة الواحدة للرحلات (د.ع)
  minFareRide: number;          // الحد الأدنى لسعر الرحلة الصارم (د.ع)

  // 2. Base Fare Parameters for Food Delivery (توصيل الطعام)
  baseFareDelivery: number;     // رسوم الانطلاق الثابتة للتوصيل (د.ع)
  perKmRateDelivery: number;    // سعر الكيلومتر الواحد للتوصيل (د.ع)
  perMinuteRateDelivery: number;// سعر الدقيقة الواحدة للتوصيل (د.ع)
  minFareDelivery: number;      // الحد الأدنى لسعر التوصيل الصارم (د.ع)

  // 3. Vehicle Type Multipliers (مضاعفات نوع السيارة)
  vehicleTypeMultipliers: {
    economy: number; // اقتصادي (1.0x)
    comfort: number; // مريح (1.3x)
    vip: number;     // VIP (1.8x)
  };

  // 4. Driver Pricing Flexibility Range (نطاق التسعير المسموح للسائق)
  allowedDriverDeviationPct: number; // نسبة الانحراف المسموحة للسائق (+/- %)

  // 5. Platform Commission (عمولة المنصة والاشتراكات)
  commissionPctRide: number;     // 0% (السائق يدفع اشتراك يومي ثابت 4,000 د.ع ولا عمولة على الرحلات)
  commissionPctDelivery: number; // نسبة اقتطاع المنصة من التوصيل (%)
  commissionPctMerchant: number; // نسبة عمولة المنصة من المطاعم/التجار (10%)
  dailySubscriptionFeeTaxi: number; // رسوم الاشتراك اليومي للسائق (4,000 د.ع)
  gracePeriodHoursTaxi: number;     // مهلة السماح لسائق التكسي (ساعة واحدة = 1)

  // 6. Food Delivery Tiered & Far Restaurant Fee (رسوم المطعم البعيد)
  farRestaurantKmThreshold: number; // حد مسافة المطعم البعيد (كم)
  farRestaurantFee: number;         // رسوم إضافية للمطعم البعيد (د.ع)

  // 7. Peak / Surge Multipliers (مضاعف أوقات الذروة والازدحام)
  isPeakActive: boolean;        // حالة تفعيل الذروة (يدوي/تلقائي)
  isAutoPeakEnabled: boolean;   // التفعيل التلقائي عند زيادة الطلبات
  peakMultiplier: number;       // مضاعف الذروة (مثلاً 1.25 = +25%)
}

// Default Configuration matching Iraq Market Standards (Baly / Careem)
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  baseFareRide: 1000,
  perKmRateRide: 500,
  perMinuteRateRide: 100,
  minFareRide: 3500,

  baseFareDelivery: 1000,
  perKmRateDelivery: 400,
  perMinuteRateDelivery: 50,
  minFareDelivery: 2000,

  vehicleTypeMultipliers: {
    economy: 1.0,
    comfort: 1.3,
    vip: 1.8,
  },

  allowedDriverDeviationPct: 15, // +/- 15% deviation allowed for drivers

  commissionPctRide: 0,        // 0% commission on taxi rides (Fixed Subscription Model)
  commissionPctDelivery: 10,  // 10% commission on delivery
  commissionPctMerchant: 10,  // 10% commission on restaurant orders
  dailySubscriptionFeeTaxi: 4000, // 4,000 IQD daily fixed subscription
  gracePeriodHoursTaxi: 1,     // 1 hour grace period after subscription ends

  farRestaurantKmThreshold: 8, // > 8 km is far
  farRestaurantFee: 1000,      // +1000 IQD

  isPeakActive: false,
  isAutoPeakEnabled: true,
  peakMultiplier: 1.25,        // 25% surge
};

export const PRICING_STORAGE_KEY = 'taksati_pricing_config_v2';
export const PRICING_UPDATED_EVENT = 'taksati_pricing_updated';

/**
 * Retrieve active pricing configuration from localStorage or defaults
 */
export function getPricingConfig(): PricingConfig {
  if (typeof window === 'undefined') return DEFAULT_PRICING_CONFIG;
  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_PRICING_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRICING_CONFIG,
      ...parsed,
      vehicleTypeMultipliers: {
        ...DEFAULT_PRICING_CONFIG.vehicleTypeMultipliers,
        ...(parsed.vehicleTypeMultipliers || {}),
      },
    };
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}

/**
 * Save updated pricing configuration and notify all active listeners
 */
export function savePricingConfig(config: PricingConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(config));
    // Legacy keys backwards compatibility
    localStorage.setItem('taksati_admin_min_fare', String(config.minFareRide));
    localStorage.setItem('taksati_admin_delivery_fee', String(config.minFareDelivery));
    localStorage.setItem('taksati_admin_commission_pct', String(config.commissionPctRide));
    localStorage.setItem('taksati_admin_peak_multiplier', String(config.peakMultiplier));

    window.dispatchEvent(new CustomEvent(PRICING_UPDATED_EVENT, { detail: config }));
  } catch (err) {
    console.error('Failed to save pricing config:', err);
  }
}

/**
 * Round a monetary value to the nearest 250 IQD (standard currency step in Iraq)
 */
export function roundToNearest250(val: number): number {
  return Math.round(val / 250) * 250;
}

/**
 * Calculate Base Fare for Taxi Ride
 * Formula: Base = [BaseFare + (Km * perKm) + (Min * perMin)] * VehicleMult * PeakMult
 * Capped at Minimum Fare
 */
export function calculateRideBasePrice(params: {
  distanceKm: number;
  durationMin: number;
  vehicleType?: 'economy' | 'comfort' | 'vip';
  overridePeak?: boolean;
  config?: PricingConfig;
}): { basePrice: number; breakdown: { baseFare: number; kmFare: number; minFare: number; vehicleMult: number; peakMult: number; rawTotal: number } } {
  const cfg = params.config || getPricingConfig();
  const vType = params.vehicleType || 'economy';

  const baseFare = cfg.baseFareRide;
  const kmFare = Math.max(0, params.distanceKm) * cfg.perKmRateRide;
  const minFare = Math.max(0, params.durationMin) * cfg.perMinuteRateRide;

  const vehicleMult = cfg.vehicleTypeMultipliers[vType] || 1.0;
  const isPeak = params.overridePeak ?? cfg.isPeakActive;
  const peakMult = isPeak ? cfg.peakMultiplier : 1.0;

  const subtotal = (baseFare + kmFare + minFare) * vehicleMult * peakMult;
  const rawTotal = roundToNearest250(subtotal);
  const finalPrice = Math.max(cfg.minFareRide, rawTotal);

  return {
    basePrice: finalPrice,
    breakdown: {
      baseFare,
      kmFare,
      minFare,
      vehicleMult,
      peakMult,
      rawTotal,
    },
  };
}

/**
 * Calculate Base Fare for Food Delivery
 * Formula: Base = [BaseFare + (Km * perKm) + (Min * perMin) + FarRestaurantFee] * PeakMult
 */
export function calculateDeliveryBasePrice(params: {
  distanceKm: number;
  durationMin?: number;
  isFarRestaurant?: boolean;
  config?: PricingConfig;
}): { deliveryFee: number; isFar: boolean; breakdown: { baseFare: number; kmFare: number; farFee: number; peakMult: number } } {
  const cfg = params.config || getPricingConfig();
  const duration = params.durationMin || Math.ceil(params.distanceKm * 2.5 + 5);

  const isFar = params.isFarRestaurant || params.distanceKm >= cfg.farRestaurantKmThreshold;

  const baseFare = cfg.baseFareDelivery;
  const kmFare = Math.max(0, params.distanceKm) * cfg.perKmRateDelivery;
  const timeFare = duration * cfg.perMinuteRateDelivery;
  const farFee = isFar ? cfg.farRestaurantFee : 0;

  const peakMult = cfg.isPeakActive ? cfg.peakMultiplier : 1.0;

  const subtotal = (baseFare + kmFare + timeFare + farFee) * peakMult;
  const rawTotal = roundToNearest250(subtotal);
  const finalFee = Math.max(cfg.minFareDelivery, rawTotal);

  return {
    deliveryFee: finalFee,
    isFar,
    breakdown: {
      baseFare,
      kmFare,
      farFee,
      peakMult,
    },
  };
}

/**
 * Generate Driver Counter-Offer Price Options (Nataq Al-Tas'eer Al-Masmouh)
 * Based on allowable deviation percentage (+/- %) from auto-calculated base fare
 */
export function getDriverPriceOptions(basePrice: number, config?: PricingConfig): {
  minAllowed: number;
  maxAllowed: number;
  options: number[];
} {
  const cfg = config || getPricingConfig();
  const devPct = cfg.allowedDriverDeviationPct / 100;

  // Min driver price cannot go below global minimum fare
  const calculatedMin = roundToNearest250(basePrice * (1 - devPct));
  const minAllowed = Math.max(cfg.minFareRide, calculatedMin);

  // Max driver price (can go up to peak surge limit if peak active)
  const maxAllowed = roundToNearest250(basePrice * (1 + devPct));

  // Generate 4 clean options (Min, Low-Mid, Base, High)
  const optionSet = new Set<number>();
  optionSet.add(minAllowed);
  if (minAllowed < basePrice) {
    optionSet.add(roundToNearest250((minAllowed + basePrice) / 2));
  }
  optionSet.add(basePrice);
  if (maxAllowed > basePrice) {
    optionSet.add(roundToNearest250((basePrice + maxAllowed) / 2));
    optionSet.add(maxAllowed);
  }

  const sortedOptions = Array.from(optionSet).sort((a, b) => a - b);

  return {
    minAllowed,
    maxAllowed,
    options: sortedOptions,
  };
}

/**
 * Validate Driver Counter Price against System Limits
 */
export function validateDriverCounterPrice(
  counterPrice: number,
  basePrice: number,
  config?: PricingConfig
): { isValid: boolean; errorMsg?: string } {
  const cfg = config || getPricingConfig();
  const { minAllowed, maxAllowed } = getDriverPriceOptions(basePrice, cfg);

  if (counterPrice < cfg.minFareRide) {
    return {
      isValid: false,
      errorMsg: `لا يمكن تقديم سعر أقل من الحد الأدنى للخدمة (${cfg.minFareRide.toLocaleString()} د.ع).`,
    };
  }

  if (counterPrice < minAllowed) {
    return {
      isValid: false,
      errorMsg: `السعر المقترح أقل من نسبة الانحراف المسموحة للسائق (-${cfg.allowedDriverDeviationPct}%).`,
    };
  }

  if (!cfg.isPeakActive && counterPrice > maxAllowed) {
    return {
      isValid: false,
      errorMsg: `السعر المقترح يتجاوز الحد الأقصى للنطاق المسموح (+${cfg.allowedDriverDeviationPct}%). يمكنك طلب تفعيل وقت الذروة من الإدارة.`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate Platform Commission Deduction on Agreed Fare
 */
export function calculateCommission(
  agreedPrice: number,
  serviceType: 'ride' | 'delivery' = 'ride',
  config?: PricingConfig
): { commissionAmount: number; driverNet: number; pct: number } {
  const cfg = config || getPricingConfig();
  const pct = serviceType === 'ride' ? cfg.commissionPctRide : cfg.commissionPctDelivery;

  const commissionAmount = roundToNearest250(agreedPrice * (pct / 100));
  const driverNet = Math.max(0, agreedPrice - commissionAmount);

  return {
    commissionAmount,
    driverNet,
    pct,
  };
}
