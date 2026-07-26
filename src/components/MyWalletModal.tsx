import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  X,
  PlusCircle,
  CreditCard,
  QrCode,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Clock,
  RefreshCw,
  Send,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  getUserWalletBalance,
  getUserWalletTransactions,
  topUpCustomerWalletUnified,
  topUpDriverWallet,
  deductDriverDailySubscription,
  createWithdrawalRequest,
  getWithdrawalRequests,
  createTopUpRequestUnified,
  getTopUpRequests,
  TopUpRequest,
  subscribeToWalletStore,
  WalletTransaction,
  WithdrawalRequest,
  DAILY_SUB_FEE,
  UserRole,
} from '../lib/unifiedWalletStore';
import { getDriverSubscriptionStatus, renewDriverSubscription } from '../lib/driverSubscription';

interface MyWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: UserRole;
}

export const MyWalletModal: React.FC<MyWalletModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole,
}) => {
  const [balance, setBalance] = useState(() => getUserWalletBalance(userId || userName, userRole));
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    getUserWalletTransactions(userId || userName)
  );

  // Top-up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(25000);
  const [payMethod, setPayMethod] = useState<'qi_rafidain' | 'mastercard'>('qi_rafidain');
  const [cardNumber, setCardNumber] = useState('5284 9911 2233 9012');
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);

  // Driver Subscription state
  const [subStatus, setSubStatus] = useState(() => getDriverSubscriptionStatus(userId));

  // User Top-up Request State
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);

  // Merchant Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [bankDetails, setBankDetails] = useState<string>('');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [merchantMsg, setMerchantMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshData = () => {
    const b = getUserWalletBalance(userId || userName, userRole);
    setBalance(b);
    setTransactions(getUserWalletTransactions(userId || userName));
    const myTopups = getTopUpRequests().filter(
      (r) => r.userId === userId || r.userName === userName
    );
    setTopUpRequests(myTopups);

    if (userRole === 'driver') {
      setSubStatus(getDriverSubscriptionStatus(userId));
    }
    if (userRole === 'merchant') {
      const reqs = getWithdrawalRequests().filter(
        (r) => r.merchantId === userId || r.merchantName === userName
      );
      setWithdrawalRequests(reqs);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const unsub = subscribeToWalletStore(() => {
        refreshData();
      });
      return () => unsub();
    }
  }, [isOpen, userId, userName, userRole]);

  // Execute Top-up Request (Pending Admin Approval)
  const handleExecuteTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;

    createTopUpRequestUnified({
      userId,
      userName,
      userRole,
      amount: topUpAmount,
      paymentMethod: payMethod,
      cardNumberOrBarcode: cardNumber,
    });

    setTopUpSuccessMsg(
      `✓ تم إرسال طلب الشحن بقيمة ${topUpAmount.toLocaleString()} د.ع بنجاح! سينزل المال بمحفظتك فور تأكيد وموافقة الأدمن.`
    );
    refreshData();
    setTimeout(() => {
      setTopUpSuccessMsg(null);
      setIsTopUpOpen(false);
    }, 2800);
  };

  // Merchant Request Withdrawal
  const handleMerchantWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setMerchantMsg(null);

    const amt = parseFloat(withdrawAmount.replace(/[^0-9.]/g, '')) || 0;
    if (amt <= 0) {
      setMerchantMsg({ type: 'error', text: 'يرجى إدخال مبلغ سحب صحيح أكبر من صفر.' });
      return;
    }
    if (!bankDetails.trim()) {
      setMerchantMsg({ type: 'error', text: 'يرجى كتابة تفاصيل الحساب البنكي / كي كارد لاستلام المبلغ.' });
      return;
    }

    const res = createWithdrawalRequest({
      merchantId: userId,
      merchantName: userName,
      amount: amt,
      bankAccountDetails: bankDetails,
    });

    if (res.success) {
      setMerchantMsg({ type: 'success', text: 'تم إرسال طلب السحب للأدمن بنجاح وهو قيد المراجعة الان!' });
      setWithdrawAmount('');
      refreshData();
    } else {
      setMerchantMsg({ type: 'error', text: res.errorMsg || 'حدث خطأ أثناء إرسال الطلب' });
    }
  };

  // Manual Driver Subscription Renewal
  const handleRenewDriverSub = () => {
    if (balance < DAILY_SUB_FEE) {
      setIsTopUpOpen(true);
      return;
    }
    deductDriverDailySubscription({ driverId: userId, driverName: userName });
    renewDriverSubscription(userId, 'wallet');
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl font-cairo">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2e3140] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2fa6a6] to-emerald-500 text-[#12131a] flex items-center justify-center shadow-lg shadow-[#2fa6a6]/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h2 className="text-base font-extrabold text-[#f3efe6]">
                  {userRole === 'customer'
                    ? '💳 محفظتي الإلكترونية'
                    : userRole === 'driver'
                    ? '💳 محفظة السائق والاشتراكات'
                    : '💰 أرباح ومحفظة المطعم'}
                </h2>
                <p className="text-xs text-[#9b98a6]">
                  {userRole === 'customer'
                    ? 'إدارة الرصيد والسحب والشحن المباشر'
                    : userRole === 'driver'
                    ? 'الاشتراك اليومي الثابت والسيولة المتاحة'
                    : 'إجمالي أرباح المبيعات وطلبات التحويل'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#12131a] hover:bg-[#232634] border border-[#2e3140] text-[#9b98a6] hover:text-[#f3efe6] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-4">
            {/* 1. Main Balance Card */}
            <div className="w-full bg-gradient-to-r from-[#12131a] via-[#1b1d28] to-[#232634] border border-[#2e3140] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#2fa6a6]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#9b98a6]">الرصيد المتاح حالياً</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#2fa6a6]/15 text-[#2fa6a6] border border-[#2fa6a6]/30 font-extrabold">
                  {userRole === 'customer' ? 'حساب زبون' : userRole === 'driver' ? 'حساب سائق' : 'حساب تاجر'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl sm:text-3xl font-black text-[#f3efe6] tracking-tight font-plex">
                  {balance.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-[#e8a33d]">د.ع (دينار عراقي)</span>
              </div>

              {/* Driver Proactive Alert / Status Card */}
              {userRole === 'driver' && (
                <div className="p-3 rounded-xl bg-[#12131a] border border-[#2e3140] mb-3 text-right">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-[#9b98a6]">حالة الاشتراك اليومي (4,000 د.ع):</span>
                    {subStatus.isSubscribed ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> مفعّل ✅ ({subStatus.hoursRemainingInSub} ساعة متبقية)
                      </span>
                    ) : (
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> غير مدفوع ⚠️
                      </span>
                    )}
                  </div>

                  {balance < DAILY_SUB_FEE && (
                    <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/15 p-2 rounded-lg border border-amber-500/30 font-bold">
                      ⚠️ تنبيه: رصيدك الحالي أقل من رسم الاشتراك اليومي (4,000 د.ع). يرجى شحن المحفظة لتفادي حظر استقبال الطلبات.
                    </div>
                  )}
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(true)}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#2fa6a6] to-emerald-500 hover:brightness-110 active:brightness-95 text-[#12131a] font-extrabold text-xs sm:text-sm font-cairo shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>شحن الرصيد 💳</span>
                </button>

                {userRole === 'driver' && !subStatus.isSubscribed && (
                  <button
                    type="button"
                    onClick={handleRenewDriverSub}
                    className="flex-1 h-11 rounded-xl bg-[#e8a33d] hover:bg-[#d8932d] text-[#12131a] font-extrabold text-xs sm:text-sm font-cairo shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>تجديد الاشتراك (4,000 د.ع)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Merchant Withdrawal Section */}
            {userRole === 'merchant' && (
              <div className="bg-[#12131a] border border-[#2e3140] rounded-2xl p-4 space-y-3 text-right">
                <h3 className="text-xs font-extrabold text-[#f3efe6] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#e8a33d]" />
                  <span>طلب سحب الأرباح إلى حسابك البنكي / كي كارد</span>
                </h3>

                {merchantMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold ${
                      merchantMsg.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {merchantMsg.text}
                  </div>
                )}

                <form onSubmit={handleMerchantWithdraw} className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#9b98a6] block mb-1">
                      المبلغ المراد سحبه (د.ع):
                    </label>
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="مثال: 50,000"
                      className="w-full h-10 px-3 bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs font-bold text-[#f3efe6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#9b98a6] block mb-1">
                      تفاصيل الحساب البنكي / رقم الكارد والاسم الكامل:
                    </label>
                    <textarea
                      rows={2}
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      placeholder="ماستر رافدين / كي كارد: 5284 **** **** 1234 باسم (مطعم الكباب الأربيلية)..."
                      className="w-full p-2.5 bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs text-[#f3efe6] outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 rounded-xl bg-[#e8a33d] hover:bg-[#d8932d] text-[#12131a] font-black text-xs font-cairo shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال طلب السحب للإدارة</span>
                  </button>
                </form>

                {/* Status of Previous Withdrawal Requests */}
                {withdrawalRequests.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#2e3140] space-y-2">
                    <span className="text-[11px] font-bold text-[#9b98a6] block">
                      طلبات السحب الأخيرة:
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                      {withdrawalRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-xl bg-[#1b1d28] border border-[#2e3140] text-xs flex items-center justify-between"
                        >
                          <div className="text-right">
                            <span className="font-extrabold text-[#f3efe6] block">
                              {req.amount.toLocaleString()} د.ع
                            </span>
                            <span className="text-[10px] text-[#9b98a6] block">{req.requestDate}</span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {req.status === 'pending'
                              ? '⏳ قيد المراجعة'
                              : req.status === 'approved'
                              ? '✅ تم التحويل'
                              : '❌ مرفوض'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Top-Up Modal View */}
            <AnimatePresence>
              {isTopUpOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#12131a] border border-[#2fa6a6]/50 rounded-2xl p-4 space-y-3 text-right"
                >
                  <div className="flex items-center justify-between border-b border-[#2e3140] pb-2">
                    <span className="text-xs font-extrabold text-[#2fa6a6] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>شحن الرصيد المباشر عبر الكي كارد / ماستر رافدين</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTopUpOpen(false)}
                      className="text-[#9b98a6] hover:text-[#f3efe6] text-xs"
                    >
                      إلغاء
                    </button>
                  </div>

                  {topUpSuccessMsg && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl text-center">
                      {topUpSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleExecuteTopUp} className="space-y-3">
                    {/* Amount Preset Chips */}
                    <div>
                      <label className="text-[11px] font-bold text-[#9b98a6] block mb-1.5">
                        اختر قيمة الشحن:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[10000, 25000, 50000, 100000, 250000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTopUpAmount(amt)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              topUpAmount === amt
                                ? 'bg-[#2fa6a6] text-[#12131a] border-[#2fa6a6] font-black shadow-md'
                                : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                            }`}
                          >
                            {amt.toLocaleString()} د.ع
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Number or Barcode */}
                    <div>
                      <label className="text-[11px] font-bold text-[#9b98a6] block mb-1">
                        رقم البطاقة / الباركود الإلكتروني:
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full h-10 px-3 bg-[#1b1d28] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-xs font-mono font-bold text-[#f3efe6] outline-none dir-ltr text-center"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-[#2fa6a6] to-emerald-500 text-[#12131a] font-black text-xs font-cairo shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-98 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>تأكيد وشحن {topUpAmount.toLocaleString()} د.ع الان</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending Top-Up Requests Section */}
            {topUpRequests.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#9b98a6]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>طلبات الشحن المرسلة (قيد مراجعة الأدمن):</span>
                  </span>
                  <span className="text-amber-400 font-bold">{topUpRequests.length} طلب</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {topUpRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-[#12131a] border border-[#2e3140] flex items-center justify-between text-right"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 font-plex">
                            {req.amount.toLocaleString()} د.ع
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {req.status === 'pending'
                              ? 'قيد مراجعة وتأكيد الأدمن'
                              : req.status === 'approved'
                              ? 'تمت الموافقة والشحن ✓'
                              : 'مرفوض'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#9b98a6]">
                          طريقة الدفع: {req.paymentMethod === 'qi_rafidain' ? 'كي كارد / ماستر رافدين' : 'ماستر كارد'} ({req.cardNumberOrBarcode})
                        </p>
                        {req.rejectionReason && (
                          <p className="text-[10px] text-red-400 font-semibold">
                            سبب الرفض: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8e92a8]">{req.requestDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Transaction History */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#9b98a6]">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#e8a33d]" />
                  <span>سجل الحركات والعمليات:</span>
                </span>
                <span>{transactions.length} عملية</span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-4 bg-[#12131a] rounded-xl text-center text-xs text-[#9b98a6] border border-[#2e3140]">
                  لا توجد حركات سابقة بالمحفظة.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-[#12131a] border border-[#2e3140] flex items-center justify-between text-right"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            tx.amount > 0
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {tx.amount > 0 ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-extrabold text-[#f3efe6] line-clamp-1">
                            {tx.title}
                          </h4>
                          <span className="text-[10px] text-[#9b98a6] block mt-0.5">
                            {tx.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`text-xs font-black font-plex ${
                            tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount.toLocaleString()} د.ع
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
