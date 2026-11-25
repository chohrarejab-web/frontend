import { GOVERNORATES_AR, SPECIALTIES } from '../data/tunisiaData.js';
import { isArabicText } from '../services/translator.js';

/**
 * Enhanced bidirectional dictionary for medical specialties in Tunisia
 */
const SPECIALTIES_DICTIONARY = [
  {
    id: 'gyneco',
    fr: 'Gynécologie Obstétrique & PMA',
    frShort: 'Gynécologie Obstétrique',
    ar: 'أخصائية أمراض النساء والتوليد',
    arKeywords: ['نساء', 'توليد', 'عقم', 'ولادة', 'جنين'],
    frKeywords: ['gyneco', 'obstetrique', 'maternite', 'grossesse', 'femme']
  },
  {
    id: 'cardio',
    fr: 'Cardiologie & Maladies Vasculaires',
    frShort: 'Cardiologie',
    ar: 'أخصائي أمراض القلب والأوعية الدموية',
    arKeywords: ['قلب', 'أوعية', 'شرايين', 'ضغط الدم'],
    frKeywords: ['cardio', 'coeur', 'vasculaire', 'tension']
  },
  {
    id: 'pediatrie',
    fr: 'Pédiatrie & Néonatologie',
    frShort: 'Pédiatrie',
    ar: 'أخصائية طب الأطفال وحديثي الولادة',
    arKeywords: ['أطفال', 'رضع', 'وليد', 'طفولة'],
    frKeywords: ['pediatre', 'pediatrie', 'enfant', 'nourrisson', 'neonat']
  },
  {
    id: 'dentiste',
    fr: 'Chirurgie Dentaire & Implantologie',
    frShort: 'Dentiste',
    ar: 'جراحة وتجميل الأسنان',
    arKeywords: ['أسنان', 'ضروس', 'لثة', 'تقويم أسنان'],
    frKeywords: ['dentiste', 'dentaire', 'implant', 'orthodontie']
  },
  {
    id: 'generaliste',
    fr: 'Médecine Générale & Urgences',
    frShort: 'Médecine Générale',
    ar: 'طب عام واستشارات عاجلة',
    arKeywords: ['طب عام', 'طبيب عام', 'استعجالي'],
    frKeywords: ['generaliste', 'medecine generale', 'urgence']
  },
  {
    id: 'ophtalmo',
    fr: 'Ophtalmologie & Chirurgie Réfractive',
    frShort: 'Ophtalmologie',
    ar: 'أخصائي أمراض وجراحة العيون',
    arKeywords: ['عيون', 'عين', 'بصر', 'شبكية', 'نظارات'],
    frKeywords: ['ophtalmo', 'oeil', 'yeux', 'vision']
  },
  {
    id: 'dermato',
    fr: 'Dermatologie & Vénérologie',
    frShort: 'Dermatologie',
    ar: 'أخصائي الأمراض الجلدية والتناسلية',
    arKeywords: ['جلدية', 'جلد', 'بشرة', 'شعر'],
    frKeywords: ['dermato', 'peau', 'cutane']
  },
  {
    id: 'orthopedie',
    fr: 'Chirurgie Orthopédique & Traumatologie',
    frShort: 'Orthopédie',
    ar: 'جراحة العظام والمفاصل',
    arKeywords: ['عظام', 'مفاصل', 'كسور', 'عمود فقري'],
    frKeywords: ['ortho', 'os', 'articulation', 'traumatol']
  },
  {
    id: 'orl',
    fr: 'Oto-Rhino-Laryngologie (ORL)',
    frShort: 'ORL',
    ar: 'أخصائي الأنف والأذن والحنجرة',
    arKeywords: ['أنف', 'أذن', 'حنجرة', 'سمع'],
    frKeywords: ['orl', 'oto', 'rhino', 'gorge', 'oreille']
  },
  {
    id: 'psy',
    fr: 'Psychiatrie & Santé Mentale',
    frShort: 'Psychiatrie',
    ar: 'الطب النفسي والأعصاب',
    arKeywords: ['نفسي', 'نفسية', 'عقلي'],
    frKeywords: ['psy', 'psychiatre', 'mental']
  },
  {
    id: 'neuro',
    fr: 'Neurologie & Neurochirurgie',
    frShort: 'Neurologie',
    ar: 'أخصائي أمراض الأعصاب',
    arKeywords: ['أعصاب', 'دماغ', 'مخ'],
    frKeywords: ['neuro', 'cerveau']
  },
  {
    id: 'gastro',
    fr: 'Gastro-Entérologie & Hépatologie',
    frShort: 'Gastro-Entérologie',
    ar: 'أمراض الجهاز الهضمي والكبد',
    arKeywords: ['هضمي', 'كبد', 'معدة', 'أمعاء'],
    frKeywords: ['gastro', 'foie', 'estomac']
  },
  {
    id: 'pneumo',
    fr: 'Pneumologie & Allergologie',
    frShort: 'Pneumologie',
    ar: 'أمراض الرئة والحساسية',
    arKeywords: ['رئة', 'حساسية', 'تنفس', 'صدرية'],
    frKeywords: ['pneumo', 'poumon', 'allergie', 'respir']
  },
  {
    id: 'endocrino',
    fr: 'Endocrinologie & Diabétologie',
    frShort: 'Endocrinologie',
    ar: 'أخصائي الغدد الصماء والسكري',
    arKeywords: ['غدد', 'سكري', 'هرمونات'],
    frKeywords: ['endocrino', 'diabete', 'hormone']
  },
  {
    id: 'urologie',
    fr: 'Chirurgie Urologique & Andrologie',
    frShort: 'Urologie',
    ar: 'جراحة الكلى والمسالك البولية',
    arKeywords: ['كلى', 'مسالك بولية', 'مثانة', 'بروستات'],
    frKeywords: ['uro', 'rein', 'vessie', 'prostate']
  },
  {
    id: 'radiologie',
    fr: 'Radiologie & Imagerie Médicale',
    frShort: 'Radiologie',
    ar: 'التصوير الطبي والأشعة',
    arKeywords: ['أشعة', 'راديو', 'سكانير', 'تصوير طبي'],
    frKeywords: ['radio', 'scanner', 'irm', 'imagerie']
  }
];

