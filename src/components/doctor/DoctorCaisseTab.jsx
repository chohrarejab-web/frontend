import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, FileText, Download, Printer, CheckCircle, X, Search, 
  ShieldCheck, History, Calendar, Clock, User, Stethoscope, Eye, Check, RefreshCw 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

export const getExactPaymentDate = (row) => {
  if (!row) return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    const [y, m, d] = row.date.split('-');
    return `${d}/${m}/${y}`;
  }
  if (row.date && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(row.date)) {
    return row.date;
  }
  if (row.dateIso && /^\d{4}-\d{2}-\d{2}$/.test(row.dateIso)) {
    const [y, m, d] = row.dateIso.split('-');
    return `${d}/${m}/${y}`;
  }
  if (row.createdAt) {
    const d = new Date(row.createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  const rowId = String(row.id || row.recuId || '');
  if (rowId) {
    const match = rowId.match(/(?:apt|q|REC|w|recu)-?(\d{12,14})/);
    if (match && match[1]) {
      const ts = parseInt(match[1], 10);
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
  }
  if (row.dateFormatted && !row.dateFormatted.toLowerCase().includes('aujourd')) {
    return row.dateFormatted;
  }
  if (row.date && !row.date.toLowerCase().includes('aujourd') && !row.date.toLowerCase().includes('hier')) {
    return row.date;
  }
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const DEFAULT_SESSIONS = [
  {
    id: 'SNC-0001',
    recuId: 'REC-0001',
    date: "Aujourd'hui",
    dateFormatted: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    heure: '10:00',
    duree: '25 min',
    patient: 'Fatma Ben Abdallah',
    telephone: '+216 98 123 456',
    age: '54 ans',
    acte: 'Consultation + ECG',
    diagnostic: 'Rythme sinusal régulier, pas de signe ischémique aigu. TA : 125/80 mmHg.',
    traitement: 'Renouvellement Amlodipine 5mg, bilan lipidique prescrit.',
    mode: 'Espèces',
    partPatient: 21,
    partCnam: 49,
    total: 70,
    cnam: true,
    cnamFiliere: 'Filière Privée (Médecin Référent)',
    statut: 'Terminée & Réglée'
  },
  {
    id: 'SNC-0002',
    recuId: 'REC-0002',
    date: "Aujourd'hui",
    dateFormatted: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    heure: '09:15',
    duree: '35 min',
    patient: 'Sami Mansour',
    telephone: '+216 22 456 789',
    age: '62 ans',
    acte: 'Échographie Cardiaque',
    diagnostic: 'Fraction d’éjection VG conservée (60%). Pas de valvulopathie mitro-aortique significative.',
    traitement: 'Poursuite règles hygiéno-diététiques, contrôle dans 6 mois.',
    mode: 'Carte Bancaire',
    partPatient: 36,
    partCnam: 84,
    total: 120,
    cnam: true,
    cnamFiliere: 'Filière Privée',
    statut: 'Terminée & Réglée'
  },
  {
    id: 'SNC-0003',
    recuId: 'REC-0003',
    date: 'Hier',
    dateFormatted: '30 oct. 2026',
    heure: '16:30',
    duree: '30 min',
    patient: 'Yassine Mansour',
    telephone: '+216 55 789 012',
    age: '45 ans',
    acte: 'Consultation Cardiologie',
    diagnostic: 'Suivi post-palpitations. Examen clinique sans anomalie, auscultation cardio-pulmonaire normale.',
    traitement: 'Bilan biologique ionogramme + TSH commandés.',
    mode: 'Espèces',
    partPatient: 70,
    partCnam: 0,
    total: 70,
    cnam: false,
    cnamFiliere: 'Secteur Libre (Remboursement direct)',
    statut: 'Terminée & Réglée'
  },
  {
    id: 'SNC-0004',
    recuId: 'REC-0004',
    date: 'Hier',
    dateFormatted: '30 oct. 2026',
    heure: '11:00',
    duree: '20 min',
    patient: 'Leila Hamdi',
    telephone: '+216 24 333 444',
    age: '58 ans',
    acte: 'Holter Tensionnel MAPA 24h',
    diagnostic: 'Pose holter tensionnel ambulatoire pour confirmation HTA masquée ou blouse blanche.',
    traitement: 'Lecture du profil tensionnel prévue demain matin.',
    mode: 'Chèque',
    partPatient: 27,
    partCnam: 63,
    total: 90,
    cnam: true,
    cnamFiliere: 'Filière Privée',
    statut: 'Terminée & Réglée'
  },
  {
    id: 'SNC-0005',
    recuId: 'REC-0005',
    date: '28 oct. 2026',
    dateFormatted: '28 oct. 2026',
    heure: '14:20',
    duree: '25 min',
    patient: 'Mohamed Ben Salah',
    telephone: '+216 97 555 666',
    age: '67 ans',
    acte: 'Consultation + Contrôle ECG',
    diagnostic: 'Contrôle tensionnel favorable sous bithérapie. ECG de repos stable.',
    traitement: 'Ordonnance reconduite pour 3 mois.',
    mode: 'Espèces',
    partPatient: 21,
    partCnam: 49,
    total: 70,
    cnam: true,
    cnamFiliere: 'Filière Privée',
    statut: 'Terminée & Réglée'
  }
];

export default function DoctorCaisseTab({ doctorId = 'doc-1', doctorName = '' }) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();

  const [encaissements, setEncaissements] = useState(() => {
    try {
      const saved = localStorage.getItem(`sahatn_encaissements_${doctorId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If doctorId is not doc-1, strip out any leaked doc-1 demo receipts
          return doctorId === 'doc-1' ? parsed : parsed.filter(e => {
            if (e.doctorId && e.doctorId !== doctorId) return false;
            if (e.doctor && e.doctor.includes('Selim')) return false;
            if (['REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(e.id)) return false;
            if (['Fatma Ben Abdallah', 'Sami Mansour', 'Yassine Mansour', 'Leila Hamdi', 'Mohamed Ben Salah'].includes(e.patient)) return false;
            return true;
          });
        }
      }
    } catch (e) {}
    if (doctorId !== 'doc-1') return [];
    return [
      {
        id: 'REC-0001',
        doctorId: 'doc-1',
        doctor: 'Dr. Selim Ben Ali',
        heure: '10:00',
        patient: 'Fatma Ben Abdallah',
        acte: 'Consultation + ECG',
        mode: 'Espèces',
        partPatient: 21,
        partCnam: 49,
        total: 70,
        statut: 'Réglé'
      }
    ];
  });

  const [modalNewOpen, setModalNewOpen] = useState(false);
  const [modalReceipt, setModalReceipt] = useState(null);
  const [modalInvoice, setModalInvoice] = useState(false);
  const [modalSessionsHistory, setModalSessionsHistory] = useState(false);
  const [sessionDetailModal, setSessionDetailModal] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'today' | 'cnam'
  const [sessionSearch, setSessionSearch] = useState('');

  // Completed sessions loaded strictly from doctor-scoped storage
  const [sessionsFaites, setSessionsFaites] = useState(() => {
    try {
      const storageKey = `sahatn_completed_sessions_${doctorId || 'doc-1'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strictly isolate: remove any records from other doctors
          const filtered = doctorId === 'doc-1' ? parsed : parsed.filter(s => {
            if (s.doctorId && s.doctorId !== doctorId) return false;
            if (s.doctor && s.doctor.includes('Selim')) return false;
            if (['SNC-0001', 'SNC-0002', 'SNC-0003', 'SNC-0004', 'SNC-0005', 'REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(s.id) || ['REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(s.recuId)) return false;
            if (['Fatma Ben Abdallah', 'Sami Mansour', 'Yassine Mansour', 'Leila Hamdi', 'Mohamed Ben Salah'].includes(s.patient)) return false;
            return true;
          });
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      console.warn('Error reading completed sessions:', e);
    }
    return doctorId === 'doc-1' ? DEFAULT_SESSIONS : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronize completed sessions directly with real rendez-vous done (Backend Appointments + Queue + Local)
  const syncCompletedSessions = useCallback(async () => {
    setIsSyncing(true);
    try {
      const storageKey = `sahatn_completed_sessions_${doctorId || 'doc-1'}`;
      let localSessions = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localSessions = doctorId === 'doc-1' ? parsed : parsed.filter(s => {
              if (s.doctorId && s.doctorId !== doctorId) return false;
              if (s.doctor && s.doctor.includes('Selim')) return false;
              if (['SNC-0001', 'SNC-0002', 'SNC-0003', 'SNC-0004', 'SNC-0005', 'REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(s.id) || ['REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(s.recuId)) return false;
              if (['Fatma Ben Abdallah', 'Sami Mansour', 'Yassine Mansour', 'Leila Hamdi', 'Mohamed Ben Salah'].includes(s.patient)) return false;
              return true;
            });
          }
        }
      } catch (e) {}

      let baseList = localSessions.length > 0 ? [...localSessions] : (doctorId === 'doc-1' ? [...DEFAULT_SESSIONS] : []);

      // Fetch appointments & queue strictly for this doctor
      const [aptsRes, queueRes] = await Promise.all([
        api.getAppointments({ doctorId }).catch(() => null),
        api.getQueue(doctorId).catch(() => null)
      ]);

      const apts = Array.isArray(aptsRes?.data) ? aptsRes.data : [];
      const queue = Array.isArray(queueRes?.queue || queueRes?.data) ? (queueRes.queue || queueRes.data) : [];

      const completedApts = apts.filter(a => {
        const matchDoc = a.doctorId === doctorId || a.doctor_id === doctorId || (doctorName && (a.doctorName === doctorName || a.doctor === doctorName));
        const isDone = a.status === 'COMPLETED' || a.status === 'TERMINE';
        return matchDoc && isDone;
      });

      const completedQueue = queue.filter(q => {
        const matchDoc = q.doctorId === doctorId || (doctorName && (q.doctor === doctorName || q.doctorName === doctorName));
        const isDone = q.stage === 'TERMINE';
        return matchDoc && isDone;
      });

      const existsInList = (list, aptId, patientName, time) => {
        return list.some(s => 
          (aptId && (s.id === aptId || s.recuId === aptId || s.appointmentId === aptId)) ||
          (patientName && s.patient && s.patient.trim().toLowerCase() === patientName.trim().toLowerCase() && (!time || s.heure === time))
        );
      };

      completedApts.forEach(apt => {
        if (!existsInList(baseList, apt.id, apt.patientName, apt.time)) {
          baseList.unshift({
            id: `SNC-${String(baseList.length + 1).padStart(4, '0')}`,
            doctorId: doctorId || 'doc-1',
            doctor: doctorName,
            appointmentId: apt.id,
            recuId: apt.id || `REC-${String(baseList.length + 1).padStart(4, '0')}`,
            date: apt.date || "Aujourd'hui",
            dateFormatted: apt.date || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            heure: apt.time || '10:00',
            duree: '25 min',
            patient: apt.patientName || 'Patient',
            telephone: apt.patientPhone || '+216 -- --- ---',
            age: apt.age || 'Patient Cabinet',
            acte: apt.motif || apt.type || 'Consultation Cardiologie',
            diagnostic: apt.diagnostic || 'Séance de consultation terminée avec succès au cabinet.',
            traitement: apt.traitement || 'Ordonnance délivrée et consignes remises.',
            mode: apt.mode || 'Espèces',
            partPatient: Number(apt.partPatient) || 21,
            partCnam: Number(apt.partCnam) || 49,
            total: Number(apt.total) || 70,
            cnam: apt.cnam !== undefined ? Boolean(apt.cnam) : true,
            cnamFiliere: apt.cnamFiliere || 'Filière Privée',
            statut: 'Terminée & Réglée',
            source: 'appointment'
          });
        }
      });

      completedQueue.forEach(qItem => {
        const qId = qItem.uuid || qItem.ticket;
        if (!existsInList(baseList, qId, qItem.patient, qItem.time)) {
          baseList.unshift({
            id: `SNC-${String(baseList.length + 1).padStart(4, '0')}`,
            doctorId: doctorId || 'doc-1',
            doctor: doctorName,
            queueId: qId,
            recuId: qId || `REC-${String(baseList.length + 1).padStart(4, '0')}`,
            date: "Aujourd'hui",
            dateFormatted: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            heure: qItem.time || '10:00',
            duree: '20 min',
            patient: qItem.patient || 'Patient',
            telephone: qItem.phone || '+216 -- --- ---',
            age: 'Patient Cabinet',
            acte: qItem.motif || 'Consultation Cabinet',
            diagnostic: 'Séance de consultation terminée avec succès au cabinet.',
            traitement: 'Consultation cabinet clôturée.',
            mode: 'Espèces',
            partPatient: 21,
            partCnam: 49,
            total: 70,
            cnam: true,
            cnamFiliere: 'Filière Privée',
            statut: 'Terminée & Réglée',
            source: 'queue'
          });
        }
      });

      setSessionsFaites(baseList);
      try {
        localStorage.setItem(storageKey, JSON.stringify(baseList));
      } catch (e) {}

      // Synchronize encaissements with baseList so completed sessions appear in finances
      const encKey = `sahatn_encaissements_${doctorId || 'doc-1'}`;
      let curEnc = [];
      try {
        const savedEnc = localStorage.getItem(encKey);
        if (savedEnc) {
          const parsed = JSON.parse(savedEnc);
          if (Array.isArray(parsed)) {
            curEnc = doctorId === 'doc-1' ? parsed : parsed.filter(e => {
              if (e.doctorId && e.doctorId !== doctorId) return false;
              if (e.doctor && e.doctor.includes('Selim')) return false;
              if (['REC-0001', 'REC-0002', 'REC-0003', 'REC-0004', 'REC-0005'].includes(e.id)) return false;
              if (['Fatma Ben Abdallah', 'Sami Mansour', 'Yassine Mansour', 'Leila Hamdi', 'Mohamed Ben Salah'].includes(e.patient)) return false;
              return true;
            });
          }
        }
      } catch (e) {}

      baseList.forEach(sess => {
        const exists = curEnc.some(e => e.id === sess.recuId || e.id === sess.id || (e.patient === sess.patient && e.heure === sess.heure));
        if (!exists) {
          curEnc.unshift({
            id: sess.recuId || sess.id || `REC-${Date.now()}`,
            doctorId: sess.doctorId || doctorId,
            doctor: sess.doctor || doctorName,
            date: getExactPaymentDate(sess),
            dateIso: sess.dateIso,
            heure: sess.heure || '10:00',
            patient: sess.patient || 'Patient',
            acte: sess.acte || 'Consultation',
            mode: sess.mode || 'Espèces',
            partPatient: Number(sess.partPatient) || 21,
            partCnam: Number(sess.partCnam) || 49,
            total: Number(sess.total) || 70,
            statut: 'Réglé'
          });
        }
      });
      setEncaissements(curEnc);
      try {
        localStorage.setItem(encKey, JSON.stringify(curEnc));
      } catch (e) {}
    } catch (err) {
      console.warn('Sync completed sessions error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [doctorId, doctorName]);

  // Initial and socket/storage synchronization
  useEffect(() => {
    syncCompletedSessions();

    const handleSessionCompleted = () => {
      syncCompletedSessions();
    };

    const handleStorageChange = (e) => {
      if (e.key && e.key.includes(`sahatn_completed_sessions_${doctorId}`)) {
        syncCompletedSessions();
      }
    };

    window.addEventListener('sahatn:session-completed', handleSessionCompleted);
    window.addEventListener('storage', handleStorageChange);

    if (socket) {
      socket.on('appointment:updated', syncCompletedSessions);
      socket.on('appointment:new', syncCompletedSessions);
      socket.on('queue:updated', syncCompletedSessions);
      socket.on('queue:called', syncCompletedSessions);
    }

    return () => {
      window.removeEventListener('sahatn:session-completed', handleSessionCompleted);
      window.removeEventListener('storage', handleStorageChange);
      if (socket) {
        socket.off('appointment:updated', syncCompletedSessions);
        socket.off('appointment:new', syncCompletedSessions);
        socket.off('queue:updated', syncCompletedSessions);
        socket.off('queue:called', syncCompletedSessions);
      }
    };
  }, [syncCompletedSessions, socket, doctorId]);

  // Re-sync when doctorId switches
  useEffect(() => {
    syncCompletedSessions();
  }, [doctorId, doctorName, syncCompletedSessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessionsFaites.filter(session => {
      if (sessionFilter === 'today' && session.date !== "Aujourd'hui") {
        return false;
      }
      if (sessionFilter === 'cnam' && !session.cnam) {
        return false;
      }

      if (sessionSearch) {
        const q = sessionSearch.toLowerCase().trim();
        const matchP = session.patient && session.patient.toLowerCase().includes(q);
        const matchA = session.acte && session.acte.toLowerCase().includes(q);
        const matchD = session.diagnostic && session.diagnostic.toLowerCase().includes(q);
        const matchT = session.telephone && session.telephone.includes(q);
        const matchId = session.id && session.id.toLowerCase().includes(q);
        return matchP || matchA || matchD || matchT || matchId;
      }

      return true;
    });
  }, [sessionsFaites, sessionFilter, sessionSearch]);

  // Form state for new payment
  const [formPatient, setFormPatient] = useState('Yassine Mansour');
  const [formActe, setFormActe] = useState('Consultation Cardiologie');
  const [formMode, setFormMode] = useState('Espèces');
  const [formTotal, setFormTotal] = useState(70);
  const [formHasCnam, setFormHasCnam] = useState(true);

  // Computed metrics (dynamically summed from all encaissements & completed sessions)
  const totalRecettes = encaissements.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
  const totalDirects = encaissements.reduce((sum, e) => sum + (Number(e.partPatient) || 0), 0);
  const totalCnam = encaissements.reduce((sum, e) => sum + (Number(e.partCnam) || 0), 0);

  const handleAddEncaissement = (e) => {
    e.preventDefault();
    const totalNum = Number(formTotal) || 70;
    const partCnam = formHasCnam ? Math.round(totalNum * 0.7) : 0;
    const partPatient = totalNum - partCnam;

    const exactDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const newRec = {
      id: `REC-${String(encaissements.length + 1).padStart(4, '0')}`,
      doctorId: doctorId || 'doc-1',
      doctor: doctorName,
      date: exactDate,
      dateIso: new Date().toISOString().split('T')[0],
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      patient: formPatient || 'Nouveau Patient',
      acte: formActe,
      mode: formMode,
      partPatient,
      partCnam,
      total: totalNum,
      statut: 'Réglé'
    };

    const updatedEnc = [newRec, ...encaissements];
    setEncaissements(updatedEnc);
    try {
      const encKey = `sahatn_encaissements_${doctorId || 'doc-1'}`;
      localStorage.setItem(encKey, JSON.stringify(updatedEnc));
    } catch (e) {}

    // Record into completed sessions history
    const newSession = {
      id: `SNC-${String(sessionsFaites.length + 1).padStart(4, '0')}`,
      doctorId: doctorId || 'doc-1',
      doctor: doctorName,
      recuId: newRec.id,
      date: "Aujourd'hui",
      dateFormatted: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      heure: newRec.heure,
      duree: '25 min',
      patient: newRec.patient,
      telephone: '+216 98 000 000',
      age: 'Patient Cabinet',
      acte: newRec.acte,
      diagnostic: 'Consultation et examen clinique conclus avec succès.',
      traitement: 'Traitement adapté selon protocole médical.',
      mode: newRec.mode,
      partPatient,
      partCnam,
      total: totalNum,
      cnam: formHasCnam,
      cnamFiliere: formHasCnam ? 'Filière Privée' : 'Secteur Libre',
      statut: 'Terminée & Réglée'
    };

    const updatedSessions = [newSession, ...sessionsFaites];
    setSessionsFaites(updatedSessions);
    try {
      const storageKey = `sahatn_completed_sessions_${doctorId || 'doc-1'}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
      window.dispatchEvent(new CustomEvent('sahatn:session-completed', {
        detail: { doctorId, session: newSession, count: updatedSessions.length }
      }));
    } catch (err) {}

    setModalNewOpen(false);
  };

  const handleExportSessionsCsv = () => {
    const headers = [
      'N° SEANCE', 'DATE', 'HEURE', 'DUREE', 'PATIENT', 
      'TELEPHONE', 'ACTE', 'DIAGNOSTIC', 'HONORAIRES TOTAL (TND)', 
      'PART PATIENT (TND)', 'PART CNAM (TND)', 'MODE', 'STATUT'
    ];
    const rows = filteredSessions.map(s => [
      s.id,
      `"${s.dateFormatted || s.date}"`,
      s.heure,
      `"${s.duree}"`,
      `"${s.patient}"`,
      `"${s.telephone || ''}"`,
      `"${s.acte}"`,
      `"${(s.diagnostic || '').replace(/"/g, '""')}"`,
      s.total,
      s.partPatient,
      s.partCnam,
      s.mode,
      `"${s.statut}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historique_seances_sahatn_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = () => {
    const headers = ['N° RECU', 'DATE', 'HEURE', 'PATIENT', 'ACTE', 'MODE', 'PART PATIENT (TND)', 'PART CNAM (TND)', 'TOTAL (TND)', 'STATUT'];
    const rows = encaissements.map(e => [
      e.id, getExactPaymentDate(e), e.heure, `"${e.patient}"`, `"${e.acte}"`, e.mode, e.partPatient, e.partCnam, e.total, e.statut
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caisse_sahatn_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ════════ TOP 3 KPI METRIC CARDS (Exact Screenshot 1) ════════ */}
      <div data-tour="caisse-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: RECETTES TOTALES DU JOUR */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {t('doc_caisse_total_recettes', 'RECETTES TOTALES DU JOUR')}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              Journée
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-[#00A896]">
              {totalRecettes} <span className="text-xl sm:text-2xl font-bold">TND</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {encaissements.length} Encaissements enregistrés aujourd'hui
          </p>
        </div>

        {/* Card 2: RÈGLEMENTS DIRECTS (ESPÈCES / CARTE) */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {t('doc_caisse_direct_patient', 'RÈGLEMENTS DIRECTS (ESPÈCES / CARTE)')}
            </span>
            <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              Comptoir
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-[#071a2b] dark:text-white">
              {totalDirects} <span className="text-xl sm:text-2xl font-bold">TND</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Encaissements perçus en caisse cabinet
          </p>
        </div>

        {/* Card 3: PART CNAM PRISE EN CHARGE (70%) */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {t('doc_caisse_teletransmis', 'PART CNAM PRISE EN CHARGE (70%)')}
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              Tiers Payant
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-[#00A896]">
              {totalCnam} <span className="text-xl sm:text-2xl font-bold">TND</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Bordereaux à télétransmettre au centre CNAM
          </p>
        </div>

      </div>

      {/* ════════ MAIN TABLE CARD (Screenshot 1) ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Card Header & Action Buttons */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {t('doc_caisse_title', 'Journal de Caisse & Règlements Praticien')}
              </h2>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                Actif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('doc_caisse_subtitle', 'Enregistrez les encaissements, imprimez des reçus thermiques instantanés et exportez vos bordereaux.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Historique des Séances Faites */}
            <button
              type="button"
              data-tour="caisse-history-btn"
              onClick={() => setModalSessionsHistory(true)}
              className="bg-[#032b43] hover:bg-[#073b5c] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-teal-800/80"
              title={t('doc_caisse_sessions_history_tooltip', "Consulter l'historique de toutes les séances et consultations médicales effectuées")}
            >
              <History className="w-3.5 h-3.5 text-teal-300" />
              <span>{t('doc_caisse_sessions_history', 'Historique des Séances Faites')}</span>
              <span className="ml-1 px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded-full text-[10px] font-mono font-bold">
                {sessionsFaites.length}
              </span>
            </button>

            {/* + Nouvel Encaissement */}
            <button
              type="button"
              data-tour="caisse-new-btn"
              onClick={() => setModalNewOpen(true)}
              className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('doc_caisse_btn_new', '+ Nouvel Encaissement')}</span>
            </button>

            {/* Facture Timbre (1.000 TND) */}
            <button
              type="button"
              data-tour="caisse-invoice-btn"
              onClick={() => setModalInvoice(true)}
              className="bg-[#0c2238] hover:bg-[#122e4c] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-teal-900"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Facture Timbre (1.000 TND)</span>
            </button>

            {/* Exporter CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div data-tour="caisse-table" className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                <th className="py-3.5 px-6">{t('doc_caisse_recu_num', 'N° REÇU')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_date', 'DATE')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_heure', 'HEURE')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_patient', 'PATIENT')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_acte', 'ACTE MÉDICAL')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_mode', 'MODE')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_part_patient', 'PART PATIENT')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_part_cnam', 'PART CNAM')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_total', 'TOTAL')}</th>
                <th className="py-3.5 px-6">{t('doc_caisse_statut', 'STATUT')}</th>
                <th className="py-3.5 px-6 text-center">{t('doc_caisse_actions', 'ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
              {encaissements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">💳</span>
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                        {t('doc_caisse_empty_title', 'Aucun encaissement enregistré pour ce cabinet')}
                      </span>
                      <span className="text-xs text-slate-400 max-w-sm">
                        {t('doc_caisse_empty_desc', 'Cliquez sur "+ Nouvel Encaissement" ci-dessus pour enregistrer un règlement patient.')}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                encaissements.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6 font-mono font-black text-[#00A896]">
                    {row.id}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {getExactPaymentDate(row)}
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-mono whitespace-nowrap">
                    {row.heure}
                  </td>
                  <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">
                    {row.patient}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                    {row.acte}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-200">
                    {row.mode}
                  </td>
                  <td className="py-4 px-6 font-black text-slate-800 dark:text-white">
                    {row.partPatient} TND
                  </td>
                  <td className="py-4 px-6 font-black text-[#00A896]">
                    {row.partCnam} TND
                  </td>
                  <td className="py-4 px-6 font-black text-slate-900 dark:text-white">
                    {row.total} TND
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200/80">
                      <span>✓</span> <span>{row.statut}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      type="button"
                      onClick={() => setModalReceipt(row)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 hover:text-[#00A896] text-slate-700 dark:text-slate-200 font-black text-[11px] transition-all cursor-pointer flex items-center gap-1 mx-auto"
                      title="Imprimer ou consulter le reçu thermique"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reçu</span>
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ════════ MODAL: NOUVEL ENCAISSEMENT ════════ */}
      {modalNewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳</span> <span>Enregistrer un Nouvel Encaissement</span>
              </h3>
              <button onClick={() => setModalNewOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEncaissement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du Patient :</label>
                <input
                  type="text"
                  required
                  value={formPatient}
                  onChange={(e) => setFormPatient(e.target.value)}
                  placeholder="Ex: Sami Mansour"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Acte Médical :</label>
                <select
                  value={formActe}
                  onChange={(e) => setFormActe(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896] cursor-pointer"
                >
                  <option value="Consultation Cardiologie">Consultation Spécialisée (70 TND)</option>
                  <option value="Consultation + ECG">Consultation + ECG (70 TND)</option>
                  <option value="Échographie Cardiaque">Échographie Cardiaque (120 TND)</option>
                  <option value="Holter Tensionnel MAPA">Holter Tensionnel MAPA 24h (90 TND)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mode de Paiement :</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896] cursor-pointer"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Carte Bancaire">Carte Bancaire (TPE)</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Flouci / Konnect">Flouci Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant Total (TND) :</label>
                  <input
                    type="number"
                    value={formTotal}
                    onChange={(e) => setFormTotal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-[#00A896] outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formHasCnam}
                  onChange={(e) => setFormHasCnam(e.target.checked)}
                  className="rounded text-[#00A896] w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-teal-900 dark:text-teal-200 block">Conventionné CNAM (Tiers Payant 70%)</span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300">Calcule automatiquement la part CNAM (49 TND) et part patient (21 TND)</span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Enregistrer l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: REÇU THERMIQUE ════════ */}
      {modalReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-black uppercase text-slate-400">Reçu Thermique 80mm</span>
              <button onClick={() => setModalReceipt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl font-mono text-[11px] space-y-2">
              <div className="text-center border-b border-dashed pb-2">
                <h4 className="font-black text-sm">CABINET DR. SELIM BEN ALI</h4>
                <p className="text-[10px] text-slate-500">Cardiologie & Maladies Vasculaires</p>
                <p className="text-[9px] text-slate-400">Avenue Hédi Nouira, Ennasr 2, Tunis</p>
                <p className="text-[9px] text-slate-400">Tél : +216 71 830 900</p>
              </div>

              <div className="flex justify-between text-[10px]">
                <span>N° {modalReceipt.id}</span>
                <span className="font-bold">{getExactPaymentDate(modalReceipt)} · {modalReceipt.heure}</span>
              </div>
              <div className="text-[10px]">
                <strong>Patient :</strong> {modalReceipt.patient}
              </div>
              <div className="border-t border-dashed pt-1 flex justify-between">
                <span>{modalReceipt.acte}</span>
                <span>{modalReceipt.total} TND</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Part CNAM (Tiers Payant) :</span>
                <span>{modalReceipt.partCnam} TND</span>
              </div>
              <div className="border-t border-b border-dashed py-1 flex justify-between font-black text-xs text-[#00A896]">
                <span>PAYÉ PAR PATIENT :</span>
                <span>{modalReceipt.partPatient} TND</span>
              </div>
              <div className="text-[10px] text-center text-slate-400 pt-1">
                Mode : {modalReceipt.mode} · Sceau Maw2idi Numérique
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setModalReceipt(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] text-white hover:bg-[#008F80] cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Reçu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: FACTURE TIMBRE FISCAL ════════ */}
      {modalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> <span>Facture Médicale avec Timbre Fiscal (1.000 TND)</span>
              </h3>
              <button onClick={() => setModalInvoice(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Honoraires Médicaux HT :</span>
                <strong className="text-slate-900 dark:text-white">70.000 TND</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">TVA (Exonération Loi Santé) :</span>
                <strong className="text-slate-900 dark:text-white">0.000 TND</strong>
              </div>
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold">
                <span>Timbre Fiscal Réglementaire :</span>
                <span>+1.000 TND</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between font-black text-sm text-[#00A896]">
                <span>TOTAL À PAYER TTC :</span>
                <span>71.000 TND</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalInvoice(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Facture avec timbre fiscal 1.000 TND générée et téléchargée.');
                  setModalInvoice(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger la Facture PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: HISTORIQUE DES SÉANCES FAITES ════════ */}
      {modalSessionsHistory && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-teal-100/80 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#002b49] via-[#071a2b] to-[#00A896] text-white p-5 sm:p-6 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                      <span>{t('doc_caisse_sessions_modal_title', 'Historique des Séances Médicales Faites')}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {sessionsFaites.length} {isAr ? 'جلسة' : 'séances'}
                      </span>
                    </h3>
                    <p className="text-xs text-teal-100/80">
                      {t('doc_caisse_sessions_modal_sub', 'Registre des consultations terminées, actes réalisés et encaissements honorés au cabinet')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalSessionsHistory(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Summary KPI strip inside modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
                  <span className="text-[10px] text-teal-200 uppercase font-black block">{t('doc_caisse_sessions_total', 'Séances Totales')}</span>
                  <span className="text-base font-black text-white">{sessionsFaites.length} {isAr ? 'منجزة' : 'honorées'}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
                  <span className="text-[10px] text-teal-200 uppercase font-black block">{t('doc_caisse_sessions_today', "Aujourd'hui")}</span>
                  <span className="text-base font-black text-emerald-300">
                    {sessionsFaites.filter(s => s.date === "Aujourd'hui").length} {isAr ? 'جلسة' : 'séances'}
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
                  <span className="text-[10px] text-teal-200 uppercase font-black block">Total Recettes</span>
                  <span className="text-base font-black text-white">
                    {sessionsFaites.reduce((sum, s) => sum + (Number(s.total) || 0), 0)} TND
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
                  <span className="text-[10px] text-teal-200 uppercase font-black block">Tiers Payant CNAM</span>
                  <span className="text-base font-black text-cyan-200">
                    {sessionsFaites.reduce((sum, s) => sum + (Number(s.partCnam) || 0), 0)} TND
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body & Filters */}
            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="Rechercher par patient, téléphone, acte médical, diagnostic..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00A896]"
                  />
                  {sessionSearch && (
                    <button
                      type="button"
                      onClick={() => setSessionSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSessionFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sessionFilter === 'all'
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isAr ? 'الكل' : 'Toutes'} ({sessionsFaites.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionFilter('today')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sessionFilter === 'today'
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isAr ? 'اليوم' : "Aujourd'hui"} ({sessionsFaites.filter(s => s.date === "Aujourd'hui").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionFilter('cnam')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sessionFilter === 'cnam'
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isAr ? 'الكنام' : 'CNAM'} ({sessionsFaites.filter(s => s.cnam).length})
                  </button>
                </div>

              </div>

              {/* Sessions Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/40">
                        <th className="py-3 px-4">N° Séance & Date</th>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">Acte Médical</th>
                        <th className="py-3 px-4">Diagnostic / Bilan</th>
                        <th className="py-3 px-4">Honoraires</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-medium">
                            <span className="text-2xl block mb-2">📋</span>
                            Aucune séance ne correspond aux critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((session) => (
                          <tr
                            key={session.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono">
                              <span className="font-black text-[#00A896] block text-[11px]">{session.id}</span>
                              <span className="text-[10px] text-slate-400">
                                {session.date} · {session.heure} ({session.duree})
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{session.patient}</span>
                                {session.cnam && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded border border-teal-200">
                                    CNAM
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                <bdi dir="ltr">{session.telephone || '+216 -- --- ---'}</bdi> {session.age ? `· ${session.age}` : ''}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {session.acte}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Mode: {session.mode}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2" title={session.diagnostic}>
                                {session.diagnostic || 'Séance conclue normalement.'}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-black text-slate-900 dark:text-white block">
                                {session.total} TND
                              </span>
                              {session.cnam ? (
                                <span className="text-[10px] text-slate-400">
                                  Patient: {session.partPatient} / CNAM: {session.partCnam}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Plein tarif</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80">
                                <Check className="w-3 h-3" />
                                <span>Faite</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSessionDetailModal(session)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 text-[#00A896] font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                  title="Voir la fiche détaillée de la séance"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Détail</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalReceipt({
                                      id: session.recuId || session.id,
                                      heure: session.heure,
                                      patient: session.patient,
                                      acte: session.acte,
                                      mode: session.mode,
                                      partPatient: session.partPatient,
                                      partCnam: session.partCnam,
                                      total: session.total,
                                      statut: 'Réglé'
                                    });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                  title="Imprimer le reçu thermique"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                Affichage de <strong className="text-slate-800 dark:text-white">{filteredSessions.length}</strong> séance(s) faite(s)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSessionsCsv}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter Registre Séances (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalSessionsHistory(false)}
                  className="px-4 py-2 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs cursor-pointer transition-all shadow-xs"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ════════ MODAL: DÉTAIL D'UNE SÉANCE FAITE ════════ */}
      {sessionDetailModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00A896] flex items-center justify-center font-bold">
                  📋
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Fiche Séance · {sessionDetailModal.id}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {sessionDetailModal.date} ({sessionDetailModal.dateFormatted}) à {sessionDetailModal.heure}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSessionDetailModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Patient info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{sessionDetailModal.patient}</span>
                  <bdi dir="ltr" className="text-[11px] text-slate-500 block font-mono">{sessionDetailModal.telephone}</bdi>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Durée</span>
                  <span className="font-black text-teal-600 dark:text-teal-400">{sessionDetailModal.duree}</span>
                </div>
              </div>

              {/* Act & Diagnosis */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Acte Réalisé</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-xs">{sessionDetailModal.acte}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Observations Cliniques / Diagnostic</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{sessionDetailModal.diagnostic}</p>
                </div>
                {sessionDetailModal.traitement && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Traitement / Recommandations</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{sessionDetailModal.traitement}</p>
                  </div>
                )}
              </div>

              {/* Billing summary */}
              <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Consultation :</span>
                  <strong className="font-black text-slate-900 dark:text-white text-sm">{sessionDetailModal.total} TND</strong>
                </div>
                {sessionDetailModal.cnam && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Part Patient (Comptoir) :</span>
                      <strong className="text-slate-800 dark:text-slate-200">{sessionDetailModal.partPatient} TND</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-teal-700 dark:text-teal-300">
                      <span>Part Prise en charge CNAM :</span>
                      <strong>{sessionDetailModal.partCnam} TND</strong>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-teal-200 dark:border-teal-800">
                  <span className="text-slate-500">Mode de Paiement :</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{sessionDetailModal.mode}</span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSessionDetailModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalReceipt({
                    id: sessionDetailModal.recuId || sessionDetailModal.id,
                    heure: sessionDetailModal.heure,
                    patient: sessionDetailModal.patient,
                    acte: sessionDetailModal.acte,
                    mode: sessionDetailModal.mode,
                    partPatient: sessionDetailModal.partPatient,
                    partCnam: sessionDetailModal.partCnam,
                    total: sessionDetailModal.total,
                    statut: 'Réglé'
                  });
                  setSessionDetailModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Reçu</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
