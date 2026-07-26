import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, User, Phone, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, TRANSLATIONS } from '../types';
import { loginUserFromDatabase, registerUserInDatabase } from '../lib/userDatabase';

interface LoginFormProps {
  currentLang: Language;
  onNavigateToAccountType?: () => void;
  onLoginSuccess?: (userName?: string, accountType?: string, status?: string, userId?: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  currentLang,
  onNavigateToAccountType,
  onLoginSuccess,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Interactive UI Feedback states (client-side visual state)
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Basic client validation
    if (!identifier.trim() || !password.trim()) {
      setStatusMessage({
        type: 'error',
        text: currentLang === 'en' 
          ? 'Please fill in all required fields.' 
          : 'يرجى ملء جميع الحقول المطلوبة.',
      });
      return;
    }

    if (isRegisterMode && (!fullName.trim() || !phone.trim())) {
      setStatusMessage({
        type: 'error',
        text: currentLang === 'en'
          ? 'Please enter your Full Name and Phone Number.'
          : 'يرجى إدخال الاسم الكامل ورقم الهاتف بشكل صحيح.',
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (isRegisterMode) {
        // Register in persistent database with strict uniqueness check
        const cleanUser = identifier.includes('@') ? identifier.split('@')[0] : identifier;
        const regResult = registerUserInDatabase({
          fullName: fullName.trim(),
          username: cleanUser,
          email: identifier.includes('@') ? identifier.trim() : `${cleanUser}@taksati.com`,
          phone: phone.trim(),
          password: password.trim(),
          accountType: 'customer',
        });

        if (!regResult.success) {
          setStatusMessage({
            type: 'error',
            text: regResult.message,
          });
          return;
        }

        setStatusMessage({
          type: 'success',
          text: currentLang === 'en'
            ? 'Account created successfully in database!'
            : 'تم حفظ وتنسيق الحساب في قاعدة البيانات بنجاح! جاري توجيهك...',
        });

        if (onLoginSuccess) {
          onLoginSuccess(
            regResult.user?.fullName || fullName.trim(),
            'customer',
            'active',
            regResult.user?.id || regResult.user?.username
          );
        }
      } else {
        // Login with strict presence check in persistent database
        const loginRes = loginUserFromDatabase(identifier, password);

        if (!loginRes.success) {
          setStatusMessage({
            type: 'error',
            text: loginRes.message,
          });
          return;
        }

        setStatusMessage({
          type: 'success',
          text: currentLang === 'en'
            ? 'Login successful! Welcome to Al-Aman Taxi.'
            : 'تم تسجيل الدخول بنجاح! أهلاً بك في منصة تكسي الأمان.',
        });

        if (onLoginSuccess) {
          onLoginSuccess(
            loginRes.user?.fullName || identifier,
            loginRes.user?.accountType || 'customer',
            loginRes.user?.status || 'active',
            loginRes.user?.id || loginRes.user?.username
          );
        }
      }
    }, 600);
  };

  const handleToggleMode = () => {
    setStatusMessage(null);
    setIsRegisterMode(!isRegisterMode);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Central Circular T Logotype Badge */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 rounded-full bg-[#1b1d28] border border-[#2e3140] flex items-center justify-center shadow-xl shadow-black/40 amber-glow relative z-10 group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] flex items-center justify-center border border-[#e8a33d] shadow-md transition-transform duration-200 group-hover:scale-105">
            <span className="text-2xl font-black font-sans leading-none text-[#12131a] select-none tracking-tight">
              T
            </span>
          </div>
        </div>
        {/* Ambient Amber Halo */}
        <div className="absolute inset-0 rounded-full bg-[#e8a33d]/25 blur-xl -z-10 animate-pulse" />
      </motion.div>

      {/* Headings */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isRegisterMode ? 'register-head' : 'login-head'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-center mb-6 w-full"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3efe6] font-cairo tracking-tight mb-2">
            {isRegisterMode ? t.registerTitle : t.welcomeTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#9b98a6] font-cairo leading-relaxed max-w-sm mx-auto">
            {isRegisterMode ? t.registerSubtitle : t.welcomeSubtitle}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Status Message (Error in #d9614f or Success) */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, mb: 0 }}
            animate={{ opacity: 1, height: 'auto', mb: 20 }}
            exit={{ opacity: 0, height: 0, mb: 0 }}
            className="w-full overflow-hidden"
          >
            <div
              className={`w-full p-3.5 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-cairo ${
                statusMessage.type === 'error'
                  ? 'bg-[#d9614f]/10 border-[#d9614f]/40 text-[#f3efe6]'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-[#d9614f] shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Login / Register Form Card */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Register Fields if in Sign Up mode */}
        {isRegisterMode && (
          <>
            {/* Full Name Input */}
            <div className="space-y-1.5 text-right">
              <label 
                htmlFor="full-name-input"
                className="block text-xs sm:text-sm font-semibold text-[#f3efe6] font-cairo"
              >
                {t.fullNameLabel}
              </label>
              <div className="relative flex items-center">
                <input
                  id="full-name-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none"
                />
                <User className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5 text-right">
              <label 
                htmlFor="phone-input"
                className="block text-xs sm:text-sm font-semibold text-[#f3efe6] font-cairo"
              >
                {t.phoneLabel}
              </label>
              <div className="relative flex items-center">
                <input
                  id="phone-input"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-plex transition-all duration-200 outline-none text-right"
                />
                <Phone className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {/* Identifier Input (Email or Username) */}
        <div className="space-y-1.5 text-right">
          <label 
            htmlFor="identifier-input"
            className="block text-xs sm:text-sm font-semibold text-[#f3efe6] font-cairo"
          >
            {t.identifierLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="identifier-input"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t.identifierPlaceholder}
              className="w-full h-12 px-4 pr-11 bg-[#1b1d28] hover:bg-[#232634] focus:bg-[#232634] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-[#f3efe6] placeholder-[#9b98a6]/60 text-sm font-cairo transition-all duration-200 outline-none focus:ring-1 focus:ring-[#e8a33d]/30"
            />
            <Mail className="w-4 h-4 text-[#9b98a6] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between">
            <label 
              htmlFor="password-input"
              className="block text-xs sm:text-sm font-semibold text-[#f3efe6] font-cairo"
            >
              {t.passwordLabel}
            </label>
            {!isRegisterMode && (
              <button
                type="button"
                onClick={() => {
                  setStatusMessage({
                    type: 'error',
                    text: currentLang === 'en'
                      ? 'Password reset instructions will be sent to your registered email.'
                      : 'سيتم إرسال تعليمات إعادة تعيين كلمة المرور إلى بريدك المسجل.',
                  });
                }}
                className="text-xs text-[#e8a33d] hover:underline font-cairo transition-colors"
              >
                {t.forgotPassword}
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id="password-input"
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
              id="toggle-password-visibility-btn"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute left-3.5 p-1 text-[#9b98a6] hover:text-[#e8a33d] transition-colors rounded-lg focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me Checkbox (in Login mode) */}
        {!isRegisterMode && (
          <div className="flex items-center gap-2 pt-1">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-[#1b1d28] border-[#2e3140] text-[#e8a33d] focus:ring-[#e8a33d] focus:ring-offset-[#12131a] accent-[#e8a33d] cursor-pointer"
            />
            <label 
              htmlFor="remember-me-checkbox" 
              className="text-xs text-[#9b98a6] font-cairo cursor-pointer select-none"
            >
              {t.rememberMe}
            </label>
          </div>
        )}

        {/* Main Full-Width Amber Gradient Button */}
        <div className="pt-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            id="main-submit-btn"
            className="w-full h-13 rounded-xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-base font-cairo shadow-lg shadow-[#e8a33d]/25 hover:shadow-xl hover:shadow-[#e8a33d]/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#12131a] border-t-transparent rounded-full animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : (
              <span>{isRegisterMode ? t.registerButton : t.loginButton}</span>
            )}
          </motion.button>
        </div>
      </form>

      {/* Secondary Bottom Row Link */}
      <div className="mt-6 text-center text-xs sm:text-sm text-[#9b98a6] font-cairo">
        <span>{isRegisterMode ? t.hasAccountText : t.noAccountText}</span>{' '}
        <button
          type="button"
          onClick={() => {
            if (!isRegisterMode && onNavigateToAccountType) {
              onNavigateToAccountType();
            } else {
              handleToggleMode();
            }
          }}
          id="toggle-register-mode-btn"
          className="text-[#e8a33d] font-bold hover:underline cursor-pointer transition-colors inline-block mr-1"
        >
          {isRegisterMode ? t.loginLink : t.signupLink}
        </button>
      </div>

      {/* Design Credit Footer */}
      <div className="mt-4 pt-3 border-t border-[#2e3140]/40 w-full flex items-center justify-center gap-2.5 text-xs text-[#9b98a6] font-cairo dir-rtl" dir="rtl">
        <span className="font-medium text-[#9b98a6]">تصميم: هيثم النعيمي</span>
        <span className="text-[#2e3140]">•</span>
        <div className="flex items-center gap-2">
          {/* WhatsApp Link */}
          <a
            href="https://wa.me/9647502302723"
            target="_blank"
            rel="noopener noreferrer"
            title="تواصل عبر واتساب (07502302723)"
            aria-label="تواصل عبر واتساب (07502302723)"
            id="designer-whatsapp-link"
            className="w-7 h-7 rounded-lg bg-[#1b1d28] hover:bg-[#232634] border border-[#2e3140] hover:border-emerald-500/50 text-[#9b98a6] hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
          >
            <svg 
              className="w-3.5 h-3.5 fill-current transition-transform duration-200 group-hover:scale-110" 
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>

          {/* Instagram Link */}
          <a
            href="https://instagram.com/h1.h1k"
            target="_blank"
            rel="noopener noreferrer"
            title="متابعة عبر إنستغرام (h1.h1k)"
            aria-label="متابعة عبر إنستغرام (h1.h1k)"
            id="designer-instagram-link"
            className="w-7 h-7 rounded-lg bg-[#1b1d28] hover:bg-[#232634] border border-[#2e3140] hover:border-pink-500/50 text-[#9b98a6] hover:text-pink-400 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
          >
            <svg 
              className="w-3.5 h-3.5 fill-none stroke-current transition-transform duration-200 group-hover:scale-110" 
              viewBox="0 0 24 24" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
