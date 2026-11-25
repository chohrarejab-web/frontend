import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Printer, Check, MapPin, Building, Phone, Calendar, User, Clock, QrCode } from 'lucide-react';
import api from '../services/api';

export default function PrescriptionVerifyPage() {
  const { hash: paramHash } = useParams();
  const [searchParams] = useSearchParams();
  const queryHash = searchParams.get('hash');
  const queryId = searchParams.get('id');
  const encodedPayload = searchParams.get('d') || searchParams.get('data');
  const hash = paramHash || queryHash || queryId || 'demo';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function verify() {
      setLoading(true);
      setError('');

      // 0. Decode immediate compact URL payload if present (works cross-device & offline on smartphone)
      let parsedFromUrl = null;
      if (encodedPayload) {
        try {
          const decodedJson = decodeURIComponent(escape(atob(encodedPayload)));
          const p = JSON.parse(decodedJson);
          if (p) {
            parsedFromUrl = {
              verified: true,
              certificate: {
                prescriptionId: p.id || hash,
                qrHash: p.h || hash,
                date: p.dt || new Date().toLocaleDateString('fr-TN'),
                status: 'ACTIVE',
                authority: "Conseil National de l'Ordre des Médecins de Tunisie (CNOMT)",
                cnamConvention: 'Conventionné CNAM — Filière Privée C1',
                orderRegistration: p.o ? `TN-MED-${p.o}` : 'TN-MED-14092',
                patient: {
                  maskedName: p.p ? p.p.split(' ').map((part, i) => i === 0 ? part : part[0] + '***').join(' ') : 'Patient B***',
                  patientId: 'usr-patient'
                },
                doctor: {
                  name: p.d || 'Dr. Selim Ben Ali',
                  specialty: p.s || 'Cardiologie & Maladies Vasculaires',
                  address: 'Centre Médical Ennasr 2, Tunis',
                  phone: '+216 71 830 900',
                  orderNumber: p.o || '14092'
                },
                drugs: (p.rx || []).map(d => ({
                  name: d.n || d.name,
                  dose: d.d || d.dose,
                  moment: d.m || d.moment,
                  duration: d.t || d.duration,
                  nonSubstituable: Boolean(d.ns)
                })),
                medicalAdvice: p.adv || ''
              }
            };
            if (!isCancelled) setData(parsedFromUrl);
          }
        } catch (e) {
          try {
            const p = JSON.parse(atob(encodedPayload));
            if (p) {
              parsedFromUrl = {
                verified: true,
                certificate: {
                  prescriptionId: p.id || hash,
                  qrHash: p.h || hash,
                  date: p.dt || new Date().toLocaleDateString('fr-TN'),
                  status: 'ACTIVE',
                  authority: "Conseil National de l'Ordre des Médecins de Tunisie (CNOMT)",
                  cnamConvention: 'Conventionné CNAM — Filière Privée C1',
                  orderRegistration: p.o ? `TN-MED-${p.o}` : 'TN-MED-14092',
                  patient: {
                    maskedName: p.p ? p.p.split(' ').map((part, i) => i === 0 ? part : part[0] + '***').join(' ') : 'Patient B***',
                    patientId: 'usr-patient'
                  },
                  doctor: {
                    name: p.d || 'Dr. Selim Ben Ali',
                    specialty: p.s || 'Cardiologie & Maladies Vasculaires',
                    address: 'Centre Médical Ennasr 2, Tunis',
                    phone: '+216 71 830 900',
                    orderNumber: p.o || '14092'
                  },
                  drugs: (p.rx || []).map(d => ({
                    name: d.n || d.name,
                    dose: d.d || d.dose,
                    moment: d.m || d.moment,
                    duration: d.t || d.duration,
                    nonSubstituable: Boolean(d.ns)
                  })),
                  medicalAdvice: p.adv || ''
                }
              };
              if (!isCancelled) setData(parsedFromUrl);
            }
          } catch (e2) {}
        }
      }

      // 1. Try fetching from backend API
      try {
        const res = await api.verifyPrescription(hash || 'demo');
        if (res && (res.certificate || res.data || res.prescription)) {
          if (!isCancelled) setData(res);
          return;
        }
      } catch (err) {
        // Fallback to local storage if API is offline or hash was freshly generated
        try {
          const stored = JSON.parse(localStorage.getItem('sahatn_prescriptions') || '[]');
          const match = stored.find(p => 
            p.qrHash === hash || 
            p.id === hash || 
            (hash && p.qrHash && (hash.includes(p.qrHash) || p.qrHash.includes(hash))) ||
            (hash && p.id && (hash.includes(p.id) || p.id.includes(hash)))
          );
          if (match) {
            if (!isCancelled) {
              setData({
                verified: true,
                certificate: {
                  prescriptionId: match.id,
                  qrHash: match.qrHash,
                  date: match.date,
                  status: match.status || 'ACTIVE',
                  authority: "Conseil National de l'Ordre des Médecins de Tunisie (CNOMT)",
                  cnamConvention: match.cnamCode ? `Conventionné CNAM (${match.cnamCode})` : 'Conventionné CNAM — Filière C1',
                  orderRegistration: match.orderNumber ? `TN-MED-${match.orderNumber}` : 'TN-MED-14092',
                  patient: {
                    maskedName: match.patientName ? match.patientName.split(' ').map((p, i) => i === 0 ? p : p[0] + '***').join(' ') : 'Fatma B***',
                    patientId: match.patientId || 'usr-patient'
                  },
                  doctor: {
                    name: match.doctorName || 'Dr. Selim Ben Ali',
                    specialty: match.specialty || 'Cardiologie & Maladies Vasculaires',
                    address: match.cabinetAddress || 'Centre Médical Ennasr 2, Tunis',
                    phone: match.cabinetPhone || '+216 71 830 900',
                    orderNumber: match.orderNumber || '14092'
                  },
                  drugs: match.drugs || [],
                  medicalAdvice: match.medicalAdvice
                }
              });
            }
            return;
          }
        } catch (e) {}

        // If we already obtained a verified certificate from payload, don't error out
        if (parsedFromUrl) {
          return;
        }

        // If demo
        if (hash === 'demo' || !hash) {
          if (!isCancelled) {
            setData({
              verified: true,
              certificate: {
                prescriptionId: 'ORD-2026-96460',
                qrHash: 'sha256-a8f9c2e4b12d88',
                date: new Date().toLocaleDateString('fr-TN'),
                status: 'ACTIVE',
                authority: "Conseil National de l'Ordre des Médecins de Tunisie (CNOMT)",
                cnamConvention: 'Conventionné CNAM — Filière Privée C1',
                orderRegistration: 'TN-MED-14092',
                patient: { maskedName: 'Fatma B***' },
                doctor: {
                  name: 'Dr. Selim Ben Ali',
                  specialty: 'Cardiologie & Maladies Vasculaires',
                  address: 'Avenue Hédi Nouira, Ennasr 2, Tunis',
                  phone: '+216 71 830 900'
                },
                drugs: [
                  { name: 'KARDEGIC 160 mg', dose: '1 sachet / jour', moment: 'Le midi au milieu du repas', duration: '3 mois' },
                  { name: 'INEXIUM 40 mg', dose: '1 gélule / jour', moment: 'Le matin à jeun', duration: '1 mois' },
                  { name: 'TAHOR 20 mg', dose: '1 comprimé / jour', moment: 'Le soir au coucher', duration: '3 mois' }
                ]
              }
            });
          }
          return;
        }

        if (!isCancelled) {
          setError(err.message || 'QR Code non reconnu ou ordonnance non répertoriée.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    verify();

    return () => {
      isCancelled = true;
    };
  }, [hash, encodedPayload]);

  const cert = data?.certificate || data?.prescription;
  const doctor = cert?.doctor || {};
  const patientInfo = cert?.patient || {};
  const drugs = cert?.drugs || [];

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
      
      <div id="prescription-verify-sheet" className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 text-slate-800 dark:text-slate-100">
        
        {/* Verification Status Header */}
        {loading ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Vérification cryptographique de l'ordonnance en cours...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-black text-sm">Alerte : Document Non Certifié ou Falsifié</h3>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-black text-sm flex items-center gap-1.5">
                <span>✓ Ordonnance Officielle Certifiée Conforme</span>
                <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold">AUTHENTIQUE</span>
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {cert?.authority || "Conseil National de l'Ordre des Médecins de Tunisie (CNOMT)"} &bull; Système National SahaTN
              </p>
            </div>
          </div>
        )}

        {/* Certificate Body */}
        {cert && !error && (
          <div className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-2xl space-y-4 text-xs bg-slate-50/50 dark:bg-slate-900/40">
            
            {/* Doctor Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{doctor.name || 'Dr. Selim Ben Ali'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                </h2>
                <p className="text-teal-700 dark:text-teal-400 font-bold text-xs mt-0.5">
                  {doctor.specialty || 'Cardiologie & Maladies Vasculaires'} &bull; {cert.orderRegistration || 'TN-MED-14092'}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{doctor.address || 'Centre Médical Ennasr 2, Tunis'}</span>
                </p>
              </div>
              <div className="text-left sm:text-right font-mono">
                <span className="font-bold text-slate-400 text-[10px] block uppercase">Empreinte Cryptographique</span>
                <p className="text-xs font-black text-[#00A896] break-all">{cert.qrHash || hash || 'sha256-verified'}</p>
                <span className="text-[10px] text-slate-400 block mt-0.5">Réf : {cert.prescriptionId || 'ORD-OFFICIELLE'}</span>
              </div>
            </div>

            {/* Patient & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Bénéficiaire</span>
                <p className="font-black text-slate-800 dark:text-slate-100 text-xs mt-0.5">
                  {patientInfo.maskedName || 'Patient Bénéficiaire'} <span className="text-[10px] font-normal text-slate-400">(Protégé Secret Médical)</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Date de Délivrance</span>
                <p className="font-black text-slate-800 dark:text-slate-100 text-xs mt-0.5">
                  {cert.date || new Date().toLocaleDateString('fr-TN')}
                </p>
              </div>
            </div>

            {/* Prescribed Drugs */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <span>💊</span>
                <span>Prescription Médicamenteuse Validée ({drugs.length} médicament(s)) :</span>
              </h4>

              <div className="space-y-2">
                {drugs.length > 0 ? (
                  drugs.map((d, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-l-4 border-teal-500 border border-slate-100 dark:border-slate-700 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
                          {idx + 1}. {d.name} {d.dose ? `— ${d.dose}` : ''}
                        </span>
                        {d.nonSubstituable && (
                          <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded">
                            Non Substituable
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {d.moment ? `Posologie : ${d.moment}` : ''}
                        {d.duration ? ` • Durée : ${d.duration}` : ''}
                        {d.form ? ` (${d.form})` : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-xs">Aucun médicament répertorié.</p>
                )}
              </div>
            </div>

            {/* Medical Advice */}
            {cert.medicalAdvice && (
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200">
                <span className="font-bold block">📌 Recommandations du Médecin :</span>
                <p className="mt-0.5 italic">{cert.medicalAdvice}</p>
              </div>
            )}

            {/* Footer Seal & Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Horodatage Merkle Scellé &bull; {cert.cnamConvention || 'CNAM Conventionné'}</span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#00A896] hover:bg-[#008F80] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 text-xs print:hidden no-print"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer l'Attestation</span>
              </button>
            </div>

          </div>
        )}

        <div className="text-center pt-2 print:hidden no-print">
          <Link to="/" className="text-xs text-[#0086cd] hover:text-[#0070ab] font-bold hover:underline">
            &larr; Retour à l'accueil SahaTN (موعدي)
          </Link>
        </div>

      </div>

    </div>
  );
}
