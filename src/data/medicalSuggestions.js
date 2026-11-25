// Medical suggestions engine tailored for Tunisian medical practices
// Intelligently suggests Diplomas & Cabinet Equipment based on:
// 1. Doctor's selected specialty (Cardiology, Pediatrics, Dentistry, Gynecology, etc.)
// 2. Doctor's already inserted diplomas (e.g. Echo diploma -> suggests Echo Doppler equipment)
// 3. Doctor's already configured equipment (e.g. Holter device -> suggests Rythmology DIU)
// 4. Core foundational standards in Tunisia (Ordre des Médecins, Faculté de Médecine, etc.)

export const SPECIALTY_SUGGESTIONS = {
  cardio: {
    id: "cardio",
    fr: "Cardiologie & Maladies Vasculaires",
    ar: "أمراض القلب والأوعية الدموية",
    icon: "🫀",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Cardiologie", ar: "شهادة الدراسات المتخصصة في أمراض القلب" },
      { fr: "Diplôme Universitaire d'Échocardiographie Doppler Cardiaque", ar: "دبلوم جامعي في صدى القلب دوبلر" },
      { fr: "DIU Rythmologie et Stimulation Cardiaque (Pacemaker)", ar: "دبلوم في اضطرابات نبضات القلب والتحفيز القلبي" },
      { fr: "DIU Cardiologie Interventionnelle & Coronarographie", ar: "دبلوم في أمراض القلب التداخلية والقسطرة" },
      { fr: "Membre de la Société Tunisienne de Cardiologie (STCCCV)", ar: "عضو بالجمعية التونسية لأمراض وجراحة القلب" },
      { fr: "Ancien Chef de Clinique / Interne en Cardiologie (Tunis)", ar: "طبيب مقيم سابق / رئيس عيادة في أمراض القلب" },
      { fr: "Diplôme d'Épreuve d'Effort et Réadaptation Cardiovasculaire", ar: "دبلوم في اختبار الجهد والتأهيل القلبي الوعائي" },
      { fr: "Attestation d'Expertise en Hypertension Artérielle (HTA)", ar: "شهادة كفاءة في علاج ضغط الدم المرتفع" }
    ],
    equipment: [
      { fr: "Échographe Doppler Cardiaque Haute Définition", ar: "جهاز تخطيط صدى القلب دوبلر عالي الدقة" },
      { fr: "Électrocardiographe Numérique 12 Pistes (ECG)", ar: "جهاز تخطيط القلب الكهربائي الرقمي 12 مساراً" },
      { fr: "Dispositif Holter MAPA Tensionnel 24h", ar: "جهاز هولتر لمراقبة ضغط الدم 24 ساعة" },
      { fr: "Enregistreur Holter ECG Rythmique 24h/48h", ar: "جهاز هولتر لتسجيل نبضات القلب المستمر" },
      { fr: "Tapis Roulant d'Épreuve d'Effort Cardiologique", ar: "بساط اختبار الجهد القلبي المتطور" },
      { fr: "Défibrillateur Automatisé Externe (DAE)", ar: "جهاز مزيل الرجفان القلبي الآلي الخارجي" },
      { fr: "Tensiomètre Professionnel & Oxymètre SpO2 Connecté", ar: "جهاز قياس الضغط ونسبة الأكسجين الذكي" },
      { fr: "Table d'examen cardiologique inclinable électrique", ar: "طاولة فحص قلبية كهربائية قابلة للتعديل" },
      { fr: "Sonde d'échocardiographie transœsophagienne (ETO)", ar: "مسبار صدى القلب عبر المريء" }
    ]
  },

  pediatrie: {
    id: "pediatrie",
    fr: "Pédiatrie & Néonatologie",
    ar: "طب الأطفال وحديثي الولادة",
    icon: "👶",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Pédiatrie", ar: "شهادة الدراسات المتخصصة في طب الأطفال" },
      { fr: "DIU Réanimation Néonatale et Soins Intensifs du Nouveau-né", ar: "دبلوم إنعاش حديثي الولادة والعناية المركزة" },
      { fr: "DIU Urgences et Réanimation Pédiatriques", ar: "دبلوم طوارئ وإنعاش الأطفال" },
      { fr: "Diplôme Universitaire de Pneumo-Allergologie Pédiatrique", ar: "دبلوم في حساسية وأمراض صدر الأطفال" },
      { fr: "DIU Gastro-Entérologie et Nutrition Pédiatrique", ar: "دبلوم أمراض الجهاز الهضمي وتغذية الأطفال" },
      { fr: "Membre de la Société Tunisienne de Pédiatrie (STP)", ar: "عضو بالجمعية التونسية لطب الأطفال" },
      { fr: "Diplôme de Développement et Psychomotricité de l'Enfant", ar: "دبلوم النمو والتطور الحركي والنفسي للطفل" },
      { fr: "Ancien Interne des Hôpitaux d'Enfants (Hôpital Bechir Hamza)", ar: "طبيب مقيم سابق بمستشفى الأطفال بباب سعدون" }
    ],
    equipment: [
      { fr: "Pèse-bébé électronique de haute précision & Toise", ar: "ميزان أطفال إلكتروني فائق الدقة ومقياس القامة" },
      { fr: "Otoscope & Ophtalmoscope pédiatrique à fibre optique", ar: "منظار أذن وعين مخصص للأطفال بالألياف البصرية" },
      { fr: "Bilirubinomètre transcutané non-invasif (BiliCheck)", ar: "جهاز قيس الصفراء للرضع دون وخز (بيليروبين)" },
      { fr: "Nébuliseur pédiatrique & Système d'Aérosolthérapie silencieux", ar: "جهاز الرذاذ واستنشاق الدواء للأطفال فائق الهدوء" },
      { fr: "Saturomètre pédiatrique & Capteurs néonataux SpO2", ar: "جهاز قياس الأكسجين للأطفال وحديثي الولادة" },
      { fr: "Table à langer médicale chauffante avec matelas désinfectable", ar: "طاولة فحص وتغيير للأطفال مدفأة ومعقمة" },
      { fr: "Éclairage d'examen dermo-pédiatrique LED sans chaleur", ar: "إضاءة فحص جلدية باردة مخصصة للأطفال" },
      { fr: "Dossier informatisé avec courbes de croissance OMS intégrées", ar: "نظام إلكتروني لمتابعة منحنيات النمو المعتمدة عالمياً" }
    ]
  },

  dentiste: {
    id: "dentiste",
    fr: "Chirurgie Dentaire & Implantologie",
    ar: "جراحة وتجميل الأسنان وزراعتها",
    icon: "🦷",
    diplomas: [
      { fr: "Diplôme d'État de Docteur en Médecine Dentaire (Monastir)", ar: "شهادة دولة دكتور في طب وجراحة الأسنان (المنستير)" },
      { fr: "Certificat d'Études Supérieures (CES) en Parodontologie", ar: "شهادة دراسات عليا في علاج وجراحة اللثة" },
      { fr: "CES en Implantologie Orale et Chirurgie Pré-implantaire", ar: "شهادة دراسات عليا في زراعة الأسنان" },
      { fr: "CES en Orthodontie et ODF (Orthopédie Dento-Faciale)", ar: "شهادة دراسات عليا في تقويم الأسنان والفكين" },
      { fr: "Diplôme Universitaire d'Endodontie Clinique et Chirurgicale", ar: "دبلوم جامعي في علاج جذور وأعصاب الأسنان" },
      { fr: "Attestation en Esthétique Dentaire, Facettes et Blanchiment", ar: "شهادة في تجميل الأسنان والقشور الخزفية والتبييض" },
      { fr: "Membre du Conseil de l'Ordre des Médecins Dentistes de Tunisie", ar: "مرسم بعمادة أطباء الأسنان بالبلاد التونسية" }
    ],
    equipment: [
      { fr: "Fauteuil dentaire ergonomique ambidextre multifonction", ar: "كرسي علاج أسنان كهربائي حديث ومتكامل" },
      { fr: "Radio panoramique numérique & Cone Beam 3D (CBCT)", ar: "جهاز أشعة بانوراما وثلاثي الأبعاد للفكين (CBCT)" },
      { fr: "Capteur de radiographie intra-orale numérique HD", ar: "حساس تصوير رقمي فموي فوري عالي الوضوح" },
      { fr: "Stérilisateur Autoclave Médical Classe B avec traçabilité", ar: "جهاز تعقيم طبي أوتوكلاف من الصنف B" },
      { fr: "Moteur d'endodontie numérique & Localisateur d'apex", ar: "محرك علاج الجذور الرقمي مع محدد قمة الجذر" },
      { fr: "Lampe à photopolymériser LED ultra-puissante", ar: "مصباح ضوئي عالي القوة لتثبيت حشوات الأسنان" },
      { fr: "Détartreur piézo-électrique ultrasonique & Aéropolisseur", ar: "جهاز تنظيف وتلميع الأسنان بالموجات الصوتية" },
      { fr: "Caméra intra-orale HD de diagnostic et d'explication", ar: "كاميرا فموية دقيقة لعرض الحالة للمريض" },
      { fr: "Moteur de chirurgie implantaire et contre-angle LED", ar: "محرك جراحي دقيق لزراعة الأسنان مزود بإضاءة LED" }
    ]
  },

  gyneco: {
    id: "gyneco",
    fr: "Gynécologie Obstétrique & PMA",
    ar: "أمراض النساء والتوليد والمساعدة على الإنجاب",
    icon: "🤰",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Gynécologie-Obstétrique", ar: "شهادة التخصص في أمراض النساء والتوليد" },
      { fr: "DIU d'Échographie Gynécologique et Obstétricale", ar: "دبلوم جامعي في فحص صدى الرحم والجنين" },
      { fr: "DIU de Médecine et Biologie de la Reproduction (PMA / FIV)", ar: "دبلوم الطب والمساعدة على الإنجاب وأطفال الأنابيب" },
      { fr: "Diplôme de Cœlioscopie et Chirurgie Gynécologique Minimale", ar: "دبلوم جراحة المنظار البطني والرحمي الدقيق" },
      { fr: "DIU de Colposcopie et Pathologie Cervico-Vaginale", ar: "دبلوم منظار عنق الرحم والتشخيص المبكر للأورام" },
      { fr: "Membre du Collège National des Gynécologues Obstétriciens (CNGOF)", ar: "عضو بالهيئة الوطنية لأطباء التوليد وأمراض النساء" },
      { fr: "Diplôme Universitaire de Sénologie et Pathologie Mammaire", ar: "دبلوم جامعي في أمراض وجراحة الثدي" }
    ],
    equipment: [
      { fr: "Échographe 3D/4D Haute Résolution Obstétrique et Gynécologique", ar: "جهاز صدى صوتي ثلاثي ورباعي الأبعاد للولادة والجنين" },
      { fr: "Colposcope vidéo HD avec double écran de contrôle", ar: "منظار عنق الرحم بالفيديو عالي الدقة مع شاشة للمريضة" },
      { fr: "Monitoring fœtal gémellaire (Cardiotocographe RCF)", ar: "جهاز تخطيط ومراقبة نبضات الجنين والتقلصات الرحمية" },
      { fr: "Table d'examen gynécologique électrique ergonomique avec étriers", ar: "طاولة فحص نسائي كهربائية مريحة وقابلة للتعديل" },
      { fr: "Doppler fœtal de poche haute sensibilité", ar: "جهاز دوبلر محمول لسماع نبضات قلب الجنين" },
      { fr: "Stérilisateur Autoclave Médical Classe B", ar: "جهاز تعقيم طبي أوتوكلاف من الصنف B" },
      { fr: "Bistouri électrique de haute fréquence / Résecteur gynécologique", ar: "مشرط كهربائي عالي التردد للاستئصال الدقيق" },
      { fr: "Matériel de prélèvement et de biopsie stérile à usage unique", ar: "أدوات أخذ العينات والمسحات المعقمة وحيدة الاستعمال" }
    ]
  },

  ophtalmo: {
    id: "ophtalmo",
    fr: "Ophtalmologie & Chirurgie Réfractive",
    ar: "أمراض وجراحة العيون وتصحيح النظر",
    icon: "👁️",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Ophtalmologie", ar: "شهادة التخصص في أمراض وجراحة العيون" },
      { fr: "DIU Chirurgie Réfractive, Lasers et Phacoémulsification de la Cataracte", ar: "دبلوم تصحيح النظر بالليزر وجراحة المياه البيضاء" },
      { fr: "DIU Imagerie Rétinienne, DMLA et Traitements par Laser Rétinien", ar: "دبلوم تصوير الشبكية وعلاج أمراض القاع بالليزر" },
      { fr: "Diplôme de Contactologie Médicale et Adaptation des Lentilles", ar: "دبلوم العدسات اللاصقة الطبية وتعديل الرؤية" },
      { fr: "DIU Glaucome et Diagnostic de Pression Intra-Oculaire", ar: "دبلوم تشخيص وعلاج ضغط العين (الجلوكوما)" },
      { fr: "Membre de la Société Tunisienne d'Ophtalmologie (STO)", ar: "عضو بالجمعية التونسية لطب العيون" },
      { fr: "Diplôme de Chirurgie des Paupières et des Voies Lacrymales", ar: "دبلوم جراحة الجفون والقنوات الدمعية" }
    ],
    equipment: [
      { fr: "Lampe à fente biomicroscopique avec caméra HD numérique", ar: "مصباح الشق البيولوجي المزود بكاميرا رقمية دقيقة" },
      { fr: "Tonomètre à aplanation / non-contact à air pulsé", ar: "جهاز قياس ضغط العين بدون ملامسة بالهواء" },
      { fr: "Réfractomètre / Kératomètre automatique haute précision", ar: "جهاز قياس درجات النظر وانحناء القرنية التلقائي" },
      { fr: "Tomographe par Cohérence Optique (OCT) rétinien et maculaire", ar: "جهاز تصوير مقطعي للبقعة والشبكية وعصب العين (OCT)" },
      { fr: "Périmètre de champ visuel automatisé informatisé", ar: "جهاز فحص مجال الرؤية الإلكتروني الآلي" },
      { fr: "Projecteur de tests d'acuité visuelle LCD polarisé", ar: "شاشة عرض فحص قياس النظر LCD الرقمية" },
      { fr: "Frontofocomètre numérique automatique pour contrôle verres", ar: "جهاز قياس وتدقيق درجات عدسات النظارات الرقمي" },
      { fr: "Ophtalmoscope binoculaire indirect et lentilles d'examen", ar: "منظار فحص قاع العين المزدوج المباشر وغير المباشر" }
    ]
  },

  dermato: {
    id: "dermato",
    fr: "Dermatologie & Vénérologie",
    ar: "الأمراض الجلدية والتناسلية وتجميل الجلد",
    icon: "🧴",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Dermatologie-Vénérologie", ar: "شهادة التخصص في الأمراض الجلدية والتناسلية" },
      { fr: "DIU Dermatoscopie Optique et Imagerie Cutanée Numérique", ar: "دبلوم تنظير الجلد والتصوير الرقمي للشامات والأورام" },
      { fr: "DIU Dermatologie Esthétique, Lasers Médicaux et Cosmétologie", ar: "دبلوم الجلدية التجميلية والليزر الطبي التجميلي" },
      { fr: "DIU Chirurgie Dermatologique et Cancérologie Cutanée", ar: "دبلوم جراحة الجلد واستئصال أورام البشرة" },
      { fr: "Diplôme Universitaire de Dermatologie Pédiatrique", ar: "دبلوم جامعي في أمراض جلد الأطفال" },
      { fr: "Membre de la Société Tunisienne de Dermatologie (STD)", ar: "عضو بالجمعية التونسية للأمراض الجلدية" },
      { fr: "Attestation en Photothérapie, Psoriasis et Allergologie Cutanée", ar: "شهادة في العلاج بالضوء والحساسية الجلدية" }
    ],
    equipment: [
      { fr: "Dermatoscope numérique polarisé HD avec liaison informatique", ar: "منظار الجلد الرقمي المستقطب عالي الدقة للشامات" },
      { fr: "Appareil de Cryothérapie à azote liquide (Cryocautère)", ar: "جهاز العلاج بالتبريد بالنيتروجين السائل للزوائد الجلدية" },
      { fr: "Lampe de Wood ultraviolette pour diagnostic mycosique et pigmentaire", ar: "مصباح وود بالأشعة فوق البنفسجية لتشخيص الفطريات" },
      { fr: "Bistouri électrique / Électrocoagulateur dermatologique de précision", ar: "مشرط كهربائي طبي دقيق للتخثير وإزالة الزوائد" },
      { fr: "Lampe opératoire scialytique LED sans ombre", ar: "إضاءة جراحية طبية LED باردة بدون ظلال" },
      { fr: "Kit complet de biopsie cutanée stérile (Punches et curettes)", ar: "مجموعة أدوات أخذ الخزعات الجلدية المعقمة" },
      { fr: "Dispositif de Laser Dermatologique vasculaire / pigmentaire", ar: "جهاز ليزر جلدي طبي لعلاج الأوعية والتصبغات" },
      { fr: "Cabine / Panneau de Photothérapie UVB à bande étroite", ar: "وحدة علاج ضوئي UVB للأكزيما والصدفية والبهاق" }
    ]
  },

  orthopedie: {
    id: "orthopedie",
    fr: "Chirurgie Orthopédique & Traumatologie",
    ar: "جراحة العظام والمفاصل والكسور والإصابات الرياضية",
    icon: "🦴",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Chirurgie Orthopédique", ar: "شهادة التخصص في جراحة العظام والمفاصل" },
      { fr: "DIU Chirurgie de la Hanche et du Genou (Prothèses articulaires)", ar: "دبلوم جراحة وزراعة مفاصل الورك والركبة الاصطناعية" },
      { fr: "DIU Arthroscopie et Traumatologie du Sport", ar: "دبلوم جراحة المفاصل بالمنظار وإصابات الملاعب" },
      { fr: "DIU Chirurgie de la Main, du Poignet et Microchirurgie", ar: "دبلوم جراحة اليد والأعصاب الطرفية والجراحة المجهرية" },
      { fr: "Diplôme Universitaire de Traumatologie Ostéo-Articulaire", ar: "دبلوم جامعي في علاج الكسور والإصابات المفصلية" },
      { fr: "Membre de la Société Tunisienne de Chirurgie Orthopédique (SOTCOT)", ar: "عضو بالجمعية التونسية لجراحة العظام والمفاصل" }
    ],
    equipment: [
      { fr: "Négatoscope / Écran d'imagerie haute définition pour radiographies", ar: "شاشة فحص وتدقيق صور الأشعة السينية عالية الوضوح" },
      { fr: "Échographe ostéo-articulaire et musculo-squelettique avec Doppler", ar: "جهاز فحص الصدى للمفاصل والأربطة والأوتار العضلية" },
      { fr: "Scie à plâtre médicale oscillante avec aspirateur de poussière", ar: "منشار جبس طبي آمن مع مكنسة شفط مدمجة" },
      { fr: "Table d'examen orthopédique renforcée motorisée", ar: "طاولة فحص عظام مقواة وقابلة لتعديل الارتفاع كهربائياً" },
      { fr: "Matériel d'immobilisation, attelles thermoformables et résines", ar: "معدات تجبير وتثبيت الكسور والجبائر الحديثة المقواة" },
      { fr: "Appareil d'ondes de choc radiales (Shockwave therapy)", ar: "جهاز العلاج بالموجات التصادمية للأوتار والتكلسات" },
      { fr: "Goniomètre et dynamomètre de mesure des amplitudes articulaires", ar: "مقياس دقيق لمدى حركة المفاصل وقوة العضلات" }
    ]
  },

  orl: {
    id: "orl",
    fr: "Oto-Rhino-Laryngologie (ORL)",
    ar: "أمراض وجراحة الأنف والأذن والحنجرة",
    icon: "👂",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Oto-Rhino-Laryngologie (ORL)", ar: "شهادة التخصص في طب وجراحة الأنف والأذن والحنجرة" },
      { fr: "DIU Audiophonologie et Explorations Fonctionnelles de l'Audition", ar: "دبلوم فحص وظائف السمع وتخطيط السمعيات" },
      { fr: "DIU Chirurgie Endonasale, des Sinus et de la Base du Crâne", ar: "دبلوم جراحة الجيوب الأنفية والمنظار الأنفي" },
      { fr: "DIU Vertiges, Troubles de l'Équilibre et Vestibulométrie", ar: "دبلوم تشخيص وعلاج الدوار واضطرابات التوازن" },
      { fr: "Diplôme de Cancérologie et Chirurgie Cervico-Faciale", ar: "دبلوم جراحة أورام الرأس والعنق والوجه" },
      { fr: "Membre de la Société Tunisienne d'ORL (STORL)", ar: "عضو بالجمعية التونسية لأمراض الأنف والأذن والحنجرة" }
    ],
    equipment: [
      { fr: "Unité de consultation ORL complète avec aspiration chirurgicale", ar: "وحدة فحص أنف وأذن وحنجرة متكاملة مع نظام شفط" },
      { fr: "Vidéo-fibroscope nasopharyngo-laryngé souple HD", ar: "منظار مرن بالألياف البصرية عالي الدقة للأنف والحنجرة" },
      { fr: "Audiomètre clinique de dépistage et cabine / casque insonorisé", ar: "جهاز تخطيط السمع الطبي مع سماعات عازلة للصوت" },
      { fr: "Tympanomètre d'impédancemétrie pour évaluation tympanique", ar: "جهاز فحص ضغط الأذن الوسطى وحركة غشاء الطبل" },
      { fr: "Otomicroscope chirurgical de consultation binoculaire", ar: "مجهر فحص الأذن الجراحي المزدوج الدقيق" },
      { fr: "Lunettes de Frenzel / Vidéonystagmoscope pour exploration du vertige", ar: "نظارات فرينزل لتشخيص حركة العين في حالات الدوار" },
      { fr: "Seringue à lavage d'oreille thermostatique électronique", ar: "جهاز غسيل وتنظيف الأذن الإلكتروني الموجه بالحرارة" }
    ]
  },

  psy: {
    id: "psy",
    fr: "Psychiatrie & Santé Mentale",
    ar: "الطب النفسي والأمراض العصبية والنفسية",
    icon: "🧠",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Psychiatrie", ar: "شهادة التخصص في الطب النفسي" },
      { fr: "Diplôme Universitaire de Thérapies Cognitives et Comportementales (TCC)", ar: "دبلوم العلاج المعرفي السلوكي (TCC)" },
      { fr: "DIU Addictologie Clinique et Prise en charge des Dépendances", ar: "دبلوم علاج الإدمان والاضطرابات السلوكية" },
      { fr: "Diplôme de Pédopsychiatrie et Santé Mentale de l'Adolescent", ar: "دبلوم الطب النفسي للأطفال والمراهقين" },
      { fr: "Membre de la Société Tunisienne de Psychiatrie (STP)", ar: "عضو بالجمعية التونسية للطب النفسي" },
      { fr: "Attestation en Psychotraumatologie et Thérapie EMDR", ar: "شهادة في علاج الصدمات النفسية وتقنية EMDR" }
    ],
    equipment: [
      { fr: "Fauteuil relaxant ergonomique pour psychothérapie individuelle", ar: "كرسي استرخاء طبي مريح لجلسات العلاج النفسي" },
      { fr: "Cabinet insonorisé avec isolation acoustique certifiée", ar: "عيادة معزولة صوتياً لضمان السرية والهدوء التام" },
      { fr: "Logiciel d'évaluation psychométrique et tests informatisés (Beck, Hamilton)", ar: "برمجية تقييم الاختبارات النفسية ومقاييس الاكتئاب والقلق" },
      { fr: "Dispositif de Biofeedback et Cohérence Cardiaque guidée", ar: "جهاز التغذية الراجعة البيولوجية والتنفس العلاجي" },
      { fr: "Équipement de luminothérapie médicale pour troubles saisonniers", ar: "جهاز العلاج بالضوء الطبي للاكتئاب الموسمي" }
    ]
  },

  neuro: {
    id: "neuro",
    fr: "Neurologie & Neurochirurgie",
    ar: "أمراض وجراحة الجهاز العصبي والدماغ",
    icon: "⚡",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Neurologie", ar: "شهادة التخصص في أمراض الأعصاب" },
      { fr: "DIU Électroencéphalographie (EEG) et Épileptologie Clinique", ar: "دبلوم تخطيط كهربية الدماغ والصرع السريري" },
      { fr: "DIU Électromyographie (EMG) et Pathologies Neuromusculaires", ar: "دبلوم تخطيط عضلات وأعصاب الأطراف (EMG)" },
      { fr: "DIU Pathologie Neurovasculaire (AVC) et Neuro-imagerie", ar: "دبلوم الجلطات الدماغية وتصوير الجهاز العصبي" },
      { fr: "Membre de la Société Tunisienne de Neurologie (STN)", ar: "عضو بالجمعية التونسية لأمراض الأعصاب" }
    ],
    equipment: [
      { fr: "Appareil d'Électroencéphalographie (EEG) numérique multi-canaux", ar: "جهاز تخطيط كهربية الدماغ الرقمي المتطور" },
      { fr: "Électromyographe (EMG) pour conduction nerveuse et potentiels évoqués", ar: "جهاز تخطيط حركة الأعصاب وسرعة التوصيل العضلي" },
      { fr: "Doppler transcrânien pour surveillance vasculaire cérébrale", ar: "جهاز دوبلر عبر الجمجمة لفحص شرايين الدماغ" },
      { fr: "Marteau réflexe neurologique Babinski & Diapasons gradués", ar: "مجموعة مطارق عصبية وشوكات رنانة لتقييم الإحساس" }
    ]
  },

  gastro: {
    id: "gastro",
    fr: "Gastro-Entérologie & Hépatologie",
    ar: "أمراض الجهاز الهضمي والكبد والمناظير",
    icon: "🫀",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Gastro-Entérologie", ar: "شهادة التخصص في أمراض الجهاز الهضمي والكبد" },
      { fr: "DIU Écho-endoscopie et Endoscopie Digestive Interventionnelle", ar: "دبلوم مناظير الجهاز الهضمي المتقدمة والتدخلية" },
      { fr: "DIU Hépatologie Clinique et Maladies Hépatiques Chroniques", ar: "دبلوم أمراض الكبد المزمنة والفيروسات الكبدية" },
      { fr: "DIU Maladies Inflammatoires Chroniques de l'Intestin (MICI - Crohn)", ar: "دبلوم أمراض الأمعاء الالتهابية المزمنة (كرون والقولون)" },
      { fr: "DIU Proctologie Médico-Chirurgicale", ar: "دبلوم أمراض وجراحة الشرج والمستقيم" },
      { fr: "Membre de la Société Tunisienne de Gastro-Entérologie (STGE)", ar: "عضو بالجمعية التونسية لأمراض الجهاز الهضمي" }
    ],
    equipment: [
      { fr: "Vidéo-endoscope gastro-duodénal et coloscope HD avec processeur", ar: "منظار المعدة والقولون بالفيديو عالي الدقة مع وحدة المعالجة" },
      { fr: "Système de désinfection et laveur automatique d'endoscopes", ar: "جهاز الغسيل والتعقيم الآلي المعتمد للمناظير" },
      { fr: "FibroScan / Élastométrie impulsionnelle hépatique non-invasive", ar: "جهاز فيبروسكان لقياس مرونة وتليف الكبد بدون وخز" },
      { fr: "Échographe abdominal avec sonde convexe et Doppler hépatique", ar: "جهاز صدى بطني مع مسبار مخصص لفحص الكبد والأحشاء" },
      { fr: "Test respiratoire à l'urée pour diagnostic Helicobacter Pylori", ar: "جهاز اختبار التنفس الدقيق لجرثومة المعدة الحلزونية" }
    ]
  },

  pneumo: {
    id: "pneumo",
    fr: "Pneumologie & Allergologie",
    ar: "أمراض الصدر والجهاز التنفسي والحساسية",
    icon: "🫁",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Pneumologie", ar: "شهادة التخصص في أمراض الرئة والصدر" },
      { fr: "DIU Sommeil et Troubles Respiratoires Obstructifs (Apnée du Sommeil)", ar: "دبلوم اضطرابات النوم وتوقف التنفس أثناء النوم" },
      { fr: "DIU Explorations Fonctionnelles Respiratoires (EFR) et Spirométrie", ar: "دبلوم وظائف الرئة واختبارات قياس التنفس" },
      { fr: "DIU Allergologie et Immunologie Clinique Respiratoire", ar: "دبلوم الحساسية التنفسية والمناعة السريرية" },
      { fr: "DIU Endoscopie Bronchique et Fibroscopie Pulmonaire", ar: "دبلوم تنظير القصبات الهوائية والألياف الرئوية" },
      { fr: "Membre de la Société Tunisienne de Pneumologie (STP)", ar: "عضو بالجمعية التونسية لأمراض الصدر" }
    ],
    equipment: [
      { fr: "Spiromètre informatisé de précision avec courbe débit-volume", ar: "جهاز قياس وظائف الرئة الإلكتروني الدقيق مع الرسم البياني" },
      { fr: "Dispositif de Polygraphie ventilatoire ambulatoire du sommeil", ar: "جهاز تخطيط النوم المنزلي لقياس انقطاع التنفس" },
      { fr: "Saturomètre oxymètre de pouls avec enregistrement nocturne continu", ar: "مقياس نسبة الأكسجين في الدم مع تسجيل ليلي مستمر" },
      { fr: "Kit complet de tests cutanés allergologiques (Prick-tests respiratoires)", ar: "مجموعة فحوصات وخز الجلد لحساسية الصدر وحبوب اللقاح" },
      { fr: "Nébuliseur ultrasonique professionnel pour aérosolthérapie pulmonaire", ar: "جهاز تبخير ورذاذ طبي للموجات فوق الصوتية للربو" },
      { fr: "Débitmètre de pointe électronique (Peak Flow Meter)", ar: "مقياس سرعة الزفير الإلكتروني لمتابعة مرضى الربو" }
    ]
  },

  endocrino: {
    id: "endocrino",
    fr: "Endocrinologie & Diabétologie",
    ar: "أمراض الغدد الصماء والسكري والتغذية",
    icon: "🧬",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Endocrinologie et Métabolisme", ar: "شهادة التخصص في الغدد الصماء والتمثيل الغذائي" },
      { fr: "DIU Éducation Thérapeutique du Patient Diabétique et Insulinothérapie", ar: "دبلوم التثقيف العلاجي لمرضى السكري والعلاج بالأنسولين" },
      { fr: "DIU Pathologies Thyroïdiennes et Échographie Cervicale", ar: "دبلوم أمراض الغدة الدرقية وفحص الصدى العنقي" },
      { fr: "DIU Nutrition Clinique, Diététique et Prise en charge de l'Obésité", ar: "دبلوم التغذية السريرية وعلاج السمنة والوزن الزائد" },
      { fr: "Membre de la Société Tunisienne d'Endocrinologie (STEDIAM)", ar: "عضو بالجمعية التونسية لأمراض الغدد والسكري" }
    ],
    equipment: [
      { fr: "Analyseur instantané d'HbA1c (Hémoglobine glyquée) capillaire", ar: "جهاز قياس السكر التراكمي الفوري في بضع دقائق" },
      { fr: "Échographe thyroïdien et cervical avec Doppler couleur", ar: "جهاز صدى صوتي مخصص لفحص الغدة الدرقية والغدد اللمفاوية" },
      { fr: "Lecteurs et applicateurs de capteurs de glucose en continu (CGM)", ar: "أجهزة قراءة ومتابعة السكر المستمر بدون وخز" },
      { fr: "Monofilament de Semmes-Weinstein et diapason pour pied diabétique", ar: "خيط الفحص الحسي وشوكة رنانة للكشف المبكر عن القدم السكرية" },
      { fr: "Impédancemètre médical professionnel pour analyse de composition corporelle", ar: "ميزان كشف كتلة الدهون والعضلات والماء المعتمد طبياً" }
    ]
  },

  urologie: {
    id: "urologie",
    fr: "Chirurgie Urologique & Andrologie",
    ar: "جراحة الكلى والمسالك البولية والتناسلية والعقم عند الرجال",
    icon: "🩸",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Chirurgie Urologique", ar: "شهادة التخصص في جراحة المسالك البولية والتناسلية" },
      { fr: "DIU Cœlioscopie et Robotique en Chirurgie Urologique", ar: "دبلوم جراحة المسالك البولية بالمنظار والجراحة الروبوتية" },
      { fr: "DIU Andrologie, Infertilité Masculine et Dysfonctions Sexuelles", ar: "دبلوم الذكورة وعلاج العقم والضعف الجنسي عند الرجال" },
      { fr: "DIU Cancérologie Urologique (Prostate, Rein, Vessie)", ar: "دبلوم أورام المسالك البولية (البروستاتا، الكلى، المثانة)" },
      { fr: "Membre de l'Association Tunisienne d'Urologie (ATU)", ar: "عضو بالجمعية التونسية لجراحة الكلى والمسالك البولية" }
    ],
    equipment: [
      { fr: "Échographe rénal, vésical et prostatique avec sonde endorectale", ar: "جهاز صدى صوتي للكلى والمثانة مع مسبار فحص البروستاتا" },
      { fr: "Débitmètre urinaire (Uroflowmètre) informatisé de précision", ar: "جهاز قياس تدفق وسرعة البول الرقمي الدقيق" },
      { fr: "Vidéo-cystoscope souple stérile pour exploration vésicale sans douleur", ar: "منظار المثانة المرن الدقيق بدون ألم مع شاشة عرض" },
      { fr: "Table d'examen urologique électrique avec bac collecteur stérile", ar: "طاولة فحص مسالك بولية كهربائية قابلة للتعديل" },
      { fr: "Biopsie prostatique guidée par échographie avec aiguille automatique", ar: "أداة أخذ خزعات البروستاتا الموجهة بالموجات الصوتية" }
    ]
  },

  radiologie: {
    id: "radiologie",
    fr: "Radiologie & Imagerie Médicale",
    ar: "التصوير الطبي والأشعة والرنين المغناطيسي",
    icon: "🩻",
    diplomas: [
      { fr: "Diplôme d'Études Spécialisées (DES) en Radiodiagnostic et Imagerie Médicale", ar: "شهادة التخصص في التشخيص بالأشعة والتصوير الطبي" },
      { fr: "DIU Imagerie Cardiaque et Vasculaire (Scanner / IRM)", ar: "دبلوم تصوير القلب والأوعية بالرنين المغناطيسي والمفراس" },
      { fr: "DIU Échographie Générale et Doppler Avancé Multi-organes", ar: "دبلوم الصدى الصوتي العام والدوبلر المتقدم للأعضاء" },
      { fr: "DIU Imagerie de la Femme, Mammographie et Sénologie Diagnostique", ar: "دبلوم تصوير الثدي وأمراض النساء بالأشعة الرقمية" },
      { fr: "DIU Radiologie Interventionnelle et Ponctions Échoguidées", ar: "دبلوم الأشعة التداخلية وسحب العينات الموجه بالصدى" },
      { fr: "Membre de la Société Tunisienne de Radiologie (STR)", ar: "عضو بالجمعية التونسية للأشعة والتصوير الطبي" }
    ],
    equipment: [
      { fr: "Échographe multidisciplinaire Doppler couleur 3D/4D multi-sondes", ar: "جهاز صدى متعدد الاستخدامات ثلاثي ورباعي الأبعاد" },
      { fr: "Table de radiologie numérique directe à capteur plan (Flat Panel)", ar: "طاولة أشعة سينية رقمية عالية الدقة بنظام اللوح الرقمي" },
      { fr: "Console de post-traitement et stations de lecture diagnostique PACS", ar: "محطة عمل وتدقيق صور الأشعة عالية الدقة (PACS)" },
      { fr: "Reprographe laser médical d'imagerie diagnostique haute fidélité", ar: "طابعة ليزرية طبية متطورة لطباعة أفلام الأشعة" },
      { fr: "Sondes d'échographie endocavitaire, linéaire haute fréquence et phased-array", ar: "مجموعة مجسات صدى متخصصة للأوعية والسطحيات والتجاويف" }
    ]
  },

  generaliste: {
    id: "generaliste",
    fr: "Médecine Générale & Urgences",
    ar: "طب عام واستشارات عاجلة ورعاية أولية",
    icon: "🩺",
    diplomas: [
      { fr: "Diplôme d'État de Docteur en Médecine (Tunisie)", ar: "شهادة دولة دكتور في الطب (تونس)" },
      { fr: "Diplôme Universitaire de Médecine d'Urgence et Soins de Premier Recours", ar: "دبلوم جامعي في طب الطوارئ والإسعافات الأولية" },
      { fr: "Attestation d'Études Complémentaires en Diabétologie et Maladies Métaboliques", ar: "شهادة دراسات تكميلية في علاج مرض السكري والضغط" },
      { fr: "Diplôme Universitaire de Gériatrie et Suivi des Personnes Âgées", ar: "دبلوم جامعي في طب المسنين والرعاية المنزلية" },
      { fr: "DIU Échographie Clinique Générale en Cabinet Médical (POCUS)", ar: "دبلوم الفحص بالصدى السريري السريع في العيادة" },
      { fr: "Membre de l'Ordre des Médecins de Tunisie", ar: "مرسم بعمادة الأطباء بالبلاد التونسية" },
      { fr: "Membre de la Société Tunisienne de Médecine Générale (STMG)", ar: "عضو بالجمعية التونسية للطب العام" },
      { fr: "Ancien Interne des Hôpitaux Universitaires de Tunisie", ar: "طبيب مقيم سابق بالمستشفيات الجامعية التونسية" }
    ],
    equipment: [
      { fr: "Électrocardiographe Numérique (ECG) 12 Dérivations avec interprétation", ar: "جهاز تخطيط القلب الكهربائي الرقمي 12 مساراً" },
      { fr: "Tensiomètre Professionnel & Oxymètre de Pouls SpO2 connecté", ar: "جهاز قياس ضغط الدم ونسبة الأكسجين الدقيق" },
      { fr: "Otoscope & Ophtalmoscope à fibre optique LED", ar: "منظار فحص الأذن والعين بألياف ضوئية LED" },
      { fr: "Stéthoscope médical de haute précision acoustique", ar: "سماعة طبية متطورة بنقاء صوتي عالي" },
      { fr: "Échographe portable Ultra-compact de diagnostic rapide (POCUS)", ar: "جهاز صدى صوتي محمول صغير للفحص السريع الفوري" },
      { fr: "Défibrillateur Automatisé Externe (DAE) avec guidage vocal", ar: "جهاز إنعاش الصدمات القلبية الآلي الخارجي" },
      { fr: "Nébuliseur professionnel pour aérosolthérapie d'urgence", ar: "جهاز تبخير فوري لعلاج أزمات ضيق التنفس" },
      { fr: "Lecteur multiparamétrique instantané (Glycémie, Cholestérol, Hémoglobine)", ar: "جهاز فحص قطرة دم سريع (السكري، الكوليسترول، الهيموغلوبين)" },
      { fr: "Table d'examen électrique à hauteur variable", ar: "طاولة فحص طبية كهربائية قابلة لتعديل الارتفاع" },
      { fr: "Stérilisateur Autoclave Médical Classe B", ar: "جهاز تعقيم طبي أوتوكلاف من الصنف B" }
    ]
  }
};

