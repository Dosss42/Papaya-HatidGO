import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.papayahatidgo.app',
  appName: 'Papaya HatidGo',
  webDir: 'www',
  plugins: {
    // On the phone, Angular's HTTP requests go through Android's native networking instead of
    // the WebView. The WebView page runs at https://localhost, so without this, calls to the
    // API would hit browser rules (CORS, mixed http/https content). Native requests follow
    // Android's network security config (android/app/src/main/res/xml/network_security_config.xml).
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
