import Constants from 'expo-constants';

type ExpoExtra = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  apiBaseUrl?: string;
  wsBaseUrl?: string;
};

const fromExpoConfig = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const fromManifest = ((Constants as never)?.manifest?.extra ?? {}) as ExpoExtra;
const fromManifest2 = ((Constants as never)?.manifest2?.extra?.expoClient ?? {}) as ExpoExtra;

const extra: ExpoExtra = {
  ...fromManifest,
  ...fromManifest2,
  ...fromExpoConfig,
};

export const appConfig = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabasePublishableKey: extra.supabasePublishableKey ?? '',
  apiBaseUrl: extra.apiBaseUrl ?? '',
  wsBaseUrl: extra.wsBaseUrl ?? '',
};
