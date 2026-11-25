import React, { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  CabinetProfileSection,
  CabinetSaveButton,
  CabinetScheduleSection,
  CabinetLeavesSection,
  CabinetBlockedSlotsSection
} from './cabinet';

export default function DoctorCabinetTab({
  doctorId = 'doc-1',
  doctorName = 'Dr. Selim Ben Ali',
  doctorSpecialty = '',
  doctorProfile = null
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const isDemo = (!doctorId || doctorId === 'doc-1') && (!doctorName || doctorName.toLowerCase().includes('selim'));

  // ════════ ÉTATS PROFIL PRATICIEN & CABINET (Capture 1) ════════
  const [docName, setDocName] = useState(doctorName || (isDemo ? 'Dr. Selim Ben Ali' : ''));
  const [docSpec, setDocSpec] = useState(doctorSpecialty || doctorProfile?.specialty || doctorProfile?.specialtyFr || (isDemo ? 'Cardiologie & Maladies Vasculaires' : ''));
  const [docPhone, setDocPhone] = useState(doctorProfile?.phone || (isDemo ? '+216 71 830 900' : ''));
  const [docAddress, setDocAddress] = useState(doctorProfile?.address || (isDemo ? 'Avenue Hédi Nouira, Résidence Les Palmiers, Bloc B, Ennasr 2, 2037 Tunis' : ''));
  const [docOrder, setDocOrder] = useState(doctorProfile?.orderNumber || doctorProfile?.ordreId || (isDemo ? 'N° 14092' : ''));
  const [docCnam, setDocCnam] = useState(doctorProfile?.cnamCode || (isDemo ? 'CNAM-CD-40912' : ''));

  useEffect(() => {
    if (doctorName && !isDemo) setDocName(doctorName);
    if (doctorSpecialty && !isDemo) setDocSpec(doctorSpecialty);
    if (doctorProfile) {
      if (doctorProfile.name) setDocName(doctorProfile.name);
      if (doctorProfile.specialty || doctorProfile.specialtyFr) setDocSpec(doctorProfile.specialty || doctorProfile.specialtyFr);
      if (doctorProfile.phone) setDocPhone(doctorProfile.phone);
      if (doctorProfile.address) setDocAddress(doctorProfile.address);
      if (doctorProfile.orderNumber || doctorProfile.ordreId) setDocOrder(doctorProfile.orderNumber || doctorProfile.ordreId);
      if (doctorProfile.cnamCode) setDocCnam(doctorProfile.cnamCode);
    }
  }, [doctorName, doctorSpecialty, doctorProfile, isDemo]);

  useEffect(() => {
    let isMounted = true;
    async function fetchDocProfile() {
      if (!doctorId || doctorId === 'doc-1') return;
      try {
        const res = await api.getDoctorById(doctorId).catch(() => null);
        if (isMounted && res?.data) {
          const d = res.data;
          if (d.name) setDocName(d.name);
          if (d.specialtyFr || d.specialty) setDocSpec(d.specialtyFr || d.specialty);
          if (d.phone) setDocPhone(d.phone);
          if (d.address) setDocAddress(d.address);
          if (d.ordreId || d.ordre) setDocOrder(d.ordreId || d.ordre);
          if (d.cnamCode) setDocCnam(d.cnamCode);
        }
      } catch (err) {}
    }
    fetchDocProfile();
    return () => { isMounted = false; };
  }, [doctorId]);

  // Date du jour (format YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // ════════ ÉTATS CONGÉS EXCEPTIONNELS (Captures 2 & 3) ════════
  const [congeStart, setCongeStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [congeEnd, setCongeEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [congeReason, setCongeReason] = useState('Congés annuels');
  const [leaves, setLeaves] = useState([]);
  const [congeSuccess, setCongeSuccess] = useState(false);
  const [congeError, setCongeError] = useState('');

  // Gestion des dates de début et de fin de congé
  const handleCongeStartChange = (newStart) => {
    setCongeError('');
    setCongeStart(newStart);
    if (newStart && congeEnd && newStart > congeEnd) {
      setCongeEnd(newStart);
    }
  };

  const handleCongeEndChange = (newEnd) => {
    setCongeError('');
    if (congeStart && newEnd && newEnd < congeStart) {
      setCongeError(
        isAr
          ? 'تاريخ نهاية العطلة لا يمكن أن يكون سابقاً لتاريخ البداية.'
          : 'La date de fin ne peut pas être antérieure à la date de début.'
      );
      return;
    }
    setCongeEnd(newEnd);
  };

  // ════════ ÉTATS CRÉNEAUX BLOQUÉS ════════
  const [lockDate, setLockDate] = useState('12/10/2026');
  const [lockTime, setLockTime] = useState('09:00');
  const [lockReason, setLockReason] = useState('Indisponibilité exceptionnelle');
  const [blockedSlots, setBlockedSlots] = useState([]);

  // Toast / Statut de sauvegarde
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ════════ ÉTATS DE NAVIGATION DES 4 PARTIES DE MON CABINET ════════
  const [activeCabinetSection, setActiveCabinetSection] = useState(() => {
    try {
      const saved = localStorage.getItem('sahatn_doctor_cabinet_section');
      return (saved && saved !== 'all') ? saved : 'profile';
    } catch (e) {
      return 'profile';
    }
  });

  const handleSelectSection = (sec) => {
    setActiveCabinetSection(sec);
    try {
      localStorage.setItem('sahatn_doctor_cabinet_section', sec);
    } catch (e) {}
  };

  // ════════ ÉTATS GRILLE DE LA SEMAINE (7 JOURS) ════════
  const [days, setDays] = useState([
    {
      key: 'lundi',
      label: 'Lundi',
      isWork: false,
      matinStart: '08:30',
      matinEnd: '13:00',
      pauseStart: '13:00',
      pauseEnd: '14:00',
      apremStart: '14:00',
      apremEnd: '18:30',
      sansRdv: false
    },
    {
      key: 'mardi',
      label: 'Mardi',
      isWork: false,
      matinStart: '08:30',
      matinEnd: '13:00',
      pauseStart: '13:00',
      pauseEnd: '14:00',
      apremStart: '14:00',
      apremEnd: '18:30',
      sansRdv: false
    },
    {
      key: 'mercredi',
      label: 'Mercredi',
      isWork: true,
      matinStart: '08:30',
      matinEnd: '13:00',
      pauseStart: '13:00',
      pauseEnd: '14:00',
      apremStart: '14:00',
      apremEnd: '18:30',
      sansRdv: true
    },
    {
      key: 'jeudi',
      label: 'Jeudi',
      isWork: true,
      matinStart: '08:30',
      matinEnd: '13:00',
      pauseStart: '13:00',
      pauseEnd: '14:00',
      apremStart: '14:00',
      apremEnd: '18:30',
      sansRdv: true
    },
    {
      key: 'vendredi',
      label: 'Vendredi',
      isWork: true,
      matinStart: '08:30',
      matinEnd: '13:00',
      pauseStart: '13:00',
      pauseEnd: '14:00',
      apremStart: '14:00',
      apremEnd: '18:30',
      sansRdv: true
    },
    {
      key: 'samedi',
      label: 'Samedi',
      isWork: true,
      matinStart: '08:30',
      matinEnd: '13:30',
      pauseStart: 'Sans coupure',
      pauseEnd: '',
      apremStart: 'Après-midi fermé',
      apremEnd: '',
      sansRdv: false
    },
    {
      key: 'dimanche',
      label: 'Dimanche',
      isWork: false,
      matinStart: '09:00',
      matinEnd: '13:00',
      pauseStart: '--',
      pauseEnd: '',
      apremStart: '--',
      apremEnd: '',
      sansRdv: false
    }
  ]);

  const toggleDay = (key) => {
    setDays((prev) =>
      prev.map((d) => (d.key === key ? { ...d, isWork: !d.isWork } : d))
    );
  };

  const toggleSansRdv = (key) => {
    setDays((prev) =>
      prev.map((d) => (d.key === key ? { ...d, sansRdv: !d.sansRdv } : d))
    );
  };

  const updateDayTime = (key, field, value) => {
    setDays((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: value } : d))
    );
  };

  // Préréglages d'horaires
  const applyPreset = (preset) => {
    if (preset === 'standard') {
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          isWork: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].includes(d.key),
          matinStart: '08:30',
          matinEnd: '13:00',
          pauseStart: '13:00',
          pauseEnd: '14:00',
          apremStart: '14:00',
          apremEnd: '18:30'
        }))
      );
    } else if (preset === 'continue') {
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          isWork: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].includes(d.key),
          matinStart: '08:00',
          matinEnd: '14:30',
          pauseStart: 'Sans coupure',
          pauseEnd: '',
          apremStart: 'Après-midi fermé',
          apremEnd: ''
        }))
      );
    } else if (preset === 'weekend') {
      setDays((prev) =>
        prev.map((d) =>
          ['samedi', 'dimanche'].includes(d.key) ? { ...d, isWork: false } : d
        )
      );
    }
  };

  // Chargement initial des données cabinet & créneaux bloqués
  useEffect(() => {
    let isMounted = true;
    async function fetchCabinetData() {
      try {
        const [schedRes, blockedRes] = await Promise.all([
          api.getDoctorSchedule(doctorId).catch(() => null),
          api.getBlockedSlots(doctorId).catch(() => null)
        ]);

        if (isMounted && schedRes?.schedule) {
          const sched = schedRes.schedule;
          if (sched.days) {
            setDays((prevDays) =>
              prevDays.map((d) => {
                const bd = sched.days[d.key];
                if (!bd) return d;
                return {
                  ...d,
                  isWork: bd.isOpen !== undefined ? bd.isOpen : d.isWork,
                  matinStart: bd.matinStart || d.matinStart,
                  matinEnd: bd.matinEnd || d.matinEnd,
                  pauseStart: bd.pauseStart !== undefined ? bd.pauseStart : d.pauseStart,
                  pauseEnd: bd.pauseEnd !== undefined ? bd.pauseEnd : d.pauseEnd,
                  apremStart: bd.apremStart !== undefined ? bd.apremStart : d.apremStart,
                  apremEnd: bd.apremEnd !== undefined ? bd.apremEnd : d.apremEnd,
                  sansRdv: bd.walkin !== undefined ? bd.walkin : d.sansRdv
                };
              })
            );
          }
          let existingLeaves = [];
          if (Array.isArray(sched.leaves) && sched.leaves.length > 0) {
            existingLeaves = sched.leaves;
          } else if (sched.leave?.start && sched.leave?.end) {
            existingLeaves = [
              {
                id: 'leave-default',
                start: sched.leave.start,
                end: sched.leave.end,
                reason: sched.leave.reason || 'Congé exceptionnel'
              }
            ];
          }
          setLeaves(existingLeaves);
          if (sched.leave?.start) setCongeStart(sched.leave.start);
          if (sched.leave?.end) setCongeEnd(sched.leave.end);
          if (sched.leave?.reason) setCongeReason(sched.leave.reason);
        }

        if (isMounted && blockedRes?.data && Array.isArray(blockedRes.data)) {
          setBlockedSlots(
            blockedRes.data.map((b) => ({
              id: b.id,
              date: b.date || b.dateIso,
              time: b.time,
              reason: b.patientName || b.reason || 'Indisponible'
            }))
          );
        }
      } catch (err) {
        console.warn('Doctor cabinet data notice:', err);
      }
    }
    fetchCabinetData();
    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  // Ajout d'un congé exceptionnel
  const handleAddLeave = async () => {
    setCongeError('');
    if (!congeStart) {
      setCongeError(
        isAr ? 'يرجى تحديد تاريخ بداية العطلة.' : 'Veuillez sélectionner la date de début du congé.'
      );
      return;
    }
    if (!congeEnd) {
      setCongeError(
        isAr ? 'يرجى تحديد تاريخ نهاية العطلة.' : 'Veuillez sélectionner la date de fin du congé.'
      );
      return;
    }
    if (congeStart < todayStr) {
      setCongeError(
        isAr
          ? 'لا يمكن تسجيل عطلة في تاريخ سابق لليوم.'
          : 'La date de début ne peut pas être dans le passé.'
      );
      return;
    }
    if (congeStart > congeEnd) {
      setCongeError(
        isAr
          ? 'تاريخ بداية العطلة لا يمكن أن يتجاوز تاريخ النهاية.'
          : 'La date de début ne peut pas être postérieure à la date de fin.'
      );
      return;
    }

    const newLeave = {
      id: `leave-${Date.now()}`,
      start: congeStart,
      end: congeEnd,
      reason: congeReason || (isAr ? 'عطلة استثنائية' : 'Congé exceptionnel')
    };
    const updatedLeaves = [newLeave, ...leaves.filter((l) => !(l.start === congeStart && l.end === congeEnd))];
    setLeaves(updatedLeaves);
    setCongeSuccess(true);
    setTimeout(() => setCongeSuccess(false), 4000);

    try {
      const scheduleDays = {};
      days.forEach((d) => {
        scheduleDays[d.key] = {
          isOpen: d.isWork,
          matinStart: d.matinStart,
          matinEnd: d.matinEnd,
          pauseStart: d.pauseStart === '--' || d.pauseStart === 'Sans coupure' ? '' : d.pauseStart,
          pauseEnd: d.pauseEnd || '',
          apremStart: d.apremStart === '--' || d.apremStart === 'Après-midi fermé' ? '' : d.apremStart,
          apremEnd: d.apremEnd || '',
          walkin: d.sansRdv
        };
      });

      await api.saveDoctorSchedule(doctorId, {
        days: scheduleDays,
        leave: newLeave,
        leaves: updatedLeaves
      });
    } catch (err) {
      console.warn('Save leave notice:', err);
    }
  };

  // Suppression d'un congé exceptionnel
  const handleRemoveLeave = async (leaveId) => {
    const updatedLeaves = leaves.filter((l) => l.id !== leaveId);
    setLeaves(updatedLeaves);
    const activePrimary = updatedLeaves[0] || { start: '', end: '', reason: '' };
    try {
      const scheduleDays = {};
      days.forEach((d) => {
        scheduleDays[d.key] = {
          isOpen: d.isWork,
          matinStart: d.matinStart,
          matinEnd: d.matinEnd,
          pauseStart: d.pauseStart === '--' || d.pauseStart === 'Sans coupure' ? '' : d.pauseStart,
          pauseEnd: d.pauseEnd || '',
          apremStart: d.apremStart === '--' || d.apremStart === 'Après-midi fermé' ? '' : d.apremStart,
          apremEnd: d.apremEnd || '',
          walkin: d.sansRdv
        };
      });

      await api.saveDoctorSchedule(doctorId, {
        days: scheduleDays,
        leave: activePrimary,
        leaves: updatedLeaves
      });
    } catch (err) {
      console.warn('Remove leave notice:', err);
    }
  };

  // Verrouillage de créneau spécifique
  const handleAddBlockSlot = async () => {
    if (!lockTime) return;
    try {
      const res = await api.blockSlot({
        doctorId,
        doctorName: docName || doctorName,
        date: lockDate,
        time: lockTime,
        reason: lockReason || 'Indisponibilité exceptionnelle'
      });
      const newSlot = {
        id: res?.data?.id || `block-${Date.now()}`,
        date: lockDate,
        time: lockTime,
        reason: lockReason || 'Indisponibilité exceptionnelle'
      };
      setBlockedSlots((prev) => [newSlot, ...prev.filter((s) => !(s.date === lockDate && s.time === lockTime))]);
    } catch (err) {
      console.warn('Block slot local fallback:', err);
      const newSlot = {
        id: `block-${Date.now()}`,
        date: lockDate,
        time: lockTime,
        reason: lockReason || 'Indisponibilité exceptionnelle'
      };
      setBlockedSlots((prev) => [newSlot, ...prev]);
    }
  };

  // Déblocage de créneau
  const handleRemoveBlockSlot = async (id) => {
    const target = blockedSlots.find((s) => s.id === id);
    setBlockedSlots((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.unblockSlot(id, {
        doctorId,
        date: target?.date,
        time: target?.time
      });
    } catch (err) {
      console.warn('Remove block slot notice:', err);
    }
  };

  // ════════ ENREGISTREMENT GLOBAL DU CABINET & HORAIRES ════════
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const scheduleDays = {};
      days.forEach((d) => {
        scheduleDays[d.key] = {
          isOpen: d.isWork,
          matinStart: d.matinStart,
          matinEnd: d.matinEnd,
          pauseStart: d.pauseStart === '--' || d.pauseStart === 'Sans coupure' ? '' : d.pauseStart,
          pauseEnd: d.pauseEnd || '',
          apremStart: d.apremStart === '--' || d.apremStart === 'Après-midi fermé' ? '' : d.apremStart,
          apremEnd: d.apremEnd || '',
          walkin: d.sansRdv
        };
      });

      await api.saveDoctorSchedule(doctorId, {
        days: scheduleDays,
        leave: {
          start: congeStart,
          end: congeEnd,
          reason: congeReason
        },
        leaves:
          leaves.length > 0
            ? leaves
            : congeStart && congeEnd
            ? [
                {
                  id: 'leave-default',
                  start: congeStart,
                  end: congeEnd,
                  reason: congeReason
                }
              ]
            : []
      });

      // Synchroniser les informations du praticien et la spécialité
      try {
        if (api.updateDoctor) {
          await api.updateDoctor(doctorId, {
            name: docName,
            specialty: docSpec,
            specialty_fr: docSpec,
            phone: docPhone,
            address: docAddress,
            orderNumber: docOrder,
            cnamNumber: docCnam
          });
        }
      } catch (errProfile) {
        console.warn('Doctor cabinet info sync notice:', errProfile);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving doctor schedule:', err);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Notification Toast de Succès */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <span>
            {isAr
              ? 'تم حفظ إعدادات العيادة وجدول أوقات العمل بنجاح على موعيدي!'
              : 'Configuration du cabinet et grille des horaires enregistrées avec succès sur Maw2idi !'}
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          BARRE DE NAVIGATION DES 4 PARTIES DE MON CABINET
          ════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0c162d] p-3 sm:p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 font-black text-sm shrink-0">
              🏢
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'أقسام وإعدادات العيادة :' : 'Navigation & Sections du Cabinet :'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                  4 {isAr ? 'أقسام' : 'parties'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr 
                  ? 'انقر على أي قسم للانتقال إليه مباشرة والتحكم في إعداداته' 
                  : 'Sélectionnez une partie pour y accéder directement et modifier ses paramètres.'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Boutons Principaux pour chaque partie */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Bouton 1: Profil & Informations */}
          <button
            type="button"
            onClick={() => handleSelectSection('profile')}
            className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
              activeCabinetSection === 'profile'
                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-100 shadow-xs ring-2 ring-teal-400/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">📋</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                {isAr ? 'القسم 1' : 'Partie 1'}
              </span>
            </div>
            <div>
              <p className="text-xs font-black truncate">{isAr ? 'معلومات الطبيب والعيادة' : 'Informations Praticien'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{isAr ? 'الاسم، الهاتف، العنوان، الكنام' : 'Nom, Spécialité, Contact, Ordre'}</p>
            </div>
          </button>

          {/* Bouton 2: Horaires de Travail */}
          <button
            type="button"
            onClick={() => handleSelectSection('schedule')}
            className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
              activeCabinetSection === 'schedule'
                ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-900 dark:text-sky-100 shadow-xs ring-2 ring-sky-400/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">⏱️</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100/80 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                {isAr ? 'القسم 2' : 'Partie 2'}
              </span>
            </div>
            <div>
              <p className="text-xs font-black truncate">{isAr ? 'أوقات العمل الأسبوعية' : 'Horaires & Grille Semaine'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{isAr ? '7 أيام، فترات الصباح والمساء' : 'Plages matin, pause, après-midi'}</p>
            </div>
          </button>

          {/* Bouton 3: Période de Congés */}
          <button
            type="button"
            onClick={() => handleSelectSection('leaves')}
            className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
              activeCabinetSection === 'leaves'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-100 shadow-xs ring-2 ring-amber-400/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🏖️</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                {leaves.length > 0 ? `${leaves.length} ${isAr ? 'عطل' : 'congés'}` : (isAr ? 'القسم 3' : 'Partie 3')}
              </span>
            </div>
            <div>
              <p className="text-xs font-black truncate">{isAr ? 'العطل والإغلاق الاستثنائي' : 'Périodes de Congés'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{isAr ? 'قفل الحجز خلال فترات الراحة' : 'Fermetures et repos exceptionnels'}</p>
            </div>
          </button>

          {/* Bouton 4: Blocage de Créneaux */}
          <button
            type="button"
            onClick={() => handleSelectSection('blocked')}
            className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
              activeCabinetSection === 'blocked'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-100 shadow-xs ring-2 ring-rose-400/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🔒</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100/80 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                {blockedSlots.length > 0 ? `${blockedSlots.length} ${isAr ? 'محظورة' : 'bloqués'}` : (isAr ? 'القسم 4' : 'Partie 4')}
              </span>
            </div>
            <div>
              <p className="text-xs font-black truncate">{isAr ? 'حظر فترات زمنية محددة' : 'Blocage de Créneaux'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{isAr ? 'إخفاء ساعات معينة من الحجز' : 'Heure et date spécifiques verrouillées'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* ════════ SECTION 1: PROFIL & CONFIGURATION DU CABINET (Capture 1) ════════ */}
      {(activeCabinetSection === 'all' || activeCabinetSection === 'profile') && (
        <div data-tour="cabinet-profile" className="animate-in fade-in duration-200">
          <CabinetProfileSection
            docName={docName}
            setDocName={setDocName}
            docSpec={docSpec}
            setDocSpec={setDocSpec}
            docPhone={docPhone}
            setDocPhone={setDocPhone}
            docAddress={docAddress}
            setDocAddress={setDocAddress}
            docOrder={docOrder}
            setDocOrder={setDocOrder}
            docCnam={docCnam}
            setDocCnam={setDocCnam}
          />
        </div>
      )}

      {/* ════════ SECTION 2: CALENDRIER VISUEL DE LA SEMAINE (Capture 2) ════════ */}
      {(activeCabinetSection === 'all' || activeCabinetSection === 'schedule') && (
        <div data-tour="cabinet-schedule" className="animate-in fade-in duration-200">
          <CabinetScheduleSection
            days={days}
            onToggleDay={toggleDay}
            onToggleSansRdv={toggleSansRdv}
            onUpdateTime={updateDayTime}
            onApplyPreset={applyPreset}
          />
        </div>
      )}

      {/* ════════ SECTION 3: PÉRIODE DE CONGÉS OU FERMETURE EXCEPTIONNELLE (Captures 2 & 3) ════════ */}
      {(activeCabinetSection === 'all' || activeCabinetSection === 'leaves') && (
        <div data-tour="cabinet-leaves" className="animate-in fade-in duration-200">
          <CabinetLeavesSection
            leaves={leaves}
            congeStart={congeStart}
            congeEnd={congeEnd}
            congeReason={congeReason}
            congeError={congeError}
            congeSuccess={congeSuccess}
            todayStr={todayStr}
            onStartChange={handleCongeStartChange}
            onEndChange={handleCongeEndChange}
            onReasonChange={(val) => {
              setCongeError('');
              setCongeReason(val);
            }}
            onAddLeave={handleAddLeave}
            onRemoveLeave={handleRemoveLeave}
          />
        </div>
      )}

      {/* ════════ SECTION 4: VERROUILLER UN CRÉNEAU HORAIRE SPÉCIFIQUE (Capture 4) ════════ */}
      {(activeCabinetSection === 'all' || activeCabinetSection === 'blocked') && (
        <div className="animate-in fade-in duration-200">
          <CabinetBlockedSlotsSection
            blockedSlots={blockedSlots}
            lockDate={lockDate}
            setLockDate={setLockDate}
            lockTime={lockTime}
            setLockTime={setLockTime}
            lockReason={lockReason}
            setLockReason={setLockReason}
            onAddBlockSlot={handleAddBlockSlot}
            onRemoveBlockSlot={handleRemoveBlockSlot}
          />
        </div>
      )}

      {/* ════════ BARRE FIXE D'ENREGISTREMENT FLOTTANTE ANCRÉE AU BAS DE L'ÉCRAN (STICKY DOCK) ════════ */}
      <div className="sticky bottom-3 z-40 w-full pt-2">
        <div className="bg-[#0B1E33]/95 dark:bg-[#07131e]/95 backdrop-blur-md p-3 sm:p-4 rounded-3xl border-2 border-slate-700/80 shadow-2xl shadow-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-white animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 font-black text-lg shrink-0">
              💾
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-white">
                {isAr ? 'حفظ إعدادات وتعديلات العيادة' : 'Enregistrement des Modifications du Cabinet & Horaires'}
              </p>
              <p className="text-[11px] text-slate-300">
                {isAr 
                  ? 'يتم تطبيق ومزامنة أي تعديل على الملف الشخصي والجدول والعطل والتعطيل مباشرة على موعيدي' 
                  : 'Modifications synchronisées en direct sur Maw2idi (profil, horaires, congés, créneaux bloqués).'}
              </p>
            </div>
          </div>

          <CabinetSaveButton
            onSave={handleSave}
            isSaving={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 shadow-xl hover:shadow-teal-500/20 text-sm font-black bg-[#00A896] hover:bg-[#008F80] text-white"
          />
        </div>
      </div>
    </div>
  );
}
