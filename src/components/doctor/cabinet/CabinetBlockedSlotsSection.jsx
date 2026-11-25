import React from 'react';
import { Calendar, Clock, Lock, Trash2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function CabinetBlockedSlotsSection({
  blockedSlots = [],
  lockDate,
  setLockDate,
  lockTime,
  setLockTime,
  lockReason,
  setLockReason,
  onAddBlockSlot,
  onRemoveBlockSlot
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="bg-[#FFF1F2]/80 dark:bg-rose-950/20 border-2 border-[#FECDD3] dark:border-rose-800/60 rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xs">
      
      {/* ════════ HEADER VERROUILLAGE CRÉNEAU ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            <h3 className="text-sm sm:text-base font-black text-[#9F1239] dark:text-rose-200">
              {isAr ? 'حظر / قفل توقيت زمني محدد' : 'Verrouiller / Bloquer un Créneau Horaire Spécifique'}
            </h3>
            <span className="bg-[#FFE4E6] dark:bg-rose-950 text-[#BE123C] dark:text-rose-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-[#FECDD3]">
              {isAr ? 'مخفي عن المرضى' : 'INVISIBLE POUR LES PATIENTS'}
            </span>
          </div>
          <p className="text-xs text-[#BE123C]/90 dark:text-rose-300/80 mt-1 font-normal">
            {isAr
              ? 'قفل موعد محدد (مثال: 09:00). يختفي هذا التوقيت فوراً لجميع المرضى ولا يمكن حجزه.'
              : 'Bloquez une heure précise (ex: 09:00). Ce créneau disparaît immédiatement pour tous les patients et ne peut plus être réservé.'}
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-block px-3 py-1 rounded-full bg-[#E11D48] text-white text-xs font-bold shadow-2xs">
            {isAr
              ? `${blockedSlots.length} ${blockedSlots.length > 1 ? 'مواعيد محظورة' : 'موعد محظور'}`
              : `${blockedSlots.length} créneau bloqué${blockedSlots.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ════════ FORMULAIRE VERROUILLAGE ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold items-end">
        <div>
          <label className="block text-[#9F1239] dark:text-rose-200 mb-1.5 font-bold">
            📅 {isAr ? 'تاريخ الموعد :' : 'Date du créneau :'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={lockDate}
              onChange={(e) => setLockDate && setLockDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#E11D48] shadow-2xs"
            />
            <Calendar className="w-4 h-4 text-[#E11D48] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[#9F1239] dark:text-rose-200 mb-1.5 font-bold">
            ⏰ {isAr ? 'توقيت الموعد :' : 'Heure du créneau :'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={lockTime}
              onChange={(e) => setLockTime && setLockTime(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#E11D48] shadow-2xs"
            />
            <Clock className="w-4 h-4 text-[#E11D48] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[#9F1239] dark:text-rose-200 mb-1.5 font-bold">
            🏷️ {isAr ? 'سبب الحظر :' : 'Motif du blocage :'}
          </label>
          <input
            type="text"
            value={lockReason}
            onChange={(e) => setLockReason && setLockReason(e.target.value)}
            placeholder={isAr ? 'مثال: التزام مهني خاص...' : 'Indisponibilité exceptionnelle'}
            className="w-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#E11D48] shadow-2xs"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onAddBlockSlot}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#E11D48] hover:bg-[#BE123C] active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>{isAr ? 'حظر هذا التوقيت' : 'Bloquer ce Créneau'}</span>
          </button>
        </div>
      </div>

      {/* ════════ LISTE DES CRÉNEAUX BLOQUÉS ════════ */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          {isAr ? 'المواعيد المحظورة حالياً في جدولك :' : 'Créneaux actuellement verrouillés sur votre agenda :'}
        </label>
        <div className="bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-slate-800 rounded-2xl p-4 min-h-[50px] flex items-center justify-center text-xs text-slate-400">
          {blockedSlots.length === 0 ? (
            <span>{isAr ? 'لا توجد مواعيد محظورة حالياً.' : 'Aucun créneau verrouillé actuellement.'}</span>
          ) : (
            <div className="w-full space-y-2">
              {blockedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                >
                  <div className="flex items-center gap-3 font-semibold text-xs">
                    <span>🔒</span>
                    <span dir="ltr">{slot.date} - {slot.time}</span>
                    <span className="text-rose-600 font-normal">({slot.reason})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveBlockSlot && onRemoveBlockSlot(slot.id)}
                    className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer transition-colors"
                    title={isAr ? 'إلغاء الحظر' : 'Débloquer'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
