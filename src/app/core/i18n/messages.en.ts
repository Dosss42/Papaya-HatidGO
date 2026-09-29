/**
 * Every text the app shows, in English. This file DEFINES the keys (MessageKey):
 * messages.fil.ts must have exactly the same keys, or the app doesn't build.
 * Placeholders: {name} → filled in by I18nService.t(key, { name: 'Maria' }).
 * Glossary and tone: design-briefs/passenger-booking.md § 8 (Taglish), plain English here.
 */
export const EN = {
  // Common
  'common.tryAgain': 'Try again',
  'common.trying': 'Trying…',
  'common.soon': 'Coming soon',
  'common.locked': 'Locked',
  'common.showPassword': 'Show password',
  'common.hidePassword': 'Hide password',
  'common.cancel': 'Cancel',
  'common.preview': 'This is only a preview.',

  // Language
  'lang.choose': 'Choose your language',
  'lang.setting': 'Language',
  'lang.en': 'English',
  'lang.fil': 'Taglish',
  'lang.enHint': 'All in English',
  'lang.filHint': 'Tagalog with English words',

  // Get Started
  'welcome.tagline': 'Tricycle rides in Papaya, one tap away.',
  'welcome.nav': 'Get started or log in',
  'welcome.start': 'Get Started',
  'welcome.haveAccount': 'I already have an account',

  // Log in
  'login.title': 'Log in',
  'login.lead': "Use your account's email or mobile number.",
  'login.loginLabel': 'Email or mobile number',
  'login.loginPlaceholder': 'e.g. 0917 123 4567 or email',
  'login.password': 'Password',
  'login.submit': 'Log in',
  'login.submitting': 'Logging in…',
  'login.forgot': 'Forgot password?',
  'login.noAccount': 'No account yet? Sign up',

  // Register
  'register.title': 'Create an account',
  'register.who': 'Who are you?',
  'register.driverNote': "After signing up, you'll upload your license and tricycle papers to be verified.",
  'register.firstName': 'First name',
  'register.lastName': 'Last name',
  'register.phone': 'Mobile number',
  'register.phonePlaceholder': 'e.g. 0917 123 4567',
  'register.email': 'Email',
  'register.emailHint': "We'll send a code here if you forget your password.",
  'register.emailPlaceholder': 'e.g. juan@gmail.com',
  'register.password': 'Password',
  'register.passwordHint': '8 or more characters, with a letter and a number.',
  'register.confirm': 'Repeat password',
  'register.submit': 'Create account',
  'register.submitting': 'Creating account…',
  'register.haveAccount': 'Already have an account?',
  'register.loginLink': 'Log in',

  // Forgot password
  'forgot.title': 'New password',
  'forgot.step': 'Step {n} of 2',
  'forgot.lead': "Enter your account's email. We'll send a 6-digit code.",
  'forgot.email': 'Email',
  'forgot.send': 'Send code',
  'forgot.sending': 'Sending…',
  'forgot.code': '6-digit code',
  'forgot.newPassword': 'New password',
  'forgot.repeatNew': 'Repeat new password',
  'forgot.change': 'Change password',
  'forgot.changing': 'Changing…',
  'forgot.resend': "Didn't get the code? Send again",
  'forgot.login': 'Log in',

  // Roles
  'role.passenger': 'Passenger',
  'role.driver': 'Driver',

  // Form errors (shown on the phone before anything is sent)
  'error.required': 'Enter {label}.',
  'error.email': "That email isn't valid. Example: juan@gmail.com",
  'error.passwordRule': 'Use 8 or more characters, with a letter and a number.',
  'error.check': 'Check {label} again.',
  'error.mismatch': "The passwords don't match.",
  'error.code': 'The code is 6 digits.',
  'label.firstName': 'your first name',
  'label.lastName': 'your last name',
  'label.phone': 'your mobile number',
  'label.email': 'your email',
  'label.password': 'your password',
  'label.passwordAgain': 'the password again',
  'label.login': 'your email or mobile number',
  'label.code': 'the 6-digit code',

  // Connection and server errors
  'error.network': "No internet, or the server can't be reached. Try again.",
  'error.timeout': 'The server took too long to answer. Try again.',
  'error.unknown': 'Something went wrong. Try again.',
  'error.adminNotAllowed': 'This app is for passengers and drivers. Please use the admin dashboard.',

  // Offline notice
  'offline.title': 'No internet',
  'offline.lastUpdate': 'Last updated {time}',

  // Tabs
  'tabs.book': 'Book',
  'tabs.rides': 'Rides',
  'tabs.account': 'Account',
  'tabs.home': 'Home',
  'tabs.earnings': 'Earnings',

  // Account
  'account.title': 'Account',
  'account.aria': 'Your account',
  'account.settings': 'Settings',
  'account.tricycle': 'My tricycle',
  'account.documents': 'Documents',
  'account.subscription': 'Subscription',
  'account.help': 'Help',

  // Logout
  'logout.button': 'Logout',
  'logout.busy': 'Logging out…',
  'logout.confirmTitle': 'Log out?',
  'logout.confirmText': "You'll need to log in again to use the app.",
  'logout.cancel': 'Cancel',
  'logout.confirm': 'Logout',

  // Rides and earnings
  'rides.title': 'Rides',
  'rides.emptyTitle': 'No rides yet',
  'rides.passengerEmpty': 'Your finished rides and their receipts will appear here.',
  'rides.driverEmpty': "The passengers you've dropped off will appear here.",
  'earnings.title': 'Earnings',
  'earnings.emptyTitle': 'No earnings yet',
  'earnings.emptyText': 'Your earnings for today, this week and this month will show here once you finish a ride.',

  // Book (preview)
  'book.mapHere': 'The map will appear here.',
  'book.title': 'Where should we pick you up?',
  'book.lead': 'Move the map to place your pickup.',
  'book.landmark': 'Landmark (optional)',
  'book.landmarkPlaceholder': 'e.g. blue gate, next to the sari-sari store',
  'book.preview': "This is only a preview. Booking isn't available yet.",
  'book.next': 'Pick me up here',

  // Driver Home (preview)
  'home.hello': 'Hi, {name}!',
  'home.head.pending_verification': 'A few more steps and you can start driving!',
  'home.head.under_review': 'The admin is reviewing your documents.',
  'home.head.rejected': 'Something in your documents needs fixing.',
  'home.head.expired': "One of your documents has expired. You can't go online for now.",
  'home.head.verified': "You're verified! Subscribe to go online.",
  'home.head.default': "Let's get your account ready to drive.",
  'home.next.rejected': 'Fix the document',
  'home.next.expired': 'Upload the new one',
  'home.next.verified': 'Subscribe',
  'home.next.default': 'Add your tricycle',
  'home.checklistAria': 'What you need before going online',
  'home.check.tricycle': 'Your tricycle',
  'home.check.tricycleDetail': 'Plate number and color',
  'home.check.documents': 'Documents',
  'home.check.documentsDetail': 'License, OR/CR, MTOP, clearance',
  'home.check.subscription': 'Subscription',
  'home.check.subscriptionDetail': 'So you can receive passengers',
  'home.check.online': 'Go online',
  'home.check.onlineDetail': 'Unlocks when 1 to 3 are done',
  'home.preview': 'This is only a preview. The checklist will work in the next update.',
} as const;

export type MessageKey = keyof typeof EN;
