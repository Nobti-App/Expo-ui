import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/src/state/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="choose" options={{ headerShown: false }} />
          <Stack.Screen name="establishment" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/auth" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/list" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/fiche" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/ticket" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/payment" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/confirm" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/scan" options={{ headerShown: false }} />
          <Stack.Screen name="join/[queue_id]" options={{ headerShown: false }} />
          <Stack.Screen name="showboard/[queueid]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </AppProvider>
    </SafeAreaProvider>
  );
}
