import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Lock, ShieldCheck, Check, 
  Camera, Upload, Trash2, ArrowLeft, Save, AlertCircle, Sparkles, Key,
  Shield, LogIn, UserPlus, RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GOVERNORATES_AR, TUNISIAN_GOVERNORATES } from '../data/tunisiaData';
import ToastNotification from '../components/common/ToastNotification';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';

// Preset avatar options pour le patient (utilisateur simple)
const getPresetAvatars = (isAr) => [
  { id: 'av-1', label: isAr ? 'امرأة 1' : 'Femme 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av-2', label: isAr ? 'رجل 1' : 'Homme 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av-3', label: isAr ? 'امرأة 2' : 'Femme 2', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av-4', label: isAr ? 'رجل 2' : 'Homme 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av-5', label: isAr ? 'امرأة 3' : 'Femme 3', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av-6', label: isAr ? 'رجل 3' : 'Homme 3', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80' },
];

function resolveAvatar(avatar) {
  if (!avatar) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

export default function SettingsPage({ onOpenLogin, onOpenSignup }) {
  const { user, updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const { lang, isRtl, t } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Redirection : les paramètres de compte généraux sont exclusivement réservés à l'utilisateur simple (patient)
  // Les médecins gèrent leur profil et cabinet directement dans leur espace dédié (/doctor/dashboard)
  useEffect(() => {
    if (!authLoading && user && (user.role === 'DOCTOR' || Boolean(user.doctorId))) {
      navigate('/doctor/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Form states pour l'utilisateur simple (patient)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    address: '',
    city: 'Tunis',
    birthDate: '',
    gender: '',
    // Security fields
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Initialisation avec les données du compte patient connecté
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '+216 20 999 123',
        avatar: user.avatar || '',
        address: user.address || '15 Rue de Palestine, Lafayette',
        city: user.city || 'Tunis',
        birthDate: user.birthDate || '1992-06-14',
        gender: user.gender || '',
      }));
    }
  }, [user]);

  // Handle image upload from computer (Base64)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(isAr ? 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).' : 'Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(isAr ? 'حجم الصورة كبير جداً (الحد الأقصى 2 ميغابايت).' : "L'image est trop volumineuse (maximum 2 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    setErrorMsg('');
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setErrorMsg(isAr ? 'الاسم الكامل إجباري.' : 'Le nom complet est obligatoire.');
      return;
    }

    // Password validation if attempting to change
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور.' : 'Veuillez saisir votre mot de passe actuel.');
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg(isAr ? 'يجب أن تحتوي كلمة المرور الجديدة على 6 أحرف على الأقل.' : 'Le nouveau mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Les nouveaux mots de passe ne correspondent pas.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar,
        address: formData.address.trim(),
        city: formData.city,
        birthDate: formData.birthDate,
        gender: formData.gender,
        ...(formData.newPassword ? {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        } : {})
      };

      const res = await updateProfile(payload);

      if (res.success) {
        setSuccessMsg(isAr ? 'تم حفظ تعديلاتك بنجاح في قاعدة البيانات!' : 'Vos modifications ont été enregistrées avec succès dans la base de données !');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setShowPasswordSection(false);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.message || (isAr ? 'حدث خطأ أثناء حفظ الملف الشخصي.' : 'Erreur lors de la sauvegarde du profil.'));
    } finally {
      setSaving(false);
    }
  };

  // User initials helper
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // 1. Loading state during auth initialization
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mb-4 text-[#00A896]">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
          {isAr ? 'جاري التحقق من جلستك الآمنة...' : 'Vérification de votre session sécurisée...'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? 'مطابقة لمعايير INPDP • تشفير AES-256' : 'Conformité INPDP • Chiffrement AES-256'}
        </p>
      </div>
    );
  }

  // 2. Access Protection: BLOCK access if no user account is active
  if (!isAuthenticated || !user) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-white dark:bg-[#0c162d] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 w-full animate-in fade-in zoom-in-95">
          {/* Security Shield Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#00A896]/20 to-[#0086cd]/20 border border-[#00A896]/30 flex items-center justify-center text-[#00A896] shadow-lg shadow-teal-500/10">
            <Shield className="w-10 h-10 text-[#00A896]" />
            <div className="absolute -bottom-1 -right-1 rtl:-right-auto rtl:-left-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-[#00A896] text-xs font-black uppercase tracking-wider border border-teal-200 dark:border-teal-800">
              {isAr ? '🔒 فضاء إعدادات آمن • حماية المعطيات الشخصية INPDP' : '🔒 Espace Paramètres Sécurisé • Protection INPDP'}
            </span>
          </div>

          {/* Heading & description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isAr ? 'تسجيل الدخول مطلوب' : 'Connexion Requise'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {isAr 
                ? 'الوصول إلى إعدادات الحساب وتعديل البيانات الشخصية مخصص حصرياً للمستخدمين الذين يملكون حساباً مفعلاً في المنصة.'
                : "L'accès aux paramètres de votre compte et à la modification de vos informations personnelles est strictement réservé aux utilisateurs disposant d'un compte actif."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00b4b6] to-[#0086cd] hover:from-[#009b9d] hover:to-[#0074b3] text-white font-extrabold text-sm shadow-md shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول إلى حسابي' : 'Se connecter à mon compte'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSignup}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? 'إنشاء حساب جديد' : 'Créer un compte'}</span>
            </button>
          </div>

          {/* Return to Home link */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{isAr ? 'العودة إلى الصفحة الرئيسية' : "Retour à l'accueil"}</span>
            </Link>
            <span className="flex items-center gap-1 font-medium">
              <span>{isAr ? '🛡️ مطابق للقانون التونسي لحماية المعطيات الشخصية عدد 63 لسنة 2004' : '🛡️ Conforme loi INPDP Tunisie n° 2004-63'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  const presetAvatarsList = getPresetAvatars(isAr);

  return (
    <div className="min-h-screen bg-[#edf7f9] dark:bg-[#071120] text-slate-800 dark:text-slate-100 py-6 sm:py-10 transition-colors duration-300" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Navigation Breadcrumb & Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/patient/dashboard"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-400 bg-white/80 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl shadow-xs border border-teal-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all hover:scale-102 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{isAr ? "العودة إلى فضائي الصحي" : "Retour à mon espace santé"}</span>
          </Link>

          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {isAr ? 'بيانات مشفرة ومعتمدة من INPDP' : 'Données chiffrées & certifiées INPDP'}
          </span>
        </div>

        {/* Page Title & Hero Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-900/5 border border-teal-100/70 dark:border-slate-800 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl -mr-20 rtl:-mr-0 rtl:-ml-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? "الفضاء الشخصي والأمان" : "Espace Personnel & Sécurité"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {isAr ? "إعدادات الحساب" : "Paramètres du Compte"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                {isAr 
                  ? "قم بتعديل معلوماتك الشخصية، صورتك وتأمين الوصول إلى ملفك الطبي على منصة صحتنا." 
                  : "Modifiez vos informations personnelles, votre photo de profil et sécurisez l'accès à votre dossier médical SahaTN."}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {user?.role === 'SUPER_ADMIN' 
                  ? (isAr ? 'حساب مشرف عام' : 'Compte Super Admin') 
                  : (isAr ? 'حساب مريض موثق' : 'Compte Patient Vérifié')}
              </span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Photo de Profil & Informations Rapides (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card: Avatar & Upload */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-teal-900/5 border border-teal-100/70 dark:border-slate-800 text-center">
              <h2 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-xs">
                {isAr ? "الصورة الشخصية" : "Photo de Profil"}
              </h2>

              {/* Avatar Preview */}
              <div 
                className="relative inline-block mx-auto mb-4 group cursor-pointer"
                title={isAr ? "الصورة الشخصية" : "Photo de profil"}
              >
                {formData.avatar ? (
                  <img
                    src={resolveAvatar(formData.avatar)}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80'; }}
                    alt={formData.name || (isAr ? 'الملف الشخصي' : 'Profil')}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl ring-4 ring-teal-500/20 group-hover:ring-teal-400 group-hover:scale-102 transition-all"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-teal-500 to-[#00A896] text-white flex items-center justify-center text-4xl font-black shadow-xl border-4 border-white dark:border-slate-800 ring-4 ring-teal-500/20">
                    {getInitials(formData.name)}
                  </div>
                )}

                {/* Edit overlay on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer gap-1"
                  title={isAr ? "تغيير الصورة" : "Changer la photo"}
                >
                  <Camera className="w-6 h-6" />
                  <span>{isAr ? "تغيير" : "Changer"}</span>
                </button>

                <span className="absolute bottom-1 right-1 rtl:right-auto rtl:left-1 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                  ✓
                </span>
              </div>

              {/* Upload Controls */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#00A896] hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAr ? "تحميل صورة من جهازي" : "Importer depuis mon appareil"}</span>
                </button>

                {formData.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 py-1.5 transition-colors cursor-pointer font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAr ? "حذف الصورة" : "Supprimer la photo"}</span>
                  </button>
                )}
              </div>

              {/* Preset Avatars */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-left rtl:text-right">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                  {isAr ? "أو اختر صورة من المعرض :" : "Ou choisir un avatar de la galerie :"}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {presetAvatarsList.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectPreset(av.url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        formData.avatar === av.url
                          ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105'
                          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-80 hover:opacity-100'
                      }`}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick Meta Info Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl shadow-teal-900/5 border border-teal-100/70 dark:border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <span>{isAr ? "نوع الحساب :" : "Rôle du compte :"}</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {user?.role === 'SUPER_ADMIN' ? (isAr ? 'مشرف عام' : 'Super Admin') : (isAr ? 'مريض (مستخدم)' : 'Patient / Simple')}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <span>{isAr ? "المعرّف بالنظام :" : "Identifiant système :"}</span>
                <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400">{user?.uuid || user?.id || 'usr-patient'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{isAr ? "حالة الأمان :" : "Statut sécurité :"}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {isAr ? "مفعل ومؤمّن" : "Actif (AES-256)"}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Informations & Paramètres (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Card 1: Coordonnées & Données Personnelles */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-900/5 border border-teal-100/70 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <User className="w-5 h-5 text-teal-600" />
                <span>{isAr ? "المعلومات الشخصية" : "Informations Personnelles"}</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "الاسم واللقب" : "Nom & Prénom"} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={isAr ? "فاطمة بن علي" : "Fatma Benali"}
                      className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email (Readonly with Verified badge) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{isAr ? "البريد الإلكتروني" : "Adresse Email"}</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      {isAr ? "موثق ✓" : "Vérifié ✓"}
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                    <input
                      type="email"
                      readOnly
                      value={formData.email}
                      className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAr ? "البريد الإلكتروني مرتبط بملفاتك الصحية المؤمنة وفق معايير INPDP." : "L'adresse email est liée à vos dossiers INPDP sécurisés."}
                  </p>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "رقم الهاتف" : "Numéro de Téléphone"} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                    <TunisianPhoneInput
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+216 20 999 123"
                      className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Gouvernorat / Ville */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "الولاية / المدينة" : "Gouvernorat / Ville"}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                    <select
                      value={formData.city === 'La Manouba' ? 'Manouba' : formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all cursor-pointer"
                    >
                      {TUNISIAN_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>
                          {isAr ? (GOVERNORATES_AR[gov] || gov) : gov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "تاريخ الولادة" : "Date de Naissance"}
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                      className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "الجنس" : "Genre"}
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">{isAr ? "بدون تحديد / غير محدد" : "Sans genre / Non spécifié"}</option>
                    <option value="F">{isAr ? "أنثى" : "Femme"}</option>
                    <option value="M">{isAr ? "ذكر" : "Homme"}</option>
                  </select>
                </div>

                {/* Adresse complète */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "عنوان الإقامة" : "Adresse de Résidence"}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={isAr ? "الشارع، العمارة، الشقة، الرمز البريدي..." : "Numéro, rue, appartement, code postal..."}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>

              </div>
            </div>

            {/* Card 2: Sécurité & Mot de Passe */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-900/5 border border-teal-100/70 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? "أمان كلمة المرور" : "Sécurité du Mot de Passe"}</span>
                </h2>

                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-teal-200/50"
                >
                  {showPasswordSection 
                    ? (isAr ? 'إخفاء' : 'Masquer') 
                    : (isAr ? 'تعديل كلمة المرور' : 'Modifier le mot de passe')}
                </button>
              </div>

              {showPasswordSection ? (
                <div className="mt-5 space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? "كلمة المرور الحالية" : "Mot de passe actuel"}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5" />
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isAr ? "كلمة المرور الجديدة" : "Nouveau mot de passe"}
                      </label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder={isAr ? "6 أحرف على الأقل" : "Au moins 6 caractères"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirmer le nouveau mot de passe"}
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder={isAr ? "أعد إدخال كلمة المرور" : "Confirmez le mot de passe"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                  {isAr 
                    ? "كلمة المرور الخاصة بك مشفرة بتقنية bcrypt التشفيرية المعتمدة بنكياً ومطابقة لمعايير الهيئة الوطنية لحماية المعطيات الشخصية INPDP." 
                    : "Votre mot de passe est chiffré par hachage cryptographique bcrypt (norme bancaire et INPDP)."}
                </p>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/patient/dashboard')}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {isAr ? "إلغاء" : "Annuler"}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#00A896] hover:bg-teal-700 text-white font-black text-sm px-7 py-3 rounded-2xl shadow-lg shadow-teal-700/20 hover:shadow-xl transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{isAr ? "جاري الحفظ..." : "Enregistrement..."}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isAr ? "حفظ التعديلات" : "Enregistrer les modifications"}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>

      </div>
      
      {/* ════════ FLOATING TOAST NOTIFICATION (BOTTOM-RIGHT) ════════ */}
      {successMsg && (
        <ToastNotification
          type="success"
          title={isAr ? "تم الحفظ بنجاح" : "Enregistrement Réussi"}
          message={successMsg}
          duration={4500}
          onClose={() => setSuccessMsg('')}
        />
      )}

      {errorMsg && (
        <ToastNotification
          type="error"
          title={isAr ? "تنبيه / خطأ" : "Attention / Erreur"}
          message={errorMsg}
          duration={5000}
          onClose={() => setErrorMsg('')}
        />
      )}
    </div>
  );
}
