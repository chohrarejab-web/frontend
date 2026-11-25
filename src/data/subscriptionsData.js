/**
 * SahaTN Subscriptions & Pricing Data Service
 * 
 * Centralise les formules d'abonnements, les tarifs mensuels/annuels,
 * les taux de réduction et les listes de fonctionnalités.
 * Permet à l'administration de modifier, masquer ou afficher les offres
 * avec persistance automatique et synchronisation en direct.
 */

export const SUBSCRIPTION_STORAGE_KEY = 'sahatn_custom_subscription_plans';
export const SUBSCRIPTION_BROADCAST_CHANNEL = 'sahatn_subscriptions_sync';

function notifySubscribers() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event('sahatn:subscriptions_updated'));
  } catch (e) { }
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(SUBSCRIPTION_BROADCAST_CHANNEL);
      channel.postMessage({ type: 'UPDATED', time: Date.now() });
      channel.close();
    }
  } catch (e) { }
}

/**
 * Abonnement multi-onglets réactif en temps réel
 */
export function subscribeToSubscriptionChanges(callback) {
  if (typeof window === 'undefined') return () => {};
  
  const handleEvent = () => {
    try {
      callback(getSubscriptionPlans());
    } catch (e) { }
  };

  const handleStorage = (e) => {
    if (!e.key || e.key === SUBSCRIPTION_STORAGE_KEY) {
      handleEvent();
    }
  };

  window.addEventListener('sahatn:subscriptions_updated', handleEvent);
  window.addEventListener('storage', handleStorage);

  let bc = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(SUBSCRIPTION_BROADCAST_CHANNEL);
      bc.onmessage = () => handleEvent();
    }
  } catch (e) { }

  return () => {
    window.removeEventListener('sahatn:subscriptions_updated', handleEvent);
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      try { bc.close(); } catch (e) { }
    }
  };
}

export const DEFAULT_PLANS = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    nameAr: 'الأساسية (Essentiel)',
    description: 'Pour médecin libéral individuel souhaitant digitaliser ses RDV.',
    descriptionAr: 'للطبيب الممارس المستقل لتنظيم مواعيده رقمياً وبأقل تكلفة.',
    badgeFr: 'Solo & Début',
    badgeAr: 'طبيب منفرد',
    ribbonFr: '',
    ribbonAr: '',
    monthlyPrice: 59,
    discountPercentage: 15,
    isRecommended: false,
    active: true,
    order: 1,
    features: [
      { id: 'f1', textFr: 'Prise de RDV en ligne 24h/7j', textAr: 'حجز المواعيد أونلاين 24/7' },
      { id: 'f2', textFr: 'Rappels SMS & WhatsApp', textAr: 'تذكير آلي عبر SMS والواتساب' },
      { id: 'f3', textFr: 'Référencement sur la carte SahaTN', textAr: 'الظهور على خريطة ودليل SahaTN' }
    ]
  },
  {
    id: 'pro',
    name: 'Pro Cabinet',
    nameAr: 'المحترفة (Pro Cabinet)',
    description: "La solution complète : file d'attente, CNAM et ordonnancier.",
    descriptionAr: 'الحل الشامل: قاعة انتظار ذكية، الكنام والوصفات الرقمية.',
    badgeFr: 'Cabinet Moderne',
    badgeAr: 'عيادة متطورة',
    ribbonFr: '⭐ Recommandé / Cabinet',
    ribbonAr: '⭐ الأكثر طلباً / للعيادات',
    monthlyPrice: 99,
    discountPercentage: 15,
    isRecommended: true,
    active: true,
    order: 2,
    features: [
      { id: 'f4', textFr: 'Tout dans Essentiel', textAr: 'كل ميزات الباقة الأساسية', isBold: true },
      { id: 'f5', textFr: "File d'attente virtuelle en direct", textAr: 'قاعة انتظار ذكية وبث مباشر للدور', isBold: true },
      { id: 'f6', textFr: 'Télétransmission & Bordereaux CNAM C1', textAr: 'استمارات وتصاريح الكنام C1 الرقمية' },
      { id: 'f7', textFr: 'Ordonnancier PCT & Fiches patients', textAr: 'وصفات طبية مشفرة وملفات المرضى' },
      { id: 'f8', textFr: 'Module Téléconsultation vidéo HD', textAr: 'استشارات طبية بالفيديو عالية الدقة' }
    ]
  },
  {
    id: 'clinique',
    name: 'Clinique & Groupe',
    nameAr: 'المصحات والمجمعات (Clinique)',
    description: 'Pour centres médicaux, polycliniques et cabinets partagés.',
    descriptionAr: 'للمراكز الطبية والمجمعات الطبية متعددة الأطباء.',
    badgeFr: 'Multi-Praticiens',
    badgeAr: 'مراكز طبية ومصحات',
    ribbonFr: '',
    ribbonAr: '',
    monthlyPrice: 189,
    discountPercentage: 15,
    isRecommended: false,
    active: true,
    order: 3,
    features: [
      { id: 'f9', textFr: 'Tout dans Pro Cabinet', textAr: 'كل ميزات باقة المحترف' },
      { id: 'f10', textFr: 'Multi-comptes praticiens & secrétariats', textAr: 'حسابات متعددة للأطباء وسكرتارية العيادة' },
      { id: 'f11', textFr: 'Module IA Clinique DocBot intégré', textAr: 'نظام الذكاء الاصطناعي الطبي المساعد' },
      { id: 'f12', textFr: 'Ligne support VIP 24h/24 dédiée', textAr: 'دعم فني وأولوية قصوى 24/7' }
    ]
  }
];

