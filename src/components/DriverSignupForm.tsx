import React, { useState } from 'react';
import {
  CarTaxiFront,
  User,
  AtSign,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Car,
  Calendar,
  CreditCard,
  Palette,
  Upload,
  FileCheck,
  Camera,
  Contact,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { registerUserInDatabase } from '../lib/userDatabase';

interface DriverSignupFormProps {
  currentLang: Language;
  onBack: () => void;
  onSubmitSuccess?: () => void;
}

export const DriverSignupForm: React.FC<DriverSignupFormProps> = ({
  currentLang,
  onBack,
  onSubmitSuccess,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Section 1: Personal Info
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Section 2: Vehicle Info
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  // Section 3: KYC Uploads (file name / preview simulated state)
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Form State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation check
    if (
      !fullName.trim() ||
      !username.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim() ||
      !vehicleType.trim() ||
      !vehicleModel.trim() ||
      !plateNumber.trim()
    ) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Please complete all required personal and vehicle fields.'
          : 'يرجى استكمال جميع البيانات الشخصية وبيانات المركبة الأساسية.'
      );
      return;
    }

    setIsLoading(true);

    const processFiles = async () => {
      const imageFilesData: { name: string; dataUrl: string }[] = [];
      const readFileAsDataUrl = (file: File): Promise<{ name: string; dataUrl: string }> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ name: file.name, dataUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
        });
      };

      if (idCardFile) imageFilesData.push(await readFileAsDataUrl(idCardFile));
      if (licenseFile) imageFilesData.push(await readFileAsDataUrl(licenseFile));
      if (selfieFile) imageFilesData.push(await readFileAsDataUrl(selfieFile));

      const vehicleCombined = `${vehicleType} ${vehicleModel} ${vehicleYear} - ${vehicleColor} (${plateNumber})`;

      const regRes = registerUserInDatabase({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        accountType: 'driver',
        gender: gender,
        vehicleDetails: vehicleCombined,
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
            ? 'Your driver application has been submitted successfully for admin review!'
            : 'تم إرسال طلب تسجيل السائق بنجاح! جاري مراجعة وثائقك من الإدارة.'
        );
      }
    };

    setTimeout(() => {
      processFiles();
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Circular Amber-Copper Badge with Taxi/Car Icon 🚘 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 rounded-full bg-[#1b1d28] border border-[#e8a33d]/40 flex items-center justify-center shadow-xl shadow-black/40 amber-glow relative z-10 group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8a33d]/25 to-[#c97b3d]/20 flex items-center justify-center border border-[#e8a33d]/40 group-hover:border-[#e8a33d] transition-colors">
            <CarTaxiFront className="w-6 h-6 text-[#e8a33d]" />
          </div>
        </div>
        {/* Ambient Amber Glow */}
        <div className="absolute inset-0 rounded-full bg-[#e8a33d]/20 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Title & Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-6 w-full"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
          {t.driverFormTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
          {t.driverFormSubtitle}
        </p>
      </motion.div>

      {/* Red Alert Error Box / Success Box */}
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

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* SECTION 1: Personal Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <span className="w-2 h-2 rounded-full bg-[#e8a33d]" />
            <h2 className="text-xs font-bold text-[#e8a33d] font-plex tracking-wider uppercase">
              {t.personalInfoSection}
            </h2>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="driver-fullname"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.fullNameLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="driver-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.customerFullNamePlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <User className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Gender / Driver Category Field */}
          <div className="space-y-1.5 text-right bg-[#12131a] p-3 rounded-2xl border border-[#2e3140]">
            <label className="block text-xs font-bold text-[#f3efe6] font-cairo mb-1">
              الجنس ونوع الحساب: (لغرض تفعيل خدمة السائقة النسائية المخصصة)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gender === 'male'
                    ? 'bg-[#e8a33d]/20 text-[#e8a33d] border-[#e8a33d]'
                    : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                }`}
              >
                <span>👨 رجل (سائق عادي)</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gender === 'female'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500'
                    : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                }`}
              >
                <span>👩 امرأة (سائقة نسائية)</span>
              </button>
            </div>
            {gender === 'female' && (
              <p className="text-[11px] text-purple-300/90 leading-relaxed pt-1 font-medium">
                ✨ بمجرد التوثيق، ستتمكنين من اختيار استقبال "طلبات النساء فقط" للحصول على أعلى مستويات الخصوصية والأمان.
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="driver-username"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.usernameLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="driver-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <AtSign className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Address & Neighborhood Field with Map Button */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <label
                htmlFor="driver-address-input"
                className="block text-xs font-semibold text-[#9b98a6] font-cairo"
              >
                {t.addressLabel}
              </label>
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                id="open-driver-map-modal-btn"
                className="text-xs font-bold text-[#e8a33d] hover:text-[#f3efe6] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#e8a33d]" />
                <span>تحديد الموقع والحي على الخريطة 📍</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                id="driver-address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.customerAddressPlaceholder}
                className="w-full h-12 px-4 pr-11 pl-28 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <MapPin className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                id="driver-address-gps-inline-btn"
                className="absolute left-2.5 px-2.5 py-1.5 rounded-lg bg-[#e8a33d]/15 border border-[#e8a33d]/40 text-[#e8a33d] hover:bg-[#e8a33d] hover:text-[#12131a] text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>خريطة / GPS</span>
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="driver-phone"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.phoneLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="driver-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.customerPhonePlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30 text-right"
              />
              <Phone className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="driver-email"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.emailLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="driver-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <Mail className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="driver-password"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.passwordLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="driver-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full h-12 px-4 pr-11 pl-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex tracking-wider transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <Lock className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                id="toggle-driver-password-btn"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-3.5 p-1 text-[#9b98a6] hover:text-[#e8a33d] transition-colors rounded-lg focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* VISUAL DIVIDER 1: Vehicle Info */}
        <div className="relative flex py-2 items-center my-4">
          <div className="flex-grow border-t border-[#2e3140]" />
          <span className="shrink-0 mx-4 text-xs font-bold text-[#e8a33d] bg-[#12131a] px-3 py-1 rounded-full border border-[#2e3140] font-cairo flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-[#e8a33d]" />
            <span>{t.vehicleInfoSection}</span>
          </span>
          <div className="flex-grow border-t border-[#2e3140]" />
        </div>

        {/* SECTION 2: Vehicle Data */}
        <div className="space-y-4">
          {/* Vehicle Type */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="vehicle-type"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.vehicleTypeLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="vehicle-type"
                type="text"
                required
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder={t.vehicleTypePlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <CarTaxiFront className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Vehicle Model */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="vehicle-model"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.vehicleModelLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="vehicle-model"
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder={t.vehicleModelPlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <Car className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Vehicle Year */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="vehicle-year"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.vehicleYearLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="vehicle-year"
                type="text"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder={t.vehicleYearPlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <Calendar className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Plate Number */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="plate-number"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.plateNumberLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="plate-number"
                type="text"
                required
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder={t.plateNumberPlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <CreditCard className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Vehicle Color */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="vehicle-color"
              className="block text-xs font-semibold text-[#9b98a6] font-cairo"
            >
              {t.vehicleColorLabel}
            </label>
            <div className="relative flex items-center">
              <input
                id="vehicle-color"
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder={t.vehicleColorPlaceholder}
                className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
              />
              <Palette className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* VISUAL DIVIDER 2: KYC Verification */}
        <div className="relative flex py-2 items-center my-4">
          <div className="flex-grow border-t border-[#2e3140]" />
          <span className="shrink-0 mx-4 text-xs font-bold text-[#e8a33d] bg-[#12131a] px-3 py-1 rounded-full border border-[#2e3140] font-cairo flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#e8a33d]" />
            <span>{t.kycSection}</span>
          </span>
          <div className="flex-grow border-t border-[#2e3140]" />
        </div>

        {/* SECTION 3: KYC Document Uploads (3 Dashed Upload Boxes) */}
        <div className="space-y-4">
          {/* 1. ID Card Upload 🪪 */}
          <div className="space-y-1.5 text-right">
            <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
              {t.idCardDocLabel}
            </label>
            <label
              htmlFor="id-card-upload-input"
              className="w-full p-3.5 bg-[#232634] hover:bg-[#1b1d28] border-2 border-dashed border-[#2e3140] hover:border-[#e8a33d]/60 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 group"
            >
              {/* Right: Badge Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center text-lg shrink-0 group-hover:border-[#e8a33d]/40">
                  <Contact className="w-5 h-5 text-[#e8a33d]" />
                </div>
                {/* Center: Upload Text or File Name */}
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#f3efe6] font-cairo group-hover:text-[#e8a33d] transition-colors truncate max-w-[170px]">
                    {idCardFile ? idCardFile.name : t.clickToUpload}
                  </p>
                  <p className="text-[10px] text-[#9b98a6] font-plex mt-0.5">
                    {idCardFile ? `${(idCardFile.size / 1024).toFixed(0)} KB` : 'PNG, JPG (Max 5MB)'}
                  </p>
                </div>
              </div>

              {/* Left: Square Thumbnail Preview Placeholder */}
              <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shrink-0 overflow-hidden">
                {idCardFile ? (
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Upload className="w-4 h-4 text-[#9b98a6]" />
                )}
              </div>

              <input
                id="id-card-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, setIdCardFile)}
              />
            </label>
          </div>

          {/* 2. License Upload 🚗 */}
          <div className="space-y-1.5 text-right">
            <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
              {t.licenseDocLabel}
            </label>
            <label
              htmlFor="license-upload-input"
              className="w-full p-3.5 bg-[#232634] hover:bg-[#1b1d28] border-2 border-dashed border-[#2e3140] hover:border-[#e8a33d]/60 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 group"
            >
              {/* Right: Badge Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center text-lg shrink-0 group-hover:border-[#e8a33d]/40">
                  <CarTaxiFront className="w-5 h-5 text-[#e8a33d]" />
                </div>
                {/* Center: Upload Text or File Name */}
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#f3efe6] font-cairo group-hover:text-[#e8a33d] transition-colors truncate max-w-[170px]">
                    {licenseFile ? licenseFile.name : t.clickToUpload}
                  </p>
                  <p className="text-[10px] text-[#9b98a6] font-plex mt-0.5">
                    {licenseFile ? `${(licenseFile.size / 1024).toFixed(0)} KB` : 'PNG, JPG (Max 5MB)'}
                  </p>
                </div>
              </div>

              {/* Left: Square Thumbnail Preview Placeholder */}
              <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shrink-0 overflow-hidden">
                {licenseFile ? (
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Upload className="w-4 h-4 text-[#9b98a6]" />
                )}
              </div>

              <input
                id="license-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, setLicenseFile)}
              />
            </label>
          </div>

          {/* 3. Selfie Photo Upload 🤳 */}
          <div className="space-y-1.5 text-right">
            <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
              {t.selfieDocLabel}
            </label>
            <label
              htmlFor="selfie-upload-input"
              className="w-full p-3.5 bg-[#232634] hover:bg-[#1b1d28] border-2 border-dashed border-[#2e3140] hover:border-[#e8a33d]/60 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 group"
            >
              {/* Right: Badge Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center text-lg shrink-0 group-hover:border-[#e8a33d]/40">
                  <Camera className="w-5 h-5 text-[#e8a33d]" />
                </div>
                {/* Center: Upload Text or File Name */}
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#f3efe6] font-cairo group-hover:text-[#e8a33d] transition-colors truncate max-w-[170px]">
                    {selfieFile ? selfieFile.name : t.clickToUpload}
                  </p>
                  <p className="text-[10px] text-[#9b98a6] font-plex mt-0.5">
                    {selfieFile ? `${(selfieFile.size / 1024).toFixed(0)} KB` : 'PNG, JPG (Max 5MB)'}
                  </p>
                </div>
              </div>

              {/* Left: Square Thumbnail Preview Placeholder */}
              <div className="w-10 h-10 rounded-lg bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shrink-0 overflow-hidden">
                {selfieFile ? (
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Upload className="w-4 h-4 text-[#9b98a6]" />
                )}
              </div>

              <input
                id="selfie-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, setSelfieFile)}
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-2.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            id="submit-driver-registration-btn"
            className="w-full h-13 rounded-xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-base font-cairo shadow-lg shadow-[#e8a33d]/25 hover:shadow-xl hover:shadow-[#e8a33d]/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#12131a] border-t-transparent rounded-full animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </div>
            ) : (
              <span>{t.submitDriverRegistrationBtn}</span>
            )}
          </motion.button>

          {/* Secondary Bordered Only Button (Back) */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onBack}
            id="back-from-driver-form-btn"
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
