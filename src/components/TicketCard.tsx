import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MyTicket } from '@/src/types';
import { colors, radius } from '@/src/theme/colors';

type Props = {
  ticket: MyTicket;
};

export function TicketCard({ ticket }: Props) {
  const wait = Math.max(0, ticket.before * ticket.avg);
  const pct = Math.min(100, Math.max(4, Math.round(((ticket.total - ticket.before) / ticket.total) * 100)));
  const chip =
    ticket.before === 0
      ? { label: "C'est votre tour !", color: colors.green, text: '#fff' }
      : ticket.before <= 2
        ? { label: 'Bientôt votre tour', color: colors.greenLight, text: colors.greenDark }
        : { label: 'En attente', color: colors.amberLight, text: '#7A5000' };

  return (
    <View style={styles.card}>
      <View style={[styles.head, ticket.isVip && styles.vipHead]}>
        <Text style={styles.top}>{ticket.isVip ? 'Votre ticket VIP ⭐' : 'Votre ticket'}</Text>
        <Text style={styles.num}>{ticket.num}</Text>
        <Text style={styles.estab}>{ticket.estab}</Text>
      </View>

      <View style={styles.mid}>
        <View style={[styles.chip, { backgroundColor: chip.color }]}>
          <Text style={[styles.chipLabel, { color: chip.text }]}>{chip.label}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.val}>{ticket.before}</Text>
            <Text style={styles.lbl}>Personnes avant vous</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.val}>{ticket.before === 0 ? 'Maintenant' : `${wait} min`}</Text>
            <Text style={styles.lbl}>Temps estimé</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Progression</Text>
          <Text style={styles.progressLabel}>{`${pct}%`}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, ticket.isVip && styles.fillVip, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  head: {
    backgroundColor: colors.green,
    padding: 20,
    alignItems: 'center',
  },
  vipHead: {
    backgroundColor: colors.amber,
  },
  top: {
    fontSize: 10,
    color: 'rgba(255,255,255,.75)',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  num: {
    fontSize: 64,
    lineHeight: 66,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 4,
  },
  estab: { fontSize: 13, color: 'rgba(255,255,255,.85)' },
  mid: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, borderStyle: 'dashed' },
  chip: { alignSelf: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5, marginBottom: 12 },
  chipLabel: { fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 13, alignItems: 'center' },
  val: { fontSize: 20, fontWeight: '800', color: colors.ink },
  lbl: { fontSize: 11, color: colors.soft, marginTop: 2, textAlign: 'center' },
  progressWrap: { padding: 14 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: colors.soft, fontWeight: '700' },
  track: { height: 6, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.green, borderRadius: 4 },
  fillVip: { backgroundColor: colors.amber },
});
