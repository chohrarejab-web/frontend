import React, { useState } from 'react';
import { X, Mail, KeyRound, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Pass, 4: Success
  const [email, setEmail] = useState(initialEmail || '');
  const [resetToken, setResetToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStep1 = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setResetToken(res.resetToken || '');
      setStep(2);
    } catch (err) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء إرسال الرمز.' : 'Erreur lors de l\'envoi du code'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyResetCode({ resetToken, code });
      setVerifiedToken(res.verifiedToken);
      setStep(3);
    } catch (err) {
      setError(err.message || (isAr ? 'رمز التحقق غير صحيح.' : 'Code de vérification invalide'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e) => {
    e?.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Les mots de passe ne correspondent pas');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.resetPassword({ verifiedToken, newPassword });
      setStep(4);
    } catch (err) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء إعادة تعيين كلمة المرور.' : 'Erreur réinitialisation mot de passe'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#0b132b] text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Récupération de Compte</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Étape {step} sur 3 • Vérification sécurisée</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Saisissez l'adresse email de votre compte pour recevoir un code OTP de sécurité à 6 chiffres.
            </p>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@gmail.com"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#00b4b6]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-black py-3.5 px-6 rounded-2xl shadow-lg cursor-pointer transition-all"
            >
              {loading ? 'Envoi du code...' : 'Envoyer le Code OTP ›'}
            </button>
          </form>
        )}

        {/* STEP 2: Enter Code */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Saisissez le code à 6 chiffres envoyé à <strong>{email}</strong>.
            </p>
            <div>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-[#00b4b6]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A896] hover:bg-teal-700 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg cursor-pointer transition-all"
            >
              {loading ? 'Validation...' : 'Valider le Code ›'}
            </button>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Choisissez un nouveau mot de passe robuste (min. 8 caractères, majuscule, chiffre et symbole).
            </p>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#00b4b6]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmer mot de passe</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#00b4b6]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-black py-3.5 px-6 rounded-2xl shadow-lg cursor-pointer transition-all"
            >
              {loading ? 'Mise à jour...' : 'Enregistrer le Nouveau Mot de Passe'}
            </button>
          </form>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Mot de passe réinitialisé !</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Votre compte est déverrouillé et à jour. Vous pouvez maintenant vous connecter en toute sécurité.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[#00b4b6] hover:bg-teal-600 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg cursor-pointer"
            >
              Accéder à la Connexion
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
