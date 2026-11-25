import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SPECIALTIES, INITIAL_DOCTORS } from '../../data/tunisiaData';
import { fuzzyMatch, matchDoctor, matchSpecialty, matchLocation, normalizeText } from '../../utils/fuzzySearch';
import { resolveDoctorCity, resolveDoctorName, resolveDoctorSpecialty } from '../../utils/i18nHelper';

export const POPULAR_LOCALITIES = [
  { del: 'Ennasr 2', city: 'Tunis', delAr: 'النصر 2', cityAr: 'تونس' },
  { del: 'Les Berges du Lac 2', city: 'Tunis', delAr: 'ضفاف البحيرة 2', cityAr: 'تونس' },
  { del: 'Riadh El Andalous', city: 'Ariana', delAr: 'رياض الأندلس', cityAr: 'أريانة' },
  { del: 'El Menzah 9', city: 'Tunis', delAr: 'المنزه 9', cityAr: 'تونس' },
  { del: 'Sousse Médina', city: 'Sousse', delAr: 'سوسة المدينة', cityAr: 'سوسة' },
  { del: 'Sfax Centre', city: 'Sfax', delAr: 'صفاقس المركز', cityAr: 'صفاقس' },
  { del: 'Kébili Centre', city: 'Kébili', delAr: 'قبلي المركز', cityAr: 'قبلي' },
  { del: 'Douz Centre', city: 'Kébili', delAr: 'دوز المركز', cityAr: 'قبلي' }
];

export const QUICK_CITIES = ['Tunis', 'Ariana', 'Ben Arous', 'Bizerte', 'Nabeul', 'Sousse', 'Monastir', 'Sfax', 'Kébili', 'Tataouine', ''];