// Foundational Core Diplomas for all registered Tunisian practitioners
export const UNIVERSAL_DIPLOMAS = [
  { fr: "Diplôme d'État de Docteur en Médecine", ar: "شهادة دولة دكتور في الطب (تونس)" },
  { fr: "Diplôme d'Études Spécialisées (DES)", ar: "شهادة الدراسات الطبية التخصصية المعمقة" },
  { fr: "Membre de l'Ordre des Médecins de Tunisie", ar: "مرسم بالمجلس الوطني لعمادة الأطباء بالبلاد التونسية" },
  { fr: "Ancien Interne des Hôpitaux Universitaires de Tunis", ar: "طبيب مقيم سابق بالمستشفيات الجامعية بتونس" },
  { fr: "Attestation d'Études Complémentaires en Santé", ar: "شهادة الدراسات التكميلية في علوم الصحة" },
  { fr: "Membre de la Société Tunisienne de Médecine", ar: "عضو بالجمعية التونسية للعلوم الطبية" },
  { fr: "Ancien Chef de Clinique / Assistant Hospitalo-Universitaire", ar: "طبيب استشفائي جامعي سابق / أستاذ مساعد" }
];

// Foundational Core Cabinet Equipment for all clinical cabinets in Tunisia
export const UNIVERSAL_EQUIPMENT = [
  { fr: "Cabinet informatisé & Dossier Électronique Sécurisé", ar: "عيادة مرقمنة بالكامل مع ملف طبي إلكتروني مشفر" },
  { fr: "Équipement d'examen médical spécialisé", ar: "تجهيزات ومعدات فحص سريري واستشارة متخصصة" },
  { fr: "Table d'examen électrique à hauteur variable", ar: "طاولة فحص كهربائية قابلة للتعديل بسهولة" },
  { fr: "Stérilisateur Autoclave Médical Classe B", ar: "جهاز تعقيم طبي أوتوكلاف معتمد من الصنف B" },
  { fr: "Tensiomètre & Oxymètre SpO2 connecté", ar: "جهاز قياس ضغط الدم ونسبة تشبع الأكسجين الذكي" },
  { fr: "Défibrillateur Automatisé Externe (DAE)", ar: "جهاز إنعاش الصدمات القلبية الآلي الخارجي (DAE)" },
  { fr: "Négatoscope / Écran d'imagerie HD", ar: "شاشة فحص وتدقيق صور الأشعة السينية عالية الوضوح" }
];

