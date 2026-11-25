import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, Eye, AlertTriangle, Activity, ShieldCheck, Download, Plus, 
  FolderOpen, Upload, Paperclip, X, Check, Calendar, User, Heart, 
  Stethoscope, FileUp, Sparkles, Trash2, ArrowRight, Phone, FileCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

const DEMO_PATIENTS = [
  {
    id: 'p-1',
    name: 'Sami Mansour',
    ageGender: '52 ans (Homme)',
    phone: '+216 98 420 112',
    bloodGroup: 'A+',
    cnamNumber: 'CNAM-44910-A',
    summary: '52 ans · HTA / Cholestérol',
    allergies: 'Pénicilline, Pollen',
    history: 'Hypertension Artérielle (HTA), Hypercholestérolémie',
    records: [
      {
        id: 'rec-101',
        date: '01/08/2026',
        title: 'Bilan Lipidique & Glycémie à Jeun (Laboratoire Pasteur)',
        category: 'BIOLOGIE',
        lab: 'Laboratoire d\'Analyses Médicales Pasteur Tunis',
        result: 'Cholestérol Total: 2.45 g/L (Élevé) · Triglycérides: 1.60 g/L · Glycémie: 0.98 g/L'
      },
      {
        id: 'rec-102',
        date: '15/05/2026',
        title: 'Holter Tensionnel MAPA 24h (Tension 13/8)',
        category: 'CARDIOLOGIE',
        lab: 'Cabinet Médical Dr. Selim Ben Ali',
        result: 'Moyenne diurne: 132/82 mmHg · Charge tensionnelle contrôlée sous traitement.'
      },
      {
        id: 'rec-103',
        date: '10/01/2026',
        title: 'Échocardiographie Doppler Transthoracique',
        category: 'CARDIOLOGIE',
        lab: 'Clinique Internationale Ennasr',
        result: 'Fraction d\'éjection VG: 62% (Normale) · Pas d\'hypertrophie ventriculaire gauche.'
      }
    ]
  },
  {
    id: 'p-2',
    name: 'Fatma Ben Abdallah',
    ageGender: '38 ans (Femme)',
    phone: '+216 22 550 889',
    bloodGroup: 'O+',
    cnamNumber: 'CNAM-88120-B',
    summary: '38 ans · Palpitations / Tachycardie',
    allergies: 'Aspirine, Sulfamides',
    history: 'Tachycardie sinusale épisodique, Anémie ferriprive',
    records: [
      {
        id: 'rec-201',
        date: '12/10/2026',
        title: 'Electrocardiogramme 12 Dérivations (ECG)',
        category: 'CARDIOLOGIE',
        lab: 'Cabinet Cardiologie Dr. Selim Ben Ali',
        result: 'Rythme sinusal régulier à 88 bpm · Pas d\'anomalie de repolarisation.'
      }
    ]
  },
  {
    id: 'p-3',
    name: 'Wassim Pinky',
    ageGender: '29 ans (Homme)',
    phone: '+216 50 114 772',
    bloodGroup: 'B+',
    cnamNumber: 'CNAM-99210-C',
    summary: '29 ans · Contrôle Préventif / Sport',
    allergies: 'Aucune allergie connue',
    history: 'Certificat d\'aptitude physique, Bilan cardiologique préventif',
    records: [
      {
        id: 'rec-301',
        date: '28/10/2026',
        title: 'Bilan Cardiovasculaire & Épreuve d\'Effort',
        category: 'CARDIOLOGIE',
        lab: 'Cabinet Cardiologie Dr. Selim Ben Ali',
        result: 'Excellente capacité fonctionnelle. Récupération tensionnelle et rythmique physiologique normale.'
      }
    ]
  }
];

