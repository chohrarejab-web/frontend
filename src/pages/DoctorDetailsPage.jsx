import { DOCTOR_DETAIL } from '../data/doctorDetailData';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { INITIAL_DOCTORS, GOVERNORATES_AR, SPECIALTIES, getDoctorCoordinates } from '../data/tunisiaData';
import { Camera, Edit2 } from 'lucide-react';
import DoctorProfileModal, { formatTunisianPhone } from '../components/doctor/DoctorProfileModal';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';
import { useRealtimeTranslation, useTranslatedList, resolveMedicalTerm, translateText, isArabicText } from '../services/translator';
import { resolveDoctorSpecialty, resolveDoctorCity, resolveDoctorTitle, resolveBadge, resolveDoctorName, resolveDoctorAddress } from '../utils/i18nHelper';
import { ENABLE_REVIEWS } from '../config/features';

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') return '/images/3ila_doctor.jpeg';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

// Helper to calculate 5 consecutive days given an offset
function get5ConsecutiveDays(offsetDays = 0, isAr = false) {
  const dayNamesFr = ['dim.', 'lundi', 'mardi', 'mercr.', 'jeudi', 'vendr.', 'sam.'];
  const monthNamesFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dayKeyMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const arabicDays = {
    'dim.': 'الأحد',
    'lundi': 'الإثنين',
    'mardi': 'الثلاثاء',
    'mercr.': 'الأربعاء',
    'jeudi': 'الخميس',
    'vendr.': 'الجمعة',
    'sam.': 'السبت'
  };

  const arabicMonths = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const days = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + offsetDays);

  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dayIdx = d.getDay();
    const rawDay = dayNamesFr[dayIdx];
    const dayKey = dayKeyMap[dayIdx];
    const isToday = offsetDays === 0 && i === 0;

    const dayDisplay = isAr ? (arabicDays[rawDay] || rawDay) : rawDay;
    const monthDisplay = isAr ? (arabicMonths[d.getMonth()] || monthNamesFr[d.getMonth()]) : monthNamesFr[d.getMonth()];
    const fullDateStr = isToday
      ? (isAr ? `اليوم (${d.getDate()} ${monthDisplay})` : `Aujourd'hui (${d.getDate()} ${monthDisplay})`)
      : `${dayDisplay} ${d.getDate()} ${monthDisplay}`;
    const canonicalDateStr = `${dayDisplay} ${d.getDate()} ${monthDisplay}`;

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    days.push({
      fullDateStr,
      canonicalDateStr,
      dayName: dayDisplay,
      rawDayName: rawDay,
      dayKey,
      isToday,
      dateNum: d.getDate(),
      monthName: monthDisplay,
      iso
    });
  }
  return days;
}

// Sample verified patient reviews
const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    patientName: 'Kamel Mansouri',
    patientNameAr: 'كمال المنصوري',
    rating: 5,
    date: '10 Octobre 2026',
    dateAr: '10 أكتوبر 2026',
    consultType: 'CABINET',
    verified: true,
    tags: ["✨ Très à l'écoute", '💡 Explications claires', '⏱️ Ponctuel', '🏢 Cabinet moderne & propre'],
    comment: 'Médecin très professionnel et à l’écoute. Explications très claires sur le traitement. Le cabinet est très propre et moderne.',
    commentAr: 'طبيب محترف ومستمع ممتاز. التفسيرات كانت واضحة جداً بخصوص العلاج. العيادة نظيفة وعصرية جداً.'
  },
  {
    id: 'rev-2',
    patientName: 'Sonia Trabelsi',
    patientNameAr: 'سونيا الطرابلسي',
    rating: 5,
    date: '04 Octobre 2026',
    dateAr: '04 أكتوبر 2026',
    consultType: 'CABINET',
    verified: true,
    tags: ['⏱️ Ponctuel', '👩‍💼 Secrétaire accueillante'],
    comment: 'Prise en charge rapide et ponctuelle. La prise en charge CNAM a été faite directement au secrétariat sans aucune difficulté.',
    commentAr: 'استقبال سريع ومواعيد دقيقة. تمت معالجة ملف الكنام مباشرة في السكرتارية بسلاسة ودون أي تعقيد.'
  },
  {
    id: 'rev-3',
    patientName: 'Amine Belhadj',
    patientNameAr: 'أمين بلحاج',
    rating: 4.8,
    date: '28 Septembre 2026',
    dateAr: '28 سبتمبر 2026',
    consultType: 'TELECONSULTATION',
    verified: true,
    tags: ['🛡️ Rassurant & Bienveillant', '💡 Explications claires'],
    comment: 'Téléconsultation fluide avec ordonnance numérique reçue immédiatement par SMS et validée en pharmacie.',
    commentAr: 'استشارة عن بعد ممتازة مع وصفة طبية رقمية وصلتني مباشرة عبر SMS ومقبولة في الصيدلية.'
  }
];