/**
 * Calcule tous les montants annuels, remises et économies pour un plan donné
 */
export function calculatePlanPricing(plan) {
  const monthlyPrice = Number(plan.monthlyPrice) || 0;
  const discountPercentage = Number(plan.discountPercentage) || 0;
  const discountRate = discountPercentage / 100;
  const normalAnnualTotal = Math.round(monthlyPrice * 12 * 10) / 10;
  const annualTotal = Math.round(monthlyPrice * 12 * (1 - discountRate) * 10) / 10;
  const annualMonthlyRate = Math.round((annualTotal / 12) * 100) / 100;
  const annualMonthlyRounded = Math.round(annualMonthlyRate);
  const annualSavings = Math.round((normalAnnualTotal - annualTotal) * 10) / 10;

  return {
    ...plan,
    monthlyPrice,
    discountPercentage,
    discountRate,
    normalAnnualTotal,
    annualTotal,
    annualMonthlyRate,
    annualMonthlyRounded,
    annualSavings
  };
}

/**
 * Récupère la liste des abonnements (depuis localStorage ou valeurs par défaut)
 */
export function getSubscriptionPlans() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(calculatePlanPricing);
        }
      }
    }
  } catch (e) {
    console.error('Erreur chargement abonnements:', e);
  }
  return DEFAULT_PLANS.map(calculatePlanPricing);
}

/**
 * Sauvegarde la liste modifiée des abonnements
 */
export function saveSubscriptionPlans(plans) {
  try {
    const serialized = plans.map(p => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr || p.name,
      description: p.description || '',
      descriptionAr: p.descriptionAr || p.description || '',
      badgeFr: p.badgeFr || '',
      badgeAr: p.badgeAr || p.badgeFr || '',
      ribbonFr: p.ribbonFr || '',
      ribbonAr: p.ribbonAr || p.ribbonFr || '',
      monthlyPrice: Number(p.monthlyPrice) || 0,
      discountPercentage: Number(p.discountPercentage) || 0,
      isRecommended: Boolean(p.isRecommended),
      active: p.active !== false,
      order: p.order || 1,
      features: Array.isArray(p.features) ? p.features : []
    }));

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(serialized));
      notifySubscribers();
    }
    return true;
  } catch (e) {
    console.error('Erreur sauvegarde abonnements:', e);
    return false;
  }
}

/**
 * Réinitialise aux formules et tarifs d'origine
 */
export function resetSubscriptionPlans() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
      notifySubscribers();
    }
  } catch (e) {
    console.error('Erreur réinitialisation abonnements:', e);
  }
  return DEFAULT_PLANS.map(calculatePlanPricing);
}

/**
 * Retourne un dictionnaire indexé par id (pour compatibilité avec PLANS_PRICING)
 */
export function getPlansPricingMap(plans = getSubscriptionPlans()) {
  const map = {};
  plans.forEach(p => {
    map[p.id] = calculatePlanPricing(p);
  });
  return map;
}