// Helper: Normalize specialty string to matching key
export function detectSpecialtyKey(specialtyStr) {
  if (!specialtyStr || typeof specialtyStr !== 'string') return 'generaliste';
  const norm = specialtyStr
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (norm.includes('cardio') || norm.includes('coeur') || norm.includes('vasculaire') || norm.includes('قلب')) return 'cardio';
  if (norm.includes('pedia') || norm.includes('enfant') || norm.includes('neonat') || norm.includes('اطفال')) return 'pediatrie';
  if (norm.includes('dent') || norm.includes('implant') || norm.includes('odonto') || norm.includes('اسنان')) return 'dentiste';
  if (norm.includes('gyneco') || norm.includes('obstet') || norm.includes('matern') || norm.includes('نساء') || norm.includes('توليد')) return 'gyneco';
  if (norm.includes('ophtalmo') || norm.includes('yeux') || norm.includes('vision') || norm.includes('عيون')) return 'ophtalmo';
  if (norm.includes('dermato') || norm.includes('peau') || norm.includes('جلد')) return 'dermato';
  if (norm.includes('ortho') || norm.includes('traumat') || norm.includes('articulation') || norm.includes('عظام')) return 'orthopedie';
  if (norm.includes('orl') || norm.includes('oto') || norm.includes('rhino') || norm.includes('laryng') || norm.includes('اذن') || norm.includes('انف')) return 'orl';
  if (norm.includes('psy') || norm.includes('mental') || norm.includes('نفس')) return 'psy';
  if (norm.includes('neuro') || norm.includes('nerf') || norm.includes('اعصاب')) return 'neuro';
  if (norm.includes('gastro') || norm.includes('hepato') || norm.includes('digest') || norm.includes('هضم')) return 'gastro';
  if (norm.includes('pneumo') || norm.includes('poumon') || norm.includes('respirat') || norm.includes('صدر') || norm.includes('رئة')) return 'pneumo';
  if (norm.includes('endocrin') || norm.includes('diabet') || norm.includes('thyroid') || norm.includes('سكري') || norm.includes('غدد')) return 'endocrino';
  if (norm.includes('uro') || norm.includes('nephro') || norm.includes('مسالك') || norm.includes('كلى')) return 'urologie';
  if (norm.includes('radio') || norm.includes('imagerie') || norm.includes('اشعة') || norm.includes('تصوير')) return 'radiologie';

  return 'generaliste';
}

