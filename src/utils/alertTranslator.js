/**
 * SahaTN / Maw2idi — Global Bilingual Alert & API Message Translator (FR <-> AR)
 * Translates all backend API error/success responses and frontend alert/toast strings
 * dynamically according to the user's selected language ('fr' | 'ar').
 */

// Exact bilingual pairs [French, Arabic]
const EXACT_PAIRS = [
  // --- Auth & Passwords ---
  ['Le mot de passe actuel saisi est incorrect.', 'كلمة المرور الحالية التي أدخلتها غير صحيحة.'],
  ['Veuillez saisir votre mot de passe actuel pour modifier votre mot de passe.', 'يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور.'],
  ['Veuillez saisir votre mot de passe actuel.', 'يرجى إدخال كلمة المرور الحالية.'],
  ['Le nouveau mot de passe doit contenir au moins 6 caractères.', 'يجب أن تحتوي كلمة المرور الجديدة على 6 أحرف على الأقل.'],
  ['Le nouveau mot de passe doit comporter au moins 6 caractères.', 'يجب أن تحتوي كلمة المرور الجديدة على 6 أحرف على الأقل.'],
  ['Le mot de passe doit comporter au moins 6 caractères.', 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'],
  ['Le mot de passe doit comporter au moins 8 caractères.', 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.'],
  ['Le mot de passe doit contenir au moins une lettre majuscule.', 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z).'],
  ['Le mot de passe doit contenir au moins une lettre minuscule.', 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z).'],
  ['Le mot de passe doit contenir au moins un chiffre.', 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9).'],
  ['Le mot de passe doit contenir au moins un caractère spécial (!@#$%...).', 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$%...).'],
  ['Mot de passe manquant.', 'كلمة المرور مطلوبة.'],
  ['Les deux mots de passe saisis ne correspondent pas.', 'كلمتا المرور غير متطابقتين.'],
  ['Les mots de passe ne correspondent pas', 'كلمتا المرور غير متطابقتين.'],
  ['Les nouveaux mots de passe ne correspondent pas.', 'كلمتا المرور الجديدتان غير متطابقتين.'],
  ['Email et mot de passe requis.', 'البريد الإلكتروني وكلمة المرور مطلوبان.'],
  ['Email, mot de passe et nom complet requis.', 'البريد الإلكتروني وكلمة المرور والاسم الكامل مطلوبة.'],
  ['Identifiants invalides.', 'بيانات الدخول غير صحيحة.'],
  ['Identifiants invalides (email introuvable).', 'بيانات الدخول غير صحيحة (البريد الإلكتروني غير مسجل).'],
  ['Identifiants soignant incorrects.', 'بيانات الدخول للطبيب غير صحيحة.'],
  ['Cet email est déjà associé à un compte existant.', 'هذا البريد الإلكتروني مرتبط بالفعل بحساب موجود.'],
  ['Cette adresse email est déjà utilisée.', 'هذا البريد الإلكتروني مستخدم بالفعل.'],
  ['Compte créé avec succès !', 'تم إنشاء الحساب بنجاح!'],
  ['Profil utilisateur mis à jour avec succès.', 'تم تحديث الملف الشخصي بنجاح.'],
  ['Utilisateur introuvable.', 'المستخدم غير موجود.'],
  ['Compte utilisateur introuvable.', 'حساب المستخدم غير موجود.'],
  ['Déconnexion réussie. Jeton de session révoqué avec succès.', 'تم تسجيل الخروج بنجاح وإلغاء جلسة الدخول.'],
  ['Authentification requise.', 'يجب تسجيل الدخول أولاً.'],
  ['Accès refusé. Aucun jeton fourni.', 'تم رفض الوصول. يرجى تسجيل الدخول أولاً.'],
  ['Jeton JWT invalide ou expiré.', 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.'],
  ['Ce jeton de session a été révoqué (déconnexion effectuée). Veuillez vous reconnecter.', 'تم إنهاء هذه الجلسة. يرجى تسجيل الدخول من جديد.'],
  ['Accès refusé. Authentification Administrateur requise.', 'تم رفض الوصول. يتطلب صلاحية المدير.'],
  ['Accès réservé aux administrateurs.', 'هذا الفضاء مخصص للمديرين فقط.'],
  ['Accès réservé au praticien ou à l\'administrateur.', 'هذا الإجراء مخصص للطبيب أو المدير فقط.'],

  // --- 2FA & Forgot Password ---
  ['Code de sécurité à 6 chiffres généré avec succès.', 'تم إنشاء رمز الأمان المكون من 6 أرقام بنجاح.'],
  ['Nouveau code à 6 chiffres généré avec succès !', 'تم إرسال رمز جديد مكون من 6 أرقام بنجاح!'],
  ['Session 2FA expirée ou invalide. Veuillez vous reconnecter.', 'انتهت صلاحية جلسة التحقق الثنائي. يرجى تسجيل الدخول مجدداً.'],
  ['Session 2FA expirée.', 'انتهت صلاحية جلسة التحقق الثنائي.'],
  ['Code de sécurité expiré. Veuillez en redemander un nouveau.', 'انتهت صلاحية رمز الأمان. يرجى طلب رمز جديد.'],
  ['Trop de tentatives erronées. Veuillez vous reconnecter.', 'عدد المحاولات الخاطئة تجاوز الحد المسموح. يرجى إعادة تسجيل الدخول.'],
  ['Code 2FA invalide', 'رمز التحقق الثنائي غير صحيح.'],
  ['Code 2FA invalide ou expiré.', 'رمز التحقق الثنائي غير صحيح أو منتهي الصلاحية.'],
  ['Veuillez saisir un code à 6 chiffres.', 'يرجى إدخال رمز مكون من 6 أرقام.'],
  ['Une adresse email valide est requise.', 'يرجى إدخال بريد إلكتروني صحيح.'],
  ['Si un compte est associé à cette adresse email, un code de réinitialisation à 6 chiffres y a été envoyé.', 'إذا كان هذا البريد مسجلاً لدينا، فقد تم إرسال رمز إعادة تعيين مكون من 6 أرقام إليه.'],
  ['Jeton de réinitialisation et code à 6 chiffres requis.', 'رمز التحقق المكون من 6 أرقام مطلوب.'],
  ['Session de réinitialisation expirée ou introuvable. Veuillez refaire une demande.', 'انتهت صلاحية جلسة استرجاع كلمة المرور. يرجى إعادة المحاولة.'],
  ['Le code de sécurité a expiré (délai de 15 minutes dépassé). Veuillez refaire une demande.', 'انتهت صلاحية رمز الأمان (أكثر من 15 دقيقة). يرجى طلب رمز جديد.'],
  ['Trop de tentatives incorrectes (3/3). Veuillez refaire une demande de réinitialisation.', 'تم تجاوز عدد المحاولات المسموح (3/3). يرجى إعادة طلب رمز جديد.'],
  ['Code vérifié avec succès ! Vous pouvez maintenant définir votre nouveau mot de passe.', 'تم التحقق من الرمز بنجاح! يمكنك الآن تعيين كلمة مرور جديدة.'],
  ['Code de vérification invalide', 'رمز التحقق غير صحيح.'],
  ['Jeton de vérification et nouveau mot de passe requis.', 'كلمة المرور الجديدة مطلوبة.'],
  ['Session de réinitialisation expirée. Veuillez recommencer.', 'انتهت صلاحية الجلسة. يرجى البدء من جديد.'],
  ['Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'],

  // --- Google OAuth ---
  ['Jeton d\'accès Google invalide ou révoqué.', 'رمز الدخول عبر Google غير صالح أو تم إلغاؤه.'],
  ['Adresse email Google valide requise.', 'يتطلب بريد Google إلكتروني صالح.'],
  ['Impossible de récupérer l\'adresse email depuis le compte Google.', 'تعذر استرجاع البريد الإلكتروني من حساب Google.'],

  // --- Appointments & 4-Hour Cancellation ---
  ['Identifiant du médecin et nom du patient requis.', 'معرّف الطبيب واسم المريض مطلوبان.'],
  ['Impossible de réserver un créneau dans le passé.', 'لا يمكن حجز موعد في تاريخ قديم.'],
  ['Ce créneau horaire est déjà passé pour aujourd\'hui. Veuillez choisir une heure ultérieure.', 'لقد فات هذا التوقيت لليوم. يرجى اختيار توقيت لاحق.'],
  ['Ce créneau est déjà réservé par un autre patient. Veuillez choisir une autre heure.', 'هذا التوقيت محجوز بالفعل لمريض آخر. يرجى اختيار توقيت آخر.'],
  ['Ce créneau est bloqué par le médecin.', 'هذا التوقيت محجوز / مغلق من طرف الطبيب.'],
  ['Ce créneau est déjà bloqué.', 'هذا التوقيت مغلق بالفعل.'],
  ['Rendez-vous réservé avec succès !', 'تم حجز الموعد بنجاح!'],
  ['Rendez-vous introuvable.', 'الموعد غير موجود.'],
  ['Statut du rendez-vous mis à jour avec succès.', 'تم تحديث حالة الموعد بنجاح.'],
  ['Rendez-vous annulé avec succès. Le médecin a été notifié par email et le créneau a été libéré.', 'تم إلغاء الموعد بنجاح. تم إشعار الطبيب عبر البريد الإلكتروني وتحرير التوقيت.'],
  ['Accès non autorisé : vous ne pouvez annuler que vos propres rendez-vous.', 'غير مصرح لك: يمكنك إلغاء مواعيدك الخاصة فقط.'],
  ['Accès interdit : vous ne pouvez modifier que votre propre planning.', 'غير مصرح لك: يمكنك تعديل جدول مواعيدك الخاص فقط.'],
  ['Grille des horaires et disponibilités du médecin enregistrée.', 'تم حفظ جدول أوقات العمل والمواعيد المتاحة بنجاح.'],

  // --- Patient EHR, Documents, Dependents, Payments ---
  ['Accès non autorisé: Vous ne pouvez consulter que votre propre dossier médical.', 'غير مصرح لك: يمكنك الاطلاع على ملفك الطبي الخاص فقط.'],
  ['Accès non autorisé: Vous ne pouvez modifier que votre propre dossier médical.', 'غير مصرح لك: يمكنك تعديل ملفك الطبي الخاص فقط.'],
  ['Accès non autorisé à ce rendez-vous.', 'غير مصرح لك بالوصول إلى هذا الموعد.'],
  ['Accès non autorisé.', 'وصول غير مصرح به.'],
  ['Carnet de santé numérique sécurisé (chiffré AES-256-GCM) et mis à jour !', 'تم تحديث وحماية الدفتر الصحي الرقمي بنجاح (مشفر AES-256)!'],
  ['Votre carnet de santé numérique a été mis à jour et chiffré AES-256.', 'تم تحديث الدفتر الصحي الرقمي وتشفيره بمعيار AES-256 بنجاح.'],
  ['Le titre du document est requis.', 'عنوان الوثيقة مطلوب.'],
  ['Document médical ajouté avec succès au dossier !', 'تمت إضافة الوثيقة الطبية إلى الملف بنجاح!'],
  ['Le nom et le lien de parenté sont requis.', 'الاسم وصلة القرابة مطلوبان.'],
  ['Le paiement simulé est désactivé en production. Veuillez utiliser une passerelle de paiement vérifiée (Konnect / Flouci).', 'الدفع التجريبي معطل في وضع الإنتاج. يرجى استخدام بوابة دفع معتمدة (Konnect / Flouci).'],

  // --- Doctors, Onboarding, Prescriptions, Reviews, Queue ---
  ['Médecin introuvable.', 'الطبيب غير موجود.'],
  ['Demande introuvable.', 'الطلب غير موجود.'],
  ['Horaires du médecin enregistrés.', 'تم حفظ أوقات عمل الطبيب بنجاح.'],
  ['Profil du médecin mis à jour avec succès.', 'تم تحديث ملف الطبيب بنجاح.'],
  ['Accès interdit : vous ne pouvez modifier que vos propres horaires.', 'غير مصرح لك: يمكنك تعديل أوقات عملك الخاصة فقط.'],
  ['Accès interdit : vous ne pouvez modifier que votre propre profil praticien.', 'غير مصرح لك: يمكنك تعديل ملفك المهني الخاص فقط.'],
  ['La prescription doit contenir au moins un médicament.', 'يجب أن تحتوي الوصفة الطبية على دواء واحد على الأقل.'],
  ['La file d\'attente est vide.', 'قائمة الانتظار فارغة حالياً.'],
  ['Tous les patients ont été consultés !', 'تم فحص جميع المرضى في قائمة الانتظار!'],
  ['Notification envoyée au patient avec succès.', 'تم إرسال الإشعار للمريض بنجاح.'],
  ['L\'identifiant du médecin est requis.', 'معرّف الطبيب مطلوب.'],
  ['Le nom du patient connecté est requis pour soumettre un avis.', 'يجب تسجيل الدخول لإرسال تقييم.'],
  ['Avis certifié publié avec succès !', 'تم نشر تقييمك المعتمد بنجاح!'],
  ['reviewId et texte de réponse requis.', 'نص الرد مطلوب.'],
  ['Facture avec timbre fiscal 1.000 TND générée et téléchargée.', 'تم إنشاء وتحميل الفاتورة بالطابع الجبائي 1.000 د.ت بنجاح.'],
  ['Notes de téléconsultation enregistrées dans le Dossier Médical Partagé (EHR) avec succès !', 'تم حفظ ملاحظات الاستشارة عن بُعد في الملف الطبي المشترك بنجاح!'],
  ['Pour réinitialiser votre mot de passe, veuillez utiliser la récupération par email ou contacter le support SahaTN.', 'لاسترجاع كلمة المرور، يرجى استخدام خيار الاسترجاع عبر البريد الإلكتروني أو التواصل مع دعم موعدي.'],
  ['Veuillez renseigner le nom du patient.', 'يرجى إدخال اسم المريض.'],
  ['Veuillez renseigner le nom et l\'email de l\'utilisateur.', 'يرجى إدخال اسم المستخدم وبريده الإلكتروني.'],
  ['Veuillez renseigner le nom du praticien.', 'يرجى إدخال اسم الطبيب.'],
  ['Veuillez renseigner le nom.', 'يرجى إدخال الاسم.'],

  // --- Security, Rate Limiting, CSRF, Uploads, Validation ---
  ['Trop de tentatives d\'authentification. Veuillez patienter 15 minutes.', 'عدد محاولات تسجيل الدخول مرتفع جداً. يرجى الانتظار 15 دقيقة.'],
  ['Limite de requêtes atteinte sur ce service. Veuillez patienter une minute.', 'تم بلوغ الحد الأقصى للطلبات. يرجى الانتظار دقيقة واحدة.'],
  ['Limite de réservation atteinte. Veuillez patienter quelques minutes.', 'تم بلوغ الحد الأقصى للحجوزات. يرجى الانتظار بضع دقائق.'],
  ['Fréquence de requêtes anormalement élevée. Veuillez ralentir.', 'عدد الطلبات مرتفع بشكل غير طبيعي. يرجى التمهل قليلاً.'],
  ['Alerte Anti-CSRF : Jeton de sécurité invalide ou expiré.', 'تنبيه أمني: انتهت صلاحية رمز الأمان. يرجى تحديث الصفحة.'],
  ['Alerte Anti-CSRF : Jeton X-CSRF-Token requis pour les requêtes web mutantes.', 'تنبيه أمني: رمز الحماية مطلوب لتنفيذ هذه العملية.'],
  ['Alerte de sécurité : Tentative d\'injection de prototype interceptée.', 'تنبيه أمني: تم حظر طلب غير صالح.'],
  ['Corps de requête JSON invalide.', 'بيانات الطلب غير صالحة.'],
  ['Fichier requis.', 'يرجى إرفاق ملف.'],
  ['Fichier introuvable.', 'الملف غير موجود.'],
  ['Format de fichier encodé invalide.', 'صيغة الملف غير صالحة.'],
  ['Catégorie de fichier non autorisée.', 'فئة الملف غير مسموح بها.'],
  ['Erreur interne du serveur.', 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.'],
  ['Ressource introuvable.', 'المورد المطلوب غير موجود.'],
  ['Enregistrement Réussi', 'تم الحفظ بنجاح'],
  ['Attention / Erreur', 'تنبيه / خطأ'],
  ['Information', 'معلومة']
];

const FR_TO_AR = new Map();
const AR_TO_FR = new Map();
for (const [fr, ar] of EXACT_PAIRS) {
  FR_TO_AR.set(fr.trim(), ar);
  AR_TO_FR.set(ar.trim(), fr);
}

// Dynamic regex patterns (FR -> AR)
const DYNAMIC_FR_TO_AR = [
  {
    re: /^Mot de passe incorrect\.?\s*(\d+)\s*tentative\(s\)\s*restante\(s\)/i,
    fn: (m) => `كلمة المرور غير صحيحة. تبقى لديك ${m[1]} محاولة قبل التجميد المؤقت للحساب.`
  },
  {
    re: /^Compte verrouillé suite à (\d+) échecs consécutifs/i,
    fn: (m) => `تم تجميد الحساب مؤقتاً بعد ${m[1]} محاولات خاطئة متتالية. يرجى المحاولة بعد 15 دقيقة.`
  },
  {
    re: /^Compte temporairement verrouillé suite à (\d+) échecs consécutifs.*?(\d+)\s*minute/i,
    fn: (m) => `الحساب مجمد مؤقتاً بعد ${m[1]} محاولات خاطئة. يرجى إعادة المحاولة بعد ${m[2]} دقيقة.`
  },
  {
    re: /^Code à 6 chiffres incorrect\s*\((\d+)\s*essai\(s\)\s*restant\(s\)\)/i,
    fn: (m) => `الرمز المكون من 6 أرقام غير صحيح (تبقى ${m[1]} محاولة).`
  },
  {
    re: /^Annulation impossible à moins de (\d+) heures du rendez-vous/i,
    fn: (m) => `لا يمكن إلغاء الموعد قبل أقل من ${m[1]} ساعات من توقيته. يرجى الاتصال مباشرة بعيادة الطبيب.`
  },
  {
    re: /^Un email avec votre code de réinitialisation sécurisé à 6 chiffres a été envoyé avec succès à\s+(.+?)\./i,
    fn: (m) => `تم إرسال رمز إعادة التعيين المكون من 6 أرقام بنجاح إلى ${m[1]}. يرجى تفقد بريدك الإلكتروني.`
  },
  {
    re: /^Un code de réinitialisation sécurisé a été généré pour\s+(.+?)\./i,
    fn: (m) => `تم إنشاء رمز إعادة تعيين آمن للحساب ${m[1]}.`
  },
  {
    re: /^Le champ '([^']+)' est requis\.?$/i,
    fn: (m) => `الحقل '${m[1]}' إجباري.`
  },
  {
    re: /^Le champ '([^']+)' doit contenir au moins (\d+) caractère/i,
    fn: (m) => `يجب أن يحتوي الحقل '${m[1]}' على ${m[2]} أحرف على الأقل.`
  },
  {
    re: /^Le champ '([^']+)' ne doit pas dépasser (\d+) caractère/i,
    fn: (m) => `يجب ألا يتجاوز الحقل '${m[1]}' ${m[2]} حرفاً.`
  },
  {
    re: /^Le champ '([^']+)' doit être une adresse email valide/i,
    fn: (m) => `يجب إدخال بريد إلكتروني صحيح في الحقل '${m[1]}'.`
  },
  {
    re: /^Type de fichier non autorisé \(([^)]+)\)/i,
    fn: (m) => `نوع الملف غير مسموح به (${m[1]}). الصيغ المقبولة: JPG, PNG, WEBP, PDF.`
  },
  {
    re: /^Taille de fichier invalide \(maximum (\d+) Mo\)/i,
    fn: (m) => `حجم الملف يتجاوز الحد الأقصى المسموح به (${m[1]} ميغابايت).`
  },
  {
    re: /^Proche "([^"]+)" ajouté avec succès/i,
    fn: (m) => `تمت إضافة القريب "${m[1]}" بنجاح!`
  },
  {
    re: /^Le proche ([^ ]+) a été ajouté avec succès/i,
    fn: (m) => `تمت إضافة القريب ${m[1]} بنجاح إلى حساب العائلة.`
  },
  {
    re: /^Données du dossier patient synchronisées avec succès \(([^)]+)\)/i,
    fn: (m) => `تمت مزامنة بيانات ملفك الطبي بنجاح (${m[1]}).`
  },
  {
    re: /^Paiement (\S+) validé avec succès \(([^)]+)\)/i,
    fn: (m) => `تم تأكيد الدفع عبر ${m[1]} بنجاح (${m[2]})!`
  },
  {
    re: /^Accès interdit pour le rôle '([^']+)'/i,
    fn: () => 'غير مصرح لك بالوصول إلى هذه الميزة بصلاحيات حسابك الحالية.'
  },
  {
    re: /^HTTP error (\d+)$/i,
    fn: (m) => `خطأ في الاتصال بالخادم (رمز ${m[1]}).`
  },
  {
    re: /^Failed to fetch$|^NetworkError/i,
    fn: () => 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.'
  }
];

