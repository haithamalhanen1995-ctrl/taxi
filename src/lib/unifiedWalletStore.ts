// ============================================================================
// TAKSATI UNIFIED E-WALLET ENGINE, DRIVER SUBSCRIPTION & AUDIT LOG SYSTEM
// ============================================================================

import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'customer' | 'driver' | 'merchant';

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  type:
    | 'topup'
    | 'ride_payment'
    | 'food_payment'
    | 'driver_subscription'
    | 'merchant_order_earning'
    | 'merchant_withdrawal'
    | 'admin_add'
    | 'admin_adjust'
    | 'admin_withdraw';
  amount: number; // IQD (Positive or Negative)
  title: string;
  date: string;
  timestamp: number;
  paymentMethod?: string;
  cardNumberOrBarcode?: string;
  adminName?: string;
  reason?: string;
  orderId?: string;
  commissionDeducted?: number;
  netAmount?: number;
  status?: 'completed' | 'pending' | 'rejected';
}

export interface WithdrawalRequest {
  id: string;
  merchantId: string;
  merchantName: string;
  amount: number; // IQD
  bankAccountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  timestamp: number;
  processDate?: string;
  rejectionReason?: string;
  adminName?: string;
}

export interface TopUpRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  amount: number;
  paymentMethod: 'qi_rafidain' | 'mastercard';
  cardNumberOrBarcode: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  timestamp: number;
  processDate?: string;
  rejectionReason?: string;
  adminName?: string;
}

export interface AuditLogEntry {
  id: string;
  actionType:
    | 'admin_add'
    | 'admin_adjust'
    | 'admin_withdraw'
    | 'driver_auto_sub'
    | 'merchant_withdrawal_approved'
    | 'merchant_withdrawal_rejected'
    | 'customer_topup'
    | 'ride_payment'
    | 'food_payment';
  userId: string;
  userName: string;
  userRole: UserRole;
  amount: number;
  oldBalance: number;
  newBalance: number;
  reason: string;
  adminName: string;
  date: string;
  timestamp: number;
}

// Storage keys
const BALANCES_KEY = 'taksati_unified_wallet_balances_v1';
const TRANSACTIONS_KEY = 'taksati_unified_wallet_transactions_v1';
const WITHDRAWALS_KEY = 'taksati_unified_withdrawal_requests_v1';
const TOPUP_REQUESTS_KEY = 'taksati_unified_topup_requests_v1';
const AUDIT_LOGS_KEY = 'taksati_unified_audit_logs_v1';

const EVENT_NAME = 'taksati_wallet_updated';

function notifyWalletChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function subscribeToWalletStore(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

// Initial balances for seed users
const SEED_BALANCES: Record<string, number> = {
  'user-seed-admin': 1000000,
};

// Default seed transactions
const SEED_TRANSACTIONS: WalletTransaction[] = [];

const SEED_WITHDRAWALS: WithdrawalRequest[] = [];

const SEED_TOPUP_REQUESTS: TopUpRequest[] = [];

const SEED_AUDIT_LOGS: AuditLogEntry[] = [];

// Helper: Get all balances
export function getWalletBalancesMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BALANCES_KEY);
    if (!raw) {
      localStorage.setItem(BALANCES_KEY, JSON.stringify(SEED_BALANCES));
      return { ...SEED_BALANCES };
    }
    return { ...SEED_BALANCES, ...JSON.parse(raw) };
  } catch {
    return { ...SEED_BALANCES };
  }
}

// Get balance for specific user
export function getUserWalletBalance(userIdOrName: string, role?: UserRole): number {
  const cleanId = (userIdOrName || 'user-seed-1').trim();
  const balances = getWalletBalancesMap();
  if (balances[cleanId] !== undefined) {
    return balances[cleanId];
  }
  // Default based on role
  if (role === 'driver') return 15000;
  if (role === 'merchant') return 120000;
  return 25000;
}

// Set balance for specific user
function setWalletBalanceInternal(userIdOrName: string, newBalance: number) {
  const cleanId = (userIdOrName || 'user-seed-1').trim();
  const balances = getWalletBalancesMap();
  balances[cleanId] = Math.max(0, newBalance);
  try {
    localStorage.setItem(BALANCES_KEY, JSON.stringify(balances));
    // Sync to Firestore
    setDoc(doc(db, 'wallets', cleanId), { balance: Math.max(0, newBalance), updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('LocalStorage error setting wallet balance', err);
  }
}

// Helper: Get all transactions
export function getAllWalletTransactions(): WalletTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(SEED_TRANSACTIONS));
      return SEED_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TRANSACTIONS;
  }
}