// Smart inference: inspect existing diplomas to deduce targeted equipment recommendations
export function inferEquipmentFromDiplomas(diplomas = []) {
  const inferred = [];
  const joined = diplomas.map(d => String(d).toLowerCase()).join(' ');

  if (/echo|écho|ultrasound|sonograph|imagerie/i.test(joined)) {
    inferred.push({
      fr: "Échographe Doppler Haute Définition Multi-Sondes",
      ar: "جهاز صدى دوبلر عالي الدقة متعدد المجسات",
      reasonFr: "Déduit de votre formation en échographie / imagerie",
      reasonAr: "مستوحى من شهادتك في فحص الصدى والتصوير",
      tag: "Échographie"
    });
  }

  if (/laser/i.test(joined)) {
    inferred.push({
      fr: "Laser Médical Thérapeutique & Lunettes de protection",
      ar: "جهاز ليزر طبي علاجي ونظارات حماية معتمدة",
      reasonFr: "Déduit de vos compétences et formations en lasers",
      reasonAr: "مستوحى من تكوينك في استخدام الليزر الطبي",
      tag: "Laser"
    });
  }

  if (/endoscop|fibroscop|cœlio|coelio/i.test(joined)) {
    inferred.push({
      fr: "Colonne vidéo-endoscopique HD & Laveur-désinfecteur stérile",
      ar: "وحدة مناظير فيديو عالية الدقة وجهاز تعقيم المناظير",
      reasonFr: "Déduit de votre expertise en endoscopie / exploration",
      reasonAr: "مستوحى من خبرتك في تقنيات المناظير",
      tag: "Endoscopie"
    });
  }

  if (/rythmo|stimulat|holter|mapa|pacemaker/i.test(joined)) {
    inferred.push({
      fr: "Dispositif Holter MAPA Tensionnel 24h & Holter Rythmique",
      ar: "جهاز هولتر لتسجيل ضغط الدم والنبض المستمر 24 ساعة",
      reasonFr: "Déduit de votre diplôme de rythmologie ou explorations",
      reasonAr: "مستوحى من تكوينك في فحص النبض والضغط",
      tag: "Rythmologie"
    });
  }

  if (/implant|parodont|orthodont|odf/i.test(joined)) {
    inferred.push({
      fr: "Cone Beam 3D (CBCT) & Moteur chirurgical implantaire",
      ar: "أشعة مقطعية ثلاثية الأبعاد ومحرك جراحي للزراعة",
      reasonFr: "Déduit de vos spécialisations dentaires",
      reasonAr: "مستوحى من تخصصك في جراحة وزراعة الأسنان",
      tag: "Dentaire"
    });
  }

  if (/urgenc|reanimat|réanimat|secour/i.test(joined)) {
    inferred.push({
      fr: "Défibrillateur Automatisé Externe (DAE) & Chariot d'Urgence",
      ar: "جهاز مزيل الرجفان القلبي وعربة طوارئ طبية مجهزة",
      reasonFr: "Déduit de vos qualifications en médecine d'urgence",
      reasonAr: "مستوحى من كفاءتك في الإسعافات وطب الطوارئ",
      tag: "Urgences"
    });
  }

  if (/sommeil|apn[ée]|respiratoire/i.test(joined)) {
    inferred.push({
      fr: "Polygraphie ventilatoire ambulatoire du sommeil",
      ar: "جهاز تخطيط التنفس أثناء النوم المتنقل",
      reasonFr: "Déduit de votre expertise en pathologies du sommeil",
      reasonAr: "مستوحى من تخصصك في اضطرابات النوم والتنفس",
      tag: "Sommeil"
    });
  }

  if (/diab[èe]te|nutrition|metabol/i.test(joined)) {
    inferred.push({
      fr: "Analyseur instantané d'HbA1c & Monofilament pied diabétique",
      ar: "جهاز الفحص السريع للسكر التراكمي وفحص القدم السكرية",
      reasonFr: "Déduit de votre diplôme en diabétologie ou nutrition",
      reasonAr: "مستوحى من خبرتك في السكري والأمراض الأيضية",
      tag: "Diabétologie"
    });
  }

  if (/esth[ée]tique|cosmet|chirurg/i.test(joined)) {
    inferred.push({
      fr: "Appareil de Cryothérapie & Bistouri Électrique Haute Fréquence",
      ar: "جهاز العلاج بالتبريد ومشرط كهربائي عالي التردد",
      reasonFr: "Déduit de vos compétences en gestes chirurgicaux / esthétiques",
      reasonAr: "مستوحى من تدريبك في الجراحة التجميلية والصغرى",
      tag: "Chirurgie"
    });
  }

  return inferred;
}

