import QRCode from 'qrcode';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Heart, FileText, Users, Clock, AlertCircle, RefreshCw, X,
  Check, MapPin, QrCode, Video, Plus, Shield, Printer, ExternalLink,
  Edit3, Trash2, Phone, Settings,
  Lock, LogIn, UserPlus, ArrowLeft,
  Bell, History, CheckCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';
import {
  getNotificationTitle,
  getNotificationMessage,
  formatExactNotificationTime,
  getExactNotificationFull
} from '../locales/notificationTranslator';

// Helper to robustly parse appointment date and time into a precise Date object
const parseAppointmentToDateTime = (apt) => {
  if (!apt) return null;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  const rawDate = String(apt.dateIso || apt.date || '').trim();
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-').map(Number);
      year = y;
      month = m - 1;
      day = d;
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(rawDate)) {
      const parts = rawDate.split(/[\/\-]/).map(Number);
      day = parts[0];
      month = parts[1] - 1;
      year = parts[2];
    } else {
      const lower = rawDate.toLowerCase();
      if (lower.includes('demain') || lower.includes('غدا')) {
        const tmr = new Date(now);
        tmr.setDate(tmr.getDate() + 1);
        year = tmr.getFullYear();
        month = tmr.getMonth();
        day = tmr.getDate();
      } else if (!lower.includes('aujourd') && !lower.includes('اليوم')) {
        const numMatch = rawDate.match(/(\d{1,2})/);
        if (numMatch) day = parseInt(numMatch[1], 10);
        const months = {
          'janv': 0, 'janvier': 0, 'جانفي': 0,
          'févr': 1, 'fevr': 1, 'février': 1, 'فيفري': 1,
          'mars': 2, 'مارس': 2,
          'avr': 3, 'avril': 3, 'أفريل': 3,
          'mai': 4, 'ماي': 4,
          'juin': 5, 'جوان': 5,
          'juil': 6, 'juillet': 6, 'جويلية': 6,
          'août': 7, 'aout': 7, 'أوت': 7,
          'sept': 8, 'septembre': 8, 'سبتمبر': 8,
          'oct': 9, 'octobre': 9, 'أكتوبر': 9,
          'nov': 10, 'novembre': 10, 'نوفمبر': 10,
          'déc': 11, 'dec': 11, 'décembre': 11, 'ديسمبر': 11
        };
        for (const [key, mIdx] of Object.entries(months)) {
          if (lower.includes(key)) {
            month = mIdx;
            break;
          }
        }
      }
    }
  }

  let hours = 23;
  let minutes = 59;
  const timeStr = String(apt.time || '').trim();
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2})[:hH](\d{2})?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
};

// Minimum hours required before an appointment for a patient to cancel online
const CANCELLATION_MIN_HOURS = 4;

// Check if an appointment is expired (scheduled in the past)
const isAppointmentExpired = (apt) => {
  if (!apt) return true;
  if (apt.isExpired || apt.status === 'COMPLETED' || apt.status === 'EXPIRED') return true;
  const dt = parseAppointmentToDateTime(apt);
  if (!dt) return false;
  return dt.getTime() < Date.now();
};

// Check if patient cancellation is allowed (>= 4 hours before appointment time)
const getCancellationEligibility = (apt) => {
  if (!apt) return { allowed: false, hoursRemaining: 0 };
  const dt = parseAppointmentToDateTime(apt);
  if (!dt) return { allowed: true, hoursRemaining: Infinity };
  const diffMs = dt.getTime() - Date.now();
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  return {
    allowed: hoursRemaining >= CANCELLATION_MIN_HOURS,
    hoursRemaining: Math.max(0, hoursRemaining)
  };
};

