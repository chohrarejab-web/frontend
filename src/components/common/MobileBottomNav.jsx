import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, CalendarCheck, User, Stethoscope } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav({ onOpenLogin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAr = lang === 'ar';

  const isDoctor = Boolean(
    user && (user.role === 'DOCTOR' || user.role === 'PRATICIEN' || user.doctorId)
  );

  const items = [
    {
      id: 'home',
      path: '/',
      label: isAr ? 'الرئيسية' : 'Accueil',
      icon: Home,
      active: location.pathname === '/'
    },
    {
      id: 'search',
      path: '/search',
      label: isAr ? 'الأطباء' : 'Médecins',
      icon: Search,
      active:
        location.pathname.startsWith('/search') ||
        (location.pathname.startsWith('/doctor/') && !location.pathname.startsWith('/doctor/dashboard'))
    },
    isDoctor
      ? {
          id: 'doctor',
          path: '/doctor/dashboard',
          label: isAr ? 'عيادتي' : 'Cabinet',
          icon: Stethoscope,
          active: location.pathname.startsWith('/doctor/dashboard')
        }
      : {
          id: 'appointments',
          path: '/patient/dashboard',
          label: isAr ? 'مواعيدي' : 'Mes RDV',
          icon: CalendarCheck,
          active: location.pathname.startsWith('/patient/dashboard')
        },
    {
      id: 'settings',
      path: '/parametres',
      label: isAr ? 'حسابي' : 'Profil',
      icon: User,
      active: location.pathname.startsWith('/parametres') || location.pathname.startsWith('/settings')
    }
  ];

  const handleNav = (item) => {
    if ((item.id === 'appointments' || item.id === 'settings') && !isAuthenticated && onOpenLogin) {
      onOpenLogin();
      return;
    }
    if (item.id === 'settings' && isDoctor) {
      if (location.pathname.startsWith('/doctor/dashboard')) {
        window.dispatchEvent(new CustomEvent('sahatn:open-doctor-profile'));
      } else {
        navigate('/doctor/dashboard?openProfile=1');
      }
      return;
    }
    navigate(item.path);
  };

  return (
    <nav
      aria-label={isAr ? 'التنقل السفلي' : 'Navigation mobile'}
      className="fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-[#0c1a2e]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                item.active
                  ? 'text-[#0086cd] dark:text-cyan-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              <span className="text-[11px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
