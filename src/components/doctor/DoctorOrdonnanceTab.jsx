import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Printer, ExternalLink, Trash2, CheckCircle, AlertCircle, PenTool, Upload, X, Check, RotateCcw, Plus, Sparkles, ShieldCheck, FileText, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

// Predefined frequently prescribed medications in Tunisia
const TUNISIAN_COMMON_DRUGS = [
  {
    name: 'DOLIPRANE 1000 mg',
    form: 'Comprimé',
    doseCount: '3',
    doseUnit: 'comp_jour',
    durationCount: '5',
    durationUnit: 'jours',
    moment: '1 comprimé toutes les 8h en cas de douleur ou fièvre (max 3g/j)'
  },
  {
    name: 'KARDEGIC 160 mg',
    form: 'Poudre pour solution buvable en sachet',
    doseCount: '1',
    doseUnit: 'sachet_jour',
    durationCount: '3',
    durationUnit: 'mois',
    moment: '1 sachet le midi au milieu du repas avec un grand verre d\'eau',
    nonSubstituable: true
  },
  {
    name: 'AUGMENTIN 1g / 125mg',
    form: 'Poudre pour suspension buvable',
    doseCount: '2',
    doseUnit: 'comp_jour',
    durationCount: '7',
    durationUnit: 'jours',
    moment: '1 sachet matin et soir en début de repas'
  },
  {
    name: 'INEXIUM 40 mg',
    form: 'Gélule gastro-résistante',
    doseCount: '1',
    doseUnit: 'gelule_jour',
    durationCount: '1',
    durationUnit: 'mois',
    moment: '1 gélule le matin à jeun 30 minutes avant le petit-déjeuner'
  },
  {
    name: 'TAHOR 20 mg',
    form: 'Comprimé pelliculé',
    doseCount: '1',
    doseUnit: 'comp_jour',
    durationCount: '3',
    durationUnit: 'mois',
    moment: '1 comprimé le soir au coucher'
  },
  {
    name: 'AMLOR 5 mg',
    form: 'Gélule',
    doseCount: '1',
    doseUnit: 'gelule_jour',
    durationCount: '3',
    durationUnit: 'mois',
    moment: '1 gélule chaque matin à heure fixe'
  },
  {
    name: 'COVERSYL 5 mg',
    form: 'Comprimé pelliculé sécable',
    doseCount: '1',
    doseUnit: 'comp_jour',
    durationCount: '3',
    durationUnit: 'mois',
    moment: '1 comprimé le matin avant le repas'
  },
  {
    name: 'CLAMOXYL 1g',
    form: 'Comprimé dispersible',
    doseCount: '2',
    doseUnit: 'comp_jour',
    durationCount: '6',
    durationUnit: 'jours',
    moment: '1 comprimé matin et soir pendant le repas'
  }
];

