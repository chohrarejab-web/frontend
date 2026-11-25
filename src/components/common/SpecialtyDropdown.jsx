import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, Stethoscope } from 'lucide-react';
import { SPECIALTIES } from '../../data/tunisiaData';
import { matchSpecialty } from '../../utils/fuzzySearch';

export default function SpecialtyDropdown({
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  className = '',
  isAr = false,
  allowAll = false,
  allLabel,
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize current selected specialty object from value
  const selectedSpecialty = useMemo(() => {
    if (!value) return null;
    const valLower = String(value).trim().toLowerCase();
    return (
      SPECIALTIES.find(
        (s) =>
          (s.id && s.id.toLowerCase() === valLower) ||
          (s.fr && s.fr.toLowerCase() === valLower) ||
          (s.ar && s.ar.toLowerCase() === valLower)
      ) || null
    );
  }, [value]);

  // Filtered list of specialties based on user's query (with typo & accent tolerance)
  const filteredSpecialties = useMemo(() => {
    if (!searchQuery.trim()) return SPECIALTIES;
    return SPECIALTIES.filter((s) => matchSpecialty(s, searchQuery));
  }, [searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (spec) => {
    if (!spec) {
      if (onChange) onChange('', null);
    } else {
      if (onChange) onChange(spec.fr, spec);
    }
    setIsOpen(false);
  };

  const defaultPlaceholder = isAr ? 'اختر الاختصاص الطبي...' : 'Choisir une spécialité...';
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const defaultAllLabel = isAr ? 'جميع الاختصاصات...' : 'Toutes les spécialités...';
  const displayAllLabel = allLabel || defaultAllLabel;

  const currentDisplayFr = selectedSpecialty ? selectedSpecialty.fr : (value || '');
  const currentDisplayAr = selectedSpecialty?.ar || '';

  return (
    <div className={`relative ${className}`} ref={containerRef} dir={isAr ? 'rtl' : 'ltr'}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all text-left rtl:text-right cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            : isOpen
            ? 'bg-white dark:bg-[#0c1a2e] border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
            : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="min-w-0 flex-1">
          {currentDisplayFr ? (
            <>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {isAr && currentDisplayAr ? currentDisplayAr : currentDisplayFr}
              </div>
              {currentDisplayAr && (
                <div
                  className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate"
                  dir={isAr ? 'ltr' : 'rtl'}
                >
                  {isAr ? currentDisplayFr : currentDisplayAr}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 truncate">
              {displayPlaceholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-teal-600' : ''
          }`}
        />
      </button>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0c1a2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-72 flex flex-col overflow-hidden animate-fadeIn"
          style={{ minWidth: '280px' }}
        >
          {/* Search Header Input */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث عن اختصاص طبي...' : 'Rechercher une spécialité...'}
                className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071322] text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                autoComplete="off"
              />
            </div>
          </div>

          {/* List items */}
          <div className="p-1.5 overflow-y-auto max-h-60 space-y-0.5 custom-scrollbar">
            {allowAll && (
              <div
                onClick={() => handleSelect(null)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors text-xs font-bold border-b border-slate-100 dark:border-slate-800 mb-1 ${
                  !value
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-[#00A896] dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-teal-50/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{displayAllLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-teal-600" />}
              </div>
            )}

            {filteredSpecialties.length === 0 ? (
              <div className="p-4 text-center text-xs font-medium text-slate-400">
                {isAr ? 'لم يتم العثور على أي اختصاص مطابق' : 'Aucune spécialité trouvée'}
              </div>
            ) : (
              filteredSpecialties.map((s) => {
                const isSelected =
                  (selectedSpecialty && selectedSpecialty.id === s.id) ||
                  (value &&
                    (String(value).trim().toLowerCase() === s.fr.toLowerCase() ||
                      String(value).trim().toLowerCase() === (s.ar || '').toLowerCase()));

                const title = isAr && s.ar ? s.ar : s.fr;
                const subtitle = isAr && s.ar ? s.fr : s.ar || '';

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`flex items-center justify-between gap-2.5 p-2 rounded-xl cursor-pointer transition-all text-left rtl:text-right ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-[#00A896] dark:text-teal-300 font-black'
                        : 'hover:bg-teal-50/70 dark:hover:bg-teal-950/30 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {title}
                      </div>
                      {subtitle && (
                        <div
                          className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate"
                          dir={isAr ? 'ltr' : 'rtl'}
                        >
                          {subtitle}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <span className="text-xs text-[#00A896] font-black shrink-0">✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

