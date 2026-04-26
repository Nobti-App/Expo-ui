import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { appConfig } from '@/src/lib/appConfig';

const supabaseUrl = appConfig.supabaseUrl;
const supabasePublishableKey = appConfig.supabasePublishableKey;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase config missing: set expo.extra.supabaseUrl and expo.extra.supabasePublishableKey (or publishable key) in app.json/app.config.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabasePublishableKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
  },
});
