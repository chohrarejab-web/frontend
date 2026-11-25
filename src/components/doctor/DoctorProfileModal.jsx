import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Camera, Upload, Download, Eye, Trash2, Check, Save, User, Stethoscope, 
  MapPin, Phone, DollarSign, Shield, Video, Award, FileText, 
  ExternalLink, Sparkles, AlertCircle, ChevronDown,
  GraduationCap, Microscope, Languages, Plus, PenTool,
  Map, Crosshair, RotateCcw, Search, Loader2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  SPECIALTIES, GOVERNORATES_AR, LOCATIONS, TUNISIAN_GOVERNORATES,
  TUNISIA_COORDINATES, getCoordinatesByLocation, getDoctorCoordinates 
} from '../../data/tunisiaData';
import ToastNotification from '../common/ToastNotification';
import TunisianPhoneInput from '../common/TunisianPhoneInput';
import SpecialtyDropdown from '../common/SpecialtyDropdown';
import { translateText, isArabicText } from '../../services/translator';
import { 
  getSmartDiplomaSuggestions, 
  getSmartEquipmentSuggestions,
  EQUIPMENT_SUGGESTIONS,
  DIPLOMA_SUGGESTIONS 
} from '../../data/medicalSuggestions';
import { reverseGeocodeFromCoordinates } from '../../services/geoService';
import { 
  cleanDoctorName, 
  formatDoctorName, 
  resolveDoctorSpecialty, 
  resolveDoctorCity, 
  resolveDoctorTitle 
} from '../../utils/i18nHelper';

export { EQUIPMENT_SUGGESTIONS, DIPLOMA_SUGGESTIONS };

export function formatTunisianPhone(input) {
  if (!input) return '\u200E+216 ';
  let text = String(input).trim().replace(/\u200E/g, '');
  if (text.startsWith('+216')) {
    text = text.slice(4);
  } else if (text.startsWith('00216')) {
    text = text.slice(5);
  } else if (text.startsWith('216') && text.replace(/\D/g, '').length > 8) {
    text = text.slice(3);
  }
  let digits = text.replace(/\D/g, '').slice(0, 8);
  let res = '\u200E+216 ';
  if (digits.length > 0) res += digits.slice(0, 2);
  if (digits.length > 2) res += ' ' + digits.slice(2, 5);
  if (digits.length > 5) res += ' ' + digits.slice(5, 8);
  return res + '\u200E';
}

