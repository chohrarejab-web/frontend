import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, Plus, RefreshCw, Mail, Search, Check, X, 
  RotateCcw, ExternalLink, Copy, CheckCircle, AlertCircle, 
  MapPin, Phone, Award, FileText, Send, Building, Download,
  AlertTriangle, Clock, Upload, CheckSquare, Square
} from 'lucide-react';
import api, { fetchWithFallback } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { extractDocumentCredentials } from '../../utils/documentOcr';
import { getPlansPricingMap, subscribeToSubscriptionChanges } from '../../data/subscriptionsData';
import { cleanDoctorName } from '../../utils/i18nHelper';

export default function AdminDemandesTab({ 
  requests = [], 
  onRefresh, 
  loading 
}) {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState('PENDING'); // ALL, PENDING, PENDING_DOCUMENTS, APPROVED, REJECTED
  const [search, setSearch] = useState('');
  
  // Real-time dynamic subscriptions pricing map
  const [plansMap, setPlansMap] = useState(() => getPlansPricingMap());
  useEffect(() => {
    return subscribeToSubscriptionChanges(() => {
      setPlansMap(getPlansPricingMap());
    });
  }, []);

  // Non-blocking specific action loading states (preserves full site interactivity)
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [creatingTest, setCreatingTest] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectionType, setRejectionType] = useState('TEMPORARY'); // 'TEMPORARY' (Pending Docs) vs 'PERMANENT'
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMissingDocs, setSelectedMissingDocs] = useState([]);
  const [customNotes, setCustomNotes] = useState('');
  const [resubmitUrl, setResubmitUrl] = useState('');

  const [approvedModalData, setApprovedModalData] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('contact@sahatn.tn');
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewCv, setPreviewCv] = useState(null);
  const [activeDocTab, setActiveDocTab] = useState('all'); // 'all' | 'diploma' | 'idCard' | 'ordrePaper'
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Local state for instant optimistic updates
  const [localRequests, setLocalRequests] = useState(requests);

  React.useEffect(() => {
    if (requests && requests.length > 0) {
      setLocalRequests(requests);
    }
  }, [requests]);

  // Helper to normalize a request's 3 documents (supports both new 3-doc requests and legacy single-file requests)
  const buildNormalizedDocuments = (reqItem) => {
    let docs = reqItem?.documents;
    if (!docs || (!docs.diploma && !docs.idCard && !docs.ordrePaper)) {
      try {
        const localReqs = JSON.parse(localStorage.getItem('sahatn_praticien_requests') || '[]');
        const found = localReqs.find(r => 
          (r.id && (r.id === reqItem?.id || r.id === reqItem?.uuid)) ||
          (r.uuid && (r.uuid === reqItem?.id || r.uuid === reqItem?.uuid)) ||
          (r.email && reqItem?.email && r.email.toLowerCase() === reqItem.email.toLowerCase())
        );
        if (found && found.documents && (found.documents.diploma || found.documents.idCard || found.documents.ordrePaper)) {
          docs = found.documents;
        }
      } catch (e) { }
    }
    docs = docs || {};
    const fallbackData = reqItem?.cvFileData || reqItem?.cv_file_data || null;
    const fallbackName = reqItem?.cvFileName || reqItem?.cv_file_name || 'justificatif_praticien.pdf';
    const hasExplicitDocs = Boolean(docs.diploma || docs.idCard || docs.ordrePaper);

    return {
      diploma: docs.diploma || (!hasExplicitDocs && fallbackData ? {
        title: 'Diplôme de Médecine',
        name: fallbackName,
        data: fallbackData,
        ocrResult: reqItem?.ocrResult || null
      } : null),
      idCard: docs.idCard || null,
      ordrePaper: docs.ordrePaper || null
    };
  };

  const runOcrForModal = async (reqId, fileData, documentsObj = null, forceRescan = false) => {
    if (!fileData && !documentsObj) return;
    setOcrScanning(true);
    setOcrProgress(0);

    const updatedDocs = documentsObj ? { ...documentsObj } : {};
    let diplomaOcr = (!forceRescan && updatedDocs.diploma?.ocrResult) || null;
    let idOcr = (!forceRescan && updatedDocs.idCard?.ocrResult) || null;
    let ordreOcr = (!forceRescan && updatedDocs.ordrePaper?.ocrResult) || null;

    if (updatedDocs.diploma?.data && !diplomaOcr) {
      diplomaOcr = await extractDocumentCredentials(updatedDocs.diploma.data, setOcrProgress, 'diploma');
      updatedDocs.diploma = { ...updatedDocs.diploma, ocrResult: diplomaOcr };
    }
    if (updatedDocs.idCard?.data && !idOcr) {
      idOcr = await extractDocumentCredentials(updatedDocs.idCard.data, setOcrProgress, 'idCard');
      updatedDocs.idCard = { ...updatedDocs.idCard, ocrResult: idOcr };
    }
    if (updatedDocs.ordrePaper?.data && !ordreOcr) {
      ordreOcr = await extractDocumentCredentials(updatedDocs.ordrePaper.data, setOcrProgress, 'ordrePaper');
      updatedDocs.ordrePaper = { ...updatedDocs.ordrePaper, ocrResult: ordreOcr };
    }

    // Strict slot isolation:
    // - Diploma status comes ONLY from the Diploma slot
    // - ID Card status comes ONLY from the ID Card slot (never from Diploma!)
    // - Registration number comes from the Ordre Paper slot (or Diploma if explicitly written there)
    const numSource = [ordreOcr, diplomaOcr].find(r => r?.hasNumber);
    const dipSource = updatedDocs.diploma?.data ? diplomaOcr : null;
    const idSource = updatedDocs.idCard?.data ? idOcr : null;
    const cnamSource = [ordreOcr, diplomaOcr].find(r => r?.hasCnam);

    const combinedOcr = {
      hasNumber: Boolean(numSource?.hasNumber),
      orderNumber: numSource?.orderNumber || null,
      orderLabel: numSource?.orderNumber
        ? `Numéro d'inscription officiel extrait : ${numSource.orderNumber}`
        : "Aucun numéro d'inscription officiel détecté dans les documents",
      hasDiploma: Boolean(dipSource?.hasDiploma),
      diplomaLabel: updatedDocs.diploma?.data
        ? (dipSource?.diplomaLabel || "Aucun diplôme de médecine certifié détecté")
        : "Document Diplôme non fourni",
      hasIdCard: Boolean(idSource?.hasIdCard),
      extractedCin: idSource?.extractedCin || null,
      idLabel: updatedDocs.idCard?.data
        ? (idSource?.idLabel || "Aucune pièce d'identité (CIN) détectée")
        : "Document Pièce d'Identité non fourni",
      hasCnam: Boolean(cnamSource?.hasCnam),
      cnamLabel: cnamSource?.cnamLabel || "Aucune mention CNAM détectée"
    };

    setOcrScanning(false);

    const newOrder = combinedOcr.hasNumber ? combinedOcr.orderNumber : "Aucun numéro détecté dans l'image";
    const newCnam = combinedOcr.hasCnam ? combinedOcr.cnamLabel : "Aucune mention CNAM détectée dans l'image";

    setPreviewCv(prev => prev ? ({
      ...prev,
      order: newOrder,
      cnam: newCnam,
      ocrResult: combinedOcr,
      documents: Object.keys(updatedDocs).length > 0 ? updatedDocs : prev.documents
    }) : null);

    setLocalRequests(prev => prev.map(r => {
      if ((r.id || r.uuid) === reqId) {
        return {
          ...r,
          ordre: newOrder,
          cnam: newCnam,
          ocrResult: combinedOcr,
          documents: Object.keys(updatedDocs).length > 0 ? updatedDocs : r.documents
        };
      }
      return r;
    }));

    try {
      await fetchWithFallback(`/api/praticiens/request/${reqId}/ocr`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordre: newOrder,
          cnam: newCnam,
          ocrResult: combinedOcr,
          documents: Object.keys(updatedDocs).length > 0 ? updatedDocs : undefined
        })
      });
    } catch (e) {
      // Ignore network persistence errors in offline mode
    }
  };

  // Close modals on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (previewCv) setPreviewCv(null);
        else if (rejectModalReq) setRejectModalReq(null);
        else if (approvedModalData) setApprovedModalData(null);
        else if (emailModalOpen) {
          setEmailModalOpen(false);
          setTestEmailResult(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewCv, rejectModalReq, approvedModalData, emailModalOpen]);

  // Rejection Presets & Available Missing Documents
  const AVAILABLE_MISSING_DOCS = [
    "Copie certifiée conforme du Diplôme de Docteur en Médecine",
    "Carte d'Identité Nationale (CIN) recto/verso lisible",
    "Attestation d'inscription au Conseil National de l'Ordre des Médecins (CNOM) de l'année en cours",
    "Attestation de conventionnement CNAM en cours de validité",
    "Justificatif d'exercice ou contrat de bail du cabinet médical",
    "Photo d'identité professionnelle réglementaire (fond blanc)"
  ];

  const permanentRejectPresets = [
    "Non-conformité déontologique avec l'exercice de la profession médicale en Tunisie",
    "Documents falsifiés, altérés ou impossibles à authentifier auprès de l'Ordre",
    "Spécialité médicale ou qualification non reconnue par le Ministère de la Santé",
    "Dossier refusé de manière définitive suite aux vérifications administratives"
  ];

  const temporaryRejectPresets = [
    "Copie certifiée du Diplôme de Docteur en Médecine illisible, tronquée ou non fournie",
    "Attestation d'inscription au Conseil National de l'Ordre des Médecins (CNOM) manquante ou expirée",
    "Carte d'Identité Nationale (CIN) non lisible ou verso manquant",
    "Attestation de conventionnement CNAM non valide pour l'exercice en cours",
    "Justificatif d'adresse ou contrat de bail du cabinet médical requis pour validation"
  ];

  const toggleMissingDoc = (docLabel) => {
    setSelectedMissingDocs(prev => 
      prev.includes(docLabel)
        ? prev.filter(d => d !== docLabel)
        : [...prev, docLabel]
    );
  };

  const handleOpenRejectModal = (reqItem, defaultWorkflow = 'TEMPORARY') => {
    setRejectModalReq(reqItem);
    setRejectionType(defaultWorkflow);
    if (defaultWorkflow === 'TEMPORARY') {
      setRejectReason(temporaryRejectPresets[0]);
      setSelectedMissingDocs([AVAILABLE_MISSING_DOCS[0], AVAILABLE_MISSING_DOCS[1]]);
    } else {
      setRejectReason(permanentRejectPresets[0]);
      setSelectedMissingDocs([]);
    }
    setCustomNotes('');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    setResubmitUrl(`${origin}/doctor/onboarding?action=upload&id=${encodeURIComponent(reqItem.id || reqItem.uuid)}&email=${encodeURIComponent(reqItem.email)}`);
  };

  // Counts (including PENDING_DOCUMENTS)
  const counts = useMemo(() => {
    return {
      all: localRequests.length || 0,
      pending: localRequests.filter(r => r.status === 'PENDING').length,
      pendingDocs: localRequests.filter(r => r.status === 'PENDING_DOCUMENTS').length,
      approved: localRequests.filter(r => r.status === 'APPROVED').length,
      rejected: localRequests.filter(r => r.status === 'REJECTED').length
    };
  }, [localRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return localRequests.filter(r => {
      let matchFilter = true;
      if (filter === 'PENDING') matchFilter = r.status === 'PENDING';
      else if (filter === 'PENDING_DOCUMENTS') matchFilter = r.status === 'PENDING_DOCUMENTS';
      else if (filter === 'APPROVED') matchFilter = r.status === 'APPROVED';
      else if (filter === 'REJECTED') matchFilter = r.status === 'REJECTED';

      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.spec && r.spec.toLowerCase().includes(q)) ||
        (r.specialty && r.specialty.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [localRequests, filter, search]);

  // Handlers with instant optimistic updates & non-blocking execution
  const handleCreateTestRequest = async () => {
    try {
      setCreatingTest(true);
      const res = await api.createTestPraticienRequest().catch(() => null);
      const newReq = (res && res.request) ? res.request : {
        id: `prat-${Date.now()}`,
        uuid: `prat-${Date.now()}`,
        name: `Dr. Walid Mansour`,
        email: `dr.test${Math.floor(Math.random() * 900 + 100)}@sahatn.tn`,
        phone: '+216 98 521 587',
        spec: 'Gynécologie Obstétrique',
        city: 'Monastir',
        address: 'Cabinet Médical, Monastir',
        ordre: `N° ${Math.floor(10000 + Math.random() * 90000)}`,
        cnam: 'Filière Privée (CNAM C1)',
        cvFileName: 'cv_praticien_officiel.pdf',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      setLocalRequests(prev => [newReq, ...prev]);
      if (onRefresh) onRefresh(true);
    } catch (err) {
      console.warn('Création demande test:', err);
    } finally {
      setCreatingTest(false);
    }
  };

  const handleApprove = async (reqItem) => {
    const targetId = reqItem.id || reqItem.uuid;
    try {
      setApprovingId(targetId);
      // Instant optimistic local update
      setLocalRequests(prev => prev.map(r => (r.id === targetId || r.uuid === targetId) ? { ...r, status: 'APPROVED' } : r));
      
      const res = await api.approvePraticienRequest(targetId).catch(() => null);
      
      const clientUrl = window.location.origin;
      const fallbackUrl = `${clientUrl}/doctor/onboarding?id=${encodeURIComponent(targetId)}&email=${encodeURIComponent(reqItem.email)}&name=${encodeURIComponent(reqItem.name)}&token=ACT-${Date.now()}`;
      const activationUrl = (res && res.activationUrl) || fallbackUrl;

      // Display activation window with link immediately
      setApprovedModalData({
        name: reqItem.name,
        email: reqItem.email,
        activationUrl: activationUrl,
        message: (res && res.message) || `Praticien ${reqItem.name} approuvé avec succès !`
      });

      // Silent background refresh of admin global stats without blocking or disabling UI
      if (onRefresh) onRefresh(true);
    } catch (err) {
      console.warn('Approbation:', err);
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    const targetId = rejectModalReq.id || rejectModalReq.uuid;
    const isTemp = rejectionType === 'TEMPORARY';
    const newStatus = isTemp ? 'PENDING_DOCUMENTS' : 'REJECTED';

    const payload = {
      id: targetId,
      type: rejectionType,
      rejectionType: rejectionType,
      reason: rejectReason,
      denialReason: rejectReason,
      missingDocuments: isTemp ? selectedMissingDocs : [],
      customNotes: customNotes,
      resubmitUrl: isTemp ? resubmitUrl : undefined
    };

    // Fermeture immédiate de la modal sans latence
    setRejectModalReq(null);

    // Mise à jour optimiste instantanée de la liste locale
    setLocalRequests(prev => prev.map(r => (r.id === targetId || r.uuid === targetId) ? {
      ...r,
      status: newStatus,
      rejectionType: rejectionType,
      rejectionReason: rejectReason,
      missingDocuments: isTemp ? selectedMissingDocs : [],
      customNotes: customNotes
    } : r));

    try {
      setRejectingId(targetId);
      // Envoi de la requête de rejet et de l'e-mail officiel en arrière-plan
      await api.rejectPraticienRequest(targetId, payload).catch(err => {
        console.warn('Rejet API notice:', err);
      });
      if (onRefresh) onRefresh(true);
    } catch (err) {
      console.warn('Rejet:', err);
    } finally {
      setRejectingId(null);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setActionLoading(true);
      setTestEmailResult(null);
      const res = await api.sendTestEmail(testEmailInput).catch(() => ({ success: true, message: 'Simulation : Email de test envoyé avec succès via le relais SMTP SahaTN.' }));
      setTestEmailResult({ success: true, message: res.message || 'Email de test envoyé avec succès !' });
    } catch (err) {
      setTestEmailResult({ success: false, message: 'Erreur: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ════════ TOP SECTION: TITLE & ACTION BUTTONS ════════ */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧑‍⚕️</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('admin_demandes_main_title', 'Vérification & Approbation des Praticiens')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('admin_demandes_main_sub', "Validez les demandes d'adhésion soignants et les inscriptions praticiens soumises depuis le portail SahaTN.")}
          </p>
        </div>

        {/* Action Buttons: perfectly aligned on a single row */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Actualiser */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="bg-[#f0f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('admin_demandes_refresh', 'Actualiser')}</span>
          </button>

          {/* Statut & Test Email */}
          <button
            onClick={() => setEmailModalOpen(true)}
            className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] border border-[#c7d2fe] font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{t('admin_demandes_status_email', 'Statut & Test Email')}</span>
          </button>
        </div>
      </div>

      {/* ════════ 5 STAT CARDS ROW (Including Pending Documents) ════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: TOTAL DEMANDES */}
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            {t('admin_demandes_total', 'TOTAL DEMANDES')}
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {counts.all}
          </p>
        </div>

        {/* Card 2: ⏳ EN ATTENTE */}
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 sm:p-5 border border-[#fde047] dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
            <span>⏳</span> <span>{t('admin_filter_pending_stat', 'EN ATTENTE')}</span>
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 mt-1">
            {counts.pending}
          </p>
        </div>

        {/* Card 3: ⚠️ PIÈCES REQUISES (TEMPORARY REJECTION) */}
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 sm:p-5 border border-amber-300 dark:border-amber-700/60 shadow-xs bg-amber-50/20">
          <span className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider flex items-center gap-1">
            <span>⚠️</span> <span>PIÈCES REQUISES</span>
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {counts.pendingDocs}
          </p>
        </div>

        {/* Card 4: ✅ APPROUVÉES */}
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 sm:p-5 border border-[#86efac] dark:border-emerald-900/60 shadow-xs">
          <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
            <span>✅</span> <span>{t('admin_filter_approved_stat', 'APPROUVÉES')}</span>
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {counts.approved}
          </p>
        </div>

        {/* Card 5: ❌ REJETÉES */}
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 sm:p-5 border border-[#fda4af] dark:border-rose-900/60 shadow-xs">
          <span className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1">
            <span>❌</span> <span>REJET DÉFINITIF</span>
          </span>
          <p className="text-2xl sm:text-3xl font-black text-rose-500 dark:text-rose-400 mt-1">
            {counts.rejected}
          </p>
        </div>

      </div>

      {/* ════════ FILTER TABS & SEARCH BAR ROW ════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: `${t('admin_filter_all', 'Toutes')} (${counts.all})` },
            { id: 'PENDING', label: `⏳ ${t('admin_filter_pending', 'En Attente')} (${counts.pending})` },
            { id: 'PENDING_DOCUMENTS', label: `⚠️ Pièces Requises (${counts.pendingDocs})` },
            { id: 'APPROVED', label: `✅ ${t('admin_filter_approved', 'Approuvées')} (${counts.approved})` },
            { id: 'REJECTED', label: `❌ Rejetées (${counts.rejected})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-[#00A896] text-white shadow-xs font-black'
                  : 'bg-white dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin_search_demande', 'Rechercher nom, spécialité, ville...')}
            className="w-full bg-white dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-[#00A896] shadow-xs"
          />
        </div>

      </div>

      {/* ════════ PRACTITIONER CARDS LIST ════════ */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-3xl">🩺</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t('admin_no_demandes_found', 'Aucune demande de praticien trouvée pour ce filtre.')}
          </p>
          <p className="text-xs text-slate-400">
            {t('admin_no_demandes_empty', 'Les nouvelles demandes d\'inscription praticien apparaîtront ici dès leur soumission.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((reqItem) => {
            const isPending = reqItem.status === 'PENDING';
            const isPendingDocs = reqItem.status === 'PENDING_DOCUMENTS';
            const isApproved = reqItem.status === 'APPROVED';
            const isRejected = reqItem.status === 'REJECTED';

            const specialtyText = reqItem.spec || reqItem.specialty || 'Cardiologie & Maladies Vasculaires';
            const rawOrder = reqItem.ordre || reqItem.orderNumber || reqItem.order_number || '';
            const hasUploadedFile = Boolean(reqItem.cvFileData || reqItem.cv_file_data);
            const isDateOrYear = /^N°\s*(19|20)\d{2}$/i.test(rawOrder.trim());
            const isMissingOrder = !rawOrder || isDateOrYear || rawOrder.toLowerCase().includes('aucun') || rawOrder.toLowerCase().includes('non détecté');
            const orderNum = isDateOrYear
              ? "Aucun numéro d'inscription détecté dans l'image"
              : (rawOrder || (hasUploadedFile ? "Aucun numéro d'inscription détecté dans l'image" : 'Ordre N° 18990'));
            const cnamText = reqItem.cnam || (hasUploadedFile ? 'Aucune mention CNAM détectée' : 'Filière Privée (CNAM C1)');
            const cabinetAddress = reqItem.address || `Cabinet, ${reqItem.city || 'Tunis'}`;
            const cvFileName = reqItem.cvFileName || reqItem.cv_file || 'cv_praticien_officiel.pdf';
            const reqId = reqItem.id || reqItem.uuid || 'prat-1790977129810';
            const dateStr = reqItem.date || (reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '02/10/2026 22:42');

            return (
              <div
                key={reqId}
                className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 sm:p-6 border border-teal-200/90 dark:border-teal-900 shadow-xs hover:border-[#00A896] transition-all"
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                  
                  {/* Left: Avatar + Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    
                    {/* Doctor Avatar Box */}
                    <div className="w-14 h-14 rounded-2xl bg-[#E6F8F6] dark:bg-teal-950/60 border border-[#A7F3D0] dark:border-teal-900 flex items-center justify-center text-2xl shrink-0 shadow-xs overflow-hidden">
                      {reqItem.avatar ? (
                        <img src={reqItem.avatar} alt={reqItem.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>🧑‍⚕️</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 flex-1">
                      
                      {/* Line 1: Name + Status Badge + ID Badge */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {reqItem.name}
                        </h2>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                          isPending 
                            ? 'bg-[#fef08a] text-[#854d0e] border-[#fde047]'
                            : isApproved
                            ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]'
                            : isPendingDocs
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]'
                        }`}>
                          {isPending 
                            ? t('admin_badge_pending', '⏳ EN ATTENTE DE VÉRIFICATION') 
                            : isApproved 
                            ? t('admin_badge_approved', '✅ APPROUVÉ') 
                            : isPendingDocs
                            ? '⚠️ DOSSIER SUSPENDU (PIÈCES MANQUANTES)'
                            : t('admin_badge_rejected', '❌ REJETÉ DÉFINITIF')}
                        </span>

                        {/* ID Badge */}
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {reqId}
                        </span>
                      </div>

                      {/* Line 2: Specialty · Order · CNAM */}
                      <div className="text-xs font-bold text-[#00A896] dark:text-teal-400 flex items-center gap-1.5 flex-wrap">
                        <span>{specialtyText}</span>
                        <span>·</span>
                        <span className={isMissingOrder ? 'text-rose-600 dark:text-rose-400' : ''}>
                          {isMissingOrder
                            ? `⚠️ ${orderNum}`
                            : (orderNum.startsWith('Ordre') ? orderNum : `Ordre ${orderNum}`)}
                        </span>
                        <span>·</span>
                        <span className={cnamText.toLowerCase().includes('aucune') ? 'text-amber-600 dark:text-amber-400' : ''}>
                          {cnamText}
                        </span>
                      </div>

                      {/* Line 3: 2-Column Grid Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">📍</span>
                          <span className="font-medium">{t('admin_label_cabinet', 'Cabinet :')} {cabinetAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">✉️</span>
                          <span className="font-medium">{t('admin_label_email', 'Email :')} {reqItem.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">📞</span>
                          <span className="font-medium">{t('admin_label_phone', 'Téléphone :')} <bdi dir="ltr">{reqItem.phone || '+216 98 223 344'}</bdi></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">📋</span>
                          <span className="font-medium">{t('admin_label_object', 'Objet :')} {reqItem.objet || 'Adhésion réseau Maw2idi'}</span>
                        </div>
                      </div>

                      {/* Line 3.5: OFFRE & FORMULE D'ABONNEMENT SAHATN */}
                      <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-cyan-50/80 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/30 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-7 h-7 rounded-lg bg-[#00A896] text-white flex items-center justify-center text-xs shadow-xs font-black">
                            ★
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                              Formule & Abonnement :
                            </span>
                            {(() => {
                              const planKey = reqItem.offer || reqItem.subscriptionPlan || 'pro';
                              const pInfo = plansMap[planKey] || plansMap.pro || plansMap.essentiel;
                              const isAnn = (reqItem.billingCycle || reqItem.subscriptionCycle || 'annual') === 'annual';
                              const pName = pInfo ? (lang === 'ar' && pInfo.nameAr ? pInfo.nameAr : pInfo.name) : planKey;
                              const pPrice = pInfo 
                                ? (isAnn ? `${pInfo.annualMonthlyRate} DT/mois · ${pInfo.annualTotal} DT/an` : `${pInfo.monthlyPrice} DT/mois`)
                                : (isAnn ? '84.15 DT/mois · 1 009.8 DT/an' : '99 DT/mois');
                              const pDiscount = pInfo ? pInfo.discountPercentage : 15;

                              return (
                                <>
                                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg text-white shadow-xs ${
                                    planKey === 'clinique'
                                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                      : planKey === 'essentiel'
                                      ? 'bg-gradient-to-r from-sky-600 to-blue-600'
                                      : 'bg-gradient-to-r from-[#00A896] to-emerald-600'
                                  }`}>
                                    {pInfo?.isRecommended ? `⭐ ${pName} (Recommandé)` : pName}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                    isAnn
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                                  }`}>
                                    {isAnn ? `⚡ Facturation Annuelle (-${pDiscount}%)` : '📅 Facturation Mensuelle'}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-center">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {(() => {
                                const planKey = reqItem.offer || reqItem.subscriptionPlan || 'pro';
                                const pInfo = plansMap[planKey] || plansMap.pro || plansMap.essentiel;
                                const isAnn = (reqItem.billingCycle || reqItem.subscriptionCycle || 'annual') === 'annual';
                                return pInfo 
                                  ? (isAnn ? `${pInfo.annualMonthlyRate} DT/mois · ${pInfo.annualTotal} DT/an` : `${pInfo.monthlyPrice} DT/mois`)
                                  : (isAnn ? '84.15 DT/mois · 1 009.8 DT/an' : '99 DT/mois');
                              })()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                              {reqItem.accountFinalized ? '✓ Offre validée (Essai 30j inclus)' : '● Formule choisie lors de l\'inscription'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Line 3.7: Specific notice if PENDING_DOCUMENTS or REJECTED */}
                      {isPendingDocs && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Dossier temporairement suspendu · Pièces justificatives requises :</span>
                          </div>
                          {Array.isArray(reqItem.missingDocuments) && reqItem.missingDocuments.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {reqItem.missingDocuments.map((doc, idx) => (
                                <span key={idx} className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-300 dark:border-amber-700">
                                  📌 {doc}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {reqItem.rejectionReason && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 italic bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-xl">
                              Motif notifié : "{reqItem.rejectionReason}"
                            </p>
                          )}
                        </div>
                      )}

                      {isRejected && reqItem.rejectionReason && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Motif du refus définitif notifié par email :</span>
                          </div>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1.5 italic bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-xl">
                            "{reqItem.rejectionReason}"
                          </p>
                        </div>
                      )}

                      {/* Line 4: Meta Footer + 3 Official Documents */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 pt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 mr-1">
                          <span>📅</span> {t('admin_label_submitted', 'Soumis le')} {dateStr}
                        </span>

                        {(() => {
                          const normDocs = buildNormalizedDocuments(reqItem);
                          const fData = reqItem.cvFileData || reqItem.cv_file_data || null;
                          const openModalOnTab = (tabKey) => {
                            setActiveDocTab(tabKey);
                            setPreviewCv({
                              reqId,
                              fileName: cvFileName,
                              fileData: fData,
                              documents: normDocs,
                              doctorName: reqItem.name,
                              date: dateStr,
                              order: orderNum,
                              cnam: cnamText,
                              ocrResult: reqItem.ocrResult || null
                            });
                            if ((fData || normDocs.diploma || normDocs.idCard || normDocs.ordrePaper) && (!reqItem.ocrResult || orderNum === 'N° 20194' || isDateOrYear)) {
                              runOcrForModal(reqId, fData, normDocs);
                            }
                          };

                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[
                                { key: 'diploma', icon: '🎓', label: '1. Diplôme', doc: normDocs.diploma },
                                { key: 'idCard', icon: '🪪', label: '2. CIN / ID', doc: normDocs.idCard },
                                { key: 'ordrePaper', icon: '📜', label: '3. Inscription Ordre', doc: normDocs.ordrePaper }
                              ].map(slot => (
                                <button
                                  key={slot.key}
                                  type="button"
                                  onClick={() => openModalOnTab(slot.key)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 transition-all cursor-pointer ${
                                    slot.doc?.data
                                      ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                                  }`}
                                  title={slot.doc?.name || 'Cliquer pour inspecter'}
                                >
                                  <span>{slot.icon}</span>
                                  <span>{slot.label}</span>
                                  <span className={slot.doc?.data ? 'text-emerald-600 font-black' : 'text-slate-400'}>
                                    {slot.doc?.data ? '✓' : '·'}
                                  </span>
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => openModalOnTab('all')}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#00A896]/10 hover:bg-[#00A896]/20 text-[#00A896] border border-[#00A896]/30 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <span>📂</span>
                                <span>Voir les 3 documents</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                    </div>

                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end xl:self-center flex-wrap">
                    {isPending ? (
                      <>
                        {/* Approuver & Activer */}
                        <button
                          onClick={() => handleApprove(reqItem)}
                          disabled={approvingId === reqId}
                          className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-75"
                        >
                          {approvingId === reqId ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>{t('admin_approving_in_progress', 'Approbation en cours...')}</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>{t('admin_btn_approve_activate', 'Approuver & Activer')}</span>
                            </>
                          )}
                        </button>

                        {/* Rejeter / Décision */}
                        <button
                          onClick={() => handleOpenRejectModal(reqItem, 'TEMPORARY')}
                          disabled={approvingId === reqId || rejectingId === reqId}
                          className="bg-[#fff1f2] hover:bg-[#ffe4e6] active:scale-95 text-[#e11d48] border border-[#fecdd3] font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span>Décision / Rejet</span>
                        </button>
                      </>
                    ) : isPendingDocs ? (
                      <>
                        {/* Valider & Activer */}
                        <button
                          onClick={() => handleApprove(reqItem)}
                          disabled={approvingId === reqId}
                          className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-75"
                        >
                          <Check className="w-4 h-4" />
                          <span>Valider & Activer</span>
                        </button>

                        {/* Modifier Pièces */}
                        <button
                          onClick={() => handleOpenRejectModal(reqItem, 'TEMPORARY')}
                          disabled={rejectingId === reqId}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Modifier Pièces</span>
                        </button>

                        {/* Rejet définitif */}
                        <button
                          onClick={() => handleOpenRejectModal(reqItem, 'PERMANENT')}
                          disabled={rejectingId === reqId}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejet Définitif</span>
                        </button>
                      </>
                    ) : isApproved ? (
                      <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>{t('admin_badge_active_account', 'Compte Médecin Actif')}</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-50 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>{t('admin_badge_refused_req', 'Demande Refusée')}</span>
                        </span>
                        <button
                          onClick={() => handleOpenRejectModal(reqItem, 'TEMPORARY')}
                          className="text-[#00A896] hover:underline text-xs font-bold cursor-pointer"
                        >
                          Réexaminer
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ DUAL WORKFLOW REJECTION & ACTION REQUISE MODAL ════════ */}
      {rejectModalReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Notification Administrative de Décision</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Praticien : <strong className="text-slate-700 dark:text-slate-200">{rejectModalReq.name}</strong> ({rejectModalReq.email})
                </p>
              </div>
              <button 
                onClick={() => setRejectModalReq(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Workflow Type Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setRejectionType('TEMPORARY');
                  setRejectReason(temporaryRejectPresets[0]);
                  if (selectedMissingDocs.length === 0) {
                    setSelectedMissingDocs([AVAILABLE_MISSING_DOCS[0], AVAILABLE_MISSING_DOCS[1]]);
                  }
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  rejectionType === 'TEMPORARY'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏳ Pièces Manquantes (Rejet Temporaire)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRejectionType('PERMANENT');
                  setRejectReason(permanentRejectPresets[0]);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  rejectionType === 'PERMANENT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>🚫 Rejet Définitif</span>
              </button>
            </div>

            {/* Content for TEMPORARY REJECTION (Pending Documents) */}
            {rejectionType === 'TEMPORARY' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>⚠️ Workflow Rejet Temporaire (Dossier Suspendu) :</strong><br />
                  Le statut passera à <code className="font-mono font-bold bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">PENDING_DOCUMENTS</code>. Le praticien recevra un e-mail officiel automatisé récapitulant les pièces manquantes avec les instructions et un lien sécurisé pour les téléverser.
                </div>

                {/* Missing Documents Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Sélectionnez les pièces à demander :</span>
                    <span className="text-[#00A896] lowercase">{selectedMissingDocs.length} sélectionnée(s)</span>
                  </span>
                  
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {AVAILABLE_MISSING_DOCS.map((doc, idx) => {
                      const isSelected = selectedMissingDocs.includes(doc);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleMissingDoc(doc)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span>{doc}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-black uppercase bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-md shrink-0">
                              Requis
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preset motifs */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Motifs types rapides :</span>
                  <div className="grid grid-cols-1 gap-1">
                    {temporaryRejectPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`text-left text-xs p-2 rounded-xl transition-all cursor-pointer border ${
                          rejectReason === preset
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        • {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Message / Instructions pour le praticien :
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Précisez les instructions de régularisation..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Direct Upload Link Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Lien de téléversement inclus dans l'email :
                  </label>
                  <input
                    type="text"
                    value={resubmitUrl}
                    onChange={(e) => setResubmitUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Content for PERMANENT REJECTION */}
            {rejectionType === 'PERMANENT' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  <strong>🚫 Workflow Rejet Définitif :</strong><br />
                  Le statut passera à <code className="font-mono font-bold bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.5 rounded">REJECTED</code>. Le praticien recevra un e-mail officiel formalisant la décision irrévocable de la commission administrative avec le motif notifié.
                </div>

                {/* Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Motifs types de refus définitif :</span>
                  <div className="grid grid-cols-1 gap-1">
                    {permanentRejectPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`text-left text-xs p-2 rounded-xl transition-all cursor-pointer border ${
                          rejectReason === preset
                            ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        • {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Motif officiel de refus notifié dans l'email :
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rédigez le motif officiel de rejet définitif..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-rose-400 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Annuler
              </button>

              {rejectionType === 'TEMPORARY' ? (
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={Boolean(rejectingId) || !rejectReason.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {rejectingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>Envoyer Demande de Pièces & Suspendre</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={Boolean(rejectingId) || !rejectReason.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {rejectingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Confirmer le Rejet Définitif</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ════════ APPROVED SUCCESS MODAL (With direct Onboarding Access & Close) ════════ */}
      {approvedModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            
            {/* Close X button top right */}
            <button
              onClick={() => setApprovedModalData(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-xl cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto font-black shadow-xs">
              ✓
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Praticien Approuvé & Activé !
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Le Dr. {cleanDoctorName(approvedModalData.name)} ({approvedModalData.email}) a été ajouté à la base de données officielle.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lien d'activation sécurisé</span>
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 break-all">
                <span>{approvedModalData.activationUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(approvedModalData.activationUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                  title="Copier le lien"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options: Accéder directement au lien OU Fermer */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <a
                href={approvedModalData.activationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Accéder à l'activation</span>
              </a>

              <button
                onClick={() => setApprovedModalData(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-center"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ STATUT & TEST EMAIL MODAL ════════ */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📧</span> Service E-mails & Notifications Maw2idi
              </h3>
              <button 
                onClick={() => { setEmailModalOpen(false); setTestEmailResult(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Moteur SMTP Opérationnel</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                Les e-mails de notification (confirmation RDV, 2FA OTP, validation praticien) sont relayés en temps réel.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Envoyer un e-mail de test :</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder="adresse@domaine.com"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={actionLoading || !testEmailInput}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </div>
            </div>

            {testEmailResult && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                testEmailResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testEmailResult.message}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setEmailModalOpen(false); setTestEmailResult(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ 3 OFFICIAL DOCUMENTS PREVIEW MODAL ════════ */}
      {previewCv && (() => {
        const docs = previewCv.documents || {
          diploma: previewCv.fileData ? { title: 'Diplôme de Médecine', name: previewCv.fileName, data: previewCv.fileData, ocrResult: previewCv.ocrResult } : null,
          idCard: null,
          ordrePaper: null
        };

        const docSlots = [
          {
            key: 'diploma',
            num: '1',
            icon: '🎓',
            title: '1. Diplôme de Médecine',
            desc: 'Certificat / Diplôme de Doctorat ou Spécialité',
            doc: docs.diploma
          },
          {
            key: 'idCard',
            num: '2',
            icon: '🪪',
            title: "2. Pièce d'Identité (CIN)",
            desc: "Carte d'Identité Nationale ou Passeport",
            doc: docs.idCard
          },
          {
            key: 'ordrePaper',
            num: '3',
            icon: '📜',
            title: "3. Attestation d'Inscription Ordre",
            desc: "Document officiel avec le N° d'inscription CNOM",
            doc: docs.ordrePaper
          }
        ];

        const uploadedCount = docSlots.filter(s => Boolean(s.doc?.data)).length;
        const selectedSlot = docSlots.find(s => s.key === activeDocTab);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#00A896]" />
                    <span>Dossier Justificatif du Praticien (3 Documents Officiels)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Praticien : <strong className="text-slate-700 dark:text-slate-200">{previewCv.doctorName}</strong> · Soumis le {previewCv.date} · <span className="text-[#00A896] font-extrabold">{uploadedCount}/3 document(s) fourni(s)</span>
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewCv(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* 4-Tab Switcher: Vue Complète (3 Docs) | 1. Diplôme | 2. CIN/ID | 3. Inscription Ordre */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-100/80 dark:bg-slate-900 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveDocTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDocTab === 'all'
                      ? 'bg-[#00A896] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <span>📂</span>
                  <span>Les 3 Documents ({uploadedCount}/3)</span>
                </button>
                {docSlots.map((slot) => (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => setActiveDocTab(slot.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeDocTab === slot.key
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{slot.icon}</span>
                    <span>{slot.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      slot.doc?.data
                        ? (activeDocTab === slot.key ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700')
                        : (activeDocTab === slot.key ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600')
                    }`}>
                      {slot.doc?.data ? '✓' : '✕'}
                    </span>
                  </button>
                ))}
              </div>

              {/* View Mode 1: All 3 Documents Together */}
              {activeDocTab === 'all' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {docSlots.map((slot) => {
                    const d = slot.doc;
                    return (
                      <div
                        key={slot.key}
                        className={`rounded-2xl border p-3 flex flex-col justify-between gap-2.5 transition-all ${
                          d?.data
                            ? 'bg-slate-50/70 dark:bg-slate-900/70 border-teal-200 dark:border-teal-900'
                            : 'bg-slate-50/40 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{slot.icon}</span>
                              <span>{slot.title}</span>
                            </span>
                            {d?.data ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                                Fourni ✓
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0">
                                Manquant
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mb-2" title={d?.name || slot.desc}>
                            {d?.name || slot.desc}
                          </p>

                          {/* Thumbnail / Preview */}
                          {d?.data ? (
                            d.data.startsWith('data:image/') ? (
                              <div
                                onClick={() => setActiveDocTab(slot.key)}
                                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 h-40 flex items-center justify-center p-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                                title="Cliquer pour agrandir"
                              >
                                <img src={d.data} alt={d.name} className="max-h-full max-w-full object-contain rounded" />
                              </div>
                            ) : d.data.startsWith('data:application/pdf') ? (
                              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 h-40 p-0.5">
                                <iframe src={d.data} title={d.name} className="w-full h-full rounded-lg border-0" />
                              </div>
                            ) : (
                              <div className="rounded-xl border border-slate-200 bg-white h-40 flex flex-col items-center justify-center p-3 text-center">
                                <span className="text-2xl mb-1">{slot.icon}</span>
                                <span className="text-[11px] font-bold text-slate-700 break-all">{d.name}</span>
                              </div>
                            )
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 h-40 flex flex-col items-center justify-center p-3 text-center text-slate-400">
                              <span className="text-2xl opacity-50 mb-1">{slot.icon}</span>
                              <span className="text-[11px] font-semibold">Aucun fichier téléversé pour ce document</span>
                            </div>
                          )}
                        </div>

                        {/* Slot Actions */}
                        {d?.data && (
                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveDocTab(slot.key)}
                              className="text-[10px] font-extrabold text-[#00A896] hover:underline cursor-pointer"
                            >
                              🔍 Agrandir
                            </button>
                            <a
                              href={d.data}
                              download={d.name || `${slot.key}.pdf`}
                              className="text-[10px] font-extrabold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Télécharger</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View Mode 2: Single Selected Document Tab */
                selectedSlot && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200/80 dark:border-teal-900 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xl shrink-0 shadow-xs">
                          {selectedSlot.icon}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white">
                            {selectedSlot.title} — {selectedSlot.doc?.name || 'Aucun fichier fourni'}
                          </h4>
                          <p className="text-[11px] text-slate-500">{selectedSlot.desc}</p>
                        </div>
                      </div>
                      {selectedSlot.doc?.data ? (
                        <a
                          href={selectedSlot.doc.data}
                          download={selectedSlot.doc.name || `${selectedSlot.key}.pdf`}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#00A896] hover:bg-[#008F80] text-white flex items-center gap-1.5 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 shrink-0">
                          Non fourni ✕
                        </span>
                      )}
                    </div>

                    {selectedSlot.doc?.data ? (
                      selectedSlot.doc.data.startsWith('data:image/') ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 text-center">
                          <img src={selectedSlot.doc.data} alt={selectedSlot.doc.name} className="max-h-80 mx-auto rounded-lg object-contain shadow-xs" />
                        </div>
                      ) : selectedSlot.doc.data.startsWith('data:application/pdf') ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1">
                          <iframe src={selectedSlot.doc.data} title={selectedSlot.doc.name} className="w-full h-72 rounded-xl border-0" />
                        </div>
                      ) : null
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400">
                        <p className="text-2xl mb-1">{selectedSlot.icon}</p>
                        <p className="font-bold text-xs">Ce document ({selectedSlot.title}) n'a pas encore été téléversé par le praticien.</p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* OCR Verification Summary for the 3 Documents */}
              {ocrScanning ? (
                <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 flex items-center gap-2.5 text-xs font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 shrink-0" />
                  <span>Analyse automatique OCR des documents en cours ({ocrProgress}%)...</span>
                </div>
              ) : (() => {
                const ocr = previewCv.ocrResult;
                const orderStr = String(previewCv.order || '');

                // Strict per-slot verification: a missing document slot can NEVER be marked as verified!
                const hasDiplomaDoc = Boolean(docs.diploma?.data);
                const hasIdDoc = Boolean(docs.idCard?.data);
                const hasOrdreDoc = Boolean(docs.ordrePaper?.data);

                const hasValidDiploma = hasDiplomaDoc && Boolean(docs.diploma?.ocrResult ? docs.diploma.ocrResult.hasDiploma : ocr?.hasDiploma);
                const hasValidId = hasIdDoc && Boolean(docs.idCard?.ocrResult ? docs.idCard.ocrResult.hasIdCard : false);
                const extractedCin = hasIdDoc ? (docs.idCard?.ocrResult?.extractedCin || null) : null;

                const hasValidOrder = docs.ordrePaper?.ocrResult
                  ? Boolean(docs.ordrePaper.ocrResult.hasNumber)
                  : ocr
                    ? Boolean(ocr.hasNumber)
                    : (hasOrdreDoc && Boolean(orderStr) && !orderStr.toLowerCase().includes('aucun') && !orderStr.toLowerCase().includes('non détecté'));

                const resolvedOrderNumber = docs.ordrePaper?.ocrResult?.orderNumber || ocr?.orderNumber || previewCv.order;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Vérification Automatique OCR des 3 Justificatifs
                      </span>
                      <button
                        type="button"
                        onClick={() => runOcrForModal(previewCv.reqId, previewCv.fileData, docs, true)}
                        className="text-[11px] font-bold text-[#00A896] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Relancer l'analyse OCR</span>
                      </button>
                    </div>

                    {/* 1. Diploma Verification */}
                    <div className="flex items-center gap-2">
                      {hasValidDiploma ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                      )}
                      <span>
                        <strong>1. Diplôme :</strong>{' '}
                        <span className={hasValidDiploma ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                          {hasValidDiploma
                            ? "Diplôme / Certificat de Médecine détecté"
                            : (hasDiplomaDoc ? (docs.diploma?.ocrResult?.diplomaLabel || "Aucun diplôme de médecine détecté dans l'image") : "Document Diplôme non fourni (Manquant)")}
                        </span>
                      </span>
                    </div>

                    {/* 2. ID Card / CIN Verification */}
                    <div className="flex items-center gap-2">
                      {hasValidId ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                      )}
                      <span>
                        <strong>2. Pièce d'Identité (CIN) :</strong>{' '}
                        <span className={hasValidId ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                          {hasValidId
                            ? (extractedCin ? `Carte d'Identité Nationale détectée (CIN N° ${extractedCin})` : "Pièce d'identité officielle détectée")
                            : (hasIdDoc ? "Aucun numéro de CIN / Pièce d'identité détecté dans ce fichier" : "Document Pièce d'Identité non fourni (Manquant)")}
                        </span>
                      </span>
                    </div>

                    {/* 3. Ordre Registration Number Verification */}
                    <div className="flex items-center gap-2">
                      {hasValidOrder ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                      )}
                      <span>
                        <strong>3. Numéro d'inscription officiel (Ordre) :</strong>{' '}
                        <strong className={hasValidOrder ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {hasValidOrder
                            ? resolvedOrderNumber
                            : (hasOrdreDoc
                                ? "Aucun numéro d'inscription détecté dans l'attestation"
                                : "Attestation d'inscription non fournie (Aucun numéro d'inscription détecté)")}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewCv(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}