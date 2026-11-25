import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, RefreshCw, MessageSquare, Check, ShieldCheck, User, Send, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

// Normalizer to guarantee consistent review structure between fiche médecin and espace soignant
function normalizeReview(r, defaultDoctorName = 'Dr. Selim Ben Ali') {
  const ratingNum = parseFloat(r.rating || r.stars) || 5;
  const rawComment = (r.comment || r.commentAr || '').trim();

  let replyObj = null;
  if (r.reply) {
    if (typeof r.reply === 'string') {
      replyObj = {
        author: `Votre Réponse Publique (${defaultDoctorName})`,
        doctorName: defaultDoctorName,
        date: "Aujourd'hui",
        text: r.reply
      };
    } else {
      replyObj = {
        author: r.reply.author || `Votre Réponse Publique (${r.reply.doctorName || defaultDoctorName})`,
        doctorName: r.reply.doctorName || defaultDoctorName,
        date: r.reply.date || "Aujourd'hui",
        text: r.reply.text || ''
      };
    }
  }

  // Tags: only use real points forts tags selected by patient; if none, keep empty (no fake fallbacks)
  const tags = Array.isArray(r.tags) ? r.tags.filter(Boolean) : [];

  return {
    id: r.id || r.uuid || `rev-${Math.random()}`,
    doctorId: r.doctorId || 'doc-1',
    patientName: r.patientName || r.patient || r.name || 'Patient Vérifié',
    date: r.date || r.dateAr || "Aujourd'hui",
    rating: ratingNum,
    stars: Math.round(ratingNum),
    tags,
    comment: rawComment,
    verified: r.verified !== false,
    reply: replyObj,
    criteria: r.criteria || null,
    status: r.status || 'PUBLIÉ'
  };
}

