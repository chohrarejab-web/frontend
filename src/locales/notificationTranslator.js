/**
 * SahaTN - Unified Notification Translator & Formatter
 * Handles Arabic / French translations for notification popovers across
 * Navbar, DoctorHeader, and AdminHeader.
 */

const DATE_REPLACEMENTS = [
  [/aujourd'hui/gi, 'اليوم'],
  [/hier/gi, 'أمس'],
  [/vendr\./gi, 'الجمعة'], [/ven\./gi, 'الجمعة'], [/vendredi/gi, 'الجمعة'],
  [/lun\./gi, 'الإثنين'], [/lundi/gi, 'الإثنين'],
  [/mar\./gi, 'الثلاثاء'], [/mardi/gi, 'الثلاثاء'],
  [/mer\./gi, 'الأربعاء'], [/mercredi/gi, 'الأربعاء'],
  [/jeu\./gi, 'الخميس'], [/jeudi/gi, 'الخميس'],
  [/sam\./gi, 'السبت'], [/samedi/gi, 'السبت'],
  [/dim\./gi, 'الأحد'], [/dimanche/gi, 'الأحد'],
  [/nov\./gi, 'نوفمبر'], [/novembre/gi, 'نوفمبر'],
  [/déc\./gi, 'ديسمبر'], [/décembre/gi, 'ديسمبر'],
  [/janv\./gi, 'جانفي'], [/janvier/gi, 'جانفي'],
  [/févr\./gi, 'فيفري'], [/février/gi, 'فيفري'],
  [/mars/gi, 'مارس'], [/avr\./gi, 'أفريل'], [/avril/gi, 'أفريل'],
  [/mai/gi, 'ماي'], [/juin/gi, 'جوان'], [/juil\./gi, 'جويلية'], [/juillet/gi, 'جويلية'],
  [/août/gi, 'أوت'], [/sept\./gi, 'سبتمبر'], [/septembre/gi, 'سبتمبر'],
  [/oct\./gi, 'أكتوبر'], [/octobre/gi, 'أكتوبر']
];

const SPECIALTY_MAP_AR = {
  'cardiologie': 'أمراض القلب والشرايين',
  'cardiologie & maladies vasculaires': 'أمراض القلب والشرايين',
  'gynécologie obstétrique': 'أمراض النساء والتوليد',
  'gynécologie obstétrique & pma': 'أمراض النساء والتوليد والمساعدة على الإنجاب',
  'pédiatrie': 'طب الأطفال',
  'pédiatrie & néonatologie': 'طب الأطفال وحديثي الولادة',
  'dermatologie': 'الأمراض الجلدية',
  'dermatologie & vénérologie': 'الأمراض الجلدية والتناسلية',
  'radiologie': 'الأشعة والتصوير الطبي',
  'radiologie & imagerie médicale': 'الأشعة والتصوير الطبي',
  'médecine générale': 'الطب العام',
  'ophtalmologie': 'طب وجراحة العيون',
  'dentiste': 'طب الأسنان',
  'orthopédie': 'جراحة العظام والمفاصل',
  'psychiatrie': 'الطب النفسي',
  'orl': 'الأنف والأذن والحنجرة'
};

export function translateSpecialty(spec) {
  if (!spec) return '';
  const key = String(spec).trim().toLowerCase();
  return SPECIALTY_MAP_AR[key] || spec;
}

export function translateDateInText(str) {
  let res = String(str || '');
  for (const [re, ar] of DATE_REPLACEMENTS) {
    res = res.replace(re, ar);
  }
  return res;
}

const TITLE_MAP_AR = {
  'rdv annulé par patient': 'إلغاء موعد من قبل المريض',
  'rendez-vous annulé': 'إلغاء الموعد الطبي',
  'nouveau rendez-vous patient': 'موعد جديد من مريض',
  'nouveau rdv sur planning': 'موعد جديد في جدول المواعيد',
  'rendez-vous confirmé': 'تأكيد الموعد الطبي',
  'nouvel avis patient certifié': 'تقييم جديد معتمد من مريض',
  'nouvelle ordonnance électronique': 'وصفة طبية إلكترونية جديدة',
  'avis de retard cabinet': 'إشعار بتأخير العيادة',
  "cabinet à l'heure": 'العيادة تعمل في الوقت المحدد',
  'votre tour en consultation': 'حان دورك في الفحص',
  'cabinet praticien positionné sur la carte': 'تم تحديد موقع العيادة على الخريطة',
  'cabinet opérationnel': 'العيادة جاهزة ومفعلة',
  'compte praticien activé': 'تم تفعيل حساب الطبيب',
  'demande praticien refusée': 'رفض طلب انضمام الطبيب',
  'demande praticien rejetée': 'رفض طلب انضمام الطبيب',
  'praticien approuvé & notifié': 'تمت الموافقة على الطبيب وإشعاره',
  'praticien approuvé': 'تمت الموافقة على الطبيب',
  'nouvelle demande praticien': 'طلب انضمام طبيب جديد',
  'nouveau rdv urgence': 'موعد استعجالي جديد',
  "arrivée en salle d'attente": 'وصول إلى قاعة الانتظار',
  'nouvel avis certifié 5★': 'تقييم معتمد 5★',
  'arrivée accueil cabinet': 'وصول إلى استقبال العيادة',
  'sauvegarde automatique réussie': 'نسخ احتياطي تلقائي ناجح',
  'test notification heure exacte': 'إشعار تجريبي',
  'médecin praticien agréé': 'طبيب ممارس معتمد',
  'notifications système': 'إشعارات النظام',
  'notifications praticien': 'إشعارات الطبيب',
  'notifications': 'الإشعارات',
  'nouvelle notification': 'إشعار جديد'
};

export function getNotificationTitle(n, lang = 'fr') {
  if (!n) return '';
  if (lang !== 'ar') return n.title || 'Notification';
  if (n.titleAr) return n.titleAr;
  const raw = String(n.title || '').trim();
  const lower = raw.toLowerCase();
  if (TITLE_MAP_AR[lower]) return TITLE_MAP_AR[lower];
  // Strip emojis and punctuation at edges
  const cleaned = lower.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}★🚫👤⭐🔔⚡✅💾👨‍⚕️🎉]/gu, '').trim();
  if (TITLE_MAP_AR[cleaned]) return TITLE_MAP_AR[cleaned];
  if (/^Message WhatsApp de /i.test(raw)) return raw.replace(/^Message WhatsApp de /i, 'رسالة واتساب من ');
  if (/^SMS Médical : /i.test(raw)) return raw.replace(/^SMS Médical : /i, 'رسالة قصيرة SMS : ');
  if (/^Réponse WhatsApp de /i.test(raw)) return raw.replace(/^Réponse WhatsApp de /i, 'رد واتساب من ');
  if (/^Réponse SMS de /i.test(raw)) return raw.replace(/^Réponse SMS de /i, 'رد SMS من ');
  return raw;
}

