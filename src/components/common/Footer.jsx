import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Footer({ onOpenDoctorLogin, onOpenDoctorSignup }) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const location = useLocation();
  const isDoctorAuthPage = location.pathname.startsWith('/doctor/auth');

  const handleSignupClick = (e) => {
    if (onOpenDoctorSignup) {
      e.preventDefault();
      onOpenDoctorSignup();
    } else if (isDoctorAuthPage) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoginClick = (e) => {
    if (onOpenDoctorLogin) {
      e.preventDefault();
      onOpenDoctorLogin();
    }
  };

  return (
    <footer
      className="bg-[#032b43] text-slate-200 pt-14 pb-10 border-t border-teal-900/40 text-xs sm:text-sm mt-auto transition-colors duration-300"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Main Grid: Brand + 3 navigation columns + Emergency Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 pb-10 border-b border-slate-700/60">
          
          {/* Col 1: Brand, Identity & INPDP Compliance */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group inline-flex">
              <span className="text-2xl font-extrabold text-white flex items-center gap-2">
                <svg
                  className="w-8 h-8 text-white transition-transform group-hover:scale-110 duration-300 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="font-bold tracking-tight text-white">
                  Saha<span className="text-[#00b4b6]">.tn</span>
                </span>
              </span>
              <span className="text-[11px] bg-teal-500/20 text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-teal-400/30">
                {isAr ? 'موعدي' : 'Maw2idi'}
              </span>
            </Link>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-sm font-normal">
              {isAr
                ? 'المنصة الطبية الوطنية الأولى في تونس المخصصة لرقمنة العيادات وحجز المواعيد الطبية المباشرة.'
                : 'La première plateforme médicale nationale dédiée à la digitalisation des consultations et à la prise de rendez-vous en Tunisie.'}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-teal-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping shrink-0"></span>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isAr
                  ? 'مطابق لمعايير الهيئة الوطنية لحماية المعطيات الشخصية وعمادة الأطباء'
                  : 'Conforme INPDP (Loi N° 2004-63) & Ordre des Médecins'}
              </span>
            </div>
          </div>

          {/* Col 2: Espace Patient */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-white font-extrabold text-sm sm:text-base tracking-wider text-[#00b4b6]">
              {isAr ? 'فضاء المرضى' : 'Espace Patient'}
            </h4>
            <ul className="space-y-2.5 text-slate-200 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  to="/"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'حجز المواعيد الطبية أونلاين' : 'Prise de RDV Médical en Ligne'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'دليل الأطباء والاختصاصات' : 'Recherche Médecins & Spécialités'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/teleconsultation"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'الاستشارات الطبية المرئية عن بعد' : 'Téléconsultation Médicale en Direct'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/patient/dashboard"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'ملف المريض والوصفات الرقمية' : 'Dossier Médical & Ordonnances'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Espace Praticien */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-white font-extrabold text-sm sm:text-base tracking-wider text-[#00b4b6]">
              {isAr ? 'فضاء الأطباء' : 'Espace Praticien'}
            </h4>
            <ul className="space-y-2.5 text-slate-200 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  to="/doctor/auth?mode=signup"
                  onClick={handleSignupClick}
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2 text-start cursor-pointer"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'انضمام وتسجيل عيادة جديدة' : 'Inscription & Création Cabinet'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/auth?mode=signin"
                  onClick={handleLoginClick}
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2 text-start cursor-pointer"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'دخول فضاء الطبيب' : 'Connexion Espace Soignant'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor/dashboard"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'معاينة لوحة تحكم الطبيب' : 'Démo Workspace Médecin'}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/verify/prescription"
                  className="hover:text-[#00b4b6] hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#00b4b6] font-bold">›</span>
                  <span>{isAr ? 'التحقق من الوصفة الطبية QR' : 'Vérification Ordonnance QR'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Urgences Vitales 24/7 (Emergency Box) */}
          <div className="lg:col-span-3 space-y-3 bg-[#022135] p-4 sm:p-5 rounded-2xl border border-teal-500/30 shadow-md">
            <h4 className="font-extrabold text-xs sm:text-sm text-rose-300 flex items-center gap-1.5">
              <span>🚨</span>
              <span>{isAr ? 'طوارئ طبية 24/7' : 'Urgences Vitales 24/7'}</span>
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {isAr
                ? 'في حالات الطوارئ الطبية القصوى، اتصل فوراً بالنجدة الوطنية:'
                : 'En cas de détresse médicale vitale, contactez directement les secours nationaux :'}
            </p>
            <div className="space-y-2 text-xs font-black pt-1">
              <a
                href="tel:190"
                className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all border border-rose-500/30"
              >
                <span>{isAr ? '🚑 الإسعاف الطبي (SAMU)' : '🚑 SAMU National'}</span>
                <span className="text-sm font-mono font-extrabold">190</span>
              </a>
              <a
                href="tel:198"
                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all border border-amber-500/30"
              >
                <span>{isAr ? '🚒 الحماية المدنية' : '🚒 Protection Civile'}</span>
                <span className="text-sm font-mono font-extrabold">198</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Security Badges */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-300 text-[11px] sm:text-xs">
          <p className="text-center sm:text-start">
            {isAr
              ? '© 2026 SahaTN / Maw2idi (موعدي). جميع الحقوق محفوظة. المنصة الصحية الرقمية الأولى في تونس.'
              : '© 2026 SahaTN / Maw2idi (موعدي). Tous droits réservés. Plateforme Santé Numérique Tunisie.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              {isAr ? '🔒 تشفير AES-256' : '🔒 Chiffrement AES-256'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              {isAr ? '📜 سجل Merkle INPDP' : '📜 Registre Merkle INPDP'}
            </span>
            <span>•</span>
            <Link to="/admin/dashboard" className="text-cyan-400 hover:underline font-semibold">
              {isAr ? 'لوحة تحكم المشرف' : 'Administration'}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
