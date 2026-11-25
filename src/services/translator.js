/**
 * SahaTN / Maw2idi — Real-Time Translation Engine (FR <-> AR)
 * Translates dynamic content (e.g. Doctor Presentation, Bio, Titles, Reviews)
 * in real-time when the user switches languages, without relying only on static dictionaries.
 *
 * Features:
 * - Direct Client-side & Server fallback translation (MyMemory API with public CORS)
 * - Persistent LocalStorage & in-memory caching to minimize latency and requests
 * - Smart language detection (Arabic Unicode range detection)
 * - Intelligent paragraph and sentence chunking for long descriptions
 * - React hook `useRealtimeTranslation` for seamless UI integration
 */

import { useState, useEffect, useRef } from 'react';
import { SPECIALTIES } from '../data/tunisiaData.js';
import { SPECIALTY_SUGGESTIONS, UNIVERSAL_DIPLOMAS, UNIVERSAL_EQUIPMENT } from '../data/medicalSuggestions.js';
import { fetchWithFallback } from './api.js';

// In-memory cache for fast instant lookups during user session
const memoryCache = new Map();

// LocalStorage cache key
const CACHE_STORAGE_KEY = 'sahatn_translation_cache_v1';
const MAX_CACHE_ENTRIES = 500;

/**
 * Load persisted translation cache from localStorage
 */
function loadStorageCache() {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
}

/**
 * Save entry to persistent cache
 */
function saveStorageCache(key, value) {
  try {
    const cache = loadStorageCache();
    cache[key] = value;
    // Evict old entries if too large
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      delete cache[keys[0]];
    }
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Check if a text is primarily Arabic
 */
export function isArabicText(text) {
  if (!text || typeof text !== 'string') return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
}

/**
 * Decode HTML entities returned by translation engines
 */
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Split long text into manageable chunks respecting sentence and newline boundaries
 */
function chunkText(text, maxLen = 420) {
  if (!text || text.length <= maxLen) return [text];
  
  const paragraphs = text.split('\n');
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + (current ? '\n' : '') + para).length <= maxLen) {
      current = current ? current + '\n' + para : para;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }
      if (para.length <= maxLen) {
        current = para;
      } else {
        // Break paragraph by sentence
        const sentences = para.split(/([.?!؛]+[\s]+)/);
        for (let i = 0; i < sentences.length; i += 2) {
          const sent = sentences[i] + (sentences[i + 1] || '');
          if ((current + (current ? ' ' : '') + sent).length <= maxLen) {
            current = current ? current + ' ' + sent : sent;
          } else {
            if (current) chunks.push(current);
            current = sent;
          }
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(c => c && c.trim().length > 0);
}

/**
 * Single chunk translation with Tier 1 (Backend API) and Tier 2 (Direct MyMemory API)
 */
async function translateChunk(chunk, pair) {
  const targetLang = pair.endsWith('ar') ? 'ar' : 'fr';
  const sourceLang = pair.startsWith('ar') ? 'ar' : 'fr';

  // Tier 1: Try local backend proxy (/api/ai/translate)
  try {
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 3000);
    const backendRes = await fetchWithFallback('/api/ai/translate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk, targetLang, sourceLang }),
      signal: controller1.signal
    });
    clearTimeout(timeout1);

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && data.success && data.translatedText && data.translatedText !== chunk) {
        return decodeEntities(data.translatedText);
      }
    }
  } catch (backendErr) {
    // Backend offline or slow, proceed to Tier 2 direct fetch
  }

  // Tier 2: Direct public MyMemory API call (CORS enabled)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(pair)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Translation HTTP error ${res.status}`);
    }

    const data = await res.json();
    if (data && data.responseData && typeof data.responseData.translatedText === 'string') {
      const translated = decodeEntities(data.responseData.translatedText);
      // If MyMemory returned an invalid quota warning message, fallback
      if (translated.toLowerCase().includes('my memory has reached') || translated.toLowerCase().includes('invalid pair')) {
        return chunk;
      }
      return translated;
    }
    return chunk;
  } catch (err) {
    clearTimeout(timeoutId);
    return chunk;
  }
}

