import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Save, LogOut, Phone, MapPin, DollarSign, Shield, Video, Check, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { resolveDoctorName, resolveDoctorSpecialty } from '../../utils/i18nHelper';

function resolveAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') return '/images/doctor_selim.jpg';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

export default function MobileDoctorProfileSheet({
  isOpen,
  onClose,
  doctorId = 'doc-1',
  onDoctorUpdated,
  onOpenAdvanced,
  onLogout
}) {
  const { user, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: user?.name || 'Dr. Praticien',
    specialty: user?.specialty || 'Médecine Générale',
    avatar: user?.avatar || '/images/doctor_selim.jpg',
    phone: '',
    city: 'Tunis',
    address: '',
    fee: '70',
    cnam: true,
    telehealth: true
  });

  useEffect(() => {
    if (!isOpen || !doctorId) return;
    let active = true;
    setLoading(true);
    setError('');
    api.getDoctorById(doctorId)
      .then((res) => {
        if (!active || !res?.data) return;
        const d = res.data;
        setForm({
          name: d.name || user?.name || '',
          specialty: d.specialtyFr || d.specialty || '',
          avatar: d.avatar || user?.avatar || '/images/doctor_selim.jpg',
          phone: d.phone || '',
          city: d.city || 'Tunis',
          address: d.address || '',
          fee: String(d.fee || 70).replace(/[^\d]/g, '') || '70',
          cnam: d.cnam !== false,
          telehealth: d.telehealth !== false
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isOpen, doctorId, user?.name, user?.avatar]);

  if (!isOpen) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, avatar: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        fee: Number(form.fee) || 70,
        cnam: form.cnam,
        telehealth: form.telehealth,
        avatar: form.avatar
      };
      const res = await api.updateDoctor(doctorId, payload);
      if (updateProfile && user) {
        updateProfile({ name: payload.name, avatar: payload.avatar }).catch(() => {});
      }
      if (onDoctorUpdated) {
        onDoctorUpdated(res?.data || payload);
      }
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        onClose();
      }, 650);
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر حفظ التغييرات' : 'Impossible de sauvegarder'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/55"
      onClick={onClose}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0c162d] rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col overflow-hidden gpu-sheet"
      >
        {/* Drag Handle + Header */}
        <div className="pt-2.5 pb-3 px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {isAr ? 'الملف الشخصي للطبيب' : 'Mon Profil Praticien'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-95"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Simple Form */}
        <form onSubmit={handleSave} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Avatar + Identity */}
          <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="relative shrink-0">
              <img
                src={resolveAvatar(form.avatar)}
                onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                alt={form.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-400"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00A896] text-white flex items-center justify-center shadow-md active:scale-95"
                title={isAr ? 'تغيير الصورة' : 'Changer la photo'}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                {resolveDoctorName(form.name, lang)}
              </div>
              <div className="text-xs font-bold text-[#00A896] truncate mt-0.5">
                {resolveDoctorSpecialty(form.specialty, lang)}
              </div>
              {loading && (
                <div className="text-[11px] text-slate-400 mt-1">
                  {isAr ? 'جاري التحميل...' : 'Chargement...'}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200">
              {error}
            </div>
          )}

          {/* Core Fields */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 text-[#00A896]" /> {isAr ? 'الهاتف' : 'Téléphone'}
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A896]"
                dir="ltr"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-[#00A896]" /> {isAr ? 'التعريفة (د.ت)' : 'Tarif (TND)'}
              </span>
              <input
                type="number"
                min="20"
                max="300"
                value={form.fee}
                onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A896]"
                dir="ltr"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 text-[#00A896]" /> {isAr ? 'عنوان العيادة' : 'Adresse du cabinet'}
            </span>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A896]"
            />
          </label>

          {/* Simple Toggles */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, cnam: !p.cnam }))}
              className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-between transition-colors ${
                form.cnam
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> CNAM
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${form.cnam ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </button>

            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, telehealth: !p.telehealth }))}
              className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-between transition-colors ${
                form.telehealth
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 text-sky-700 dark:text-sky-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> {isAr ? 'عن بعد' : 'Vidéo'}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${form.telehealth ? 'bg-sky-500' : 'bg-slate-300'}`} />
            </button>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-[#00A896] hover:bg-[#008F80] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {savedToast ? (
              <>
                <Check className="w-4 h-4" />
                <span>{isAr ? 'تم الحفظ بنجاح' : 'Enregistré'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? (isAr ? 'جاري الحفظ...' : 'Enregistrement...') : (isAr ? 'حفظ التغييرات' : 'Enregistrer')}</span>
              </>
            )}
          </button>

          {/* Secondary Actions: Advanced Profile & Logout */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            {onOpenAdvanced && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdvanced();
                }}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 py-2"
              >
                <span>{isAr ? 'تعديل متقدم (الشهادات، الخريطة)' : 'Édition complète (CV, carte)'}</span>
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="text-xs font-extrabold text-rose-600 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? 'خروج' : 'Déconnexion'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