// Inverted governorates map: Arabic -> French
const GOVERNORATES_FR = {};
Object.entries(GOVERNORATES_AR || {}).forEach(([frName, arName]) => {
  GOVERNORATES_FR[arName] = frName;
  // Also normalize without definite article "ال"
  if (arName.startsWith('ال')) {
    GOVERNORATES_FR[arName.substring(2)] = frName;
  }
});

// Common delegations translations
const DELEGATIONS_MAP = {
  frToAr: {
    'Centre-Ville': 'وسط المدينة',
    'Centre Urbain Nord': 'المركز العمراني الشمالي',
    'Ennasr': 'النصر',
    'Ennasr 2': 'النصر 2',
    'Le Bardo': 'باردو',
    'Les Berges du Lac': 'ضفاف البحيرة',
    'Les Berges du Lac 1': 'ضفاف البحيرة 1',
    'Les Berges du Lac 2': 'ضفاف البحيرة 2',
    'La Marsa': 'المرسى',
    'Sidi Bou Saïd': 'سيدي بوسعيد',
    'Carthage': 'قرطاج',
    'Mutuelleville': 'ميتيال فيل',
    'El Menzah': 'المنزه',
    'El Menzah 1': 'المنزه 1',
    'El Menzah 5': 'المنزه 5',
    'El Menzah 6': 'المنزه 6',
    'El Menzah 9': 'المنزه 9',
    'El Manar': 'المنار',
    'El Manar 1': 'المنار 1',
    'El Manar 2': 'المنار 2',
    'Djerba': 'جربة',
    'Houmt Souk': 'حومة السوق',
    'Midoun': 'ميدون',
    'Zarzis': 'جرجيس',
    'Hammamet': 'الحمامات',
    'Yasmine Hammamet': 'ياسمين الحمامات',
    'Sousse Ville': 'سوسة المدينة',
    'Sfax Ville': 'صفاقس المدينة',
    'Kébili Ville': 'قبلي المدينة',
    'Monastir Ville': 'المنستير المدينة'
  },
  arToFr: {
    'وسط المدينة': 'Centre-Ville',
    'المركز العمراني الشمالي': 'Centre Urbain Nord',
    'النصر': 'Ennasr',
    'النصر 2': 'Ennasr 2',
    'باردو': 'Le Bardo',
    'ضفاف البحيرة': 'Les Berges du Lac',
    'المرسى': 'La Marsa',
    'سيدي بوسعيد': 'Sidi Bou Saïd',
    'قرطاج': 'Carthage',
    'المنزه': 'El Menzah',
    'المنار': 'El Manar',
    'جربة': 'Djerba',
    'جرجيس': 'Zarzis',
    'الحمامات': 'Hammamet',
    'قبلي المدينة': 'Kébili Ville'
  }
};

/**
 * Resolves doctor specialty in the desired target language (FR or AR).
 * Handles:
 * - Direct doctor object { specialty, specialtyFr, specialtyAr, specialtyId }
 * - Raw specialty string (FR or AR)
 * - Automatic bidirectional cross-translation
 */