/**
 * Translates any text in real time between French and Arabic
 * 
 * @param {string} text The text to translate
 * @param {'fr'|'ar'} targetLang Desired target language ('fr' or 'ar')
 * @param {'auto'|'fr'|'ar'} sourceLang Optional source language (defaults to auto detection)
 * @returns {Promise<string>} The translated text
 */
export async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || typeof text !== 'string') return text || '';
  const trimmed = text.trim();
  if (!trimmed) return text;

  const isAlreadyArabic = isArabicText(trimmed);

  // If already in target language, return as-is immediately
  if (targetLang === 'ar' && isAlreadyArabic && sourceLang !== 'fr') {
    return text;
  }
  if (targetLang === 'fr' && !isAlreadyArabic && sourceLang !== 'ar') {
    return text;
  }

  // Determine actual language pair
  let pair = 'fr|ar';
  if (targetLang === 'ar') {
    pair = isAlreadyArabic ? 'ar|ar' : 'fr|ar';
  } else {
    pair = isAlreadyArabic ? 'ar|fr' : 'fr|fr';
  }

  if (pair === 'ar|ar' || pair === 'fr|fr') {
    return text;
  }

  const cacheKey = `${pair}:::${trimmed}`;

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 2. Check localStorage cache
  const storageCache = loadStorageCache();
  if (storageCache[cacheKey]) {
    memoryCache.set(cacheKey, storageCache[cacheKey]);
    return storageCache[cacheKey];
  }

  // 3. Perform real-time translation with chunking
  try {
    const chunks = chunkText(trimmed, 400);
    const results = [];

    for (const chunk of chunks) {
      const translated = await translateChunk(chunk, pair);
      results.push(translated);
    }

    const finalTranslation = results.join('\n');

    if (finalTranslation && finalTranslation !== trimmed) {
      memoryCache.set(cacheKey, finalTranslation);
      saveStorageCache(cacheKey, finalTranslation);
      return finalTranslation;
    }
    return text;
  } catch (err) {
    console.warn('[Translator] Realtime translation error:', err);
    return text;
  }
}

/**
 * React Hook for automatic real-time translation of dynamic content
 * 
 * @param {string} text Dynamic text to translate (e.g. doctor presentation / bio)
 * @param {'fr'|'ar'} targetLang Current UI language
 * @param {string} [fallbackText] Optional fallback text while translating
 * @returns {{ translated: string, isTranslating: boolean, error: Error|null }}
 */
