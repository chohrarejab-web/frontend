import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Ensure browser does not retain old scroll position across route changes
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Global ScrollToTop helper on route change
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
}

// Layout (eager for fast initial paint)
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import MobileBottomNav from './components/common/MobileBottomNav';
import OfflineBanner from './components/common/OfflineBanner';
import { isMobileApp, initMobileShell } from './utils/mobilePlatform';

// Landing Page eager, heavy widgets & secondary pages lazy-loaded via resilient code splitting
import LandingPage from './pages/LandingPage';

// Resilient dynamic module loader that auto-retries on network or Vite dev-server restart
const lazyRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn('Dynamic import failed, retrying...', error);
      try {
        await new Promise((r) => setTimeout(r, 250));
        return await componentImport();
      } catch (retryErr) {
        const key = 'sahatn_retry_' + window.location.pathname;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
          return new Promise(() => { });
        }
        sessionStorage.removeItem(key);
        throw retryErr;
      }
    }
  });

const DocBotWidget = lazyRetry(() => import('./components/common/DocBotWidget'));
const LoginModal = lazyRetry(() => import('./components/auth/LoginModal'));
const TwoFactorModal = lazyRetry(() => import('./components/auth/TwoFactorModal'));
const ForgotPasswordModal = lazyRetry(() => import('./components/auth/ForgotPasswordModal'));

const SearchDoctorsPage = lazyRetry(() => import('./pages/SearchDoctorsPage'));
const PatientDashboardPage = lazyRetry(() => import('./pages/PatientDashboardPage'));
const DoctorDashboardPage = lazyRetry(() => import('./pages/DoctorDashboardPage'));
const DoctorAuthPage = lazyRetry(() => import('./pages/DoctorAuthPage'));
const DoctorOnboardingPage = lazyRetry(() => import('./pages/DoctorOnboardingPage'));
const AdminDashboardPage = lazyRetry(() => import('./pages/AdminDashboardPage'));
const PrescriptionVerifyPage = lazyRetry(() => import('./pages/PrescriptionVerifyPage'));
const TeleconsultationPage = lazyRetry(() => import('./pages/TeleconsultationPage'));
const DoctorDetailsPage = lazyRetry(() => import('./pages/DoctorDetailsPage'));
const SettingsPage = lazyRetry(() => import('./pages/SettingsPage'));

function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-[#00A896] animate-spin mb-3" />
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chargement sécurisé...</p>
    </div>
  );
}

// Admin Protected Route Guard
function AdminProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
  if (!isAdmin) {
    return <Navigate to="/?login=admin&unauthorized=1" replace />;
  }
  return children;
}

// Doctor Protected Route Guard with Anti-Back-Reentry Session Lock
function DoctorProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const isLocked = typeof window !== 'undefined' && sessionStorage.getItem('sahatn_doctor_session_locked') === 'true';
  const hasDocAuth = typeof window !== 'undefined' && (
    localStorage.getItem('sahatn_doctor_authenticated') === 'true' ||
    sessionStorage.getItem('sahatn_doctor_authenticated') === 'true'
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07131e] text-white p-4">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500/20 border-t-[#00A896] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Vérification de la session praticien...</p>
      </div>
    );
  }

  const isDoctor = user && (
    user.role === 'DOCTOR' ||
    user.role === 'PRATICIEN' ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    Boolean(user.doctorId)
  );

  // If doctor is authenticated, ensure lock is lifted and grant access
  if (isDoctor && hasDocAuth && !isLocked) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sahatn_doctor_session_locked');
      sessionStorage.setItem('sahatn_doctor_active_session', 'true');
    }
    return children;
  }

  // If user is not a verified doctor, strictly prevent entry
  if (!isDoctor) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sahatn_doctor_authenticated');
      sessionStorage.removeItem('sahatn_doctor_authenticated');
    }
    return <Navigate to="/doctor/auth?reason=unauthorized" replace />;
  }

  // If session was locked via browser arrow navigation or credentials are missing, block access and force reconnect
  if (isLocked || !hasDocAuth) {
    return <Navigate to="/doctor/auth?reason=locked" replace />;
  }

  return children;
}

