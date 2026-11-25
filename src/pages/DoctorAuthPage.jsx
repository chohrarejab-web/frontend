import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LOCATIONS, SPECIALTIES, GOVERNORATES_AR } from '../data/tunisiaData';
import LoginModal from '../components/auth/LoginModal';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';
import DayNightToggle from '../components/common/DayNightToggle';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { extractDocumentCredentials } from '../utils/documentOcr';
import Footer from '../components/common/Footer';
import { fetchWithFallback } from '../services/api';

export default function DoctorAuthPage() {
  const { lang, toggleLanguage, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const { isDark, toggleTheme } = useTheme();
  const { login, setAuthSession, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reasonParam = searchParams.get('reason');
  const isLocked = reasonParam === 'locked' || searchParams.get('locked') === 'true' || reasonParam === 'reconnect';
  const isLoggedOut = reasonParam === 'logged_out';

  // --- FORM SWITCH (SIGNUP vs SIGNIN) ---
  // If locked or logged out, automatically select signin tab so doctor can reconnect
  const [formMode, setFormMode] = useState(() => (isLocked || isLoggedOut) ? 'signin' : 'signup');
  const [isSignupSuccess, setIsSignupSuccess] = useState(false);
  const [successRecord, setSuccessRecord] = useState(null);

  // Auto-clean active doctor session on Auth page arrival to guarantee zero forward-arrow leak
  useEffect(() => {
    localStorage.removeItem('sahatn_doctor_authenticated');
    sessionStorage.removeItem('sahatn_doctor_authenticated');
    sessionStorage.removeItem('sahatn_doctor_active_session');
    localStorage.removeItem('sahatn_doctor_user');
    sessionStorage.removeItem('sahatn_doctor_session_locked');
    if (typeof logout === 'function') {
      try { logout(); } catch (e) {}
    }
    if (isLocked || isLoggedOut) {
      setFormMode('signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isLoggedOut]);

  // --- SIGNUP FORM FIELDS ---
  const [objet, setObjet] = useState('');
  const [objetLabel, setObjetLabel] = useState('');
  const [objetQuery, setObjetQuery] = useState('');

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postal, setPostal] = useState('');

  const [specialtyId, setSpecialtyId] = useState('');
  const [specialtyLabel, setSpecialtyLabel] = useState('');
  const [specialtyQuery, setSpecialtyQuery] = useState('');

  const [city, setCity] = useState('');
  const [cityLabel, setCityLabel] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  const [delegation, setDelegation] = useState('');
  const [delegationQuery, setDelegationQuery] = useState('');

  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [cvFileSize, setCvFileSize] = useState('');
  const [cvFileData, setCvFileData] = useState(null);
  const [cvOcrLoading, setCvOcrLoading] = useState(false);
  const [cvOcrProgress, setCvOcrProgress] = useState(0);
  const [cvOcrResult, setCvOcrResult] = useState(null);

  // --- 3 OFFICIAL DOCUMENTS STATE (1. Diplôme, 2. Pièce d'Identité, 3. Attestation d'Inscription Ordre) ---
  const [docFiles, setDocFiles] = useState({
    diploma: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null },
    idCard: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null },
    ordrePaper: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null }
  });
  const diplomaInputRef = useRef(null);
  const idCardInputRef = useRef(null);
  const ordreInputRef = useRef(null);

  const [doctorPhoto, setDoctorPhoto] = useState(null);
  const photoInputRef = useRef(null);

  const [signupErrors, setSignupErrors] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);

  // --- SIGNIN FORM FIELDS (clean empty inputs — no prefilled credentials) ---
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signinShowPass, setSigninShowPass] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  // --- FLUID DROPDOWNS STATE ---
  const [openDropdown, setOpenDropdown] = useState(null); // 'objet' | 'specialty' | 'city' | 'delegation' | null
  const dropdownRef = useRef(null);

  // --- NOTIFICATION BELL STATE ---
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  // --- FAQ ACCORDION STATE ---
  const [openFaq, setOpenFaq] = useState(null); // 1, 2, 3, 4

  // --- LOGIN MODAL VISIBILITY STATE ---
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- UNAPPROVED PRACTITIONER MODAL STATE ---
  const [unapprovedModal, setUnapprovedModal] = useState({
    isOpen: false,
    email: '',
    name: '',
    requestStatus: 'NONE', // 'NONE' | 'PENDING' | 'REJECTED'
    message: ''
  });

  const fileInputRef = useRef(null);

  // --- OBJECTS DATA ---
  const objetOptions = [
    { id: 'creation', name: "Création d'un nouveau cabinet médical", ar: "إنشاء عيادة طبية جديدة", icon: '/images/medical-team.png' },
    { id: 'digitalisation', name: "Digitalisation d'un cabinet existant", ar: "رقمنة عيادة طبية قائمة", icon: '/images/digital1.png' },
    { id: 'tarifs', name: "Information sur les tarifs & abonnement SaaS", ar: "معلومات حول الأسعار والاشتراك الشهري", icon: '/images/tarif2.png' },
    { id: 'demo', name: "Demande de démonstration guidée", ar: "طلب عرض توضيحي مباشر وموجه", icon: '/images/guide.png' }
  ];

  // Close dropdowns when clicking outside the active dropdown container
  useEffect(() => {
    function handleClickOutside(event) {
      if (openDropdown) {
        const activeContainer = document.getElementById(`signup-${openDropdown}-container`);
        if (activeContainer && !activeContainer.contains(event.target)) {
          setOpenDropdown(null);
        }
      }
      const notifWrapper = document.getElementById('sahatn-notif-wrapper');
      if (notifWrapper && !notifWrapper.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openDropdown]);

  // Filtered dropdown lists
  const filteredObjets = objetOptions.filter(o => {
    const q = objetQuery.toLowerCase().trim();
    if (!q) return true;
    return o.name.toLowerCase().includes(q) || (o.ar && o.ar.includes(q));
  });

  const specialtiesList = SPECIALTIES || [
    { id: 'cardio', name: 'Cardiologie & Maladies Vasculaires', ar: 'أخصائي أمراض القلب والأوعية الدموية' },
    { id: 'pediatrie', name: 'Pédiatrie & Néonatologie', ar: 'أخصائية طب الأطفال وحديثي الولادة' },
    { id: 'dentiste', name: 'Chirurgie Dentaire & Implantologie', ar: 'جراحة وتجميل الأسنان' },
    { id: 'generaliste', name: 'Médecine Générale & Urgences', ar: 'طب عام واستشارات عاجلة' },
    { id: 'gyneco', name: 'Gynécologie Obstétrique & PMA', ar: 'أخصائية أمراض النساء والتوليد' },
    { id: 'ophtalmo', name: 'Ophtalmologie & Chirurgie Réfractive', ar: 'أخصائي أمراض وجراحة العيون' },
    { id: 'dermato', name: 'Dermatologie & Vénérologie', ar: 'أخصائي الأمراض الجلدية والتناسلية' }
  ];

  const filteredSpecialties = specialtiesList.filter(s => {
    const q = specialtyQuery.toLowerCase().trim();
    if (!q) return true;
    const frName = s.name || s.fr || '';
    const arName = s.ar || '';
    return frName.toLowerCase().includes(q) || arName.includes(q) || s.id.toLowerCase().includes(q);
  });

  const locationsList = LOCATIONS || [];

  const filteredCities = locationsList.filter(l => {
    const q = cityQuery.toLowerCase().trim();
    if (!q) return true;
    const arCity = GOVERNORATES_AR?.[l.city] || '';
    return l.city.toLowerCase().includes(q) || arCity.includes(q);
  });

  // Delegations derived from selected city
  let currentDelegations = [];
  if (city) {
    const found = locationsList.find(l => l.city.toLowerCase() === city.toLowerCase());
    if (found && found.delegations) currentDelegations = found.delegations;
  } else {
    locationsList.forEach(l => {
      if (l.delegations) currentDelegations.push(...l.delegations);
    });
  }

  const filteredDelegations = currentDelegations.filter(d => {
    const q = delegationQuery.toLowerCase().trim();
    if (!q) return true;
    return d.toLowerCase().includes(q);
  });

  // Notifications filtering
  const filteredNotifs = notifications.filter(n => {
    if (notifFilter === 'all') return true;
    return n.category === notifFilter;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllNotifsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const clearAllNotifs = () => {
    setNotifications([]);
  };

  const simulateNewNotif = () => {
    const sampleNames = ['Dr. Amina Trabelsi', 'Dr. Yassine Mansour', 'Dr. Leila Hamdi', 'Dr. Meriem Karray'];
    const randomDoctor = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const newN = {
      id: `notif-${Date.now()}`,
      category: 'rdv',
      title: `Nouveau RDV en ligne (${randomDoctor})`,
      desc: 'Patient enregistré avec confirmation SMS immédiate',
      time: 'À l\'instant',
      unread: true,
      icon: '🔔'
    };
    setNotifications(prev => [newN, ...prev]);
  };

  // --- 3 DOCUMENTS & PHOTO UPLOAD HANDLERS ---
  const readFileAsDataUrl = (file) => new Promise((resolve) => {
    if (!file) return resolve(null);
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });

  const processSlotFile = (slotKey, file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setSignupErrors(prev => ({ ...prev, cv: `Le fichier ${file.name} dépasse la taille maximale autorisée (25 Mo).` }));
      return;
    }
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' Mo';
    setSignupErrors(prev => ({ ...prev, cv: null }));

    // Keep primary legacy CV fields in sync so existing checks/tests work seamlessly
    setCvFile(file);
    setCvFileName(file.name);
    setCvFileSize(sizeStr);

    setDocFiles(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        file,
        name: file.name,
        size: sizeStr,
        ocrLoading: true,
        ocrProgress: 0,
        ocrResult: null
      }
    }));

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setCvFileData(dataUrl);
      setDocFiles(prev => ({
        ...prev,
        [slotKey]: { ...prev[slotKey], file, data: dataUrl }
      }));

      if (slotKey === 'ordrePaper') {
        setCvOcrLoading(true);
        setCvOcrProgress(0);
      }

      const extracted = await extractDocumentCredentials(
        dataUrl,
        (pct) => {
          setDocFiles(prev => ({
            ...prev,
            [slotKey]: { ...prev[slotKey], ocrProgress: pct }
          }));
          if (slotKey === 'ordrePaper') setCvOcrProgress(pct);
        },
        slotKey
      );

      setDocFiles(prev => ({
        ...prev,
        [slotKey]: { ...prev[slotKey], ocrLoading: false, ocrProgress: 100, ocrResult: extracted }
      }));

      if (slotKey === 'ordrePaper' || extracted?.hasNumber) {
        setCvOcrResult(extracted);
        setCvOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Multi-file handler: if the user selects multiple files at once, assign them to Diploma (1), ID (2), Ordre Paper (3)
  const handleCvChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const slotOrder = ['diploma', 'idCard', 'ordrePaper'];
    if (files.length >= 2) {
      files.slice(0, 3).forEach((f, idx) => {
        processSlotFile(slotOrder[idx], f);
      });
    } else {
      // Single file picked from multi-input: place in the first empty slot, or default to ordrePaper if all filled
      const firstEmpty = slotOrder.find(k => !docFiles[k]?.name) || 'ordrePaper';
      processSlotFile(firstEmpty, files[0]);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSignupErrors(prev => ({ ...prev, photo: "Veuillez sélectionner une image valide (JPG, PNG, WebP)." }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setSignupErrors(prev => ({ ...prev, photo: "L'image dépasse la limite de 10 Mo." }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setDoctorPhoto(reader.result); // Base64 image data URL saved directly into the database
        setSignupErrors(prev => ({ ...prev, photo: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const makeSamplePdf = (textLine) => {
    const raw = `%PDF-1.3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${textLine.length + 35} >>
stream
BT /F1 13 Tf 50 700 Td (${textLine}) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
    return 'data:application/pdf;base64,' + btoa(raw);
  };

  // --- SIGNUP SUBMISSION ---
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!objet) errors.objet = "Veuillez sélectionner l'objet de votre demande.";
    if (!firstname || firstname.trim().length < 2) errors.firstname = "Prénom obligatoire (au moins 2 lettres).";
    if (!lastname || lastname.trim().length < 2) errors.lastname = "Nom obligatoire (au moins 2 lettres).";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) errors.email = "Adresse email valide obligatoire (ex: praticien@sahatn.tn).";

    const phoneDigits = phone.replace(/^(\+216|00216)/, '').replace(/\D/g, '').slice(0, 8);
    if (!phoneDigits || phoneDigits.length !== 8) {
      errors.phone = lang === 'ar'
        ? "رقم الهاتف يجب أن يتكون من 8 أرقام بالضبط (مثال: 98123456)."
        : "Le numéro de téléphone doit comporter exactement 8 chiffres (ex: 98123456).";
    }

    const postalDigits = postal.replace(/\D/g, '');
    if (!postalDigits || postalDigits.length !== 4) {
      errors.postal = lang === 'ar'
        ? "الرمز البريدي يجب أن يتكون من 4 أرقام بالضبط (مثال: 1000)."
        : "Le code postal doit comporter exactement 4 chiffres (ex: 1000).";
    }
    if (!specialtyId) errors.specialty = "Veuillez sélectionner votre spécialité.";
    if (!city) errors.city = "Veuillez sélectionner votre gouvernorat.";

    const hasAnyDoc = Boolean(docFiles.diploma.name || docFiles.idCard.name || docFiles.ordrePaper.name || cvFileName);
    if (!hasAnyDoc) {
      errors.cv = "Documents manquants ! Veuillez téléverser vos justificatifs (1. Diplôme, 2. Pièce d'Identité, 3. Attestation d'inscription à l'Ordre).";
    }

    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      return;
    }

    setSignupErrors({});
    setSignupLoading(true);

    // Ensure all uploaded slots have finished reading into base64 and running OCR
    const finalDocs = { ...docFiles };
    for (const slotKey of ['diploma', 'idCard', 'ordrePaper']) {
      if (finalDocs[slotKey].file && !finalDocs[slotKey].data) {
        finalDocs[slotKey].data = await readFileAsDataUrl(finalDocs[slotKey].file);
      }
      if (finalDocs[slotKey].data && !finalDocs[slotKey].ocrResult) {
        finalDocs[slotKey].ocrResult = await extractDocumentCredentials(finalDocs[slotKey].data, null, slotKey);
      }
    }

    // Combine OCR results across the 3 documents with strict slot isolation
    const ordreOcr = finalDocs.ordrePaper.ocrResult;
    const diplomaOcr = finalDocs.diploma.ocrResult;
    const idOcr = finalDocs.idCard.ocrResult;

    const detectedNumberSource = [ordreOcr, diplomaOcr].find(r => r?.hasNumber);
    const detectedDiplomaSource = finalDocs.diploma.data ? diplomaOcr : null;
    const detectedIdSource = finalDocs.idCard.data ? idOcr : null;
    const detectedCnamSource = [ordreOcr, diplomaOcr].find(r => r?.hasCnam);

    const combinedOcr = {
      hasNumber: Boolean(detectedNumberSource?.hasNumber),
      orderNumber: detectedNumberSource?.orderNumber || null,
      orderLabel: detectedNumberSource?.orderNumber
        ? `Numéro d'inscription officiel extrait : ${detectedNumberSource.orderNumber}`
        : "Aucun numéro d'inscription officiel détecté dans les documents",
      hasDiploma: Boolean(detectedDiplomaSource?.hasDiploma),
      diplomaLabel: finalDocs.diploma.data
        ? (detectedDiplomaSource?.diplomaLabel || "Aucun diplôme de médecine détecté dans l'image")
        : "Document Diplôme non fourni (Manquant)",
      hasIdCard: Boolean(detectedIdSource?.hasIdCard),
      extractedCin: detectedIdSource?.extractedCin || null,
      idLabel: finalDocs.idCard.data
        ? (detectedIdSource?.idLabel || "Aucune pièce d'identité (CIN) détectée")
        : "Document Pièce d'Identité non fourni (Manquant)",
      hasCnam: Boolean(detectedCnamSource?.hasCnam),
      cnamLabel: detectedCnamSource?.cnamLabel || "Aucune mention CNAM détectée"
    };

    const primaryData = finalDocs.ordrePaper.data || finalDocs.diploma.data || finalDocs.idCard.data || cvFileData || null;
    const primaryName = [finalDocs.diploma.name, finalDocs.idCard.name, finalDocs.ordrePaper.name].filter(Boolean).join(' · ') || cvFileName || 'dossier_praticien.pdf';

    const documentsPayload = {
      diploma: finalDocs.diploma.data ? {
        title: 'Diplôme de Médecine',
        name: finalDocs.diploma.name,
        size: finalDocs.diploma.size,
        data: finalDocs.diploma.data,
        ocrResult: finalDocs.diploma.ocrResult
      } : null,
      idCard: finalDocs.idCard.data ? {
        title: "Pièce d'Identité (CIN)",
        name: finalDocs.idCard.name,
        size: finalDocs.idCard.size,
        data: finalDocs.idCard.data,
        ocrResult: finalDocs.idCard.ocrResult
      } : null,
      ordrePaper: finalDocs.ordrePaper.data ? {
        title: "Attestation d'Inscription à l'Ordre",
        name: finalDocs.ordrePaper.name,
        size: finalDocs.ordrePaper.size,
        data: finalDocs.ordrePaper.data,
        ocrResult: finalDocs.ordrePaper.ocrResult
      } : null
    };

    const doctorName = firstname.toLowerCase().startsWith('dr') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`;
    const formattedPhone = phone.startsWith('+') ? phone : `+216 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 5)} ${phoneDigits.slice(5)}`;

    const requestPayload = {
      firstname,
      lastname,
      name: doctorName,
      email: email.trim().toLowerCase(),
      phone: formattedPhone,
      postal: postal.trim(),
      objet: objetLabel || objet,
      specId: specialtyId,
      spec: specialtyLabel || specialtyId,
      specialtyId: specialtyId,
      city: cityLabel || city,
      delegation: delegation || 'Centre-Ville',
      address: `Cabinet ${postal}, ${city}`,
      ordre: combinedOcr.hasNumber ? combinedOcr.orderNumber : "Aucun numéro détecté dans l'image",
      cnam: combinedOcr.hasCnam ? combinedOcr.cnamLabel : "Aucune mention CNAM détectée",
      ocrResult: combinedOcr,
      documents: documentsPayload,
      fee: 70,
      cvFileName: primaryName,
      cvFileData: primaryData,
      avatar: doctorPhoto || null
    };

    let createdRecord = null;
    try {
      const res = await fetchWithFallback('/api/praticiens/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        createdRecord = {
          ...requestPayload,
          ...(data.request || {}),
          documents: requestPayload.documents || data.request?.documents || null
        };
      }
    } catch (err) {
      console.warn('[Doctor Auth] Network API fallback:', err);
    }

    if (!createdRecord) {
      createdRecord = {
        id: `PRAT-${Date.now().toString().slice(-4)}`,
        uuid: `prat-${Date.now()}`,
        name: doctorName,
        firstname,
        lastname,
        email,
        phone: formattedPhone,
        postal,
        objet: objetLabel || objet,
        spec: specialtyLabel || specialtyId,
        city: cityLabel || city,
        delegation: delegation || 'Centre-Ville',
        address: `Cabinet ${postal}, ${city}`,
        ordre: combinedOcr.hasNumber ? combinedOcr.orderNumber : "Aucun numéro détecté dans l'image",
        cnam: combinedOcr.hasCnam ? combinedOcr.cnamLabel : "Aucune mention CNAM détectée",
        ocrResult: combinedOcr,
        documents: documentsPayload,
        cvFileName: primaryName,
        cvFileData: primaryData,
        date: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'PENDING'
      };
    }

    // Save in localStorage for immediate sync with Admin Dashboard
    try {
      const localRequests = JSON.parse(localStorage.getItem('sahatn_praticien_requests') || '[]');
      localRequests.unshift(createdRecord);
      localStorage.setItem('sahatn_praticien_requests', JSON.stringify(localRequests));
    } catch (e) { }

    setSignupLoading(false);
    setSuccessRecord(createdRecord);
    setIsSignupSuccess(true);
  };

  const handleResetSignUp = () => {
    setIsSignupSuccess(false);
    setSuccessRecord(null);
    setObjet('');
    setObjetLabel('');
    setFirstname('');
    setLastname('');
    setEmail('');
    setPhone('');
    setPostal('1000');
    setSpecialtyId('');
    setSpecialtyLabel('');
    setCity('');
    setCityLabel('');
    setDelegation('');
    setCvFile(null);
    setCvFileName('');
    setCvFileSize('');
    setDocFiles({
      diploma: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null },
      idCard: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null },
      ordrePaper: { name: '', size: '', data: null, ocrLoading: false, ocrProgress: 0, ocrResult: null }
    });
    setSignupErrors({});
  };

  // --- SIGNIN FORM SUBMIT ---
  const handleSignInSubmit = async (e) => {
    e?.preventDefault();
    setSigninError('');
    setSigninLoading(true);

    try {
      const res = await login(signinEmail.trim().toLowerCase(), signinPassword);
      if (res && res.requires2FA) {
        setShowLoginModal(true);
      } else {
        const role = (res?.user?.role || '').toUpperCase();
        const isDoc = role === 'DOCTOR' || role === 'PRATICIEN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || Boolean(res?.user?.doctorId);
        if (!isDoc) {
          setUnapprovedModal({
            isOpen: true,
            email: signinEmail.trim().toLowerCase(),
            name: res?.user?.name || '',
            requestStatus: 'NONE',
            message: `Ce compte (${signinEmail}) est un compte patient, et non un compte praticien approuvé.`
          });
          return;
        }
        sessionStorage.removeItem('sahatn_doctor_session_locked');
        sessionStorage.setItem('sahatn_doctor_active_session', 'true');
        localStorage.setItem('sahatn_doctor_authenticated', 'true');
        sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
        navigate('/doctor/dashboard', { replace: true });
      }
    } catch (err) {
      if (err?.data?.error === 'DOCTOR_NOT_APPROVED') {
        setUnapprovedModal({
          isOpen: true,
          email: err.data.email || signinEmail,
          name: err.data.name || '',
          requestStatus: err.data.requestStatus || 'NONE',
          message: err.message
        });
      } else {
        setSigninError(err.message || 'Identifiants soignant incorrects.');
      }
    } finally {
      setSigninLoading(false);
    }
  };

  return (
    <div className={`bg-[#edf7f9] dark:bg-[#071120] text-slate-800 dark:text-slate-100 antialiased font-['Plus_Jakarta_Sans'] min-h-screen flex flex-col justify-between transition-colors duration-300 ${lang === 'ar' ? 'lang-ar' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ============================================================== */}
      {/* TOP UNIFIED HERO & HEADER BANNER (POSTMAN DARK TEAL GRADIENT)  */}
      {/* ============================================================== */}
      <div className="w-full bg-gradient-to-br from-[#032b43] via-[#004b5c] to-[#00A896] text-white shadow-xl relative overflow-hidden">

        {/* Ambient Glow & Star Decor (Postman Theme) */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-300/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Decorative Animated Background Stars & Sparkles */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <svg className="absolute top-12 right-16 w-5 h-5 text-cyan-200 animate-pulse" style={{ animationDuration: '2.2s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0l3.09 8.91L24 12l-8.91 3.09L12 24l-3.09-8.91L0 12l8.91-3.09z" />
          </svg>
          <svg className="absolute top-44 left-10 w-4 h-4 text-teal-200 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0l3.09 8.91L24 12l-8.91 3.09L12 24l-3.09-8.91L0 12l8.91-3.09z" />
          </svg>
          <svg className="absolute bottom-28 right-24 w-5 h-5 text-white animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '1s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0l3.09 8.91L24 12l-8.91 3.09L12 24l-3.09-8.91L0 12l8.91-3.09z" />
          </svg>
          <svg className="absolute top-1/3 right-1/3 w-3.5 h-3.5 text-cyan-300 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1.5s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0l3.09 8.91L24 12l-8.91 3.09L12 24l-3.09-8.91L0 12l8.91-3.09z" />
          </svg>
          <svg className="absolute bottom-12 left-1/4 w-4 h-4 text-teal-100 animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.8s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0l3.09 8.91L24 12l-8.91 3.09L12 24l-3.09-8.91L0 12l8.91-3.09z" />
          </svg>
        </div>

        {/* TOP HEADER / NAV (Seamless Integrated Navigation) */}
        <header className="w-full border-b border-white/15 py-3.5 transition-all relative z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/images/logo.png"
                alt={lang === 'ar' ? 'موعدي' : 'Maw2idi'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105 duration-300 bg-white/95 p-0.5"
              />
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'موعدي' : 'Maw2idi'}
              </span>
            </Link>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-3 sm:gap-4">

              {/* Language Switcher — Flag Toggle Switch */}
              <button
                type="button"
                onClick={toggleLanguage}
                id="header-lang-btn"
                className="sahatn-lang-switch-btn lang-toggle-btn flex-shrink-0 cursor-pointer"
                data-lang={lang}
                title="Changer de langue / تغيير اللغة"
              >
                <span className="slt-label slt-label-fr">FR</span>
                <span className="slt-track">
                  <span className="slt-knob">
                    <svg className="slt-flag-svg slt-flag-fr" viewBox="0 0 36 36">
                      <rect x="0" y="0" width="12" height="36" fill="#002654" />
                      <rect x="12" y="0" width="12" height="36" fill="#FFFFFF" />
                      <rect x="24" y="0" width="12" height="36" fill="#CE1126" />
                    </svg>
                    <svg className="slt-flag-svg slt-flag-ar" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                      <rect width="36" height="36" fill="#E70013" />
                      <circle cx="18" cy="18" r="11" fill="#FFFFFF" />
                      <path d="M 24.67 13.14 A 8.25 8.25 0 1 0 24.67 22.86 A 6.60 6.60 0 1 1 24.67 13.14 Z" fill="#E70013" />
                      <polygon points="15.25,18.00 18.67,16.89 18.67,13.29 20.78,16.21 24.20,15.09 22.09,18.00 24.20,20.91 20.78,19.79 18.67,22.71 18.67,19.11" fill="#E70013" />
                    </svg>
                  </span>
                </span>
                <span className="slt-label slt-label-ar">AR</span>
              </button>

              {/* Day / Night Theme Toggle */}
              <DayNightToggle isDark={isDark} onToggle={toggleTheme} />

              {/* Button 1: Vous êtes patient ? */}
              <Link
                to="/"
                id="doc-nav-patient"
                className="bg-white hover:bg-slate-100 text-[#0086cd] font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {lang === 'ar' ? 'هل أنت مريض ؟' : 'Vous êtes patient ?'}
              </Link>

              {/* Button 2: Centre d'aide */}
              <a
                href="/#aide"
                id="doc-nav-help"
                className="text-white hover:text-teal-100 font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 transform hover:scale-105 group/nav"
              >
                <span className="w-6 h-6 rounded-full border-2 border-white/80 flex items-center justify-center text-xs font-bold group-hover/nav:bg-white group-hover/nav:text-[#0086cd] transition-all">?</span>
                <span className="hidden md:inline">{lang === 'ar' ? 'مركز المساعدة' : 'Centre d\'aide'}</span>
              </a>

              {/* Notification Bell Button & Dropdown */}
              <div className="relative" id="sahatn-notif-wrapper">
                <button
                  type="button"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  id="sahatn-notif-bell-btn"
                  className="relative p-2 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer group flex items-center justify-center focus:outline-none"
                  title="Notifications (RDV, Patients, Alertes)"
                >
                  <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span id="sahatn-notif-badge" className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#00b4b6] shadow-md animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Menu */}
                {showNotifMenu && (
                  <div id="sahatn-notif-menu" className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-[#0e172a] text-slate-800 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[60] overflow-hidden text-left rtl:text-right">
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-teal-50/50 dark:from-[#121c33] dark:to-[#0f2438] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#002b49] dark:text-white flex items-center gap-1.5">
                          <span>🔔</span> Notifications
                        </span>
                        <span id="sahatn-notif-header-badge" className="bg-teal-500/15 text-[#00a896] dark:text-teal-400 text-xs font-black px-2.5 py-0.5 rounded-full">
                          {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button type="button" onClick={markAllNotifsRead} className="text-[11px] text-[#00a896] hover:underline font-extrabold cursor-pointer">
                        Tout marquer comme lu
                      </button>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setNotifFilter('all')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${notifFilter === 'all' ? 'bg-white dark:bg-slate-800 text-[#00a896] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/60'}`}
                      >
                        Toutes
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('rdv')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${notifFilter === 'rdv' ? 'bg-white dark:bg-slate-800 text-[#00a896] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/60'}`}
                      >
                        📅 RDV
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('patient')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${notifFilter === 'patient' ? 'bg-white dark:bg-slate-800 text-[#00a896] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/60'}`}
                      >
                        👤 Patients
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('system')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${notifFilter === 'system' ? 'bg-white dark:bg-slate-800 text-[#00a896] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/60'}`}
                      >
                        ⏱️ Alertes
                      </button>
                    </div>

                    {/* Notification Item List */}
                    <div id="sahatn-notif-list" className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredNotifs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                          Aucune notification à afficher
                        </div>
                      ) : (
                        filteredNotifs.map(n => (
                          <div key={n.id} className={`p-3.5 hover:bg-teal-50/50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 ${n.unread ? 'bg-teal-50/30' : ''}`}>
                            <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-[#002b49] dark:text-white truncate">{n.title}</h4>
                                <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{n.desc}</p>
                            </div>
                            {n.unread && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5"></span>}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-50 dark:bg-[#121c33] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <button type="button" onClick={simulateNewNotif} className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer">
                        ⚡ Simuler notification
                      </button>
                      <button type="button" onClick={clearAllNotifs} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer">
                        Effacer tout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Button 3: Se connecter */}
              <button
                id="doc-nav-login"
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="text-white hover:text-teal-100 font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 transform hover:scale-105 group/nav cursor-pointer"
              >
                <svg className="w-5 h-5 text-white transition-transform group-hover/nav:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:inline">{lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}</span>
              </button>

            </div>

          </div>
        </header>

        {/* ============================================================== */}
        {/* MAIN CONTENT SECTION (HERO + FORM GRID)                        */}
        {/* ============================================================== */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-20">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-stretch">

            {/* LEFT HERO CONTAINER */}
            <div className="lg:col-span-6 text-white flex flex-col justify-between space-y-8 py-4 sm:py-6">

              <div className="space-y-7 relative z-10">

                {/* Title */}
                <h1 id="doc-hero-title" className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-black text-white leading-[1.18] tracking-tight">
                  {lang === 'ar'
                    ? 'المنظومة المتكاملة التي تعيد ابتكار العمل اليومي للمهنيين الصحيين في تونس.'
                    : 'La suite tout-en-un qui réinvente le quotidien des soignants en Tunisie.'}
                </h1>

                {/* Subtitle */}
                <p id="doc-hero-subtitle" className="text-teal-50 text-sm sm:text-base lg:text-lg leading-relaxed font-medium">
                  {lang === 'ar'
                    ? 'أكثر من مجرد برنامج: واجهة موحدة ذكية لحجز المواعيد عبر الإنترنت، والملف الطبي الرقمي، والتكفل بالكنام.'
                    : 'Bien plus qu\'un logiciel : une seule interface intuitive pour la prise de rendez-vous en ligne, le dossier patient informatisé et la gestion CNAM.'}
                </p>

                {/* Bullet List */}
                <ul className="space-y-4 pt-2 text-sm sm:text-base font-bold text-white">
                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-white text-[#002b49] flex items-center justify-center font-black text-sm shrink-0 shadow-md mt-0.5">✓</span>
                    <span id="doc-hero-b1" className="leading-snug">
                      {lang === 'ar' ? 'ربح ما يصل إلى ساعتين يومياً في المهام الإدارية' : 'Gagnez jusqu\'à 2 heures par jour sur vos tâches administratives'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-white text-[#002b49] flex items-center justify-center font-black text-sm shrink-0 shadow-md mt-0.5">✓</span>
                    <span id="doc-hero-b2" className="leading-snug">
                      {lang === 'ar' ? 'تقليص المواعيد الضائعة بفضل تذكيرات واتساب التلقائية' : 'Réduisez les rendez-vous manqués grâce aux rappels WhatsApp'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-white text-[#002b49] flex items-center justify-center font-black text-sm shrink-0 shadow-md mt-0.5">✓</span>
                    <span id="doc-hero-b3" className="leading-snug">
                      {lang === 'ar' ? 'توحيد ملفات المرضى، الوصفات الطبية وجداول الكنام' : 'Centralisez dossiers patients, ordonnances et bordereaux CNAM'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-white text-[#002b49] flex items-center justify-center font-black text-sm shrink-0 shadow-md mt-0.5">✓</span>
                    <span id="doc-hero-b4" className="leading-snug">
                      {lang === 'ar' ? 'مطابقة لمعايير الهيئة الوطنية لحماية المعطيات وعمادة الأطباء' : 'Conforme aux normes INPDP & Ordre des Médecins de Tunisie'}
                    </span>
                  </li>
                </ul>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-3.5 pt-6 border-t border-white/25">
                  <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/30 text-center space-y-1 shadow-lg hover:bg-white/20 transition-all">
                    <div id="doc-metric1-val" className="stat-counter-ltr text-xl sm:text-2xl lg:text-3xl font-black text-white" dir="ltr">+1 400</div>
                    <div id="doc-metric1-sub" className="text-xs sm:text-sm text-teal-100 font-bold leading-tight">
                      {lang === 'ar' ? 'مهني صحي مجهّز' : 'Soignants équipés'}
                    </div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/30 text-center space-y-1 shadow-lg hover:bg-white/20 transition-all">
                    <div id="doc-metric2-val" className="stat-counter-ltr text-xl sm:text-2xl lg:text-3xl font-black text-amber-300" dir="ltr">-70%</div>
                    <div id="doc-metric2-sub" className="text-xs sm:text-sm text-teal-100 font-bold leading-tight">
                      {lang === 'ar' ? 'مواعيد غير محترمة' : 'RDV non honorés'}
                    </div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/30 text-center space-y-1 shadow-lg hover:bg-white/20 transition-all">
                    <div id="doc-metric3-val" className="stat-counter-ltr text-xl sm:text-2xl lg:text-3xl font-black text-emerald-200" dir="ltr">100%</div>
                    <div id="doc-metric3-sub" className="text-xs sm:text-sm text-teal-100 font-bold leading-tight">
                      {lang === 'ar' ? 'مطابق لمعايير INPDP' : 'Conforme INPDP'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Trust Guarantee Tag */}
              <div className="pt-5 border-t border-white/25 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-extrabold text-white relative z-10">
                <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span id="doc-guarantee-1">
                    {lang === 'ar' ? 'التثبيت والتدريب مجاناً' : 'Installation & Formation offertes'}
                  </span>
                </span>
                <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span id="doc-guarantee-2">
                    {lang === 'ar' ? 'دعم فني 7/7 في تونس' : 'Support 7j/7 en Tunisie'}
                  </span>
                </span>
              </div>

            </div>

            {/* RIGHT FORM CONTAINER */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0c1a2e] p-6 sm:p-8 lg:p-10 rounded-[32px] border border-white/80 dark:border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between text-slate-800 dark:text-slate-100 transition-colors duration-300">

              <div>

                {/* Form Navigation Tabs (Signup / Signin) */}
                <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-4 border border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setFormMode('signup'); setIsSignupSuccess(false); }}
                    className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${formMode === 'signup' && !isSignupSuccess ? 'bg-white dark:bg-[#071322] text-[#0086cd] dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {lang === 'ar' ? '📝 تواصل مع مستشار' : '📝 Échangez avec un conseiller'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormMode('signin'); setIsSignupSuccess(false); }}
                    className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${formMode === 'signin' ? 'bg-white dark:bg-[#071322] text-[#0086cd] dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {lang === 'ar' ? '🔑 دخول الطبيب' : '🔑 Connexion Praticien'}
                  </button>
                </div>

                {/* Security Lock Notice Banner */}
                {isLocked && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-xs flex items-start gap-3 mb-4 animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold text-base mt-0.5">
                      🔒
                    </div>
                    <div className="space-y-1 text-xs">
                      <h4 className="font-extrabold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                        {lang === 'ar' ? 'تم قفل الدخول لحماية البيانات الطبية' : 'Session praticien verrouillée par sécurité'}
                      </h4>
                      <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed text-[11px]">
                        {lang === 'ar'
                          ? 'لحماية سرية السجلات والملفات الطبية، تم قفل حساب الطبيب تلقائياً إثر مغادرة الواجهة. يرجى تسجيل الدخول مجدداً للمتابعة.'
                          : 'Pour garantir la stricte confidentialité des dossiers médicaux (normes INPDP) et empêcher l\'accès non autorisé via les flèches du navigateur, votre session a été verrouillée. Veuillez vous reconnecter.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* CONTAINER 1: SIGNUP FORM                                       */}
                {/* ============================================================== */}
                {formMode === 'signup' && !isSignupSuccess && (
                  <form id="form-signup" noValidate onSubmit={handleSignUpSubmit} className="space-y-4">

                    <div>
                      <h2 id="doc-form-signup-title" className="text-2xl font-extrabold text-[#002b49] dark:text-white text-center">
                        {lang === 'ar' ? 'تواصل مع مستشار طبي' : 'Échangez avec un conseiller'}
                      </h2>
                    </div>

                    {/* Objet de la demande */}
                    <div>
                      <div
                        id="signup-objet-container"
                        onClick={() => {
                          setOpenDropdown(prev => prev === 'objet' ? null : 'objet');
                          const input = document.getElementById('signup-objet-input');
                          if (input) input.focus();
                        }}
                        className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all relative ${signupErrors.objet ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                      >
                        <label id="doc-label-objet" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-pointer">
                          {lang === 'ar' ? 'موضوع الطلب *' : 'Objet de votre demande *'}
                        </label>
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            id="signup-objet-input"
                            value={openDropdown === 'objet' ? objetQuery : (objetLabel || objetQuery)}
                            onChange={(e) => {
                              setObjetQuery(e.target.value);
                              setOpenDropdown('objet');
                              setSignupErrors(prev => ({ ...prev, objet: null }));
                            }}
                            onFocus={(e) => {
                              e.stopPropagation();
                              setOpenDropdown('objet');
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown('objet');
                            }}
                            placeholder={lang === 'ar' ? 'اختر موضوع الطلب...' : "Sélectionnez l'objet de la demande..."}
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-pointer"
                            autoComplete="off"
                          />
                          <span className="text-slate-400 text-xs pointer-events-none shrink-0 px-1">▼</span>
                        </div>

                        {/* Fluid Objet Dropdown */}
                        {openDropdown === 'objet' && (
                          <div
                            id="signup-objet-dropdown"
                            dir={lang === 'ar' ? 'rtl' : 'ltr'}
                            onMouseDown={(e) => e.preventDefault()}
                            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-64 overflow-y-auto p-2 text-start custom-scrollbar space-y-1"
                          >
                            {filteredObjets.length === 0 ? (
                              <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                                {lang === 'ar' ? 'لم يتم العثور على أي خيار' : 'Aucun objet trouvé'}
                              </div>
                            ) : (
                              filteredObjets.map(o => (
                                <div
                                  key={o.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setObjet(o.id);
                                    setObjetLabel(lang === 'ar' ? o.ar : o.name);
                                    setObjetQuery('');
                                    setOpenDropdown(null);
                                    setSignupErrors(prev => ({ ...prev, objet: null }));
                                  }}
                                  className="objet-item flex items-center gap-2.5 p-2.5 hover:bg-cyan-50 rounded-xl cursor-pointer transition-colors text-start"
                                >
                                  <span className="w-6 h-6 flex items-center justify-center shrink-0">
                                    <img className="w-6 h-6 object-contain" src={o.icon} alt={o.name} />
                                  </span>
                                  <div className="text-xs font-bold text-slate-800">{lang === 'ar' ? o.ar : o.name}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {signupErrors.objet && (
                        <p id="signup-objet-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <span>⚠️ {signupErrors.objet}</span>
                        </p>
                      )}
                    </div>

                    {/* Prénom & Nom */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div
                          id="signup-firstname-container"
                          onClick={() => document.getElementById('signup-firstname')?.focus()}
                          className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all ${signupErrors.firstname ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                        >
                          <label htmlFor="signup-firstname" id="doc-label-firstname" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-text">
                            {lang === 'ar' ? 'الاسم *' : 'Prénom *'}
                          </label>
                          <input
                            type="text"
                            id="signup-firstname"
                            value={firstname}
                            onChange={(e) => {
                              setFirstname(e.target.value.replace(/[0-9]/g, ''));
                              setSignupErrors(prev => ({ ...prev, firstname: null }));
                            }}
                            placeholder={lang === 'ar' ? 'مثال: محمد' : 'ex: Amine'}
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-text"
                          />
                        </div>
                        {signupErrors.firstname && (
                          <p id="signup-firstname-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span>⚠️ {signupErrors.firstname}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          id="signup-lastname-container"
                          onClick={() => document.getElementById('signup-lastname')?.focus()}
                          className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all ${signupErrors.lastname ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                        >
                          <label htmlFor="signup-lastname" id="doc-label-lastname" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-text">
                            {lang === 'ar' ? 'اللقب *' : 'Nom *'}
                          </label>
                          <input
                            type="text"
                            id="signup-lastname"
                            value={lastname}
                            onChange={(e) => {
                              setLastname(e.target.value.replace(/[0-9]/g, ''));
                              setSignupErrors(prev => ({ ...prev, lastname: null }));
                            }}
                            placeholder={lang === 'ar' ? 'مثال: بن رمضان' : 'ex: Ben Romdhane'}
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-text"
                          />
                        </div>
                        {signupErrors.lastname && (
                          <p id="signup-lastname-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span>⚠️ {signupErrors.lastname}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Adresse email */}
                    <div>
                      <div
                        id="signup-email-container"
                        onClick={() => document.getElementById('signup-email')?.focus()}
                        className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all ${signupErrors.email ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                      >
                        <label htmlFor="signup-email" id="doc-label-email" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-text">
                          {lang === 'ar' ? 'البريد الإلكتروني *' : 'Adresse email *'}
                        </label>
                        <input
                          type="email"
                          id="signup-email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setSignupErrors(prev => ({ ...prev, email: null }));
                          }}
                          placeholder={lang === 'ar' ? 'مثال: praticien@sahatn.tn' : 'ex: praticien@sahatn.tn'}
                          className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-text"
                        />
                      </div>
                      {signupErrors.email && (
                        <p id="signup-email-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <span>⚠️ {signupErrors.email}</span>
                        </p>
                      )}
                    </div>

                    {/* Téléphone portable & Code postal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div
                          id="signup-phone-container"
                          onClick={() => document.getElementById('signup-phone')?.focus()}
                          className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all ${signupErrors.phone ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                        >
                          <label htmlFor="signup-phone" id="doc-label-phone" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-text">
                            {lang === 'ar' ? 'الهاتف الجوال (8 أرقام) *' : 'Téléphone portable (8 chiffres) *'}
                          </label>
                          <TunisianPhoneInput
                            id="signup-phone"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setSignupErrors(prev => ({ ...prev, phone: null }));
                            }}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0"
                          />
                        </div>
                        {signupErrors.phone && (
                          <p id="signup-phone-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span>⚠️ {signupErrors.phone}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          id="signup-postal-container"
                          onClick={() => document.getElementById('signup-postal')?.focus()}
                          className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all ${signupErrors.postal ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                        >
                          <label htmlFor="signup-postal" id="doc-label-postal" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-text">
                            {lang === 'ar' ? 'الترقيم البريدي (4 أرقام) *' : 'Code postal (4 chiffres) *'}
                          </label>
                          <input
                            type="text"
                            id="signup-postal"
                            maxLength={4}
                            inputMode="numeric"
                            value={postal}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setPostal(val);
                              setSignupErrors(prev => ({ ...prev, postal: null }));
                            }}
                            placeholder={lang === 'ar' ? 'مثال: 1000' : 'ex: 1000'}
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-text"
                          />
                        </div>
                        {signupErrors.postal && (
                          <p id="signup-postal-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span>⚠️ {signupErrors.postal}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Spécialité */}
                    <div>
                      <div
                        id="signup-specialty-container"
                        onClick={() => {
                          setOpenDropdown(prev => prev === 'specialty' ? null : 'specialty');
                          const input = document.getElementById('signup-specialty-input');
                          if (input) input.focus();
                        }}
                        className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all relative ${signupErrors.specialty ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                      >
                        <label id="doc-label-specialty" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-pointer">
                          {lang === 'ar' ? 'الاختصاص الطبي *' : 'Spécialité *'}
                        </label>
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            id="signup-specialty-input"
                            value={openDropdown === 'specialty' ? specialtyQuery : (specialtyLabel || specialtyQuery)}
                            onChange={(e) => {
                              setSpecialtyQuery(e.target.value);
                              setOpenDropdown('specialty');
                              setSignupErrors(prev => ({ ...prev, specialty: null }));
                            }}
                            onFocus={(e) => {
                              e.stopPropagation();
                              setOpenDropdown('specialty');
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown('specialty');
                            }}
                            placeholder={lang === 'ar' ? 'جميع الاختصاصات...' : 'Toutes les spécialités...'}
                            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-pointer"
                            autoComplete="off"
                          />
                          <span className="text-slate-400 text-xs pointer-events-none shrink-0 px-1">▼</span>
                        </div>

                        {/* Fluid Specialty Dropdown */}
                        {openDropdown === 'specialty' && (
                          <div
                            id="signup-specialty-dropdown"
                            dir={lang === 'ar' ? 'rtl' : 'ltr'}
                            onMouseDown={(e) => e.preventDefault()}
                            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-64 overflow-y-auto p-2 text-start custom-scrollbar space-y-1"
                          >
                            {filteredSpecialties.length === 0 ? (
                              <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                                {lang === 'ar' ? 'لم يتم العثور على أي اختصاص' : 'Aucune spécialité trouvée'}
                              </div>
                            ) : (
                              filteredSpecialties.map(s => {
                                const displayName = (lang === 'ar' && s.ar) ? s.ar : (s.name || s.fr || s.id);
                                return (
                                  <div
                                    key={s.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSpecialtyId(s.id);
                                      setSpecialtyLabel(displayName);
                                      setSpecialtyQuery('');
                                      setOpenDropdown(null);
                                      setSignupErrors(prev => ({ ...prev, specialty: null }));
                                    }}
                                    className={`spec-item flex items-center justify-between gap-2.5 p-2 rounded-xl cursor-pointer transition-colors text-start ${
                                      specialtyId === s.id ? 'bg-teal-50 dark:bg-teal-950/60 text-[#00A896] font-black' : 'hover:bg-teal-50/70 dark:hover:bg-teal-950/30'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{displayName}</div>
                                      {s.ar && lang !== 'ar' && <div className="text-[10px] text-slate-400 font-medium truncate" dir="rtl">{s.ar}</div>}
                                      {s.name && lang === 'ar' && <div className="text-[10px] text-slate-400 font-medium truncate">{s.name}</div>}
                                    </div>
                                    {specialtyId === s.id && (
                                      <span className="text-xs text-[#00A896] font-black shrink-0">✓</span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                      {signupErrors.specialty && (
                        <p id="signup-specialty-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <span>⚠️ {signupErrors.specialty}</span>
                        </p>
                      )}
                    </div>

                    {/* Gouvernorat & Localité */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div
                          id="signup-city-container"
                          onClick={() => {
                            setOpenDropdown(prev => prev === 'city' ? null : 'city');
                            const input = document.getElementById('signup-city-input');
                            if (input) input.focus();
                          }}
                          className={`bg-slate-50 border rounded-lg px-3 py-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all relative ${signupErrors.city ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' : 'border-slate-300'}`}
                        >
                          <label id="doc-label-city" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-pointer">
                            {lang === 'ar' ? 'الولاية *' : 'Gouvernorat *'}
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              id="signup-city-input"
                              value={openDropdown === 'city' ? cityQuery : (cityLabel || cityQuery)}
                              onChange={(e) => {
                                setCityQuery(e.target.value);
                                setOpenDropdown('city');
                                setSignupErrors(prev => ({ ...prev, city: null }));
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setOpenDropdown('city');
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown('city');
                              }}
                              placeholder={lang === 'ar' ? 'جميع الولايات...' : 'Tous les gouvernorats...'}
                              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-pointer"
                              autoComplete="off"
                            />
                            <span className="text-slate-400 text-xs pointer-events-none shrink-0 px-1">▼</span>
                          </div>

                          {/* Fluid City Dropdown */}
                          {openDropdown === 'city' && (
                            <div
                              id="signup-city-dropdown"
                              dir={lang === 'ar' ? 'rtl' : 'ltr'}
                              onMouseDown={(e) => e.preventDefault()}
                              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-64 overflow-y-auto p-2 text-start custom-scrollbar space-y-1"
                            >
                              {filteredCities.length === 0 ? (
                                <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                                  {lang === 'ar' ? 'لم يتم العثور على أي ولاية' : 'Aucun gouvernorat trouvé'}
                                </div>
                              ) : (
                                filteredCities.map(l => {
                                  const displayCity = (lang === 'ar' && GOVERNORATES_AR?.[l.city]) ? GOVERNORATES_AR[l.city] : l.city;
                                  return (
                                    <div
                                      key={l.city}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCity(l.city);
                                        setCityLabel(displayCity);
                                        setCityQuery('');
                                        setDelegation('');
                                        setOpenDropdown(null);
                                        setSignupErrors(prev => ({ ...prev, city: null }));
                                      }}
                                      className="city-item flex items-center gap-2.5 p-2 hover:bg-cyan-50 rounded-xl cursor-pointer transition-colors text-start"
                                    >
                                      <span className="w-6 h-6 flex items-center justify-center shrink-0">
                                        <img className="w-5 h-5 object-contain" src="/images/gps.png" alt={displayCity} />
                                      </span>
                                      <div className="text-xs font-bold text-slate-800">{displayCity}</div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                        {signupErrors.city && (
                          <p id="signup-city-error" className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span>⚠️ {signupErrors.city}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          id="signup-delegation-container"
                          onClick={() => {
                            setOpenDropdown(prev => prev === 'delegation' ? null : 'delegation');
                            const input = document.getElementById('signup-delegation-input');
                            if (input) input.focus();
                          }}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-[#0086cd] focus-within:border-[#0086cd] focus-within:bg-white transition-all relative"
                        >
                          <label id="doc-label-delegation" className="block text-xs sm:text-sm font-bold text-slate-500 cursor-pointer">
                            {lang === 'ar' ? 'المعتمدية / الحي' : 'Localité / Quartier'}
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              id="signup-delegation-input"
                              value={openDropdown === 'delegation' ? delegationQuery : (delegation || delegationQuery)}
                              onChange={(e) => {
                                setDelegationQuery(e.target.value);
                                setOpenDropdown('delegation');
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setOpenDropdown('delegation');
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown('delegation');
                              }}
                              placeholder={lang === 'ar' ? 'مثال: النصر 2، ضفاف البحيرة 2...' : 'ex: Ennasr 2, Lac 2...'}
                              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none p-0 cursor-pointer"
                              autoComplete="off"
                            />
                            <span className="text-slate-400 text-xs pointer-events-none shrink-0 px-1">▼</span>
                          </div>

                          {/* Fluid Delegation Dropdown */}
                          {openDropdown === 'delegation' && (
                            <div
                              id="signup-delegation-dropdown"
                              dir={lang === 'ar' ? 'rtl' : 'ltr'}
                              onMouseDown={(e) => e.preventDefault()}
                              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-64 overflow-y-auto p-2 text-start custom-scrollbar space-y-1"
                            >
                              {filteredDelegations.length === 0 ? (
                                <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                                  {lang === 'ar' ? 'لم يتم العثور على أي معتمدية' : 'Aucune localité trouvée'}
                                </div>
                              ) : (
                                filteredDelegations.map(d => (
                                  <div
                                    key={d}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDelegation(d);
                                      setDelegationQuery('');
                                      setOpenDropdown(null);
                                    }}
                                    className="del-item flex items-center gap-2.5 p-2 hover:bg-cyan-50 rounded-xl cursor-pointer transition-colors text-start"
                                  >
                                    <span className="w-6 h-6 flex items-center justify-center shrink-0">
                                      <img className="w-5 h-5 object-contain" src="/images/flag.png" alt="Localité" />
                                    </span>
                                    <div className="text-xs font-bold text-slate-800">{d}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>


                    {/* Upload 3 Documents Officiels du Soignant (1. Diplôme, 2. CIN/ID, 3. Inscription Ordre) */}
                    <div
                      id="signup-cv-container"
                      className={`bg-gradient-to-r from-cyan-50/80 to-teal-50/80 border-2 border-dashed rounded-xl p-3.5 transition-all ${signupErrors.cv ? 'border-rose-500 bg-rose-50/90' : 'border-[#0086cd]/40 hover:border-[#0086cd]'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <label className="text-xs sm:text-sm font-extrabold text-[#002b49] flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[#0086cd] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span id="doc-label-cv">
                            {lang === 'ar' ? 'تحميل الوثائق الرسمية (3 ملفات) *' : 'Justificatifs Officiels (3 Documents) *'}
                          </span>
                        </label>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="text-[11px] font-bold text-[#0086cd] bg-white hover:bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-full cursor-pointer transition-all inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>📂</span> <span>Sélection multiple (3 fichiers)</span>
                          </button>
                        </div>
                      </div>

                      {/* 3 Document Slots */}
                      <div className="space-y-2 text-left">
                        {[
                          {
                            key: 'diploma',
                            num: '1',
                            icon: '🎓',
                            title: 'Diplôme de Médecine / Spécialité',
                            subtitle: 'Certificat ou diplôme officiel de la Faculté de Médecine',
                            ref: diplomaInputRef
                          },
                          {
                            key: 'idCard',
                            num: '2',
                            icon: '🪪',
                            title: "Pièce d'Identité (CIN / Passeport)",
                            subtitle: "Carte d'Identité Nationale tunisienne (8 chiffres) ou Passeport",
                            ref: idCardInputRef
                          },
                          {
                            key: 'ordrePaper',
                            num: '3',
                            icon: '📜',
                            title: "Attestation d'Inscription à l'Ordre",
                            subtitle: "Document comportant votre numéro d'inscription au CNOM",
                            ref: ordreInputRef
                          }
                        ].map((slot) => {
                          const slotState = docFiles[slot.key];
                          const isUploaded = Boolean(slotState?.name);
                          return (
                            <div
                              key={slot.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                slot.ref.current?.click();
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isUploaded
                                  ? 'bg-white border-emerald-300 shadow-sm'
                                  : 'bg-white/80 hover:bg-white border-slate-200 hover:border-[#0086cd]/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                                    isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-50 text-[#0086cd]'
                                  }`}>
                                    {slot.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-black">Doc {slot.num}</span>
                                      <span className="truncate">{slot.title}</span>
                                    </div>
                                    {isUploaded ? (
                                      <div className="text-[11px] font-bold text-emerald-700 truncate mt-0.5">
                                        ✓ {slotState.name} {slotState.size ? `(${slotState.size})` : ''}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-slate-500 truncate">
                                        {slot.subtitle}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isUploaded ? (
                                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
                                      Remplacer
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-extrabold bg-[#0086cd]/10 text-[#0086cd] px-2.5 py-1 rounded-md">
                                      + Choisir fichier
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Live OCR feedback per slot */}
                              {slotState?.ocrLoading && (
                                <div className="mt-1.5 px-2 py-1 bg-cyan-50 border border-cyan-200 rounded-md text-cyan-800 text-[10px] font-bold flex items-center gap-1.5">
                                  <span className="animate-spin inline-block">⏳</span>
                                  <span>Analyse OCR du document ({slotState.ocrProgress}%)...</span>
                                </div>
                              )}

                              {!slotState?.ocrLoading && slotState?.ocrResult && (
                                <div className={`mt-1.5 px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1.5 ${
                                  (slot.key === 'ordrePaper' ? slotState.ocrResult.hasNumber : (slot.key === 'diploma' ? slotState.ocrResult.hasDiploma : slotState.ocrResult.hasIdCard))
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}>
                                  <span>
                                    {(slot.key === 'ordrePaper' ? slotState.ocrResult.hasNumber : (slot.key === 'diploma' ? slotState.ocrResult.hasDiploma : slotState.ocrResult.hasIdCard))
                                      ? '✅'
                                      : '⚠️'}
                                  </span>
                                  <span className="truncate">
                                    {slot.key === 'ordrePaper'
                                      ? (slotState.ocrResult.hasNumber
                                          ? `Numéro d'inscription extrait automatiquement : ${slotState.ocrResult.orderNumber}`
                                          : "Aucun numéro d'inscription officiel détecté dans ce document")
                                      : slot.key === 'diploma'
                                      ? slotState.ocrResult.diplomaLabel
                                      : slotState.ocrResult.idLabel}
                                  </span>
                                </div>
                              )}

                              <input
                                type="file"
                                ref={slot.ref}
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.target.value = '';
                                }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) processSlotFile(slot.key, f);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Hidden legacy summary preview for compatibility */}
                      {cvFileName && (
                        <div id="cv-file-preview" className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                          <span id="cv-filename-display" className="truncate">
                            {[docFiles.diploma.name, docFiles.idCard.name, docFiles.ordrePaper.name].filter(Boolean).length || 1} / 3 document(s) prêt(s)
                          </span>
                          <span id="doc-label-file-ready" className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md shrink-0">Prêt ✓</span>
                        </div>
                      )}

                      {/* Error Message Container when documents are missing */}
                      {signupErrors.cv && (
                        <div id="cv-file-error" className="mt-2 p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm">
                          <svg className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span id="doc-error-cv">⚠️ {signupErrors.cv}</span>
                        </div>
                      )}

                      <p id="doc-cv-hint" className="text-[11px] text-slate-500 mt-2 text-center">
                        Formats acceptés : PDF, PNG, JPG (Max 25 Mo/fichier). Vérification automatique OCR par l'Ordre des Médecins.
                      </p>

                      {/* Multi-file input */}
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        id="signup-cv"
                        name="signup-cv"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleCvChange}
                      />
                    </div>

                    {/* CTA Button */}
                    <button
                      id="doc-btn-signup-submit"
                      type="submit"
                      disabled={signupLoading}
                      className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3.5 px-6 rounded-xl text-sm sm:text-base shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {signupLoading ? '⏳ Envoi du dossier au secrétariat...' : (lang === 'ar' ? 'تأكيد طلب الانضمام' : 'Valider votre demande')}
                    </button>

                  </form>
                )}

                {/* ============================================================== */}
                {/* CONTAINER 2: SIGNUP SUCCESS CONFIRMATION SHEET                 */}
                {/* ============================================================== */}
                {isSignupSuccess && successRecord && (
                  <div id="signup-success-container" className="space-y-5 text-left animate-fadeIn">
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                          ✓
                        </div>
                        <div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Dossier Transmis avec Succès
                          </span>
                          <h3 className="text-xl font-black text-slate-900 mt-1">Demande Praticien Enregistrée !</h3>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Votre fiche de demande a bien été transmise à la direction médicale SahaTN. Votre dossier est désormais visible dans la console d'administration pour validation.
                      </p>

                      {/* Automated Email Confirmation Banner */}
                      <div className="bg-emerald-100/90 border border-emerald-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950 font-medium shadow-xs">
                        <span className="text-xl shrink-0">✉️</span>
                        <div className="space-y-1">
                          <span className="font-extrabold text-emerald-900 block text-sm">
                            E-mail officiel envoyé automatiquement !
                          </span>
                          <p className="leading-relaxed text-slate-700">
                            Un e-mail récapitulatif avec votre numéro de dossier (<strong className="font-mono text-emerald-900">{successRecord.id || successRecord.uuid}</strong>) et les consignes d'instruction médicale a été expédié à :
                            <strong className="block text-slate-900 font-black mt-0.5">{successRecord.email}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Recap Sheet Box */}
                      <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-bold">N° de Dossier</span>
                          <span id="succ-dossier-id" className="font-mono font-black text-[#0086cd]">{successRecord.id || successRecord.uuid}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-bold">Praticien</span>
                          <span id="succ-doctor-name" className="font-black text-slate-900">{successRecord.name}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-bold">Spécialité</span>
                          <span id="succ-specialty" className="font-bold text-[#00a896]">{successRecord.spec}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-bold">Gouvernorat & Localité</span>
                          <span id="succ-location" className="font-semibold text-slate-700">{successRecord.delegation ? `${successRecord.delegation}, ` : ''}{successRecord.city} ({successRecord.postal})</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-bold">Téléphone & Email</span>
                          <span id="succ-contact" className="font-mono text-slate-700">{successRecord.phone} · {successRecord.email}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-500 font-bold">Statut Actuel</span>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            ⏳ EN ATTENTE DE VALIDATION ADMIN
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <Link
                          to="/admin/dashboard"
                          className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>👨💼</span> Ouvrir l'Espace Admin pour Valider / Décliner
                        </Link>
                        <button
                          type="button"
                          onClick={handleResetSignUp}
                          className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>✍️</span> Remplir une autre fiche praticien
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* CONTAINER 3: SIGNIN FORM                                       */}
                {/* ============================================================== */}
                {formMode === 'signin' && (
                  <form id="form-signin" onSubmit={handleSignInSubmit} className="space-y-4">
                    <div>
                      <h2 id="doc-form-signin-title" className="text-2xl font-extrabold text-[#002b49] dark:text-white">
                        {lang === 'ar' ? 'تسجيل دخول الطبيب' : 'Connexion Praticien'}
                      </h2>
                      <p id="doc-form-signin-subtitle" className="text-xs text-slate-500 mt-1">
                        {lang === 'ar' ? 'سجّل الدخول إلى فضاء عيادتك الطبية المسجلة مسبقاً.' : 'Connectez-vous à votre espace cabinet médical déjà enregistré.'}
                      </p>
                    </div>

                    {/* Google Sign-In Button for Doctors */}
                    <GoogleSignInButton
                      mode="login"
                      targetRole="DOCTOR"
                      onSuccess={(authenticatedUser) => {
                        const role = (authenticatedUser?.role || '').toUpperCase();
                        const isDoc = role === 'DOCTOR' || role === 'PRATICIEN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || Boolean(authenticatedUser?.doctorId);
                        if (!isDoc) {
                          setUnapprovedModal({
                            isOpen: true,
                            email: authenticatedUser?.email || '',
                            name: authenticatedUser?.name || '',
                            requestStatus: 'NONE',
                            message: `Ce compte Google (${authenticatedUser?.email}) n'est pas un compte praticien approuvé.`
                          });
                          return;
                        }
                        sessionStorage.removeItem('sahatn_doctor_session_locked');
                        sessionStorage.setItem('sahatn_doctor_active_session', 'true');
                        localStorage.setItem('sahatn_doctor_authenticated', 'true');
                        sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
                        navigate('/doctor/dashboard', { replace: true });
                      }}
                      onError={(errMsg, err) => {
                        const errData = err?.data || {};
                        if (errData.error === 'DOCTOR_NOT_APPROVED' || errMsg?.includes('pas un compte praticien') || errMsg?.includes('praticien')) {
                          setUnapprovedModal({
                            isOpen: true,
                            email: errData.email || 'votre compte Google',
                            name: errData.name || '',
                            requestStatus: errData.requestStatus || 'NONE',
                            message: errData.message || errMsg
                          });
                        } else {
                          setSigninError(errMsg);
                        }
                      }}
                    />

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-1">
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                      <span className="bg-white dark:bg-[#0c1a2e] px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                        {lang === 'ar' ? 'أو' : 'ou'}
                      </span>
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                    </div>

                    {signinError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-semibold">
                        {signinError}
                      </div>
                    )}

                    <div>
                      <label id="doc-label-identifier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'ar' ? 'معرف عمادة الأطباء / البريد الإلكتروني المهني *' : 'Identifiant Ordre des Médecins / Email Pro *'}
                      </label>
                      <input
                        type="text"
                        id="signin-identifier"
                        required
                        value={signinEmail}
                        onChange={(e) => setSigninEmail(e.target.value)}
                        placeholder="votre.email@cabinet.tn"
                        className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0086cd] focus:border-[#0086cd] outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label id="doc-label-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? 'كلمة المرور *' : 'Mot de passe *'}
                        </label>
                        <button
                          type="button"
                          onClick={() => alert(
                            lang === 'ar'
                              ? 'لاسترجاع كلمة المرور، يرجى استخدام الاسترجاع عبر البريد الإلكتروني أو التواصل مع دعم موعدي.'
                              : 'Pour réinitialiser votre mot de passe, veuillez utiliser la récupération par email ou contacter le support SahaTN.'
                          )}
                          className="text-xs text-[#0086cd] dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                        >
                          {lang === 'ar' ? 'نسيت كلمة المرور ؟' : 'Mot de passe oublié ?'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={signinShowPass ? 'text' : 'password'}
                          id="signin-password"
                          required
                          value={signinPassword}
                          onChange={(e) => setSigninPassword(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-3 pr-11 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0086cd] focus:border-[#0086cd] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setSigninShowPass(!signinShowPass)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                          title="Afficher le mot de passe"
                        >
                          <svg className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <button
                      id="doc-form-signin-btn"
                      type="submit"
                      disabled={signinLoading}
                      className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {signinLoading
                        ? (lang === 'ar' ? 'جاري التحقق...' : 'Connexion en cours...')
                        : (lang === 'ar' ? '🚀 الدخول إلى العيادة' : '🚀 Accéder à Mon Cabinet')}
                    </button>
                  </form>
                )}

              </div>

              {/* Bottom Note */}
              <div className="pt-6 border-t border-slate-100 space-y-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2 text-teal-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00b4b6]"></span>
                  <span id="doc-form-help-note">
                    {lang === 'ar' ? 'مستشارونا على ذمتكم لمساعدتكم في اختيار الحل الأنسب لنشاطكم.' : 'Nos conseillers sont là pour vous aider à choisir l\'offre la plus adaptée à votre activité.'}
                  </span>
                </div>
                <p>
                  <a id="doc-form-privacy-link" href="/#aide" className="text-[#0086cd] hover:underline font-semibold">
                    {lang === 'ar' ? 'معرفة المزيد حول جمع ومعالجة معطياتكم الشخصية' : 'En savoir plus sur la collecte de vos données personnelles'}
                  </a>
                </p>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: CHIFFRES CLÉS & CONFIANCE                           */}
      {/* ============================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="p-6 sm:p-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div id="doc-stat1-val" className="stat-counter-ltr text-3xl sm:text-4xl font-black text-[#002b49] dark:text-white" dir="ltr">+1 400</div>
            <p id="doc-stat1-label" className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'طبيب وإطار صحي معتمد في تونس' : 'Professionnels de santé en Tunisie'}
            </p>
          </div>
          <div className="space-y-1 border-l rtl:border-l-0 rtl:border-r border-slate-100 dark:border-slate-800">
            <div id="doc-stat2-val" className="stat-counter-ltr text-3xl sm:text-4xl font-black text-[#0086cd]" dir="ltr">+4,2 Mo</div>
            <p id="doc-stat2-label" className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'استشارة وموعد طبي مُدار' : 'Consultations & RDV gérés'}
            </p>
          </div>
          <div className="space-y-1 border-l rtl:border-l-0 rtl:border-r border-slate-100 dark:border-slate-800">
            <div id="doc-stat3-val" className="stat-counter-ltr text-3xl sm:text-4xl font-black text-emerald-600" dir="ltr">98 %</div>
            <p id="doc-stat3-label" className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'نسبة رضا الأطباء والعيادات' : 'Taux de satisfaction praticiens'}
            </p>
          </div>
          <div className="space-y-1 border-l rtl:border-l-0 rtl:border-r border-slate-100 dark:border-slate-800">
            <div id="doc-stat4-val" className="stat-counter-ltr text-3xl sm:text-4xl font-black text-[#00b4b6]" dir="ltr">-50 %</div>
            <p id="doc-stat4-label" className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'انخفاض في المكالمات وضغط السكرتارية' : "D'appels au secrétariat"}
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: PILIERS ET FONCTIONNALITÉS (STYLE DOCTOLIB PRO)     */}
      {/* ============================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span id="doc-features-badge" className="bg-cyan-100 dark:bg-cyan-950 text-[#0086cd] text-xs sm:text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
            {isAr ? 'حل رقمي متكامل للعيادات' : 'Solution Complète Cabinet'}
          </span>
          <h2 id="doc-features-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#002b49] dark:text-white">
            {isAr ? 'تجربة مبسطة وذكية لك ولجميع مرضاك' : 'Une expérience simplifiée pour vous et vos patients'}
          </h2>
          <p id="doc-features-subtitle" className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
            {isAr ? 'اكتشف الميزات المصممة خصيصاً للأطباء وأطباء الأسنان والأخصائيين في تونس.' : 'Découvrez les fonctionnalités conçues spécifiquement pour les médecins, dentistes et spécialistes en Tunisie.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-[#0c162d] p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between group">
            <div className="space-y-3.5 text-start">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <img src="/images/calendar1.png" className="h-10 w-10 object-contain" alt="Agenda" />
              </div>
              <h3 id="doc-card1-title" className="text-xl font-extrabold text-[#002b49] dark:text-white">
                {isAr ? 'جدول مواعيد طبي 24/7' : 'Agenda Médical 24h/7j'}
              </h3>
              <p id="doc-card1-desc" className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {isAr ? 'حجز مواعيد أونلاين تلقائي وفقاً لأوقات عملك وقواعد استشاراتك الخاصة.' : 'Prise de RDV en ligne automatique selon vos plages horaires et vos règles de consultation.'}
              </p>
            </div>
            <div id="doc-card1-link" className="text-xs sm:text-sm font-black text-[#0086cd] flex items-center gap-1.5">
              <span>{isAr ? 'إدارة ذكية' : 'Gestion intelligente'}</span>
              <span>{isAr ? '←' : '→'}</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-[#0c162d] p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between group">
            <div className="space-y-3.5 text-start">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <img src="/images/sms.png" className="h-10 w-10 object-contain" alt="SMS" />
              </div>
              <h3 id="doc-card2-title" className="text-xl font-extrabold text-[#002b49] dark:text-white">
                {isAr ? 'تنبيهات عبر واتساب و SMS' : 'Rappels WhatsApp & SMS'}
              </h3>
              <p id="doc-card2-desc" className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {isAr ? 'قلل من المواعيد الفائتة بنسبة 70% بفضل الإرسال التلقائي لتأكيدات وتذكيرات الحجز.' : "Réduisez les rendez-vous manqués de 70% grâce à l'envoi de confirmations et rappels automatiques."}
              </p>
            </div>
            <div id="doc-card2-link" className="text-xs sm:text-sm font-black text-[#00b4b6] flex items-center gap-1.5">
              <span>{isAr ? 'بدون تأخير' : 'Zéro retard'}</span>
              <span>{isAr ? '←' : '→'}</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-[#0c162d] p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between group">
            <div className="space-y-3.5 text-start">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <img src="/images/cnam.png" className="h-10 w-10 object-contain" alt="CNAM" />
              </div>
              <h3 id="doc-card3-title" className="text-xl font-extrabold text-[#002b49] dark:text-white">
                {isAr ? 'ملف المريض والكنام (CNAM)' : 'Dossier Patient & CNAM'}
              </h3>
              <p id="doc-card3-desc" className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {isAr ? 'سجل كامل للاستشارات، تحرير الوصفات الطبية والإرسال الإلكتروني لجداول الكنام.' : "Historique des consultations, édition d'ordonnances et télétransmission directe des bordereaux CNAM."}
              </p>
            </div>
            <div id="doc-card3-link" className="text-xs sm:text-sm font-black text-amber-600 flex items-center gap-1.5">
              <span>{isAr ? 'متوافق مع الكنام' : 'Conforme CNAM'}</span>
              <span>{isAr ? '←' : '→'}</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-[#0c162d] p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between group">
            <div className="space-y-3.5 text-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <img src="/images/INPDP1.png" className="h-10 w-10 object-contain" alt="INPDP" />
              </div>
              <h3 id="doc-card4-title" className="text-xl font-extrabold text-[#002b49] dark:text-white">
                {isAr ? 'أمان معتمد INPDP للبيانات الصحية' : 'Sécurité INPDP Santé'}
              </h3>
              <p id="doc-card4-desc" className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {isAr ? 'بيانات مستضافة في تونس تحت تشفير SSL 256-bit، متوافقة تماماً مع القانون عدد 2004-63.' : 'Données hébergées en Tunisie sous cryptage SSL 256-bit, totalement conforme à la loi N° 2004-63.'}
              </p>
            </div>
            <div id="doc-card4-link" className="text-xs sm:text-sm font-black text-emerald-600 flex items-center gap-1.5">
              <span>{isAr ? 'آمن وموثق 100%' : 'Certifié 100% sûr'}</span>
              <span>{isAr ? '←' : '→'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: TÉMOIGNAGES SOIGNANTS (SOCIAL PROOF)                */}
      {/* ============================================================== */}
      <section className="bg-white dark:bg-[#0c162d] py-16 border-y border-slate-200/60 dark:border-slate-800 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 id="doc-reviews-title" className="text-3xl sm:text-4xl font-extrabold text-[#002b49] dark:text-white">
              {isAr ? 'موصى به من قبل زملائك الأطباء في تونس' : 'Recommandé par vos confrères en Tunisie'}
            </h2>
            <p id="doc-reviews-subtitle" className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              {isAr ? 'اكتشف كيف يغير Maw2idi الحياة اليومية للعيادات الطبية التونسية.' : 'Découvrez comment SahaTN transforme le quotidien des cabinets médicaux.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="bg-slate-50 dark:bg-slate-850 p-7 rounded-3xl border border-slate-200/60 dark:border-slate-800 space-y-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-3.5 text-start">
                <div className="flex items-center gap-1.5 text-amber-400 text-base">★ ★ ★ ★</div>
                <p id="doc-review1-text" className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium italic">
                  {isAr 
                    ? '«غيّر Maw2idi إدارة عيادتي بالكامل. ساهمت تنبيهات واتساب في تقليل المواعيد الفائتة بأكثر من 80%. وأخيراً ارتاحت السكرتارية من ضغط المكالمات المستمر.»'
                    : '« SahaTN a complètement transformé la gestion de mon cabinet. Les rappels WhatsApp ont réduit les rendez-vous manqués de plus de 80%. Mon secrétariat souffle enfin. »'}
                </p>
              </div>
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                <img src="/images/doctor.png" className="w-12 h-12 rounded-full object-cover bg-teal-100 p-1 shadow-sm" alt="Dr Selim" />
                <div className="text-start">
                  <h4 id="doc-review1-doc" className="text-sm sm:text-base font-extrabold text-[#002b49] dark:text-white">Dr. Selim Ben Ali</h4>
                  <p id="doc-review1-spec" className="text-xs sm:text-sm text-slate-500 font-semibold">
                    {isAr ? 'طبيب أمراض القلب — تونس (النصر)' : 'Cardiologue — Tunis (Ennasr)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-50 dark:bg-slate-850 p-7 rounded-3xl border border-slate-200/60 dark:border-slate-800 space-y-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-3.5 text-start">
                <div className="flex items-center gap-1.5 text-amber-400 text-base">★ ★ ★ ★ ★</div>
                <p id="doc-review2-text" className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium italic">
                  {isAr
                    ? '«الربط مع الكنام والملف الطبي الرقمي يتميزان ببساطة وسرعة فائقة. أصبحت ملفات المرضى في متناول يدي بنقرة واحدة وبأعلى درجات الأمان.»'
                    : "« La télétransmission CNAM et le dossier médical informatisé sont d'une simplicité remarquable. Mes dossiers patients sont accessibles en 1 clic en toute sécurité. »"}
                </p>
              </div>
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                <img src="/images/doctor.png" className="w-12 h-12 rounded-full object-cover bg-cyan-100 p-1 shadow-sm" alt="Dr Leila" />
                <div className="text-start">
                  <h4 id="doc-review2-doc" className="text-sm sm:text-base font-extrabold text-[#002b49] dark:text-white">Dr. Leila Hamdi</h4>
                  <p id="doc-review2-spec" className="text-xs sm:text-sm text-slate-500 font-semibold">
                    {isAr ? 'أخصائية طب الأطفال — سوسة' : 'Pédiatre — Sousse'}
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-50 dark:bg-slate-850 p-7 rounded-3xl border border-slate-200/60 dark:border-slate-800 space-y-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-3.5 text-start">
                <div className="flex items-center gap-1.5 text-amber-400 text-base">★ ★ ★ ★ ★</div>
                <p id="doc-review3-text" className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium italic">
                  {isAr
                    ? '«تم التثبيت في أقل من 24 ساعة بمساعدة فريق المنصة. الدعم الفني فائق الاستجابة ومحلي في تونس. أنصح به بشدة لكل زميل!»'
                    : "« L'installation s'est faite en moins de 24h avec l'accompagnement de l'équipe SahaTN. L'assistance technique est ultra-réactive en Tunisie. Je recommande vivement ! »"}
                </p>
              </div>
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                <img src="/images/doctor.png" className="w-12 h-12 rounded-full object-cover bg-emerald-100 p-1 shadow-sm" alt="Dr Yassine" />
                <div className="text-start">
                  <h4 id="doc-review3-doc" className="text-sm sm:text-base font-extrabold text-[#002b49] dark:text-white">Dr. Yassine Mansour</h4>
                  <p id="doc-review3-spec" className="text-xs sm:text-sm text-slate-500 font-semibold">
                    {isAr ? 'جراح أسنان — صفاقس' : 'Chirurgien Dentiste — Sfax'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: FAQ INTERACTIVE PRATICIENS                          */}
      {/* ============================================================== */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-8">
        <div className="text-center space-y-3">
          <h2 id="doc-faq-title" className="text-3xl sm:text-4xl font-extrabold text-[#002b49] dark:text-white">
            {isAr ? 'الأسئلة الشائعة للأطباء وممتهني الصحة' : 'Questions fréquentes des soignants'}
          </h2>
          <p id="doc-faq-subtitle" className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
            {isAr ? 'كل ما تحتاج معرفته لتجهيز عيادتك بكل راحة واطمئنان.' : 'Tout ce que vous devez savoir pour équiper votre cabinet en toute sérénité.'}
          </p>
        </div>

        <div className="space-y-4">
          {/* FAQ 1 */}
          <div className="bg-white dark:bg-[#0c162d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
              className="w-full p-5 sm:p-6 text-start font-extrabold text-sm sm:text-base text-[#002b49] dark:text-white flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span id="doc-faq1-q">
                {isAr ? 'كم من الوقت يستغرق إعداد وتفعيل المنصة في عيادتي؟' : 'Combien de temps prend la mise en place de SahaTN dans mon cabinet ?'}
              </span>
              <span id="faq-1-icon" className="text-[#0086cd] font-black text-xl">{openFaq === 1 ? '－' : '＋'}</span>
            </button>
            {openFaq === 1 && (
              <div id="faq-1" className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 font-medium animate-fadeIn text-start">
                <span id="doc-faq1-a">
                  {isAr 
                    ? 'يستغرق الإعداد أقل من 24 ساعة. يقوم مستشار مخصص بضبط جدول مواعيدك وفقاً لتوجيهاتك وتدريب فريقك الطبي أو سكرتاريتك مجاناً.'
                    : 'La mise en place prend moins de 24 heures. Un conseiller dédié configure votre agenda selon vos consignes et forme gratuitement votre équipe médicale ou votre secrétariat.'}
                </span>
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="bg-white dark:bg-[#0c162d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
              className="w-full p-5 sm:p-6 text-start font-extrabold text-sm sm:text-base text-[#002b49] dark:text-white flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span id="doc-faq2-q">
                {isAr ? 'هل بياناتي الطبية مستضافة بأمان داخل تونس؟' : 'Mes données médicales sont-elles hébergées en sécurité en Tunisie ?'}
              </span>
              <span id="faq-2-icon" className="text-[#0086cd] font-black text-xl">{openFaq === 2 ? '－' : '＋'}</span>
            </button>
            {openFaq === 2 && (
              <div id="faq-2" className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 font-medium animate-fadeIn text-start">
                <span id="doc-faq2-a">
                  {isAr
                    ? 'نعم، بنسبة 100%. يتم تخزين جميع البيانات الصحية على خوادم آمنة معتمدة داخل تونس، مع تشفير SSL 256-bit ونسخ احتياطي يومي تلقائي وفقاً لقانون حماية المعطيات الشخصية عدد 2004-63 (الهيئة الوطنية لحماية المعطيات الشخصية INPDP).'
                    : 'Oui, à 100%. Toutes les données de santé sont stockées sur des serveurs sécurisés certifiés en Tunisie, avec chiffrement SSL 256-bit et sauvegarde quotidienne automatique conformément à la loi N° 2004-63 (INPDP).'}
                </span>
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="bg-white dark:bg-[#0c162d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
              className="w-full p-5 sm:p-6 text-start font-extrabold text-sm sm:text-base text-[#002b49] dark:text-white flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span id="doc-faq3-q">
                {isAr ? 'هل يمكنني استيراد قائمة مرضاي الحاليين؟' : 'Puis-je importer ma liste de patients existante ?'}
              </span>
              <span id="faq-3-icon" className="text-[#0086cd] font-black text-xl">{openFaq === 3 ? '－' : '＋'}</span>
            </button>
            {openFaq === 3 && (
              <div id="faq-3" className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 font-medium animate-fadeIn text-start">
                <span id="doc-faq3-a">
                  {isAr
                    ? 'بالتأكيد. تتولى فرقنا التقنية استيراد قاعدة بيانات مرضاك الحالية مجاناً وبكل أمان (سواء كانت ملفات Excel أو CSV أو برامج قديمة).'
                    : "Absolument. Nos équipes se chargent gratuitement de l'importation sécurisée de votre base de données patients (fichiers Excel, CSV ou anciens logiciels)."}
                </span>
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="bg-white dark:bg-[#0c162d] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
              className="w-full p-5 sm:p-6 text-start font-extrabold text-sm sm:text-base text-[#002b49] dark:text-white flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span id="doc-faq4-q">
                {isAr ? 'هل المنصة متوافقة مع استرجاع مصاريف الكنام (CNAM)؟' : 'Est-ce compatible avec la prise en charge CNAM ?'}
              </span>
              <span id="faq-4-icon" className="text-[#0086cd] font-black text-xl">{openFaq === 4 ? '－' : '＋'}</span>
            </button>
            {openFaq === 4 && (
              <div id="faq-4" className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 font-medium animate-fadeIn text-start">
                <span id="doc-faq4-a">
                  {isAr
                    ? 'نعم، يدعم Maw2idi التعريفات التعاقدية للكنام، والحساب التلقائي لمبالغ الاسترجاع، وإصدار جداول التعويضات الرسمية المعتمدة.'
                    : 'Oui, SahaTN gère les tarifs conventionnés CNAM, le calcul automatique des remboursements et la génération conforme des bordereaux de remboursement.'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* UNIFIED GLOBAL FOOTER                                         */}
      {/* ============================================================== */}
      <Footer
        onOpenDoctorSignup={() => {
          setFormMode('signup');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDoctorLogin={() => setShowLoginModal(true)}
      />

      {/* ============================================================== */}
      {/* UNAPPROVED DOCTOR MODAL (ALERT NOT APPROVED PRACTITIONER)      */}
      {/* ============================================================== */}
      {unapprovedModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-[#0c1a2e] rounded-3xl shadow-2xl border border-rose-100 dark:border-rose-900/30 max-w-lg w-full overflow-hidden transform transition-all animate-scale-up"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Top decorative gradient bar */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-teal-500" />

            <div className="p-6 sm:p-7 space-y-5">
              {/* Header with Icon */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0 shadow-sm text-amber-600 dark:text-amber-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 mb-1">
                    <span>⚠️</span>
                    <span>{isAr ? 'حساب غير معتمد' : 'Accès Praticien Restreint'}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                    {isAr ? 'هذا الحساب ليس حساب طبيب معتمد' : 'Compte Praticien Non Approuvé'}
                  </h3>
                </div>
              </div>

              {/* Email Badge */}
              {unapprovedModal.email && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs text-xs font-bold shrink-0">
                    📧
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      {isAr ? 'البريد الإلكتروني' : 'Compte Google détecté'}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {unapprovedModal.email}
                    </p>
                  </div>
                  {unapprovedModal.requestStatus === 'PENDING' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                      {isAr ? 'قيد المراجعة' : 'En examen'}
                    </span>
                  )}
                </div>
              )}

              {/* Message Explanation */}
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                {unapprovedModal.requestStatus === 'PENDING' ? (
                  <p>
                    {isAr 
                      ? 'طلب انضمامكم إلى منصة موعدي كطبيب قيد المراجعة حالياً من قبل الإدارة الطبية. سيصلكم بريد إلكتروني فور تفعيل الحساب.'
                      : 'Votre demande d\'adhésion en tant que praticien est actuellement en cours d\'examen par notre équipe administrative. Vous recevrez un email dès que votre accès sera validé.'}
                  </p>
                ) : (
                  <p>
                    {isAr 
                      ? 'عنوان البريد الإلكتروني هذا ليس مسجلاً كحساب طبيب معتمد في قاعدة بيانات موعدي. فضاء الطبيب مخصص فقط للممارسين المعتمدين من عمادة الأطباء.'
                      : 'Cette adresse Google n\'est associée à aucun profil praticien approuvé dans notre base de données. L\'accès au tableau de bord soignant (agenda, téléconsultation, dossiers patients) est strictement réservé aux professionnels de santé agréés.'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Button 1: Submit practitioner signup */}
                <button
                  type="button"
                  onClick={() => {
                    const emailToTransfer = unapprovedModal.email;
                    setUnapprovedModal({ isOpen: false, email: '', name: '', requestStatus: 'NONE', message: '' });
                    setFormMode('signup');
                    setIsSignupSuccess(false);
                    if (emailToTransfer && emailToTransfer.includes('@')) {
                      setEmail(emailToTransfer);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📝</span>
                  <span>{isAr ? 'تقديم طلب انضمام كطبيب جديد' : 'Déposer une demande d\'adhésion praticien'}</span>
                </button>

                {/* Button 2: Patient Portal Login */}
                <button
                  type="button"
                  onClick={() => {
                    setUnapprovedModal({ isOpen: false, email: '', name: '', requestStatus: 'NONE', message: '' });
                    setShowLoginModal(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>👤</span>
                  <span>{isAr ? 'الدخول كـمريض' : 'Se connecter en tant que Patient'}</span>
                </button>

                {/* Button 3: Close / Retry */}
                <button
                  type="button"
                  onClick={() => setUnapprovedModal({ isOpen: false, email: '', name: '', requestStatus: 'NONE', message: '' })}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isAr ? 'إغلاق وإعادة المحاولة بحساب آخر' : 'Fermer et réessayer avec un autre compte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LOGIN MODAL DIALOG (REUSABLE 2-COLUMN PREMIUM MODAL)          */}
      {/* ============================================================== */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onOpenSignup={() => {
          setShowLoginModal(false);
          setFormMode('signup');
          setIsSignupSuccess(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenForgotPassword={(email) => {
          alert(`Un lien de réinitialisation sera envoyé à ${email || 'votre adresse email'}.`);
        }}
      />

    </div>
  );
}
