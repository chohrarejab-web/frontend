/**
 * High-performance, accent-insensitive, typo-tolerant (fuzzy) search utilities.
 * Handles:
 * - French accent normalization (é, è, ê, ë -> e, à, â -> a, î, ï -> i, ô -> o, ù, û -> u, ç -> c)
 * - Arabic diacritic & letter normalization (أ/إ/آ -> ا, ة -> ه, ى -> ي, etc.)
 * - Typo tolerance (Levenshtein distance & subsequence matching, e.g. "maldi" -> "maladies", "cadrio" -> "cardio")
 * - Medical synonyms & variants (e.g. "pediatre" -> "pédiatrie", "dentiste" -> "dentaire")
 */

// Accent and diacritic normalization
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip Latin accents (é, è, ê, ë, à, â, î, ï, ô, û, ù, ç)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[أإآٱ]/g, 'ا')        // Arabic alef variants
    .replace(/[ة]/g, 'ه')          // Taa marbuta -> Haa
    .replace(/[يى]/g, 'ي')          // Yaa / Alef maqsura
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic Harakat / Tashkeel
    .replace(/[-_.,'"`/\\()[\]{}|:;!?+*&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Subsequence check: checks if all chars in `sub` appear in `target` in order.
 * e.g., 'maldi' in 'maladies' => true (m-a-l-[a]-d-i-[e-s])
 */
export function isSubsequence(sub, target, maxGap = 3) {
  if (!sub || !target) return false;
  if (sub.length > target.length) return false;
  if (sub[0] !== target[0]) return false; // First letter must match
  if ((target.length - sub.length) > maxGap) return false;

  let si = 0;
  let ti = 0;
  while (si < sub.length && ti < target.length) {
    if (sub[si] === target[ti]) si++;
    ti++;
  }
  return si === sub.length;
}

/**
 * Common Medical & Typo Synonyms Mapping (French & Tunisian)
 */
export const MEDICAL_SYNONYMS = {
  // Typo "maldi" and disease words
  'maldi': ['maladie', 'maladies', 'maladies vasculaires'],
  'maldie': ['maladie', 'maladies', 'maladies vasculaires'],
  'maldies': ['maladies', 'maladie', 'maladies vasculaires'],
  'maladi': ['maladie', 'maladies', 'maladies vasculaires'],
  'maladie': ['maladies', 'maladies vasculaires'],
  'maladies': ['maladie', 'maladies vasculaires'],

  // Pediatrics
  'pediatre': ['pediatrie', 'pediatrie & neonatologie'],
  'pediatrie': ['pediatre', 'pediatrie & neonatologie'],
  'pidiatre': ['pediatrie', 'pediatre'],

  // Cardiology & typos like "cadrio"
  'cadrio': ['cardio', 'cardiologie', 'cardiologie & maladies vasculaires'],
  'cadriologie': ['cardiologie', 'cardio'],
  'cardio': ['cardiologie', 'cardiologie & maladies vasculaires'],
  'cardiologue': ['cardiologie', 'cardiologie & maladies vasculaires'],
  '9alb': ['cardio', 'cardiologie'],

  // Dental
  'dentiste': ['chirurgie dentaire & implantologie', 'dentaire'],
  'dentist': ['chirurgie dentaire & implantologie', 'dentaire'],
  'dentaire': ['chirurgie dentaire & implantologie', 'dentiste'],

  // General Practice
  'generaliste': ['medecine generale & urgences', 'medecine generale'],
  'generalist': ['medecine generale & urgences', 'medecine generale'],
  'medecin': ['medecine generale', 'medecine'],

  // Gynecology
  'gyneco': ['gynecologie obstetrique & pma', 'gynecologie'],
  'gynecologue': ['gynecologie obstetrique & pma', 'gynecologie'],
  'gineco': ['gynecologie obstetrique & pma', 'gynecologie'],

  // Ophthalmology
  'ophtalmo': ['ophtalmologie & chirurgie refractive', 'ophtalmologie'],
  'ophtalmologue': ['ophtalmologie & chirurgie refractive', 'ophtalmologie'],
  'optalmo': ['ophtalmologie & chirurgie refractive', 'ophtalmologie'],

  // Dermatology
  'dermato': ['dermatologie & venerologie', 'dermatologie'],
  'dermatologue': ['dermatologie & venerologie', 'dermatologie'],

  // ORL
  'orl': ['oto rhino laryngologie (orl)', 'oto rhino laryngologie'],

  // Orthopedics
  'ortho': ['chirurgie orthopedique & traumatologie', 'orthopedie'],

  // Psychiatry
  'psy': ['psychiatrie & sante mentale', 'psychiatrie'],

  // Radiology
  'radio': ['radiologie & imagerie medicale', 'radiologie'],

  // Gastro
  'gastro': ['gastro enterologie & hepatologie', 'gastro enterologie']
};

/**
 * Check if a single query token matches a single target word with typo/accent tolerance
 */
export function isWordFuzzyMatch(qWord, tWord) {
  if (!qWord || !tWord) return false;
  if (qWord === tWord) return true;

  if (qWord.length < 3 || tWord.length < 3) {
    return qWord === tWord;
  }

  // Target word contains full query word (e.g. 'cardiologie'.includes('cardio'))
  if (tWord.includes(qWord)) return true;

  // Query word contains target word ONLY if target word is substantial
  if (qWord.includes(tWord) && tWord.length >= 4 && tWord.length >= qWord.length * 0.75) {
    return true;
  }

  // Common prefix (at least 4 characters, e.g. 'pediatr' in 'pediatrie' and 'pediatre')
  if (qWord.length >= 4 && tWord.length >= 4 && qWord.slice(0, 4) === tWord.slice(0, 4)) {
    if (Math.abs(tWord.length - qWord.length) <= 3) return true;
  }

  // Subsequence matching (e.g. "maldi" in "maladies", "maladi")
  if (qWord.length >= 4 && isSubsequence(qWord, tWord, 3)) {
    return true;
  }

  // Edit distance check (Levenshtein) - Maximum allowed distance is strictly 1 or 2
  const qLen = qWord.length;
  const tLen = tWord.length;
  const sameStart = qWord[0] === tWord[0];

  const dist = levenshteinDistance(qWord, tWord);

  if (sameStart) {
    if (qLen <= 5 && dist <= 1) return true;
    if (qLen >= 6 && dist <= 2 && Math.abs(qLen - tLen) <= 2) return true;
  } else {
    if (dist === 1 && Math.abs(qLen - tLen) <= 1) return true;
  }

  return false;
}

/**
 * Universal Fuzzy Matcher
 * Tests whether `targetText` matches `query` with full typo & accent tolerance.
 * Supports tokenized matching (e.g., "dr salim benali" matches "Dr. Selim Ben Ali").
 */
export function fuzzyMatch(query, targetText) {
  if (!query) return true;
  if (!targetText) return false;

  const qNorm = normalizeText(query);
  const tNorm = normalizeText(targetText);

  if (!qNorm) return true;
  if (!tNorm) return false;

  // 1. Direct fast substring match
  if (tNorm.includes(qNorm)) return true;

  // 2. Tokenize both query and target
  const stopWords = new Set(['dr', 'dr.', 'docteur', 'doctor', 'medecin', 'د', 'دكتور', 'طبيب', 'de', 'la', 'et', 'en', '&', 'le', 'les', 'des', 'du', 'au', 'aux']);
  const qTokens = qNorm.split(' ').filter(t => t.length >= 2 && !stopWords.has(t));
  const tTokens = tNorm.split(' ').filter(t => t.length >= 2 && !stopWords.has(t));

  if (qTokens.length === 0) {
    return tNorm.includes(qNorm);
  }

  // 3. Synonym check: if query has synonyms (e.g. "maldi" -> "maladies", "cadrio" -> "cardiologie")
  const checkSynonymMatch = (token) => {
    const syns = MEDICAL_SYNONYMS[token];
    if (!syns) return false;
    for (const syn of syns) {
      const synNorm = normalizeText(syn);
      if (tNorm.includes(synNorm)) return true;
      const synTokens = synNorm.split(' ').filter(st => st.length >= 3);
      if (synTokens.length > 0 && synTokens.every(st => tTokens.some(tt => isWordFuzzyMatch(st, tt)))) {
        return true;
      }
    }
    return false;
  };

  if (checkSynonymMatch(qNorm)) {
    return true;
  }

  // 4. Token-by-token verification: Every meaningful query token must be matched in target
  const allTokensMatch = qTokens.every(qTok => {
    if (tNorm.includes(qTok)) return true;
    if (tTokens.some(tTok => qTok.length >= 4 && isSubsequence(qTok, tTok, 3))) return true;
    if (checkSynonymMatch(qTok)) return true;
    return tTokens.some(tTok => isWordFuzzyMatch(qTok, tTok));
  });

  if (allTokensMatch) return true;

  // 5. Compact string match (ignores spaces between words like "benali" vs "ben ali")
  const qCompact = qNorm.replace(/\s+/g, '');
  const tCompact = tNorm.replace(/\s+/g, '');
  if (tCompact.includes(qCompact)) return true;
  if (qCompact.length >= 5 && isSubsequence(qCompact, tCompact, 2)) return true;

  return false;
}

/**
 * Match a doctor object against a search keyword
 */
export function matchDoctor(doc, keyword) {
  if (!keyword || !keyword.trim()) return true;
  if (!doc) return false;

  const targetFields = [
    doc.name,
    doc.nameAr,
    doc.specialty,
    doc.specialtyFr,
    doc.specialtyAr,
    doc.specialtyId,
    doc.specialtyCode,
    doc.city,
    doc.delegation,
    doc.address,
    doc.addressAr,
    doc.bio,
    doc.bioAr
  ].filter(Boolean).join(' ');

  return fuzzyMatch(keyword, targetFields);
}

/**
 * Match a specialty object against a search keyword
 */
export function matchSpecialty(spec, keyword) {
  if (!keyword || !keyword.trim()) return true;
  if (!spec) return false;

  const targetFields = [
    spec.fr,
    spec.nameFr,
    spec.name,
    spec.ar,
    spec.nameAr,
    spec.id
  ].filter(Boolean).join(' ');

  return fuzzyMatch(keyword, targetFields);
}

/**
 * Match a locality / city against a location query
 */
export function matchLocation(loc, locationQuery) {
  if (!locationQuery || !locationQuery.trim()) return true;
  if (!loc) return false;

  let targetFields = '';
  if (typeof loc === 'string') {
    targetFields = loc;
  } else {
    targetFields = [
      loc.city,
      loc.cityAr,
      loc.del,
      loc.delAr,
      loc.delegation,
      loc.name
    ].filter(Boolean).join(' ');
  }

  return fuzzyMatch(locationQuery, targetFields);
}

export default {
  normalizeText,
  levenshteinDistance,
  isSubsequence,
  isWordFuzzyMatch,
  fuzzyMatch,
  matchDoctor,
  matchSpecialty,
  matchLocation,
  MEDICAL_SYNONYMS
};
