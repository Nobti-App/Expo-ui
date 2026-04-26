import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { colors, radius } from '@/src/theme/colors';

export function EstabAnalyticsScreen() {
  const router = useRouter();
  const data = [
    { h: '08h', v: 2 },
    { h: '09h', v: 5 },
    { h: '10h', v: 7 },
    { h: '11h', v: 6 },
    { h: '12h', v: 3 },
    { h: '13h', v: 1 },
  ];
  const max = Math.max(...data.map((x) => x.v));

  return (
    <AppShell>
      <AppHeader title="Analytiques" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      <Text style={styles.lbl}>Aujourd&apos;hui</Text>
      <View style={styles.card}>
        <Row lbl="Patients servis" val="13" highlight={colors.green} />
        <Row lbl="Temps moyen d'attente" val="18 min" />
        <Row lbl="Heure de pointe" val="09h00 – 11h00" />
        <Row lbl="Tickets VIP" val="2" highlight={colors.amber} />
      </View>

      <Text style={[styles.lbl, { marginTop: 8 }]}>Flux par heure</Text>
      <View style={styles.card}>
        {data.map((d) => (
          <View key={d.h} style={styles.barRow}>
            <Text style={styles.barHour}>{d.h}</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${(d.v / max) * 100}%` }]} /></View>
            <Text style={styles.barVal}>{d.v}</Text>
          </View>
        ))}
      </View>
    </AppShell>
  );
}

function Row({ lbl, val, highlight }: { lbl: string; val: string; highlight?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLbl}>{lbl}</Text>
      <Text style={[styles.rowVal, highlight && { color: highlight }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  rowLbl: { color: colors.mid, fontSize: 13 },
  rowVal: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  barHour: { width: 30, fontSize: 11, color: colors.soft },
  track: { flex: 1, height: 18, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.green },
  barVal: { width: 16, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.ink },
});
