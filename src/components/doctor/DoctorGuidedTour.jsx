import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, ChevronRight, ChevronLeft, X, Check, 
  HelpCircle, Eye, Compass, ArrowRight, ArrowLeft 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const TOUR_DEFINITIONS = {
  agenda: [
    {
      target: 'agenda-kpis',
      titleFr: '1. Indicateurs Clés & Statistiques du Jour',
      titleAr: '1. المؤشرات الرئيسية وإحصائيات اليوم',
      descFr: 'Consultez en temps réel les 4 métriques fondamentales : RDV confirmés, patients présents en salle d’attente, consultation actuellement en cours et estimation du décalage horaire.',
      descAr: 'اطّلع في الوقت الفعلي على المؤشرات الحيوية للعيادة: عدد المواعيد المؤكدة، المرضى في قاعة الانتظار، الاستشارة الجارية والتأخير التقديري.',
      position: 'bottom'
    },
    {
      target: 'agenda-call-next',
      titleFr: '2. Bouton d’Appel du Patient Suivant',
      titleAr: '2. زر المناداة على المريض التالي',
      descFr: 'Déclenche un carillon sonore médical officiel, actualise instantanément l’écran d’affichage de la salle d’attente et notifie le patient suivant sur son smartphone.',
      descAr: 'يُطلق نغمة طبية منبهة، ويُحدث شاشة قاعة الانتظار العامة وينبه المريض التالي للدخول إلى قاعة الفحص.',
      position: 'bottom'
    },
    {
      target: 'agenda-active-consult',
      titleFr: '3. Zone de Consultation en Cours & Actions Rapides',
      titleAr: '3. مساحة الاستشارة الطبية الجارية والإجراءات السريعة',
      descFr: 'Affiche la fiche du patient actuellement examiné avec accès direct en 1 clic : rédaction d’ordonnance PCT, ouverture du dossier médical (EHR), notification WhatsApp ou clôture de séance.',
      descAr: 'تعرض بيانات المريض الخاضع للفحص مع أزرار سريعة بنقرة واحدة: كتابة وصفة PCT، فتح الملف الطبي، المراسلة بواتساب وإنهاء الاستشارة.',
      position: 'bottom'
    },
    {
      target: 'agenda-waiting-list',
      titleFr: '4. File d’Attente Active (Ordre d’Arrivée)',
      titleAr: '4. قائمة الانتظار الفعلية (ترتيب الحضور)',
      descFr: 'Liste en direct des patients présents au cabinet. Vous pouvez appeler un patient précis hors-ordre en cas de priorité médicale ou urgence.',
      descAr: 'قائمة تفاعلية بالمرضى الحاضرين في العيادة، تتيح المناداة الفورية على أي مريض أو تقديم الحالات الاستعجالية.',
      position: 'bottom'
    },
    {
      target: 'agenda-slots-planning',
      titleFr: '5. Planning & Verrouillage des Créneaux',
      titleAr: '5. جدول المواعيد وإقفال الفترات الزمنية',
      descFr: 'Grille horaire de la journée par tranches de 30 minutes. Utilisez le cadenas pour bloquer un créneau en cas d’indisponibilité ou libérer un créneau d’urgence.',
      descAr: 'جدول المواعيد اليومي بفواصل 30 دقيقة. اضغط على رمز القفل لحجز فترة مستعجلة أو فتح أوقات شاغرة للمرضى.',
      position: 'top'
    }
  ],

  caisse: [
    {
      target: 'caisse-metrics',
      titleFr: '1. Synthèse Financière du Cabinet',
      titleAr: '1. الملخص المالي لمداخيل العيادة',
      descFr: 'Suivez le chiffre d’affaires du jour : recettes totales encaissées, part payée directement par les patients au comptoir et créances CNAM (tiers-payant 70%).',
      descAr: 'متابعة المداخيل اليومية للعيادة: مجموع المقبوضات، المبالغ المسددة نقداً ومنابات الصندوق الوطني للتأمين على المرض (الكنام).',
      position: 'bottom'
    },
    {
      target: 'caisse-new-btn',
      titleFr: '2. Enregistrer un Nouvel Encaissement',
      titleAr: '2. تسجيل عملية خلاص جديدة',
      descFr: 'Cliquez ici pour enregistrer un règlement patient : sélectionnez l’acte médical, le mode de paiement (Espèces, Carte, Chèque) avec répartition automatique Part Patient / CNAM.',
      descAr: 'اضغط هنا لتسجيل دفع جديد: اختر العمل الطبي وطريقة الخلاص (نقداً، بطاقة بنكية، شيك) مع الحساب الآلي لحصة الكنام والمريض.',
      position: 'bottom'
    },
    {
      target: 'caisse-invoice-btn',
      titleFr: '3. Facture Fiscale & Export CSV',
      titleAr: '3. الفاتورة الجبائية والتصدير المحاسبي',
      descFr: 'Générez des factures légales certifiées avec timbre fiscal de 1.000 TND ou exportez vos données financières vers Excel/CSV pour votre comptable.',
      descAr: 'استخراج فواتير جبائية رسمية مع معلوم الطابع الجبائي (1.000 د) أو تصدير البيانات المالية بصيغة CSV لمحاسب العيادة.',
      position: 'bottom'
    },
    {
      target: 'caisse-history-btn',
      titleFr: '4. Historique des Séances Faites',
      titleAr: '4. سجل الجلسات الطبية المنجزة',
      descFr: 'Consultez la traçabilité des consultations terminées : actes réalisés, diagnostics posés, prescriptions et montants réglés.',
      descAr: 'الاطلاع على الأرشيف الشامل للفحوصات السابقة مع التشخيصات والأدوية المسندة والتفاصيل المالية.',
      position: 'bottom'
    },
    {
      target: 'caisse-table',
      titleFr: '5. Journal des Encaissements & Reçus',
      titleAr: '5. جدول الخلاص وطباعة الوصولات',
      descFr: 'Registre chronologique des paiements du jour. Cliquez sur "Reçu" pour imprimer immédiatement le ticket thermique ou la facturette patient.',
      descAr: 'سجل تفصيلي بكافة المعاملات المالية لليوم مع إمكانية طباعة الوصل المالي للعيادة فورياً.',
      position: 'top'
    }
  ],

  whatsapp: [
    {
      target: 'whatsapp-lang',
      titleFr: '1. Choix de la Langue (Français / Arabe)',
      titleAr: '1. اختيار لغة الرسالة (فرنسية / عربية)',
      descFr: 'Basculez entre le Français et l’Arabe pour adapter automatiquement le contenu des messages à la langue préférée de votre patient.',
      descAr: 'التبديل الفوري بين اللغتين الفرنسية والعربية لملائمة نص الرسالة مع اللغة المفضلة للمريض.',
      position: 'bottom'
    },
    {
      target: 'whatsapp-templates',
      titleFr: '2. Modèles Officiels Maw2idi',
      titleAr: '2. نماذج الرسائل المعتمدة',
      descFr: 'Gagnez du temps avec les modèles prêts à l’envoi : confirmation de RDV avec lien GPS Google Maps de votre cabinet, rappel de la veille, ou avis de retard.',
      descAr: 'نماذج جاهزة فورية: تأكيد الموعد مع رابط خريطة العيادة GPS، التذكير المسبق بالموعد أو إشعار تأخير طارئ.',
      position: 'bottom'
    },
    {
      target: 'whatsapp-send',
      titleFr: '3. Envoi Immédiat WhatsApp & SMS',
      titleAr: '3. الإرسال الفوري عبر واتساب والرسائل القصيرة',
      descFr: 'Transmettez le message d’un clic vers le numéro tunisien (+216) du patient par WhatsApp sécurisé ou SMS direct avec confirmation de délivrance.',
      descAr: 'إرسال الرسالة بنقرة واحدة إلى الرقم التونسي (+216) الخاص بالمريض عبر واتساب أو كرسالة قصيرة SMS مع إشعار استلام.',
      position: 'top'
    }
  ],

  retard: [
    {
      target: 'retard-selector',
      titleFr: '1. Signalement Instantané du Décalage',
      titleAr: '1. الإشعار الفوري بمدة التأخير',
      descFr: 'Sélectionnez en un clic l’estimation du retard : +15 min (Léger), +30 min (Moyen), +45 min (Urgence) ou "À l’heure" dès que le planning est rattrapé.',
      descAr: 'حدد بنقرة واحدة تقدير التأخير: +15 دقيقة، +30 دقيقة، +45 دقيقة (حالة استعجالية) أو "في الموعد" فور انتظام وتيرة الفحص.',
      position: 'bottom'
    },
    {
      target: 'retard-status-box',
      titleFr: '2. Synchronisation Temps Réel (Écran & Mobiles)',
      titleAr: '2. البث المباشر (الشاشة والهواتف)',
      descFr: 'Le statut est diffusé instantanément via WebSocket : l’heure estimée de passage se met à jour sur la TV de la salle d’attente et sur l’application mobile des patients.',
      descAr: 'يتم نشر التوقيت المحين فوراً عبر الإنترنت لشاشة قاعة الانتظار ولتطبيقات هواتف المرضى لتفادي الاكتظاظ.',
      position: 'top'
    }
  ],

  ehr: [
    {
      target: 'ehr-patient-selector',
      titleFr: '1. Sélection du Dossier Médical',
      titleAr: '1. اختيار الملف الطبي للمريض',
      descFr: 'Accédez à la liste complète de vos patients enregistrés ou recherchez rapidement par nom ou identifiant CNAM.',
      descAr: 'تصفح قائمة المرضى أو البحث السريع بالاسم أو المعرف الاجتماعي للكنام لفتح الملف الطبي المطلوب.',
      position: 'bottom'
    },
    {
      target: 'ehr-summary-card',
      titleFr: '2. Fiche Clinique Synthétique',
      titleAr: '2. بطاقة البيانات السريرية والتنبيهات',
      descFr: 'Visualisez les constantes vitales, groupe sanguin, alertes d’allergies médicamenteuses et antécédents cardiovasculaires majeurs.',
      descAr: 'عرض المؤشرات السريرية، فصيلة الدم، التحذيرات من الحساسيات الدوائية والسوابق الطبية الهامة.',
      position: 'bottom'
    },
    {
      target: 'ehr-documents-list',
      titleFr: '3. Historique des Bilans & ECG',
      titleAr: '3. أرشيف التحاليل وتخطيط القلب',
      descFr: 'Consultez les résultats de bilans biologiques (Pasteur), les tracés ECG numérisés et les comptes-rendus d’échographie.',
      descAr: 'الاطلاع على نتائج التحاليل المخبرية، تسجيلات تخطيط القلب وفحوصات الصدى الطبي المرفقة بالملف.',
      position: 'top'
    }
  ],

  ordonnance: [
    {
      target: 'ordonnance-patient-input',
      titleFr: '1. Destinataire de l’Ordonnance',
      titleAr: '1. المريض الموجهة له الوصفة',
      descFr: 'Indiquez le patient bénéficiaire de la prescription médicale.',
      descAr: 'حدد اسم المريض المستفيد من الوصفة العلاجية.',
      position: 'bottom'
    },
    {
      target: 'ordonnance-add-drug',
      titleFr: '2. Prescription Médicamenteuse (Nomenclature PCT)',
      titleAr: '2. إضافة الأدوية (قاعدة الصيدلية المركزية)',
      descFr: 'Ajoutez les médicaments prescrits avec leur posologie quotidienne précise et la durée du traitement.',
      descAr: 'أدخل الأدوية الموصوفة مع الجرعات اليومية والمدة المحددة للعلاج بكل دقة.',
      position: 'bottom'
    },
    {
      target: 'ordonnance-preview-print',
      titleFr: '3. Impression Sécurisée avec QR Code Déontologique',
      titleAr: '3. الطباعة المؤمنة مع الرمز المشفر QR',
      descFr: 'Générez l’ordonnance officielle intégrant un QR code inviolable conforme aux directives de l’Ordre des Médecins et vérifiable par les pharmaciens.',
      descAr: 'استخراج وطباعة الوصفة الرسمية المزودة برمز QR معتمد من عمادة الأطباء يتيح التحقق الفوري في الصيدليات.',
      position: 'top'
    }
  ],

  cnam: [
    {
      target: 'cnam-header-metrics',
      titleFr: '1. Paramètres Conventionnels CNAM',
      titleAr: '1. البيانات الاتفاقية مع الكنام',
      descFr: 'Contrôlez vos références de conventionnement, le code praticien CNAM et la filière de soins (Filière Privée / Système Référent).',
      descAr: 'مراجعة المعطيات الاتفاقية، المعرف الطبي لدى الكنام والمنظومة المعتمدة (المنظومة الخاصة / طبيب العائلة).',
      position: 'bottom'
    },
    {
      target: 'cnam-form-inputs',
      titleFr: '2. Bordereau C1 de Télétransmission',
      titleAr: '2. استمارة العلاج C1 للإرسال الإلكتروني',
      descFr: 'Remplissez les informations de l’assuré social et les actes médicaux pour la prise en charge immédiate.',
      descAr: 'تسجيل بيانات المضمون الاجتماعي والأعمال الطبية المنجزة للتكفل الفوري بالمصاريف.',
      position: 'bottom'
    },
    {
      target: 'cnam-transmit-btn',
      titleFr: '3. Télétransmission Directe au Centre CNAM',
      titleAr: '3. الإرسال الإلكتروني المباشر لمركز الكنام',
      descFr: 'Transmettez instantanément le flux électronique sécurisé pour accélérer le remboursement du patient.',
      descAr: 'إرسال الملفات إلكترونياً وبصفة آمنة لتسريع استرجاع المصاريف لفائدة المريض.',
      position: 'top'
    }
  ],

  liaison: [
    {
      target: 'liaison-form',
      titleFr: '1. Destinataire & Patient Concerné',
      titleAr: '1. تحديد المريض والطبيب الزميل المستلم',
      descFr: 'Indiquez le nom du patient adressé et les coordonnées complètes du médecin confrère spécialiste ou de la clinique destinataire.',
      descAr: 'حدد اسم المريض المعني وهوية الطبيب الزميل أو المصحة المستقبلة لطلب المشورة الطبية.',
      position: 'bottom'
    },
    {
      target: 'liaison-motif',
      titleFr: '2. Données Cliniques & Motif Médical',
      titleAr: '2. المعطيات السريرية والسبب الطبي للإحالة',
      descFr: 'Rédigez les observations médicales, examens déjà réalisés, diagnostic suspecté et questions précises pour le confrère.',
      descAr: 'أدخل الملاحظات السريرية، الفحوصات المنجزة، التشخيص التقديري والاستشارة المطلوبة بدقة.',
      position: 'bottom'
    },
    {
      target: 'liaison-send-btn',
      titleFr: '3. Transmission Sécurisée Maw2idi',
      titleAr: '3. الإرسال الآمن عبر منصة Maw2idi',
      descFr: 'Expédiez le courrier médical crypté de bout en bout et conforme aux recommandations déontologiques de l’Ordre des Médecins.',
      descAr: 'إرسال التقرير الطبي مشفراً ومطابقاً للضوابط الرسمية لعمادة الأطباء التونسية بنقرة واحدة.',
      position: 'top'
    }
  ],

  cabinet: [
    {
      target: 'cabinet-profile',
      titleFr: '1. Profil Professionnel & Coordonnées du Cabinet',
      titleAr: '1. الملف المهني وعنوان العيادة',
      descFr: 'Mettez à jour le nom officiel du cabinet, votre spécialité, adresse physique, téléphone direct et identifiants ordinaux / CNAM.',
      descAr: 'تحيين اسم العيادة الرسمي، الاختصاص، العنوان الدقيق، الهاتف والمعرف لدى عمادة الأطباء والكنام.',
      position: 'bottom'
    },
    {
      target: 'cabinet-schedule',
      titleFr: '2. Grille des Horaires d’Ouverture & Sans RDV',
      titleAr: '2. جدول أوقات العمل والاستقبال بدون موعد',
      descFr: 'Configurez vos plages de consultation du matin et de l’après-midi, pause déjeuner et activez les créneaux sans rendez-vous.',
      descAr: 'تحديد فترات العمل الصباحية والمسائية، استراحة الغداء وتفعيل فترات الاستقبال المباشر بدون موعد.',
      position: 'top'
    },
    {
      target: 'cabinet-leaves',
      titleFr: '3. Congés & Fermetures Exceptionnelles',
      titleAr: '3. فترات العطل والإغلاق الاستثنائي',
      descFr: 'Déclarez vos périodes de congés ou absences pour bloquer automatiquement la prise de rendez-vous en ligne pendant cette période.',
      descAr: 'تسجيل العطل السنوية أو الغياب الطارئ لغلق الحجوزات الإلكترونية تلقائياً خلال تلك الفترة.',
      position: 'top'
    }
  ],

  reputation: [
    {
      target: 'reputation-kpis',
      titleFr: '1. Score d’Évaluation & Taux de Satisfaction',
      titleAr: '1. مؤشرات التقييم ونسبة رضا المرضى',
      descFr: 'Suivez votre note moyenne certifiée, le nombre total d’avis vérifiés Maw2idi et la répartition par critères (ponctualité, écoute, hygiène).',
      descAr: 'متابعة المعدل العام للتقييم، عدد الآراء المعتمدة ونسب الرضا بحسب معايير الدقة وحسن الاستماع ونظافة العيادة.',
      position: 'bottom'
    },
    {
      target: 'reputation-list',
      titleFr: '2. Registre des Avis & Droit de Réponse Déontologique',
      titleAr: '2. سجل آراء المرضى وحق الرد المهني',
      descFr: 'Consultez les commentaires déposés par vos patients vérifiés et publiez une réponse officielle bienveillante valorisant votre écoute.',
      descAr: 'مراجعة ملاحظات المرضى بعد الفحص ونشر رد مهني رسمي يبرز اهتمامك بجودة الرعاية الطبية.',
      position: 'top'
    }
  ],

  teleconsult: [
    {
      target: 'teleconsult-screen',
      titleFr: '1. Écran Vidéo Haute Définition WebRTC',
      titleAr: '1. شاشة الاتصال المرئي عالية الدقة',
      descFr: 'Espace de visioconsultation médicale chiffrée de bout en bout avec contrôle micro/caméra et salle d’attente virtuelle sécurisée.',
      descAr: 'فضاء الاستشارة المرئية المشفرة بتقنية WebRTC مع التحكم في الكاميرا والميكروفون وقاعة انتظار افتراضية.',
      position: 'bottom'
    },
    {
      target: 'teleconsult-notes',
      titleFr: '2. Observations Cliniques en Direct',
      titleAr: '2. تدوين الملاحظات السريرية أثناء الاتصال',
      descFr: 'Rédigez vos notes de consultation en direct pendant l’échange vidéo pour synchronisation instantanée dans le dossier patient (EHR).',
      descAr: 'كتابة الملاحظات الطبية مباشرة أثناء المحادثة لترحيلها فوراً للملف الطبي للمريض.',
      position: 'top'
    }
  ]
};

