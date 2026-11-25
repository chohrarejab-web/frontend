import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

// Doctor Header & Navigation (eager)
import DoctorHeader from '../components/doctor/DoctorHeader';
import DoctorTabsNav from '../components/doctor/DoctorTabsNav';
import { ENABLE_REVIEWS } from '../config/features';

// Lazy-loaded Doctor Dashboard Tabs for fast loading
const DoctorCaisseTab = lazy(() => import('../components/doctor/DoctorCaisseTab'));
const DoctorEhrTab = lazy(() => import('../components/doctor/DoctorEhrTab'));
const DoctorCabinetTab = lazy(() => import('../components/doctor/DoctorCabinetTab'));
const DoctorWhatsappTab = lazy(() => import('../components/doctor/DoctorWhatsappTab'));
const DoctorAgendaTab = lazy(() => import('../components/doctor/DoctorAgendaTab'));
const DoctorOrdonnanceTab = lazy(() => import('../components/doctor/DoctorOrdonnanceTab'));
const DoctorCnamTab = lazy(() => import('../components/doctor/DoctorCnamTab'));
const DoctorRetardTab = lazy(() => import('../components/doctor/DoctorRetardTab'));
const DoctorLiaisonTab = lazy(() => import('../components/doctor/DoctorLiaisonTab'));
const DoctorReputationTab = lazy(() => import('../components/doctor/DoctorReputationTab'));
const DoctorTeleconsultTab = lazy(() => import('../components/doctor/DoctorTeleconsultTab'));
const DoctorSubscriptionTab = lazy(() => import('../components/doctor/DoctorSubscriptionTab'));
const DoctorGuidedTour = lazy(() => import('../components/doctor/DoctorGuidedTour'));

