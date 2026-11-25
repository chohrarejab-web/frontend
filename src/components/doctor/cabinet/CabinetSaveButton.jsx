import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function CabinetSaveButton({ onSave, isSaving = false, className = '' }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className={`w-full py-4 px-6 rounded-2xl bg-[#0B1E33] hover:bg-[#132A44] active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
          <span>{isAr ? 'جارٍ الحفظ والمزامنة...' : 'Enregistrement en cours...'}</span>
        </>
      ) : (
        <>
          <Save className="w-5 h-5 text-teal-400" />
          <span>
            {isAr
              ? 'حفظ تعديلات العيادة وجدول أوقات العمل'
              : 'Enregistrer les Modifications du Cabinet & Horaires de Travail'}
          </span>
        </>
      )}
    </button>
  );
}
