import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  PenTool, X,
  Heart, Search, Loader2, Lock, Eye, EyeOff, MapPin, Building, Phone, DollarSign, 
  CheckCircle2, Shield, ArrowRight, ArrowLeft, Check, Award, Sparkles, Navigation, Globe, Map,
  Upload, Download, FileText, GraduationCap, Plus, Trash2, Camera, User, Stethoscope, ChevronDown,
  Clock, AlertTriangle, RefreshCw
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DayNightToggle from '../components/common/DayNightToggle';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';
import SpecialtyDropdown from '../components/common/SpecialtyDropdown';
import { translateText, isArabicText } from '../services/translator';
import { getSmartDiplomaSuggestions } from '../data/medicalSuggestions';
import api from '../services/api';
import { GOVERNORATES_AR, TUNISIAN_GOVERNORATES, SPECIALTIES } from '../data/tunisiaData';
import { cleanDoctorName } from '../utils/i18nHelper';
import { reverseGeocodeFromCoordinates, searchTunisiaLocation } from '../services/geoService';
import { 
  getSubscriptionPlans, 
  getPlansPricingMap, 
  calculatePlanPricing,
  subscribeToSubscriptionChanges 
} from '../data/subscriptionsData';

// Preset doctor avatars matching DoctorProfileModal
const PRESET_DOCTOR_AVATARS = [
  { id: 'selim', labelFr: 'Dr. Selim', labelAr: 'د. سليم', url: '/images/doctor_selim.jpg' },
  { id: 'doc-m1', labelFr: 'Praticien 1', labelAr: 'طبيب 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-f1', labelFr: 'Praticienne 1', labelAr: 'طبيبة 1', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-m2', labelFr: 'Praticien 2', labelAr: 'طبيب 2', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-f2', labelFr: 'Praticienne 2', labelAr: 'طبيبة 2', url: 'https://images.unsplash.com/photo-1594824813585-055db37a8585?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-m3', labelFr: 'Praticien 3', labelAr: 'طبيب 3', url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=350&h=350&q=80' }
];

// Official SahaTN Subscription Formulas & Pricing (Dynamic & Admin-manageable)
export const PLANS_PRICING = getPlansPricingMap();


// ==========================================
// TUNISIA MAP REVERSE-GEOCODING CONSTANTS & HELPERS
// ==========================================
export { 
  ISO_TO_GOVERNORATE, 
  AR_TO_GOVERNORATE, 
  GOV_CENTROIDS, 
  findClosestGovernorate, 
  reverseGeocodeFromCoordinates,
  searchTunisiaLocation
} from '../services/geoService';

export default function DoctorOnboardingPage() {
  const { lang, toggleLanguage, t, isAr } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { login, setAuthSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse URL query params
  const searchParams = new URLSearchParams(location.search);
  const initialId = searchParams.get('id') || searchParams.get('requestId') || '';
  const initialEmail = searchParams.get('email') || '';
  const initialName = searchParams.get('name') || '';
  const initialToken = searchParams.get('token') || '';

  // Step state (1: Password, 2: Address/Workplace, 3: Subscription Offer)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State initialized with dynamic default visible plan
  const [formData, setFormData] = useState(() => {
    const plans = getSubscriptionPlans();
    const active = plans.filter(p => p.active !== false);
    const chosenList = active.length > 0 ? active : plans;
    const defaultPlan = chosenList.find(p => p.isRecommended) || chosenList[0];

    return {
      id: initialId,
      token: initialToken,
      email: initialEmail,
      name: initialName,
      // Step 1: Password
      password: '',
      confirmPassword: '',
      // Step 2: Work Address & Details
      cabName: initialName ? `Cabinet Médical Dr. ${initialName.replace(/^Dr\.\s*/i, '')}` : 'Cabinet Médical',
      address: '15 Avenue Habib Bourguiba, Résidence du Parc, 2ème étage',
      city: 'Tunis',
      postal: '1000',
      delegation: 'Centre-Ville',
      phone: '+216 71 888 999',
      fee: 70,
      cnam: 'Filière Privée',
      lat: 36.8065,
      lng: 10.1815,
      // Step 3: Profil Médical, Photo & Présentation
      avatar: '/images/doctor_selim.jpg',
      title: 'Ancien Interne des Hôpitaux de Tunis',
      specialty: 'Cardiologie & Maladies Vasculaires',
      specialty_fr: 'Cardiologie & Maladies Vasculaires',
      specialty_ar: 'أمراض القلب والأوعية الدموية',
      bio: 'Spécialiste en cardiologie clinique, échocardiographie Doppler haute résolution et suivi des pathologies cardiovasculaires. Consultation sur rendez-vous au cabinet ou téléconsultation sécurisée.',
      bioAr: '',
      diplomas: [
        "Diplôme d'État de Docteur en Médecine",
        "Diplôme d'Études Spécialisées",
        "Membre de l'Ordre des Médecins de Tunisie"
      ],
      cvFileName: '',
      cvFileData: '',
      signature: '',
      signatureData: '',
      // Step 4: Subscription Plan
      offer: defaultPlan?.id || 'pro',
      billingCycle: 'monthly'
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Request review & approval status check
  const [requestStatus, setRequestStatus] = useState(null); // null, 'PENDING', 'PENDING_DOCUMENTS', 'REJECTED', 'APPROVED'
  const [statusDoctorName, setStatusDoctorName] = useState('');
  const [statusMissingDocs, setStatusMissingDocs] = useState([]);
  const [statusReason, setStatusReason] = useState('');

  // ════════════════ 30-MINUTE ESTIMATED ONBOARDING TIMER & EXPIRATION ════════════════
  const timerStorageKey = useMemo(
    () => `sahatn_onboarding_starttime_${initialToken || initialId || initialEmail || 'default'}`,
    [initialToken, initialId, initialEmail]
  );
  const expiredStorageKey = useMemo(
    () => `sahatn_onboarding_expired_${initialToken || initialId || initialEmail || 'default'}`,
    [initialToken, initialId, initialEmail]
  );

  const calculateInitialTimer = () => {
    try {
      // 1. If marked expired in localStorage or sessionStorage, keep it expired
      const isAlreadyExpired =
        localStorage.getItem(expiredStorageKey) === 'true' ||
        sessionStorage.getItem(expiredStorageKey) === 'true';

      if (isAlreadyExpired) {
        return { initialSeconds: 0, initialExpired: true };
      }

      // 2. Cross-tab persistent start time in localStorage, fallback to sessionStorage
      let startTimestamp = null;
      const storedLocal = localStorage.getItem(timerStorageKey);
      if (storedLocal && !isNaN(parseInt(storedLocal, 10))) {
        startTimestamp = parseInt(storedLocal, 10);
      } else {
        const storedSession = sessionStorage.getItem(timerStorageKey);
        if (storedSession && !isNaN(parseInt(storedSession, 10))) {
          startTimestamp = parseInt(storedSession, 10);
          localStorage.setItem(timerStorageKey, String(startTimestamp));
        }
      }

      // 3. If first time ever opening this specific token/id, save Date.now() in localStorage
      if (!startTimestamp) {
        startTimestamp = Date.now();
        localStorage.setItem(timerStorageKey, String(startTimestamp));
        sessionStorage.setItem(timerStorageKey, String(startTimestamp));
      }

      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = Math.max(0, 1800 - elapsed);
      const expired = remaining <= 0;

      if (expired) {
        localStorage.setItem(expiredStorageKey, 'true');
        sessionStorage.setItem(expiredStorageKey, 'true');
      }

      return { initialSeconds: remaining, initialExpired: expired };
    } catch (e) {
      return { initialSeconds: 1800, initialExpired: false };
    }
  };

  const initialTimerState = useMemo(() => calculateInitialTimer(), [timerStorageKey, expiredStorageKey]);

  const [timeLeft, setTimeLeft] = useState(initialTimerState.initialSeconds);
  const [isExpired, setIsExpired] = useState(initialTimerState.initialExpired);
  const [isAlreadyFinalized, setIsAlreadyFinalized] = useState(false);
  const [isRequestingReactivation, setIsRequestingReactivation] = useState(false);
  const [reactivationReason, setReactivationReason] = useState('');
  const [reactivationSuccessMsg, setReactivationSuccessMsg] = useState('');
  const [reactivationErrorMsg, setReactivationErrorMsg] = useState('');
  const incompleteNotifiedRef = useRef(false);

  const formatTimeLeft = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Countdown timer effect based on absolute time delta (shared across tabs and immune to sleep/reload)
  useEffect(() => {
    if (isAlreadyFinalized || success || requestStatus === 'PENDING' || requestStatus === 'REJECTED' || requestStatus === 'ALREADY_FINALIZED') {
      return;
    }

    const updateTimer = () => {
      try {
        const isExp =
          localStorage.getItem(expiredStorageKey) === 'true' ||
          sessionStorage.getItem(expiredStorageKey) === 'true';

        if (isExp) {
          setTimeLeft(0);
          setIsExpired(true);
          return;
        }

        let stored = localStorage.getItem(timerStorageKey) || sessionStorage.getItem(timerStorageKey);
        if (!stored) {
          stored = Date.now().toString();
          localStorage.setItem(timerStorageKey, stored);
          sessionStorage.setItem(timerStorageKey, stored);
        }

        const startTimestamp = parseInt(stored, 10);
        const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        const remaining = Math.max(0, 1800 - elapsed);

        setTimeLeft(remaining);

        if (remaining <= 0) {
          setIsExpired(true);
          try {
            localStorage.setItem(expiredStorageKey, 'true');
            sessionStorage.setItem(expiredStorageKey, 'true');
          } catch (e) {}

          if (!incompleteNotifiedRef.current && (initialEmail || formData.email)) {
            incompleteNotifiedRef.current = true;
            api.notifyOnboardingIncomplete({
              id: formData.id || initialId,
              email: formData.email || initialEmail,
              name: formData.name || initialName,
              lastStepReached: currentStep
            }).catch(err => console.warn('Incomplete notify error:', err));
          }
        }
      } catch (e) {}
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const handleStorage = (e) => {
      if (e.key === timerStorageKey || e.key === expiredStorageKey) {
        updateTimer();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [timerStorageKey, expiredStorageKey, isAlreadyFinalized, success, requestStatus, initialEmail, formData.email, formData.id, formData.name, currentStep]);

  const handleRequestReactivation = async (e) => {
    if (e) e.preventDefault();
    setIsRequestingReactivation(true);
    setReactivationErrorMsg('');
    setReactivationSuccessMsg('');
    try {
      const res = await api.requestActivationReactivation({
        id: formData.id || initialId,
        email: formData.email || initialEmail,
        name: formData.name || initialName,
        reason: reactivationReason
      });
      if (res && res.success) {
        setReactivationSuccessMsg(
          isAr
            ? 'تم إرسال طلب إعادة تفعيل الرابط بنجاح إلى الإدارة. ستصلك رسالة بريد إلكتروني برابط جديد فور الموافقة.'
            : 'Votre demande de réactivation a été transmise à l\'administrateur. Vous recevrez un nouvel e-mail dès validation.'
        );
      } else {
        setReactivationErrorMsg(res?.message || (isAr ? 'تعذر إرسال الطلب.' : 'Erreur lors de l\'envoi de la demande.'));
      }
    } catch (err) {
      setReactivationErrorMsg(err.message || (isAr ? 'خطأ في الاتصال بالخادم.' : 'Erreur de connexion au serveur.'));
    } finally {
      setIsRequestingReactivation(false);
    }
  };

  // Step 3 specific state
  const avatarFileInputRef = useRef(null);
  const signatureFileInputRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const [showDrawSignatureModal, setShowDrawSignatureModal] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [newDiplomaInput, setNewDiplomaInput] = useState('');
  const [diplomaCategory, setDiplomaCategory] = useState('all'); // 'all', 'specialty', 'universal'
  const [diplomaSearch, setDiplomaSearch] = useState('');
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);
  const [bioPreviewAr, setBioPreviewAr] = useState('');

  // Smart diploma suggestions
  const smartDiplomas = useMemo(() => {
    return getSmartDiplomaSuggestions({
      specialty: formData.specialty,
      equipment: [],
      currentDiplomas: formData.diplomas || [],
      filterCategory: diplomaCategory === 'universal' ? 'universal' : diplomaCategory,
      searchQuery: diplomaSearch
    });
  }, [formData.specialty, formData.diplomas, diplomaCategory, diplomaSearch]);

  // ════════ SIGNATURE NUMÉRIQUE PROFESSIONNELLE (UPLOAD & TRACÉ) ════════
  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(
        isAr 
          ? 'حجم ملف الإمضاء يتجاوز الحد الأقصى (10 ميغابايت).' 
          : "Le fichier de signature dépasse la taille maximale (10 Mo)."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sigData = reader.result;
      setFormData(prev => ({
        ...prev,
        signature: sigData,
        signatureData: sigData
      }));
      setErrorMsg('');
      try {
        localStorage.setItem('sahatn_doctor_signature', sigData);
        window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { signature: sigData } }));
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = () => {
    setFormData(prev => ({ ...prev, signature: '', signatureData: '' }));
    try {
      localStorage.removeItem('sahatn_doctor_signature');
      window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { signature: '' } }));
    } catch (e) {}
  };

  const startDrawingSig = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0B1E33';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawingSig(true);
  };

  const drawSig = (e) => {
    if (!isDrawingSig) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingSig = () => {
    if (!isDrawingSig) return;
    setIsDrawingSig(false);
  };

  const clearCanvasSig = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSig = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL('image/png');
    setFormData(prev => ({
      ...prev,
      signature: sigData,
      signatureData: sigData
    }));
    setShowDrawSignatureModal(false);
    try {
      localStorage.setItem('sahatn_doctor_signature', sigData);
      window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { signature: sigData } }));
    } catch (e) {}
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg(isAr ? 'يرجى اختيار ملف صورة صالح.' : 'Veuillez sélectionner un fichier image valide.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, avatar: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleTranslateBio = async () => {
    if (!formData.bio?.trim()) return;
    setIsTranslatingBio(true);
    try {
      const sourceIsAr = isArabicText(formData.bio);
      const targetLang = sourceIsAr ? 'fr' : 'ar';
      const translated = await translateText(formData.bio, targetLang, sourceIsAr ? 'ar' : 'fr');
      if (translated) {
        setBioPreviewAr(translated);
        if (sourceIsAr) {
          setFormData(prev => ({ ...prev, bioAr: prev.bio, bio: translated }));
        } else {
          setFormData(prev => ({ ...prev, bioAr: translated }));
        }
      }
    } catch (err) {
      console.warn('Bio translation notice:', err);
    } finally {
      setIsTranslatingBio(false);
    }
  };

  const handleAddDiploma = (dipToAdd) => {
    const dip = (dipToAdd || newDiplomaInput).trim();
    if (!dip) return;
    if ((formData.diplomas || []).some(d => d.toLowerCase() === dip.toLowerCase())) {
      setNewDiplomaInput('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      diplomas: [...(prev.diplomas || []), dip]
    }));
    setNewDiplomaInput('');
  };

  const handleRemoveDiploma = (idxToRemove) => {
    setFormData(prev => ({
      ...prev,
      diplomas: (prev.diplomas || []).filter((_, i) => i !== idxToRemove)
    }));
  };

  const handleSelectSpecialty = (specObj) => {
    const frName = typeof specObj === 'string' ? specObj : (specObj?.fr || specObj?.label || '');
    const arName = typeof specObj === 'object' ? (specObj?.ar || '') : '';
    setFormData(prev => ({
      ...prev,
      specialty: frName,
      specialty_fr: frName,
      specialty_ar: arName
    }));
  };

  useEffect(() => {
    if (initialId || initialEmail) {
      api.getDoctorRequestStatus({ id: initialId, email: initialEmail, token: initialToken })
        .then(res => {
          if (res && res.success) {
            if (res.accountFinalized || res.isAlreadyFinalized || res.status === 'ALREADY_FINALIZED') {
              setIsAlreadyFinalized(true);
              setRequestStatus('ALREADY_FINALIZED');
            } else if (res.onboardingExpired || res.isExpired) {
              setIsExpired(true);
              setTimeLeft(0);
              try {
                localStorage.setItem(expiredStorageKey, 'true');
                sessionStorage.setItem(expiredStorageKey, 'true');
              } catch (e) {}
            } else {
              setRequestStatus(res.status || 'APPROVED');
              if (res.sessionStartTime) {
                const serverStart = new Date(res.sessionStartTime).getTime();
                if (!isNaN(serverStart) && serverStart > 0) {
                  const localStored = localStorage.getItem(timerStorageKey);
                  const effectiveStart = localStored ? Math.min(parseInt(localStored, 10), serverStart) : serverStart;
                  try {
                    localStorage.setItem(timerStorageKey, String(effectiveStart));
                    sessionStorage.setItem(timerStorageKey, String(effectiveStart));
                  } catch (e) {}
                  const elapsed = Math.floor((Date.now() - effectiveStart) / 1000);
                  const remaining = Math.max(0, 900 - elapsed);
                  setTimeLeft(remaining);
                  if (remaining <= 0) {
                    setIsExpired(true);
                    try {
                      localStorage.setItem(expiredStorageKey, 'true');
                      sessionStorage.setItem(expiredStorageKey, 'true');
                    } catch (e) {}
                  }
                }
              }
            }
            if (res.name) {
              setStatusDoctorName(res.name);
              setFormData(prev => ({
                ...prev,
                name: prev.name || res.name,
                email: prev.email || res.email,
                specialty: res.specialty || res.spec || prev.specialty,
                specialty_fr: res.specialty || res.spec || prev.specialty_fr,
                cabName: prev.cabName || `Cabinet Médical Dr. ${res.name.replace(/^Dr\.\s*/i, '')}`
              }));
            }
            if (res.missingDocuments) {
              setStatusMissingDocs(res.missingDocuments);
            }
            if (res.rejectionReason) {
              setStatusReason(res.rejectionReason);
            }
          }
        })
        .catch(err => {
          console.warn('[Onboarding] Error checking request status:', err);
        });
    }
  }, [initialId, initialEmail, initialToken, timerStorageKey, expiredStorageKey]);

  // Subscription plans (dynamic & synchronized with Admin in real time)
  const [availablePlans, setAvailablePlans] = useState(() => getSubscriptionPlans());

  useEffect(() => {
    return subscribeToSubscriptionChanges((updatedPlans) => {
      setAvailablePlans(updatedPlans);
    });
  }, []);

  const visiblePlans = useMemo(() => {
    const active = availablePlans.filter(p => p.active !== false);
    return active.length > 0 ? active : availablePlans;
  }, [availablePlans]);

  const selectedPlan = useMemo(() => {
    return visiblePlans.find(p => p.id === formData.offer) || visiblePlans[0] || availablePlans[0] || {
      id: 'pro',
      name: 'Pro Cabinet',
      nameAr: 'المحترفة (Pro Cabinet)',
      monthlyPrice: 99,
      discountPercentage: 15,
      annualTotal: 1009.8,
      annualMonthlyRate: 84.15,
      annualSavings: 178.2
    };
  }, [visiblePlans, availablePlans, formData.offer]);

  useEffect(() => {
    if (visiblePlans.length > 0 && !visiblePlans.some(p => p.id === formData.offer)) {
      const rec = visiblePlans.find(p => p.isRecommended) || visiblePlans[0];
      if (rec) {
        setFormData(prev => ({ ...prev, offer: rec.id }));
      }
    }
  }, [visiblePlans, formData.offer]);

  const [showMap, setShowMap] = useState(false);
  // Reverse Geocoding & Map location extraction state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [extractedInfoMsg, setExtractedInfoMsg] = useState(null);
  const [recentlyExtracted, setRecentlyExtracted] = useState(false);
  const [mapSearchText, setMapSearchText] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const geocodeTimeoutRef = useRef(null);


  // Leaflet map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Reverse Geocoding and auto-filling form data from map location
  const handleLocationExtracted = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await reverseGeocodeFromCoordinates(lat, lng, isAr);
      
      setFormData(prev => ({
        ...prev,
        lat: parseFloat(lat.toFixed(4)),
        lng: parseFloat(lng.toFixed(4)),
        city: res.city || prev.city || 'Tunis',
        delegation: res.delegation || prev.delegation || '',
        postal: res.postal || prev.postal || '1000',
        address: res.address || prev.address || ''
      }));

      // Update marker popup with extracted location details
      if (markerRef.current) {
        const popupHtml = `
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; padding: 2px;">
            <b style="color: #008F80; font-size: 12px; display: block; margin-bottom: 2px;">${formData.cabName || (isAr ? 'العيادة الطبية' : 'Cabinet Médical')}</b>
            ${res.address ? `<div style="font-weight: 600; color: #1e293b;">📍 ${res.address}</div>` : ''}
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ${res.delegation ? res.delegation + ', ' : ''}${res.city || ''} ${res.postal ? '(' + res.postal + ')' : ''}
            </div>
            <div style="font-family: monospace; font-size: 9px; color: #0d9488; margin-top: 3px;">
              Lat: ${lat.toFixed(4)} · Lng: ${lng.toFixed(4)}
            </div>
          </div>
        `;
        markerRef.current.bindPopup(popupHtml).openPopup();
      }

      const summaryParts = [res.address, res.delegation, res.city, res.postal].filter(Boolean);
      const summaryText = summaryParts.join(', ');
      setExtractedInfoMsg(summaryText || (isAr ? 'تم استخراج الإحداثيات وتعبئة العنوان بنجاح' : 'Adresse extraite et renseignée'));
      setRecentlyExtracted(true);

      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = setTimeout(() => {
        setRecentlyExtracted(false);
      }, 5000);

    } catch (err) {
      console.error('Location extraction error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search address/location in Tunisia and fly to it on the map
  const handleMapSearch = async (e) => {
    if (e) e.preventDefault();
    if (!mapSearchText.trim()) return;
    setIsSearchingMap(true);
    try {
      const top = await searchTunisiaLocation(mapSearchText.trim(), isAr);
      if (top && (top.lat !== undefined && (top.lon !== undefined || top.lng !== undefined))) {
        const newLat = parseFloat(Number(top.lat).toFixed(4));
        const newLng = parseFloat(Number(top.lon || top.lng).toFixed(4));
        
        setShowMap(true);
        setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        await handleLocationExtracted(newLat, newLng);
      } else {
        alert(isAr ? 'لم يتم العثور على موقع مطابق في تونس. يرجى تجربة كلمات بحث أخرى أو النقر على الخريطة مباشرة.' : 'Aucun lieu trouvé en Tunisie. Essayez d\'autres mots-clés ou cliquez directement sur la carte.');
      }
    } catch (err) {
      console.error('Map search error:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  // Sync if URL query parameters update
  useEffect(() => {
    if (initialEmail && !formData.email) {
      setFormData(prev => ({
        ...prev,
        id: initialId || prev.id,
        email: initialEmail,
        name: initialName || prev.name,
        token: initialToken || prev.token,
        cabName: initialName ? `Cabinet Médical Dr. ${initialName.replace(/^Dr\.\s*/i, '')}` : prev.cabName
      }));
    }
  }, [initialEmail, initialName, initialId, initialToken]);

  // Leaflet map lifecycle - fully reactive to currentStep transitions & showMap
  useEffect(() => {
    let resizeTimer1 = null;
    let resizeTimer2 = null;

    if (currentStep === 2 && showMap && mapContainerRef.current) {
      // Clean up previous map instance if any exists
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      // Clear any lingering leaflet internal id on the DOM container
      if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      const curLat = Number(formData.lat) || 36.8065;
      const curLng = Number(formData.lng) || 10.1815;

      try {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([curLat, curLng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Custom Pin Marker
        const customPinHtml = `
          <div style="width: 32px; height: 40px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
            <img src="/images/map_point1.png" style="width: 32px; height: 40px; object-fit: contain;" alt="pin" onerror="this.src='https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'" />
          </div>
        `;
        const customIcon = L.divIcon({
          className: 'sahatn-map-pin',
          html: customPinHtml,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -36]
        });

        const marker = L.marker([curLat, curLng], {
          icon: customIcon,
          draggable: true
        }).addTo(map);

        const updateCoords = (lat, lng) => {
          const roundedLat = parseFloat(lat.toFixed(4));
          const roundedLng = parseFloat(lng.toFixed(4));
          setFormData(prev => ({ ...prev, lat: roundedLat, lng: roundedLng }));
          handleLocationExtracted(roundedLat, roundedLng);
        };

        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          updateCoords(pos.lat, pos.lng);
        });

        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          updateCoords(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        resizeTimer1 = setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);

        resizeTimer2 = setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 300);
      } catch (err) {
        console.warn('Leaflet map initialization notice:', err);
      }
    }

    return () => {
      if (resizeTimer1) clearTimeout(resizeTimer1);
      if (resizeTimer2) clearTimeout(resizeTimer2);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [currentStep, showMap]);

  // Sync marker when coordinates update externally (e.g. GPS detect)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const lat = Number(formData.lat) || 36.8065;
      const lng = Number(formData.lng) || 10.1815;
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || 14);
    }
  }, [formData.lat, formData.lng]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fee') {
      const digits = String(value).replace(/\D/g, '').slice(0, 4);
      const num = digits !== '' ? parseInt(digits, 10) : '';
      setFormData(prev => ({ ...prev, fee: num }));
      setErrorMsg('');
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score += 1;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return score; // 0 to 5
  };
  const strengthScore = getPasswordStrength();

  // Validate step transitions
  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!formData.password || formData.password.length < 6) {
        setErrorMsg(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Les deux mots de passe ne correspondent pas.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.address || !formData.city) {
        setErrorMsg(isAr ? 'يرجى إدخال العنوان الكامل والولاية الخاصة بعيادتك.' : 'Veuillez renseigner l\'adresse complète et le gouvernorat de votre cabinet.');
        return;
      }
      const feeStr = String(formData.fee !== undefined && formData.fee !== null ? formData.fee : '').trim();
      const feeNum = Number(formData.fee);
      if (feeStr === '' || isNaN(feeNum)) {
        setErrorMsg(isAr ? 'يرجى إدخال تعريفة الفحص الطبي (بين 20 و 200 د.ت).' : 'Veuillez renseigner le tarif de consultation (entre 20 et 200 DT).');
        return;
      }
      if (feeNum < 20 || feeNum > 200) {
        setErrorMsg(
          isAr
            ? 'تعريفة الفحص الطبي يجب أن تكون محصورة بين 20 و 200 دينار تونسي للمتابعة.'
            : 'Le tarif de consultation doit être obligatoirement compris entre 20 DT et 200 DT pour continuer.'
        );
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  // Final Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const payload = {
        id: formData.id,
        token: formData.token,
        email: formData.email,
        name: formData.name,
        password: formData.password,
        cabName: formData.cabName,
        address: `${formData.address}, ${formData.delegation ? formData.delegation + ', ' : ''}${formData.city} (${formData.postal})`,
        city: formData.city,
        phone: formData.phone,
        fee: (formData.fee !== '' && formData.fee !== undefined && formData.fee !== null && !isNaN(Number(formData.fee)))
          ? Math.min(200, Math.max(20, parseInt(String(formData.fee).replace(/\D/g, '') || '70', 10)))
          : 70,
        cnam: formData.cnam,
        lat: parseFloat(formData.lat) || 36.8065,
        lng: parseFloat(formData.lng) || 10.1815,
        // Step 3 Profile & Presentation fields
        avatar: formData.avatar,
        title: formData.title,
        specialty: formData.specialty,
        specialtyFr: formData.specialty_fr || formData.specialty,
        specialtyAr: formData.specialty_ar || '',
        bio: formData.bio,
        bioAr: formData.bioAr || '',
        diplomas: formData.diplomas,
        cvFileName: formData.cvFileName,
        cvFileData: formData.cvFileData,
        signature: formData.signature || formData.signatureData || '',
        signatureData: formData.signatureData || formData.signature || '',
        // Step 4 Subscription Plan
        offer: formData.offer,
        billingCycle: formData.billingCycle,
        subscription: {
          plan: formData.offer,
          planName: selectedPlan?.name || (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).name,
          billingCycle: formData.billingCycle,
          monthlyPrice: formData.billingCycle === 'annual' 
            ? (selectedPlan?.annualMonthlyRate ?? (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).annualMonthlyRate) 
            : (selectedPlan?.monthlyPrice ?? (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).monthlyPrice),
          annualTotal: formData.billingCycle === 'annual' 
            ? (selectedPlan?.annualTotal ?? (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).annualTotal) 
            : ((selectedPlan?.monthlyPrice ?? (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).monthlyPrice) * 12),
          discountPercent: formData.billingCycle === 'annual' ? (selectedPlan?.discountPercentage ?? 15) : 0,
          savings: formData.billingCycle === 'annual' 
            ? (selectedPlan?.annualSavings ?? (PLANS_PRICING[formData.offer] || PLANS_PRICING.pro).annualSavings) 
            : 0,
          status: 'ACTIVE',
          trialDays: 30,
          activatedAt: new Date().toISOString()
        }
      };

      const res = await api.finalizeDoctorAccount(payload);

      if (res && res.success) {
        setSuccess(true);
        const resolvedDoctorId = res.doctor?.id || res.user?.doctorId || formData.id;
        const resolvedDoctorName = res.doctor?.name || res.user?.name || formData.name;
        const resolvedSpecialty = res.doctor?.specialtyFr || res.doctor?.specialty || res.user?.specialty || 'Médecine Générale';

        const authUser = {
          id: res.user?.id || res.user?.uuid || `usr-${Date.now()}`,
          uuid: res.user?.uuid || res.user?.id || `usr-${Date.now()}`,
          email: res.user?.email || formData.email,
          name: resolvedDoctorName,
          role: 'DOCTOR',
          doctorId: resolvedDoctorId,
          specialty: resolvedSpecialty,
          phone: res.doctor?.phone || formData.phone,
          address: res.doctor?.address || formData.address,
          city: res.doctor?.city || formData.city,
          fee: res.doctor?.fee !== undefined ? res.doctor.fee : (formData.fee !== undefined ? `${formData.fee} TND` : '70 TND'),
          avatar: res.doctor?.avatar || '/images/3ila_doctor.jpeg'
        };

        const authToken = res.token || `token-${Date.now()}`;

        localStorage.setItem('sahatn_token', authToken);
        localStorage.setItem('sahatn_user', JSON.stringify(authUser));
        localStorage.setItem('sahatn_doctor_user', JSON.stringify(authUser));
        localStorage.setItem('sahatn_doctor_authenticated', 'true');
        sessionStorage.setItem('sahatn_doctor_authenticated', 'true');

        if (setAuthSession) {
          setAuthSession(authUser, authToken);
        } else if (login) {
          try { login(authUser, authToken); } catch (e) {}
        }

        setTimeout(() => {
          navigate('/doctor/dashboard', { replace: true });
        }, 1800);
      } else {
        if (res?.code === 'ALREADY_FINALIZED') {
          setIsAlreadyFinalized(true);
          setRequestStatus('ALREADY_FINALIZED');
        }
        setErrorMsg(res?.message || (isAr ? 'حدث خطأ أثناء تفعيل حساب الطبيب.' : 'Erreur lors de la validation du compte praticien.'));
      }
    } catch (err) {
      if (err?.data?.code === 'ALREADY_FINALIZED' || err?.status === 409) {
        setIsAlreadyFinalized(true);
        setRequestStatus('ALREADY_FINALIZED');
      }
      setErrorMsg(err.message || (isAr ? 'تعذر الاتصال بالخادم.' : 'Erreur de connexion au serveur.'));
    } finally {
      setLoading(false);
    }
  };

  // Tunisian Governorates in geographical order (North to South, from Tunis to Tataouine)
  const governorates = TUNISIAN_GOVERNORATES;

  return (
    <div 
      className={`min-h-screen bg-slate-50 dark:bg-[#07131e] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 ${isAr ? 'rtl' : 'ltr'}`} 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      
      {/* ════════════════ TOP HEADER ════════════════ */}
      <header className="bg-white/80 dark:bg-[#0b1b2b]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 py-3.5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00A896] to-[#0086cd] flex items-center justify-center text-white shadow-xs">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Saha<span className="text-[#00A896]">.tn</span>
            </span>
            <span className="hidden sm:inline-block bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 ml-2 rtl:ml-0 rtl:mr-2">
              {isAr ? 'تفعيل حساب الطبيب' : 'Activation Praticien'}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <DayNightToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
              title={isAr ? 'Changer en Français' : 'التحويل إلى العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'FR' : 'AR'}</span>
            </button>
            <Link
              to="/doctor/auth"
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
            >
              {isAr ? 'هل لديك حساب مفعل؟ تسجيل الدخول' : 'Déjà configuré ? Se connecter'}
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════════ STICKY ONBOARDING COUNTDOWN TIMER ════════════════ */}
      {!isAlreadyFinalized && requestStatus !== 'ALREADY_FINALIZED' && requestStatus !== 'PENDING' && requestStatus !== 'REJECTED' && !success && (
        <div className={`sticky top-[57px] z-20 border-b backdrop-blur-md transition-all duration-300 py-2.5 px-4 sm:px-8 shadow-xs ${
          isExpired
            ? 'bg-rose-500/95 text-white border-rose-600'
            : timeLeft <= 120
            ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-900 animate-pulse'
            : timeLeft <= 300
            ? 'bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
            : 'bg-teal-50/95 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800/70'
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isExpired 
                  ? 'bg-white' 
                  : timeLeft <= 120 
                  ? 'bg-rose-500 animate-ping' 
                  : timeLeft <= 300 
                  ? 'bg-amber-500' 
                  : 'bg-teal-500'
              }`} />
              <span className="font-bold hidden sm:inline">
                {isAr ? 'جلسة تفعيل آمنة ومؤقتة (الوقت المقدر: 30 دقيقة) :' : 'Session d\'activation confidentielle (Délai estimé : 30 min) :'}
              </span>
              <span className="font-bold sm:hidden">
                {isAr ? 'مهلة التفعيل :' : 'Délai d\'activation :'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] opacity-75 hidden md:inline">
                {isExpired
                  ? (isAr ? 'انتهى الوقت المسموح للجلسة' : 'Délai imparti écoulé')
                  : timeLeft <= 120
                  ? (isAr ? 'شارف الوقت على الانتهاء !' : 'Moins de 2 minutes restantes !')
                  : (isAr ? 'الوقت المتبقي لملء البيانات :' : 'Temps restant pour finaliser :')}
              </span>
              <div className={`font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 shadow-2xs ${
                isExpired
                  ? 'bg-rose-700 text-white border-rose-400'
                  : timeLeft <= 120
                  ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                  : timeLeft <= 300
                  ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-white/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-700'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{isExpired ? (isAr ? '00:00 (منتهية)' : '00:00 (Expiré)') : formatTimeLeft(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        
        {/* SUCCESS BANNER */}
        {success && (
          <div className="mb-8 p-6 bg-emerald-500 text-white rounded-3xl shadow-xl flex items-center gap-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-black">
                {isAr ? `تهانينا د. ${cleanDoctorName(formData.name) || 'المحترم'} !` : `Félicitations Dr. ${cleanDoctorName(formData.name) || 'Praticien'} !`}
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                {isAr 
                  ? `تم حفظ كلمة المرور الخاصة بك وتحديد موقع العيادة على الخريطة وتفعيل باقة SahaTN ${formData.offer.toUpperCase()} بنجاح. جارٍ توجيهك إلى لوحة التحكم...`
                  : `Votre mot de passe est enregistré, votre cabinet est positionné sur la carte et votre offre SahaTN ${formData.offer.toUpperCase()} est activée. Redirection vers votre tableau de bord...`}
              </p>
            </div>
          </div>
        )}

        {/* REVIEW PENDING BANNER: Shown if the doctor lands on onboarding before Admin approval */}
        {requestStatus === 'PENDING' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-amber-200 dark:border-amber-900/60 shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center text-4xl shadow-inner border border-amber-200 dark:border-amber-800">
              ⏳
            </div>
            
            <div className="space-y-2">
              <span className="inline-block bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-amber-300 dark:border-amber-700">
                {isAr ? 'الملف قيد المراجعة والتدقيق' : 'Dossier en cours d\'examen'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isAr 
                  ? `أهلاً د. ${cleanDoctorName(statusDoctorName || formData.name) || ''}، طلبك قيد المراجعة` 
                  : `Bonjour Dr. ${cleanDoctorName(statusDoctorName || formData.name) || 'Praticien'}, votre dossier est en cours d'examen`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? 'تم استلام طلب تسجيلك بنجاح وهو حالياً قيد التحقق والتدقيق من قِبل إدارة منصة SahaTN وعمادة الأطباء بتونس. فور مراجعة وموافقة الإدارة على ملفك، ستتلقى بريداً إلكترونياً رسمياً يحتوي على رابط التفعيل الآمن.'
                  : `Votre demande d'adhésion praticien a bien été enregistrée et est actuellement en cours de vérification réglementaire par notre équipe de modération médicale. Dès que l'administrateur aura validé vos justificatifs, vous recevrez un email officiel contenant votre lien d'activation sécurisé.`}
              </p>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 font-medium text-left rtl:text-right space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>{isAr ? 'معلومات هامة :' : 'Information importante :'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isAr
                  ? 'لا يتعين عليك اتخاذ أي إجراء في الوقت الحالي. سيتم إشعارك تلقائياً عبر البريد الإلكتروني فور اتخاذ الإدارة قرارها.'
                  : 'Aucune action n\'est requise de votre part pour le moment. Vous serez automatiquement notifié par email dès que l\'administration aura pris sa décision.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all text-center"
              >
                {isAr ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}
              </Link>
              <Link
                to="/doctor/auth"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs shadow-md transition-all text-center"
              >
                {isAr ? 'تسجيل دخول الأطباء' : 'Espace Médecins & Connexion'}
              </Link>
            </div>
          </div>
        ) : requestStatus === 'PENDING_DOCUMENTS' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-orange-200 dark:border-orange-900/60 shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center text-4xl shadow-inner border border-orange-200 dark:border-orange-800">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <span className="inline-block bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-orange-300">
                {isAr ? 'ملف معلق في انتظار وثائق' : 'Dossier suspendu · Pièces requises'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isAr ? 'وثائق إضافية مطلوبة' : 'Pièces justificatives complémentaires requises'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? 'يرجى مراجعة البريد الإلكتروني الذي تم إرساله إليك للاطلاع على قائمة الوثائق الناقصة المطلوبة لاستكمال ملفك.'
                  : 'Des pièces justificatives complémentaires sont nécessaires pour compléter et valider votre dossier. Veuillez consulter l\'e-mail officiel qui vous a été adressé.'}
              </p>
            </div>

            {statusMissingDocs && statusMissingDocs.length > 0 && (
              <div className="bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 rounded-2xl p-4 text-xs text-orange-900 dark:text-orange-200 text-left rtl:text-right space-y-2">
                <span className="font-bold block">Pièces manquantes identifiées :</span>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  {statusMissingDocs.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs text-center"
              >
                {isAr ? 'العودة إلى الرئيسية' : 'Retour à l\'accueil'}
              </Link>
              <a
                href="mailto:support.pro@sahatn.tn"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md text-center"
              >
                {isAr ? 'مراسلة الدعم الطبي' : 'Envoyer les pièces au Support'}
              </a>
            </div>
          </div>
        ) : requestStatus === 'REJECTED' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-rose-200 dark:border-rose-900/60 shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center text-4xl shadow-inner border border-rose-200 dark:border-rose-800">
              ❌
            </div>
            
            <div className="space-y-2">
              <span className="inline-block bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-rose-300">
                {isAr ? 'طلب غير مقبول' : 'Demande non retenue'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isAr ? 'لم يتم قبول ملف التسجيل' : 'Votre demande n\'a pas été validée'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {statusReason || (isAr
                  ? 'نأسف لإبلاغكم بأن طلبكم لم يستوفِ شروط الاعتماد المحددة من قِبل الإدارة.'
                  : 'Votre demande d\'adhésion n\'a pas pu être validée selon les critères déontologiques et réglementaires en vigueur.')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/"
                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs text-center"
              >
                {isAr ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}
              </Link>
            </div>
          </div>
        ) : (isAlreadyFinalized || requestStatus === 'ALREADY_FINALIZED') ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-emerald-300 dark:border-emerald-800/80 shadow-2xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-4xl shadow-inner border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'رابط تفعيل مستخدم مسبقاً' : 'Lien à usage unique déjà validé'}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isAr ? 'تم تفعيل حساب الطبيب مسبقاً' : 'Compte Praticien Déjà Activé'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? `أهلاً د. ${cleanDoctorName(statusDoctorName || formData.name) || ''}، لقد تم استكمال جميع مراحل تفعيل وتحديد موقع عيادتكم الطبية بنجاح مسبقاً. لدواعي الأمان الطبي، لا يمكن إعادة استخدام رابط التفعيل.`
                  : `Bonjour Dr. ${cleanDoctorName(statusDoctorName || formData.name) || 'Praticien'}, toutes les étapes d'activation et de géolocalisation de votre cabinet ont déjà été complétées avec succès. Par mesure de sécurité, ce lien d'activation à usage unique n'est plus actif.`}
              </p>
            </div>

            {/* DOCTOR DETAILS TILE */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-left rtl:text-right space-y-2 max-w-md mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">{isAr ? 'حالة الحساب :' : 'Statut du compte :'}</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{isAr ? 'مفعل وفي الخدمة' : 'Actif & Opérationnel'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">{isAr ? 'الطبيب :' : 'Praticien :'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formData.name || statusDoctorName || (isAr ? 'طبيب معتمد' : 'Dr. Praticien')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">{isAr ? 'الاختصاص :' : 'Spécialité :'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formData.specialty || (isAr ? 'طبيب أخصائي' : 'Médecine Spécialisée')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">{isAr ? 'المدينة :' : 'Ville :'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formData.city || 'Tunis'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/doctor/auth"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs shadow-md transition-all text-center flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول إلى حساب الطبيب' : 'Accéder à mon Espace Praticien'}</span>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all text-center"
              >
                {isAr ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}
              </Link>
            </div>
          </div>
        ) : (isExpired && !success) ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-rose-300 dark:border-rose-900 shadow-2xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center text-4xl shadow-inner border border-rose-200 dark:border-rose-800">
              <Clock className="w-10 h-10 text-rose-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-rose-300 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{isAr ? 'انتهت مهلة الجلسة (30 دقيقة)' : 'Session Expirée (30 minutes)'}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isAr ? 'انتهت مهلة استكمال تفعيل الحساب' : 'Délai d\'activation dépassé'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? 'لدواعي الأمان الطبي وحماية البيانات، انتهت المهلة المحددة (30 دقيقة) لاستكمال إعداد كلمة المرور وتحديد موقع عيادتكم. بياناتكم ووثائقكم محفوظة بأمان. يمكنك طلب إعادة تفعيل الرابط بنقرة واحدة أدناه.'
                  : 'Par mesure de sécurité médicale et de protection des données, le délai alloué pour configurer votre mot de passe et votre cabinet (30 minutes) s\'est écoulé. Vos justificatifs restent sécurisés. Vous pouvez solliciter la réactivation immédiate de votre lien ci-dessous.'}
              </p>
            </div>

            {/* REACTIVATION REQUEST FORM */}
            <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 text-left rtl:text-right space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'ملاحظة أو سبب إضافي للإدارة (اختياري) :' : 'Remarque ou motif pour l\'administrateur (facultatif) :'}
              </label>
              <textarea
                value={reactivationReason}
                onChange={(e) => setReactivationReason(e.target.value)}
                placeholder={isAr ? 'مثال: كنت بحاجة لمزيد من الوقت لمسح الإمضاء أو إدخال العنوان...' : 'Ex: Besoin de temps supplémentaire pour numériser ma signature...'}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none resize-none h-20"
              />

              {reactivationSuccessMsg ? (
                <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{reactivationSuccessMsg}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestReactivation}
                  disabled={isRequestingReactivation}
                  className="w-full py-3 px-4 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isRequestingReactivation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جارٍ إرسال الطلب إلى الإدارة...' : 'Envoi de la demande à l\'administrateur...'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>{isAr ? 'طلب إعادة تفعيل الرابط من الإدارة' : 'Demander la réactivation du lien à l\'administrateur'}</span>
                    </>
                  )}
                </button>
              )}

              {reactivationErrorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{reactivationErrorMsg}</p>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p>{isAr ? 'للمساعدة الفورية، يمكنكم أيضاً التواصل مباشرة مع الإدارة :' : 'Pour toute assistance directe, contactez la direction médicale SahaTN :'}</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                📧 support.pro@sahatn.tn &bull; 📞 +216 71 884 900
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-block px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                {isAr ? 'العودة إلى الصفحة الرئيسية' : 'Retour à l\'accueil'}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* HERO TITLE */}
            <div className="text-center space-y-2 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 text-xs font-black uppercase tracking-wider border border-teal-200 dark:border-teal-800/80">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'استكمال تفعيل حساب الطبيب' : 'Finalisation de Compte Praticien'}</span>
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {isAr ? 'فعّل عيادتك الطبية في 4 خطوات بسيطة' : 'Activez votre Cabinet Médical en 4 Étapes'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                {isAr 
                  ? 'عيّن كلمة المرور السرية لعيادتك، أكد عنوان عيادتك، خصص ملفك المهني مع الصورة والسيرة الذاتية، ثم اختر باقة الاشتراك.' 
                  : 'Définissez votre mot de passe confidentiel, confirmez l\'adresse de votre cabinet, personnalisez votre profil avec photo et diplômes, puis sélectionnez votre formule.'}
              </p>
            </div>

            {/* ════════════════ STEPS STEPPER ════════════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-8">
              {[
                { step: 1, label: isAr ? 'كلمة المرور' : 'Mot de Passe' },
                { step: 2, label: isAr ? 'عنوان العيادة' : 'Adresse Cabinet' },
                { step: 3, label: isAr ? 'الملف والصورة' : 'Profil & Photo' },
                { step: 4, label: isAr ? 'اختيار الاشتراك' : 'Choix de l\'Offre' }
              ].map((item) => {
                const isActive = currentStep === item.step;
                const isDone = currentStep > item.step;
                return (
                  <div
                    key={item.step}
                    className={`flex items-center gap-2 sm:gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 border-[#00A896] shadow-md ring-2 ring-teal-500/10'
                        : isDone
                        ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-400'
                        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isDone 
                        ? 'bg-emerald-500 text-white' 
                        : isActive 
                        ? 'bg-[#00A896] text-white shadow-xs' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {isDone ? '✓' : item.step}
                    </div>
                    <div className="truncate">
                      <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                        {isAr ? `المرحلة ${item.step}` : `Étape ${item.step}`}
                      </span>
                      <span className={`block text-xs font-extrabold truncate ${isActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

        {/* ERROR ALERT */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <span className="text-base shrink-0">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ════════════════ CARD CONTAINER ════════════════ */}
        <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8">
          
          {/* ════════ STEP 1: PASSWORD & ACCESS ════════ */}
          {currentStep === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? '1. تعيين كلمة المرور المؤمنة' : '1. Définissez votre Mot de Passe Sécurisé'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr 
                    ? 'ستسمح لك كلمة المرور هذه بالوصول الآمن لملفك الطبي وإدارة عيادتك بكل سرية.'
                    : 'Ce mot de passe vous permettra d\'accéder en toute confidentialité à votre dossier soignant et gestion de cabinet.'}
                </p>
              </div>

              {/* Doctor Details Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">
                    {isAr ? 'المعرف / البريد الإلكتروني المهني' : 'Identifiant / E-mail professionnel'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">{formData.email || 'dr.selim.benali@sahatn.tn'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">
                    {isAr ? 'الطبيب المعني بالتفعيل' : 'Praticien Candidat'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">{formData.name || 'Dr. Selim Ben Ali'}</span>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={isAr ? '6 إلى 8 أحرف على الأقل...' : 'Minimum 6 à 8 caractères...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 pr-11 rtl:pr-4 rtl:pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {formData.password && (
                  <div className="pt-2 space-y-1">
                    <div className="flex gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-full flex-1 rounded-full transition-all ${
                            strengthScore >= lvl
                              ? strengthScore <= 2
                                ? 'bg-amber-400'
                                : strengthScore <= 3
                                ? 'bg-teal-400'
                                : 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {isAr ? 'قوة كلمة المرور : ' : 'Force du mot de passe : '}
                      {strengthScore <= 2 
                        ? (isAr ? 'ضعيفة' : 'Faible') 
                        : strengthScore <= 3 
                        ? (isAr ? 'متوسطة' : 'Moyen') 
                        : (isAr ? 'ممتازة وقوية' : 'Excellent et sécurisé')}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={isAr ? 'أعد كتابة كلمة المرور متطابقة...' : 'Retapez le mot de passe identique...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 pr-11 rtl:pr-4 rtl:pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span className="text-[10px] text-rose-500 font-bold block">
                    {isAr ? 'كلمتا المرور غير متطابقتين.' : 'Les mots de passe ne correspondent pas.'}
                  </span>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>{isAr ? 'المتابعة نحو عنوان العيادة' : 'Continuer vers l\'adresse du cabinet'}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}

          {/* ════════ STEP 2: WORK ADDRESS & MAP ════════ */}
          {currentStep === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? '2. العنوان المهني وموقع العيادة' : '2. Adresse Professionnelle & Coordonnées du Cabinet'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr 
                    ? 'ستظهر هذه المعلومات في وصفاتك الطبية وتمكّن المرضى من تحديد موقع عيادتك على الخريطة التفاعلية.'
                    : 'Ces informations figureront sur vos ordonnances et permettront aux patients de situer votre cabinet sur la carte interactive.'}
                </p>
              </div>

              {/* Cabinet Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اسم العيادة أو المصحة' : 'Dénomination du Cabinet / Clinique'}
                </label>
                <input
                  type="text"
                  name="cabName"
                  value={formData.cabName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* ════════ Map & GPS Coordinates Box ════════ */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {isAr ? 'الموقع الجغرافي للعيادة (GPS)' : 'Positionnement Géographique du Cabinet (GPS)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                    Lat: {formData.lat} · Lng: {formData.lng}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isAr 
                    ? 'سيتم تحديد موقع عيادتك على الخريطة لتمكين المرضى من العثور عليك بسهولة حسب المسافة الجغرافية.'
                    : 'Votre cabinet sera géolocalisé pour permettre la recherche par proximité kilométrique par les patients.'}
                </p>

                {/* ACTION BUTTONS: Detect GPS & Localiser sur la carte */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isGeocoding}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert(isAr ? 'متصفحك لا يدعم خاصية تحديد الموقع الجغرافي GPS.' : 'Votre navigateur ne supporte pas la géolocalisation GPS.');
                        return;
                      }
                      setIsGeocoding(true);
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = parseFloat(pos.coords.latitude.toFixed(4));
                          const lng = parseFloat(pos.coords.longitude.toFixed(4));
                          setShowMap(true);
                          setFormData(prev => ({ ...prev, lat, lng }));
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.setView([lat, lng], 15);
                          }
                          if (markerRef.current) {
                            markerRef.current.setLatLng([lat, lng]);
                          }
                          await handleLocationExtracted(lat, lng);
                        },
                        (err) => {
                          setIsGeocoding(false);
                          let msg = isAr 
                            ? 'تعذر الوصول إلى موقع GPS الخاص بجهازك. يرجى التأكد من تفعيل خدمة الموقع في متصفحك أو النقر مباشرة على الخريطة.' 
                            : 'Impossible d\'accéder à votre position GPS. Veuillez autoriser la localisation ou pointer directement sur la carte.';
                          if (err && err.code === 1) {
                            msg = isAr 
                              ? 'تم رفض إذن الوصول إلى الموقع. يرجى السماح لمتصفحك بتحديد الموقع الجغرافي.' 
                              : 'Accès à la position refusé. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.';
                          } else if (err && err.code === 3) {
                            msg = isAr ? 'انتهت مهلة استرجاع موقع GPS.' : 'Délai d\'attente GPS dépassé.';
                          }
                          alert(msg);
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                      );
                    }}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isAr ? 'تحديد موقعي التلقائي عبر GPS' : 'Détecter ma position GPS'}</span>
                  </button>

                  {/* REPLACED BUTTON: Localiser sur la carte */}
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                      showMap 
                        ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700' 
                        : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Map className={`w-3.5 h-3.5 ${showMap ? 'text-white' : 'text-[#00A896]'}`} />
                    <span>
                      {showMap 
                        ? (isAr ? 'إخفاء الخريطة' : 'Masquer la carte') 
                        : (isAr ? 'تحديد الموقع على الخريطة' : 'Localiser sur la carte')}
                    </span>
                  </button>
                </div>

                {/* EXTRACTION STATUS & LIVE NOTIFICATION */}
                {isGeocoding && (
                  <div className="mt-2 bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-pulse">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="font-semibold">
                      {isAr 
                        ? 'جاري استخراج تفاصيل العنوان، الولاية، المعتمدية والترقيم البريدي من الخريطة...' 
                        : 'Extraction des informations d\'adresse (rue, gouvernorat, délégation, code postal) depuis la carte...'}
                    </span>
                  </div>
                )}

                {!isGeocoding && recentlyExtracted && extractedInfoMsg && (
                  <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      {isAr ? 'تم ملء بيانات العنوان تلقائياً: ' : 'Adresse renseignée automatiquement : '}
                      <strong>{extractedInfoMsg}</strong>
                    </span>
                  </div>
                )}


                {/* INTERACTIVE LEAFLET MAP PANEL */}
                {showMap && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-teal-200 dark:border-teal-800 shadow-md animate-in fade-in zoom-in-95">
                    {/* Map Header */}
                    <div className="bg-teal-50 dark:bg-teal-950/70 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 dark:border-teal-900">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 dark:text-teal-300">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>
                          {isAr 
                            ? 'انقر على الخريطة أو اسحب المؤشر لتحديد موقع العيادة واستخراج العنوان تلقائياً' 
                            : 'Cliquez sur la carte ou déplacez le marqueur pour pointer votre cabinet et extraire l\'adresse'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-teal-200/60 text-xs font-bold text-teal-700 dark:text-teal-400">
                          {formData.lat}, {formData.lng}
                        </span>
                      </div>
                    </div>

                    {/* Integrated Tunisia Search Bar */}
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mapSearchText}
                          onChange={(e) => setMapSearchText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleMapSearch(e)}
                          placeholder={isAr ? 'ابحث عن منطقة، حي، أو شارع في تونس (مثال: حي النصر، سهلول، ضفاف البحيرة 2)...' : 'Rechercher un quartier ou une adresse en Tunisie (ex: Ennasr, Sahloul, Lac 2)...'}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleMapSearch}
                        disabled={isSearchingMap || !mapSearchText.trim()}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        {isSearchingMap ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Navigation className="w-3 h-3" />
                        )}
                        <span>{isAr ? 'تحديد' : 'Localiser'}</span>
                      </button>
                    </div>

                    {/* Map canvas */}
                    <div 
                      ref={mapContainerRef} 
                      className="w-full h-64 sm:h-72 z-10" 
                      style={{ minHeight: '260px' }} 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Street Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'العنوان الفعلي للعيادة (النهج، العمارة، الطابق)' : 'Adresse physique exacte (Rue, Immeuble, Étage)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder={t('Ex: 15 Avenue Habib Bourguiba, Résidence du Parc...', 'مثال: 15 شارع الحبيب بورقيبة، إقامة الحديقة، الطابق 2...')}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-500 ${recentlyExtracted ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                </div>

                {/* Governorate */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الولاية' : 'Gouvernorat'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-500 ${recentlyExtracted ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 font-bold text-teal-800 dark:text-teal-300' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {governorates.map((gov) => (
                      <option key={gov} value={gov}>
                        {isAr ? `${GOVERNORATES_AR[gov] || gov} (${gov})` : gov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delegation / Postal */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'المعتمدية / المنطقة' : 'Délégation'}
                    </label>
                    <input
                      type="text"
                      name="delegation"
                      value={formData.delegation}
                      onChange={handleChange}
                      placeholder={isAr ? 'مثال: النصر...' : 'Ex: Ennasr...'}
                      className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-500 ${recentlyExtracted ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الترقيم البريدي' : 'Code Postal'}
                    </label>
                    <input
                      type="text"
                      name="postal"
                      value={formData.postal}
                      onChange={handleChange}
                      placeholder="1000"
                      className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-500 ${recentlyExtracted ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 font-mono' : 'border-slate-200 dark:border-slate-700'}`}
                    />
                  </div>
                </div>

                {/* Cabinet Phone */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الهاتف القار / المهني للعيادة' : 'Téléphone fixe / professionnel du cabinet'}
                  </label>
                  <TunisianPhoneInput
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold"
                  />
                </div>

                {/* Fee and CNAM */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>
                        {isAr ? 'تعريفة الفحص (د.ت)' : 'Tarif Consultation (DT)'} <span className="text-rose-500">*</span>
                      </span>
                      <span className={`text-[10px] font-bold ${
                        formData.fee !== '' && (Number(formData.fee) < 20 || Number(formData.fee) > 200)
                          ? 'text-rose-500 font-extrabold'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}>
                        {isAr ? 'بين 20 و 200 د.ت' : '20 – 200 DT'}
                      </span>
                    </label>
                    <input
                      type="number"
                      name="fee"
                      step="1"
                      value={formData.fee}
                      onChange={handleChange}
                      placeholder="70"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        formData.fee !== '' && (Number(formData.fee) < 20 || Number(formData.fee) > 200)
                          ? 'border-rose-400 bg-rose-50/20 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                    {formData.fee !== '' && Number(formData.fee) < 20 && (
                      <span className="text-[11px] text-rose-500 font-bold block pt-1 animate-in fade-in flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{isAr ? 'يجب أن تكون تعريفة الفحص 20 د.ت على الأقل (بين 20 و 200 د.ت)' : 'Le tarif de consultation doit être d\'au moins 20 DT (entre 20 et 200 DT)'}</span>
                      </span>
                    )}
                    {formData.fee !== '' && Number(formData.fee) > 200 && (
                      <span className="text-[11px] text-rose-500 font-bold block pt-1 animate-in fade-in flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{isAr ? 'الحد الأقصى لتعريفة الفحص هو 200 د.ت (بين 20 و 200 د.ت)' : 'Le montant maximum autorisé est de 200 DT (entre 20 et 200 DT)'}</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'التعاقد مع الكنام' : 'Conventionnement'}
                    </label>
                    <select
                      name="cnam"
                      value={formData.cnam}
                      onChange={handleChange}
                      className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="Filière Privée">{isAr ? 'طبيب متعاقد (المنظومة الخاصة)' : 'Filière Privée'}</option>
                      <option value="Conventionné CNAM">{isAr ? 'طبيب متعاقد (استرجاع مصاريف)' : 'Conventionné CNAM'}</option>
                      <option value="Hors Convention">{isAr ? 'غير متعاقد (قطاع حر)' : 'Secteur Libre'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && currentStep === 2 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="shrink-0 text-sm">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'العودة إلى كلمة المرور' : 'Retour au mot de passe'}</span>
                </button>
                <button
                  type="submit"
                  onClick={handleNextStep}
                  className="bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>{isAr ? 'المتابعة لتخصيص الملف والصورة' : 'Continuer vers le profil médical'}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}

          {/* ════════ STEP 3: PROFIL MÉDICAL & PRÉSENTATION ════════ */}
          {currentStep === 3 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? '3. الملف المهني، الصورة والتعريف بالعيادة' : '3. Profil & Fiche du Médecin (Photo & Présentation)'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr
                    ? 'أضف صورتك المهنية، شهاداتك الطبية، ومسارك المهني لتعزيز ثقة المرضى وتثبيت بطاقتك الطبية.'
                    : 'Ajoutez votre photo professionnelle, vos diplômes et votre parcours pour valoriser votre fiche et rassurer vos patients.'}
                </p>
              </div>

              {/* 1. PHOTO DE PROFIL PROFESSIONNELLE */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all">
                {/* Photo Preview */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-teal-500 shadow-md bg-white dark:bg-slate-900 flex items-center justify-center">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt={formData.name || 'Praticien'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Photo Controls */}
                <div className={`space-y-2 flex-1 text-center ${isAr ? 'sm:text-right' : 'sm:text-left'} w-full`}>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr ? 'الصورة الشخصية المهنية' : 'Photo de Profil Professionnelle'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr
                        ? 'الملفات التي تحتوي على صورة شخصية تحظى بما يصل إلى 3 أضعاف من المواعيد.'
                        : 'Les profils avec photo reçoivent jusqu\'à 3x plus de rendez-vous de patients.'}
                    </p>
                  </div>

                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-[#00A896] hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رفع صورة جديدة' : 'Importer une photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatar: '/images/doctor_selim.jpg' }))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      {isAr ? 'الصورة الافتراضية' : 'Photo par défaut'}
                    </button>
                  </div>

                  {/* Preset Medical Avatars */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                      {isAr ? 'أو اختر صورة طبية جاهزة :' : 'Ou choisissez un avatar médical :'}
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      {PRESET_DOCTOR_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: av.url }))}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            formData.avatar === av.url
                              ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105'
                              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-80 hover:opacity-100'
                          }`}
                          title={isAr ? av.labelAr : av.labelFr}
                        >
                          <img src={av.url} alt={isAr ? av.labelAr : av.labelFr} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. INFORMATIONS GÉNÉRALES DU PRATICIEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Titre / Titulature */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'الصفة / الرتبة المهنية :' : 'Titre / Titulature :'}
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={isAr ? 'مثال: مقيم سابق بمستشفيات تونس...' : 'ex. Ancien Interne des Hôpitaux de Tunis'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Spécialité Médicale */}
                <div>
                  <SpecialtyDropdown
                    label={isAr ? 'الاختصاص الطبي :' : 'Spécialité Médicale :'}
                    value={formData.specialty}
                    onChange={handleSelectSpecialty}
                    isAr={isAr}
                    required
                  />
                </div>
              </div>

                            {/* 3. SIGNATURE NUMÉRIQUE & CACHET PROFESSIONNEL */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 transition-all">
                {/* Signature Icon / Preview Box (+30% Width Landscape & Hover 'Aperçu') */}
                <div className="relative group shrink-0">
                  {(formData.signature || formData.signatureData) ? (
                    <>
                      <div className="w-20 sm:w-24 h-14 sm:h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500/40 dark:border-teal-600/50 p-1.5 flex items-center justify-center shadow-xs overflow-hidden">
                        <img
                          src={formData.signature || formData.signatureData}
                          alt="Signature Praticien"
                          className="w-full h-full object-contain select-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const sig = formData.signature || formData.signatureData;
                          const w = window.open('');
                          if (w) {
                            w.document.write(`<img src="${sig}" style="max-width:300px; margin:40px auto; display:block; border:1px solid #ccc; padding:20px; border-radius:12px;" />`);
                          }
                        }}
                        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer gap-0.5"
                        title={isAr ? 'معاينة الإمضاء' : 'Aperçu de la signature'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAr ? 'معاينة' : 'Aperçu'}</span>
                      </button>
                      <span className={`absolute -bottom-1 ${isAr ? '-left-1' : '-right-1'} w-4.5 h-4.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-[8px] font-black shadow-xs`}>
                        ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-20 sm:w-24 h-14 sm:h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border-2 border-dashed border-teal-500/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs transition-colors group-hover:border-teal-500">
                        <PenTool className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <button
                        type="button"
                        onClick={() => signatureFileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer gap-0.5 p-1 text-center"
                        title={isAr ? 'إضافة إمضاء' : 'Ajouter une signature'}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Signature Info: Title & Retracer Button on the Same Line, Description below */}
                <div className={`space-y-1.5 flex-1 text-center ${isAr ? 'sm:text-right' : 'sm:text-left'} w-full`}>
                  {/* Title & Retracer Button in the same line */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <PenTool className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{isAr ? 'الإمضاء والختم الرقمي المهني' : 'Signature Numérique & Cachet Professionnel'}</span>
                    </h4>

                    {/* Retracer Button on the same line as the title */}
                    {(formData.signature || formData.signatureData) ? (
                      <button
                        type="button"
                        onClick={() => setShowDrawSignatureModal(true)}
                        className="self-center sm:self-auto px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        <span>✍️</span>
                        <span>{isAr ? 'إعادة الرسم' : 'Retracer'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-center sm:justify-end gap-1.5 self-center sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowDrawSignatureModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <span>✍️</span>
                          <span>{isAr ? 'رسم باليد' : 'Retracer'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => signatureFileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إدراج' : 'Importer'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input for signature */}
                  <input
                    ref={signatureFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />

                  {/* Insertion Description Text */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                    {isAr
                      ? 'أدخل إمضاءك الرقمي أو ختمك الطبي لاعتماد الوصفات والشهادات الطبية الرسمية (صورة أو رسم مباشر باليد). ستوضع على وصفاتك الطبية.'
                      : 'Insérez votre signature numérique officielle ou votre cachet médical (image ou tracé direct). Elle sera apposée sur vos ordonnances.'}
                  </p>
                </div>
              </div>

              {/* 4. PRÉSENTATION & BIO */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>
                      {isAr 
                        ? 'التعريف بالطبيب والمسار المهني والأكاديمي :' 
                        : 'Présentation du Praticien & Parcours Médical :'}
                    </span>
                  </label>
                </div>
                <textarea
                  rows={4}
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder={
                    isAr 
                      ? 'صف خبراتك السريرية، شهاداتك الطبية، وتجربتك بالمستشفيات...' 
                      : 'Spécialiste en cardiologie clinique, échocardiographie Doppler haute résolution et suivi des pathologies cardiovasculaires...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all resize-y leading-relaxed"
                />
              </div>

              {/* 5. DIPLÔMES & FORMATION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0086cd]" />
                    <span>{isAr ? '🎓 الشهادات والتكوين' : '🎓 Diplômes & Formation'}</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {(formData.diplomas || []).length} {isAr ? 'شهادة' : 'diplôme(s)'}
                  </span>
                </div>

                {/* List of current diplomas */}
                <div className="space-y-1.5">
                  {(formData.diplomas || []).map((dip, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 px-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="text-[#0086cd] font-bold">•</span>
                        <span>{dip}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDiploma(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title={isAr ? 'حذف' : 'Supprimer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new custom diploma */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDiplomaInput}
                    onChange={(e) => setNewDiplomaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDiploma(); } }}
                    placeholder={isAr ? 'أضف شهادة أو تكويناً جديداً...' : 'Ajouter un diplôme ou une formation...'}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-teal-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDiploma()}
                    disabled={!newDiplomaInput.trim()}
                    className="px-3.5 py-2 bg-[#0086cd] hover:bg-[#0070ab] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                  </button>
                </div>

                {/* Intelligent Suggestions for Diplomas */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[#0086cd] flex items-center justify-center text-xs">✨</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {isAr ? '💡 مقترحات ذكية مخصصة للشهادات والتكوين :' : '💡 Suggestions Intelligentes Personnalisées :'}
                      </span>
                    </div>
                    {smartDiplomas && (
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800 flex items-center gap-1">
                        <span>{smartDiplomas.specialtyIcon || '🩺'}</span>
                        <span>{isAr ? smartDiplomas.specialtyNameAr : smartDiplomas.specialtyNameFr}</span>
                      </span>
                    )}
                  </div>

                  {/* Filter Tabs & Quick Search */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        diplomaCategory === 'all'
                          ? 'bg-[#0086cd] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      {isAr ? `الكل (${smartDiplomas?.totalCount || 0})` : `Tous (${smartDiplomas?.totalCount || 0})`}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('specialty')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        diplomaCategory === 'specialty'
                          ? 'bg-[#0086cd] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      <span>{smartDiplomas?.specialtyIcon || '🩺'}</span>
                      <span>{isAr ? 'حسب الاختصاص' : 'Spécialité'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('universal')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        diplomaCategory === 'universal'
                          ? 'bg-[#0086cd] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      <span>🏛️</span>
                      <span>{isAr ? 'أساسية' : 'Fondamentaux'}</span>
                    </button>

                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        value={diplomaSearch}
                        onChange={(e) => setDiplomaSearch(e.target.value)}
                        placeholder={isAr ? 'تصفية المقترحات...' : 'Filtrer suggestions...'}
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-56 overflow-y-auto">
                    {(smartDiplomas?.suggestions || []).map((sug, sIdx) => {
                      const label = isAr && sug.ar ? sug.ar : sug.fr;
                      const isAlreadyAdded = (formData.diplomas || []).some(
                        d => d.trim().toLowerCase() === (sug.fr || '').trim().toLowerCase() || (sug.ar && d.trim() === sug.ar.trim())
                      );
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleAddDiploma(label)}
                          disabled={isAlreadyAdded}
                          title={isAr ? sug.badgeAr : sug.badgeFr}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                            isAlreadyAdded
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 opacity-60 cursor-default'
                              : 'bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-teal-400'
                          }`}
                        >
                          <span className="font-bold text-teal-600">{isAlreadyAdded ? '✓' : '+'}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                    {(smartDiplomas?.suggestions || []).length === 0 && (
                      <div className="text-xs text-slate-400 italic py-2">
                        {isAr ? 'لا توجد مقترحات مطابقة' : 'Aucune suggestion correspondante'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setCurrentStep(2); setShowMap(true); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'العودة إلى عنوان العيادة' : 'Retour à l\'adresse du cabinet'}</span>
                </button>
                <button
                  type="submit"
                  onClick={handleNextStep}
                  className="bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>{isAr ? 'المتابعة لاختيار باقة الاشتراك' : 'Continuer vers le choix de l\'offre'}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}

          {/* ════════ STEP 4: SUBSCRIPTION OFFERS ════════ */}
          {currentStep === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-teal-600" />
                      <span>{isAr ? '4. اختر باقة اشتراكك في SahaTN' : '4. Choisissez votre Formule d\'Abonnement SahaTN'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isAr 
                        ? `اختر العرض المناسب لحجم واحتياجات عيادتك. مع تخفيض استثنائي يصل إلى ${selectedPlan?.discountPercentage ?? 15}% على الاشتراكات السنوية وبدون التزام.`
                        : `Sélectionnez l'offre adaptée à la taille et aux besoins de votre cabinet. Réduction de ${selectedPlan?.discountPercentage ?? 15}% en paiement annuel, sans engagement.`}
                    </p>
                  </div>

                  {/* Billing cycle toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-center border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'monthly' }))}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formData.billingCycle === 'monthly'
                          ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {isAr ? 'شهري' : 'Mensuel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, billingCycle: 'annual' }))}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.billingCycle === 'annual'
                          ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span>{isAr ? 'سنوي' : 'Annuel'}</span>
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                        -{selectedPlan?.discountPercentage ?? 15}%
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* OFFERS CARDS GRID */}
              <div className={`grid grid-cols-1 ${
                visiblePlans.length === 1 
                  ? 'max-w-md mx-auto w-full' 
                  : visiblePlans.length === 2 
                  ? 'md:grid-cols-2 max-w-3xl mx-auto w-full' 
                  : 'md:grid-cols-3'
              } gap-4`}>
                {visiblePlans.map(plan => {
                  const isSelected = formData.offer === plan.id;
                  const ribbon = isAr && plan.ribbonAr ? plan.ribbonAr : plan.ribbonFr;
                  const badge = isAr && plan.badgeAr ? plan.badgeAr : plan.badgeFr;
                  const planName = isAr && plan.nameAr ? plan.nameAr : plan.name;
                  const planDesc = isAr && plan.descriptionAr ? plan.descriptionAr : plan.description;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setFormData(prev => ({ ...prev, offer: plan.id }))}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        plan.isRecommended
                          ? (isSelected
                              ? 'bg-gradient-to-b from-teal-50/90 to-cyan-50/70 dark:from-teal-950/50 dark:to-cyan-950/30 border-[#00A896] shadow-xl ring-2 ring-teal-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300')
                          : (isSelected
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 border-[#00A896] shadow-lg ring-2 ring-teal-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300')
                      }`}
                    >
                      {ribbon && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider whitespace-nowrap">
                          {ribbon}
                        </div>
                      )}

                      <div className={`space-y-3 ${ribbon ? 'pt-1' : ''}`}>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            plan.isRecommended ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500'
                          }`}>
                            {badge || (isAr ? 'خيار الطبيب' : 'Formule')}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#00A896] text-white flex items-center justify-center text-[10px] font-black">
                              ✓
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">
                            {planName}
                          </h4>
                          {planDesc && (
                            <p className="text-[11px] text-slate-500">
                              {planDesc}
                            </p>
                          )}
                        </div>

                        {/* PRICING BLOCK WITH DISCOUNT CALCULATION */}
                        <div className="pt-2">
                          {formData.billingCycle === 'annual' ? (
                            <div>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-400 line-through">
                                  {plan.normalAnnualTotal} DT
                                </span>
                                <span className={`text-3xl font-black ${
                                  plan.isRecommended
                                    ? 'text-[#00A896]'
                                    : plan.id === 'clinique'
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {plan.annualTotal}
                                </span>
                                <span className="text-xs font-bold text-slate-500">{isAr ? 'د.ت / سنة' : 'DT/an'}</span>
                                <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                                  -{plan.discountPercentage}%
                                </span>
                              </div>
                              <p className={`text-[11px] font-bold mt-1 ${
                                plan.isRecommended
                                  ? 'text-teal-700 dark:text-teal-300'
                                  : plan.id === 'clinique'
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {isAr 
                                  ? `أي ${plan.annualMonthlyRate} د.ت / شهر (وفر ${plan.annualSavings} د.ت)` 
                                  : `Soit ${plan.annualMonthlyRate} DT / mois (Économisez ${plan.annualSavings} DT)`}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className={`text-3xl font-black ${
                                plan.isRecommended ? 'text-[#00A896]' : 'text-slate-900 dark:text-white'
                              }`}>
                                {plan.monthlyPrice} <span className="text-xs font-bold text-slate-500">{isAr ? 'د.ت / شهر' : 'DT/mois'}</span>
                              </span>
                              <p className="text-[11px] text-slate-400 font-medium mt-1">
                                {isAr ? 'فاتورة شهرية · بدون التزام' : 'Facturé mensuellement · Sans engagement'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* FEATURES LIST */}
                        {plan.features && plan.features.length > 0 && (
                          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {plan.features.map((feat, fIdx) => (
                              <li key={feat.id || fIdx} className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 font-black" />
                                {feat.isBold ? (
                                  <strong>{isAr && feat.textAr ? feat.textAr : feat.textFr}</strong>
                                ) : (
                                  <span>{isAr && feat.textAr ? feat.textAr : feat.textFr}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className={`block text-center py-2 text-xs font-black rounded-xl ${
                          isSelected
                            ? 'bg-[#00A896] text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {isSelected 
                            ? (isAr ? '✓ الباقة المختارة' : '✓ Formule Sélectionnée') 
                            : (isAr ? `اختيار ${planName}` : `Choisir ${plan.name}`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RECAP SHEET WITH COMPREHENSIVE PRICING & GUARANTEE */}
              <div className="bg-gradient-to-br from-white via-teal-50/20 to-slate-50 dark:from-slate-900 dark:via-slate-800/60 dark:to-slate-900 rounded-3xl border border-teal-200/80 dark:border-teal-900/60 p-5 sm:p-6 shadow-md transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Title & Key Details Grid */}
                  <div className="space-y-4 flex-1">
                    {/* Header line */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shadow-2xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                          {isAr ? 'ملخص بيانات التسجيل وصيغة الاشتراك :' : 'Récapitulatif de votre enregistrement & formule :'}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          {isAr ? 'مراجعة فورية لتفاصيل حسابك وباقة العمل المختارة' : 'Aperçu instantané de vos coordonnées et de votre formule'}
                        </span>
                      </div>
                    </div>

                    {/* Price and Montant Highlight line */}
                    <div className="flex flex-wrap items-baseline gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isAr ? 'المبلغ المستحق :' : 'Montant :'}
                      </span>
                      <span className="text-lg sm:text-xl font-black text-teal-700 dark:text-teal-300">
                        {formData.billingCycle === 'annual'
                          ? `${selectedPlan.annualTotal} DT/an`
                          : `${selectedPlan.monthlyPrice} DT/mois`}
                      </span>
                      {formData.billingCycle === 'annual' ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800">
                          {isAr ? `(أي ${selectedPlan.annualMonthlyRate} د.ت/شهر · وفرت ${selectedPlan.annualSavings} د.ت)` : `(soit ${selectedPlan.annualMonthlyRate} DT/mois · Économie de ${selectedPlan.annualSavings} DT)`}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {isAr ? '(بدون التزام · قابل للإلغاء في أي وقت)' : '(sans engagement · résiliable à tout moment)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: 30-Day Free Trial Guarantee Card */}
                  <div className="lg:w-72 shrink-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/50 dark:to-teal-950/50 p-4 rounded-2xl border-2 border-dashed border-emerald-400/60 dark:border-emerald-600/60 text-center space-y-1.5 shadow-2xs">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      <span>{isAr ? 'فترة تجريبية مجانية' : 'Essai Gratuit Inclus'}</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                      {isAr ? '30 يوماً مجاناً (0 د.ت اليوم)' : '30 jours sans prélèvement'}
                    </div>
                    <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      {isAr ? '0 د.ت اليوم · بدون اقتطاع مسبق' : '0 DT aujourd\'hui'}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight pt-1 border-t border-emerald-200/50 dark:border-emerald-900/50">
                      {isAr 
                        ? 'الفوترة تبدأ حصرياً بعد انقضاء الـ 30 يوماً التجريبية الأولى.'
                        : 'Facturation active uniquement après la période d\'essai de 30 jours.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="pt-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'العودة إلى الملف المهني والصورة' : 'Retour au profil médical'}</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-[#00A896] to-[#0086cd] hover:from-[#008F80] hover:to-[#0070ab] text-white font-black text-sm px-8 py-3.5 rounded-2xl flex items-center gap-2 cursor-pointer shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{isAr ? 'جارٍ حفظ البيانات وتفعيل الحساب...' : 'Enregistrement en cours...'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>{isAr ? 'تأكيد وتفعيل فضاء الطبيب الخاص بي' : 'Valider & Activer mon Espace Praticien'}</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
        </>
        )}

      
      {/* ════════ POPUP TRACÉ DE SIGNATURE NUMÉRIQUE ════════ */}
      {showDrawSignatureModal && (
        <div 
          className="fixed inset-0 z-[100000] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setShowDrawSignatureModal(false);
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>✍️</span>
                <span>{isAr ? 'ارسم إمضاءك الطبي باليد' : 'Tracer votre Signature Médicale'}</span>
              </h4>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDrawSignatureModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'استخدم إصبعك أو الفأرة لرسم إمضائك في الإطار أدناه :'
                : 'Signez à la souris ou au doigt dans le cadre ci-dessous :'}
            </p>

            <div 
              className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-2xl p-2 bg-slate-50 dark:bg-slate-950 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <canvas
                ref={signatureCanvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawingSig}
                onMouseMove={drawSig}
                onMouseUp={stopDrawingSig}
                onMouseLeave={stopDrawingSig}
                onTouchStart={startDrawingSig}
                onTouchMove={drawSig}
                onTouchEnd={stopDrawingSig}
                className="touch-none bg-white dark:bg-slate-900 rounded-xl cursor-crosshair w-full h-40 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearCanvasSig();
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                {isAr ? 'مسح وإعادة' : 'Effacer'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDrawSignatureModal(false);
                  }}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSig}
                  className="px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-black shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  {isAr ? 'اعتماد الإمضاء' : 'Valider la Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </main>

      {/* FOOTER */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>
          {isAr 
            ? 'SahaTN (موعدي) • المنصة الطبية الوطنية وعمادة أطباء تونس' 
            : 'SahaTN (موعدي) • Plateforme Médicale Nationale & Ordre des Médecins de Tunisie'}
        </p>
      </footer>
    </div>
  );
}
