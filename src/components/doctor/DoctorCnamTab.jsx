import React, { useState } from 'react';
import { Send, FileText, CheckCircle, Download, ShieldCheck } from 'lucide-react';

export default function DoctorCnamTab({ doctorId = 'doc-1', doctorName = 'Dr. Selim Ben Ali', doctorProfile = null }) {
  const isSelim = Boolean(!doctorId || doctorId === 'doc-1' || doctorName?.toLowerCase().includes('selim'));
  const [patientCnam, setPatientCnam] = useState('');
  const [carnetNumber, setCarnetNumber] = useState('');
  const [filiere, setFiliere] = useState('Prive');
  const [transmitted, setTransmitted] = useState(false);

  const cnamCode = doctorProfile?.cnamCode || (isSelim ? 'CNAM-CD-40912' : 'En cours d\'attribution');
  const cnamTarif = `${(parseFloat(doctorProfile?.fee) || 70).toFixed(3)} TND (Plafond CNAM)`;

  const handleTransmit = () => {
    if (!patientCnam.trim() || !carnetNumber.trim()) return;
    setTransmitted(true);
    setTimeout(() => setTransmitted(false), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c162d] p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Bulletin de Soins CNAM C1 — Caisse Nationale d'Assurance Maladie
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Formulaire officiel de télétransmission électronique des feuilles de soins pour le remboursement des assurés.
            </p>
          </div>

          <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-black px-3 py-1 rounded-full self-start sm:self-center">
            Flux Sécurisé INPDP
          </span>
        </div>

        {/* 3 Metric cards */}
        <div data-tour="cnam-header-metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Identifiant CNAM Médecin</span>
            <div className="font-mono font-black text-sm text-[#00A896]">{cnamCode}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Filière Réglementée</span>
            <div className="font-black text-sm text-slate-900 dark:text-white">Filière Privée / Médecin Référent</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Tarif Conventionné C1</span>
            <div className="font-black text-sm text-emerald-600">{cnamTarif}</div>
          </div>
        </div>

        {/* Form fields */}
        <div data-tour="cnam-form-inputs" className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold pt-2">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">Nom de l'Assuré Social :</label>
            <input
              type="text"
              value={patientCnam}
              onChange={(e) => setPatientCnam(e.target.value)}
              placeholder="Ex. Sami Mansour"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00A896] placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">N° Carnet CNAM :</label>
            <input
              type="text"
              value={carnetNumber}
              onChange={(e) => setCarnetNumber(e.target.value)}
              placeholder="Ex. CNAM-44910-A"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-[#00A896] placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">Régime d'Assurance :</label>
            <select
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer"
            >
              <option value="Prive">Filière Privée (Tiers Payant 70%)</option>
              <option value="Remboursement">Filière Remboursement (APCI)</option>
              <option value="Hospitalier">Filière Publique / Hôpital</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            data-tour="cnam-transmit-btn"
            onClick={handleTransmit}
            className="px-6 py-3 rounded-2xl bg-[#00A896] hover:bg-[#008F80] text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2"
          >
            {transmitted ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{transmitted ? 'Bordereau Télétransmis avec Succès au Centre CNAM !' : 'Télétransmettre le Bulletin CNAM C1'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