// Smart inference: inspect existing equipment to deduce targeted diploma recommendations
export function inferDiplomasFromEquipment(equipment = []) {
  const inferred = [];
  const joined = equipment.map(e => String(e).toLowerCase()).join(' ');

  if (/echo|écho|doppler/i.test(joined)) {
    inferred.push({
      fr: "Diplôme Universitaire d'Échocardiographie et Imagerie Ultrasonore",
      ar: "دبلوم جامعي في فحص صدى القلب والتصوير بالموجات الصوتية",
      reasonFr: "Recommandé pour valoriser votre équipement d'échographie",
      reasonAr: "موصى به لتعزيز كفاءتك في أجهزة الصدى المتوفرة لديك",
      tag: "Échographie"
    });
    inferred.push({
      fr: "DIU d'Échographie Clinique et Doppler Vasculaire",
      ar: "دبلوم في صدى الشرايين والأوعية الدموية دوبلر",
      reasonFr: "Complémentaire à votre équipement Doppler",
      reasonAr: "مكمل لمعدات الدوبلر المتوفرة في عيادتك",
      tag: "Doppler"
    });
  }

  if (/holter|mapa|ecg/i.test(joined)) {
    inferred.push({
      fr: "DIU Rythmologie et Électrophysiologie Cardiaque",
      ar: "دبلوم التخطيط الكهربائي ودراسة نبضات القلب",
      reasonFr: "Valorise l'usage de vos enregistreurs Holter ECG & MAPA",
      reasonAr: "يتماشى مع أجهزة الهولتر وتخطيط الضغط والنبض بعيادتك",
      tag: "Rythmologie"
    });
  }

  if (/laser/i.test(joined)) {
    inferred.push({
      fr: "DIU Européen des Lasers Médicaux et Thérapeutiques",
      ar: "دبلوم جامعي أوروبي في تطبيقات الليزر الطبي والعلاجي",
      reasonFr: "Certification clé pour l'exploitation de vos équipements laser",
      reasonAr: "شهادة معتمدة هامة لاستخدام أجهزة الليزر الطبي",
      tag: "Laser"
    });
  }

  if (/spirom|polygraphie/i.test(joined)) {
    inferred.push({
      fr: "DIU Explorations Fonctionnelles Respiratoires et Pathologie du Sommeil",
      ar: "دبلوم وظائف التنفس والتشخيص الطبي لاضطرابات النوم",
      reasonFr: "Recommandé en synergie avec votre spiromètre ou polygraphie",
      reasonAr: "موصى به بالتوازي مع جهاز قياس التنفس أو تخطيط النوم",
      tag: "Sommeil / EFR"
    });
  }

  if (/dermatoscope|wood/i.test(joined)) {
    inferred.push({
      fr: "DIU Dermatoscopie Optique et Numérique Avancée",
      ar: "دبلوم تنظير الجلد البصري والرقمي المتقدم",
      reasonFr: "Valorise vos examens au dermatoscope HD",
      reasonAr: "يعزز دقة استخدامك لمنظار الجلد الرقمي المتوفر",
      tag: "Dermatoscopie"
    });
  }

  if (/colposcop/i.test(joined)) {
    inferred.push({
      fr: "DIU de Colposcopie et Pathologie Cervico-Vaginale",
      ar: "دبلوم منظار عنق الرحم والتشخيص المبكر",
      reasonFr: "Certification d'excellence pour l'usage du colposcope vidéo",
      reasonAr: "شهادة كفاءة هامة لاستخدام منظار عنق الرحم بالعيادة",
      tag: "Colposcopie"
    });
  }

  if (/autoclave|st[ée]rili/i.test(joined)) {
    inferred.push({
      fr: "Attestation d'Hygiène, Asepsie et Stérilisation Médicale au Cabinet",
      ar: "شهادة معتمدة في التعقيم الطبي وحماية سلامة المريض",
      reasonFr: "Gage de conformité et traçabilité de votre autoclave Classe B",
      reasonAr: "ضمان لجودة ومطابقة إجراءات التعقيم بجهاز الأوتوكلاف",
      tag: "Stérilisation"
    });
  }

  return inferred;
}