// Get user specific transactions
export function getUserWalletTransactions(userIdOrName: string): WalletTransaction[] {
  const clean = (userIdOrName || '').trim().toLowerCase();
  const all = getAllWalletTransactions();
  return all.filter(
    (t) => t.userId.toLowerCase() === clean || t.userName.toLowerCase() === clean
  );
}

// Record a new transaction
function recordTransaction(tx: WalletTransaction) {
  const all = getAllWalletTransactions();
  const updated = [tx, ...all];
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    setDoc(doc(db, 'wallet_transactions', tx.id), tx, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('LocalStorage error recording transaction', err);
  }
}

// Helper: Get all audit log entries
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(SEED_AUDIT_LOGS));
      return SEED_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_AUDIT_LOGS;
  }
}

export const getAuditLog = getAuditLogs;

// Record an append-only Audit Log
export function recordAuditLog(log: Omit<AuditLogEntry, 'id' | 'timestamp' | 'date'>): AuditLogEntry {
  const entry: AuditLogEntry = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
    date: new Date().toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  const logs = getAuditLogs();
  const updated = [entry, ...logs];
  try {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
    setDoc(doc(db, 'wallet_audit_logs', entry.id), entry, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('Error recording audit log', err);
  }
  return entry;
}

// ============================================================================
// 1. CUSTOMER TOPUP & PAYMENT FUNCTIONS
// ============================================================================

export function topUpCustomerWalletUnified(params: {
  userId: string;
  userName: string;
  amount: number;
  paymentMethod: 'qi_rafidain' | 'mastercard';
  cardNumberOrBarcode: string;
}): { newBalance: number; tx: WalletTransaction } {
  const oldBalance = getUserWalletBalance(params.userId, 'customer');
  const newBalance = oldBalance + params.amount;

  setWalletBalanceInternal(params.userId, newBalance);
  if (params.userName && params.userName !== params.userId) {
    setWalletBalanceInternal(params.userName, newBalance);
  }

  const dateStr = new Date().toLocaleString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tx: WalletTransaction = {
    id: `tx-topup-${Date.now()}`,
    userId: params.userId,
    userName: params.userName,
    userRole: 'customer',
    type: 'topup',
    amount: params.amount,
    title: `شحن محفظة عبر ماستر رافدين / كي كارد (${params.cardNumberOrBarcode.slice(-4) || 'رمز'})`,
    date: `اليوم، ${dateStr}`,
    timestamp: Date.now(),
    paymentMethod: params.paymentMethod,
    cardNumberOrBarcode: params.cardNumberOrBarcode,
    status: 'completed',
  };

  recordTransaction(tx);
  recordAuditLog({
    actionType: 'customer_topup',
    userId: params.userId,
    userName: params.userName,
    userRole: 'customer',
    amount: params.amount,
    oldBalance,
    newBalance,
    reason: `شحن إلكتروني مخصص عبر ${params.paymentMethod === 'qi_rafidain' ? 'كي كارد / ماستر رافدين' : 'ماستر كارد'} (رقم البطاقة: ${params.cardNumberOrBarcode})`,
    adminName: params.userName,
  });

  notifyWalletChange();
  return { newBalance, tx };
}

export function deductCustomerWalletUnified(params: {
  userId: string;
  userName: string;
  amount: number;
  title: string;
  type?: 'ride_payment' | 'food_payment';
}): { success: boolean; newBalance: number; errorMsg?: string } {
  const oldBalance = getUserWalletBalance(params.userId, 'customer');

  if (oldBalance < params.amount) {
    return {
      success: false,
      newBalance: oldBalance,
      errorMsg: `رصيدك غير كافٍ (${oldBalance.toLocaleString()} د.ع). يرجى الشحن من صفحة حسابي.`,
    };
  }

  const newBalance = oldBalance - params.amount;
  setWalletBalanceInternal(params.userId, newBalance);
  if (params.userName && params.userName !== params.userId) {
    setWalletBalanceInternal(params.userName, newBalance);
  }

  const tx: WalletTransaction = {
    id: `tx-deduct-${Date.now()}`,
    userId: params.userId,
    userName: params.userName,
    userRole: 'customer',
    type: params.type || 'ride_payment',
    amount: -params.amount,
    title: params.title,
    date: 'الآن',
    timestamp: Date.now(),
    paymentMethod: 'wallet',
    status: 'completed',
  };

  recordTransaction(tx);
  recordAuditLog({
    actionType: params.type || 'ride_payment',
    userId: params.userId,
    userName: params.userName,
    userRole: 'customer',
    amount: -params.amount,
    oldBalance,
    newBalance,
    reason: params.title,
    adminName: 'النظام التلقائي (System)',
  });

  notifyWalletChange();
  return { success: true, newBalance };
}

// ============================================================================
// 2. DRIVER WALLET & SUBSCRIPTION FUNCTIONS (4,000 IQD Daily)
// ============================================================================

export const DAILY_SUB_FEE = 4000;

export function topUpDriverWallet(params: {
  driverId: string;
  driverName: string;
  amount: number;
  paymentMethod: 'qi_rafidain' | 'mastercard';
  cardNumberOrBarcode: string;
}): { newBalance: number } {
  const oldBalance = getUserWalletBalance(params.driverId, 'driver');
  const newBalance = oldBalance + params.amount;

  setWalletBalanceInternal(params.driverId, newBalance);
  if (params.driverName && params.driverName !== params.driverId) {
    setWalletBalanceInternal(params.driverName, newBalance);
  }

  const tx: WalletTransaction = {
    id: `tx-driver-topup-${Date.now()}`,
    userId: params.driverId,
    userName: params.driverName,
    userRole: 'driver',
    type: 'topup',
    amount: params.amount,
    title: `شحن محفظة السائق عبر كي كارد / ماستر رافدين (${params.cardNumberOrBarcode.slice(-4)})`,
    date: 'الآن',
    timestamp: Date.now(),
    paymentMethod: params.paymentMethod,
    cardNumberOrBarcode: params.cardNumberOrBarcode,
    status: 'completed',
  };

  recordTransaction(tx);
  recordAuditLog({
    actionType: 'customer_topup',
    userId: params.driverId,
    userName: params.driverName,
    userRole: 'driver',
    amount: params.amount,
    oldBalance,
    newBalance,
    reason: `شحن محفظة السائق عبر ${params.paymentMethod}`,
    adminName: params.driverName,
  });

  notifyWalletChange();
  return { newBalance };
}

export function deductDriverDailySubscription(params: {
  driverId: string;
  driverName: string;
}): { success: boolean; newBalance: number; errorMsg?: string } {
  const oldBalance = getUserWalletBalance(params.driverId, 'driver');

  if (oldBalance < DAILY_SUB_FEE) {
    return {
      success: false,
      newBalance: oldBalance,
      errorMsg: `رصيد المحفظة غير كافٍ لخصم الاشتراك اليومي (4,000 د.ع). رصيدك الحالي: ${oldBalance.toLocaleString()} د.ع.`,
    };
  }

  const newBalance = oldBalance - DAILY_SUB_FEE;
  setWalletBalanceInternal(params.driverId, newBalance);
  if (params.driverName && params.driverName !== params.driverId) {
    setWalletBalanceInternal(params.driverName, newBalance);
  }

  const tx: WalletTransaction = {
    id: `tx-driver-sub-${Date.now()}`,
    userId: params.driverId,
    userName: params.driverName,
    userRole: 'driver',
    type: 'driver_subscription',
    amount: -DAILY_SUB_FEE,
    title: 'خصم الاشتراك اليومي المباشر لخدمة التكسي (4,000 د.ع)',
    date: 'الآن',
    timestamp: Date.now(),
    status: 'completed',
  };

  recordTransaction(tx);
  recordAuditLog({
    actionType: 'driver_auto_sub',
    userId: params.driverId,
    userName: params.driverName,
    userRole: 'driver',
    amount: -DAILY_SUB_FEE,
    oldBalance,
    newBalance,
    reason: 'خصم الاشتراك اليومي لخدمة التكسي (4,000 د.ع)',
    adminName: 'النظام التلقائي (System)',
  });

  notifyWalletChange();
  return { success: true, newBalance };
}

// Check proactive alert for Driver (e.g. around 9 PM or when balance < 4000)
export function getDriverWalletProactiveWarning(driverIdOrName: string): {
  needsTopupWarning: boolean;
  message: string;
  currentBalance: number;
} {
  const currentBalance = getUserWalletBalance(driverIdOrName, 'driver');
  const needsTopupWarning = currentBalance < DAILY_SUB_FEE;
  return {
    needsTopupWarning,
    message: needsTopupWarning
      ? `⚠️ تنبيه هام: رصيد محفظتك الحالي (${currentBalance.toLocaleString()} د.ع) غير كافٍ لخصم اشتراك الغد (4,000 د.ع). يرجى شحن المحفظة الآن لتفادي إيقاف استقبال الطلبات تلقائياً.`
      : `رصيدك ممتاز (${currentBalance.toLocaleString()} د.ع) ويكفي لاشتراكاتك القادمة.`,
    currentBalance,
  };
}

// ============================================================================
// 3. MERCHANT WALLET & WITHDRAWAL REQUESTS
// ============================================================================

export function recordMerchantOrderEarning(params: {
  merchantId: string;
  merchantName: string;
  orderId: string;
  totalAmount: number;
  commissionPercentage?: number; // default 10%
}): { netAmount: number; commissionDeducted: number; newBalance: number } {
  const commissionPct = params.commissionPercentage ?? 10;
  const commissionDeducted = Math.round((params.totalAmount * commissionPct) / 100);
  const netAmount = params.totalAmount - commissionDeducted;

  const oldBalance = getUserWalletBalance(params.merchantId, 'merchant');
  const newBalance = oldBalance + netAmount;

  setWalletBalanceInternal(params.merchantId, newBalance);
  if (params.merchantName && params.merchantName !== params.merchantId) {
    setWalletBalanceInternal(params.merchantName, newBalance);
  }

  const tx: WalletTransaction = {
    id: `tx-merch-earn-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
    userId: params.merchantId,
    userName: params.merchantName,
    userRole: 'merchant',
    type: 'merchant_order_earning',
    amount: netAmount,
    title: `إضافة أرباح الطلب #${params.orderId.slice(-5)} (${params.totalAmount.toLocaleString()} د.ع - خصم ${commissionPct}% عمولة المنصة)`,
    date: 'الآن',
    timestamp: Date.now(),
    orderId: params.orderId,
    commissionDeducted,
    netAmount,
    status: 'completed',
  };

  recordTransaction(tx);
  notifyWalletChange();

  return { netAmount, commissionDeducted, newBalance };
}

export function getMerchantWalletStats(merchantIdOrName: string) {
  const clean = (merchantIdOrName || '').trim().toLowerCase();
  const txs = getAllWalletTransactions().filter(
    (t) =>
      t.userRole === 'merchant' &&
      (t.userId.toLowerCase() === clean || t.userName.toLowerCase() === clean)
  );

  let grossEarnings = 0;
  let platformCommission = 0;
  let netEarnings = 0;

  txs.forEach((t) => {
    if (t.type === 'merchant_order_earning') {
      const comm = t.commissionDeducted || Math.round(t.amount * 0.1);
      netEarnings += t.amount;
      platformCommission += comm;
      grossEarnings += t.amount + comm;
    }
  });

  if (grossEarnings === 0 && txs.length === 0) {
    grossEarnings = 133333;
    platformCommission = 13333;
    netEarnings = 120000;
  }

  const withdraws = getWithdrawalRequests().filter(
    (w) => w.merchantId.toLowerCase() === clean || w.merchantName.toLowerCase() === clean
  );

  let pendingWithdrawals = 0;
  let completedWithdrawals = 0;

  withdraws.forEach((w) => {
    if (w.status === 'pending') pendingWithdrawals += w.amount;
    if (w.status === 'approved') completedWithdrawals += w.amount;
  });

  return {
    grossEarnings,
    platformCommission,
    netEarnings,
    pendingWithdrawals,
    completedWithdrawals,
  };
}

// Get all withdrawal requests
export function getWithdrawalRequests(): WithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    if (!raw) {
      localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(SEED_WITHDRAWALS));
      return SEED_WITHDRAWALS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_WITHDRAWALS;
  }
}

