let cachedTesseract = null;
async function getTesseract() {
  if (cachedTesseract) return cachedTesseract;
  try {
    const pkgName = 'tesseract.js';
    const mod = await import(/* @vite-ignore */ pkgName);
    cachedTesseract = mod.default || mod;
    return cachedTesseract;
  } catch (err) {
    console.warn('[OCR] Tesseract.js engine unavailable:', err.message);
    return null;
  }
}

// In-memory cache so re-opening the same document modal doesn't re-run OCR unnecessarily
const ocrCache = new Map();

/**
 * Strip dates, academic years (e.g., "2017-2018"), phone numbers, etc.
 */
function stripDatesAndPhones(text = '') {
  return String(text || '')
    // Remove academic year ranges like "2017-2018", "2017 - 2018", "2017/2018"
    .replace(/\b(?:19|20)\d{2}\s*[\-\/–—]\s*(?:19|20)?\d{2}\b/g, ' ')
    // Remove years preceded by année / universitaire / promotion / session / depuis / né
    .replace(/(?:ann[eé]e|universitaire|promotion|session|depuis|n[eé]\(?e?\)?\s+le)\s*[:.\-\s]*(?:19|20)\d{2}\b/gi, ' ')
    // Remove full written dates like "25 octobre 2018"
    .replace(/\b\d{1,2}\s+(?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:19|20)\d{2}\b/gi, ' ')
    // Remove numeric dates like 06/11/2026 or 06-11-2018
    .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g, ' ')
    // Remove phone numbers and postal codes
    .replace(/(?:t[eé]l[eé]phone|t[eé]l|gsm|mobile|fax|code\s+postal|postal)\s*(?:[mn]um[eé]ro|n\s*[°oº]|no|#)?\s*[:.\-\s]*[\+\d\s.\-]+/gi, ' ')
    .replace(/(?:\+216|00216)\s*\d{2}\s*\d{3}\s*\d{3}/g, ' ');
}

/**
 * Parse raw OCR / PDF text depending on document type:
 *  - 'diploma': Medical diploma / specialty certificate
 *  - 'idCard': National ID card (CIN) / Passport
 *  - 'ordrePaper': Official Ordre des Médecins registration paper (extracts registration number)
 *  - 'general': Combined fallback
 */
export function parseExtractedDocumentText(rawText = '', docType = 'general') {
  const cleanText = String(rawText || '').replace(/\r/g, '\n');
  const normalized = cleanText.toLowerCase();

  // 1. Check for medical / diploma vocabulary
  const medicalKeywords = [
    'médecin', 'medecin', 'médecine', 'medecine', 'docteur', 'doctorat',
    'diplôme', 'diplome', 'ordre', 'médical', 'medical', 'faculté', 'faculte',
    'université', 'universite', 'clinique', 'hôpital', 'hopital', 'cardiolog',
    'pédiatr', 'pediatr', 'chirurg', 'gynéco', 'gyneco', 'gyntcolog', 'ophtalmo',
    'dermato', 'spécialist', 'specialist', 'praticien', 'cabinet', 'attestation',
    'certificat', 'curriculum', 'cnam', 'santé', 'sante', 'cnom', 'doyen'
  ];
  const matchedMedical = medicalKeywords.filter(kw => normalized.includes(kw));
  const hasDiploma = matchedMedical.length >= 1;

  // 2. Check for National ID Card (CIN / Passeport)
  const isUniversityDiplomaDoc = ['faculté', 'faculte', 'doyen', 'certificat d', 'doctorat', 'diplôme', 'diplome'].some(w => normalized.includes(w));
  const strictPassportOrIdKeywords = [
    'passeport', 'passport', 'ministère de l\'intérieur', 'بطاقة التعريف الوطنية', 'بطاقة تعريف'
  ];
  const hasStrictIdHeader = strictPassportOrIdKeywords.some(kw => normalized.includes(kw));

  // Look for 8-digit Tunisian CIN number (starting with 0 or 1) or explicit CIN label followed by 7-8 digits
  const cinExplicitMatch = cleanText.match(/(?:carte\s+d['’\s]*identit\w*|identit\w*\s+nationale|c\.?i\.?n\.?)\s*(?:[mn]um[eé]ro|n\s*[°oº]|no|#)?\s*[:.\-\s]*(\d{7,8})\b/i);
  const standalone8DigitMatch = cleanText.replace(/(?:\+216|00216)\s*\d{8}/g, ' ').match(/\b([01]\d{7})\b/);
  const extractedCin = cinExplicitMatch?.[1] || standalone8DigitMatch?.[1] || null;

  // Never mark a diploma slot or a university diploma without an actual readable 8-digit CIN as a verified ID card
  const hasIdCard = docType === 'diploma'
    ? false
    : (Boolean(extractedCin) || (hasStrictIdHeader && !isUniversityDiplomaDoc));

  const idLabel = extractedCin
    ? `Pièce d'identité vérifiée (CIN N° ${extractedCin})`
    : hasIdCard
      ? "Pièce d'identité officielle détectée"
      : "Aucune pièce d'identité (CIN / Passeport) détectée dans l'image";

  // 3. Extract Registration / Ordre Number
  const sanitizedForOrder = stripDatesAndPhones(cleanText)
    // Remove National ID card (Carte d'identité nationale / CIN) numbers so CIN isn't confused with Ordre
    .replace(/(?:carte\s+d['’\s]*identit\w*|identit\w*\s+nationale|c\.?i\.?n\.?)\s*(?:[mn]um[eé]ro|n\s*[°oº]|no|#)?\s*[:.\-\s]*[a-z0-9]+/gi, ' ');

  let extractedNumber = null;

  // Pattern A: Explicit medical registration label ("Ordre N° 20194", "Numéro d'inscription : 18450", "CNOM 15420", "Matricule : 20194")
  const strictOrderRegex = /(?:ordre(?:\s+national)?(?:\s+des\s+m[eé]decins)?|cnom|inscription(?:\s+officielle|\s+[aà]\s+l['’]ordre|\s+au\s+tableau)?|tableau(?:\s+de\s+l['’]ordre)?|matricule(?:\s+m[eé]dical|\s+ordre|\s+professionnel)?)\s*(?:d['’]inscription|officiel|national|m[eé]dical|n\s*[°oº]|num[eé]ro|no\.?|#)?\s*[:.\-#\s]*(\d{3,8})\b/i;
  const strictMatch = sanitizedForOrder.match(strictOrderRegex);

  if (strictMatch && strictMatch[1]) {
    const val = parseInt(strictMatch[1], 10);
    const isYear = strictMatch[1].length === 4 && val >= 1950 && val <= 2035;
    if (!isYear) {
      extractedNumber = `N° ${strictMatch[1]}`;
    }
  }

  if (!extractedNumber) {
    // Pattern B: Explicit "N° 20194" or "Numéro : 20194" (excluding standalone calendar years 1950-2035)
    const nDegreeRegex = /\b(?:n\s*[°º]|num[eé]ro(?:\s+d['’](?:ordre|inscription))?|no\.?)\s*[:.\-#\s]*(\d{3,8})\b/i;
    const nDegreeMatch = sanitizedForOrder.match(nDegreeRegex);
    if (nDegreeMatch && nDegreeMatch[1]) {
      const numVal = parseInt(nDegreeMatch[1], 10);
      const isCalendarYear = nDegreeMatch[1].length === 4 && numVal >= 1950 && numVal <= 2035;
      if (!isCalendarYear) {
        extractedNumber = `N° ${nDegreeMatch[1]}`;
      }
    }
  }

  // Pattern C: If this document was specifically uploaded in the "Attestation / Numéro d'inscription" slot ('ordrePaper'),
  // also check for any 4-to-7 digit number that is NOT a calendar year (1950-2035) and NOT an 8-digit phone/CIN
  if (!extractedNumber && docType === 'ordrePaper') {
    const candidates = sanitizedForOrder.match(/\b(\d{4,7})\b/g) || [];
    for (const cand of candidates) {
      const numVal = parseInt(cand, 10);
      const isCalendarYear = cand.length === 4 && numVal >= 1950 && numVal <= 2035;
      if (!isCalendarYear) {
        extractedNumber = `N° ${cand}`;
        break;
      }
    }
  }

  const hasNumber = Boolean(extractedNumber);

  // 4. Check for CNAM convention mentions
  const hasCnam = normalized.includes('cnam') || normalized.includes('convention');
  let cnamLabel = "Aucune mention CNAM détectée dans le document";
  if (hasCnam) {
    if (normalized.includes('non convention')) {
      cnamLabel = 'Non conventionné CNAM (détecté par OCR)';
    } else {
      cnamLabel = 'Conventionné CNAM (détecté par OCR)';
    }
  }

  const diplomaLabel = hasDiploma
    ? "Diplôme de Doctorat en Médecine / Certificat détecté"
    : "Aucun diplôme de médecine détecté dans l'image";

  const orderLabel = hasNumber
    ? extractedNumber
    : "Aucun numéro d'inscription détecté dans l'image";

  return {
    hasNumber,
    orderNumber: extractedNumber,
    orderLabel,
    hasDiploma,
    diplomaLabel,
    hasIdCard,
    extractedCin,
    idLabel,
    hasCnam,
    cnamLabel,
    rawText: cleanText.trim()
  };
}

/**
 * Extract readable text from a base64-encoded PDF data URL
 */
function extractTextFromPdfDataUrl(fileData) {
  try {
    const base64Part = fileData.split(',')[1];
    if (!base64Part) return '';
    const binary = atob(base64Part);

    // Extract text inside PDF parentheses (...) Tj / TJ streams
    const textChunks = [];
    const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let match;
    while ((match = parenRegex.exec(binary)) !== null) {
      const chunk = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
      if (/[a-zA-Z0-9]{2,}/.test(chunk)) {
        textChunks.push(chunk);
      }
    }

    if (textChunks.length > 0) {
      return textChunks.join(' ');
    }

    const pdfStructuralWords = /^(obj|endobj|stream|endstream|xref|trailer|startxref|Type|Catalog|Pages|Page|Parent|MediaBox|Contents|Length|Font|Resources|ProcSet|PDF|Text|BaseFont|Subtype|Type1|Helvetica)$/i;
    const asciiMatches = binary.match(/[A-Za-zÀ-ÿ0-9°#:\-\/. ]{4,}/g) || [];
    return asciiMatches
      .map(s => s.trim())
      .filter(s => s.length >= 4 && !pdfStructuralWords.test(s))
      .join(' ');
  } catch (err) {
    console.warn('[OCR] Failed to parse PDF text:', err);
    return '';
  }
}

/**
 * Automatically extract registration number & credentials from an uploaded image or PDF
 * @param {string} fileData - Base64 data URL (data:image/... or data:application/pdf...)
 * @param {function} onProgress - Optional callback receiving progress (0 to 100)
 * @param {string} docType - 'diploma' | 'idCard' | 'ordrePaper' | 'general'
 */
export async function extractDocumentCredentials(fileData, onProgress, docType = 'general') {
  if (!fileData || typeof fileData !== 'string') {
    return {
      hasNumber: false,
      orderNumber: null,
      orderLabel: "Aucun fichier fourni",
      hasDiploma: false,
      diplomaLabel: "Aucun document fourni",
      hasIdCard: false,
      extractedCin: null,
      idLabel: "Aucune pièce d'identité fournie",
      hasCnam: false,
      cnamLabel: "Non détecté",
      rawText: '',
      scanned: true
    };
  }

  const cacheKey = `v4:${docType}:${fileData.length}:${fileData.slice(0, 120)}:${fileData.slice(-120)}`;
  if (ocrCache.has(cacheKey)) {
    if (onProgress) onProgress(100);
    return ocrCache.get(cacheKey);
  }

  try {
    let extractedText = '';

    if (fileData.startsWith('data:image/')) {
      const tesseract = await getTesseract();
      if (!tesseract) {
        throw new Error('Moteur OCR Tesseract indisponible');
      }
      const result = await tesseract.recognize(fileData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        }
      });
      extractedText = result?.data?.text || '';
    } else if (fileData.startsWith('data:application/pdf')) {
      if (onProgress) onProgress(50);
      extractedText = extractTextFromPdfDataUrl(fileData);
      if (onProgress) onProgress(100);
    }

    const parsed = {
      ...parseExtractedDocumentText(extractedText, docType),
      scanned: true
    };

    ocrCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('[OCR] Error extracting text from document:', err);
    return {
      hasNumber: false,
      orderNumber: null,
      orderLabel: "Aucun numéro d'inscription détecté dans l'image",
      hasDiploma: false,
      diplomaLabel: "Aucun diplôme médical détecté dans l'image",
      hasIdCard: false,
      extractedCin: null,
      idLabel: "Aucune pièce d'identité détectée dans l'image",
      hasCnam: false,
      cnamLabel: "Aucune mention CNAM détectée dans l'image",
      rawText: '',
      scanned: true,
      error: err.message
    };
  }
}
