import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Mic, MicOff, VideoOff, PhoneOff, ShieldCheck, Heart, 
  Monitor, Maximize2, Minimize2, MessageSquare, AlertCircle, Camera
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function TeleconsultationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  // URL search params: ?doctor=...&patient=...&room=...
  const queryParams = new URLSearchParams(location.search);
  const doctorNameParam = queryParams.get('doctor') || 'Dr. Selim Ben Ali';
  const patientNameParam = queryParams.get('patient') || (user?.name || 'Patient');

  // Stream & Media state
  const [stream, setStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize Camera & Microphone Stream
  useEffect(() => {
    let localStream = null;

    async function startMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("L'accès aux périphériques multimédia n'est pas supporté par ce navigateur.");
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true
        });

        localStream = s;
        setStream(s);
        setMediaError(null);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }
      } catch (err) {
        console.warn('[Teleconsultation] Camera/Microphone access error:', err);
        setMediaError(err.message || "Impossible d'accéder à la caméra ou au microphone.");
      }
    }

    startMedia();

    // Call timer (seconds)
    const timerInterval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update srcObject when stream or ref changes
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Toggle Microphone
  const toggleMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !camOn;
      });
      setCamOn(!camOn);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        screenTrack.onended = () => {
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
          setScreenSharing(false);
        };

        setScreenSharing(true);
      } else {
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenSharing(false);
      }
    } catch (err) {
      console.warn('Screen share cancelled/failed:', err);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Format Duration HH:MM:SS
  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="flex-1 bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-6 min-h-[90vh]">
      
      {/* 1. Header with Status & Security Badges */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-xs sm:text-sm truncate">
              {isAr ? 'جلسة فحص واستشارة طبية عن بعد' : 'Téléconsultation Médicale Sécurisée'}
            </h3>
            <p className="text-[11px] text-teal-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'تشفير WebRTC طبي متكامل' : 'Chiffrement WebRTC de bout en bout (INPDP)'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isAr ? 'مباشر' : 'En direct'} • {formatDuration(callDuration)}</span>
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors hidden sm:block"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Video Stage */}
      <div className="my-4 flex-1 flex items-center justify-center relative bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden min-h-[420px] shadow-2xl">
        
        {/* Real Local Camera Video Stream */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${camOn ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Fallback Avatar Placeholder when Camera is Turned Off */}
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900 z-10">
            <div className="w-24 h-24 rounded-full bg-slate-800 text-slate-500 border-2 border-slate-700 flex items-center justify-center text-3xl font-black">
              <Camera className="w-10 h-10 text-slate-600" />
            </div>
            <h4 className="text-base font-extrabold text-slate-200">
              {isAr ? 'الكاميرا متوقفة حالياً' : 'Caméra désactivée'}
            </h4>
            <p className="text-xs text-slate-400">
              {isAr ? 'انقر على زر الكاميرا أدناه لتشغيل الفيديو' : 'Cliquez sur le bouton vidéo pour réactiver votre flux vidéo.'}
            </p>
          </div>
        )}

        {/* Permission / Hardware Error Notice */}
        {mediaError && (
          <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 max-w-md bg-amber-950/80 border border-amber-800/80 backdrop-blur-md p-3 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200 z-20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mode simulation actif : {mediaError}</span>
          </div>
        )}

        {/* Doctor Participant Badge */}
        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-white z-20">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          <span>{doctorNameParam}</span>
          <span className="text-slate-400 font-normal">({isAr ? 'طبيب' : 'Praticien'})</span>
        </div>

        {/* Small Patient PIP Corner */}
        <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-2xl flex items-center gap-2 text-xs text-slate-200 font-bold shadow-2xl z-20">
          <div className="w-5 h-5 rounded-full bg-[#00A896] text-white flex items-center justify-center text-[10px]">
            👤
          </div>
          <span>{patientNameParam}</span>
          {!micOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        </div>
      </div>

      {/* 3. Interactive Call Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-800 flex items-center justify-center gap-3 sm:gap-4 shadow-xl flex-wrap">
        
        {/* Mic Control */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all active:scale-95 ${
            micOn 
              ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-xs' 
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50 shadow-md animate-pulse'
          }`}
          title={micOn ? 'Couper le micro' : 'Activer le micro'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera Control */}
        <button
          type="button"
          onClick={toggleCam}
          className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all active:scale-95 ${
            camOn 
              ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-xs' 
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50 shadow-md animate-pulse'
          }`}
          title={camOn ? 'Couper la caméra' : 'Activer la caméra'}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share Control */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all active:scale-95 hidden sm:flex items-center gap-1.5 ${
            screenSharing 
              ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Partager mon écran ou document médical"
        >
          <Monitor className="w-5 h-5" />
          <span className="text-xs font-bold">{screenSharing ? 'Arrêter partage' : 'Partager écran'}</span>
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={() => {
            if (stream) {
              stream.getTracks().forEach(t => t.stop());
            }
            navigate(-1);
          }}
          className="px-6 py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40 transition-all"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{isAr ? 'إنهاء المكالمة' : 'Mettre fin'}</span>
        </button>

      </div>

    </div>
  );
}
