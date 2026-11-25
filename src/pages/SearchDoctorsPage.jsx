import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { LOCATIONS, SPECIALTIES, INITIAL_DOCTORS, GOVERNORATES_AR, getDoctorCoordinates } from '../data/tunisiaData';
import { resolveDoctorSpecialty, resolveDoctorCity, resolveDoctorTitle, resolveDoctorName, resolveDoctorAddress, resolveBadge } from '../utils/i18nHelper';
import SearchHeaderBar from '../components/search/SearchHeaderBar';
import TunisianPhoneInput from '../components/common/TunisianPhoneInput';
import { ENABLE_REVIEWS } from '../config/features';
import { fuzzyMatch, matchDoctor, normalizeText } from '../utils/fuzzySearch';
import { resolveMedicalTerm } from '../services/translator';

// Static emergency clinics for SOS Mode (Matching SahaTN data.js)
const EMERGENCY_CLINICS_24H = [
  {
    id: 'urg-1',
    name: 'Clinique Internationale Hannibal - Urgences 24/7',
    nameAr: 'مصحة حنبعل الدولية – استعجالي 24/7',
    city: 'Tunis',
    cityAr: 'تونس',
    delegation: 'Les Berges du Lac 2',
    delegationAr: 'ضفاف البحيرة 2',
    address: 'Avenue de la Bourse, Lac 2',
    addressAr: 'شارع البورصة، ضفاف البحيرة 2',
    phone: '+216 71 137 000'
  },
  {
    id: 'urg-2',
    name: 'Clinique Ennasr - Service Réanimation & Urgences',
    nameAr: 'مصحة النصر – قسم الإنعاش والاستعجالي',
    city: 'Tunis',
    cityAr: 'تونس',
    delegation: 'Ennasr 2',
    delegationAr: 'النصر 2',
    address: 'Avenue Hédi Nouira, Ennasr 2',
    addressAr: 'شارع الهادي نويرة، النصر 2',
    phone: '+216 70 018 000'
  },
  {
    id: 'urg-3',
    name: 'Clinique Les Oliviers - Urgences Sousse',
    nameAr: 'مصحة الزياتين – استعجالي سوسة',
    city: 'Sousse',
    cityAr: 'سوسة',
    delegation: 'Bouhsina',
    delegationAr: 'بوحسينة',
    address: 'Boulevard Léopold Senghor, Sousse',
    addressAr: 'شارع ليوبولد سنغور، سوسة',
    phone: '+216 73 242 711'
  },
  {
    id: 'urg-4',
    name: 'Polyclinique El Bassatine - Urgences Sfax',
    nameAr: 'مصحة البساتين – استعجالي صفاقس',
    city: 'Sfax',
    cityAr: 'صفاقس',
    delegation: 'Sfax Médina',
    delegationAr: 'صفاقس المدينة',
    address: 'Route de Gremda Km 1.5, Sfax',
    addressAr: 'طريق قرمدة كلم 1.5، صفاقس',
    phone: '+216 74 468 000'
  }
];

const POPULAR_LOCALITIES = [
  { del: 'Ennasr 2', city: 'Tunis', delAr: 'النصر 2', cityAr: 'تونس' },
  { del: 'Les Berges du Lac 2', city: 'Tunis', delAr: 'ضفاف البحيرة 2', cityAr: 'تونس' },
  { del: 'Riadh El Andalous', city: 'Ariana', delAr: 'رياض الأندلس', cityAr: 'أريانة' },
  { del: 'El Menzah 9', city: 'Tunis', delAr: 'المنزه 9', cityAr: 'تونس' },
  { del: 'Sousse Médina', city: 'Sousse', delAr: 'سوسة المدينة', cityAr: 'سوسة' },
  { del: 'Sfax Centre', city: 'Sfax', delAr: 'صفاقس المركز', cityAr: 'صفاقس' }
];

const QUICK_CITIES = ['Tunis', 'Ariana', 'Sousse', 'Sfax', 'Nabeul', 'Monastir', 'Bizerte', 'Ben Arous', ''];

// Clean and resolve avatar image path

// Geographic coordinates for Tunisian governorates & main delegations
const TUNISIA_COORDINATES = {
  'tunis': { lat: 36.8065, lng: 10.1815 },
  'le bardo': { lat: 36.8090, lng: 10.1410 },
  'bardo': { lat: 36.8090, lng: 10.1410 },
  'ariana': { lat: 36.8665, lng: 10.1934 },
  'ben arous': { lat: 36.7533, lng: 10.2222 },
  'la manouba': { lat: 36.8080, lng: 10.0970 },
  'manouba': { lat: 36.8080, lng: 10.0970 },
  'ennasr': { lat: 36.8742, lng: 10.1583 },
  'ennasr 2': { lat: 36.8742, lng: 10.1583 },
  'les berges du lac': { lat: 36.8375, lng: 10.2398 },
  'les berges du lac 2': { lat: 36.8400, lng: 10.2600 },
  'la marsa': { lat: 36.8782, lng: 10.3247 },
  'el menzah': { lat: 36.8415, lng: 10.1788 },
  'el manar': { lat: 36.8340, lng: 10.1500 },
  'nabeul': { lat: 36.4561, lng: 10.7376 },
  'hammamet': { lat: 36.4000, lng: 10.6167 },
  'zaghouan': { lat: 36.4028, lng: 10.1428 },
  'bizerte': { lat: 37.2744, lng: 9.8739 },
  'sousse': { lat: 35.8256, lng: 10.6084 },
  'monastir': { lat: 35.7770, lng: 10.8262 },
  'mahdia': { lat: 35.5047, lng: 11.0622 },
  'sfax': { lat: 34.7406, lng: 10.7603 },
  'kairouan': { lat: 35.6781, lng: 10.0963 },
  'kasserine': { lat: 35.1676, lng: 8.8365 },
  'sidi bouzid': { lat: 35.0382, lng: 9.4849 },
  'beja': { lat: 36.7256, lng: 9.1817 },
  'béja': { lat: 36.7256, lng: 9.1817 },
  'jendouba': { lat: 36.5011, lng: 8.7802 },
  'le kef': { lat: 36.1826, lng: 8.7149 },
  'siliana': { lat: 36.0850, lng: 9.3708 },
  'gafsa': { lat: 34.4250, lng: 8.7842 },
  'tozeur': { lat: 33.9197, lng: 8.1335 },
  'kebili': { lat: 33.7050, lng: 8.9690 },
  'kébili': { lat: 33.7050, lng: 8.9690 },
  'douz': { lat: 33.4663, lng: 9.0203 },
  'gabes': { lat: 33.8815, lng: 10.0982 },
  'gabès': { lat: 33.8815, lng: 10.0982 },
  'medenine': { lat: 33.3549, lng: 10.5055 },
  'médenine': { lat: 33.3549, lng: 10.5055 },
  'djerba': { lat: 33.8076, lng: 10.8451 },
  'tataouine': { lat: 32.9297, lng: 10.4518 }
};

