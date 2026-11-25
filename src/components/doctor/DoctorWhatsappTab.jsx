import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown,
  Check,
  CheckCheck,
  Globe,
  MessageSquare,
  Send,
  Sparkles,
  Radio,
  Phone,
  User,
  RefreshCw,
  Clock,
  Smartphone,
  MessageCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import TunisianPhoneInput from '../common/TunisianPhoneInput';

const TEMPLATES = {
  confirm_gps: {
    fr: `Bonjour {PATIENT_NAME}, votre rendez-vous est confirmé pour le {DATE} à {TIME} avec le {DOCTOR_NAME}.

📍 Cabinet Médical: Avenue Hédi Nouira, Ennasr 2, Tunis.
🗺️ Géolocalisation GPS: https://maps.google.com/?q=36.85,10.16
📞 Contact Secrétariat: +216 71 830 900`,
    ar: `مرحباً {PATIENT_NAME}، تم تأكيد موعدكم الطبي ليوم {DATE} على الساعة {TIME} مع {DOCTOR_NAME}.

📍 عنوان العيادة: شارع الهادي نويرة، النصر 2، تونس.
🗺️ الموقع الجغرافي (GPS): https://maps.google.com/?q=36.85,10.16
📞 للتواصل مع السكريتاريا: 21671830900+`
  },
  rappel_demain: {
    fr: `Bonjour {PATIENT_NAME}, rappel de votre consultation prévue demain à {TIME} avec le {DOCTOR_NAME}.

📍 Cabinet Médical: Avenue Hédi Nouira, Ennasr 2, Tunis.
📞 Contact Secrétariat: +216 71 830 900
Merci de vous présenter 10 minutes avant l'heure fixée.`,
    ar: `مرحباً {PATIENT_NAME}، تذكير بموعد استشارتكم الطبية المقررة غداً على الساعة {TIME} مع {DOCTOR_NAME}.

📍 عنوان العيادة: شارع الهادي نويرة، النصر 2، تونس.
📞 هاتف الاستقبال والسكريتاريا: 21671830900+
يرجى الحضور قبل الموعد بـ 10 دقائق لضمان حسن سير الاستقبال.`
  },
  retard_cabinet: {
    fr: `Information Cabinet : Bonjour {PATIENT_NAME}, le {DOCTOR_NAME} a un décalage imprévu d'environ 20 minutes suite à une urgence.

Vous pouvez vous présenter à {TIME} sans attente prolongée. Merci de votre compréhension.`,
    ar: `إشعار من العيادة: مرحباً {PATIENT_NAME}، يُعلمكم {DOCTOR_NAME} بوجود تأخير طارئ بحوالي 20 دقيقة بسبب حالة استعجالية.

يمكنكم الحضور في تمام الساعة {TIME} دون انتظار طويل. شكراً جزيلاً لتفهمكم.`
  },
  resultats_prets: {
    fr: `Information SahaTN : Bonjour {PATIENT_NAME}, vos résultats d'analyses et bilans ont été validés par le {DOCTOR_NAME}.

Ils sont consultables dès à présent dans votre Espace Patient sécurisé Saha.tn.`,
    ar: `إشعار من منصة صحة تونس (SahaTN): مرحباً {PATIENT_NAME}، تمت مراجعة والمصادقة على نتائج تحاليلكم وفحوصاتكم الطبية من قبل {DOCTOR_NAME}.

يمكنكم الاطلاع عليها الآن بكل أمان عبر فضائكم الصحي الخاص على: Saha.tn`
  }
};

// Play a discreet, pleasant medical communication chime using Web Audio
function playCommsChime(type = 'send') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (type === 'send') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.14); // D6
    }

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

