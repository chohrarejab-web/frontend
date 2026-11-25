import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  Smartphone,
  FileText,
  Banknote,
  Copy,
  Check,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';

const METHOD_META = {
  bank_transfer: {
    icon: Building2,
    labelFr: 'Virement / Versement Bancaire (RIB)',
    labelAr: 'تحويل أو إيداع بنكي (RIB)'
  },
  d17_poste: {
    icon: Smartphone,
    labelFr: 'D17 / La Poste Tunisienne',
    labelAr: 'تطبيق D17 / البريد التونسي'
  },
  check: {
    icon: FileText,
    labelFr: 'Chèque Bancaire',
    labelAr: 'شيك بنكي'
  },
  cash: {
    icon: Banknote,
    labelFr: 'Espèces (Agence / Commercial)',
    labelAr: 'نقداً (الوكالة / المندوب التجاري)'
  }
};

export default function DoctorSubscriptionTab({ doctorId, doctorName }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [method, setMethod] = useState('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptDataUri, setReceiptDataUri] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Receipt preview modal
  const [previewModal, setPreviewModal] = useState(null); // { url, contentType, ref }

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.getMyPayments(doctorId);
      if (res?.success && res.data) {
        setSubscription(res.data.subscription || null);
        setPayments(res.data.payments || []);
        setPlans(res.data.plans || []);
        setBankInfo(res.data.bankInfo || null);
        if (res.data.subscription?.planId) {
          setSelectedPlanId(res.data.subscription.planId);
        }
      }
    } catch (err) {
      setError(err.message || (isAr ? 'تعذر تحميل بيانات الاشتراك' : 'Impossible de charger votre abonnement.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [doctorId, isAr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live updates when admin approves or rejects payment
  useEffect(() => {
    if (!socket) return;
    const handlePaymentUpdated = (payload) => {
      if (!payload) return;
      if (payload.subscription) setSubscription(payload.subscription);
      fetchData(true);
    };
    socket.on('payment:updated', handlePaymentUpdated);
    return () => socket.off('payment:updated', handlePaymentUpdated);
  }, [socket, fetchData]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || null;
  const computedAmount = selectedPlan
    ? billingCycle === 'annual'
      ? selectedPlan.annualTotal
      : selectedPlan.monthlyPrice
    : 0;

  const handleCopy = (key, value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError(isAr ? 'صيغة الملف غير مدعومة (JPG, PNG, WEBP, PDF).' : 'Format non autorisé. Utilisez JPG, PNG, WEBP ou PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(isAr ? 'الحد الأقصى لحجم الملف هو 5 ميجابايت.' : 'La taille maximale du justificatif est de 5 Mo.');
      return;
    }
    setError('');
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setReceiptDataUri(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (method !== 'cash' && !transactionRef.trim() && !receiptDataUri) {
      setError(
        isAr
          ? 'يرجى إدخال رقم العملية أو إرفاق صورة وصل الدفع.'
          : 'Veuillez saisir la référence de transaction ou joindre le justificatif de paiement.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitOfflinePayment({
        doctorId,
        planId: selectedPlanId,
        billingCycle,
        method,
        transactionRef: transactionRef.trim(),
        notes: notes.trim(),
        receiptDataUri: receiptDataUri || null
      });
      if (res?.success) {
        setSuccessMsg(
          isAr
            ? `تم إرسال وصل الدفع بنجاح (${res.data?.referenceCode}). في انتظار مصادقة الإدارة.`
            : `Paiement soumis avec succès (${res.data?.referenceCode}). En attente de validation par l'administration.`
        );
        setTransactionRef('');
        setNotes('');
        setReceiptDataUri('');
        setReceiptFileName('');
        fetchData(true);
      } else {
        setError(res?.message || 'Erreur lors de la soumission.');
      }
    } catch (err) {
      setError(err.message || 'Erreur réseau lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const openReceiptPreview = async (payment) => {
    try {
      const { url, contentType } = await api.fetchPaymentReceiptBlob(payment.id);
      setPreviewModal({ url, contentType, ref: payment.referenceCode });
    } catch (err) {
      setError(err.message || 'Impossible d\'ouvrir le justificatif.');
    }
  };

  const closePreview = () => {
    if (previewModal?.url) URL.revokeObjectURL(previewModal.url);
    setPreviewModal(null);
  };

  const renderStatusBadge = (status) => {
    if (status === 'approved' || status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status === 'active' ? (isAr ? 'نشط' : 'Actif') : (isAr ? 'تمت المصادقة' : 'Validé')}
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5" />
          {isAr ? 'في انتظار التحقق' : 'En attente'}
        </span>
      );
    }
    if (status === 'rejected' || status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <XCircle className="w-3.5 h-3.5" />
          {status === 'expired' ? (isAr ? 'منتهي الصلاحية' : 'Expiré') : (isAr ? 'مرفوض' : 'Refusé')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        {isAr ? 'غير مشترك' : 'Aucun abonnement'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-10 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-[#00A896]" />
        <span className="font-bold text-sm">{isAr ? 'جاري تحميل بيانات الاشتراك...' : 'Chargement de votre abonnement...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ════════ 1. CURRENT SUBSCRIPTION STATUS BANNER ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#00A896] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'اشتراك الطبيب والدفع خارج الخط' : 'Abonnement Praticien & Paiement Hors-Ligne'}
              </h2>
              {renderStatusBadge(subscription?.status || 'none')}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subscription?.status === 'active' ? (
                <>
                  {isAr ? 'الباقة الحالية:' : 'Formule active :'}{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{subscription.planName}</strong>
                  {' • '}
                  <Calendar className="w-3.5 h-3.5 inline mx-1 text-[#00A896]" />
                  {isAr ? 'صالح إلى غاية' : "Valable jusqu'au"}{' '}
                  <strong>{new Date(subscription.expiresAt).toLocaleDateString(isAr ? 'ar-TN' : 'fr-FR')}</strong>
                  {' '}({subscription.daysRemaining} {isAr ? 'يوم متبقي' : 'jours restants'})
                </>
              ) : (
                isAr
                  ? `مرحباً ${doctorName || ''} — اختر باقتك وأرسل وصل التحويل البنكي أو D17 لتفعيل حسابك.`
                  : `Bonjour ${doctorName || ''} — Choisissez votre formule et transmettez votre justificatif (Virement RIB, D17/Poste, Chèque ou Espèces) pour activer votre abonnement.`
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchData(false)}
          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 self-start md:self-center cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isAr ? 'تحديث' : 'Actualiser'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center justify-between gap-2">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ════════ 2. PLAN & BILLING CYCLE SELECTOR ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00A896]" />
              {isAr ? '1. اختر باقة الاشتراك' : '1. Choisissez votre formule'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'جميع الأسعار بالدينار التونسي (TND)' : 'Tarifs en Dinars Tunisiens (TND) — activation dès validation du justificatif.'}
            </p>
          </div>

          <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#00A896] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isAr ? 'شهري' : 'Mensuel'}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-[#00A896] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{isAr ? 'سنوي' : 'Annuel'}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">-15%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const priceDisplay = billingCycle === 'annual' ? plan.annualTotal : plan.monthlyPrice;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left rtl:text-right p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#00A896] bg-teal-50/40 dark:bg-teal-950/30 shadow-md shadow-teal-500/10'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      {isAr ? plan.nameAr : plan.name}
                    </span>
                    {plan.isRecommended && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                        ⭐ {isAr ? 'موصى به' : 'Recommandé'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isAr ? plan.descriptionAr : plan.descriptionFr}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#00A896]">{priceDisplay}</span>
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      TND / {billingCycle === 'annual' ? (isAr ? 'سنة' : 'an') : (isAr ? 'شهر' : 'mois')}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {(isAr ? plan.featuresAr : plan.featuresFr || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#00A896] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-xs font-black text-center ${
                  isSelected ? 'text-[#00A896]' : 'text-slate-400'
                }`}>
                  {isSelected ? (isAr ? '✓ الباقة المختارة' : '✓ Formule sélectionnée') : (isAr ? 'اختيار هذه الباقة' : 'Sélectionner')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════ 3. PAYMENT INSTRUCTIONS & PROOF SUBMISSION ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bank / D17 / Agency Instructions */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#00A896]" />
            {isAr ? '2. معلومات التحويل والدفع (تونس)' : '2. Coordonnées de paiement hors-ligne'}
          </h3>

          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase">
                {isAr ? 'المبلغ المطلوب دفعه' : 'Montant exact à régler'}
              </div>
              <div className="text-2xl font-black text-[#00A896]">{computedAmount} TND</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {selectedPlan ? (isAr ? selectedPlan.nameAr : selectedPlan.name) : ''} ({billingCycle === 'annual' ? (isAr ? 'سنوي' : 'Annuel') : (isAr ? 'شهري' : 'Mensuel')})
              </div>
            </div>
            <CreditCard className="w-8 h-8 text-[#00A896]/60" />
          </div>

          {bankInfo && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-bold mb-1">
                  {isAr ? 'المستفيد والبنك' : 'Bénéficiaire & Banque'}
                </div>
                <div className="font-black text-slate-900 dark:text-white">{bankInfo.beneficiary}</div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">{bankInfo.bankName}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-bold">RIB Bancaire</div>
                  <div className="font-mono font-black text-slate-900 dark:text-white text-sm tracking-wide mt-0.5">
                    {bankInfo.rib}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('rib', bankInfo.rib)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer hover:border-[#00A896]"
                >
                  {copiedKey === 'rib' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'rib' ? (isAr ? 'تم النسخ' : 'Copié') : (isAr ? 'نسخ' : 'Copier')}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-bold">D17 / La Poste Tunisienne</div>
                  <div className="font-mono font-black text-slate-900 dark:text-white mt-0.5">{bankInfo.d17Number}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">{bankInfo.posteAccount}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('d17', bankInfo.d17Number)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer hover:border-[#00A896]"
                >
                  {copiedKey === 'd17' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'd17' ? (isAr ? 'تم النسخ' : 'Copié') : (isAr ? 'نسخ' : 'Copier')}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-bold">
                  {isAr ? 'الدفع نقداً أو بشيك (العنوان)' : 'Paiement en agence / Chèque'}
                </div>
                <div className="text-slate-800 dark:text-slate-200 font-bold mt-0.5">{bankInfo.officeAddress}</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">
                  {bankInfo.supportPhone} • {bankInfo.supportEmail}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Proof Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4"
        >
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#00A896]" />
            {isAr ? '3. إرسال إثبات الدفع للتحقق' : '3. Soumettre votre justificatif de paiement'}
          </h3>

          {/* Method selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-2">
              {isAr ? 'طريقة الدفع المستخدمة' : 'Méthode de paiement utilisée'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(METHOD_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = method === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                      active
                        ? 'border-[#00A896] bg-teal-50/70 dark:bg-teal-950/50 text-[#00A896] dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{isAr ? meta.labelAr : meta.labelFr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transaction reference */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
              {isAr ? 'رقم التحويل / الوصل / الشيك' : 'N° de virement / Référence D17 / N° de chèque'}
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder={isAr ? 'مثال: VIR-2026-88412' : 'Ex : VIR-2026-88412 ou N° reçu D17'}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00A896]"
            />
          </div>

          {/* Receipt file upload */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
              {isAr ? 'إرفاق صورة الوصل أو ملف PDF (الحد الأقصى 5 Mo)' : 'Justificatif / Reçu de paiement (JPG, PNG, WEBP ou PDF — max 5 Mo)'}
            </label>
            <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00A896] bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-[#00A896] mb-1.5" />
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {receiptFileName || (isAr ? 'انقر لاختيار ملف الوصل' : 'Cliquez pour importer votre reçu bancaire / D17')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP, PDF</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
              {isAr ? 'ملاحظات إضافية (اختياري)' : 'Notes complémentaires (optionnel)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'اسم البنك، تاريخ الإيداع...' : 'Banque émettrice, date du versement, nom du titulaire...'}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00A896]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#00A896] hover:bg-[#008f7f] disabled:opacity-60 text-white font-black text-sm shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {submitting
              ? (isAr ? 'جاري الإرسال...' : 'Envoi en cours...')
              : (isAr ? `تأكيد إرسال الدفع (${computedAmount} TND)` : `Soumettre mon paiement (${computedAmount} TND)`)}
          </button>
        </form>
      </div>

      {/* ════════ 4. PAYMENT HISTORY TABLE ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          {isAr ? 'سجل المدفوعات خارج الخط' : 'Historique de mes paiements hors-ligne'}
        </h3>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 font-bold">
            {isAr ? 'لا توجد مدفوعات مسجلة بعد.' : 'Aucun paiement soumis pour le moment.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-3">{isAr ? 'المرجع' : 'Référence'}</th>
                  <th className="py-3 px-3">{isAr ? 'الباقة' : 'Formule'}</th>
                  <th className="py-3 px-3">{isAr ? 'الطريقة' : 'Méthode'}</th>
                  <th className="py-3 px-3">{isAr ? 'المبلغ' : 'Montant'}</th>
                  <th className="py-3 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-3">{isAr ? 'الحالة' : 'Statut'}</th>
                  <th className="py-3 px-3">{isAr ? 'الوصل' : 'Justificatif'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {payments.map((p) => {
                  const meta = METHOD_META[p.method];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-black text-slate-800 dark:text-slate-200">
                        {p.referenceCode}
                        {p.transactionRef && (
                          <div className="text-[11px] font-normal text-slate-400">Ref: {p.transactionRef}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                        {p.planName}
                        <span className="text-slate-400 font-normal"> ({p.billingCycle === 'annual' ? (isAr ? 'سنوي' : 'Annuel') : (isAr ? 'شهري' : 'Mensuel')})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {meta ? (isAr ? meta.labelAr : meta.labelFr) : p.method}
                      </td>
                      <td className="py-3 px-3 font-black text-[#00A896]">{p.amountTnd} TND</td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString(isAr ? 'ar-TN' : 'fr-FR')}
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusBadge(p.status)}
                        {p.status === 'rejected' && p.rejectionReason && (
                          <div className="text-[11px] text-rose-500 mt-1 max-w-xs">{p.rejectionReason}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => openReceiptPreview(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#00A896]" />
                            {isAr ? 'عرض' : 'Voir'}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={closePreview}>
          <div
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 dark:text-white text-sm">
                {isAr ? 'معاينة وصل الدفع' : 'Justificatif de paiement'} — {previewModal.ref}
              </h4>
              <button type="button" onClick={closePreview} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2">
              {previewModal.contentType === 'application/pdf' ? (
                <iframe src={previewModal.url} title="Receipt PDF" className="w-full h-[65vh] rounded-xl" />
              ) : (
                <img src={previewModal.url} alt="Receipt" className="max-h-[65vh] rounded-xl object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