function resolveDoctorCoordinates(doc) {
  return getDoctorCoordinates(doc);
}

function resolveAvatar(avatar) {
  if (!avatar) return '/images/3ila_doctor.jpeg';
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
    const isToday = (offsetDays === 0 && i === 0);

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

export default function SearchDoctorsPage({ onOpenLogin }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user, isAuthenticated } = useAuth();

  const handleGoToReviews = (doc) => {
    const docId = doc?.id || doc?._id || 'doc-1';
    navigate(`/soignant/${docId}#section-avis`, {
      state: { doctor: doc, scrollToReviews: true }
    });
  };

  // Search State
  const initialKeyword = searchParams.get('keyword') || searchParams.get('specialty') || '';
  const initialLocation = searchParams.get('location') || searchParams.get('city') || '';

  const [keyword, setKeyword] = useState(initialKeyword);
  const [locationInput, setLocationInput] = useState(initialLocation);
  const [activeCityPill, setActiveCityPill] = useState(initialLocation);

  // Sync state whenever URL searchParams change (from landing page navigation, back/forward, refresh)
  useEffect(() => {
    const currentKw = searchParams.get('keyword') || searchParams.get('specialty') || '';
    const currentLoc = searchParams.get('location') || searchParams.get('city') || '';
    setKeyword(currentKw);
    setLocationInput(currentLoc);
    setActiveCityPill(currentLoc);
  }, [searchParams]);
  
  // Filter Chips State
  const [activeChips, setActiveChips] = useState(() => {
    const chips = new Set();
    if (searchParams.get('today')) chips.add('today');
    if (searchParams.get('cnam')) chips.add('cnam');
    if (searchParams.get('telehealth')) chips.add('telehealth');
    if (searchParams.get('top_rated')) chips.add('top_rated');
    if (searchParams.get('affordable')) chips.add('affordable');
    return chips;
  });

  const [sosMode, setSosMode] = useState(false);
  const [currentSort, setCurrentSort] = useState('earliest_slot');
  const [activeAvailabilityFilter, setActiveAvailabilityFilter] = useState(''); // 'today', '3days', '7days', '14days'
  const [tempAvailOption, setTempAvailOption] = useState('');
  const [showAvailModal, setShowAvailModal] = useState(false);

  // Suggestions state
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Doctors & Data State
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [doctorWeekOffsets, setDoctorWeekOffsets] = useState({});
  const { socket } = useSocket();

  // Geolocation state
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Map state
  const [mapRevealed, setMapRevealed] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [highlightedDoctorId, setHighlightedDoctorId] = useState(null);
  const highlightTimeoutRef = useRef(null);

  const scrollToDoctorCard = (docId) => {
    if (!docId) return;
    const targetId = String(docId);
    const cardEl = document.getElementById(`doctor-card-${targetId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedDoctorId(null);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      requestAnimationFrame(() => {
        setHighlightedDoctorId(targetId);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedDoctorId(null);
        }, 2300);
      });
    }
  };

  useEffect(() => {
    window.sahatnScrollToDoctor = (id) => scrollToDoctorCard(id);
    return () => {
      delete window.sahatnScrollToDoctor;
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Booking Modal State
  const [bookingModalDoc, setBookingModalDoc] = useState(null);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingDateStr, setBookingDateStr] = useState('');
  const [bookingDateIso, setBookingDateIso] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState('self'); // 'self' or 'relative'
  const [relativeRelation, setRelativeRelation] = useState('ENFANT');
  const [relativeName, setRelativeName] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [cnamCarnet, setCnamCarnet] = useState('');
  const [bookingEmail, setBookingEmail] = useState(user?.email || '');
  const [consultType, setConsultType] = useState('CABINET');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [bookingError, setBookingError] = useState('');

  // Doctor Details Modal State
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (showAvailModal) setShowAvailModal(false);
        else if (bookingModalDoc) setBookingModalDoc(null);
        else if (selectedDoctorProfile) setSelectedDoctorProfile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAvailModal, bookingModalDoc, selectedDoctorProfile]);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch doctors on mount
  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      try {
        const res = await api.getDoctors();
        if (res.success && res.data && res.data.length > 0) {
          // Filter out unfinalized / unactivated practitioner accounts
          const activeDocs = res.data.filter(d => d.accountFinalized !== false && d.active !== false);
          // Merge API results with INITIAL_DOCTORS to retain rich fields and attach coordinates
          const merged = activeDocs.map(d => {
            const initialMatch = INITIAL_DOCTORS.find(init => init.id === d.id || init.name === d.name);
            const combined = { ...(initialMatch || {}), ...d };
            const coords = resolveDoctorCoordinates(combined);
            return { ...combined, lat: coords.lat, lng: coords.lng };
          });
          setDoctors(merged);
        } else {
          const withCoords = INITIAL_DOCTORS.map(d => {
            const coords = resolveDoctorCoordinates(d);
            return { ...d, lat: coords.lat, lng: coords.lng };
          });
          setDoctors(withCoords);
        }
      } catch (err) {
        console.warn('Fallback to INITIAL_DOCTORS:', err);
        setDoctors(INITIAL_DOCTORS);
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();

    async function loadAppointments() {
      try {
        const res = await api.getAppointments();
        if (res.success && res.data) {
          setAllAppointments(res.data);
        }
      } catch (err) {
        console.warn('Load appointments notice:', err);
      }
    }
    loadAppointments();
  }, []);

  // Live real-time socket listener to keep search slots in sync
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      api.getAppointments()
        .then(res => {
          if (res?.data) setAllAppointments(res.data);
        })
        .catch(() => {});
    };

    socket.on('appointment:new', handleSync);
    socket.on('appointment:cancelled', handleSync);
    socket.on('slot:blocked', handleSync);
    socket.on('slot:unblocked', handleSync);

    return () => {
      socket.off('appointment:new', handleSync);
      socket.off('appointment:cancelled', handleSync);
      socket.off('slot:blocked', handleSync);
      socket.off('slot:unblocked', handleSync);
    };
  }, [socket]);

  // Search Intent (Symptom function removed)

  // Geolocation Handler
  const handleRequestGeolocation = () => {
    // 1. Immediately reveal the interactive map
    setMapRevealed(true);
    setGpsLoading(true);

    const onCoordsFound = (coords, isFallback = false) => {
      setUserLocation(coords);
      setGpsActive(true);
      setGpsLoading(false);
      setCurrentSort('closest_distance');
      setMapRevealed(true);

      showToast(
        isFallback
          ? (isAr ? '📍 تم تفعيل الخريطة وموقع تونس الكبرى لحساب المسافة.' : '📍 Carte ouverte et position Grand Tunis activée pour le calcul de proximité.')
          : (isAr ? '📍 تم تحديد موقعك وتفعيل الخريطة! الأطباء مرتبون حسب الأقرب إليك.' : '📍 Position détectée et carte ouverte ! Praticiens triés par proximité.'),
        isFallback ? 'info' : 'success'
      );

      // Smooth scroll to the results & map container
      setTimeout(() => {
        const resultsEl = document.getElementById('search-results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    };

    if (!navigator.geolocation) {
      setGpsLoading(false);
      showToast(isAr ? 'الموقع الجغرافي غير مدعوم في متصفحك.' : 'La géolocalisation n\'est pas supportée par votre navigateur.', 'warning');
      onCoordsFound({ lat: 36.8065, lng: 10.1815 }, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsFound({ lat: pos.coords.latitude, lng: pos.coords.longitude }, false);
      },
      (err) => {
        console.warn('Geolocation error / denied:', err);
        onCoordsFound({ lat: 36.8065, lng: 10.1815 }, true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Distance calculation helper (Haversine)
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // Filter & Sort Doctors
  const filteredDoctors = useMemo(() => {
    let result = doctors.filter(d => d.accountFinalized !== false && d.active !== false);

    // Calculate distance for each doctor if GPS active
    if (userLocation) {
      result = result.map(doc => {
        const coords = resolveDoctorCoordinates(doc);
        const d = getDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        return { ...doc, lat: coords.lat, lng: coords.lng, distanceKm: d };
      });
    }

    // Keyword Filter (Name, Specialty, SpecialtyId, Typo & Accent-tolerant fuzzy matching)
    if (keyword.trim()) {
      result = result.filter(doc => matchDoctor(doc, keyword));
    }

    // Location Filter (Governorate, Delegation, Address - FR & AR with fuzzy matching)
    if (locationInput.trim()) {
      result = result.filter(doc => {
        const cityAr = GOVERNORATES_AR[doc.city] || '';
        const popLoc = POPULAR_LOCALITIES.find(
          p => normalizeText(p.del) === normalizeText(doc.delegation || '') || normalizeText(p.city) === normalizeText(doc.city || '')
        );
        const delAr = popLoc ? popLoc.delAr : '';
        const locTxt = `${doc.city || ''} ${cityAr} ${doc.delegation || ''} ${delAr} ${doc.address || ''} ${doc.addressAr || ''}`;
        return fuzzyMatch(locationInput, locTxt);
      });
    }

    // Chip Filters
    if (activeChips.has('cnam')) {
      result = result.filter(doc => doc.cnam);
    }
    if (activeChips.has('telehealth')) {
      result = result.filter(doc => doc.telehealth);
    }
    if (activeChips.has('top_rated')) {
      result = result.filter(doc => (doc.rating || 0) >= 4.8);
    }
    if (activeChips.has('affordable')) {
      result = result.filter(doc => (doc.fee || 70) <= 60);
    }
    if (activeChips.has('today')) {
      result = result.filter(doc => {
        if (!doc.slots) return true;
        const todayDayKey = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date().getDay()];
        return doc.slots[todayDayKey] && doc.slots[todayDayKey].length > 0;
      });
    }

    // Availability Modal Filter
    if (activeAvailabilityFilter === 'today') {
      result = result.filter(doc => {
        const todayDayKey = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date().getDay()];
        return doc.slots && doc.slots[todayDayKey] && doc.slots[todayDayKey].length > 0;
      });
    }

    // Sorting
    if (currentSort === 'best_rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentSort === 'lowest_fee') {
      result.sort((a, b) => (a.fee || 70) - (b.fee || 70));
    } else if (currentSort === 'closest_distance' && userLocation) {
      result.sort((a, b) => (parseFloat(a.distanceKm) || 999) - (parseFloat(b.distanceKm) || 999));
    }

    return result;
  }, [doctors, keyword, locationInput, activeChips, currentSort, activeAvailabilityFilter, userLocation]);

  // Handle commit search (from SearchHeaderBar button click, Enter, or clearing)
  const handleCommitSearch = ({ keyword: newKw, location: newLoc }) => {
    const trimmedKw = (newKw !== undefined ? newKw : keyword).trim();
    const trimmedLoc = (newLoc !== undefined ? newLoc : locationInput).trim();

    setKeyword(trimmedKw);
    setLocationInput(trimmedLoc);
    setActiveCityPill(trimmedLoc);

    const nextParams = new URLSearchParams();
    if (trimmedKw) nextParams.set('keyword', trimmedKw);
    if (trimmedLoc) nextParams.set('location', trimmedLoc);

    activeChips.forEach(chip => {
      nextParams.set(chip, 'true');
    });

    setSearchParams(nextParams, { replace: true });
  };

  // Toggle quick chip
  const toggleChip = (chipKey) => {
    setActiveChips(prev => {
      const next = new Set(prev);
      if (next.has(chipKey)) {
        next.delete(chipKey);
      } else {
        next.add(chipKey);
      }
      return next;
    });
  };

  // Handle City Pill Click
  const handleCityPillClick = (cityName) => {
    const nextCity = activeCityPill === cityName ? '' : cityName;
    setActiveCityPill(nextCity);
    setLocationInput(nextCity);

    const nextParams = new URLSearchParams();
    if (keyword.trim()) nextParams.set('keyword', keyword.trim());
    if (nextCity) nextParams.set('location', nextCity);

    activeChips.forEach(chip => {
      nextParams.set(chip, 'true');
    });

    setSearchParams(nextParams, { replace: true });
  };

  // Week offset shifter
  const shiftDoctorWeek = (doctorId, direction) => {
    setDoctorWeekOffsets(prev => {
      const current = prev[doctorId] || 0;
      const next = Math.max(0, current + direction * 5);
      return { ...prev, [doctorId]: next };
    });
  };

  // Booking Modal Trigger
  const handleOpenBooking = (doc, slotTime, dayFullStr, dateIso) => {
    setBookingModalDoc(doc);
    setBookingSlot(slotTime || '10:00');
    setBookingDateStr(dayFullStr || "Demain");
    setBookingDateIso(dateIso || new Date().toISOString().split('T')[0]);
    setBookingSuccessData(null);
    setBookingError('');
    setBeneficiaryType('self');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail(user?.email || '');
    setConsultType('CABINET');
  };

  // Confirm Appointment
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingSlot) {
      setBookingError(isAr ? 'يرجى اختيار موعد.' : 'Veuillez sélectionner un créneau.');
      return;
    }

    const isRelative = beneficiaryType === 'relative';
    const patientFinalName = isRelative ? relativeName.trim() : (user?.name || 'Patient');
    const patientFinalPhone = isRelative ? relativePhone.trim() : (user?.phone || '');

    if (isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب القريب.' : 'Le nom & prénom du proche sont obligatoires.');
      return;
    }

    setBookingSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        doctorId: bookingModalDoc.id,
        doctorName: bookingModalDoc.name,
        specialty: bookingModalDoc.specialtyFr || bookingModalDoc.specialty,
        date: bookingDateStr,
        time: bookingSlot,
        dateIso: bookingDateIso,
        type: consultType,
        fee: `${bookingModalDoc.fee || 70} TND`,
        patientName: patientFinalName,
        patientPhone: patientFinalPhone,
        patientEmail: (bookingEmail || user?.email || '').trim(),
        cnamCarnet: cnamCarnet || null,
        bookedFor: beneficiaryType,
        relation: isRelative ? relativeRelation : 'SELF'
      };

      const res = await api.createAppointment(payload);
      if (res.success || res.data) {
        setBookingSuccessData(res.data || payload);
      } else {
        setBookingError(res.message || 'Créneau indisponible.');
      }
    } catch (err) {
      setBookingError(err.message || 'Erreur lors de la réservation.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Leaflet Map Initialization & Sync
  useEffect(() => {
    if (!mapRevealed || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([36.85, 10.18], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    markersGroup.clearLayers();

    filteredDoctors.forEach(doc => {
      const lat = parseFloat(doc.lat) || (36.80 + Math.random() * 0.1);
      const lng = parseFloat(doc.lng) || (10.15 + Math.random() * 0.1);

      const teardropSvg = `
        <div class="custom-map-pin filter drop-shadow-md cursor-pointer transform hover:scale-125 transition-transform relative" style="width: 32px; height: 38px;">
          <div style="position: absolute; top: 3px; left: 7px; width: 18px; height: 18px; background-color: #ffffff; border-radius: 50%; z-index: 0;"></div>
          <img src="/images/map_point1.png" style="position: relative; z-index: 10; width: 32px; height: 38px; object-fit: contain;" alt="pin" />
        </div>`;

      const customIcon = L.divIcon({
        className: 'custom-teardrop-pin',
        html: teardropSvg,
        iconSize: [30, 36],
        iconAnchor: [15, 36],
        popupAnchor: [0, -32]
      });

      const avatar = resolveAvatar(doc.avatar);
      const docDisplayName = resolveDoctorName(doc, isAr ? 'ar' : 'fr');
      const specText = resolveDoctorSpecialty(doc, isAr ? 'ar' : 'fr');
      const docAddr = resolveDoctorAddress(doc.address, doc.city, isAr ? 'ar' : 'fr');
      const btnText = isAr ? 'عرض البطاقة والمواعيد ›' : 'Voir la fiche & Créneaux ›';

      const popupContent = `
        <div style="font-family: inherit; padding: 4px; max-width: 230px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; cursor: pointer;" onclick="window.sahatnScrollToDoctor && window.sahatnScrollToDoctor('${doc.id}')" title="${isAr ? 'انتقل إلى بطاقة الطبيب' : 'Aller à la fiche du praticien'}">
            <img src="${avatar}" loading="lazy" decoding="async" style="width: 40px; height: 40px; border-radius: 10px; object-fit: cover; border: 1.5px solid #00b4b6;" />
            <div style="min-width: 0;">
              <strong style="color: #0086cd; font-size: 13px; display: block; line-height: 1.2;">${docDisplayName}</strong>
              <span style="font-size: 10px; color: #64748b; font-weight: bold; display: block;">${specText}</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 ${docAddr}</div>
          <a href="#doctor-card-${doc.id}" onclick="event.preventDefault(); window.sahatnScrollToDoctor && window.sahatnScrollToDoctor('${doc.id}'); return false;" style="display: block; text-align: center; background: linear-gradient(135deg, #0086cd 0%, #00b4b6 100%); color: white; padding: 7px 12px; border-radius: 10px; font-weight: 800; font-size: 11px; text-decoration: none; box-shadow: 0 4px 12px rgba(0, 134, 205, 0.35); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(0, 134, 205, 0.45)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0, 134, 205, 0.35)';">
            ${btnText}
          </a>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroup);
      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (window.sahatnScrollToDoctor) {
          window.sahatnScrollToDoctor(doc.id);
        }
      });
    });

    // Add user marker if available & adapt map bounds
    if (userLocation) {
      if (userMarkerRef.current) markersGroup.removeLayer(userMarkerRef.current);
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 9,
        fillColor: '#0086cd',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(markersGroup).bindPopup(isAr ? '📍 موقعك الحالي' : '📍 Votre position actuelle');

      // Fit bounds to show user location and nearby doctor pins
      const boundsPoints = [[userLocation.lat, userLocation.lng]];
      filteredDoctors.slice(0, 10).forEach(d => {
        if (d.lat && d.lng) boundsPoints.push([d.lat, d.lng]);
      });
      if (boundsPoints.length > 1) {
        try {
          const b = L.latLngBounds(boundsPoints);
          map.fitBounds(b, { padding: [40, 40], maxZoom: 13 });
        } catch(e) {
          map.setView([userLocation.lat, userLocation.lng], 12);
        }
      } else {
        map.setView([userLocation.lat, userLocation.lng], 12);
      }
    }
  }, [mapRevealed, filteredDoctors, userLocation, isAr]);

  const recenterMap = () => {
    if (!mapInstanceRef.current) return;
    if (userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 12);
    } else {
      mapInstanceRef.current.setView([36.85, 10.18], 11);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-slate-50 dark:bg-[#071120] text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 z-[9999] bg-[#032b43] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/30 flex items-center gap-3 animate-bounce transition-all duration-300 ${
            isAr ? 'left-6' : 'right-6'
          }`}
        >
          <span className="text-sm font-bold">{toastMessage.msg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          1. DOCTOLIB STYLE SEARCH HEADER BAR (TEAL GRADIENT #00b4b6)
          ══════════════════════════════════════════════════════════════ */}
      <SearchHeaderBar
        keyword={keyword}
        setKeyword={setKeyword}
        locationInput={locationInput}
        setLocationInput={setLocationInput}
        showKeywordSuggestions={showKeywordSuggestions}
        setShowKeywordSuggestions={setShowKeywordSuggestions}
        showLocationSuggestions={showLocationSuggestions}
        setShowLocationSuggestions={setShowLocationSuggestions}
        handleRequestGeolocation={handleRequestGeolocation}
        gpsLoading={gpsLoading}
        activeChips={activeChips}
        toggleChip={toggleChip}
        sosMode={sosMode}
        setSosMode={setSosMode}
        activeCityPill={activeCityPill}
        setActiveCityPill={setActiveCityPill}
        handleCityPillClick={handleCityPillClick}
        onSearch={handleCommitSearch}
        isAr={isAr}
        resolveAvatar={resolveAvatar}
        doctorsList={doctors}
        specialtiesList={SPECIALTIES}
      />

      {/* ══════════════════════════════════════════════════════════════
          2. BREADCRUMB BAR (MATCHING SOIGNANTS NAVIGATION STYLE)
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0c1a2e] border-b border-slate-200/80 dark:border-slate-800 py-2.5 sm:py-3 shadow-xs transition-colors w-full overflow-hidden">
        <div className="max-w-[1450px] mx-auto px-3 sm:px-6 lg:px-10 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar max-w-full">
            <Link to="/" className="hover:text-[#0086cd] dark:hover:text-cyan-400 transition-colors">{isAr ? 'الرئيسية' : 'Accueil'}</Link>
            <span>/</span>
            <span className="text-[#0086cd] dark:text-cyan-400 font-extrabold truncate">
              {isAr ? 'الأطباء والأخصائيون في تونس' : 'Médecins & Spécialistes en Tunisie'}
            </span>
            {activeCityPill && (
              <>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold shrink-0">{activeCityPill}</span>
              </>
            )}
          </div>

          {/* Live GPS Info Badge */}
          {gpsActive && (
            <div className="text-[10px] sm:text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 animate-fadeIn shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{isAr ? 'الموقع الجغرافي نشط (نطاق 20 كم)' : 'Position GPS active (Rayon 20km)'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. MAIN RESULTS & MAP LAYOUT (2 COLUMNS - ÉLARGIE)
          ══════════════════════════════════════════════════════════════ */}
      <main id="search-results-section" className="flex-1 max-w-[1450px] w-full mx-auto px-3 sm:px-6 lg:px-10 py-5 sm:py-8 overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* LEFT COLUMN: RESULTS COUNTER & DOCTORS LIST MATRIX */}
          <div className="lg:col-span-9 space-y-4 sm:space-y-6 w-full min-w-0">

            {/* MOBILE ONLY SOS BUTTON (SHOWN AT TOP OF LIST ON MOBILE) */}
            <div className="block lg:hidden w-full">
              <button
                type="button"
                onClick={() => setSosMode(!sosMode)}
                className={`w-full p-3 rounded-2xl font-black text-xs transition-all flex items-center justify-between gap-2 shadow-md cursor-pointer ${
                  sosMode ? 'bg-rose-800 text-white ring-2 ring-rose-400' : 'bg-gradient-to-r from-rose-600 to-red-600 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <span>{isAr ? 'طوارئ 24/7 SOS' : 'SOS Urgences 24/7'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {sosMode ? (isAr ? 'مفعّل' : 'ACTIF') : (isAr ? '24س/24' : '24h/24')}
                  </span>
                </div>
              </button>
            </div>

            {/* Results Counter Title, Sorting & Disponibilités Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-3 sm:pb-4">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span>{filteredDoctors.length}</span>
                  <span>{isAr ? 'طبيب متاح للحجز' : 'praticiens disponibles'}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {isAr
                    ? 'الأطباء والأخصائيون في تونس : احجز موعدك الطبي عبر الإنترنت بكل سهولة'
                    : 'Médecins & spécialistes en Tunisie : réservez vos rendez-vous en ligne'}
                </p>
              </div>

              {/* Sorting & Disponibilités Controls */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-white dark:bg-[#0c1a2e] px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400 dark:text-slate-500">{isAr ? 'ترتيب حسب :' : 'Trier par :'}</span>
                  <select
                    value={currentSort}
                    onChange={(e) => setCurrentSort(e.target.value)}
                    className="bg-transparent font-extrabold text-[#0086cd] dark:text-cyan-400 outline-none cursor-pointer"
                  >
                    <option value="earliest_slot" className="dark:bg-[#0c1a2e] dark:text-white">{isAr ? '⚡ أقرب موعد' : '⚡ Prochain créneau rapide'}</option>
                    {ENABLE_REVIEWS && (
                      <option value="best_rating" className="dark:bg-[#0c1a2e] dark:text-white">{isAr ? '⭐ أفضل التقييمات' : '⭐ Meilleures notes & avis'}</option>
                    )}
                    <option value="closest_distance" className="dark:bg-[#0c1a2e] dark:text-white">{isAr ? '📍 الأقرب موقعاً (GPS)' : '📍 Distance GPS la plus proche'}</option>
                    <option value="lowest_fee" className="dark:bg-[#0c1a2e] dark:text-white">{isAr ? '💵 السعر الأنسب' : '💵 Tarif le plus bas'}</option>
                  </select>
                </div>

                {/* Filter Button: Disponibilités */}
                <button
                  type="button"
                  onClick={() => setShowAvailModal(true)}
                  className="group bg-white dark:bg-[#0c1a2e] hover:bg-cyan-50/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:text-[#0086cd] dark:hover:text-cyan-400 font-bold px-4 py-2 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 shrink-0 cursor-pointer"
                >
                  <img src="/images/calendar.png" alt="Calendrier" className="w-5 h-5 object-contain" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">
                    {isAr ? 'المواعيد المتاحة' : 'Disponibilités'}
                  </span>
                  {activeAvailabilityFilter && (
                    <span className="w-2 h-2 rounded-full bg-[#0086cd]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* LIVE GPS PROXIMITY BANNER */}
            {gpsActive && userLocation && (
              <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-blue-950/40 border border-teal-300/80 dark:border-teal-700/60 rounded-3xl p-5 flex items-center justify-between gap-4 flex-wrap animate-fadeIn shadow-xs">
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl p-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-xs border border-teal-100 dark:border-teal-800">📍</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr ? 'البحث الجغرافي نشط (الأطباء الأقرب إليك)' : 'Recherche par proximité GPS active'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {isAr
                        ? `تم ترتيب ${filteredDoctors.length} طبيب حسب المسافة من موقعك الحالي وعرض مواقعهم على الخريطة التفاعلية.`
                        : `${filteredDoctors.length} praticiens classés du plus proche au plus éloigné de votre position, avec géolocalisation sur la carte.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#0086cd] dark:text-cyan-400 bg-white dark:bg-[#0c1a2e] px-3.5 py-2 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-xs">
                    {filteredDoctors[0]?.distanceKm !== undefined && filteredDoctors[0]?.distanceKm !== null
                      ? (isAr ? `الأقرب: ${filteredDoctors[0].distanceKm} كم` : `Le plus proche : ${filteredDoctors[0].distanceKm} km`)
                      : (isAr ? 'الأقرب لموقعك' : 'Praticien le plus proche')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMapRevealed(true)}
                    className="text-xs font-black text-white bg-[#0086cd] hover:bg-[#0074b3] px-3.5 py-2 rounded-2xl shadow-xs transition-all cursor-pointer"
                  >
                    {isAr ? 'عرض على الخريطة 🗺️' : 'Voir sur la carte 🗺️'}
                  </button>
                </div>
              </div>
            )}

            {/* SOS EMERGENCY 24/7 BANNER (SHOWN WHEN SOS MODE IS ACTIVE) */}
            {sosMode && (
              <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-6 rounded-3xl border border-rose-500/40 shadow-xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🚨</span>
                    <div>
                      <h3 className="text-base font-black text-white">
                        {isAr ? 'وضع طوارئ SOS الطبي 24/7 نشط' : 'Mode SOS Urgences Médicales 24/7 Actif'}
                      </h3>
                      <p className="text-xs text-rose-200 font-medium">
                        {isAr
                          ? 'عرض مصحات الاستعجالي والإنعاش والمراكز الطبية المفتوحة 24 ساعة في تونس.'
                          : "Affichage des cliniques d'urgences réanimation et des centres médicaux ouverts 24h/24 en Tunisie."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSosMode(false)}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    ✕ {isAr ? 'إلغاء وضع الطوارئ' : 'Désactiver le mode SOS'}
                  </button>
                </div>

                {/* Facilities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-4 rounded-2xl border border-white/20 space-y-2 col-span-1 md:col-span-2 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🚑</span>
                      <div>
                        <h4 className="text-sm font-black text-white">
                          {isAr ? 'الإسعاف الطبي الوطني تونس 190 (SAMU)' : 'SAMU National Tunisie 190'}
                        </h4>
                        <p className="text-xs text-rose-100">
                          {isAr
                            ? 'حالات الطوارئ الحيوية، الضائقة التنفسية والحوادث الخطيرة 24س/24'
                            : 'Urgences vitales, détresse respiratoire et accidents graves 24h/24'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href="tel:190" className="bg-white text-rose-700 font-black text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 hover:bg-rose-50 transition-all">
                        <span>📞 {isAr ? 'اتصل بـ 190' : 'Appeler 190'}</span>
                      </a>
                      <a href="tel:198" className="bg-white/20 hover:bg-white/30 text-white font-black text-xs px-3 py-2 rounded-xl border border-white/30 flex items-center gap-1.5 transition-all">
                        <span>🚒 {isAr ? 'الحماية المدنية 198' : 'Protection Civile 198'}</span>
                      </a>
                    </div>
                  </div>

                  {EMERGENCY_CLINICS_24H.map(c => (
                    <div key={c.id} className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full">
                          {isAr ? 'مصحة طوارئ 24/7' : 'CLINIQUE URGENCES 24/7'}
                        </span>
                        <span className="text-xs text-rose-300 font-bold">
                          {isAr ? `${c.cityAr || c.city} (${c.delegationAr || c.delegation})` : `${c.city} (${c.delegation})`}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white">{isAr ? (c.nameAr || c.name) : c.name}</h4>
                      <p className="text-xs text-slate-300">📍 {isAr ? (c.addressAr || c.address) : c.address}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-emerald-400 font-bold">
                          🩺 {isAr ? 'إنعاش وتصوير طبي 24 ساعة' : 'Réanimation & Imagerie 24h'}
                        </span>
                        <a href={`tel:${c.phone}`} className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all">
                          <span>📞 {isAr ? 'اتصال' : 'Appeler'}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOCTORS LIST MATRIX */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c1a2e] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
                  <div className="w-10 h-10 border-4 border-[#00b4b6] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-400">
                    {isAr ? 'جاري تحميل قائمة الأطباء...' : 'Recherche des praticiens en cours...'}
                  </p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="bg-white dark:bg-[#0c1a2e] p-12 rounded-3xl text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                  <div className="w-16 h-16 bg-teal-50 text-[#0086cd] rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    🔍
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                    {isAr ? 'لم نجد أي طبيب يطابق بحثك' : 'Aucun praticien correspondant'}
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto text-xs font-medium">
                    {isAr
                      ? 'يرجى تغيير الكلمات المفاتيح أو توسيع نطاق البحث الجغرافي.'
                      : 'Veuillez vérifier vos filtres ou élargir votre zone de recherche.'}
                  </p>
                  <button
                    onClick={() => {
                      setKeyword('');
                      setLocationInput('');
                      setActiveCityPill('');
                      setActiveChips(new Set());
                      setActiveAvailabilityFilter('');
                    }}
                    className="bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold px-6 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer"
                  >
                    {isAr ? 'إعادة تعيين الفلاتر' : 'Réinitialiser tous les filtres'}
                  </button>
                </div>
              ) : (
                filteredDoctors.map(doc => {
                  const docDisplayName = resolveDoctorName(doc, isAr ? 'ar' : 'fr');
                  const specText = resolveDoctorSpecialty(doc, isAr ? 'ar' : 'fr');
                  const docAddress = resolveDoctorAddress(doc.address, doc.city, isAr ? 'ar' : 'fr');
                  const isHighlighted = highlightedDoctorId && String(highlightedDoctorId) === String(doc.id);

                  return (
                    <div
                      key={doc.id}
                      id={`doctor-card-${doc.id}`}
                      onClick={() => navigate(`/soignant/${doc.id}`, { state: { doctor: doc } })}
                      className={`cursor-pointer bg-white dark:bg-[#0c1a2e] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-cyan-400/80 dark:hover:border-teal-500/60 transition-all duration-300 relative overflow-hidden group scroll-mt-28 w-full max-w-full ${
                        isHighlighted ? 'doctor-card-double-hover' : ''
                      }`}
                      title={isAr ? 'عرض بيانات العيادة والحجز' : 'Voir la fiche cabinet & rendez-vous'}
                    >
                      {/* Subtle top accent gradient on hover or double-hover */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0086cd] via-[#00b4b6] to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 doctor-card-top-accent"></div>

                      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">

                        {/* LEFT COLUMN: Doctor Avatar & Medical Identity */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start flex-1 min-w-0">

                          {/* Avatar with Ring & Status Badge */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/soignant/${doc.id}`, { state: { doctor: doc } });
                            }}
                            className="relative shrink-0 cursor-pointer group/avatar"
                            title={isAr ? 'عرض بيانات العيادة والحجز' : 'Voir la fiche complète'}
                          >
                            <img
                              src={resolveAvatar(doc.avatar)}
                              onError={(e) => { e.currentTarget.src = '/images/3ila_doctor.jpeg'; }}
                              alt={docDisplayName}
                              loading="lazy"
                              decoding="async"
                              className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-2xl object-cover shadow-sm border-2 border-slate-100 dark:border-slate-700 group-hover/avatar:scale-105 group-hover/avatar:shadow-md transition-all duration-300 doctor-card-avatar"
                            />
                            <span
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-xs"
                              title={isAr ? 'متاح للحجز' : 'Disponible en ligne'}
                            >
                              ✓
                            </span>
                          </div>

                          {/* Core Medical Details */}
                          <div className="space-y-2 flex-1 min-w-0">

                            {/* Header: Name, Verified Badge & Distance */}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/soignant/${doc.id}`, { state: { doctor: doc } });
                                  }}
                                  className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors flex items-center gap-1.5 leading-snug cursor-pointer"
                                  title={isAr ? 'عرض بيانات العيادة والحجز' : 'Voir la fiche détaillée du soignant'}
                                >
                                  <span>{docDisplayName}</span>
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#0086cd] dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                  </svg>
                                </h3>
                                {doc.distanceKm && (
                                  <span className="text-[11px] font-extrabold text-[#00A896] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                                    <span>📍 {doc.distanceKm} km</span>
                                  </span>
                                )}
                              </div>

                              {/* Specialty Pill & Subtitle */}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-50 dark:bg-cyan-950/60 text-[#0086cd] dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800/60">
                                  {specText}
                                </span>
                                {doc.title && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-xs">
                                    • {resolveDoctorTitle(doc.title, isAr ? 'ar' : 'fr')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rating, Fees & CNAM Row */}
                            <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 pt-0.5 flex-wrap">
                              {ENABLE_REVIEWS && (
                                <>
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGoToReviews(doc);
                                    }}
                                    className="text-amber-500 dark:text-amber-400 font-black flex items-center gap-1 hover:underline transition-all cursor-pointer"
                                    title={isAr ? 'عرض تقييمات المرضى' : 'Voir les avis des patients'}
                                  >
                                    ⭐ {doc.rating || 4.9}
                                    <span className="text-slate-400 dark:text-slate-500 font-medium">({doc.reviewsCount || 100} {isAr ? 'تقييم' : 'avis'})</span>
                                  </span>

                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                </>
                              )}

                              <span className="text-slate-900 dark:text-white font-extrabold flex items-center gap-1">
                                <span className="text-slate-400 dark:text-slate-500 font-medium text-xs">{isAr ? 'التعريفة :' : 'Tarif :'}</span> {doc.fee || 70} {isAr ? 'د.ت' : 'TND'}
                              </span>

                              {doc.cnam && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                  <span className="text-[10.5px] sm:text-[11px] font-black text-[#00A896] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full">
                                    🏛️ {isAr ? 'متعاقد مع الكنام' : 'Conventionné CNAM'}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Address with Interactive Pin */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 sm:gap-2 leading-relaxed font-medium group/addr">
                              <img src="/images/gps.png" alt="Localisation" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 opacity-70 group-hover/addr:opacity-100 transition-all" />
                              <span className="truncate group-hover/addr:whitespace-normal group-hover/addr:text-slate-900 dark:group-hover/addr:text-slate-100 font-semibold transition-all">
                                {docAddress}
                              </span>
                            </p>

                            {/* Availability & Equipment Badges */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              {doc.disponibilite && (
                                <div className="text-[10.5px] sm:text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1.5">
                                  <span>🕒 {isAr ? 'أوقات العمل :' : 'Horaires :'} {doc.disponibilite}</span>
                                </div>
                              )}
                              {doc.equipment && doc.equipment.slice(0, 2).map((eq, eqIdx) => (
                                <span key={eqIdx} className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                                  {resolveMedicalTerm(eq, lang) || eq}
                                </span>
                              ))}
                            </div>

                  
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Action Buttons (Fiche cabinet & Évaluer) */}
                        <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col justify-center gap-3 self-stretch lg:self-center lg:min-w-[240px]">
                          <Link
                            to={`/soignant/${doc.id}`}
                            state={{ doctor: doc }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 lg:flex-initial bg-[#0086cd] hover:bg-[#0074b3] text-white font-black py-3 px-5 rounded-2xl text-xs sm:text-sm shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                          >
                            <span>{isAr ? 'بيانات العيادة والحجز' : 'Fiche cabinet & Rendez-vous'}</span>
                            <span>›</span>
                          </Link>
                          {ENABLE_REVIEWS && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToReviews(doc);
                              }}
                              className="flex-1 lg:flex-initial py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700 transition-all text-center cursor-pointer shadow-2xs"
                              title={isAr ? 'عرض تقييمات المرضى ومشاركتها' : 'Consulter les avis et évaluer'}
                            >
                              <span>⭐ {isAr ? 'تقييم' : 'Évaluer'}</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: STICKY SOS BUTTON & MAP (PINNED ON RIGHT WHEN SCROLLING) */}
          <div className={`lg:col-span-3 w-full ${mapRevealed ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-6 z-30 space-y-3.5 w-full">

            {/* 1. SOS URGENCE 24/7 BUTTON (POSITIONED DIRECTLY ABOVE THE MAP) */}
            <div className="w-full">
              <button
                type="button"
                id="btn-sos-urgences-sidebar"
                onClick={() => setSosMode(!sosMode)}
                className={`w-full p-4 rounded-3xl font-black transition-all flex items-center justify-between gap-3 shadow-md hover:shadow-xl cursor-pointer transform hover:-translate-y-0.5 active:scale-98 border ${
                  sosMode
                    ? 'bg-gradient-to-r from-rose-800 to-red-900 text-white border-rose-400 ring-4 ring-rose-400/40 shadow-rose-900/30'
                    : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-rose-400/40 shadow-rose-500/25'
                }`}
                title={isAr ? 'تفعيل وضع الطوارئ والعيادات المفتوحة 24/24' : 'Afficher les urgences médicales et cliniques 24h/24'}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0 backdrop-blur-xs shadow-inner">
                    🚨
                  </span>
                  <div className="text-left rtl:text-right leading-tight min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-rose-100 font-extrabold truncate">
                      {isAr ? 'خدمة الطوارئ والمناوبة' : 'Urgences & Garde'}
                    </span>
                    <span className="text-sm font-black text-white block truncate">
                      {isAr ? 'طوارئ 24/7 SOS' : 'SOS Urgences 24/7'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                    sosMode ? 'bg-white text-rose-900' : 'bg-white/25 text-white'
                  }`}>
                    {sosMode ? (isAr ? 'مفعّل' : 'ACTIF') : (isAr ? '24س' : '24h/24')}
                  </span>
                </div>
              </button>
            </div>

            {/* 2. MAP CARD (INITIAL CONSENT CARD OR VIRTUAL LEAFLET MAP) */}
            <div className="w-full">
              {/* INITIAL CONSENT CARD */}
              {!mapRevealed && (
                <div className="bg-[#f8fafc] dark:bg-[#0c1a2e] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-4 sm:space-y-5 transition-colors duration-300">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto">
                    <img src="/images/map (1).png" alt="Carte icon" className="w-16 h-16 object-contain" />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {isAr
                      ? 'أوافق على معالجة معلومات الموقع الجغرافي لعرض عيادات الأطباء في تونس على الخريطة التفاعلية.'
                      : "J'autorise le traitement d'informations (dont mon adresse IP) afin d'afficher la géolocalisation des cabinets médicaux en Tunisie."}
                    <a href="#aide" className="text-[#0086cd] dark:text-cyan-400 hover:underline font-bold block mt-1">
                      {isAr ? 'معرفة المزيد' : 'En savoir plus'}
                    </a>
                  </p>

                  <button
                    onClick={() => setMapRevealed(true)}
                    className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3.5 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>{isAr ? 'عرض الخريطة' : 'AFFICHER LA CARTE'}</span>
                  </button>
                </div>
              )}

              {/* VIRTUAL MAP CONTAINER */}
              {mapRevealed && (
                <div className="relative bg-white dark:bg-[#0c1a2e] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-300 animate-fadeIn">
                  
                  {/* Overlaid Header Controls (Top-Right) */}
                  <div className="absolute top-3 right-3 z-[400] flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={recenterMap}
                      type="button"
                      title={isAr ? 'رؤية شاملة للخريطة' : 'Vue globale'}
                      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>🎯 {isAr ? 'رؤية شاملة' : 'Vue globale'}</span>
                    </button>
                    <button
                      onClick={() => setMapRevealed(false)}
                      type="button"
                      title={isAr ? 'إخفاء الخريطة' : 'Masquer la carte'}
                      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-extrabold w-8 h-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Leaflet Map Canvas */}
                  <div ref={mapContainerRef} className="w-full h-[380px] xl:h-[440px] 2xl:h-[480px] max-h-[calc(100vh-140px)] bg-slate-100 dark:bg-slate-900 relative z-0"></div>

                  {/* Bottom Info Bar */}
                  <div className="px-4 py-2.5 bg-white dark:bg-[#0c1a2e] border-t border-slate-200/90 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-bold flex items-center justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                    <span>📍 {filteredDoctors.length} {isAr ? 'عيادة محددة على الخريطة' : 'Cabinets géolocalisés'}</span>
                  </div>
                </div>
              )}
            </div>

            </div>
          </div>

        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════
          4. DISPONIBILITÉS FILTER MODAL POPUP
          ══════════════════════════════════════════════════════════════ */}
      {showAvailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-6 animate-fadeIn transition-colors duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <img src="/images/calendar.png" className="w-7 h-7" alt="" />
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isAr ? 'المواعيد المتاحة' : 'Disponibilités'}
                </h3>
              </div>
              <button
                onClick={() => setShowAvailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Radio Options List Container */}
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#071322] shadow-xs">
              
              <label className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-slate-800/60 transition-all text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group">
                <input
                  type="radio"
                  name="avail-option"
                  value="today"
                  checked={tempAvailOption === 'today'}
                  onChange={() => setTempAvailOption('today')}
                  className="w-4 h-4 text-[#0086cd] focus:ring-[#0086cd] border-slate-300 dark:border-slate-600"
                />
                <span className="group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">{isAr ? 'اليوم' : "Aujourd'hui"}</span>
              </label>

              <label className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-slate-800/60 transition-all text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group">
                <input
                  type="radio"
                  name="avail-option"
                  value="3days"
                  checked={tempAvailOption === '3days'}
                  onChange={() => setTempAvailOption('3days')}
                  className="w-4 h-4 text-[#0086cd] focus:ring-[#0086cd] border-slate-300 dark:border-slate-600"
                />
                <span className="group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">{isAr ? 'خلال 3 أيام' : 'Dans les 3 prochains jours'}</span>
              </label>

              <label className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-slate-800/60 transition-all text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group">
                <input
                  type="radio"
                  name="avail-option"
                  value="7days"
                  checked={tempAvailOption === '7days'}
                  onChange={() => setTempAvailOption('7days')}
                  className="w-4 h-4 text-[#0086cd] focus:ring-[#0086cd] border-slate-300 dark:border-slate-600"
                />
                <span className="group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">{isAr ? 'خلال 7 أيام' : 'Dans les 7 prochains jours'}</span>
              </label>

              <label className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-slate-800/60 transition-all text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group">
                <input
                  type="radio"
                  name="avail-option"
                  value="14days"
                  checked={tempAvailOption === '14days'}
                  onChange={() => setTempAvailOption('14days')}
                  className="w-4 h-4 text-[#0086cd] focus:ring-[#0086cd] border-slate-300 dark:border-slate-600"
                />
                <span className="group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">{isAr ? 'خلال 14 يوماً' : 'Dans les 14 prochains jours'}</span>
              </label>

            </div>

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-between pt-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTempAvailOption('');
                  setActiveAvailabilityFilter('');
                  setShowAvailModal(false);
                }}
                className="text-xs font-extrabold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider transition-colors py-2 px-1 cursor-pointer"
              >
                {isAr ? 'إلغاء الفلتر' : 'EFFACER CE FILTRE'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAvailabilityFilter(tempAvailOption);
                  setShowAvailModal(false);
                }}
                className="bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer"
              >
                {isAr ? 'تطبيق الفلتر' : 'AFFICHER LES RÉSULTATS'}
              </button>
            </div>

          </div>
        </div>
      )}

 

      {/* ══════════════════════════════════════════════════════════════
          6. DOCTOR PROFILE DETAILS MODAL ("Fiche cabinet & Rendez-vous")
          ══════════════════════════════════════════════════════════════ */}
      {selectedDoctorProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            
            <button
              onClick={() => setSelectedDoctorProfile(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Profile Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <img
                src={resolveAvatar(selectedDoctorProfile.avatar)}
                loading="lazy"
                decoding="async"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-100 dark:border-teal-800 shadow-sm"
                alt=""
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedDoctorProfile.name}</h3>
                  <span className="text-[10px] font-black bg-cyan-50 dark:bg-cyan-950/60 text-[#0086cd] dark:text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/80">
                    Praticien Vérifié ✓
                  </span>
                </div>
                <p className="text-xs font-extrabold text-[#0086cd] dark:text-cyan-400">{selectedDoctorProfile.specialtyFr || selectedDoctorProfile.specialty}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">📍 {selectedDoctorProfile.address || selectedDoctorProfile.city}</p>
                <div className="text-xs font-bold text-amber-500 flex items-center gap-1 pt-1">
                  {ENABLE_REVIEWS && (
                    <>⭐ {selectedDoctorProfile.rating || 4.9} ({selectedDoctorProfile.reviewsCount || 100} avis) • </>
                  )}
                  💵 {selectedDoctorProfile.fee || 70} TND
                </div>
              </div>
            </div>

            {/* Medical Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-[#071322] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-400 dark:text-slate-500 block">Formation & Diplômes</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{selectedDoctorProfile.faculty || 'Faculté de Médecine de Tunis'}</span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">{selectedDoctorProfile.ordreId || "Inscrit à l'Ordre des Médecins"}</span>
              </div>

              <div className="bg-slate-50 dark:bg-[#071322] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-400 dark:text-slate-500 block">Prise en charge</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block">
                  {selectedDoctorProfile.cnam ? '✓ Conventionné CNAM (Filière Privée)' : 'Secteur Libre'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Tiers payant & Remboursement partiel</span>
              </div>
            </div>

            {/* Equipments */}
            {selectedDoctorProfile.equipment && selectedDoctorProfile.equipment.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isAr ? '🔬 تجهيزات العيادة' : '🔬 Équipements du Cabinet'}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedDoctorProfile.equipment.map((eq, i) => (
                    <span key={i} className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      {resolveMedicalTerm(eq, lang) || eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Book Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const doc = selectedDoctorProfile;
                  setSelectedDoctorProfile(null);
                  const todayNow = new Date();
                  const todayStr = `${todayNow.getDate()}/${todayNow.getMonth() + 1}/${todayNow.getFullYear()}`;
                  handleOpenBooking(doc, '10:00', todayStr, todayNow.toISOString().split('T')[0]);
                }}
                className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📅 Prendre Rendez-Vous avec {selectedDoctorProfile.name}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
