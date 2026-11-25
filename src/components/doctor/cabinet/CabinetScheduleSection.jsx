import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const DAY_LABELS = {
  lundi: { fr: 'Lundi', ar: 'الإثنين' },
  mardi: { fr: 'Mardi', ar: 'الثلاثاء' },
  mercredi: { fr: 'Mercredi', ar: 'الأربعاء' },
  jeudi: { fr: 'Jeudi', ar: 'الخميس' },
  vendredi: { fr: 'Vendredi', ar: 'الجمعة' },
  samedi: { fr: 'Samedi', ar: 'السبت' },
  dimanche: { fr: 'Dimanche', ar: 'الأحد' }
};

export default function CabinetScheduleSection({
  days = [],
  onToggleDay,
  onToggleSansRdv,
  onUpdateTime,
  onApplyPreset
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
      
      {/* ════════ BANDEAU HORAIRES DE TRAVAIL & PRÉRÉGLAGES RAPIDES ════════ */}
      <div className="pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⏱️</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isAr
                  ? 'أوقات العمل ومواعيد الاستشارات الطبية'
                  : 'Horaires de Travail & Disponibilités des Consultations'}
              </h3>
              <span className="bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#00A896] dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-900">
                {isAr ? 'مباشر على موعيدي' : 'En direct sur Maw2idi'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {isAr
                ? 'قم بضبط أوقات الاستقبال الأسبوعية، وفترات الصباح / بعد الظهر والمدة المتوسطة لكل مريض.'
                : "Configurez les plages d'accueil hebdomadaires, les créneaux matin/après-midi et la durée moyenne par patient."}
            </p>
          </div>

          {/* Boutons de Préréglages */}
          {typeof onApplyPreset === 'function' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onApplyPreset('standard')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
              >
                <span>⚡</span>
                <span>
                  {isAr ? 'إثنين-جمعة قياسي (8:30–18:30)' : 'Lun-Ven Standard (8h30–18h30)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onApplyPreset('continue')}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800 font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
              >
                <span>🟠</span>
                <span>
                  {isAr ? 'حصة مسترسلة (8:00–14:30)' : 'Séance Continue (8h00–14h30)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onApplyPreset('weekend')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800 font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
              >
                <span>🌴</span>
                <span>{isAr ? 'السبت والأحد مغلق' : 'Sam & Dim Fermés'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════ HEADER CALENDRIER HEBDOMADAIRE ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>📅</span>
          <span>
            {isAr
              ? 'الجدول الأسبوعي للعمل — أيام العمل والراحة'
              : 'Calendrier Visuel de la Semaine — Jours de Travail & Repos'}
          </span>
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {isAr
            ? 'انقر على اليوم للتبديل الفوري بين : في الخدمة أو يوم راحة'
            : 'Cliquez sur un jour pour basculer instantanément : En service ou Repos'}
        </span>
      </div>

      {/* ════════ 7 CARTES JOURS DE LA SEMAINE ════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {days.map((d) => {
          const dayLabel = DAY_LABELS[d.key]?.[isAr ? 'ar' : 'fr'] || d.label;
          const hasAprem = d.apremEnd && d.apremStart && d.apremStart !== 'Après-midi fermé' && d.apremStart !== '--';

          return (
            <div
              key={d.key}
              className={`p-4 rounded-3xl border transition-all text-center flex flex-col justify-between select-none shadow-2xs ${
                d.isWork
                  ? 'bg-[#F0FDF4] dark:bg-emerald-950/30 border-2 border-[#BBF7D0] dark:border-emerald-800'
                  : 'bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Ligne haute : Libellé du jour & pastille de statut */}
                <div className="flex items-center justify-between text-xs font-black mb-2.5">
                  <span className="text-slate-800 dark:text-white">{dayLabel}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      d.isWork ? 'bg-[#10b981]' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  ></span>
                </div>

                {/* Badge Travaille / Repos */}
                <div className="mb-2">
                  {d.isWork ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-black border border-[#BBF7D0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                      <span>{isAr ? 'يعمل' : 'Travaille'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4E6] text-[#BE123C] text-[10px] font-black border border-[#FECDD3]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]"></span>
                      <span>{isAr ? 'راحة' : 'Repos'}</span>
                    </span>
                  )}
                </div>

                {/* Résumé des heures */}
                <p
                  className="text-[10px] font-medium text-slate-500 dark:text-slate-400 min-h-[32px] flex items-center justify-center text-center"
                  dir="ltr"
                >
                  {d.isWork
                    ? hasAprem
                      ? `${d.matinStart}-${d.matinEnd} / ${d.apremStart}-${d.apremEnd}`
                      : `${d.matinStart}-${d.matinEnd} (${isAr ? 'مسترسل' : 'Continu'})`
                    : (isAr ? 'مغلق هذا اليوم' : 'Fermé ce jour')}
                </p>
              </div>

              {/* Bouton bascule jour */}
              <button
                type="button"
                onClick={() => onToggleDay && onToggleDay(d.key)}
                className={`w-full py-2 rounded-2xl text-[10px] font-bold transition-all cursor-pointer mt-3 active:scale-95 shadow-2xs ${
                  d.isWork
                    ? 'bg-white dark:bg-slate-800 hover:bg-emerald-50 text-[#047857] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {d.isWork
                  ? (isAr ? 'تحديد كيوم راحة' : 'Mettre en Repos')
                  : (isAr ? 'تفعيل يوم العمل' : 'Activer Jour')}
              </button>
            </div>
          );
        })}
      </div>

      {/* ════════ TABLEAU DES HORAIRES DÉTAILLÉ AVEC MODIFICATION ════════ */}
      <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-[#F8FAFC] dark:bg-slate-900/60">
              <th className="py-3.5 px-5">{isAr ? 'اليوم' : 'JOUR'}</th>
              <th className="py-3.5 px-4">{isAr ? 'الحالة' : 'STATUT'}</th>
              <th className="py-3.5 px-5">{isAr ? 'فترة الصباح' : 'PLAGE MATIN'}</th>
              <th className="py-3.5 px-5">{isAr ? 'استراحة الغداء' : 'PAUSE DÉJEUNER'}</th>
              <th className="py-3.5 px-5">{isAr ? 'فترة بعد الظهر' : 'PLAGE APRÈS-MIDI'}</th>
              <th className="py-3.5 px-4 text-center">{isAr ? 'بدون موعد' : 'SANS RDV'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {days.map((d) => {
              const dayLabel = DAY_LABELS[d.key]?.[isAr ? 'ar' : 'fr'] || d.label;
              const hasPause = d.pauseEnd && d.pauseStart && d.pauseStart !== 'Sans coupure' && d.pauseStart !== '--';
              const hasAprem = d.apremEnd && d.apremStart && d.apremStart !== 'Après-midi fermé' && d.apremStart !== '--';

              return (
                <tr
                  key={d.key}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Jour */}
                  <td className="py-3.5 px-5 font-black text-slate-800 dark:text-white">
                    <div className="inline-flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          d.isWork ? 'bg-[#00A896]' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      ></span>
                      <span>{dayLabel}</span>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {d.isWork ? (
                      <span className="font-bold text-[#00A896]">{isAr ? 'مفتوح' : 'Ouvert'}</span>
                    ) : (
                      <span className="font-semibold text-slate-400">{isAr ? 'مغلق' : 'Fermé'}</span>
                    )}
                  </td>

                  {/* Plage Matin (Modifiable par le docteur) */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs" dir="ltr">
                      <input
                        type="time"
                        value={d.matinStart || '08:30'}
                        disabled={!d.isWork}
                        onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'matinStart', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                        title={isAr ? 'بداية فترة الصباح' : 'Début plage matin'}
                      />
                      <span className="text-slate-400 font-sans font-bold">→</span>
                      <input
                        type="time"
                        value={d.matinEnd || '13:00'}
                        disabled={!d.isWork}
                        onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'matinEnd', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                        title={isAr ? 'نهاية فترة الصباح' : 'Fin plage matin'}
                      />
                    </div>
                  </td>

                  {/* Pause Déjeuner (Modifiable par le docteur) */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {hasPause ? (
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs" dir="ltr">
                        <input
                          type="time"
                          value={d.pauseStart || '13:00'}
                          disabled={!d.isWork}
                          onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'pauseStart', e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                          title={isAr ? 'بداية استراحة الغداء' : 'Début pause déjeuner'}
                        />
                        <span className="text-slate-400 font-sans font-bold">→</span>
                        <input
                          type="time"
                          value={d.pauseEnd || '14:00'}
                          disabled={!d.isWork}
                          onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'pauseEnd', e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                          title={isAr ? 'نهاية استراحة الغداء' : 'Fin pause déjeuner'}
                        />
                        {d.isWork && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateTime) {
                                onUpdateTime(d.key, 'pauseStart', 'Sans coupure');
                                onUpdateTime(d.key, 'pauseEnd', '');
                              }
                            }}
                            title={isAr ? 'إلغاء الاستراحة (حصة مسترسلة)' : 'Supprimer la pause'}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded text-xs transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-slate-400 font-sans text-xs italic">
                          {d.pauseStart === 'Sans coupure' ? (isAr ? 'بدون استراحة' : 'Sans coupure') : '--'}
                        </span>
                        {d.isWork && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateTime) {
                                onUpdateTime(d.key, 'pauseStart', '13:00');
                                onUpdateTime(d.key, 'pauseEnd', '14:00');
                              }
                            }}
                            className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
                          >
                            {isAr ? '+ استراحة' : '+ Pause'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Plage Après-Midi (Modifiable par le docteur) */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {hasAprem ? (
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs" dir="ltr">
                        <input
                          type="time"
                          value={d.apremStart || '14:00'}
                          disabled={!d.isWork}
                          onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'apremStart', e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                          title={isAr ? 'بداية فترة بعد الظهر' : 'Début plage après-midi'}
                        />
                        <span className="text-slate-400 font-sans font-bold">→</span>
                        <input
                          type="time"
                          value={d.apremEnd || '18:30'}
                          disabled={!d.isWork}
                          onChange={(e) => onUpdateTime && onUpdateTime(d.key, 'apremEnd', e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:border-[#00A896] focus:ring-1 focus:ring-[#00A896]/30 outline-none transition-all cursor-pointer"
                          title={isAr ? 'نهاية فترة بعد الظهر' : 'Fin plage après-midi'}
                        />
                        {d.isWork && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateTime) {
                                onUpdateTime(d.key, 'apremStart', 'Après-midi fermé');
                                onUpdateTime(d.key, 'apremEnd', '');
                              }
                            }}
                            title={isAr ? 'إغلاق فترة بعد الظهر' : "Fermer l'après-midi"}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded text-xs transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-slate-400 font-sans text-xs italic">
                          {d.apremStart === 'Après-midi fermé' ? (isAr ? 'مغلق بعد الظهر' : 'Après-midi fermé') : '--'}
                        </span>
                        {d.isWork && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateTime) {
                                onUpdateTime(d.key, 'apremStart', '14:00');
                                onUpdateTime(d.key, 'apremEnd', '18:30');
                              }
                            }}
                            className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
                          >
                            {isAr ? '+ فتح بعد الظهر' : '+ Ouvrir après-midi'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Sans RDV Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={d.sansRdv}
                      onChange={() => onToggleSansRdv && onToggleSansRdv(d.key)}
                      className="w-4 h-4 rounded text-[#00A896] cursor-pointer accent-[#00A896]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
