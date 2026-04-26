import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

export function VisitorConfirmScreen() {
  const router = useRouter();
  const { estabs, curEstabId, payOption, payMethod, queues, takeTicket } = useAppState();

  const estab = estabs.find((x) => x.id === curEstabId) || estabs[0];
  const nextNum = useMemo(() => `V${String((queues.A || []).length + 1).padStart(2, '0')}`, [queues.A]);

  return (
    <AppShell>
      <AppHeader title="Réservation confirmée" />

      <View style={styles.box}>
        <Text style={styles.title}>Place réservée !</Text>
        <Text style={styles.sub}>Votre place VIP est confirmée. Vous pouvez rester chez vous jusqu&apos;à la notification.</Text>

        <View style={styles.details}>
          <Row lbl="Établissement" val={estab.name} />
          <Row lbl="Option" val={payOption === 'vip1' ? 'VIP (20-30 DH)' : 'VIP+ (40-50 DH)'} />
          <Row lbl="Paiement" val={payMethod === 'cmi' ? 'Carte bancaire' : payMethod === 'cash' ? "Cash à l'arrivée" : 'Orange Money'} />
          <Row lbl="Numéro ticket" val={nextNum} />
        </View>
      </View>

      <PrimaryButton
        label="Suivre mon ticket VIP"
        onPress={() => {
          takeTicket(true, nextNum);
          router.push('/visitor/ticket');
        }}
      />
      <PrimaryButton label="Retour à la liste" variant="gray" onPress={() => router.push('/visitor/list')} />
    </AppShell>
  );
}

function Row({ lbl, val }: { lbl: string; val: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLbl}>{lbl}</Text>
      <Text style={styles.rowVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: '#9FE1CB',
    backgroundColor: colors.greenLight,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.greenDark, textAlign: 'center' },
  sub: { marginTop: 4, textAlign: 'center', color: colors.mid, lineHeight: 20, fontSize: 13 },
  details: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginTop: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    gap: 12,
  },
  rowLbl: { color: colors.soft, fontSize: 12 },
  rowVal: { color: colors.ink, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
