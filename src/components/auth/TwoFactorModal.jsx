import React, { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function TwoFactorModal() {
  const { pending2FA, confirm2FA, cancel2FA } = useAuth();
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && pending2FA) {
        cancel2FA();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pending2FA, cancel2FA]);

  if (!pending2FA) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) {
      setError(isAr ? 'يرجى إدخال رمز مكون من 6 أرقام.' : 'Veuillez saisir un code à 6 chiffres.');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await confirm2FA(code);
      if (res && res.user && (res.user.role === 'DOCTOR' || res.user.doctorId)) {
        sessionStorage.removeItem('sahatn_doctor_session_locked');
        sessionStorage.setItem('sahatn_doctor_active_session', 'true');
        localStorage.setItem('sahatn_doctor_authenticated', 'true');
        sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
      }
    } catch (err) {
      setError(err.message || (isAr ? 'رمز التحقق الثنائي غير صحيح.' : 'Code 2FA invalide'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pending2FA?.tempToken || resending) return;
    setError('');
    setInfo('');
    setResending(true);
    try {
      await api.resend2FA({ tempToken: pending2FA.tempToken });
      setInfo(isAr ? 'تم إرسال رمز أمان جديد مكون من 6 أرقام.' : 'Un nouveau code de sécurité à 6 chiffres a été envoyé.');
    } catch (err) {
      setError(err.message || (isAr ? 'تعذر إعادة إرسال الرمز.' : 'Impossible de renvoyer le code.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#0b132b] text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-center">
        
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-[#00A896] dark:text-teal-400 mx-auto flex items-center justify-center text-2xl border border-teal-200 dark:border-teal-800 shadow-md">
          <KeyRound className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Double Authentification (2FA)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sécurité renforcée requise pour le compte <strong>{pending2FA.user?.name || pending2FA.user?.email}</strong>.
          </p>
          {pending2FA.maskedEmail && (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-bold mt-1">
              Code envoyé à : {pending2FA.maskedEmail}
            </p>
          )}
        </div>

        {info && (
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs rounded-xl font-semibold">
            {info}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#00b4b6]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A896] hover:bg-teal-700 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
          >
            {loading ? 'Vérification...' : 'Valider & Déverrouiller la Session'}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={cancel2FA}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="text-[#0086cd] hover:underline font-bold cursor-pointer disabled:opacity-50"
            >
              {resending ? 'Envoi...' : 'Renvoyer le code'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