// Master function: Get Intelligent Equipment Suggestions
export function getSmartEquipmentSuggestions({
  specialty,
  diplomas = [],
  currentEquipment = [],
  filterCategory = 'all',
  searchQuery = ''
}) {
  const specKey = detectSpecialtyKey(specialty);
  const specData = SPECIALTY_SUGGESTIONS[specKey] || SPECIALTY_SUGGESTIONS.generaliste;

  // 1. Inferred from diplomas (Top Priority AI Match)
  const inferred = inferEquipmentFromDiplomas(diplomas).map(item => ({
    ...item,
    source: 'inferred',
    badgeFr: item.reasonFr || '✨ Déduit de vos diplômes',
    badgeAr: item.reasonAr || '✨ مستوحى من شهاداتك',
    isSpecialty: false
  }));

  // 2. Specialty-specific equipment
  const specialtyItems = (specData.equipment || []).map(item => ({
    ...item,
    source: 'specialty',
    badgeFr: `🎯 ${specData.fr}`,
    badgeAr: `🎯 ${specData.ar}`,
    isSpecialty: true
  }));

  // 3. Universal essentials
  const universalItems = UNIVERSAL_EQUIPMENT.map(item => ({
    ...item,
    source: 'universal',
    badgeFr: '🏥 Essentiel Cabinet',
    badgeAr: '🏥 أساسي بالعيادة',
    isSpecialty: false
  }));

  // Merge with priority & deduplicate by French name
  const seen = new Set();
  const allMerged = [];

  [...inferred, ...specialtyItems, ...universalItems].forEach(item => {
    const key = item.fr.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allMerged.push(item);
    }
  });

  // Filter by category tab
  let filtered = allMerged;
  if (filterCategory === 'specialty') {
    filtered = allMerged.filter(i => i.source === 'specialty');
  } else if (filterCategory === 'inferred') {
    filtered = allMerged.filter(i => i.source === 'inferred');
  } else if (filterCategory === 'universal') {
    filtered = allMerged.filter(i => i.source === 'universal');
  }

  // Filter by live search query
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(i => 
      i.fr.toLowerCase().includes(q) || 
      (i.ar && i.ar.includes(q)) ||
      (i.badgeFr && i.badgeFr.toLowerCase().includes(q))
    );
  }

  return {
    specialtyKey: specKey,
    specialtyNameFr: specData.fr,
    specialtyNameAr: specData.ar,
    specialtyIcon: specData.icon,
    suggestions: filtered,
    inferredCount: inferred.length,
    specialtyCount: specialtyItems.length,
    totalCount: allMerged.length
  };
}