export default function DoctorDashboardPage() {
  const { user, loading, logout } = useAuth();
  const { queue, joinDoctor, socket } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Active Tab state: default to 'agenda' matching user's latest screenshot
  const [activeTab, setActiveTab] = useState('agenda');
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [tourOpen, setTourOpen] = useState(false);

  // Security Gate: Verify doctor authentication and role
  const isDoctorAuthorized = Boolean(
    user && (
      user.role === 'DOCTOR' || 
      user.role === 'PRATICIEN' || 
      user.role === 'ADMIN' || 
      user.role === 'SUPER_ADMIN' ||
      Boolean(user.doctorId)
    )
  );

  const isLocked = typeof window !== 'undefined' && sessionStorage.getItem('sahatn_doctor_session_locked') === 'true';

  const hasCachedDoctorAuth = typeof window !== 'undefined' && (
    localStorage.getItem('sahatn_doctor_authenticated') === 'true' || 
    sessionStorage.getItem('sahatn_doctor_authenticated') === 'true'
  );

  useEffect(() => {
    if (!loading) {
      if (isDoctorAuthorized || hasCachedDoctorAuth) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sahatn_doctor_session_locked');
          sessionStorage.setItem('sahatn_doctor_active_session', 'true');
        }
      } else {
        navigate('/doctor/auth?reason=locked', { replace: true });
      }
    }
  }, [loading, isDoctorAuthorized, hasCachedDoctorAuth, navigate]);

  // ════════ BROWSER NAVIGATION & BACK ARROW SECURITY GUARD ════════
  // When a doctor attempts to leave the dashboard via browser Back/Forward arrows,
  // we immediately lock and terminate the active doctor session to prevent unauthorized re-entry.
  useEffect(() => {
    // Session is active and unlocked upon fresh dashboard entry
    sessionStorage.removeItem('sahatn_doctor_session_locked');
    sessionStorage.setItem('sahatn_doctor_active_session', 'true');

    // Push dummy history entry so back button is captured without immediately executing browser back
    window.history.pushState({ doctorSessionActive: true }, '', window.location.href);

    const handleBrowserNavigation = (event) => {
      console.warn('[Security Guard] Browser back/forward navigation detected from Doctor Dashboard. Locking session.');
      
      // 1. Mark session as locked
      sessionStorage.setItem('sahatn_doctor_session_locked', 'true');
      sessionStorage.removeItem('sahatn_doctor_active_session');
      sessionStorage.removeItem('sahatn_doctor_authenticated');
      localStorage.removeItem('sahatn_doctor_authenticated');
      localStorage.removeItem('sahatn_doctor_user');
      localStorage.removeItem('sahatn_token');
      
      if (typeof logout === 'function') {
        try { logout(); } catch (e) {}
      }

      // 2. Force redirection to Doctor Auth with locked notice
      window.location.replace('/doctor/auth?reason=locked');
    };

    window.addEventListener('popstate', handleBrowserNavigation);

    return () => {
      window.removeEventListener('popstate', handleBrowserNavigation);
    };
  }, []);

  // Dynamic doctor identity resolution: bound to authenticated user, URL query params, or active doctor selection
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDocId = searchParams.get('doctorId') || searchParams.get('doc');
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    return queryDocId || user?.doctorId || (typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null) || (user?.role === 'DOCTOR' ? (user?.id || user?.uuid) : 'doc-1');
  });

  useEffect(() => {
    if (queryDocId && queryDocId !== activeDoctorId) {
      setActiveDoctorId(queryDocId);
    } else if (!queryDocId && user?.doctorId && activeDoctorId !== user.doctorId) {
      setActiveDoctorId(user.doctorId);
    }
  }, [queryDocId, user?.doctorId, activeDoctorId]);

  const doctorId = activeDoctorId || 'doc-1';

  const handleSwitchDoctor = (newDocId) => {
    if (!newDocId) return;
    setActiveDoctorId(newDocId);
    try {
      localStorage.setItem('sahatn_active_doctor_id', newDocId);
    } catch (e) {}
    setSearchParams({ doctorId: newDocId });
  };

  // Load specific doctor's profile from database
  useEffect(() => {
    let isMounted = true;
    async function loadDoctorInfo() {
      if (!doctorId) {
        setDoctorProfile(null);
        return;
      }
      try {
        const res = await api.getDoctorById(doctorId).catch(() => null);
        if (isMounted && res?.data) {
          setDoctorProfile(res.data);
        }
      } catch (err) {
        console.warn('Doctor load profile notice:', err);
      }
    }
    loadDoctorInfo();
    return () => { isMounted = false; };
  }, [doctorId]);

  const doctorName = doctorProfile?.name || user?.name || (user?.role === 'DOCTOR' ? 'Dr. Praticien' : 'Dr. Selim Ben Ali');
  const doctorSpecialty = doctorProfile?.specialtyFr || doctorProfile?.specialty || user?.specialty || (user?.role === 'DOCTOR' ? 'Médecine Générale' : 'Cardiologue');
  const doctorAvatar = doctorProfile?.avatar || user?.avatar || '/images/doctor_selim.jpg';

  const [currentPatient, setCurrentPatient] = useState('');

  useEffect(() => {
    setCurrentPatient('');
  }, [doctorId]);

  // Synchronize completion of sessions across tabs & child components
  useEffect(() => {
    const handleSessionCompleted = () => {
      setCurrentPatient('');
    };
    window.addEventListener('sahatn:session-completed', handleSessionCompleted);
    return () => window.removeEventListener('sahatn:session-completed', handleSessionCompleted);
  }, []);

  // Redirect from disabled tabs
  useEffect(() => {
    if (!ENABLE_REVIEWS && activeTab === 'reputation') {
      setActiveTab('agenda');
    }
  }, [activeTab]);

  const loadData = useCallback(async () => {
    if (!doctorId) return;
    try {
      // 1. Load completed sessions set to persistently prevent completed consultations from resurrecting
      const docKey = doctorId || 'doc-1';
      const completedNames = new Set();
      const completedIds = new Set();
      try {
        const raw = localStorage.getItem(`sahatn_completed_sessions_${docKey}`) || localStorage.getItem('sahatn_completed_sessions');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(item => {
              if (item.patient) completedNames.add(item.patient.toLowerCase().trim());
              if (item.name) completedNames.add(item.name.toLowerCase().trim());
              if (item.id) completedIds.add(String(item.id));
              if (item.appointmentId) completedIds.add(String(item.appointmentId));
            });
          }
        }
      } catch (e) {}

      const res = await api.getQueue(doctorId).catch(() => null);
      const queueData = res?.appointments || res?.data || res?.queue || [];
      if (Array.isArray(queueData)) {
        const scoped = doctorId ? queueData.filter(a => !a.doctorId || a.doctorId === doctorId) : queueData;
        setAppointments(scoped);
        const inConsult = scoped.find(a => {
          const isConsulting = (
            a.stage === 'EN_CONSULTATION' || 
            a.status === 'IN_CONSULTATION' || 
            a.status === 'IN_PROGRESS'
          );
          if (!isConsulting) return false;
          const pName = (a.patient || a.patientName || '').toLowerCase().trim();
          const pId = String(a.id || a.uuid || a.appointmentId || '');
          if (completedNames.has(pName) || (pId && completedIds.has(pId))) {
            return false;
          }
          return true;
        });

        if (inConsult) {
          setCurrentPatient(inConsult.patient || inConsult.patientName || '');
        } else {
          setCurrentPatient('');
        }
      } else {
        setAppointments([]);
        setCurrentPatient('');
      }
    } catch (err) {
      console.warn('Doctor load queue notice:', err);
    }
  }, [doctorId]);

  useEffect(() => {
    if (joinDoctor && doctorId) {
      joinDoctor(doctorId);
    }
    loadData();
  }, [doctorId, joinDoctor, loadData]);

  // Live socket synchronization for new bookings & queue changes
  useEffect(() => {
    if (!socket || !doctorId) return;
    const handleSync = () => {
      loadData();
    };
    socket.on('appointment:new', handleSync);
    socket.on('appointment:cancelled', handleSync);
    socket.on('queue:updated', handleSync);
    return () => {
      socket.off('appointment:new', handleSync);
      socket.off('appointment:cancelled', handleSync);
      socket.off('queue:updated', handleSync);
    };
  }, [socket, doctorId, loadData]);

  // Audio Chime Generator using Web Audio API
  const playMedicalChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  };

  const handleCallNext = async () => {
    playMedicalChime();
    try {
      const res = await api.callNextPatient(doctorId).catch(() => null);
      if (res && res.success && res.calledPatient) {
        const pName = res.calledPatient.patientName || res.calledPatient.patient || 'Patient suivant';
        try {
          const docKey = doctorId || 'doc-1';
          const key = `sahatn_completed_sessions_${docKey}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const filtered = list.filter(s => (s.patient || s.name || '').toLowerCase().trim() !== pName.toLowerCase().trim());
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        } catch (e) {}
        setCurrentPatient(pName);
      }
    } catch (err) {
      console.warn('Call next patient error:', err);
    }
  };

  const handleCallSpecificPatient = (patientName) => {
    playMedicalChime();
    if (patientName) {
      try {
        const docKey = doctorId || 'doc-1';
        const key = `sahatn_completed_sessions_${docKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter(s => (s.patient || s.name || '').toLowerCase().trim() !== patientName.toLowerCase().trim());
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (e) {}
    }
    setCurrentPatient(patientName);
  };

  // Daily waiting count: strictly active patients in the waiting room TODAY, resetting to 0 each new day
  // Placed before early returns to comply with React Rules of Hooks
  const todayIso = new Date().toISOString().slice(0, 10);
  const waitingCount = useMemo(() => {
    const list = (appointments && appointments.length > 0) ? appointments : (queue || []);
    return list.filter(item => {
      const matchDoc = !doctorId || item.doctorId === doctorId || item.doctor === doctorName;
      if (!matchDoc) return false;
      const itemDate = item.dateIso || (item.createdAt ? item.createdAt.slice(0, 10) : null) || (item.date ? String(item.date).slice(0, 10) : null);
      const isToday = !itemDate || itemDate === todayIso;
      const isWaiting = item.stage === 'SALLE_D_ATTENTE' || item.stage === 'ARRIVE' || item.status === 'EN_ATTENTE';
      return isToday && isWaiting;
    }).length;
  }, [appointments, queue, doctorId, doctorName, todayIso]);

  // ════════ SECURITY GATES & LOADING RENDERS ════════
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07131e] text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
          <Shield className="w-7 h-7" />
        </div>
        <p className="text-base font-bold text-slate-200">Vérification de la session praticien...</p>
        <p className="text-xs text-slate-400 mt-1">Accès sécurisé sous cryptage INPDP & Ordre des Médecins</p>
      </div>
    );
  }

  if (!isDoctorAuthorized && !hasCachedDoctorAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07131e] text-white p-6 space-y-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black">Accès Sécurisé Réservé aux Praticiens</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Cet espace de consultation et de gestion des dossiers médicaux est strictement confidentiel. Veuillez vous connecter avec votre compte praticien habilité.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all border border-slate-700"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => navigate('/doctor/auth', { replace: true })}
            className="bg-[#0086cd] hover:bg-[#0074b3] text-white px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all shadow-md"
          >
            Se connecter à l'espace praticien
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${isDark ? 'dark bg-[#071120] text-slate-100' : 'bg-[#F0FAF9] text-slate-800'}`}>
      
      {/* ════════════════ TOP DEDICATED DOCTOR HEADER ════════════════ */}
      <DoctorHeader
        doctorId={doctorId}
        onResetTab={() => setActiveTab('agenda')}
        onSelectTab={setActiveTab}
        doctorName={doctorName}
        specialty={doctorSpecialty}
        avatar={doctorAvatar}
        cabinetStatus={currentPatient ? `En consultation: ${currentPatient}` : "Cabinet: Salle Libre"}
        waitingCount={waitingCount}
        onCallNext={handleCallNext}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onDoctorUpdated={(updated) => {
          if (updated) setDoctorProfile(prev => ({ ...prev, ...updated }));
        }}
        onSwitchDoctor={handleSwitchDoctor}
      />

      {/* ════════════════ MAIN BODY CONTAINER ════════════════ */}
      <main className="flex-1 w-full max-w-[1780px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* ════════ HORIZONTAL SCROLLABLE TABS BAR (Screenshots 1-5) ════════ */}
        <DoctorTabsNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenTour={() => setTourOpen(true)}
        />

        {/* ════════ ACTIVE TAB CONTENT ════════ */}
        <Suspense fallback={
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-teal-500/20 border-t-[#00A896] animate-spin" />
          </div>
        }>
        {activeTab === 'caisse' && (
          <DoctorCaisseTab key={`caisse-${doctorId}`} doctorId={doctorId} doctorName={doctorName} />
        )}

        {activeTab === 'ehr' && (
          <DoctorEhrTab key={`ehr-${doctorId}`} doctorId={doctorId} doctorName={doctorName} appointments={appointments} />
        )}

        {activeTab === 'cabinet' && (
          <DoctorCabinetTab
            doctorId={doctorId}
            doctorName={doctorName}
            doctorSpecialty={doctorSpecialty}
            doctorProfile={doctorProfile}
          />
        )}

        {activeTab === 'whatsapp' && (
          <DoctorWhatsappTab 
            doctorId={doctorId} 
            doctorName={doctorName} 
            doctorSpecialty={doctorSpecialty}
            currentPatient={currentPatient}
            queue={appointments}
          />
        )}

        {activeTab === 'agenda' && (
          <DoctorAgendaTab
            queue={appointments}
            currentPatient={currentPatient}
            onCallPatient={handleCallSpecificPatient}
            onEndConsultation={() => setCurrentPatient('')}
            playChime={playMedicalChime}
            onSelectTab={setActiveTab}
            doctorId={doctorId}
            doctorName={doctorName}
            doctorSpecialty={doctorSpecialty}
            doctorProfile={doctorProfile}
          />
        )}

        {activeTab === 'ordonnance' && (
          <DoctorOrdonnanceTab
            doctorId={doctorId}
            doctorName={doctorName}
            doctorSpecialty={doctorSpecialty}
            doctorProfile={doctorProfile}
            currentPatient={currentPatient}
          />
        )}

        {activeTab === 'cnam' && (
          <DoctorCnamTab
            doctorId={doctorId}
            doctorName={doctorName}
            doctorProfile={doctorProfile}
          />
        )}

        {activeTab === 'retard' && (
          <DoctorRetardTab key={`retard-${doctorId}`} doctorId={doctorId} doctorName={doctorName} />
        )}

        {activeTab === 'liaison' && (
          <DoctorLiaisonTab
            doctorId={doctorId}
            doctorName={doctorName}
            doctorSpecialty={doctorSpecialty}
            doctorProfile={doctorProfile}
          />
        )}

        {ENABLE_REVIEWS && activeTab === 'reputation' && (
          <DoctorReputationTab doctorId={doctorId} doctorName={doctorName} />
        )}

        {activeTab === 'teleconsult' && (
          <DoctorTeleconsultTab doctorName={doctorName} />
        )}

        {activeTab === 'abonnement' && (
          <DoctorSubscriptionTab doctorId={doctorId} doctorName={doctorName} />
        )}
        </Suspense>

      </main>

      {/* ════════ GUIDED ANIMATED TOUR ════════ */}
      {tourOpen && (
        <Suspense fallback={null}>
          <DoctorGuidedTour
            activeTab={activeTab}
            isOpen={tourOpen}
            onClose={() => setTourOpen(false)}
            onFinish={() => setTourOpen(false)}
          />
        </Suspense>
      )}

    </div>
  );
}