export function resolveDoctorSpecialty(doctorOrSpec, targetLang = 'fr') {
  if (!doctorOrSpec) {
    return targetLang === 'ar' ? 'طبيب أخصائي' : 'Médecin Spécialiste';
  }

  let specStr = '';
  let specId = '';
  let explicitAr = '';
  let explicitFr = '';

  if (typeof doctorOrSpec === 'object' && doctorOrSpec !== null) {
    specId = (doctorOrSpec.specialtyId || doctorOrSpec.id || '').toString().toLowerCase().trim();
    explicitAr = (doctorOrSpec.specialtyAr || '').trim();
    explicitFr = (doctorOrSpec.specialtyFr || '').trim();
    specStr = (doctorOrSpec.specialty || explicitFr || explicitAr || '').trim();
  } else if (typeof doctorOrSpec === 'string') {
    specStr = doctorOrSpec.trim();
  }

  const isCurrentArabic = isArabicText(specStr);

  // If Target is ARABIC:
  if (targetLang === 'ar') {
    if (explicitAr && explicitAr !== 'طبيب أخصائي') {
      return explicitAr;
    }
    if (isCurrentArabic && specStr) {
      return specStr;
    }

    // Lookup by ID
    if (specId) {
      const match = SPECIALTIES_DICTIONARY.find(s => s.id === specId);
      if (match) return match.ar;
    }

    // Lookup by French text
    const norm = specStr.toLowerCase();
    const match = SPECIALTIES_DICTIONARY.find(s => {
      const frNorm = s.fr.toLowerCase();
      const frShortNorm = s.frShort.toLowerCase();
      return (
        norm === frNorm ||
        norm === frShortNorm ||
        norm.includes(frShortNorm) ||
        frNorm.includes(norm) ||
        s.frKeywords.some(kw => norm.includes(kw))
      );
    });

    if (match) return match.ar;

    // Check raw SPECIALTIES array from tunisiaData
    const fallbackMatch = (SPECIALTIES || []).find(s => {
      const frNorm = (s.fr || '').toLowerCase();
      return frNorm === norm || norm.includes(frNorm) || frNorm.includes(norm);
    });
    if (fallbackMatch && fallbackMatch.ar) return fallbackMatch.ar;

    return specStr || 'طبيب أخصائي';
  }

  // If Target is FRENCH:
  if (targetLang === 'fr') {
    if (explicitFr && explicitFr !== 'Médecin Spécialiste' && !isArabicText(explicitFr)) {
      return explicitFr;
    }
    if (!isCurrentArabic && specStr) {
      return specStr;
    }

    // Specialty is in Arabic, resolve to French
    if (specId) {
      const match = SPECIALTIES_DICTIONARY.find(s => s.id === specId);
      if (match) return match.fr;
    }

    // Match against Arabic keywords or Arabic specialty strings
    const match = SPECIALTIES_DICTIONARY.find(s => {
      if (specStr === s.ar || specStr.includes(s.ar) || s.ar.includes(specStr)) return true;
      return s.arKeywords.some(kw => specStr.includes(kw));
    });

    if (match) return match.fr;

    // Check raw SPECIALTIES from tunisiaData
    const fallbackMatch = (SPECIALTIES || []).find(s => {
      const arNorm = s.ar || '';
      return arNorm === specStr || specStr.includes(arNorm) || arNorm.includes(specStr);
    });
    if (fallbackMatch && fallbackMatch.fr) return fallbackMatch.fr;

    return 'Médecin Spécialiste';
  }

  return specStr;
}

/**
 * Resolves doctor city / governorate bidirectionally (FR <-> AR).
 */
export function resolveDoctorCity(cityOrLoc, targetLang = 'fr') {
  if (!cityOrLoc || typeof cityOrLoc !== 'string') {
    return targetLang === 'ar' ? 'تونس' : 'Tunis';
  }

  const trimmed = cityOrLoc.trim();
  const isInputArabic = isArabicText(trimmed);

  if (targetLang === 'ar') {
    if (isInputArabic) return trimmed;

    // Check direct governorate mapping
    if (GOVERNORATES_AR[trimmed]) {
      return GOVERNORATES_AR[trimmed];
    }

    // Check delegation mapping
    if (DELEGATIONS_MAP.frToAr[trimmed]) {
      return DELEGATIONS_MAP.frToAr[trimmed];
    }

    // Handle "City (Delegation)" format e.g. "Tunis (Centre-Ville)"
    const match = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      const cityPart = match[1].trim();
      const delegPart = match[2].trim();
      const arCity = GOVERNORATES_AR[cityPart] || cityPart;
      const arDeleg = DELEGATIONS_MAP.frToAr[delegPart] || delegPart;
      return `${arCity} (${arDeleg})`;
    }

    // Substring lookup in governorates
    for (const [frGov, arGov] of Object.entries(GOVERNORATES_AR)) {
      if (trimmed.toLowerCase().includes(frGov.toLowerCase())) {
        return trimmed.replace(new RegExp(frGov, 'i'), arGov);
      }
    }

    return trimmed;
  }

  // targetLang === 'fr'
  if (targetLang === 'fr') {
    if (!isInputArabic) return trimmed;

    // Check direct Arabic governorate reverse map
    if (GOVERNORATES_FR[trimmed]) {
      return GOVERNORATES_FR[trimmed];
    }

    // Check Arabic delegation map
    if (DELEGATIONS_MAP.arToFr[trimmed]) {
      return DELEGATIONS_MAP.arToFr[trimmed];
    }

    // Handle "المدينة (المنطقة)"
    const match = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      const cityPart = match[1].trim();
      const delegPart = match[2].trim();
      const frCity = GOVERNORATES_FR[cityPart] || cityPart;
      const frDeleg = DELEGATIONS_MAP.arToFr[delegPart] || delegPart;
      return `${frCity} (${frDeleg})`;
    }

    // Substring lookup
    for (const [arGov, frGov] of Object.entries(GOVERNORATES_FR)) {
      if (trimmed.includes(arGov)) {
        return trimmed.replace(arGov, frGov);
      }
    }

    return trimmed;
  }

  return trimmed;
}

/**
 * Resolves doctor title bidirectionally (e.g. "Médecin Praticien Agréé" <-> "طبيب ممارس معتمد")
 */
