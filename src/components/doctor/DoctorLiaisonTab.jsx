import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  FileText,
  Download,
  CheckCircle,
  Search,
  UserCheck,
  AlertCircle,
  X,
  Clock,
  Eye,
  Printer,
  Phone,
  MapPin,
  ShieldCheck,
  Inbox,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { INITIAL_DOCTORS } from '../../data/tunisiaData';
import { fuzzyMatch } from '../../utils/fuzzySearch';

export default function DoctorLiaisonTab({
  doctorId = 'doc-1',
  doctorName = 'Dr. Selim Ben Ali',
  doctorSpecialty = 'Cardiologie & Maladies Vasculaires',
  doctorProfile = null
}) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();

  // Tab State: 'new' (Rédiger), 'inbox' (Courriers Reçus), 'sent' (Courriers Envoyés)
  const [activeSubTab, setActiveSubTab] = useState('new');

  // Form State
  const [patient, setPatient] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [priority, setPriority] = useState('NORMAL'); // 'NORMAL' | 'URGENT' | 'TRES_URGENT'
  const [motif, setMotif] = useState('');

  // Colleague Search & Verification State
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [doctorsList, setDoctorsList] = useState(INITIAL_DOCTORS || []);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const suggestionsRef = useRef(null);

  // Submission & Feedback State
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [sentLetter, setSentLetter] = useState(null);

  // Letters Data State (Inbox & Sent)
  const [letters, setLetters] = useState([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [inboxFilter, setInboxFilter] = useState('all'); // 'all' | 'unread' | 'urgent'
  const [searchInboxQuery, setSearchInboxQuery] = useState('');

  // Letter Modal View / Print
  const [modalLetter, setModalLetter] = useState(null);

  // Load platform registered doctors for autocomplete
  useEffect(() => {
    let isMounted = true;
    async function fetchPlatformDoctors() {
      setLoadingDoctors(true);
      try {
        const res = await api.getDoctors().catch(() => null);
        const docs = res?.data || res?.doctors || res;
        if (isMounted && Array.isArray(docs) && docs.length > 0) {
          setDoctorsList(docs);
        }
      } catch (e) {
        console.warn('Fallback to INITIAL_DOCTORS:', e);
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    }
    fetchPlatformDoctors();
    return () => { isMounted = false; };
  }, []);

  // Fetch Referral Letters (Inbox & Sent)
  const loadLetters = async () => {
    setLoadingLetters(true);
    try {
      const res = await api.getReferralLetters({ doctorId }).catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        setLetters(res.data);
      }
    } catch (e) {
      console.warn('Error fetching referral letters:', e);
    } finally {
      setLoadingLetters(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, [doctorId]);

  // Real-Time Socket Listener for incoming letters
  useEffect(() => {
    if (!socket) return;
    const handleNewLetter = (letter) => {
      if (letter && (letter.recipientDoctorId === doctorId || doctorId === 'doc-1')) {
        setLetters(prev => [letter, ...prev.filter(l => l.id !== letter.id)]);
      }
    };
    socket.on('referral:new', handleNewLetter);
    socket.on('referral:sync', loadLetters);
    return () => {
      socket.off('referral:new', handleNewLetter);
      socket.off('referral:sync', loadLetters);
    };
  }, [socket, doctorId]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter colleague doctor suggestions based on typing
  const cleanQuery = recipientQuery.trim().toLowerCase().replace(/^(dr\.?|docteur)\s*/i, '');
  const filteredDoctors = useMemo(() => {
    if (!cleanQuery || cleanQuery.length < 1) return [];
    return doctorsList.filter(d => {
      // Don't suggest the currently logged-in doctor
      if (d.id === doctorId || (d.uuid && d.uuid === doctorId)) return false;
      const nameMatch = (d.name || '').toLowerCase().includes(cleanQuery) ||
                        (d.nameAr || '').includes(recipientQuery.trim());
      const specMatch = (d.specialtyFr || d.specialty || d.spec || '').toLowerCase().includes(cleanQuery) ||
                        (d.specialtyAr || '').includes(recipientQuery.trim());
      const cityMatch = (d.city || '').toLowerCase().includes(cleanQuery);
      return nameMatch || specMatch || cityMatch || fuzzyMatch(cleanQuery, d.name || '');
    }).slice(0, 6);
  }, [doctorsList, cleanQuery, recipientQuery, doctorId]);

  const isRecipientTyped = recipientQuery.trim().length >= 2;
  const isRecipientNotFound = isRecipientTyped && !selectedRecipient && filteredDoctors.length === 0;

  // Handle selecting a doctor from suggestions
  const handleSelectDoctor = (doc) => {
    setSelectedRecipient(doc);
    setRecipientQuery(doc.name);
    setShowSuggestions(false);
    setFormError('');
  };

  // Clear selected doctor
  const handleClearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientQuery('');
    setShowSuggestions(false);
  };

  // Handle Send Referral Letter
  const handleSendLetter = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!patient.trim()) {
      setFormError(isAr ? 'يرجى إدخال اسم المريض المعني بالخطاب.' : 'Le nom du patient concerné est obligatoire.');
      return;
    }

    if (!selectedRecipient) {
      setFormError(
        isAr
          ? 'تنبيه: يجب اختيار طبيب زميل مسجل ومعتمد على المنصة من قائمة الاقتراحات.'
          : 'Le médecin destinataire doit obligatoirement être inscrit et sélectionné sur la plateforme Maw2idi.'
      );
      return;
    }

    if (!motif.trim()) {
      setFormError(isAr ? 'يرجى كتابة السبب الطبي للإحالة والمعطيات السريرية.' : 'Le motif médical de transmission est obligatoire.');
      return;
    }

    setSending(true);
    try {
      const payload = {
        senderDoctorId: doctorId,
        senderDoctorName: doctorName,
        senderDoctorSpecialty: doctorSpecialty,
        recipientDoctorId: selectedRecipient.id,
        recipientDoctorName: selectedRecipient.name,
        patientName: patient.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge.trim(),
        motif: motif.trim(),
        priority
      };

      const res = await api.sendReferralLetter(payload);
      if (res?.success || res?.data) {
        const created = res.data || { ...payload, id: 'ref-' + Date.now(), createdAt: new Date().toISOString(), status: 'UNREAD' };
        setSentLetter(created);
        setLetters(prev => [created, ...prev]);
        // Reset form
        setPatient('');
        setPatientPhone('');
        setPatientAge('');
        setSelectedRecipient(null);
        setRecipientQuery('');
        setMotif('');
        setPriority('NORMAL');
      } else {
        setFormError(res?.message || (isAr ? 'تعذر إرسال الخطاب.' : "Erreur lors de l'envoi de la lettre."));
      }
    } catch (err) {
      setFormError(err?.message || (isAr ? 'حدث خطأ أثناء الإرسال.' : "Une erreur est survenue lors de la transmission."));
    } finally {
      setSending(false);
    }
  };

  // Mark a letter as read
  const handleMarkAsRead = async (letterId) => {
    try {
      await api.markReferralLetterRead(letterId).catch(() => null);
      setLetters(prev => prev.map(l => l.id === letterId ? { ...l, status: 'READ', readAt: new Date().toISOString() } : l));
      if (modalLetter && modalLetter.id === letterId) {
        setModalLetter(prev => ({ ...prev, status: 'READ' }));
      }
    } catch (e) {
      console.warn('Error marking read:', e);
    }
  };

  // Open modal letter and mark as read
  const handleOpenLetterModal = (letter) => {
    setModalLetter(letter);
    if (letter.status === 'UNREAD') {
      handleMarkAsRead(letter.id);
    }
  };

  // Letters categorizations
  const receivedLetters = useMemo(() => {
    return letters.filter(l => l.recipientDoctorId === doctorId || (!l.recipientDoctorId && doctorId === 'doc-1'));
  }, [letters, doctorId]);

  const sentLetters = useMemo(() => {
    return letters.filter(l => l.senderDoctorId === doctorId || (!l.senderDoctorId && doctorId === 'doc-1'));
  }, [letters, doctorId]);

  const unreadCount = useMemo(() => {
    return receivedLetters.filter(l => l.status === 'UNREAD').length;
  }, [receivedLetters]);

  // Filtered inbox based on tab filter & search
  const filteredInbox = useMemo(() => {
    let list = receivedLetters;
    if (inboxFilter === 'unread') {
      list = list.filter(l => l.status === 'UNREAD');
    } else if (inboxFilter === 'urgent') {
      list = list.filter(l => l.priority === 'URGENT' || l.priority === 'TRES_URGENT');
    }
    if (searchInboxQuery.trim()) {
      const q = searchInboxQuery.toLowerCase();
      list = list.filter(l =>
        (l.patientName || '').toLowerCase().includes(q) ||
        (l.senderDoctorName || '').toLowerCase().includes(q) ||
        (l.motif || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [receivedLetters, inboxFilter, searchInboxQuery]);

  // Quick insertion helpers for medical motifs
  const insertTemplateMotif = (text) => {
    setMotif(prev => prev ? `${prev}\n${text}` : text);
  };

  return (
    <div className="w-full flex justify-center py-2 sm:py-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0c162d] p-5 sm:p-8 lg:p-10 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md space-y-6 sm:space-y-8">
        
        {/* ══════════════ 1. HEADER SECTION ══════════════ */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-lg sm:text-2xl text-slate-900 dark:text-white flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">📨</span>
              <span>{isAr ? 'خطاب التوجيه والإحالة إلى طبيب زميل' : 'Lettre de Liaison & Orientation Confrère'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {isAr
                ? 'تبادل طبي آمن ومشفر بين الأطباء للإحالة وأخذ رأي تخصصي دقيق.'
                : 'Échange médical inter-praticiens crypté de bout en bout pour transfert et avis spécialisé.'}
            </p>
          </div>
        </div>

        {/* ══════════════ 2. SUB-TABS NAVIGATION (NEW / INBOX / SENT) ══════════════ */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2">
            
            {/* Tab 1: New Letter */}
            <button
              type="button"
              onClick={() => setActiveSubTab('new')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'new'
                  ? 'bg-[#00A896] text-white shadow-md shadow-teal-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Send className="w-4 h-4 rtl:rotate-180" />
              <span>{isAr ? 'إرسال خطاب جديد' : 'Rédiger une Orientation'}</span>
            </button>

            {/* Tab 2: Received Letters (Inbox) with Counter */}
            <button
              type="button"
              onClick={() => setActiveSubTab('inbox')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer relative ${
                activeSubTab === 'inbox'
                  ? 'bg-[#0086cd] text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>{isAr ? 'الخطابات الواردة' : 'Courriers Reçus'}</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                  {unreadCount} {isAr ? 'جديد' : 'non lu' + (unreadCount > 1 ? 's' : '')}
                </span>
              )}
            </button>

            {/* Tab 3: Sent Letters */}
            <button
              type="button"
              onClick={() => setActiveSubTab('sent')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'sent'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isAr ? 'الخطابات الصادرة' : 'Courriers Transmis'}</span>
              <span className="text-[11px] opacity-75">({sentLetters.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadLetters}
            disabled={loadingLetters}
            title={isAr ? 'تحديث الخطابات' : 'Actualiser'}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLetters ? 'animate-spin text-[#00A896]' : ''}`} />
          </button>
        </div>

        {/* ══════════════ 3. TAB CONTENT ══════════════ */}

        {/* ─── TAB A: RÉDIGER UN NOUVEAU COURRIER D'ORIENTATION ─── */}
        {activeSubTab === 'new' && (
          <div className="space-y-6">

            {/* Success Banner if recently sent */}
            {sentLetter && (
              <div className="bg-teal-50/90 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00A896] text-white flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-teal-900 dark:text-teal-200">
                      {isAr ? 'تم إرسال خطاب التوجيه بنجاح إلى الطبيب الزميل !' : 'Courrier d\'orientation transmis avec succès au confrère !'}
                    </h4>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                      {isAr
                        ? `تم تسجيل الإحالة للمريض (${sentLetter.patientName}) ومشاركتها مشفرة مع (${sentLetter.recipientDoctorName}).`
                        : `Dossier patient (${sentLetter.patientName}) transmis sous protocole sécurisé à (${sentLetter.recipientDoctorName}).`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenLetterModal(sentLetter)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-[#00A896] border border-teal-300 dark:border-teal-700 text-xs font-black shadow-xs hover:bg-teal-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'معاينة الخطاب' : 'Aperçu'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentLetter(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {formError && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSendLetter} data-tour="liaison-form" className="space-y-5 text-sm font-bold">
              
              {/* Row 1: Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm font-bold">
                    <span>{isAr ? 'المريض المعني :' : 'Patient concerné :'}</span>
                    <span className="text-rose-500 mx-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={patient}
                    onChange={(e) => {
                      setPatient(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder={isAr ? 'مثال: سامي المنصور' : 'Nom & Prénom du patient concerné...'}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm font-bold">
                    <span>{isAr ? 'العمر :' : 'Âge :'}</span>
                    <span className="text-slate-400 font-normal text-xs">({isAr ? 'اختياري' : 'Optionnel'})</span>
                  </label>
                  <input
                    type="text"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder={isAr ? 'مثال: 45 سنة' : 'Ex: 48 ans'}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none focus:border-[#00A896] text-slate-800 dark:text-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm font-bold">
                    <span>{isAr ? 'هاتف المريض :' : 'Tél. Patient :'}</span>
                    <span className="text-slate-400 font-normal text-xs">({isAr ? 'اختياري' : 'Optionnel'})</span>
                  </label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+216 -- --- ---"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none focus:border-[#00A896] text-slate-800 dark:text-white transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Colleague Doctor Recipient with Platform Verification & Autocomplete */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm font-bold flex items-center justify-between">
                  <div>
                    <span>{isAr ? 'الطبيب الزميل المستلم :' : 'Médecin Confrère Destinataire :'}</span>
                    <span className="text-rose-500 mx-1">*</span>
                  </div>
                  <span className="text-[11px] text-[#00A896] font-bold">
                    ✓ {isAr ? 'يجب أن يكون مسجلاً على منصة موعدي' : 'Doit être inscrit sur Maw2idi'}
                  </span>
                </label>

                {/* If a doctor is already verified & selected */}
                {selectedRecipient ? (
                  <div className="bg-teal-50 dark:bg-teal-950/60 border-2 border-[#00A896] rounded-2xl p-4 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        {selectedRecipient.avatar || selectedRecipient.image ? (
                          <img
                            src={selectedRecipient.avatar || selectedRecipient.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-lg">🩺</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                            {selectedRecipient.name}
                          </h5>
                          <span className="bg-[#00A896] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{isAr ? 'طبيب معتمد على المنصة' : 'Praticien Vérifié Maw2idi'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold truncate mt-0.5">
                          {selectedRecipient.specialtyFr || selectedRecipient.specialty || selectedRecipient.spec}
                          {selectedRecipient.city ? ` • ${selectedRecipient.city}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearRecipient}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black border border-rose-200 dark:border-rose-900 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تغيير' : 'Changer'}</span>
                    </button>
                  </div>
                ) : (
                  /* Autocomplete Search Input */
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        value={recipientQuery}
                        onChange={(e) => {
                          setRecipientQuery(e.target.value);
                          setShowSuggestions(true);
                          if (formError) setFormError('');
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={
                          isAr
                            ? 'ابحث باسم الطبيب الزميل (مثال: د. منصف الخمير أو د. سميع المنصوري)...'
                            : 'Rechercher par nom de confrère (ex. Dr. Moncef Khemir, Dr. Sami Mansouri)...'
                        }
                        className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-slate-400 ${
                          isRecipientNotFound
                            ? 'border-rose-400 ring-2 ring-rose-400/20 text-slate-800 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 text-slate-800 dark:text-white'
                        }`}
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 end-4 flex items-center gap-2 pointer-events-none text-slate-400">
                        {loadingDoctors ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-[#00A896]" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Suggestions Dropdown Popup */}
                    {showSuggestions && recipientQuery.trim().length >= 1 && (
                      <div className="absolute top-full mt-2 inset-x-0 z-50 bg-white dark:bg-[#0c1a2e] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn max-h-72 overflow-y-auto">
                        {filteredDoctors.length > 0 ? (
                          <>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center justify-between">
                              <span>{isAr ? 'الأطباء الزملاء المسجلون على المنصة :' : 'Praticiens inscrits sur la plateforme :'}</span>
                              <span className="text-[#00A896]">{filteredDoctors.length} {isAr ? 'نتائج' : 'résultats'}</span>
                            </div>

                            {filteredDoctors.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => handleSelectDoctor(doc)}
                                className="w-full p-3 sm:p-3.5 text-start hover:bg-teal-50/70 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-base">
                                    {doc.avatar || doc.image ? (
                                      <img
                                        src={doc.avatar || doc.image}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    ) : (
                                      '🩺'
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00A896] transition-colors truncate">
                                        {doc.name}
                                      </span>
                                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold px-1.5 py-0.2 rounded">
                                        ✓ {isAr ? 'مسجل' : 'Inscrit'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                      {doc.specialtyFr || doc.specialty || doc.spec}
                                      {doc.city ? ` • ${doc.city}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <span className="text-xs font-black text-[#00A896] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {isAr ? 'اختيار ←' : 'Sélectionner →'}
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          /* NOT FOUND WARNING STATE */
                          <div className="p-5 text-center space-y-2 bg-rose-50/50 dark:bg-rose-950/30">
                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center mx-auto text-lg">
                              ⚠️
                            </div>
                            <h5 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">
                              {isAr
                                ? 'لم يتم العثور على طبيب بهذا الاسم مسجل على المنصة !'
                                : 'Aucun médecin correspondant inscrit sur Maw2idi !'}
                            </h5>
                            <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed max-w-md mx-auto">
                              {isAr
                                ? 'يشترط بروتوكول الإحالة المشفر أن يكون الطبيب الزميل المستلم يملك حساباً مسجلاً ومفعلاً على Maw2idi لتسليم الملف الطبي بسرية تامة.'
                                : 'Le confrère destinataire doit obligatoirement disposer d\'un compte praticien actif sur la plateforme pour recevoir ce dossier crypté.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prominent Red Banner if user typed a name that does NOT exist on the platform */}
                    {isRecipientNotFound && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-800 dark:text-rose-300 space-y-0.5">
                          <p className="font-black">
                            {isAr ? 'الطبيب غير مسجل في المنصة :' : 'Praticien non trouvé sur la plateforme :'}
                          </p>
                          <p className="font-medium">
                            {isAr
                              ? `الاسم "${recipientQuery}" غير موجود ضمن قائمة الأطباء المعتمدين على Maw2idi. يرجى اختيار زميل مسجل.`
                              : `Le nom "${recipientQuery}" n'est pas répertorié parmi les soignants actifs. Veuillez choisir un praticien inscrit.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Priority / Degré d'urgence */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm font-bold">
                  {isAr ? 'درجة الاستعجال والأولوية :' : 'Degré d\'urgence & Priorité :'}
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: 'NORMAL', label: isAr ? 'عادي (Normal)' : 'Normal', desc: isAr ? 'فحص روتيني / رأي مبرمج' : 'Consultation programmée', color: 'border-slate-200 dark:border-slate-700' },
                    { id: 'URGENT', label: isAr ? 'مستعجل (Urgent) 🚨' : 'Urgent 🚨', desc: isAr ? 'في غضون 24-48 ساعة' : 'Sous 24h à 48h', color: 'border-amber-400 bg-amber-50/40 text-amber-900 dark:text-amber-300' },
                    { id: 'TRES_URGENT', label: isAr ? 'أولوية قصوى ⚡' : 'Très Urgent ⚡', desc: isAr ? 'استشارة في نفس اليوم' : 'Le jour même', color: 'border-rose-400 bg-rose-50/40 text-rose-900 dark:text-rose-300' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                        priority === p.id
                          ? 'border-[#00A896] bg-teal-50/80 dark:bg-teal-950/60 ring-2 ring-[#00A896]/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{p.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Motif médical & Éléments cliniques */}
              <div data-tour="liaison-motif">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold">
                    <span>{isAr ? 'السبب الطبي للإحالة والمعطيات السريرية :' : 'Motif médical de la transmission & éléments cliniques :'}</span>
                    <span className="text-rose-500 mx-1">*</span>
                  </label>
                  
                  {/* Quick Snippets */}
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400 font-bold">{isAr ? 'قوالب سريعة :' : 'Modèles :'}</span>
                    <button
                      type="button"
                      onClick={() => insertTemplateMotif(isAr ? 'طلب رأي تخصصي استعجالي وتقييم الحالة السريرية.' : 'Demande d\'avis spécialisé et évaluation clinique.')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#00A896] hover:bg-teal-50 cursor-pointer font-bold"
                    >
                      + {isAr ? 'رأي تخصصي' : 'Avis'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateMotif(isAr ? 'تحويل المريض للمتابعة وتعديل البروتوكول العلاجي.' : 'Transfert pour suivi thérapeutique et ajustement.')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#00A896] hover:bg-teal-50 cursor-pointer font-bold"
                    >
                      + {isAr ? 'متابعة' : 'Suivi'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateMotif(isAr ? 'استكشافات إضافية وفحوصات تصويرية تكميلية.' : 'Explorations fonctionnelles et imagerie complémentaire.')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#00A896] hover:bg-teal-50 cursor-pointer font-bold"
                    >
                      + {isAr ? 'فحوصات' : 'Bilan'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={motif}
                  onChange={(e) => {
                    setMotif(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder={
                    isAr
                      ? 'بيان حالة المريض، التشخيص المبدئي، السوابق الطبية، أو سبب طلب الرأي التخصصي...'
                      : 'Motif médical de la transmission, antécédents pertinents, éléments cliniques, traitements en cours et questions posées au confrère...'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-sm sm:text-base outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 text-slate-800 dark:text-white transition-all leading-relaxed placeholder:text-slate-400 font-sans"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00A896]" />
                  <span>{isAr ? 'إرسال آمن ومسجل بسجل عمادة الأطباء' : 'Transmission sécurisée et tracée CNOMT'}</span>
                </div>

                <button
                  type="submit"
                  disabled={sending || !selectedRecipient}
                  data-tour="liaison-send-btn"
                  className={`px-7 sm:px-9 py-3 sm:py-3.5 font-black text-xs sm:text-sm rounded-2xl shadow-sm flex items-center gap-2 transition-all ${
                    sending || !selectedRecipient
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-[#00A896] hover:bg-[#008F80] text-white shadow-teal-500/20 active:scale-95 cursor-pointer'
                  }`}
                  title={
                    !selectedRecipient
                      ? (isAr ? 'يجب اختيار طبيب مسجل على المنصة أولاً' : 'Veuillez sélectionner un médecin inscrit sur Maw2idi')
                      : ''
                  }
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جارٍ الإرسال والتشفير...' : 'Transmission en cours...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 rtl:rotate-180" />
                      <span>
                        {isAr ? 'إرسال إلى الطبيب الزميل عبر Maw2idi ✈️' : 'Transmettre au Confrère via Maw2idi ✈️'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB B: BOÎTE DE RÉCEPTION - COURRIERS REÇUS (DES CONFRÈRES) ─── */}
        {activeSubTab === 'inbox' && (
          <div className="space-y-4">
            
            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInboxFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    inboxFilter === 'all'
                      ? 'bg-[#0086cd] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? 'الكل' : 'Tous'} ({receivedLetters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxFilter('unread')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    inboxFilter === 'unread'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? 'غير مقروء' : 'Non lus'} ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxFilter('urgent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    inboxFilter === 'urgent'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? 'مستعجل' : 'Urgents'}
                </button>
              </div>

              {/* Search in inbox */}
              <div className="relative">
                <input
                  type="text"
                  value={searchInboxQuery}
                  onChange={(e) => setSearchInboxQuery(e.target.value)}
                  placeholder={isAr ? 'بحث بمريض أو زميل...' : 'Filtrer patient ou confrère...'}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-[#0086cd] w-full sm:w-56"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* List of Received Letters */}
            {filteredInbox.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#00A896] flex items-center justify-center mx-auto text-2xl shadow-xs">
                  📭
                </div>
                <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  {isAr ? 'لا توجد خطابات إحالة واردة حالياً' : 'Aucun courrier de liaison reçu'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {isAr
                    ? 'عندما يقوم طبيب زميل بإرسال خطاب توجيه أو طلب رأي طبي لك، سيظهر هنا مباشرة مع إشعار فوري.'
                    : 'Lorsque des confrères vous adresseront des patients avec dossier médical, ils apparaîtront ici avec notification temps réel.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredInbox.map((letter) => {
                  const isUnread = letter.status === 'UNREAD';
                  const isUrgent = letter.priority === 'URGENT' || letter.priority === 'TRES_URGENT';

                  return (
                    <div
                      key={letter.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all relative ${
                        isUnread
                          ? 'bg-gradient-to-r from-teal-50/70 to-white dark:from-teal-950/40 dark:to-[#0c162d] border-[#00A896]/60 shadow-sm'
                          : 'bg-white dark:bg-[#0c162d] border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        {/* Left Info: Sender Doctor & Patient */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-lg">
                            {letter.senderDoctorAvatar ? (
                              <img src={letter.senderDoctorAvatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              '🩺'
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                {letter.senderDoctorName}
                              </h4>
                              {isUnread && (
                                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                  <span>{isAr ? 'جديد' : 'Nouveau'}</span>
                                </span>
                              )}
                              {isUrgent && (
                                <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  🚨 {isAr ? 'مستعجل' : 'Urgent'}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
                              {letter.senderDoctorSpecialty || 'Médecin Confrère'}
                              {letter.senderDoctorCity ? ` • ${letter.senderDoctorCity}` : ''}
                            </p>

                            {/* Patient Badge */}
                            <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-slate-400 font-medium">{isAr ? 'المريض المحال :' : 'Patient adressé :'}</span>
                              <span className="bg-[#00A896]/15 text-[#00A896] font-black px-2.5 py-0.5 rounded-lg">
                                👤 {letter.patientName} {letter.patientAge ? `(${letter.patientAge})` : ''}
                              </span>
                              {letter.patientPhone && (
                                <span className="text-slate-400 font-mono text-[11px]">
                                  📞 {letter.patientPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Date & Actions */}
                        <div className="flex flex-col sm:items-end justify-between gap-2.5 shrink-0">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(letter.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </span>

                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsRead(letter.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                                title={isAr ? 'تأكيد القراءة' : 'Marquer comme lu'}
                              >
                                ✓ {isAr ? 'تم الاطلاع' : 'Lu'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenLetterModal(letter)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#0086cd] hover:bg-[#0074b3] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{isAr ? 'قراءة الخطاب' : 'Lire la lettre'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Clinical Excerpt */}
                      {letter.motif && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-xl font-medium">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'البيان السريري : ' : 'Résumé clinique : '}</span>
                          {letter.motif}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB C: COURRIERS ENVOYÉS (TRANSMIS PAR CE PRATICIEN) ─── */}
        {activeSubTab === 'sent' && (
          <div className="space-y-4">
            {sentLetters.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                  📤
                </div>
                <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  {isAr ? 'لم تقم بإرسال أي خطابات توجيه بعد' : 'Aucun courrier transmis pour le moment'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {isAr
                    ? 'يمكنك توجيه المرضى وأخذ رأي الزملاء من خلال تبويب "إرسال خطاب جديد".'
                    : 'Vous pouvez rédiger une orientation vers un confrère spécialiste via l\'onglet dédié.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('new')}
                  className="px-4 py-2 rounded-xl bg-[#00A896] text-white text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{isAr ? 'كتابة أول خطاب' : 'Rédiger une lettre'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sentLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c162d] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-400 font-bold">{isAr ? 'إلى الزميل :' : 'Destinataire :'}</span>
                        <h5 className="font-black text-sm text-slate-900 dark:text-white">
                          {letter.recipientDoctorName}
                        </h5>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold px-2 py-0.5 rounded-full">
                          {letter.recipientDoctorSpecialty || 'Médecin'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span>{isAr ? 'المريض :' : 'Patient :'}</span>
                        <span className="font-extrabold text-[#00A896]">{letter.patientName}</span>
                        {letter.patientAge ? <span>({letter.patientAge})</span> : null}
                      </div>

                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 italic">
                        "{letter.motif}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-slate-400">
                        {new Date(letter.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenLetterModal(letter)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAr ? 'عرض' : 'Voir'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══════════════ 4. OFFICIAL CNOMT PRINTABLE LETTER MODAL ══════════════ */}
      {modalLetter && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-6 my-auto">
            
            {/* Modal Controls Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📨</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {isAr ? 'معاينة خطاب التوجيه الطبي الرسمي' : 'Courrier Médical d\'Orientation Confrère'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalLetter(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official Letter Canvas (Conforme Conseil National de l'Ordre des Médecins) */}
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-inner space-y-6 print:border-none print:shadow-none print:p-0">
              
              {/* Official Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                    RÉPUBLIQUE TUNISIENNE • ORDRE DES MÉDECINS
                  </h4>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {modalLetter.senderDoctorName}
                  </h3>
                  <p className="text-xs text-slate-600 font-bold">
                    {modalLetter.senderDoctorSpecialty || 'Médecin Praticien'}
                  </p>
                </div>

                <div className="text-end space-y-0.5 text-xs text-slate-600">
                  <span className="inline-block bg-[#00A896] text-white text-[10px] font-black px-2 py-0.5 rounded">
                    Maw2idi e-Santé
                  </span>
                  <p className="font-mono text-[11px] text-slate-500">Réf: {modalLetter.id}</p>
                  <p className="font-bold">
                    {new Date(modalLetter.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Colleague Destinataire Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">À l'attention bienveillante du confrère :</span>
                  <h4 className="text-base font-black text-slate-900">{modalLetter.recipientDoctorName}</h4>
                  <p className="text-xs text-slate-600 font-bold">{modalLetter.recipientDoctorSpecialty} {modalLetter.recipientDoctorCity ? `(${modalLetter.recipientDoctorCity})` : ''}</p>
                </div>
                <div className="text-end">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    modalLetter.priority === 'URGENT' || modalLetter.priority === 'TRES_URGENT'
                      ? 'bg-rose-100 text-rose-800 font-black'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {modalLetter.priority || 'NORMAL'}
                  </span>
                </div>
              </div>

              {/* Patient Identification */}
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs uppercase font-extrabold text-slate-400 block mb-1">Patient concerné :</span>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-800">
                  <span className="text-base font-black text-[#00A896]">👤 {modalLetter.patientName}</span>
                  {modalLetter.patientAge && <span>Âge: {modalLetter.patientAge}</span>}
                  {modalLetter.patientPhone && <span className="font-mono">Tél: {modalLetter.patientPhone}</span>}
                </div>
              </div>

              {/* Clinical Notes & Motif */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-extrabold text-slate-400 block">Motif de transmission & Données cliniques :</span>
                <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-serif bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {modalLetter.motif}
                </div>
              </div>

              {/* Official Seal / Signature Footer */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="space-y-1">
                  <p className="font-bold text-slate-700">Signature Électronique Certifiée Maw2idi</p>
                  <p className="text-[10px] text-slate-400">Cryptage certifié conforme Loi Organique n° 2004-63 (INPDP Tunisie)</p>
                </div>
                <div className="text-center border-2 border-dashed border-teal-600/40 p-2 rounded-xl text-[11px] font-black text-teal-800">
                  <span>CACHET MÉDICAL NUMÉRIQUE</span>
                  <div className="text-[9px] font-mono text-teal-600 mt-0.5">ID: {modalLetter.senderDoctorId}</div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setModalLetter(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-2xl bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-xs cursor-pointer shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة المستند' : 'Imprimer le courrier'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