export default function PatientDashboardPage({ onOpenLogin, onOpenSignup }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    queue,
    delayMinutes,
    socket,
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    refreshNotifications
  } = useSocket();
  const { t, lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';

  // Filters for new Past Appointments and Notifications views
  const [pastAptFilter, setPastAptFilter] = useState('all'); // 'all', 'completed', 'cancelled', 'teleconsult'
  const [notifFilter, setNotifFilter] = useState('all'); // 'all', 'unread', 'rdv'

  // Real-time SMS & WhatsApp incoming message state
  const [incomingMsgAlert, setIncomingMsgAlert] = useState(null);
  const [msgAcknowledged, setMsgAcknowledged] = useState(false);

  // Persistent activeTab across page refresh/reload
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('sahatn_patient_tab') || 'rdv';
    } catch (e) {
      return 'rdv';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('sahatn_patient_tab', tab);
    } catch (e) { }
  };

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Demo mode disabled in production
  const demoMode = false;

  // Persistent appointment filter across page refresh (defaults to 'upcoming' so past appointments don't clutter the main view)
  const [aptFilter, setAptFilterState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('sahatn_apt_filter');
      if (!stored || stored === 'all') return 'upcoming';
      return stored;
    } catch (e) {
      return 'upcoming';
    }
  });

  const setAptFilter = (filter) => {
    setAptFilterState(filter);
    try {
      sessionStorage.setItem('sahatn_apt_filter', filter);
    } catch (e) { }
  };

  // Modals state
  const [selectedTicketApt, setSelectedTicketApt] = useState(null);
  // Scannable Appointment Ticket QR Code
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState('');

  useEffect(() => {
    if (!selectedTicketApt) return;
    const ticketText = window.location.origin + '/ticket/' + (selectedTicketApt.id || 'apt-101') + '?ref=' + (selectedTicketApt.ticketNumber || '04') + '&doc=' + encodeURIComponent(selectedTicketApt.doctorName || 'Dr. Selim Ben Ali');
    QRCode.toDataURL(ticketText, { width: 220, margin: 1, color: { dark: '#071A2B', light: '#FFFFFF' } })
      .then(url => setTicketQrDataUrl(url))
      .catch(() => {});
  }, [selectedTicketApt]);
  const [cancelModalApt, setCancelModalApt] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [editCarnetOpen, setEditCarnetOpen] = useState(false);
  const [addDependentOpen, setAddDependentOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (selectedTicketApt) setSelectedTicketApt(null);
        else if (cancelModalApt) setCancelModalApt(null);
        else if (editCarnetOpen) setEditCarnetOpen(false);
        else if (addDependentOpen) setAddDependentOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicketApt, cancelModalApt, editCarnetOpen, addDependentOpen]);

  // Real-Time SMS & WhatsApp incoming message listener via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handleIncomingComm = (comm) => {
      if (!comm || comm.direction !== 'OUTBOUND') return;
      // Match if sent to current patient or public broadcast
      const myPhone = user?.phone?.replace(/[^0-9]/g, '') || '';
      const recPhone = comm.recipientPhone?.replace(/[^0-9]/g, '') || '';
      const isForMe = !comm.patientId || (user && comm.patientId === user.uuid) || (myPhone && recPhone && (myPhone.includes(recPhone) || recPhone.includes(myPhone)));

      if (isForMe || comm.template === 'retard_cabinet') {
        setIncomingMsgAlert(comm);
        setMsgAcknowledged(false);
      }
    };

    socket.on('communication:received', handleIncomingComm);
    socket.on('communication:broadcast', handleIncomingComm);

    return () => {
      socket.off('communication:received', handleIncomingComm);
      socket.off('communication:broadcast', handleIncomingComm);
    };
  }, [socket, user]);

  const handleAcknowledgeMsg = async () => {
    if (!incomingMsgAlert) return;
    try {
      await api.replyCommunication({
        communicationId: incomingMsgAlert.id,
        patientName: user?.name || incomingMsgAlert.recipientName || 'Patient',
        patientPhone: user?.phone || incomingMsgAlert.recipientPhone || '+216 98 123 456',
        doctorId: incomingMsgAlert.doctorId || 'doc-1',
        doctorName: incomingMsgAlert.doctorName || 'Dr. Selim Ben Ali',
        channel: incomingMsgAlert.channel || 'whatsapp',
        replyText: 'Accusé de réception confirmé : Bien reçu Docteur, merci !'
      });
      setMsgAcknowledged(true);
      setTimeout(() => setIncomingMsgAlert(null), 3000);
    } catch (e) {
      setIncomingMsgAlert(null);
    }
  };

  // Forms state
  const [carnetForm, setCarnetForm] = useState({
    bloodType: 'O+',
    allergies: '',
    chronicDiseases: '',
    emergencyName: '',
    emergencyPhone: '',
    height: 168,
    weight: 64
  });

  const [dependentForm, setDependentForm] = useState({
    name: '',
    relation: 'ENFANT',
    birthDate: '',
    gender: '',
    bloodType: 'O+'
  });

  // Fetch patient profile data with race condition protection and feedback
  const fetchProfile = async (targetUserId = null, isManual = false) => {
    if (!user && !demoMode) return;
    setLoading(true);
    try {
      const resolvedTargetId = demoMode
        ? 'usr-4410'
        : (targetUserId || user?.uuid || user?.id);

      if (!resolvedTargetId) {
        setLoading(false);
        return;
      }

      const res = await api.getPatientProfile({
        patientId: resolvedTargetId,
        demo: demoMode || resolvedTargetId === 'usr-4410',
        patientPhone: user?.phone || '',
        patientName: user?.name || ''
      });

      if (res && res.success && res.data) {
        setProfileData(res.data);
        if (res.data.healthRecord) {
          const hr = res.data.healthRecord;
          setCarnetForm({
            bloodType: hr.bloodType || 'O+',
            allergies: Array.isArray(hr.allergies) ? hr.allergies.join(', ') : (hr.allergies || ''),
            chronicDiseases: Array.isArray(hr.chronicDiseases) ? hr.chronicDiseases.join(', ') : (hr.chronicDiseases || ''),
            emergencyName: hr.emergencyContact?.name || '',
            emergencyPhone: hr.emergencyContact?.phone || '',
            height: Number(hr.height) || 168,
            weight: Number(hr.weight) || 64
          });
        }
        if (isManual) {
          const nowStr = new Date().toLocaleTimeString(isAr ? 'ar-TN' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setActionSuccessMsg(
            isAr
              ? `تمت مزامنة بيانات ملفك الطبي بنجاح (${nowStr})`
              : `Données du dossier patient synchronisées avec succès (${nowStr})`
          );
          setTimeout(() => setActionSuccessMsg(''), 4000);
        }
      }
    } catch (err) {
      console.warn('Patient profile fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate fetch before auth token initialization finishes on page refresh
    if (authLoading || (!user && !demoMode)) return;
    let isCancelled = false;

    const runFetch = async () => {
      setLoading(true);
      try {
        const resolvedTargetId = demoMode
          ? 'usr-4410'
          : (user?.uuid || user?.id);

        if (!resolvedTargetId) {
          setLoading(false);
          return;
        }

        const res = await api.getPatientProfile({
          patientId: resolvedTargetId,
          demo: demoMode || resolvedTargetId === 'usr-4410',
          patientPhone: user?.phone || '',
          patientName: user?.name || ''
        });

        if (!isCancelled && res && res.success && res.data) {
          setProfileData(res.data);
          if (res.data.healthRecord) {
            const hr = res.data.healthRecord;
            setCarnetForm({
              bloodType: hr.bloodType || 'O+',
              allergies: Array.isArray(hr.allergies) ? hr.allergies.join(', ') : (hr.allergies || ''),
              chronicDiseases: Array.isArray(hr.chronicDiseases) ? hr.chronicDiseases.join(', ') : (hr.chronicDiseases || ''),
              emergencyName: hr.emergencyContact?.name || '',
              emergencyPhone: hr.emergencyContact?.phone || '',
              height: Number(hr.height) || 168,
              weight: Number(hr.weight) || 64
            });
          }
        }
      } catch (err) {
        console.warn('Patient profile fetch notice:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    runFetch();

    return () => {
      isCancelled = true;
    };
  }, [user?.uuid, user?.id, authLoading, demoMode]);

  // Fallback data if demoMode is active or real data is loaded
  const appointments = useMemo(() => {
    if (profileData?.appointments && profileData.appointments.length > 0) {
      return profileData.appointments;
    }
    if (demoMode) {
      return [
        {
          id: 'apt-demo-1',
          doctorName: isAr ? 'د. سليم بن علي' : 'Dr. Selim Ben Ali',
          specialty: isAr ? 'أمراض القلب والشرايين' : 'Cardiologie & Maladies Vasculaires',
          date: isAr ? 'اليوم' : "Aujourd'hui",
          time: '11:00',
          status: 'CONFIRMED',
          ticketNumber: 4,
          type: 'CABINET',
          address: isAr ? '15 شارع الحبيب بورقيبة، تونس' : '15 Avenue Habib Bourguiba, Tunis',
          phone: '+216 71 888 999'
        },
        {
          id: 'apt-demo-2',
          doctorName: isAr ? 'د. وليد بن سالم' : 'Dr. Walid Ben Salem',
          specialty: isAr ? 'الطب العام' : 'Médecine Générale',
          date: isAr ? 'الجمعة 24 أكتوبر' : 'vendr. 24 oct.',
          time: '09:30',
          status: 'CONFIRMED',
          ticketNumber: 7,
          type: 'CABINET',
          address: isAr ? 'المركز الطبي ضفاف البحيرة، تونس' : 'Centre Médical Les Berges du Lac, Tunis',
          phone: '+216 71 222 333'
        },
        {
          id: 'apt-demo-3',
          doctorName: isAr ? 'د. آمال كراي' : 'Dr. Amel Karray',
          specialty: isAr ? 'أمراض الجلدية' : 'Dermatologie',
          date: isAr ? 'الإثنين 27 أكتوبر' : 'Lundi 27 oct.',
          time: '15:00',
          status: 'CONFIRMED',
          ticketNumber: 2,
          type: 'TELECONSULT',
          address: isAr ? 'استشارة طبية بالفيديو Maw2idi' : 'Téléconsultation Vidéo Maw2idi',
          phone: '+216 71 444 555'
        }
      ];
    }
    return [];
  }, [profileData, demoMode]);

  const healthRecord = useMemo(() => {
    if (profileData?.healthRecord) {
      return profileData.healthRecord;
    }
    if (demoMode) {
      return {
        bloodType: 'O+',
        allergies: [isAr ? 'حساسية البنسلين (طفح جلدي شديد)' : 'Pénicilline (Urticaire sévère)'],
        chronicDiseases: [isAr ? 'ارتفاع ضغط الدم (HTA)' : 'Hypertension Artérielle (HTA)', isAr ? 'مرض السكري النوع 2' : 'Diabète T2'],
        height: 168,
        weight: 64,
        emergencyContact: {
          name: isAr ? 'منصف بن عبدالله' : 'Moncef Ben Abdallah',
          relation: isAr ? 'الزوج' : 'Époux',
          phone: '+216 98 220 330'
        },
        vaccines: [
          { name: isAr ? 'الكزاز / شلل الأطفال' : 'Tétanos / Polio', date: '2023-04-12', validUntil: '2033-04-12' },
          { name: isAr ? 'كوفيد-19 (فايزر ثنائي التكافؤ)' : 'COVID-19 (Pfizer Bivalent)', date: '2022-11-05', dose: isAr ? 'جرعة تعزيزية 3' : 'Rappel 3' },
          { name: isAr ? 'النزلة الموسمية (الإنفلونزا)' : 'Grippe Saisonnière', date: '2025-10-15', dose: isAr ? 'سنوي' : 'Annuel' }
        ]
      };
    }
    return {
      bloodType: carnetForm.bloodType || 'O+',
      allergies: carnetForm.allergies ? [carnetForm.allergies] : [],
      chronicDiseases: carnetForm.chronicDiseases ? [carnetForm.chronicDiseases] : [],
      height: carnetForm.height || 168,
      weight: carnetForm.weight || 64,
      emergencyContact: {
        name: carnetForm.emergencyName || '',
        relation: 'Contact d\'Urgence',
        phone: carnetForm.emergencyPhone || ''
      },
      vaccines: []
    };
  }, [profileData, demoMode, carnetForm]);

  const prescriptions = useMemo(() => {
    if (profileData?.prescriptions && profileData.prescriptions.length > 0) {
      return profileData.prescriptions;
    }
    if (demoMode) {
      return [
        {
          id: 'ord-301',
          doctorName: isAr ? 'د. سليم بن علي' : 'Dr. Selim Ben Ali',
          specialty: isAr ? 'أمراض القلب' : 'Cardiologie',
          date: '18/10/2026',
          status: 'ACTIVE',
          qrHash: 'sha256-7fa981e4b3c2098d5f1a6c4b9e',
          drugs: [
            { name: 'Doliprane 1000mg', codePct: 'PCT-DOL-01', posology: isAr ? 'قرص واحد كل 8 ساعات عند الألم' : '1 comprimé toutes les 8h si douleur', duration: isAr ? '5 أيام' : '5 jours' },
            { name: 'Inexium 40mg', codePct: 'PCT-INX-04', posology: isAr ? 'كبسولة واحدة صباحاً على الريق' : '1 gélule le matin à jeun', duration: isAr ? '14 يوماً' : '14 jours' },
            { name: 'Kardegic 75mg', codePct: 'PCT-KRD-02', posology: isAr ? 'كيس واحد ظهراً أثناء وجبة الغداء' : '1 sachet le midi au cours du repas', duration: isAr ? '30 يوماً' : '30 jours' }
          ]
        }
      ];
    }
    return [];
  }, [profileData, demoMode]);

  const dependents = useMemo(() => {
    if (profileData?.dependents && profileData.dependents.length > 0) {
      return profileData.dependents;
    }
    if (demoMode) {
      return [
        { id: 'dep-501', name: isAr ? 'يوسف بن عبدالله' : 'Youssef Ben Abdallah', relation: 'ENFANT', birthDate: '14/09/2018', gender: 'M', bloodType: 'O+' },
        { id: 'dep-502', name: isAr ? 'خديجة منصور' : 'Khedija Mansour', relation: 'PARENT', birthDate: '22/03/1954', gender: 'F', bloodType: 'A+' }
      ];
    }
    return [];
  }, [profileData, demoMode]);

  // Active non-expired upcoming appointments
  const activeUpcomingAppointments = useMemo(() => {
    return (appointments || []).filter(a =>
      a.status !== 'CANCELLED' &&
      a.status !== 'COMPLETED' &&
      a.status !== 'EXPIRED' &&
      !isAppointmentExpired(a)
    );
  }, [appointments]);

  // Past appointments (completed, cancelled, expired, or date passed)
  const pastAppointments = useMemo(() => {
    return (appointments || []).filter(a =>
      a.status === 'COMPLETED' ||
      a.status === 'CANCELLED' ||
      a.status === 'EXPIRED' ||
      isAppointmentExpired(a)
    );
  }, [appointments]);

  // Filtered past appointments for the Historique view
  const filteredPastAppointments = useMemo(() => {
    if (pastAptFilter === 'completed') {
      return pastAppointments.filter(a => a.status === 'COMPLETED' || (!a.status && isAppointmentExpired(a)));
    }
    if (pastAptFilter === 'cancelled') {
      return pastAppointments.filter(a => a.status === 'CANCELLED');
    }
    if (pastAptFilter === 'teleconsult') {
      return pastAppointments.filter(a => a.type === 'TELECONSULT');
    }
    return pastAppointments;
  }, [pastAppointments, pastAptFilter]);

  // Notifications for the current patient
  const patientNotifications = useMemo(() => {
    return (notifications || []).filter(n => {
      if (n.space === 'public' || n.space === 'all') return true;
      if (n.space === 'patient') return true;
      if (user?.id && (n.patientId === user.id || n.userId === user.id)) return true;
      return true;
    });
  }, [notifications, user?.id]);

  const effectiveUnreadCount = useMemo(() => {
    if (unreadCount !== undefined && unreadCount > 0) return unreadCount;
    return patientNotifications.filter(n => !n.read).length;
  }, [unreadCount, patientNotifications]);

  // Filtered notifications for the Notifications view
  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return patientNotifications.filter(n => !n.read);
    }
    if (notifFilter === 'rdv') {
      return patientNotifications.filter(n => n.category === 'rdv' || n.category === 'appointment' || /rdv|rendez-vous|موعد/i.test(n.title || ''));
    }
    return patientNotifications;
  }, [patientNotifications, notifFilter]);

  // Next upcoming appointment (strictly non-expired and chronologically sorted)
  const nextAppointment = useMemo(() => {
    if (!activeUpcomingAppointments.length) return null;
    const sorted = [...activeUpcomingAppointments].sort((a, b) => {
      const aTime = parseAppointmentToDateTime(a)?.getTime() || 0;
      const bTime = parseAppointmentToDateTime(b)?.getTime() || 0;
      return aTime - bTime;
    });
    return sorted[0] || null;
  }, [activeUpcomingAppointments]);

  // Filtered appointments: expired/past appointments NEVER appear in 'upcoming', 'teleconsult', or 'all'
  const filteredAppointments = useMemo(() => {
    if (aptFilter === 'past') {
      return (appointments || []).filter(a =>
        a.status === 'COMPLETED' ||
        a.status === 'CANCELLED' ||
        a.status === 'EXPIRED' ||
        isAppointmentExpired(a)
      );
    }
    if (aptFilter === 'teleconsult') {
      return (appointments || []).filter(a =>
        a.type === 'TELECONSULT' &&
        a.status !== 'CANCELLED' &&
        a.status !== 'COMPLETED' &&
        a.status !== 'EXPIRED' &&
        !isAppointmentExpired(a)
      );
    }
    // 'upcoming' (and default view) — strictly upcoming active appointments
    return activeUpcomingAppointments;
  }, [appointments, aptFilter, activeUpcomingAppointments]);

  // BMI calculation (Poids / Taille^2) with safety checks against 0 / empty
  const bmi = useMemo(() => {
    const rawH = Number(healthRecord?.height) || Number(carnetForm?.height) || 168;
    const rawW = Number(healthRecord?.weight) || Number(carnetForm?.weight) || 64;
    const h = rawH / 100;
    if (!h || h <= 0 || !rawW || rawW <= 0) return '22.7';
    const val = (rawW / (h * h)).toFixed(1);
    return isNaN(val) ? '22.7' : val;
  }, [healthRecord, carnetForm]);

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!cancelModalApt) return;
    setCancelError('');
    const eligibility = getCancellationEligibility(cancelModalApt);
    if (!eligibility.allowed) {
      setCancelError(
        isAr
          ? `لا يمكن إلغاء الموعد قبل أقل من ${CANCELLATION_MIN_HOURS} ساعات من توقيته. يرجى الاتصال مباشرة بعيادة الطبيب.`
          : `Annulation impossible à moins de ${CANCELLATION_MIN_HOURS} heures du rendez-vous. Veuillez contacter directement le cabinet du médecin.`
      );
      return;
    }

    setCancelling(true);
    try {
      await api.cancelAppointment(cancelModalApt.id);
      // Update local state after server confirms cancellation
      setProfileData(prev => {
        const base = prev || { appointments };
        return {
          ...base,
          appointments: (base.appointments || []).map(a => a.id === cancelModalApt.id ? { ...a, status: 'CANCELLED' } : a)
        };
      });
      setActionSuccessMsg(
        isAr
          ? `تم إلغاء موعدك مع ${cancelModalApt.doctorName || 'الطبيب'} بنجاح وتم إشعار الطبيب عبر البريد الإلكتروني.`
          : `Le rendez-vous avec ${cancelModalApt.doctorName || 'le médecin'} a été annulé avec succès. Le médecin a été notifié par email.`
      );
      setTimeout(() => setActionSuccessMsg(''), 5000);
      setCancelModalApt(null);
    } catch (err) {
      const msg = (isAr && err?.data?.messageAr)
        ? err.data.messageAr
        : (err?.message || (isAr ? 'تعذر إلغاء الموعد. يرجى المحاولة لاحقاً.' : 'Impossible d\'annuler ce rendez-vous.'));
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  // Handle Update Health Record
  const handleSaveCarnet = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: user?.uuid || 'usr-4410',
        bloodType: carnetForm.bloodType,
        allergies: carnetForm.allergies.split(',').map(s => s.trim()),
        chronicDiseases: carnetForm.chronicDiseases.split(',').map(s => s.trim()),
        height: parseInt(carnetForm.height),
        weight: parseInt(carnetForm.weight),
        emergencyContact: {
          name: carnetForm.emergencyName,
          phone: carnetForm.emergencyPhone,
          relation: 'Contact d\'Urgence'
        }
      };
      await api.updateHealthRecord(payload);
      setProfileData(prev => ({
        ...prev,
        healthRecord: {
          ...(prev?.healthRecord || {}),
          ...payload
        }
      }));
      setEditCarnetOpen(false);
      setActionSuccessMsg(
        isAr
          ? 'تم تحديث الدفتر الصحي الرقمي وتشفيره بمعيار AES-256 بنجاح.'
          : 'Votre carnet de santé numérique a été mis à jour et chiffré AES-256.'
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Update health record notice:', err);
      setEditCarnetOpen(false);
    }
  };

  // Handle Add Dependent
  const handleSaveDependent = async (e) => {
    e.preventDefault();
    if (!dependentForm.name) return;
    try {
      const newDep = {
        id: `dep-${Date.now()}`,
        patientId: user?.uuid || 'usr-4410',
        name: dependentForm.name,
        relation: dependentForm.relation,
        birthDate: dependentForm.birthDate || '10/05/2019',
        gender: dependentForm.gender,
        bloodType: dependentForm.bloodType
      };
      if (api.addDependent) {
        await api.addDependent(newDep).catch(() => null);
      }
      setProfileData(prev => ({
        ...prev,
        dependents: [newDep, ...(prev?.dependents || dependents)]
      }));
      setAddDependentOpen(false);
      setDependentForm({ name: '', relation: 'ENFANT', birthDate: '', gender: '', bloodType: 'O+' });
      setActionSuccessMsg(
        isAr
          ? `تمت إضافة القريب ${newDep.name} بنجاح إلى حساب العائلة.`
          : `Le proche ${newDep.name} a été ajouté avec succès à votre compte famille.`
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Add dependent notice:', err);
    }
  };

  // 1. Loading state during auth initialization
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mb-4 text-[#00A896]">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
          {isAr ? 'جارٍ التحقق من جلستكم الآمنة...' : 'Vérification de votre session sécurisée...'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">{isAr ? 'مطابق لقانون حماية المعطيات الشخصية INPDP • تشفير AES-256' : 'Conformité INPDP • Chiffrement AES-256'}</p>
      </div>
    );
  }

  // 2. Access Protection: BLOCK access if no user account is active
  if (!isAuthenticated || !user) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center text-center">
        <div className="bg-white dark:bg-[#0c162d] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 w-full animate-in fade-in zoom-in-95">
          {/* Security Shield Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#00A896]/20 to-[#0086cd]/20 border border-[#00A896]/30 flex items-center justify-center text-[#00A896] shadow-lg shadow-teal-500/10">
            <Shield className="w-10 h-10 text-[#00A896]" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-[#00A896] text-xs font-black uppercase tracking-wider border border-teal-200 dark:border-teal-800">
              {isAr ? '🔒 فضاء المريض الخاص • حماية المعطيات INPDP' : '🔒 Espace Patient Privé • Protection INPDP'}
            </span>
          </div>

          {/* Heading & description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isAr ? 'تسجيل الدخول مطلوب' : 'Connexion Requise'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {isAr ? 'الوصول إلى لوحة التحكم، الدفتر الصحي الرقمي، تذاكر الانتظار والوصفات الطبية مخصص فقط للمرضى الذين يملكون حساباً نشطاً.' : 'L\'accès à votre tableau de bord, carnet de santé numérique, billets de file d\'attente et ordonnances électroniques est strictement réservé aux utilisateurs disposant d\'un compte patient actif.'}
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
              <span>{isAr ? 'إنشاء حساب مريض جديد' : 'Créer un compte patient'}</span>
            </button>
          </div>

          {/* Return to Home link */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAr ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}</span>
            </Link>
            <span className="flex items-center gap-1 font-medium">
              <span>{isAr ? '🛡️ مطابق لقانون حماية المعطيات الشخصية بتونس عدد 2004-63' : '🛡️ Conforme loi INPDP Tunisie n° 2004-63'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* PRACTITIONER BANNER IF USER IS LOGGED IN AS A DOCTOR */}
      {user?.role === 'DOCTOR' && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🩺</span>
            <span>{isAr ? <>🩺 أنت مسجل الدخول حالياً بحساب طبيب (<strong>{user.name}</strong>). أنت تتصفح فضاء المريض الشخصي الخاص بك.</> : <>Vous êtes actuellement connecté avec un compte Médecin (<strong>{user.name}</strong>). Vous consultez votre espace patient personnel.</>}</span>
          </div>
          <Link
            to="/doctor/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-[#0086cd] text-white hover:bg-[#0073af] transition-all whitespace-nowrap active:scale-95 text-center"
          >
            {isAr ? 'الانتقال إلى فضاء الطبيب ‹' : 'Aller à mon Espace Médecin ›'}
          </Link>
        </div>
      )}

      {/* ════════════════ TOP HEADER BAR & GREETING ════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0c162d] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isAr ? 'مرحباً، ' : 'Bonjour, '}{user?.name || (demoMode ? (isAr ? 'فاطمة بن عبدالله' : 'Fatma Ben Abdallah') : (isAr ? 'مريض' : 'Patient'))} 👋
            </span>
            {demoMode || user?.isVerified || user?.cnamIdentifiant ? (
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {isAr ? '✓ مريض معتمد في الكنام (CNAM)' : '✓ Patient Vérifié CNAM'}
              </span>
            ) : (
              <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                {isAr ? 'حساب مريض نشط' : 'Compte Patient Actif'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'ملف طبي مشفر ومؤمن • تشفير طرفي AES-256 مطابق لمعايير الهيئة الوطنية لحماية المعطيات الشخصية بتونس (INPDP)' : 'Dossier Médical Sécurisé • Chiffrement AES-256 conforme loi INPDP Tunisie'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchProfile(null, true)}
            className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title={isAr ? 'تحديث البيانات' : 'Rafraîchir les données'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {/* Paramètres du compte patient */}
          <Link
            to="/parametres"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title={isAr ? 'إعدادات الحساب والملف الشخصي' : 'Paramètres du compte'}
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">{isAr ? 'إعدادات الحساب' : 'Paramètres'}</span>
          </Link>

          {/* CTA: Prendre RDV */}
          <Link
            to="/search"
            className="bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'حجز موعد طبي +' : 'Prendre un Rendez-vous'}</span>
          </Link>
        </div>
      </div>

      {/* SUCCESS ALERT BANNER */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">✕</button>
        </div>
      )}

      {/* REAL-TIME SMS / WHATSAPP RECEIVED BANNER */}
      {incomingMsgAlert && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-md ${
          incomingMsgAlert.channel === 'whatsapp'
            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
            : 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{incomingMsgAlert.channel === 'whatsapp' ? '💬' : '📱'}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm">
                  {incomingMsgAlert.channel === 'whatsapp' ? 'Message WhatsApp Reçu' : 'SMS Médical Reçu'} · {incomingMsgAlert.doctorName}
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                  EN DIRECT
                </span>
              </div>
              <p className="text-xs mt-1 font-medium whitespace-pre-line text-slate-800 dark:text-slate-200">
                {incomingMsgAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {!msgAcknowledged ? (
              <button
                type="button"
                onClick={handleAcknowledgeMsg}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>Accusé de réception</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>✓✓</span>
                <span>Accusé transmis au cabinet !</span>
              </span>
            )}
            <button
              onClick={() => setIncomingMsgAlert(null)}
              className="text-xs p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ 1. TOP 4 KPI CARDS ════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Next Appointment */}
        <div className="bg-white dark:bg-[#0c162d] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{isAr ? 'الموعد القادم' : 'Prochain RDV'}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${nextAppointment
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
              {nextAppointment ? (isAr ? 'مؤكد' : 'Confirmé') : (isAr ? 'لا يوجد' : 'Aucun')}
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
              {nextAppointment?.doctorName || (isAr ? 'لا يوجد أي موعد قادم' : 'Aucun RDV à venir')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
              {nextAppointment
                ? `${nextAppointment.specialty || 'Consultation'} • ${nextAppointment.date} à ${nextAppointment.time}`
                : (isAr ? 'احجز موعداً مع أحد أطبائنا المتعاقدين' : 'Consultez nos praticiens conventionnés')}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            {nextAppointment ? (
              <>
                <span className="text-[#0086cd] font-black">
                  {isAr ? 'تذكرة رقم ' : 'Ticket N° '}{nextAppointment.ticketNumber ? String(nextAppointment.ticketNumber).padStart(2, '0') : '04'}
                </span>
                <button
                  onClick={() => setSelectedTicketApt(nextAppointment)}
                  className="text-[11px] font-extrabold text-[#00a896] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{isAr ? 'متابعة التذكرة' : 'Suivre ticket'}</span>
                  <span>›</span>
                </button>
              </>
            ) : (
              <Link to="/search" className="text-[11px] font-extrabold text-[#00a896] hover:underline">
                {isAr ? '+ حجز موعد ‹' : '+ Prendre un RDV ›'}
              </Link>
            )}
          </div>
        </div>

        {/* Card 2: Live Queue Companion */}
        <div className="bg-gradient-to-br from-[#032b43] to-[#002b49] text-white p-5 rounded-3xl shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-300">{isAr ? 'قاعة الانتظار المباشرة' : 'File d\'Attente Live'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {queue.length > 0 ? `${queue.length} ${isAr ? 'مرضى' : 'patients'}` : (isAr ? '2 مرضى' : '2 patients')}
            </div>
            <p className="text-xs text-slate-300 font-medium">{isAr ? 'قبل دوركم في العيادة' : 'avant votre passage au cabinet'}</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-emerald-300 text-[11px] font-bold">
              {delayMinutes > 0 ? (isAr ? `⏱️ التأخير المقدر: +${delayMinutes} دقيقة` : `⏱️ Retard estimé: +${delayMinutes} min`) : (isAr ? '🟢 في الموعد المحدد (بدون تأخير)' : "🟢 À l'heure (Aucun retard)")}
            </span>
          </div>
        </div>

        {/* Card 3: Carnet de Santé */}
        <div className="bg-white dark:bg-[#0c162d] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{isAr ? 'الدفتر الصحي' : 'Carnet de Santé'}</span>
            <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
              {healthRecord.bloodType || 'O+'}
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'الملف الرقمي INPDP' : 'Dossier Numérique INPDP'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {Array.isArray(healthRecord.allergies) ? healthRecord.allergies.join(', ') : (healthRecord.allergies || 'Allergie Pénicilline')}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-black">{isAr ? '✓ مشفر AES-256' : '✓ Chiffré AES-256'}</span>
            <button
              onClick={() => setActiveTab('carnet')}
              className="text-[11px] font-extrabold text-[#0086cd] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{isAr ? 'معاينة' : 'Consulter'}</span>
              <span>›</span>
            </button>
          </div>
        </div>

        {/* Card 4: Ordonnances Actives */}
        <div className="bg-white dark:bg-[#0c162d] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{isAr ? 'الوصفات الطبية' : 'Ordonnances'}</span>
            <span className="bg-teal-50 dark:bg-teal-950/60 text-[#00A896] text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {isAr ? 'معتمد PCT' : 'Certifié PCT'}
            </span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {prescriptions.length} {isAr ? 'وصفة طبية نشطة' : 'Ordonnance(s) Active(s)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'رمز QR غير قابل للتزوير' : 'QR Code infalsifiable'}</p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold">{isAr ? 'الصيدلية المركزية' : 'Pharmacie Centrale'}</span>
            <button
              onClick={() => setActiveTab('ordonnances')}
              className="text-[11px] font-extrabold text-[#00a896] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{isAr ? 'عرض' : 'Voir'}</span>
              <span>›</span>
            </button>
          </div>
        </div>

      </div>

      {/* ════════════════ 2. SEGMENTED NAVIGATION TABS ════════════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'rdv', label: isAr ? '📅 مواعيدي ومتابعة العلاج' : '📅 Mes Rendez-vous & Suivi', count: activeUpcomingAppointments.length },
          { id: 'historique', label: isAr ? '⌛ المواعيد السابقة (السجل)' : '⌛ Rendez-vous Passés', count: pastAppointments.length },
          { id: 'notifications', label: isAr ? '🔔 الإشعارات' : '🔔 Notifications', count: effectiveUnreadCount > 0 ? effectiveUnreadCount : (patientNotifications.length > 0 ? patientNotifications.length : undefined), isAlert: effectiveUnreadCount > 0 },
          { id: 'carnet', label: isAr ? '🩸 الدفتر الصحي الرقمي' : '🩸 Carnet de Santé Numérique', badge: healthRecord.bloodType || 'O+' },
          { id: 'ordonnances', label: isAr ? '📝 محفظة الوصفات الطبية' : "📝 Portefeuille d'Ordonnances", count: prescriptions.length },
          { id: 'proches', label: isAr ? '👨‍👩‍👧‍👦 أفراد العائلة (الأقارب)' : '👨‍👩‍👧‍👦 Mes Proches (Famille)', count: dependents.length }
        ].map((tab) => (
          <button
            key={tab.id}
            id={'tab-btn-' + tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-gradient-to-r from-[#00b4b6] to-[#0086cd] text-white shadow-md shadow-teal-500/20'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === tab.id
                  ? 'bg-white/25 text-white'
                  : tab.isAlert
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                {tab.count}
              </span>
            )}
            {tab.badge && tab.count === undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ 3. TAB 1: MES RENDEZ-VOUS & SUIVI ════════════════ */}
      {activeTab === 'rdv' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📅</span> <span>{isAr ? 'المواعيد الطبية وسجل الاستشارات' : 'Consultations & Historique'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'إدارة المواعيد، الوصول إلى تذكرة الدور ومتابعة الحالة مباشرة في الوقت الفعلي.' : 'Gérez vos rendez-vous, accédez à votre ticket coupe-file et suivez votre statut en temps réel.'}
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'upcoming', label: isAr ? 'المواعيد القادمة' : 'À venir', count: activeUpcomingAppointments.length },
                { id: 'teleconsult', label: isAr ? 'استشارات عن بعد' : 'Téléconsultations' },
                { id: 'past', label: isAr ? 'السجل والمواعيد السابقة' : 'Historique' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAptFilter(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${aptFilter === f.id
                      ? 'bg-[#00A896] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${aptFilter === f.id ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">🗓️</span>
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">{isAr ? 'لم يتم العثور على أي موعد' : 'Aucun rendez-vous trouvé'}</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isAr ? 'لا توجد مواعيد في هذا التصنيف. ابحث عن طبيب لحجز موعد جديد.' : 'Vous n\'avez aucun rendez-vous dans cette catégorie. Recherchez un praticien pour réserver votre créneau.'}
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 bg-[#00A896] text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'حجز موعد طبي +' : 'Prendre un Rendez-vous'}</span>
                </Link>
              </div>
            ) : (
              filteredAppointments.map((apt, idx) => {
                const isExpired = isAppointmentExpired(apt);
                const isCancelled = apt.status === 'CANCELLED';
                const isConfirmed = (apt.status === 'CONFIRMED' || apt.status === 'APPROVED') && !isExpired;
                const isTeleconsult = apt.type === 'TELECONSULT';

                return (
                  <div
                    key={apt.id || idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isCancelled
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 opacity-75'
                        : isExpired
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-teal-400'
                      }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          {apt.doctorName || 'Dr. Selim Ben Ali'}
                        </h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isCancelled
                            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400'
                            : isExpired
                            ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300'
                          }`}>
                          {isCancelled
                            ? (isAr ? 'ملغى' : 'ANNULÉ')
                            : isExpired
                            ? (isAr ? 'منتهي' : 'EXPIRÉ')
                            : (isAr ? 'مؤكد' : 'CONFIRMÉ')}
                        </span>
                        {isTeleconsult && (
                          <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Video className="w-3 h-3 text-sky-600" />
                            <span>{isAr ? 'استشارة فيديو عن بعد' : 'Téléconsultation Vidéo'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                        <span>📅 <strong>{apt.date} à {apt.time}</strong></span>
                        <span>•</span>
                        <span>{apt.specialty || 'Cardiologie'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{apt.address || 'Cabinet Médical, Tunis'}</span>
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-end sm:self-center">
                      {/* Ticket Badge */}
                      <span className="font-mono text-xs font-black text-[#0086cd] bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-200 dark:border-sky-800">
                        {isAr ? 'تذكرة رقم ' : 'Ticket N° '}{apt.ticketNumber ? String(apt.ticketNumber).padStart(2, '0') : String(idx + 4).padStart(2, '0')}
                      </span>

                      {/* Ticket Modal Trigger */}
                      <button
                        type="button"
                        id={'ticket-btn-' + (apt.id || idx)}
                        onClick={() => setSelectedTicketApt(apt)}
                        className="px-3 py-1.5 rounded-xl bg-[#0086cd] hover:bg-[#0070ab] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isAr ? 'التذكرة ورمز QR' : 'Billet & QR'}</span>
                      </button>

                      {/* Teleconsult action - only for active upcoming non-expired appointments */}
                      {isTeleconsult && isConfirmed && !isExpired && (
                        <Link
                          to="/teleconsultation"
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:purple-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isAr ? 'انضمام' : 'Rejoindre'}</span>
                        </Link>
                      )}

                      {/* Cancel Action - disabled within 4 hours of the appointment */}
                      {isConfirmed && !isExpired && (() => {
                        const cancelEligibility = getCancellationEligibility(apt);
                        return cancelEligibility.allowed ? (
                          <button
                            type="button"
                            id={"cancel-btn-" + (apt.id || idx)}
                            onClick={() => {
                              setCancelError('');
                              setCancelModalApt(apt);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                            title={isAr ? 'إلغاء هذا الموعد' : 'Annuler ce rendez-vous'}
                          >
                            {isAr ? 'إلغاء' : 'Annuler'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={"cancel-btn-" + (apt.id || idx)}
                            disabled
                            className="px-2.5 py-1.5 rounded-xl text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed inline-flex items-center gap-1"
                            title={
                              isAr
                                ? `لا يمكن الإلغاء قبل أقل من ${CANCELLATION_MIN_HOURS} ساعات من الموعد`
                                : `Annulation impossible à moins de ${CANCELLATION_MIN_HOURS}h du rendez-vous`
                            }
                          >
                            <Lock className="w-3 h-3" />
                            <span>{isAr ? `إلغاء (< ${CANCELLATION_MIN_HOURS} س)` : `Annuler (< ${CANCELLATION_MIN_HOURS}h)`}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════ 3b. TAB: RENDEZ-VOUS PASSÉS (HISTORIQUE) ════════════════ */}
      {activeTab === 'historique' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>⌛</span> <span>{isAr ? 'سجل المواعيد والاستشارات السابقة' : 'Historique des Rendez-vous Passés'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'سجل كامل لاستشاراتك الطبية السابقة، المكتملة أو الملغاة، مع إمكانية تجديد الموعد بضغطة زر.' : 'Consultez l\'historique de vos consultations passées, terminées ou annulées, et reprenez rendez-vous facilement.'}
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: isAr ? 'الكل' : 'Tous', count: pastAppointments.length },
                { id: 'completed', label: isAr ? 'مكتملة' : 'Terminés', count: pastAppointments.filter(a => a.status === 'COMPLETED' || (!a.status && isAppointmentExpired(a))).length },
                { id: 'cancelled', label: isAr ? 'ملغاة' : 'Annulés', count: pastAppointments.filter(a => a.status === 'CANCELLED').length },
                { id: 'teleconsult', label: isAr ? 'عن بعد' : 'Téléconsultations', count: pastAppointments.filter(a => a.type === 'TELECONSULT').length }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPastAptFilter(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${pastAptFilter === f.id
                      ? 'bg-[#00A896] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${pastAptFilter === f.id ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Past Appointments List */}
          <div className="space-y-3">
            {filteredPastAppointments.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">⌛</span>
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                  {isAr ? 'لا توجد مواعيد سابقة في هذا التصنيف' : 'Aucun rendez-vous passé dans cette catégorie'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isAr ? 'لم يتم العثور على استشارات سابقة مطابقة. يمكنك حجز موعد جديد مع أحد أطبائنا.' : 'Votre historique est vide pour ce filtre. Consultez nos praticiens pour planifier un rendez-vous.'}
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 bg-[#00A896] text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'حجز موعد طبي +' : 'Prendre un Rendez-vous'}</span>
                </Link>
              </div>
            ) : (
              filteredPastAppointments.map((apt, idx) => {
                const isCancelled = apt.status === 'CANCELLED';
                const isCompleted = apt.status === 'COMPLETED';
                const isExpired = !isCancelled && !isCompleted && isAppointmentExpired(apt);
                const isTeleconsult = apt.type === 'TELECONSULT';

                return (
                  <div
                    key={apt.id || idx}
                    className="p-4 sm:p-5 rounded-2xl border bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          {apt.doctorName || 'Dr. Selim Ben Ali'}
                        </h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isCancelled
                            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                          {isCancelled
                            ? (isAr ? 'ملغى' : 'ANNULÉ')
                            : isCompleted
                            ? (isAr ? 'مكتمل' : 'TERMINÉ')
                            : (isAr ? 'منتهي' : 'EXPIRÉ')}
                        </span>
                        {isTeleconsult && (
                          <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Video className="w-3 h-3 text-sky-600" />
                            <span>{isAr ? 'استشارة فيديو' : 'Téléconsultation'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                        <span>📅 <strong>{apt.date} à {apt.time}</strong></span>
                        <span>•</span>
                        <span>{apt.specialty || 'Consultation'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{apt.address || 'Cabinet Médical, Tunis'}</span>
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-end sm:self-center">
                      {/* Ticket Badge */}
                      {apt.ticketNumber && (
                        <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          {isAr ? 'تذكرة رقم ' : 'Ticket N° '}{String(apt.ticketNumber).padStart(2, '0')}
                        </span>
                      )}

                      {/* Ticket Modal Trigger if ticket exists */}
                      <button
                        type="button"
                        onClick={() => setSelectedTicketApt(apt)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isAr ? 'عرض التذكرة' : 'Voir Billet'}</span>
                      </button>

                      {/* Reprendre RDV CTA */}
                      <Link
                        to="/search"
                        className="px-3.5 py-1.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-extrabold flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حجز جديد' : 'Reprendre RDV'}</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════ 3c. TAB: CENTRE DE NOTIFICATIONS ════════════════ */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔔</span> <span>{isAr ? 'مركز الإشعارات والتنبيهات' : 'Centre de Notifications & Alertes'}</span>
                </h3>
                {effectiveUnreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {effectiveUnreadCount} {isAr ? 'جديد' : 'non lue(s)'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'متابعة مباشرة لتأكيدات المواعيد، تنبيهات التأخير في العيادة والرسائل الطبية.' : 'Suivez en direct vos confirmations de rendez-vous, alertes de retard, ordonnances et messages de praticiens.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
              {effectiveUnreadCount > 0 && markAllAsRead && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#00A896] hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحديد الكل كمقروء' : 'Tout marquer comme lu'}</span>
                </button>
              )}

              {patientNotifications.length > 0 && clearNotifications && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مسح الكل' : 'Effacer tout'}</span>
                </button>
              )}

              {refreshNotifications && (
                <button
                  type="button"
                  onClick={() => refreshNotifications()}
                  className="p-1.5 text-slate-400 hover:text-teal-600 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title={isAr ? 'تحديث الإشعارات' : 'Rafraîchir les notifications'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: isAr ? 'جميع الإشعارات' : 'Toutes', count: patientNotifications.length },
              { id: 'unread', label: isAr ? 'غير المقروءة' : 'Non lues', count: effectiveUnreadCount },
              { id: 'rdv', label: isAr ? 'المواعيد' : 'Rendez-vous' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setNotifFilter(f.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${notifFilter === f.id
                    ? 'bg-[#00A896] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${notifFilter === f.id ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">🔔</span>
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                  {isAr ? 'لا توجد إشعارات حالياً' : 'Aucune notification pour le moment'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isAr ? 'ستصلك هنا كافة التنبيهات المباشرة فور تأكيد مواعيدك، صدور وصفاتك أو تحديث دورك في العيادة.' : 'Toutes les alertes en direct concernant vos rendez-vous, prescriptions et passages en cabinet apparaîtront ici.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n, i) => {
                const isUnread = !n.read;
                const title = getNotificationTitle(n, lang);
                const message = getNotificationMessage(n, lang);
                const timeStr = formatExactNotificationTime(n, lang);
                const fullTime = getExactNotificationFull(n);

                return (
                  <div
                    key={n.id || i}
                    onClick={() => {
                      if (isUnread && markAsRead) markAsRead(n.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer ${isUnread
                        ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                        isUnread ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {n.icon || (n.category === 'rdv' ? '📅' : n.category === 'ordonnance' ? '💊' : '🔔')}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs sm:text-sm ${isUnread ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                            {title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                          {message}
                        </p>

                        <span
                          className="text-[10px] text-slate-400 font-bold block pt-1"
                          title={fullTime}
                        >
                          ⏱️ {timeStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                      {isUnread && markAsRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={isAr ? 'تحديد كمقروء' : 'Marquer comme lu'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {deleteNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={isAr ? 'حذف' : 'Supprimer'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════ 4. TAB 2: CARNET DE SANTÉ (EHR) ════════════════ */}
      {activeTab === 'carnet' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🩸</span> <span>{isAr ? 'الملف الطبي الشخصي والدفتر الصحي الرقمي (EHR)' : 'Dossier Médical Personnel & Carnet Numérique (EHR)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'تشفير شامل من البداية إلى النهاية بتقنية AES-256 معتمد ومطابق لمعايير الهيئة الوطنية لحماية المعطيات الشخصية والصحية بتونس (INPDP).' : 'Chiffrement de bout en bout AES-256 certifié conforme aux normes INPDP Santé Tunisie.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditCarnetOpen(true)}
              className="bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-center active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تعديل دفتري الصحي' : 'Modifier mon Carnet'}</span>
            </button>
          </div>

          {/* Health Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Blood Type */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'فصيلة الدم' : 'Groupe Sanguin'}</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{healthRecord.bloodType || 'O+'}</div>
              <p className="text-[11px] text-slate-400">{isAr ? 'بطاقة متبرع معتمدة ومسجلة' : 'Carte de donneur validée'}</p>
            </div>

            {/* BMI & Height/Weight */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'القياسات البدنية ومؤشر كتلة الجسم (IMC)' : 'Morphologie & IMC'}</span>
              <div className="text-xl font-black text-teal-600 dark:text-teal-400">{bmi} <span className="text-xs font-normal">kg/m²</span></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? <>القامة : <strong>{healthRecord.height || carnetForm.height || 168} سم</strong> &bull; الوزن : <strong>{healthRecord.weight || carnetForm.weight || 64} كغ</strong></> : <>Taille : <strong>{healthRecord.height || carnetForm.height || 168} cm</strong> &bull; Poids : <strong>{healthRecord.weight || carnetForm.weight || 64} kg</strong></>}
              </p>
            </div>

            {/* Allergies */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'الحساسية المسجلة والمعروفة' : 'Allergies Connues'}</span>
              <div className="font-extrabold text-slate-900 dark:text-white">
                {Array.isArray(healthRecord.allergies) ? healthRecord.allergies.join(', ') : (healthRecord.allergies || 'Pénicilline (Urticaire sévère)')}
              </div>
              <p className="text-[11px] text-amber-600 font-bold">{isAr ? '⚠️ يتم تنبيه الأطباء تلقائياً عند حجز المواعيد' : '⚠️ Signalé aux praticiens lors des RDV'}</p>
            </div>

            {/* Chronic Diseases */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'الأمراض المزمنة (ALD)' : 'Affections Longue Durée (ALD)'}</span>
              <div className="font-extrabold text-slate-900 dark:text-white">
                {Array.isArray(healthRecord.chronicDiseases) ? healthRecord.chronicDiseases.join(', ') : (healthRecord.chronicDiseases || 'Hypertension Artérielle (HTA)')}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'التكفل بالكنام نشط وساري المفعول (CNAM)' : 'Prise en charge CNAM active'}</p>
            </div>
          </div>

          {/* Emergency Contact & Vaccines Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Emergency Contact Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'الشخص المعين للاتصال في حالات الطوارئ' : 'Contact d\'Urgence Désigné'}</span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {healthRecord.emergencyContact?.name || 'Moncef Ben Abdallah'}
                  </h4>
                  <p className="text-slate-500 font-bold">
                    {healthRecord.emergencyContact?.relation || 'Époux'} &bull; <bdi dir="ltr">{healthRecord.emergencyContact?.phone || '+216 98 220 330'}</bdi>
                  </p>
                </div>
                <a
                  href={`tel:${healthRecord.emergencyContact?.phone || '+21698220330'}`}
                  className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اتصال' : 'Appeler'}</span>
                </a>
              </div>
            </div>

            {/* Vaccines Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">{isAr ? 'دفتر التلاقيح والتحصين' : 'Carnet de Vaccination'}</span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {(healthRecord.vaccines || [
                  { name: 'Tétanos / Polio', date: '12/04/2023', validUntil: '2033' },
                  { name: 'COVID-19 Bivalent', date: '05/11/2022', dose: 'Rappel' },
                  { name: 'Grippe Saisonnière', date: '15/10/2025', dose: 'Annuel' }
                ]).map((v, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>💉 {v.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{v.date} ({v.validUntil ? `Valide jusqu'en ${v.validUntil}` : v.dose})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ 5. TAB 3: PORTEFEUILLE D'ORDONNANCES ════════════════ */}
      {activeTab === 'ordonnances' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📝</span> <span>{isAr ? 'الوصفات الطبية الإلكترونية المؤمنة (PCT والصيدلية المركزية)' : 'Ordonnances Électroniques Sécurisées (PCT & Pharmacie)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'وثائق طبية موقعة رقمياً وقابلة للتحقق الفوري برمز QR في جميع صيدليات الجمهورية التونسية.' : 'Documents médicaux signés numériquement et vérifiables par QR code dans toutes les officines de Tunisie.'}
              </p>
            </div>

            <span className="bg-teal-50 dark:bg-teal-950/60 text-[#00A896] text-xs font-black px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800 self-start sm:self-center">
              {isAr ? '✓ اعتماد الصيدلية المركزية التونسية PCT' : '✓ Agrément Pharmacie Centrale PCT'}
            </span>
          </div>

          {prescriptions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-4xl">📝</span>
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">{isAr ? 'لا توجد وصفات طبية نشطة' : 'Aucune ordonnance active'}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAr ? 'ستظهر هنا وصفاتك الطبية المعتمدة من الصيدلية المركزية والموقعة إلكترونياً إثر كل فحص طبي.' : 'Vos ordonnances médicales certifiées PCT et signées numériquement avec QR code apparaîtront ici suite à vos consultations.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                        {p.doctorName || 'Dr. Selim Ben Ali'}
                      </h4>
                      <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        {isAr ? '✓ وصفة صالحة وسارية المفعول' : '✓ ORDONNANCE VALIDE'}
                      </span>
                      <span className="text-xs text-slate-400">{isAr ? 'التاريخ : ' : 'Date : '}{p.date || '18/10/2026'}</span>
                    </div>

                    {/* Medications preview list */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-black uppercase text-teal-700 dark:text-teal-400 tracking-wider">
                        {isAr ? 'الأدوية الموصوفة (' : 'Médicaments prescrits ('}{p.drugs?.length || 2}{isAr ? ') :' : ') :'}
                      </span>
                      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {(p.drugs || [
                          { name: 'Doliprane 1000mg', posology: '1 comprimé toutes les 8h si douleur', duration: '5 jours' },
                          { name: 'Inexium 40mg', posology: '1 gélule le matin à jeun', duration: '14 jours' }
                        ]).map((drug, dIdx) => (
                          <li key={dIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            <strong>{drug.name}</strong>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-600 dark:text-slate-400">{drug.posology} ({drug.duration})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <a
                      href={`/verify/prescription/${p.qrHash || p.id || 'demo'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Vérifier Authenticité</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      title="Imprimer cette ordonnance"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ 6. TAB 4: MES PROCHES (FAMILLE) ════════════════ */}
      {activeTab === 'proches' && (
        <div className="bg-white dark:bg-[#0c162d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>👨‍👩‍👧‍👦</span> <span>{isAr ? 'أفراد العائلة والأشخاص تحت الكفالة' : 'Membres de la Famille & Personnes à Charge'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'احجز المواعيد بنقرة واحدة لأطفالك أو والديك من خلال حسابك الموحد.' : 'Prenez rendez-vous en 1 clic pour vos enfants ou parents à charge depuis votre compte unique.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAddDependentOpen(true)}
              className="bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-center active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? '+ إضافة فرد من العائلة' : '+ Ajouter un Proche'}</span>
            </button>
          </div>

          {dependents.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-4xl">👨‍👩‍👧‍👦</span>
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">{isAr ? 'لا يوجد أي قريب مسجل حالياً' : 'Aucun proche enregistré'}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAr ? 'اربط أفراد عائلتك (الأطفال، الوالدين) لإدارة مواعيدهم وملفاتهم الصحية من حسابك الموحد.' : 'Rattachez vos proches (enfants, parents) pour gérer leurs rendez-vous et carnets de santé depuis votre compte unique.'}
              </p>
              <button
                type="button"
                onClick={() => setAddDependentOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? ' إضافة فرد من العائلة' : ' Ajouter un Proche'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dependents.map((dep, idx) => (
                <div
                  key={dep.id || idx}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col justify-between space-y-3 hover:border-teal-400 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                        {dep.relation === 'ENFANT' ? (isAr ? 'ابن / طفل' : 'ENFANT') : dep.relation === 'CONJOINT' ? (isAr ? 'الزوج / الزوجة' : 'CONJOINT') : dep.relation === 'PARENT' ? (isAr ? 'الوالد / الوالدة' : 'PARENT') : (isAr ? 'قريب' : 'AUTRE')}
                      </span>
                      <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full text-[10px]">
                        {dep.bloodType || 'O+'}
                      </span>
                    </div>
                    <h4 className="font-black text-base text-slate-900 dark:text-white pt-1">{dep.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">
                      {isAr ? <>تاريخ الولادة : {dep.birthDate || '14/09/2018'} &bull; الجنس : {dep.gender === 'F' ? 'أنثى' : dep.gender === 'M' ? 'ذكر' : 'غير محدد'}</> : <>Né(e) le {dep.birthDate || '14/09/2018'} &bull; Sexe : {dep.gender === 'F' ? 'Féminin' : dep.gender === 'M' ? 'Masculin' : 'Non spécifié'}</>}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <Link
                      to="/search"
                      className="text-xs font-black text-[#00A896] hover:underline"
                    >
                      + Prendre RDV ›
                    </Link>
                    <span className="text-[10px] text-slate-400">Dossier rattaché</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ 7. MODAL: DIGITAL TICKET & QR CODE ════════════════ */}
      {selectedTicketApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎫</span> <span>Billet de Passage & Ticket Coupe-File</span>
              </h3>
              <button id="close-ticket-modal-btn" onClick={() => setSelectedTicketApt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {/* Boarding Pass Design */}
            <div className="bg-gradient-to-b from-teal-50 to-sky-50 dark:from-teal-950/40 dark:to-sky-950/30 p-5 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-center space-y-3">
              <span className="text-[10px] font-black uppercase text-teal-800 dark:text-teal-300 tracking-wider block">
                Maw2idi &bull; Billet Officiel de Consultation
              </span>
              <div className="text-3xl font-black text-[#0086cd]">
                TICKET #{selectedTicketApt.ticketNumber ? String(selectedTicketApt.ticketNumber).padStart(2, '0') : '04'}
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">{selectedTicketApt.doctorName || 'Dr. Selim Ben Ali'}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{selectedTicketApt.specialty || 'Cardiologie'}</p>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  📅 {selectedTicketApt.date} à {selectedTicketApt.time}
                </p>
              </div>

              {/* QR Code graphic mockup */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="w-28 h-28 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {ticketQrDataUrl ? (
                    <img src={ticketQrDataUrl} alt="QR Code Billet Consultation" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-20 h-20 text-slate-900 dark:text-white animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Scanner à la borne du cabinet</span>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-teal-200 dark:border-teal-800 pt-2">
                📍 {selectedTicketApt.address || '15 Avenue Habib Bourguiba, Tunis'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicketApt(null)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] text-white cursor-pointer active:scale-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ 8. MODAL: ANNULER RENDEZ-VOUS ════════════════ */}
      {cancelModalApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-2">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-black text-rose-600">{isAr ? 'إلغاء هذا الموعد الطبي ؟' : 'Annuler ce Rendez-vous ?'}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isAr ? <>هل أنت متأكد من رغبتك في إلغاء موعدك مع <strong>{cancelModalApt.doctorName}</strong> بتاريخ {cancelModalApt.date} الساعة {cancelModalApt.time} ؟</> : <>Êtes-vous sûr de vouloir annuler votre consultation avec <strong>{cancelModalApt.doctorName}</strong> le {cancelModalApt.date} à {cancelModalApt.time} ?</>}
              </p>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'سيتم إشعار الطبيب تلقائياً عبر البريد الإلكتروني وإتاحة هذا التوقيت فوراً لمريض آخر.'
                  : 'Le médecin sera automatiquement notifié par email et le créneau sera immédiatement libéré.'}
              </p>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold text-center">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  setCancelError('');
                  setCancelModalApt(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {isAr ? 'الاحتفاظ بالموعد' : 'Conserver mon RDV'}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {cancelling ? (isAr ? 'جارٍ الإلغاء...' : 'Annulation...') : (isAr ? 'تأكيد الإلغاء' : 'Confirmer l\'annulation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ 9. MODAL: MODIFIER CARNET DE SANTÉ ════════════════ */}
      {editCarnetOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🩸</span> <span>{isAr ? 'تحديث الدفتر الصحي الرقمي' : 'Mettre à jour mon Carnet de Santé'}</span>
              </h3>
              <button id="close-edit-carnet-btn" onClick={() => setEditCarnetOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCarnet} className="space-y-3.5 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'فصيلة الدم :' : 'Groupe Sanguin :'}</label>
                  <select
                    value={carnetForm.bloodType}
                    onChange={(e) => setCarnetForm({ ...carnetForm, bloodType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="O+">O Positif (O+)</option>
                    <option value="O-">O Négatif (O-)</option>
                    <option value="A+">A Positif (A+)</option>
                    <option value="A-">A Négatif (A-)</option>
                    <option value="B+">B Positif (B+)</option>
                    <option value="B-">B Négatif (B-)</option>
                    <option value="AB+">AB Positif (AB+)</option>
                    <option value="AB-">AB Négatif (AB-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'القامة (سم) والوزن (كغ) :' : 'Taille (cm) & Poids (kg) :'}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={carnetForm.height}
                      onChange={(e) => setCarnetForm({ ...carnetForm, height: e.target.value })}
                      className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none"
                      placeholder="168"
                    />
                    <input
                      type="number"
                      value={carnetForm.weight}
                      onChange={(e) => setCarnetForm({ ...carnetForm, weight: e.target.value })}
                      className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none"
                      placeholder="64"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Allergies Médicamenteuses / Alimentaires :</label>
                <input
                  type="text"
                  value={carnetForm.allergies}
                  onChange={(e) => setCarnetForm({ ...carnetForm, allergies: e.target.value })}
                  placeholder="Ex: Pénicilline, Arachides, Iode"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الأمراض المزمنة (ALD) :' : 'Affections Longue Durée (ALD) / Maladies Chroniques :'}</label>
                <input
                  type="text"
                  value={carnetForm.chronicDiseases}
                  onChange={(e) => setCarnetForm({ ...carnetForm, chronicDiseases: e.target.value })}
                  placeholder="Ex: HTA, Diabète Type 2, Asthme"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'اسم الشخص للطوارئ :' : 'Contact d\'Urgence (Nom) :'}</label>
                  <input
                    type="text"
                    value={carnetForm.emergencyName}
                    onChange={(e) => setCarnetForm({ ...carnetForm, emergencyName: e.target.value })}
                    placeholder="Nom complet"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'هاتف الطوارئ :' : 'Téléphone d\'Urgence :'}</label>
                  <TunisianPhoneInput
                    value={carnetForm.emergencyPhone}
                    onChange={(e) => setCarnetForm({ ...carnetForm, emergencyPhone: e.target.value })}
                    placeholder="+216 98 000 000"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditCarnetOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Enregistrer & Chiffrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ 10. MODAL: AJOUTER UN PROCHE ════════════════ */}
      {addDependentOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>👨‍👩‍👧‍👦</span> <span>{isAr ? 'إضافة فرد من العائلة' : 'Ajouter un Membre de la Famille'}</span>
              </h3>
              <button id="close-add-proche-btn" onClick={() => setAddDependentOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveDependent} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الاسم واللقب للطرف القريب :' : 'Nom et Prénom du Proche :'}</label>
                <input
                  type="text"
                  required
                  value={dependentForm.name}
                  onChange={(e) => setDependentForm({ ...dependentForm, name: e.target.value })}
                  placeholder="Ex: Adam Ben Abdallah"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'صلة القرابة :' : 'Lien de Parenté :'}</label>
                  <select
                    value={dependentForm.relation}
                    onChange={(e) => setDependentForm({ ...dependentForm, relation: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="ENFANT">{isAr ? 'ابن / ابنة' : 'Enfant'}</option>
                    <option value="CONJOINT">{isAr ? 'الزوج / الزوجة' : 'Conjoint(e)'}</option>
                    <option value="PARENT">{isAr ? 'الوالد / الوالدة' : 'Parent (Père/Mère)'}</option>
                    <option value="AUTRE">{isAr ? 'شخص آخر تحت الكفالة' : 'Autre personne à charge'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'فصيلة الدم :' : 'Groupe Sanguin :'}</label>
                  <select
                    value={dependentForm.bloodType}
                    onChange={(e) => setDependentForm({ ...dependentForm, bloodType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'تاريخ الولادة :' : 'Date de Naissance :'}</label>
                  <input
                    type="date"
                    required
                    value={dependentForm.birthDate}
                    onChange={(e) => setDependentForm({ ...dependentForm, birthDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الجنس :' : 'Sexe :'}</label>
                  <select
                    value={dependentForm.gender || ''}
                    onChange={(e) => setDependentForm({ ...dependentForm, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">{isAr ? 'بدون تحديد / غير محدد' : 'Sans genre / Non spécifié'}</option>
                    <option value="M">{isAr ? 'ذكر' : 'Masculin'}</option>
                    <option value="F">{isAr ? 'أنثى' : 'Féminin'}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddDependentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Enregistrer le Proche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