export function resolveDoctorTitle(title, targetLang = 'fr') {
  if (!title || typeof title !== 'string') {
    return targetLang === 'ar' ? 'طبيب ممارس معتمد' : 'Médecin Praticien Agréé';
  }

  const trimmed = title.trim();
  const isInputArabic = isArabicText(trimmed);

  const titlePairs = [
    { fr: 'Médecin Praticien Agréé', ar: 'طبيب ممارس معتمد' },
    { fr: 'Ancien Interne des Hôpitaux de Tunis', ar: 'طبيب داخلي سابق بمستشفيات تونس' },
    { fr: 'Ancien Interne des Hôpitaux', ar: 'طبيب داخلي سابق بالمستشفيات' },
    { fr: 'Professeur Universitaire', ar: 'أستاذ استشفائي جامعي' },
    { fr: 'Chef de Clinique', ar: 'رئيس قسم استشفائي سابق' },
    { fr: 'Chirurgien Dentiste', ar: 'طبيب جراح أسنان' },
    { fr: 'Médecin Spécialiste', ar: 'طبيب أخصائي' }
  ];

  if (targetLang === 'ar') {
    if (isInputArabic) return trimmed;
    const match = titlePairs.find(p => p.fr.toLowerCase() === trimmed.toLowerCase() || trimmed.toLowerCase().includes(p.fr.toLowerCase()));
    return match ? match.ar : (trimmed || 'طبيب ممارس معتمد');
  }

  if (targetLang === 'fr') {
    if (!isInputArabic) return trimmed;
    const match = titlePairs.find(p => p.ar === trimmed || trimmed.includes(p.ar));
    return match ? match.fr : 'Médecin Praticien Agréé';
  }

  return trimmed;
}

/**
 * Resolves standard badge texts bidirectionally
 */
export function resolveBadge(badgeText, targetLang = 'fr') {
  if (!badgeText || typeof badgeText !== 'string') return '';
  const trimmed = badgeText.trim();
  const isInputArabic = isArabicText(trimmed);

  const badgePairs = [
    { fr: 'Conventionné CNAM', ar: 'متعاقد مع الكنام' },
    { fr: 'Téléconsultation vidéo disponible', ar: 'استشارة طبية عن بعد متاحة' },
    { fr: 'Praticien Vérifié SahaTN', ar: 'طبيب معتمد وموثق SahaTN' },
    { fr: 'Praticien Vérifié Maw2idi', ar: 'طبيب معتمد وموثق Maw2idi' },
    { fr: 'Secteur Libre', ar: 'قطاع حر' },
    { fr: 'Disponible Aujourd\'hui', ar: 'متاح اليوم' },
    { fr: 'Recommandé', ar: 'موصى به' }
  ];

  if (targetLang === 'ar') {
    if (isInputArabic) return trimmed;
    const match = badgePairs.find(p => p.fr.toLowerCase() === trimmed.toLowerCase());
    return match ? match.ar : trimmed;
  }

  if (targetLang === 'fr') {
    if (!isInputArabic) return trimmed;
    const match = badgePairs.find(p => p.ar === trimmed);
    return match ? match.fr : trimmed;
  }

  return trimmed;
}

/**
 * Enhanced bidirectional dictionary for doctor names in Tunisia
 */
const DOCTOR_FULL_NAMES_AR = {
  'Walid Mansour': 'وليد منصور',
  'Selim Ben Ali': 'سليم بن علي',
  'Meriem Karray': 'مريم كراي',
  'Hichem Ayari': 'هشام العياري',
  'Walid Ben Salem': 'وليد بن سالم',
  'Louay Rabeh': 'لؤي رابح',
  'Amine Bensalem': 'أمين بن سالم',
  'Nour Ben Amor': 'نور بن عمر',
  'Tarak Ben Mahmoud': 'طارق بن محمود',
  'Sami Mansouri': 'سامي المنصوري',
  'Yassine Jaziri': 'ياسين الجزيري',
  'Fatma Zghal': 'فاطمة الزغل',
  'Karim Bouazizi': 'كريم البوعزيزي',
  'Ines Trabelsi': 'إيناس الطرابلسي',
  'Zied Chaabane': 'زياد شعبان',
  'Leila Belhadj': 'ليلى بالحاج',
  'Ahmed Gharbi': 'أحمد الغربي',
  'Olfa Driss': 'ألفة دريس',
  'Mehdi Masmoudi': 'مهدي المصمودي',
  'Rim Snoussi': 'ريم السنوسي',
  'Mohamed Triki': 'محمد التريكي',
  'Salma Khemir': 'سلمى الخمير',
  'Mourad Cheikh': 'مراد الشيخ',
  'Hager Zouari': 'هاجر الزواري',
  'Anis Ben Romdhane': 'أنيس بن رمضان',
  'Chiraz Baccouche': 'شيراز بكوش',
  'Nizar Guediche': 'نزار قديش',
  'Asma Ben Salah': 'أسماء بن صالح',
  'Hamza Mahfoudh': 'حمزة محفوظ',
  'Sonia Meziou': 'سونيا مـزيو',
  'Kais Rekik': 'قيس الرقيق',
  'Dorsaf Mkaouar': 'درصاف مقور',
  'Wael Ben Amor': 'وائل بن عمر',
  'Jihene Fakhfakh': 'جيهان فخفاخ',
  'Marwen Guiga': 'مروان قيقة',
  'Rania Louati': 'رانيا اللواتي',
  'Khaled Ben Abdallah': 'خالد بن عبد الله',
  'Nesrine Jrad': 'نسرين جراد',
  'Bilel Hammami': 'بلال الهمامي',
  'Souhir Ayed': 'سهير عايد',
  'Maher Chahed': 'ماهر الشاهد',
  'Yosra Ben Ammar': 'يسرى بن عمار',
  'Moez Trabelsi': 'معز الطرابلسي',
  'Cyrine Belkhodja': 'سيرين بلخوجة',
  'Wissem Ben Youssef': 'وسام بن يوسف',
  'Sabrine Karoui': 'صابرين القروي',
  'Elyes Ben Cheikh': 'إلياس بن الشيخ',
  'Nadia Miled': 'نادية ميلاد',
  'Fedi Ben Hmida': 'فادي بن حميدة',
  'Monia Sellami': 'منية السلامي',
  'Aymen Ben Rejeb': 'أيمن بن رجب',
  'Imen Daoud': 'إيمان داود',
  'Slimane Ben Hassine': 'سليمان بن حسين',
  'Lamia Bousetta': 'لامية بوستة',
  'Taha Jerbi': 'طه الجربي',
  'Manel Khemakhem': 'منال خماخم',
  'Raouf Ben Fredj': 'رؤوف بن فرج',
  'Leila Chaari': 'ليلى الشعري',
  'Sofiene Ben Othman': 'سفيان بن عثمان',
  'Nawel Ben Slimane': 'نوال بن سليمان',
  'Mondher Toumi': 'المنذر التومي',
  'Sarra Ben Mustapha': 'سارة بن مصطفى',
  'Hatem Ben Salem': 'حاتم بن سالم',
  'Emna Ben Romdhane': 'آمنة بن رمضان',
  'Riadh Ben Mansour': 'رياض بن منصور',
  'Houda Ben Saida': 'هدى بن سعيدة',
  'Lotfi Ben Ahmed': 'لطفي بن أحمد',
  'Samia Ben Amara': 'سامية بن عمارة',
  'Habib Ben Lazreg': 'الحبيب بن لزرق',
  'Najla Ben Amor': 'نجلاء بن عمر',
  'Fethi Ben Rebah': 'فتحي بن رباح',
  'Boutheina Ben Cheikh': 'بثينة بن الشيخ',
  'Taoufik Ben Ayed': 'توفيق بن عايد',
  'Sonia Ben Messaoud': 'سونيا بن مسعود',
  'Kamel Ben Hassine': 'كمال بن حسين',
  'Faiza Ben Slimen': 'فائزة بن سليمان',
  'Ridha Ben Mahmoud': 'رضا بن محمود',
  'Zeineb Ben Othmane': 'زينب بن عثمان',
  'Chokri Ben Youssef': 'شكري بن يوسف',
  'Ahlem Ben Brahim': 'أحلام بن إبراهيم',
  'Mongi Ben Salah': 'المنجي بن صالح',
  'Raja Ben Fredj': 'رجاء بن فرج',
  'Adel Ben Romdhane': 'عادل بن رمضان',
  'Wafa Ben Mansour': 'وفاء بن منصور',
  'Sadok Ben Hamida': 'الصادق بن حميدة',
  'Fatma Ben Ali': 'فاطمة بن علي',
  'edhib mohamed': 'محمد الذيب',
  'loula loula': 'لولا لولا'
};

