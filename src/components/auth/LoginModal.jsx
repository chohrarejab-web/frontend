import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import TunisianPhoneInput from '../common/TunisianPhoneInput';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onModeChange,
  onOpenSignup,
  onOpenLogin,
  onOpenForgotPassword,
  showLoginModal,
  setShowLoginModal,
  showModal,
  setShowModal,
  setFormMode,
}) {
  const { login, register, confirm2FA } = useAuth();
  const { lang, isRtl } = useLanguage();
  const navigate = useNavigate();

  // Flexible visibility check for both isOpen & showLoginModal patterns
  const isModalOpen = isOpen ?? showLoginModal ?? showModal ?? false;

  // Active mode: 'login' or 'signup'
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Keep track of mode changes
  const switchMode = (newMode) => {
    setError('');
    setSignupError('');
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (setShowLoginModal) setShowLoginModal(false);
    if (setShowModal) setShowModal(false);
  };

  // Login form states (clean empty inputs — no prefilled credentials)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Signup form states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupShowPass, setSignupShowPass] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isModalOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Reset errors when modal opens or closes
  useEffect(() => {
    if (!isModalOpen) {
      setError('');
      setSignupError('');
      setRequires2FA(false);
      setTwoFactorError('');
      setTwoFactorCode('');
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleRoleRedirect = (userEmail, userObj) => {
    const role = (userObj?.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      sessionStorage.setItem('sahatn_admin_authenticated', 'true');
      localStorage.setItem('sahatn_admin_authenticated', 'true');
      navigate('/admin/dashboard');
    } else if (role === 'SECRETAIRE') {
      localStorage.setItem('sahatn_doctor_authenticated', 'true');
      sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
      sessionStorage.setItem('sahatn_secretaire_authenticated', 'true');
      navigate('/doctor/dashboard');
    } else if (role === 'DOCTOR' || role === 'PRATICIEN' || Boolean(userObj?.doctorId)) {
      localStorage.setItem('sahatn_doctor_authenticated', 'true');
      sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
      navigate('/doctor/dashboard');
    } else {
      // Cleanly clear any stale doctor flags
      localStorage.removeItem('sahatn_doctor_authenticated');
      sessionStorage.removeItem('sahatn_doctor_authenticated');
      localStorage.removeItem('sahatn_doctor_user');
      localStorage.removeItem('sahatn_active_doctor_id');
      navigate('/patient/dashboard');
    }
  };

  const handleSubmitLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (res && res.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      handleClose();
      handleRoleRedirect(email.trim().toLowerCase(), res?.user);
    } catch (err) {
      setError(err.message || (lang === 'ar' ? 'بيانات الدخول غير صحيحة. يرجى التثبت.' : 'Identifiants incorrects. Vérifiez votre email et mot de passe.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSignup = async (e) => {
    e?.preventDefault();
    setSignupError('');
    const cleanPhone = signupPhone.replace(/^(\+216|00216)/, '').replace(/\D/g, '').slice(0, 8);
    if (cleanPhone.length !== 8) {
      setSignupError(lang === 'ar' ? 'رقم الهاتف يجب أن يتكون من 8 أرقام بالتمام.' : 'Le numéro de téléphone doit comporter exactement 8 chiffres.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError(lang === 'ar' ? 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setSignupLoading(true);
    try {
      if (register) {
        await register({
          name: signupName.trim(),
          email: signupEmail.trim().toLowerCase(),
          phone: cleanPhone,
          password: signupPassword,
          role: 'PATIENT'
        });
      }
      handleClose();
      navigate('/patient/dashboard');
    } catch (err) {
      setSignupError(err.message || (lang === 'ar' ? 'تعذر إنشاء الحساب. يرجى المحاولة لاحقاً.' : 'Impossible de créer le compte. Vérifiez vos informations.'));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e?.preventDefault();
    setTwoFactorError('');
    if (!twoFactorCode || twoFactorCode.trim().length < 6) {
      setTwoFactorError(lang === 'ar' ? 'يرجى إدخال الرمز المكون من 6 أرقام.' : 'Veuillez saisir le code complet à 6 chiffres.');
      return;
    }

    setTwoFactorLoading(true);
    try {
      const res = confirm2FA ? await confirm2FA(twoFactorCode.trim()) : null;
      handleClose();
      handleRoleRedirect(email.trim().toLowerCase(), res?.user);
    } catch (err) {
      setTwoFactorError(err.message || (lang === 'ar' ? 'رمز التحقق غير صحيح أو منتهي.' : 'Code 2FA invalide ou expiré.'));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div
      id="login-modal"
      onClick={(e) => {
        if (e.target.id === 'login-modal' || e.target.id === 'login-modal-overlay') handleClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 transition-all duration-300 animate-fadeIn"
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0c1a2e] rounded-3xl sm:rounded-[32px] shadow-2xl border border-teal-100/80 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row md:min-h-[640px] transition-all text-slate-800 dark:text-slate-100"
        style={{ direction: 'ltr' }}
      >
        {/* Desktop Floating Close Button (Mobile uses inline header close button below) */}
        <button
          onClick={handleClose}
          type="button"
          className="hidden md:flex absolute top-4 right-4 rtl:right-auto rtl:left-4 z-40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 shadow-md w-8 h-8 rounded-full items-center justify-center font-bold text-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Fermer"
        >
          ✕
        </button>

        {/* ============================================================== */}
        {/* PANEL 1: INTERACTIVE FORM AREA (Left base, slides right)      */}
        {/* In 'login': Left side (0% -> 50%)                             */}
        {/* In 'signup': Right side (moves via translate-x-full)          */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-1/2 bg-white dark:bg-[#0c1a2e] flex flex-col justify-between p-5 sm:p-7 md:p-8 z-10 overflow-y-auto transition-transform duration-700 ease-in-out ${
            isSignup ? 'md:translate-x-full' : 'md:translate-x-0'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Mobile Top Bar: Segmented Mode Switcher + Clean Inline Close Button (< md) */}
          <div className="flex md:hidden items-center gap-2.5 mb-5">
            <div className="flex-1 flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  !isSignup ? 'bg-[#00A896] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  isSignup ? 'bg-[#00A896] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'ar' ? 'إنشاء حساب جديد' : 'Inscription'}
              </button>
            </div>
            <button
              onClick={handleClose}
              type="button"
              className="w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer active:scale-95"
              title="Fermer"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {!isSignup ? (
            /* ========================================================== */
            /* LOGIN FORM VIEW                                           */
            /* ========================================================== */
            <div className="space-y-4 sm:space-y-5 animate-fadeIn">
              {/* Header */}
              <div className="text-center space-y-1.5 pt-1 sm:pt-0">
                <h3 className="text-2xl sm:text-3xl font-black text-[#032b43] dark:text-white tracking-tight">
                  {lang === 'ar' ? 'بوابة تسجيل الدخول' : 'Espace de Connexion'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs sm:max-w-sm mx-auto leading-relaxed">
                  {lang === 'ar' ? 'أدخل بيانات حسابك للوصول إلى فضائك الصحي.' : 'Saisissez vos identifiants pour accéder à votre espace.'}
                </p>
              </div>

              {!requires2FA ? (
                <div className="space-y-3.5">
                  {/* Google 1-Click Sign-In Button */}
                  <GoogleSignInButton
                    mode="login"
                    targetRole="PATIENT"
                    onSuccess={(authenticatedUser) => {
                      handleClose();
                      handleRoleRedirect(authenticatedUser.email, authenticatedUser);
                    }}
                    onError={(errMsg) => setError(errMsg)}
                  />

                  {/* Elegant Divider */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                    <span className="bg-white dark:bg-[#0c1a2e] px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                      {lang === 'ar' ? 'أو عبر البريد الإلكتروني' : 'ou par email'}
                    </span>
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                  </div>

                  <form onSubmit={handleSubmitLogin} className="space-y-3.5 text-xs">
                    {error && (
                      <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                  {/* Email */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'البريد الإلكتروني / المعرّف' : 'Adresse Email / Identifiant'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <img src="/images/mail.png" alt="Email" className="w-4 h-4 opacity-70" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.email@sahatn.tn"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        {lang === 'ar' ? 'كلمة المرور' : 'Mot de Passe'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          if (onOpenForgotPassword) onOpenForgotPassword(email);
                        }}
                        className="text-[10px] text-[#00A896] dark:text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'نسيت كلمة المرور ؟' : 'Mot de passe oublié ?'}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <img src="/images/lock.png" alt="Mot de passe" className="w-4 h-4 opacity-75 dark:invert dark:brightness-90" />
                      </div>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold cursor-pointer"
                        title={showPass ? 'Masquer' : 'Afficher'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00A896] to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-xl shadow-teal-600/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <span>{loading ? (lang === 'ar' ? 'جاري التحقق...' : 'Connexion en cours...') : (lang === 'ar' ? 'دخول فوري' : 'Se Connecter')}</span>
                    <svg className="w-4 h-4 text-white rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>

                  {/* Switch to Signup Link */}
                  <div className="text-center pt-1">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {lang === 'ar' ? 'ليس لديك حساب بعد ؟' : 'Pas encore de compte ?'}{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="text-[#0086cd] dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'إنشاء حساب جديد' : 'Rejoindre Maw2idi'}
                      </button>
                    </p>
                  </div>
                </form>
              </div>
              ) : (
                /* 2FA Challenge View */
                <div className="space-y-3.5 text-xs animate-fadeIn">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto bg-teal-100 dark:bg-teal-900/60 text-[#00A896] dark:text-teal-300 rounded-xl flex items-center justify-center text-lg font-black shadow-inner">
                      🔐
                    </div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">Double Authentification Requise (2FA)</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                      {lang === 'ar' ? 'تم إرسال رمز التحقق المكون من 6 أرقام لتأمين جلستك.' : 'Un code de vérification à 6 chiffres a été envoyé pour sécuriser votre session.'}
                    </p>
                  </div>

                  {twoFactorError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
                      {twoFactorError}
                    </div>
                  )}

                  <form onSubmit={handleVerify2FA} className="space-y-2.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      required
                      className="w-full text-center text-lg font-black tracking-widest py-2 bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#00A896] outline-none"
                    />

                    <button
                      type="submit"
                      disabled={twoFactorLoading}
                      className="w-full bg-[#00A896] hover:bg-teal-700 text-white font-black py-2.5 rounded-xl transition-all shadow-md cursor-pointer text-xs"
                    >
                      {twoFactorLoading ? 'Vérification...' : 'Valider & Déverrouiller'}
                    </button>

                    <div className="flex items-center justify-start text-[10px]">
                      <button
                        type="button"
                        onClick={() => setRequires2FA(false)}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer"
                      >
                        ← Retour
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================== */
            /* SIGNUP (CREATION DE COMPTE) FORM VIEW                      */
            /* ========================================================== */
            <div className="space-y-4 sm:space-y-5 animate-fadeIn">
              {/* Header adapted for Creation */}
              <div className="text-center space-y-1.5 pt-1 sm:pt-0">
                <h3 className="text-2xl sm:text-3xl font-black text-[#032b43] dark:text-white tracking-tight">
                  {lang === 'ar' ? 'إنشاء حساب مريض جديد' : 'Inscription Patient'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs sm:max-w-sm mx-auto leading-relaxed">
                  {lang === 'ar' ? 'أنشئ حسابك في ثوانٍ للاستفادة من كافة خدمات المنصة مجاناً' : 'Rejoignez Maw2idi en quelques secondes pour gérer vos soins'}
                </p>
              </div>

              {/* Google 1-Click Sign-Up Button */}
              <GoogleSignInButton
                mode="signup"
                targetRole="PATIENT"
                onSuccess={(authenticatedUser) => {
                  handleClose();
                  handleRoleRedirect(authenticatedUser.email, authenticatedUser);
                }}
                onError={(errMsg) => setSignupError(errMsg)}
              />

              {/* Elegant Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-white dark:bg-[#0c1a2e] px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                  {lang === 'ar' ? 'أو التسجيل اليدوي' : 'ou inscription manuelle'}
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              </div>

              {signupError && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{signupError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSignup} className="space-y-3 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الاسم واللقب' : 'Nom & Prénom'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <img src="/images/user.png" alt="User" className="w-4 h-4 opacity-70" />
                    </div>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: ياسين المنصور' : 'Ex. Yassine Mansour'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Adresse Email'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <img src="/images/mail.png" alt="Email" className="w-4 h-4 opacity-70" />
                    </div>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="votre.email@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Phone (8 digits) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف (8 أرقام)' : 'Téléphone (8 chiffres)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <img src="/images/call.png" alt="Phone" className="w-4 h-4 opacity-70" />
                    </div>
                    <TunisianPhoneInput
                      required
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <img src="/images/lock.png" alt="Lock" className="w-4 h-4 opacity-70" />
                    </div>
                    <input
                      type={signupShowPass ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-[#00A896] focus:border-[#00A896] focus:bg-white dark:focus:bg-[#09172a] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setSignupShowPass(!signupShowPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold cursor-pointer"
                      title={signupShowPass ? 'Masquer' : 'Afficher'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Submit Signup Button */}
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full bg-gradient-to-r from-[#00A896] to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-xl shadow-teal-600/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2 mt-1"
                >
                  <span>{signupLoading ? (lang === 'ar' ? 'جاري إنشاء الحساب...' : 'Création en cours...') : (lang === 'ar' ? '✓ إنشاء حسابي الآن' : '✓ Créer Mon Compte Patient')}</span>
                </button>

                {/* Switch to Login Link */}
                <div className="text-center pt-1.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {lang === 'ar' ? 'لديك حساب بالفعل ؟' : 'Déjà inscrit ?'}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[#0086cd] dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      {lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* Footer Security Badges */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>SSL 256-Bit Encrypted</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Norme INPDP Santé</span>
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PANEL 2: TEAL GRADIENT BRAND BANNER (Right base, slides left)  */}
        {/* In 'login': Right side (50% -> 100%)                          */}
        {/* In 'signup': Left side (moves via -translate-x-full)          */}
        {/* ============================================================== */}
        <div
          className={`hidden md:flex md:w-1/2 bg-gradient-to-br from-[#032b43] via-teal-900 to-[#00A896] p-7 sm:p-8 text-white flex-col justify-between relative overflow-hidden shadow-2xl transition-transform duration-700 ease-in-out z-20 ${
            isSignup ? 'md:-translate-x-full' : 'md:translate-x-0'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Ambient Glows */}
          <div className="absolute -top-12 -left-12 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 -right-12 w-48 h-48 bg-teal-300/15 rounded-full blur-2xl pointer-events-none"></div>

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/logo.png"
                alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'}
                className="w-10 h-10 rounded-2xl object-contain shadow-lg bg-white/95 p-0.5"
              />
              <span className="text-2xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'موعدي' : 'Maw2idi'}
              </span>
            </div>
          </div>

          {/* Banner Body: Dynamic according to mode */}
          {!isSignup ? (
            /* LOGIN BANNER TEXT */
            <div className="my-5 relative z-10 space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  {lang === 'ar' ? 'لماذا التسجيل معنا ؟' : 'Pourquoi s\'inscrire ?'}
                </h3>
                <p className="text-xs text-teal-100/90 font-medium mt-1">
                  {lang === 'ar' ? 'انضم إلى المنصة الطبية الأولى في تونس.' : 'Rejoignez la 1ère plateforme médicale nationale en Tunisie.'}
                </p>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-teal-50">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'إدارة شاملة لجميع مواعيدك الطبية على مدار الساعة 24/7' : 'Gérez tous vos rendez-vous médicaux et plannings 24h/24 & 7j/7'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'تنبيهات تلقائية عبر SMS و WhatsApp لتفادي أي تأخير' : 'Rappels automatiques SMS & WhatsApp pour éliminer les retards'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'ملفات طبية رقمية مشفرة ومتابعة دقيقة للوصفات' : 'Dossiers patients numérisés et suivi d\'ordonnances sécurisé'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'منصة متوافقة 100% مع معايير الكنام والهيئة الوطنية INPDP' : 'Plateforme 100% conforme aux normes CNAM et INPDP'}</span>
                </li>
                <li className="flex items-center gap-2.5 pt-1">
                  <img src="/images/stars2.png" alt="★" className="w-5 h-5 object-contain shrink-0" />
                  <span className="text-cyan-200 font-extrabold">{lang === 'ar' ? '! وصول غير محدود وتسجيل مجاني 100% مدى الحياة' : 'Accès illimité et inscription 100% gratuite !'}</span>
                </li>
              </ul>

              {/* Direct Banner Switch Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-xs py-3 px-4 rounded-2xl transition-all cursor-pointer shadow-lg backdrop-blur-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{lang === 'ar' ? 'إنشاء حساب جديد مجاناً' : 'Créer un compte gratuit'}</span>
                  <svg className="w-4 h-4 text-cyan-300 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            /* SIGNUP BANNER TEXT - ADAPTED FOR CREATION */
            <div className="my-5 relative z-10 space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  {lang === 'ar' ? 'عضو في Maw2idi بالفعل ؟' : 'Déjà membre de Maw2idi ?'}
                </h3>
                <p className="text-xs text-teal-100/90 font-medium mt-1">
                  {lang === 'ar' ? 'سجّل دخولك الآن للوصول إلى مواعيدك وسجلك الطبي بكل سهولة وأمان.' : 'Connectez-vous pour retrouver vos rendez-vous et votre suivi médical.'}
                </p>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-teal-50">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'حجز فوري ومؤكد مع نخبة من أفضل الأطباء والعيادات في تونس' : 'Prise de rendez-vous immédiate avec les meilleurs praticiens'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'إشعارات وتذكيرات مجانية مسبقة عبر الهاتف لتنظيم مواعيدك' : 'Rappels gratuits par SMS & WhatsApp pour ne rien oublier'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'سجل صحي رقمي خاص بك محمي بنظام تشفير عالي الأمان' : 'Dossier médical numérique sécurisé et confidentiel'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300 text-xs shrink-0 mt-0.5">✓</span>
                  <span>{lang === 'ar' ? 'إمكانية الاستشارة الطبية عن بعد عبر تقنية الفيديو المباشر' : 'Téléconsultations vidéo avec vos médecins partout en Tunisie'}</span>
                </li>
                <li className="flex items-center gap-2.5 pt-1">
                  <img src="/images/stars2.png" alt="★" className="w-5 h-5 object-contain shrink-0" />
                  <span className="text-cyan-200 font-extrabold">{lang === 'ar' ? '! حساب مريض مجاني 100% ومفعل فوراً بدون أي اشتراك' : 'Inscription 100% gratuite et activation immédiate !'}</span>
                </li>
              </ul>

              {/* Direct Banner Switch Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-xs py-3 px-4 rounded-2xl transition-all cursor-pointer shadow-lg backdrop-blur-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 text-cyan-300 ltr:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>{lang === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Se Connecter à mon compte'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Community Card */}
          <div className="relative z-10 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-xl flex items-center gap-3">
              <img src="/images/medical-team.png" alt="Saha.tn Santé" className="w-12 h-12 object-contain shrink-0 drop-shadow-lg" />
              <div className="space-y-0.5">
                <div className="text-xs font-black text-white leading-tight">+1 400 Praticiens Agréés</div>
                <div className="text-[10px] text-teal-200 font-medium leading-normal">
                  {lang === 'ar' ? 'عيادات، مصحات وأطباء متصلون في كامل تراب الجمهورية التونسية' : 'Cabinets, cliniques & soignants connectés dans toute la Tunisie.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
