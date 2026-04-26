import { useRouter } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { NobtiLogo } from '@/src/components/NobtiLogo';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

function ActionCard({
  title,
  sub,
  icon,
  iconColor,
  iconBg,
  onPress,
}: {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </Pressable>
  );
}

export function EstabDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { queues } = useAppState();
  const cardWidth = width >= 1100 ? '24%' : '48.6%';

  const wait = ['A', 'B', 'C'].reduce((sum, k) => sum + (queues[k] || []).filter((t) => t.s === 'waiting').length, 0);
  const curr = ['A', 'B', 'C'].reduce((sum, k) => sum + (queues[k] || []).filter((t) => t.s === 'current').length, 0);
  const done = ['A', 'B', 'C'].reduce((sum, k) => sum + (queues[k] || []).filter((t) => t.s === 'done').length, 0);

  return (
    <AppShell>
      <View style={styles.top}>
        <NobtiLogo size={32} showWordmark />
        <Text style={styles.topSub}>Tableau de bord</Text>
      </View>

      <View style={styles.profile}>
        <Text style={styles.profileName}>Dr. Karim — Cabinet médical</Text>
        <Text style={styles.profileSub}>Hay Ismailia · Beni Mellal · Ouvert</Text>
      </View>

      <View style={styles.statRow}>
        <Stat v={String(wait)} l="En attente" color="#B8620A" />
        <Stat v={String(curr)} l="En cours" color={colors.green} />
        <Stat v={String(done)} l="Traités" color={colors.blueDark} />
      </View>

      <Text style={styles.lbl}>Actions</Text>
      <View style={styles.grid}>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Gestion des files"
            sub="Files A · B · C"
            icon="list"
            iconColor={colors.greenDark}
            iconBg={colors.greenLight}
            onPress={() => router.push('/establishment/queues')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Mon compte"
            sub="Profil · Infos"
            icon="user"
            iconColor={colors.blueDark}
            iconBg={colors.blueLight}
            onPress={() => router.push('/establishment/account')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Analytiques"
            sub="Stats · Flux"
            icon="bar-chart"
            iconColor="#B8620A"
            iconBg={colors.amberLight}
            onPress={() => router.push('/establishment/analytics')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Configuration files"
            sub="Créer · Modifier · QR"
            icon="plus-circle"
            iconColor={colors.greenDark}
            iconBg={colors.greenLight}
            onPress={() => router.push('/establishment/create-queue')}
          />
        </View>
      </View>
    </AppShell>
  );
}

function Stat({ v, l, color }: { v: string; l: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statV, { color }]}>{v}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { marginBottom: 12 },
  topSub: { marginTop: 4, fontSize: 12, color: colors.soft },
  profile: {
    backgroundColor: colors.blue,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  profileSub: { marginTop: 2, color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 10, alignItems: 'center' },
  statV: { fontSize: 22, fontWeight: '800' },
  statL: { marginTop: 2, fontSize: 10, fontWeight: '700', color: colors.soft },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  actionSub: { marginTop: 4, fontSize: 11, color: colors.soft },
});