const DOCTOR_FIRST_NAMES_AR = {
  'walid': 'وليد',
  'selim': 'سليم',
  'salim': 'سليم',
  'meriem': 'مريم',
  'myriam': 'مريم',
  'mariem': 'مريم',
  'hichem': 'هشام',
  'hisham': 'هشام',
  'louay': 'لؤي',
  'loay': 'لؤي',
  'amine': 'أمين',
  'nour': 'نور',
  'tarak': 'طارق',
  'tarek': 'طارق',
  'sami': 'سامي',
  'yassine': 'ياسين',
  'yassin': 'ياسين',
  'fatma': 'فاطمة',
  'karim': 'كريم',
  'ines': 'إيناس',
  'zied': 'زياد',
  'ziad': 'زياد',
  'leila': 'ليلى',
  'ahmed': 'أحمد',
  'olfa': 'ألفة',
  'mehdi': 'مهدي',
  'rim': 'ريم',
  'rima': 'ريما',
  'mohamed': 'محمد',
  'salma': 'سلمى',
  'mourad': 'مراد',
  'hager': 'هاجر',
  'anis': 'أنيس',
  'chiraz': 'شيراز',
  'nizar': 'نزار',
  'asma': 'أسماء',
  'hamza': 'حمزة',
  'sonia': 'سونيا',
  'kais': 'قيس',
  'dorsaf': 'درصاف',
  'wael': 'وائل',
  'jihene': 'جيهان',
  'marwen': 'مروان',
  'marouane': 'مروان',
  'marouen': 'مروان',
  'rania': 'رانيا',
  'khaled': 'خالد',
  'nesrine': 'نسرين',
  'bilel': 'بلال',
  'souhir': 'سهير',
  'maher': 'ماهر',
  'yosra': 'يسرى',
  'moez': 'معز',
  'cyrine': 'سيرين',
  'wissem': 'وسام',
  'sabrine': 'صابرين',
  'elyes': 'إلياس',
  'nadia': 'نادية',
  'fedi': 'فادي',
  'monia': 'منية',
  'aymen': 'أيمن',
  'imen': 'إيمان',
  'slimane': 'سليمان',
  'slim': 'سليم',
  'lamia': 'لامية',
  'taha': 'طه',
  'manel': 'منال',
  'raouf': 'رؤوف',
  'sofiene': 'سفيان',
  'nawel': 'نوال',
  'mondher': 'المنذر',
  'sarra': 'سارة',
  'sara': 'سارة',
  'hatem': 'حاتم',
  'emna': 'آمنة',
  'riadh': 'رياض',
  'houda': 'هدى',
  'lotfi': 'لطفي',
  'samia': 'سامية',
  'habib': 'الحبيب',
  'najla': 'نجلاء',
  'fethi': 'فتحي',
  'boutheina': 'بثينة',
  'taoufik': 'توفيق',
  'kamel': 'كمال',
  'faiza': 'فائزة',
  'ridha': 'رضا',
  'zeineb': 'زينب',
  'chokri': 'شكري',
  'ahlem': 'أحلام',
  'mongi': 'المنجي',
  'raja': 'رجاء',
  'adel': 'عادل',
  'wafa': 'وفاء',
  'sadok': 'الصادق',
  'ali': 'علي',
  'edhib': 'الذيب'
};