export default function DoctorGuidedTour({
  activeTab = 'agenda',
  isOpen = false,
  onClose,
  onFinish
}) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';

  const steps = TOUR_DEFINITIONS[activeTab] || TOUR_DEFINITIONS.agenda;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const cardRef = useRef(null);

  // Always reset to step 0 when tab changes or when tour is newly opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    } else {
      removeHighlightClass();
      setTargetRect(null);
    }
  }, [isOpen, activeTab]);

  const removeHighlightClass = () => {
    const prevHighlighted = document.querySelectorAll('.sahatn-tour-zoom-highlight');
    prevHighlighted.forEach(el => {
      el.classList.remove('sahatn-tour-zoom-highlight');
    });
  };

  // Find and focus the active target element with precision
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) {
      removeHighlightClass();
      setTargetRect(null);
      return;
    }

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    removeHighlightClass();

    const targetEl = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (targetEl) {
      // Smooth scroll target into center view
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      // Apply zoom & pop-out highlight (DO NOT BLUR, elevate and scale)
      targetEl.classList.add('sahatn-tour-zoom-highlight');

      // Measure exact viewport coordinates (without scroll offsets for fixed positioning)
      const rect = targetEl.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStepIndex, steps]);

  // Continuously track position on scroll and resize using requestAnimationFrame for zero-lag precision
  useEffect(() => {
    if (!isOpen) return;

    let rafId = null;
    const handleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const currentStep = steps[currentStepIndex];
        if (!currentStep) return;
        const targetEl = document.querySelector(`[data-tour="${currentStep.target}"]`);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
          });
        }
      });
    };

    // Initial updates to let DOM render and stabilize
    const initialTimer = setTimeout(updateTargetPosition, 160);
    const secondaryTimer = setTimeout(handleUpdate, 320);

    // Continuous tracking during smooth scroll animation
    let count = 0;
    const scrollFollowInterval = setInterval(() => {
      handleUpdate();
      count++;
      if (count > 25) clearInterval(scrollFollowInterval);
    }, 30);

    // Capture scrolling on window AND any scrollable sub-container
    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(secondaryTimer);
      clearInterval(scrollFollowInterval);
      window.removeEventListener('scroll', handleUpdate, { capture: true });
      window.removeEventListener('resize', handleUpdate);
      if (rafId) cancelAnimationFrame(rafId);
      removeHighlightClass();
    };
  }, [isOpen, currentStepIndex, steps, updateTargetPosition]);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkipAll = () => {
    try {
      localStorage.setItem(`sahatn_tour_seen_${activeTab}`, 'true');
    } catch (e) {}
    removeHighlightClass();
    if (onClose) onClose();
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(`sahatn_tour_seen_${activeTab}`, 'true');
    } catch (e) {}
    removeHighlightClass();
    if (onFinish) onFinish();
    else if (onClose) onClose();
  };

  const title = isAr ? currentStep.titleAr : currentStep.titleFr;
  const description = isAr ? currentStep.descAr : currentStep.descFr;

  // Padding around target element for clear framing
  const pad = 10;

  // Smart placement for tooltip card: avoid obscuring the target element
  const isTargetInUpperHalf = targetRect ? targetRect.top < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) : false;

  const modalContent = (
    <div className="fixed inset-0 z-[99998] pointer-events-none select-none">
      {/* 
        ════════ INLINE CSS FOR ZOOM & CRISP HIGHLIGHT ════════ 
        Elevates and slightly zooms the target element without ANY blur!
      */}
      <style>{`
        .sahatn-tour-zoom-highlight {
          position: relative !important;
          z-index: 99997 !important;
          transform: scale(1.018) !important;
          transform-origin: center center !important;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
      `}</style>

      {/* 
        ════════ SVG CUTOUT SPOTLIGHT MASK ════════ 
        Covers the background with semi-transparent dark, BUT leaves a 100% CLEAR, 
        UNBLURRED, FULLY TRANSPARENT HOLE over the targeted element!
      */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[99998]">
        <defs>
          <mask id="sahatn-tour-spotlight-mask">
            {/* White covers everywhere (opaque dark overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle creates a 100% transparent cutout window over the active element! */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - pad)}
                y={Math.max(0, targetRect.top - pad)}
                width={Math.max(0, targetRect.width + pad * 2)}
                height={Math.max(0, targetRect.height + pad * 2)}
                rx="20"
                ry="20"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop rectangle with mask cutout applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 12, 24, 0.75)"
          mask="url(#sahatn-tour-spotlight-mask)"
          className="pointer-events-auto cursor-pointer transition-opacity duration-300"
          onClick={handleSkipAll}
        />
      </svg>

      {/* 
        ════════ ANIMATED HIGH-PRECISION GLOWING FRAME ════════ 
        Frames the cutout with radiant teal pulse and precision corner markers.
      */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            borderRadius: '1.25rem',
            border: '3px solid #00A896',
            boxShadow: '0 0 28px 4px rgba(0, 168, 150, 0.75), inset 0 0 16px rgba(0, 168, 150, 0.15)',
            pointerEvents: 'none',
            zIndex: 99999,
            transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease'
          }}
          className="animate-pulse"
        >
          {/* Precision Corner Brackets */}
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-3 border-l-3 border-teal-300 rounded-tl-lg" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-3 border-r-3 border-teal-300 rounded-tr-lg" />
          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-3 border-l-3 border-teal-300 rounded-bl-lg" />
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-3 border-r-3 border-teal-300 rounded-br-lg" />

          {/* Floating Target Badge */}
          <div className="absolute -top-3.5 left-4 px-2.5 py-0.5 rounded-full bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>{isAr ? 'المنطقة المحددة' : 'Zone Ciblée'}</span>
          </div>
        </div>
      )}

      {/* 
        ════════ FLOATING GUIDED TOUR TOOLTIP CARD ════════ 
        Positioned smartly: at the bottom if target is in upper half, or at the top if target is in bottom half!
      */}
      <div 
        className={`fixed left-1/2 -translate-x-1/2 z-[100000] pointer-events-auto w-[92%] sm:w-[560px] max-w-full transition-all duration-300 ${
          isTargetInUpperHalf ? 'bottom-6 sm:bottom-8' : 'top-6 sm:top-8'
        }`}
        ref={cardRef}
      >
        <div 
          className="bg-white dark:bg-[#0c1a2e] text-slate-850 dark:text-white rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-teal-500/90 dark:border-teal-400 space-y-4 animate-in fade-in duration-300"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header Row: Badge, Step Counter, and Close Button */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-[#00A896] dark:text-teal-300 flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">
                  {isAr ? 'دليل الاستخدام التفاعلي' : 'Tutoriel Interactif Maw2idi'}
                </span>
                <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                  {isAr ? `الخطوة ${currentStepIndex + 1} من ${steps.length}` : `Étape ${currentStepIndex + 1} sur ${steps.length}`}
                </div>
              </div>
            </div>

            {/* Skip Tour Button */}
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-extrabold px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title={isAr ? 'تخطي كل الخطوات' : 'Ignorer tout le tutoriel'}
            >
              <span>{isAr ? 'تخطي الكل' : 'Ignorer tout'}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {description}
            </p>
          </div>

          {/* Progress Indicators & Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-3">
            
            {/* Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-[#00A896]'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  aria-label={`Étape ${idx + 1}`}
                />
              ))}
            </div>

            {/* Actions: Prev & Next */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'السابق' : 'Précédent'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-teal-500/20 flex items-center gap-1.5 active:scale-95"
              >
                <span>
                  {isLastStep 
                    ? (isAr ? 'إنهاء الدليل ✓' : 'Terminer ✓') 
                    : (isAr ? 'التالي' : 'Passer au suivant')}
                </span>
                {!isLastStep && (
                  isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
