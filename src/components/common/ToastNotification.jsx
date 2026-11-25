import React, { useEffect, useState, useRef } from 'react';
import { Check, AlertCircle, X, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translateAlertMessage } from '../../utils/alertTranslator';

export default function ToastNotification({
  type = 'success', // 'success' | 'error' | 'info'
  title = '',
  message = '',
  onClose,
  duration = 6000 // 6 seconds default
}) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!message || duration <= 0) return;

    let remaining = duration;
    let lastTick = Date.now();
    setProgress(100);

    const interval = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const delta = now - lastTick;
        lastTick = now;

        remaining = Math.max(0, remaining - delta);
        const percent = (remaining / duration) * 100;
        setProgress(percent);

        if (remaining <= 0) {
          clearInterval(interval);
          if (onCloseRef.current) onCloseRef.current();
        }
      } else {
        lastTick = Date.now();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [message, duration, isPaused]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  const defaultTitle = isSuccess
    ? (isAr ? 'تم الحفظ بنجاح' : 'Enregistrement Réussi')
    : isError
    ? (isAr ? 'تنبيه / خطأ' : 'Attention / Erreur')
    : (isAr ? 'معلومة' : 'Information');

  const localizedTitle = title ? translateAlertMessage(title, lang) : defaultTitle;
  const localizedMessage = translateAlertMessage(message, lang);

  return (
    <div 
      id="sahatn-global-toast"
      role="alert"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="toast-slide-in-br fixed bottom-24 z-[999999] max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-[420px] bg-white dark:bg-[#0c162d] rounded-2xl shadow-2xl border-2 transition-all duration-300 overflow-hidden select-none"
      style={{
        position: 'fixed',
        bottom: '96px',
        ...(isRtl ? { left: '24px' } : { right: '24px' }),
        zIndex: 999999,
        borderColor: isSuccess ? '#10b981' : isError ? '#f43f5e' : '#00A896',
        boxShadow: isSuccess 
          ? '0 25px 50px -12px rgba(16, 185, 129, 0.4), 0 0 25px rgba(16, 185, 129, 0.25)' 
          : isError 
          ? '0 25px 50px -12px rgba(244, 63, 94, 0.4), 0 0 25px rgba(244, 63, 94, 0.25)' 
          : '0 25px 50px -12px rgba(0, 168, 150, 0.4)'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-4 flex items-start gap-3.5">
        
        {/* Status Icon Badge */}
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
          isSuccess 
            ? 'bg-emerald-500 text-white' 
            : isError 
            ? 'bg-rose-500 text-white animate-pulse' 
            : 'bg-teal-500 text-white'
        }`}>
          {isSuccess && <Check className="w-6 h-6 stroke-[3]" />}
          {isError && <AlertCircle className="w-6 h-6 stroke-[2.5]" />}
          {!isSuccess && !isError && <Info className="w-6 h-6 stroke-[2.5]" />}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 pr-1 text-start">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-xs font-black uppercase tracking-wider ${
              isSuccess 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : isError 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-teal-600 dark:text-teal-400'
            }`}>
              {localizedTitle}
            </span>
            {isSuccess && <Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
            {localizedMessage}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (onCloseRef.current) onCloseRef.current();
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title={isAr ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-75 ease-linear ${
              isSuccess 
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                : isError 
                ? 'bg-gradient-to-r from-rose-400 to-rose-600' 
                : 'bg-gradient-to-r from-teal-400 to-teal-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

    </div>
  );
}