const DOCTOR_LAST_NAMES_AR = {
  'mansour': 'منصور',
  'mansouri': 'المنصوري',
  'ben ali': 'بن علي',
  'karray': 'كراي',
  'ayari': 'العياري',
  'ben salem': 'بن سالم',
  'rabeh': 'رابح',
  'bensalem': 'بن سالم',
  'ben amor': 'بن عمر',
  'ben mahmoud': 'بن محمود',
  'jaziri': 'الجزيري',
  'zghal': 'الزغل',
  'bouazizi': 'البوعزيزي',
  'trabelsi': 'الطرابلسي',
  'chaabane': 'شعبان',
  'belhadj': 'بالحاج',
  'gharbi': 'الغربي',
  'driss': 'دريس',
  'masmoudi': 'المصمودي',
  'snoussi': 'السنوسي',
  'triki': 'التريكي',
  'khemir': 'الخمير',
  'cheikh': 'الشيخ',
  'zouari': 'الزواري',
  'ben romdhane': 'بن رمضان',
  'baccouche': 'بكوش',
  'guediche': 'قديش',
  'ben salah': 'بن صالح',
  'mahfoudh': 'محفوظ',
  'meziou': 'مـزيو',
  'rekik': 'الرقيق',
  'mkaouar': 'مقور',
  'fakhfakh': 'فخفاخ',
  'guiga': 'قيقة',
  'louati': 'اللواتي',
  'ben abdallah': 'بن عبد الله',
  'jrad': 'جراد',
  'hammami': 'الهمامي',
  'ayed': 'عايد',
  'chahed': 'الشاهد',
  'ben ammar': 'بن عمار',
  'belkhodja': 'بلخوجة',
  'ben youssef': 'بن يوسف',
  'karoui': 'القروي',
  'ben cheikh': 'بن الشيخ',
  'miled': 'ميلاد',
  'ben hmida': 'بن حميدة',
  'sellami': 'السلامي',
  'ben rejeb': 'بن رجب',
  'daoud': 'داود',
  'ben hassine': 'بن حسين',
  'bousetta': 'بوستة',
  'jerbi': 'الجربي',
  'khemakhem': 'خماخم',
  'ben fredj': 'بن فرج',
  'chaari': 'الشعري',
  'ben othman': 'بن عثمان',
  'ben othmane': 'بن عثمان',
  'ben slimane': 'بن سليمان',
  'ben slimen': 'بن سليمان',
  'toumi': 'التومي',
  'ben mustapha': 'بن مصطفى',
  'ben saida': 'بن سعيدة',
  'ben ahmed': 'بن أحمد',
  'ben amara': 'بن عمارة',
  'ben lazreg': 'بن لزرق',
  'ben rebah': 'بن رباح',
  'ben messaoud': 'بن مسعود',
  'ben brahim': 'بن إبراهيم',
  'ben hamida': 'بن حميدة'
};

/**
 * Strips any leading doctor prefixes ("Dr.", "Dr", "Docteur", "Doctor", "د.", "د", "طبيب")
 * repeatedly so no duplicate prefixes remain, e.g. "Dr. Dr. Sami Mansouri" -> "Sami Mansouri".
 */
export function cleanDoctorName(name) {
  if (!name) return '';
  let str = String(name).trim();
  while (/^(dr\.?|docteur|doctor|د\.?|طبيب)\s+/i.test(str)) {
    str = str.replace(/^(dr\.?|docteur|doctor|د\.?|طبيب)\s+/i, '').trim();
  }
  return str;
}

/**
 * Formats a doctor's name cleanly with a single fixed Dr. or د. prefix
 */
export function formatDoctorName(name, isAr = false) {
  const clean = cleanDoctorName(name);
  if (!clean) return isAr ? 'د.' : 'Dr.';
  return isAr ? `د. ${clean}` : `Dr. ${clean}`;
}

/**
 * Resolves doctor name bidirectionally (FR <-> AR) with intelligent transliteration.
 */
