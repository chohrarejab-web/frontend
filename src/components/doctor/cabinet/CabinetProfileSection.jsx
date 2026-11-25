import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import TunisianPhoneInput from '../../common/TunisianPhoneInput';
import SpecialtyDropdown from '../../common/SpecialtyDropdown';

export default function CabinetProfileSection({
  docName,
  setDocName,
  docSpec,
  setDocSpec,
  docPhone,
  setDocPhone,
  docAddress,
  setDocAddress,
  docOrder,
  setDocOrder,
  docCnam,
  setDocCnam
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
      
      {/* ════════ HEADER DE LA FICHE CABINET ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B1E33] dark:text-white tracking-tight flex items-center gap-2">
            <span className="text-2xl">🩺</span>
            <span>
              {isAr
                ? 'الملف التعريفي وإعدادات العيادة الطبية'
                : 'Profil & Configuration du Cabinet Médical'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            {isAr
              ? 'إعدادات بطاقة الطبيب، بيانات التواصل وجدول أوقات العمل على منصة موعيدي'
              : 'Paramètres de la fiche praticien, coordonnées et grille des horaires de travail sur Maw2idi'}
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/60 border border-[#A7F3D0] dark:border-emerald-800 text-[#065F46] dark:text-emerald-300 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span>{isAr ? 'اشتراك نشط PRO' : 'Abonnement Actif PRO'}</span>
          </span>
        </div>
      </div>

      {/* ════════ INFORMATIONS PRATICIEN & CABINET ════════ */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>📋</span>
          <span>{isAr ? 'معلومات الطبيب والعيادة' : 'Informations Praticien & Cabinet'}</span>
        </h2>

        {/* Row 1: Nom, Spécialité avec auto-suggestions, Téléphone */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              {isAr ? 'اسم الطبيب الممارس :' : 'Nom du Praticien :'}
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder={isAr ? 'مثال: د. سليم بن علي...' : 'Ex. Dr. Nom Prénom...'}
              className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 shadow-2xs placeholder:text-slate-400 font-bold"
            />
          </div>

          <div>
            <SpecialtyDropdown
              label={isAr ? 'الاختصاص الطبي الرئيسي :' : 'Spécialité Principale :'}
              value={docSpec}
              onChange={(val) => setDocSpec(val)}
              placeholder={isAr ? 'مثال: أمراض القلب والأوعية الدموية...' : 'Ex: Cardiologie & Maladies Vasculaires...'}
              isAr={isAr}
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              {isAr ? 'الهاتف المباشر / السكرتارية :' : 'Téléphone Direct / Secrétariat :'}
            </label>
            <TunisianPhoneInput
              value={docPhone}
              onChange={(e) => setDocPhone(e.target.value)}
              className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 shadow-2xs"
            />
          </div>
        </div>

        {/* Row 2: Adresse complète */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold text-xs">
            {isAr ? 'العنوان الكامل للعيادة :' : 'Adresse complète du Cabinet :'}
          </label>
          <input
            type="text"
            value={docAddress}
            onChange={(e) => setDocAddress(e.target.value)}
            placeholder={
              isAr
                ? 'مثال: شارع الحبيب بورقيبة، إقامة النخيل، تونس...'
                : 'Ex. Avenue Habib Bourguiba, Résidence Les Jardins, Tunis...'
            }
            className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 shadow-2xs placeholder:text-slate-400 font-bold"
          />
        </div>

        {/* Row 3: Ordre & CNAM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              {isAr ? 'رقم التسجيل بعمادة الأطباء :' : 'N° Inscription Ordre des Médecins :'}
            </label>
            <input
              type="text"
              value={docOrder}
              onChange={(e) => setDocOrder(e.target.value)}
              placeholder={isAr ? 'مثال: N° 14092' : 'Ex. N° 14092'}
              className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 shadow-2xs placeholder:text-slate-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              {isAr ? 'رمز المنظومة العلاجية الخاصة (الكنام) :' : 'Code Filière Privée CNAM :'}
            </label>
            <input
              type="text"
              value={docCnam}
              onChange={(e) => setDocCnam(e.target.value)}
              placeholder={isAr ? 'مثال: CNAM-CD-40912' : 'Ex. CNAM-CD-40912'}
              className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-[#00A896] dark:text-teal-400 outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 shadow-2xs placeholder:text-slate-400 font-bold"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