export function useRealtimeTranslation(text, targetLang = 'fr', fallbackText = '') {
  const [translated, setTranslated] = useState(() => {
    if (!text) return fallbackText || '';
    const isAlreadyArabic = isArabicText(text);
    if ((targetLang === 'ar' && isAlreadyArabic) || (targetLang === 'fr' && !isAlreadyArabic)) {
      return text;
    }
    const pair = targetLang === 'ar' ? 'fr|ar' : 'ar|fr';
    const cacheKey = `${pair}:::${text.trim()}`;
    if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);
    const st = loadStorageCache();
    if (st[cacheKey]) return st[cacheKey];
    return fallbackText || text;
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const lastTextRef = useRef(text);
  const lastLangRef = useRef(targetLang);

  useEffect(() => {
    let isCancelled = false;
    lastTextRef.current = text;
    lastLangRef.current = targetLang;

    if (!text || typeof text !== 'string' || !text.trim()) {
      setTranslated(fallbackText || '');
      setIsTranslating(false);
      return;
    }

    const trimmed = text.trim();
    const isAlreadyArabic = isArabicText(trimmed);

    // Fast path: text is already in the target language
    if ((targetLang === 'ar' && isAlreadyArabic) || (targetLang === 'fr' && !isAlreadyArabic)) {
      setTranslated(text);
      setIsTranslating(false);
      return;
    }

    const pair = targetLang === 'ar' ? 'fr|ar' : 'ar|fr';
    const cacheKey = `${pair}:::${trimmed}`;

    // Instant cache check
    if (memoryCache.has(cacheKey)) {
      setTranslated(memoryCache.get(cacheKey));
      setIsTranslating(false);
      return;
    }
    const st = loadStorageCache();
    if (st[cacheKey]) {
      memoryCache.set(cacheKey, st[cacheKey]);
      setTranslated(st[cacheKey]);
      setIsTranslating(false);
      return;
    }

    // Trigger asynchronous real-time translation
    setIsTranslating(true);
    setError(null);

    translateText(trimmed, targetLang)
      .then((res) => {
        if (!isCancelled && lastTextRef.current === text && lastLangRef.current === targetLang) {
          setTranslated(res);
          setIsTranslating(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err);
          setTranslated(fallbackText || text);
          setIsTranslating(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [text, targetLang, fallbackText]);

  return { translated, isTranslating, error };
}

/**
 * Clear cached translations
 */
export function clearTranslationCache() {
  memoryCache.clear();
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Bi-directional Medical Specialty & Discipline Resolver
 * Resolves any specialty in French, Arabic, or ID to the target language
 */
export function resolveMedicalSpecialty(spec = '', targetLang = 'fr', specId = '') {
  if (!spec && !specId) {
    return targetLang === 'ar' ? 'طبيب أخصائي' : 'Médecin Spécialiste';
  }
  const cleanSpec = String(spec || '').trim();
  const cleanId = String(specId || '').trim().toLowerCase();

  // 1. Direct ID match
  if (cleanId && Array.isArray(SPECIALTIES)) {
    const matchId = SPECIALTIES.find(s => s.id && s.id.toLowerCase() === cleanId);
    if (matchId) {
      return targetLang === 'ar' ? matchId.ar : matchId.fr;
    }
  }

  // 2. Direct name or substring match in SPECIALTIES
  if (Array.isArray(SPECIALTIES)) {
    const lower = cleanSpec.toLowerCase();
    const match = SPECIALTIES.find(s => {
      if (s.fr && s.fr.toLowerCase() === lower) return true;
      if (s.ar && s.ar.trim() === cleanSpec) return true;
      if (s.fr && (lower.includes(s.fr.toLowerCase()) || s.fr.toLowerCase().includes(lower))) return true;
      if (s.ar && (cleanSpec.includes(s.ar) || s.ar.includes(cleanSpec))) return true;
      return false;
    });

    if (match) {
      return targetLang === 'ar' ? match.ar : match.fr;
    }
  }

  // 3. Fallback heuristic keyword mapping for Tunisian specialties
  if (targetLang === 'fr' && isArabicText(cleanSpec)) {
    if (cleanSpec.includes('نساء') || cleanSpec.includes('توليد')) return 'Gynécologie Obstétrique & PMA';
    if (cleanSpec.includes('قلب') || cleanSpec.includes('أوعية')) return 'Cardiologie & Maladies Vasculaires';
    if (cleanSpec.includes('أطفال') || cleanSpec.includes('ولادة') || cleanSpec.includes('رضع')) return 'Pédiatrie & Néonatologie';
    if (cleanSpec.includes('أسنان')) return 'Chirurgie Dentaire & Implantologie';
    if (cleanSpec.includes('عام') || cleanSpec.includes('استعجال')) return 'Médecine Générale & Urgences';
    if (cleanSpec.includes('عيون')) return 'Ophtalmologie & Chirurgie Réfractive';
    if (cleanSpec.includes('جلد') || cleanSpec.includes('تناسلية')) return 'Dermatologie & Vénérologie';
    if (cleanSpec.includes('عظام') || cleanSpec.includes('مفاصل')) return 'Chirurgie Orthopédique & Traumatologie';
    if (cleanSpec.includes('أنف') || cleanSpec.includes('أذن') || cleanSpec.includes('حنجرة')) return 'Oto-Rhino-Laryngologie (ORL)';
    if (cleanSpec.includes('نفسي') || cleanSpec.includes('أعصاب')) return 'Psychiatrie & Santé Mentale';
    if (cleanSpec.includes('هضمي') || cleanSpec.includes('كبد')) return 'Gastro-Entérologie & Hépatologie';
    if (cleanSpec.includes('رئة') || cleanSpec.includes('حساسية') || cleanSpec.includes('صدر')) return 'Pneumologie & Allergologie';
    if (cleanSpec.includes('غدد') || cleanSpec.includes('سكري')) return 'Endocrinologie & Diabétologie';
    if (cleanSpec.includes('كلى') || cleanSpec.includes('مسالك')) return 'Chirurgie Urologique & Andrologie';
    if (cleanSpec.includes('أشعة') || cleanSpec.includes('تصوير')) return 'Radiologie & Imagerie Médicale';
  } else if (targetLang === 'ar' && !isArabicText(cleanSpec)) {
    const lower = cleanSpec.toLowerCase();
    if (lower.includes('gyn') || lower.includes('obst')) return 'أخصائية أمراض النساء والتوليد';
    if (lower.includes('cardio')) return 'أخصائي أمراض القلب والأوعية الدموية';
    if (lower.includes('pediat') || lower.includes('pédiat')) return 'أخصائية طب الأطفال وحديثي الولادة';
    if (lower.includes('dent')) return 'جراحة وتجميل الأسنان';
    if (lower.includes('general') || lower.includes('général')) return 'طب عام واستشارات عاجلة';
    if (lower.includes('opht')) return 'أخصائي أمراض وجراحة العيون';
    if (lower.includes('derm')) return 'أخصائي الأمراض الجلدية والتناسلية';
    if (lower.includes('ortho')) return 'جراحة العظام والمفاصل';
    if (lower.includes('orl')) return 'أخصائي الأنف والأذن والحنجرة';
    if (lower.includes('psych')) return 'الطب النفسي والأعصاب';
    if (lower.includes('gastro')) return 'أمراض الجهاز الهضمي والكبد';
    if (lower.includes('pneumo')) return 'أمراض الرئة والحساسية';
    if (lower.includes('endo') || lower.includes('diab')) return 'أخصائي الغدد الصماء والسكري';
    if (lower.includes('uro')) return 'جراحة الكلى والمسالك البولية';
    if (lower.includes('radio')) return 'التصوير الطبي والأشعة';
  }

  return cleanSpec || (targetLang === 'ar' ? 'طبيب أخصائي' : 'Médecin Spécialiste');
}

// Pre-compiled comprehensive bilingual medical equipment and diploma dictionary
const STATIC_MEDICAL_TERMS = [
  // Equipment terms
  { fr: "Échocardiographe", ar: "جهاز تخطيط صدى القلب (إيكو)" },
  { fr: "Échocardiographie", ar: "تخطيط صدى القلب" },
  { fr: "Échocardiographie 4D", ar: "فحص صدى القلب عالي الدقة 4D" },
  { fr: "Échocardiographie 4D Haute Définition", ar: "فحص بالموجات فوق الصوتية عالي الدقة 4D" },
  { fr: "Échocardiographe Doppler Couleur HD", ar: "جهاز تخطيط صدى القلب دوبلر ملون عالي الدقة" },
  { fr: "Échographe Doppler Cardiaque Haute Définition", ar: "جهاز تخطيط صدى القلب دوبلر عالي الدقة" },
  { fr: "Échographe", ar: "جهاز فحص الصدى بالموجات فوق الصوتية" },
  { fr: "Échographe Doppler", ar: "جهاز صدى دوبلر" },
  { fr: "Échographe Doppler Haute Définition", ar: "جهاز صدى دوبلر عالي الدقة" },
  { fr: "Échographe 3D/4D", ar: "جهاز صدى صوتي ثلاثي ورباعي الأبعاد" },
  { fr: "Échographe abdominal", ar: "جهاز صدى بطني" },
  { fr: "Épreuve d'effort sur tapis roulant", ar: "اختبار الجهد القلبي على بساط المشي" },
  { fr: "Tapis Roulant d'Épreuve d'Effort Cardiologique", ar: "بساط اختبار الجهد القلبي المتطور" },
  { fr: "Holter ECG & MAPA 24h", ar: "جهاز هولتر لتخطيط القلب ومراقبة ضغط الدم 24 ساعة" },
  { fr: "Holter MAPA 24h", ar: "جهاز هولتر ضغط وتخطيط القلب 24 ساعة" },
  { fr: "Dispositif Holter MAPA 24h", ar: "جهاز هولتر تخطيط 24 ساعة" },
  { fr: "Dispositif Holter MAPA Tensionnel 24h", ar: "جهاز هولتر لمراقبة ضغط الدم 24 ساعة" },
  { fr: "Enregistreur Holter ECG Rythmique 24h/48h", ar: "جهاز هولتر لتسجيل نبضات القلب المستمر" },
  { fr: "Électrocardiogramme Numérique (ECG)", ar: "تخطيط كهربائي للقلب رقمي (ECG)" },
  { fr: "Électrocardiographe Numérique 12 Pistes (ECG)", ar: "جهاز تخطيط القلب الكهربائي الرقمي 12 مساراً" },
  { fr: "Cabinet informatisé", ar: "عيادة مرقمنة ومجهزة بأنظمة متطورة" },
  { fr: "Cabinet informatisé & Dossier Électronique Sécurisé", ar: "عيادة مرقمنة بالكامل مع ملف طبي إلكتروني مشفر" },
  { fr: "Équipement d'examen spécialisé", ar: "تجهيزات فحص واستشارة متخصصة" },
  { fr: "Équipement d'examen médical spécialisé", ar: "تجهيزات ومعدات فحص سريري واستشارة متخصصة" },
  { fr: "Table d'examen électrique à hauteur variable", ar: "طاولة فحص كهربائية قابلة للتعديل بسهولة" },
  { fr: "Stérilisateur Autoclave Médical Classe B", ar: "جهاز تعقيم طبي أوتوكلاف من الصنف B" },
  { fr: "Tensiomètre & Oxymètre SpO2 connecté", ar: "جهاز قياس ضغط الدم ونسبة تشبع الأكسجين الذكي" },
  { fr: "Défibrillateur Automatisé Externe (DAE)", ar: "جهاز إنعاش الصدمات القلبية الآلي الخارجي" },
  { fr: "Négatoscope / Écran d'imagerie HD", ar: "شاشة فحص وتدقيق صور الأشعة السينية عالية الوضوح" },
  { fr: "Colposcope vidéo HD", ar: "منظار عنق الرحم بالفيديو عالي الدقة" },
  { fr: "Sonde d'échocardiographie transœsophagienne (ETO)", ar: "مسبار صدى القلب عبر المريء" },
  { fr: "Laser dermatologique", ar: "جهاز ليزر جلدي تجميلي وعلاجي" },
  { fr: "Fauteuil dentaire ergonomique", ar: "كرسي طب أسنان متطور ومريح" },
  { fr: "Radio panoramique dentaire 3D", ar: "جهاز أشعة بانورامية ثلاثية الأبعاد للأسنان" },

  // Diplomas
  { fr: "Diplôme d'État de Docteur en Médecine", ar: "شهادة دولة دكتور في الطب (تونس)" },
  { fr: "Diplôme d'État de Docteur en Médecine (Tunisie)", ar: "شهادة دولة دكتور في الطب (تونس)" },
  { fr: "Diplôme d'État de Docteur en Médecine Dentaire", ar: "شهادة دولة دكتور في طب وجراحة الأسنان" },
  { fr: "Diplôme d'État de Docteur en Pharmacie", ar: "شهادة دولة دكتور في الصيدلة" },
  { fr: "Diplôme d'Études Spécialisées", ar: "شهادة الدراسات الطبية التخصصية" },
  { fr: "Diplôme d'Études Spécialisées (DES)", ar: "شهادة الدراسات الطبية التخصصية المعمقة" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Cardiologie", ar: "شهادة الدراسات المتخصصة في أمراض القلب" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Pédiatrie", ar: "شهادة الدراسات المتخصصة في طب الأطفال" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Gynécologie", ar: "شهادة الدراسات المتخصصة في أمراض النساء والتوليد" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Ophtalmologie", ar: "شهادة الدراسات المتخصصة في طب العيون" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Dermatologie", ar: "شهادة الدراسات المتخصصة في الأمراض الجلدية" },
  { fr: "Diplôme d'Études Spécialisées (DES) en Orthopédie", ar: "شهادة الدراسات المتخصصة في جراحة العظام" },
  { fr: "Membre de l'Ordre des Médecins de Tunisie", ar: "مرسم بالمجلس الوطني لعمادة الأطباء بالبلاد التونسية" },
  { fr: "Membre de l'Ordre des Médecins", ar: "مرسم بعمادة الأطباء" },
  { fr: "Membre de l'Ordre National des Médecins Dentistes de Tunisie", ar: "مرسم بعمادة أطباء الأسنان بتونس" },
  { fr: "Ancien Interne des Hôpitaux de Tunis", ar: "طبيب داخلي سابق بمستشفيات تونس" },
  { fr: "Ancien Interne des Hôpitaux Universitaires de Tunis", ar: "طبيب مقيم سابق بالمستشفيات الجامعية بتونس" },
  { fr: "Ancien Interne des Hôpitaux", ar: "طبيب داخلي سابق بالمستشفيات الجامعية" },
  { fr: "Ancien Chef de Clinique / Assistant Hospitalo-Universitaire", ar: "طبيب استشفائي جامعي سابق / أستاذ مساعد" },
  { fr: "Ancien Chef de Clinique", ar: "رئيس عيادة سابق" },
  { fr: "Diplôme d'Échocardiographie et Imagerie Médicale", ar: "شهادة تكميلية في تخطيط وصدى القلب والتصوير الطبي" },
  { fr: "Diplôme Universitaire d'Échocardiographie Doppler Cardiaque", ar: "دبلوم جامعي في صدى القلب دوبلر" },
  { fr: "Diplôme Universitaire en Imagerie Médicale & Radiologie", ar: "شهادة اختصاص في التصوير الطبي والأشعة" },
  { fr: "Membre de la Société Tunisienne de Médecine", ar: "عضو بالجمعية التونسية للعلوم الطبية" },
  { fr: "Membre de la Société Tunisienne de Cardiologie (STCCCV)", ar: "عضو بالجمعية التونسية لأمراض وجراحة القلب" },
  { fr: "Membre de la Société Tunisienne de Cardiologie", ar: "عضو الجمعية التونسية لأمراض القلب" },
  { fr: "Attestation d'Études Complémentaires en Santé", ar: "شهادة الدراسات التكميلية في علوم الصحة" },

  // Languages & Accessibility
  { fr: "Français, Arabe, Anglais", ar: "العربية، الفرنسية، الإنجليزية" },
  { fr: "Français, Arabe", ar: "العربية، الفرنسية" },
  { fr: "Accès PMR / Ascenseur Étage 2", ar: "وصول ميسر لذوي الاحتياجات الخاصة / مصعد طابق 2" },
  { fr: "Accès PMR / Ascenseur", ar: "ولوجية كاملة لذوي الاحتياجات الخاصة / مصعد" },
  { fr: "Accès personnes à mobilité réduite (PMR)", ar: "ولوجية ميسرة لذوي الاحتياجات الخاصة" }
];

// Unified dictionary cache
let unifiedDictionaryCache = null;

function getUnifiedMedicalTerms() {
  if (unifiedDictionaryCache) return unifiedDictionaryCache;
  const list = [...STATIC_MEDICAL_TERMS];

  // Merge UNIVERSAL_DIPLOMAS
  if (Array.isArray(UNIVERSAL_DIPLOMAS)) {
    UNIVERSAL_DIPLOMAS.forEach(d => {
      if (d && d.fr && d.ar) list.push(d);
    });
  }

  // Merge UNIVERSAL_EQUIPMENT
  if (Array.isArray(UNIVERSAL_EQUIPMENT)) {
    UNIVERSAL_EQUIPMENT.forEach(e => {
      if (e && e.fr && e.ar) list.push(e);
    });
  }

  // Merge SPECIALTY_SUGGESTIONS
  if (SPECIALTY_SUGGESTIONS && typeof SPECIALTY_SUGGESTIONS === 'object') {
    Object.values(SPECIALTY_SUGGESTIONS).forEach(specObj => {
      if (Array.isArray(specObj.diplomas)) {
        specObj.diplomas.forEach(d => {
          if (d && d.fr && d.ar) list.push(d);
        });
      }
      if (Array.isArray(specObj.equipment)) {
        specObj.equipment.forEach(e => {
          if (e && e.fr && e.ar) list.push(e);
        });
      }
    });
  }

  unifiedDictionaryCache = list;
  return list;
}

/**
 * Resolves a medical diploma, equipment, or credential string between French and Arabic
 * Uses fast dictionary match, substring match, and translation cache.
 * 
 * @param {string} term The medical equipment, diploma or credential
 * @param {'fr'|'ar'} targetLang Target language ('fr' or 'ar')
 * @returns {string|null} Resolved translated string or null if not in dictionary
 */
export function resolveMedicalTerm(term, targetLang = 'fr') {
  if (!term || typeof term !== 'string') return term || '';
  const clean = term.trim();
  if (!clean) return term;

  const isAlreadyArabic = isArabicText(clean);
  if (targetLang === 'ar' && isAlreadyArabic) return clean;
  if (targetLang === 'fr' && !isAlreadyArabic) return clean;

  const dictionary = getUnifiedMedicalTerms();
  const lower = clean.toLowerCase();

  // 1. Exact match in dictionary
  for (const entry of dictionary) {
    if (targetLang === 'ar') {
      if (entry.fr && entry.fr.toLowerCase().trim() === lower) {
        return entry.ar;
      }
    } else {
      if (entry.ar && entry.ar.trim() === clean) {
        return entry.fr;
      }
    }
  }

  // 2. Prefix / contains match in dictionary
  for (const entry of dictionary) {
    if (targetLang === 'ar' && entry.fr && entry.ar) {
      const eFrLower = entry.fr.toLowerCase();
      if (lower === eFrLower || lower.startsWith(eFrLower) || eFrLower.startsWith(lower)) {
        return entry.ar;
      }
      if (lower.length > 5 && eFrLower.includes(lower)) {
        return entry.ar;
      }
    } else if (targetLang === 'fr' && entry.ar && entry.fr) {
      if (clean === entry.ar || clean.includes(entry.ar) || entry.ar.includes(clean)) {
        return entry.fr;
      }
    }
  }

  // 3. Fallback keywords for common equipments & diplomas
  if (targetLang === 'ar' && !isAlreadyArabic) {
    if (lower.includes('échocardiograph') || lower.includes('echocardiograph')) {
      return 'جهاز تخطيط صدى القلب (إيكو)';
    }
    if (lower.includes('échograph') || lower.includes('echograph')) {
      return 'جهاز فحص الصدى بالموجات فوق الصوتية';
    }
    if (lower.includes('holter') && lower.includes('mapa')) {
      return 'جهاز هولتر ضغط وتخطيط القلب 24 ساعة';
    }
    if (lower.includes('holter')) {
      return 'جهاز هولتر لمراقبة نبضات القلب 24 ساعة';
    }
    if (lower.includes('ecg') || lower.includes('électrocardiogramme')) {
      return 'تخطيط كهربائي للقلب رقمي (ECG)';
    }
    if (lower.includes('docteur en médecine') || lower.includes('docteur en medecine')) {
      return 'شهادة دولة دكتور في الطب (تونس)';
    }
    if (lower.includes('spécialisées') || lower.includes('specialisees') || lower.includes('des')) {
      return 'شهادة الدراسات الطبية التخصصية';
    }
    if (lower.includes('ordre des médecins') || lower.includes('ordre des medecins')) {
      return 'مرسم بالمجلس الوطني لعمادة الأطباء بالبلاد التونسية';
    }
    if (lower.includes('interne des hôpitaux') || lower.includes('interne des hopitaux')) {
      return 'طبيب مقيم سابق بالمستشفيات الجامعية بتونس';
    }
  } else if (targetLang === 'fr' && isAlreadyArabic) {
    if (clean.includes('صدى القلب') || clean.includes('إيكو')) {
      return 'Échocardiographe Doppler Couleur HD';
    }
    if (clean.includes('هولتر')) {
      return 'Dispositif Holter MAPA 24h';
    }
    if (clean.includes('تخطيط') && clean.includes('القلب')) {
      return 'Électrocardiogramme Numérique (ECG)';
    }
    if (clean.includes('دكتور في الطب')) {
      return "Diplôme d'État de Docteur en Médecine";
    }
    if (clean.includes('عمادة الأطباء')) {
      return "Membre de l'Ordre des Médecins de Tunisie";
    }
    if (clean.includes('تخصصية') || clean.includes('اختصاص')) {
      return "Diplôme d'Études Spécialisées";
    }
  }

  // 4. In-memory and localStorage cache
  const pair = targetLang === 'ar' ? 'fr|ar' : 'ar|fr';
  const cacheKey = `${pair}:::${clean}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);
  const st = loadStorageCache();
  if (st[cacheKey]) {
    memoryCache.set(cacheKey, st[cacheKey]);
    return st[cacheKey];
  }

  return null;
}

/**
 * React hook to translate an array of medical diplomas or equipment in real-time
 * Uses synchronous dictionary lookup first, then falls back to real-time API translation
 * with automatic caching.
 * 
 * @param {string[]} items List of strings to translate (e.g. doctor.diplomas, doctor.equipment)
 * @param {'fr'|'ar'} targetLang Current language ('fr' or 'ar')
 * @param {string[]} [fallbackItems] Optional pre-translated list (e.g. doctor.diplomasAr)
 * @returns {{ items: string[], isTranslating: boolean }}
 */
export function useTranslatedList(items = [], targetLang = 'fr', fallbackItems = []) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const safeFallbacks = Array.isArray(fallbackItems) ? fallbackItems.filter(Boolean) : [];

  const resolveItem = (item, idx) => {
    if (!item) return '';
    // If target is Arabic and explicit Arabic fallback provided for this index
    if (targetLang === 'ar' && safeFallbacks[idx] && isArabicText(safeFallbacks[idx])) {
      return safeFallbacks[idx];
    }
    const resolved = resolveMedicalTerm(item, targetLang);
    if (resolved) return resolved;
    return item;
  };

  const [translatedList, setTranslatedList] = useState(() => {
    return safeItems.map((item, idx) => resolveItem(item, idx));
  });

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    // 1. Instant synchronous pass
    const currentList = safeItems.map((item, idx) => resolveItem(item, idx));
    setTranslatedList(currentList);

    // 2. Identify items that still require asynchronous API translation
    const pending = [];
    safeItems.forEach((item, idx) => {
      const isAlreadyTarget = (targetLang === 'ar' && isArabicText(item)) || (targetLang === 'fr' && !isArabicText(item));
      const hasSyncMatch = resolveMedicalTerm(item, targetLang);
      const hasValidFallback = targetLang === 'ar' && safeFallbacks[idx] && isArabicText(safeFallbacks[idx]);

      if (!isAlreadyTarget && !hasSyncMatch && !hasValidFallback) {
        pending.push({ item, idx });
      }
    });

    if (pending.length === 0) {
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);

    Promise.all(
      pending.map(async ({ item, idx }) => {
        try {
          const res = await translateText(item, targetLang);
          return { idx, res };
        } catch (e) {
          return { idx, res: item };
        }
      })
    ).then((results) => {
      if (!isCancelled) {
        setTranslatedList((prev) => {
          const next = [...prev];
          results.forEach(({ idx, res }) => {
            if (res) next[idx] = res;
          });
          return next;
        });
        setIsTranslating(false);
      }
    }).catch(() => {
      if (!isCancelled) setIsTranslating(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [JSON.stringify(safeItems), targetLang, JSON.stringify(safeFallbacks)]);

  return { items: translatedList, isTranslating };
}

export default {
  translateText,
  useRealtimeTranslation,
  useTranslatedList,
  resolveMedicalTerm,
  isArabicText,
  resolveMedicalSpecialty,
  clearTranslationCache
};
