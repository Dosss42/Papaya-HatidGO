import { MessageKey } from './messages.en';

/**
 * Every text the app shows, in Taglish (everyday Tagalog with the English words people already
 * use). Typed as Record<MessageKey, string>: a missing or extra key is a BUILD ERROR, so no
 * screen can ever show half-translated text.
 * Glossary: design-briefs/passenger-booking.md § 8 and driver-requirements.md § 9.
 */
export const FIL: Record<MessageKey, string> = {
  // Common
  'common.tryAgain': 'Subukan ulit',
  'common.trying': 'Sinusubukan…',
  'common.soon': 'Darating',
  'common.locked': 'Naka-lock',
  'common.showPassword': 'Ipakita ang password',
  'common.hidePassword': 'Itago ang password',
  'common.cancel': 'Kanselahin',
  'common.preview': 'Preview pa lang ito.',

  // Language
  'lang.choose': 'Piliin ang wika',
  'lang.setting': 'Wika',
  'lang.en': 'English',
  'lang.fil': 'Taglish',
  'lang.enHint': 'Lahat ay English',
  'lang.filHint': 'Tagalog na may English',

  // Get Started
  'welcome.tagline': 'Tricycle sa Papaya, isang tap lang.',
  'welcome.nav': 'Magsimula o mag-login',
  'welcome.start': 'Magsimula',
  'welcome.haveAccount': 'May account na ako',

  // Log in
  'login.title': 'Mag-login',
  'login.lead': 'Gamitin ang email o mobile number ng account mo.',
  'login.loginLabel': 'Email o mobile number',
  'login.loginPlaceholder': 'hal. 0917 123 4567 o email',
  'login.password': 'Password',
  'login.submit': 'Mag-login',
  'login.submitting': 'Nagla-login…',
  'login.forgot': 'Nakalimutan ang password?',
  'login.noAccount': 'Wala pang account? Gumawa',

  // Register
  'register.title': 'Gumawa ng account',
  'register.who': 'Sino ka?',
  'register.driverNote': 'Pagkatapos mag-register, ia-upload mo ang license at mga papeles ng tricycle mo para ma-verify.',
  'register.firstName': 'Pangalan',
  'register.lastName': 'Apelyido',
  'register.phone': 'Mobile number',
  'register.phonePlaceholder': 'hal. 0917 123 4567',
  'register.email': 'Email',
  'register.emailHint': 'Dito namin ipapadala ang code kung makalimutan mo ang password.',
  'register.emailPlaceholder': 'hal. juan@gmail.com',
  'register.password': 'Password',
  'register.passwordHint': '8 o higit pang character, may letra at numero.',
  'register.confirm': 'Ulitin ang password',
  'register.submit': 'Gumawa ng account',
  'register.submitting': 'Ginagawa ang account…',
  'register.haveAccount': 'May account na?',
  'register.loginLink': 'Mag-login',

  // Forgot password
  'forgot.title': 'Bagong password',
  'forgot.step': 'Hakbang {n} sa 2',
  'forgot.lead': 'Ilagay ang email ng account mo. Magpapadala kami ng 6-digit code.',
  'forgot.email': 'Email',
  'forgot.send': 'Magpadala ng code',
  'forgot.sending': 'Nagpapadala…',
  'forgot.code': '6-digit code',
  'forgot.newPassword': 'Bagong password',
  'forgot.repeatNew': 'Ulitin ang bagong password',
  'forgot.change': 'Palitan ang password',
  'forgot.changing': 'Pinapalitan…',
  'forgot.resend': 'Hindi natanggap ang code? Magpadala ulit',
  'forgot.login': 'Mag-login',

  // Roles
  'role.passenger': 'Pasahero',
  'role.driver': 'Driver',

  // Form errors
  'error.required': 'Ilagay ang {label}.',
  'error.email': 'Hindi valid ang email. Halimbawa: juan@gmail.com',
  'error.passwordRule': 'Dapat 8 o higit pang character, may letra at numero.',
  'error.check': 'Tingnan ulit ang {label}.',
  'error.mismatch': 'Hindi magkapareho ang password.',
  'error.code': 'Ang code ay 6 na numero.',
  'label.firstName': 'pangalan mo',
  'label.lastName': 'apelyido mo',
  'label.phone': 'mobile number mo',
  'label.email': 'email mo',
  'label.password': 'password mo',
  'label.passwordAgain': 'password ulit',
  'label.login': 'email o mobile number mo',
  'label.code': '6-digit code',

  // Connection and server errors
  'error.network': 'Walang internet o hindi maabot ang server. Subukan ulit.',
  'error.timeout': 'Masyadong matagal sumagot ang server. Subukan ulit.',
  'error.unknown': 'May problema. Subukan ulit.',
  'error.adminNotAllowed': 'Para sa pasahero at driver ang app na ito. Gamitin ang admin dashboard.',

  // Offline notice
  'offline.title': 'Walang internet',
  'offline.lastUpdate': 'Huling update {time}',

  // Tabs
  'tabs.book': 'Mag-book',
  'tabs.rides': 'Biyahe',
  'tabs.account': 'Account',
  'tabs.home': 'Home',
  'tabs.earnings': 'Kita',

  // Account
  'account.title': 'Account',
  'account.aria': 'Ang account mo',
  'account.settings': 'Mga setting',
  'account.tricycle': 'Tricycle ko',
  'account.documents': 'Mga dokumento',
  'account.subscription': 'Subscription',
  'account.help': 'Tulong',

  // Logout
  'logout.button': 'Logout',
  'logout.busy': 'Nagla-logout…',
  'logout.confirmTitle': 'Mag-logout?',
  'logout.confirmText': 'Kailangan mong mag-login ulit para magamit ang app.',
  'logout.cancel': 'Huwag muna',
  'logout.confirm': 'Logout',

  // Rides and earnings
  'rides.title': 'Mga biyahe',
  'rides.emptyTitle': 'Wala ka pang biyahe',
  'rides.passengerEmpty': 'Dito lalabas ang mga natapos mong biyahe at ang resibo ng bawat isa.',
  'rides.driverEmpty': 'Dito lalabas ang mga pasaherong naihatid mo.',
  'earnings.title': 'Kita',
  'earnings.emptyTitle': 'Wala ka pang kita',
  'earnings.emptyText': 'Makikita mo rito ang kita mo ngayong araw, linggo, at buwan kapag may natapos ka nang biyahe.',

  // Book (preview)
  'book.mapHere': 'Dito lalabas ang mapa.',
  'book.title': 'Saan ka susunduin?',
  'book.lead': 'Igagalaw mo ang mapa para mailagay ang pickup mo.',
  'book.landmark': 'Landmark (opsyonal)',
  'book.landmarkPlaceholder': 'hal. asul na gate, tabi ng sari-sari store',
  'book.preview': 'Preview pa lang ito. Hindi pa makakapag-book.',
  'book.next': 'Dito ako susunduin',

  // Driver Home (preview)
  'home.hello': 'Kumusta, {name}!',
  'home.head.pending_verification': 'Ilang hakbang na lang, makakapag-drive ka na!',
  'home.head.under_review': 'Sinusuri ng admin ang mga dokumento mo.',
  'home.head.rejected': 'May kailangang ayusin sa mga dokumento mo.',
  'home.head.expired': 'May expired sa mga dokumento mo. Hindi ka muna makakapag-online.',
  'home.head.verified': 'Verified ka na! Mag-subscribe para makapag-online.',
  'home.head.default': 'Ihanda natin ang account mo para makapag-drive.',
  'home.next.rejected': 'Ayusin ang dokumento',
  'home.next.expired': 'I-upload ang bago',
  'home.next.verified': 'Subscribe',
  'home.next.default': 'Idagdag ang tricycle mo',
  'home.checklistAria': 'Mga kailangan bago mag-online',
  'home.check.tricycle': 'Tricycle mo',
  'home.check.tricycleDetail': 'Plate number at kulay',
  'home.check.documents': 'Mga dokumento',
  'home.check.documentsDetail': 'License, OR/CR, MTOP, clearance',
  'home.check.subscription': 'Subscription',
  'home.check.subscriptionDetail': 'Para makatanggap ng pasahero',
  'home.check.online': 'Mag-online',
  'home.check.onlineDetail': 'Bubukas kapag tapos ang 1 hanggang 3',
  'home.preview': 'Preview pa lang ito. Magagamit na ang checklist sa susunod na update.',
};
