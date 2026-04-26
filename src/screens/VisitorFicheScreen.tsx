import { useRouter } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

export function VisitorFicheScreen() {
  const router = useRouter();
  const { estabs, curEstabId, estabCount, estabWait, currentTicket, takeTicket } = useAppState();

  const estab = estabs.find((x) => x.id === curEstabId) || estabs[0];
  const c = estabCount(estab.id);

  return (
    <AppShell>
      <AppHeader title="Fiche établissement" backLabel="Retour" onBack={() => router.push('/visitor/list')} />

      <View style={styles.card}>
        <Image source={estab.image} style={styles.image} />
        <View style={styles.body}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{estab.name}</Text>
              <Text style={styles.type}>{`${estab.type} · ${estab.city}`}</Text>
            </View>
            <Text style={[styles.badge, { backgroundColor: estab.open ? colors.greenLight : colors.redLight, color: estab.open ? colors.greenDark : '#C0392B' }]}>
              {estab.open ? 'Ouvert' : 'Fermé'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="phone" size={14} color={colors.soft} />
            <Text style={styles.info}>{estab.tel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={colors.soft} />
            <Text style={styles.info}>{estab.addr}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color={colors.soft} />
            <Text style={styles.info}>{estab.hours}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statV}>{c}</Text><Text style={styles.statL}>En attente</Text></View>
            <View style={styles.stat}><Text style={styles.statV}>{estabWait(estab.id)} min</Text><Text style={styles.statL}>Estimation</Text></View>
            <View style={styles.stat}><Text style={styles.statV}>{currentTicket()}</Text><Text style={styles.statL}>Actuel</Text></View>
          </View>
        </View>
      </View>

      {!estab.open && (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>Établissement fermé</Text>
          <Text style={styles.alertText}>Cet établissement est actuellement fermé.</Text>
        </View>
      )}

      <PrimaryButton
        label="Prendre un ticket — Gratuit"
        onPress={() => {
          takeTicket(false);
          router.push('/visitor/ticket');
        }}
        disabled={!estab.open}
      />
      <PrimaryButton label="⭐ Ma place à distance — VIP" variant="vip" onPress={() => router.push('/visitor/payment')} />
      <Text style={styles.hint}>VIP : réservez depuis chez vous, arrivez au bon moment</Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: { width: '100%', height: 140, backgroundColor: colors.bg },
  body: { padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  type: { marginTop: 4, fontSize: 13, color: colors.soft },
  badge: { fontSize: 12, fontWeight: '700', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  info: { fontSize: 13, color: colors.mid },
  statsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10, alignItems: 'center' },
  statV: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  statL: { fontSize: 10, color: colors.soft, marginTop: 3 },
  hint: { textAlign: 'center', color: colors.soft, marginTop: 4, fontSize: 12 },
  alert: {
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: colors.redLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  alertTitle: { fontSize: 13, color: '#C0392B', fontWeight: '800' },
  alertText: { fontSize: 12, color: colors.mid, marginTop: 2 },
});
