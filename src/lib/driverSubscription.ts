// ============================================================================
// TAKSATI DRIVER SUBSCRIPTION SYSTEM (نظام اشتراكات السائقين اليومي - 4,000 د.ع)
// ============================================================================

export const DAILY_SUBSCRIPTION_FEE_IQD = 4000; // 4,000 IQD fixed daily subscription
export const GRACE_PERIOD_MINUTES = 60; // 1 hour grace period after subscription ends

export interface DriverSubscriptionData {
  driverId: string;
  lastPaymentTimestamp: number; // epoch ms
  subscriptionExpiresTimestamp: number; // epoch ms (lastPayment + 24 hrs)
  gracePeriodExpiresTimestamp: number; // epoch ms (subscriptionExpires + 1 hr)
  paymentMethod: 'qi_mastercard' | 'wallet' | 'cash';
}

const DRIVER_SUB_PREFIX = 'taksati_driver_sub_v2_';

/**
 * Helper to get local key for driver subscription
 */
function getDriverSubKey(driverId?: string): string {
  const cleanId = (driverId || 'user-seed-driver-active').trim();
  return `${DRIVER_SUB_PREFIX}${cleanId}`;
}

/**
 * Get current subscription status for driver
 */
export function getDriverSubscriptionStatus(driverId?: string): {
  isSubscribed: boolean;
  inGracePeriod: boolean;
  isExpiredAndLocked: boolean;
  expiresAtMs: number;
  graceExpiresAtMs: number;
  minutesRemainingInGrace: number;
  hoursRemainingInSub: number;
} {
  const key = getDriverSubKey(driverId);
  const now = Date.now();

  let subData: DriverSubscriptionData | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      subData = JSON.parse(raw);
    }
  } catch {
    subData = null;
  }

  // If no subscription record exists, create a default active subscription for seed/demo
  if (!subData) {
    const defaultExpires = now + 18 * 3600 * 1000; // 18 hours remaining
    const defaultGrace = defaultExpires + 3600 * 1000; // +1 hr grace
    subData = {
      driverId: driverId || 'user-seed-driver-active',
      lastPaymentTimestamp: now - 6 * 3600 * 1000,
      subscriptionExpiresTimestamp: defaultExpires,
      gracePeriodExpiresTimestamp: defaultGrace,
      paymentMethod: 'qi_mastercard',
    };
    try {
      localStorage.setItem(key, JSON.stringify(subData));
    } catch {}
  }

  const isSubscribed = now < subData.subscriptionExpiresTimestamp;
  const inGracePeriod =
    !isSubscribed && now >= subData.subscriptionExpiresTimestamp && now < subData.gracePeriodExpiresTimestamp;
  const isExpiredAndLocked = now >= subData.gracePeriodExpiresTimestamp;

  const msToGraceExpiry = Math.max(0, subData.gracePeriodExpiresTimestamp - now);
  const minutesRemainingInGrace = Math.ceil(msToGraceExpiry / (60 * 1000));

  const msToSubExpiry = Math.max(0, subData.subscriptionExpiresTimestamp - now);
  const hoursRemainingInSub = Math.ceil(msToSubExpiry / (3600 * 1000));

  return {
    isSubscribed,
    inGracePeriod,
    isExpiredAndLocked,
    expiresAtMs: subData.subscriptionExpiresTimestamp,
    graceExpiresAtMs: subData.gracePeriodExpiresTimestamp,
    minutesRemainingInGrace,
    hoursRemainingInSub,
  };
}

/**
 * Pay or renew daily subscription (4,000 IQD)
 */
export function renewDriverSubscription(
  driverId?: string,
  paymentMethod: 'qi_mastercard' | 'wallet' | 'cash' = 'qi_mastercard'
): DriverSubscriptionData {
  const key = getDriverSubKey(driverId);
  const now = Date.now();
  const subExpires = now + 24 * 3600 * 1000; // 24 hours
  const graceExpires = subExpires + GRACE_PERIOD_MINUTES * 60 * 1000; // +1 hr

  const subData: DriverSubscriptionData = {
    driverId: driverId || 'user-seed-driver-active',
    lastPaymentTimestamp: now,
    subscriptionExpiresTimestamp: subExpires,
    gracePeriodExpiresTimestamp: graceExpires,
    paymentMethod,
  };

  try {
    localStorage.setItem(key, JSON.stringify(subData));
  } catch (err) {
    console.error('Failed to store driver subscription', err);
  }

  return subData;
}