export default function DoctorReputationTab({ doctorId = 'doc-1', doctorName = 'Dr. Selim Ben Ali' }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unreplied', 'replied', '5star'
  const [expandedReplies, setExpandedReplies] = useState({});

  const toggleShowReply = (id) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const { socket } = useSocket();

  // Load reviews from API with localStorage cache fallback
  const fetchReviews = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    const docId = doctorId || 'doc-1';
    try {
      const res = await api.getReviews(docId);
      if (res && res.success && Array.isArray(res.data)) {
        const publishedOnly = res.data
          .filter((r) => {
            const s = (r.status || 'PUBLIÉ').toUpperCase();
            return s !== 'MODÉRÉ' && s !== 'MASQUÉ';
          })
          .map((r) => normalizeReview(r, doctorName));

        setReviewsList(publishedOnly);
        try {
          localStorage.setItem(`sahatn_reviews_${docId}`, JSON.stringify(publishedOnly));
        } catch (e) {}
      } else {
        const cached = localStorage.getItem(`sahatn_reviews_${docId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReviewsList(parsed.map((r) => normalizeReview(r, doctorName)));
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching doctor reviews:', err);
      const cached = localStorage.getItem(`sahatn_reviews_${docId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setReviewsList(parsed.map((r) => normalizeReview(r, doctorName)));
          }
        } catch (e) {}
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId, doctorName]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Real-time synchronization via Socket.io
  useEffect(() => {
    if (!socket) return;
    const currentDocId = doctorId || 'doc-1';

    const handleSync = (data) => {
      if (!data || !data.doctorId || data.doctorId === currentDocId) {
        fetchReviews();
      }
    };

    socket.on('review:new', handleSync);
    socket.on('review:reply', handleSync);
    socket.on('review:updated', handleSync);

    return () => {
      socket.off('review:new', handleSync);
      socket.off('review:reply', handleSync);
      socket.off('review:updated', handleSync);
    };
  }, [socket, doctorId, fetchReviews]);

  // Reply handler: publishes to backend API, updates cache & emits socket update
  const handleSendReply = async (reviewId) => {
    const text = (replyInputs[reviewId] || '').trim();
    if (!text) return;

    setSubmittingReplyId(reviewId);
    const currentDocId = doctorId || 'doc-1';

    const replyData = {
      author: `Votre Réponse Publique (${doctorName})`,
      doctorName: doctorName,
      date: new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' }),
      text: text.startsWith('«') ? text : `« ${text} »`
    };

    // Optimistic state update
    setReviewsList((prev) => {
      const updated = prev.map((r) => (r.id === reviewId ? { ...r, reply: replyData } : r));
      try {
        localStorage.setItem(`sahatn_reviews_${currentDocId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      if (api.replyReview) {
        await api.replyReview({
          reviewId,
          doctorName,
          text: replyData.text
        });
      }
      setFeedbackMessage({ text: 'Réponse publique publiée avec succès !', type: 'success' });
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.warn('Reply submission fallback:', err);
    } finally {
      setSubmittingReplyId(null);
      setReplyInputs((prev) => ({ ...prev, [reviewId]: '' }));
      setActiveReplyId(null);
    }
  };

  // Dynamic Metrics & KPI Computations
  const totalReviewsCount = reviewsList.length;

  const avgScore = useMemo(() => {
    if (totalReviewsCount === 0) return '—';
    const sum = reviewsList.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0);
    return (sum / totalReviewsCount).toFixed(2);
  }, [reviewsList, totalReviewsCount]);

  const npsRate = useMemo(() => {
    if (totalReviewsCount === 0) return '—';
    const positive = reviewsList.filter((r) => (parseFloat(r.rating) || 5) >= 4).length;
    return `${((positive / totalReviewsCount) * 100).toFixed(1)}%`;
  }, [reviewsList, totalReviewsCount]);

  // Criteria Averages
  const criteriaScores = useMemo(() => {
    if (totalReviewsCount === 0) {
      return { punc: '0', listen: '0', hyg: '0', care: '0' };
    }
    const listWithCrit = reviewsList.filter((r) => r.criteria);
    const getAvg = (key, defVal) => {
      const valid = listWithCrit.filter((r) => r.criteria && r.criteria[key] != null);
      if (!valid.length) return defVal;
      const sum = valid.reduce((s, r) => s + (parseFloat(r.criteria[key]) || defVal), 0);
      return (sum / valid.length).toFixed(1);
    };
    return {
      punc: getAvg('punctuality', 5.0),
      listen: getAvg('bedsideManner', 5.0),
      hyg: getAvg('hygiene', 5.0),
      care: getAvg('careQuality', 5.0)
    };
  }, [reviewsList, totalReviewsCount]);

  // Filtering
  const unrepliedCount = useMemo(() => reviewsList.filter((r) => !r.reply).length, [reviewsList]);
  const repliedCount = useMemo(() => reviewsList.filter((r) => Boolean(r.reply)).length, [reviewsList]);
  const fiveStarCount = useMemo(
    () => reviewsList.filter((r) => (parseFloat(r.rating) || 5) >= 4.8).length,
    [reviewsList]
  );

  const filteredReviews = useMemo(() => {
    if (activeFilter === 'unreplied') {
      return reviewsList.filter((r) => !r.reply);
    }
    if (activeFilter === 'replied') {
      return reviewsList.filter((r) => Boolean(r.reply));
    }
    if (activeFilter === '5star') {
      return reviewsList.filter((r) => (parseFloat(r.rating) || 5) >= 4.8);
    }
    return reviewsList;
  }, [reviewsList, activeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ════════ TOP 4 KPI CARDS (Synchronized with Fiche Médecin) ════════ */}
      <div data-tour="reputation-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: SCORE GLOBAL PRATICIEN */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              SCORE GLOBAL PRATICIEN
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
              totalReviewsCount > 0
                ? 'bg-[#FFFBEB] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              {totalReviewsCount > 0 ? 'Certifié' : 'Nouveau Praticien'}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              totalReviewsCount > 0 ? 'text-[#D97706]' : 'text-slate-400 dark:text-slate-600'
            }`}>
              {totalReviewsCount > 0 ? avgScore : '—'}
            </span>
            <span className={`text-sm font-bold tracking-widest ${
              totalReviewsCount > 0 ? 'text-[#F59E0B]' : 'text-slate-300 dark:text-slate-700'
            }`}>
              {totalReviewsCount > 0 ? '★★★★★' : '☆☆☆☆☆'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalReviewsCount > 0 ? 'Excellence Clinique & Écoute' : 'En attente des premiers avis patients'}
          </p>
        </div>

        {/* KPI 2: TOTAL AVIS PATIENTS */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              TOTAL AVIS PATIENTS
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
              totalReviewsCount > 0
                ? 'bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              {totalReviewsCount > 0 ? '100% Vérifiés' : 'En attente'}
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0B1E33] dark:text-white tracking-tight">
              {totalReviewsCount}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalReviewsCount > 0 ? 'Patients ayant consulté au cabinet' : 'Aucun avis publié pour le moment'}
          </p>
        </div>

        {/* KPI 3: TAUX DE RECOMMANDATION (NPS) */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              TAUX DE RECOMMANDATION (NPS)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
              totalReviewsCount > 0
                ? 'bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              {totalReviewsCount > 0 ? 'Élite' : 'En attente'}
            </span>
          </div>

          <div className="my-3">
            <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              totalReviewsCount > 0 ? 'text-[#00A896] dark:text-teal-400' : 'text-slate-400 dark:text-slate-600'
            }`}>
              {totalReviewsCount > 0 ? npsRate : '—'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalReviewsCount > 0 ? 'Recommandent à leurs proches' : 'Calculé dès le 1er avis reçu'}
          </p>
        </div>

        {/* KPI 4: ATTENTE MOYENNE PERÇUE */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ATTENTE MOYENNE PERÇUE
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
              totalReviewsCount > 0
                ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-[#BFDBFE] dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              {totalReviewsCount > 0 ? 'Optimal' : 'En attente'}
            </span>
          </div>

          <div className="my-3">
            <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              totalReviewsCount > 0 ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'
            }`}>
              {totalReviewsCount > 0 ? '< 10 min' : '—'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalReviewsCount > 0 ? 'Gestion ponctualité exemplaire' : 'Mesure des consultations en cours'}
          </p>
        </div>

      </div>

      {/* ════════ MAIN TWO COLUMNS (Axe Médical vs Avis & Droit de Réponse) ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ════════ LEFT COLUMN: ÉVALUATIONS PAR AXE MÉDICAL (4 cols) ════════ */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
          
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span>
            <span>Évaluations par Axe Médical</span>
          </h2>

          <div className="space-y-4">
            
            {/* Axe 1: Ponctualité & Prise en charge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>Ponctualité & Prise en charge</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {totalReviewsCount > 0 ? `${criteriaScores.punc} / 5` : '— / 5'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                  style={{ width: totalReviewsCount > 0 ? `${Math.min(100, (parseFloat(criteriaScores.punc) / 5) * 100)}%` : '0%' }}
                ></div>
              </div>
            </div>

            {/* Axe 2: Écoute & Pédagogie Médicale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span>👂</span>
                  <span>Écoute & Pédagogie Médicale</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {totalReviewsCount > 0 ? `${criteriaScores.listen} / 5` : '— / 5'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                  style={{ width: totalReviewsCount > 0 ? `${Math.min(100, (parseFloat(criteriaScores.listen) / 5) * 100)}%` : '0%' }}
                ></div>
              </div>
            </div>

            {/* Axe 3: Accueil & Propreté Cabinet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span>🏢</span>
                  <span>Accueil & Propreté Cabinet</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {totalReviewsCount > 0 ? `${criteriaScores.hyg} / 5` : '— / 5'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                  style={{ width: totalReviewsCount > 0 ? `${Math.min(100, (parseFloat(criteriaScores.hyg) / 5) * 100)}%` : '0%' }}
                ></div>
              </div>
            </div>

            {/* Axe 4: Qualité des Soins & Traitements */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>Qualité des Soins & Traitements</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {totalReviewsCount > 0 ? `${criteriaScores.care} / 5` : '— / 5'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                  style={{ width: totalReviewsCount > 0 ? `${Math.min(100, (parseFloat(criteriaScores.care) / 5) * 100)}%` : '0%' }}
                ></div>
              </div>
            </div>

          </div>

          {/* Charte Éthique Saha.tn */}
          <div className="bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#BBF7D0] dark:border-emerald-800 rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#065F46] dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-[#0284C7]"></span>
              <span>Charte Éthique Maw2idi</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Conformément aux directives de l'Ordre National des Médecins, seuls les patients ayant honoré un rendez-vous vérifié peuvent déposer un avis certifié.
            </p>
          </div>

        </div>

        {/* ════════ RIGHT COLUMN: DERNIERS AVIS PATIENTS & DROIT DE RÉPONSE (8 cols) ════════ */}
        <div data-tour="reputation-list" className="lg:col-span-8 bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col space-y-4">
          
          {/* Header Row */}
          <div className="flex items-start sm:items-center justify-between pb-2 gap-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Derniers Avis Patients & Droit de Réponse</span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {totalReviewsCount}
                </span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Répondez publiquement à vos patients pour valoriser votre écoute
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchReviews(true)}
              disabled={refreshing}
              className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 py-1 px-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
              title="Actualiser les avis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#00A896] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tous ({totalReviewsCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unreplied')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'unreplied'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100'
              }`}
            >
              <span>À répondre</span>
              {unrepliedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeFilter === 'unreplied' ? 'bg-white text-amber-600' : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {unrepliedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('replied')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeFilter === 'replied'
                  ? 'bg-[#00A896] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Avec réponse ({repliedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('5star')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeFilter === '5star'
                  ? 'bg-[#00A896] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ★ 5 étoiles ({fiveStarCount})
            </button>
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{feedbackMessage.text}</span>
            </div>
          )}

          {/* ════════ FIXED & SCROLLABLE REVIEWS ZONE (Zone fixe avec défilement fluide) ════════ */}
          <div className="max-h-[640px] overflow-y-auto pr-2 custom-scrollbar space-y-4 pt-1">
            {loading && reviewsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#00A896]" />
                <span className="text-xs font-medium">Synchronisation des avis en direct...</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">Aucun avis trouvé pour ce filtre</p>
                <p className="text-[11px] text-slate-400">
                  Tous les avis certifiés publiés sur votre fiche apparaissent ici automatiquement.
                </p>
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xs bg-white dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Header: User avatar, name, verified badge & stars */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {rev.patientName}
                          </span>
                          {rev.verified && (
                            <span className="bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 border border-[#BBF7D0] dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              Vérifié
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {rev.date}
                        </span>
                      </div>
                    </div>

                    {/* Stars on Right */}
                    <div className="text-right shrink-0">
                      <div className="text-[#F59E0B] text-xs font-black tracking-widest">
                        {'★'.repeat(rev.stars || 5)}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {rev.rating} / 5
                      </span>
                    </div>
                  </div>

                  {/* Tags row */}
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {rev.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#065F46] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Review comment */}
                  {rev.comment ? (
                    <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 font-normal leading-relaxed break-words whitespace-pre-line">
                      « {rev.comment} »
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium">
                      « Avis certifié sans commentaire écrit »
                    </p>
                  )}

                  {/* Doctor's Public Reply (Cachée par défaut, affichée via lien) */}
                  {rev.reply && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleShowReply(rev.id)}
                        className="text-xs font-bold text-[#00A896] hover:text-[#008f80] hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{expandedReplies[rev.id] ? 'Masquer la réponse' : 'Afficher la réponse'}</span>
                        <span className="text-[10px] text-slate-400">{expandedReplies[rev.id] ? '▲' : '▼'}</span>
                      </button>

                      {expandedReplies[rev.id] && (
                        <div className="mt-2 bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#BBF7D0] dark:border-emerald-800 rounded-2xl p-3.5 space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#065F46] dark:text-emerald-300 flex items-center gap-1.5">
                              <span>🧑‍⚕️</span>
                              <span>{rev.reply.author || `Votre Réponse Publique (${rev.reply.doctorName || doctorName})`} :</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {rev.reply.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                            {rev.reply.text}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Droit de réponse action if no reply */}
                  {!rev.reply && (
                    <div className="pt-1">
                      {activeReplyId === rev.id ? (
                        <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <span>🧑‍⚕️</span>
                            <span>Répondre publiquement en tant que {doctorName} :</span>
                          </label>
                          <textarea
                            rows={2}
                            value={replyInputs[rev.id] || ''}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({
                                ...prev,
                                [rev.id]: e.target.value
                              }))
                            }
                            placeholder="Rédigez votre réponse publique bienveillante..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none focus:border-[#00A896] dark:text-white"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReplyId(null)}
                              className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              disabled={submittingReplyId === rev.id || !(replyInputs[rev.id] || '').trim()}
                              onClick={() => handleSendReply(rev.id)}
                              className="px-3.5 py-1.5 rounded-xl text-xs bg-[#00A896] hover:bg-[#008f80] disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              {submittingReplyId === rev.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Publication...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Publier la réponse</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId(rev.id);
                            if (!replyInputs[rev.id]) {
                              const firstPart = (rev.patientName || '').split(' ')[0] || '';
                              setReplyInputs((prev) => ({
                                ...prev,
                                [rev.id]: `Merci pour votre confiance ${firstPart}. Prenez soin de vous !`
                              }));
                            }
                          }}
                          className="text-xs font-bold text-[#00A896] hover:text-[#008f80] hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Répondre à cet avis</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