// Create Withdrawal Request from Merchant
export function createWithdrawalRequest(params: {
  merchantId: string;
  merchantName: string;
  amount: number;
  bankAccountDetails: string;
}): { success: boolean; request?: WithdrawalRequest; errorMsg?: string } {
  const currentBal = getUserWalletBalance(params.merchantId, 'merchant');

  if (params.amount <= 0) {
    return { success: false, errorMsg: 'يرجى إدخال مبلغ سحب صحيح أكبر من صفر.' };
  }

  if (currentBal < params.amount) {
    return {
      success: false,
      errorMsg: `المبلغ المطلوب (${params.amount.toLocaleString()} د.ع) يتجاوز الرصيد المتوفر بمحفظتك (${currentBal.toLocaleString()} د.ع).`,
    };
  }

  const req: WithdrawalRequest = {
    id: `wdr-${Date.now()}`,
    merchantId: params.merchantId,
    merchantName: params.merchantName,
    amount: params.amount,
    bankAccountDetails: params.bankAccountDetails,
    status: 'pending',
    requestDate: new Date().toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timestamp: Date.now(),
  };

  const currentList = getWithdrawalRequests();
  const updated = [req, ...currentList];

  try {
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(updated));
    setDoc(doc(db, 'withdrawal_requests', req.id), req, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('LocalStorage error creating withdrawal request', err);
  }

  notifyWalletChange();
  return { success: true, request: req };
}

