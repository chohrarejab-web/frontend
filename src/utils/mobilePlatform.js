import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside the Capacitor native shell (Android/iOS)
 * OR when built/previewed with VITE_MOBILE_APP=true.
 */
export function isMobileApp() {
  try {
    if (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {
    // Ignore if Capacitor bridge is unavailable
  }
  return import.meta.env.VITE_MOBILE_APP === 'true';
}

export function isNativeMobile() {
  try {
    return Boolean(Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
  } catch {
    return false;
  }
}

/**
 * Lightweight Doctor companion tabs enabled on the mobile app.
 * Heavy administrative/EHR/billing modules remain on the desktop web portal.
 */
export const MOBILE_DOCTOR_TABS = ['agenda', 'retard', 'teleconsult'];

/**
 * Initialize native status bar & Android hardware back button cleanly.
 */
export async function initMobileShell(onBackPress) {
  if (!isNativeMobile()) return () => {};

  const cleanups = [];

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0086cd' });
  } catch {
    // StatusBar plugin optional
  }

  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('backButton', ({ canGoBack }) => {
      if (typeof onBackPress === 'function') {
        const handled = onBackPress(canGoBack);
        if (handled) return;
      }
      if (window.location.pathname !== '/') {
        window.history.back();
      } else if (typeof App.minimizeApp === 'function') {
        App.minimizeApp();
      }
    });
    cleanups.push(() => listener.remove());
  } catch {
    // App plugin optional
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}
