import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Store,
  MapPin,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { registerUserInDatabase } from '../lib/userDatabase';

interface MerchantSignupFormProps {
  currentLang: Language;
  onBack: () => void;
  onSubmitSuccess?: () => void;
}

export const MerchantSignupForm: React.FC<MerchantSignupFormProps> = ({
  currentLang,
  onBack,
  onSubmitSuccess,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Form Fields
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // File Upload State
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (
      !restaurantName.trim() ||
      !address.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Please fill in all required fields.'
          : 'يرجى ملء جميع الحقول المطلوبة للبدء.'
      );
      return;
    }

    setIsLoading(true);

    const processMerchantFile = async () => {
      const imageFilesData: { name: string; dataUrl: string }[] = [];
      if (logoFile) {
        const readFileAsDataUrl = (file: File): Promise<{ name: string; dataUrl: string }> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({ name: file.name, dataUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
          });
        };
        imageFilesData.push(await readFileAsDataUrl(logoFile));
      }

      const cleanUsername = restaurantName.trim().toLowerCase().replace(/\s+/g, '_');
      const regRes = registerUserInDatabase({
        fullName: restaurantName.trim(),
        username: cleanUsername,
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        accountType: 'merchant',
        address: address.trim(),
        status: 'pending',
        kycImageFiles: imageFilesData,
      });

      setIsLoading(false);

      if (!regRes.success) {
        setErrorMessage(regRes.message);
        return;
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        setSuccessMessage(
          currentLang === 'en'
            ? 'Restaurant registration submitted successfully! Pending admin approval.'
            : 'تم إرسال طلب تسجيل المطعم بنجاح! سيتم تفعيله بعد موافقة الإدارة.'
        );
      }
    };

    setTimeout(() => {
      processMerchantFile();
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Circular Purple Badge with Utensils Icon 🍽️ */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div
          className="w-16 h-16 rounded-full bg-[#1b1d28] border border-[#b15fce]/40 flex items-center justify-center shadow-xl shadow-black/40 relative z-10 group"
          style={{ boxShadow: '0 0 25px -5px rgba(177, 95, 206, 0.3)' }}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b15fce]/25 to-[#7a3c94]/20 flex items-center justify-center border border-[#b15fce]/40 group-hover:border-[#b15fce] transition-colors">
            <UtensilsCrossed className="w-6 h-6 text-[#b15fce]" />
          </div>
        </div>
        {/* Ambient Purple Glow */}
        <div className="absolute inset-0 rounded-full bg-[#b15fce]/20 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Headings */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-6 w-full"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
          {t.merchantFormTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
          {t.merchantFormSubtitle}
        </p>
      </motion.div>

      {/* Red Error Box / Green Success Box */}
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

      {/* Merchant Registration Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* 1. Restaurant Name Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="merchant-restaurant-name"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.restaurantNameLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="merchant-restaurant-name"
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder={t.restaurantNamePlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#b15fce]/30"
            />
            <UtensilsCrossed className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 2. Address & Neighborhood Field with Map Button */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between">
            <label
              htmlFor="merchant-address"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.restaurantAddressLabel}
            </label>
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              id="open-merchant-map-modal-btn"
              className="text-xs font-bold text-[#e8a33d] hover:text-[#f3efe6] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[#e8a33d]" />
              <span>تحديد الموقع والحي على الخريطة 📍</span>
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="merchant-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.restaurantAddressPlaceholder}
              className="w-full h-12 px-4 pr-11 pl-28 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#b15fce]/30"
            />
            <MapPin className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              id="merchant-address-gps-inline-btn"
              className="absolute left-2.5 px-2.5 py-1.5 rounded-lg bg-[#e8a33d]/15 border border-[#e8a33d]/40 text-[#e8a33d] hover:bg-[#e8a33d] hover:text-[#12131a] text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>خريطة / GPS</span>
            </button>
          </div>
        </div>

        {/* 3. Phone Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="merchant-phone"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.phoneLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="merchant-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.customerPhonePlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#b15fce]/30 text-right"
            />
            <Phone className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 4. Email Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="merchant-email"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.emailLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="merchant-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#b15fce]/30"
            />
            <Mail className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* 5. Password Field */}
        <div className="space-y-1.5 text-right">
          <label
            htmlFor="merchant-password"
            className="block text-xs font-semibold text-[#9b98a6] font-cairo"
          >
            {t.passwordLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="merchant-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full h-12 px-4 pr-11 pl-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex tracking-wider transition-all duration-200 outline-none focus:ring-1 focus:ring-[#b15fce]/30"
            />
            <Lock className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              id="toggle-merchant-password-btn"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute left-3.5 p-1 text-[#9b98a6] hover:text-[#b15fce] transition-colors rounded-lg focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* File Upload Element: Restaurant Photo / Logo 🏪 */}
        <div className="space-y-1.5 text-right pt-1">
          <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
            {t.restaurantLogoDocLabel}
          </label>
          <label
            htmlFor="restaurant-logo-upload-input"
            className="w-full p-3.5 bg-[#232634] hover:bg-[#1b1d28] border-2 border-dashed border-[#2e3140] hover:border-[#b15fce]/60 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 group"
          >
            {/* Right: Store Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center text-lg shrink-0 group-hover:border-[#b15fce]/40">
                <Store className="w-5 h-5 text-[#b15fce]" />
              </div>
              {/* Center: Upload Text */}
              <div className="text-right">
                <p className="text-xs font-semibold text-[#f3efe6] font-cairo group-hover:text-[#b15fce] transition-colors truncate max-w-[170px]">
                  {logoFile ? logoFile.name : t.clickToUpload}
                </p>
                <p className="text-[10px] text-[#9b98a6] font-plex mt-0.5">
                  {logoFile ? `${(logoFile.size / 1024).toFixed(0)} KB` : 'PNG, JPG (Max 5MB)'}
                </p>
              </div>
            </div>

            {/* Left: Square Thumbnail Preview Placeholder */}
            <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shrink-0 overflow-hidden">
              {logoFile ? (
                <FileCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Upload className="w-4 h-4 text-[#9b98a6]" />
              )}
            </div>

            <input
              id="restaurant-logo-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Buttons */}
        <div className="pt-3 space-y-2.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            id="submit-merchant-registration-btn"
            className="w-full h-13 rounded-xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-base font-cairo shadow-lg shadow-[#e8a33d]/25 hover:shadow-xl hover:shadow-[#e8a33d]/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#12131a] border-t-transparent rounded-full animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </div>
            ) : (
              <span>{t.submitMerchantRegistrationBtn}</span>
            )}
          </motion.button>

          {/* Secondary Bordered Only Button (Back) */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onBack}
            id="back-from-merchant-form-btn"
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