export function resolveDoctorName(doctorOrName, targetLang = 'fr') {
  if (!doctorOrName) return targetLang === 'ar' ? 'د. طبيب' : 'Dr. Médecin';

  let rawName = '';
  let explicitAr = '';
  let explicitFr = '';

  if (typeof doctorOrName === 'object' && doctorOrName !== null) {
    explicitAr = doctorOrName.nameAr || doctorOrName.name_ar || '';
    explicitFr = doctorOrName.nameFr || doctorOrName.name_fr || doctorOrName.name || '';
    rawName = (doctorOrName.name || doctorOrName.nameAr || '').trim();
  } else if (typeof doctorOrName === 'string') {
    rawName = doctorOrName.trim();
  }

  // Clean any existing prefixes first to prevent "Dr. Dr." or "د. د."
  const cleanRaw = cleanDoctorName(rawName);
  const cleanExplicitAr = cleanDoctorName(explicitAr);
  const cleanExplicitFr = cleanDoctorName(explicitFr);

  if (targetLang === 'ar') {
    if (cleanExplicitAr && isArabicText(cleanExplicitAr)) {
      return `د. ${cleanExplicitAr}`;
    }
    if (isArabicText(cleanRaw)) {
      return `د. ${cleanRaw}`;
    }

    const cleanLower = cleanRaw.toLowerCase();

    // Check direct known dictionary matches (case-insensitive)
    for (const [frPattern, arTrans] of Object.entries(DOCTOR_FULL_NAMES_AR)) {
      if (cleanLower === frPattern.toLowerCase()) {
        return `د. ${arTrans}`;
      }
    }

    // Attempt word-by-word mapping
    const parts = cleanLower.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      let firstNameAr = DOCTOR_FIRST_NAMES_AR[parts[0]];
      let rest = parts.slice(1).join(' ');
      let lastNameAr = DOCTOR_LAST_NAMES_AR[rest] || DOCTOR_FIRST_NAMES_AR[rest];

      if (firstNameAr && lastNameAr) {
        return `د. ${firstNameAr} ${lastNameAr}`;
      }

      if (firstNameAr) {
        return `د. ${firstNameAr} ${parts.slice(1).map(p => DOCTOR_LAST_NAMES_AR[p] || DOCTOR_FIRST_NAMES_AR[p] || p).join(' ')}`;
      }
    } else if (parts.length === 1 && DOCTOR_FIRST_NAMES_AR[parts[0]]) {
      return `د. ${DOCTOR_FIRST_NAMES_AR[parts[0]]}`;
    }

    // Fallback for custom/unregistered names: format cleanly in Arabic without punctuation jump
    return cleanRaw ? `د. ${cleanRaw}` : 'د. طبيب';
  }

  // targetLang === 'fr'
  if (cleanExplicitFr && !isArabicText(cleanExplicitFr)) {
    return `Dr. ${cleanExplicitFr}`;
  }
  if (!isArabicText(cleanRaw)) {
    return cleanRaw ? `Dr. ${cleanRaw}` : 'Dr. Médecin';
  }

  // Raw name is Arabic, try to reverse-resolve to French
  for (const [frPattern, arTrans] of Object.entries(DOCTOR_FULL_NAMES_AR)) {
    if (cleanRaw === arTrans || cleanRaw.includes(arTrans)) {
      return `Dr. ${frPattern}`;
    }
  }

  return `Dr. ${cleanRaw}`;
}

/**
 * Resolves doctor address bidirectionally (e.g. "Cabinet Médical, Monastir" <-> "عيادة طبية، المنستير")
 */
export function resolveDoctorAddress(address, city, targetLang = 'fr') {
  const normCity = resolveDoctorCity(city, targetLang);

  if (!address || typeof address !== 'string') {
    return targetLang === 'ar' ? `عيادة طبية، ${normCity}` : `Cabinet Médical, ${normCity}`;
  }

  const trimmed = address.trim();
  const isInputArabic = isArabicText(trimmed);

  if (targetLang === 'ar') {
    if (isInputArabic) return trimmed;

    if (/^cabinet\s+m[eé]dical/i.test(trimmed)) {
      return `عيادة طبية، ${normCity}`;
    }

    let res = trimmed;
    res = res.replace(/cabinet\s+m[eé]dical/gi, 'عيادة طبية');
    res = res.replace(/centre\s+m[eé]dical/gi, 'مركز طبي');
    res = res.replace(/polyclinique/gi, 'مجمع طبي');
    res = res.replace(/clinique/gi, 'مصحة');
    res = res.replace(/avenue/gi, 'شارع');
    res = res.replace(/av\./gi, 'شارع');
    res = res.replace(/rue/gi, 'نهج');
    res = res.replace(/r[eé]sidence/gi, 'إقامة');
    res = res.replace(/immeuble/gi, 'عمارة');
    res = res.replace(/bloc/gi, 'جناح');
    res = res.replace(/[eé]tage/gi, 'طابق');
    res = res.replace(/tunisie/gi, 'تونس');

    // Replace governorates and delegations
    for (const [frGov, arGov] of Object.entries(GOVERNORATES_AR)) {
      res = res.replace(new RegExp(`\\b${frGov}\\b`, 'gi'), arGov);
    }
    for (const [frDel, arDel] of Object.entries(DELEGATIONS_MAP.frToAr)) {
      res = res.replace(new RegExp(`\\b${frDel}\\b`, 'gi'), arDel);
    }

    return res;
  }

  // targetLang === 'fr'
  if (!isInputArabic) return trimmed;

  if (trimmed.startsWith('عيادة طبية')) {
    return `Cabinet Médical, ${normCity}`;
  }

  let res = trimmed;
  res = res.replace(/عيادة طبية/g, 'Cabinet Médical');
  res = res.replace(/مركز طبي/g, 'Centre Médical');
  res = res.replace(/مصحة/g, 'Clinique');
  res = res.replace(/مجمع طبي/g, 'Polyclinique');
  res = res.replace(/شارع/g, 'Avenue');
  res = res.replace(/نهج/g, 'Rue');
  res = res.replace(/إقامة/g, 'Résidence');
  res = res.replace(/عمارة/g, 'Immeuble');
  res = res.replace(/طابق/g, 'Étage');

  for (const [frGov, arGov] of Object.entries(GOVERNORATES_AR)) {
    res = res.replace(new RegExp(arGov, 'g'), frGov);
  }
  for (const [frDel, arDel] of Object.entries(DELEGATIONS_MAP.frToAr)) {
    res = res.replace(new RegExp(arDel, 'g'), frDel);
  }

  return res;
}