function AppContent() {
  const { isRtl, lang } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMode = isMobileApp();
  const isDoctorAuth = location.pathname.startsWith('/doctor/auth');
  const isAdmin = location.pathname.startsWith('/admin');
  const isDoctorDashboard = location.pathname.startsWith('/doctor/dashboard');
  const isDoctorOnboarding = location.pathname.startsWith('/doctor/onboarding') || location.pathname.startsWith('/doctor/finalize') || location.pathname.startsWith('/doctor/setup');
  const hidePublicChrome = isDoctorAuth || isAdmin || isDoctorDashboard || isDoctorOnboarding;

  const backHandlerRef = useRef(null);
  backHandlerRef.current = () => {
    // 1. Close any open top-level auth modal first
    if (showLoginModal) { setShowLoginModal(false); return true; }
    if (showSignupModal) { setShowSignupModal(false); return true; }
    if (showForgotPasswordModal) { setShowForgotPasswordModal(false); return true; }

    // 2. Close any visible page modal (BookingModal, Filters, Drawer, etc.)
    const modalOverlays = Array.from(
      document.querySelectorAll('.fixed.inset-0, [role="dialog"], [data-modal="true"]')
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    if (modalOverlays.length > 0) {
      const topModal = modalOverlays[modalOverlays.length - 1];
      let closeBtn = topModal.querySelector(
        'button[title*="Fermer" i], button[aria-label*="Fermer" i], button[title*="Close" i], button[aria-label*="Close" i], [data-close-modal]'
      );
      if (!closeBtn) {
        const allButtons = Array.from(topModal.querySelectorAll('button'));
        closeBtn = allButtons.find(b => ['✕', '×', 'x'].includes(b.textContent.trim().toLowerCase()));
      }
      if (closeBtn && typeof closeBtn.click === 'function') {
        closeBtn.click();
        return true;
      }
    }

    // 3. Navigate back inside React Router instead of closing the app
    if (location.pathname !== '/') {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
      return true;
    }

    return false;
  };

  // Initialize Capacitor native status bar & Android hardware back button
  useEffect(() => {
    let cleanup = () => { };
    initMobileShell(() => (backHandlerRef.current ? backHandlerRef.current() : false)).then((fn) => { cleanup = fn; });
    return () => cleanup();
  }, []);

  // Universal Escape key listener to close ANY open modal across the application
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        // 1. Close top-level auth modals if open
        if (showLoginModal) {
          setShowLoginModal(false);
          return;
        }
        if (showSignupModal) {
          setShowSignupModal(false);
          return;
        }
        if (showForgotPasswordModal) {
          setShowForgotPasswordModal(false);
          return;
        }

        // 2. Query all visible modal overlays in the document
        const modalOverlays = Array.from(
          document.querySelectorAll('.fixed.inset-0, [role="dialog"], [data-modal="true"]')
        ).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (modalOverlays.length > 0) {
          const topModal = modalOverlays[modalOverlays.length - 1];

          // Priority 1: buttons with title or aria-label containing "Fermer", "Close", or "Annuler"
          let closeBtn = topModal.querySelector(
            'button[title*="Fermer" i], button[aria-label*="Fermer" i], button[title*="Close" i], button[aria-label*="Close" i], button[title*="Annuler" i], button[aria-label*="Annuler" i], [data-close-modal]'
          );

          // Priority 2: button containing an X icon (Lucide X or svg with class lucide-x)
          if (!closeBtn) {
            const xSvg = topModal.querySelector('svg.lucide-x, [data-lucide="x"]');
            if (xSvg) {
              closeBtn = xSvg.closest('button');
            }
          }

          // Priority 3: button with text "✕", "×", "x", "Fermer", or "Annuler"
          if (!closeBtn) {
            const allButtons = Array.from(topModal.querySelectorAll('button'));
            closeBtn = allButtons.find(b => {
              const txt = b.textContent.trim().toLowerCase();
              return txt === '✕' || txt === '×' || txt === 'x' || txt === 'fermer' || txt === 'annuler';
            });
          }

          if (closeBtn && typeof closeBtn.click === 'function') {
            closeBtn.click();
          } else if (typeof topModal.click === 'function') {
            topModal.click();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showLoginModal, showSignupModal, showForgotPasswordModal]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-[#edf7f9] dark:bg-[#071120] text-slate-800 dark:text-slate-100 transition-colors duration-300" dir={isRtl ? "rtl" : "ltr"}>
      <OfflineBanner />
      <ScrollToTop />

      {/* Global Navbar (Hidden on Doctor Auth, Doctor Dashboard and Admin dedicated consoles) */}
      {!hidePublicChrome && (
        <Navbar
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenSignup={() => setShowSignupModal(true)}
        />
      )}

      {/* Main Routed Content */}
      <main className={`flex-1 w-full max-w-full overflow-x-clip flex flex-col ${mobileMode && !isDoctorAuth ? 'pb-20' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/search" element={<SearchDoctorsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/doctor/:id" element={<DoctorDetailsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/doctor" element={<DoctorDetailsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/soignants/:id" element={<DoctorDetailsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/soignants" element={<DoctorDetailsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route path="/soignant/:id" element={<DoctorDetailsPage onOpenLogin={() => setShowLoginModal(true)} />} />
              <Route
                path="/patient/dashboard"
                element={
                  <PatientDashboardPage
                    onOpenLogin={() => setShowLoginModal(true)}
                    onOpenSignup={() => setShowSignupModal(true)}
                  />
                }
              />
              <Route
                path="/doctor/dashboard"
                element={
                  <DoctorProtectedRoute>
                    <DoctorDashboardPage />
                  </DoctorProtectedRoute>
                }
              />
              <Route path="/doctor/auth" element={<DoctorAuthPage />} />
              <Route path="/doctor/onboarding" element={<DoctorOnboardingPage />} />
              <Route path="/doctor/finalize" element={<DoctorOnboardingPage />} />
              <Route path="/doctor/setup" element={<DoctorOnboardingPage />} />
              {/* Admin Console is Web-Only: hidden in the Mobile App build */}
              <Route
                path="/admin/dashboard"
                element={
                  mobileMode ? (
                    <Navigate to="/" replace />
                  ) : (
                    <AdminProtectedRoute>
                      <AdminDashboardPage />
                    </AdminProtectedRoute>
                  )
                }
              />
              <Route path="/admin" element={<Navigate to={mobileMode ? "/" : "/admin/dashboard"} replace />} />
              <Route path="/verify/prescription/:hash" element={<PrescriptionVerifyPage />} />
              <Route path="/verify/prescription" element={<PrescriptionVerifyPage />} />
              <Route path="/pages/Prescriptions/verify.html" element={<PrescriptionVerifyPage />} />
              <Route path="/pages/Prescriptions/verify" element={<PrescriptionVerifyPage />} />
              <Route path="/teleconsultation" element={<TeleconsultationPage />} />
              <Route
                path="/parametres"
                element={
                  <SettingsPage
                    onOpenLogin={() => setShowLoginModal(true)}
                    onOpenSignup={() => setShowSignupModal(true)}
                  />
                }
              />
              <Route path="/settings" element={<Navigate to="/parametres" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Global Footer (Hidden on Mobile App, Doctor Auth, Doctor Dashboard and Admin consoles) */}
      {!hidePublicChrome && !mobileMode && <Footer />}

      {/* Native-style Mobile Bottom Tab Bar (Mobile App Mode) */}
      {mobileMode && !isDoctorAuth && !isDoctorOnboarding && (
        <MobileBottomNav onOpenLogin={() => setShowLoginModal(true)} />
      )}

      {/* Floating AI DocBot Assistant (Hidden on Mobile App, Doctor and Admin consoles) */}
      {!hidePublicChrome && !mobileMode && (
        <Suspense fallback={null}>
          <DocBotWidget />
        </Suspense>
      )}

      {/* Global Authentication Modals (Unified Sliding Auth Modal) */}
      <Suspense fallback={null}>
        {(showLoginModal || showSignupModal) && (
          <LoginModal
            isOpen={showLoginModal || showSignupModal}
            initialMode={showSignupModal ? 'signup' : 'login'}
            onClose={() => {
              setShowLoginModal(false);
              setShowSignupModal(false);
            }}
            onModeChange={(newMode) => {
              if (newMode === 'signup') {
                setShowLoginModal(false);
                setShowSignupModal(true);
              } else {
                setShowSignupModal(false);
                setShowLoginModal(true);
              }
            }}
            onOpenSignup={() => {
              setShowLoginModal(false);
              setShowSignupModal(true);
            }}
            onOpenLogin={() => {
              setShowSignupModal(false);
              setShowLoginModal(true);
            }}
            onOpenForgotPassword={(email) => {
              setForgotPasswordEmail(email);
              setShowForgotPasswordModal(true);
            }}
          />
        )}

        {showForgotPasswordModal && (
          <ForgotPasswordModal
            isOpen={showForgotPasswordModal}
            initialEmail={forgotPasswordEmail}
            onClose={() => setShowForgotPasswordModal(false)}
          />
        )}

        {/* Automatic 2FA Modal Challenge */}
        <TwoFactorModal />
      </Suspense>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}