export type Language = 'ar' | 'ckb' | 'kmr' | 'en';

export interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'rtl' | 'ltr';
}

export interface Translations {
  appName: string;
  appTagline: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  loginButton: string;
  noAccountText: string;
  signupLink: string;
  languageName: string;
  demoErrorMsg: string;
  registerTitle: string;
  registerSubtitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  registerButton: string;
  hasAccountText: string;
  loginLink: string;
  selectAccountTitle: string;
  selectAccountSubtitle: string;
  customerTitle: string;
  customerDesc: string;
  driverTitle: string;
  driverDesc: string;
  merchantTitle: string;
  merchantDesc: string;
  customerFormTitle: string;
  customerFormSubtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  customerFullNamePlaceholder: string;
  customerPhonePlaceholder: string;
  createAccountBtn: string;
  backBtn: string;
  driverFormTitle: string;
  driverFormSubtitle: string;
  personalInfoSection: string;
  vehicleInfoSection: string;
  kycSection: string;
  vehicleTypeLabel: string;
  vehicleTypePlaceholder: string;
  vehicleModelLabel: string;
  vehicleModelPlaceholder: string;
  vehicleYearLabel: string;
  vehicleYearPlaceholder: string;
  plateNumberLabel: string;
  plateNumberPlaceholder: string;
  vehicleColorLabel: string;
  vehicleColorPlaceholder: string;
  idCardDocLabel: string;
  licenseDocLabel: string;
  selfieDocLabel: string;
  clickToUpload: string;
  submitDriverRegistrationBtn: string;
  merchantFormTitle: string;
  merchantFormSubtitle: string;
  restaurantNameLabel: string;
  restaurantNamePlaceholder: string;
  restaurantAddressLabel: string;
  restaurantAddressPlaceholder: string;
  restaurantLogoDocLabel: string;
  submitMerchantRegistrationBtn: string;
  addressLabel: string;
  customerAddressPlaceholder: string;
  selectLocationOnMap: string;
  detectLocationBtn: string;
  saveLocationBtn: string;
  locationDetectedSuccess: string;
  underReviewTitle: string;
  underReviewSubtitle: string;
  refNumberLabel: string;
  accountTypeLabel: string;
  statusReceived: string;
  statusReviewing: string;
  statusApproval: string;
  estimatedTimeLabel: string;
  estimatedTimeVal: string;
  supportHelpText: string;
  contactSupportBtn: string;
  backToHomeBtn: string;
  usernameAvailable: string;
  usernameTaken: string;
  checkingUsername: string;
  profileTitle: string;
  profileSubtitle: string;
  saveChangesBtn: string;
  changePasswordTitle: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  adminDashboardTitle: string;
  adminDashboardSubtitle: string;
  pendingReviewTab: string;
  allUsersTab: string;
  approveBtn: string;
  rejectBtn: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇮🇶', dir: 'rtl' },
  { id: 'ckb', name: 'كوردي سۆرانی', nativeName: 'کوردی سۆرانی', flag: '☀️', dir: 'rtl' },
  { id: 'kmr', name: 'کوردی بادینی', nativeName: 'کوردی بادینی', flag: '☀️', dir: 'rtl' },
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
];

