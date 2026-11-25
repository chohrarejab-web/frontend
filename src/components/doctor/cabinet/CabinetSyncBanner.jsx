import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export default function CabinetSyncBanner() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800 rounded-2xl p-4 text-xs font-semibold text-[#065F46] dark:text-emerald-300 flex items-center gap-2.5 shadow-2xs">
      <span className="text-base shrink-0">💡</span>
      <p className="leading-relaxed">
        <span className="font-black">
          {isAr ? 'المزامنة الفورية :' : 'Synchronisation Immédiate :'}
        </span>{' '}
        {isAr
          ? 'المواعيد المعروضة للمرضى في بحث موعيدي ووحدة الحجز تتكيف فوراً مع جدول الأوقات هذا والمدة المتوسطة لكل مريض.'
          : "Les créneaux visibles par les patients dans la recherche SahaTN et le module de réservation s'adaptent instantanément à cette grille d'horaires et à la durée moyenne par patient."}
      </p>
    </div>
  );
}
