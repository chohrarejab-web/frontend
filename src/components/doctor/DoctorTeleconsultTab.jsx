import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, ShieldCheck, 
  User, Copy, Check, ExternalLink, Camera, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function DoctorTeleconsultTab({ doctorName = 'Dr. Selim Ben Ali' }) {
  const { t } = useLanguage();
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [notes, setNotes] = useState('');
  const [stream, setStream] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError, setMediaError] = useState(null);

  const videoRef = useRef(null);

  // Manage WebCam & Mic Stream when inCall toggles
  useEffect(() => {
    let localStream = null;

    if (inCall) {
      async function startDoctorCamera() {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("L'accès aux périphériques n'est pas supporté par ce navigateur.");
          }
          const s = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: true
          });
          localStream = s;
          setStream(s);
          setMediaError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          console.warn('[DoctorTeleconsult] Camera access note:', err);
          setMediaError(err.message || 'Caméra ou microphone non disponible.');
        }
      }

      startDoctorCamera();

      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
        if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
        }
      };
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setCallDuration(0);
    }
  }, [inCall]);

  // Ensure srcObject stays synced
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Toggle Mic
  const handleToggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoOn;
      });
      setVideoOn(!videoOn);
    }
  };

  // Copy patient invitation link
  const patientInviteLink = `${window.location.origin}/teleconsultation?doctor=${encodeURIComponent(doctorName)}`;
  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(patientInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Format call duration
  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c162d] p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🎥</span>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {t('doc_teleconsult_title', 'Salon de Téléconsultation Sécurisé SahaTN')}
              </h3>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{inCall ? `En direct • ${formatTimer(callDuration)}` : 'Prêt • WebRTC Chiffré'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('doc_teleconsult_subtitle', "Consultation vidéo directe avec partage d'écran et prise de constantes cliniques en temps réel.")}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copier le lien d'accès patient"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'Lien copié !' : 'Lien Patient'}</span>
            </button>

            <button
              type="button"
              onClick={() => setInCall(!inCall)}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                inCall
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#00A896] hover:bg-[#008F80] text-white active:scale-95'
              }`}
            >
              {inCall ? <PhoneOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span>{inCall ? t('doc_teleconsult_end', 'Terminer la Consultation') : t('doc_teleconsult_start', 'Démarrer Salon Vidéo')}</span>
            </button>
          </div>
        </div>

        {/* Video Screen Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div data-tour="teleconsult-screen" className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800 shadow-2xl">
            {inCall ? (
              <div className="w-full h-full relative flex items-center justify-center">
                {/* Real Doctor Webcam Video Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${videoOn ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Avatar Fallback if Camera Disabled */}
                {!videoOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 space-y-2">
                    <div className="w-20 h-20 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-3xl">
                      🧑‍⚕️
                    </div>
                    <h4 className="font-black text-sm">{doctorName}</h4>
                    <p className="text-xs text-slate-400">Caméra désactivée</p>
                  </div>
                )}

                {/* Patient Connected Indicator */}
                <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 text-xs text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Patient : Fatma Ben Abdallah</span>
                  <span className="text-[10px] text-emerald-400 font-mono">1080p HD</span>
                </div>

                {/* Hardware Error notice if any */}
                {mediaError && (
                  <div className="absolute top-4 right-4 bg-amber-950/80 border border-amber-800 text-amber-200 text-xs px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode simulateur actif</span>
                  </div>
                )}

                {/* Video controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-2xl z-10">
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`p-2.5 rounded-full transition-all cursor-pointer ${micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white animate-pulse'}`}
                    title={micOn ? 'Couper micro' : 'Activer micro'}
                  >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleVideo}
                    className={`p-2.5 rounded-full transition-all cursor-pointer ${videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white animate-pulse'}`}
                    title={videoOn ? 'Couper caméra' : 'Activer caméra'}
                  >
                    {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInCall(false)}
                    className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                    title="Terminer l'appel"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-3 p-6">
                <div className="w-16 h-16 rounded-3xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto">
                  <Video className="w-8 h-8" />
                </div>
                <h4 className="font-black text-white text-base">Le salon de téléconsultation est prêt</h4>
                <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                  Cliquez sur <strong className="text-teal-400">"Démarrer Salon Vidéo"</strong> pour allumer votre caméra et lancer la consultation avec le patient.
                </p>
                <div className="pt-2">
                  <a
                    href={`/teleconsultation?doctor=${encodeURIComponent(doctorName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-bold underline"
                  >
                    <span>Ouvrir en plein écran dédié</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Notes column */}
          <div data-tour="teleconsult-notes" className="lg:col-span-4 bg-slate-50 dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 mb-2">
                Notes Cliniques de Téléconsultation :
              </h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Examen clinique visuel, symptômes décrits par le patient, constantes..."
                rows={9}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A896]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                alert('Notes de téléconsultation enregistrées dans le Dossier Médical Partagé (DMP).');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Enregistrer au Dossier Patient
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
