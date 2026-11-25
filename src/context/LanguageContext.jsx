import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../locales/translations';
import { translateText, isArabicText, resolveMedicalSpecialty } from '../services/translator';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('sahatn_lang') || 'fr';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem('sahatn_lang', lang);
    document.documentElement.lang = lang;
    const isArabic = lang === 'ar';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';

    if (isArabic) {
      document.body.classList.add('lang-ar');
      document.body.setAttribute('dir', 'rtl');
    } else {
      document.body.classList.remove('lang-ar');
      document.body.setAttribute('dir', 'ltr');
    }

    // Dispatch global event for backward compatibility
    window.dispatchEvent(
      new CustomEvent('sahatn:langchange', { detail: { lang } })
    );
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  }, []);

  /**
   * Smart Universal Translation Engine:
   * 1. Dual Object: t({ fr: 'Exemple', ar: 'مثال' }) -> Instant selection
   * 2. Dual Args: t('Texte en Français', 'النص بالعربية') -> Instant selection
   * 3. Dictionary Key: t('admin_analytics_title', 'Fallback') -> translations.js
   * 4. Auto-specialty: t.specialty(spec) -> Bi-directional medical discipline translation
   */
  const t = useCallback((keyOrOptions, fallbackOrArabic = '') => {
    // 1. Dual Object: { fr: '...', ar: '...' }
    if (keyOrOptions && typeof keyOrOptions === 'object' && !Array.isArray(keyOrOptions)) {
      if (lang === 'ar' && keyOrOptions.ar) return keyOrOptions.ar;
      if (keyOrOptions.fr) return keyOrOptions.fr;
      return keyOrOptions[lang] || keyOrOptions.en || '';
    }

    const key = typeof keyOrOptions === 'string' ? keyOrOptions : String(keyOrOptions || '');

    // 2. Dictionary key lookup in translations.js
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    if (translations['ar'] && lang === 'ar' && translations['ar'][key]) {
      return translations['ar'][key];
    }
    if (translations['fr'] && translations['fr'][key]) {
      if (lang === 'fr') return translations['fr'][key];
    }

    // 3. Dual Args: t(frenchText, arabicText) OR t(key, frenchFallback)
    if (fallbackOrArabic && typeof fallbackOrArabic === 'string') {
      const isFallbackArabic = /[\u0600-\u06FF]/.test(fallbackOrArabic);
      if (isFallbackArabic) {
        // Dual Args pattern: t('Texte en Français', 'النص بالعربية')
        return lang === 'ar' ? fallbackOrArabic : key;
      }
      // Pattern: t('translation_key', 'Fallback en français')
      if (lang === 'ar') {
        return (translations['ar'] && translations['ar'][key]) || fallbackOrArabic || key;
      }
      return fallbackOrArabic;
    }

    return fallbackOrArabic || key;
  }, [lang]);

  // Convenient helper attached to t for medical specialties
  t.specialty = useCallback((spec, specId) => {
    return resolveMedicalSpecialty(spec, lang, specId);
  }, [lang]);

  /**
   * Real-time translation method for dynamic content (e.g. Doctor Presentation/Bio, custom reviews)
   */
  const translateRealtime = useCallback(async (text, targetLang = null, sourceLang = 'auto') => {
    const target = targetLang || lang;
    setIsTranslating(true);
    try {
      const res = await translateText(text, target, sourceLang);
      return res;
    } finally {
      setIsTranslating(false);
    }
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLanguage: setLang,
        toggleLanguage,
        t,
        translateRealtime,
        resolveMedicalSpecialty: (spec, specId) => resolveMedicalSpecialty(spec, lang, specId),
        isTranslating,
        isArabicText,
        isAr: lang === 'ar',
        isRtl: lang === 'ar'
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
