import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  RefreshCw,
  Banknote,
  Users,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';

const METHOD_LABELS = {
  bank_transfer: { fr: 'Virement / RIB', ar: 'تحويل بنكي (RIB)' },
  d17_poste: { fr: 'D17 / La Poste', ar: 'D17 / البريد' },
  check: { fr: 'Chèque Bancaire', ar: 'شيك بنكي' },
  cash: { fr: 'Espèces', ar: 'نقداً' }
};

export default function AdminOfflinePaymentsTab({ onPendingCountChange }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    approvedTotalTnd: 0,
    pendingTotalTnd: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    activeSubscriptionsCount: 0
  });

  // Modals
  const [previewModal, setPreviewModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // payment object
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.getAdminOfflinePayments({
        status: statusFilter,
        q: searchQuery.trim()
      });
      if (res?.success && res.data) {
        setPayments(res.data.payments || []);
        const sum = res.data.summary || {};
        setSummary(sum);
        if (onPendingCountChange && typeof sum.pendingCount === 'number') {
          onPendingCountChange(sum.pendingCount);
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des paiements hors-ligne.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, searchQuery, onPendingCountChange]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (!socket) return;
    const handleSync = () => fetchPayments(true);
    socket.on('payment:submitted', handleSync);
    socket.on('payment:updated', handleSync);
    return () => {
      socket.off('payment:submitted', handleSync);
      socket.off('payment:updated', handleSync);
    };
  }, [socket, fetchPayments]);

  const handleApprove = async (payment) => {
    setActionId(payment.id);
    setError('');
    try {
      const res = await api.approveOfflinePayment(payment.id);
      if (res?.success) {
        fetchPayments(true);
      } else {
        setError(res?.message || 'Erreur lors de la validation.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la validation.');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal || !rejectionReason.trim()) return;
    setActionId(rejectModal.id);
    setError('');
    try {
      const res = await api.rejectOfflinePayment(rejectModal.id, rejectionReason.trim());
      if (res?.success) {
        setRejectModal(null);
        setRejectionReason('');
        fetchPayments(true);
      } else {
        setError(res?.message || 'Erreur lors du refus.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du refus.');
    } finally {
      setActionId(null);
    }
  };

  const openReceipt = async (payment) => {
    try {
      const { url, contentType } = await api.fetchPaymentReceiptBlob(payment.id);
      setPreviewModal({ url, contentType, payment });
    } catch (err) {
      setError(err.message || 'Impossible de charger le justificatif.');
    }
  };

  const closePreview = () => {
    if (previewModal?.url) URL.revokeObjectURL(previewModal.url);
    setPreviewModal(null);
  };

  return (
    <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ════════ 1. KPI SUMMARY CARDS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{isAr ? 'مدفوعات قيد الانتظار' : 'En attente de validation'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.pendingCount || 0}</span>
            <span className="text-xs font-bold text-slate-400">({summary.pendingTotalTnd || 0} TND)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{isAr ? 'إجمالي المداخيل المصادق عليها' : 'Recettes validées'}</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.approvedTotalTnd || 0} TND</span>
            <span className="text-xs font-bold text-slate-400">({summary.approvedCount || 0})</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{isAr ? 'اشتراكات الأطباء النشطة' : 'Abonnements médecins actifs'}</span>
            <Users className="w-4 h-4 text-[#00A896]" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {summary.activeSubscriptionsCount || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c162d] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{isAr ? 'مدفوعات مرفوضة' : 'Paiements refusés'}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {summary.rejectedCount || 0}
          </div>
        </div>
      </div>

      {/* ════════ 2. MAIN TABLE CARD ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🏦</span>
              <span>{isAr ? 'التحقق من المدفوعات خارج الخط (الأطباء)' : 'Validation des Paiements Hors-Ligne (Médecins)'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'تحقق من وصولات التحويل البنكي وD17 لتفعيل اشتراكات الأطباء تلقائياً.'
                : 'Vérifiez les reçus (RIB, D17, Chèque, Espèces) pour activer automatiquement les abonnements médecins.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchPayments(false)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 self-start md:self-center cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {isAr ? 'تحديث' : 'Actualiser'}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', fr: 'Tous', ar: 'الكل' },
              { id: 'pending', fr: 'En attente', ar: 'قيد الانتظار' },
              { id: 'approved', fr: 'Validés', ar: 'مصادق عليها' },
              { id: 'rejected', fr: 'Refusés', ar: 'مرفوضة' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#00A896] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isAr ? tab.ar : tab.fr}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالطبيب أو المرجع...' : 'Rechercher médecin, MAW-...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#00A896]"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-10 text-center text-xs font-bold text-slate-400">
            {isAr ? 'جاري التحميل...' : 'Chargement des paiements...'}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-sm font-bold text-slate-400">
            {isAr ? 'لا توجد مدفوعات مطابقة للبحث.' : 'Aucun paiement hors-ligne trouvé.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-2.5">{isAr ? 'المرجع' : 'Référence'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الطبيب' : 'Médecin'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الباقة' : 'Formule'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الطريقة' : 'Méthode'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'المبلغ' : 'Montant'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الوصل' : 'Reçu'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الحالة' : 'Statut'}</th>
                  <th className="py-3 px-2.5">{isAr ? 'الإجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {payments.map((p) => {
                  const mLabel = METHOD_LABELS[p.method];
                  const isBusy = actionId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-2.5">
                        <div className="font-mono font-black text-slate-900 dark:text-white">{p.referenceCode}</div>
                        {p.transactionRef && <div className="text-[11px] text-slate-400">Tx: {p.transactionRef}</div>}
                        <div className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString('fr-FR')}</div>
                      </td>
                      <td className="py-3 px-2.5">
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">{p.doctorName}</div>
                        <div className="text-[11px] text-slate-400">{p.doctorEmail || p.doctorId}</div>
                      </td>
                      <td className="py-3 px-2.5 font-bold text-slate-700 dark:text-slate-300">
                        {p.planName}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {p.billingCycle === 'annual' ? 'Annuel (-15%)' : 'Mensuel'}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-slate-600 dark:text-slate-300">
                        {mLabel ? (isAr ? mLabel.ar : mLabel.fr) : p.method}
                        {p.notes && <div className="text-[11px] text-slate-400 max-w-[160px] truncate" title={p.notes}>{p.notes}</div>}
                      </td>
                      <td className="py-3 px-2.5 font-black text-[#00A896]">{p.amountTnd} TND</td>
                      <td className="py-3 px-2.5">
                        {p.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => openReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#00A896]" />
                            {isAr ? 'معاينة' : 'Voir'}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5">
                        {p.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Validé
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                        {p.status === 'rejected' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              <XCircle className="w-3 h-3" /> Refusé
                            </span>
                            {p.rejectionReason && (
                              <div className="text-[10px] text-rose-500 mt-1 max-w-[160px] truncate" title={p.rejectionReason}>
                                {p.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2.5">
                        {p.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApprove(p)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[11px] cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isAr ? 'موافقة' : 'Valider'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectModal(p);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-black text-[11px] cursor-pointer"
                            >
                              {isAr ? 'رفض' : 'Refuser'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {p.reviewedBy ? `Par ${p.reviewedBy}` : '—'}
                          </span>
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
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm">
                  {previewModal.payment.doctorName} — {previewModal.payment.referenceCode}
                </h4>
                <p className="text-xs text-slate-400">
                  {previewModal.payment.planName} • {previewModal.payment.amountTnd} TND
                  {previewModal.payment.transactionRef ? ` • Tx: ${previewModal.payment.transactionRef}` : ''}
                </p>
              </div>
              <button type="button" onClick={closePreview} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2">
              {previewModal.contentType === 'application/pdf' ? (
                <iframe src={previewModal.url} title="Receipt PDF" className="w-full h-[60vh] rounded-xl" />
              ) : (
                <img src={previewModal.url} alt="Receipt" className="max-h-[60vh] rounded-xl object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-black text-slate-900 dark:text-white text-base">
              {isAr ? 'رفض الدفع' : 'Refuser le paiement'} ({rejectModal.referenceCode})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rejectModal.doctorName} — {rejectModal.amountTnd} TND ({rejectModal.planName})
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب الرفض (مثال: المبلغ غير مطابق أو الوصل غير واضح)...' : 'Indiquez le motif du refus (ex : montant incomplet, justificatif illisible)...'}
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={!rejectionReason.trim() || actionId === rejectModal.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
              >
                {isAr ? 'تأكيد الرفض' : 'Confirmer le refus'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
