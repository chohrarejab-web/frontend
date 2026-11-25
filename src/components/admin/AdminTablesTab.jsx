import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit2, X, Search, ChevronDown, ChevronLeft, ChevronRight, Check,
  Trash2, UserPlus, AlertTriangle, User, Info, FileText, Phone, Mail, Shield, Stethoscope, Star, MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import TunisianPhoneInput from '../common/TunisianPhoneInput';
import { TUNISIAN_GOVERNORATES } from '../../data/tunisiaData';
import { getPlansPricingMap, getSubscriptionPlans, subscribeToSubscriptionChanges } from '../../data/subscriptionsData';
import { 
  cleanDoctorName, 
  formatDoctorName, 
  resolveDoctorSpecialty, 
  resolveDoctorCity, 
  resolveDoctorTitle, 
  resolveBadge, 
  resolveDoctorName 
} from '../../utils/i18nHelper';

const isSimpleUser = (user) => {
  if (!user) return false;
  const role = (user.role || 'PATIENT').toUpperCase();
  if (role === 'DOCTOR' || role === 'PRATICIEN' || user.doctorId || user.doctor_id) return false;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SECRETAIRE' || role === 'SECRETARY') return false;
  const name = (user.name || '').toLowerCase();
  if (name.startsWith('dr.') || name.startsWith('dr ')) return false;
  return true;
};

const DOCTOR_NAMES_MAP = {
  'doc-1': 'Dr. Selim Ben Ali',
  'doc-1792141803746': 'Dr. Sami Mansouri',
  'doc-1791842374064': 'Dr. Hichem Ayari',
  'doc-1791843364857': 'Dr. Walid Ben Salem',
  'doc-1791836554301': 'Dr. Walid Mansour',
  'doc-3': 'Dr. Louay Rabeh',
  'doc-4': 'Dr. Amine Bensalem'
};

