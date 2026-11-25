import React from 'react';
import { Trash2, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function CabinetLeavesSection({
  leaves = [],
  congeStart,
  congeEnd,
  congeReason,
  congeError = '',
  congeSuccess = false,
  todayStr,
  onStartChange,
  onEndChange,
  onReasonChange,
  onAddLeave,
  onRemoveLeave
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="bg-[#FFFBEA] dark:bg-amber-950/20 border-2 border-[#FDE68A] dark:border-amber-800/60 rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xs">
      
      {/* ════════ HEADER CONGÉS ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-black text-[#92400E] dark:text-amber-200 flex items-center gap-2">
            <span>🏖️</span>
            <span>
              {isAr
                ? 'فترة عطلة أو إغلاق استثنائي'
                : 'Période de Congés ou Fermeture Exceptionnelle'}
            </span>
          </h3>
          <p className="text-xs text-[#B45309] dark:text-amber-300 mt-1">
            {isAr
              ? 'يقفل تلقائياً الحجز عبر الإنترنت للمرضى وتحديد أوقاتك كغير متوفرة.'
              : "Verrouille automatiquement l'agenda en ligne des patients et marque vos créneaux comme indisponibles."}
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-block px-3 py-1 rounded-full bg-[#D97706] text-white text-xs font-bold shadow-2xs">
            {isAr
              ? `${leaves.length} ${leaves.length > 1 ? 'عطل مبرمجة' : 'عطلة مبرمجة'}`
              : `${leaves.length} congé${leaves.length > 1 ? 's' : ''} planifié${leaves.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ════════ FORMULAIRE D'AJOUT DE CONGÉ ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold items-end">
        <div>
          <label className="block text-[#92400E] dark:text-amber-200 mb-1.5 font-bold">
            📅 {isAr ? 'من (تاريخ البداية) :' : 'Du (Date Début) :'}
          </label>
          <div className="relative">
            <input
              type="date"
              min={todayStr}
              value={congeStart}
              onChange={(e) => onStartChange && onStartChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#FDE68A] dark:border-amber-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#B45309] shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#92400E] dark:text-amber-200 mb-1.5 font-bold">
            📅 {isAr ? 'إلى (تاريخ النهاية) :' : 'Au (Date Fin) :'}
          </label>
          <div className="relative">
            <input
              type="date"
              min={congeStart || todayStr}
              value={congeEnd}
              onChange={(e) => onEndChange && onEndChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#FDE68A] dark:border-amber-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#B45309] shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#92400E] dark:text-amber-200 mb-1.5 font-bold">
            🏷️ {isAr ? 'السبب المعلن للمرضى :' : 'Motif affiché aux patients :'}
          </label>
          <input
            type="text"
            value={congeReason}
            onChange={(e) => onReasonChange && onReasonChange(e.target.value)}
            placeholder={isAr ? 'مثال: عطلة سنوية، تدريب...' : 'ex: Congés annuels, formation...'}
            className="w-full bg-white dark:bg-slate-900 border border-[#FDE68A] dark:border-amber-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#B45309] shadow-2xs"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onAddLeave}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#D97706] hover:bg-[#B45309] active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>🏖️</span>
            <span>{isAr ? 'تسجيل هذه العطلة' : 'Enregistrer ce Congé'}</span>
          </button>
        </div>
      </div>

      {/* ════════ MESSAGES D'ALERTE ERREUR & SUCCÈS ════════ */}
      {congeError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{congeError}</span>
        </div>
      )}

      {congeSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {isAr
              ? 'تم تسجيل فترة العطلة بنجاح! تم قفل المواعيد وحمايتها فوراً للمرضى.'
              : 'Période de congé enregistrée avec succès ! Votre cabinet et les réservations patients sont immédiatement synchronisés.'}
          </span>
        </div>
      )}

      {/* ════════ LISTE DES CONGÉS ENREGISTRÉS ════════ */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          {isAr ? 'فترات العطل المسجلة في العيادة :' : 'Périodes de congés enregistrées sur votre cabinet :'}
        </label>
        <div className="bg-white dark:bg-slate-900 border border-[#FDE68A] dark:border-slate-800 rounded-2xl p-4 min-h-[50px] flex items-center justify-center text-xs text-slate-400">
          {leaves.length === 0 ? (
            <span>
              {isAr
                ? 'لا توجد فترات عطل مسجلة حالياً. العيادة مفتوحة وفق جدول العمل المعتاد.'
                : 'Aucune période de congé enregistrée actuellement. Votre cabinet reste ouvert selon votre planning habituel.'}
            </span>
          ) : (
            <div className="w-full space-y-2">
              {leaves.map((leave) => {
                const nowIso = new Date().toISOString().split('T')[0];
                const isInvalid = Boolean(leave.start && leave.end && leave.start > leave.end);
                const isCurrent = !isInvalid && nowIso >= leave.start && nowIso <= leave.end;
                const isUpcoming = !isInvalid && nowIso < leave.start;
                return (
                  <div
                    key={leave.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2 ${
                      isInvalid
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                        : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 font-semibold text-xs flex-wrap">
                      <span className="text-base">{isInvalid ? '⚠️' : '🏖️'}</span>
                      <span className="font-bold">
                        {isAr ? `من ${leave.start} إلى ${leave.end}` : `Du ${leave.start} au ${leave.end}`}
                      </span>
                      <span className="text-amber-700 dark:text-amber-300">
                        ({leave.reason || (isAr ? 'عطلة استثنائية' : 'Congé exceptionnel')})
                      </span>
                      {isInvalid && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300">
                          ⚠️ {isAr ? 'فترة غير صالحة (البداية بعد النهاية)' : 'Période invalide (Début > Fin)'}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300">
                          ● {isAr ? 'جارية اليوم' : "En cours aujourd'hui"}
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300">
                          ⏳ {isAr ? 'قادمة' : 'À venir'}
                        </span>
                      )}
                      {!isInvalid && !isCurrent && !isUpcoming && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {isAr ? 'منتهية' : 'Terminé'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveLeave && onRemoveLeave(leave.id)}
                      className="text-amber-700 hover:text-rose-600 p-1 cursor-pointer flex items-center gap-1 text-xs self-end sm:self-auto transition-colors"
                      title={isAr ? 'حذف هذه العطلة' : 'Supprimer ce congé'}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden font-medium">{isAr ? 'حذف' : 'Supprimer'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

