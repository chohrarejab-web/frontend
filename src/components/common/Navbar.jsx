import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { Heart, Bell, User, LogOut, Sun, Moon, ChevronDown, Settings, Calendar, Check, Home, Shield, Menu, X } from 'lucide-react';

import DayNightToggle from './DayNightToggle';
import {
  getNotificationTitle,
  getNotificationMessage,
  formatExactNotificationTime,
  getExactNotificationFull
} from '../../locales/notificationTranslator';

export default function Navbar({ onOpenLogin, onOpenSignup }) {
  const { lang, toggleLanguage, t, isRtl, isTranslating } = useLanguage();
  const { user, isAuthenticated, logout, role } = useAuth();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { notifications, unreadCount, markAsRead, markAllAsRead, markAllAsUnread, clearNotifications } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const notifRef = useRef(null);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location?.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const clean = name.replace(/^(dr\.?|docteur)\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getFirstName = (name) => {
    if (!name) return 'Compte';
    const clean = name.replace(/^(dr\.?|docteur)\s*/i, '').trim();
    return clean.split(/\s+/)[0];
  };
  const { isDark, toggleTheme } = useTheme();
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

  const handleToggleLanguage = () => {
    setAnimating(true);
    toggleLanguage();
    setTimeout(() => {
      setAnimating(false);
    }, 350);
  };

  return (
    <header className="bg-[#00b4b6] dark:bg-[#0a1e34] w-full border-b border-white/15 dark:border-slate-800/80 py-2.5 sm:py-3.5 transition-colors duration-300 relative z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/images/logo.png"
            alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105 duration-300 bg-white/95 p-0.5"
          />
          <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            {lang === 'ar' ? 'موعدي' : 'Maw2idi'}
          </span>
        </Link>

        {/* Right Action Nav */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 shrink-0">
          
          {/* Link 1: Patient Dashboard / Mon Espace Santé (Desktop Only) */}
          {isAuthenticated && (
            <Link
              to="/patient/dashboard"
              className="hidden md:flex bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/30 transition-all items-center gap-1.5 whitespace-nowrap active:scale-95"
              title="Consulter mon dossier santé, rendez-vous et ordonnances"
            >
              <span>📁</span>
              <span>{t('nav_patient_dashboard', 'Mon Espace Santé')}</span>
            </Link>
          )}

          {/* Link 2: Doctor portal (Desktop Only — Lightweight Doctor Companion) */}
          {role === 'DOCTOR' ? (
            <Link
              to="/doctor/dashboard"
              className="hidden md:flex bg-white hover:bg-slate-100 text-[#0086cd] font-black text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full shadow-md transition-all items-center gap-1.5 whitespace-nowrap"
            >
              <span>🩺</span>
              <span>{t('nav_doctor_space', 'Espace Médecin')}</span>
            </Link>
          ) : !isAuthenticated ? (
            <Link
              to="/doctor/auth"
              className="hidden md:flex bg-white hover:bg-slate-100 text-[#0086cd] font-bold text-xs sm:text-sm px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg items-center justify-center gap-1 sm:gap-2 whitespace-nowrap shrink-0"
            >
              <span>{t('nav_doctor', 'Vous êtes soignant ?')}</span>
            </Link>
          ) : null}

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-1.5 sm:p-2 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-all relative cursor-pointer"
              title="Notifications Maw2idi"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {showNotifs && (
              <div
                className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0c162d] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 text-slate-800 dark:text-white z-[60] text-xs space-y-2 animate-in fade-in zoom-in-95"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs">
                    <span>🔔</span> {lang === 'ar' ? `الإشعارات (${notifications.length})` : `Notifications (${notifications.length})`}
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 ? (
                      <>
                        <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black px-1.5 py-0.5 rounded-full">
                          {unreadCount} {lang === 'ar' ? 'غير مقروءة' : 'non lues'}
                        </span>
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer transition-colors"
                          title={lang === 'ar' ? 'تحديد الكل كمقروء' : 'Marquer toutes les notifications comme lues'}
                        >
                          {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Tout marquer lu'}
                        </button>
                      </>
                    ) : notifications.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => markAllAsUnread()}
                        className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer transition-colors"
                        title={lang === 'ar' ? 'تحديد الكل كغير مقروء' : 'Marquer toutes les notifications comme non lues'}
                      >
                        {lang === 'ar' ? 'تحديد الكل كغير مقروء' : 'Tout marquer non lu'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 py-1 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center text-slate-400 dark:text-slate-500 py-4 font-semibold text-xs">
                      {lang === 'ar' ? 'لا توجد إشعارات حالياً.' : 'Aucune notification pour le moment.'}
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          n.read
                            ? 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-teal-50/90 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                            <span>{n.icon || '🔔'}</span>
                            <span className="truncate">{getNotificationTitle(n, lang)}</span>
                          </span>
                          <span 
                            className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-bold"
                            title={getExactNotificationFull(n)}
                          >
                            {formatExactNotificationTime(n, lang)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {getNotificationMessage(n, lang)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right rtl:text-left">
                    <button
                      type="button"
                      onClick={() => clearNotifications()}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                      title={lang === 'ar' ? 'مسح سجل الإشعارات' : "Effacer l'historique des notifications"}
                    >
                      {lang === 'ar' ? 'مسح السجل' : "Effacer l'historique"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Day / Night Theme Toggle */}
          <DayNightToggle isDark={isDark} onToggle={toggleTheme} />

          {/* Language Switcher — Flag Toggle Switch with Real-Time Translation Support */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            id="header-lang-btn"
            className={`sahatn-lang-switch-btn lang-toggle-btn flex-shrink-0 ${animating ? 'slt-animating' : ''} ${isTranslating ? 'ring-2 ring-teal-400 ring-offset-1 animate-pulse' : ''}`}
            data-lang={lang}
            title={lang === 'fr' ? 'Passer en Arabe (Traduction en temps réel)' : 'Passer en Français (ترجمة فورية)'}
          >
            <span className="slt-label slt-label-fr">FR</span>
            <span className="slt-track">
              <span className="slt-knob">
                <svg className="slt-flag-svg slt-flag-fr" viewBox="0 0 36 36">
                  <rect x="0" y="0" width="12" height="36" fill="#002654" />
                  <rect x="12" y="0" width="12" height="36" fill="#FFFFFF" />
                  <rect x="24" y="0" width="12" height="36" fill="#CE1126" />
                </svg>
                <svg className="slt-flag-svg slt-flag-ar" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                  <rect width="36" height="36" fill="#E70013" />
                  <circle cx="18" cy="18" r="11" fill="#FFFFFF" />
                  <path d="M 24.67 13.14 A 8.25 8.25 0 1 0 24.67 22.86 A 6.60 6.60 0 1 1 24.67 13.14 Z" fill="#E70013" />
                  <polygon points="15.25,18.00 18.67,16.89 18.67,13.29 20.78,16.21 24.20,15.09 22.09,18.00 24.20,20.91 20.78,19.79 18.67,22.71 18.67,19.11" fill="#E70013" />
                </svg>
              </span>
            </span>
            <span className="slt-label slt-label-ar">AR</span>
          </button>

          {/* User Auth Dropdown Menu or Login Button (Desktop Only) */}
          <div className="hidden md:block">
            {isAuthenticated ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-[#008f91]/90 hover:bg-[#007f81] active:bg-[#006f71] text-white pl-1.5 pr-2.5 py-1 sm:py-1.5 rounded-full border border-white/30 transition-all cursor-pointer shadow-xs hover:shadow-sm select-none"
                  aria-expanded={showUserDropdown}
                  title="Mon profil & paramètres"
                >
                  {/* Circular Avatar */}
                  <div className="w-7 h-7 rounded-full bg-white text-[#009698] font-black text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getUserInitials(user?.name)}</span>
                    )}
                  </div>

                  {/* Display Name */}
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight max-w-[90px] sm:max-w-[130px] truncate">
                    {getFirstName(user?.name)}
                  </span>

                  {/* Chevron */}
                  <ChevronDown className={`w-3.5 h-3.5 text-white/90 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Card */}
                {showUserDropdown && (
                  <div 
                    className="absolute right-0 rtl:right-auto rtl:left-0 mt-2.5 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2.5 z-[60] text-left rtl:text-right animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {/* Header: User Info & Verification Badge */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl mb-1.5 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#00b4b6] to-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user?.name || 'Avatar'} className="w-full h-full object-cover" />
                        ) : (
                          <span>{getUserInitials(user?.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {user?.name || 'Utilisateur Maw2idi'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user?.email || ''}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full mt-1 border border-emerald-200/60 dark:border-emerald-800/40">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>
                            {user?.role === 'DOCTOR' ? 'Compte Soignant Vérifié' : user?.role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Compte Patient Vérifié'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-0.5">
                      {/* Item 1: Mes Rendez-vous & Suivi / Espace Médecin */}
                      <Link
                        to={user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/patient/dashboard'}
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-800 dark:hover:text-teal-300 font-bold text-xs sm:text-sm transition-all group"
                      >
                        <span className="w-7 h-7 rounded-lg bg-teal-100/70 dark:bg-teal-900/50 text-[#00b4b6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <span>
                          {user?.role === 'DOCTOR'
                            ? (lang === 'ar' ? 'فضاء الطبيب وجدول المواعيد' : 'Espace Médecin & Agenda')
                            : (lang === 'ar' ? 'مواعيدي ومتابعتي' : 'Mes Rendez-vous & Suivi')}
                        </span>
                      </Link>

                      {/* Item 2: Paramètres du Compte — Exclusivement réservé à l'utilisateur simple (patient) */}
                      {user?.role !== 'DOCTOR' && !user?.doctorId && (
                        <Link
                          to="/parametres"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm transition-all group"
                        >
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Settings className="w-4 h-4" />
                          </span>
                          <span>{lang === 'ar' ? 'إعدادات الحساب' : 'Paramètres du Compte'}</span>
                        </Link>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800"></div>

                    {/* Item 3: Se déconnecter */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs sm:text-sm transition-all cursor-pointer group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <LogOut className="w-4 h-4" />
                      </span>
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
                    </button>

                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="bg-transparent hover:bg-white/15 text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t('nav_login', 'Se connecter')}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Menu de navigation'}
            title={mobileMenuOpen ? 'Fermer' : 'Menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MOBILE RESPONSIVE DRAWER OVERLAY (SLIDE-OUT FROM RIGHT / LEFT IN AR) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] md:hidden animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className={`fixed top-0 bottom-0 ${isRtl ? 'left-0' : 'right-0'} w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#0c1a2e] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col z-[70] animate-in slide-in-from-${isRtl ? 'left' : 'right'} duration-300 overflow-y-auto`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-500/10 dark:bg-slate-800/50">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                <img src="/images/logo.png" alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'} className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shadow-xs" />
                <span className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {lang === 'ar' ? 'موعدي' : 'Maw2idi'}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 space-y-4">
              {/* If Authenticated: User Card */}
              {isAuthenticated ? (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#00b4b6] to-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user?.name || 'Avatar'} className="w-full h-full object-cover" />
                      ) : (
                        <span>{getUserInitials(user?.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {user?.name || 'Utilisateur Maw2idi'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user?.email || ''}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full mt-1 border border-emerald-200/60 dark:border-emerald-800/40">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>
                          {user?.role === 'DOCTOR' ? 'Praticien Vérifié' : user?.role === 'SUPER_ADMIN' ? 'Admin Console' : 'Patient Vérifié'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 text-center space-y-2.5">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isRtl ? 'مرحباً بك في منصة موعدي الطبية' : 'Bienvenue sur la plateforme Maw2idi'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLogin && onOpenLogin();
                      }}
                      className="w-full bg-[#00b4b6] hover:bg-[#009b9d] text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {t('nav_login', 'Se connecter')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenSignup && onOpenSignup();
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {isRtl ? 'إنشاء حساب' : "S'inscrire"}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span className="text-lg">🏠</span>
                  <span>{isRtl ? 'الرئيسية' : 'Accueil'}</span>
                </Link>

                <Link
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span className="text-lg">🔍</span>
                  <span>{isRtl ? 'البحث عن طبيب أو عيادة' : 'Rechercher un médecin'}</span>
                </Link>

                {isAuthenticated && (
                  <Link
                    to="/patient/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span className="text-lg">📁</span>
                    <span>{t('nav_patient_dashboard', 'Mon Espace Santé')}</span>
                  </Link>
                )}

                {role === 'DOCTOR' ? (
                  <Link
                    to="/doctor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0086cd] dark:text-teal-300 font-black text-xs sm:text-sm border border-teal-200/60 dark:border-teal-800/40"
                  >
                    <span className="text-lg">🩺</span>
                    <span>{t('nav_doctor_space', 'Espace Médecin')}</span>
                  </Link>
                ) : !isAuthenticated ? (
                  <Link
                    to="/doctor/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-[#0086cd] dark:text-cyan-400 transition-colors"
                  >
                    <span className="text-lg">🩺</span>
                    <span>{t('nav_doctor', 'Vous êtes soignant ? Espace Pro')}</span>
                  </Link>
                ) : null}

                {isAuthenticated && (
                  <Link
                    to="/parametres"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span className="text-lg">⚙️</span>
                    <span>{lang === 'ar' ? 'إعدادات الحساب' : 'Paramètres du Compte'}</span>
                  </Link>
                )}
              </div>

              {/* Mobile Controls section (Theme) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isDark ? 'Mode Nuit' : 'Mode Jour'}
                  </span>
                  <DayNightToggle isDark={isDark} onToggle={toggleTheme} />
                </div>
              </div>

              {/* Logout button in drawer */}
              {isAuthenticated && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-800/40"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
