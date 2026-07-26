import React, { useState } from 'react';
import { Sparkles, User, CarTaxiFront, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';

interface AccountTypeSelectionProps {
  currentLang: Language;
  onGoToLogin: () => void;
  onSelectCustomerAccount?: () => void;
  onSelectDriverAccount?: () => void;
  onSelectMerchantAccount?: () => void;
}

export const AccountTypeSelection: React.FC<AccountTypeSelectionProps> = ({
  currentLang,
  onGoToLogin,
  onSelectCustomerAccount,
  onSelectDriverAccount,
  onSelectMerchantAccount,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const isRTL = currentLang !== 'en';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Circular Amber Badge with Sparkle icon ✨ */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 rounded-full bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shadow-xl shadow-black/40 amber-glow relative z-10 group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8a33d]/25 to-[#c97b3d]/15 flex items-center justify-center border border-[#e8a33d]/40 group-hover:border-[#e8a33d] transition-colors">
            <Sparkles className="w-6 h-6 text-[#e8a33d] animate-pulse" />
          </div>
        </div>
        {/* Ambient Halo */}
        <div className="absolute inset-0 rounded-full bg-[#e8a33d]/20 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Headings */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-6 w-full"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
          {t.selectAccountTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
          {t.selectAccountSubtitle}
        </p>
      </motion.div>

      {/* Vertical List of 3 Account Type Cards */}
      <div className="w-full space-y-3.5 mb-6">
        {/* 1. Customer Card (Turquoise #2fa6a6) */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            setSelectedType('customer');
            if (onSelectCustomerAccount) {
              onSelectCustomerAccount();
            }
          }}
          className={`w-full p-4 rounded-xl bg-[#1b1d28] hover:bg-[#232634] border transition-all duration-200 cursor-pointer flex items-center gap-4 group ${
            selectedType === 'customer'
              ? 'border-[#2fa6a6] shadow-lg shadow-[#2fa6a6]/15 bg-[#232634]'
              : 'border-[#2e3140] hover:border-[#2fa6a6]/50'
          }`}
        >
          {/* Circular icon container with turquoise background */}
          <div className="w-12 h-12 rounded-full bg-[#2fa6a6]/15 border border-[#2fa6a6]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <User className="w-6 h-6 text-[#2fa6a6]" />
          </div>

          <div className="flex-1 text-right">
            <h3 className="text-base font-bold text-[#f3efe6] font-cairo group-hover:text-[#2fa6a6] transition-colors flex items-center gap-2">
              <span>{t.customerTitle}</span>
              <span className="text-sm">🧍</span>
            </h3>
            <p className="text-xs text-[#9b98a6] font-cairo mt-0.5 leading-relaxed">
              {t.customerDesc}
            </p>
          </div>

          <div className="text-[#9b98a6] group-hover:text-[#2fa6a6] transition-colors shrink-0">
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </motion.div>

        {/* 2. Driver Card (Amber #e8a33d) */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            setSelectedType('driver');
            if (onSelectDriverAccount) {
              onSelectDriverAccount();
            }
          }}
          className={`w-full p-4 rounded-xl bg-[#1b1d28] hover:bg-[#232634] border transition-all duration-200 cursor-pointer flex items-center gap-4 group ${
            selectedType === 'driver'
              ? 'border-[#e8a33d] shadow-lg shadow-[#e8a33d]/15 bg-[#232634]'
              : 'border-[#2e3140] hover:border-[#e8a33d]/50'
          }`}
        >
          {/* Circular icon container with amber background */}
          <div className="w-12 h-12 rounded-full bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CarTaxiFront className="w-6 h-6 text-[#e8a33d]" />
          </div>

          <div className="flex-1 text-right">
            <h3 className="text-base font-bold text-[#f3efe6] font-cairo group-hover:text-[#e8a33d] transition-colors flex items-center gap-2">
              <span>{t.driverTitle}</span>
              <span className="text-sm">🚘</span>
            </h3>
            <p className="text-xs text-[#9b98a6] font-cairo mt-0.5 leading-relaxed">
              {t.driverDesc}
            </p>
          </div>

          <div className="text-[#9b98a6] group-hover:text-[#e8a33d] transition-colors shrink-0">
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </motion.div>

        {/* 3. Merchant / Restaurant Card (Purple #b15fce) */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            setSelectedType('merchant');
            if (onSelectMerchantAccount) {
              onSelectMerchantAccount();
            }
          }}
          className={`w-full p-4 rounded-xl bg-[#1b1d28] hover:bg-[#232634] border transition-all duration-200 cursor-pointer flex items-center gap-4 group ${
            selectedType === 'merchant'
              ? 'border-[#b15fce] shadow-lg shadow-[#b15fce]/15 bg-[#232634]'
              : 'border-[#2e3140] hover:border-[#b15fce]/50'
          }`}
        >
          {/* Circular icon container with purple background */}
          <div className="w-12 h-12 rounded-full bg-[#b15fce]/15 border border-[#b15fce]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-6 h-6 text-[#b15fce]" />
          </div>

          <div className="flex-1 text-right">
            <h3 className="text-base font-bold text-[#f3efe6] font-cairo group-hover:text-[#b15fce] transition-colors flex items-center gap-2">
              <span>{t.merchantTitle}</span>
              <span className="text-sm">🍽️</span>
            </h3>
            <p className="text-xs text-[#9b98a6] font-cairo mt-0.5 leading-relaxed">
              {t.merchantDesc}
            </p>
          </div>

          <div className="text-[#9b98a6] group-hover:text-[#b15fce] transition-colors shrink-0">
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </motion.div>
      </div>

      {/* Bottom Centered Link to Return to Login */}
      <div className="text-center text-xs sm:text-sm text-[#9b98a6] font-cairo">
        <span>{t.hasAccountText}</span>{' '}
        <button
          type="button"
          onClick={onGoToLogin}
          id="go-to-login-btn"
          className="text-[#e8a33d] font-bold hover:underline cursor-pointer transition-colors inline-block mr-1"
        >
          {t.loginLink}
        </button>
      </div>
    </div>
  );
};
