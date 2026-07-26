import React, { useState } from 'react';
import { User, AtSign, Phone, Mail, Lock, AlertTriangle, Eye, EyeOff, CheckCircle2, MapPin, Navigation, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { validateUsername } from '../lib/usernameCheck';
import { registerUserInDatabase } from '../lib/userDatabase';

interface CustomerSignupFormProps {
  currentLang: Language;
  onBack: () => void;
  onSubmitSuccess?: (fullName?: string) => void;
}

export const CustomerSignupForm: React.FC<CustomerSignupFormProps> = ({
  currentLang,
  onBack,
  onSubmitSuccess,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Error & Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation check
    if (!fullName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Please fill in all required fields.'
          : 'يرجى ملء جميع الحقول المطلوبة للبدء.'
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // Save to persistent DB
      const regRes = registerUserInDatabase({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        accountType: 'customer',
      });

      if (!regRes.success) {
        setErrorMessage(regRes.message);
        return;
      }

      setSuccessMessage(
        currentLang === 'en'
          ? 'Customer account created successfully in database!'
          : 'تم تسجيل العميل بنجاح في قاعدة البيانات!'
      );

      if (onSubmitSuccess) {
        onSubmitSuccess(
          regRes.user?.fullName || fullName.trim(),
          regRes.user?.id || regRes.user?.username
        );
      }
    }, 600);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Circular Badge with Turquoise Gradient & User Icon 🧍 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 rounded-full bg-[#1b1d28] border border-[#2fa6a6]/40 flex items-center justify-center shadow-xl shadow-black/40 relative z-10 group" style={{ boxShadow: '0 0 25px -5px rgba(47, 166, 166, 0.3)' }}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2fa6a6]/25 to-[#207a7a]/20 flex items-center justify-center border border-[#2fa6a6]/40 group-hover:border-[#2fa6a6] transition-colors">
            <User className="w-6 h-6 text-[#2fa6a6]" />
          </div>
        </div>
        {/* Ambient Turquoise Glow */}
        <div className="absolute inset-0 rounded-full bg-[#2fa6a6]/20 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Headings */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-6 w-full"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
          {t.customerFormTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
          {t.customerFormSubtitle}
        </p>
      </motion.div>

      {/* Light Red Error Box (Hidden by default, shown on error) */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, mb: 0 }}
            animate={{ opacity: 1, height: 'auto', mb: 20 }}
            exit={{ opacity: 0, height: 0, mb: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="w-full p-3.5 rounded-xl bg-[#d9614f]/10 border border-[#d9614f]/40 text-[#f3efe6] flex items-center gap-3 text-xs sm:text-sm font-cairo">
              <AlertTriangle className="w-5 h-5 text-[#d9614f] shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, mb: 0 }}
            animate={{ opacity: 1, height: 'auto', mb: 20 }}
            exit={{ opacity: 0, height: 0, mb: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="w-full p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center gap-3 text-xs sm:text-sm font-cairo">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="flex-1">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* 1. Full Name Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="customer-fullname-input"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.fullNameLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="customer-fullname-input"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.customerFullNamePlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30"
            />
            <User className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 2. Username Field */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between">
            <label
              htmlFor="customer-username-input"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.usernameLabel}
            </label>
            {username.trim().length > 0 && (
              <span className={`text-[11px] font-bold font-cairo flex items-center gap-1 ${
                validateUsername(username).isAvailable ? 'text-emerald-400' : validateUsername(username).isTaken ? 'text-red-400' : 'text-[#9b98a6]'
              }`}>
                {validateUsername(username).isAvailable && <Check className="w-3.5 h-3.5" />}
                {validateUsername(username).isTaken && <X className="w-3.5 h-3.5" />}
                {validateUsername(username).isAvailable ? t.usernameAvailable : validateUsername(username).isTaken ? t.usernameTaken : ''}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id="customer-username-input"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
              className={`w-full h-12 px-4 pr-11 pl-10 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border ${
                username.trim().length > 0 && validateUsername(username).isTaken
                  ? 'border-red-500/80 focus:border-red-500'
                  : username.trim().length > 0 && validateUsername(username).isAvailable
                  ? 'border-emerald-500/80 focus:border-emerald-500'
                  : 'border-[#2e3140] focus:border-[#2fa6a6]'
              } rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30`}
            />
            <AtSign className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            
            {/* Status Icon Badge inside Input */}
            {username.trim().length > 0 && (
              <div className="absolute left-3 flex items-center pointer-events-none">
                {validateUsername(username).isAvailable ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ) : validateUsername(username).isTaken ? (
                  <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 2.5 Address & Neighborhood Field with Map Button */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between">
            <label
              htmlFor="customer-address-input"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.addressLabel}
            </label>
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              id="open-customer-map-modal-btn"
              className="text-xs font-bold text-[#e8a33d] hover:text-[#f3efe6] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[#e8a33d]" />
              <span>تحديد الموقع والحي على الخريطة 📍</span>
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="customer-address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.customerAddressPlaceholder}
              className="w-full h-12 px-4 pr-11 pl-28 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30"
            />
            <MapPin className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              id="customer-address-gps-inline-btn"
              className="absolute left-2.5 px-2.5 py-1.5 rounded-lg bg-[#e8a33d]/15 border border-[#e8a33d]/40 text-[#e8a33d] hover:bg-[#e8a33d] hover:text-[#12131a] text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>خريطة / GPS</span>
            </button>
          </div>
        </div>

        {/* 3. Phone Number Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="customer-phone-input"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.phoneLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="customer-phone-input"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.customerPhonePlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30 text-right"
            />
            <Phone className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 4. Email Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="customer-email-input"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.emailLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="customer-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30"
            />
            <Mail className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 5. Password Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="customer-password-input"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.passwordLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="customer-password-input"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full h-12 px-4 pr-11 pl-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex tracking-wider transition-all duration-200 outline-none focus:ring-1 focus:ring-[#2fa6a6]/30"
            />
            <Lock className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              id="toggle-customer-password-btn"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute left-3.5 p-1 text-[#9b98a6] hover:text-[#2fa6a6] transition-colors rounded-lg focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Amber-Copper Gradient Full-Width Button */}
        <div className="pt-2 space-y-2.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            id="create-customer-account-btn"
            className="w-full h-13 rounded-xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-base font-cairo shadow-lg shadow-[#e8a33d]/25 hover:shadow-xl hover:shadow-[#e8a33d]/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#12131a] border-t-transparent rounded-full animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : (
              <span>{t.createAccountBtn}</span>
            )}
          </motion.button>

          {/* Secondary Bordered Only Button (Back) */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onBack}
            id="back-to-account-selection-btn"
            className="w-full h-12 rounded-xl bg-transparent border border-[#2e3140] hover:border-[#9b98a6] text-[#f3efe6] hover:text-[#e8a33d] font-bold text-sm font-cairo transition-all duration-200 flex items-center justify-center cursor-pointer"
          >
            <span>{t.backBtn}</span>
          </motion.button>
        </div>
      </form>

      {/* Location & Neighborhood Map Modal */}
      <LocationPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        initialAddress={address}
        currentLang={currentLang}
        onSaveLocation={(locData) => {
          setAddress(locData.address);
        }}
      />
    </div>
  );
};