function defaultResolveAvatar(avatar) {
  if (!avatar) return '/images/3ila_doctor.jpeg';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  const cleaned = avatar.replace(/^(\.\.\/)+/, '').replace(/^\/?images\//, '');
  return `/images/${cleaned}`;
}

/**
 * Doctolib Style Search Header Bar (Teal Gradient #00b4b6)
 * Features:
 * - Search query applies first inside dropdown suggestions (not on every keyup/keydown on main list)
 * - Suggestions filter dynamically according to what is typed
 * - Symptom section removed completely
 * - Instant Geolocation trigger with Map opening
 */
export default function SearchHeaderBar({
  keyword = '',
  setKeyword,
  locationInput = '',
  setLocationInput,
  showKeywordSuggestions = false,
  setShowKeywordSuggestions,
  showLocationSuggestions = false,
  setShowLocationSuggestions,
  handleRequestGeolocation,
  gpsLoading = false,
  activeChips = new Set(),
  toggleChip,
  sosMode = false,
  setSosMode,
  activeCityPill = '',
  setActiveCityPill,
  handleCityPillClick,
  onSearch,
  isAr: isArProp,
  resolveAvatar = defaultResolveAvatar,
  doctorsList = INITIAL_DOCTORS,
  specialtiesList = SPECIALTIES,
  popularLocalities = POPULAR_LOCALITIES,
  quickCities = QUICK_CITIES,
}) {
  const { lang, t } = useLanguage();
  const isAr = isArProp !== undefined ? isArProp : lang === 'ar';

  // Local input state: typing changes local state, NOT main page results immediately
  const [localKeyword, setLocalKeyword] = useState(keyword || '');
  const [localLocation, setLocalLocation] = useState(locationInput || '');

  const keywordContainerRef = useRef(null);
  const locationContainerRef = useRef(null);

  // Sync with prop changes (e.g. city pill or reset filters)
  useEffect(() => {
    setLocalKeyword(keyword || '');
  }, [keyword]);

  useEffect(() => {
    setLocalLocation(locationInput || '');
  }, [locationInput]);

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (keywordContainerRef.current && !keywordContainerRef.current.contains(event.target)) {
        if (setShowKeywordSuggestions) setShowKeywordSuggestions(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(event.target)) {
        if (setShowLocationSuggestions) setShowLocationSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [setShowKeywordSuggestions, setShowLocationSuggestions]);

  // Filter active and finalized doctors for suggestions dropdown
  const activeDoctorsList = useMemo(() => {
    return (doctorsList || []).filter(d => d.accountFinalized !== false && d.active !== false);
  }, [doctorsList]);

  // Dynamic filter for suggestions dropdown based on what the user types
  const filteredSuggestions = useMemo(() => {
    const query = normalizeText(localKeyword);

    // If query is empty: show top recommended doctors and popular specialties
    if (!query) {
      return {
        doctors: activeDoctorsList.slice(0, 3),
        specialties: (specialtiesList || []).slice(0, 6),
        isFiltered: false
      };
    }

    // When query is typed: filter doctors with typo & accent tolerance
    const matchedDocs = activeDoctorsList.filter(doc => matchDoctor(doc, localKeyword)).slice(0, 5);

    // Filter specialties with typo & accent tolerance (e.g. "maldi" -> "Cardiologie & Maladies Vasculaires")
    const matchedSpecs = (specialtiesList || []).filter(spec => matchSpecialty(spec, localKeyword)).slice(0, 6);

    return {
      doctors: matchedDocs,
      specialties: matchedSpecs,
      isFiltered: true
    };
  }, [localKeyword, activeDoctorsList, specialtiesList]);

  // Dynamic filter for localities dropdown with typo & accent tolerance
  const filteredLocalities = useMemo(() => {
    if (!localLocation || !localLocation.trim()) return popularLocalities;
    return popularLocalities.filter(loc => matchLocation(loc, localLocation));
  }, [localLocation, popularLocalities]);

  // Apply search commit (to main page)
  const commitSearch = (newKw = localKeyword, newLoc = localLocation) => {
    if (setShowKeywordSuggestions) setShowKeywordSuggestions(false);
    if (setShowLocationSuggestions) setShowLocationSuggestions(false);
    if (setKeyword) setKeyword(newKw);
    if (setLocationInput) setLocationInput(newLoc);
    if (onSearch) onSearch({ keyword: newKw, location: newLoc });
  };

  const handleSelectDoctor = (doc) => {
    setLocalKeyword(doc.name);
    commitSearch(doc.name, localLocation);
  };

  const handleSelectSpecialty = (sp) => {
    const specName = isAr && sp.ar ? sp.ar : (sp.fr || sp.nameFr || sp.name || '');
    setLocalKeyword(specName);
    commitSearch(specName, localLocation);
  };

  const handleSelectLocality = (loc) => {
    setLocalLocation(loc.del);
    if (setActiveCityPill) setActiveCityPill(loc.city);
    commitSearch(localKeyword, loc.del);
  };

  const handleCityClick = (city) => {
    setLocalLocation(city);
    if (handleCityPillClick) {
      handleCityPillClick(city);
    } else {
      if (setActiveCityPill) setActiveCityPill(city);
      if (setLocationInput) setLocationInput(city);
    }
  };

  return (
    <section className="relative z-30 bg-[#00b4b6] dark:bg-[#0a1e34] pb-6 sm:pb-8 pt-3 sm:pt-4 px-3 sm:px-4 border-b border-blue-600/30 dark:border-slate-800/80 transition-colors duration-300 w-full max-w-full overflow-visible">
      <div className="w-full max-w-5xl mx-auto">

        {/* Integrated Search Pill Container */}
        <div className="relative z-40 bg-white dark:bg-[#0c1a2e] rounded-2xl md:rounded-full p-2 shadow-xl shadow-blue-950/20 dark:shadow-slate-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 border border-slate-100 dark:border-slate-800 transition-colors duration-300 w-full max-w-full">

          {/* Field 1: Doctor Name / Specialty */}
          <div
            ref={keywordContainerRef}
            className="flex items-center gap-3 px-3 sm:px-4 py-1.5 flex-1 w-full border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/80 relative"
          >
            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="w-full relative flex items-center">
              <input
                type="text"
                value={localKeyword}
                onChange={(e) => {
                  setLocalKeyword(e.target.value);
                  if (setShowKeywordSuggestions) setShowKeywordSuggestions(true);
                }}
                onFocus={() => setShowKeywordSuggestions && setShowKeywordSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSearch();
                  }
                }}
                placeholder={t('Nom du médecin, spécialité...', 'اسم الطبيب، الاختصاص...')}
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoComplete="off"
              />
              {localKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalKeyword('');
                    commitSearch('', localLocation);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
                  title={t('Effacer', 'مسح')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Suggestions Dropdown (Filtered primarily by query) */}
              {showKeywordSuggestions && (
                <div
                  dir={isAr ? 'rtl' : 'ltr'}
                  className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-[460px] overflow-y-auto p-2 text-start custom-scrollbar min-w-[320px] md:min-w-[420px]"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {/* 1. Matching Specialties First */}
                  {filteredSuggestions.specialties.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase text-teal-700 dark:text-teal-400 tracking-wider flex items-center justify-between">
                        <span>
                          {filteredSuggestions.isFiltered
                            ? (isAr ? '🩺 الاختصاصات المطابقة' : '🩺 Spécialités Correspondantes')
                            : (isAr ? '🩺 اختصاصات شائعة' : '🩺 Spécialités Populaires')}
                        </span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold lowercase">
                          ({filteredSuggestions.specialties.length})
                        </span>
                      </div>
                      {filteredSuggestions.specialties.map(sp => {
                        const specTitle = isAr && sp.ar ? sp.ar : (sp.fr || sp.nameFr || sp.name || '');
                        const specSubtitle = isAr ? (sp.fr || sp.nameFr || '') : (sp.ar || sp.nameAr || '');
                        return (
                          <div
                            key={sp.id || specTitle}
                            onClick={() => handleSelectSpecialty(sp)}
                            className="px-3 py-2 hover:bg-cyan-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-all group"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors truncate block">
                                {specTitle}
                              </span>
                              {specSubtitle && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                                  {specSubtitle}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold shrink-0 ml-2">
                              {isAr ? 'اختصاص' : 'Spécialité'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Matching Doctors */}
                  {filteredSuggestions.doctors.length > 0 && (
                    <>
                      <div className={`px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider ${filteredSuggestions.specialties.length > 0 ? 'border-t border-slate-100 dark:border-slate-800 pt-2' : ''}`}>
                        {filteredSuggestions.isFiltered
                          ? (isAr ? '👨‍⚕️ الأطباء المطابقون' : '👨‍⚕️ Médecins Correspondants')
                          : (isAr ? '⭐ أطباء مقترحون' : '⭐ Médecins Recommandés')}
                      </div>
                      {filteredSuggestions.doctors.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => handleSelectDoctor(doc)}
                          className="px-3 py-2 hover:bg-cyan-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center justify-between transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={resolveAvatar(doc.avatar)}
                              onError={(e) => { e.currentTarget.src = '/images/3ila_doctor.jpeg'; }}
                              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-700"
                              alt=""
                            />
                            <div>
                              <div className="text-xs font-black text-slate-800 dark:text-white group-hover:text-[#0086cd] dark:group-hover:text-cyan-400 transition-colors">
                                {resolveDoctorName(doc, isAr ? 'ar' : 'fr')}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                {resolveDoctorSpecialty(doc, isAr ? 'ar' : 'fr')} • {resolveDoctorCity(doc.city, isAr ? 'ar' : 'fr')}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-[#0086cd] dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                            {isAr ? 'اختيار ›' : 'Choisir ›'}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* No Match Result */}
                  {filteredSuggestions.doctors.length === 0 && filteredSuggestions.specialties.length === 0 && (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <span className="text-xl block mb-1">🔍</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isAr ? `لا توجد نتائج مباشرة لـ "${localKeyword}"` : `Aucun praticien ou spécialité trouvé pour "${localKeyword}"`}
                      </p>
                      <button
                        type="button"
                        onClick={() => commitSearch()}
                        className="mt-2 text-xs font-black text-[#0086cd] dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        {isAr ? 'البحث في القائمة العامة ›' : 'Lancer la recherche globale ›'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Field 2: Location / Governorate */}
          <div
            ref={locationContainerRef}
            className="flex items-center gap-3 px-4 py-1.5 flex-1 w-full relative"
          >
            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="w-full relative flex items-center">
              <input
                type="text"
                value={localLocation}
                onChange={(e) => {
                  setLocalLocation(e.target.value);
                  if (setShowLocationSuggestions) setShowLocationSuggestions(true);
                }}
                onFocus={() => setShowLocationSuggestions && setShowLocationSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSearch();
                  }
                }}
                placeholder={t('Gouvernorat, localité, ville...', 'الولاية، المعتمدية، المدينة...')}
                className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-pointer"
                autoComplete="off"
              />
              {localLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalLocation('');
                    if (setActiveCityPill) setActiveCityPill('');
                    commitSearch(localKeyword, '');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
                  title={t('Effacer', 'مسح')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showLocationSuggestions && (
              <div
                dir={isAr ? 'rtl' : 'ltr'}
                className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] max-h-80 overflow-y-auto p-2 text-start min-w-[280px] md:min-w-[360px] custom-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-[#0086cd] dark:text-cyan-400 tracking-wider">
                  {isAr ? '📍 مناطق ومحليات شائعة' : '📍 Localités Fréquentes'}
                </div>
                {filteredLocalities.map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectLocality(loc)}
                    className="px-3 py-2 hover:bg-cyan-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                  >
                    <span>📍 {isAr ? (loc.delAr || loc.del) : loc.del}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{isAr ? (loc.cityAr || loc.city) : loc.city}</span>
                  </div>
                ))}
              </div>
            )}

            {/* GPS Geolocation Button */}
            <button
              type="button"
              onClick={handleRequestGeolocation}
              disabled={gpsLoading}
              title={isAr ? 'تحديد موقعي وعرض الأقرب على الخريطة' : 'Trouver les médecins autour de moi (GPS) et ouvrir la carte'}
              className="text-slate-500 dark:text-slate-400 hover:text-[#0086cd] dark:hover:text-cyan-300 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700 p-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {gpsLoading ? (
                <span className="w-4 h-4 border-2 border-[#0086cd] border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg className="w-4 h-4 text-[#0086cd] dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span className="text-[11px] font-extrabold text-[#0086cd] dark:text-cyan-400 hidden sm:inline">
                {isAr ? 'حولي (GPS)' : 'Autour de moi'}
              </span>
            </button>
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => commitSearch(localKeyword, localLocation)}
            className="w-full md:w-auto bg-[#032b43] hover:bg-[#002b49] dark:bg-[#0086cd] dark:hover:bg-[#0074b3] text-white font-extrabold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider shadow-md transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>{isAr ? 'بحث' : 'Rechercher'}</span>
            <span>›</span>
          </button>

        </div>

        {/* INSTANT LIVE FILTER CHIPS & SOS MODE */}
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="flex-1 w-full max-w-full min-w-0 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 sm:gap-2 py-1 touch-pan-x">
            <span className="text-[11px] sm:text-xs font-black text-white/90 uppercase tracking-wider shrink-0 mr-1">
              {isAr ? 'فلاتر سريعة :' : 'Filtres rapides :'}
            </span>

            <button
              type="button"
              onClick={() => toggleChip && toggleChip('today')}
              className={`text-[11px] sm:text-xs font-extrabold px-3 sm:px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeChips.has('today')
                  ? 'bg-[#032b43] dark:bg-teal-600 text-white border-2 border-[#032b43] dark:border-teal-400 shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-[#032b43] dark:text-slate-100 shadow-xs border border-white/60 dark:border-slate-700'
              }`}
            >
              <span>⚡</span> {isAr ? 'متاح اليوم' : "Dispo Aujourd'hui"}
            </button>

            <button
              type="button"
              onClick={() => toggleChip && toggleChip('cnam')}
              className={`text-[11px] sm:text-xs font-extrabold px-3 sm:px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeChips.has('cnam')
                  ? 'bg-[#032b43] dark:bg-teal-600 text-white border-2 border-[#032b43] dark:border-teal-400 shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-[#032b43] dark:text-slate-100 shadow-xs border border-white/60 dark:border-slate-700'
              }`}
            >
              <span>🏛️</span> {isAr ? 'متعاقد مع الكنام' : 'Conventionné CNAM'}
            </button>

            <button
              type="button"
              onClick={() => toggleChip && toggleChip('telehealth')}
              className={`text-[11px] sm:text-xs font-extrabold px-3 sm:px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeChips.has('telehealth')
                  ? 'bg-[#032b43] dark:bg-teal-600 text-white border-2 border-[#032b43] dark:border-teal-400 shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-[#032b43] dark:text-slate-100 shadow-xs border border-white/60 dark:border-slate-700'
              }`}
            >
              <span>📹</span> {isAr ? 'استشارة عن بعد' : 'Téléconsultation'}
            </button>

            <button
              type="button"
              onClick={() => toggleChip && toggleChip('top_rated')}
              className={`text-[11px] sm:text-xs font-extrabold px-3 sm:px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeChips.has('top_rated')
                  ? 'bg-[#032b43] dark:bg-teal-600 text-white border-2 border-[#032b43] dark:border-teal-400 shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-[#032b43] dark:text-slate-100 shadow-xs border border-white/60 dark:border-slate-700'
              }`}
            >
              <span>⭐</span> {isAr ? 'تقييم 4.8+' : 'Noté 4.8+'}
            </button>

            <button
              type="button"
              onClick={() => toggleChip && toggleChip('affordable')}
              className={`text-[11px] sm:text-xs font-extrabold px-3 sm:px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeChips.has('affordable')
                  ? 'bg-[#032b43] dark:bg-teal-600 text-white border-2 border-[#032b43] dark:border-teal-400 shadow-md'
                  : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-[#032b43] dark:text-slate-100 shadow-xs border border-white/60 dark:border-slate-700'
              }`}
            >
              <span>💵</span> {isAr ? 'تعريفة ≤ 60 د.ت' : 'Tarif ≤ 60 TND'}
            </button>
          </div>
        </div>

        {/* POPULAR PLACES PILLS ROW */}
        <div className="mt-2 w-full max-w-full min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 text-xs text-white/90 touch-pan-x scroll-smooth">
          <span className="font-extrabold shrink-0 text-white/80">{isAr ? '📍 المدن :' : '📍 Villes :'}</span>
          {quickCities.map((c, i) => {
            const label = c ? (isAr ? resolveDoctorCity(c, 'ar') : c) : (isAr ? 'كامل تراب تونس' : 'Toute la Tunisie');
            const isActive = activeCityPill === c;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleCityClick(c)}
                className={`font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-teal-500 text-[#032b43] dark:text-white font-black shadow-md'
                    : 'bg-white/20 hover:bg-white text-white hover:text-[#032b43] dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