/**
 * Resolves consultation act name bidirectionally
 * (e.g., "Consultation Cardiologie" <-> "فحص واستشارة أمراض القلب")
 */
export function resolveActName(act, targetLang = 'fr') {
  if (!act || typeof act !== 'string') {
    return targetLang === 'ar' ? 'استشارة طبية' : 'Consultation Médicale';
  }

  const trimmed = act.trim();
  const isInputArabic = isArabicText(trimmed);

  const ACT_DICTIONARY = [
    {
      fr: 'Consultation Cardiologie',
      ar: 'فحص واستشارة أمراض القلب',
      matches: [/consultation.*cardio/i, /استشارة.*قلب/, /فحص.*قلب/]
    },
    {
      fr: 'Consultation + ECG',
      ar: 'استشارة وفحص تخطيط القلب (ECG)',
      matches: [/ecg/i, /تخطيط.*قلب/]
    },
    {
      fr: 'Contrôle Tension',
      ar: 'مراقبة ضغط الدم',
      matches: [/tension/i, /ضغط.*دم/]
    },
    {
      fr: 'Consultation Spontanée',
      ar: 'استشارة فورية (بدون موعد)',
      matches: [/spontan/i, /فور/i, /بدون موعد/]
    },
    {
      fr: 'Consultation Spécialisée',
      ar: 'استشارة تخصصية',
      matches: [/sp[eé]cialis/i, /تخصص/]
    },
    {
      fr: 'Consultation Pédiatrie',
      ar: 'استشارة طب الأطفال',
      matches: [/p[eé]diatr/i, /أطفال/]
    },
    {
      fr: 'Consultation Gynécologie',
      ar: 'استشارة أمراض النساء والتوليد',
      matches: [/gyn[eé]co/i, /نساء/]
    },
    {
      fr: 'Consultation Dentaire',
      ar: 'استشارة طب الأسنان',
      matches: [/dent/i, /أسنان/]
    },
    {
      fr: 'Détartrage',
      ar: 'تنظيف وتلميع الأسنان',
      matches: [/d[eé]tartr/i, /تنظيف.*أسنان/]
    },
    {
      fr: 'Consultation Générale',
      ar: 'استشارة في الطب العام',
      matches: [/g[eé]n[eé]ral/i, /عام/]
    },
    {
      fr: 'Échographie',
      ar: 'فحص بالصدى (إيكوغرافيا)',
      matches: [/echo/i, /[eé]cho/i, /صدى/, /إيكو/]
    },
    {
      fr: 'Consultation de Suivi',
      ar: 'استشارة متابعة',
      matches: [/suivi/i, /متابعة/, /مراقبة/]
    },
    {
      fr: 'Consultation Médicale',
      ar: 'استشارة طبية',
      matches: [/consultation/i, /استشارة/, /فحص/]
    }
  ];

  for (const item of ACT_DICTIONARY) {
    if (item.matches.some(rx => rx.test(trimmed))) {
      return targetLang === 'ar' ? item.ar : item.fr;
    }
  }

  if (targetLang === 'ar' && isInputArabic) return trimmed;
  if (targetLang === 'fr' && !isInputArabic) return trimmed;

  if (targetLang === 'ar') {
    return trimmed.replace(/^Consultation\s+/i, 'استشارة ');
  } else {
    return trimmed.replace(/^استشارة\s+/i, 'Consultation ');
  }
}

/**
 * Resolves CNAM regime bidirectionally
 * (e.g., "Filière Privée" <-> "القطاع الخاص")
 */
export function resolveCnamRegime(regime, targetLang = 'fr') {
  if (!regime || typeof regime !== 'string') {
    return targetLang === 'ar' ? 'القطاع الخاص' : 'Filière Privée';
  }

  const trimmed = regime.trim();
  const isInputArabic = isArabicText(trimmed);

  const REGIMES = [
    {
      fr: 'Filière Privée',
      ar: 'القطاع الخاص',
      matches: [/priv[eé]/i, /خاص/]
    },
    {
      fr: 'Filière Publique',
      ar: 'القطاع العمومي',
      matches: [/publi/i, /عموم/]
    },
    {
      fr: 'Remboursement',
      ar: 'نظام استرجاع المصاريف',
      matches: [/rembours/i, /استرجاع/]
    },
    {
      fr: 'Conventionné CNAM',
      ar: 'متعاقد مع الكنام',
      matches: [/convention/i, /متعاقد/]
    },
    {
      fr: 'Non Conventionné',
      ar: 'غير متعاقد مع الكنام',
      matches: [/non\s*convention/i, /غير متعاقد/]
    }
  ];

  for (const item of REGIMES) {
    if (item.matches.some(rx => rx.test(trimmed))) {
      return targetLang === 'ar' ? item.ar : item.fr;
    }
  }

  if (targetLang === 'ar' && isInputArabic) return trimmed;
  if (targetLang === 'fr' && !isInputArabic) return trimmed;

  return trimmed;
}

export default {
  cleanDoctorName,
  formatDoctorName,
  resolveDoctorName,
  resolveDoctorAddress,
  resolveDoctorSpecialty,
  resolveDoctorCity,
  resolveDoctorTitle,
  resolveBadge,
  resolveActName,
  resolveCnamRegime
};