const PRESET_DOCTOR_AVATARS = [
  { id: 'selim', labelFr: 'Dr. Selim', labelAr: 'د. سليم', url: '/images/doctor_selim.jpg' },
  { id: 'doc-m1', labelFr: 'Praticien 1', labelAr: 'طبيب 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-f1', labelFr: 'Praticienne 1', labelAr: 'طبيبة 1', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-m2', labelFr: 'Praticien 2', labelAr: 'طبيب 2', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-f2', labelFr: 'Praticienne 2', labelAr: 'طبيبة 2', url: 'https://images.unsplash.com/photo-1594824813585-055db37a8585?auto=format&fit=crop&w=350&h=350&q=80' },
  { id: 'doc-m3', labelFr: 'Praticien 3', labelAr: 'طبيب 3', url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=350&h=350&q=80' }
];


export const COMMON_LANGUAGES = [
  { id: 'Français', label: 'Français', flag: '🇫🇷' },
  { id: 'Arabe', label: 'العربية (Arabe)', flag: '🇹🇳' },
  { id: 'Anglais', label: 'English (Anglais)', flag: '🇬🇧' },
  { id: 'Italien', label: 'Italiano (Italien)', flag: '🇮🇹' },
  { id: 'Allemand', label: 'Deutsch (Allemand)', flag: '🇩🇪' },
  { id: 'Espagnol', label: 'Español (Espagnol)', flag: '🇪🇸' }
];

export const ACCESSIBILITY_OPTIONS = [
  "Accès PMR / Ascenseur Étage 2",
  "Accès PMR / Ascenseur",
  "Accès Rez-de-chaussée de plain-pied",
  "Parking réservé aux patients",
  "Rampe d'accès fauteuil roulant"
];

function resolveDoctorAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') return '/images/doctor_selim.jpg';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

function findBestSpecialtyMatch(spec) {
  if (!spec) return SPECIALTIES[0]?.fr || 'Médecine Générale';
  const directMatch = SPECIALTIES.find(s => s.fr.toLowerCase() === String(spec).trim().toLowerCase());
  if (directMatch) return directMatch.fr;
  
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetNorm = norm(spec);
  const fuzzy = SPECIALTIES.find(s => {
    const sNorm = norm(s.fr);
    return sNorm === targetNorm || sNorm.includes(targetNorm) || targetNorm.includes(sNorm);
  });
  return fuzzy ? fuzzy.fr : spec;
}

export default function DoctorProfileModal({
  isOpen,
  onClose,
  doctorId = 'doc-1',
  initialDoctor = null,
  onDoctorUpdated
}) {
  const { user, updateProfile } = useAuth();
  const { lang, t, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cvFileInputRef = useRef(null);
  const signatureFileInputRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const [showDrawSignatureModal, setShowDrawSignatureModal] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const closeTimeoutRef = useRef(null);
  const delegationWrapperRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'cabinet' | 'bio'
  const [showDelegationSuggestions, setShowDelegationSuggestions] = useState(false);

  // Map Pointage interactive picker state
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [extractedInfoMsg, setExtractedInfoMsg] = useState(null);
  const [recentlyExtracted, setRecentlyExtracted] = useState(false);
  const [mapSearchText, setMapSearchText] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const geocodeTimeoutRef = useRef(null);
  const isMapInteractingRef = useRef(false);
  const modalMapContainerRef = useRef(null);
  const modalMapInstanceRef = useRef(null);
  const modalMarkerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, []);

  // Close delegation suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (delegationWrapperRef.current && !delegationWrapperRef.current.contains(e.target)) {
        setShowDelegationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    name: 'Dr. Selim Ben Ali',
    title: 'Ancien Interne des Hôpitaux de Tunis',
    specialty: 'Cardiologie & Maladies Vasculaires',
    specialty_fr: 'Cardiologie & Maladies Vasculaires',
    specialty_ar: 'أخصائي أمراض القلب والأوعية الدموية',
    city: 'Tunis',
    delegation: 'Ennasr 2',
    address: 'Avenue Hédi Nouira, Résidence Les Palmiers, Bloc B, Ennasr 2, 2037 Tunis',
    lat: 36.8742,
    lng: 10.1583,
    phone: '+216 71 830 120',
    email: 'drselimbenali@sahatn.tn',
    fee: '70',
    cnam: true,
    telehealth: true,
    avatar: '/images/doctor_selim.jpg',
    bio: 'Spécialiste en cardiologie clinique, échocardiographie Doppler haute résolution et suivi des pathologies cardiovasculaires. Consultation sur rendez-vous au cabinet ou téléconsultation sécurisée.',
    bioAr: '',
    diplomas: [
      "Diplôme d'État de Docteur en Médecine",
      "Diplôme d'Études Spécialisées",
      "Membre de l'Ordre des Médecins de Tunisie"
    ],
    equipment: [
      "Cabinet informatisé",
      "Équipement d'examen spécialisé"
    ],
    languages: "Français, Arabe, Anglais",
    accessibility: "Accès PMR / Ascenseur Étage 2",
    cvFileName: '',
    cvFileData: '',
    signature: '',
    signatureData: '',
    rating: '4.95',
    reviewsCount: 41
  });

  const [newDiplomaInput, setNewDiplomaInput] = useState('');
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [diplomaCategory, setDiplomaCategory] = useState('all'); // 'all' | 'specialty' | 'inferred' | 'universal'
  const [equipmentCategory, setEquipmentCategory] = useState('all'); // 'all' | 'specialty' | 'inferred' | 'universal'
  const [diplomaSearch, setDiplomaSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [isTranslatingBioModal, setIsTranslatingBioModal] = useState(false);
  const [bioPreviewAr, setBioPreviewAr] = useState('');

  const handleTranslateBioInModal = async () => {
    if (!formData.bio || !formData.bio.trim()) return;
    setIsTranslatingBioModal(true);
    try {
      const isAlreadyAr = isArabicText(formData.bio);
      const targetLang = isAlreadyAr ? 'fr' : 'ar';
      const translated = await translateText(formData.bio, targetLang);
      setBioPreviewAr(translated);
      setFormData(prev => ({
        ...prev,
        bioAr: isAlreadyAr ? prev.bio : translated,
        presentationAr: isAlreadyAr ? prev.bio : translated
      }));
    } catch (err) {
      console.warn('Modal translation error:', err);
    } finally {
      setIsTranslatingBioModal(false);
    }
  };

  // Intelligent Suggestions computed dynamically based on Doctor's Specialty, Diplomas & Equipment
  const smartDiplomas = useMemo(() => {
    return getSmartDiplomaSuggestions({
      specialty: formData.specialty,
      equipment: formData.equipment || [],
      currentDiplomas: formData.diplomas || [],
      filterCategory: diplomaCategory,
      searchQuery: diplomaSearch
    });
  }, [formData.specialty, formData.equipment, formData.diplomas, diplomaCategory, diplomaSearch]);

  const smartEquipment = useMemo(() => {
    return getSmartEquipmentSuggestions({
      specialty: formData.specialty,
      diplomas: formData.diplomas || [],
      currentEquipment: formData.equipment || [],
      filterCategory: equipmentCategory,
      searchQuery: equipmentSearch
    });
  }, [formData.specialty, formData.diplomas, formData.equipment, equipmentCategory, equipmentSearch]);

  // Load doctor details when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (initialDoctor) {
      applyDoctorData(initialDoctor);
      return;
    }

    const docIdToFetch = doctorId || user?.doctorId || 'doc-1';
    setLoading(true);

    api.getDoctorById(docIdToFetch)
      .then(res => {
        const docData = res?.doctor || res?.data || (res?.success && res?.data);
        if (docData) {
          applyDoctorData(docData);
        }
      })
      .catch(err => {
        console.warn('Could not load doctor details from API, using defaults:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, doctorId, initialDoctor]);

  const applyDoctorData = (doc) => {
    if (!doc) return;
    const rawSpec = doc.specialty || doc.specialty_fr || doc.specialtyFr;
    const matchedSpec = rawSpec ? findBestSpecialtyMatch(rawSpec) : null;
    const resolvedCoords = getDoctorCoordinates(doc);

    setFormData(prev => ({
      ...prev,
      name: doc.name ? formatDoctorName(doc.name, isAr) : prev.name,
      title: doc.title || prev.title,
      specialty: matchedSpec || prev.specialty,
      specialty_fr: matchedSpec || doc.specialty_fr || doc.specialtyFr || prev.specialty_fr,
      specialty_ar: doc.specialty_ar || doc.specialtyAr || prev.specialty_ar,
      city: doc.city || prev.city,
      delegation: doc.delegation || prev.delegation,
      lat: (doc.lat !== undefined && doc.lat !== null && doc.lat !== '') ? parseFloat(doc.lat) : resolvedCoords.lat,
      lng: (doc.lng !== undefined && doc.lng !== null && doc.lng !== '') ? parseFloat(doc.lng) : resolvedCoords.lng,
      address: doc.address || prev.address,
      phone: formatTunisianPhone(doc.phone || prev.phone),
      email: doc.email || prev.email,
      fee: (() => {
        if (doc.fee === undefined || doc.fee === null || doc.fee === '') {
          return prev.fee !== undefined ? String(prev.fee) : '70';
        }
        const raw = String(doc.fee).replace(/\D/g, '');
        if (raw === '') return prev.fee !== undefined ? String(prev.fee) : '70';
        let num = parseInt(raw, 10);
        if (num > 200) num = 200;
        if (num < 0) num = 0;
        return String(num);
      })(),
      cnam: doc.cnam !== undefined ? Boolean(doc.cnam) : prev.cnam,
      telehealth: doc.telehealth !== undefined ? Boolean(doc.telehealth) : prev.telehealth,
      avatar: doc.avatar || doc.image || prev.avatar,
      bio: doc.bio || doc.presentation || prev.bio,
      bioAr: doc.bioAr || doc.presentationAr || '',
      diplomas: Array.isArray(doc.diplomas) && doc.diplomas.length > 0
        ? doc.diplomas
        : (prev.diplomas || [
            "Diplôme d'État de Docteur en Médecine",
            "Diplôme d'Études Spécialisées",
            "Membre de l'Ordre des Médecins de Tunisie"
          ]),
      equipment: Array.isArray(doc.equipment) && doc.equipment.length > 0
        ? doc.equipment
        : (prev.equipment || [
            "Cabinet informatisé",
            "Équipement d'examen spécialisé"
          ]),
      languages: doc.languages || prev.languages || "Français, Arabe, Anglais",
      accessibility: doc.accessibility || prev.accessibility || "Accès PMR / Ascenseur Étage 2",
      cvFileName: doc.cvFileName || doc.cv_file_name || prev.cvFileName || '',
      cvFileData: doc.cvFileData || doc.cv_file_data || prev.cvFileData || '',
      signature: doc.signature || doc.signatureData || (typeof localStorage !== 'undefined' ? localStorage.getItem(`sahatn_doctor_signature_${doc.id || doc.uuid || 'doc-1'}`) : '') || '',
      signatureData: doc.signatureData || doc.signature || (typeof localStorage !== 'undefined' ? localStorage.getItem(`sahatn_doctor_signature_${doc.id || doc.uuid || 'doc-1'}`) : '') || '',
      rating: doc.rating ? String(doc.rating) : prev.rating,
      reviewsCount: doc.reviews_count || doc.reviewsCount || prev.reviewsCount
    }));
  };

  // ════════ REVERSE-GEOCODING & LOCATION EXTRACTION HANDLER ════════
  const handleLocationExtracted = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await reverseGeocodeFromCoordinates(lat, lng, isAr);
      
      const newCity = res.city || '';
      const newDel = res.delegation || '';
      const newAddress = res.address || '';

      setFormData(prev => ({
        ...prev,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        ...(newCity ? { city: newCity } : {}),
        ...(newDel ? { delegation: newDel } : {}),
        ...(newAddress ? { address: newAddress } : {})
      }));

      // Update marker popup with extracted location details
      if (modalMarkerRef.current) {
        const popupHtml = `
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; padding: 4px; min-width: 140px; text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'};">
            <b style="color: #0d9488; font-size: 12px; display: block; margin-bottom: 2px;">${formData.name || (isAr ? 'العيادة الطبية' : 'Cabinet Médical')}</b>
            ${newAddress ? `<div style="font-weight: 600; color: #1e293b;">📍 ${newAddress}</div>` : ''}
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ${newDel ? newDel + ', ' : ''}${newCity || ''} ${res.postal ? '(' + res.postal + ')' : ''}
            </div>
            <div style="font-family: monospace; font-size: 9px; color: #0d9488; margin-top: 3px;">
              Lat: ${lat.toFixed(5)} · Lng: ${lng.toFixed(5)}
            </div>
          </div>
        `;
        modalMarkerRef.current.bindPopup(popupHtml).openPopup();
      }

      const summaryParts = [newAddress, newDel, newCity].filter(Boolean);
      const summaryText = summaryParts.join(', ');
      setExtractedInfoMsg(summaryText || (isAr ? 'تم استخراج وتحديث المعطيات بنجاح' : 'Données géographiques extraites'));
      setRecentlyExtracted(true);

      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = setTimeout(() => {
        setRecentlyExtracted(false);
      }, 4500);
    } catch (err) {
      console.error('Reverse geocode error in modal:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // ════════ LEAFLET MODAL MAP EFFECTS & HANDLERS ════════
  useEffect(() => {
    if (!isOpen || activeTab !== 'cabinet' || !showMapPicker) {
      if (modalMapInstanceRef.current) {
        try {
          modalMapInstanceRef.current.remove();
        } catch (e) {}
        modalMapInstanceRef.current = null;
        modalMarkerRef.current = null;
      }
      return;
    }

    if (!modalMapContainerRef.current) return;

    const lat = parseFloat(formData.lat) || 36.8065;
    const lng = parseFloat(formData.lng) || 10.1815;

    try {
      if (modalMapContainerRef.current._leaflet_id && !modalMapInstanceRef.current) {
        delete modalMapContainerRef.current._leaflet_id;
      }

      if (!modalMapInstanceRef.current) {
        const map = L.map(modalMapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const customPinHtml = `
          <div style="width: 34px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); cursor: grab;">
            <img src="/images/map_point1.png" style="width: 34px; height: 42px; object-fit: contain;" alt="pin" />
          </div>
        `;
        const customIcon = L.divIcon({
          className: 'custom-pin-modal',
          html: customPinHtml,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -38]
        });

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          draggable: true
        }).addTo(map);

        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          isMapInteractingRef.current = true;
          setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
          handleLocationExtracted(newLat, newLng);
        });

        map.on('click', (e) => {
          const pos = e.latlng;
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          marker.setLatLng(pos);
          isMapInteractingRef.current = true;
          setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
          handleLocationExtracted(newLat, newLng);
        });

        modalMapInstanceRef.current = map;
        modalMarkerRef.current = marker;

        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 200);
      } else {
        modalMapInstanceRef.current.setView([lat, lng], 14);
        if (modalMarkerRef.current) {
          modalMarkerRef.current.setLatLng([lat, lng]);
        }
      }
    } catch (err) {
      console.warn('Leaflet modal map error:', err);
    }
  }, [isOpen, activeTab, showMapPicker]);

  // Synchronize map & marker position whenever lat or lng changes from inputs
  useEffect(() => {
    if (isMapInteractingRef.current) {
      isMapInteractingRef.current = false;
      return;
    }
    if (modalMapInstanceRef.current && modalMarkerRef.current) {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        modalMarkerRef.current.setLatLng([lat, lng]);
        modalMapInstanceRef.current.flyTo([lat, lng], modalMapInstanceRef.current.getZoom() || 14, { duration: 0.8 });
      }
    }
  }, [formData.lat, formData.lng]);

  // Cleanup map instance on unmount
  useEffect(() => {
    return () => {
      if (modalMapInstanceRef.current) {
        try {
          modalMapInstanceRef.current.remove();
        } catch (e) {}
        modalMapInstanceRef.current = null;
        modalMarkerRef.current = null;
      }
    };
  }, []);

  // Recenter map based on selected governorate & delegation
  const handleRecenterMap = () => {
    const coords = getCoordinatesByLocation(formData.city, formData.delegation);
    setFormData(prev => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    if (modalMapInstanceRef.current && modalMarkerRef.current) {
      modalMapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 0.8 });
      modalMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    }
  };

  // Get current device GPS location and reverse geocode
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg(isAr ? 'خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.' : 'La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLocating(false);
        const userLat = parseFloat(pos.coords.latitude.toFixed(6));
        const userLng = parseFloat(pos.coords.longitude.toFixed(6));
        setShowMapPicker(true);
        if (modalMapInstanceRef.current && modalMarkerRef.current) {
          modalMapInstanceRef.current.flyTo([userLat, userLng], 16, { duration: 1 });
          modalMarkerRef.current.setLatLng([userLat, userLng]);
        }
        isMapInteractingRef.current = true;
        setFormData(prev => ({ ...prev, lat: userLat, lng: userLng }));
        await handleLocationExtracted(userLat, userLng);
      },
      (err) => {
        setGeoLocating(false);
        console.warn('Geolocation error:', err);
        setErrorMsg(isAr ? 'تعذر الحصول على موقعك الحالي. يرجى تفعيل إذن الموقع.' : 'Impossible d\'obtenir votre position actuelle. Vérifiez vos autorisations.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Search address/location in Tunisia and fly to it on the map
  const handleMapSearch = async (e) => {
    if (e) e.preventDefault();
    if (!mapSearchText.trim()) return;
    setIsSearchingMap(true);
    try {
      const q = encodeURIComponent(mapSearchText.trim() + ', Tunisie');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&countrycodes=tn&addressdetails=1&accept-language=${isAr ? 'ar,fr' : 'fr,en'}`,
        { headers: { 'User-Agent': 'SahaTN-Tunisie-Healthcare' } }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const top = results[0];
        const newLat = parseFloat(parseFloat(top.lat).toFixed(6));
        const newLng = parseFloat(parseFloat(top.lon).toFixed(6));
        setShowMapPicker(true);
        if (modalMapInstanceRef.current) {
          modalMapInstanceRef.current.flyTo([newLat, newLng], 15, { duration: 1 });
        }
        if (modalMarkerRef.current) {
          modalMarkerRef.current.setLatLng([newLat, newLng]);
        }
        isMapInteractingRef.current = true;
        setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
        await handleLocationExtracted(newLat, newLng);
      } else {
        setErrorMsg(isAr ? 'لم يتم العثور على موقع مطابق في تونس. يرجى تجربة كلمات بحث أخرى أو النقر على الخريطة مباشرة.' : 'Aucun lieu trouvé en Tunisie. Essayez d\'autres mots-clés ou cliquez directement sur la carte.');
      }
    } catch (err) {
      console.error('Map search error:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  // Handle local image file upload (Base64)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(
        isAr 
          ? 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).' 
          : 'Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).'
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(
        isAr 
          ? 'حجم الصورة كبير جداً (الحد الأقصى 2 ميغابايت).' 
          : "L'image est trop volumineuse (maximum 2 Mo)."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

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
    reader.onload = async () => {
      const sigData = reader.result;
      setFormData(prev => ({
        ...prev,
        signature: sigData,
        signatureData: sigData
      }));
      setErrorMsg('');
      const currentDocId = formData.id || formData.uuid || doctorId || user?.doctorId || 'doc-1';
      try {
        localStorage.setItem(`sahatn_doctor_signature_${currentDocId}`, sigData);
        localStorage.removeItem('sahatn_doctor_signature');
        window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { doctorId: currentDocId, signature: sigData } }));
      } catch (err) {}

      // Enregistrer directement dans la base de données
      try {
        const res = await api.updateDoctor(currentDocId, {
          signature: sigData,
          signatureData: sigData
        });
        if (res && res.success) {
          setSuccessMsg(
            isAr 
              ? 'تم حفظ وتثبيت صورة الإمضاء بنجاح في قاعدة البيانات !' 
              : 'Signature importée et enregistrée avec succès dans la base de données !'
          );
          if (onDoctorUpdated) {
            onDoctorUpdated(res.doctor || { ...formData, id: currentDocId, signature: sigData, signatureData: sigData });
          }
        }
      } catch (err) {
        console.warn('Erreur sauvegarde signature importée en base:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearSignature = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const currentDocId = formData.id || formData.uuid || doctorId || user?.doctorId || 'doc-1';
    setFormData(prev => ({ ...prev, signature: '', signatureData: '' }));
    try {
      localStorage.removeItem(`sahatn_doctor_signature_${currentDocId}`);
      localStorage.removeItem('sahatn_doctor_signature');
      window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { doctorId: currentDocId, signature: '' } }));
    } catch (e) {}

    // Supprimer également dans la base de données
    try {
      const res = await api.updateDoctor(currentDocId, {
        signature: '',
        signatureData: ''
      });
      if (res && res.success) {
        setSuccessMsg(
          isAr 
            ? 'تم حذف الإمضاء من ملفك وقاعدة البيانات.' 
            : 'Signature supprimée du dossier et de la base de données.'
        );
        if (onDoctorUpdated) {
          onDoctorUpdated(res.doctor || { ...formData, id: currentDocId, signature: '', signatureData: '' });
        }
      }
    } catch (err) {
      console.warn('Erreur suppression signature en base:', err);
    }
  };

  const startDrawingSig = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
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
    if (e && e.stopPropagation) e.stopPropagation();
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

  const stopDrawingSig = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!isDrawingSig) return;
    setIsDrawingSig(false);
  };

  const clearCanvasSig = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSig = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    // Vérifier si le canevas n'est pas vide (au moins un pixel dessiné)
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawn = imgData.data.some((channel, idx) => (idx % 4 === 3) && channel > 0);
    if (!hasDrawn) {
      setErrorMsg(
        isAr 
          ? 'يرجى رسم إمضائك الطبي في الإطار أولاً قبل الحفظ.' 
          : 'Veuillez tracer votre signature avant de valider.'
      );
      return;
    }

    const sigData = canvas.toDataURL('image/png');
    setFormData(prev => ({
      ...prev,
      signature: sigData,
      signatureData: sigData
    }));

    const currentDocId = formData.id || formData.uuid || doctorId || user?.doctorId || 'doc-1';
    try {
      localStorage.setItem(`sahatn_doctor_signature_${currentDocId}`, sigData);
      localStorage.removeItem('sahatn_doctor_signature');
      window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { doctorId: currentDocId, signature: sigData } }));
    } catch (err) {}

    // Sauvegarder directement et immédiatement dans la base de données
    setSavingSig(true);
    try {
      const res = await api.updateDoctor(currentDocId, {
        signature: sigData,
        signatureData: sigData
      });
      if (res && res.success) {
        setSuccessMsg(
          isAr 
            ? 'تم حفظ وتثبيت إمضائك الطبي بنجاح في قاعدة البيانات !' 
            : 'Signature médicale enregistrée avec succès dans la base de données !'
        );
        if (onDoctorUpdated) {
          onDoctorUpdated(res.doctor || { ...formData, id: currentDocId, signature: sigData, signatureData: sigData });
        }
      }
    } catch (apiErr) {
      console.warn('Erreur enregistrement signature dessinée en base:', apiErr);
    } finally {
      setSavingSig(false);
      setShowDrawSignatureModal(false);
    }
  };

  // Handle local CV document upload (Base64 data saved directly in database)
  const handleCvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg(
        isAr 
          ? 'حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميغابايت).' 
          : "Le document dépasse la taille maximale autorisée (25 Mo)."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        cvFileName: file.name,
        cvFileData: reader.result // Direct Base64 data URL saved in database
      }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSpecialty = (specFr, specObj) => {
    const val = typeof specFr === 'string' ? specFr : (specFr?.target?.value || '');
    const match = specObj || SPECIALTIES.find(s => s.fr === val || s.id === val);
    const resolvedFr = match?.fr || val || '';
    setFormData(prev => ({
      ...prev,
      specialty: resolvedFr,
      specialty_fr: resolvedFr,
      specialty_ar: match?.ar || prev.specialty_ar
    }));
  };

  // Phone input handling with fixed +216 prefix and 8 digits max
  const handlePhoneChange = (e) => {
    const formatted = formatTunisianPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      if (input.selectionStart <= 5 && input.selectionEnd <= 5) {
        e.preventDefault();
      }
    } else if (e.key === 'Delete') {
      const input = e.currentTarget;
      if (input.selectionStart < 5 && input.selectionEnd < 5) {
        e.preventDefault();
      }
    }
  };

  const handlePhoneFocus = (e) => {
    const input = e.currentTarget;
    if (input.selectionStart < 5) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  const handlePhoneClick = (e) => {
    const input = e.currentTarget;
    if (input.selectionStart < 5) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  // Delegations derived from governorate selection (or all delegations if none selected)
  const availableDelegations = useMemo(() => {
    const locationsList = LOCATIONS || [];

    if (formData.city && formData.city.trim() !== '') {
      const targetCity = formData.city.toLowerCase().replace(/^la\s+/, '').trim();
      const found = locationsList.find(l => 
        l.city.toLowerCase() === formData.city.toLowerCase() ||
        l.city.toLowerCase().replace(/^la\s+/, '').trim() === targetCity
      );
      if (found && Array.isArray(found.delegations)) {
        return found.delegations.map(del => ({
          del,
          city: found.city
        }));
      }
      return [];
    }

    // Default: when NO governorate is selected, return all delegations from all governorates
    const all = [];
    locationsList.forEach(l => {
      if (Array.isArray(l.delegations)) {
        l.delegations.forEach(del => {
          all.push({
            del,
            city: l.city
          });
        });
      }
    });
    return all;
  }, [formData.city]);

  // Real-time search filter for delegations
  const filteredDelegations = useMemo(() => {
    const q = (formData.delegation || '').toLowerCase().trim();
    if (!q) {
      return availableDelegations;
    }
    return availableDelegations.filter(item => 
      item.del.toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q)
    );
  }, [availableDelegations, formData.delegation]);

  const handleAddDiploma = (text) => {
    const clean = (text || newDiplomaInput).trim();
    if (!clean) return;
    if (!formData.diplomas?.includes(clean)) {
      setFormData(prev => ({
        ...prev,
        diplomas: [...(prev.diplomas || []), clean]
      }));
    }
    setNewDiplomaInput('');
  };

  const handleRemoveDiploma = (index) => {
    setFormData(prev => ({
      ...prev,
      diplomas: (prev.diplomas || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddEquipment = (text) => {
    const clean = (text || newEquipmentInput).trim();
    if (!clean) return;
    if (!formData.equipment?.includes(clean)) {
      setFormData(prev => ({
        ...prev,
        equipment: [...(prev.equipment || []), clean]
      }));
    }
    setNewEquipmentInput('');
  };

  const handleRemoveEquipment = (index) => {
    setFormData(prev => ({
      ...prev,
      equipment: (prev.equipment || []).filter((_, i) => i !== index)
    }));
  };

  const handleToggleLanguage = (langName) => {
    const currentLangs = formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(Boolean) : [];
    let updated;
    if (currentLangs.includes(langName)) {
      updated = currentLangs.filter(l => l !== langName);
    } else {
      updated = [...currentLangs, langName];
    }
    setFormData(prev => ({
      ...prev,
      languages: updated.join(', ') || 'Français'
    }));
  };

  // ════════ CONSULTATION FEE CONTROLS (0 DT - 200 DT) ════════
  const handleFeeChange = (raw) => {
    // Allow entering any number freely without clamping
    const digits = String(raw).replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, fee: digits }));
  };

  const handleFeeBlur = () => {
    // If left completely empty on blur, restore default 70 DT
    const strVal = String(formData.fee !== undefined && formData.fee !== null ? formData.fee : '').trim();
    if (strVal === '') {
      setFormData(prev => ({ ...prev, fee: '70' }));
    }
  };

  // Save changes to database
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const targetDocId = doctorId || user?.doctorId || 'doc-1';

      // Real-time automatic translation synchronization for the bio/presentation
      let finalBio = formData.bio ? formData.bio.trim() : '';
      let finalBioAr = formData.bioAr || '';
      if (finalBio) {
        try {
          if (isArabicText(finalBio)) {
            finalBioAr = finalBio;
            finalBio = await translateText(finalBio, 'fr');
          } else {
            finalBioAr = await translateText(finalBio, 'ar');
          }
        } catch (e) {
          console.warn('Real-time translation during save skipped:', e);
        }
      }

      const finalSpecFr = resolveDoctorSpecialty(formData.specialty || formData.specialty_fr, 'fr');
      const finalSpecAr = resolveDoctorSpecialty(formData.specialty || formData.specialty_ar, 'ar');

      // Sanitize doctor name & consultation fee
      const cleanName = cleanDoctorName(formData.name);
      const finalDoctorName = formatDoctorName(cleanName, isAr);
      const feeStr = String(formData.fee !== undefined && formData.fee !== null ? formData.fee : '').trim();
      const feeNum = Number(formData.fee);
      if (feeStr === '' || isNaN(feeNum)) {
        setErrorMsg(isAr ? 'يرجى تحديد تعريفة الفحص الطبي.' : 'Veuillez renseigner le tarif de consultation.');
        setSaving(false);
        return;
      }
      if (feeNum < 20 || feeNum > 200) {
        setErrorMsg(isAr ? 'تعريفة الفحص الطبي يجب أن تكون بين 20 و 200 د.ت.' : 'Le tarif de consultation doit être compris entre 20 DT et 200 DT.');
        setSaving(false);
        return;
      }
      const finalFee = `${feeNum} TND`;

      const payload = {
        name: finalDoctorName,
        title: formData.title.trim(),
        specialty: finalSpecFr,
        specialty_fr: finalSpecFr,
        specialty_ar: finalSpecAr,
        specialtyFr: finalSpecFr,
        specialtyAr: finalSpecAr,
        city: formData.city,
        delegation: formData.delegation,
        address: formData.address.trim(),
        lat: parseFloat(formData.lat) || 36.8065,
        lng: parseFloat(formData.lng) || 10.1815,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        fee: finalFee,
        cnam: formData.cnam,
        telehealth: formData.telehealth,
        avatar: formData.avatar,
        image: formData.avatar,
        bio: finalBio,
        presentation: finalBio,
        bioAr: finalBioAr,
        presentationAr: finalBioAr,
        diplomas: formData.diplomas,
        equipment: formData.equipment,
        languages: formData.languages,
        accessibility: formData.accessibility,
        cvFileName: formData.cvFileName || '',
        cvFileData: formData.cvFileData || '',
        signature: formData.signature || formData.signatureData || '',
        signatureData: formData.signatureData || formData.signature || ''
      };

      if (payload.signature) {
        try {
          localStorage.setItem('sahatn_doctor_signature', payload.signature);
          localStorage.setItem(`sahatn_doctor_signature_${targetDocId}`, payload.signature);
          window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { detail: { signature: payload.signature } }));
        } catch (e) {}
      }

      const res = await api.updateDoctor(targetDocId, payload);

      if (res && res.success) {
        setSuccessMsg(
          isAr
            ? 'تم تحديث ملف الطبيب بنجاح في قاعدة البيانات !'
            : (res.message || 'Profil du médecin mis à jour avec succès dans la base de données !')
        );

        // If the logged in user is this doctor, sync their AuthContext
        if (updateProfile && user && (user.doctorId === targetDocId || user.role === 'DOCTOR')) {
          try {
            await updateProfile({
              name: payload.name,
              avatar: payload.avatar,
              phone: payload.phone,
              city: payload.city,
              address: payload.address,
              specialty: payload.specialty,
              fee: payload.fee,
              cnam: payload.cnam
            });
          } catch (e) {
            console.warn('AuthContext profile sync notice:', e);
          }
        }

        if (onDoctorUpdated) {
          onDoctorUpdated(res.doctor || { ...formData, id: targetDocId });
        }

        // Fermeture automatique du modal après enregistrement réussi
        closeTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 850);

        setTimeout(() => {
          setSuccessMsg('');
        }, 3500);
      } else {
        setErrorMsg(
          res?.message || 
          (isAr ? 'حدث خطأ أثناء حفظ التعديلات.' : 'Erreur lors de la mise à jour.')
        );
      }
    } catch (err) {
      console.error('Save doctor error:', err);
      setErrorMsg(
        err.message || 
        (isAr ? 'تعذر حفظ التعديلات.' : "Impossible d'enregistrer les modifications.")
      );
    } finally {
      setSaving(false);
    }
  };

  const targetDocId = doctorId || user?.doctorId || 'doc-1';

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      
      <div 
        dir={isAr ? 'rtl' : 'ltr'}
        className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c162d] rounded-3xl shadow-2xl border border-teal-100/80 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 ${isAr ? 'font-arabic text-right' : 'text-left'}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="relative bg-gradient-to-r from-[#002b49] via-[#071a2b] to-[#00A896] text-white p-5 sm:p-6 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                  <span>{isAr ? 'الملف الشخصي وبطاقة الطبيب' : 'Profil & Fiche du Médecin'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {isAr ? 'موعدي PRO' : 'Maw2idi PRO'}
                  </span>
                </h2>
                <p className="text-xs text-teal-100/80">
                  {isAr 
                    ? 'اطّلع على بيانات ملفك المهني وعيّن معلوماتك مباشرة' 
                    : 'Consultez et modifiez les informations de votre fiche praticien en direct'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-4 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'general'
                  ? 'bg-white text-[#002b49] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isAr ? 'عام والصورة' : 'Général & Photo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cabinet')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'cabinet'
                  ? 'bg-white text-[#002b49] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isAr ? 'العيادة والتعريفات' : 'Cabinet & Tarifs'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bio')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'bio'
                  ? 'bg-white text-[#002b49] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'السيرة والتعريف' : 'Bio & Présentation'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* ════════ TAB 1: GÉNÉRAL & PHOTO ════════ */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              
              {/* Profile Picture Card */}
              <div className="bg-teal-50/50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-teal-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                
                {/* Big Avatar Preview */}
                <div className="relative group shrink-0">
                  <img
                    src={resolveDoctorAvatar(formData.avatar)}
                    onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                    alt={formData.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-lg ring-4 ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer gap-1"
                    title={isAr ? 'تغيير الصورة' : 'Changer la photo'}
                  >
                    <Camera className="w-5 h-5" />
                    <span>{isAr ? 'تغيير' : 'Modifier'}</span>
                  </button>

                  <span className={`absolute -bottom-1 ${isAr ? '-left-1' : '-right-1'} w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-xs`}>
                    ✓
                  </span>
                </div>

                {/* Upload Buttons & Presets */}
                <div className={`space-y-3 flex-1 text-center ${isAr ? 'sm:text-right' : 'sm:text-left'}`}>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr ? 'الصورة المهنية للملف الشخصي' : 'Photo de Profil Professionnelle'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr 
                        ? 'الملفات الشخصية التي تحتوي على صورة تتلقى حتى 3 أضعاف المواعيد من المرضى.' 
                        : 'Les profils avec photo reçoivent jusqu\'à 3x plus de rendez-vous de patients.'}
                    </p>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <div className={`flex flex-wrap items-center justify-center ${isAr ? 'sm:justify-start' : 'sm:justify-start'} gap-2`}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
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

                  {/* Quick Preset Avatars */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                      {isAr ? 'أو اختر صورة طبية جاهزة :' : 'Ou choisissez un avatar médical :'}
                    </span>
                    <div className={`flex items-center justify-center ${isAr ? 'sm:justify-start' : 'sm:justify-start'} gap-2`}>
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

              {/* Signature Numérique & Cachet Professionnel Card (Remplace le champ CV) */}
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

                {/* Signature Info: Title & Action Buttons & Description */}
                <div className={`space-y-1.5 flex-1 text-center ${isAr ? 'sm:text-right' : 'sm:text-left'} w-full`}>
                  {/* Title & Actions in the same line */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{isAr ? 'الإمضاء والختم الرقمي المهني' : 'Signature Numérique & Cachet Professionnel'}</span>
                      </h3>
                      {(formData.signature || formData.signatureData) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <Check className="w-3 h-3" />
                          <span>{isAr ? 'مسجل بقاعدة البيانات' : 'Enregistrée en base'}</span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {(formData.signature || formData.signatureData) ? (
                      <div className="flex items-center justify-center sm:justify-end gap-1.5 self-center sm:self-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDrawSignatureModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title={isAr ? 'إعادة رسم الإمضاء' : 'Redessiner la signature'}
                        >
                          <span>✍️</span>
                          <span>{isAr ? 'إعادة الرسم' : 'Retracer'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            signatureFileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title={isAr ? 'استبدال بصورة جديدة' : 'Remplacer par un fichier'}
                        >
                          <Upload className="w-3 h-3" />
                          <span>{isAr ? 'استبدال' : 'Remplacer'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearSignature(e);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title={isAr ? 'حذف الإمضاء' : 'Supprimer la signature'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isAr ? 'حذف' : 'Supprimer'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center sm:justify-end gap-1.5 self-center sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDrawSignatureModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <span>✍️</span>
                          <span>{isAr ? 'رسم باليد' : 'Tracer'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            signatureFileInputRef.current?.click();
                          }}
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

              {/* General Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name with Permanent Constant 'Dr.' Prefix */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'الاسم الكامل للطبيب :' : 'Nom Complet du Praticien :'}</span>
                    
                  </label>
                  
                  <div className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Fixed immutable prefix badge */}
                    <div className={`shrink-0 px-3.5 py-2.5 bg-teal-500/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300 font-black text-sm select-none flex items-center gap-1.5 ${isAr ? 'border-l border-slate-200 dark:border-slate-700' : 'border-r border-slate-200 dark:border-slate-700'}`}>
                      <span className="inline-block w-2 h-2 rounded-full bg-teal-500"></span>
                      <span>{isAr ? 'د.' : 'Dr.'}</span>
                    </div>

                    {/* Practitioner Name Input */}
                    <input
                      type="text"
                      required
                      value={cleanDoctorName(formData.name)}
                      placeholder={isAr ? 'سليم بن علي' : 'Selim Ben Ali'}
                      onChange={(e) => {
                        const clean = cleanDoctorName(e.target.value);
                        const prefix = isAr ? 'د. ' : 'Dr. ';
                        setFormData(prev => ({ ...prev, name: clean ? `${prefix}${clean}` : '' }));
                      }}
                      className={`w-full px-3.5 py-2.5 bg-transparent text-slate-900 dark:text-white text-sm font-semibold focus:outline-none placeholder-slate-400 ${isAr ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                  
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {isAr 
                      ? 'أدخل الاسم واللقب فقط. يتم تثبيت اللقب الطبي "د." تلقائياً كبادئة ثابتة غير قابلة للحذف.'
                      : 'Saisissez uniquement prénom et nom. Le titre "Dr." est invariablement fixé en préfixe non effaçable.'}
                  </p>
                </div>

                {/* Professional Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'الصفة / الرتبة المهنية :' : 'Titre / Titulature :'}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={isAr ? 'مثال: مقيم سابق بمستشفيات تونس...' : 'ex. Ancien Interne des Hôpitaux de Tunis'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Medical Specialty - Modern Fluid Dropdown matching Landing Page */}
                <div>
                  <SpecialtyDropdown
                    label={isAr ? 'الاختصاص الطبي :' : 'Spécialité Médicale :'}
                    value={formData.specialty}
                    onChange={handleSelectSpecialty}
                    isAr={isAr}
                  />
                </div>

                {/* Professional Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'البريد الإلكتروني المهني :' : 'Email Professionnel :'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all text-left"
                    dir="ltr"
                  />
                </div>

                {/* Direct Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'الهاتف المباشر / السكرتارية :' : 'Téléphone Direct / Secrétariat :'}</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-bold">
                      +216 XX XXX XXX
                    </span>
                  </label>
                  <TunisianPhoneInput
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+216 25 222 102"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all text-left font-mono tracking-wide"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {isAr ? '8 أرقام ببادئة ثابتة 216+ (مثال: 102 222 25 216+)' : '8 chiffres maximum avec indicatif fixe +216 (ex: +216 25 222 102)'}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* ════════ TAB 2: CABINET & TARIFS ════════ */}
          {activeTab === 'cabinet' && (
            <div className="space-y-5">
              
              {/* 1. Insertion du montant de consultation dans sa propre ligne (Pleine largeur) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isAr ? 'تعريفة الفحص الطبي (د.ت) :' : 'Tarif Consultation (TND / DT) :'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                    formData.fee !== '' && (Number(formData.fee) < 20 || Number(formData.fee) > 200)
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                      : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
                  }`}>
                    {isAr ? 'بين 20 و 200 د.ت' : '20 – 200 DT'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.fee}
                    onChange={(e) => handleFeeChange(e.target.value)}
                    onBlur={handleFeeBlur}
                    placeholder="70"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black transition-all ${
                      isAr ? 'pl-16 pr-3.5' : 'pr-20 pl-3.5'
                    } ${
                      formData.fee !== '' && (Number(formData.fee) < 20 || Number(formData.fee) > 200)
                        ? 'border-rose-400 dark:border-rose-600 bg-rose-50/20 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none'
                    }`}
                  />
                  <span className={`absolute top-2.5 text-xs font-black pointer-events-none ${
                    isAr ? 'left-3.5' : 'right-3.5'
                  } ${
                    formData.fee !== '' && (Number(formData.fee) < 20 || Number(formData.fee) > 200)
                      ? 'text-rose-500'
                      : 'text-teal-600 dark:text-teal-400'
                  }`}>
                    {isAr ? 'د.ت' : 'TND (DT)'}
                  </span>
                </div>

                {/* Validation Warnings (Between 20 DT and 200 DT) */}
                {formData.fee !== '' && Number(formData.fee) < 20 && (
                  <span className="text-[11px] text-rose-500 font-bold block pt-1.5 flex items-center gap-1 animate-fadeIn">
                    <span>⚠️</span>
                    <span>{isAr ? 'يجب أن تكون تعريفة الفحص 20 د.ت على الأقل (بين 20 و 200 د.ت)' : 'Le tarif de consultation doit être d\'au moins 20 DT (entre 20 et 200 DT)'}</span>
                  </span>
                )}
                {formData.fee !== '' && Number(formData.fee) > 200 && (
                  <span className="text-[11px] text-rose-500 font-bold block pt-1.5 flex items-center gap-1 animate-fadeIn">
                    <span>⚠️</span>
                    <span>{isAr ? 'الحد الأقصى المسموح به هو 200 د.ت (بين 20 و 200 د.ت)' : 'Le montant maximum autorisé est de 200 DT (entre 20 et 200 DT)'}</span>
                  </span>
                )}

                {/* Quick Selection Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[40, 50, 70, 80, 100, 150, 200].map((preset) => {
                    const isSelected = String(formData.fee) === String(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, fee: String(preset) }))}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {preset} {isAr ? 'د.ت' : 'DT'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pointage & Emplacement Géographique sur la Carte */}
              <div className="bg-gradient-to-br from-slate-50 via-teal-50/20 to-cyan-50/30 dark:from-slate-900/40 dark:via-slate-800/40 dark:to-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-slate-700/80 space-y-2">
                {/* Ligne 1 : Titre réduit + Boutons sur la même ligne */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-teal-600 dark:text-teal-400 shrink-0">📍</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {isAr ? 'تحديد وتعديل موقع العيادة على الخريطة (Pointage GPS) :' : 'Pointage & Emplacement Géographique sur la Carte :'}
                    </h4>
                  </div>

                  {/* Actions: Map Toggle (Afficher/Fermer) & Geolocation (Mon GPS / موقعي) sur la même ligne */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMapPicker(prev => !prev);
                        setTimeout(() => {
                          if (modalMapInstanceRef.current) {
                            modalMapInstanceRef.current.invalidateSize();
                          }
                        }, 150);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                        showMapPicker
                          ? 'bg-teal-600 text-white border-teal-600 shadow-teal-500/20'
                          : 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>
                        {showMapPicker
                          ? (isAr ? 'إغلاق الخريطة' : 'Fermer la carte')
                          : (isAr ? 'عرض الخريطة' : 'Afficher la carte')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={geoLocating}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      title={isAr ? 'استخدام موقع GPS الحالي' : 'Ma position GPS actuelle'}
                    >
                      <Crosshair className={`w-3.5 h-3.5 text-teal-600 ${geoLocating ? 'animate-spin' : ''}`} />
                      <span>{isAr ? 'موقعي' : 'Ma position'}</span>
                    </button>
                  </div>
                </div>

                {/* Ligne 2 : Sous-titre propre en dessous */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isAr 
                    ? 'مزامنة تلقائية للولاية والمعتمدية والعنوان حسب نقطة الخريطة.' 
                    : 'Synchronisation automatique du gouvernorat, de la délégation et de l\'adresse.'}
                </p>

                {/* Status & extraction alerts */}
                {isGeocoding && (
                  <div className="bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-pulse">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="font-semibold">
                      {isAr 
                        ? 'جاري استخراج وتحديث الولاية والمعتمدية والعنوان من الخريطة...' 
                        : 'Extraction automatique du gouvernorat, délégation et adresse depuis la carte...'}
                    </span>
                  </div>
                )}

                {recentlyExtracted && extractedInfoMsg && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                      <span>{isAr ? 'تم التعرف التلقائي وتحديث الحقول :' : 'Champs mis à jour automatiquement :'}</span>
                      <span className="font-normal text-[11px] underline truncate max-w-xs">{extractedInfoMsg}</span>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md shrink-0">
                      {isAr ? 'تم التحديث بنجاح' : 'Synchronisé'}
                    </span>
                  </div>
                )}

                {/* Current Coordinates Bar */}
                <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] px-3.5 py-2 rounded-xl border font-mono transition-all duration-300 ${
                  recentlyExtracted 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' 
                    : 'bg-white dark:bg-slate-800/90 border-teal-100/80 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${recentlyExtracted ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 font-sans">
                      {isAr ? 'إحداثيات الـ GPS الحالية :' : 'Coordonnées GPS Actuelles :'}
                    </span>
                    <span className="text-teal-600 dark:text-teal-400 font-black">
                      {formData.lat ? Number(formData.lat).toFixed(5) : '--'} , {formData.lng ? Number(formData.lng).toFixed(5) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-sans text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className={recentlyExtracted ? 'text-emerald-700 dark:text-emerald-300 font-black' : ''}>
                      📍 {formData.city || (isAr ? 'تونس' : 'Tunis')}{formData.delegation ? ` • ${formData.delegation}` : ''}
                    </span>
                  </div>
                </div>

                {/* Interactive Map Picker Container */}
                {showMapPicker && (
                  <div className="space-y-2 pt-1 animate-fadeIn">
                    {/* Integrated Tunisia Search Bar */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-teal-100 dark:border-slate-700 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mapSearchText}
                          onChange={(e) => setMapSearchText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleMapSearch(e)}
                          placeholder={isAr ? 'ابحث عن منطقة، حي، أو شارع في تونس (مثال: حي النصر، القيروان، سوسة)...' : 'Rechercher un quartier ou une adresse en Tunisie (ex: Ennasr, Kairouan, Sousse)...'}
                          className="w-full pl-7 rtl:pl-2.5 rtl:pr-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleMapSearch}
                        disabled={isSearchingMap || !mapSearchText.trim()}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        {isSearchingMap ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Crosshair className="w-3 h-3" />
                        )}
                        <span>{isAr ? 'بحث' : 'Chercher'}</span>
                      </button>
                    </div>

                    <div 
                      ref={modalMapContainerRef}
                      className="w-full h-64 rounded-xl overflow-hidden border-2 border-teal-500/50 shadow-inner z-0 relative"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                      <span className="flex items-center gap-1">
                        <span>💡</span>
                        <span>
                          {isAr 
                            ? 'انقر على أي نقطة أو اسحب المؤشر لتعديل موقع العيادة وتحديث المعطيات تلقائياً' 
                            : 'Cliquez n\'importe où sur la carte ou glissez le repère pour ajuster votre cabinet et synchroniser l\'adresse.'}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span>Lat: <strong className="text-teal-600 dark:text-teal-400">{formData.lat ? Number(formData.lat).toFixed(4) : ''}</strong></span>
                        <span>Lng: <strong className="text-teal-600 dark:text-teal-400">{formData.lng ? Number(formData.lng).toFixed(4) : ''}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Au-dessous de la carte : Champs Gouvernorat et Délégation / Quartier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* City / Governorate */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'الولاية :' : 'Gouvernorat :'}</span>
                    {formData.city && (
                      <button
                        type="button"
                        onClick={() => {
                          const newCoords = getCoordinatesByLocation('', formData.delegation);
                          setFormData(prev => ({ 
                            ...prev, 
                            city: '',
                            lat: newCoords.lat,
                            lng: newCoords.lng
                          }));
                          setShowDelegationSuggestions(true);
                        }}
                        className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold underline cursor-pointer"
                        title={isAr ? 'إلغاء تحديد الولاية لعرض كل المعتمديات' : 'Désélectionner pour afficher toutes les délégations'}
                      >
                        {isAr ? 'عرض الكل' : 'Tous'}
                      </button>
                    )}
                  </label>
                  <select
                    value={formData.city === 'La Manouba' ? 'Manouba' : (formData.city || '')}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      const newCoords = getCoordinatesByLocation(newCity, formData.delegation);
                      setFormData(prev => ({ 
                        ...prev, 
                        city: newCity,
                        lat: newCoords.lat,
                        lng: newCoords.lng
                      }));
                      setShowDelegationSuggestions(true);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-500 cursor-pointer ${
                      recentlyExtracted 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/40 font-bold text-teal-800 dark:text-teal-300' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <option value="">{isAr ? '-- بدون ولاية (كل المعتمديات) --' : '-- Aucun gouvernorat sélectionné (Tous) --'}</option>
                    {TUNISIAN_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>
                        {isAr ? (GOVERNORATES_AR[gov] || gov) : gov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delegation / Sector */}
                <div className="relative" ref={delegationWrapperRef}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'المعتمدية / المنطقة :' : 'Délégation / Quartier :'}</span>
                    {formData.city ? (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                        {formData.city} ({availableDelegations.length})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">
                        {isAr ? 'كل المعتمديات (تونس)' : 'Toutes délégations (Tunisie)'}
                      </span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      list="doctor-delegation-datalist"
                      value={formData.delegation}
                      onChange={(e) => {
                        const newDel = e.target.value;
                        const newCoords = getCoordinatesByLocation(formData.city, newDel);
                        setFormData(prev => ({ 
                          ...prev, 
                          delegation: newDel,
                          lat: newCoords.lat,
                          lng: newCoords.lng
                        }));
                        setShowDelegationSuggestions(true);
                      }}
                      onFocus={() => setShowDelegationSuggestions(true)}
                      placeholder={isAr ? 'مثال: النصر 2، المركز العمراني الشمالي...' : 'ex. Ennasr 2, Centre Urbain Nord...'}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-500 pr-8 ${
                        recentlyExtracted 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/40 font-bold text-teal-800 dark:text-teal-300' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                      }`}
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() => setShowDelegationSuggestions(prev => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                      title={isAr ? 'عرض الاقتراحات' : 'Afficher les suggestions'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${showDelegationSuggestions ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Native Datalist fallback */}
                  <datalist id="doctor-delegation-datalist">
                    {availableDelegations.map((item, idx) => (
                      <option key={`${item.del}-${idx}`} value={item.del}>
                        {!formData.city ? `${item.del} (${item.city})` : item.del}
                      </option>
                    ))}
                  </datalist>

                  {/* Interactive Suggestions Dropdown */}
                  {showDelegationSuggestions && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-teal-100 dark:border-slate-700 z-[100] max-h-56 overflow-y-auto p-1.5 text-left"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 mb-1">
                        <span>
                          {formData.city
                            ? (isAr ? `📍 معتمديات ولاية ${formData.city}` : `📍 Délégations de ${formData.city}`)
                            : (isAr ? '📍 كل معتمديات الجمهورية التونسية' : '📍 Toutes les délégations (Tunisie)')}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {filteredDelegations.length} {isAr ? 'اقتراح' : 'suggestions'}
                        </span>
                      </div>

                      {filteredDelegations.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                          {isAr ? 'لا توجد معتمدية مطابقة للبحث' : 'Aucune délégation correspondante'}
                        </div>
                      ) : (
                        filteredDelegations.map((item, idx) => (
                          <div
                            key={`${item.del}-${item.city}-${idx}`}
                            onClick={() => {
                              const resolvedCity = formData.city || item.city;
                              const newCoords = getCoordinatesByLocation(resolvedCity, item.del);
                              setFormData(prev => ({
                                ...prev,
                                delegation: item.del,
                                city: resolvedCity,
                                lat: newCoords.lat,
                                lng: newCoords.lng
                              }));
                              setShowDelegationSuggestions(false);
                            }}
                            className="px-3 py-2 hover:bg-teal-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-teal-500">📍</span>
                              <span>{item.del}</span>
                            </span>
                            {!formData.city && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md font-medium">
                                {item.city}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Au-dessous : Adresse Complète du Cabinet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'العنوان الكامل للعيادة :' : 'Adresse Complète du Cabinet :'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={isAr ? 'مثال: شارع الهادي نويرة، إقامة النخيل، عمارة ب...' : 'ex. Avenue Hédi Nouira, Résidence Les Palmiers, Bloc B...'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-500 ${
                    recentlyExtracted 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/40 font-bold text-teal-800 dark:text-teal-300' 
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                  }`}
                />
              </div>
                  

              {/* Toggles for CNAM & Telehealth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* CNAM Convention */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, cnam: !prev.cnam }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    formData.cnam
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">🏛️</span>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? 'متعاقد مع (الكنام) CNAM' : 'Conventionné CNAM'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr ? 'التكفل بالطرف الدافع والتغطية الصحية' : 'Prise en charge tiers payant'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${formData.cnam ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    {formData.cnam && <Check className="w-4 h-4" />}
                  </div>
                </div>

                {/* Teleconsultation */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, telehealth: !prev.telehealth }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    formData.telehealth
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">🎥</span>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? 'الاستشارة الطبية عن بُعد (فيديو)' : 'Téléconsultation Vidéo'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr ? 'تفعيل الاستشارات والمواعيد عن بعد' : 'Consultations en ligne activées'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${formData.telehealth ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    {formData.telehealth && <Check className="w-4 h-4" />}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ════════ TAB 3: BIO & PRÉSENTATION ════════ */}
          {activeTab === 'bio' && (
            <div className="space-y-6">
              
              {/* 1. Présentation & Biographie */}
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
                  <button
                    type="button"
                    onClick={handleTranslateBioInModal}
                    disabled={isTranslatingBioModal || !formData.bio?.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-[#00A896] dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all cursor-pointer disabled:opacity-50"
                    title="Traduire automatiquement la présentation en temps réel"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isTranslatingBioModal ? (isAr ? 'جاري الترجمة...' : 'Traduction...') : (isAr ? 'ترجمة فورية ✨' : 'Traduire en temps réel ✨')}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={
                    isAr 
                      ? 'صف خبراتك السريرية، شهاداتك الطبية، وتجربتك بالمستشفيات...' 
                      : 'Décrivez vos compétences, diplômes, expérience hospitalière...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all resize-y leading-relaxed"
                />
                {bioPreviewAr && (
                  <div className="mt-2 p-3 bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 rounded-xl text-xs text-teal-900 dark:text-teal-200 leading-relaxed" dir={isArabicText(bioPreviewAr) ? 'rtl' : 'ltr'}>
                    <div className="font-bold text-[11px] text-teal-700 dark:text-teal-400 mb-1 flex items-center gap-1">
                      <span>✨</span>
                      <span>{isArabicText(bioPreviewAr) ? 'المعاينة باللغة العربية (ترجمة فورية) :' : 'Aperçu en Français (Traduction en direct) :'}</span>
                    </div>
                    <p className="whitespace-pre-line">{bioPreviewAr}</p>
                  </div>
                )}
              </div>

              {/* 2. Diplômes & Formation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0086cd]" />
                    <span>{isAr ? '🎓 الشهادات والتكوين' : '🎓 Diplômes & Formation'}</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {formData.diplomas?.length || 0} {isAr ? 'شهادة' : 'diplôme(s)'}
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
                  {/* AI Recommendation Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[#0086cd] flex items-center justify-center text-xs">✨</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {isAr ? '💡 مقترحات ذكية مخصصة للشهادات والتكوين :' : '💡 Suggestions Intelligentes Personnalisées :'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800 flex items-center gap-1">
                      <span>{smartDiplomas.specialtyIcon}</span>
                      <span>{isAr ? smartDiplomas.specialtyNameAr : smartDiplomas.specialtyNameFr}</span>
                    </span>
                  </div>

                  {/* Filter Tabs & Quick Search */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        diplomaCategory === 'all'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isAr ? 'الكل' : 'Tous'} ({smartDiplomas.totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('specialty')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        diplomaCategory === 'specialty'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🎯</span>
                      <span>{isAr ? 'حسب الاختصاص' : 'Spécialité'}</span>
                    </button>
                    {smartDiplomas.inferredCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setDiplomaCategory('inferred')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          diplomaCategory === 'inferred'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <span>🧠</span>
                        <span>{isAr ? 'مستوحى من معداتك' : 'Déduit des équipements'}</span>
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-1 rounded-full">{smartDiplomas.inferredCount}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDiplomaCategory('universal')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        diplomaCategory === 'universal'
                          ? 'bg-[#0086cd] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🏛️</span>
                      <span>{isAr ? 'شهادات أساسية' : 'Fondamentaux'}</span>
                    </button>

                    {/* Live search input */}
                    <div className="relative flex-1 min-w-[130px] ml-auto">
                      <input
                        type="text"
                        value={diplomaSearch}
                        onChange={(e) => setDiplomaSearch(e.target.value)}
                        placeholder={isAr ? 'بحث في المقترحات...' : 'Filtrer suggestions...'}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-[#0086cd]"
                      />
                      {diplomaSearch && (
                        <button
                          type="button"
                          onClick={() => setDiplomaSearch('')}
                          className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suggestions Chips List */}
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-56 overflow-y-auto pr-1">
                    {smartDiplomas.suggestions.map((item, idx) => {
                      const label = isAr && item.ar ? item.ar : item.fr;
                      const isAdded = (formData.diplomas || []).some(
                        d => d.trim().toLowerCase() === item.fr.trim().toLowerCase() || (item.ar && d.trim() === item.ar.trim())
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddDiploma(item.fr)}
                          disabled={isAdded}
                          title={isAr ? item.badgeAr : item.badgeFr}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 group ${
                            isAdded
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 opacity-75 cursor-default'
                              : item.source === 'inferred'
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 hover:border-amber-400'
                              : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <span className="font-bold">{isAdded ? '✓' : '+'}</span>
                          <span>{label}</span>
                          {item.source === 'inferred' && !isAdded && (
                            <span className="text-[9px] bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1 py-0.2 rounded font-bold">
                              {isAr ? 'ذكي' : 'IA'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {smartDiplomas.suggestions.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        {isAr ? 'لا توجد نتائج مطابقة لبحثك.' : 'Aucune suggestion trouvée pour ce filtre.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Équipements du Cabinet (AVEC SUGGESTIONS) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-emerald-600" />
                    <span>{isAr ? '🔬 تجهيزات ومعدات العيادة' : '🔬 Équipements du Cabinet'}</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {formData.equipment?.length || 0} {isAr ? 'جهاز' : 'équipement(s)'}
                  </span>
                </div>

                {/* List of current equipment */}
                <div className="space-y-1.5">
                  {(formData.equipment || []).map((eq, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 px-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{eq}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title={isAr ? 'حذف' : 'Supprimer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new custom equipment */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newEquipmentInput}
                    onChange={(e) => setNewEquipmentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEquipment(); } }}
                    placeholder={isAr ? 'أضف جهازاً أو تقنية طبية مخصصة...' : 'Ajouter un équipement médical personnalisé...'}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEquipment()}
                    disabled={!newEquipmentInput.trim()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إضافة' : 'Ajouter'}</span>
                  </button>
                </div>

                {/* Intelligent Suggestion Chips for Equipment */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  {/* AI Recommendation Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center text-xs">✨</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {isAr ? '💡 مقترحات ذكية مخصصة لمعدات وتجهيزات العيادة :' : '💡 Suggestions Intelligentes d\'Équipements Médicaux :'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800 flex items-center gap-1">
                      <span>{smartEquipment.specialtyIcon}</span>
                      <span>{isAr ? smartEquipment.specialtyNameAr : smartEquipment.specialtyNameFr}</span>
                    </span>
                  </div>

                  {/* Filter Tabs for Equipment Categories */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEquipmentCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        equipmentCategory === 'all'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isAr ? 'الكل' : 'Tous'} ({smartEquipment.totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEquipmentCategory('specialty')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        equipmentCategory === 'specialty'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🎯</span>
                      <span>{isAr ? 'حسب الاختصاص' : 'Spécialité'}</span>
                    </button>
                    {smartEquipment.inferredCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setEquipmentCategory('inferred')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          equipmentCategory === 'inferred'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <span>🧠</span>
                        <span>{isAr ? 'مستوحى من شهاداتك' : 'Déduit des diplômes'}</span>
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-1 rounded-full">{smartEquipment.inferredCount}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEquipmentCategory('universal')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        equipmentCategory === 'universal'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🏥</span>
                      <span>{isAr ? 'أساسيات العيادة' : 'Essentiels'}</span>
                    </button>

                    {/* Quick Search inside equipment suggestions */}
                    <div className="relative flex-1 min-w-[130px] ml-auto">
                      <input
                        type="text"
                        value={equipmentSearch}
                        onChange={(e) => setEquipmentSearch(e.target.value)}
                        placeholder={isAr ? 'بحث في التجهيزات...' : 'Filtrer équipements...'}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500"
                      />
                      {equipmentSearch && (
                        <button
                          type="button"
                          onClick={() => setEquipmentSearch('')}
                          className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chips container */}
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-56 overflow-y-auto pr-1">
                    {smartEquipment.suggestions.map((item, idx) => {
                      const label = isAr && item.ar ? item.ar : item.fr;
                      const isAdded = (formData.equipment || []).some(
                        eq => eq.trim().toLowerCase() === item.fr.trim().toLowerCase() || (item.ar && eq.trim() === item.ar.trim())
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddEquipment(item.fr)}
                          disabled={isAdded}
                          title={isAr ? item.badgeAr : item.badgeFr}
                          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 group ${
                            isAdded
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 opacity-80 cursor-default'
                              : item.source === 'inferred'
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 hover:border-amber-400'
                              : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <span className="font-bold">{isAdded ? '✓' : '➕'}</span>
                          <span>{label}</span>
                          {item.source === 'inferred' && !isAdded && (
                            <span className="text-[9px] bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1 py-0.2 rounded font-bold">
                              {isAr ? 'ذكي' : 'IA'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {smartEquipment.suggestions.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        {isAr ? 'لا توجد نتائج مطابقة لبحثك.' : 'Aucun équipement trouvé pour ce filtre.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Langues Parlées */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-600" />
                    <span>{isAr ? '🗣️ اللغات المعتمدة في الاستشارة' : '🗣️ Langues Parlées au Cabinet'}</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    {formData.languages || 'Français, Arabe, Anglais'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {COMMON_LANGUAGES.map((item) => {
                    const isSelected = (formData.languages || '').includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleLanguage(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <span>{item.flag}</span>
                        <span>{item.label}</span>
                        {isSelected && <span className="text-purple-600 dark:text-purple-400 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Accessibilité */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>♿</span>
                  <span>{isAr ? 'سهولة الوصول وتهيئة العيادة' : 'Accessibilité & Aménagements Cabinet'}</span>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ACCESSIBILITY_OPTIONS.map((acc, idx) => {
                    const isSelected = formData.accessibility === acc;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, accessibility: acc }))}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '•'}</span>
                        <span>{acc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Public Profile Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">🌟</span>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {isAr ? 'الصفحة العامة للملف المهني' : 'Page Publique du Praticien'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr 
                        ? `متاحة للعموم والمرضى عبر الرابط: /doctor/${targetDocId}` 
                        : `Accessible aux patients à l'adresse /doctor/${targetDocId}`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/doctor/${targetDocId}`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-all cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة الصفحة' : 'Aperçu public'}</span>
                </button>
              </div>

            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/doctor/${targetDocId}`);
              }}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {isAr 
                  ? `معاينة الملف العام (/doctor/${targetDocId})` 
                  : `Voir le profil public (/doctor/${targetDocId})`}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#00A896] hover:bg-teal-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-teal-700/20 hover:shadow-lg transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{isAr ? 'جارٍ الحفظ...' : 'Enregistrement...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حفظ التعديلات' : 'Enregistrer les modifications'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
      
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
                  clearCanvasSig(e);
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
                  disabled={savingSig}
                  onClick={saveDrawnSig}
                  className="px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] disabled:opacity-50 text-white text-xs font-black shadow-sm cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  {savingSig ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جارِ الحفظ...' : 'Enregistrement...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAr ? 'اعتماد وحفظ الإمضاء' : 'Valider & Sauvegarder'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ FLOATING TOAST NOTIFICATION ════════ */}
      {successMsg && (
        <ToastNotification
          type="success"
          title={isAr ? 'تم حفظ بطاقة الطبيب' : 'Fiche Praticien Enregistrée'}
          message={successMsg}
          duration={4500}
          onClose={() => setSuccessMsg('')}
        />
      )}

      {errorMsg && (
        <ToastNotification
          type="error"
          title={isAr ? 'تنبيه / خطأ' : 'Attention / Erreur'}
          message={errorMsg}
          duration={5000}
          onClose={() => setErrorMsg('')}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