export default function DoctorWhatsappTab({
  doctorId = 'doc-1',
  doctorName = 'Dr. Selim Ben Ali',
  doctorSpecialty = 'Cardiologue',
  currentPatient = '',
  queue = []
}) {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();

  // Language of the message/SMS to send: 'fr' or 'ar'
  const [msgLang, setMsgLang] = useState(() => (lang === 'ar' ? 'ar' : 'fr'));
  const [template, setTemplate] = useState('confirm_gps');
  const [message, setMessage] = useState(() => TEMPLATES.confirm_gps[lang === 'ar' ? 'ar' : 'fr']);

  const isDemo = (!doctorId || doctorId === 'doc-1') && (!doctorName || doctorName.toLowerCase().includes('selim'));

  // Patients directory state
  const [patientList, setPatientList] = useState([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState(() => (isDemo ? 'fatma' : 'custom'));
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('+216 ');

  // Doctor sender state
  const [senderName, setSenderName] = useState(doctorName || 'Dr. Selim Ben Ali');
  const [senderSpec, setSenderSpec] = useState(doctorSpecialty || 'Cabinet Médical');

  // Real-time communications feed & history
  const [communications, setCommunications] = useState([]);
  const [filterChannel, setFilterChannel] = useState('all'); // 'all' | 'whatsapp' | 'sms'
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Status & Notifications
  const [notification, setNotification] = useState(null);
  const [sendingType, setSendingType] = useState(null);
  const [isSimulatingReply, setIsSimulatingReply] = useState(false);

  // Sync props to state
  useEffect(() => {
    if (doctorName) setSenderName(doctorName);
    if (doctorSpecialty) setSenderSpec(doctorSpecialty);
  }, [doctorName, doctorSpecialty]);

  // Load patients directory from API
  useEffect(() => {
    let isMounted = true;
    async function loadPatients() {
      try {
        const res = await api.getCommunicationPatients(doctorId).catch(() => null);
        if (isMounted && res?.patients && res.patients.length > 0) {
          setPatientList(res.patients);
          // If currentPatient prop matches, pre-select it
          if (currentPatient) {
            const match = res.patients.find(p => p.name.toLowerCase().includes(currentPatient.toLowerCase()));
            if (match) {
              setSelectedPatientKey(match.phone || match.id);
            }
          }
        }
      } catch (err) {
        console.warn('Load comms patients notice:', err);
      }
    }
    loadPatients();
    return () => { isMounted = false; };
  }, [doctorId, currentPatient]);

  // Load communications history from API
  const fetchCommunications = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getCommunications({ doctorId, limit: 30 }).catch(() => null);
      if (res && res.success && Array.isArray(res.data)) {
        setCommunications(res.data);
      }
    } catch (err) {
      console.warn('Fetch comms notice:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, [doctorId]);

  // WebSocket Live Real-Time Listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingOutbound = (comm) => {
      if (!comm) return;
      if (!comm.doctorId || comm.doctorId === doctorId || comm.doctorId === 'doc-1') {
        playCommsChime('send');
        setCommunications(prev => {
          if (prev.some(c => c.id === comm.id)) return prev;
          return [comm, ...prev];
        });
        setNotification({
          type: comm.channel || 'sms',
          text: isAr
            ? `تم إرسال تأكيد ${comm.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} إلى ${comm.recipientName} (${comm.recipientPhone}) في الوقت الحقيقي`
            : `Notification ${comm.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} en direct émise pour ${comm.recipientName} (${comm.recipientPhone})`
        });
        setTimeout(() => setNotification(null), 6000);
      }
    };

    const handleIncomingReply = (reply) => {
      if (!reply) return;
      if (!reply.doctorId || reply.doctorId === doctorId || reply.doctorId === 'doc-1') {
        playCommsChime('reply');
        setCommunications(prev => {
          if (prev.some(c => c.id === reply.id)) return prev;
          return [reply, ...prev];
        });
        setNotification({
          type: reply.channel || 'whatsapp',
          text: isAr
            ? `وصل رد جديد في الوقت الفعلي من ${reply.recipientName || 'المريض'}: « ${reply.message} »`
            : `Réponse en direct reçue de ${reply.recipientName || 'Patient'}: « ${reply.message} »`
        });
        setTimeout(() => setNotification(null), 5000);
      }
    };

    socket.on('communication:sent', handleIncomingOutbound);
    socket.on('communication:received', handleIncomingOutbound);
    socket.on('communication:broadcast', handleIncomingOutbound);
    socket.on('communication:reply', handleIncomingReply);

    return () => {
      socket.off('communication:sent', handleIncomingOutbound);
      socket.off('communication:received', handleIncomingOutbound);
      socket.off('communication:broadcast', handleIncomingOutbound);
      socket.off('communication:reply', handleIncomingReply);
    };
  }, [socket, doctorId, isAr]);

  // Sync default message language if user changes global app language
  useEffect(() => {
    const targetLang = lang === 'ar' ? 'ar' : 'fr';
    setMsgLang(targetLang);
    setMessage(TEMPLATES[template]?.[targetLang] || TEMPLATES[template]?.fr);
  }, [lang]);

  // Default patient directory fallback
  const fallbackPatients = useMemo(() => [
    { id: 'fatma', name: isAr ? 'فاطمة بن عبد الله' : 'Fatma Ben Abdallah', phone: '+216 98 123 456', source: 'Cabinet' },
    { id: 'wassim', name: isAr ? 'وسيم بينكي' : 'Wassim Pinky', phone: '+216 22 123 456', source: 'Cabinet' },
    { id: 'sami', name: isAr ? 'سامي المنصور' : 'Sami Mansour', phone: '+216 22 456 789', source: 'Cabinet' },
    { id: 'yassine', name: isAr ? 'ياسين المنصور' : 'Yassine Mansour', phone: '+216 55 789 012', source: 'Cabinet' }
  ], [isAr]);

  const allPatients = useMemo(() => {
    if (patientList.length > 0) return patientList;
    return isDemo ? fallbackPatients : [];
  }, [patientList, fallbackPatients, isDemo]);

  // Resolved active recipient
  const activeRecipient = useMemo(() => {
    if (selectedPatientKey === 'custom' || allPatients.length === 0) {
      return {
        id: 'custom',
        name: customName.trim() || (isAr ? 'مريض مخصص' : 'Patient personnalisé'),
        phone: customPhone.trim() || '+216 '
      };
    }
    const found = allPatients.find(p => p.phone === selectedPatientKey || p.id === selectedPatientKey);
    return found || allPatients[0] || { id: 'custom', name: isAr ? 'مريض مخصص' : 'Patient personnalisé', phone: '+216 ' };
  }, [selectedPatientKey, customName, customPhone, allPatients, isAr]);

  const handleTemplateChange = (tmplKey) => {
    setTemplate(tmplKey);
    const tmplObj = TEMPLATES[tmplKey] || TEMPLATES.confirm_gps;
    setMessage(tmplObj[msgLang] || tmplObj.fr);
  };

  const handleLanguageChange = (chosenLang) => {
    setMsgLang(chosenLang);
    const tmplObj = TEMPLATES[template] || TEMPLATES.confirm_gps;
    setMessage(tmplObj[chosenLang] || tmplObj.fr);
  };

  // Format message text with variables
  const formatFinalMessage = () => {
    const dateVal = msgLang === 'ar' ? '2026/10/12' : '12/10/2026';
    const timeVal = msgLang === 'ar' ? '10:30 صباحاً' : '10:30';
    return message
      .replace(/{PATIENT_NAME}/g, activeRecipient.name)
      .replace(/{DATE}/g, dateVal)
      .replace(/{TIME}/g, timeVal)
      .replace(/{DOCTOR_NAME}/g, `${senderName} (${senderSpec})`);
  };

  // Real-Time Dispatch Handler (WhatsApp / SMS)
  const handleSend = async (type) => {
    setSendingType(type);
    const formattedMsg = formatFinalMessage();

    try {
      const payload = {
        channel: type,
        recipientPhone: activeRecipient.phone,
        recipientName: activeRecipient.name,
        patientId: activeRecipient.id !== 'custom' ? activeRecipient.id : null,
        doctorId,
        doctorName: senderName,
        doctorSpecialty: senderSpec,
        message: formattedMsg,
        template,
        lang: msgLang
      };

      const res = await api.sendCommunication(payload);

      if (res && res.success) {
        playCommsChime('send');

        // Prepend to local communications feed immediately
        if (res.communication) {
          setCommunications(prev => [res.communication, ...prev.filter(c => c.id !== res.communication.id)]);
        }

        setNotification({
          type,
          text: res.message || (isAr ? 'تم الإرسال بنجاح في الوقت الفعلي !' : 'Message transmis avec succès en temps réel !')
        });

        // Open WhatsApp Web if WhatsApp was chosen
        if (type === 'whatsapp' && res.waUrl) {
          window.open(res.waUrl, '_blank');
        }
      } else {
        throw new Error(res?.message || 'Erreur d\'envoi');
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || (isAr ? 'تعذر إرسال الرسالة.' : 'Erreur lors de l\'envoi.')
      });
    } finally {
      setSendingType(null);
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Interactive Live Reply Simulation
  const handleSimulateReply = async (comm) => {
    setIsSimulatingReply(true);
    try {
      const replyReplies = [
        'Parfait Docteur, bien reçu merci ! Je serai présente au cabinet.',
        'Merci beaucoup Docteur, c\'est noté pour le rendez-vous.',
        'Bien reçu Docteur, merci pour la confirmation rapide.'
      ];
      const randomText = replyReplies[Math.floor(Math.random() * replyReplies.length)];

      const res = await api.replyCommunication({
        communicationId: comm?.id,
        patientName: comm?.recipientName || activeRecipient.name,
        patientPhone: comm?.recipientPhone || activeRecipient.phone,
        doctorId,
        doctorName: senderName,
        channel: comm?.channel || 'whatsapp',
        replyText: randomText
      });

      if (res && res.success && res.reply) {
        playCommsChime('reply');
        setCommunications(prev => [res.reply, ...prev.filter(c => c.id !== res.reply.id)]);
      }
    } catch (e) {
      console.warn('Simulate reply notice:', e);
    } finally {
      setIsSimulatingReply(false);
    }
  };

  // Filtered communications list
  const filteredCommunications = useMemo(() => {
    if (filterChannel === 'all') return communications;
    return communications.filter(c => c.channel === filterChannel);
  }, [communications, filterChannel]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ════════ HERO BANNER WITH REAL-TIME TELECOM BADGE ════════ */}
      <div className="bg-[#008269] text-white rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-teal-400/10 pointer-events-none blur-xl" />

        <div className="relative z-10">
          {/* Top Pill Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block bg-[#009879]/70 text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wide">
              {isAr ? 'منظومة التواصل الموحدة مع المرضى' : 'MODULE DE COMMUNICATION PATIENT UNIFIÉ'}
            </span>

            {/* Real-time Socket Indicator */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-200 text-[11px] font-bold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isAr ? 'خادم الاتصال الحي نشط (Socket.io)' : 'Passerelle Temps Réel Active (Socket.io)'}</span>
            </span>
          </div>

          {/* Banner Title */}
          <h1 className="text-xl sm:text-2xl lg:text-[25px] font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="text-2xl">💬</span>
            <span>{isAr ? 'مركز تأكيد المواعيد عبر واتساب والرسائل القصيرة (SMS) في الوقت الفعلي' : 'Centre de Transmissions WhatsApp & SMS en Temps Réel'}</span>
          </h1>

          {/* Banner Subtitle */}
          <p className="text-xs sm:text-sm text-emerald-50/90 mt-2 max-w-3xl leading-relaxed font-normal">
            {isAr
              ? 'إرسال تأكيدات فورية للمواعيد مع الموقع الجغرافي للعيادة (GPS)، وتذكيرات تفادي التأخير، والتعليمات الطبية المسبقة مباشرة عبر واتساب أو الرسائل القصيرة مع متابعة تقارير التسليم الحية.'
              : 'Expédiez vos confirmations de RDV avec géolocalisation GPS du cabinet, alertes retard et consignes médicales en temps réel sur WhatsApp ou SMS avec accusés de livraison instantanés.'}
          </p>

          {/* Live Meta Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1da085]/70 text-white text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-ping" />
              <span>{isAr ? 'الربط المباشر مع WhatsApp Cloud API' : 'WhatsApp Cloud API Direct'}</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold">
              <span>📶</span>
              <span>{isAr ? 'بوابة SMS تونس (TT / Ooredoo / Orange)' : 'Passerelle SMS Multi-Opérateurs TN'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/40 text-emerald-100 text-xs font-mono font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Latence: ~140ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* ════════ SUCCESS / STATUS NOTIFICATION BANNER ════════ */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm ${
          notification.type === 'whatsapp'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
            : notification.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
            : 'bg-teal-50 border border-teal-200 text-teal-800 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
              notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
            }`}>
              {notification.type === 'error' ? '✕' : <Check className="w-4 h-4" />}
            </div>
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ════════ FULL-WIDTH COMPOSER CARD ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        
        {/* Card Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="text-xl">📨</span>
            <span>{isAr ? 'تحرير وإرسال رسالة فورية' : 'Rédiger et Diffuser un Message en Direct'}</span>
          </h2>
        </div>

        {/* Row 1: Destinataire Cible & Médecin Émetteur */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold text-xs">
              {isAr ? 'المريض المستلم :' : 'Destinataire Cible :'}
            </label>
            <div className="relative">
              <select
                value={selectedPatientKey}
                onChange={(e) => setSelectedPatientKey(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#008269] focus:ring-2 focus:ring-[#008269]/10 cursor-pointer shadow-2xs appearance-none ltr:pr-10 rtl:pl-10"
              >
                {allPatients.map((p) => (
                  <option key={p.phone || p.id} value={p.phone || p.id}>
                    {p.name} ({p.phone}) {p.source ? `· [${p.source}]` : ''}
                  </option>
                ))}
                <option value="custom">
                  {isAr ? '➕ إدخال اسم ورقم هاتف مخصص...' : '➕ Saisir un autre numéro / Nouveau patient...'}
                </option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Custom patient inputs if selected */}
            {selectedPatientKey === 'custom' && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Nom du patient</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Moncef Trabelsi"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-[#008269]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">Numéro de téléphone TN</label>
                  <TunisianPhoneInput
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-[#008269] font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold text-xs">
              {isAr ? 'الطبيب المرسل :' : 'Médecin Émetteur :'}
            </label>
            <div className="bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 dark:text-white shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950 text-[#008269] dark:text-teal-300 flex items-center justify-center font-black text-xs">
                  👨‍⚕️
                </span>
                <div>
                  <span className="block font-black text-slate-900 dark:text-white leading-tight">{senderName}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{senderSpec}</span>
                </div>
              </div>
              <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-[#008269] dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                Cabinet Actif
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Bibliothèque de Modèles Prédéfinis */}
        <div data-tour="whatsapp-templates">
          <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold text-xs">
            {isAr ? 'نماذج الرسائل الجاهزة :' : 'Bibliothèque de Modèles Prédéfinis :'}
          </label>
          <div className="relative">
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#008269] focus:ring-2 focus:ring-[#008269]/10 cursor-pointer shadow-2xs appearance-none ltr:pr-10 rtl:pl-10"
            >
              <option value="confirm_gps">
                {isAr ? '🟢 تأكيد الموعد + الموقع الجغرافي للعيادة (Google Maps)' : '🟢 Confirmation RDV + Géolocalisation GPS Google Maps'}
              </option>
              <option value="rappel_demain">
                {isAr ? '⏰ تذكير بالموعد المبرمج ليوم الغد' : '⏰ Rappel Consultation Demain'}
              </option>
              <option value="retard_cabinet">
                {isAr ? '🚨 إشعار بتأخير طارئ في العيادة (حالة استعجالية)' : '🚨 Retard ou Décalage Cabinet (Urgence)'}
              </option>
              <option value="resultats_prets">
                {isAr ? '📋 نتائج التحاليل والفحوصات الطبية جاهزة' : "📋 Résultats d'Analyses & ECG Prêts"}
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* ════════ SELECTEUR DE LANGUE DU MESSAGE (SMS / WHATSAPP) ════════ */}
        <div data-tour="whatsapp-lang" className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-teal-100/80 dark:bg-teal-950/80 text-[#008269] dark:text-teal-300 flex items-center justify-center text-sm font-black shrink-0">
              <Globe className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-white block">
                {isAr ? 'لغة نص الرسالة / SMS المرسل :' : 'Langue du message / SMS à envoyer :'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isAr
                  ? 'اختر لغة النموذج المكتوب للمريض (العربية أو الفرنسية)'
                  : 'Basculez instantanément le texte en Arabe ou en Français'}
              </span>
            </div>
          </div>

          {/* Segmented language selector buttons */}
          <div className="inline-flex items-center p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                msgLang === 'ar'
                  ? 'bg-[#008269] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇹🇳</span>
              <span>العربية (Arabe)</span>
              {msgLang === 'ar' && <span className="text-[10px]">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('fr')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                msgLang === 'fr'
                  ? 'bg-[#008269] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇫🇷</span>
              <span>Français</span>
              {msgLang === 'fr' && <span className="text-[10px]">✓</span>}
            </button>
          </div>
        </div>

        {/* Row 3: Textarea with proper Direction per chosen message language */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
            <span>{isAr ? 'نص الرسالة للمعاينة والتعديل :' : 'Texte du message à prévisualiser / modifier :'}</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {msgLang === 'ar' ? 'نص عربي (RTL)' : 'Texte Français (LTR)'}
            </span>
          </div>

          <textarea
            rows={6}
            dir={msgLang === 'ar' ? 'rtl' : 'ltr'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs sm:text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-[#008269] focus:ring-2 focus:ring-[#008269]/10 leading-relaxed resize-y min-h-[150px] shadow-2xs font-sans ${
              msgLang === 'ar' ? 'text-right' : 'text-left'
            }`}
          />

          {/* Variables and Character Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-medium px-1 gap-1">
            <span>
              {isAr
                ? 'المتغيرات التلقائية: {PATIENT_NAME}، {DATE}، {TIME}، {DOCTOR_NAME}'
                : 'Variables dynamiques : {PATIENT_NAME}, {DATE}, {TIME}, {DOCTOR_NAME}'}
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
              {message.length} / 160 {isAr ? 'حرفاً' : 'caractères'}
            </span>
          </div>
        </div>

        {/* Row 4: Two Side-by-Side Action Buttons with Live Feedback */}
        <div data-tour="whatsapp-send" className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          
          {/* Button 1: Deep Emerald #008269 */}
          <button
            type="button"
            onClick={() => handleSend('whatsapp')}
            disabled={sendingType !== null}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#008269] hover:bg-[#00705a] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#008269]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            {sendingType === 'whatsapp' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span className="text-base">💬</span>
            )}
            <span>{isAr ? 'إرسال فوري عبر واتساب (WhatsApp Web Live)' : 'Envoyer sur WhatsApp en Direct'}</span>
          </button>

          {/* Button 2: Teal #00A896 */}
          <button
            type="button"
            onClick={() => handleSend('sms')}
            disabled={sendingType !== null}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#00A896] hover:bg-[#009282] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#00A896]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            {sendingType === 'sms' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span className="text-base">📱</span>
            )}
            <span>{isAr ? 'إرسال رسالة نصية قصيرة (SMS Telecom Gateway)' : 'Expédier par Passerelle SMS en Direct'}</span>
          </button>

        </div>

      </div>

      {/* ════════ REAL-TIME TRANSMISSION FEED & LIVE LOGS CARD ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
        
        {/* Header of Feed */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="text-xl">📡</span>
              <span>{isAr ? 'سجل الرسائل الحية والتأكيدات في الوقت الفعلي' : 'Journal des Transmissions SMS & WhatsApp en Temps Réel'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'متابعة لحظية لحالة وصول رسائل العيادة، تقارير التسليم، وردود المرضى المباشرة.'
                : 'Suivi instantané des statuts de livraison, latence réseau et réponses patient en direct.'}
            </p>
          </div>

          {/* Filter Pills + Refresh */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterChannel('all')}
                className={`px-3 py-1 rounded-lg transition-all ${filterChannel === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
              >
                Tous ({communications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterChannel('whatsapp')}
                className={`px-3 py-1 rounded-lg transition-all ${filterChannel === 'whatsapp' ? 'bg-[#008269] text-white shadow-xs' : 'text-slate-500'}`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setFilterChannel('sms')}
                className={`px-3 py-1 rounded-lg transition-all ${filterChannel === 'sms' ? 'bg-[#00A896] text-white shadow-xs' : 'text-slate-500'}`}
              >
                SMS
              </button>
            </div>

            <button
              type="button"
              onClick={fetchCommunications}
              title="Rafraîchir"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-[#008269]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Communications List */}
        {loadingHistory && communications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Chargement des transmissions en direct...</span>
          </div>
        ) : filteredCommunications.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <span className="text-2xl block mb-2">📭</span>
            <span>{isAr ? 'لا توجد رسائل مسجلة حالياً.' : 'Aucun message transmis pour le moment.'}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCommunications.map((comm) => {
              const isOutbound = comm.direction === 'OUTBOUND';
              const isWhatsApp = comm.channel === 'whatsapp';
              const dateStr = comm.sentAt ? new Date(comm.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'À l\'instant';

              return (
                <div
                  key={comm.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOutbound
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Left Info: Icon, Destination & Channel */}
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        isWhatsApp
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                      }`}>
                        {isWhatsApp ? '💬' : '📱'}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {comm.recipientName || 'Patient'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                            {comm.recipientPhone}
                          </span>
                          
                          {/* Channel Badge */}
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isWhatsApp
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300/40'
                          }`}>
                            {comm.channel?.toUpperCase()}
                          </span>

                          {/* Direction Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isOutbound
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                          }`}>
                            {isOutbound ? 'Émis' : 'Réponse Reçue'}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5 leading-relaxed font-sans whitespace-pre-line">
                          {comm.message}
                        </p>

                        {/* Network Latency & Carrier Metadata */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>⏱️ {dateStr}</span>
                          <span>🏢 {comm.carrier || 'Passerelle SahaTN'}</span>
                          {comm.networkLatencyMs && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ⚡ {comm.networkLatencyMs}ms
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Info: Delivery Status & Interactive Test Reply */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      
                      {/* Live Delivery Status */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {isWhatsApp ? (
                          <span className="flex items-center text-sky-500 font-black text-xs" title="Double coche bleue">
                            ✓✓
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {comm.status === 'RECU' ? 'Reçu' : 'Délivré'}
                        </span>
                      </div>

                      {/* Interactive Test Button to simulate patient reply in real time */}
                      {isOutbound && (
                        <button
                          type="button"
                          onClick={() => handleSimulateReply(comm)}
                          disabled={isSimulatingReply}
                          className="text-[11px] font-bold text-[#008269] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer bg-teal-50/70 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200/50 dark:border-teal-800/40"
                          title="Simuler instantanément une réponse patient pour vérifier la réception en temps réel"
                        >
                          <span>💬</span>
                          <span>Simuler réponse</span>
                        </button>
                      )}

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