// Approve Merchant Withdrawal Request (Admin Action)
export function approveWithdrawalRequest(
  requestId: string,
  adminName: string = 'المدير العام'
): { success: boolean; errorMsg?: string } {
  const requests = getWithdrawalRequests();
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, errorMsg: 'طلب السحب غير موجود بالنظام.' };
  }

  if (req.status !== 'pending') {
    return { success: false, errorMsg: `الطلب تمت معالجته سابقاً وقدره: ${req.status}` };
  }

  const oldBalance = getUserWalletBalance(req.merchantId, 'merchant');
  if (oldBalance < req.amount) {
    return {
      success: false,
      errorMsg: `رصيد المطعم الحالي (${oldBalance.toLocaleString()} د.ع) أقل من مبلغ طلب السحب (${req.amount.toLocaleString()} د.ع).`,
    };
  }

  const newBalance = oldBalance - req.amount;
  setWalletBalanceInternal(req.merchantId, newBalance);
  if (req.merchantName) {
    setWalletBalanceInternal(req.merchantName, newBalance);
  }

  // Update request
  req.status = 'approved';
  req.processDate = new Date().toLocaleString('ar-IQ');
  req.adminName = adminName;

  try {
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(requests));
    setDoc(doc(db, 'withdrawal_requests', req.id), req, { merge: true }).catch(() => {});
  } catch {}

  // Record Transaction
  const tx: WalletTransaction = {
    id: `tx-withdraw-appr-${Date.now()}`,
    userId: req.merchantId,
    userName: req.merchantName,
    userRole: 'merchant',
    type: 'merchant_withdrawal',
    amount: -req.amount,
    title: `سحب أرباح مؤكد بحساب (${req.bankAccountDetails.slice(0, 30)}...)`,
    date: 'الآن',
    timestamp: Date.now(),
    adminName,
    status: 'completed',
  };
  recordTransaction(tx);

  // Audit Log
  recordAuditLog({
    actionType: 'merchant_withdrawal_approved',
    userId: req.merchantId,
    userName: req.merchantName,
    userRole: 'merchant',
    amount: -req.amount,
    oldBalance,
    newBalance,
    reason: `موافقة على طلب سحب الأرباح إلى الحساب البنكي: ${req.bankAccountDetails}`,
    adminName,
  });

  notifyWalletChange();
  return { success: true };
}