// Dynamic regex patterns (AR -> FR)
const DYNAMIC_AR_TO_FR = [
  {
    re: /^لا يمكن إلغاء الموعد قبل أقل من (\d+) ساعات/,
    fn: (m) => `Annulation impossible à moins de ${m[1]} heures du rendez-vous. Veuillez contacter directement le cabinet du médecin.`
  },
  {
    re: /^تمت مزامنة بيانات ملفك الطبي بنجاح \(([^)]+)\)/,
    fn: (m) => `Données du dossier patient synchronisées avec succès (${m[1]}).`
  }
];

export function getCurrentLang() {
  try {
    return localStorage.getItem('sahatn_lang') || document.documentElement.lang || 'fr';
  } catch {
    return 'fr';
  }
}

/**
 * Translates any alert / toast / API message into the requested language ('fr' or 'ar').
 */
export function translateAlertMessage(message, targetLang = getCurrentLang()) {
  if (!message || typeof message !== 'string') return message;
  const trimmed = message.trim();
  const isAr = targetLang === 'ar';

  if (isAr) {
    if (FR_TO_AR.has(trimmed)) return FR_TO_AR.get(trimmed);
    for (const rule of DYNAMIC_FR_TO_AR) {
      const match = trimmed.match(rule.re);
      if (match) return rule.fn(match);
    }
    return message;
  } else {
    if (AR_TO_FR.has(trimmed)) return AR_TO_FR.get(trimmed);
    for (const rule of DYNAMIC_AR_TO_FR) {
      const match = trimmed.match(rule.re);
      if (match) return rule.fn(match);
    }
    return message;
  }
}

export default translateAlertMessage;
