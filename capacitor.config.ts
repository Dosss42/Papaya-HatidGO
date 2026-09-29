import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.papayahatidgo.app',
  appName: 'Papaya HatidGo',
  webDir: 'www',
  // Capacitor's default ('debug') prints every plugin call AND its result to the Android log in
  // debug builds, which included the auth token read from SecureStorage (found in Phase 6).
  // Tokens must never appear in logs. For debugging, use chrome://inspect (the WebView console).
  loggingBehavior: 'none',
  plugins: {
    // On the phone, Angular's HTTP requests go through Android's native networking instead of
    // the WebView. The WebView page runs at https://localhost, so without this, calls to the
    // API would hit browser rules (CORS, mixed http/https content). Native requests follow
    // Android's network security config (android/app/src/main/res/xml/network_security_config.xml).
    CapacitorHttp: {
      enabled: true,
    },
    // Local SQLite (Phase 6). Decision: no encryption for now (docs/phase-6-sqlite.md § 4). The
    // file holds no token or password and lives in the app's private storage with backups off.
    // The plugin's Android default is encryption ON, so it is switched off here on purpose.
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