// Reject Merchant Withdrawal Request (Admin Action)
export function rejectWithdrawalRequest(
  requestId: string,
  rejectionReason: string,
  adminName: string = 'المدير العام'
): { success: boolean; errorMsg?: string } {
  if (!rejectionReason.trim()) {
    return { success: false, errorMsg: 'سبب الرفض إلزامي!' };
  }

  const requests = getWithdrawalRequests();
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, errorMsg: 'طلب السحب غير موجود.' };
  }

  req.status = 'rejected';
  req.rejectionReason = rejectionReason;
  req.processDate = new Date().toLocaleString('ar-IQ');
  req.adminName = adminName;

  try {
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(requests));
    setDoc(doc(db, 'withdrawal_requests', req.id), req, { merge: true }).catch(() => {});
  } catch {}

  recordAuditLog({
    actionType: 'merchant_withdrawal_rejected',
    userId: req.merchantId,
    userName: req.merchantName,
    userRole: 'merchant',
    amount: 0,
    oldBalance: getUserWalletBalance(req.merchantId, 'merchant'),
    newBalance: getUserWalletBalance(req.merchantId, 'merchant'),
    reason: `رفض طلب السحب لمبلغ ${req.amount.toLocaleString()} د.ع. السبب: ${rejectionReason}`,
    adminName,
  });

  notifyWalletChange();
  return { success: true };
}

// ============================================================================
// 4. ADMIN CENTRAL WALLET MANAGEMENT (3 Distinct Actions + Mandatory Reason)
// ============================================================================

/**
 * Action A: Add Funds (➕ إضافة رصيد)
 */
