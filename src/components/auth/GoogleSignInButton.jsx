import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

export default function GoogleSignInButton({
  mode = 'login', // 'login' | 'signup'
  targetRole = 'PATIENT',
  onSuccess,
  onError,
  className = ''
}) {
  const { loginWithGoogle } = useAuth();
  const { lang, isRtl } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [googleConfig, setGoogleConfig] = useState({ isConfigured: false, clientId: '' });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showIpWarningModal, setShowIpWarningModal] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Watcher references for cleanup & popup closure detection
  const popupTimerRef = useRef(null);
  const focusListenerRef = useRef(null);

  const cleanupPopupWatchers = () => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    if (focusListenerRef.current) {
      window.removeEventListener('focus', focusListenerRef.current);
      document.removeEventListener('visibilitychange', focusListenerRef.current);
      focusListenerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupPopupWatchers();
    };
  }, []);

  // Detect whether the user is browsing via raw IP (e.g., 26.144.108.87 or 192.168.x.x)
  const isRawIp = typeof window !== 'undefined' && /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);
  const currentPort = typeof window !== 'undefined' && window.location.port ? window.location.port : '5173';
  const localhostTargetUrl = `http://localhost:${currentPort}${typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''}`;

  // Effective Client ID (from server config or Vite env)
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const effectiveClientId = (googleConfig.clientId || envClientId || '').trim();
  const isConfigured = Boolean(effectiveClientId && effectiveClientId.length > 10);

  // Fetch Google Client ID config on mount
  useEffect(() => {
    let isMounted = true;
    api.getGoogleConfig()
      .then(res => {
        if (isMounted && res && res.success) {
          setGoogleConfig(res);
          if (res.clientId) {
            setInputClientId(res.clientId);
          }
        }
      })
      .catch((err) => {
        console.warn('[Google Auth] Config check warning:', err.message);
      });
    return () => { isMounted = false; };
  }, []);

  // Initialize GIS ID service if client ID is ready and NOT on raw IP
  useEffect(() => {
    if (isConfigured && !isRawIp && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: effectiveClientId,
          callback: async (response) => {
            if (!response?.credential) return;
            setLoading(true);
            setErrorMsg('');
            try {
              const res = await loginWithGoogle({
                credential: response.credential,
                targetRole
              });
              if (onSuccess) onSuccess(res.user, res);
            } catch (err) {
              const msg = err.message || 'Erreur lors de la vérification Google';
              setErrorMsg(msg);
              if (onError) onError(msg, err);
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
      } catch (e) {
        console.warn('[Google GIS ID] Init warning:', e);
      }
    }
  }, [isConfigured, effectiveClientId, targetRole, isRawIp]);

  // Trigger REAL Google OAuth 2.0 popup
  const launchRealGooglePopup = (clientIdToUse) => {
    const activeId = (clientIdToUse || effectiveClientId).trim();

    if (!activeId) {
      setShowConfigModal(true);
      return;
    }

    // CRITICAL: Google OAuth policy strictly rejects requests from raw IP addresses (e.g. 26.144.108.87 or 192.168.x.x)
    // with Error 400: invalid_request. It strictly requires localhost or a registered domain.
    if (isRawIp) {
      setShowIpWarningModal(true);
      return;
    }

    // Check if Google Identity Services script is available
    if (!window.google?.accounts?.oauth2) {
      setErrorMsg(
        lang === 'ar'
          ? 'مكتبة Google قيد التحميل، يرجى المحاولة بعد لحظة أو تعطيل مانع الإعلانات.'
          : 'La bibliothèque Google Identity Services se charge, veuillez réessayer dans un instant (ou désactiver votre bloqueur).'
      );
      return;
    }

    cleanupPopupWatchers();
    setLoading(true);
    setErrorMsg('');

    let oauthResolved = false;

    // Detect when user returns to main window / closes the Google popup window
    const handleWindowRefocus = () => {
      setTimeout(() => {
        if (!oauthResolved) {
          setLoading(false);
          cleanupPopupWatchers();
        }
      }, 1000);
    };

    focusListenerRef.current = handleWindowRefocus;
    window.addEventListener('focus', handleWindowRefocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleWindowRefocus();
      }
    });

    // Safety watchdog: reset after 20s if no response
    popupTimerRef.current = setTimeout(() => {
      if (!oauthResolved) {
        setLoading(false);
        cleanupPopupWatchers();
      }
    }, 20000);

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeId,
        scope: 'openid email profile',
        prompt: 'select_account',
        error_callback: (nonOAuthError) => {
          oauthResolved = true;
          cleanupPopupWatchers();
          setLoading(false);
          console.warn('[Google OAuth] Non-OAuth error or popup closed:', nonOAuthError);
          if (nonOAuthError?.type === 'popup_closed') {
            // User closed the popup window without completing auth
            return;
          }
          if (nonOAuthError?.type === 'popup_failed_to_open') {
            setErrorMsg(
              lang === 'ar'
                ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لـ Google.'
                : 'La fenêtre Google a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.'
            );
          }
        },
        callback: async (tokenResponse) => {
          oauthResolved = true;
          cleanupPopupWatchers();

          if (tokenResponse.error) {
            setLoading(false);
            if (tokenResponse.error === 'popup_closed_by_user') {
              // User simply dismissed the real Google popup
              return;
            }
            const desc = tokenResponse.error_description || tokenResponse.error;
            console.error('[Google OAuth] Error:', tokenResponse);
            setErrorMsg(`Erreur Google: ${desc}`);
            if (onError) onError(desc);
            return;
          }

          if (!tokenResponse.access_token) {
            setLoading(false);
            setErrorMsg('Aucun jeton d\'accès reçu de Google.');
            return;
          }

          // Send genuine Google access token to backend for verification & user login
          try {
            const res = await loginWithGoogle({
              access_token: tokenResponse.access_token,
              targetRole
            });
            if (onSuccess) onSuccess(res.user, res);
          } catch (err) {
            const msg = err.message || 'Échec de la connexion avec votre compte Google réel.';
            setErrorMsg(msg);
            if (onError) onError(msg, err);
          } finally {
            setLoading(false);
          }
        }
      });

      // Opens the REAL Google OAuth popup window at accounts.google.com!
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      oauthResolved = true;
      cleanupPopupWatchers();
      setLoading(false);
      console.error('[Google OAuth Launch Error]:', err);
      setErrorMsg(err.message || 'Impossible d\'ouvrir la fenêtre Google.');
      if (onError) onError(err.message, err);
    }
  };

  const handleGoogleClick = () => {
    if (loading) {
      // If user clicks while loading, allow them to immediately cancel and reset the button!
      cleanupPopupWatchers();
      setLoading(false);
      return;
    }
    if (isRawIp) {
      setShowIpWarningModal(true);
      return;
    }
    if (!isConfigured) {
      setShowConfigModal(true);
      return;
    }
    launchRealGooglePopup();
  };

  const handleSaveConfigAndLaunch = async (e) => {
    e.preventDefault();
    const cleanId = inputClientId.trim();
    if (!cleanId || cleanId.length < 10) {
      setErrorMsg('Veuillez saisir un Client ID Google valide (ex: 123456789-abc.apps.googleusercontent.com).');
      return;
    }

    setSavingConfig(true);
    setErrorMsg('');

    try {
      const res = await api.saveGoogleConfig({ clientId: cleanId });
      if (res && res.success) {
        setGoogleConfig({ isConfigured: true, clientId: cleanId });
        setShowConfigModal(false);
        setTimeout(() => {
          launchRealGooglePopup(cleanId);
        }, 150);
      } else {
        throw new Error(res?.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Impossible d\'enregistrer le Client ID.');
    } finally {
      setSavingConfig(false);
    }
  };

  const isSignup = mode === 'signup';
  const buttonLabelFr = isSignup ? "S'inscrire avec Google" : "Se connecter avec Google";
  const buttonLabelAr = isSignup ? "التسجيل عبر Google" : "تسجيل الدخول باستخدام Google";

  return (
    <div className="w-full space-y-2">
      {/* Warning banner if user accessed via IP */}
      {isRawIp && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-snug flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 text-sm">💡</span>
            <span className="truncate">
              Google OAuth exige <strong>localhost</strong> (l'IP {window.location.hostname} est bloquée par Google).
            </span>
          </div>
          <a
            href={localhostTargetUrl}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-colors"
          >
            Ouvrir localhost
          </a>
        </div>
      )}

      {/* Official Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleClick}
        id={`google-auth-btn-${mode}`}
        className={`w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-[#071322] hover:bg-slate-50 dark:hover:bg-[#0c1d33] text-slate-700 dark:text-slate-100 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] select-none group ${className}`}
        dir={isRtl ? 'rtl' : 'ltr'}
        title={loading ? (lang === 'ar' ? 'انقر للإلغاء' : 'Cliquer pour annuler') : undefined}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span className="truncate">
          {loading
            ? (lang === 'ar' ? 'جارٍ فتح نافذة Google... (إلغاء)' : 'Ouverture de Google... (cliquez pour annuler)')
            : (lang === 'ar' ? buttonLabelAr : buttonLabelFr)}
        </span>
      </button>

      {/* Error Feedback */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start justify-between gap-2 animate-fadeIn">
          <div className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 shrink-0 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL 1: IP Address Warning Modal (When accessed through 26.x.x.x / 192.168.x.x) */}
      {showIpWarningModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowIpWarningModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0e1a2d] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-scaleUp p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-12 mx-auto flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl text-2xl">
              🛡️
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Politique de Sécurité Google OAuth
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                Erreur Google 400 : invalid_request évitée
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-700">
              <p>
                Vous naviguez actuellement sur l'adresse IP <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono font-bold text-teal-600">{window.location.hostname}</code>.
              </p>
              <p>
                <strong>Google interdit formellement les adresses IP privées</strong> dans ses règles de sécurité OAuth 2.0. Pour que Google autorise la connexion, vous devez accéder au site via <strong>localhost</strong>.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={localhostTargetUrl}
                className="w-full flex items-center justify-center gap-2 bg-[#00A896] hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs"
              >
                <span>🚀 Basculer sur http://localhost:{currentPort}</span>
              </a>
              <button
                type="button"
                onClick={() => setShowIpWarningModal(false)}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Real Google OAuth Configuration Modal (Shown only when Client ID is missing) */}
      {showConfigModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowConfigModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#0e1a2d] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800 relative bg-gradient-to-b from-slate-50/70 to-white dark:from-[#0a1526] dark:to-[#0e1a2d]">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>

              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-white dark:bg-[#071322] rounded-2xl shadow-md border border-slate-100 dark:border-slate-800">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? 'ربط الحساب الحقيقي عبر Google' : 'Connexion Réelle Google OAuth 2.0'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {lang === 'ar'
                  ? 'لفتح نافذة تسجيل الدخول الرسمية من Google على جهازك، أدخل معرف العميل (Google Client ID).'
                  : 'Pour ouvrir la véritable popup de connexion officielle Google (accounts.google.com), renseignez votre Google Client ID.'}
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2 text-blue-900 dark:text-blue-200">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <span>ℹ️</span>
                  <span>Configuration requise</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Google exige un identifiant client OAuth (Google Cloud) pour autoriser cette application à ouvrir la fenêtre officielle et sécuriser l'échange d'informations.
                </p>
              </div>

              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Comment l'obtenir en 2 minutes :
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] pl-1">
                  <li>
                    Ouvrez la{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0086cd] font-bold underline hover:text-cyan-500"
                    >
                      Console Google Cloud &gt; Identifiants ↗
                    </a>
                  </li>
                  <li>Cliquez sur <strong>Créer des identifiants</strong> &gt; <strong>ID client OAuth</strong></li>
                  <li>Type : <strong>Application Web</strong></li>
                  <li>
                    Ajoutez dans <em>Origines JavaScript autorisées</em> :{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-teal-600 font-mono font-bold">
                      http://localhost:5173
                    </code>
                  </li>
                  <li>Copiez votre <strong>Client ID</strong> et collez-le ci-dessous :</li>
                </ol>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSaveConfigAndLaunch} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Google OAuth Web Client ID :
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="ex: 1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#071322] font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Vous pouvez aussi le configurer directement dans le fichier <code className="font-mono">.env</code> avec <code className="font-mono">GOOGLE_CLIENT_ID=...</code>
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig || !inputClientId.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#00A896] hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {savingConfig ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <span>💾 Enregistrer & Ouvrir Google</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
