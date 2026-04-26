import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

export function VisitorScanScreen() {
  const router = useRouter();
  const { setCurEstabId, takeTicket } = useAppState();

  return (
    <AppShell>
      <AppHeader title="Scanner QR" backLabel="Accueil" onBack={() => router.push('/choose')} />

      <View style={styles.box}>
        <View style={styles.qrMock} />
        <Text style={styles.t1}>Scannez le QR code</Text>
        <Text style={styles.t2}>Pointez votre caméra vers le QR code affiché dans l&apos;établissement pour rejoindre la file instantanément.</Text>
      </View>

      <PrimaryButton
        label="Ouvrir la caméra"
        variant="blue"
        onPress={() => {
          setCurEstabId(0);
          takeTicket(false);
          router.push('/visitor/ticket');
        }}
      />
      <PrimaryButton label="Chercher manuellement" variant="gray" onPress={() => router.push('/visitor/list')} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    backgroundColor: colors.blueLight,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrMock: {
    width: 160,
    height: 160,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.blue,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  t1: { fontSize: 15, fontWeight: '800', color: colors.ink },
  t2: { marginTop: 6, textAlign: 'center', color: colors.mid, lineHeight: 20, fontSize: 13 },
});
