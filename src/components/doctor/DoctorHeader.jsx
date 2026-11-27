import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Stethoscope, Bell, LogOut, Volume2, Camera, Edit2, Home, X } from 'lucide-react';
import DayNightToggle from '../common/DayNightToggle';
import { isMobileApp } from '../../utils/mobilePlatform';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import DoctorProfileModal from './DoctorProfileModal';
import api from '../../services/api';
import {
  getNotificationTitle,
  getNotificationMessage,
  formatExactNotificationTime,
  getExactNotificationFull
} from '../../locales/notificationTranslator';
import { resolveDoctorSpecialty, resolveDoctorCity, resolveDoctorName } from '../../utils/i18nHelper';

function resolveDoctorAvatar(avatar) {
  if (!avatar) return '/images/doctor_selim.jpg';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

export default function DoctorHeader({
  onResetTab,
  onSelectTab,
  doctorName = 'Dr. Selim Ben Ali',
  specialty = 'Cardiologue',
  cabinetStatus = 'Cabinet: Salle Libre',
  waitingCount = 0,
  onCallNext,
  isDark,
  onToggleTheme,
  avatar = null,
  onDoctorUpdated,
  onSwitchDoctor,
  doctorId = null
}) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead, markAllAsUnread, clearNotifications, refreshNotifications, delayMinutes = 0, socket } = useSocket() || {};
  const [currentDoctorDelay, setCurrentDoctorDelay] = useState(0);
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [animatingLang, setAnimatingLang] = useState(false);
  const notifRef = useRef(null);
  const doctorSwitcherRef = useRef(null);
  const mobileMode = isMobileApp();
  const canSwitchDoctors = !mobileMode || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const activeDocId = doctorId || (typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null) || user?.doctorId || user?.doctor_id || (user?.role === 'DOCTOR' ? user?.id : null) || 'doc-1';
  const activeDocName = (doctorName || user?.name || '').toLowerCase().replace(/^(dr\.?|docteur)\s*/i, '').trim();

  // Strict isolation of notifications for this active doctor
  const doctorNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (!n) return false;
      // Doctor space check
      if (n.space && n.space !== 'doctor' && n.space !== 'all' && n.space !== 'public') return false;

      // If notification has a specific doctorId, it must match activeDocId
      if (n.doctorId) {
        return n.doctorId === activeDocId;
      }

      // If notification has a specific doctorName, it must match activeDocName
      if (n.doctorName && activeDocName) {
        const nDoc = n.doctorName.toLowerCase().replace(/^(dr\.?|docteur)\s*/i, '').trim();
        return nDoc.includes(activeDocName) || activeDocName.includes(nDoc);
      }

      // Doctor-specific categories (patient, rdv, avis, queue, liaison)
      const isDoctorCategory = n.category === 'patient' || n.category === 'rdv' || n.category === 'avis' || n.category === 'queue' || n.category === 'liaison';
      const hasRdvTitle = n.title && (n.title.includes('Rendez-vous') || n.title.includes('RDV') || n.title.includes('Avis') || n.title.includes('Salle d\'Attente'));
      if (isDoctorCategory || hasRdvTitle) {
        return activeDocId === 'doc-1';
      }

      // Welcome/activation messages intended for other doctors
      if (n.title === 'Compte Praticien Activé' || (n.message && n.message.includes('Bienvenue Dr.'))) {
        const msg = (n.message || '').toLowerCase();
        if (activeDocName && !msg.includes(activeDocName)) return false;
        if (activeDocId && n.doctorId && n.doctorId !== activeDocId) return false;
      }

      return true;
    });
  }, [notifications, activeDocId, activeDocName]);

  const doctorUnreadCount = useMemo(() => {
    return doctorNotifications.filter(n => !n.read).length;
  }, [doctorNotifications]);

  // When active doctor changes, trigger a synchronized re-fetch of notifications
  useEffect(() => {
    if (typeof refreshNotifications === 'function') {
      refreshNotifications({
        space: 'doctor',
        doctorId: activeDocId,
        doctorName: activeDocName
      });
    }
  }, [activeDocId, activeDocName, refreshNotifications]);

  // Live fetch active doctor's delay from queue database
  useEffect(() => {
    let isMounted = true;
    if (activeDocId) {
      api.getQueue(activeDocId)
        .then(res => {
          if (isMounted && res && typeof res.delayMinutes === 'number') {
            setCurrentDoctorDelay(res.delayMinutes);
          }
        })
        .catch(err => console.warn('Could not fetch doctor delay:', err));
    }
    return () => { isMounted = false; };
  }, [activeDocId]);

  // Synchronize live WebSocket delay events strictly for this active doctor
  useEffect(() => {
    if (!socket) return;
    const handleDelayEvent = (data) => {
      if (data && data.doctorId === activeDocId) {
        const val = typeof data.delayMinutes === 'number' ? data.delayMinutes : (typeof data.minutes === 'number' ? data.minutes : 0);
        setCurrentDoctorDelay(val);
      }
    };
    socket.on('queue:delay', handleDelayEvent);
    socket.on('queue:update', handleDelayEvent);
    socket.on('queue:updated', handleDelayEvent);
    return () => {
      socket.off('queue:delay', handleDelayEvent);
      socket.off('queue:update', handleDelayEvent);
      socket.off('queue:updated', handleDelayEvent);
    };
  }, [socket, activeDocId]);

  // Synchronize with local custom events across dashboard tabs
  useEffect(() => {
    const handleLocalDelay = (e) => {
      if (e?.detail && (!e.detail.doctorId || e.detail.doctorId === activeDocId)) {
        const val = typeof e.detail.delayMinutes === 'number' ? e.detail.delayMinutes : (typeof e.detail.minutes === 'number' ? e.detail.minutes : 0);
        setCurrentDoctorDelay(val);
      }
    };
    window.addEventListener('sahatn:delay-updated', handleLocalDelay);
    return () => window.removeEventListener('sahatn:delay-updated', handleLocalDelay);
  }, [activeDocId]);

  const handleMarkAllAsRead = async () => {
    if (typeof markAllAsRead === 'function') {
      await markAllAsRead({
        space: 'doctor',
        doctorId: activeDocId,
        doctorName: activeDocName
      });
    }
  };

  const handleMarkAllAsUnread = async () => {
    if (typeof markAllAsUnread === 'function') {
      await markAllAsUnread({
        space: 'doctor',
        doctorId: activeDocId,
        doctorName: activeDocName
      });
    }
  };

  const handleClearNotifications = async () => {
    if (typeof clearNotifications === 'function') {
      await clearNotifications({
        space: 'doctor',
        doctorId: activeDocId,
        doctorName: activeDocName
      });
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (doctorSwitcherRef.current && !doctorSwitcherRef.current.contains(event.target)) {
        setDoctorSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Doctor List for multi-doctor switching
  const [doctorList, setDoctorList] = useState([]);
  const [doctorSwitcherOpen, setDoctorSwitcherOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getDoctors({ limit: 50 }).then((res) => {
      if (isMounted && res?.data && Array.isArray(res.data)) {
        const hasDoc1 = res.data.some(d => d.id === 'doc-1');
        const list = hasDoc1 ? res.data : [
          { id: 'doc-1', name: 'Dr. Selim Ben Ali', specialty: 'Cardiologie & Maladies Vasculaires', specialtyFr: 'Cardiologie & Maladies Vasculaires', city: 'Tunis', avatar: '/images/doctor_selim.jpg' },
          ...res.data
        ];
        setDoctorList(list);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Doctor Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleOpenProfile = () => setShowProfileModal(true);
    window.addEventListener('sahatn:open-doctor-profile', handleOpenProfile);
    const params = new URLSearchParams(location.search);
    if (params.get('openProfile') === '1') {
      setShowProfileModal(true);
    }
    return () => window.removeEventListener('sahatn:open-doctor-profile', handleOpenProfile);
  }, [location.search]);
  const [currentDoctorName, setCurrentDoctorName] = useState(doctorName);
  const [currentSpecialty, setCurrentSpecialty] = useState(specialty);
  const [currentAvatar, setCurrentAvatar] = useState(avatar || user?.avatar || '/images/doctor_selim.jpg');

  useEffect(() => {
    if (doctorName) setCurrentDoctorName(doctorName);
  }, [doctorName]);

  useEffect(() => {
    if (specialty) setCurrentSpecialty(specialty);
  }, [specialty]);

  useEffect(() => {
    if (avatar || user?.avatar) setCurrentAvatar(avatar || user?.avatar);
  }, [avatar, user?.avatar]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    localStorage.removeItem('sahatn_token');
    localStorage.removeItem('sahatn_user');
    localStorage.removeItem('sahatn_doctor_user');
    localStorage.removeItem('sahatn_doctor_authenticated');
    sessionStorage.clear();
    sessionStorage.setItem('sahatn_doctor_session_locked', 'true');
    navigate('/doctor/auth?reason=logged_out', { replace: true });
  };

  const handleToggleLang = () => {
    setAnimatingLang(true);
    toggleLanguage();
    setTimeout(() => setAnimatingLang(false), 300);
  };

  const handleDoctorUpdated = (updatedDoc) => {
    if (updatedDoc) {
      if (updatedDoc.name) setCurrentDoctorName(updatedDoc.name);
      if (updatedDoc.specialty) setCurrentSpecialty(updatedDoc.specialty);
      if (updatedDoc.avatar || updatedDoc.image) setCurrentAvatar(updatedDoc.avatar || updatedDoc.image);
    }
    if (onDoctorUpdated) {
      onDoctorUpdated(updatedDoc);
    }
  };

  return (
    <header className="w-full max-w-full bg-[#071a2b] dark:bg-[#03111e] text-white border-b border-teal-900/40 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 transition-colors sticky top-0 z-50 shadow-md select-none">
      <div className="w-full max-w-[1780px] mx-auto flex flex-wrap min-[1440px]:flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
        
        {/* ════════ 1. LEFT: LOGOS & INTERACTIVE DOCTOR PROFILE (Order 1 on all screens) ════════ */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 min-[1440px]:flex-initial order-1">
          {/* Brand Logo: Maw2idi (compact icon-only on mobile app so Row 1 never wraps) */}
          {!mobileMode && (
            <>
              <Link
                to="/doctor/dashboard"
                id="doctor-brand-logo-link"
                onClick={() => onResetTab && onResetTab()}
                className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity cursor-pointer"
                title={lang === 'ar' ? "لوحة تحكم الطبيب (الصفحة الرئيسية)" : "Espace Praticien — Tableau de bord (Page principale)"}
              >
                <img
                  src="/images/logo.png"
                  alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shadow-xs group-hover:scale-105 transition-transform bg-white/95 p-0.5"
                />
                <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap hidden min-[380px]:inline">
                  {lang === 'ar' ? 'موعدي' : 'Maw2idi'}
                </span>
              </Link>
              <div className="h-5 sm:h-6 w-px bg-slate-700/80 hidden xs:block"></div>
            </>
          )}

          {/* Interactive Doctor Profile Picture & Name */}
          <button
            type="button"
            id="doctor-profile-pic-btn"
            onClick={() => setShowProfileModal(true)}
            className="group flex items-center gap-2 p-1 -m-1 rounded-2xl hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer text-left rtl:text-right focus:outline-none"
            title="Cliquez sur la photo pour voir et modifier le profil du praticien"
          >
            {/* Clickable Profile Picture with Camera Overlay */}
            <div className="relative shrink-0">
              <img
                src={resolveDoctorAvatar(currentAvatar || user?.avatar)}
                onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                alt={currentDoctorName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover border-2 border-teal-400/90 group-hover:border-teal-300 shadow-md transition-all group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#071a2b] rounded-full flex items-center justify-center">
                <span className="w-1 h-1 bg-white rounded-full"></span>
              </span>
              
              {/* Camera Icon on Hover */}
              <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Doctor Name & Specialty */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap truncate max-w-[90px] xs:max-w-[120px] md:max-w-[150px] 2xl:max-w-[180px] group-hover:text-teal-300 transition-colors">
                  {resolveDoctorName(currentDoctorName, lang)}
                </span>
                <span className="text-[10px] text-teal-400 opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-bold">
                  <Edit2 className="w-2.5 h-2.5" />
                  <span className="hidden md:inline">Modifier</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-teal-950/70 border border-teal-700/60 text-teal-300 text-[9px] sm:text-[10px] font-bold max-w-[120px] sm:max-w-[150px] 2xl:max-w-[180px]">
                <span className="w-1 h-1 rounded-full bg-teal-400 shrink-0"></span>
                <span className="truncate">{resolveDoctorSpecialty(currentSpecialty, lang)}</span>
              </span>
            </div>
          </button>

          {/* Quick Doctor Profile Switcher */}
          {canSwitchDoctors && doctorList.length > 1 && (
            <div className="relative shrink-0" ref={doctorSwitcherRef}>
              <button
                type="button"
                onClick={() => setDoctorSwitcherOpen(!doctorSwitcherOpen)}
                className="px-2 sm:px-2.5 py-1 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/60 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title={lang === 'ar' ? 'تغيير الطبيب المعروض' : 'Changer d\'espace praticien'}
              >
                <span>🔄</span>
                <span className="hidden min-[1536px]:inline whitespace-nowrap">{lang === 'ar' ? 'تغيير الطبيب' : 'Changer praticien'}</span>
                <span className="hidden sm:inline min-[1536px]:hidden whitespace-nowrap">{lang === 'ar' ? 'تغيير' : 'Praticien'}</span>
                <span className="text-[9px]">▾</span>
              </button>

              {doctorSwitcherOpen && (
                <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0c162d] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white z-[9999] text-xs space-y-1 animate-in fade-in zoom-in-95" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 font-extrabold text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{lang === 'ar' ? 'قائمة الأطباء المتاحين' : 'Praticiens disponibles'}</span>
                    <span className="text-[10px] text-teal-500 font-bold">{doctorList.length}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                    {doctorList.map((doc) => {
                      const isCurrent = doc.id === doctorId || doc.uuid === doctorId;
                      return (
                        <button
                          key={doc.id || doc.uuid}
                          type="button"
                          onClick={() => {
                            setDoctorSwitcherOpen(false);
                            if (onSwitchDoctor) onSwitchDoctor(doc.id || doc.uuid);
                          }}
                          className={`w-full text-left rtl:text-right p-2 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            isCurrent 
                              ? 'bg-teal-50 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 font-extrabold shadow-2xs' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                          }`}
                        >
                          <img 
                            src={resolveDoctorAvatar(doc.avatar)} 
                            onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }} 
                            className="w-7 h-7 rounded-lg object-cover shrink-0" 
                            alt="" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{resolveDoctorName(doc.name, lang)}</div>
                            <div className="text-[10px] text-slate-400 truncate">{resolveDoctorSpecialty(doc, lang)} · {resolveDoctorCity(doc.city, lang)}</div>
                          </div>
                          {isCurrent && <span className="text-teal-600 dark:text-teal-400 font-bold text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════ 2. CONTROLS: NOTIFICATIONS, THEME, LANG & LOGOUT ════════
            (Order 2 on mobile/tablet to sit on Row 1; Order 3 on desktop) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 order-2 min-[1440px]:order-3 ml-auto">
          
          {/* Button: Return to Public Landing Page (hidden in mobile app since bottom tab bar has Accueil) */}
          {!mobileMode && (
            <Link
              to="/"
              id="doctor-header-home-btn"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
              title={lang === 'ar' ? "العودة إلى الصفحة الرئيسية للموقع Maw2idi" : "Retour à la page d'accueil principale Maw2idi"}
            >
              <Home className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="hidden min-[1600px]:inline whitespace-nowrap">{lang === 'ar' ? 'الرئيسية' : 'Accueil Maw2idi'}</span>
              <span className="hidden min-[1440px]:inline min-[1600px]:hidden whitespace-nowrap">{lang === 'ar' ? 'الرئيسية' : 'Accueil'}</span>
            </Link>
          )}
          
          {/* Notifications Bell with Synchronized Live Badge */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl bg-white/10 sm:bg-transparent text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors relative cursor-pointer"
              title={t('doc_notif_title', 'Notifications Praticien')}
            >
              <Bell className="w-4 h-4" />
              {doctorUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                  {doctorUnreadCount > 9 ? '9+' : doctorUnreadCount}
                </span>
              )}
            </button>

            {/* Mobile backdrop when notifications panel is open */}
            {notifOpen && (
              <div
                onClick={() => setNotifOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-[55] sm:hidden"
              />
            )}

            {/* Synchronized Dropdown Menu — centered modal sheet on mobile, right-aligned dropdown on desktop */}
            {notifOpen && (
              <div
                className="fixed inset-x-3 top-[72px] w-auto max-w-md mx-auto sm:mx-0 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:rtl:right-auto sm:rtl:left-0 sm:mt-2 sm:w-96 bg-white dark:bg-[#0c162d] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 text-slate-800 dark:text-white z-[60] text-xs space-y-2 animate-in fade-in zoom-in-95"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center justify-between gap-2 font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs truncate">
                    <span>🔔</span> {lang === 'ar' ? `إشعارات الطبيب (${doctorNotifications.length})` : `${t('doc_notif_title', 'Notifications')} (${doctorNotifications.length})`}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {doctorUnreadCount > 0 && (
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black px-1.5 py-0.5 rounded-full">
                        {doctorUnreadCount} {lang === 'ar' ? 'غير مقروءة' : t('doc_notif_unread', 'non lues')}
                      </span>
                    )}
                    {doctorUnreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer transition-colors"
                        title={lang === 'ar' ? 'تحديد الكل كمقروء' : 'Marquer toutes les notifications comme lues'}
                      >
                        {lang === 'ar' ? 'الكل مقروء' : t('doc_notif_mark_all', 'Tout lu')}
                      </button>
                    ) : doctorNotifications.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllAsUnread}
                        className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer transition-colors"
                        title={lang === 'ar' ? 'تحديد الكل كغير مقروء' : 'Marquer toutes les notifications comme non lues'}
                      >
                        {lang === 'ar' ? 'الكل غير مقروء' : 'Tout non lu'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[55vh] sm:max-h-72 overflow-y-auto space-y-2 py-1 pr-1">
                  {doctorNotifications.length === 0 ? (
                    <p className="text-center text-slate-400 dark:text-slate-500 py-4 font-semibold text-xs">
                      {lang === 'ar' ? 'لا توجد إشعارات حالياً.' : t('doc_notif_empty', 'Aucune notification pour le moment.')}
                    </p>
                  ) : (
                    doctorNotifications.map((n) => (
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

                {doctorNotifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right rtl:text-left">
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      {lang === 'ar' ? 'مسح السجل' : t('doc_notif_clear', "Effacer l'historique")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Day/Night Toggle Switch (desktop web only — removed on mobile app) */}
          {!mobileMode && (
            <div className="scale-[0.78] sm:scale-90 origin-center shrink-0">
              <DayNightToggle
                isDark={isDark}
                onToggle={onToggleTheme}
              />
            </div>
          )}

          {/* Language Switcher — Compact pill in mobile app, full Flag Toggle on desktop */}
          {mobileMode ? (
            <button
              type="button"
              onClick={handleToggleLang}
              id="doctor-lang-btn"
              className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-black transition-all cursor-pointer shrink-0"
              title={lang === 'fr' ? 'Passer en Arabe (العربية)' : 'Passer en Français'}
            >
              {lang === 'fr' ? 'AR' : 'FR'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleLang}
              id="doctor-lang-btn"
              className={`sahatn-lang-switch-btn lang-toggle-btn flex-shrink-0 cursor-pointer ${animatingLang ? 'slt-animating' : ''}`}
              data-lang={lang}
              title={lang === 'fr' ? 'Passer en Arabe (العربية)' : 'Passer en Français'}
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
          )}

          {/* Red Logout Button — icon-only on mobile app to keep header single-row */}
          <button
            type="button"
            onClick={handleLogout}
            id="doctor-header-logout-btn"
            className={`bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-extrabold text-xs ${mobileMode ? 'p-2' : 'px-2.5 sm:px-3 py-1.5'} rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap`}
            title={t('doc_logout', "Déconnexion de l'espace praticien")}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!mobileMode && <span className="inline font-bold tracking-tight">{t('doc_logout', 'Déconnexion')}</span>}
          </button>

        </div>

        {/* ════════ 3. CENTER: CABINET STATUS & CALL NEXT ════════
            (Order 3 & w-full on mobile/tablet to sit on Row 2; Order 2 on desktop) */}
        <div className="w-full min-[1440px]:w-auto flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2.5 bg-[#0c2238] dark:bg-[#071727] px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-teal-900/50 shadow-inner order-3 min-[1440px]:order-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-300 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate max-w-[110px] sm:max-w-none">{t('doc_cabinet_free', cabinetStatus)}</span>
            <span className="text-slate-500">·</span>
            <span className="shrink-0">{t('doc_waiting', 'En Attente :')} <strong className="text-rose-400 font-mono font-black">{waitingCount}</strong></span>
            <span className="text-slate-500">·</span>
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('retard')}
              title={lang === 'ar' ? 'تعديل تأخير العيادة' : 'Modifier le retard / décalage du cabinet'}
              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                currentDoctorDelay > 0
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 hover:bg-amber-500/35'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {lang === 'ar'
                ? (currentDoctorDelay > 0 ? `⏱️ +${currentDoctorDelay} دق` : '🟢 في الموعد')
                : (currentDoctorDelay > 0 ? `⏱️ +${currentDoctorDelay} min` : "🟢 À l'heure")}
            </button>
          </div>

          <button
            type="button"
            onClick={onCallNext}
            className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm ml-1 shrink-0 whitespace-nowrap"
            title={t('doc_call_next', 'Appeler le patient suivant')}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>📢 {t('doc_next', 'Suivant')}</span>
          </button>
        </div>

      </div>

      {/* ════════ DOCTOR PROFILE & EDIT MODAL ════════ */}
      <DoctorProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        doctorId={doctorId || user?.doctorId || 'doc-1'}
        onDoctorUpdated={handleDoctorUpdated}
      />
    </header>
  );
}
