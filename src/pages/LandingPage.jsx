import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  LOCATIONS,
  SPECIALTIES,
  GOVERNORATES_AR,
  INITIAL_DOCTORS
} from '../data/tunisiaData';
import { fuzzyMatch, matchDoctor, matchSpecialty } from '../utils/fuzzySearch';
import { resolveDoctorName, resolveDoctorSpecialty, resolveDoctorCity } from '../utils/i18nHelper';

export default function LandingPage({ onOpenLogin }) {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';

  // Search state
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDocMeta, setSelectedDocMeta] = useState(null);

  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');

  const [governorateQuery, setGovernorateQuery] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');

  const [localityQuery, setLocalityQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');

  // Active dropdown: 'doctor' | 'specialty' | 'governorate' | 'locality' | null
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Stats counters state
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [counts, setCounts] = useState({
    docs: 0,
    rdv: 0,
    time: 0,
    satisfaction: 0
  });

  const searchBarRef = useRef(null);
  const statsRef = useRef(null);

  // Close dropdowns on outside click of active dropdown column
  useEffect(() => {
    function handleClickOutside(e) {
      if (!activeDropdown) return;
      const activeCol = document.getElementById(`landing-col-${activeDropdown}`);
      if (activeCol && !activeCol.contains(e.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeDropdown]);

  // Scroll reveal observer & scroll listener
  useEffect(() => {
    const observerOptions = { threshold: 0.08, rootMargin: '0px 0px 40px 0px' };
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const checkElements = () => {
      const elements = document.querySelectorAll(
        '.reveal-scroll, .reveal-scroll-left, .reveal-scroll-right'
      );
      elements.forEach((el) => {
        scrollObserver.observe(el);
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 60) {
          el.classList.add('is-visible');
        }
      });
    };

    checkElements();
    window.addEventListener('scroll', checkElements, { passive: true });
    const timer = setTimeout(checkElements, 150);

    return () => {
      window.removeEventListener('scroll', checkElements);
      scrollObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Stats counter animation observer
  useEffect(() => {
    if (!statsRef.current) return;

    const startCounterAnimation = () => {
      if (statsAnimated) return;
      setStatsAnimated(true);

      const duration = 2000;
      const startTime = performance.now();
      const targets = { docs: 1400, rdv: 45000, time: 24, satisfaction: 98 };

      function animateCounters(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setCounts({
          docs: Math.floor(easeOut * targets.docs),
          rdv: Math.floor(easeOut * targets.rdv),
          time: Math.floor(easeOut * targets.time),
          satisfaction: Math.floor(easeOut * targets.satisfaction)
        });

        if (progress < 1) {
          requestAnimationFrame(animateCounters);
        } else {
          setCounts(targets);
        }
      }
      requestAnimationFrame(animateCounters);
    };

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startCounterAnimation();
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    statsObserver.observe(statsRef.current);

    // Initial check in case stats container is already in viewport
    const rect = statsRef.current.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      startCounterAnimation();
    }

    return () => statsObserver.disconnect();
  }, [statsAnimated]);

  // Synchronize language changes with displayed text in inputs if an option was selected
  useEffect(() => {
    if (selectedSpecialtyId) {
      const found = SPECIALTIES.find((s) => s.id === selectedSpecialtyId);
      if (found) {
        setSpecialtyQuery(isAr && found.ar ? found.ar : found.fr);
      }
    }
    if (selectedGovernorate) {
      const foundGov = LOCATIONS.find(
        (l) => l.city.toLowerCase() === selectedGovernorate.toLowerCase()
      );
      if (foundGov) {
        setGovernorateQuery(
          isAr && GOVERNORATES_AR[foundGov.city]
            ? GOVERNORATES_AR[foundGov.city]
            : foundGov.city
        );
      }
    }
  }, [isAr, selectedSpecialtyId, selectedGovernorate]);

  // Handle Search Submission
  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setActiveDropdown(null);

    // 1. Priority for Doctor Name, fallback to Specialty
    let finalKeyword = '';
    const docVal = doctorQuery.trim();
    if (docVal) {
      finalKeyword = docVal;
    } else {
      let specVal = '';
      if (selectedSpecialtyId) {
        const found = SPECIALTIES.find((s) => s.id === selectedSpecialtyId);
        if (found) {
          specVal = isAr && found.ar ? found.ar : found.fr;
        } else {
          specVal = selectedSpecialtyId;
        }
      } else if (specialtyQuery.trim()) {
        const sq = specialtyQuery.trim();
        const sqLower = sq.toLowerCase();
        if (
          !sqLower.includes('toutes les') &&
          !sqLower.includes('جميع الاختصاصات') &&
          !sqLower.includes('اختر') &&
          !sqLower.includes('choisir')
        ) {
          specVal = sq;
        }
      }
      if (specVal) {
        finalKeyword = specVal;
      }
    }

    // 2. Priority for Governorate, fallback to Locality / Delegation
    let finalLocation = '';
    let govVal = '';
    if (selectedGovernorate) {
      const foundGov = LOCATIONS.find(
        (l) => l.city.toLowerCase() === selectedGovernorate.toLowerCase()
      );
      if (foundGov) {
        govVal = isAr && GOVERNORATES_AR[foundGov.city]
          ? GOVERNORATES_AR[foundGov.city]
          : foundGov.city;
      } else {
        govVal = selectedGovernorate;
      }
    } else if (governorateQuery.trim()) {
      const gq = governorateQuery.trim();
      const gqLower = gq.toLowerCase();
      if (
        !gqLower.includes('tous les') &&
        !gqLower.includes('جميع الولايات') &&
        !gqLower.includes('اختر') &&
        !gqLower.includes('choisir')
      ) {
        govVal = gq;
      }
    }

    if (govVal) {
      finalLocation = govVal;
    } else {
      let locVal = '';
      if (selectedLocality) {
        locVal = selectedLocality;
      } else if (localityQuery.trim()) {
        const lq = localityQuery.trim();
        const lqLower = lq.toLowerCase();
        if (
          !lqLower.includes('toutes les') &&
          !lqLower.includes('جميع المعتمديات') &&
          !lqLower.includes('sélectionnez') &&
          !lqLower.includes('اختر') &&
          !lqLower.includes('choisir')
        ) {
          locVal = lq;
        }
      }
      if (locVal) {
        finalLocation = locVal;
      }
    }

    // 3. Build search params. If neither, navigate to empty search for all doctors!
    const params = new URLSearchParams();
    if (finalKeyword) params.set('keyword', finalKeyword);
    if (finalLocation) params.set('location', finalLocation);

    const queryStr = params.toString();
    navigate(queryStr ? `/search?${queryStr}` : '/search');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e);
    }
  };

  // --- DOCTOR AUTOCOMPLETE SUGGESTIONS (Fuzzy, Typo & Accent-tolerant) ---
  const getDoctorSuggestions = () => {
    const rawQuery = doctorQuery.trim();
    if (!rawQuery) {
      return {
        type: 'initial',
        recommendedDocs: INITIAL_DOCTORS.slice(0, 4)
      };
    }

    const matchingDocs = INITIAL_DOCTORS.filter((d) => matchDoctor(d, doctorQuery));

    return {
      type: 'filtered',
      matchingDocs: matchingDocs.slice(0, 5)
    };
  };

  // --- SPECIALTIES SUGGESTIONS (Fuzzy, Typo & Accent-tolerant) ---
  const getSpecialtySuggestions = () => {
    return SPECIALTIES.filter((s) => matchSpecialty(s, specialtyQuery));
  };

  // --- GOVERNORATE SUGGESTIONS (Fuzzy, Typo & Accent-tolerant) ---
  const getGovernorateSuggestions = () => {
    const q = governorateQuery.trim();
    return LOCATIONS.filter((l) => {
      const arCity = GOVERNORATES_AR[l.city] || '';
      return !q || fuzzyMatch(q, `${l.city} ${arCity}`);
    });
  };

  // --- LOCALITY SUGGESTIONS (Fuzzy, Typo & Accent-tolerant) ---
  const getLocalitySuggestions = () => {
    const q = localityQuery.trim();
    let delegationsList = [];

    if (selectedGovernorate) {
      const foundGov = LOCATIONS.find((loc) => {
        return fuzzyMatch(selectedGovernorate, loc.city);
      });
      if (foundGov && foundGov.delegations) {
        delegationsList = foundGov.delegations;
      }
    } else {
      LOCATIONS.forEach((l) => {
        l.delegations.forEach((d) => delegationsList.push(d));
      });
    }

    return delegationsList.filter((d) => !q || fuzzyMatch(q, d));
  };

  // Format counter values with spaces for thousands
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const docSuggestionsData = getDoctorSuggestions();
  const specialtyList = getSpecialtySuggestions();
  const governorateList = getGovernorateSuggestions();
  const localityList = getLocalitySuggestions();

  return (
    <div className="w-full min-h-screen bg-[#edf7f9] dark:bg-[#071120] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* ======================================================== */}
      {/* 1. HERO SECTION                                          */}
      {/* ======================================================== */}
      <section className="relative bg-[#edf7f9] dark:bg-[#071120] pt-6 sm:pt-8 md:pt-12 pb-14 sm:pb-24 overflow-visible z-30 transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Hero Text (Left in LTR, Right in RTL) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 pt-2 sm:pt-4 text-start">
              <h1
                id="hero-main-title"
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#483d73] dark:text-white tracking-tight leading-[1.2]"
              >
                {isAr ? (
                  <>
                    منصة حجز <br />
                    <span className="text-[#00b4b6]">المواعيد الطبية في تونس</span>
                  </>
                ) : (
                  <>
                    Plateforme de Prise <br />
                    de <span className="text-[#00b4b6]">Rendez-vous</span> Médical
                  </>
                )}
              </h1>
              <p
                id="hero-subtitle"
                className="text-[#595272] dark:text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-normal"
              >
                {isAr
                  ? 'اكتشف واحجز مواعيدك مع أفضل الأطباء والأخصائيين الأقرب إليك في تونس.'
                  : 'Découvrez et réservez vos rendez-vous avec les meilleurs médecins près de chez vous.'}
              </p>
            </div>

            {/* Hero Visual (Doctor concentric halo: Right in LTR, Left in RTL) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end my-2 lg:my-0">
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[400px] lg:h-[400px] max-w-full flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#b8e8eb]/60 scale-100"></div>
                <div className="absolute w-[82%] h-[82%] rounded-full bg-[#3ec7c7]/80 flex items-center justify-center"></div>
                <div className="absolute w-[68%] h-[68%] rounded-full bg-[#00b4b6] overflow-hidden flex items-center justify-center shadow-2xl border-4 border-white">
                  <img
                    src="/images/landing_hero_doctor.jpg"
                    alt={isAr ? 'طبيب ممارس Maw2idi' : 'Médecin Praticien Maw2idi'}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover object-center scale-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* FLOATING SEARCH BAR                                      */}
          {/* ======================================================== */}
          <div
            ref={searchBarRef}
            className="bg-white dark:bg-[#0c1a2e] rounded-2xl sm:rounded-3xl shadow-xl dark:shadow-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 md:p-6 mt-6 sm:mt-8 lg:mt-10 w-full max-w-7xl mx-auto relative z-40 transition-colors duration-300"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 gap-3 sm:gap-4 items-center">
              {/* 1. Choisir un médecin */}
              <div id="landing-col-doctor" className="lg:col-span-2 flex items-center gap-3 px-2 border-b sm:border-b-0 sm:border-e border-slate-100 dark:border-slate-800 pb-3 sm:pb-0 relative text-start">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#00b4b6] shrink-0">
                  <img src="/images/doctor.png" alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="w-full relative">
                  <label
                    id="label-landing-doctor"
                    className={isAr ? "block text-[15px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1" : "block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"}
                  >
                    {isAr ? 'اختر الطبيب' : 'Choisir un médecin'}
                   </label>
                  <input
                    type="text"
                    id="landing-doctor"
                    value={doctorQuery}
                    onChange={(e) => {
                      setDoctorQuery(e.target.value);
                      setActiveDropdown('doctor');
                    }}
                    onFocus={() => setActiveDropdown('doctor')}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isAr ? 'الاسم و اللقب' : 'Nom et Prénom'
                    }
                    className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-text transition-colors"
                    autoComplete="off"
                  />

                  {/* Doctor Suggestions Dropdown */}
                  {activeDropdown === 'doctor' && (
                    <div
                      id="landing-doctor-suggestions"
                      className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-[420px] overflow-y-auto p-2 text-start custom-scrollbar min-w-[280px] sm:min-w-[340px]"
                    >
                      {docSuggestionsData.type === 'initial' ? (
                        <>
                          {/* Recommended Doctors */}
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-teal-700 tracking-wider">
                            {isAr
                              ? '👨‍⚕️ الأطباء الممارسون الموصى بهم'
                              : '👨‍⚕️ Médecins Praticiens Recommandés'}
                          </div>
                          {docSuggestionsData.recommendedDocs.map((d, idx) => {
                            const docName = resolveDoctorName(d, isAr ? 'ar' : 'fr');
                            const docSpec = resolveDoctorSpecialty(d, isAr ? 'ar' : 'fr');
                            const docCity = resolveDoctorCity(d.city, isAr ? 'ar' : 'fr');
                            const docDel = d.delegation ? `(${d.delegation})` : '';
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setDoctorQuery(docName);
                                  setSelectedDocMeta(d);
                                  if (d.specialtyId) {
                                    setSelectedSpecialtyId(d.specialtyId);
                                    const sp = SPECIALTIES.find((s) => s.id === d.specialtyId);
                                    if (sp) setSpecialtyQuery(isAr && sp.ar ? sp.ar : sp.fr);
                                  }
                                  if (d.city) {
                                    setSelectedGovernorate(d.city.toLowerCase());
                                    setGovernorateQuery(
                                      isAr && GOVERNORATES_AR[d.city] ? GOVERNORATES_AR[d.city] : d.city
                                    );
                                  }
                                  if (d.delegation) {
                                    setSelectedLocality(d.delegation.toLowerCase());
                                    setLocalityQuery(d.delegation);
                                  }
                                  setActiveDropdown(null);
                                }}
                                className="doc-suggestion-item flex items-center gap-2.5 p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-teal-200">
                                  <img
                                    src={d.avatar || '/images/doctor_selim.jpg'}
                                    alt={docName}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate">
                                    {docName}{' '}
                                    <span className="text-amber-500 font-extrabold text-[11px]">
                                      ★ {d.rating || '4.9'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium truncate">
                                    {docSpec} • {docCity} {docDel}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                       

                          </>
                      ) : docSuggestionsData.matchingDocs.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                          {isAr ? 'لا توجد نتائج مطابقة' : `Aucun résultat pour "${doctorQuery}"`}
                        </div>
                      ) : (
                        <>
                          {/* Matching Doctors */}
                          {docSuggestionsData.matchingDocs.length > 0 && (
                            <>
                              <div className="px-2 py-1 mt-1 text-[10px] font-black uppercase text-teal-700 tracking-wider">
                                {isAr ? '👨‍⚕️ الأطباء الممارسون' : '👨‍⚕️ Médecins Praticiens'}
                              </div>
                              {docSuggestionsData.matchingDocs.map((d, idx) => {
                                const docName = resolveDoctorName(d, isAr ? 'ar' : 'fr');
                                const docSpecName = resolveDoctorSpecialty(d, isAr ? 'ar' : 'fr');
                                const docCityName = resolveDoctorCity(d.city, isAr ? 'ar' : 'fr');
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setDoctorQuery(docName);
                                      setSelectedDocMeta(d);
                                      if (d.specialtyId) {
                                        setSelectedSpecialtyId(d.specialtyId);
                                        const sp = SPECIALTIES.find((s) => s.id === d.specialtyId);
                                        if (sp) setSpecialtyQuery(isAr && sp.ar ? sp.ar : sp.fr);
                                      }
                                      if (d.city) {
                                        setSelectedGovernorate(d.city.toLowerCase());
                                        setGovernorateQuery(
                                          isAr && GOVERNORATES_AR[d.city]
                                            ? GOVERNORATES_AR[d.city]
                                            : d.city
                                        );
                                      }
                                      if (d.delegation) {
                                        setSelectedLocality(d.delegation.toLowerCase());
                                        setLocalityQuery(d.delegation);
                                      }
                                      setActiveDropdown(null);
                                    }}
                                    className="doc-suggestion-item flex items-center gap-2.5 p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                      <img
                                        src={d.avatar || '/images/doctor_selim.jpg'}
                                        alt={docName}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate">
                                        {docName}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-medium truncate">
                                        {docSpecName} • {docCityName} ({d.delegation || ''})
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Choisir une spécialité */}
              <div id="landing-col-specialty" className="lg:col-span-2 flex items-center gap-3 px-2 border-b md:border-b-0 md:border-e border-slate-100 dark:border-slate-800 pb-3 md:pb-0 relative text-start">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#00b4b6] shrink-0">
                  <img src="/images/first-aid-kit.png" alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="w-full relative">
                  <label
                    id="label-landing-specialty"
                    className={isAr ? "block text-[15px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1" : "block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"}
                  >
                    {isAr ? 'اختر الاختصاص الطبي' : 'Choisir une spécialité'}
                  </label>
                  <input
                    type="text"
                    id="landing-specialty-input"
                    value={specialtyQuery}
                    onChange={(e) => {
                      setSpecialtyQuery(e.target.value);
                      setSelectedSpecialtyId('');
                      setActiveDropdown('specialty');
                    }}
                    onFocus={() => setActiveDropdown('specialty')}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isAr ? 'جميع الاختصاصات...' : 'Toutes les spécialités...'
                    }
                    className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-text transition-colors"
                    autoComplete="off"
                  />
                  <input type="hidden" id="landing-specialty" value={selectedSpecialtyId} />

                  {/* Specialty Suggestions Dropdown */}
                  {activeDropdown === 'specialty' && (
                    <div
                      id="landing-specialty-suggestions"
                      className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-[420px] overflow-y-auto p-2 text-start custom-scrollbar min-w-[280px] sm:min-w-[340px]"
                    >
                      <div
                        onClick={() => {
                          setSelectedSpecialtyId('');
                          setSpecialtyQuery('');
                          setActiveDropdown(null);
                        }}
                        className="spec-item p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        {isAr ? 'جميع الاختصاصات...' : 'Toutes les spécialités...'}
                      </div>
                      {specialtyList.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                          {isAr ? 'لم يتم العثور على أي اختصاص' : 'Aucune spécialité trouvée'}
                        </div>
                      ) : (
                        specialtyList.map((s, idx) => {
                          const specTitle = isAr && s.ar ? s.ar : s.fr;
                          const specSubtitle = isAr && s.ar ? s.fr : s.ar || '';
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedSpecialtyId(s.id);
                                setSpecialtyQuery(specTitle);
                                setActiveDropdown(null);
                              }}
                              className="spec-item flex items-center gap-2.5 p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{specTitle}</div>
                                {specSubtitle && (
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {specSubtitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Choisir un gouvernorat */}
              <div id="landing-col-governorate" className="lg:col-span-2 flex items-center gap-3 px-2 border-b md:border-b-0 md:border-e border-slate-100 dark:border-slate-800 pb-3 md:pb-0 relative text-start">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#00b4b6] shrink-0">
                  <img src="/images/gps.png" alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="w-full relative">
                  <label
                    id="label-landing-governorat"
                    className={isAr ? "block text-[15px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1" : "block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"}

                  >
                    {isAr ? 'اختر الولاية' : 'Choisir un gouvernorat'}
                  </label>
                  <input
                    type="text"
                    id="landing-governorat-input"
                    value={governorateQuery}
                    onChange={(e) => {
                      setGovernorateQuery(e.target.value);
                      setSelectedGovernorate('');
                      setActiveDropdown('governorate');
                    }}
                    onFocus={() => setActiveDropdown('governorate')}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isAr ? 'جميع الولايات...' : 'Tous les gouvernorats...'
                    }
                    className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-text transition-colors"
                    autoComplete="off"
                  />
                  <input type="hidden" id="landing-governorat" value={selectedGovernorate} />

                  {/* Governorate Suggestions Dropdown */}
                  {activeDropdown === 'governorate' && (
                    <div
                      id="landing-governorat-suggestions"
                      className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-[420px] overflow-y-auto p-2 text-start custom-scrollbar min-w-[280px] sm:min-w-[340px]"
                    >
                      <div
                        onClick={() => {
                          setSelectedGovernorate('');
                          setGovernorateQuery('');
                          setSelectedLocality('');
                          setLocalityQuery('');
                          setActiveDropdown(null);
                        }}
                        className="gov-item p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        {isAr ? 'جميع الولايات...' : 'Tous les gouvernorats...'}
                      </div>
                      {governorateList.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                          {isAr ? 'لم يتم العثور على أي ولاية' : 'Aucun gouvernorat trouvé'}
                        </div>
                      ) : (
                        governorateList.map((l, idx) => {
                          const govTitle =
                            isAr && GOVERNORATES_AR[l.city] ? GOVERNORATES_AR[l.city] : l.city;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedGovernorate(l.city.toLowerCase());
                                setGovernorateQuery(govTitle);
                                setSelectedLocality('');
                                setLocalityQuery('');
                                setActiveDropdown(null);
                              }}
                              className="gov-item flex items-center gap-2.5 p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                <img
                                  src="/images/gps.png"
                                  alt="Gouvernorat"
                                  className="w-4 h-4 object-contain"
                                />
                              </div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{govTitle}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Choisir une localité */}
              <div id="landing-col-locality" className="lg:col-span-2 flex items-center gap-3 px-2 pb-3 md:pb-0 relative text-start">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#00b4b6] shrink-0">
                  <img src="/images/flag.png" alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="w-full relative">
                  <label
                    id="label-landing-localite"
                    className={isAr ? "block text-[15px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1" : "block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"}
                  >
                    {isAr ? "اختيار المعتمدية / المنطقة" : "Choisir une localité"}
                  </label>
                  <input
                    type="text"
                    id="landing-localite-input"
                    value={localityQuery}
                    onChange={(e) => {
                      setLocalityQuery(e.target.value);
                      setSelectedLocality('');
                      setActiveDropdown('locality');
                    }}
                    onFocus={() => setActiveDropdown('locality')}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isAr
                        ? 'اختر المعتمدية أو المدينة...'
                        : 'Sélectionnez un gouvernorat...'
                    }
                    className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-text transition-colors"
                    autoComplete="off"
                  />
                  <input type="hidden" id="landing-localite" value={selectedLocality} />

                  {/* Locality Suggestions Dropdown */}
                  {activeDropdown === 'locality' && (
                    <div
                      id="landing-localite-suggestions"
                      className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-[420px] overflow-y-auto p-2 text-start custom-scrollbar min-w-[280px] sm:min-w-[340px]"
                    >
                      <div
                        onClick={() => {
                          setSelectedLocality('');
                          setLocalityQuery('');
                          setActiveDropdown(null);
                        }}
                        className="loc-item p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                      >
                        {isAr
                          ? selectedGovernorate
                            ? `جميع المعتمديات والمناطق (${governorateQuery})`
                            : 'جميع المعتمديات والمناطق...'
                          : selectedGovernorate
                            ? `Toutes les localités (${governorateQuery})`
                            : 'Toutes les localités...'}
                      </div>
                      {localityList.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-slate-400 text-center">
                          {isAr ? 'لم يتم العثور على أي معتمدية' : 'Aucune localité trouvée'}
                        </div>
                      ) : (
                        localityList.map((del, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedLocality(del.toLowerCase());
                              setLocalityQuery(del);
                              setActiveDropdown(null);
                            }}
                            className="loc-item flex items-center gap-2.5 p-2 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                              <img
                                src="/images/flag.png"
                                alt="Localité"
                                className="w-4 h-4 object-contain"
                              />
                            </div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{del}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Search Button */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex justify-center pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full h-11 sm:h-12 bg-[#00b4b6] hover:bg-[#009b9d] text-white rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                  title={isAr ? 'بحث' : 'Rechercher'}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="lg:hidden">{isAr ? 'بحث' : 'Rechercher'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. SECTION COMPAGNON DE SANTÉ                            */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#091527] border-b border-slate-100 dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto reveal-scroll">
            <h2
              id="landing-companion-title"
              className="text-2xl sm:text-4xl font-extrabold text-[#002b49] dark:text-white tracking-tight"
            >
              {isAr ? 'رفيقكم الصحي اليومي في تونس' : 'Votre compagnon de santé au quotidien'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {/* Card 1 */}
            <div className="reveal-scroll delay-100 bg-white dark:bg-[#0c1a2e] p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-xl hover:shadow-2xl hover:border-teal-300/50 dark:hover:border-teal-500/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#e8f6fd] dark:bg-cyan-950/60 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#d0edfb] dark:group-hover:bg-cyan-900/60 transition-all duration-300">
                <svg className="w-10 h-10 text-[#0e87d0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3
                id="landing-comp-card1-title"
                className="text-xl font-extrabold text-[#002b49] dark:text-white mb-3 group-hover:text-[#0086cd] transition-colors"
              >
                {isAr ? 'الوصول إلى الرعاية الصحية بكل سهولة' : 'Accédez aux soins plus facilement'}
              </h3>
              <p
                id="landing-comp-card1-desc"
                className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
              >
                {isAr
                  ? 'احجز استشاراتك عبر الفيديو أو بالعيادة مباشرة، واحصل على تذكير بمواعيدك دون تأخير.'
                  : 'Réservez des consultations vidéo ou en présentiel, et recevez des rappels pour ne jamais les manquer.'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="reveal-scroll delay-200 bg-white dark:bg-[#0c1a2e] p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-xl hover:shadow-2xl hover:border-amber-300/50 dark:hover:border-amber-500/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#fff7e6] dark:bg-amber-950/60 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#ffedd0] dark:group-hover:bg-amber-900/60 transition-all duration-300">
                <svg className="w-10 h-10 text-[#00b4b6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3
                id="landing-comp-card2-title"
                className="text-xl font-extrabold text-[#002b49] dark:text-white mb-3 group-hover:text-[#00b4b6] transition-colors"
              >
                {isAr ? 'رعاية صحية مخصصة' : 'Bénéficiez de soins personnalisés'}
              </h3>
              <p
                id="landing-comp-card2-desc"
                className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
              >
                {isAr
                  ? 'تواصل مع أطبائك عبر الرسائل الآمنة، واستفد من نصائح وقائية ورعاية عند الحاجة.'
                  : 'Échangez avec vos soignants par message, obtenez des conseils préventifs et recevez des soins quand vous en avez besoin.'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="reveal-scroll delay-300 bg-white dark:bg-[#0c1a2e] p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-xl hover:shadow-2xl hover:border-rose-300/50 dark:hover:border-rose-500/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#ffeef2] dark:bg-rose-950/60 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#ffdce5] dark:group-hover:bg-rose-900/60 transition-all duration-300">
                <svg className="w-10 h-10 text-[#e11d48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3
                id="landing-comp-card3-title"
                className="text-xl font-extrabold text-[#002b49] dark:text-white mb-3 group-hover:text-[#e11d48] transition-colors"
              >
                {isAr ? 'إدارة صحتك وصحة عائلتك' : 'Gérez votre santé'}
              </h3>
              <p
                id="landing-comp-card3-desc"
                className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
              >
                {isAr
                  ? 'اجمع كافة سجلاتك الطبية ومعلومات أحبائك في فضاء صحي رقمي آمن ومشفر.'
                  : 'Rassemblez facilement toutes vos informations de santé et celles de ceux qui comptent pour vous.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. SECTION COMMENT FONCTIONNE SAHATN                     */}
      {/* ======================================================== */}
      <section id="aide" className="py-16 sm:py-24 bg-[#edf7f9] dark:bg-[#071120] border-b border-teal-100/60 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Image Column */}
            <div className="lg:col-span-5 reveal-scroll-left flex justify-center">
              <img
                src="/images/how_it_works_user.png"
                alt={isAr ? 'كيف يعمل Maw2idi' : 'Comment fonctionne Maw2idi'}
                loading="lazy"
                decoding="async"
                className="w-full max-w-[460px] h-auto object-cover rounded-[32px] shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
              />
            </div>

            {/* Steps Column */}
            <div className="lg:col-span-7 space-y-8 reveal-scroll-right text-start">
              <div>
                <h2
                  id="landing-how-title"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#00b4b6] leading-tight"
                >
                  {isAr ? (
                    <div dir="rtl">
                      <span>كيف يعمل</span> <br />
                      <span className="text-[#483d73] dark:text-white font-extrabold">
                        موعدي (Maw2idi) ؟
                      </span>
                    </div>
                  ) : (
                    <>
                      Comment fonctionne <br />
                      <span className="text-[#483d73] dark:text-white font-extrabold">Maw2idi ?</span>
                    </>
                  )}
                </h2>
              </div>

              <div className="space-y-6 pt-2">
                {/* Step 1 */}
                <div className="flex items-start gap-5 group/step hover:-translate-y-1 transition-all duration-300 p-3 rounded-2xl hover:bg-white/70 dark:hover:bg-[#0c1a2e]/80 shadow-none hover:shadow-md">
                  <div className="w-12 h-12 rounded-full bg-[#dcf4f5] dark:bg-teal-950/80 text-[#00b4b6] dark:text-teal-300 font-black text-xl flex items-center justify-center shrink-0 shadow-sm border border-teal-200/70 dark:border-teal-800 group-hover/step:bg-[#00b4b6] group-hover/step:text-white group-hover/step:scale-110 transition-all duration-300">
                    1
                  </div>
                  <div className="pt-1">
                    <h3
                      id="landing-step1-title"
                      className="text-lg sm:text-xl font-bold text-[#483d73] dark:text-white group-hover/step:text-[#00b4b6] transition-colors"
                    >
                      {isAr ? 'ابحث عن طبيبك أو الأخصائي' : 'Trouvez votre professionnel de santé'}
                    </h3>
                    <p id="landing-step1-desc" className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                      {isAr
                        ? 'اختر التخصص والمنطقة المناسبة حسب احتياجاتك.'
                        : 'Recherchez un médecin ou un spécialiste selon vos besoins.'}
                    </p>
                  </div>
                </div>

                <div className="w-0.5 h-8 border-l-2 border-dashed border-[#86d9dc] ml-7 -my-3 rtl:mr-7 rtl:ml-0"></div>

                {/* Step 2 */}
                <div className="flex items-start gap-5 group/step hover:-translate-y-1 transition-all duration-300 p-3 rounded-2xl hover:bg-white/70 dark:hover:bg-[#0c1a2e]/80 shadow-none hover:shadow-md">
                  <div className="w-12 h-12 rounded-full bg-[#dcf4f5] dark:bg-teal-950/80 text-[#00b4b6] dark:text-teal-300 font-black text-xl flex items-center justify-center shrink-0 shadow-sm border border-teal-200/70 dark:border-teal-800 group-hover/step:bg-[#00b4b6] group-hover/step:text-white group-hover/step:scale-110 transition-all duration-300">
                    2
                  </div>
                  <div className="pt-1">
                    <h3
                      id="landing-step2-title"
                      className="text-lg sm:text-xl font-bold text-[#483d73] dark:text-white group-hover/step:text-[#00b4b6] transition-colors"
                    >
                      {isAr ? 'اختر الموعد والتوقيت' : 'Choisissez un créneau horaire'}
                    </h3>
                    <p id="landing-step2-desc" className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                      {isAr
                        ? 'حدد اليوم والساعة التي تناسب جدول مواعيدك.'
                        : 'Sélectionnez le jour et l\'heure qui vous conviennent.'}
                    </p>
                  </div>
                </div>

                <div className="w-0.5 h-8 border-l-2 border-dashed border-[#86d9dc] ml-7 -my-3 rtl:mr-7 rtl:ml-0"></div>

                {/* Step 3 */}
                <div className="flex items-start gap-5 group/step hover:-translate-y-1 transition-all duration-300 p-3 rounded-2xl hover:bg-white/70 dark:hover:bg-[#0c1a2e]/80 shadow-none hover:shadow-md">
                  <div className="w-12 h-12 rounded-full bg-[#dcf4f5] dark:bg-teal-950/80 text-[#00b4b6] dark:text-teal-300 font-black text-xl flex items-center justify-center shrink-0 shadow-sm border border-teal-200/70 dark:border-teal-800 group-hover/step:bg-[#00b4b6] group-hover/step:text-white group-hover/step:scale-110 transition-all duration-300">
                    3
                  </div>
                  <div className="pt-1">
                    <h3
                      id="landing-step3-title"
                      className="text-lg sm:text-xl font-bold text-[#483d73] dark:text-white group-hover/step:text-[#00b4b6] transition-colors"
                    >
                      {isAr ? 'أكد حجز موعدك فوراً' : 'Confirmez votre rendez-vous'}
                    </h3>
                    <p id="landing-step3-desc" className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                      {isAr
                        ? 'احصل على تأكيد فوري وتذكير تلقائي عبر الرسائل القصيرة.'
                        : 'Recevez votre confirmation immédiate et un rappel automatique.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. STATS SECTION (Animated Counters)                     */}
      {/* ======================================================== */}
      <section className="py-6 bg-[#edf7f9]/80 dark:bg-[#071120] border-y border-teal-100/50 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            ref={statsRef}
            id="stats-container"
            className="bg-white dark:bg-[#0c1a2e] rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-100/70 dark:border-slate-800 reveal-scroll transition-colors"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-slate-100 dark:divide-slate-800">
              {/* Stat 1 */}
              <div className="p-2 sm:p-3 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-transform">
                <img
                  src="/images/medical-team.png"
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                  alt={isAr ? 'أطباء معتمدون' : 'Médecins Agréés'}
                />
                <div className="text-start">
                  <span dir="ltr" className="stat-counter inline-block text-xl sm:text-2xl font-extrabold text-[#00b4b6] leading-none">+{formatNumber(counts.docs)}</span>
                  <span
                    id="landing-stat-docs-label"
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-1"
                  >
                    {isAr ? 'أطباء معتمدون' : 'Médecins Agréés'}
                  </span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="p-2 sm:p-3 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-transform pt-4 md:pt-2">
                <img
                  src="/images/rdv.png"
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                  alt={isAr ? 'مواعيد مؤكدة' : 'RDV Confirmés'}
                />
                <div className="text-start">
                  <span dir="ltr" className="stat-counter inline-block text-xl sm:text-2xl font-extrabold text-[#00b4b6] leading-none">+{formatNumber(counts.rdv)}</span>
                  <span
                    id="landing-stat-rdv-label"
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-1"
                  >
                    {isAr ? 'مواعيد مؤكدة' : 'RDV Confirmés'}
                  </span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="p-2 sm:p-3 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-transform">
                <img
                  src="/images/clock.png"
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                  alt={isAr ? 'حجز مواعيد 24س/7أ' : 'Prise de RDV 24h/7j'}
                />
                <div className="text-start">
                  <span className="stat-counter block text-xl sm:text-2xl font-extrabold text-[#00b4b6] leading-none">{isAr ? `${counts.time}س / 7أ` : `${counts.time}h / 7j`}</span>
                  <span
                    id="landing-stat-247-label"
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-1"
                  >
                    {isAr ? 'حجز مواعيد 24س/7أ' : 'Prise de RDV 24h/7j'}
                  </span>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="p-2 sm:p-3 flex items-center justify-center gap-3 group hover:scale-[1.02] transition-transform pt-4 md:pt-2">
                <img
                  src="/images/rating.png"
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                  alt={isAr ? 'نسبة رضا المرضى' : 'Satisfaction Patients'}
                />
                <div className="text-start">
                  <span dir="ltr" className="stat-counter inline-block text-xl sm:text-2xl font-extrabold text-[#00b4b6] leading-none">{counts.satisfaction}%</span>
                  <span
                    id="landing-stat-satisfaction-label"
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-1"
                  >
                    {isAr ? 'نسبة رضا المرضى' : 'Satisfaction Patients'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. BANNER SECTION SOIGNANT                                */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-20 bg-[#edf7f9] dark:bg-[#071120] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-[#0c1a2e] rounded-[36px] p-8 sm:p-12 lg:p-14 border border-teal-100 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 transition-colors">
            <div className="space-y-6 max-w-2xl relative z-10 text-start">
              <h2
                id="landing-banner-doc-title"
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#002b49] dark:text-white leading-tight tracking-tight"
              >
                {isAr ? (
                  <>
                    أنت ممارس صحي؟ <br />
                    <span className="text-[#0086cd]">انضم إلى الثورة الطبية في تونس</span>
                  </>
                ) : (
                  <>
                    Vous êtes soignant ? <br />
                    <span className="text-[#0086cd]">Rejoignez la révolution médicale</span>
                  </>
                )}
              </h2>
              <p
                id="landing-banner-doc-desc"
                className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed font-normal"
              >
                {isAr
                  ? 'اربح وقتاً ثميناً في عيادتك، وقلص نسبة الغيابات، وقدم تجربة رقمية عصرية ومرنة لمرضاك في تونس.'
                  : 'Gagnez du temps de consultation, réduisez le taux de rendez-vous non honorés et offrez une expérience moderne et fluide à vos patients en Tunisie.'}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/doctor/auth')}
                  id="landing-banner-doc-btn"
                  className="bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold text-sm sm:text-base px-8 py-4 rounded-full shadow-lg shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAr ? 'إنشاء حساب عيادتي الطبية' : 'Créer mon espace cabinet'}
                </button>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    id="landing-banner-login-btn"
                    className="bg-white/90 dark:bg-[#071322] hover:bg-white dark:hover:bg-[#0c1f38] text-[#032b43] dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-sm sm:text-base px-7 py-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                  >
                    <span>🔑</span>
                    <span>{isAr ? 'تسجيل الدخول' : 'Déjà inscrit ? Se connecter'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative w-72 h-72 sm:w-80 sm:h-80 shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#00b4b6]/10 blur-2xl"></div>
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-[40px] bg-[#00b4b6] p-2 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden">
                <img
                  src="/images/doctor_selim.jpg"
                  alt={isAr ? 'فضاء الممارس Maw2idi' : 'Espace Soignant Maw2idi'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover rounded-[32px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
