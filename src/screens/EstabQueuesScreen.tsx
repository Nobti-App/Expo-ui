import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

export function EstabQueuesScreen() {
  const router = useRouter();
  const { curQueue, setCurQueue, queues, queueCall, queueDone, queueCallNext, queueCreateTicket, queueReset } = useAppState();

  const q = queues[curQueue] || [];
  const waiting = q.filter((t) => t.s === 'waiting');
  const current = q.filter((t) => t.s === 'current');
  const done = q.filter((t) => t.s === 'done');
  const hasCurrent = current.length > 0;

  return (
    <AppShell>
      <AppHeader title="Gestion des files" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      <View style={styles.tabs}>
        {['A', 'B', 'C'].map((k) => (
          <Pressable key={k} onPress={() => setCurQueue(k)} style={[styles.tab, curQueue === k && styles.tabOn]}>
            <Text style={[styles.tabText, curQueue === k && styles.tabTextOn]}>{`File ${k}`}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.quickRow}>
        {!hasCurrent && waiting.length > 0 && (
          <PrimaryButton label={`Passer au suivant — ${waiting[0].n}`} style={{ flex: 1 }} onPress={() => queueCallNext(curQueue)} />
        )}
        <PrimaryButton label="+ Ticket sans scan" variant="outline" style={{ flex: 1 }} onPress={() => queueCreateTicket(curQueue)} />
      </View>

      <View style={styles.cardTop}>
        <Mini v={String(waiting.length)} l="Attente" color="#B8620A" />
        <Mini v={String(current.length)} l="En cours" color={colors.green} />
        <Mini v={String(done.length)} l="Traités" color={colors.blueDark} />
      </View>

      <Text style={styles.lbl}>Numéros en file</Text>
      {[...current, ...waiting].map((tk) => (
        <View key={tk.n} style={[styles.item, tk.s === 'current' && styles.itemCurrent]}>
          <View style={[styles.badge, tk.s === 'current' && styles.badgeCurrent]}>
            <Text style={[styles.badgeText, tk.s === 'current' && { color: '#fff' }]}>{tk.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{tk.s === 'current' ? 'En cours' : 'En attente'}</Text>
            <Text style={styles.itemSub}>{`Pris à ${tk.t}`}</Text>
          </View>

          {tk.s === 'current' ? (
            <PrimaryButton label="Terminé" variant="outline" style={{ width: 92, marginBottom: 0 }} onPress={() => queueDone(curQueue, tk.n)} />
          ) : (
            <PrimaryButton
              label="Appeler"
              style={{ width: 92, marginBottom: 0 }}
              onPress={() => queueCall(curQueue, tk.n)}
              disabled={hasCurrent}
            />
          )}
        </View>
      ))}

      {current.length + waiting.length === 0 && <Text style={styles.empty}>Aucun ticket en attente.</Text>}

      <PrimaryButton label="Réinitialiser la file (fin de journée)" variant="danger" onPress={() => queueReset(curQueue)} />
    </AppShell>
  );
}

function Mini({ v, l, color }: { v: string; l: string; color: string }) {
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniV, { color }]}>{v}</Text>
      <Text style={styles.miniL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.bg,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.green, borderColor: colors.green },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.mid },
  tabTextOn: { color: '#fff' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mini: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 10, alignItems: 'center' },
  miniV: { fontSize: 20, fontWeight: '800' },
  miniL: { fontSize: 10, color: colors.soft, marginTop: 2, fontWeight: '700' },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  item: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemCurrent: {
    borderColor: colors.green,
    backgroundColor: '#F5FDF9',
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCurrent: { backgroundColor: colors.green },
  badgeText: { fontWeight: '800', color: colors.ink, fontSize: 12 },
  itemTitle: { fontSize: 12, fontWeight: '800', color: colors.ink },
  itemSub: { fontSize: 11, color: colors.soft, marginTop: 2 },
  empty: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
    color: colors.soft,
    marginBottom: 12,
  },
});
