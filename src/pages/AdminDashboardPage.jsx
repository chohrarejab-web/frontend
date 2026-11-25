import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

// Admin Components matching the 4 reference views
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminAnalyticsTab from '../components/admin/AdminAnalyticsTab';
import AdminTablesTab from '../components/admin/AdminTablesTab';
import AdminNotificationsTab from '../components/admin/AdminNotificationsTab';
import AdminDemandesTab from '../components/admin/AdminDemandesTab';
import AdminSubscriptionsTab from '../components/admin/AdminSubscriptionsTab';
import AdminOfflinePaymentsTab from '../components/admin/AdminOfflinePaymentsTab';

// Icons for SQL console
import { Terminal, Play } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const { isDark, toggleTheme } = useTheme();

  // Live Socket Synchronization for Admin Data & Notifications
  useEffect(() => {
    if (!socket) return;
    const handleLiveNotif = (notif) => {
      if (!notif) return;
      setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)]);
    };
    const handleNotifUpdate = (data) => {
      if (!data) return;
      if (data.action === 'read' && data.id) {
        setNotifications(prev => prev.map(n => n.id === data.id ? { ...n, read: true } : n));
      } else if (data.action === 'markAllRead') {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } else if (data.action === 'delete' && data.id) {
        setNotifications(prev => prev.filter(n => n.id !== data.id));
      } else if (data.action === 'clear') {
        setNotifications([]);
      }
    };
    const handleLiveSync = () => {
      fetchAdminData(true);
    };

    socket.on('notif:new', handleLiveNotif);
    socket.on('notif:broadcast', handleLiveNotif);
    socket.on('notif:update', handleNotifUpdate);
    socket.on('queue:update', handleLiveSync);
    socket.on('appointment:new', handleLiveSync);
    socket.on('appointment:created', handleLiveSync);
    socket.on('appointment:update', handleLiveSync);
    socket.on('review:new', handleLiveSync);
    socket.on('praticien:new', handleLiveSync);
    socket.on('payment:submitted', handleLiveSync);
    socket.on('payment:updated', handleLiveSync);
    return () => {
      socket.off('notif:new', handleLiveNotif);
      socket.off('notif:broadcast', handleLiveNotif);
      socket.off('notif:update', handleNotifUpdate);
      socket.off('queue:update', handleLiveSync);
      socket.off('appointment:new', handleLiveSync);
      socket.off('appointment:created', handleLiveSync);
      socket.off('appointment:update', handleLiveSync);
      socket.off('review:new', handleLiveSync);
      socket.off('praticien:new', handleLiveSync);
      socket.off('payment:submitted', handleLiveSync);
      socket.off('payment:updated', handleLiveSync);
    };
  }, [socket]);
  
  // Active Tab state: 'analytics' (Dashboard), 'tables', 'notifications', 'praticiens', 'sql'
  const [activeTab, setActiveTab] = useState('analytics'); // Default to Dashboard (Screenshot 1)
  const [activeTable, setActiveTable] = useState('doctors'); // Default to DOCTORS (Screenshot 2)
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Live data states
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString('fr-FR'));

  // Sidebar Table Counts (Doctors and Users only)
  const [tableCounts, setTableCounts] = useState({
    doctors: 83,
    users: 124,
    reviews: 56
  });

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Nouvelle demande praticien',
      message: 'Dr. Hichem Ayari a soumis son dossier de cardiologie pour validation.',
      timestamp: new Date().toISOString(),
      read: false
    },
    {
      id: 'notif-2',
      title: 'Alerte sécurité INPDP',
      message: 'Vérification périodique du grand livre Merkle : 100% intègre.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    }
  ]);

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState('SELECT id, name, email, specialty, city, fee FROM doctors LIMIT 10;');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  // Fetch admin data (silent parameter allows background sync without freezing the UI or disabling buttons)
  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Praticien Requests
      const reqRes = await api.getPraticienRequests().catch(() => null);
      if (reqRes && reqRes.success && Array.isArray(reqRes.data)) {
        setRequests(reqRes.data);
      }

      // 1b. Pending Offline Payments badge count
      const payRes = await api.getAdminOfflinePayments({ status: 'pending' }).catch(() => null);
      if (payRes && payRes.success && payRes.data?.summary) {
        setPendingPaymentsCount(payRes.data.summary.pendingCount || 0);
      }

      // 2. Stats
      const statsRes = await api.getAdminStats().catch(() => null);
      if (statsRes && statsRes.success) {
        setStats(statsRes.stats);
        if (statsRes.stats) {
          setTableCounts(prev => ({
            ...prev,
            doctors: statsRes.stats.totalDoctors ?? prev.doctors,
            users: statsRes.stats.patientUsers ?? statsRes.stats.totalPatients ?? statsRes.stats.totalUsers ?? prev.users,
            reviews: statsRes.stats.totalReviews ?? prev.reviews ?? 56
          }));
        }
      }

      // 3. Analytics
      const analyticsRes = await api.getAdminAnalytics().catch(() => null);
      if (analyticsRes && analyticsRes.success) {
        setAnalytics(analyticsRes.data || analyticsRes.analytics || null);
      }

      // 4. Notifications (Synchronized with DB)
      const notifRes = await api.getNotifications().catch(() => null);
      const notifList = notifRes?.notifications || notifRes?.data;
      if (Array.isArray(notifList)) {
        setNotifications(notifList);
      }

      // 5. Active Table Data if on tables tab
      if (activeTab === 'tables') {
        const tableRes = await api.getDatabaseTable(activeTable).catch(() => null);
        if (tableRes && tableRes.success) {
          let data = tableRes.data || [];
          if (activeTable === 'users') {
            data = data.filter(u => {
              const r = (u.role || 'PATIENT').toUpperCase();
              const isDoc = r === 'DOCTOR' || r === 'PRATICIEN' || u.doctorId || u.doctor_id || (u.name || '').toLowerCase().startsWith('dr.');
              const isAdmin = r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SECRETAIRE' || r === 'SECRETARY';
              return !isDoc && !isAdmin;
            });
          }
          setTableData(data);
          setTableCounts(prev => ({
            ...prev,
            [activeTable]: data.length
          }));
        }
      }

      setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));

    } catch (err) {
      console.warn('Admin fetch data notice:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      fetchAdminData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeTab, activeTable]);

  // Handle SQL execution
  const handleExecuteSql = async () => {
    setSqlLoading(true);
    try {
      const res = await api.executeSql(sqlQuery);
      setSqlResult(res);
    } catch (err) {
      setSqlResult({ error: err.message, success: false });
    } finally {
      setSqlLoading(false);
    }
  };

  const handleNotificationRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleNotificationUnread = async () => {
    try {
      await api.markAllNotificationsUnread();
      setNotifications(prev => prev.map(n => ({ ...n, read: false })));
    } catch (e) {
      setNotifications(prev => prev.map(n => ({ ...n, read: false })));
    }
  };

  const handleClearNotifications = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (e) {
      setNotifications([]);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`h-screen max-h-screen w-full max-w-full flex flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'dark bg-[#071120] text-slate-100' : 'bg-[#F0FAF9] text-slate-800'}`}>
      
      {/* ════════════════ TOP HEADER (Screenshot 1, 2, 3, 4) ════════════════ */}
      <AdminHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingPraticiens={pendingCount}
        unreadNotifs={unreadNotifsCount}
        onRefresh={fetchAdminData}
        loading={loading}
        stats={stats}
        notifications={notifications}
        onNotificationRead={handleNotificationRead}
        onNotificationUnread={handleNotificationUnread}
        onClearNotifications={handleClearNotifications}
        activeTable={activeTable}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* ════════════════ MAIN BODY CONTAINER (100% Height & Width, no double scroll) ════════════════ */}
      <main className="flex-1 w-full max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 overflow-hidden min-h-0">
        
        <div className="flex flex-col lg:flex-row items-stretch gap-5 lg:gap-6 h-full min-h-0">
          
          {/* ════════ LEFT SIDEBAR (Fixed height, internal scroll if needed) ════════ */}
          <AdminSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeTable={activeTable}
            onSelectTable={(tbl) => {
              setTableData([]);
              setActiveTable(tbl);
              setActiveTab('tables');
            }}
            counts={tableCounts}
            pendingPraticiens={pendingCount}
            pendingPayments={pendingPaymentsCount}
            unreadNotifs={unreadNotifsCount}
          />

          {/* ════════ RIGHT MAIN VIEW (Scrolls if charts, statistics or tables exceed height) ════════ */}
          <div className="flex-1 w-full min-w-0 h-full overflow-y-auto pr-1 sm:pr-2 pb-6 custom-scrollbar">
            
            {/* TAB 1: DASHBOARD & ANALYTICS LIVE (Screenshot 1) */}
            {(activeTab === 'analytics' || activeTab === 'dashboard') && (
              <AdminAnalyticsTab
                analytics={analytics}
                stats={stats}
                requests={requests}
                lastSyncTime={lastSyncTime}
                onRefresh={fetchAdminData}
                loading={loading}
                onNavigateToDemandes={() => setActiveTab('praticiens')}
                onNavigateToReviews={() => {
                  setTableData([]);
                  setActiveTable('reviews');
                  setActiveTab('tables');
                }}
              />
            )}

            {/* TAB 2: TABLES BDD (Screenshot 2) */}
            {activeTab === 'tables' && (
              <AdminTablesTab
                activeTable={activeTable}
                tableData={tableData}
                onRefresh={fetchAdminData}
                loading={loading}
              />
            )}

            {/* TAB 3: CENTRE NOTIFICATIONS MULTI-CANAL (Screenshot 3) */}
            {activeTab === 'notifications' && (
              <AdminNotificationsTab
                notifications={notifications}
                onRefresh={fetchAdminData}
                onAddNotification={(newNotif) => setNotifications(prev => [newNotif, ...prev])}
              />
            )}

            {/* TAB 4: VÉRIFICATION & APPROBATION DES PRATICIENS (Screenshot 4) */}
            {activeTab === 'praticiens' && (
              <AdminDemandesTab
                requests={requests}
                onRefresh={fetchAdminData}
                loading={loading}
              />
            )}

            {/* TAB 5: CONSOLE SQL POSTGRESQL */}
            {activeTab === 'sql' && (
              <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">
                        {t('admin_sql_title', 'Console Interactive SQL PostgreSQL')}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {t('admin_sql_subtitle', 'Exécutez vos requêtes sécurisées sur le schéma relationnel SahaTN.')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {t('admin_sql_connected', 'PostgreSQL Connecté')}
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={4}
                    className="w-full font-mono text-xs p-3.5 bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder={t('admin_sql_placeholder', 'Tapez votre requête SQL ici...')}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {['SELECT * FROM users LIMIT 5;', 'SELECT * FROM doctors LIMIT 5;', 'SELECT * FROM queue;'].map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSqlQuery(q)}
                          className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleExecuteSql}
                      disabled={sqlLoading || !sqlQuery.trim()}
                      className="bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 rtl:rotate-180" />
                      <span>{sqlLoading ? t('admin_sql_executing', 'Exécution...') : t('admin_sql_execute', 'Exécuter la Requête')}</span>
                    </button>
                  </div>
                </div>

                {/* SQL Result Output */}
                {sqlResult && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      {t('admin_sql_results', 'Résultats de la requête')}
                    </span>
                    <pre className="mt-2 p-4 bg-slate-950 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-80 custom-scrollbar border border-slate-800">
                      {JSON.stringify(sqlResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: GESTION DES ABONNEMENTS & TARIFS */}
            {activeTab === 'subscriptions' && (
              <AdminSubscriptionsTab />
            )}

            {/* TAB 7: VALIDATION DES PAIEMENTS HORS-LIGNE (MÉDECINS) */}
            {activeTab === 'payments' && (
              <AdminOfflinePaymentsTab onPendingCountChange={setPendingPaymentsCount} />
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