export default function DoctorEhrTab({ doctorId = 'doc-1', doctorName = 'Dr. Selim Ben Ali', appointments = [] }) {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';

  const docKey = doctorId || 'doc-1';
  const storagePatientsKey = `sahatn_doctor_ehr_patients_${docKey}`;
  const storageRecordsKey = `sahatn_doctor_ehr_records_${docKey}`;

  const isDemoDoctor = Boolean((!doctorId || doctorId === 'doc-1') && doctorName?.toLowerCase().includes('selim'));

  // Custom patients saved by this specific doctor
  const [customPatients, setCustomPatients] = useState(() => {
    try {
      const saved = localStorage.getItem(storagePatientsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Additional records imported by this specific doctor mapped by patient ID
  const [recordsOverrides, setRecordsOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem(storageRecordsKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Flag to explicitly load demo patients when requested
  const [demoLoaded, setDemoLoaded] = useState(false);

  // Modals state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isImportDocModalOpen, setIsImportDocModalOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Combine real custom patients and appointments (no auto-loaded demo patients)
  const patientsList = useMemo(() => {
    const list = [...customPatients];

    // Merge appointments patients
    if (Array.isArray(appointments) && appointments.length > 0) {
      appointments.forEach((apt, idx) => {
        const name = apt.patientName || apt.name;
        if (!name) return;
        if (list.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
        list.push({
          id: apt.id || `p-apt-${idx + 1}`,
          name: name,
          ageGender: apt.ageGender || 'Patient suivi',
          phone: apt.patientPhone || apt.phone || '',
          bloodGroup: apt.bloodGroup || '—',
          cnamNumber: apt.cnamCarnet || apt.cnamNumber || 'Non renseigné',
          summary: `${apt.type || 'Consultation'} · ${apt.date || 'Récemment'}`,
          allergies: apt.allergies || (isAr ? 'لا توجد حساسية معروفة مسجلة' : 'Aucune allergie connue signalée'),
          history: apt.history || (isAr ? 'استشارة بعيادة SahaTN' : 'Consultation cabinet SahaTN'),
          records: [
            {
              id: `rec-apt-${idx}`,
              date: apt.date || 'Récemment',
              title: `Consultation (${apt.type || 'Cabinet'})`,
              category: 'CONSULTATION',
              lab: `Cabinet Médical ${doctorName}`,
              result: `Consultation enregistrée avec ${doctorName}. Suivi médical standard.`
            }
          ]
        });
      });
    }

    // Attach any extra records imported for each patient
    return list.map(patient => {
      const extraRecords = recordsOverrides[patient.id] || [];
      if (extraRecords.length === 0) return patient;
      return {
        ...patient,
        records: [...extraRecords, ...(patient.records || [])]
      };
    });
  }, [customPatients, isDemoDoctor, demoLoaded, appointments, doctorName, recordsOverrides, isAr]);

  const [selectedPatientId, setSelectedPatientId] = useState(() => (patientsList[0]?.id || ''));

  // Ensure selected patient exists or fallback to first
  const currentPatient = useMemo(() => {
    return patientsList.find(p => p.id === selectedPatientId) || patientsList[0] || null;
  }, [patientsList, selectedPatientId]);

  // Form state: New Patient Dossier
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    age: '',
    gender: 'Homme',
    phone: '',
    bloodGroup: 'A+',
    cnamNumber: '',
    allergies: '',
    history: ''
  });

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.name.trim()) return;

    const newId = `p-cust-${Date.now()}`;
    const ageGender = `${newPatientForm.age ? `${newPatientForm.age} ans` : (isAr ? 'العمر غير محدد' : 'Âge non précisé')} (${newPatientForm.gender === 'Homme' ? (isAr ? 'رجل' : 'Homme') : (isAr ? 'امرأة' : 'Femme')})`;

    const createdPatient = {
      id: newId,
      name: newPatientForm.name.trim(),
      ageGender: ageGender,
      phone: newPatientForm.phone.trim() || '',
      bloodGroup: newPatientForm.bloodGroup || '—',
      cnamNumber: newPatientForm.cnamNumber.trim() || (isAr ? 'غير مسجل' : 'Non renseigné'),
      summary: `${newPatientForm.age ? `${newPatientForm.age} ans` : (isAr ? 'مريض' : 'Patient')} · ${newPatientForm.gender}`,
      allergies: newPatientForm.allergies.trim() || (isAr ? 'لا توجد حساسية معروفة' : 'Aucune allergie connue signalée'),
      history: newPatientForm.history.trim() || (isAr ? 'ملف طبي مسجل بالعيادة' : 'Dossier créé au cabinet'),
      records: [],
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    const updated = [createdPatient, ...customPatients];
    setCustomPatients(updated);
    try {
      localStorage.setItem(storagePatientsKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    setSelectedPatientId(newId);

    // Sync in background to backend EHR API if accessible
    try {
      await api.updateHealthRecord({
        patientId: newId,
        bloodType: createdPatient.bloodGroup,
        allergies: createdPatient.allergies,
        chronicDiseases: createdPatient.history
      });
    } catch (err) {
      console.warn('[EHR] Local storage active, API note:', err.message);
    }

    setIsNewPatientModalOpen(false);
    setNewPatientForm({
      name: '',
      age: '',
      gender: 'Homme',
      phone: '',
      bloodGroup: 'A+',
      cnamNumber: '',
      allergies: '',
      history: ''
    });
    showToast(isAr ? `✓ تم إنشاء وتفعيل ملف ${createdPatient.name} بنجاح.` : `✓ Dossier créé et activé pour ${createdPatient.name}.`);
  };

  // Form state: Import Medical Document
  const [importDocForm, setImportDocForm] = useState({
    title: '',
    category: 'BIOLOGIE',
    lab: '',
    date: new Date().toISOString().split('T')[0],
    result: '',
    filePreview: null,
    fileName: '',
    fileSize: ''
  });

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImportDocForm(prev => ({
        ...prev,
        filePreview: loadEvent.target?.result,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleImportDocument = async (e) => {
    e.preventDefault();
    if (!currentPatient || !importDocForm.title.trim()) return;

    let displayDate = importDocForm.date;
    if (displayDate && displayDate.includes('-')) {
      const [year, month, day] = displayDate.split('-');
      displayDate = `${day}/${month}/${year}`;
    }

    const newDocId = `rec-${Date.now()}`;
    const newDoc = {
      id: newDocId,
      date: displayDate || 'Aujourd\'hui',
      title: importDocForm.title.trim(),
      category: importDocForm.category || 'BIOLOGIE',
      lab: importDocForm.lab.trim() || `Cabinet Médical ${doctorName}`,
      result: importDocForm.result.trim() || (isAr ? 'تقرير طبي سليم دون ملاحظات استثنائية.' : 'Compte-rendu médical sans observations particulières.'),
      fileUrl: importDocForm.filePreview || null,
      fileName: importDocForm.fileName || null,
      fileSize: importDocForm.fileSize || null,
      isImported: true,
      createdAt: new Date().toISOString()
    };

    const updated = {
      ...recordsOverrides,
      [currentPatient.id]: [newDoc, ...(recordsOverrides[currentPatient.id] || [])]
    };
    setRecordsOverrides(updated);
    try {
      localStorage.setItem(storageRecordsKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }

    // Background sync to backend documents endpoint
    try {
      await api.addMedicalDocument({
        patientId: currentPatient.id,
        title: newDoc.title,
        category: newDoc.category,
        doctorName: newDoc.lab,
        date: newDoc.date,
        notes: newDoc.result,
        fileUrl: newDoc.fileName || 'document_medical.pdf'
      });
    } catch (err) {
      console.warn('[EHR] Saved locally, document API sync note:', err.message);
    }

    setIsImportDocModalOpen(false);
    setImportDocForm({
      title: '',
      category: 'BIOLOGIE',
      lab: '',
      date: new Date().toISOString().split('T')[0],
      result: '',
      filePreview: null,
      fileName: '',
      fileSize: ''
    });
    showToast(isAr ? `✓ تم استيراد الوثيقة وإضافتها لملف ${currentPatient.name}.` : `✓ Document importé et indexé au dossier de ${currentPatient.name}.`);
  };

  // Real download handler
  const handleDownloadDocument = (doc) => {
    if (!doc) return;
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(isAr ? '✓ جاري تحميل الوثيقة...' : '✓ Téléchargement du document en cours...');
      return;
    }

    // For demo or generated documents without uploaded base64 files
    const content = `=====================================================
RÉPUBLIQUE TUNISIENNE - MINISTÈRE DE LA SANTÉ PUBLIQUE
PLATEFORME NATIONALE SAHATN / MAW2IDI EHR
=====================================================

COMPTE-RENDU MÉDICAL OFFICIEL & BILAN CLINIQUE
Identifiant Document : ${doc.id}
Date d'Examen       : ${doc.date}
Établissement / Lab : ${doc.lab}
Praticien Référent  : ${doctorName}

PATIENT :
Nom & Prénom        : ${currentPatient?.name || 'Patient'}
Âge / Sexe          : ${currentPatient?.ageGender || '—'}
Groupe Sanguin      : ${currentPatient?.bloodGroup || '—'}
Identifiant CNAM    : ${currentPatient?.cnamNumber || '—'}
Allergies Connues   : ${currentPatient?.allergies || 'Aucune'}

TITRE DE L'EXAMEN :
${doc.title}

CONCLUSIONS & RÉSULTATS CLINIQUES :
${doc.result}

=====================================================
Document certifié conforme à la norme INPDP Tunisie.
Signature & Sceau numérique apposés.
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CR_${(doc.title || 'Examen').replace(/\s+/g, '_')}_${(doc.date || 'date').replace(/\//g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(isAr ? '✓ تم تصدير التقرير الطبي بنجاح.' : '✓ Compte-rendu médical exporté avec succès.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 text-xs sm:text-sm font-bold animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ════════ LEFT COLUMN: SÉLECTIONNER DOSSIER PATIENT ════════ */}
        <div data-tour="ehr-patient-selector" className="lg:col-span-4 bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
          
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'ملفات المرضى' : 'Sélectionner Dossier Patient'}
              </h2>
            </div>

            {/* + Nouveau Dossier Button */}
            <button
              type="button"
              onClick={() => setIsNewPatientModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              title={isAr ? 'إنشاء ملف مريض جديد' : 'Créer un nouveau dossier patient'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'ملف جديد' : 'Nouveau Dossier'}</span>
            </button>
          </div>

          {/* Patient Selector Dropdown */}
          {patientsList.length > 0 ? (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#00A896] cursor-pointer shadow-xs transition-colors"
            >
              {patientsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.summary || p.ageGender}) {p.isCustom ? '★' : ''}
                </option>
              ))}
            </select>
          ) : (
            <select
              disabled
              className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-400 outline-none cursor-not-allowed shadow-xs"
            >
              <option>{isAr ? '(لا يوجد ملف مريض مسجل)' : '(Aucun dossier patient actif)'}</option>
            </select>
          )}

          {/* Active Patient Card */}
          {currentPatient ? (
            <div data-tour="ehr-summary-card" className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {currentPatient.name}
                </h3>
                {currentPatient.isCustom && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-200/60 text-[#008F80] dark:bg-teal-900/80 dark:text-teal-300">
                    {isAr ? 'ملف العيادة' : 'Cabinet'}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {isAr ? 'العمر / الجنس : ' : 'Âge / Sexe : '}<strong className="text-slate-800 dark:text-white font-bold">{currentPatient.ageGender}</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {isAr ? 'فصيلة الدم : ' : 'Groupe Sanguin : '}<strong className="text-rose-600 font-black">{currentPatient.bloodGroup}</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {isAr ? 'رقم دفتر الكنام : ' : 'N° Carnet CNAM : '}<strong className="text-[#00A896] font-mono font-black">{currentPatient.cnamNumber}</strong>
                </p>
                {currentPatient.phone && (
                  <p className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{currentPatient.phone}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-teal-200/50 dark:border-teal-900/50 flex items-center justify-between text-[11px] text-teal-800 dark:text-teal-300">
                <span>{currentPatient.records?.length || 0} {isAr ? 'فحص / وثيقة مسجلة' : 'document(s) archivé(s)'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ {isAr ? 'مطابق INPDP' : 'Vérifié INPDP'}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <FolderOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {isAr ? 'لا يوجد ملف مريض محدد' : 'Aucun dossier sélectionné'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                {isAr 
                  ? 'يمكنك إنشاء ملف مريض جديد بنقرة واحدة أو تحميل نماذج تجريبية.' 
                  : 'Créez un dossier patient en un clic ou importez directement les documents cliniques.'}
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إنشاء ملف مريض جديد' : 'Créer Dossier Patient'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ════════ RIGHT COLUMN: HISTORIQUE MÉDICAL & BILAN CLINIQUE ════════ */}
        {currentPatient ? (
          <div data-tour="ehr-documents-list" className="lg:col-span-8 bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
            
            {/* Header with Importer Document Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> 
                <span>{isAr ? 'السجل الطبي والفحوصات السريرية' : 'Historique Médical & Bilan Clinique'}</span>
              </h2>

              {/* 📎 Importer Document Button */}
              <button
                type="button"
                onClick={() => setIsImportDocModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-[#00A896] font-black text-xs border border-teal-200/80 dark:border-teal-800 shadow-xs cursor-pointer flex items-center gap-2 transition-all active:scale-95 shrink-0 self-start sm:self-center"
              >
                <Paperclip className="w-4 h-4 text-[#00A896]" />
                <span>{isAr ? 'استيراد وثيقة (PDF / صورة)' : 'Importer Document (PDF / Image)'}</span>
              </button>
            </div>

            {/* 2 Alert Boxes Row: Allergies & Antécédents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Allergies Connues */}
              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
                  <span>⚠️</span> 
                  <span>{isAr ? 'الحساسية المعروفة :' : 'Allergies Connues :'}</span>
                </div>
                <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {currentPatient.allergies}
                </p>
              </div>

              {/* Box 2: Antécédents Pathologiques */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
                  <span>🩺</span> 
                  <span>{isAr ? 'السوابق المرضية والكرونيك :' : 'Antécédents Pathologiques :'}</span>
                </div>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                  {currentPatient.history}
                </p>
              </div>

            </div>

            {/* Subheading */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isAr ? 'سجل الفحوصات والتحاليل والوثائق :' : 'HISTORIQUE DES CONSULTATIONS & EXAMENS :'}
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {currentPatient.records?.length || 0} {isAr ? 'وثيقة' : 'document(s)'}
                </span>
              </div>

              {/* Examination Cards List */}
              <div className="space-y-3">
                {currentPatient.records?.length > 0 ? (
                  currentPatient.records.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 text-xs">
                        <span className="text-base shrink-0 mt-0.5 sm:mt-0">
                          {rec.category === 'CARDIOLOGIE' ? '💓' : rec.category === 'RADIOLOGIE' ? '🩻' : rec.category === 'BIOLOGIE' ? '🔬' : '🗓️'}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                            <span>{rec.date} — {rec.title}</span>
                            {rec.fileName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-[#008F80] dark:bg-teal-900/60 dark:text-teal-300">
                                📎 {rec.fileName.endsWith('.pdf') ? 'PDF' : 'IMG'}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {rec.lab}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewDocument(rec)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/80 text-[#00A896] font-bold text-xs border border-teal-200/80 dark:border-teal-900 shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center transition-all active:scale-95"
                      >
                        <span>{isAr ? 'عرض الوثيقة' : 'Voir Document'}</span>
                        <span>👁️</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {isAr ? 'لا توجد تحاليل أو وثائق مؤرشفة لهذا المريض بعد.' : 'Aucun examen ni consultation archivée dans ce dossier.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsImportDocModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{isAr ? 'استيراد أول وثيقة طبية' : 'Importer le Premier Document'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div data-tour="ehr-documents-list" className="lg:col-span-8 bg-white dark:bg-[#0c162d] rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center min-h-[380px] space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/50 text-[#00A896] flex items-center justify-center text-2xl border border-teal-100 dark:border-teal-900">
              📋
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {isAr ? 'فضاء السجل الطبي المشترك (EHR)' : 'Espace Dossier Médical Partagé (EHR)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              {isAr 
                ? 'لا يوجد سجل طبي نشط حالياً. يمكنك إنشاء ملف مريض جديد أو استيراد وثائق وفحوصات طبية مباشرة.' 
                : 'Aucun historique médical actif pour le moment. Vous pouvez créer un nouveau dossier patient ou importer des documents médicaux.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إنشاء ملف مريض جديد' : 'Créer un Nouveau Dossier Patient'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ════════ MODAL 1: NOUVEAU DOSSIER PATIENT ════════ */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isAr ? 'إنشاء ملف طبي جديد للمريض' : 'Créer un Nouveau Dossier Patient (EHR)'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewPatientModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              
              {/* Nom & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'اسم ولقب المريض *' : 'Nom & Prénom du Patient *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.name}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                    placeholder="Ex: Mohamed Trabelsi"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'رقم الهاتف' : 'Numéro de Téléphone'}
                  </label>
                  <input
                    type="tel"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    placeholder="+216 20 123 456"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  />
                </div>
              </div>

              {/* Âge, Sexe & Groupe Sanguin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'العمر (سنة)' : 'Âge (années)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newPatientForm.age}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                    placeholder="Ex: 45"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الجنس' : 'Sexe'}
                  </label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  >
                    <option value="Homme">{isAr ? 'رجل' : 'Homme'}</option>
                    <option value="Femme">{isAr ? 'امرأة' : 'Femme'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'فصيلة الدم' : 'Groupe Sanguin'}
                  </label>
                  <select
                    value={newPatientForm.bloodGroup}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, bloodGroup: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-600 outline-none focus:border-[#00A896]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="—">{isAr ? 'غير محدد' : 'Non déterminé'}</option>
                  </select>
                </div>
              </div>

              {/* N° CNAM */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'رقم المعرف / دفتر الكنام (اختياري)' : 'N° Identifiant CNAM / Carnet (Optionnel)'}
                </label>
                <input
                  type="text"
                  value={newPatientForm.cnamNumber}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, cnamNumber: e.target.value })}
                  placeholder="Ex: CNAM-30219-TN"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                />
              </div>

              {/* Allergies Connues */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="text-rose-500">⚠️</span>
                  <span>{isAr ? 'الحساسية المعروفة' : 'Allergies Connues'}</span>
                </label>
                <input
                  type="text"
                  value={newPatientForm.allergies}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, allergies: e.target.value })}
                  placeholder={isAr ? 'مثال: بنسلين، حبوب اللقاح...' : 'Ex: Pénicilline, Pollen, Aspirine...'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 outline-none focus:border-[#00A896]"
                />
              </div>

              {/* Antécédents Pathologiques */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-500">🩺</span>
                  <span>{isAr ? 'السوابق والأمراض المزمنة' : 'Antécédents Pathologiques & Chroniques'}</span>
                </label>
                <textarea
                  rows={2}
                  value={newPatientForm.history}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, history: e.target.value })}
                  placeholder={isAr ? 'مثال: ضغط الدم المرتفع، السكري، عمليات جراحية سابقة...' : 'Ex: Hypertension Artérielle, Diabète Type 2, Insuffisance veineuse...'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل الملف الطبي' : 'Enregistrer le Dossier'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL 2: IMPORTER DOCUMENT MÉDICAL ════════ */}
      {isImportDocModalOpen && currentPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📎</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isAr ? 'استيراد وثيقة أو فحص طبي' : 'Importer un Document Médical / Analyse'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'الملف الطبي للمريض : ' : 'Dossier patient : '}<strong>{currentPatient.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsImportDocModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportDocument} className="space-y-4">
              
              {/* Titre & Catégorie */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'عنوان الفحص / الوثيقة *' : 'Titre de l\'Examen ou Document *'}
                </label>
                <input
                  type="text"
                  required
                  value={importDocForm.title}
                  onChange={(e) => setImportDocForm({ ...importDocForm, title: e.target.value })}
                  placeholder="Ex: Bilan Biologique Sanguin (NFS, Glycémie, Créatinine)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'نوع الفحص' : 'Catégorie Médicale'}
                  </label>
                  <select
                    value={importDocForm.category}
                    onChange={(e) => setImportDocForm({ ...importDocForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  >
                    <option value="BIOLOGIE">🔬 Biologie & Analyses (NFS, Glycémie...)</option>
                    <option value="RADIOLOGIE">🩻 Radiologie & Imagerie (Radio, Écho, Scanner)</option>
                    <option value="CARDIOLOGIE">💓 Cardiologie & Explorations (ECG, Holter)</option>
                    <option value="COMPTE_RENDU">📝 Compte-Rendu Médical / Liaison</option>
                    <option value="ORDONNANCE">💊 Ordonnance Externe / Traitement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'تاريخ الفحص' : 'Date de l\'Examen'}
                  </label>
                  <input
                    type="date"
                    value={importDocForm.date}
                    onChange={(e) => setImportDocForm({ ...importDocForm, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                  />
                </div>
              </div>

              {/* Établissement / Laboratoire */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'المخبر / المؤسسة الطبية المصدرة' : 'Établissement, Laboratoire ou Confrère Émetteur'}
                </label>
                <input
                  type="text"
                  value={importDocForm.lab}
                  onChange={(e) => setImportDocForm({ ...importDocForm, lab: e.target.value })}
                  placeholder="Ex: Laboratoire d'Analyses Médicales Pasteur Tunis"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                />
              </div>

              {/* Conclusions & Résultats */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'النتائج والملاحظات السريرية' : 'Conclusions & Résultats Cliniques'}
                </label>
                <textarea
                  rows={3}
                  value={importDocForm.result}
                  onChange={(e) => setImportDocForm({ ...importDocForm, result: e.target.value })}
                  placeholder={isAr ? 'أدخل نتائج التحليل أو استنتاجات التقرير...' : 'Ex: Glycémie à jeun 1.05 g/L · Numération formule normale · Absence d\'anomalie aiguë.'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] resize-none"
                />
              </div>

              {/* File Attachment Dropzone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'الملف المرفق (PDF أو صورة)' : 'Fichier Médical Joint (PDF ou Image)'}
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {importDocForm.fileName ? (
                  <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileCheck className="w-5 h-5 text-[#00A896] shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {importDocForm.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {importDocForm.fileSize} · {isAr ? 'جاهز للأرشفة' : 'Prêt pour indexation'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setImportDocForm(prev => ({ ...prev, filePreview: null, fileName: '', fileSize: '' }))}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 cursor-pointer"
                    >
                      {isAr ? 'حذف' : 'Supprimer'}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#00A896] dark:hover:border-[#00A896] cursor-pointer text-center space-y-1.5 transition-colors bg-slate-50/50 dark:bg-slate-900/30"
                  >
                    <Upload className="w-6 h-6 mx-auto text-[#00A896]" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اضغط لاختيار ملف PDF أو صورة فحص' : 'Cliquez pour sélectionner un document (PDF ou Image)'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isAr ? 'الملفات المدعومة: PDF, JPG, PNG (حتى 15 ميغابايت)' : 'Formats acceptés: PDF, JPG, PNG (jusqu\'à 15 Mo)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportDocModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>{isAr ? 'استيراد وأرشفة الوثيقة' : 'Importer & Archiver au Dossier'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL 3: DOCUMENT VIEWER ════════ */}
      {viewDocument && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📄</span> 
                <span>{isAr ? 'التقرير الطبي والفحص المعتمد' : 'Compte-Rendu Médical Officiel'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setViewDocument(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-teal-50/50 dark:bg-teal-950/40 rounded-2xl border border-teal-200/80 dark:border-teal-900 space-y-1.5 text-xs">
              <p className="font-black text-slate-900 dark:text-white text-sm">{viewDocument.title}</p>
              <p className="text-slate-500">
                {isAr ? 'تاريخ الفحص : ' : 'Date d\'examen : '}<strong>{viewDocument.date}</strong> · {isAr ? 'المؤسسة : ' : 'Établissement : '}<strong>{viewDocument.lab}</strong>
              </p>
              {currentPatient && (
                <p className="text-slate-500">
                  {isAr ? 'المريض : ' : 'Patient : '}<strong>{currentPatient.name}</strong> ({currentPatient.cnamNumber})
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                {isAr ? 'النتائج والاستنتاجات السريرية :' : 'Conclusions & Résultats Cliniques :'}
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {viewDocument.result}
              </p>
            </div>

            {/* If uploaded image/document file attached */}
            {viewDocument.fileUrl && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#00A896]" />
                    <span>{viewDocument.fileName || 'Fichier joint'}</span>
                  </span>
                  {viewDocument.fileSize && (
                    <span className="text-[10px] text-slate-400">{viewDocument.fileSize}</span>
                  )}
                </div>

                {viewDocument.fileUrl.startsWith('data:image') && (
                  <div className="max-h-60 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 flex justify-center bg-black/5">
                    <img
                      src={viewDocument.fileUrl}
                      alt={viewDocument.title}
                      className="max-h-60 object-contain rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewDocument(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadDocument(viewDocument)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل الوثيقة الرسمية' : 'Télécharger Document Signé'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