// Master function: Get Intelligent Diploma Suggestions
export function getSmartDiplomaSuggestions({
  specialty,
  equipment = [],
  currentDiplomas = [],
  filterCategory = 'all',
  searchQuery = ''
}) {
  const specKey = detectSpecialtyKey(specialty);
  const specData = SPECIALTY_SUGGESTIONS[specKey] || SPECIALTY_SUGGESTIONS.generaliste;

  // 1. Inferred from equipment (Top Priority AI Match)
  const inferred = inferDiplomasFromEquipment(equipment).map(item => ({
    ...item,
    source: 'inferred',
    badgeFr: item.reasonFr || '✨ Déduit de vos équipements',
    badgeAr: item.reasonAr || '✨ مستوحى من معداتك',
    isSpecialty: false
  }));

  // 2. Specialty-specific diplomas
  const specialtyItems = (specData.diplomas || []).map(item => ({
    ...item,
    source: 'specialty',
    badgeFr: `🎯 ${specData.fr}`,
    badgeAr: `🎯 ${specData.ar}`,
    isSpecialty: true
  }));

  // 3. Universal essentials
  const universalItems = UNIVERSAL_DIPLOMAS.map(item => ({
    ...item,
    source: 'universal',
    badgeFr: '🏛️ Fondamental Médical',
    badgeAr: '🏛️ شهادة أساسية معتمدة',
    isSpecialty: false
  }));

  // Merge with priority & deduplicate
  const seen = new Set();
  const allMerged = [];

  [...inferred, ...specialtyItems, ...universalItems].forEach(item => {
    const key = item.fr.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allMerged.push(item);
    }
  });

  // Filter by category tab
  let filtered = allMerged;
  if (filterCategory === 'specialty') {
    filtered = allMerged.filter(i => i.source === 'specialty');
  } else if (filterCategory === 'inferred') {
    filtered = allMerged.filter(i => i.source === 'inferred');
  } else if (filterCategory === 'universal') {
    filtered = allMerged.filter(i => i.source === 'universal');
  }

  // Filter by live search query
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(i => 
      i.fr.toLowerCase().includes(q) || 
      (i.ar && i.ar.includes(q)) ||
      (i.badgeFr && i.badgeFr.toLowerCase().includes(q))
    );
  }

  return {
    specialtyKey: specKey,
    specialtyNameFr: specData.fr,
    specialtyNameAr: specData.ar,
    specialtyIcon: specData.icon,
    suggestions: filtered,
    inferredCount: inferred.length,
    specialtyCount: specialtyItems.length,
    totalCount: allMerged.length
  };
}

