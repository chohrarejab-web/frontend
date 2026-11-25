import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  getSubscriptionPlans, 
  saveSubscriptionPlans, 
  resetSubscriptionPlans, 
  calculatePlanPricing 
} from '../../data/subscriptionsData';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  Save, 
  RotateCcw, 
  Sparkles, 
  CreditCard, 
  Percent, 
  Award, 
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

export default function AdminSubscriptionsTab() {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const [plans, setPlans] = useState(() => getSubscriptionPlans());
  const [activePlanId, setActivePlanId] = useState('pro');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [newFeatureTextAr, setNewFeatureTextAr] = useState('');
  const [newFeatureBold, setNewFeatureBold] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [previewCycle, setPreviewCycle] = useState('monthly'); // 'monthly' | 'annual'

  // New plan form state
  const [newPlanForm, setNewPlanForm] = useState({
    id: '',
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    badgeFr: '',
    badgeAr: '',
    monthlyPrice: 79,
    discountPercentage: 15,
    isRecommended: false
  });

  // Re-sync on storage event
  useEffect(() => {
    const handleSync = () => {
      setPlans(getSubscriptionPlans());
    };
    window.addEventListener('sahatn:subscriptions_updated', handleSync);
    return () => window.removeEventListener('sahatn:subscriptions_updated', handleSync);
  }, []);

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0] || null;

  // Handle direct field change on a plan
  const handleUpdatePlanField = (planId, field, value) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const updated = { ...p, [field]: value };
      return calculatePlanPricing(updated);
    }));
  };

  // Toggle Plan Visibility (Show / Hide)
  const handleTogglePlanVisibility = (planId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, active: !p.active };
    }));
  };

  // Set Recommended Plan Ribbon
  const handleSetRecommended = (planId) => {
    setPlans(prev => prev.map(p => ({
      ...p,
      isRecommended: p.id === planId,
      ribbonFr: p.id === planId ? '⭐ Recommandé / Cabinet' : '',
      ribbonAr: p.id === planId ? '⭐ الأكثر طلباً / للعيادات' : ''
    })));
  };

  // Add Feature to Active Plan
  const handleAddFeature = (e) => {
    if (e) e.preventDefault();
    if (!newFeatureText.trim() || !activePlan) return;

    const newFeature = {
      id: `feat-${Date.now()}`,
      textFr: newFeatureText.trim(),
      textAr: newFeatureTextAr.trim() || newFeatureText.trim(),
      isBold: newFeatureBold
    };

    setPlans(prev => prev.map(p => {
      if (p.id !== activePlan.id) return p;
      return {
        ...p,
        features: [...(p.features || []), newFeature]
      };
    }));

    setNewFeatureText('');
    setNewFeatureTextAr('');
    setNewFeatureBold(false);
  };

  // Remove Feature from Active Plan
  const handleRemoveFeature = (planId, featureId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        features: (p.features || []).filter(f => f.id !== featureId)
      };
    }));
  };

  // Save all changes
  const handleSaveAll = () => {
    saveSubscriptionPlans(plans);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Reset to original defaults
  const handleResetDefaults = () => {
    if (window.confirm(isAr 
      ? 'هل أنت متأكد من استعادة باقات الاشتراك الأصلية والأسعار الافتراضية؟' 
      : 'Êtes-vous sûr de vouloir réinitialiser toutes les formules et tarifs aux valeurs par défaut ?'
    )) {
      const reset = resetSubscriptionPlans();
      setPlans(reset);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  // Create New Plan
  const handleCreatePlan = (e) => {
    if (e) e.preventDefault();
    if (!newPlanForm.name.trim()) return;

    const newId = newPlanForm.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') || `plan-${Date.now()}`;
    const createdPlan = calculatePlanPricing({
      id: newId,
      name: newPlanForm.name.trim(),
      nameAr: newPlanForm.nameAr.trim() || newPlanForm.name.trim(),
      description: newPlanForm.description.trim(),
      descriptionAr: newPlanForm.descriptionAr.trim() || newPlanForm.description.trim(),
      badgeFr: newPlanForm.badgeFr.trim() || 'Formule Spéciale',
      badgeAr: newPlanForm.badgeAr.trim() || 'عرض خاص',
      ribbonFr: newPlanForm.isRecommended ? '⭐ Recommandé' : '',
      ribbonAr: newPlanForm.isRecommended ? '⭐ مميز' : '',
      monthlyPrice: Number(newPlanForm.monthlyPrice) || 50,
      discountPercentage: Number(newPlanForm.discountPercentage) || 15,
      isRecommended: Boolean(newPlanForm.isRecommended),
      active: true,
      order: plans.length + 1,
      features: [
        { id: `feat-1-${Date.now()}`, textFr: 'Prise de RDV en ligne', textAr: 'حجز المواعيد أونلاين' },
        { id: `feat-2-${Date.now()}`, textFr: 'Assistance dédiée SahaTN', textAr: 'دعم مخصص' }
      ]
    });

    setPlans(prev => [...prev, createdPlan]);
    setActivePlanId(createdPlan.id);
    setShowAddPlanModal(false);
    setNewPlanForm({
      id: '',
      name: '',
      nameAr: '',
      description: '',
      descriptionAr: '',
      badgeFr: '',
      badgeAr: '',
      monthlyPrice: 79,
      discountPercentage: 15,
      isRecommended: false
    });
  };

  return (
    <div className="space-y-6">

      {/* ════════ HEADER BAR & GLOBAL ACTIONS ════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl shrink-0 border border-teal-100 dark:border-teal-900 shadow-xs">
              <CreditCard className="w-5 h-5 text-[#00A896]" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'إدارة باقات الاشتراك والتعريفات' : 'Gestion des Abonnements & Tarification'}</span>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-extrabold px-2.5 py-0.5 rounded-full">
                  {plans.filter(p => p.active !== false).length} {isAr ? 'نشطة' : 'Actives'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'تعديل الأسعار، نسب التخفيض، مميزات كل باقة وإخفاء أو إظهار العروض للأطباء في خطوة التسجيل.'
                  : 'Modifiez les prix, les pourcentages de remise annuelle, les fonctionnalités et masquez/affichez chaque formule en direct.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title={isAr ? 'استعادة الإعدادات الأصلية' : 'Réinitialiser aux valeurs d\'origine'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'استعادة الافتراضي' : 'Réinitialiser'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddPlanModal(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? '+ إضافة باقة جديدة' : '+ Nouvelle Formule'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-[#00A896] hover:bg-[#008F80] transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-teal-500/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isAr ? 'حفظ التعديلات' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {savedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 p-4 rounded-2xl text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">✓</span>
            <span>
              {isAr 
                ? 'تم حفظ جميع تعديلات الباقات والأسعار بنجاح! تم تحديث شاشة تسجيل الأطباء فورياً.' 
                : 'Toutes les modifications de tarifs et de formules ont été enregistrées avec succès ! L\'étape d\'inscription médecin est actualisée en direct.'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">Synchronisé</span>
        </div>
      )}

      {/* ════════ PLANS SELECTOR TABS & QUICK STATUS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map((p) => {
          const isSelected = p.id === activePlanId;
          const isHidden = p.active === false;

          return (
            <div
              key={p.id}
              onClick={() => setActivePlanId(p.id)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#00A896] bg-teal-50/50 dark:bg-teal-950/30 shadow-md ring-2 ring-teal-500/20' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0c162d] hover:border-slate-200'
              } ${isHidden ? 'opacity-60 bg-slate-50 dark:bg-slate-900/60' : ''}`}
            >
              {p.isRecommended && (
                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                  {isAr ? '⭐ موصى بها' : '⭐ Recommandé'}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400">
                    {isAr ? p.badgeAr : p.badgeFr}
                  </span>
                  
                  {/* Visibility Pill Badge */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    !isHidden 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {!isHidden ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? 'مرئية' : 'Visible'}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-rose-600" />
                        <span>{isAr ? 'مخفية' : 'Masquée'}</span>
                      </>
                    )}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {isAr ? p.nameAr : p.name}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {isAr ? p.descriptionAr : p.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-black text-[#00A896]">
                    {p.monthlyPrice} <span className="text-xs font-bold text-slate-500">DT/m</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                    -{p.discountPercentage || 0}% {isAr ? 'سنوي' : 'annuel'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ════════ ACTIVE PLAN EDITOR & LIVE PREVIEW ════════ */}
      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: EDITING FORM (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
              
              {/* Plan Title & Quick Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00A896]"></span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isAr ? `تعديل باقة: ${activePlan.nameAr}` : `Paramétrer la Formule : ${activePlan.name}`}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ID Système : <code className="font-mono text-[#00A896] bg-teal-50 dark:bg-teal-950 px-1 rounded">{activePlan.id}</code>
                  </p>
                </div>

                {/* VISIBILITY & RECOMMENDED SWITCHES */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlanVisibility(activePlan.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer flex items-center gap-1.5 transition-all ${
                      activePlan.active !== false 
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {activePlan.active !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAr ? 'معروضة (نشطة)' : 'Visible aux Médecins'}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{isAr ? 'مخفية (معطلة)' : 'Masquée du Site'}</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Recommended */}
                  <button
                    type="button"
                    onClick={() => handleSetRecommended(activePlan.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer flex items-center gap-1.5 transition-all ${
                      activePlan.isRecommended 
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-black' 
                        : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>{activePlan.isRecommended ? (isAr ? '⭐ باقة موصى بها' : '⭐ Recommandé') : (isAr ? 'تعيين كموصى به' : 'Définir Recommandé')}</span>
                  </button>
                </div>
              </div>

              {/* SECTION: PRIX & POURCENTAGE DE REMISE */}
              <div className="bg-slate-50/70 dark:bg-[#071322] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
                  <CreditCard className="w-4 h-4 text-[#00A896]" />
                  <span>{isAr ? 'التعريفة ونسبة التخفيض المطبقة' : 'Tarification & Pourcentage de Remise Annuelle'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Monthly Price Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'السعر الشهري (د.ت / شهر)' : 'Prix Mensuel HT (DT/mois)'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={activePlan.monthlyPrice}
                        onChange={(e) => handleUpdatePlanField(activePlan.id, 'monthlyPrice', e.target.value)}
                        className="w-full pl-4 pr-16 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        DT / m
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {isAr ? 'السعر العادي بدون التزام' : 'Tarif standard sans engagement'}
                    </span>
                  </div>

                  {/* Discount Percentage Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'نسبة التخفيض السنوي (%)' : 'Remise Engagement Annuel (%)'} <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="1"
                        value={activePlan.discountPercentage}
                        onChange={(e) => handleUpdatePlanField(activePlan.id, 'discountPercentage', e.target.value)}
                        className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {isAr ? 'تطبق تلقائياً على خيار الدفع السنوي' : 'Appliqué automatiquement au choix Annuel'}
                    </span>
                  </div>
                </div>

                {/* Live Auto-Calculated Summary Box */}
                <div className="bg-white dark:bg-[#0c162d] p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isAr ? 'المجموع السنوي مع التخفيض :' : 'Total Annuel Facturé :'}</span>
                    <strong className="text-sm font-black text-[#00A896]">{activePlan.annualTotal} DT/an</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isAr ? 'المعادل الشهري المخفض :' : 'Équivalent mensuel remisé :'}</span>
                    <strong className="font-bold text-teal-700 dark:text-teal-300">{activePlan.annualMonthlyRate} DT/mois</strong>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-1">
                    <span>{isAr ? 'مبلغ التوفير للطبيب سنوياً :' : 'Économie annuelle pour le médecin :'}</span>
                    <span className="font-black">+{activePlan.annualSavings} DT</span>
                  </div>
                </div>
              </div>

              {/* SECTION: NOMS, BADGES & DESCRIPTIONS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nom de la Formule (FR)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={activePlan.name}
                      onChange={(e) => handleUpdatePlanField(activePlan.id, 'name', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      اسم الباقة (عربي)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={activePlan.nameAr}
                      onChange={(e) => handleUpdatePlanField(activePlan.id, 'nameAr', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Badge En-tête (FR - ex: Cabinet Moderne)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={activePlan.badgeFr}
                      onChange={(e) => handleUpdatePlanField(activePlan.id, 'badgeFr', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      شعار الفئة (عربي)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={activePlan.badgeAr}
                      onChange={(e) => handleUpdatePlanField(activePlan.id, 'badgeAr', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Description de la formule (FR)
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={activePlan.description}
                    onChange={(e) => handleUpdatePlanField(activePlan.id, 'description', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* SECTION: OFFRES & FONCTIONNALITÉS INCLUSES */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {isAr ? 'الميزات والخدمات المشمولة في الباقة' : 'Offres & Fonctionnalités Incluses (Points Clés)'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'تظهر هذه القائمة في البطاقة مع علامة الصح ✓' : 'Ces points s\'affichent sous forme de liste avec coches ✓'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#00A896] bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md">
                    {(activePlan.features || []).length} {isAr ? 'ميزات' : 'options'}
                  </span>
                </div>

                {/* Current Features List */}
                <div className="space-y-2">
                  {(activePlan.features || []).map((feat, idx) => (
                    <div
                      key={feat.id || idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className={`${feat.isBold ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'} truncate`}>
                          {isAr && feat.textAr ? feat.textAr : feat.textFr}
                        </span>
                        {feat.isBold && (
                          <span className="text-[9px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-extrabold px-1.5 py-0.2 rounded shrink-0">
                            Gras
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(activePlan.id, feat.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                        title={isAr ? 'حذف هذه الميزة' : 'Supprimer cette option'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Feature Form */}
                <form onSubmit={handleAddFeature} className="pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      placeholder={isAr ? 'إضافة ميزة جديدة (بالفرنسية)...' : 'Ajouter une option (ex: Télétransmission CNAM)...'}
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-left"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      placeholder={isAr ? 'نص الميزة بالعربية...' : 'Texte en Arabe (optionnel)...'}
                      value={newFeatureTextAr}
                      onChange={(e) => setNewFeatureTextAr(e.target.value)}
                      className="sm:w-48 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    />
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newFeatureBold}
                        onChange={(e) => setNewFeatureBold(e.target.checked)}
                        className="accent-[#00A896] rounded"
                      />
                      <span>{isAr ? 'بارزة' : 'Gras'}</span>
                    </label>
                    <button
                      type="submit"
                      disabled={!newFeatureText.trim()}
                      className="bg-[#00A896] hover:bg-[#008F80] disabled:opacity-40 text-white font-bold px-4 py-2 text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      {isAr ? '+ إضافة' : '+ Ajouter'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>

          {/* RIGHT: LIVE CARD PREVIEW (5 COLS - Matches Doctor Registration View) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'معاينة حية كما يراها الطبيب' : 'Aperçu Direct Fiche Praticien'}</span>
              </span>

              {/* Billing Cycle Switch for Preview */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setPreviewCycle('monthly')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    previewCycle === 'monthly' ? 'bg-white dark:bg-slate-900 shadow-xs text-teal-700 dark:text-teal-300' : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'شهري' : 'Mensuel'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCycle('annual')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    previewCycle === 'annual' ? 'bg-white dark:bg-slate-900 shadow-xs text-teal-700 dark:text-teal-300' : 'text-slate-500'
                  }`}
                >
                  {isAr ? `سنوي (-${activePlan.discountPercentage}%)` : `Annuel (-${activePlan.discountPercentage}%)`}
                </button>
              </div>
            </div>

            {/* Simulated Doctor Pricing Card */}
            <div className={`p-6 rounded-3xl border-2 transition-all relative flex flex-col justify-between ${
              activePlan.isRecommended 
                ? 'bg-gradient-to-b from-teal-50/90 to-cyan-50/70 dark:from-teal-950/50 dark:to-cyan-950/30 border-[#00A896] shadow-xl ring-2 ring-teal-500/30' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
            } ${activePlan.active === false ? 'opacity-50' : ''}`}>
              
              {activePlan.active === false && (
                <div className="absolute top-3 right-3 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full z-10 shadow-xs">
                  {isAr ? 'مخفية في الموقع' : 'Masquée'}
                </div>
              )}

              {activePlan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
                  {isAr ? activePlan.ribbonAr || '⭐ الأكثر طلباً / للعيادات' : activePlan.ribbonFr || '⭐ Recommandé / Cabinet'}
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black uppercase text-teal-700 dark:text-teal-400 tracking-wider">
                    {isAr ? activePlan.badgeAr : activePlan.badgeFr}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-[#00A896] text-white flex items-center justify-center text-[10px] font-black">
                    ✓
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {isAr ? activePlan.nameAr : activePlan.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? activePlan.descriptionAr : activePlan.description}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="pt-2">
                  {previewCycle === 'annual' ? (
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-400 line-through">
                          {activePlan.normalAnnualTotal} DT
                        </span>
                        <span className="text-3xl font-black text-[#00A896]">
                          {activePlan.annualTotal}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{isAr ? 'د.ت / سنة' : 'DT/an'}</span>
                        <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                          -{activePlan.discountPercentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-700 dark:text-teal-300 font-bold mt-1">
                        {isAr 
                          ? `أي ${activePlan.annualMonthlyRate} د.ت / شهر (وفر ${activePlan.annualSavings} د.ت)`
                          : `Soit ${activePlan.annualMonthlyRate} DT / mois (Économisez ${activePlan.annualSavings} DT)`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-black text-[#00A896]">
                        {activePlan.monthlyPrice} <span className="text-xs font-bold text-slate-500">{isAr ? 'د.ت / شهر' : 'DT/mois'}</span>
                      </span>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        {isAr ? 'فاتورة شهرية · بدون التزام' : 'Facturé mensuellement · Sans engagement'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Features List Preview */}
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200 pt-3 border-t border-slate-100 dark:border-slate-800 font-medium">
                  {(activePlan.features || []).map((feat, idx) => (
                    <li key={feat.id || idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 font-black" />
                      <span className={feat.isBold ? 'font-bold' : ''}>
                        {isAr && feat.textAr ? feat.textAr : feat.textFr}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-center py-2 text-xs font-black rounded-xl bg-[#00A896] text-white shadow-xs">
                  {isAr ? '✓ الباقة المختارة' : '✓ Formule Sélectionnée'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <HelpCircle className="w-3.5 h-3.5 text-[#00A896]" />
                <span>{isAr ? 'تأثير مباشر على المنصة :' : 'Impact en direct sur la plateforme :'}</span>
              </div>
              <p className="leading-relaxed">
                {isAr
                  ? 'أي تعديل يتم إجراؤه هنا يتم حفظه وتطبيقه فوراً على أسعار الاشتراكات وحسابات الفوترة والخطوة 3 من استمارة تسجيل الأطباء في الوقت الفعلي.'
                  : 'Toute modification appliquée ici est persistée et modifie en temps réel les tarifs de souscription, les calculs de facturation et l\'étape 3 du formulaire d\'inscription médecin.'}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ════════ MODAL: AJOUTER UNE NOUVELLE FORMULE ════════ */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00A896]" />
                <span>{isAr ? 'إضافة صيغة اشتراك جديدة' : 'Créer une Nouvelle Formule'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nom de la formule (ex: VIP)
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlanForm.name}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ID Technique (ex: vip)
                  </label>
                  <input
                    type="text"
                    placeholder="auto-généré"
                    value={newPlanForm.id}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Prix Mensuel (DT/mois)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPlanForm.monthlyPrice}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, monthlyPrice: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-[#00A896] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Remise Annuelle (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    required
                    value={newPlanForm.discountPercentage}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Badge Cible (ex: Centres Médicaux)
                </label>
                <input
                  type="text"
                  value={newPlanForm.badgeFr}
                  onChange={(e) => setNewPlanForm(prev => ({ ...prev, badgeFr: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Description courte
                </label>
                <textarea
                  rows={2}
                  value={newPlanForm.description}
                  onChange={(e) => setNewPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-[#00A896] hover:bg-[#008F80] rounded-xl shadow-md cursor-pointer"
                >
                  Créer la Formule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