export default function AdminTablesTab({
  activeTable = 'doctors',
  tableData = [],
  onRefresh,
  loading
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic subscriptions pricing map & list synchronized across tabs
  const [plansMap, setPlansMap] = useState(() => getPlansPricingMap());
  const [dynamicPlansList, setDynamicPlansList] = useState(() => getSubscriptionPlans());
  useEffect(() => {
    return subscribeToSubscriptionChanges((updated) => {
      setPlansMap(getPlansPricingMap(updated));
      setDynamicPlansList(updated);
    });
  }, []);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState(null);
  const [viewReviewDetails, setViewReviewDetails] = useState(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (deleteConfirmRow) {
          setDeleteConfirmRow(null);
        } else if (editRow) {
          setEditRow(null);
        } else if (viewReviewDetails) {
          setViewReviewDetails(null);
        } else if (createModalOpen) {
          setCreateModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmRow, editRow, viewReviewDetails, createModalOpen]);

  const isUsersTable = activeTable === 'users';
  const isReviewsTable = activeTable === 'reviews';
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLIÉ' | 'MODÉRÉ'

  // Form state for creating a new review
  const [createReviewFormData, setCreateReviewFormData] = useState({
    doctor: 'Dr. Selim Ben Ali',
    doctorId: 'doc-1',
    patientName: '',
    rating: 5,
    comment: '',
    status: 'PUBLIÉ'
  });

  // Form state for creating a new doctor
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    specialty: 'Cardiologie & Maladies Vasculaires',
    city: 'Tunis (Centre-Ville)',
    fee: '70 TND',
    cnam: true
  });

  // Form state for creating a new user
  const [createUserFormData, setCreateUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'PATIENT'
  });

  // Fallback demo rows for Doctors (83 available in DB)
  const initialDoctors = [
    {
      id: 'doc-1',
      name: 'Dr. Selim Ben Ali',
      email: 'dr.selim.benali@sahatn.tn',
      specialty: 'Cardiologie & Maladies Vasculaires',
      city: 'Tunis (Ennasr)',
      fee: '70 TND',
      cnam: true,
      offer: 'pro',
      billingCycle: 'annual'
    },
    {
      id: 'doc-1791843364857',
      name: 'Dr. Walid Ben Salem',
      email: 'dr.walid.maptest.1791843364776@sahatn.tn',
      specialty: 'Cardiologie & Maladies Vasculaires',
      city: 'Ariana',
      fee: '80 TND',
      cnam: true
    },
    {
      id: 'doc-1791842374064',
      name: 'Dr. Hichem Ayari',
      email: 'dr.hichem.ayari@sahatn.tn',
      specialty: 'Cardiologie & Maladies Vasculaires',
      city: 'Tunis',
      fee: '80 TND',
      cnam: true
    },
    {
      id: 'doc-1791836554301',
      name: 'Dr. Walid Mansour',
      email: 'dr.test949@sahatn.tn',
      specialty: 'Gynécologie Obstétrique',
      city: 'Monastir',
      fee: '75 TND',
      cnam: true
    },
    {
      id: 'doc-3',
      name: 'Dr. louay rabeh',
      email: 'rabehloay22@gmail.com',
      specialty: 'Cardiologie & Maladies Vasculaires',
      city: 'Tunis (Ennasr)',
      fee: '70 TND',
      cnam: true
    },
    {
      id: 'doc-4',
      name: 'Dr. amine bensalem',
      email: 'ahmedweldgolaa1@gmail.com',
      specialty: 'Cardiologie & Maladies Vasculaires',
      city: 'Kébili (El Golâa)',
      fee: '70 TND',
      cnam: true
    }
  ];

  // Fallback demo rows for Users (Simple Users / Patients only)
  const initialUsers = [
    {
      id: 'usr-4410',
      uuid: 'usr-4410',
      name: 'Fatma Ben Abdallah',
      email: 'fatma.benabdallah@gmail.com',
      phone: '+216 20 999 123',
      role: 'PATIENT',
      createdAt: '2026-09-17T09:59:40Z'
    },
    {
      id: 'usr-patient-2',
      uuid: 'usr-patient-2',
      name: 'Yassine Mansour',
      email: 'yassine.mansour@gmail.com',
      phone: '+216 98 444 555',
      role: 'PATIENT',
      createdAt: '2026-10-02T14:15:00Z'
    },
    {
      id: 'usr-1791712278085',
      uuid: 'usr-1791712278085',
      name: 'Patient Tester',
      email: 'patient.test.1791712278010@sahatn.tn',
      phone: '+216 21 345 678',
      role: 'PATIENT',
      createdAt: '2026-10-11T12:00:00Z'
    },
    {
      id: 'usr-1791712236678',
      uuid: 'usr-1791712236678',
      name: 'Nobody 1234987',
      email: 'nobody_1234987@gmail.com',
      phone: '+216 55 123 456',
      role: 'PATIENT',
      createdAt: '2026-10-11T11:00:00Z'
    }
  ];

  // Fallback demo rows for Reviews (56 available in DB)
  const initialReviews = [
    {
      id: 'rev-1792577344126',
      uuid: 'rev-1792577344126',
      doctorId: 'doc-1792141803746',
      doctor: 'Dr. Sami Mansouri',
      patientName: 'Fatma Benali',
      patient: 'Fatma Benali',
      displayInitial: 'Fatma B.',
      date: '21 octobre 2026',
      rating: 5,
      comment: 'Excellente consultation, médecin très attentif et ponctuel.',
      status: 'PUBLIÉ',
      verified: true,
      createdAt: '2026-10-21T10:09:04.126Z'
    },
    {
      id: 'rev-1792577344127',
      uuid: 'rev-1792577344127',
      doctorId: 'doc-1',
      doctor: 'Dr. Selim Ben Ali',
      patientName: 'Mourad Trabelsi',
      patient: 'Mourad Trabelsi',
      displayInitial: 'Mourad T.',
      date: '20 octobre 2026',
      rating: 5,
      comment: "Très à l'écoute et diagnostic rassurant.",
      status: 'PUBLIÉ',
      verified: true,
      createdAt: '2026-10-20T14:30:00.000Z'
    },
    {
      id: 'rev-1792577344128',
      uuid: 'rev-1792577344128',
      doctorId: 'doc-1791842374064',
      doctor: 'Dr. Hichem Ayari',
      patientName: 'Khadija Bouaziz',
      patient: 'Khadija Bouaziz',
      displayInitial: 'Khadija B.',
      date: '19 octobre 2026',
      rating: 4.8,
      comment: 'Bonne prise en charge générale et explications claires.',
      status: 'PUBLIÉ',
      verified: true,
      createdAt: '2026-10-19T09:15:00.000Z'
    },
    {
      id: 'rev-1792577344129',
      uuid: 'rev-1792577344129',
      doctorId: 'doc-1791843364857',
      doctor: 'Dr. Walid Ben Salem',
      patientName: 'Anis Mansouri',
      patient: 'Anis Mansouri',
      displayInitial: 'Anis M.',
      date: '18 octobre 2026',
      rating: 4.5,
      comment: 'Cabinet propre et ponctualité exemplaire.',
      status: 'PUBLIÉ',
      verified: true,
      createdAt: '2026-10-18T11:45:00.000Z'
    },
    {
      id: 'rev-1792577344130',
      uuid: 'rev-1792577344130',
      doctorId: 'doc-3',
      doctor: 'Dr. Louay Rabeh',
      patientName: 'Yassine Mansour',
      patient: 'Yassine Mansour',
      displayInitial: 'Yassine M.',
      date: '17 octobre 2026',
      rating: 5,
      comment: "Rendez-vous à l'heure et praticien très compétent.",
      status: 'PUBLIÉ',
      verified: true,
      createdAt: '2026-10-17T16:20:00.000Z'
    }
  ];

  const [items, setItems] = useState(() => {
    return isReviewsTable ? initialReviews : (isUsersTable ? initialUsers : initialDoctors);
  });

  useEffect(() => {
    if (tableData && tableData.length > 0) {
      const first = tableData[0];
      const isReviewData = first && (first.rating !== undefined || first.comment !== undefined || String(first.id || '').startsWith('rev-'));
      const isUserData = first && (first.role !== undefined || String(first.id || '').startsWith('usr-'));
      const isDoctorData = first && (first.specialty !== undefined || String(first.id || '').startsWith('doc-'));

      if (isReviewsTable && isReviewData) {
        setItems(tableData);
      } else if (isUsersTable && isUserData) {
        setItems(tableData.filter(isSimpleUser));
      } else if (!isReviewsTable && !isUsersTable && isDoctorData) {
        setItems(tableData);
      }
    } else {
      setItems(isReviewsTable ? initialReviews : (isUsersTable ? initialUsers.filter(isSimpleUser) : initialDoctors));
    }
  }, [tableData, activeTable, isUsersTable, isReviewsTable]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = items;
    if (isUsersTable) {
      list = list.filter(isSimpleUser);
    }
    if (isReviewsTable && ratingFilter !== 'ALL') {
      const targetRating = Number(ratingFilter);
      list = list.filter(r => Math.round(Number(r.rating || 5)) === targetRating);
    }
    if (isReviewsTable && statusFilter !== 'ALL') {
      if (statusFilter === 'MODÉRÉ') {
        list = list.filter(r => {
          const s = (r.status || '').toUpperCase();
          return s === 'MODÉRÉ' || s === 'MASQUÉ';
        });
      } else if (statusFilter === 'PUBLIÉ') {
        list = list.filter(r => {
          const s = (r.status || 'PUBLIÉ').toUpperCase();
          return s === 'PUBLIÉ';
        });
      }
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(r => {
      if (isReviewsTable) {
        const patient = (r.patientName || r.patient || '').toLowerCase();
        const doc = (r.doctor || DOCTOR_NAMES_MAP[r.doctorId] || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const status = (r.status || '').toLowerCase();
        return patient.includes(q) || doc.includes(q) || comment.includes(q) || status.includes(q);
      }
      const name = r.name || '';
      const email = r.email || '';
      const phone = r.phone || '';
      const role = r.role || '';
      const spec = r.specialty || '';
      const city = r.city || r.delegation || '';
      return name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        spec.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q);
    });
  }, [items, search, isReviewsTable, ratingFilter, statusFilter]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // Quick toggle status for review
  const handleToggleReviewStatus = async (review) => {
    const current = (review.status || 'PUBLIÉ').toUpperCase();
    const nextStatus = current === 'PUBLIÉ' ? 'EN ATTENTE' : 'PUBLIÉ';
    const targetId = review.id || review.uuid;
    const updatedReview = { ...review, status: nextStatus };
    setItems(prev => prev.map(item => ((item.id === targetId || item.uuid === targetId) ? updatedReview : item)));
    try {
      await api.updateTableRow('reviews', targetId, { status: nextStatus });
    } catch (err) { }
  };

  // CRUD handlers
  const handleSaveCreate = async (e) => {
    e.preventDefault();
    if (isReviewsTable) {
      if (!createReviewFormData.patientName.trim()) {
        alert('Veuillez renseigner le nom du patient.');
        return;
      }
      const newReview = {
        id: `rev-${Date.now()}`,
        uuid: `rev-${Date.now()}`,
        doctorId: createReviewFormData.doctorId || 'doc-1',
        doctor: createReviewFormData.doctor || 'Dr. Selim Ben Ali',
        patientName: createReviewFormData.patientName.trim(),
        patient: createReviewFormData.patientName.trim(),
        displayInitial: createReviewFormData.patientName.trim(),
        rating: Number(createReviewFormData.rating) || 5,
        comment: createReviewFormData.comment.trim() || 'Avis patient certifié.',
        status: createReviewFormData.status || 'PUBLIÉ',
        verified: true,
        date: new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' }),
        createdAt: new Date().toISOString()
      };
      setItems(prev => [newReview, ...prev]);
      setCreateModalOpen(false);
      setCreateReviewFormData({
        doctor: 'Dr. Selim Ben Ali',
        doctorId: 'doc-1',
        patientName: '',
        rating: 5,
        comment: '',
        status: 'PUBLIÉ'
      });
      try {
        await api.createTableRow('reviews', newReview);
      } catch (err) { }
    } else if (isUsersTable) {
      if (!createUserFormData.name.trim() || !createUserFormData.email.trim()) {
        alert('Veuillez renseigner le nom et l\'email de l\'utilisateur.');
        return;
      }
      const newUser = {
        id: `usr-${Date.now()}`,
        uuid: `usr-${Date.now()}`,
        name: createUserFormData.name.trim(),
        email: createUserFormData.email.trim(),
        phone: createUserFormData.phone.trim() || '+216 20 000 000',
        role: createUserFormData.role || 'PATIENT',
        createdAt: new Date().toISOString()
      };
      setItems(prev => [newUser, ...prev]);
      setCreateModalOpen(false);
      setCreateUserFormData({
        name: '',
        email: '',
        phone: '',
        role: 'PATIENT'
      });
      try {
        await api.createTableRow('users', newUser);
      } catch (err) { }
    } else {
      const cleanName = cleanDoctorName(createFormData.name);
      if (!cleanName) {
        alert('Veuillez renseigner le nom du praticien.');
        return;
      }
      const rawFee = String(createFormData.fee || '').replace(/\D/g, '');
      const numFee = rawFee ? Math.min(200, Math.max(20, parseInt(rawFee, 10))) : 70;
      const formattedDoctorName = formatDoctorName(cleanName, isAr);
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: formattedDoctorName,
        email: createFormData.email.trim() || 'contact@sahatn.tn',
        specialty: createFormData.specialty,
        city: createFormData.city,
        fee: `${numFee} TND`,
        cnam: createFormData.cnam,
        offer: createFormData.offer || 'pro',
        billingCycle: createFormData.billingCycle || 'annual',
        subscriptionPlan: createFormData.offer || 'pro',
        subscriptionCycle: createFormData.billingCycle || 'annual'
      };
      setItems(prev => [newDoc, ...prev]);
      setCreateModalOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        specialty: 'Cardiologie & Maladies Vasculaires',
        city: 'Tunis (Centre-Ville)',
        fee: '70 TND',
        cnam: true
      });
      try {
        await api.createTableRow('doctors', newDoc);
      } catch (err) { }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editRow) return;

    const targetId = editRow.id || editRow.uuid;

    if (isReviewsTable) {
      const patientName = (editRow.patientName || editRow.patient || '').trim();
      if (!patientName) {
        alert('Veuillez renseigner le nom du patient.');
        return;
      }

      const updatedReview = {
        ...editRow,
        patientName,
        patient: patientName,
        doctor: (editRow.doctor || 'Dr. Selim Ben Ali').trim(),
        rating: Number(editRow.rating || 5),
        comment: (editRow.comment || '').trim(),
        status: (editRow.status || 'PUBLIÉ').toUpperCase(),
        verified: editRow.verified !== false,
        updatedAt: new Date().toISOString()
      };

      setItems(prev => prev.map(item => ((item.id === targetId || item.uuid === targetId) ? updatedReview : item)));
      setEditRow(null);

      // Invalider le cache des avis pour actualiser immédiatement la page profil du praticien
      try {
        const docId = updatedReview.doctorId || editRow.doctorId || 'doc-1';
        localStorage.removeItem(`sahatn_reviews_${docId}`);
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sahatn_reviews_')) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) { }

      try {
        await api.updateTableRow('reviews', targetId, updatedReview);
      } catch (err) {
        console.warn('Update review error:', err.message);
      }
    } else {
      if (!editRow.name || !editRow.name.trim()) {
        alert('Veuillez renseigner le nom.');
        return;
      }

      let rowToSave = { ...editRow };
      if (activeTable === 'doctors') {
        const cleanName = cleanDoctorName(editRow.name);
        rowToSave.name = formatDoctorName(cleanName, isAr);
        const rawFee = String(editRow.fee || '').replace(/\D/g, '');
        const numFee = rawFee ? Math.min(200, Math.max(20, parseInt(rawFee, 10))) : 70;
        rowToSave.fee = `${numFee} TND`;
      }

      setItems(prev => prev.map(item => ((item.id === targetId || item.uuid === targetId) ? rowToSave : item)));
      setEditRow(null);

      try {
        await api.updateTableRow(activeTable, targetId, rowToSave);
      } catch (err) {
        console.warn('Update row error:', err.message);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmRow) return;
    const targetId = deleteConfirmRow.id || deleteConfirmRow.uuid;
    setItems(prev => prev.filter(item => (item.id !== targetId && item.uuid !== targetId)));
    setDeleteConfirmRow(null);
    try {
      await api.deleteTableRow(activeTable, targetId);
    } catch (err) { }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ════════ HEADER ROW: Table Name + Search + Button ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">

        <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
          <span>{isReviewsTable ? '⭐' : (isUsersTable ? '👥' : '🩺')}</span>
          <span>
            {isReviewsTable 
              ? (isAr ? 'قائمة : آراء وتقييمات المرضى' : 'Table : AVIS PATIENTS (REVIEWS)') 
              : (isUsersTable 
                ? (isAr ? 'قائمة : المستخدمون (USERS)' : 'Table : UTILISATEURS (USERS)') 
                : (isAr ? 'قائمة : الأطباء (DOCTORS)' : 'Table : MÉDECINS (DOCTORS)'))}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
            {totalRows} {isReviewsTable ? (isAr ? 'تقييم' : 'avis') : (isAr ? 'سجل' : 'lignes')}
          </span>
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? (isReviewsTable ? 'بحث في المرضى، الأطباء، التقييمات...' : (isUsersTable ? 'بحث بالاسم، البريد، الدور...' : 'بحث عن طبيب، اختصاص، ولاية...')) : (isReviewsTable ? 'Rechercher patient, praticien, avis...' : (isUsersTable ? 'Rechercher nom, email, rôle...' : 'Rechercher médecin, ville...'))}
              className="w-full bg-white dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-[#00A896] shadow-xs"
            />
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto justify-center bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs px-4 py-2.5 sm:py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? (isReviewsTable ? '+ تقييم جديد' : (isUsersTable ? '+ مستخدم جديد' : '+ طبيب جديد')) : (isReviewsTable ? ' Nouvel Avis' : (isUsersTable ? '+ Nouvel Utilisateur' : '+ Nouveau Praticien'))}</span>
          </button>
        </div>

      </div>

      {/* Quick rating & status filters for Reviews table */}
      {isReviewsTable && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold w-full overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto touch-pan-x">
            <span className="text-slate-400 text-xs shrink-0">{isAr ? 'تصفية حسب التقييم :' : 'Filtrer par note :'}</span>
            {['ALL', '5', '4', '3'].map((r) => (
              <button
                key={r}
                onClick={() => { setRatingFilter(r); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${ratingFilter === r
                    ? 'bg-[#00A896] text-white shadow-xs'
                    : 'bg-white dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
              >
                {r === 'ALL' ? (isAr ? 'جميع التقييمات' : 'Toutes les notes') : (isAr ? `⭐ ${r} نجوم` : `⭐ ${r} Étoiles`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto touch-pan-x">
            <span className="text-slate-400 text-xs shrink-0">{isAr ? 'الحالة :' : 'Statut :'}</span>
            {[
              { id: 'ALL', label: isAr ? 'جميع الحالات' : 'Tous les statuts' },
              { id: 'PUBLIÉ', label: isAr ? '✅ منشورة' : '✅ Publiés' },
              { id: 'MODÉRÉ', label: isAr ? '🛑 محجوبة / معلقة' : '🛑 Masqués / Modérés' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => { setStatusFilter(s.id); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${statusFilter === s.id
                    ? s.id === 'MODÉRÉ'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-[#00A896] text-white shadow-xs'
                    : 'bg-white dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════ DATA TABLE (DOCTORS OR USERS) ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden w-full max-w-full">
        {/* Mobile Swipe Indicator Hint */}
        <div className="lg:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-400 font-semibold flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <span>👉 Glissez horizontalement pour voir toutes les colonnes</span>
          <span className="text-xs">↔</span>
        </div>

        <div className="overflow-x-auto w-full max-w-full custom-scrollbar touch-pan-x">
          <table className="w-full min-w-[720px] text-left border-collapse">

            {/* Table Header: Doctors vs Users vs Reviews */}
            <thead>
              {isReviewsTable ? (
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">{isAr ? 'المريض' : 'PATIENT'}</th>
                  <th className="py-4 px-6">{isAr ? 'الطبيب المعني' : 'PRATICIEN CONCERNÉ'}</th>
                  <th className="py-4 px-6">{isAr ? 'التقييم العام' : 'NOTE GLOBALE'}</th>
                  <th className="py-4 px-6">{isAr ? 'التعليق / الملاحظات' : 'COMMENTAIRE / RETOUR'}</th>
                  <th className="py-4 px-6">{isAr ? 'التاريخ والحالة' : 'DATE & STATUT'}</th>
                  <th className="py-4 px-6 text-center">{isAr ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              ) : isUsersTable ? (
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">{isAr ? 'المستخدم' : 'UTILISATEUR'}</th>
                  <th className="py-4 px-6">{isAr ? 'البريد الإلكتروني' : 'EMAIL'}</th>
                  <th className="py-4 px-6">{isAr ? 'الهاتف' : 'TÉLÉPHONE'}</th>
                  <th className="py-4 px-6">{isAr ? 'الدور' : 'RÔLE'}</th>
                  <th className="py-4 px-6">{isAr ? 'تاريخ التسجيل' : 'DATE D\'INSCRIPTION'}</th>
                  <th className="py-4 px-6 text-center">{isAr ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              ) : (
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">{t('admin_th_praticien', isAr ? 'الطبيب' : 'PRATICIEN')}</th>
                  <th className="py-4 px-6">{t('admin_th_email', isAr ? 'البريد / الاتصال' : 'EMAIL / CONTACT')}</th>
                  <th className="py-4 px-6">{t('admin_th_specialty', isAr ? 'الاختصاص' : 'SPÉCIALITÉ')}</th>
                  <th className="py-4 px-6">{t('admin_th_city', isAr ? 'الولاية / المدينة' : 'GOUVERNORAT / VILLE')}</th>
                  <th className="py-4 px-6">{t('admin_th_fee', isAr ? 'الأتعاب' : 'HONORAIRES')}</th>
                  <th className="py-4 px-6">{t('admin_th_subscription', isAr ? 'الباقة والاشتراك' : 'FORMULE & ABONNEMENT')}</th>
                  <th className="py-4 px-6 text-center">{t('admin_th_actions', isAr ? 'الإجراءات' : 'ACTIONS')}</th>
                </tr>
              )}
            </thead>

            {/* Table Body: Reviews vs Users vs Doctors */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                    {t('admin_no_table_rows', 'Aucun résultat trouvé pour votre recherche.')}
                  </td>
                </tr>
              ) : isReviewsTable ? (
                /* ════════ RENDER REVIEWS TABLE ════════ */
                paginatedRows.map((row, idx) => {
                  const patientName = row.patientName || row.patient || 'Patient Maw2idi';
                  const resolvedDocId = row.doctorId || 'doc-1';
                  const doctorName = row.doctor || DOCTOR_NAMES_MAP[resolvedDocId] || (row.reply && row.reply.doctorName) || 'Dr. Selim Ben Ali';
                  const ratingNum = Number(row.rating || 5);
                  const statusUpper = (row.status || 'PUBLIÉ').toUpperCase();
                  const isModere = statusUpper === 'MODÉRÉ' || statusUpper === 'MASQUÉ';
                  const isPublie = statusUpper === 'PUBLIÉ';

                  return (
                    <tr
                      key={row.id || row.uuid || idx}
                      className={`transition-colors ${isModere
                          ? 'bg-rose-50/25 dark:bg-rose-950/20 border-l-4 border-l-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-950/30'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                    >
                      {/* PATIENT */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-sm shrink-0">
                            {(patientName[0] || 'P').toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 dark:text-white">
                                {patientName}
                              </span>
                              {row.verified !== false && (
                                <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  ✓ Vérifié
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {row.uuid || row.id || `rev-${idx}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PRATICIEN CONCERNÉ */}
                      <td className="py-4 px-6">
                        <Link
                          to={`/soignant/${resolvedDocId}`}
                          className="group inline-flex items-center gap-1.5 font-bold text-[#00A896] hover:underline"
                        >
                          <span>🩺</span>
                          <span>{doctorName}</span>
                        </Link>
                      </td>

                      {/* NOTE GLOBALE */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 text-sm">
                            {'★'.repeat(Math.min(5, Math.max(1, Math.round(ratingNum))))}
                          </span>
                          <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
                            {ratingNum.toFixed(1)} / 5
                          </span>
                        </div>
                      </td>

                      {/* COMMENTAIRE / RETOUR - CLIQUABLE POUR OUVRIR LE MODAL DÉTAILS */}
                      <td
                        onClick={() => setViewReviewDetails({ ...row, doctor: doctorName })}
                        className="py-4 px-6 max-w-sm cursor-pointer group"
                        title="Cliquer pour voir tous les détails de l'avis"
                      >
                        <div className="p-2.5 -m-2 rounded-2xl group-hover:bg-teal-50/70 dark:group-hover:bg-slate-800/60 transition-all border border-transparent group-hover:border-teal-200 dark:group-hover:border-teal-900/50">
                          <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic text-xs group-hover:text-[#00A896] dark:group-hover:text-teal-300 transition-colors break-words [overflow-wrap:anywhere] [word-break:break-word]">
                            "{row.comment || 'Aucun commentaire textuel déposé.'}"
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-1.5 flex-wrap">
                            {Array.isArray(row.tags) && row.tags.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {row.tags.slice(0, 3).map((tag, tIdx) => (
                                  <span key={tIdx} className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : <span />}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewReviewDetails({ ...row, doctor: doctorName });
                              }}
                              className="text-[10px] text-[#00A896] dark:text-teal-400 font-bold opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-auto hover:underline cursor-pointer"
                              title="Voir tous les détails de l'avis"
                            >
                              🔍 Voir détails
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* DATE & STATUT */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isModere
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isPublie
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}>
                            {isModere ? '🛑 MODÉRÉ / MASQUÉ' : isPublie ? '● PUBLIÉ' : '⏳ EN ATTENTE'}
                          </span>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {row.date || (row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-TN') : '21 oct. 2026')}
                          </p>
                        </div>
                      </td>

                      {/* ACTIONS: UNIQUEMENT DEUX BOUTONS (MODIFICATION ET SUPPRESSION) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditRow({ ...row, doctor: doctorName })}
                            className="w-8 h-8 rounded-full border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Modifier l'avis"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmRow({ ...row, doctor: doctorName })}
                            className="w-8 h-8 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Supprimer l'avis"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : isUsersTable ? (

                /* ════════ RENDER USERS TABLE ════════ */
                paginatedRows.map((row, idx) => {
                  return (
                    <tr key={row.id || row.uuid || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* UTILISATEUR */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-sm font-bold shrink-0">
                            {(row.name && row.name.trim() ? row.name.trim()[0].toUpperCase() : '👤')}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white block">
                              {row.name || 'Utilisateur Maw2idi'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {row.uuid || row.id || `usr-${idx}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                        {row.email || '—'}
                      </td>

                      {/* TÉLÉPHONE */}
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">
                        <bdi dir="ltr">{row.phone || '+216 -- --- ---'}</bdi>
                      </td>

                      {/* RÔLE BADGE */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                          👤 Patient
                        </span>
                      </td>

                      {/* DATE D'INSCRIPTION */}
                      <td className="py-4 px-6 text-slate-500 text-xs font-mono">
                        {row.createdAt || row.created_at
                          ? new Date(row.createdAt || row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '12 oct. 2026'}
                      </td>

                      {/* ACTIONS: UNIQUEMENT MODIFIER ET SUPPRIMER (AUCUN BOUTON DÉTAILS) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditRow({ ...row })}
                            className="w-8 h-8 rounded-full border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmRow(row)}
                            className="w-8 h-8 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* ════════ RENDER DOCTORS TABLE ════════ */
                paginatedRows.map((row, idx) => {
                  const resolvedDocId = row.doctorId ||
                    (row.id && String(row.id).startsWith('doc-') ? row.id : null) ||
                    (row.uuid && String(row.uuid).startsWith('doc-') ? row.uuid : null) ||
                    (row.id ? row.id : row.uuid) ||
                    'doc-1';

                  return (
                    <tr key={row.id || row.uuid || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* PRATICIEN */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 flex items-center justify-center text-lg shrink-0">
                            👨‍⚕️
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white block">
                              {resolveDoctorName(row, lang)}
                            </span>
                            <span className="inline-block mt-0.5 text-[10px] font-black text-[#00A896] bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 px-2 py-0.2 rounded-full">
                              {row.cnam !== false ? t('admin_cnam_covered', 'Conventionné CNAM') : t('admin_cnam_free', 'Secteur Libre')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL / CONTACT */}
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                        {row.email || 'contact@sahatn.tn'}
                      </td>

                      {/* SPÉCIALITÉ */}
                      <td className="py-4 px-6 text-[#00A896] font-bold">
                        {resolveDoctorSpecialty(row, lang)}
                      </td>

                      {/* GOUVERNORAT / VILLE */}
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">
                        {resolveDoctorCity(row.city || row.delegation, lang)}
                      </td>

                      {/* HONORAIRES */}
                      <td className="py-4 px-6 font-bold text-[#D97706]" dir="ltr">
                        {row.fee ? (String(row.fee).includes('TND') ? (isAr ? String(row.fee).replace('TND', 'د.ت') : row.fee) : `${row.fee} ${isAr ? 'د.ت' : 'TND'}`) : (isAr ? '70 د.ت' : '70 TND')}
                      </td>

                      {/* FORMULE & ABONNEMENT */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {(() => {
                            const pKey = row.offer || row.subscriptionPlan || 'pro';
                            const pInfo = plansMap[pKey] || plansMap.pro || plansMap.essentiel;
                            const isAnn = (row.billingCycle || row.subscriptionCycle || 'annual') === 'annual';
                            const pName = pInfo ? (isAr && pInfo.nameAr ? pInfo.nameAr : pInfo.name) : pKey;
                            const pPriceStr = pInfo 
                              ? (isAnn 
                                  ? (isAr ? `${pInfo.annualMonthlyRate} د.ت/ش (${pInfo.annualTotal} د.ت/سنة)` : `${pInfo.annualMonthlyRate} DT/m (${pInfo.annualTotal} DT/an)`)
                                  : (isAr ? `${pInfo.monthlyPrice} د.ت/شهر` : `${pInfo.monthlyPrice} DT/m`))
                              : (isAnn ? (isAr ? '84.15 د.ت/ش (1 009.8 د.ت/سنة)' : '84.15 DT/m (1 009.8 DT/an)') : (isAr ? '99 د.ت/شهر' : '99 DT/m'));
                            const pDiscount = pInfo ? pInfo.discountPercentage : 15;

                            return (
                              <>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md text-white shadow-xs ${
                                    pKey === 'clinique'
                                      ? 'bg-purple-600'
                                      : pKey === 'essentiel'
                                      ? 'bg-sky-600'
                                      : 'bg-[#00A896]'
                                  }`}>
                                    {pInfo?.isRecommended ? `⭐ ${pName}` : pName}
                                  </span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                    isAnn
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {isAnn ? (isAr ? `-${pDiscount}% سنوي` : `-${pDiscount}% Annuel`) : (isAr ? 'شهري' : 'Mensuel')}
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                  {pPriceStr}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/soignant/${resolvedDocId}`}
                            state={{ doctor: row }}
                            className="w-8 h-8 rounded-full border border-teal-200 bg-teal-50/90 hover:bg-teal-100 text-[#00A896] hover:text-[#008F80] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 relative group"
                            title="Voir profil praticien"
                          >
                            <User className="w-4 h-4" />
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#0086cd] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                              !
                            </span>
                          </Link>

                          <button
                            onClick={() => setDeleteConfirmRow(row)}
                            className="w-8 h-8 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

        {/* ════════ PAGINATION BAR ════════ */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">

          <div>
            {isAr ? (
              <>
                عرض من <span className="text-slate-900 dark:text-white">{totalRows > 0 ? (safePage - 1) * pageSize + 1 : 0}</span> إلى <span className="text-slate-900 dark:text-white">{Math.min(safePage * pageSize, totalRows)}</span> من أصل <span className="text-slate-900 dark:text-white">{totalRows}</span> سجلات
              </>
            ) : (
              <>
                Affichage de <span className="text-slate-900 dark:text-white">{totalRows > 0 ? (safePage - 1) * pageSize + 1 : 0}</span> à <span className="text-slate-900 dark:text-white">{Math.min(safePage * pageSize, totalRows)}</span> sur <span className="text-slate-900 dark:text-white">{totalRows}</span> lignes
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>{isAr ? 'سجلات/صفحة :' : 'Lignes/page :'}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {isAr ? 'السابق →' : '← Précédent'}
              </button>

              <span className="w-8 h-8 rounded-lg bg-[#00A896] text-white flex items-center justify-center font-black">
                {safePage}
              </span>

              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {isAr ? '← التالي' : 'Suivant →'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: CRÉER UN NOUVEL ENREGISTREMENT (Users or Doctors)
          ═══════════════════════════════════════════════════════════════ */}
      {createModalOpen && (
        <div
          onClick={() => setCreateModalOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4"
          >

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {isReviewsTable ? (
                  <>
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span>Ajouter un Nouvel Avis Patient (REVIEWS)</span>
                  </>
                ) : isUsersTable ? (
                  <>
                    <UserPlus className="w-5 h-5 text-[#00A896]" />
                    <span>Ajouter un Nouvel Utilisateur (USERS)</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-[#00A896]" />
                    <span>Ajouter un Praticien (DOCTORS)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isReviewsTable ? (
              /* Review Form */
              <form onSubmit={handleSaveCreate} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom du Patient *
                  </label>
                  <input
                    type="text"
                    required
                    value={createReviewFormData.patientName}
                    onChange={(e) => setCreateReviewFormData({ ...createReviewFormData, patientName: e.target.value })}
                    placeholder="ex: Yassine Mansour"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Praticien Concerné
                    </label>
                    <select
                      value={createReviewFormData.doctor}
                      onChange={(e) => {
                        const doc = e.target.value;
                        const docId = doc.includes('Selim') ? 'doc-1' : doc.includes('Sami') ? 'doc-1792141803746' : 'doc-1791842374064';
                        setCreateReviewFormData({ ...createReviewFormData, doctor: doc, doctorId: docId });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    >
                      <option value="Dr. Selim Ben Ali">Dr. Selim Ben Ali (Cardiologie)</option>
                      <option value="Dr. Sami Mansouri">Dr. Sami Mansouri (Cardiologie)</option>
                      <option value="Dr. Hichem Ayari">Dr. Hichem Ayari (Cardiologie)</option>
                      <option value="Dr. Walid Ben Salem">Dr. Walid Ben Salem (Cardiologie)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Note Globale (1 à 5 ⭐)
                    </label>
                    <select
                      value={createReviewFormData.rating}
                      onChange={(e) => setCreateReviewFormData({ ...createReviewFormData, rating: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ 5 / 5 (Excellent)</option>
                      <option value={4}>⭐⭐⭐⭐ 4 / 5 (Très bon)</option>
                      <option value={3}>⭐⭐⭐ 3 / 5 (Moyen)</option>
                      <option value={2}>⭐⭐ 2 / 5 (Médiocre)</option>
                      <option value={1}>⭐ 1 / 5 (Insatisfaisant)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Commentaire du Patient
                  </label>
                  <textarea
                    rows={3}
                    value={createReviewFormData.comment}
                    onChange={(e) => setCreateReviewFormData({ ...createReviewFormData, comment: e.target.value })}
                    placeholder="Tapez le retour d'expérience du patient..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Statut de Publication
                  </label>
                  <select
                    value={createReviewFormData.status}
                    onChange={(e) => setCreateReviewFormData({ ...createReviewFormData, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  >
                    <option value="PUBLIÉ">✅ PUBLIÉ (En ligne sur le profil)</option>
                    <option value="MODÉRÉ">🛑 MASQUÉ</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                  >
                    Ajouter l'Avis
                  </button>
                </div>
              </form>
            ) : isUsersTable ? (
              <form onSubmit={handleSaveCreate} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom & Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={createUserFormData.name}
                    onChange={(e) => setCreateUserFormData({ ...createUserFormData, name: e.target.value })}
                    placeholder="ex: Ahmed Ben Salah"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createUserFormData.email}
                    onChange={(e) => setCreateUserFormData({ ...createUserFormData, email: e.target.value })}
                    placeholder="ex: ahmed.bensalah@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Téléphone
                    </label>
                    <TunisianPhoneInput
                      value={createUserFormData.phone}
                      onChange={(e) => setCreateUserFormData({ ...createUserFormData, phone: e.target.value })}
                      placeholder="ex: +216 98 123 456"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Rôle Système
                    </label>
                    <select
                      value={createUserFormData.role}
                      onChange={(e) => setCreateUserFormData({ ...createUserFormData, role: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    >
                      <option value="PATIENT">👤 Patient (Utilisateur Simple)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                  >
                    Créer l'Utilisateur
                  </button>
                </div>
              </form>
            ) : (
              /* Doctor Form */
              <form onSubmit={handleSaveCreate} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{isAr ? 'الاسم الكامل للطبيب *' : 'Nom Complet du Praticien *'}</span>
                   
                  </label>
                  <div className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden focus-within:border-[#00A896] ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className={`px-3 py-2 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-black text-xs select-none ${isAr ? 'border-l border-slate-200 dark:border-slate-800' : 'border-r border-slate-200 dark:border-slate-800'}`}>
                      {isAr ? 'د.' : 'Dr.'}
                    </span>
                    <input
                      type="text"
                      required
                      value={cleanDoctorName(createFormData.name)}
                      onChange={(e) => {
                        const clean = cleanDoctorName(e.target.value);
                        setCreateFormData({ ...createFormData, name: clean ? `Dr. ${clean}` : '' });
                      }}
                      placeholder={isAr ? 'فراس الطرابلسي' : 'Firas Trabelsi'}
                      className={`flex-1 bg-transparent px-3 py-2 text-xs font-semibold outline-none text-slate-900 dark:text-white ${isAr ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Professionnel
                  </label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="ex: firas.trabelsi@sahatn.tn"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Spécialité
                    </label>
                    <select
                      value={createFormData.specialty}
                      onChange={(e) => setCreateFormData({ ...createFormData, specialty: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    >
                      <option value="Cardiologie & Maladies Vasculaires">Cardiologie & Maladies Vasculaires</option>
                      <option value="Pédiatrie & Néonatologie">Pédiatrie & Néonatologie</option>
                      <option value="Dermatologie & Vénérologie">Dermatologie & Vénérologie</option>
                      <option value="Médecine Générale">Médecine Générale</option>
                      <option value="Ophtalmologie">Ophtalmologie</option>
                      <option value="Gynécologie Obstétrique">Gynécologie Obstétrique</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Gouvernorat / Ville
                    </label>
                    <input
                      type="text"
                      list="admin-tunisian-cities"
                      value={createFormData.city}
                      onChange={(e) => setCreateFormData({ ...createFormData, city: e.target.value })}
                      placeholder="ex: Tunis (Centre-Ville)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    />
                    <datalist id="admin-tunisian-cities">
                      {TUNISIAN_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Honoraires (TND / DT)</span>
                      <span className={`text-[10px] font-bold ${
                        createFormData.fee && (Number(String(createFormData.fee).replace(/\D/g, '')) < 20 || Number(String(createFormData.fee).replace(/\D/g, '')) > 200)
                          ? 'text-rose-500'
                          : 'text-teal-600'
                      }`}>
                        Entre 20 et 200 DT
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(createFormData.fee || '').replace(/\D/g, '')}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCreateFormData({ ...createFormData, fee: digits ? `${digits} TND` : '' });
                      }}
                      placeholder="70"
                      className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-all ${
                        createFormData.fee && (Number(String(createFormData.fee).replace(/\D/g, '')) < 20 || Number(String(createFormData.fee).replace(/\D/g, '')) > 200)
                          ? 'border-rose-400 bg-rose-50/20 text-rose-700 focus:border-rose-500'
                          : 'border-slate-200 dark:border-slate-800 focus:border-[#00A896]'
                      }`}
                    />
                    {createFormData.fee && Number(String(createFormData.fee).replace(/\D/g, '')) < 20 && (
                      <span className="text-[11px] text-rose-500 font-bold block pt-1">
                        ⚠️ Le montant minimum autorisé est de 20 DT
                      </span>
                    )}
                    {createFormData.fee && Number(String(createFormData.fee).replace(/\D/g, '')) > 200 && (
                      <span className="text-[11px] text-rose-500 font-bold block pt-1">
                        ⚠️ Le montant maximum autorisé est de 200 DT
                      </span>
                    )}
                  </div>

                  <div className="pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={createFormData.cnam}
                        onChange={(e) => setCreateFormData({ ...createFormData, cnam: e.target.checked })}
                        className="w-4 h-4 rounded text-[#00A896] focus:ring-[#00A896]"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Conventionné CNAM</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                  >
                    Enregistrer le Praticien
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: MODIFIER L'ENREGISTREMENT (Edit Modal)
          ═══════════════════════════════════════════════════════════════ */}
      {editRow && (
        <div
          onClick={() => setEditRow(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4"
          >

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                <span>{isReviewsTable ? "Modifier l'Avis Patient" : (isUsersTable ? "Modifier les Données de l'Utilisateur" : "Modifier les Données du Praticien")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {isReviewsTable ? (
                /* ════════ EDIT REVIEW FORM ════════ */
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nom du Patient *
                      </label>
                      <input
                        type="text"
                        required
                        value={editRow.patientName || editRow.patient || ''}
                        onChange={(e) => setEditRow({ ...editRow, patientName: e.target.value, patient: e.target.value })}
                        placeholder="ex: Fatma Benali"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Praticien Concerné *
                      </label>
                      <input
                        type="text"
                        required
                        value={editRow.doctor || ''}
                        onChange={(e) => setEditRow({ ...editRow, doctor: e.target.value })}
                        placeholder="ex: Dr. Selim Ben Ali"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Note Globale (⭐)
                      </label>
                      <select
                        value={Number(editRow.rating || 5)}
                        onChange={(e) => setEditRow({ ...editRow, rating: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 / 5 (Excellent)</option>
                        <option value={4}>⭐⭐⭐⭐ 4 / 5 (Très bon)</option>
                        <option value={3}>⭐⭐⭐ 3 / 5 (Moyen)</option>
                        <option value={2}>⭐⭐ 2 / 5 (Médiocre)</option>
                        <option value={1}>⭐ 1 / 5 (Insatisfaisant)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Statut de Publication
                      </label>
                      <select
                        value={(editRow.status || 'PUBLIÉ').toUpperCase()}
                        onChange={(e) => setEditRow({ ...editRow, status: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      >
                        <option value="PUBLIÉ">✅ PUBLIÉ (En ligne sur le profil)</option>
                        <option value="MODÉRÉ">🛑 MODÉRÉ / MASQUÉ</option>
                      </select>
                      {((editRow.status || '').toUpperCase() === 'MODÉRÉ' || (editRow.status || '').toUpperCase() === 'MASQUÉ') && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                          <span>🛑</span>
                          <span>Cet avis sera immédiatement masqué et retiré du profil public du médecin.</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Commentaire du Patient
                    </label>
                    <textarea
                      rows={4}
                      value={editRow.comment || ''}
                      onChange={(e) => setEditRow({ ...editRow, comment: e.target.value })}
                      placeholder="Commentaire ou retour d'expérience du patient..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editRow.verified !== false}
                        onChange={(e) => setEditRow({ ...editRow, verified: e.target.checked })}
                        className="w-4 h-4 rounded text-[#00A896] focus:ring-[#00A896]"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Avis Certifié / Patient Vérifié</span>
                    </label>
                  </div>
                </div>
              ) : isUsersTable ? (
                /* ════════ EDIT USER FORM ════════ */
                <div className="space-y-3.5">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nom Complet
                    </label>
                    <input
                      type="text"
                      required
                      value={editRow.name || ''}
                      onChange={(e) => setEditRow({ ...editRow, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editRow.email || ''}
                      onChange={(e) => setEditRow({ ...editRow, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Téléphone
                      </label>
                      <TunisianPhoneInput
                        value={editRow.phone || ''}
                        onChange={(e) => setEditRow({ ...editRow, phone: e.target.value })}
                        placeholder="ex: +216 98 123 456"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Rôle Système
                      </label>
                      <select
                        value={(editRow.role || 'PATIENT').toUpperCase()}
                        onChange={(e) => setEditRow({ ...editRow, role: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      >
                        <option value="PATIENT">👤 Patient</option>
                        <option value="DOCTOR">🩺 Médecin</option>
                        <option value="SECRETAIRE">💼 Secrétaire</option>
                        <option value="ADMIN">🛡️ Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* ════════ EDIT DOCTOR FORM ════════ */
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>{isAr ? 'اسم الطبيب' : 'Nom Praticien'}</span>
                        
                      </label>
                      <div className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden focus-within:border-[#00A896] ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className={`px-3 py-2 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-black text-xs select-none ${isAr ? 'border-l border-slate-200 dark:border-slate-800' : 'border-r border-slate-200 dark:border-slate-800'}`}>
                          {isAr ? 'د.' : 'Dr.'}
                        </span>
                        <input
                          type="text"
                          required
                          value={cleanDoctorName(editRow.name || '')}
                          onChange={(e) => {
                            const clean = cleanDoctorName(e.target.value);
                            setEditRow({ ...editRow, name: clean ? `Dr. ${clean}` : '' });
                          }}
                          placeholder={isAr ? 'سليم بن علي' : 'Selim Ben Ali'}
                          className={`flex-1 bg-transparent px-3 py-2 text-xs font-semibold outline-none text-slate-900 dark:text-white ${isAr ? 'text-right' : 'text-left'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email Contact
                      </label>
                      <input
                        type="email"
                        value={editRow.email || ''}
                        onChange={(e) => setEditRow({ ...editRow, email: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Spécialité
                      </label>
                      <input
                        type="text"
                        value={editRow.specialty || editRow.specialtyFr || ''}
                        onChange={(e) => setEditRow({ ...editRow, specialty: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Gouvernorat / Ville
                      </label>
                      <input
                        type="text"
                        list="admin-tunisian-cities"
                        value={editRow.city || editRow.delegation || ''}
                        onChange={(e) => setEditRow({ ...editRow, city: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Honoraires (TND / DT)</span>
                        <span className="text-[10px] text-teal-600 font-bold">Max 200 DT</span>
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="200"
                        value={String(editRow.fee || '').replace(/\D/g, '')}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                          let num = digits ? parseInt(digits, 10) : '';
                          if (typeof num === 'number' && num > 200) num = 200;
                          setEditRow({ ...editRow, fee: num ? `${num} TND` : '' });
                        }}
                        placeholder="70"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      />
                    </div>

                    <div className="pt-5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editRow.cnam !== false}
                          onChange={(e) => setEditRow({ ...editRow, cnam: e.target.checked })}
                          className="w-4 h-4 rounded text-[#00A896] focus:ring-[#00A896]"
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Conventionné CNAM</span>
                      </label>
                    </div>
                  </div>

                  {/* FORMULE ET CYCLE D'ABONNEMENT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Formule d'Abonnement Maw2idi
                      </label>
                      <select
                        value={editRow.offer || editRow.subscriptionPlan || 'pro'}
                        onChange={(e) => setEditRow({ ...editRow, offer: e.target.value, subscriptionPlan: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      >
                        {dynamicPlansList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.monthlyPrice} DT/m{p.isRecommended ? ' - Recommandé' : ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Cycle de Facturation
                      </label>
                      <select
                        value={editRow.billingCycle || editRow.subscriptionCycle || 'annual'}
                        onChange={(e) => setEditRow({ ...editRow, billingCycle: e.target.value, subscriptionCycle: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#00A896]"
                      >
                        <option value="annual">Annuel (-15% de réduction)</option>
                        <option value="monthly">Mensuel (sans engagement)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditRow(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Sauvegarder les Modifications
                </button>
              </div>
            </form>

          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: CONFIRMATION DE SUPPRESSION (Delete Modal)
          ═══════════════════════════════════════════════════════════════ */}
      {deleteConfirmRow && (
        <div
          onClick={() => setDeleteConfirmRow(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4"
          >

            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Supprimer l'enregistrement ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action est irréversible dans la base de données.
                </p>
              </div>
            </div>

            {isReviewsTable ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
                <p><strong>Patient :</strong> {deleteConfirmRow.patientName || deleteConfirmRow.patient}</p>
                <p><strong>Praticien :</strong> {deleteConfirmRow.doctor || 'Dr. Selim Ben Ali'}</p>
                <p><strong>Note :</strong> {deleteConfirmRow.rating || 5} ⭐</p>
                <p className="break-words [overflow-wrap:anywhere]"><strong>Commentaire :</strong> {deleteConfirmRow.comment || ''}</p>
              </div>
            ) : isUsersTable ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
                <p><strong>Nom :</strong> {deleteConfirmRow.name}</p>
                <p><strong>Email :</strong> {deleteConfirmRow.email}</p>
                <p><strong>Rôle :</strong> {deleteConfirmRow.role || 'PATIENT'}</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
                <p><strong>Nom :</strong> {deleteConfirmRow.name}</p>
                <p><strong>Email :</strong> {deleteConfirmRow.email}</p>
                <p><strong>Spécialité :</strong> {deleteConfirmRow.specialty || deleteConfirmRow.specialtyFr}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Suppression</span>
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════
          MODAL: DÉTAILS COMPLETS DE L'AVIS PATIENT (View Details Modal)
          ═══════════════════════════════════════════════════════════════ */}
      {viewReviewDetails && (
        <div
          onClick={() => setViewReviewDetails(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
          >

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 sm:px-7 py-4.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#00A896] flex items-center justify-center text-xl font-black shrink-0">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Détails du Commentaire & Avis
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID : {viewReviewDetails.id || viewReviewDetails.uuid}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewReviewDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-300 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Content Details (Scrollable Body) */}
            <div className="px-6 sm:px-7 py-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">

              {/* Patient & Doctor Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Patient */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    👤 Nom du Patient
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {viewReviewDetails.patientName || viewReviewDetails.patient || 'Patient Maw2idi'}
                    </span>
                    {viewReviewDetails.verified !== false && (
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        ✓ Vérifié
                      </span>
                    )}
                  </div>
                </div>

                {/* Doctor */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    🩺 Praticien Concerné
                  </span>
                  <span className="font-extrabold text-[#00A896] text-sm block">
                    {viewReviewDetails.doctor || 'Dr. Selim Ben Ali'}
                  </span>
                </div>
              </div>

              {/* Note Globale & Statut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    ⭐ Évaluation & Note
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">
                      {'★'.repeat(Math.min(5, Math.max(1, Math.round(Number(viewReviewDetails.rating || 5)))))}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white text-xs">
                      {Number(viewReviewDetails.rating || 5).toFixed(1)} / 5
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    📅 Date & Statut
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {viewReviewDetails.date || (viewReviewDetails.createdAt ? new Date(viewReviewDetails.createdAt).toLocaleDateString('fr-TN') : '21 oct. 2026')}
                    </span>
                    {(() => {
                      const st = (viewReviewDetails.status || 'PUBLIÉ').toUpperCase();
                      const isMod = st === 'MODÉRÉ' || st === 'MASQUÉ';
                      const isPub = st === 'PUBLIÉ';
                      return (
                        <span className={'text-[10px] font-black px-2.5 py-0.5 rounded-full border ' + (
                          isMod
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : isPub
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        )}>
                          {isMod ? '🛑 MODÉRÉ / MASQUÉ' : isPub ? '● PUBLIÉ' : '⏳ EN ATTENTE'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Comment Box */}
              <div className="p-4 bg-teal-50/40 dark:bg-slate-900/90 rounded-2xl border border-teal-100 dark:border-teal-900/40 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Commentaire / Retour du Patient
                </span>
                <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed italic whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] bg-white dark:bg-[#0c162d] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                  "{viewReviewDetails.comment || 'Aucun commentaire rédigé pour cet avis.'}"
                </p>
                {Array.isArray(viewReviewDetails.tags) && viewReviewDetails.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {viewReviewDetails.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[10px] font-semibold bg-white dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Doctor Reply if exists */}
              {viewReviewDetails.reply && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    👨‍⚕️ Réponse du praticien ({viewReviewDetails.reply.doctorName || 'Médecin'})
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 text-xs italic break-words [overflow-wrap:anywhere]">
                    "{viewReviewDetails.reply.text}"
                  </p>
                </div>
              )}

            </div>

            {/* Footer with the TWO action buttons: Modification & Suppression */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-6 sm:px-7 py-4 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setViewReviewDetails(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = { ...viewReviewDetails };
                  setViewReviewDetails(null);
                  setEditRow(target);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 transition-all"
                title="Modifier cet avis"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = { ...viewReviewDetails };
                  setViewReviewDetails(null);
                  setDeleteConfirmRow(target);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 transition-all"
                title="Supprimer cet avis"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