export function adminAddWalletFunds(params: {
  userId?: string;
  targetUserId?: string;
  userName?: string;
  targetUserName?: string;
  userRole?: UserRole;
  targetUserRole?: UserRole;
  amount: number; // positive number
  reason: string; // mandatory
  adminName?: string;
}): { success: boolean; oldBalance: number; newBalance: number; errorMsg?: string } {
  const userId = params.userId || params.targetUserId || '';
  const userName = params.userName || params.targetUserName || userId;
  const userRole = params.userRole || params.targetUserRole || 'customer';

  if (!params.reason || !params.reason.trim()) {
    return { success: false, oldBalance: 0, newBalance: 0, errorMsg: 'سبب إضافة الرصيد إلزامي!' };
  }
  if (params.amount <= 0) {
    return { success: false, oldBalance: 0, newBalance: 0, errorMsg: 'يرجى إدخال مبلغ موجب أكبر من صفر.' };
  }

  const oldBalance = getUserWalletBalance(userId, userRole);
  const newBalance = oldBalance + params.amount;

  setWalletBalanceInternal(userId, newBalance);
  if (userName && userName !== userId) {
    setWalletBalanceInternal(userName, newBalance);
  }

  const admin = params.adminName || 'الأدمن الرئيسي';

  const tx: WalletTransaction = {
    id: `tx-admin-add-${Date.now()}`,
    userId,
    userName,
    userRole,
    type: 'admin_add',
    amount: params.amount,
    title: `إضافة رصيد إدارية (+${params.amount.toLocaleString()} د.ع)`,
    date: 'الآن',
    timestamp: Date.now(),
    adminName: admin,
    reason: params.reason,
    status: 'completed',
  };
  recordTransaction(tx);

  recordAuditLog({
    actionType: 'admin_add',
    userId,
    userName,
    userRole,
    amount: params.amount,
    oldBalance,
    newBalance,
    reason: params.reason,
    adminName: admin,
  });

  notifyWalletChange();
  return { success: true, oldBalance, newBalance };
}

/**
 * Action B: Adjust Balance (✏️ تعديل الرصيد - positive for increase, negative for decrease)
 */
export function adminAdjustWalletBalance(params: {
  userId?: string;
  targetUserId?: string;
  userName?: string;
  targetUserName?: string;
  userRole?: UserRole;
  targetUserRole?: UserRole;
  adjustmentAmount?: number; // positive (+) or negative (-)
  newBalance?: number;
  reason: string; // mandatory
  adminName?: string;
}): { success: boolean; oldBalance: number; newBalance: number; errorMsg?: string } {
  const userId = params.userId || params.targetUserId || '';
  const userName = params.userName || params.targetUserName || userId;
  const userRole = params.userRole || params.targetUserRole || 'customer';

  if (!params.reason || !params.reason.trim()) {
    return { success: false, oldBalance: 0, newBalance: 0, errorMsg: 'سبب تعديل الرصيد إلزامي!' };
  }

  const oldBalance = getUserWalletBalance(userId, userRole);
  let newBalance = oldBalance;
  let adjAmt = 0;

  if (params.newBalance !== undefined) {
    newBalance = Math.max(0, params.newBalance);
    adjAmt = newBalance - oldBalance;
  } else if (params.adjustmentAmount !== undefined) {
    adjAmt = params.adjustmentAmount;
    newBalance = Math.max(0, oldBalance + adjAmt);
  } else {
    return { success: false, oldBalance, newBalance: oldBalance, errorMsg: 'يرجى تحديد المبلغ الجديد أو قيمة التعديل.' };
  }

  setWalletBalanceInternal(userId, newBalance);
  if (userName && userName !== userId) {
    setWalletBalanceInternal(userName, newBalance);
  }

  const admin = params.adminName || 'الأدمن الرئيسي';

  const tx: WalletTransaction = {
    id: `tx-admin-adj-${Date.now()}`,
    userId,
    userName,
    userRole,
    type: 'admin_adjust',
    amount: adjAmt,
    title: `تعديل رصيد إداري (${adjAmt >= 0 ? '+' : ''}${adjAmt.toLocaleString()} د.ع)`,
    date: 'الآن',
    timestamp: Date.now(),
    adminName: admin,
    reason: params.reason,
    status: 'completed',
  };
  recordTransaction(tx);

  recordAuditLog({
    actionType: 'admin_adjust',
    userId,
    userName,
    userRole,
    amount: adjAmt,
    oldBalance,
    newBalance,
    reason: params.reason,
    adminName: admin,
  });

  notifyWalletChange();
  return { success: true, oldBalance, newBalance };
}

/**
 * Action C: Withdraw Funds (➖ سحب رصيد)
 */