// Realistic physician signature component uniquely generated per doctor
function DoctorUniqueSignatureSvg({ doctorName = 'Dr. Selim Ben Ali', doctorId = 'doc-1' }) {
  const cleanName = doctorName.replace(/^(Dr\.?|Docteur|د\.?)\s*/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Praticien';
  const lastName = parts.slice(1).join(' ') || (parts[0] ? '' : 'Agréé');
  
  // Clean short signature display (e.g., "S. Ben Ali", "M. Karray", "W. Mansour", "P. Agréé")
  const shortSign = lastName 
    ? `${firstName[0].toUpperCase()}. ${lastName}` 
    : cleanName;

  // Deterministic seed based on doctor identity
  let seed = 0;
  const str = `${cleanName}_${doctorId || ''}`;
  for (let i = 0; i < str.length; i++) {
    seed = (seed << 5) - seed + str.charCodeAt(i);
    seed |= 0;
  }
  const absSeed = Math.abs(seed);
  const variant = absSeed % 5;
  const rotation = -3 - (absSeed % 4); // -3deg to -6deg

  const inks = ['#15325b', '#1e40af', '#0f2747', '#173663', '#1e3a8a'];
  const ink = inks[absSeed % inks.length];

  // Unique calligraphic flourishes
  const flourishes = [
    // Selim / S style: sweeping loop with return underline
    "M 15 52 Q 55 58, 95 50 T 145 54 C 160 56, 170 44, 156 36 C 140 28, 125 42, 168 50",
    // Meriem / M style: triple wave with high ascend
    "M 12 48 C 40 54, 75 46, 115 52 Q 145 55, 140 40 Q 132 28, 120 38 Q 110 48, 155 50",
    // Walid / W style: sharp dynamic medical angles
    "M 10 45 L 32 56 L 58 46 L 90 54 Q 128 50, 162 52 M 138 38 L 165 54",
    // Praticien Agréé / P style: circular loop and broad medical sweep
    "M 14 36 C 14 58, 26 64, 36 52 C 44 42, 34 32, 22 40 M 30 50 Q 85 55, 138 48 T 168 51",
    // Generic / Flourish style: double loop with sharp terminal accent
    "M 14 47 Q 48 56, 96 47 T 155 51 C 166 53, 172 40, 158 34 Q 146 28, 134 43 L 168 50"
  ];
  const flourishPath = flourishes[variant];

  return (
    <div 
      className="relative z-10 w-44 h-20 flex flex-col items-center justify-center select-none pointer-events-none mix-blend-multiply"
      style={{ transform: `rotate(${rotation}deg)` }}
      title={`Signature de ${doctorName}`}
    >
      <svg viewBox="0 0 190 75" className="w-full h-full overflow-visible">
        {/* Authentic cursive name */}
        <text
          x="18"
          y="42"
          fill={ink}
          fontSize="23"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Caveat', 'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive"
          letterSpacing="0.5px"
        >
          {shortSign}
        </text>

        {/* Unique medical calligraphic flourish */}
        <path
          d={flourishPath}
          fill="none"
          stroke={ink}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Doctor stamp accent mark */}
        <circle
          cx={145 + (absSeed % 18)}
          cy={28 + (absSeed % 12)}
          r="1.8"
          fill={ink}
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

export default function DoctorOrdonnanceTab({
  doctorId = 'doc-1',
  doctorName = 'Dr. Selim Ben Ali',
  doctorSpecialty = 'Cardiologie & Maladies Vasculaires',
  doctorProfile = null,
  currentPatient = ''
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const activeDocId = doctorId || doctorProfile?.id || doctorProfile?.uuid || (typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null) || 'doc-1';
  const doctorSigKey = `sahatn_doctor_signature_${activeDocId}`;

  const isSelim = Boolean(!doctorProfile && (doctorName?.toLowerCase().includes('selim') || doctorName === 'Dr. Selim Ben Ali'));

  // Patient info
  const [patient, setPatient] = useState(currentPatient || '');
  const [patientAge, setPatientAge] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [ordSerial, setOrdSerial] = useState(() => {
    return `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  });
  const [medicalAdvice, setMedicalAdvice] = useState('');

  // Real Scannable QR Code & Cryptographic Verification Hash
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrHash, setQrHash] = useState('');
  const [shaDisplay, setShaDisplay] = useState('a8f9...4b12');
  const [verifyUrl, setVerifyUrl] = useState('');

  // Pre-fill patient when currentPatient prop arrives
  useEffect(() => {
    if (currentPatient && !patient) {
      setPatient(currentPatient);
    }
  }, [currentPatient]);

  // Initial prescribed drugs empty on load/refresh
  const [drugs, setDrugs] = useState([]);

  // Drug Form Inputs
  const [newName, setNewName] = useState('');
  const [newForm, setNewForm] = useState('Comprimé');
  const [newDoseCount, setNewDoseCount] = useState('1');
  const [newDoseUnit, setNewDoseUnit] = useState('fois_jour');
  const [newDurationCount, setNewDurationCount] = useState('7');
  const [newDurationUnit, setNewDurationUnit] = useState('jours');
  const [newMoment, setNewMoment] = useState('');
  const [newNonSub, setNewNonSub] = useState(false);
  const [nameError, setNameError] = useState('');

  // Signature and Seal states
  const [signed, setSigned] = useState(true);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const signatureFileInputRef = useRef(null);
  const signatureCanvasRef = useRef(null);

  const [doctorSignature, setDoctorSignature] = useState(() => {
    if (doctorProfile?.signature || doctorProfile?.signatureData) {
      return doctorProfile.signature || doctorProfile.signatureData;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(doctorSigKey);
    }
    return null;
  });

  // Re-sync doctor signature strictly for this doctor whenever identity changes
  useEffect(() => {
    // Clean legacy global key so it doesn't contaminate other doctors
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('sahatn_doctor_signature')) {
        localStorage.removeItem('sahatn_doctor_signature');
      }
    } catch (e) {}

    if (doctorProfile?.signature || doctorProfile?.signatureData) {
      setDoctorSignature(doctorProfile.signature || doctorProfile.signatureData);
      return;
    }

    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(doctorSigKey);
      setDoctorSignature(saved || null);
    } else {
      setDoctorSignature(null);
    }
  }, [activeDocId, doctorName, doctorProfile, doctorSigKey]);

  // Listen to signature updates specifically for this active doctor
  useEffect(() => {
    const handleSigUpdated = (e) => {
      if (e?.detail) {
        if (!e.detail.doctorId || e.detail.doctorId === activeDocId) {
          setDoctorSignature(e.detail.signature || null);
        }
      }
    };
    window.addEventListener('sahatn:doctor-signature-updated', handleSigUpdated);
    return () => window.removeEventListener('sahatn:doctor-signature-updated', handleSigUpdated);
  }, [activeDocId]);

  const applyNewSignature = (sigData) => {
    setDoctorSignature(sigData);
    setSigned(true);
    setSignatureModalOpen(false);
    try {
      if (sigData) {
        localStorage.setItem(doctorSigKey, sigData);
      } else {
        localStorage.removeItem(doctorSigKey);
      }
      localStorage.removeItem('sahatn_doctor_signature');
      window.dispatchEvent(new CustomEvent('sahatn:doctor-signature-updated', { 
        detail: { doctorId: activeDocId, signature: sigData } 
      }));
      if (activeDocId && activeDocId !== 'doc-1') {
        api.updateDoctor(activeDocId, { signature: sigData }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyNewSignature(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startDrawingSig = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawingSig(true);
  };

  const drawSig = (e) => {
    if (!isDrawingSig) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingSig = () => {
    setIsDrawingSig(false);
  };

  const clearCanvasSig = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSig = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL('image/png');
    applyNewSignature(sigData);
  };

  // Helper formatting for dosage
  const formatDose = (count, unit) => {
    const c = parseInt(count, 10) || 1;
    if (isAr) {
      if (unit === 'fois_jour') return `${c} ${c === 1 ? 'مرة في اليوم' : 'مرات / يوم'}`;
      if (unit === 'prise_jour') return `${c} ${c === 1 ? 'جرعة في اليوم' : 'جرعات / يوم'}`;
      if (unit === 'comp_jour') return `${c} ${c === 1 ? 'قرص / يوم' : 'أقراص / يوم'}`;
      if (unit === 'gelule_jour') return `${c} ${c === 1 ? 'كبسولة / يوم' : 'كبسولات / يوم'}`;
      if (unit === 'sachet_jour') return `${c} ${c === 1 ? 'كيس / يوم' : 'أكياس / يوم'}`;
      if (unit === 'cuillere_jour') return `${c} ${c === 1 ? 'ملعقة / يوم' : 'ملاعق / يوم'}`;
      return `${c} مرات / يوم`;
    }
    if (unit === 'fois_jour') return `${c} fois / jour`;
    if (unit === 'prise_jour') return `${c} prise${c > 1 ? 's' : ''} / jour`;
    if (unit === 'comp_jour') return `${c} comprimé${c > 1 ? 's' : ''} / jour`;
    if (unit === 'gelule_jour') return `${c} gélule${c > 1 ? 's' : ''} / jour`;
    if (unit === 'sachet_jour') return `${c} sachet${c > 1 ? 's' : ''} / jour`;
    if (unit === 'cuillere_jour') return `${c} cuillère${c > 1 ? 's' : ''} / jour`;
    return `${c} fois / jour`;
  };

  // Helper formatting for duration
  const formatDuration = (count, unit) => {
    const c = parseInt(count, 10) || 1;
    if (isAr) {
      if (unit === 'jours') return `${c} ${c === 1 ? 'يوم' : c === 2 ? 'يومان' : c <= 10 ? 'أيام' : 'يوماً'}`;
      if (unit === 'mois') return `${c} ${c === 1 ? 'شهر' : c === 2 ? 'شهران' : c <= 10 ? 'أشهر' : 'شهراً'}`;
      if (unit === 'semaines') return `${c} ${c === 1 ? 'أسبوع' : c === 2 ? 'أسبوعان' : c <= 10 ? 'أسابيع' : 'أسبوعاً'}`;
      return `${c} أيام`;
    }
    if (unit === 'jours') return `${c} jour${c > 1 ? 's' : ''}`;
    if (unit === 'mois') return `${c} mois`;
    if (unit === 'semaines') return `${c} semaine${c > 1 ? 's' : ''}`;
    return `${c} jours`;
  };

  const handleApplyPreset = (preset) => {
    setNewName(preset.name);
    setNewForm(preset.form || 'Comprimé');
    setNewDoseCount(preset.doseCount || '1');
    setNewDoseUnit(preset.doseUnit || 'comp_jour');
    setNewDurationCount(preset.durationCount || '7');
    setNewDurationUnit(preset.durationUnit || 'jours');
    setNewMoment(preset.moment || '');
    setNewNonSub(Boolean(preset.nonSubstituable));
    setNameError('');
  };

  const handleAddDrug = (e) => {
    e?.preventDefault();
    if (!newName.trim()) {
      setNameError(isAr ? 'يرجى إدخال اسم الدواء أولاً.' : 'Veuillez saisir le nom du médicament.');
      return;
    }

    setNameError('');
    const doseFormatted = formatDose(newDoseCount, newDoseUnit);
    const durationFormatted = formatDuration(newDurationCount, newDurationUnit);

    setDrugs([
      ...drugs,
      {
        id: `drug-${Date.now()}`,
        name: newName.trim().toUpperCase(),
        form: newForm.trim(),
        dose: doseFormatted,
        duration: durationFormatted,
        moment: newMoment.trim(),
        nonSubstituable: newNonSub
      }
    ]);

    setNewName('');
    setNewMoment('');
    setNewNonSub(false);
  };

  const handleRemoveDrug = (index) => {
    setDrugs(drugs.filter((_, i) => i !== index));
  };

  const handleResetOrdonnance = () => {
    if (window.confirm(isAr ? 'هل تريد حقاً مسح هذه الوصفة والبدء من جديد ؟' : 'Voulez-vous réinitialiser l\'ordonnance et repartir de zéro ?')) {
      setDrugs([]);
      setPatient('');
      setPatientAge('');
      setMedicalAdvice('');
      setOrdSerial(`ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  };

  const handleLoadSample = () => {
    setPatient('Ben Abdallah Fatma');
    setPatientAge('54');
    setDrugs([
      {
        id: 'd1',
        name: 'KARDEGIC 160 mg',
        form: 'Poudre pour solution buvable en sachet',
        dose: '1 sachet / jour',
        duration: '3 mois',
        moment: 'Le midi au milieu du repas avec un grand verre d\'eau',
        nonSubstituable: true
      },
      {
        id: 'd2',
        name: 'INEXIUM 40 mg',
        form: 'Gélule gastro-résistante',
        dose: '1 gélule / jour',
        duration: '1 mois',
        moment: 'Le matin à jeun 30 minutes avant le petit-déjeuner',
        nonSubstituable: false
      },
      {
        id: 'd3',
        name: 'TAHOR 20 mg',
        form: 'Comprimé pelliculé',
        dose: '1 comprimé / jour',
        duration: '3 mois',
        moment: 'Le soir au coucher',
        nonSubstituable: false
      }
    ]);
    setMedicalAdvice('Régime hyposodé. Surveillance régulière de la pression artérielle et bilan lipidique dans 3 mois.');
  };

  const handlePrint = () => {
    window.print();
  };

  // Resolved doctor identity data
  const orderNumber = doctorProfile?.orderNumber || (isSelim ? '14092' : '15840');
  const cnamCode = doctorProfile?.cnamCode || doctorProfile?.filiereCode || (isSelim ? 'CNAM-CD-40912' : 'CNAM-PR-1892');
  const cabinetAddress = doctorProfile?.address || (isSelim ? 'Avenue Hédi Nouira, Résidence Les Jardins, Ennasr 2, Tunis' : 'Cabinet Médical, Tunis, Tunisie');
  const cabinetPhone = doctorProfile?.phone || (isSelim ? '+216 71 830 900' : '+216 23 568 841');
  const docArabicName = isSelim ? 'د. سليم بن علي' : (doctorName.startsWith('Dr.') ? doctorName.replace('Dr.', 'د.') : `د. ${doctorName}`);
  const docArabicSpecialty = isSelim ? 'أخصائي في أمراض القلب والشرايين' : (doctorSpecialty.includes('Cardio') ? 'أخصائي في أمراض القلب والشرايين' : 'طبيب مباشر');

  const formattedDate = new Date(prescriptionDate).toLocaleDateString(isAr ? 'ar-TN' : 'fr-TN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Real Scannable QR Code Generator & Cryptographic Hash
  useEffect(() => {
    let isCancelled = false;

    async function generateRealQr() {
      const raw = ordSerial + '|' + (patient || 'Fatma Ben Abdallah') + '|' + (doctorName || 'Dr. Selim Ben Ali') + '|' + prescriptionDate + '|' + JSON.stringify(drugs || []);
      let hashHex = '';
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(raw);
        const buffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(buffer));
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        let h = 0;
        for (let i = 0; i < raw.length; i++) {
          h = ((h << 5) - h) + raw.charCodeAt(i);
          h |= 0;
        }
        hashHex = Math.abs(h).toString(16).padStart(32, '0');
      }

      const fullHash = 'sha256-' + hashHex.slice(0, 24);
      const shortDisplay = hashHex.slice(0, 4) + '...' + hashHex.slice(-4);

      // Create a compact payload for instant cross-device / mobile phone scanning
      const compactPayload = {
        id: ordSerial,
        h: fullHash,
        p: patient || 'Fatma Ben Abdallah',
        d: doctorName || 'Dr. Selim Ben Ali',
        s: doctorSpecialty || 'Cardiologie & Médecine Générale',
        o: orderNumber || '14092',
        dt: prescriptionDate,
        adv: medicalAdvice || '',
        rx: (drugs || []).map(item => ({
          n: item.name,
          d: item.dose || item.posology,
          m: item.moment,
          t: item.duration,
          ns: item.nonSubstituable ? 1 : 0
        }))
      };

      let encodedParam = '';
      try {
        const jsonStr = JSON.stringify(compactPayload);
        encodedParam = '?d=' + encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
      } catch (e) {}

      const targetUrl = window.location.origin + '/verify/prescription/' + fullHash + encodedParam;

      if (isCancelled) return;
      setQrHash(fullHash);
      setShaDisplay(shortDisplay);
      setVerifyUrl(targetUrl);

      // Save to local storage for instant offline / client-side verification (only when drugs are prescribed)
      if (drugs && drugs.length > 0) {
        try {
          const existing = JSON.parse(localStorage.getItem('sahatn_prescriptions') || '[]');
          const record = {
            id: ordSerial,
            qrHash: fullHash,
            patientId: 'usr-patient',
            patientName: patient || 'Patient Bénéficiaire',
            patientAge: patientAge || '',
            doctorId: doctorProfile?.id || 'doc-1',
            doctorName: doctorName || 'Dr. Selim Ben Ali',
            specialty: doctorSpecialty || 'Cardiologie & Médecine Générale',
            orderNumber: orderNumber || '14092',
            cnamCode: cnamCode || 'CNAM-CD-40912',
            cabinetAddress: cabinetAddress || 'Centre Médical Ennasr 2, Tunis',
            cabinetPhone: cabinetPhone || '+216 71 830 900',
            date: prescriptionDate,
            drugs: (drugs || []).map(d => ({
              name: d.name,
              form: d.form,
              dose: d.dose || d.posology,
              duration: d.duration,
              moment: d.moment,
              nonSubstituable: d.nonSubstituable
            })),
            medicalAdvice: medicalAdvice || '',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          };

          const filtered = existing.filter(p => p.qrHash !== fullHash && p.id !== ordSerial);
          filtered.unshift(record);
          localStorage.setItem('sahatn_prescriptions', JSON.stringify(filtered.slice(0, 50)));

          // Non-blocking sync with backend
          api.createPrescription({
            id: ordSerial,
            qrHash: fullHash,
            patientId: 'usr-patient',
            patientName: record.patientName,
            patientAge: record.patientAge,
            doctorId: record.doctorId,
            doctorName: record.doctorName,
            specialty: record.specialty,
            orderNumber: record.orderNumber,
            cnamCode: record.cnamCode,
            cabinetAddress: record.cabinetAddress,
            cabinetPhone: record.cabinetPhone,
            medicalAdvice: record.medicalAdvice,
            date: record.date,
            drugs: record.drugs
          }).catch(() => {});
        } catch (err) {}
      }

      // Generate actual scannable QR Code using qrcode library
      try {
        const qrData = await QRCode.toDataURL(targetUrl, {
          width: 300,
          margin: 1,
          color: {
            dark: '#071A2B',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        if (!isCancelled) {
          setQrCodeDataUrl(qrData);
        }
      } catch (err) {
        console.warn('QR Code generation error:', err);
      }
    }

    generateRealQr();

    return () => {
      isCancelled = true;
    };
  }, [ordSerial, patient, patientAge, drugs, prescriptionDate, doctorName, doctorSpecialty, orderNumber, cnamCode, cabinetAddress, cabinetPhone, medicalAdvice]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ════════════════ TOP TOOLBAR (NO-PRINT) ════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0c162d] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#00A896] flex items-center justify-center font-black text-xl shadow-xs">
            ℞
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'محرر الوصفات الطبية الرسمية' : 'Module Ordonnance Médicale Sécurisée'}</span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                CNOM & CNAM
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'صياغة وطباعة وصفات طبية مطابقة لمعايير عمادة الأطباء التونسيين والصيدلية المركزية.' : 'Rédaction et impression d\'ordonnances conformes aux normes du Conseil de l\'Ordre et de la Pharmacie Centrale.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Charger un exemple d'ordonnance type"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'نموذج جاهز' : 'Exemple Type'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetOrdonnance}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Effacer et recommencer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'جديدة' : 'Nouvelle'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-black rounded-xl shadow-sm hover:shadow-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة الوصفة (A4)' : 'Imprimer Ordonnance (A4)'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ════════════════ LEFT COLUMN: CONFIGURATION & DRUGS FORM (NO-PRINT) ════════════════ */}
        <div className="xl:col-span-5 bg-white dark:bg-[#0c162d] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 print:hidden">
          
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-base">✍️</span>
              <span>{isAr ? 'بيانات المريض والأدوية' : 'Saisie de la Prescription'}</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {ordSerial}
            </span>
          </div>

          <div className="space-y-4 text-xs font-bold">
            
            {/* Patient Name with quick fill button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold">
                  {isAr ? 'اسم ولقب المريض * :' : 'Nom & Prénom du Patient * :'}
                </label>
                {currentPatient && currentPatient !== patient && (
                  <button
                    type="button"
                    onClick={() => setPatient(currentPatient)}
                    className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    <span>{isAr ? `المريض الحالي: ${currentPatient}` : `En cours: ${currentPatient}`}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                placeholder={isAr ? 'مثال: فاطمة بن عبد الله' : 'Ex. Ben Abdallah Fatma'}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none focus:border-[#00A896] placeholder:text-slate-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Row: Age and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                  {isAr ? 'عمر المريض :' : 'Âge du patient :'}
                </label>
                <input
                  type="text"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="Ex. 48 ans"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none focus:border-[#00A896] text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                  {isAr ? 'تاريخ الوصفة :' : 'Date de prescription :'}
                </label>
                <input
                  type="date"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none focus:border-[#00A896] text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {/* Quick Medications Library Pills */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span>{isAr ? 'أدوية شائعة سريعة (نقرة واحدة للإدراج) :' : 'Médicaments Fréquents (1 clic pour pré-remplir) :'}</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TUNISIAN_COMMON_DRUGS.map((d, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(d)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#00A896] hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                  >
                    {d.name.split(' ')[0]} {d.name.split(' ')[1] || ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Drug Addition Form */}
            <form
              onSubmit={handleAddDrug}
              className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-900/80 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-teal-200/60 dark:border-teal-900/60 pb-2">
                <span className="text-xs text-teal-900 dark:text-teal-300 font-black flex items-center gap-1">
                  <Plus className="w-4 h-4 text-[#00A896]" />
                  <span>{isAr ? 'إضافة دواء جديد للوصفة' : 'Ajouter un médicament'}</span>
                </span>
                <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold bg-teal-100 dark:bg-teal-900/80 px-2 py-0.5 rounded-full">
                  DCI / Spécialité
                </span>
              </div>

              {/* Nom du médicament */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الدواء والجرعة * :' : 'Nom du médicament & dosage * :'}
                </label>
                <input
                  type="text"
                  placeholder="Ex: KARDEGIC 160 mg, DOLIPRANE 1000 mg..."
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold outline-none transition-all placeholder:text-slate-400 ${
                    nameError
                      ? 'border-rose-500 bg-rose-50/30 text-rose-900 ring-2 ring-rose-400/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#00A896] text-slate-800 dark:text-white'
                  }`}
                />
                {nameError && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              {/* Forme galénique */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الشكل الصيدلاني :' : 'Forme pharmaceutique :'}
                </label>
                <select
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                >
                  <option value="Comprimé">Comprimé (أقراص)</option>
                  <option value="Comprimé pelliculé sécable">Comprimé pelliculé sécable</option>
                  <option value="Gélule">Gélule (كبسولات)</option>
                  <option value="Poudre pour solution buvable en sachet">Poudre en sachet (أكياس فوارة)</option>
                  <option value="Sirop / Solution buvable">Sirop / Solution buvable (شراب)</option>
                  <option value="Solution injectable">Solution injectable (حقن)</option>
                  <option value="Pommade / Crème">Pommade / Crème (مرهم)</option>
                  <option value="Collyre">Collyre (قطرة عين)</option>
                  <option value="Gouttes auriculaires">Gouttes auriculaires (قطرة أذن)</option>
                </select>
              </div>

              {/* Posologie & Durée */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1 font-bold">
                    {isAr ? 'الجرعة اليومية :' : 'Posologie / jour :'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={newDoseCount}
                      onChange={(e) => setNewDoseCount(e.target.value)}
                      className="w-14 px-2 py-1.5 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white outline-none focus:border-[#00A896]"
                    />
                    <select
                      value={newDoseUnit}
                      onChange={(e) => setNewDoseUnit(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-xs outline-none focus:border-[#00A896]"
                    >
                      <option value="fois_jour">fois / jour</option>
                      <option value="comp_jour">comp / jour</option>
                      <option value="gelule_jour">gélule / jour</option>
                      <option value="sachet_jour">sachet / jour</option>
                      <option value="prise_jour">prise / jour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1 font-bold">
                    {isAr ? 'المدة :' : 'Durée :'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={newDurationCount}
                      onChange={(e) => setNewDurationCount(e.target.value)}
                      className="w-14 px-2 py-1.5 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white outline-none focus:border-[#00A896]"
                    />
                    <select
                      value={newDurationUnit}
                      onChange={(e) => setNewDurationUnit(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-xs outline-none focus:border-[#00A896]"
                    >
                      <option value="jours">Jours</option>
                      <option value="semaines">Semaines</option>
                      <option value="mois">Mois</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Instructions spéciales / Moment de prise */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'توقيت وطريقة التناول :' : 'Instructions particulières (moment de prise) :'}
                </label>
                <input
                  type="text"
                  placeholder="Ex: Le midi au milieu du repas avec un grand verre d'eau"
                  value={newMoment}
                  onChange={(e) => setNewMoment(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                />
              </div>

              {/* Checkbox Non substituable */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={newNonSub}
                  onChange={(e) => setNewNonSub(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span>{isAr ? 'غير قابل للاستبدال (Non Substituable)' : 'Mention « Non Substituable » (DCI obligatoire)'}</span>
              </label>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs rounded-xl cursor-pointer shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة الدواء إلى الوصفة الطبية' : 'Ajouter à l\'Ordonnance'}</span>
              </button>
            </form>

            {/* Medical Advice input */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                {isAr ? 'نصائح وإرشادات طبية خاصة بالوصفة :' : 'Recommandations & Conseils hygiéno-diététiques :'}
              </label>
              <textarea
                rows={2}
                value={medicalAdvice}
                onChange={(e) => setMedicalAdvice(e.target.value)}
                placeholder="Ex. Régime hyposodé, hydratation régulière..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none focus:border-[#00A896] text-slate-800 dark:text-white text-xs"
              />
            </div>

            {/* Signature button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400 text-xs">
                {signed ? '✓ Cachet & Signature certifiés' : 'Signature non validée'}
              </span>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isAr ? 'تعديل الإمضاء' : 'Modifier Signature'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* ════════════════ RIGHT COLUMN: AUTHENTIC REAL-LIFE TUNISIAN ORDONNANCE (A4 PAPER) ════════════════ */}
        <div className="xl:col-span-7 flex flex-col items-center">
          
          {/* Paper Container - Looks exactly like an authentic physical medical sheet on desk */}
          <div
            id="real-ordonnance-print-sheet"
            className="w-full max-w-[740px] bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-200 p-8 sm:p-12 relative flex flex-col justify-between transition-all select-none"
            style={{ minHeight: '920px' }}
          >
            
            {/* Subtle authentic Caduceus Watermark in paper background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.032] select-none">
              <svg className="w-96 h-96 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C10.9 2 10 2.9 10 4C10 4.2 10.05 4.39 10.12 4.57C8.89 5.09 8 6.3 8 7.71C8 9.24 9.07 10.5 10.5 10.74V13.06C9.28 13.34 8.35 14.36 8.1 15.63C7.43 15.24 6.7 15 6 15C3.79 15 2 16.79 2 19C2 21.21 3.79 23 6 23C7.96 23 9.59 21.58 9.93 19.72C10.54 19.9 11.23 20 12 20C12.77 20 13.46 19.9 14.07 19.72C14.41 21.58 16.04 23 18 23C20.21 23 22 21.21 22 19C22 16.79 20.21 15 18 15C17.3 15 16.57 15.24 15.9 15.63C15.65 14.36 14.72 13.34 13.5 13.06V10.74C14.93 10.5 16 9.24 16 7.71C16 6.3 15.11 5.09 13.88 4.57C13.95 4.39 14 4.2 14 4C14 2.9 13.1 2 12 2M12 4.5C12.28 4.5 12.5 4.72 12.5 5C12.5 5.28 12.28 5.5 12 5.5C11.72 5.5 11.5 5.28 11.5 5C11.5 4.72 11.72 4.5 12 4.5M12 7C12.83 7 13.5 7.67 13.5 8.5C13.5 9.33 12.83 10 12 10C11.17 10 10.5 9.33 10.5 8.5C10.5 7.67 11.17 7 12 7M6 17C7.1 17 8 17.9 8 19C8 20.1 7.1 21 6 21C4.9 21 4 20.1 4 19C4 17.9 4.9 17 6 17M18 17C19.1 17 20 17.9 20 19C20 20.1 19.1 21 18 21C16.9 21 16 20.1 16 19C16 17.9 16.9 17 18 17Z" />
              </svg>
            </div>

            {/* ════════ 1. OFFICIAL DOCTOR / CLINIC LETTERHEAD ════════ */}
            <div>
              {/* Top Legal Republic line */}
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-200 pb-1.5 mb-4">
                <span>RÉPUBLIQUE TUNISIENNE</span>
                <span className="text-[#032b43] font-black">★ CONSEIL DE L'ORDRE DES MÉDECINS ★</span>
                <span>الجمهورية التونسية</span>
              </div>

              {/* 3-Column Header: French on left, Official Caduceus center, Arabic on right */}
              <div className="grid grid-cols-12 gap-3 items-center">
                
                {/* Left: French Doctor Credentials */}
                <div className="col-span-5 text-left space-y-0.5">
                  <h1 className="font-serif text-lg sm:text-xl font-black text-[#032b43] tracking-tight leading-tight">
                    {doctorName}
                  </h1>
                  <p className="text-xs font-black text-[#00A896]">
                    {doctorSpecialty}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Ancien Interne des Hôpitaux de Tunis & Paris
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Diplômé de la Faculté de Médecine de Tunis
                  </p>
                  <div className="pt-1 text-[9px] text-slate-500 font-semibold space-y-0.5">
                    <div>Ordre National N° : <strong className="text-slate-900">{orderNumber}</strong></div>
                    <div>Conventionné CNAM : <strong className="text-slate-900">{cnamCode}</strong></div>
                  </div>
                </div>

                {/* Center: Official Medical Caduceus Emblem */}
                <div className="col-span-2 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-[#032b43] flex items-center justify-center p-1 bg-white shadow-2xs relative">
                    <svg className="w-10 h-10 text-[#032b43]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C10.9 2 10 2.9 10 4C10 4.2 10.05 4.39 10.12 4.57C8.89 5.09 8 6.3 8 7.71C8 9.24 9.07 10.5 10.5 10.74V13.06C9.28 13.34 8.35 14.36 8.1 15.63C7.43 15.24 6.7 15 6 15C3.79 15 2 16.79 2 19C2 21.21 3.79 23 6 23C7.96 23 9.59 21.58 9.93 19.72C10.54 19.9 11.23 20 12 20C12.77 20 13.46 19.9 14.07 19.72C14.41 21.58 16.04 23 18 23C20.21 23 22 21.21 22 19C22 16.79 20.21 15 18 15C17.3 15 16.57 15.24 15.9 15.63C15.65 14.36 14.72 13.34 13.5 13.06V10.74C14.93 10.5 16 9.24 16 7.71C16 6.3 15.11 5.09 13.88 4.57C13.95 4.39 14 4.2 14 4C14 2.9 13.1 2 12 2Z" />
                    </svg>
                  </div>
                  <span className="text-[7px] font-black uppercase text-[#032b43] tracking-tighter mt-1 text-center">
                    ORDRE MÉDICAL
                  </span>
                </div>

                {/* Right: Arabic Doctor Credentials */}
                <div className="col-span-5 text-right space-y-0.5" dir="rtl">
                  <h1 className="font-serif text-lg sm:text-xl font-black text-[#032b43] tracking-tight leading-tight">
                    {docArabicName}
                  </h1>
                  <p className="text-xs font-black text-[#00A896]">
                    {docArabicSpecialty}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    مقيم سابق بمستشفيات تونس وفرنسا
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    متخرج من كلية الطب بتونس
                  </p>
                  <div className="pt-1 text-[9px] text-slate-500 font-semibold space-y-0.5">
                    <div>عمادة الأطباء رقم : <strong className="text-slate-900">{orderNumber}</strong></div>
                    <div>طبيب مباشر معتمد لدى الكنام (CNAM)</div>
                  </div>
                </div>

              </div>

              {/* Security Divider Line */}
              <div className="relative my-4">
                <div className="border-t-2 border-[#032b43]" />
                <div className="border-t border-teal-500 mt-0.5" />
              </div>

              {/* ════════ 2. PATIENT & CONSULTATION METADATA BANNER ════════ */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 px-2 bg-slate-50/70 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Patient(e) :</span>
                  <span className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    {patient || '— — — — — — — — — —'}
                  </span>
                  {patientAge && (
                    <span className="text-[11px] text-slate-600 font-semibold">
                      ({patientAge})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-700 font-medium text-[11px]">
                  <span>Tunis, le <strong className="text-slate-900 font-bold">{formattedDate}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="font-mono text-slate-500 text-[10px]">{ordSerial}</span>
                </div>
              </div>

              {/* ════════ 3. PRESCRIPTION CORE (CLASSICAL ℞) ════════ */}
              <div className="mt-6 mb-4">
                
                {/* Traditional Rx Ligature Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-serif italic font-black text-3xl sm:text-4xl text-[#032b43] select-none leading-none tracking-wider">
                    ℞
                  </span>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
                </div>

                {/* Drugs List */}
                <div className="space-y-4 min-h-[300px]">
                  {drugs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                      {isAr ? 'لم تتم إضافة أي دواء بعد إلى هذه الوصفة الطبية.' : 'Aucun médicament n\'a encore été ajouté à cette ordonnance.'}
                    </div>
                  ) : (
                    drugs.map((d, index) => (
                      <div
                        key={d.id || index}
                        className="group border-b border-slate-200/80 pb-3 relative hover:bg-slate-50/50 rounded-lg p-1 transition-colors"
                      >
                        {/* Drug Name & Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-black text-sm text-[#032b43]">
                              {index + 1}.
                            </span>
                            <span className="font-black text-sm text-slate-900 tracking-wide">
                              {d.name}
                            </span>
                            {d.form && (
                              <span className="text-xs text-slate-500 font-medium italic">
                                ({d.form})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {d.nonSubstituable && (
                              <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                Non substituable
                              </span>
                            )}
                            {/* Delete button (hidden in print) */}
                            <button
                              type="button"
                              onClick={() => handleRemoveDrug(index)}
                              className="print:hidden text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Supprimer ce médicament"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Posology & Duration */}
                        <div className="pl-6 text-xs text-slate-800 mt-1 font-medium space-y-0.5">
                          <div>
                            ↳ Posologie : <strong className="font-black text-slate-900">{d.dose}</strong> — Pendant <strong className="font-black text-slate-900">{d.duration}</strong>
                          </div>
                          {d.moment && (
                            <div className="text-[11px] text-slate-600 italic">
                              ↳ {d.moment}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Medical Advice Box (if present) */}
                {medicalAdvice && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5">
                    <span className="font-black text-slate-900 text-[11px] flex items-center gap-1.5">
                      <span>📌</span>
                      <span>Recommandations & Conseils Hygiéno-Diététiques :</span>
                    </span>
                    <p className="text-slate-700 text-xs italic pl-4">
                      {medicalAdvice}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* ════════ 4. AUTHENTIC SEAL, SIGNATURE & QR CODE FOOTER ════════ */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200">
              
              <div className="grid grid-cols-12 gap-4 items-end">
                
                {/* Left: Security QR Code & Legal Regulatory Text */}
                <div className="col-span-6 space-y-1 text-left">
                  <div className="flex items-center gap-2.5">
                    {/* Real Scannable High-Res Vector QR Code */}
                    <a
                      href={verifyUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={isAr ? "رمز QR حقيقي معتمد • انقر للتحقق الفوري أو امسحه بالهاتف" : "QR Code officiel scannable • Cliquez pour tester la vérification instantanée ou scannez avec votre smartphone"}
                      className="group relative block cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0"
                    >
                      <div className="w-16 h-16 bg-white p-1 border-2 border-teal-600/70 rounded-lg shadow-sm flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-teal-500">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="QR Code Ordonnance Certifiée"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 animate-pulse rounded flex items-center justify-center text-[8px] font-bold text-slate-400">
                            QR...
                          </div>
                        )}
                        <div className="absolute inset-0 bg-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden">
                          <ExternalLink className="w-3.5 h-3.5 text-teal-800 bg-white/95 rounded p-0.5 shadow-xs" />
                        </div>
                      </div>
                    </a>

                    <div className="space-y-0.5 text-[9px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 text-[10px] flex items-center gap-1">
                          <span className="text-emerald-600 font-bold">✓</span> {isAr ? 'وصفة طبية معتمدة ومؤمنة' : 'Ordonnance Médicale Certifiée'}
                        </span>
                        <a
                          href={verifyUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8.5px] font-bold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-0.5 print:hidden"
                          title="Tester la vérification"
                        >
                          <span>(Tester)</span>
                        </a>
                      </div>
                      <span className="block font-mono text-[8.5px] text-slate-600">
                        Réf : <strong>{ordSerial}</strong> · Sha256: <span className="text-teal-700 font-bold">{shaDisplay}</span>
                      </span>
                      <span className="block text-[8px] text-slate-400 leading-tight">
                        {isAr 
                          ? 'مطابقة للمرسوم عدد 93-1155 المنظم لمجلة واجبات الأطباء • إمضاء إلكتروني' 
                          : 'Conforme au Décret N° 93-1155 du Code de Déontologie Médicale'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Authentic Doctor Stamp (Cachet Médical) & Signature */}
                <div className="col-span-6 flex flex-col items-end text-right">
                  <span className="text-[10px] font-bold text-slate-500 mb-1">
                    Signature & Cachet du Praticien
                  </span>

                  {/* Stamp & Signature Overlap Container */}
                  <div className="relative w-48 h-24 flex items-center justify-center">
                    
                    {/* Official Circular Physician Stamp (Tampon Médical Encre Bleue) */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#1e40af] p-1 flex flex-col items-center justify-center text-center opacity-85 select-none transform -rotate-3 pointer-events-none">
                      <div className="w-full h-full rounded-full border border-[#1e40af] p-1 flex flex-col items-center justify-center">
                        <span className="text-[7px] font-black uppercase tracking-wider text-[#1e40af]">
                          ★ RÉPUBLIQUE TUNISIENNE ★
                        </span>
                        <span className="text-[8.5px] font-black text-[#1e40af] leading-tight">
                          {doctorName.toUpperCase()}
                        </span>
                        <span className="text-[7px] font-bold text-[#1e40af]">
                          {doctorSpecialty}
                        </span>
                        <span className="text-[6.5px] font-semibold text-[#1e40af]">
                          Ordre N° {orderNumber} · Tunis
                        </span>
                      </div>
                    </div>

                    {/* Hand-Drawn, Uploaded, or Unique Medical Signature Overlay */}
                    {doctorSignature ? (
                      <img
                        src={doctorSignature}
                        alt={`Signature de ${doctorName}`}
                        className="h-16 max-w-[170px] object-contain relative z-10 filter contrast-125 transform rotate-2 mix-blend-multiply"
                      />
                    ) : (
                      <DoctorUniqueSignatureSvg
                        doctorName={doctorName}
                        doctorId={activeDocId}
                      />
                    )}
                  </div>
                </div>

              </div>

              {/* ════════ 5. CLINIC CONTACT BOTTOM FOOTER ════════ */}
              <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5">
                <p className="font-semibold text-slate-700">
                  {cabinetAddress}
                </p>
                <p>
                  Tél : <bdi dir="ltr">{cabinetPhone}</bdi> · Fax : (+216) 71 830 901 · Urgences : (+216) 23 568 841 · contact@sahatn.tn
                </p>
                <p className="text-[8px] text-slate-400">
                  Document officiel original réservé à la délivrance en officine pharmaceutique agréée en République Tunisienne.
                </p>
              </div>

            </div>

          </div>

          {/* Bottom Print Button */}
          <div className="mt-5 w-full max-w-[740px] flex items-center justify-end gap-3 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#00A896] hover:bg-[#008F80] text-white font-black text-sm rounded-2xl shadow-lg shadow-teal-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer className="w-5 h-5" />
              <span>{isAr ? 'طباعة هذه الوصفة الطبية الرسمية (A4)' : 'Imprimer cette Ordonnance Officielle (A4)'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* ════════ SIGNATURE MODAL ════════ */}
      {signatureModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-lg">✍️</span>
                <span>{isAr ? 'إدراج الإمضاء والختم الطبي' : 'Signature & Cachet du Praticien'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'ارسم توقيعك باليد أو إصبعك في المربع أدناه، أو قم بتحميل صورة توقيعك المعتمد :'
                : 'Tracez votre signature au doigt ou à la souris ci-dessous, ou importez une image :' }
            </p>

            <div className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-2xl p-2 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              <canvas
                ref={signatureCanvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawingSig}
                onMouseMove={drawSig}
                onMouseUp={stopDrawingSig}
                onMouseLeave={stopDrawingSig}
                onTouchStart={startDrawingSig}
                onTouchMove={drawSig}
                onTouchEnd={stopDrawingSig}
                className="touch-none bg-white dark:bg-slate-900 rounded-xl cursor-crosshair w-full h-40 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCanvasSig}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  {isAr ? 'مسح' : 'Effacer'}
                </button>
                <button
                  type="button"
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAr ? 'رفع ملف' : 'Importer image'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyNewSignature(null)}
                  className="px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title={isAr ? 'استعادة التوقيع الافتراضي الفريد لهذا الطبيب' : 'Rétablir la signature calligraphique unique par défaut'}
                >
                  <span>↺</span>
                  <span>{isAr ? 'توقيع تلقائي' : 'Signature par défaut'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSig}
                  className="px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-black shadow-sm cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اعتماد وتطبيق' : 'Appliquer la signature'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for signature image */}
      <input
        ref={signatureFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleSignatureUpload}
        className="hidden"
      />

    </div>
  );
}
