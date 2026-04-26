import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

function SelectCard({ onPress, selected, title, price, desc }: { onPress: () => void; selected: boolean; title: string; price: string; desc: string }) {
  return (
    <Pressable style={[styles.selCard, selected && styles.selCardOn]} onPress={onPress}>
      <Text style={styles.selPrice}>{price}</Text>
      <Text style={styles.selName}>{title}</Text>
      <Text style={styles.selDesc}>{desc}</Text>
    </Pressable>
  );
}

export function VisitorPaymentScreen() {
  const router = useRouter();
  const { payOption, setPayOption, payMethod, setPayMethod } = useAppState();

  return (
    <AppShell>
      <AppHeader title="Ma place à distance" backLabel="Retour" onBack={() => router.push('/visitor/fiche')} />

      <View style={styles.hero}>
        <Text style={styles.heroIcon}>⭐</Text>
        <Text style={styles.heroTitle}>Option VIP</Text>
        <Text style={styles.heroSub}>Réservez depuis chez vous · Arrivez au bon moment</Text>
      </View>

      <Text style={styles.lbl}>Choisissez votre option</Text>
      <View style={styles.grid}>
        <SelectCard
          selected={payOption === 'vip1'}
          onPress={() => setPayOption('vip1')}
          title="VIP"
          price="20–30 DH"
          desc="Place à distance + notification"
        />
        <SelectCard
          selected={payOption === 'vip2'}
          onPress={() => setPayOption('vip2')}
          title="VIP+"
          price="40–50 DH"
          desc="Priorité accrue + horaire précis"
        />
      </View>

      <Text style={styles.lbl}>Mode de paiement</Text>
      {[
        ['cmi', '💳 Carte bancaire (CMI)'],
        ['cash', "💵 Cash à l'arrivée"],
        ['orange', '📱 Orange Money / Wafacash'],
      ].map(([key, label]) => (
        <Pressable key={key} style={[styles.payRow, payMethod === key && styles.payRowOn]} onPress={() => setPayMethod(key as never)}>
          <Text style={styles.payLabel}>{label}</Text>
          <Text style={[styles.radio, payMethod === key && styles.radioOn]}>{payMethod === key ? '●' : '○'}</Text>
        </Pressable>
      ))}

      <PrimaryButton label="Confirmer et réserver ma place" variant="vip" onPress={() => router.push('/visitor/confirm')} style={{ marginTop: 10 }} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.amber,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIcon: { fontSize: 28 },
  heroTitle: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { marginTop: 3, fontSize: 13, color: 'rgba(255,255,255,.85)' },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  selCard: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: 14, padding: 14 },
  selCardOn: { borderColor: colors.amber, backgroundColor: '#FFFBF0' },
  selPrice: { fontSize: 21, fontWeight: '800', color: colors.amber },
  selName: { marginTop: 3, fontSize: 12, fontWeight: '800', color: colors.ink },
  selDesc: { marginTop: 2, fontSize: 11, color: colors.soft, lineHeight: 16 },
  payRow: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payRowOn: {
    borderColor: colors.green,
    backgroundColor: '#F5FDF9',
  },
  payLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  radio: { fontSize: 17, color: colors.border },
  radioOn: { color: colors.green },
});