export function adminWithdrawWalletFunds(params: {
  userId?: string;
  targetUserId?: string;
  userName?: string;
  targetUserName?: string;
  userRole?: UserRole;
  targetUserRole?: UserRole;
  amount: number; // positive number to subtract
  reason: string; // mandatory
  linkedWithdrawalRequestId?: string;
  adminName?: string;
}): { success: boolean; oldBalance: number; newBalance: number; errorMsg?: string } {
  const userId = params.userId || params.targetUserId || '';
  const userName = params.userName || params.targetUserName || userId;
  const userRole = params.userRole || params.targetUserRole || 'customer';

  if (!params.reason || !params.reason.trim()) {
    return { success: false, oldBalance: 0, newBalance: 0, errorMsg: 'سبب سحب الرصيد إلزامي!' };
  }
  if (params.amount <= 0) {
    return { success: false, oldBalance: 0, newBalance: 0, errorMsg: 'يرجى إدخال مبلغ سحب موجب أكبر من صفر.' };
  }

  const oldBalance = getUserWalletBalance(userId, userRole);

  if (oldBalance < params.amount) {
    return {
      success: false,
      oldBalance,
      newBalance: oldBalance,
      errorMsg: `المبلغ المطلوب (${params.amount.toLocaleString()} د.ع) يتجاوز الرصيد المتوفر بالنظام (${oldBalance.toLocaleString()} د.ع).`,
    };
  }

  const newBalance = oldBalance - params.amount;

  setWalletBalanceInternal(userId, newBalance);
  if (userName && userName !== userId) {
    setWalletBalanceInternal(userName, newBalance);
  }

  const admin = params.adminName || 'الأدمن الرئيسي';

  const tx: WalletTransaction = {
    id: `tx-admin-wdr-${Date.now()}`,
    userId,
    userName,
    userRole,
    type: 'admin_withdraw',
    amount: -params.amount,
    title: `سحب رصيد إداري (-${params.amount.toLocaleString()} د.ع)`,
    date: 'الآن',
    timestamp: Date.now(),
    adminName: admin,
    reason: params.reason,
    status: 'completed',
  };
  recordTransaction(tx);

  recordAuditLog({
    actionType: 'admin_withdraw',
    userId,
    userName,
    userRole,
    amount: -params.amount,
    oldBalance,
    newBalance,
    reason: params.reason,
    adminName: admin,
  });

  // If linked to a merchant request, mark it approved/transferred
  if (params.linkedWithdrawalRequestId) {
    const requests = getWithdrawalRequests();
    const req = requests.find((r) => r.id === params.linkedWithdrawalRequestId);
    if (req) {
      req.status = 'approved';
      req.processDate = new Date().toLocaleString('ar-IQ');
      req.adminName = admin;
      try {
        localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(requests));
      } catch {}
    }
  }

  notifyWalletChange();
  return { success: true, oldBalance, newBalance };
}

// ============================================================================
// 5. SYSTEM FINANCIAL REPORTS (تقارير مالية عامة)
// ============================================================================

export interface FinancialReportsSummary {
  totalCustomerBalances: number;
  totalDriverSubscriptionsCollected: number;
  totalMerchantCommissionsCollected: number;
  totalSystemVolume: number;
}

export function getSystemFinancialReports(): FinancialReportsSummary {
  const transactions = getAllWalletTransactions();
  const balances = getWalletBalancesMap();

  let totalCustomerBalances = 0;
  // Estimate customer balances
  Object.keys(balances).forEach((k) => {
    if (k.includes('user-seed-1') || k.includes('أحمد') || (!k.includes('driver') && !k.includes('merchant') && !k.includes('عثمان') && !k.includes('مطعم'))) {
      totalCustomerBalances += balances[k] || 0;
    }
  });

  let totalDriverSubscriptionsCollected = 0;
  let totalMerchantCommissionsCollected = 0;
  let totalSystemVolume = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'driver_subscription') {
      totalDriverSubscriptionsCollected += Math.abs(tx.amount);
    }
    if (tx.type === 'merchant_order_earning' && tx.commissionDeducted) {
      totalMerchantCommissionsCollected += tx.commissionDeducted;
    }
    totalSystemVolume += Math.abs(tx.amount);
  });

  return {
    totalCustomerBalances: totalCustomerBalances || 0,
    totalDriverSubscriptionsCollected: totalDriverSubscriptionsCollected || 0,
    totalMerchantCommissionsCollected: totalMerchantCommissionsCollected || 0,
    totalSystemVolume: totalSystemVolume || 0,
  };
}

// ============================================================================
// 6. PENDING TOP-UP REQUESTS SYSTEM (ADMIN APPROVAL REQUIRED FOR ALL TOP-UPS)
// ============================================================================

