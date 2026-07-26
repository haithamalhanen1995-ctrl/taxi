import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Camera,
  Edit2,
  Check,
  Receipt,
  Lock,
  LogOut,
  ChevronLeft,
  Calendar,
  MapPin,
  Car,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { MyWalletModal } from './MyWalletModal';
import {
  getUserById,
  updateUserProfile,
  updateUserPassword,
  UserRecord,
} from '../lib/userDatabase';
import { getAllRides, StoredRide } from '../lib/ridesDatabase';
import { Language } from '../types';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  accountType: 'customer' | 'driver' | 'merchant';
  currentLang: Language;
  onLogout: () => void;
  onProfileUpdated?: (newFullName: string, newUsername: string) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  accountType,
  currentLang,
  onLogout,
  onProfileUpdated, }) => {
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [fullName, setFullName] = useState(userName);
  const [username, setUsername] = useState('user');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Inline editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [tempUsername, setTempUsername] = useState('user');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states inside drawer
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Password modal states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Completed Rides list
  const [completedRides, setCompletedRides] = useState<StoredRide[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch or refresh user record when drawer opens or userId changes
  useEffect(() => {
    if (isOpen) {
      const rec = getUserById(userId) || getUserById(userName);
      if (rec) {
        setUserRecord(rec);
        setFullName(rec.fullName || userName);
        setUsername(rec.username || 'user');
        setAvatarUrl(rec.avatarUrl);
        setTempName(rec.fullName || userName);
        setTempUsername(rec.username || 'user');
      } else {
        setFullName(userName);
        setTempName(userName);
      }

      // Load completed rides for history
      const allRides = getAllRides();
      // Filter for customer/driver
      const userRides = allRides.filter(
        (r) =>
          r.customerId === userId ||
          r.customerName === userName ||
          r.driverName === userName ||
          r.status === 'completed'
      );
      setCompletedRides(userRides);
    }
  }, [isOpen, userId, userName]);

  // Handle avatar upload via file picker
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setProfileMsg({ type: 'error', text: 'حجم الصورة كبير جداً! يرجى اختيار صورة أقل من 3 ميغابايت.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        const res = updateUserProfile(userId || userName, { avatarUrl: result });
        if (res.success) {
          setProfileMsg({ type: 'success', text: 'تم تحديث الصورة الشخصية بنجاح!' });
          setTimeout(() => setProfileMsg(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Full Name changes
  const handleSaveName = () => {
    if (!tempName.trim()) {
      setTempName(fullName);
      setIsEditingName(false);
      return;
    }
    const res = updateUserProfile(userId || userName, { fullName: tempName.trim() });
    if (res.success) {
      setFullName(tempName.trim());
      setIsEditingName(false);
      setProfileMsg({ type: 'success', text: 'تم تحديث الاسم بنجاح!' });
      if (onProfileUpdated) onProfileUpdated(tempName.trim(), username);
      setTimeout(() => setProfileMsg(null), 3000);
    } else {
      setProfileMsg({ type: 'error', text: res.message });
    }
  };

  // Save Username changes
  const handleSaveUsername = () => {
    if (!tempUsername.trim()) {
      setTempUsername(username);
      setIsEditingUsername(false);
      return;
    }
    const res = updateUserProfile(userId || userName, { username: tempUsername.trim() });
    if (res.success) {
      setUsername(tempUsername.trim());
      setIsEditingUsername(false);
      setProfileMsg({ type: 'success', text: 'تم تحديث اسم المستخدم بنجاح!' });
      if (onProfileUpdated) onProfileUpdated(fullName, tempUsername.trim());
      setTimeout(() => setProfileMsg(null), 3000);
    } else {
      setProfileMsg({ type: 'error', text: res.message });
    }
  };

  // Save Password changes
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'يرجى إدخال كلمة المرور الحالية.' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف/أرقام على الأقل.' });
      return;
    }

    const res = updateUserPassword(userId || userName, currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح!' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setPasswordMsg(null);
        setIsPasswordModalOpen(false);
      }, 2000);
    } else {
      setPasswordMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-cairo">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Side Drawer Body - Slides from Right (RTL) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 w-[82%] max-w-sm bg-[#1b1d28] border-l border-[#2e3140] shadow-2xl flex flex-col z-10 overflow-y-auto no-scrollbar"
          >
            {/* Header / Close button */}
            <div className="p-4 border-b border-[#2e3140] flex items-center justify-between">
              <span className="text-xs font-bold text-[#9b98a6]">القائمة الرئيسية</span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#12131a] hover:bg-[#232634] border border-[#2e3140] text-[#f3efe6] flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-5 border-b border-[#2e3140] flex flex-col items-center text-center relative bg-[#12131a]/50">
              {/* Profile Avatar with Edit Overlay Button */}
              <div className="relative group mb-3">
                <div className="w-20 h-20 rounded-full border-2 border-[#e8a33d] overflow-hidden bg-[#232634] flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-[#e8a33d]" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="تغيير الصورة الشخصية"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#e8a33d] text-[#12131a] border-2 border-[#1b1d28] flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Full Name Inline Editing */}
              <div className="w-full mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1 justify-center max-w-[220px] mx-auto">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full px-2 py-1 bg-[#12131a] border border-[#e8a33d] rounded-lg text-xs font-bold text-[#f3efe6] text-center outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 rounded-lg bg-[#e8a33d] text-[#12131a] shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 group/name">
                    <h3 className="font-bold text-sm text-[#f3efe6]">{fullName}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(fullName);
                        setIsEditingName(true);
                      }}
                      className="text-[#9b98a6] hover:text-[#e8a33d] transition-colors cursor-pointer"
                      title="تعديل الاسم"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Username Inline Editing */}
              <div className="w-full mb-2">
                {isEditingUsername ? (
                  <div className="flex items-center gap-1 justify-center max-w-[200px] mx-auto">
                    <input
                      type="text"
                      value={tempUsername}
                      onChange={(e) => setTempUsername(e.target.value)}
                      className="w-full px-2 py-0.5 bg-[#12131a] border border-[#2fa6a6] rounded-lg text-[11px] font-bold text-[#2fa6a6] text-center outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveUsername}
                      className="p-1 rounded-lg bg-[#2fa6a6] text-[#12131a] shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs text-[#2fa6a6] font-mono dir-ltr">@{username}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempUsername(username);
                        setIsEditingUsername(true);
                      }}
                      className="text-[#9b98a6] hover:text-[#2fa6a6] transition-colors cursor-pointer"
                      title="تعديل اسم المستخدم"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Account Role Badge */}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8a33d]/15 text-[#e8a33d] border border-[#e8a33d]/30 inline-block">
                {accountType === 'customer'
                  ? 'حساب زبون'
                  : accountType === 'driver'
                  ? 'حساب سائق تكسي'
                  : 'حساب تاجر / مطعم'}
              </span>

              {/* Profile Message Alert */}
              {profileMsg && (
                <div
                  className={`mt-2.5 px-3 py-1.5 rounded-xl text-[11px] font-bold w-full text-center ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {profileMsg.text}
                </div>
              )}
            </div>

            {/* Menu Items List */}
            <div className="p-3 space-y-1.5 flex-1">
              {/* E-Wallet Item */}
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-[#12131a] to-[#232634] hover:bg-[#232634] border border-[#2fa6a6]/50 hover:border-[#2fa6a6] text-[#f3efe6] transition-all flex items-center justify-between cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2fa6a6]/20 border border-[#2fa6a6]/40 flex items-center justify-center text-[#2fa6a6] group-hover:scale-105 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold group-hover:text-[#2fa6a6] transition-colors flex items-center gap-1.5">
                      <span>💳 محفظتي</span>
                      <span className="text-[10px] bg-[#2fa6a6]/15 text-[#2fa6a6] px-1.5 py-0.2 rounded font-bold">
                        رصيد وشحن
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9b98a6]">
                      عرض الرصيد الحالي والشحن وإدارة الحساب
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#9b98a6] group-hover:text-[#2fa6a6] transition-colors" />
              </button>

              {/* Trip Records / History Item */}
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="w-full p-3 rounded-xl bg-[#12131a] hover:bg-[#232634] border border-[#2e3140] hover:border-[#2fa6a6] text-[#f3efe6] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2fa6a6]/15 border border-[#2fa6a6]/30 flex items-center justify-center text-[#2fa6a6]">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold group-hover:text-[#2fa6a6] transition-colors">
                      سجلات الرحلات
                    </div>
                    <div className="text-[10px] text-[#9b98a6]">
                      عرض قائمة كل الرحلات السابقة المكتملة
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#9b98a6] group-hover:text-[#2fa6a6] transition-colors" />
              </button>

              {/* Recent Trips Preview snippet directly inside menu */}
              {completedRides.length > 0 && (
                <div className="p-2.5 rounded-xl bg-[#12131a]/60 border border-[#2e3140]/60 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#9b98a6]">
                    <span>آخر رحلة مكتملة:</span>
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="text-[#2fa6a6] hover:underline cursor-pointer"
                    >
                      عرض الكل ({completedRides.length})
                    </button>
                  </div>
                  <div className="text-right space-y-1 text-[11px] bg-[#12131a] p-2 rounded-lg border border-[#2e3140]">
                    <div className="font-bold text-[#f3efe6] flex items-center justify-between">
                      <span className="truncate max-w-[140px]">{completedRides[0].pickupName}</span>
                      <span className="text-[#e8a33d] font-mono">{completedRides[0].fareFormatted}</span>
                    </div>
                    <div className="text-[10px] text-[#9b98a6] truncate">
                      إلى: {completedRides[0].destinationName}
                    </div>
                  </div>
                </div>
              )}

              {/* Change Password Item */}
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full p-3 rounded-xl bg-[#12131a] hover:bg-[#232634] border border-[#2e3140] hover:border-[#e8a33d] text-[#f3efe6] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold group-hover:text-[#e8a33d] transition-colors">
                      تغيير كلمة المرور
                    </div>
                    <div className="text-[10px] text-[#9b98a6]">تحديث كلمة المرور لحسابك</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#9b98a6] group-hover:text-[#e8a33d] transition-colors" />
              </button>
            </div>

            {/* Bottom Logout Section */}
            <div className="p-4 border-t border-[#2e3140] bg-[#12131a]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full h-11 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>
          </motion.div>

          {/* TRIP HISTORY MODAL */}
          <AnimatePresence>
            {isHistoryModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#2e3140]">
                    <div className="flex items-center gap-2 text-[#2fa6a6]">
                      <Receipt className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-[#f3efe6]">سجل الرحلات السابقة المكتملة</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(false)}
                      className="w-7 h-7 rounded-full bg-[#12131a] text-[#9b98a6] hover:text-white flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1">
                    {completedRides.length === 0 ? (
                      <div className="text-center py-10 space-y-2 text-[#9b98a6]">
                        <Receipt className="w-10 h-10 mx-auto opacity-40 text-[#2fa6a6]" />
                        <p className="text-xs font-bold">لا يوجد رحلات مسجلة بسجلك حالياً.</p>
                        <p className="text-[11px] text-[#9b98a6]/70">
                          عند إتمام أي رحلة تكسي جديدة ستظهر تفاصيلها كاملة هنا.
                        </p>
                      </div>
                    ) : (
                      completedRides.map((ride) => (
                        <div
                          key={ride.id}
                          className="p-3 bg-[#12131a] border border-[#2e3140] rounded-xl space-y-2 text-right"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#e8a33d] font-mono">{ride.fareFormatted}</span>
                            <span className="text-[#9b98a6] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#2fa6a6]" />
                              {ride.timestamp
                                ? new Date(ride.timestamp).toLocaleDateString('ar-IQ', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'مكتملة'}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-[#2fa6a6]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{ride.pickupName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[#b15fce]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{ride.destinationName}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#2e3140]/60 text-[10px] text-[#9b98a6]">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3 text-[#e8a33d]" />
                              فئة: {ride.category === 'vip' ? 'VIP' : ride.category === 'comfort' ? 'كومفورت' : 'اقتصادي'}
                            </span>
                            <span className="text-emerald-400 font-bold">مكتملة ✓</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="w-full h-10 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#f3efe6] font-bold text-xs cursor-pointer"
                  >
                    إغلاق السجل
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* CHANGE PASSWORD MODAL */}
          <AnimatePresence>
            {isPasswordModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-5 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#2e3140]">
                    <div className="flex items-center gap-2 text-[#e8a33d]">
                      <Lock className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-[#f3efe6]">تغيير كلمة المرور</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasswordModalOpen(false);
                        setPasswordMsg(null);
                      }}
                      className="w-7 h-7 rounded-full bg-[#12131a] text-[#9b98a6] hover:text-white flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {passwordMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        passwordMsg.type === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {passwordMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{passwordMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSavePassword} className="space-y-3 text-right">
                    <div>
                      <label className="block text-xs font-bold text-[#9b98a6] mb-1">
                        كلمة المرور الحالية
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] text-xs font-cairo outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#9b98a6] mb-1">
                        كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] text-xs font-cairo outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="submit"
                        className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] hover:brightness-110 text-[#12131a] font-bold text-xs cursor-pointer"
                      >
                        حفظ التغيير
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPasswordModalOpen(false);
                          setPasswordMsg(null);
                        }}
                        className="px-4 h-10 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#9b98a6] font-bold text-xs cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MY WALLET MODAL */}
          <MyWalletModal
            isOpen={isWalletModalOpen}
            onClose={() => setIsWalletModalOpen(false)}
            userId={userId || userName}
            userName={userName}
            userRole={accountType}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