// Backward-compatible fallback arrays (maintained for compatibility)
export const EQUIPMENT_SUGGESTIONS = [
  "Cabinet informatisé & Dossier Électronique",
  "Équipement d'examen spécialisé",
  "Échographe Doppler Haute Définition",
  "Électrocardiogramme Numérique (ECG)",
  "Dispositif Holter MAPA Tensionnel 24h",
  "Table d'examen électrique à hauteur variable",
  "Stérilisateur Autoclave Médical Classe B",
  "Tensiomètre & Oxymètre SpO2 connecté",
  "Défibrillateur Automatisé Externe (DAE)",
  "Otoscope & Ophtalmoscope à fibre optique",
  "Monitoring foetal (Cardiotocographe)",
  "Spiromètre électronique de précision",
  "Négatoscope / Écran d'imagerie HD",
  "Appareil de cryothérapie / bistouri électrique"
];

export const DIPLOMA_SUGGESTIONS = [
  "Diplôme d'État de Docteur en Médecine",
  "Diplôme d'Études Spécialisées (DES)",
  "Membre de l'Ordre des Médecins de Tunisie",
  "Diplôme Universitaire d'Échocardiographie",
  "Ancien Interne des Hôpitaux Universitaires de Tunis",
  "Attestation d'Études Complémentaires en Santé",
  "Membre de la Société Tunisienne de Médecine"
];

