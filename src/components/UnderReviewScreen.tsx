import React from 'react';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Car,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';

interface UnderReviewScreenProps {
  currentLang: Language;
  accountType: 'driver' | 'merchant';
  onBackToHome: () => void;
  referenceNumber?: string;
}

export const UnderReviewScreen: React.FC<UnderReviewScreenProps> = ({
  currentLang,
  accountType,
  onBackToHome,
  referenceNumber = 'TK-84920',
}) => {
  const t = TRANSLATIONS[currentLang];
  const [copied, setCopied] = React.useState(false);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const accountTypeTitle =
    accountType === 'driver'
      ? currentLang === 'en'
        ? 'Driver Account Application'
        : 'طلب حساب سائق'
      : currentLang === 'en'
      ? 'Merchant / Restaurant Application'
      : 'طلب حساب تاجر / مطعم';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Animated Status Badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div
          className="w-20 h-20 rounded-full bg-[#1b1d28] border border-[#e8a33d]/40 flex items-center justify-center shadow-xl shadow-black/50 relative z-10 group"
          style={{ boxShadow: '0 0 30px -5px rgba(232, 163, 61, 0.35)' }}
        >
          <div className="w-15 h-15 rounded-full bg-gradient-to-br from-[#e8a33d]/25 via-[#c97b3d]/20 to-[#b15fce]/20 flex items-center justify-center border border-[#e8a33d]/50 group-hover:border-[#e8a33d] transition-colors">
            <Clock className="w-8 h-8 text-[#e8a33d] animate-pulse" />
          </div>
        </div>

        {/* Ambient Ring Glow */}
        <div className="absolute inset-0 rounded-full bg-[#e8a33d]/20 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Main Title & Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-6 w-full"
      >
        {/* Account Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#232634] border border-[#2e3140] mb-3">
          {accountType === 'driver' ? (
            <Car className="w-3.5 h-3.5 text-[#e8a33d]" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-[#b15fce]" />
          )}
          <span className="text-xs font-bold text-[#f3efe6] font-cairo">
            {accountTypeTitle}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
          {t.underReviewTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
          {t.underReviewSubtitle}
        </p>
      </motion.div>

      {/* Reference & Info Card */}
      <div className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 mb-5 space-y-3">
        {/* Reference ID Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#232634] border border-[#2e3140]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#e8a33d]" />
            <div>
              <p className="text-[10px] text-[#9b98a6] font-cairo">
                {t.refNumberLabel}
              </p>
              <p className="text-sm font-bold text-[#f3efe6] font-plex tracking-wider">
                #{referenceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyRef}
            id="copy-reference-number-btn"
            className="p-2 rounded-lg bg-[#1b1d28] hover:bg-[#2e3140] text-[#9b98a6] hover:text-[#e8a33d] transition-colors flex items-center gap-1 text-xs font-cairo"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ</span>
              </>
            )}
          </button>
        </div>

        {/* Expected Time Note */}
        <div className="flex items-center justify-between text-xs font-cairo px-1">
          <span className="text-[#9b98a6]">{t.estimatedTimeLabel}:</span>
          <span className="text-[#e8a33d] font-bold">{t.estimatedTimeVal}</span>
        </div>
      </div>

      {/* Application Status Timeline / Stepper */}
      <div className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 mb-5 space-y-4">
        <h3 className="text-xs font-bold text-[#9b98a6] font-cairo uppercase tracking-wider text-right">
          حالة الطلب الحالية:
        </h3>

        <div className="relative pr-2 space-y-4 text-right">
          {/* Timeline Vertical Line */}
          <div className="absolute top-2 right-4 bottom-2 w-0.5 bg-[#2e3140] -z-0" />

          {/* Step 1: Received */}
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-[#f3efe6] font-cairo">
                {t.statusReceived}
              </h4>
              <p className="text-[11px] text-[#9b98a6] font-cairo">
                تم حفظ وتوثيق جميع البيانات والمستندات بنجاح
              </p>
            </div>
          </div>

          {/* Step 2: Under Review (Current Active) */}
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#e8a33d]/20 border-2 border-[#e8a33d] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#e8a33d]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-[#e8a33d] font-cairo">
                {t.statusReviewing}
              </h4>
              <p className="text-[11px] text-[#9b98a6] font-cairo">
                فريق الجودة ينقّح مستندات الهوية والشروط المطلوبة
              </p>
            </div>
          </div>

          {/* Step 3: Approval & Activation */}
          <div className="relative z-10 flex items-start gap-3 opacity-60">
            <div className="w-5 h-5 rounded-full bg-[#232634] border-2 border-[#2e3140] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9b98a6]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-[#9b98a6] font-cairo">
                {t.statusApproval}
              </h4>
              <p className="text-[11px] text-[#9b98a6]/70 font-cairo">
                إرسال إشعار التفعيل والدخول للتطبيق مباشرة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Contact Box */}
      <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-[#232634] to-[#1b1d28] border border-[#2e3140] text-center space-y-3 mb-6">
        <p className="text-xs text-[#9b98a6] font-cairo">
          {t.supportHelpText}
        </p>
        <a
          href={`https://wa.me/9647700000000?text=${encodeURIComponent(
            `مرحباً فريق تكسي الأمان، أود المتابعة بخصوص طلب تسجيل ${accountTypeTitle} رقم #${referenceNumber}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          id="contact-whatsapp-support-btn"
          className="w-full h-11 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm font-cairo transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>{t.contactSupportBtn}</span>
        </a>
      </div>

      {/* Back to Home / Login Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={onBackToHome}
        id="back-to-home-btn"
        className="w-full h-12 rounded-xl bg-transparent border border-[#2e3140] hover:border-[#e8a33d] text-[#f3efe6] hover:text-[#e8a33d] font-bold text-sm font-cairo transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
      >
        {currentLang === 'en' ? (
          <ArrowLeft className="w-4 h-4" />
        ) : (
          <ArrowRight className="w-4 h-4" />
        )}
        <span>{t.backToHomeBtn}</span>
      </motion.button>
    </div>
  );
};
