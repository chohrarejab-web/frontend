import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ENABLE_REVIEWS } from '../../config/features';
import { isMobileApp, MOBILE_DOCTOR_TABS } from '../../utils/mobilePlatform';

export default function DoctorTabsNav({ activeTab, onSelectTab, onOpenTour }) {
  const scrollRef = useRef(null);
  const { t, lang } = useLanguage();
  const mobileMode = isMobileApp();

  const allTabs = [
    { id: 'agenda', icon: '📅', label: t('doc_tab_agenda', 'Agenda & File d\'Attente') },
    { id: 'caisse', icon: '💳', label: t('doc_tab_caisse', 'Caisse & Recettes') },
    { id: 'whatsapp', icon: '💬', label: t('doc_tab_whatsapp', 'WhatsApp & SMS') },
    { id: 'retard', icon: '⏱️', label: t('doc_tab_retard', 'Retard Cabinet') },
    { id: 'ehr', icon: '📁', label: t('doc_tab_ehr', 'Dossier Médical (EHR)') },
    { id: 'ordonnance', icon: '💊', label: t('doc_tab_ordonnance', 'Ordonnances PCT') },
    { id: 'cnam', icon: '🏛️', label: t('doc_tab_cnam', 'Bulletin CNAM C1') },
    { id: 'liaison', icon: '📨', label: t('doc_tab_liaison', 'Lettre de Liaison') },
    { id: 'cabinet', icon: '🏢', label: t('doc_tab_cabinet', 'Mon Cabinet') },
    { id: 'abonnement', icon: '🏦', label: t('doc_tab_subscription', 'Abonnement & Paiement') },
    { id: 'reputation', icon: '⭐', label: t('doc_tab_reputation', 'E-Réputation & Avis') },
    { id: 'teleconsult', icon: '🎥', label: t('doc_tab_teleconsult', 'Salon Téléconsultation'), isHighlight: true }
  ];

  const baseTabs = ENABLE_REVIEWS ? allTabs : allTabs.filter(t => t.id !== 'reputation');
  const tabs = mobileMode ? baseTabs.filter(tab => MOBILE_DOCTOR_TABS.includes(tab.id)) : baseTabs;

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  const mobileLabels = {
    agenda: lang === 'ar' ? 'الجدول' : 'Agenda',
    retard: lang === 'ar' ? 'التأخير' : 'Retard',
    teleconsult: lang === 'ar' ? 'فيديو' : 'Téléconsult'
  };

  if (mobileMode) {
    return (
      <div className="w-full grid grid-cols-3 gap-1.5 bg-white dark:bg-[#0c162d] p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`px-2 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#00A896] text-white shadow-sm shadow-teal-500/20'
                  : tab.isHighlight
                    ? 'bg-teal-50/70 dark:bg-teal-950/40 text-[#00A896] dark:text-teal-300 border border-teal-200/70 dark:border-teal-900'
                    : 'bg-slate-50/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{mobileLabels[tab.id] || tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-1.5 sm:gap-2.5 bg-white dark:bg-[#0c162d] p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs select-none">

      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={handleScrollLeft}
        className="w-8 h-8 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
        title="Faire défiler vers la gauche"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable Tabs Container */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto scroll-smooth hide-scrollbar px-1 py-0.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${isActive
                ? 'bg-[#00A896] text-white shadow-md shadow-teal-500/20 transform scale-[1.01]'
                : tab.isHighlight
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-[#00A896] dark:text-teal-300 border border-teal-200/80 dark:border-teal-900 hover:bg-teal-100/60'
                  : 'bg-white dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.isHighlight && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={handleScrollRight}
        className="w-8 h-8 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95"
        title="Faire défiler vers la droite"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Interactive Tour Guide Button */}
      {onOpenTour && (
        <button
          type="button"
          onClick={onOpenTour}
          className="px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95 shadow-xs text-xs font-black"
          title={t('doc_tour_btn_title', 'Lancer le tutoriel animé de cette zone')}
        >
          <span className="text-sm">💡</span>
          <span className="hidden sm:inline">{t('doc_tour_btn_label', 'Aide & Tutoriel')}</span>
        </button>
      )}

    </div>
  );
}
