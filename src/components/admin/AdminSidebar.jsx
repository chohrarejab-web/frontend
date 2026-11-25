import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ENABLE_REVIEWS } from '../../config/features';

export default function AdminSidebar({
  activeTab = 'praticiens',
  setActiveTab,
  activeTable = 'doctors',
  onSelectTable,
  counts = {},
  pendingPraticiens = 21,
  pendingPayments = 0,
  unreadNotifs = 2
}) {
  const { t } = useLanguage();

  const tableItems = [
    { key: 'doctors', label: t('admin_tbl_doctors', 'Médecins (DOCTORS)'), icon: '🩺', count: counts.doctors ?? 83 },
    { key: 'users', label: t('admin_tbl_users', 'Utilisateurs (USERS)'), icon: '👥', count: counts.users ?? 87 },
    ...(ENABLE_REVIEWS ? [{ key: 'reviews', label: t('admin_tbl_reviews', 'Avis Patients (REVIEWS)'), icon: '⭐', count: counts.reviews ?? 56 }] : [])
  ];

  const handleTableClick = (tableKey) => {
    setActiveTab('tables');
    if (onSelectTable) {
      onSelectTable(tableKey);
    }
  };

  return (
    <>
      {/* ════════ MOBILE HORIZONTAL NAVIGATION (SCROLLABLE PILLS) ════════ */}
      <div className="lg:hidden w-full max-w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 p-2 bg-white dark:bg-[#0c162d] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs touch-pan-x select-none">
        {/* 1. Analytics */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics' || activeTab === 'dashboard'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>📊</span>
          <span>Analytics</span>
        </button>

        {/* 2. Demandes */}
        <button
          onClick={() => setActiveTab('praticiens')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'praticiens'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>🧑‍⚕️</span>
          <span>Demandes</span>
          <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
            {pendingPraticiens}
          </span>
        </button>

        {/* 3. Notifications */}
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>📢</span>
          <span>Notifs</span>
          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
            {unreadNotifs}
          </span>
        </button>

        {/* 4. SQL */}
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'sql'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>⚡</span>
          <span>SQL</span>
        </button>

        {/* 5. Subscriptions */}
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'subscriptions'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>💳</span>
          <span>Abonnements</span>
        </button>

        {/* 6. Offline Payments */}
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'bg-[#00A896] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>🏦</span>
          <span>Paiements</span>
          {pendingPayments > 0 && (
            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingPayments}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

        {/* Tables */}
        {tableItems.map((table) => {
          const isSelected = activeTab === 'tables' && activeTable === table.key;
          return (
            <button
              key={table.key}
              onClick={() => handleTableClick(table.key)}
              className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#00A896] text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{table.icon}</span>
              <span>{table.key.toUpperCase()}</span>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {table.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ════════ DESKTOP FULL VERTICAL SIDEBAR ════════ */}
      <aside className="hidden lg:flex w-72 shrink-0 select-none flex-col h-full min-h-0">
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5 h-full overflow-y-auto custom-scrollbar">

          {/* SECTION 1: NAVIGATION */}
          <div>
            <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
              {t('admin_sidebar_nav', 'NAVIGATION')}
            </h2>

            <div className="space-y-1.5 text-xs font-bold">

              {/* 1. Tableau de Bord Analytics (Active in Screenshot 1) */}
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'analytics' || activeTab === 'dashboard'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">📊</span>
                  <span>{t('admin_sidebar_dashboard', 'Tableau de Bord Analytics')}</span>
                </span>
              </button>

              {/* 2. Demandes Praticiens (Active in Screenshot 4) */}
              <button
                onClick={() => setActiveTab('praticiens')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'praticiens'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">🧑‍⚕️</span>
                  <span>{t('admin_sidebar_demandes', 'Demandes Praticiens')}</span>
                </span>
                <span className="bg-[#fef3c7] text-[#92400e] text-[11px] font-black px-2 py-0.5 rounded-full border border-amber-200/60">
                  {pendingPraticiens}
                </span>
              </button>

              {/* 3. Centre Notifications (Active in Screenshot 3) */}
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'notifications'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">📢</span>
                  <span>{t('admin_sidebar_notifs', 'Centre Notifications')}</span>
                </span>
                <span className="bg-[#ffe4e6] text-[#be123c] text-[11px] font-black px-2 py-0.5 rounded-full border border-rose-200/60">
                  {unreadNotifs}
                </span>
              </button>

              {/* 4. Console SQL PostgreSQL */}
              <button
                onClick={() => setActiveTab('sql')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'sql'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">⚡</span>
                  <span>{t('admin_sidebar_sql', 'Console SQL PostgreSQL')}</span>
                </span>
              </button>

              {/* 5. Gestion des Abonnements & Tarifs */}
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'subscriptions'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">💳</span>
                  <span>{t('admin_sidebar_subscriptions', 'Abonnements & Tarifs')}</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                  SaaS
                </span>
              </button>

              {/* 6. Validation des Paiements Hors-Ligne */}
              <button
                onClick={() => setActiveTab('payments')}
                className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between text-left cursor-pointer ${activeTab === 'payments'
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">🏦</span>
                  <span>{t('admin_sidebar_payments', 'Paiements Hors-Ligne')}</span>
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  pendingPayments > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {pendingPayments}
                </span>
              </button>

            </div>
          </div>

          {/* SECTION 2: TABLES POSTGRESQL (Active in Screenshot 2) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
              {t('admin_sidebar_tables', 'TABLES POSTGRESQL')}
            </h2>

            <div className="space-y-1 text-xs font-bold">
              {tableItems.map((table) => {
                const isSelected = activeTab === 'tables' && activeTable === table.key;
                return (
                  <button
                    key={table.key}
                    onClick={() => handleTableClick(table.key)}
                    className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between text-left cursor-pointer ${isSelected
                        ? 'bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300 text-teal-950 dark:text-teal-100 font-black shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-sm">{table.icon}</span>
                      <span>{table.label}</span>
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black px-2 py-0.5 rounded-full">
                      {table.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}