export default function DoctorDetailsPage({ onOpenLogin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateDoctor = location?.state?.doctor;
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user, isAuthenticated } = useAuth();

  // State for dynamic API doctor data
  const [apiDoctor, setApiDoctor] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Automatically scroll to reviews section if requested, or reset scroll position to top
  useEffect(() => {
    const shouldScrollToReviews = ENABLE_REVIEWS && (location.hash === '#section-avis' || location.state?.scrollToReviews);
    if (shouldScrollToReviews) {
      const scrollToAvis = () => {
        const target = document.getElementById('section-avis') || document.getElementById('doc-reviews-title');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      scrollToAvis();
      const t1 = setTimeout(scrollToAvis, 150);
      const t2 = setTimeout(scrollToAvis, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [id, location.hash, location.state]);

  useEffect(() => {
    let isMounted = true;
    const targetId = id || 'doc-1';
    if (targetId) {
      if (id) setApiDoctor(null);
      api.getDoctorById(targetId)
        .then((res) => {
          if (isMounted && res && res.data) {
            setApiDoctor(res.data);
            if (res.data.reviews && Array.isArray(res.data.reviews) && res.data.reviews.length > 0) {
              const formatted = res.data.reviews
                .filter((r) => {
                  const s = (r.status || 'PUBLIÉ').toUpperCase();
                  return s !== 'MODÉRÉ' && s !== 'MASQUÉ';
                })
                .map((r) => ({
                id: r.id || `rev-${Date.now()}`,
                patientName: r.patientName || r.patient || (isAr ? 'مريض معتمد' : 'Patient Vérifié'),
                patientNameAr: r.patientNameAr || r.patientName || r.patient,
                rating: parseFloat(r.rating) || 5,
                date: r.date || (isAr ? 'اليوم' : "Aujourd'hui"),
                dateAr: r.dateAr || r.date || 'اليوم',
                consultType: r.consultType || 'CABINET',
                verified: r.verified !== false,
                comment: r.comment || '',
                commentAr: r.commentAr || r.comment || '',
                tags: Array.isArray(r.tags) ? r.tags.filter(Boolean) : [],
                criteria: r.criteria || null,
                status: r.status || 'PUBLIÉ',
                reply: r.reply || null
              }));
              setReviewsList(formatted);
              try {
                localStorage.setItem(`sahatn_reviews_${targetId}`, JSON.stringify(formatted));
              } catch (e) {}
            }
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [id, isAr]);

  // Safe template for presentation, diplomas, equipment & slots
  const genericTemplate = {
    presentation: "Médecin spécialiste hautement qualifié exerçant en Tunisie. Le cabinet dispose d'équipements médicaux de pointe pour le suivi complet des consultations, le diagnostic précis et la prise en charge personnalisée des patients.",
    presentationAr: "طبيب أخصائي مؤهل تأهيلا عاليا يمارس في تونس. تتوفر في العيادة أحدث التجهيزات الطبية لمتابعة شاملة للاستشارات، والتشخيص الدقيق، والتكفل الطبي المخصص بكل مريض.",
    diplomas: [
      "Diplôme d'État de Docteur en Médecine",
      "Diplôme d'Études Spécialisées",
      "Membre de l'Ordre des Médecins de Tunisie"
    ],
    diplomasAr: [
      "شهادة دولة دكتور في الطب (تونس)",
      "شهادة اختصاص طبي معمق",
      "مرسم بعمادة الأطباء بالبلاد التونسية"
    ],
    equipment: [
      "Cabinet informatisé",
      "Équipement d'examen spécialisé"
    ],
    equipmentAr: [
      "عيادة مرقمنة ومجهزة بأنظمة متطورة",
      "تجهيزات فحص واستشارة متخصصة"
    ],
    languages: "Français, Arabe, Anglais",
    languagesAr: "الفرنسية، العربية، الإنجليزية",
    accessibility: "Accès PMR / Ascenseur",
    accessibilityAr: "ولوجية كاملة لذوي الاحتياجات الخاصة / مصعد",
    slots: {
      "mardi": ["09:00", "10:00", "11:30", "15:00"],
      "mercr.": ["09:00", "10:30", "14:30", "16:00"],
      "mercredi": ["09:00", "10:30", "14:30", "16:00"],
      "jeudi": ["09:15", "10:30", "14:30", "15:45"],
      "vendr.": ["09:00", "10:30", "14:30", "16:00"],
      "vendredi": ["09:00", "10:30", "14:30", "16:00"],
      "sam.": ["09:00", "10:30", "14:30", "16:00"],
      "samedi": ["09:00", "10:30", "14:30", "16:00"],
      "dimanche": [],
      "lundi": ["08:30", "09:30", "11:00", "14:30"]
    }
  };

    // Find Doctor by ID: strict matching so doctors never take each other's identity
  const doctor = useMemo(() => {
    // 0. From router navigation state if available
    const fromState = (stateDoctor && (
      stateDoctor.id === id || 
      stateDoctor.uuid === id || 
      stateDoctor.doctorId === id || 
      !id ||
      true
    )) ? stateDoctor : null;

    // 1. Exact match in DOCTOR_DETAIL
    const detailMatch = id
      ? DOCTOR_DETAIL.find(
          (d) => d.id === id || d.doctorId === id || d.uuid === id || String(d.id).toLowerCase() === String(id).toLowerCase()
        )
      : null;

    // 2. Exact match in INITIAL_DOCTORS
    const initialMatch = id
      ? INITIAL_DOCTORS.find(
          (d) => d.id === id || d.uuid === id || String(d.id).toLowerCase() === String(id).toLowerCase()
        )
      : null;

    const matchedDoctor = detailMatch || initialMatch || fromState;

    // If API returned doctor data for this ID
    if (apiDoctor) {
      return {
        ...genericTemplate,
        ...(matchedDoctor || {}),
        ...apiDoctor, // apiDoctor is ground truth
        // Keep rich presentation, diplomas, equipment if available
        presentation: apiDoctor.presentation || apiDoctor.bio || (matchedDoctor && (matchedDoctor.presentation || matchedDoctor.bio)) || genericTemplate.presentation,
        presentationAr: apiDoctor.presentationAr || apiDoctor.bioAr || (matchedDoctor && (matchedDoctor.presentationAr || matchedDoctor.bioAr)) || ((apiDoctor.presentation || apiDoctor.bio) ? null : genericTemplate.presentationAr),
        diplomas: (apiDoctor.diplomas && apiDoctor.diplomas.length > 0) ? apiDoctor.diplomas : ((matchedDoctor && matchedDoctor.diplomas) || genericTemplate.diplomas),
        diplomasAr: (apiDoctor.diplomasAr && apiDoctor.diplomasAr.length > 0) ? apiDoctor.diplomasAr : ((matchedDoctor && matchedDoctor.diplomasAr) || genericTemplate.diplomasAr),
        equipment: (apiDoctor.equipment && apiDoctor.equipment.length > 0) ? apiDoctor.equipment : ((matchedDoctor && matchedDoctor.equipment) || genericTemplate.equipment),
        equipmentAr: (apiDoctor.equipmentAr && apiDoctor.equipmentAr.length > 0) ? apiDoctor.equipmentAr : ((matchedDoctor && matchedDoctor.equipmentAr) || genericTemplate.equipmentAr),
        languages: apiDoctor.languages || (matchedDoctor && matchedDoctor.languages) || genericTemplate.languages,
        languagesAr: apiDoctor.languagesAr || (matchedDoctor && matchedDoctor.languagesAr) || genericTemplate.languagesAr,
        accessibility: apiDoctor.accessibility || (matchedDoctor && matchedDoctor.accessibility) || genericTemplate.accessibility,
        accessibilityAr: apiDoctor.accessibilityAr || (matchedDoctor && matchedDoctor.accessibilityAr) || genericTemplate.accessibilityAr,
        slots: apiDoctor.slots || (matchedDoctor && matchedDoctor.slots) || genericTemplate.slots
      };
    }

    if (matchedDoctor) {
      return {
        ...genericTemplate,
        ...matchedDoctor,
        diplomas: (matchedDoctor.diplomas && matchedDoctor.diplomas.length > 0) ? matchedDoctor.diplomas : genericTemplate.diplomas,
        diplomasAr: (matchedDoctor.diplomasAr && matchedDoctor.diplomasAr.length > 0) ? matchedDoctor.diplomasAr : genericTemplate.diplomasAr,
        equipment: (matchedDoctor.equipment && matchedDoctor.equipment.length > 0) ? matchedDoctor.equipment : genericTemplate.equipment,
        equipmentAr: (matchedDoctor.equipmentAr && matchedDoctor.equipmentAr.length > 0) ? matchedDoctor.equipmentAr : genericTemplate.equipmentAr,
        presentationAr: matchedDoctor.presentationAr || matchedDoctor.bioAr || ((matchedDoctor.presentation || matchedDoctor.bio) ? null : genericTemplate.presentationAr)
      };
    }

    // Never fall back to Dr. Selim Ben Ali if a different ID was requested
    if (id && id !== 'doc-1') {
      return {
        ...genericTemplate,
        id: id,
        name: 'Dr. Médecin Praticien',
        nameAr: 'د. طبيب ممارس',
        specialty: 'Spécialité Médicale',
        specialtyFr: 'Spécialité Médicale',
        specialtyAr: 'طبيب أخصائي',
        city: 'Tunis',
        address: 'Cabinet Médical, Tunisie',
        fee: 70
      };
    }

    // Default fallback ONLY when no ID was passed or for doc-1
    return INITIAL_DOCTORS[0];
  }, [id, apiDoctor, stateDoctor]);

  const activeUser = user || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('sahatn_user_v2') || localStorage.getItem('sahatn_user') || 'null') : null);
  const activeAccount = user || activeUser;
  const hasActiveAccount = Boolean(
    isAuthenticated && activeAccount && (
      activeAccount.name ||
      activeAccount.fullName ||
      activeAccount.phone ||
      activeAccount.email
    )
  );

  // Only the doctor who owns this profile (or admin) can see/use the edit button and edit modal
  const isDoctorOwner = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    const currentUser = user;
    if (!currentUser) return false;

    // Platform Admins can edit
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
      return true;
    }

    // Must be a doctor or linked to a doctor profile
    const isDoc = String(currentUser.role).toUpperCase() === 'DOCTOR' || Boolean(currentUser.doctorId) || Boolean(currentUser.doctor_id);
    if (!isDoc) return false;

    const currentDocId = String(id || doctor?.id || doctor?.uuid || doctor?.doctorId || '').trim().toLowerCase();
    const userDocId = String(currentUser.doctorId || currentUser.doctor_id || '').trim().toLowerCase();

    // Default doc-1 for any doctor session when visiting doc-1
    if ((!userDocId || userDocId === 'doc-1') && (!currentDocId || currentDocId === 'doc-1')) {
      return true;
    }

    // Check doctor ID match
    if (userDocId && (
      (currentDocId && userDocId === currentDocId) ||
      (doctor?.id && userDocId === String(doctor.id).trim().toLowerCase()) ||
      (doctor?.uuid && userDocId === String(doctor.uuid).trim().toLowerCase()) ||
      (doctor?.doctorId && userDocId === String(doctor.doctorId).trim().toLowerCase())
    )) {
      return true;
    }

    // Check user UUID / ID matching doctor's userId or doctor's own id/uuid
    const userUuid = String(currentUser.uuid || currentUser.id || '').trim().toLowerCase();
    if (userUuid && (
      (doctor?.userId && userUuid === String(doctor.userId).trim().toLowerCase()) ||
      (doctor?.id && userUuid === String(doctor.id).trim().toLowerCase()) ||
      (doctor?.uuid && userUuid === String(doctor.uuid).trim().toLowerCase())
    )) {
      return true;
    }

    // Check doctor email match
    if (currentUser.email && doctor?.email && (
      currentUser.email.trim().toLowerCase() === doctor.email.trim().toLowerCase()
    )) {
      return true;
    }

    return false;
  }, [user, activeUser, doctor, id]);

  // Calendar Offset (for sliding 5 days forward/backward)
  const [calendarOffset, setCalendarOffset] = useState(0);

  // Reviews list & Filter state
  const [reviewsList, setReviewsList] = useState(() => {
    try {
      const targetId = id || 'doc-1';
      const cached = localStorage.getItem(`sahatn_reviews_${targetId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(r => {
            const s = (r.status || 'PUBLIÉ').toUpperCase();
            return s !== 'MODÉRÉ' && s !== 'MASQUÉ';
          });
        }
      }
    } catch (e) {}
    return (id && id !== 'doc-1') ? [] : DEFAULT_REVIEWS;
  });
  const [activeReviewFilter, setActiveReviewFilter] = useState('all'); // 'all', '5star', 'comments'

  // Synchronized Schedule & Appointments State
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [slotPeriodFilter, setSlotPeriodFilter] = useState('all'); // 'all', 'morning', 'afternoon'
  const { socket, delayMinutes = 0 } = useSocket() || {};

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingDateStr, setBookingDateStr] = useState('');
  const [bookingDateIso, setBookingDateIso] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState('self');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [relativeRelation, setRelativeRelation] = useState('ENFANT');
  const [relativeName, setRelativeName] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [cnamCarnet, setCnamCarnet] = useState('');
  const [bookingEmail, setBookingEmail] = useState(() => (isAuthenticated && user?.email ? user.email : ''));
  const [consultType, setConsultType] = useState('CABINET');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [bookingError, setBookingError] = useState('');

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [reviewCriteria, setReviewCriteria] = useState({
    punctuality: 5,
    bedsideManner: 5,
    hygiene: 5,
    careQuality: 5
  });
  const [selectedReviewTags, setSelectedReviewTags] = useState([]);
  const [ratingComment, setRatingComment] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});

  const toggleShowReply = (revId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [revId]: !prev[revId]
    }));
  };

  const REVIEW_TAGS_DEF = useMemo(
    () => [
      { id: 'ecoute', labelFr: "Très à l'écoute", labelAr: 'حسن الاستماع', icon: '✨' },
      { id: 'explications', labelFr: 'Explications claires', labelAr: 'تفسيرات واضحة', icon: '💡' },
      { id: 'ponctuel', labelFr: 'Ponctuel', labelAr: 'دقيق في المواعيد', icon: '⏱️' },
      { id: 'cabinet', labelFr: 'Cabinet moderne & propre', labelAr: 'عيادة عصرية ونظيفة', icon: '🏢' },
      { id: 'secretaire', labelFr: 'Secrétaire accueillante', labelAr: 'استقبال مرحب ولطيف', icon: '👩‍💼' },
      { id: 'rassurant', labelFr: 'Rassurant & Bienveillant', labelAr: 'مطمئن وودود', icon: '🛡️' },
      { id: 'enfants', labelFr: 'Doux avec les enfants', labelAr: 'لطيف مع الأطفال', icon: '👶' }
    ],
    []
  );

  const toggleReviewTag = (tagItemOrId) => {
    const tagId =
      typeof tagItemOrId === 'string'
        ? REVIEW_TAGS_DEF.find(
            (t) => t.id === tagItemOrId || t.labelFr === tagItemOrId || t.labelAr === tagItemOrId
          )?.id || tagItemOrId
        : tagItemOrId?.id;

    setSelectedReviewTags((prev) => {
      const match = REVIEW_TAGS_DEF.find((t) => t.id === tagId);
      const isSel =
        prev.includes(tagId) || (match && (prev.includes(match.labelFr) || prev.includes(match.labelAr)));
      if (isSel) {
        return prev.filter((t) => t !== tagId && (!match || (t !== match.labelFr && t !== match.labelAr)));
      } else {
        return [...prev, tagId];
      }
    });
  };

  // Bidirectional rating handlers:
  // 1) When star is selected: update ratingStars AND update all 4 criteria sliders
  const handleSetGlobalRating = (starValue) => {
    const val = parseFloat(starValue) || 5;
    setRatingStars(val);
    setReviewCriteria({
      punctuality: val,
      bedsideManner: val,
      hygiene: val,
      careQuality: val
    });
  };

  // 2) When any of the 4 criteria sliders changes: update criterion AND recalculate overall star rating
  const handleCriteriaChange = (key, val) => {
    const num = parseFloat(val) || 1;
    const updated = {
      ...reviewCriteria,
      [key]: num
    };
    setReviewCriteria(updated);

    const avg =
      (updated.punctuality + updated.bedsideManner + updated.hygiene + updated.careQuality) / 4;
    const roundedStars = Math.min(5, Math.max(1, Math.round(avg)));
    setRatingStars(roundedStars);
  };

  // Current average of the 4 criteria
  const currentAvgScore = useMemo(() => {
    const sum =
      (parseFloat(reviewCriteria.punctuality) || 5) +
      (parseFloat(reviewCriteria.bedsideManner) || 5) +
      (parseFloat(reviewCriteria.hygiene) || 5) +
      (parseFloat(reviewCriteria.careQuality) || 5);
    return sum / 4;
  }, [reviewCriteria]);

  const getStarRatingLabel = (score) => {
    const num = typeof score === 'number' ? score : parseFloat(score) || 5;
    const formatted = num.toFixed(1);
    if (num >= 4.5) return isAr ? `★ ${formatted} — تجربة ممتازة جداً !` : `★ ${formatted} — Expérience excellente !`;
    if (num >= 3.5) return isAr ? `★ ${formatted} — استشارة جيدة جداً` : `★ ${formatted} — Très bonne consultation`;
    if (num >= 2.5) return isAr ? `★ ${formatted} — استشارة مقبولة` : `★ ${formatted} — Consultation correcte`;
    if (num >= 1.5) return isAr ? `★ ${formatted} — تجربة متوسطة` : `★ ${formatted} — Expérience mitigée`;
    return isAr ? `★ ${formatted} — تجربة مخيبة` : `★ ${formatted} — Décevant`;
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (showBookingModal) setShowBookingModal(false);
        else if (showReviewModal) setShowReviewModal(false);
        else if (showEditModal) setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Global helper methods for external/inline scripts compatibility
    window.closeReviewModal = () => setShowReviewModal(false);
    window.setStarRating = (r) => setRatingStars(r);
    window.hoverStarRating = (r) => setHoverStars(r);
    window.resetStarHover = () => setHoverStars(0);
    window.toggleReviewTag = (btn, tag) => {
      toggleReviewTag(tag);
    };

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete window.closeReviewModal;
      delete window.setStarRating;
      delete window.hoverStarRating;
      delete window.resetStarHover;
      delete window.toggleReviewTag;
    };
  }, [showBookingModal, showReviewModal, showEditModal]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const isUserLoggedIn = Boolean(isAuthenticated || activeUser);
  const defaultReviewAuthor = activeUser?.name || activeUser?.fullName || activeUser?.email || (isAr ? 'مريض معتمد' : 'Patient Vérifié');

  // Auto-open review modal if user just signed in to write a review
  useEffect(() => {
    if (isUserLoggedIn) {
      try {
        const pendingDoc = sessionStorage.getItem('sahatn_pending_review_doctor');
        const targetDocId = id || doctor?.id || 'doc-1';
        if (pendingDoc && pendingDoc === targetDocId) {
          sessionStorage.removeItem('sahatn_pending_review_doctor');
          setShowReviewModal(true);
        }
      } catch (e) {}
    }
  }, [isUserLoggedIn, id, doctor]);

  const handleOpenReviewModal = () => {
    const currentActiveUser = user || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('sahatn_user_v2') || 'null') : null);
    const loggedIn = Boolean(isAuthenticated || currentActiveUser);

    if (!loggedIn) {
      const targetDocId = id || doctor?.id || 'doc-1';
      try {
        sessionStorage.setItem('sahatn_pending_review_doctor', targetDocId);
      } catch (e) {}

      if (onOpenLogin) {
        onOpenLogin();
      } else {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
      }
      return;
    }

    handleSetGlobalRating(5);
    setHoverStars(0);
    setSelectedReviewTags([]);
    setRatingComment('');
    setShowReviewModal(true);
  };

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Leaflet Map Ref
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Initialize & Update Map & Pin Location
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const coords = getDoctorCoordinates(doctor);
    const lat = coords.lat;
    const lng = coords.lng;

    try {
      if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }

      // Custom Pin Marker
      const customPinHtml = `
        <div style="width: 34px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <img src="/images/map_point1.png" style="width: 34px; height: 42px; object-fit: contain;" alt="pin" />
        </div>
      `;
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: customPinHtml,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38]
      });

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popupContent = `
        <div style="font-family: inherit; text-align: ${isAr ? 'right' : 'left'}; min-width: 195px; padding: 2px;">
          <div style="font-weight: 900; font-size: 13px; color: #002b49;">${isAr && doctor.nameAr ? doctor.nameAr : doctor.name}</div>
          <div style="font-size: 11px; color: #0086cd; font-weight: 700; margin-top: 2px;">${isAr && doctor.specialtyAr ? doctor.specialtyAr : (doctor.specialtyFr || doctor.specialty)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.35;">${isAr && doctor.addressAr ? doctor.addressAr : doctor.address}</div>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; background: linear-gradient(135deg, #0086cd 0%, #00a896 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0, 134, 205, 0.35); cursor: pointer;">
            <svg style="width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            <span>${isAr ? 'فتح المسار في Google Maps ↗' : 'Itinéraire Google Maps ↗'}</span>
          </a>
        </div>
      `;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent)
          .openPopup();

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } else {
        mapInstanceRef.current.setView([lat, lng], 14);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([lat, lng]);
          markerInstanceRef.current.setPopupContent(popupContent);
          markerInstanceRef.current.openPopup();
        } else {
          markerInstanceRef.current = L.marker([lat, lng], { icon: customIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(popupContent)
            .openPopup();
        }
      }
    } catch (err) {
      console.warn('Leaflet map initialization notice:', err);
    }

    return () => {
      // Map cleanup on unmount
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerInstanceRef.current = null;
        }
      } catch (err) {
        console.warn('Leaflet map cleanup notice:', err);
      }
    };
  }, [doctor, isAr]);

  // Calendar Days
  const calendarDays = useMemo(() => {
    return get5ConsecutiveDays(calendarOffset, isAr);
  }, [calendarOffset, isAr]);

  // Fetch real persistent doctor schedule and appointments from database
  const fetchDoctorScheduleAndAppointments = useCallback(async () => {
    if (!doctor?.id) return;
    try {
      const [schedRes, aptsRes] = await Promise.all([
        api.getDoctorSchedule(doctor.id).catch(() => null),
        api.getAppointments({ doctorId: doctor.id }).catch(() => null)
      ]);
      if (schedRes?.schedule) {
        setDoctorSchedule(schedRes.schedule);
      }
      if (aptsRes?.data && Array.isArray(aptsRes.data)) {
        setDoctorAppointments(aptsRes.data);
      }
    } catch (err) {
      console.warn('Error fetching doctor schedule/appointments:', err);
    }
  }, [doctor?.id]);

  useEffect(() => {
    fetchDoctorScheduleAndAppointments();
  }, [fetchDoctorScheduleAndAppointments]);

  // Real-time synchronization when doctor modifies timetable or new reservations arrive
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      fetchDoctorScheduleAndAppointments();
    };

    socket.on('appointment:new', handleSync);
    socket.on('appointment:cancelled', handleSync);
    socket.on('slot:blocked', handleSync);
    socket.on('slot:unblocked', handleSync);
    socket.on('schedule:updated', handleSync);

    const handleDoctorSync = (data) => {
      const targetId = id || doctor?.id || 'doc-1';
      const updatedDoc = data?.doctor || data;
      if (updatedDoc && (updatedDoc.id === targetId || updatedDoc.doctorId === targetId || updatedDoc.uuid === targetId)) {
        setApiDoctor(prev => ({ ...(prev || {}), ...updatedDoc }));
      }
    };
    socket.on('doctor:updated', handleDoctorSync);
    socket.on('doctor:map-updated', handleDoctorSync);

    const handleReviewSync = (data) => {
      const targetId = id || doctor?.id || 'doc-1';
      if (!data || data.doctorId === targetId) {
        fetchDoctorReviews(targetId);
        api.getDoctorById(targetId).then((res) => {
          if (res?.data) setApiDoctor(res.data);
        }).catch(() => {});
      }
    };
    socket.on('review:new', handleReviewSync);
    socket.on('review:reply', handleReviewSync);
    socket.on('review:updated', handleReviewSync);

    return () => {
      socket.off('doctor:updated', handleDoctorSync);
      socket.off('doctor:map-updated', handleDoctorSync);
      socket.off('review:new', handleReviewSync);
      socket.off('review:reply', handleReviewSync);
      socket.off('review:updated', handleReviewSync);
      socket.off('appointment:new', handleSync);
      socket.off('appointment:cancelled', handleSync);
      socket.off('slot:blocked', handleSync);
      socket.off('slot:unblocked', handleSync);
      socket.off('schedule:updated', handleSync);
    };
  }, [socket, fetchDoctorScheduleAndAppointments]);

  // Fetch real persistent doctor reviews from database
  const fetchDoctorReviews = useCallback(async (targetDocId) => {
    const docId = targetDocId || id || doctor?.id || 'doc-1';
    if (!docId) return;
    try {
      const res = await api.getReviews(docId);
      if (res && res.success && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const formatted = res.data
            .filter((r) => {
              const s = (r.status || 'PUBLIÉ').toUpperCase();
              return s !== 'MODÉRÉ' && s !== 'MASQUÉ';
            })
            .map((r) => ({
            id: r.id || `rev-${Date.now()}`,
            patientName: r.patientName || r.patient || (isAr ? 'مريض معتمد' : 'Patient Vérifié'),
            patientNameAr: r.patientNameAr || r.patientName || r.patient,
            rating: parseFloat(r.rating) || 5,
            date: r.date || (isAr ? 'اليوم' : "Aujourd'hui"),
            dateAr: r.dateAr || r.date || 'اليوم',
            consultType: r.consultType || 'CABINET',
            verified: r.verified !== false,
            comment: r.comment || '',
            commentAr: r.commentAr || r.comment || '',
            tags: Array.isArray(r.tags) ? r.tags.filter(Boolean) : [],
            criteria: r.criteria || null,
            status: r.status || 'PUBLIÉ',
            reply: r.reply || null
          }));
          setReviewsList(formatted);
          try {
            localStorage.setItem(`sahatn_reviews_${docId}`, JSON.stringify(formatted));
          } catch (e) {}
        } else {
          if (docId === 'doc-1') {
            setReviewsList(DEFAULT_REVIEWS);
          } else {
            setReviewsList([]);
            try {
              localStorage.removeItem(`sahatn_reviews_${docId}`);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching doctor reviews:', err);
    }
  }, [id, doctor?.id, isAr]);

  // Trigger fetch reviews on load and doctor change
  useEffect(() => {
    const targetId = id || doctor?.id || 'doc-1';
    fetchDoctorReviews(targetId);
  }, [id, doctor?.id, fetchDoctorReviews]);

  // Helper functions for robust leave matching across date formats
  const normalizeToIso = (dateInput) => {
    if (!dateInput) return '';
    const str = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
      const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    return '';
  };

  const isDateInLeave = (targetDate, leaveObj) => {
    if (!targetDate || !leaveObj) return false;
    const targetIso = normalizeToIso(targetDate);
    const startRaw = leaveObj.start || leaveObj.startDate || leaveObj.startIso;
    const endRaw = leaveObj.end || leaveObj.endDate || leaveObj.endIso;
    if (!startRaw || !endRaw) return false;
    const startIso = normalizeToIso(startRaw);
    const endIso = normalizeToIso(endRaw);
    if (!targetIso || !startIso || !endIso) return false;
    return targetIso >= startIso && targetIso <= endIso;
  };

  const getDoctorLeaveForDate = (sched, targetDate) => {
    if (!sched || !targetDate) return null;
    const targetIso = normalizeToIso(targetDate);
    if (Array.isArray(sched.leaves) && sched.leaves.length > 0) {
      const match = sched.leaves.find(l => l && isDateInLeave(targetIso, l));
      if (match) return match;
    }
    if (sched.leave && isDateInLeave(targetIso, sched.leave)) {
      return sched.leave;
    }
    return null;
  };

  // Synchronized 5-Day Calendar Days with live doctor timetable and reservations
  const calendarDaysWithSlots = useMemo(() => {
    return calendarDays.map((d) => {
      const dayKey = d.dayKey;
      const dayConfig = doctorSchedule?.days?.[dayKey] || {
        isOpen: dayKey !== 'dimanche',
        matinStart: '08:30',
        matinEnd: '13:00',
        pauseStart: '13:00',
        pauseEnd: '14:00',
        apremStart: '14:00',
        apremEnd: '18:30'
      };

      if (!dayConfig.isOpen) {
        return {
          ...d,
          isClosed: true,
          onLeave: false,
          slots: []
        };
      }

      const activeLeave = getDoctorLeaveForDate(doctorSchedule, d.iso);
      if (activeLeave) {
        return {
          ...d,
          isClosed: false,
          onLeave: true,
          leaveReason: activeLeave.reason || 'Congé',
          slots: []
        };
      }

      const parseM = (tStr) => {
        if (!tStr || tStr === '--' || tStr.includes('Sans') || tStr.includes('fermé')) return null;
        const parts = tStr.replace('h', ':').split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
      };
      const fmtT = (m) => {
        const h = String(Math.floor(m / 60)).padStart(2, '0');
        const min = String(m % 60).padStart(2, '0');
        return `${h}:${min}`;
      };

      const matinStart = parseM(dayConfig.matinStart) ?? (8 * 60 + 30);
      const matinEnd = parseM(dayConfig.matinEnd) ?? (13 * 60);
      const pauseStart = parseM(dayConfig.pauseStart);
      const pauseEnd = parseM(dayConfig.pauseEnd);
      const apremStart = parseM(dayConfig.apremStart) ?? (14 * 60);
      const apremEnd = parseM(dayConfig.apremEnd) ?? (18 * 60 + 30);

      const allTimes = [];
      // Morning slots (step 30 min)
      for (let t = matinStart; t < matinEnd; t += 30) {
        allTimes.push(fmtT(t));
      }
      // Afternoon slots (step 30 min)
      if (apremStart !== null && apremEnd !== null) {
        for (let t = apremStart; t < apremEnd; t += 30) {
          allTimes.push(fmtT(t));
        }
      }

      const rawTemplateSlots = (doctor.slots && doctor.slots[dayKey]) || [];
      const finalTimes = allTimes.length > 0 ? allTimes : (rawTemplateSlots.length > 0 ? rawTemplateSlots : ['09:00', '10:00', '11:30', '15:00']);

      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isPastDay = d.iso < todayIso;
      const isCurrentDay = d.iso === todayIso;
      const curMins = now.getHours() * 60 + now.getMinutes();

      const slotsDetails = finalTimes.map((slotTime) => {
        const normTime = slotTime.replace(/^0/, '');
        const apt = doctorAppointments.find(a => {
          if (a.status === 'CANCELLED') return false;
          const aIso = a.dateIso || a.date;
          if (aIso !== d.iso && a.date !== d.fullDateStr) return false;
          const aTime = (a.time || '').replace('h', ':').trim();
          const aTimeNorm = aTime.replace(/^0/, '');
          return aTime === slotTime || aTimeNorm === normTime;
        });

        const slotMins = parseM(slotTime);
        const isPast = isPastDay || (isCurrentDay && slotMins !== null && slotMins <= curMins);

        if (apt) {
          const isBlocked = apt.status === 'BLOCKED';
          return {
            time: slotTime,
            status: isBlocked ? 'BLOCKED' : 'OCCUPIED',
            isAvailable: false,
            isBooked: !isBlocked,
            isBlocked,
            isPast
          };
        }

        return {
          time: slotTime,
          status: isPast ? 'PAST' : 'FREE',
          isAvailable: !isPast,
          isBooked: false,
          isBlocked: false,
          isPast
        };
      });

      return {
        ...d,
        isClosed: false,
        onLeave: false,
        slots: slotsDetails
      };
    });
  }, [calendarDays, doctorSchedule, doctorAppointments, doctor.slots]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    if (activeReviewFilter === '5star') {
      return reviewsList.filter((r) => r.rating >= 4.9);
    }
    if (activeReviewFilter === 'comments') {
      return reviewsList.filter((r) => (r.comment && r.comment.length > 0) || (r.commentAr && r.commentAr.length > 0));
    }
    return reviewsList;
  }, [reviewsList, activeReviewFilter]);

  // Open Booking Modal for a specific slot
  const handleOpenBooking = (dayObj, slotTime) => {
    setBookingSlot(slotTime);
    setBookingDateStr(dayObj.canonicalDateStr || dayObj.fullDateStr);
    setBookingDateIso(dayObj.iso);
    setBookingSuccessData(null);
    setBookingError('');
    setBeneficiaryType('self');
    setGuestName(hasActiveAccount ? (activeAccount?.name || activeAccount?.fullName || '') : '');
    setGuestPhone(hasActiveAccount ? (activeAccount?.phone || '') : '');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail(hasActiveAccount ? (activeAccount?.email || user?.email || '') : '');
    setConsultType('CABINET');
    setShowBookingModal(true);
  };

  // Submit Appointment Booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingSlot) {
      setBookingError(isAr ? 'يرجى اختيار موعد.' : 'Veuillez sélectionner un créneau.');
      return;
    }

    const isRelative = beneficiaryType === 'relative';
    const patientFinalName = isRelative 
      ? relativeName.trim() 
      : (hasActiveAccount ? (activeAccount?.name || activeAccount?.fullName || user?.name || 'Patient Vérifié') : (guestName.trim() || 'Patient'));
    const patientFinalPhone = isRelative 
      ? relativePhone.trim() 
      : (hasActiveAccount ? (activeAccount?.phone || user?.phone || '98123456') : (guestPhone.trim() || '98123456'));

    if (isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب القريب.' : 'Le nom & prénom du proche sont obligatoires.');
      return;
    }
    if (!isRelative && !hasActiveAccount && (!guestName.trim() || guestName.trim().length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال الاسم واللقب.' : 'Le nom & prénom sont obligatoires.');
      return;
    }
    if (!isRelative && !hasActiveAccount && (!guestPhone.trim() || guestPhone.trim().replace(/\D/g, '').length < 8)) {
      setBookingError(isAr ? 'يرجى إدخال رقم هاتف صحيح (8 أرقام).' : 'Le numéro de téléphone est obligatoire (8 chiffres).');
      return;
    }

    setBookingSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialtyFr || doctor.specialty,
        date: bookingDateStr,
        time: bookingSlot,
        dateIso: bookingDateIso,
        type: consultType,
        fee: `${doctor.fee || 70} TND`,
        patientName: patientFinalName,
        patientPhone: patientFinalPhone,
        patientEmail: (bookingEmail || (hasActiveAccount ? (activeAccount?.email || user?.email) : '') || '').trim(),
        cnamCarnet: cnamCarnet || null,
        bookedFor: beneficiaryType,
        relation: isRelative ? relativeRelation : 'SELF'
      };

      const res = await api.createAppointment(payload);
      if (res.success || res.data) {
        setBookingSuccessData(res.data || payload);
        fetchDoctorScheduleAndAppointments();
      } else {
        setBookingError(res.message || (isAr ? 'تعذر تأكيد الحجز.' : 'Créneau indisponible.'));
      }
    } catch (err) {
      setBookingError(
        err?.message ||
        (isAr
          ? 'تعذر الاتصال بالخادم لتأكيد الحجز. يرجى التأكد من تشغيل الخادم والمحاولة مجدداً.'
          : 'Impossible de contacter le serveur pour confirmer le rendez-vous. Veuillez réessayer.')
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isUserLoggedIn) {
      setShowReviewModal(false);
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setReviewSubmitting(true);
    const authorName = defaultReviewAuthor;
    const targetDocId = id || doctor?.id || 'doc-1';

    const finalRating = parseFloat(currentAvgScore.toFixed(1));
    const formattedTags = REVIEW_TAGS_DEF
      .filter((item) =>
        selectedReviewTags.includes(item.id) ||
        selectedReviewTags.includes(item.labelFr) ||
        selectedReviewTags.includes(item.labelAr)
      )
      .map((item) => `${item.icon} ${isAr ? item.labelAr : item.labelFr}`);

    const newRev = {
      id: `rev-${Date.now()}`,
      doctorId: targetDocId,
      patientName: authorName,
      patientNameAr: isAr ? authorName : null,
      rating: finalRating,
      criteria: reviewCriteria,
      tags: formattedTags,
      date: isAr ? 'اليوم' : "Aujourd'hui",
      dateAr: 'اليوم',
      consultType: 'CABINET',
      verified: true,
      comment: ratingComment.trim(),
      commentAr: ratingComment.trim()
    };

    // Optimistic immediate update + localStorage sync
    setReviewsList((prev) => {
      const updated = [newRev, ...prev.filter(r => r.id !== newRev.id)];
      try {
        localStorage.setItem(`sahatn_reviews_${targetDocId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: targetDocId,
          rating: finalRating,
          criteria: reviewCriteria,
          tags: formattedTags,
          comment: ratingComment.trim(),
          patientName: authorName
        })
      });

      // Synchronize latest reviews list from database
      await fetchDoctorReviews(targetDocId);

      // Re-fetch doctor to immediately update aggregate rating & reviewsCount in header!
      api.getDoctorById(targetDocId).then((res) => {
        if (res?.data) setApiDoctor(res.data);
      }).catch(() => {});
    } catch (err) {
      console.warn('API review submission fallback:', err);
    }

    setShowReviewModal(false);
    setRatingComment('');
    setReviewSubmitting(false);
    showToast(isAr ? '⭐ شكراً لك! تم تسجيل تقييمك المعتمد بنجاح.' : '⭐ Merci ! Votre avis a été enregistré.', 'success');
  };

  // Helper to resolve specialty in Arabic
  const resolveArabicSpecialty = (specFr = '', specId = '') => {
    if (!specFr && !specId) return 'طبيب أخصائي';
    const norm = (specFr || '').toLowerCase().trim();
    const sId = (specId || '').toLowerCase().trim();
    const match = (SPECIALTIES || []).find(
      s => s.id === sId ||
           (s.fr && s.fr.toLowerCase() === norm) ||
           (s.fr && norm.includes(s.fr.toLowerCase())) ||
           (s.fr && s.fr.toLowerCase().includes(norm))
    );
    return match ? match.ar : (specFr || 'طبيب أخصائي');
  };

  // Compute doctor name safely for Arabic and French without BiDi reordering bugs
  const docName = resolveDoctorName(doctor, lang);
  const cleanDocName = docName.replace(/^(Dr\.|د\.)\s*/i, '').trim();

  // Compute doctor specialty safely and bidirectionally (FR <-> AR)
  const docSpec = resolveDoctorSpecialty(doctor, lang);

  // Raw presentation text (whatever is currently saved for the doctor)
  const rawPresentation = useMemo(() => {
    return (doctor.presentation || doctor.bio || genericTemplate.presentation || '').trim();
  }, [doctor.presentation, doctor.bio]);

  // Hook for real-time translation of presentation description (translates dynamic text in real time)
  const {
    translated: displayedPresentation,
    isTranslating: isTranslatingBio
  } = useRealtimeTranslation(
    rawPresentation,
    lang,
    isAr && doctor.presentationAr ? doctor.presentationAr : rawPresentation
  );

  // Doctor title with bidirectional dictionary lookup and real-time fallback
  const rawTitle = (doctor.title || (isAr ? 'طبيب ممارس معتمد' : 'Médecin Praticien Agréé')).trim();
  const resolvedStaticTitle = resolveDoctorTitle(rawTitle, lang);
  const { translated: displayedTitle } = useRealtimeTranslation(
    resolvedStaticTitle,
    lang,
    isAr && doctor.titleAr ? doctor.titleAr : resolvedStaticTitle
  );

  // Compute doctor address safely with real-time translation support
  const rawAddress = (doctor.address || doctor.city || (isAr ? 'تونس' : 'Tunis')).trim();
  const staticResolvedAddress = resolveDoctorAddress(rawAddress, doctor.city, lang);
  const { translated: displayedAddress } = useRealtimeTranslation(
    staticResolvedAddress,
    lang,
    isAr && doctor.addressAr ? doctor.addressAr : staticResolvedAddress
  );
  const docAddress = isAr && doctor.addressAr ? doctor.addressAr : displayedAddress;
  const docCity = resolveDoctorCity(doctor.city, lang);

  // Real-time translation of Diplomas & Equipment lists
  const { items: displayedDiplomas, isTranslating: isTranslatingDiplomas } = useTranslatedList(
    doctor.diplomas,
    lang,
    doctor.diplomasAr
  );

  const { items: displayedEquipment, isTranslating: isTranslatingEquipment } = useTranslatedList(
    doctor.equipment,
    lang,
    doctor.equipmentAr
  );

  return (
    <div className="flex-1 flex flex-col w-full bg-[#edf7f9] dark:bg-[#071120] text-slate-800 dark:text-slate-100 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 z-[9999] bg-[#002b49] dark:bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/30 flex items-center gap-3 animate-bounce transition-all duration-300 ${
            isAr ? 'left-6' : 'right-6'
          }`}
        >
          <span className="text-sm font-bold">{toastMessage.msg}</span>
        </div>
      )}

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white dark:bg-[#0a1e34] border-b border-slate-200/80 dark:border-slate-800/80 py-3 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-[#0086cd] dark:hover:text-cyan-400 transition-colors">{isAr ? 'الرئيسية' : 'Accueil'}</Link>
            <span>/</span>
            <Link to="/search" className="hover:text-[#0086cd] dark:hover:text-cyan-400 transition-colors">
              {isAr ? 'الأطباء في تونس' : 'Médecins en Tunisie'}
            </Link>
            <span>/</span>
            <span className="text-[#0086cd] dark:text-cyan-400 font-extrabold">{docName}</span>
          </div>

          <Link
            to="/search"
            className="text-xs font-bold text-[#0086cd] dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
          >
            <span>{isAr ? '‹ العودة إلى قائمة الأطباء' : '‹ Retour aux résultats'}</span>
          </Link>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">

        {/* PRACTITIONER HERO HEADER CARD */}
        <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-5 sm:p-6 md:p-6 lg:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xl relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row gap-5 md:gap-7 lg:gap-8 items-center md:items-start relative z-10">

            {/* Avatar & Status - Compact Framed Photo */}
            <div 
              id="doc-hero-avatar-container"
              onClick={() => {
                if (isDoctorOwner) setShowEditModal(true);
              }}
              className={`relative shrink-0 mx-auto md:mx-0 w-full sm:w-[260px] md:w-[280px] lg:w-[340px] h-[220px] sm:h-[250px] md:h-[280px] p-2 rounded-[24px] bg-white dark:bg-slate-900 border-2 border-teal-300/80 dark:border-teal-700/80 shadow-sm flex flex-col group ${isDoctorOwner ? 'cursor-pointer' : ''}`}
              title={isDoctorOwner ? (isAr ? 'انقر على الصورة لتعديل ملف الطبيب' : 'Cliquez sur la photo pour modifier le profil du praticien') : docName}
            >
              <div className="relative w-full h-full flex-1 min-h-0 rounded-[18px] overflow-hidden">
                <img
                  id="doc-hero-avatar"
                  src={resolveAvatar(doctor.avatar)}
                  onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                  alt={docName}
                  className={`w-full h-full object-cover object-top sm:object-center ${isDoctorOwner ? 'group-hover:scale-101' : ''} transition-all`}
                />

                {/* Hover Edit Overlay - only visible for doctor owner */}
                {isDoctorOwner && (
                  <div className="absolute inset-0 rounded-[18px] bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white gap-1.5 p-2 text-center select-none">
                    <Camera className="w-6 h-6 text-teal-300 animate-pulse" />
                    <span className="text-xs font-black bg-[#00A896] px-3 py-1 rounded-xl shadow-md">
                      {isAr ? 'تعديل الملف' : 'Modifier le profil'}
                    </span>
                  </div>
                )}
              </div>

              {/* Verified checkmark badge in bottom-right corner */}
              <span
                className="absolute bottom-3 right-3 w-5 h-5 sm:w-5.5 sm:h-5.5 bg-[#00A896] dark:bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md z-10"
                title={isAr ? 'متاح لحجز المواعيد' : 'Disponible pour prise de RDV'}
              >
                ✓
              </span>
            </div>

            {/* Details - Shifted to the right with comfortable breathing room */}
            <div className="space-y-2.5 sm:space-y-3 flex-1 text-center md:text-start rtl:text-right rtl:md:text-right min-w-0 doc-hero-details md:pl-2 lg:pl-3 rtl:md:pl-0 rtl:md:pr-2 rtl:lg:pr-3">

              {/* Badges Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-2 doc-hero-badges">
                {doctor.cnam && (
                  <span
                    id="doc-hero-cnam-badge"
                    className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    🏛️ {isAr ? 'متعاقد مع الكنام (CNAM)' : 'Conventionné CNAM'}
                  </span>
                )}
                {doctor.telehealth && (
                  <span
                    id="doc-hero-telehealth-badge"
                    className="bg-cyan-50 dark:bg-cyan-950/50 text-[#0086cd] dark:text-cyan-300 border border-cyan-200/90 dark:border-cyan-800/80 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    🎥 {isAr ? 'استشارة طبية عن بعد متاحة' : 'Téléconsultation vidéo disponible'}
                  </span>
                )}
                <span className="bg-cyan-50/90 dark:bg-cyan-950/50 text-[#0086cd] dark:text-cyan-300 border border-cyan-200/90 dark:border-cyan-800/80 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  📍 {isAr ? 'ممارس معتمد ومسجل' : 'Praticien Vérifié Maw2idi'}
                </span>
                {/* Edit Button - only visible for doctor of this profile */}
                {isDoctorOwner && (
                  <button
                    type="button"
                    id="doc-profile-edit-btn"
                    onClick={() => setShowEditModal(true)}
                    className="bg-[#00A896] hover:bg-teal-700 text-white text-xs font-black px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer ml-auto rtl:ml-0 rtl:mr-auto"
                    title="Modifier les données du praticien"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل الملف' : 'Modifier le profil'}</span>
                  </button>
                )}
              </div>

              {/* Name with Proper BiDi Direction */}
              <div>
                <h1 id="doc-hero-name" className="text-2xl sm:text-3xl md:text-[32px] font-black text-[#002b49] dark:text-white leading-tight flex items-center justify-center md:justify-start rtl:md:justify-start gap-2 flex-wrap">
                  <span>{docName}</span>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0086cd] dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor" title="Certifié">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </h1>

                <p id="doc-hero-spec" className="text-base sm:text-lg font-bold text-[#0086cd] dark:text-cyan-400 mt-0.5">
                  {docSpec}
                </p>
              </div>

              {/* Title & Ordre */}
              <p
                id="doc-hero-title"
                className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-center md:justify-start rtl:md:justify-start gap-2 flex-wrap"
              >
                <span>🎓 {displayedTitle}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span id="doc-hero-ordre" className="font-bold text-slate-700 dark:text-slate-300">
                  {doctor.ordreId 
                    ? (isAr ? <>عمادة الأطباء: <bdi dir="ltr">{doctor.ordreId}</bdi></> : (String(doctor.ordreId).toLowerCase().startsWith('ordre') ? doctor.ordreId : `Ordre ${doctor.ordreId}`)) 
                    : (isAr ? <>عمادة الأطباء: <bdi dir="ltr">N° 17482</bdi></> : 'Ordre N° 17482')}
                </span>
              </p>

              {/* Address */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center justify-center md:justify-start rtl:md:justify-start gap-1.5 font-medium">
                <span className="text-rose-500">📍</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{docAddress}</span>
              </p>

              {/* Metrics Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-3 sm:gap-4 pt-1 text-sm font-bold text-slate-700 dark:text-slate-300 doc-hero-metrics">
                {ENABLE_REVIEWS && (
                  <span
                    onClick={() => {
                      const target = document.getElementById('section-avis') || document.getElementById('doc-reviews-title');
                      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-1 text-amber-500 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-3.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-2xs cursor-pointer transition-colors"
                    title={isAr ? 'عرض تقييمات المرضى' : 'Voir les avis des patients'}
                  >
                    <span id="doc-hero-rating" className="font-black text-amber-500">★ {doctor.rating ? Number(doctor.rating).toFixed(2) : '5.00'}</span>
                    <span id="doc-hero-reviews" className="text-slate-500 dark:text-slate-400 font-semibold">({doctor.reviewsCount || 1} {isAr ? 'تقييم' : 'avis'})</span>
                  </span>
                )}

                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-[#071322] px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span id="doc-hero-fee-label" className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? '💳 التعريفة :' : '💳 Tarif :'}</span>
                  <span id="doc-hero-fee" className="font-black text-[#0086cd] dark:text-cyan-400">{isAr ? `${doctor.fee || 80} د.ت` : `${doctor.fee || 80} TND`}</span>
                </span>

                {doctor.cnam && (
                  <span
                    id="doc-hero-cnam-reimb"
                    className="text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 font-bold shadow-2xs"
                  >
                    {isAr ? `تغطية الكنام : ~${doctor.cnamReimbursement || 49} د.ت` : `Prise en charge CNAM : ~${doctor.cnamReimbursement || 49} TND`}
                  </span>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('booking-widget-title')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#0086cd] hover:bg-[#0074b3] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>🗓️</span>
                  <span>{isAr ? 'حجز موعد الآن' : 'Prendre Rendez-vous'}</span>
                </button>
                <a
                  href={`tel:${String(doctor.phone || '+21671999888').replace(/\s+/g, '')}`}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-2xs"
                >
                  <span className="text-pink-600">📞</span>
                  <bdi dir="ltr" className="tabular-nums font-mono font-bold inline-block">{formatTunisianPhone(doctor.phone || '+216 71 999 888')}</bdi>
                </a>
                {ENABLE_REVIEWS && (
                  <button
                    type="button"
                    id="btn-scroll-donner-avis"
                    onClick={() => {
                      const target = document.getElementById('section-avis') || document.getElementById('doc-reviews-title');
                      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span className="text-amber-500">⭐</span>
                    <span>{isAr ? 'تقييم الطبيب' : 'Donner un avis'}</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT (LEFT: CABINET BIO & MAP | RIGHT: STICKY BOOKING WIDGET) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: CABINET DETAILED INFO (7 COLS) */}
          <div className="lg:col-span-7 space-y-8 min-w-0">

            {/* SECTION 1: PRÉSENTATION & BIOGRAPHIE */}
            <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#002b49] dark:text-white flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-[#0086cd] dark:text-cyan-300 flex items-center justify-center text-lg shrink-0 overflow-hidden" title="Médecin Praticien">
                    <span className="text-xl">🩺</span>
                  </span>
                  <span id="doc-sec1-title">
                    {isAr ? 'تقديم العيادة والسيرة المهنية' : 'Présentation du Cabinet & Biographie'}
                  </span>
                </h2>

                {/* Real-time translation status badge */}
                <div className="flex items-center gap-2">
                  {isTranslatingBio ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950/60 text-[#0086cd] dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-[#0086cd] animate-ping"></span>
                      <span>{isAr ? 'ترجمة فورية جارية...' : 'Traduction en temps réel...'}</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                      title={isAr ? 'تمت ترجمة النص فورياً عند تبديل اللغة' : 'Texte traduit en temps réel'}
                    >
                      <span>✨</span>
                      <span>{isAr ? 'ترجمة فورية' : 'Traduction en temps réel'}</span>
                    </span>
                  )}
                </div>
              </div>

              <p id="doc-bio-text" className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line">
                {displayedPresentation}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 dark:bg-[#071322] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 id="doc-diplomas-header" className="text-xs sm:text-sm font-black text-[#0086cd] dark:text-cyan-400 uppercase tracking-wider">
                      {isAr ? '🎓 الشهادات والتكوين' : '🎓 Diplômes & Formation'}
                    </h4>
                    {isTranslatingDiplomas && (
                      <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">✨</span>
                    )}
                  </div>
                  <ul id="doc-diplomas-list" className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 space-y-2">
                    {displayedDiplomas && displayedDiplomas.length > 0 ? (
                      displayedDiplomas.map((dip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{dip}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'شهادة دولة دكتور في الطب (تونس)' : "Diplôme d'État de Docteur en Médecine"}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'شهادة تكميلية في تخطيط وصدى القلب' : "Diplôme d'Échocardiographie et Imagerie Médicale"}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'عضو الجمعية التونسية لأمراض القلب' : 'Membre de la Société Tunisienne de Médecine'}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="bg-slate-50 dark:bg-[#071322] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 id="doc-equipment-header" className="text-xs sm:text-sm font-black text-[#0086cd] dark:text-cyan-400 uppercase tracking-wider">
                      {isAr ? '🔬 تجهيزات العيادة' : '🔬 Équipements du Cabinet'}
                    </h4>
                    {isTranslatingEquipment && (
                      <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">✨</span>
                    )}
                  </div>
                  <ul id="doc-equipment-list" className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 space-y-2">
                    {displayedEquipment && displayedEquipment.length > 0 ? (
                      displayedEquipment.map((eq, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{eq}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'فحص بالموجات فوق الصوتية عالي الدقة 4D' : 'Échocardiographie 4D Haute Définition'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'جهاز هولتر تخطيط 24 ساعة' : 'Dispositif Holter MAPA 24h'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#0086cd] dark:text-cyan-400 select-none shrink-0 leading-relaxed">•</span>
                          <span className="flex-1 leading-relaxed">{isAr ? 'تخطيط كهربائي للقلب رقمي (ECG)' : 'Électrocardiogramme Numérique (ECG)'}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5 text-xs sm:text-sm font-black">
                <span id="doc-badge-languages" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {isAr 
                    ? `🗣️ اللغات : ${doctor.languagesAr || resolveMedicalTerm(doctor.languages, 'ar') || doctor.languages || 'العربية، الفرنسية، الإنجليزية'}`
                    : `🗣️ Langues : ${doctor.languages || 'Français, Arabe, Anglais'}`}
                </span>
                <span id="doc-badge-pmr" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {isAr 
                    ? `♿ ${doctor.accessibilityAr || resolveMedicalTerm(doctor.accessibility, 'ar') || doctor.accessibility || 'وصول ميسر لذوي الاحتياجات الخاصة / مصعد طابق 2'}`
                    : `♿ ${doctor.accessibility || 'Accès PMR / Ascenseur Étage 2'}`}
                </span>
              </div>
            </div>

            {/* SECTION 2: ACCÈS, MAP LEAFLET & LOCALISATION */}
            <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#002b49] dark:text-white flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 flex items-center justify-center text-lg shrink-0">
                    <img src="/images/place.png" alt="" className="w-5 h-5 object-contain" />
                  </span>
                  <span id="doc-sec2-title">
                    {isAr ? "العنوان وخريطة الوصول" : "Adresse & Plan d'Accès"}
                  </span>
                </h2>

                {/* Google Maps Itinerary Button in Header */}
                {(() => {
                  const coords = getDoctorCoordinates(doctor);
                  const gUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                  return (
                    <a
                      href={gUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="btn-google-maps-itinerary"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#0086cd] to-[#00a896] hover:from-[#0074b3] hover:to-[#008f80] shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                      title={isAr ? "فتح المسار في خرائط Google" : "Ouvrir l'itinéraire Google Maps"}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                      </svg>
                      <span>{isAr ? 'فتح المسار في Google Maps' : "Itinéraire Google Maps"}</span>
                    </a>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <p id="doc-full-address" className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2 leading-relaxed">
                  <span>📍 {docAddress}</span>
                </p>
                <p id="doc-address-landmark" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pl-6 rtl:pl-0 rtl:pr-6">
                  {isAr
                    ? '💡 علامة مميزة : مقابل المركز الطبي. مأوى سيارات مجاني متاح بالقرب من العيادة.'
                    : '💡 Repère : En face du centre médical. Parking disponible à proximité.'}
                </p>
              </div>

              {/* Interactive Leaflet Map Container */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative h-64 sm:h-72 w-full group">
                <div ref={mapContainerRef} className="w-full h-full z-10"></div>

                {/* Floating Google Maps Overlay Button */}
                {(() => {
                  const coords = getDoctorCoordinates(doctor);
                  const gUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                  return (
                    <a
                      href={gUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 bg-white/95 dark:bg-[#0c1a2e]/95 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 font-black text-xs flex items-center gap-2 hover:bg-white dark:hover:bg-[#0c1a2e] hover:text-[#0086cd] transition-all cursor-pointer backdrop-blur-md active:scale-95"
                      title={isAr ? "فتح المسار في Google Maps" : "Ouvrir l'itinéraire Google Maps"}
                    >
                      <img src="https://www.gstatic.com/images/branding/product/1x/maps_64dp.png" alt="Google Maps" className="w-4 h-4 object-contain" />
                      <span>{isAr ? 'المسار عبر Google Maps' : 'Itinéraire Google Maps'}</span>
                      <span className="text-[#0086cd] font-black">↗</span>
                    </a>
                  );
                })()}
              </div>
            </div>

            {/* SECTION 3: TARIFS, CNAM & PAIEMENT */}
            <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors duration-300">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#002b49] dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="w-8 h-8 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                  <img src="/images/payment.png" alt="" className="w-5 h-5 object-contain" />
                </span>
                <span id="doc-sec3-title">
                  {isAr ? 'التعريفات واسترجاع مصاريف الكنام' : 'Tarifs & Remboursement CNAM'}
                </span>
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm sm:text-base font-bold">
                <div className="py-3.5 flex justify-between items-center">
                  <span id="tariff-consult-label" className="text-slate-800 dark:text-slate-200">
                    {isAr ? 'عيادة طبية متخصصة' : 'Consultation Spécialisée'}
                  </span>
                  <span id="tariff-fee" className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                    {doctor.fee || 70} TND
                  </span>
                </div>
                <div className="py-3.5 flex justify-between items-center">
                  <span id="tariff-cnam-label" className="text-slate-800 dark:text-slate-200">
                    {isAr ? 'تغطية واسترجاع الكنام (CNAM)' : 'Prise en charge CNAM (Remboursement)'}
                  </span>
                  <span id="tariff-cnam" className="font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm sm:text-base">
                    ~{doctor.cnamReimbursement || 49} TND
                  </span>
                </div>
                <div className="py-3.5 flex justify-between items-center">
                  <span id="tariff-reste-label" className="text-slate-800 dark:text-slate-200">
                    {isAr ? 'المبلغ المتبقي على عاتق المريض' : 'Reste à charge patient (Après CNAM)'}
                  </span>
                  <span id="tariff-reste" className="font-black text-[#0086cd] dark:text-cyan-400 text-base sm:text-lg">
                    ~{Math.max(0, (doctor.fee || 70) - (doctor.cnamReimbursement || 49))} TND
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#071322] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                <div id="tariff-payment-title" className="text-[#0086cd] dark:text-cyan-400 uppercase tracking-wider text-xs sm:text-sm font-black">
                  {isAr ? 'طرق الدفع المقبولة في العيادة :' : 'Modes de Paiement Acceptés au Cabinet :'}
                </div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <span id="tariff-pay-cash" className="bg-white dark:bg-[#0c1a2e] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-slate-200 font-bold">
                    💵 {isAr ? 'نقداً (دينار تونسي)' : 'Espèces (TND)'}
                  </span>
                  <span id="tariff-pay-cnam" className="bg-white dark:bg-[#0c1a2e] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-slate-200 font-bold">
                    🧾 {isAr ? 'بطاقة واسترجاع كنام مباشر' : 'Bordereau CNAM Direct'}
                  </span>
                  <span id="tariff-pay-flouci" className="bg-white dark:bg-[#0c1a2e] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-slate-200 font-bold">
                    📱 {isAr ? 'تطبيق Flouci Mobile Pay' : 'Flouci Mobile Pay'}
                  </span>
                  <span id="tariff-pay-d17" className="bg-white dark:bg-[#0c1a2e] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-slate-200 font-bold">
                    📮 {isAr ? 'البريد التونسي D17' : 'La Poste D17'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: AVIS VÉRIFIÉS PATIENTS & NOTATION MULTI-CRITÈRES */}
            {ENABLE_REVIEWS && (
            <div id="section-avis" className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 scroll-mt-24 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-lg shrink-0 border border-amber-100 dark:border-amber-800 shadow-2xs">
                    <img src="/images/stars.png" className="w-6 h-6 object-contain" alt="" />
                  </span>
                  <div>
                    <h2 id="doc-reviews-title" className="text-xl sm:text-2xl font-extrabold text-[#002b49] dark:text-white leading-tight">
                      {isAr ? 'الآراء والتقييمات المعتمدة' : 'Avis & Évaluations'}
                    </h2>
                    <p id="doc-reviews-subtitle" className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-bold">
                      {isAr ? 'تجارب مرضى حقيقية وموثقة 100% بعد العيادة' : "Retours d'expérience 100% vérifiés après consultation"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenReviewModal}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm sm:text-base px-5 py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <span id="doc-write-review-btn-text">
                    ✍️ {isAr ? 'كتابة تقييم' : 'Laisser un avis'}
                  </span>
                </button>
              </div>

              {/* Overall Score & Criteria Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/80 dark:bg-[#071322] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                {/* Left: Big Score & Stars */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-[#0c1a2e] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
                  <div id="reviews-global-score" className="text-4xl sm:text-5xl font-black text-amber-500 tracking-tight">
                    {doctor.rating || 4.92}
                  </div>
                  <div id="reviews-global-stars" className="text-amber-400 text-lg sm:text-xl tracking-widest font-black">★★★★★</div>
                  <p id="reviews-global-count" className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? `بناءً على ${doctor.reviewsCount || 142} تقييماً Évaluations par Axe Médical
` : `Basé sur ${doctor.reviewsCount || 142} avis`}
                  </p>
                  <span className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span id="doc-reviews-recom-badge">
                      {isAr ? '98% نسبة توصية إيجابية' : '98% de recommandation'}
                    </span>
                  </span>
                </div>

                {/* Right: 4 Detailed Criteria Progress Gauges */}
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Criterion 1: Ponctualité */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span>⏱️</span>
                        <span id="crit-punc-text">{isAr ? 'الانضباط والانتظار' : 'Ponctualité & Attente'}</span>
                      </span>
                      <span id="crit-punctuality-score" className="text-amber-500 font-black">4.9 / 5</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div id="crit-punctuality-bar" className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: '98%' }}></div>
                    </div>
                  </div>

                  {/* Criterion 2: Écoute & Clarté */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span>👂</span>
                        <span id="crit-list-text">{isAr ? 'الاستماع وحسن التواصل' : 'Écoute & Pédagogie'}</span>
                      </span>
                      <span id="crit-listening-score" className="text-emerald-600 dark:text-emerald-400 font-black">5.0 / 5</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div id="crit-listening-bar" className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  {/* Criterion 3: Propreté & Cadre */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span>🏢</span>
                        <span id="crit-hyg-text">{isAr ? 'الاستقبال ونظافة المكان' : 'Accueil & Propreté'}</span>
                      </span>
                      <span id="crit-hygiene-score" className="text-amber-500 font-black">4.9 / 5</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div id="crit-hygiene-bar" className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: '98%' }}></div>
                    </div>
                  </div>

                  {/* Criterion 4: Qualité des soins */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span>🩺</span>
                        <span id="crit-care-text">{isAr ? 'جودة ونجاعة العلاج' : 'Qualité des Soins'}</span>
                      </span>
                      <span id="crit-care-score" className="text-emerald-600 dark:text-emerald-400 font-black">5.0 / 5</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div id="crit-care-bar" className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews Filter Pills Bar */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 text-xs sm:text-sm no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveReviewFilter('all')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-black ${
                    activeReviewFilter === 'all'
                      ? 'bg-slate-900 dark:bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isAr ? 'الكل' : 'Tous'} ({reviewsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewFilter('5star')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-black ${
                    activeReviewFilter === '5star'
                      ? 'bg-slate-900 dark:bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ★ {isAr ? '5 نجوم' : '5 étoiles'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewFilter('comments')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-black ${
                    activeReviewFilter === 'comments'
                      ? 'bg-slate-900 dark:bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  💬 {isAr ? 'مع تعليقات' : 'Avec commentaires'}
                </button>
              </div>

              {/* Dynamic Reviews Cards Container */}
              <div id="doctor-reviews-container" className="space-y-4 min-w-0">
                {filteredReviews.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/70 dark:bg-[#071322] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'لا توجد تقييمات معتمدة لهذا القسم حالياً' : 'Aucun avis disponible pour ce filtre'}</p>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{isAr ? 'كن أول من يترك تقييماً لهذا الطبيب' : 'Soyez le premier à laisser un avis pour ce praticien.'}</p>
                    <div>
                      <button
                        type="button"
                        onClick={handleOpenReviewModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-black text-xs sm:text-sm transition-colors cursor-pointer"
                      >
                        <span>✍️</span>
                        <span>{isAr ? 'كتابة أول تقييم' : 'Laisser le premier avis'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredReviews.map((rev) => (
                  <div key={rev.id} className="bg-slate-50 dark:bg-[#071322] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          {isAr && rev.patientNameAr ? rev.patientNameAr : rev.patientName}
                        </span>
                        {rev.verified && (
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                            ✓ {isAr ? 'مريض مؤكد' : 'Vérifié'}
                          </span>
                        )}
                        <span className="text-sm text-amber-500 font-black">
                          {'★'.repeat(Math.round(rev.rating))}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        {isAr && rev.dateAr ? rev.dateAr : rev.date}
                      </span>
                    </div>

                    {/* Points Forts Marquants Pills */}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {rev.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#065F46] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {((isAr && rev.commentAr) || rev.comment) && (
                      <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-semibold break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line">
                        {isAr && rev.commentAr ? rev.commentAr : rev.comment}
                      </p>
                    )}

                    {/* Réponse du Médecin (Cachée par défaut, affichée via lien) */}
                    {rev.reply && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => toggleShowReply(rev.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A896] dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer py-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span>
                            {expandedReplies[rev.id]
                              ? (isAr ? 'إخفاء رد الطبيب' : 'Masquer la réponse')
                              : (isAr ? 'عرض رد الطبيب' : 'Afficher la réponse')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {expandedReplies[rev.id] ? '▲' : '▼'}
                          </span>
                        </button>

                        {expandedReplies[rev.id] && (
                          <div className="mt-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 text-xs sm:text-sm space-y-1 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                              <span className="flex items-center gap-1.5">
                                <span>🧑‍⚕️</span>
                                <span>{rev.reply.author || (isAr ? `رد ${docName}` : `Réponse du Dr. ${cleanDocName}`)} :</span>
                              </span>
                              {rev.reply.date && <span className="text-slate-500 font-normal">{rev.reply.date}</span>}
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 italic font-semibold leading-relaxed">
                              {rev.reply.text}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          )}

        </div>

        {/* RIGHT COLUMN: STICKY BOOKING WIDGET (5 COLS) */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">

            <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors duration-300">

              <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <h3 id="booking-widget-title" className="text-lg sm:text-xl font-black text-[#002b49] dark:text-white">
                  {isAr ? 'حجز موعد عبر الإنترنت' : 'Prise de Rendez-vous en Ligne'}
                </h3>
                <p id="booking-widget-sub" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? 'اختر موعداً متاحاً في الجدول أدناه' : 'Choisissez un créneau horaire disponible ci-dessous'}
                </p>

                {/* Real-time Delay Synchronization Status */}
                <div className="pt-1 flex items-center justify-center">
                  {delayMinutes > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-in fade-in">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>{isAr ? `⏱️ تأخير بالعيادة اليوم: +${delayMinutes} دقيقة` : `⏱️ Retard estimé au cabinet : +${delayMinutes} min`}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{isAr ? '🟢 العيادة تعمل في الموعد المحدد' : '🟢 Le cabinet fonctionne à l\'heure'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Days Header & Sliding Navigator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <button
                    type="button"
                    onClick={() => setCalendarOffset((prev) => Math.max(0, prev - 5))}
                    disabled={calendarOffset === 0}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-[#0086cd] dark:hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-black text-sm"
                    title={isAr ? 'الأيام السابقة' : 'Jours précédents'}
                  >
                    ‹ {isAr ? 'السابق' : 'Préc.'}
                  </button>

                  <span className="text-[11px] sm:text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                    {isAr ? '📅 5 أيام متتالية' : '📅 5 jours disponibles'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCalendarOffset((prev) => prev + 5)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-[#0086cd] dark:hover:text-cyan-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-black text-sm"
                    title={isAr ? 'الأيام التالية' : 'Jours suivants'}
                  >
                    {isAr ? 'التالي' : 'Suiv.'} ›
                  </button>
                </div>

                {/* 5-Day Columns Header */}
                <div className="grid grid-cols-5 gap-1.5 text-center border-b border-slate-200/60 dark:border-slate-800 pb-3" id="calendar-header-grid">
                  {calendarDays.map((d, idx) => (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-xl border ${
                        d.isToday
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-[#0086cd] dark:text-cyan-300'
                          : 'bg-slate-50 dark:bg-[#071322] border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-[10.5px] sm:text-[11px] font-bold uppercase truncate">{d.dayName}</div>
                      <div className="text-xs sm:text-sm font-black mt-0.5">{d.dateNum}</div>
                    </div>
                  ))}
                </div>

                {/* Period Selector Filter when expanded */}
                {showAllSlots && (
                  <div className="flex items-center justify-center gap-1.5 pt-1 pb-1 animate-in fade-in duration-200">
                    <button
                      type="button"
                      onClick={() => setSlotPeriodFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-extrabold transition-all cursor-pointer ${
                        slotPeriodFilter === 'all'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isAr ? 'الكل' : 'Tous'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotPeriodFilter('morning')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        slotPeriodFilter === 'morning'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>🌅</span>
                      <span>{isAr ? 'الصباح' : 'Matin'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotPeriodFilter('afternoon')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        slotPeriodFilter === 'afternoon'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>🌇</span>
                      <span>{isAr ? 'بعد الظهر' : 'Après-midi'}</span>
                    </button>
                  </div>
                )}

                {/* Time Slots Grid with Controlled Scrollbar Container */}
                <div
                  className={`pt-1 transition-all ${
                    showAllSlots
                      ? 'max-h-[260px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-[#0086cd]'
                      : ''
                  }`}
                  style={showAllSlots ? { scrollbarWidth: 'thin', scrollbarColor: '#0086cd #f1f5f9' } : {}}
                >
                  <div className="grid grid-cols-5 gap-1.5 text-center" id="calendar-slots-grid">
                    {calendarDaysWithSlots.map((d, colIdx) => {
                      if (d.isClosed) {
                        return (
                          <div key={colIdx} className="space-y-1.5 min-w-0">
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800" title="Cabinet fermé ce jour">
                              {isAr ? 'مغلق' : 'Fermé'}
                            </div>
                          </div>
                        );
                      }

                      if (d.onLeave) {
                        return (
                          <div key={colIdx} className="space-y-1.5 min-w-0">
                            <div className="text-[10.5px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 py-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900" title={d.leaveReason || 'En congé'}>
                              {isAr ? 'عطلة' : 'En congé'}
                            </div>
                          </div>
                        );
                      }

                      let periodSlots = d.slots || [];
                      if (showAllSlots && slotPeriodFilter === 'morning') {
                        periodSlots = periodSlots.filter(s => {
                          const h = parseInt(s.time.split(':')[0], 10);
                          return h < 13;
                        });
                      } else if (showAllSlots && slotPeriodFilter === 'afternoon') {
                        periodSlots = periodSlots.filter(s => {
                          const h = parseInt(s.time.split(':')[0], 10);
                          return h >= 13;
                        });
                      }

                      const visibleSlots = showAllSlots ? periodSlots : (d.slots || []).slice(0, 4);

                      return (
                        <div key={colIdx} className="space-y-1.5 min-w-0">
                          {visibleSlots.length > 0 ? (
                            visibleSlots.map((slot, sIdx) => {
                              if (slot.isBooked) {
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    disabled
                                    className="w-full py-1.5 px-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed line-through text-center opacity-85 select-none"
                                    title={isAr ? `الموعد ${slot.time} محجوز مسبقاً` : `Créneau de ${slot.time} déjà réservé`}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              }

                              if (slot.isBlocked) {
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    disabled
                                    className="w-full py-1.5 px-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-400 rounded-lg text-xs font-bold border border-rose-200/60 dark:border-rose-900/60 cursor-not-allowed text-center select-none"
                                    title={isAr ? `الموعد ${slot.time} غير متاح (محظور من العيادة)` : `Créneau de ${slot.time} indisponible (bloqué par le médecin)`}
                                  >
                                    {slot.time} 🔒
                                  </button>
                                );
                              }

                              if (slot.isPast) {
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    disabled
                                    className="w-full py-1.5 px-0.5 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed text-center select-none"
                                    title={isAr ? 'موعد ماضٍ' : 'Créneau passé'}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => handleOpenBooking(d, slot.time)}
                                  className="w-full py-1.5 px-1 bg-[#0086cd]/10 dark:bg-cyan-950/50 hover:bg-[#0086cd] dark:hover:bg-[#0086cd] text-[#0086cd] dark:text-cyan-300 hover:text-white dark:hover:text-white rounded-lg text-xs font-extrabold transition-all border border-cyan-200 dark:border-cyan-800 shadow-2xs hover:scale-105 cursor-pointer text-center"
                                  title={isAr ? `حجز موعد الساعة ${slot.time}` : `Réserver ce créneau à ${slot.time}`}
                                >
                                  {slot.time}
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-[11px] text-slate-400 dark:text-slate-600 font-bold py-2 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 select-none">
                              {isAr ? 'لا يوجد' : '—'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Show more/less slots toggle button if any day has > 4 slots */}
                {calendarDaysWithSlots.some(d => d.slots && d.slots.length > 4) && (
                  <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllSlots(!showAllSlots);
                        if (!showAllSlots) setSlotPeriodFilter('all');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-[#0086cd] dark:text-cyan-300 text-[11px] font-extrabold cursor-pointer transition-all border border-cyan-200/80 dark:border-cyan-800/80 active:scale-95 shadow-2xs"
                    >
                      {showAllSlots ? (
                        <>
                          <span>▲</span>
                          <span>{isAr ? 'تقليص العرض (4 مواعيد)' : 'Réduire les créneaux'}</span>
                        </>
                      ) : (
                        <>
                          <span>▼</span>
                          <span>{isAr ? 'عرض جميع المواعيد المتاحة' : 'Voir tous les créneaux disponibles'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Call Secretary Box */}
              <div className="bg-[#edf6fc] dark:bg-[#071322] p-4 rounded-2xl border border-cyan-100 dark:border-slate-800 text-center space-y-2">
                <span id="call-secretary-label" className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 block">
                  {isAr ? '📞 هل تحتاج مساعدة أو اتصالاً مباشراً؟' : "📞 Besoin d'aide ou assistance directe ?"}
                </span>
                <a
                  id="doc-phone-btn"
                  href={`tel:${String(doctor.phone || '+21671830120').replace(/\s+/g, '')}`}
                  className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span id="call-secretary-btn-text">
                    {isAr ? (<>اتصل بالسكرتارية (<bdi dir="ltr" className="tabular-nums font-mono">{formatTunisianPhone(doctor.phone || '71 830 120')}</bdi>)</>) : 'Appeler le secrétariat'}
                  </span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-sm">✓</span>
                  <span id="trust-badge-reminder-text">
                    {isAr ? 'تذكير مجاني بالموعد عبر SMS و WhatsApp' : 'Rappel de RDV gratuit par SMS & WhatsApp'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-sm">✓</span>
                  <span id="trust-badge-inpdp-text">
                    {isAr ? 'حماية البيانات الصحية الشخصية (مطابق للهيئة الوطنية INPDP)' : 'Données de santé protégées (Conforme INPDP)'}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ══════════════════════════════════════════════════════════════
          BOOKING CONFIRMATION MODAL
          ══════════════════════════════════════════════════════════════ */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 relative space-y-4 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            
            {bookingSuccessData ? (
              <div className="text-center py-4 space-y-3.5">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner font-black">
                  ✓
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {isAr ? 'تم تأكيد موعدك بنجاح!' : 'Rendez-vous Confirmé avec Succès !'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                  {isAr
                    ? `تم تسجيل حجزك مع ${docName} ليوم ${bookingDateStr} على الساعة ${bookingSlot}.`
                    : `Votre réservation avec le ${docName} le ${bookingDateStr} à ${bookingSlot} a été enregistrée.`}
                </p>

                <div className="bg-cyan-50 dark:bg-cyan-950/50 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800 text-start space-y-1 shadow-2xs">
                  <div className="text-sm sm:text-base font-extrabold text-[#002b49] dark:text-cyan-200">{docName}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-normal">{docSpec} • {docAddress}</div>
                  <div className="text-[#0086cd] dark:text-cyan-400 text-xs sm:text-sm font-bold pt-0.5">⏰ {bookingDateStr} - {bookingSlot} ({consultType})</div>
                </div>

                {bookingSuccessData.patientEmail ? (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-start space-y-1 shadow-xs">
                    <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                      <span className="text-sm">✉️</span>
                      <span>{isAr ? 'تم إرسال البريد الإلكتروني آلياً بنجاح !' : 'E-mail officiel envoyé automatiquement !'}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs font-medium leading-relaxed">
                      {isAr ? 'تم إرسال كافة تفاصيل الموعد والوصل إلى البريد الإلكتروني :' : 'Un récapitulatif officiel avec votre ticket de consultation a été expédié à l\'adresse :'}
                      <strong className="block text-slate-900 dark:text-white mt-0.5 text-xs sm:text-sm font-black break-all">{bookingSuccessData.patientEmail}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-start space-y-1 shadow-xs">
                    <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                      <span className="text-sm">✓</span>
                      <span>{isAr ? 'تم تأكيد موعدك بنجاح !' : 'Rendez-vous validé et confirmé !'}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs font-medium leading-relaxed">
                      {isAr ? 'المريض المسجل :' : 'Patient enregistré :'} <strong className="text-slate-900 dark:text-white font-black">{bookingSuccessData.patientName}</strong> {bookingSuccessData.patientPhone ? `(${bookingSuccessData.patientPhone})` : ''}
                    </p>
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? '📱 تم إرسال رسالة تأكيد إضافية عبر SMS.' : '📱 Un SMS de confirmation gratuit a également été envoyé.'}
                </p>

                {/* Direct 1-Click WhatsApp Confirmation Link */}
                {bookingSuccessData?.patientPhone && (
                  (() => {
                    const rawDigits = String(bookingSuccessData.patientPhone).replace(/\D/g, '');
                    const cleanPhone = rawDigits.length === 8 ? `216${rawDigits}` : (rawDigits.startsWith('216') ? rawDigits : `216${rawDigits}`);
                    const waMsg = isAr
                      ? `مرحباً ${bookingSuccessData.patientName} 🩺،\nتم تأكيد موعدك الطبي مع ${doctor.name || bookingSuccessData.doctorName} بنجاح.\n📅 التاريخ: ${bookingSuccessData.date}\n⏰ التوقيت: ${bookingSuccessData.time}\n📍 العنوان: ${doctor.address || 'تونس'}\nمنصة SahaTN.`
                      : `Bonjour ${bookingSuccessData.patientName} 🩺,\nVotre rendez-vous avec ${doctor.name || bookingSuccessData.doctorName} (${doctor.specialtyFr || doctor.specialty || 'Médecin'}) est confirmé.\n📅 Date: ${bookingSuccessData.date} à ${bookingSuccessData.time}\n📍 Lieu: ${doctor.address || 'Cabinet Médical, Tunisie'}\nSahaTN`;
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm flex items-center justify-center gap-2"
                      >
                        <span className="text-base">💬</span>
                        <span>{isAr ? 'فتح رسالة التأكيد عبر واتساب (WhatsApp)' : 'Ouvrir la confirmation sur WhatsApp'}</span>
                      </a>
                    );
                  })()
                )}

                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm"
                >
                  {isAr ? 'إغلاق ومتابعة' : 'Fermer'}
                </button>
              </div>
            ) : (
              <>
                {/* 1. Header: Doctor Avatar, Name & Specialty + Close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={resolveAvatar(doctor.avatar)}
                        onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                        alt={docName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-100 dark:border-slate-700 shadow-2xs"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                        {docName}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {docSpec} • {docCity}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="w-7 h-7 rounded-full bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* 2. Summary Info Box: Créneau, Honoraires, CNAM */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'الموعد المختار :' : 'Créneau sélectionné :'}
                    </span>
                    <span className="bg-[#e0f2fe] dark:bg-sky-950/80 text-[#0284c7] dark:text-sky-300 border border-sky-100 dark:border-sky-800/60 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      {bookingDateStr} à {bookingSlot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تعريفة الفحص :' : 'Honoraires consultation :'}
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {doctor.fee || 70} TND
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تغطية واسترجاع الكنام :' : 'Prise en charge CNAM :'}
                    </span>
                    <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      ~{doctor.cnamReimbursement || 49} TND
                    </span>
                  </div>
                </div>

                {bookingError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl">
                    ⚠️ {bookingError}
                  </div>
                )}

                <form onSubmit={handleConfirmBooking} className="space-y-3.5">
                  {/* 3. Beneficiary Selection */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'لمن هذا الموعد؟' : 'POUR QUI PRENEZ-VOUS CE RENDEZ-VOUS ?'}
                    </label>
                    <div className="bg-slate-100/70 dark:bg-slate-900/80 p-1 rounded-xl grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('self')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'self'
                            ? 'bg-white dark:bg-slate-800 text-[#0086cd] dark:text-cyan-400 font-extrabold shadow-xs border border-sky-100 dark:border-cyan-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/user (1).png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'لي شخصياً' : 'Pour moi-même'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('relative')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'relative'
                            ? 'bg-white dark:bg-slate-800 text-[#0086cd] dark:text-cyan-400 font-extrabold shadow-xs border border-sky-100 dark:border-cyan-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/family.png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'لقريب / طفل' : 'Pour un proche / enfant'}</span>
                      </button>
                    </div>

                    {/* Patient (Pour moi-même) */}
                    {beneficiaryType === 'self' && (
                      hasActiveAccount ? (
                        /* Compte actif : Coordonnées synchronisées */
                        <div className="border border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-xl p-2.5 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#00A896] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                              {(activeAccount?.name || activeAccount?.fullName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {activeAccount?.name || activeAccount?.fullName || ''}
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <span>📞</span>
                                <bdi dir="ltr" className="font-mono">{activeAccount?.phone || ''}</bdi>
                              </div>
                            </div>
                          </div>
                          <span className="bg-[#e6fffa] dark:bg-teal-950/80 text-[#008F80] dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            {isAr ? 'بيانات متزامنة' : 'Coordonnées synchronisées'}
                          </span>
                        </div>
                      ) : (
                        /* Aucun compte actif : 1ère ligne Nom & Prénom, ensuite Téléphone */
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                              {isAr ? 'الاسم واللقب *' : 'NOM & PRÉNOM *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              placeholder={isAr ? 'مثال: محمد بن علي' : 'Ex. Mohamed Ben Ali'}
                              className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                              {isAr ? 'رقم الهاتف *' : 'NUMÉRO DE TÉLÉPHONE *'}
                            </label>
                            <TunisianPhoneInput
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value)}
                              placeholder="+216 XX XXX XXX"
                              className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                            />
                          </div>
                        </div>
                      )
                    )}

                    {/* Relative Form (Pour un proche) */}
                    {beneficiaryType === 'relative' && (
                      <div className="bg-slate-50 dark:bg-[#071322] p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'صلة القرابة' : 'Lien de parenté'}
                            </label>
                            <select
                              value={relativeRelation}
                              onChange={(e) => setRelativeRelation(e.target.value)}
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                            >
                              <option value="ENFANT" className="bg-white dark:bg-[#0c1a2e] text-slate-800 dark:text-white">{isAr ? 'طفل / ابن' : 'Enfant'}</option>
                              <option value="PARENT" className="bg-white dark:bg-[#0c1a2e] text-slate-800 dark:text-white">{isAr ? 'أب / أم' : 'Parent (Père/Mère)'}</option>
                              <option value="CONJOINT" className="bg-white dark:bg-[#0c1a2e] text-slate-800 dark:text-white">{isAr ? 'زوج / زوجة' : 'Conjoint(e)'}</option>
                              <option value="AUTRE" className="bg-white dark:bg-[#0c1a2e] text-slate-800 dark:text-white">{isAr ? 'قريب آخر' : 'Autre proche'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'الاسم واللقب للقريب' : 'Nom & Prénom du proche'}
                            </label>
                            <input
                              type="text"
                              required
                              value={relativeName}
                              onChange={(e) => setRelativeName(e.target.value)}
                              placeholder="Ex. Yassine Ben Ali"
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {isAr ? 'رقم هاتف القريب' : 'Téléphone du proche (Optionnel)'}
                          </label>
                          <TunisianPhoneInput
                            value={relativePhone}
                            onChange={(e) => setRelativePhone(e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Consultation Type Buttons */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'طريقة الاستشارة' : 'MODE DE CONSULTATION'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConsultType('CABINET')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'CABINET'
                            ? 'border-[#38bdf8] bg-[#f0f9ff] dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">🏢</span>
                        <span>{isAr ? 'في العيادة' : 'Au Cabinet'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultType('TELECONSULTATION')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'TELECONSULTATION'
                            ? 'border-[#38bdf8] bg-[#f0f9ff] dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">📹</span>
                        <span>{isAr ? 'استشارة عن بعد' : 'Téléconsultation'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5. CNAM Carnet Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'رقم بطاقة الكنام (اختياري)' : 'NUMÉRO DE CARNET CNAM (OPTIONNEL)'}
                    </label>
                    <input
                      type="text"
                      value={cnamCarnet}
                      onChange={(e) => setCnamCarnet(e.target.value)}
                      placeholder="Ex. 12345678"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* 6. Patient Email with Instant Auto-Confirmation Badge */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {isAr ? 'البريد الإلكتروني (اختياري)' : 'ADRESSE E-MAIL (OPTIONNELLE)'}
                      </label>
                      <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span>✉️</span>
                        <span>{isAr ? 'إرسال آلي فوري' : 'ENVOI AUTOMATIQUE INSTANTANÉ'}</span>
                      </span>
                    </div>
                    <input
                      type="email"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="votre.email@exemple.com"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                    />
                    
                  </div>

                  {/* 7. Submit Button */}
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full bg-[#0086cd] hover:bg-[#0074b3] active:scale-[0.99] text-white font-extrabold py-2.5 px-4 rounded-xl shadow-md text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bookingSubmitting ? (
                      <span>{isAr ? 'جاري التأكيد...' : 'Validation en cours...'}</span>
                    ) : (
                      <span>✓ {isAr ? 'تأكيد حجز الموعد' : 'CONFIRMER MON RENDEZ-VOUS'}</span>
                    )}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          REVIEW SUBMISSION MODAL POPUP
          ══════════════════════════════════════════════════════════════ */}
      {ENABLE_REVIEWS && showReviewModal && (
        <div
          id="review-submission-modal"
          className="fixed inset-0 z-50 modal-overlay bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
        >
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-xl sm:max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-6 text-left max-h-[90vh] overflow-y-auto no-scrollbar animate-fadeIn text-slate-900 dark:text-slate-100 transition-colors duration-300">

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="modal-close-btn absolute top-5 right-5 rtl:right-auto rtl:left-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Header with Doctor Card */}
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center text-xl shrink-0 border border-amber-100 dark:border-amber-900 shadow-xs">
                ⭐
              </div>
              <div>
                <h3 id="review-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
                  {isAr ? 'تقييم استشارتك الطبية' : 'Évaluer votre consultation'}
                </h3>
                <p id="review-modal-doc-info" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {docName} • {isAr ? 'استشارة معتمدة' : 'Consultation Vérifiée'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-6">

              {/* STEP 1: GLOBAL STAR RATING */}
              <div className="bg-amber-50/60 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/60 text-center space-y-2">
                <label id="review-step1-label" className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {isAr ? 'التقييم العام لتجربتك' : 'NOTE GLOBALE DE VOTRE EXPÉRIENCE'}
                </label>
                <div
                  className="flex items-center justify-center gap-2 text-3xl sm:text-4xl py-1 cursor-pointer"
                  id="interactive-star-container"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeVal = hoverStars > 0 ? hoverStars : ratingStars;
                    const isFilled = star <= activeVal;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleSetGlobalRating(star)}
                        onMouseEnter={() => setHoverStars(star)}
                        onMouseLeave={() => setHoverStars(0)}
                        className={`star-btn transition-transform hover:scale-125 cursor-pointer ${
                          isFilled ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <p id="star-rating-label" className="text-xs font-black text-amber-700 dark:text-amber-400">
                  {getStarRatingLabel(hoverStars > 0 ? hoverStars : currentAvgScore)}
                </p>
                <input type="hidden" id="input-review-rating" value={currentAvgScore.toFixed(1)} />
              </div>

              {/* STEP 2: 4 SUB-CRITERIA RATINGS */}
              <div className="space-y-3 bg-slate-50 dark:bg-[#071322] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span id="review-step2-label" className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {isAr ? 'تقييم مفصل حسب المعايير' : 'ÉVALUATION DÉTAILLÉE PAR CRITÈRE'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Crit 1: Ponctualité */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span id="review-crit-punc-title">{isAr ? '⏱️ الانضباط والانتظار' : '⏱️ Ponctualité'}</span>
                      <span id="label-crit-punc" dir="ltr" className="font-extrabold text-amber-600 dark:text-amber-400">
                        {reviewCriteria.punctuality} / 5
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={reviewCriteria.punctuality}
                      id="input-crit-punc"
                      onChange={(e) => handleCriteriaChange('punctuality', e.target.value)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Crit 2: Écoute */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span id="review-crit-list-title">{isAr ? '👂 الاستماع وحسن التواصل' : '👂 Écoute & Clarté'}</span>
                      <span id="label-crit-list" dir="ltr" className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {reviewCriteria.bedsideManner} / 5
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={reviewCriteria.bedsideManner}
                      id="input-crit-list"
                      onChange={(e) => handleCriteriaChange('bedsideManner', e.target.value)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Crit 3: Propreté */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span id="review-crit-hyg-title">{isAr ? '🏢 الاستقبال ونظافة المكان' : '🏢 Accueil & Propreté'}</span>
                      <span id="label-crit-hyg" dir="ltr" className="font-extrabold text-amber-600 dark:text-amber-400">
                        {reviewCriteria.hygiene} / 5
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={reviewCriteria.hygiene}
                      id="input-crit-hyg"
                      onChange={(e) => handleCriteriaChange('hygiene', e.target.value)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Crit 4: Soins */}
                  <div className="bg-white dark:bg-[#0c1a2e] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span id="review-crit-care-title">{isAr ? '🩺 جودة ونجاعة العلاج' : '🩺 Qualité des Soins'}</span>
                      <span id="label-crit-care" dir="ltr" className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {reviewCriteria.careQuality} / 5
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={reviewCriteria.careQuality}
                      id="input-crit-care"
                      onChange={(e) => handleCriteriaChange('careQuality', e.target.value)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3: POSITIVE BADGES / TAGS (Multi-select) */}
              <div className="space-y-2">
                <label id="review-step3-label" className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isAr ? 'النقاط الإيجابية البارزة (اختر واحدة أو أكثر) :' : 'POINTS FORTS MARQUANTS (SÉLECTIONNEZ UN OU PLUSIEURS) :'}
                </label>
                <div className="flex flex-wrap gap-2" id="review-tags-container">
                  {REVIEW_TAGS_DEF.map((item) => {
                    const isSelected =
                      selectedReviewTags.includes(item.id) ||
                      selectedReviewTags.includes(item.labelFr) ||
                      selectedReviewTags.includes(item.labelAr);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleReviewTag(item.id)}
                        className={`review-tag-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isSelected
                            ? 'active bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-[#0086cd] dark:text-cyan-300 shadow-2xs'
                            : 'bg-slate-50 dark:bg-[#0c1a2e] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-teal-50/50'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span className="tag-label">{isAr ? item.labelAr : item.labelFr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 5: OPTIONAL COMMENT */}
              <div>
                <label
                  htmlFor="review-comment-input"
                  id="review-comment-label"
                  className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
                >
                  {isAr ? 'تعليقك (اختياري ولكنه مفيد للمجتمع)' : 'VOTRE COMMENTAIRE (FACULTATIF MAIS UTILE POUR LA COMMUNAUTÉ)'}
                </label>
                <textarea
                  id="review-comment-input"
                  rows={3}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={
                    isAr
                      ? 'شارك تجربتك : حسن الاستماع، وضوح النصائح...'
                      : "Partagez votre retour d'expérience : écoute du médecin, clarté des conseils..."
                  }
                  className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                ></textarea>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  <span id="review-btn-cancel-text">{isAr ? 'إلغاء' : 'Annuler'}</span>
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs sm:text-sm transition-all transform hover:scale-[1.02] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {reviewSubmitting ? (
                    <span>{isAr ? 'جاري التسجيل...' : 'Envoi en cours...'}</span>
                  ) : (
                    <span id="review-btn-submit-text">✓ {isAr ? 'نشر تقييمي المعتمد' : 'Publier Mon Avis'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* ════════ DOCTOR PROFILE & EDIT MODAL ════════ */}
      <DoctorProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        doctorId={id || doctor?.id || doctor?.doctorId || (user || activeUser)?.doctorId || 'doc-1'}
        initialDoctor={doctor}
        onDoctorUpdated={(updated) => {
          if (updated) {
            setApiDoctor(prev => ({ ...(prev || {}), ...updated }));
          }
        }}
      />
    </div>
  );
}