export function getNotificationMessage(n, lang = 'fr') {
  if (!n) return '';
  if (lang !== 'ar') return n.message || '';
  if (n.messageAr) return n.messageAr;
  let text = String(n.message || '').trim();

  // Pattern 1: Le RDV de {patient} ({time}) a été annulé. Le créneau a été libéré.
  const m1 = text.match(/^Le RDV de (.*?) \((.*?)\) a été annulé\.\s*Le créneau a été libéré\.?/i);
  if (m1) {
    return `تم إلغاء موعد ${m1[1]} (${m1[2]}). أصبح الموعد متاحاً في الجدول.`;
  }

  // Pattern 2: {patient} a réservé pour {date} à {time}.
  const m2 = text.match(/^(.*?) a réservé pour (.*?) à (.*?)\.?$/i);
  if (m2) {
    const patient = m2[1];
    const date = translateDateInText(m2[2]);
    const time = m2[3];
    return `قام ${patient} بحجز موعد ليوم ${date} على الساعة ${time}.`;
  }

  // Pattern 3: {patient}: « {comment} » ({rating}★)
  const m3 = text.match(/^(.*?):\s*«\s*(.*?)\s*»\s*\((.*?)★\)/);
  if (m3) {
    let comment = m3[2];
    if (comment.toLowerCase() === 'avis positif') comment = 'تقييم إيجابي';
    return `${m3[1]}: « ${comment} » (${m3[3]}★)`;
  }

  // Pattern 4: Votre RDV chez {doctor} ({specialty}) est confirmé pour {date} à {time}.
  const m4 = text.match(/^Votre RDV chez (.*?) \((.*?)\) est confirmé pour (.*?) à (.+?)\.?$/i);
  if (m4) {
    const spec = translateSpecialty(m4[2]);
    const date = translateDateInText(m4[3]);
    return `تم تأكيد موعدك مع ${m4[1]} (${spec}) ليوم ${date} على الساعة ${m4[4]}.`;
  }

  // Pattern 5: Votre RDV chez {doctor} ({time}) a été annulé.
  const m5 = text.match(/^Votre RDV chez (.*?) \((.*?)\) a été annulé\.?/i);
  if (m5) {
    return `تم إلغاء موعدك مع ${m5[1]} (${m5[2]}).`;
  }

  // Pattern 6: {patient} ({time}) - {doctor}
  const m6 = text.match(/^(.*?) \((.*?)\)\s*-\s*(.*)$/);
  if (m6) {
    return `موعد: ${m6[1]} (${m6[2]}) مع ${m6[3]}`;
  }

  // Pattern 7: {doctor} a mis en ligne votre ordonnance certifiée ({count} médicament(s)).
  const m7 = text.match(/^(.*?) a mis en ligne votre ordonnance certifiée \((.*?) médicament\(s\)\)\.?/i);
  if (m7) {
    return `قام ${m7[1]} بإصدار وصفتك الطبية المعتمدة (${m7[2]} دواء).`;
  }

  // Pattern 8: Le cabinet médical a signalé un retard temporaire estimé à +{val} min.
  const m8 = text.match(/^Le cabinet médical a signalé un retard temporaire estimé à \+(\d+) min\.?/i);
  if (m8) {
    return `أعلنت العيادة عن تأخير مؤقت يقدر بحوالي +${m8[1]} دقيقة.`;
  }

  // Pattern 9: Le cabinet médical fonctionne à l'heure exacte. Aucun retard.
  if (/^Le cabinet médical fonctionne à l'heure exacte/i.test(text)) {
    return "العيادة تعمل وفق التوقيت المحدد بدون أي تأخير.";
  }

  // Pattern 10: Patient {patient} ({ticket}), veuillez vous présenter en salle de consultation.
  const m10 = text.match(/^Patient (.*?) \((.*?)\), veuillez vous présenter en salle de consultation\.?/i);
  if (m10) {
    return `المريض ${m10[1]} (تذكرة ${m10[2]})، يرجى التوجه إلى قاعة الفحص الطبي.`;
  }

  // Pattern 11: Cabinet Opérationnel
  if (/^Votre compte et emplacement géographique sont enregistrés/i.test(text)) {
    return "تم تسجيل حسابك وتحديد موقعك الجغرافي بنجاح. عيادتك أصبحت مرئية للمرضى الآن!";
  }

  // Pattern 12: Bienvenue {doctor} ! Votre dossier praticien a été validé sur SahaTN.
  const m12 = text.match(/^Bienvenue (.*?) ! Votre dossier praticien a été validé sur SahaTN\.?/i);
  if (m12) {
    return `مرحباً بك ${m12[1]}! تمت المصادقة على ملفك الطبي في منصة SahaTN.`;
  }

  // Pattern 13: La demande de {doctor} a été refusée. Email de notification envoyé à {email}.
  const m13 = text.match(/^La demande de (.*?) a été refusée\. Email de notification envoyé à (.+?)\.?$/i);
  if (m13) {
    return `تم رفض طلب انضمام ${m13[1]}. تم إرسال بريد إلكتروني إلى ${m13[2]}.`;
  }

  // Pattern 14: {doctor} a été validé. Email d'activation envoyé à {email}.
  const m14 = text.match(/^(.*?) a été validé\. Email d'activation envoyé à (.+?)\.?$/i);
  if (m14) {
    return `تمت المصادقة على ${m14[1]} وإرسال بريد التفعيل إلى ${m14[2]}.`;
  }

  // Pattern 15: {doctor} a défini son mot de passe et son emplacement GPS [{lat}, {lng}].
  const m15 = text.match(/^(.*?) a défini son mot de passe et son emplacement GPS \[(.*?)\]\.?/i);
  if (m15) {
    return `قام ${m15[1]} بتعيين كلمة المرور وموقع العيادة الجغرافي [${m15[2]}].`;
  }

  // Pattern 16: Consultation prioritaire / urgence
  const m16 = text.match(/^(.*?) a réservé une consultation prioritaire (.*?) à (.+?)\.?$/i);
  if (m16) {
    return `قام ${m16[1]} بحجز استشارة ذات أولوية ${translateDateInText(m16[2])} على الساعة ${m16[3]}.`;
  }

  // Pattern 17: Arrivée en salle d'attente (Ticket)
  const m17 = text.match(/^(.*?) \(Ticket N°\s*(.*?)\) vient de pointer son arrivée à l'accueil\.?/i);
  if (m17) {
    return `وصل ${m17[1]} (تذكرة رقم ${m17[2]}) وسجل حضوره في الاستقبال.`;
  }

  // Pattern 18: Arrivée accueil praticien
  const m18 = text.match(/^(.*?) vient de pointer son arrivée pour (.+?)\.?$/i);
  if (m18) {
    return `وصل ${m18[1]} وسجل حضوره لدى ${m18[2]}.`;
  }

  // Pattern 19: Praticien validé et activé en BDD
  const m19 = text.match(/^(.*?) \((.*?)\) a été validé et activé en BDD\.?/i);
  if (m19) {
    const spec = translateSpecialty(m19[2]);
    return `تمت المصادقة على ${m19[1]} (${spec}) وتفعيل حسابه في النظام.`;
  }

  // Pattern 20: Dossier praticien soumis en attente
  const m20 = text.match(/^(.*?) \((.*?)\) a soumis son dossier et attend votre validation\.?/i);
  if (m20) {
    const spec = translateSpecialty(m20[2]);
    return `قدم ${m20[1]} (${spec}) ملف انضمامه وفي انتظار موافقتك.`;
  }

  // Pattern 21: Sauvegarde automatique BDD
  if (/^Dump BDD .*?généré et synchronisé/i.test(text)) {
    return "تم إنشاء النسخة الاحتياطية لقاعدة البيانات ومزامنتها بنجاح.";
  }

  // Pattern 22: Bienvenue compte praticien validé
  const m22 = text.match(/^Bienvenue (.*?) ! Votre compte praticien a été validé sur SahaTN\.?/i);
  if (m22) {
    return `مرحباً بك ${m22[1]}! تم تفعيل حسابك الطبي في منصة SahaTN.`;
  }

  // Pattern 23: Doctor + Specialty
  const m23 = text.match(/^(Dr\..*?) \((.*?)\)$/);
  if (m23) {
    const spec = translateSpecialty(m23[2]);
    return `${m23[1]} (${spec})`;
  }

  return text;
}

export const formatExactNotificationTime = (n, lang = 'fr') => {
  if (!n) return '';
  let ms = n.timeMs;
  if (!ms && n.id) {
    const m = n.id.match(/notif-(\d+)/);
    if (m) ms = Number(m[1]);
  }
  if (!ms && n.createdAt) {
    const t = new Date(n.createdAt).getTime();
    if (!isNaN(t)) ms = t;
  }
  if (!ms) return n.timestamp || (lang === 'ar' ? 'الآن' : "À l'instant");

  const d = new Date(ms);
  if (isNaN(d.getTime())) return n.timestamp || (lang === 'ar' ? 'الآن' : "À l'instant");

  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getFullYear() === yesterday.getFullYear() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getDate() === yesterday.getDate();

  const locale = lang === 'ar' ? 'ar-TN' : 'fr-FR';
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return lang === 'ar' ? ('اليوم ' + timeStr) : ("Aujourd'hui " + timeStr);
  }
  if (isYesterday) {
    return lang === 'ar' ? ('أمس ' + timeStr) : ('Hier ' + timeStr);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString(locale, { month: 'short' });
  return day + ' ' + month + ' ' + timeStr;
};

export const getExactNotificationFull = (n) => {
  if (!n) return '';
  let ms = n.timeMs;
  if (!ms && n.id) {
    const m = n.id.match(/notif-(\d+)/);
    if (m) ms = Number(m[1]);
  }
  if (!ms) return n.timestamp || '';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return n.timestamp || '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
