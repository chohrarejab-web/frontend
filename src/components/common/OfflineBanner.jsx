import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-[100] w-full bg-amber-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        {isAr
          ? 'لا يوجد اتصال بالإنترنت — بعض الميزات قد لا تعمل'
          : 'Connexion Internet perdue — certaines fonctionnalités sont indisponibles'}
      </span>
    </div>
  );
}
