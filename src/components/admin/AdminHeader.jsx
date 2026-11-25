import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Sun, Moon, LogOut, Download,
  ChevronDown, FileSpreadsheet, FileCode, HardDrive,
  BarChart3, Home, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import DayNightToggle from '../common/DayNightToggle';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  getNotificationTitle,
  getNotificationMessage,
  formatExactNotificationTime
} from '../../locales/notificationTranslator';

export default function AdminHeader({
  activeTab = 'praticiens',
  setActiveTab,
  pendingPraticiens = 21,
  unreadNotifs = 2,
  onRefresh,
  loading,
  notifications = [],
  onNotificationRead,
  onNotificationUnread,
  onClearNotifications,
  activeTable = 'users',
  isDark,
  onToggleTheme
}) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [animatingLang, setAnimatingLang] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    localStorage.removeItem('sahatn_token');
    localStorage.removeItem('sahatn_user');
    sessionStorage.clear();
    navigate('/', { replace: true });
  };

  const handleToggleLang = () => {
    setAnimatingLang(true);
    toggleLanguage();
    setTimeout(() => setAnimatingLang(false), 300);
  };

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const notifRef = useRef(null);
  const exportRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await api.getDatabaseTable(activeTable);
      const rows = res.data || [];
      if (!rows.length) {
        alert('Aucune donnée à exporter pour la table ' + activeTable);
        return;
      }
      const keys = Object.keys(rows[0]);
      const csv = [
        keys.join(','),
        ...rows.map(r => keys.map(k => {
          const val = r[k] === null || r[k] === undefined ? '' : String(r[k]).replace(/"/g, '""');
          return `"${val}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sahatn_${activeTable}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (err) {
      alert('Erreur export CSV: ' + err.message);
    }
  };

  const handleExportDDL = () => {
    const ddl = `-- SAHATN / MAW2IDI SCHEMA
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'PATIENT'
);`;
    const blob = new Blob([ddl], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sahatn_schema_${Date.now()}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  return (
    <header className="bg-[#00A896] text-white w-full max-w-full sticky top-0 z-50 shadow-xs select-none">

      {/* Top Navbar Row */}
      <div className="w-full max-w-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">

        {/* Left: Admin Console Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Admin Console Logo -> Return to Admin Dashboard Main Page */}
          <Link
            to="/admin/dashboard"
            id="admin-space-logo-link"
            className="flex items-center gap-2.5 px-2 py-1 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group"
            title={lang === 'ar' ? "لوحة تحكم المشرف (الصفحة الرئيسية)" : "Console Administrateur (Page principale)"}
          >
            <img
              src="/images/logo.png"
              alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-contain shadow-xs p-0.5 shrink-0 group-hover:scale-105 transition-transform bg-white/95"
            />

            <div className="leading-tight">
              <div className="flex items-center gap-1.5 font-black text-white text-base tracking-tight group-hover:text-teal-100 transition-colors">
                <span>{lang === 'ar' ? 'موعدي' : 'Maw2idi'}</span>
                {lang !== 'ar' && <span className="font-normal font-sans text-sm">موعدي</span>}
              </div>
              <div className="text-[10px] font-bold text-teal-100 tracking-wider uppercase opacity-95">
                {t('admin_console_title', 'MAW2IDI CONSOLE')}
              </div>
            </div>
          </Link>
        </div>


        {/* Right: Tools & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* Button: Return to Public Landing Page */}
          <Link
            to="/"
            id="admin-header-home-btn"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
            title={lang === 'ar' ? "العودة إلى الموقع العام Maw2idi" : "Retourner au site public Maw2idi"}
          >
            <Home className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'الرئيسية العامة' : 'Accueil Maw2idi'}</span>
          </Link>

          {/* Button: Refresh Data / Actualiser */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              id="admin-header-refresh-btn"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0 disabled:opacity-50"
              title={lang === 'ar' ? 'تحديث البيانات' : 'Actualiser les données'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{lang === 'ar' ? 'تحديث' : 'Actualiser'}</span>
            </button>
          )}





          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-1.5 hover:bg-white/15 rounded-xl text-white relative transition-all cursor-pointer"
              title="Centre de notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#00A896]">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifMenu && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0c162d] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-[60] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🔔</span> {t('admin_notif_system', 'Notifications Système')} ({notifications.length})
                  </span>
                  {unreadNotifs > 0 ? (
                    <button
                      onClick={onNotificationRead}
                      className="text-[10px] font-bold text-[#00A896] hover:underline cursor-pointer"
                    >
                      {t('admin_notif_mark_all', 'Tout marquer lu')}
                    </button>
                  ) : notifications.length > 0 ? (
                    <button
                      onClick={onNotificationUnread}
                      className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                    >
                      {t('admin_notif_mark_unread', 'Tout marquer non lu')}
                    </button>
                  ) : null}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 py-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 font-bold">
                      {t('admin_notif_empty', 'Aucune notification pour le moment.')}
                    </p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={n.id || i} className={`p-2.5 rounded-xl border text-xs transition-all ${n.read
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200/80 text-teal-950 dark:text-teal-100 font-semibold'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#00A896]" />}
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {(() => {
                            if (!n.timestamp) return 'Maintenant';
                            if (typeof n.timestamp === 'string' && (n.timestamp.includes('instant') || n.timestamp.startsWith('À'))) return n.timestamp;
                            const d = new Date(n.timestamp);
                            return isNaN(d.getTime()) ? n.timestamp : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          })()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
                    <button
                      onClick={onClearNotifications}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      {t('admin_notif_clear_history', "Effacer tout l'historique")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Day / Night Theme Toggle Switch matching user's custom design */}
          <DayNightToggle
            isDark={isDark}
            onToggle={onToggleTheme}
          />

          {/* Language Switcher — Flag Toggle Switch (identical to Landing & Doctor Header) */}
          <button
            type="button"
            onClick={handleToggleLang}
            id="admin-lang-btn"
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

          {/* Red Logout Button: #DC2626 */}
          <button
            onClick={handleLogout}
            className="bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-extrabold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs ml-0.5 sm:ml-1"
            title="Déconnexion de la session administrateur"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('admin_logout', 'Déconnexion')}</span>
          </button>

        </div>

      </div>
    </header>
  );
}