export function getTopUpRequests(): TopUpRequest[] {
  try {
    const raw = localStorage.getItem(TOPUP_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function createTopUpRequestUnified(params: {
  userId: string;
  userName: string;
  userRole: UserRole;
  amount: number;
  paymentMethod: 'qi_rafidain' | 'mastercard';
  cardNumberOrBarcode: string;
}): { success: boolean; request: TopUpRequest } {
  const req: TopUpRequest = {
    id: `topup-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    cardNumberOrBarcode: params.cardNumberOrBarcode,
    status: 'pending',
    requestDate: new Date().toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timestamp: Date.now(),
  };

  const list = getTopUpRequests();
  const updated = [req, ...list];

  try {
    localStorage.setItem(TOPUP_REQUESTS_KEY, JSON.stringify(updated));
    setDoc(doc(db, 'topup_requests', req.id), req, { merge: true }).catch((err) =>
      console.warn('Firestore topup_requests setDoc error:', err)
    );
  } catch (err) {
    console.warn('LocalStorage error creating topup request', err);
  }

  notifyWalletChange();
  return { success: true, request: req };
}

export function approveTopUpRequestUnified(
  requestId: string,
  adminName: string = 'المدير العام'
): { success: boolean; errorMsg?: string } {
  const requests = getTopUpRequests();
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, errorMsg: 'طلب الشحن غير موجود بالنظام.' };
  }

  if (req.status !== 'pending') {
    return { success: false, errorMsg: `الطلب تمت معالجته سابقاً وحالته: ${req.status}` };
  }

  req.status = 'approved';
  req.processDate = new Date().toLocaleString('ar-IQ');
  req.adminName = adminName;

  try {
    localStorage.setItem(TOPUP_REQUESTS_KEY, JSON.stringify(requests));
    setDoc(doc(db, 'topup_requests', req.id), req, { merge: true }).catch(() => {});
  } catch {}

  // Perform actual topup only upon Admin Approval!
  if (req.userRole === 'driver') {
    topUpDriverWallet({
      driverId: req.userId,
      driverName: req.userName,
      amount: req.amount,
      paymentMethod: req.paymentMethod,
      cardNumberOrBarcode: req.cardNumberOrBarcode,
    });
  } else {
    topUpCustomerWalletUnified({
      userId: req.userId,
      userName: req.userName,
      amount: req.amount,
      paymentMethod: req.paymentMethod,
      cardNumberOrBarcode: req.cardNumberOrBarcode,
    });
  }

  recordAuditLog({
    actionType: 'customer_topup',
    userId: req.userId,
    userName: req.userName,
    userRole: req.userRole,
    amount: req.amount,
    oldBalance: getUserWalletBalance(req.userId, req.userRole) - req.amount,
    newBalance: getUserWalletBalance(req.userId, req.userRole),
    reason: `موافقة الأدمن (${adminName}) على شحن المحفظة بقيمة ${req.amount.toLocaleString()} د.ع عبر ${req.paymentMethod}`,
    adminName,
  });

  notifyWalletChange();
  return { success: true };
}

export function rejectTopUpRequestUnified(
  requestId: string,
  rejectionReason: string,
  adminName: string = 'المدير العام'
): { success: boolean; errorMsg?: string } {
  if (!rejectionReason.trim()) {
    return { success: false, errorMsg: 'سبب الرفض إلزامي!' };
  }

  const requests = getTopUpRequests();
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, errorMsg: 'طلب الشحن غير موجود بالنظام.' };
  }

  req.status = 'rejected';
  req.rejectionReason = rejectionReason;
  req.processDate = new Date().toLocaleString('ar-IQ');
  req.adminName = adminName;

  try {
    localStorage.setItem(TOPUP_REQUESTS_KEY, JSON.stringify(requests));
    setDoc(doc(db, 'topup_requests', req.id), req, { merge: true }).catch(() => {});
  } catch {}

  recordAuditLog({
    actionType: 'customer_topup',
    userId: req.userId,
    userName: req.userName,
    userRole: req.userRole,
    amount: 0,
    oldBalance: getUserWalletBalance(req.userId, req.userRole),
    newBalance: getUserWalletBalance(req.userId, req.userRole),
    reason: `رفض الأدمن (${adminName}) لطلب شحن المحفظة بقيمة ${req.amount.toLocaleString()} د.ع. السبب: ${rejectionReason}`,
    adminName,
  });

  notifyWalletChange();
  return { success: true };
}

// Real-time Firestore Listener for topup_requests
try {
  onSnapshot(collection(db, 'topup_requests'), (snapshot) => {
    if (!snapshot.empty) {
      const firestoreReqs: TopUpRequest[] = [];
      snapshot.forEach((docSnap) => {
        firestoreReqs.push(docSnap.data() as TopUpRequest);
      });
      if (firestoreReqs.length > 0) {
        const localReqs = getTopUpRequests();
        const map = new Map<string, TopUpRequest>();
        localReqs.forEach((r) => map.set(r.id, r));
        firestoreReqs.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        try {
          localStorage.setItem(TOPUP_REQUESTS_KEY, JSON.stringify(merged));
          notifyWalletChange();
        } catch {}
      }
    }
  }, (err) => {
    console.warn('Firestore topup_requests listener warning:', err);
  });
} catch (e) {
  console.warn('Firestore topup_requests setup error:', e);
}
