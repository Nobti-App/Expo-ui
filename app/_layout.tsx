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
          <Stack.Screen name="visitor/auth" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/list" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/fiche" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/ticket" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/payment" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/confirm" options={{ headerShown: false }} />
          <Stack.Screen name="visitor/scan" options={{ headerShown: false }} />
          <Stack.Screen name="join/[queue_id]" options={{ headerShown: false }} />
          <Stack.Screen name="showboard/[queueid]" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/auth" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/signup" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/queues" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/account" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/analytics" options={{ headerShown: false }} />
          <Stack.Screen name="establishment/create-queue" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </AppProvider>
    </SafeAreaProvider>
  );
}
