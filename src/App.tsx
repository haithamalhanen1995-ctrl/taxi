import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { AccountTypeSelection } from './components/AccountTypeSelection';
import { CustomerSignupForm } from './components/CustomerSignupForm';
import { DriverSignupForm } from './components/DriverSignupForm';
import { MerchantSignupForm } from './components/MerchantSignupForm';
import { UnderReviewScreen } from './components/UnderReviewScreen';
import { CustomerHomeScreen } from './components/CustomerHomeScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { DriverHomeScreen } from './components/DriverHomeScreen';
import { MerchantDashboard } from './components/MerchantDashboard';
import { Language, LANGUAGES } from './types';

const SESSION_KEY = 'taksati_app_session_v1';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('ar');

  // Load saved session on initial load
  const savedSession = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  const [currentPage, setCurrentPage] = useState<
    'login' | 'selectAccountType' | 'customerSignup' | 'driverSignup' | 'merchantSignup' | 'underReview' | 'customerHome' | 'adminDashboard' | 'driverHome' | 'merchantDashboard'
  >(savedSession?.currentPage || 'login');

  const [underReviewAccountType, setUnderReviewAccountType] = useState<'driver' | 'merchant'>(
    savedSession?.underReviewAccountType || 'driver'
  );
  const [loggedInCustomerName, setLoggedInCustomerName] = useState(
    savedSession?.loggedInCustomerName || 'أحمد'
  );
  const [loggedInCustomerId, setLoggedInCustomerId] = useState(
    savedSession?.loggedInCustomerId || 'user-seed-1'
  );
  const [loggedInDriverName, setLoggedInDriverName] = useState(
    savedSession?.loggedInDriverName || 'عثمان الفهداوي'
  );
  const [loggedInDriverId, setLoggedInDriverId] = useState(
    savedSession?.loggedInDriverId || 'user-seed-driver-active'
  );
  const [loggedInMerchantName, setLoggedInMerchantName] = useState(
    savedSession?.loggedInMerchantName || 'مطعم الكباب الأربيلية'
  );
  const [loggedInMerchantId, setLoggedInMerchantId] = useState(
    savedSession?.loggedInMerchantId || 'user-seed-mer-active'
  );

  // Sync session state to localStorage whenever it updates
  useEffect(() => {
    if (
      currentPage === 'login' ||
      currentPage === 'selectAccountType' ||
      currentPage === 'customerSignup' ||
      currentPage === 'driverSignup' ||
      currentPage === 'merchantSignup'
    ) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      const sessionData = {
        currentPage,
        underReviewAccountType,
        loggedInCustomerName,
        loggedInCustomerId,
        loggedInDriverName,
        loggedInDriverId,
        loggedInMerchantName,
        loggedInMerchantId,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
  }, [
    currentPage,
    underReviewAccountType,
    loggedInCustomerName,
    loggedInCustomerId,
    loggedInDriverName,
    loggedInDriverId,
    loggedInMerchantName,
    loggedInMerchantId,
  ]);

  // Handle explicit logout
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentPage('login');
  };

  // Update HTML dir attribute dynamically based on language choice
  useEffect(() => {
    const activeLangObj = LANGUAGES.find((l) => l.id === currentLang) || LANGUAGES[0];
    document.documentElement.dir = activeLangObj.dir;
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  return (
    <div className="min-h-screen w-full bg-[#12131a] text-[#f3efe6] font-cairo flex items-center justify-center p-3 sm:p-6 relative overflow-x-hidden selection:bg-[#e8a33d]/30 selection:text-[#f3efe6]">
      {/* Background Subtle Ambient Glowing Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e8a33d]/5 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#c97b3d]/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Mobile-optimized Container (400px - 460px wide frame) */}
      <main className="w-full max-w-[450px] bg-[#12131a] sm:bg-[#1b1d28]/80 sm:backdrop-blur-xl border-0 sm:border border-[#2e3140] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-black/80 relative z-10 my-auto transition-all duration-300">
        {/* Header with brand and language dropdown (shown on auth / signup screens) */}
        {currentPage !== 'customerHome' && currentPage !== 'adminDashboard' && currentPage !== 'driverHome' && currentPage !== 'merchantDashboard' && (
          <Header 
            currentLang={currentLang} 
            onLanguageChange={(lang) => setCurrentLang(lang)} 
          />
        )}

        {/* Dynamic Page Switcher */}
        <AnimatePresence mode="wait">
          {currentPage === 'login' && (
            <motion.div
              key="login-page"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <LoginForm 
                currentLang={currentLang} 
                onNavigateToAccountType={() => setCurrentPage('selectAccountType')}
                onLoginSuccess={(name, accountType, status, userId) => {
                  if (accountType === 'admin') {
                    setCurrentPage('adminDashboard');
                  } else if (accountType === 'driver') {
                    if (status === 'active') {
                      setLoggedInDriverName(name || 'عثمان الفهداوي');
                      setLoggedInDriverId(userId || name || 'user-seed-driver-active');
                      setCurrentPage('driverHome');
                    } else {
                      setUnderReviewAccountType('driver');
                      setCurrentPage('underReview');
                    }
                  } else if (accountType === 'merchant') {
                    if (status === 'active') {
                      setLoggedInMerchantName(name || 'مطعم الكباب الأربيلية');
                      if (userId) setLoggedInMerchantId(userId);
                      setCurrentPage('merchantDashboard');
                    } else {
                      setUnderReviewAccountType('merchant');
                      setCurrentPage('underReview');
                    }
                  } else {
                    setLoggedInCustomerName(name || 'أحمد');
                    setLoggedInCustomerId(userId || name || 'user-seed-1');
                    setCurrentPage('customerHome');
                  }
                }}
              />
            </motion.div>
          )}

          {currentPage === 'adminDashboard' && (
            <motion.div
              key="admin-dashboard-page"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <AdminDashboard
                currentLang={currentLang}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {currentPage === 'driverHome' && (
            <motion.div
              key="driver-home-page"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <DriverHomeScreen
                currentLang={currentLang}
                driverId={loggedInDriverId}
                driverName={loggedInDriverName}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {currentPage === 'merchantDashboard' && (
            <motion.div
              key="merchant-dashboard-page"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <MerchantDashboard
                currentLang={currentLang}
                merchantName={loggedInMerchantName}
                merchantId={loggedInMerchantId}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {currentPage === 'customerHome' && (
            <motion.div
              key="customer-home-page"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <CustomerHomeScreen
                currentLang={currentLang}
                customerId={loggedInCustomerId}
                userName={loggedInCustomerName}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {currentPage === 'selectAccountType' && (
            <motion.div
              key="select-account-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <AccountTypeSelection 
                currentLang={currentLang} 
                onGoToLogin={() => setCurrentPage('login')}
                onSelectCustomerAccount={() => setCurrentPage('customerSignup')}
                onSelectDriverAccount={() => setCurrentPage('driverSignup')}
                onSelectMerchantAccount={() => setCurrentPage('merchantSignup')}
              />
            </motion.div>
          )}

          {currentPage === 'customerSignup' && (
            <motion.div
              key="customer-signup-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <CustomerSignupForm
                currentLang={currentLang}
                onBack={() => setCurrentPage('selectAccountType')}
                onSubmitSuccess={(name, userId) => {
                  if (name) setLoggedInCustomerName(name);
                  if (userId) setLoggedInCustomerId(userId);
                  setCurrentPage('customerHome');
                }}
              />
            </motion.div>
          )}

          {currentPage === 'driverSignup' && (
            <motion.div
              key="driver-signup-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <DriverSignupForm
                currentLang={currentLang}
                onBack={() => setCurrentPage('selectAccountType')}
                onSubmitSuccess={() => {
                  setUnderReviewAccountType('driver');
                  setCurrentPage('underReview');
                }}
              />
            </motion.div>
          )}

          {currentPage === 'merchantSignup' && (
            <motion.div
              key="merchant-signup-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <MerchantSignupForm
                currentLang={currentLang}
                onBack={() => setCurrentPage('selectAccountType')}
                onSubmitSuccess={() => {
                  setUnderReviewAccountType('merchant');
                  setCurrentPage('underReview');
                }}
              />
            </motion.div>
          )}

          {currentPage === 'underReview' && (
            <motion.div
              key="under-review-page"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <UnderReviewScreen
                currentLang={currentLang}
                accountType={underReviewAccountType}
                onBackToHome={() => setCurrentPage('login')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Brand note */}
        <footer className="mt-8 text-center text-[11px] text-[#9b98a6]/50 font-plex">
          © {new Date().getFullYear()} AL-AMAN TAXI · ALL RIGHTS RESERVED
        </footer>
      </main>
    </div>
  );
}