export const TRANSLATIONS: Record<Language, Translations> = {
  ar: {
    appName: 'تكسي الأمان',
    appTagline: 'TAXI · DELIVERY',
    welcomeTitle: 'أهلاً بك مجددًا',
    welcomeSubtitle: 'أدخل بريدك الإلكتروني وكلمة المرور لمتابعة الدخول',
    identifierLabel: 'البريد الإلكتروني أو اسم المستخدم',
    identifierPlaceholder: 'user@alaman-taxi.com أو اسم المستخدم',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••••••',
    rememberMe: 'تذكر بياناتي',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginButton: 'تسجيل الدخول ←',
    noAccountText: 'ليس لديك حساب؟',
    signupLink: 'سجّل الآن',
    languageName: 'العربية',
    demoErrorMsg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
    registerTitle: 'إنشاء حساب جديد',
    registerSubtitle: 'انضم إلى منصة تكسي الأمان لحجز التكسي وتوصيل الطلبات',
    fullNameLabel: 'الاسم الكامل',
    fullNamePlaceholder: 'محمد أحمد',
    phoneLabel: 'رقم الهاتف',
    phonePlaceholder: '0770 123 4567',
    registerButton: 'إنشاء حساب جديد ←',
    hasAccountText: 'لديك حساب بالفعل؟',
    loginLink: 'تسجيل الدخول',
    selectAccountTitle: 'إنشاء حساب جديد',
    selectAccountSubtitle: 'حدد نوع الحساب الذي تريد إنشاءه',
    customerTitle: 'زبون',
    customerDesc: 'لحجز رحلات التكسي وطلب الطعام',
    driverTitle: 'سائق',
    driverDesc: 'لتقديم خدمات التوصيل والرحلات',
    merchantTitle: 'تاجر / مطعم',
    merchantDesc: 'لإدارة منيو مطعمك واستقبال الطلبات',
    customerFormTitle: 'حساب زبون جديد',
    customerFormSubtitle: 'عبّئ بياناتك للبدء بحجز الرحلات وطلب الطعام',
    usernameLabel: 'اسم المستخدم',
    usernamePlaceholder: 'ahmad_k',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    customerFullNamePlaceholder: 'مثال: أحمد كريم',
    customerPhonePlaceholder: '07xx xxx xxxx',
    createAccountBtn: 'إنشاء الحساب',
    backBtn: 'رجوع',
    driverFormTitle: 'حساب سائق جديد',
    driverFormSubtitle: 'عبّئ بياناتك ووثائقك ليتم مراجعة طلبك من الإدارة',
    personalInfoSection: 'البيانات الشخصية',
    vehicleInfoSection: 'بيانات المركبة',
    kycSection: 'رفع وثائق التوثيق (KYC)',
    vehicleTypeLabel: 'نوع المركبة',
    vehicleTypePlaceholder: 'سيدان تكسي',
    vehicleModelLabel: 'الموديل (الطراز)',
    vehicleModelPlaceholder: 'تويوتا كامري',
    vehicleYearLabel: 'سنة الصنع',
    vehicleYearPlaceholder: '2023',
    plateNumberLabel: 'رقم اللوحة',
    plateNumberPlaceholder: 'أربيل 58392',
    vehicleColorLabel: 'لون المركبة',
    vehicleColorPlaceholder: 'أصفر تكسي',
    idCardDocLabel: 'صورة الهوية الشخصية',
    licenseDocLabel: 'صورة رخصة القيادة',
    selfieDocLabel: 'صورة شخصية (سيلفي)',
    clickToUpload: 'اضغط لاختيار صورة',
    submitDriverRegistrationBtn: 'إرسال طلب التسجيل',
    merchantFormTitle: 'حساب تاجر / مطعم جديد',
    merchantFormSubtitle: 'عبّئ بيانات مطعمك ليتم تفعيله بعد موافقة الإدارة',
    restaurantNameLabel: 'اسم المطعم',
    restaurantNamePlaceholder: 'مطعم دجلة',
    restaurantAddressLabel: 'العنوان',
    restaurantAddressPlaceholder: 'المنصور، شارع الأميرات',
    restaurantLogoDocLabel: 'صورة المطعم / الشعار (اللوجو)',
    submitMerchantRegistrationBtn: 'إرسال طلب التسجيل',
    addressLabel: 'العنوان والحي',
    customerAddressPlaceholder: 'مثال: بغداد، المنصور - شارع 14 تموز',
    selectLocationOnMap: 'تحديد وتثبيت الموقع والحي على الخريطة',
    detectLocationBtn: 'تحديد موقعي والحي تلقائياً (GPS)',
    saveLocationBtn: 'حفظ الموقع والحي المحدد',
    locationDetectedSuccess: 'تم تحديد الموقع والحي بنجاح وتثبيته على الخريطة',
    underReviewTitle: 'الطلب قيد المراجعة والتدقيق',
    underReviewSubtitle: 'شكراً لتقديمك! فريق الإدارة يقوم حالياً بمراجعة البيانات والمستندات وسيتم تفعيل حسابك قريبًا.',
    refNumberLabel: 'رقم المرجعية للطلب',
    accountTypeLabel: 'نوع الحساب',
    statusReceived: 'تم استلام الطلب بنجاح',
    statusReviewing: 'جاري تدقيق المستندات والبيانات',
    statusApproval: 'تفعيل الحساب والموافقة النهائية',
    estimatedTimeLabel: 'الوقت المتوقع للتفعيل',
    estimatedTimeVal: 'خلال 24 إلى 48 ساعة عمل',
    supportHelpText: 'هل لديك أي استفسار أو تود متابعة الطلب بسرعة؟',
    contactSupportBtn: 'التواصل مع الدعم الفني (واتساب)',
    backToHomeBtn: 'العودة إلى الصفحة الرئيسية / تسجيل الدخول',
    usernameAvailable: 'اسم المستخدم متاح ومناسب ✓',
    usernameTaken: 'اسم المستخدم مكرر ومُستخدَم بالفعل! اختر اسماً آخر ✗',
    checkingUsername: 'جاري الفحص...',
    profileTitle: 'إعدادات الملف الشخصي',
    profileSubtitle: 'تحديث بيانات الحساب وتغيير كلمة المرور',
    saveChangesBtn: 'حفظ التعديلات',
    changePasswordTitle: 'تغيير كلمة المرور الأمني',
    currentPasswordLabel: 'كلمة المرور الحالية',
    newPasswordLabel: 'كلمة المرور الجديدة',
    confirmPasswordLabel: 'تأكيد كلمة المرور الجديدة',
    adminDashboardTitle: 'لوحة تحكم إدارة تكسي الأمان',
    adminDashboardSubtitle: 'مراجعة طلبات السائقين والتجار وإدارة المستخدمين',
    pendingReviewTab: 'طلبات قيد المراجعة',
    allUsersTab: 'جميع الحسابات والمستخدمين',
    approveBtn: 'قبول وتفعيل الحساب',
    rejectBtn: 'رفض الطلب',
  },
  ckb: {
    appName: 'تاکسیی ئاسایش',
    appTagline: 'TAXI · DELIVERY',
    welcomeTitle: 'بەخێربێیتەوە',
    welcomeSubtitle: 'ئیمەیڵ و وشەی تێپەڕت بنووسە بۆ بەردەوامبوون',
    identifierLabel: 'ئیمەیڵ یان ناوی بەکارهێنەر',
    identifierPlaceholder: 'user@alaman-taxi.com یان ناوی بەکارهێنەر',
    passwordLabel: 'وشەی تێپەڕ',
    passwordPlaceholder: '••••••••••••',
    rememberMe: 'زانیارییەکانم بپارێزە',
    forgotPassword: 'وشەی تێپەڕت لەبیرچووە؟',
    loginButton: 'چوونە ژوورەوە ←',
    noAccountText: 'ئایا هەژمارت نییە؟',
    signupLink: 'ئێستا تۆمار بکە',
    languageName: 'کوردی سۆرانی',
    demoErrorMsg: 'ئیمەیڵ یان وشەی تێپەڕ هەڵەیە. تکایە دووبارە هەوڵبدەرەوە.',
    registerTitle: 'دروستکردنی هەژماری نوێ',
    registerSubtitle: 'پەیوەندی بکە بە پلاتفۆرمی تاکسیی ئاسایش بۆ تەکسیکردن و گەیاندن',
    fullNameLabel: 'ناوی تەواو',
    fullNamePlaceholder: 'محەمەد ئەحمەد',
    phoneLabel: 'ژمارەی تلفۆن',
    phonePlaceholder: '0770 123 4567',
    registerButton: 'دروستکردنی هەژمار ←',
    hasAccountText: 'پێشتر هەژمارت هەیە؟',
    loginLink: 'چوونە ژوورەوە',
    selectAccountTitle: 'دروستکردنی هەژماری نوێ',
    selectAccountSubtitle: 'جۆری ئەو هەژمارە دیاری بکە کە دەتەوێت دروستی بکەیت',
    customerTitle: 'کڕیار',
    customerDesc: 'بۆ داواکردنی تەکسی و داواکردنی خۆراک',
    driverTitle: 'شۆفێر',
    driverDesc: 'بۆ پێشکەشکردنی خزمەتگوزاری گەیاندن و گەشتەکان',
    merchantTitle: 'فرۆشیار / چێشتخانە',
    merchantDesc: 'بۆ بەڕێوەبردنی مێنیوی چێشتخانەکەت و وەرگرتنی داواکارییەکان',
    customerFormTitle: 'هەژماری نوێی کڕیار',
    customerFormSubtitle: 'زانیارییەکانت پڕبکەرەوە بۆ دەستپێکردنی گەشت و داواکردنی خۆراک',
    usernameLabel: 'ناوی بەکارهێنەر',
    usernamePlaceholder: 'ahmad_k',
    emailLabel: 'ئیمەیڵ',
    emailPlaceholder: 'you@example.com',
    customerFullNamePlaceholder: 'نموونە: ئەحمەد کەریم',
    customerPhonePlaceholder: '07xx xxx xxxx',
    createAccountBtn: 'دروستکردنی هەژمار',
    backBtn: 'گەڕانەوە',
    driverFormTitle: 'هەژماری نوێی شۆفێر',
    driverFormSubtitle: 'زانیاری و بەڵگەنامەکانت پڕبکەرەوە بۆ پێداچوونەوە لەلایەن کارگێڕییەوە',
    personalInfoSection: 'زانیارییە کەسییەکان',
    vehicleInfoSection: 'زانیارییەکانی ئۆتۆمبێل',
    kycSection: 'بارکردنی بەڵگەنامەکانی پشتڕاستکردنەوە (KYC)',
    vehicleTypeLabel: 'جۆری ئۆتۆمبێل',
    vehicleTypePlaceholder: 'سێدان تەکسی',
    vehicleModelLabel: 'مۆدێل (جۆر)',
    vehicleModelPlaceholder: 'تۆیۆتا کامری',
    vehicleYearLabel: 'ساڵی دروستکردن',
    vehicleYearPlaceholder: '2023',
    plateNumberLabel: 'ژمارەی تابلۆ',
    plateNumberPlaceholder: 'هەولێر 58392',
    vehicleColorLabel: 'ڕەنگی ئۆتۆمبێل',
    vehicleColorPlaceholder: 'زەردی تەکسی',
    idCardDocLabel: 'وێنەی ناسنامەی کەسی',
    licenseDocLabel: 'وێنەی مۆڵەتی شۆفێری',
    selfieDocLabel: 'وێنەی کەسی (سێلفی)',
    clickToUpload: 'دابگرە بۆ هەڵبژاردنی وێنە',
    submitDriverRegistrationBtn: 'ناردنی داواکاری تۆمارکردن',
    merchantFormTitle: 'هەژماری نوێی فرۆشیار / چێشتخانە',
    merchantFormSubtitle: 'زانیارییەکانی چێشتخانەکەت پڕبکەرەوە بۆ چالاککردنی دوای ڕەزامەندی کارگێڕی',
    restaurantNameLabel: 'ناوی چێشتخانە',
    restaurantNamePlaceholder: 'چێشتخانەی دیجلە',
    restaurantAddressLabel: 'ناونیشان',
    restaurantAddressPlaceholder: 'مەنسوور، شەقامی ئامیرات',
    restaurantLogoDocLabel: 'وێنەی چێشتخانە / لۆگۆ',
    submitMerchantRegistrationBtn: 'ناردنی داواکاری تۆمارکردن',
    addressLabel: 'ناونیشان و گەڕەک',
    customerAddressPlaceholder: 'نموونە: بەغدا، مەنسوور - شەقامی ١٤ی تمووز',
    selectLocationOnMap: 'دیاریکردن و جێگیرکردنی شوێن و گەڕەک لەسەر نەخشە',
    detectLocationBtn: 'دیاریکردنی شوێنی ئێستام (GPS)',
    saveLocationBtn: 'پاشەکەوتکردنی شوێن و گەڕەکی دیاریکراو',
    locationDetectedSuccess: 'شوێن و گەڕەک بە سەرکەوتوویی دیاری کرا و جێگیرکرا',
    underReviewTitle: 'داواکارییەکەت لەژێر پێداچوونەوەدایە',
    underReviewSubtitle: 'سوپاس بۆ تۆمارکردن! تیمی کارگێڕی سەرقاڵی پێداچوونەوەی زانیاری و بەڵگەنامەکانتە و بەم زووانە هەژمارەکەت چالاک دەکرێت.',
    refNumberLabel: 'ژمارەی مەرجەعی داواکاری',
    accountTypeLabel: 'جۆری هەژمار',
    statusReceived: 'داواکارییەکە بەسەرکەوتوویی وەرگیرا',
    statusReviewing: 'پێداچوونەوە بە زانیاری و بەڵگەنامەکان دەکرێت',
    statusApproval: 'چالاککردنی هەژمار و ڕەزامەندی کۆتایی',
    estimatedTimeLabel: 'کاتی پێشبینیکراو بۆ چالاککردن',
    estimatedTimeVal: 'لەماوەی ٢٤ بۆ ٤٨ کاتژمێری کاری',
    supportHelpText: 'پرسیارێکت هەیە یان دەتەوێت بەدواداچوون بۆ داواکارییەکەت بکەیت؟',
    contactSupportBtn: 'پەیوەندیکردن بە پشتیوانی (واتساپ)',
    backToHomeBtn: 'گەڕانەوە بۆ پەڕەی سەرەکی / چوونەژوورەوە',
    usernameAvailable: 'ناوی بەکارهێنەر بەردەستە و گونجاوە ✓',
    usernameTaken: 'ئەم ناوە پێشتر بەکارهاتووە! ناوێکی تر هەڵبژێرە ✗',
    checkingUsername: 'پشکنین دەکرێت...',
    profileTitle: 'ڕێکخستنەکانی پرۆفایل',
    profileSubtitle: 'نوێکردنەوەی زانیارییەکانی هەژمار و گۆڕینی وشەی نهێنی',
    saveChangesBtn: 'پاشەکەوتکردنی گۆڕانکارییەکان',
    changePasswordTitle: 'گۆڕینی وشەی نهێنی',
    currentPasswordLabel: 'وشەی نهێنی ئێستا',
    newPasswordLabel: 'وشەی نهێنی نوێ',
    confirmPasswordLabel: 'دووپاتکردنەوەی وشەی نهێنی نوێ',
    adminDashboardTitle: 'داشبۆردی بەڕێوەبردنی تاکسیی ئاسایش',
    adminDashboardSubtitle: 'پێداچوونەوە بە داواکاریی شۆفێران و فرۆشیاران',
    pendingReviewTab: 'داواکارییەکانی ژێر پێداچوونەوە',
    allUsersTab: 'سەرجەم هەژمارەکان',
    approveBtn: 'قبوڵکردن و چالاککردن',
    rejectBtn: 'ڕەتکردنەوەی داواکاری',
  },
  kmr: {
    appName: 'تاکسیا ئاسایشێ',
    appTagline: 'TAXI · DELIVERY',
    welcomeTitle: 'بخێر بێییەڤە',
    welcomeSubtitle: 'ئیمەیڵ و پەیڤا دەربازبوونێ بنڤیسە بۆ بەردەوامبوونێ',
    identifierLabel: 'ئیمەیڵ یا ناڤێ بکارئینەری',
    identifierPlaceholder: 'user@alaman-taxi.com یا ناڤێ بکارئینەری',
    passwordLabel: 'پەیڤا دەربازبوونێ',
    passwordPlaceholder: '••••••••••••',
    rememberMe: 'زانیاریێن من بپارێزە',
    forgotPassword: 'پەیڤا دەربازبوونێ ژبیرکریە؟',
    loginButton: 'چوونا ژوورەڤە ←',
    noAccountText: 'ئەرێ تە هەژمار نینە؟',
    signupLink: 'نوکە تۆمار بکە',
    languageName: 'کوردی بادینی',
    demoErrorMsg: 'ئیمەیڵ یا پەیڤا دەربازبوونێ یا خەلەتە. هیڤی دارین دووبارە هەولبدە.',
    registerTitle: 'چێکرنا هەژمارەکا نوو',
    registerSubtitle: 'پەیوەندیێ بکە ب پلاتفۆرما تاکسیا ئاسایشێ بۆ تەکسیا و گەهاندنێ',
    fullNameLabel: 'ناڤێ تەمام',
    fullNamePlaceholder: 'محەمەد ئەحمەد',
    phoneLabel: 'ژمارا تەلەفۆنێ',
    phonePlaceholder: '0770 123 4567',
    registerButton: 'چێکرنا هەژمارێ ←',
    hasAccountText: 'پێشتر تە هەژمار هەیا؟',
    loginLink: 'چوونا ژوورەڤە',
    selectAccountTitle: 'چێکرنا هەژمارەکا نوو',
    selectAccountSubtitle: 'جۆرێ وێ هەژمارێ دیار بکە یا تە دڤێت چێکەی',
    customerTitle: 'کڕیار',
    customerDesc: 'بۆ گرتنا گەشتێن تەکسیێ و داخوازکرنا خوارنێ',
    driverTitle: 'شۆفێر',
    driverDesc: 'بۆ پێشکەشکرنا خزمەتگوزاریێن گەهاندنێ و گەشتان',
    merchantTitle: 'بازرگان / چێشتخانە',
    merchantDesc: 'بۆ ڕێڤەبرنا مێنیویا چێشتخانەیا تە و وەرگرتنا داخوازیان',
    customerFormTitle: 'هەژمارا نوو یا کڕیاری',
    customerFormSubtitle: 'زانیاریێن خۆ بنڤیسە بۆ دەستپێکرنا گەشتان و داخوازکرنا خوارنێ',
    usernameLabel: 'ناڤێ بکارئینەری',
    usernamePlaceholder: 'ahmad_k',
    emailLabel: 'ئیمەیڵ',
    emailPlaceholder: 'you@example.com',
    customerFullNamePlaceholder: 'نموونە: ئەحمەد کەریم',
    customerPhonePlaceholder: '07xx xxx xxxx',
    createAccountBtn: 'چێکرنا هەژمارێ',
    backBtn: 'زڤڕین',
    driverFormTitle: 'هەژمارا نوو یا شۆفێری',
    driverFormSubtitle: 'زانیاری و بەڵگەنامەیێن خۆ بنڤیسە بۆ پێداچوونا ڕێڤەبەریێ',
    personalInfoSection: 'زانیاریێن کەسی',
    vehicleInfoSection: 'زانیاریێن ترۆمبێلێ',
    kycSection: 'بارکرنا بەڵگەنامەیێن پشتڕاستکرنێ (KYC)',
    vehicleTypeLabel: 'جۆرێ ترۆمبێلێ',
    vehicleTypePlaceholder: 'سێدان تەکسی',
    vehicleModelLabel: 'مۆدێل (جۆر)',
    vehicleModelPlaceholder: 'تۆیۆتا کامری',
    vehicleYearLabel: 'ساڵا چێکرنێ',
    vehicleYearPlaceholder: '2023',
    plateNumberLabel: 'ژمارا تابلۆیێ',
    plateNumberPlaceholder: 'هەولێر 58392',
    vehicleColorLabel: 'ڕەنگێ ترۆمبێلێ',
    vehicleColorPlaceholder: 'زەردێ تەکسیێ',
    idCardDocLabel: 'وێنێ ناسنامەیا کەسی',
    licenseDocLabel: 'وێنێ مۆڵەتا شۆفێریێ',
    selfieDocLabel: 'وێنێ کەسی (سێلفی)',
    clickToUpload: 'کلیت بکە بۆ هەڵبژارتنا وێنەی',
    submitDriverRegistrationBtn: 'نارنتا داخوازییا تۆمارکرنێ',
    merchantFormTitle: 'هەژمارا نوو یا بازرگان / چێشتخانێ',
    merchantFormSubtitle: 'زانیاریێن چێشتخانەیا خۆ بنڤیسە بۆ کاراکرنێ پاش پەسەندکرنا ڕێڤەبەریێ',
    restaurantNameLabel: 'ناڤێ چێشتخانێ',
    restaurantNamePlaceholder: 'چێشتخانەیا دیجلە',
    restaurantAddressLabel: 'نیشانی',
    restaurantAddressPlaceholder: 'مەنسوور، شەقاما ئامیرات',
    restaurantLogoDocLabel: 'وێنێ چێشتخانێ / لۆگۆ',
    submitMerchantRegistrationBtn: 'نارنتا داخوازییا تۆمارکرنێ',
    addressLabel: 'نیشانی و تاخ',
    customerAddressPlaceholder: 'نموونه: بەغدا، مەنسوور - شەقاما ١٤ی تمووز',
    selectLocationOnMap: 'دیاریکرن و جێگیرکرنا جهی و تاخی ل سەر نەخشەیێ',
    detectLocationBtn: 'دیاریکرنا جهێ من یێ نوکە (GPS)',
    saveLocationBtn: 'پاشەکەوتکرنا جهێ هەڵبژارتی',
    locationDetectedSuccess: 'جهـ و تاخ ب سەرکەفتییانه هاتە دیاریکرن و جێگیرکرن',
    underReviewTitle: 'داخوازییا تە د ژێر پێداچوونێ دایە',
    underReviewSubtitle: 'سوباس بۆ تۆمارکرنێ! تیمێ ڕێڤەبەریێ سەرگەرمێ پێداچوونا زانیاری و بەڵگەنامەیێن تە یە و د نێزیکدا هەژمارا تە دێ کارا بیت.',
    refNumberLabel: 'ژمارا مەرجەعییا داخوازیێ',
    accountTypeLabel: 'جۆرێ هەژمارێ',
    statusReceived: 'داخوازی ب سەرکەفتن هاتە وەرگرتن',
    statusReviewing: 'پێداچوون ل سەر زانیاری و بەڵگەنامەیان دهێتە کرن',
    statusApproval: 'کاراکرنا هەژمارێ و پەسەندکرنا دوماهیێ',
    estimatedTimeLabel: 'دەمێ پێشبینیکری بۆ کاراکرنێ',
    estimatedTimeVal: 'دماوێ ٢٤ بۆ ٤٨ دەمژمێرێن کاری دابیت',
    supportHelpText: 'پڕسیارەکا تە هەیە یان تە دڤێت بەدوڤچوونێ بۆ داخوازییا خۆ بکەی؟',
    contactSupportBtn: 'پەیوەندیکرن ب پشتیڤانیێ (واتساپ)',
    backToHomeBtn: 'زڤڕین بۆ پەڕێ سەرەکی / چوونا ژوورەڤە',
    usernameAvailable: 'ناڤێ بکارئینەری بەردەستە ✓',
    usernameTaken: 'ئەڤ ناڤە بەری نوکە هاتییە بکارئینان! ✗',
    checkingUsername: 'پشکنین دهێتە کرن...',
    profileTitle: 'ڕێکخستنێن پڕۆفایلی',
    profileSubtitle: 'نویژەنکرنا زانیاریێن هەژمارێ و گوهرینا پەیڤا نهێنی',
    saveChangesBtn: 'پاشەکەوتکرنا گوهرینان',
    changePasswordTitle: 'گوهرینا پەیڤا نهێنی',
    currentPasswordLabel: 'پەیڤا نهێنی یا نوکە',
    newPasswordLabel: 'پەیڤا نهێنی یا نوو',
    confirmPasswordLabel: 'پشتڕاستکرنا پەیڤا نهێنی یا نوو',
    adminDashboardTitle: 'داشبۆردا ڕێڤەبرنا تاکسیا ئاسایشێ',
    adminDashboardSubtitle: 'پێداچوون ل سەر داخوازیێن شۆفێر و بازرگانان',
    pendingReviewTab: 'داخوازیێن ژێر پێداچوونێ',
    allUsersTab: 'هەمی هەژمار',
    approveBtn: 'پەسەندکرن و کاراکرن',
    rejectBtn: 'ڕەتکرنا داخوازیێ',
  },
  en: {
    appName: 'Al-Aman Taxi',
    appTagline: 'TAXI · DELIVERY',
    welcomeTitle: 'Welcome Back',
    welcomeSubtitle: 'Enter your email and password to continue',
    identifierLabel: 'Email or Username',
    identifierPlaceholder: 'user@alaman-taxi.com or username',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••••••',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginButton: 'Sign In →',
    noAccountText: "Don't have an account?",
    signupLink: 'Sign Up Now',
    languageName: 'English',
    demoErrorMsg: 'Invalid email or password. Please try again.',
    registerTitle: 'Create New Account',
    registerSubtitle: 'Join Al-Aman Taxi platform for taxi booking and delivery',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Mohammed Ahmed',
    phoneLabel: 'Phone Number',
    phonePlaceholder: '0770 123 4567',
    registerButton: 'Create Account →',
    hasAccountText: 'Already have an account?',
    loginLink: 'Sign In',
    selectAccountTitle: 'Create New Account',
    selectAccountSubtitle: 'Select the type of account you want to create',
    customerTitle: 'Customer',
    customerDesc: 'For booking taxi rides and ordering food',
    driverTitle: 'Driver',
    driverDesc: 'For providing delivery and ride services',
    merchantTitle: 'Merchant / Restaurant',
    merchantDesc: 'To manage your menu and accept orders',
    customerFormTitle: 'New Customer Account',
    customerFormSubtitle: 'Fill in your details to start booking rides and ordering food',
    usernameLabel: 'Username',
    usernamePlaceholder: 'ahmad_k',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    customerFullNamePlaceholder: 'e.g., Ahmed Kareem',
    customerPhonePlaceholder: '07xx xxx xxxx',
    createAccountBtn: 'Create Account',
    backBtn: 'Back',
    driverFormTitle: 'New Driver Account',
    driverFormSubtitle: 'Fill in your details and documents for admin review',
    personalInfoSection: 'Personal Information',
    vehicleInfoSection: 'Vehicle Information',
    kycSection: 'Upload Identity Documents (KYC)',
    vehicleTypeLabel: 'Vehicle Type',
    vehicleTypePlaceholder: 'Sedan Taxi',
    vehicleModelLabel: 'Model',
    vehicleModelPlaceholder: 'Toyota Camry',
    vehicleYearLabel: 'Year of Manufacture',
    vehicleYearPlaceholder: '2023',
    plateNumberLabel: 'Plate Number',
    plateNumberPlaceholder: 'Erbil 58392',
    vehicleColorLabel: 'Vehicle Color',
    vehicleColorPlaceholder: 'Yellow Taxi',
    idCardDocLabel: 'National ID Photo',
    licenseDocLabel: 'Driving License Photo',
    selfieDocLabel: 'Personal Photo (Selfie)',
    clickToUpload: 'Click to select image',
    submitDriverRegistrationBtn: 'Submit Driver Application',
    merchantFormTitle: 'New Merchant / Restaurant Account',
    merchantFormSubtitle: 'Fill in your restaurant details to be activated after admin approval',
    restaurantNameLabel: 'Restaurant Name',
    restaurantNamePlaceholder: 'Tigris Restaurant',
    restaurantAddressLabel: 'Address',
    restaurantAddressPlaceholder: 'Mansour, Ameerat Street',
    restaurantLogoDocLabel: 'Restaurant Photo / Logo',
    submitMerchantRegistrationBtn: 'Submit Registration Request',
    addressLabel: 'Address & Neighborhood',
    customerAddressPlaceholder: 'e.g. Baghdad, Mansour - 14th July St',
    selectLocationOnMap: 'Pin location & neighborhood on map',
    detectLocationBtn: 'Detect My Location (GPS)',
    saveLocationBtn: 'Save Selected Location & Neighborhood',
    locationDetectedSuccess: 'Location & neighborhood detected and saved successfully',
    underReviewTitle: 'Application Under Review',
    underReviewSubtitle: 'Thank you for applying! Our team is currently reviewing your application and documents. Your account will be activated soon.',
    refNumberLabel: 'Reference Number',
    accountTypeLabel: 'Account Type',
    statusReceived: 'Application Received Successfully',
    statusReviewing: 'Reviewing Details & Identity Documents',
    statusApproval: 'Account Activation & Final Approval',
    estimatedTimeLabel: 'Estimated Activation Time',
    estimatedTimeVal: 'Within 24 to 48 business hours',
    supportHelpText: 'Have a question or want to track your application status?',
    contactSupportBtn: 'Contact Support (WhatsApp)',
    backToHomeBtn: 'Back to Main Page / Login',
    usernameAvailable: 'Username is available ✓',
    usernameTaken: 'Username is already taken! Choose another ✗',
    checkingUsername: 'Checking availability...',
    profileTitle: 'Profile Settings',
    profileSubtitle: 'Update account details and change security password',
    saveChangesBtn: 'Save Changes',
    changePasswordTitle: 'Change Password',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    adminDashboardTitle: 'Al-Aman Taxi Admin Dashboard',
    adminDashboardSubtitle: 'Review driver and merchant applications and manage users',
    pendingReviewTab: 'Pending Approval Requests',
    allUsersTab: 'All Users & Accounts',
    approveBtn: 'Approve & Activate Account',
    rejectBtn: 'Reject Application',
  },
};
