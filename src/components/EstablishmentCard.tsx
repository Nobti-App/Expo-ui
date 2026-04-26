import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Establishment } from '@/src/types';
import { colors, radius } from '@/src/theme/colors';

type Props = {
  estab: Establishment;
  waitingCount: number;
  waitingMinutes: number;
  onPress: () => void;
};

export function EstablishmentCard({ estab, waitingCount, waitingMinutes, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Image source={estab.image} style={styles.image} resizeMode="cover" />
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.name}>{estab.name}</Text>
            <Text style={styles.addr}>{`${estab.type} · ${estab.city}`}</Text>
          </View>
          <Text style={styles.arr}>›</Text>
        </View>
        <View style={styles.pill}>
          <View style={[styles.dot, waitingCount >= 10 ? styles.dotR : waitingCount >= 4 ? styles.dotA : styles.dotG]} />
          <Text style={styles.pillText}>{`${waitingCount} personne${waitingCount > 1 ? 's' : ''} · ~${waitingMinutes} min`}</Text>
        </View>
        {!estab.open && <Text style={styles.closed}>Fermé</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  cardPressed: {
    opacity: 0.92,
  },
  image: {
    width: '100%',
    height: 100,
    backgroundColor: colors.bg,
  },
  body: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800', color: colors.ink },
  addr: { fontSize: 11, color: colors.soft, marginTop: 2 },
  arr: { fontSize: 18, color: colors.border },
  pill: {
    marginTop: 8,
    backgroundColor: colors.greenLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotG: { backgroundColor: colors.green },
  dotA: { backgroundColor: colors.amber },
  dotR: { backgroundColor: colors.red },
  closed: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#C0392B',
    backgroundColor: colors.redLight,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
