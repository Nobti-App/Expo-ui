import { useRouter } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { NobtiLogo } from '@/src/components/NobtiLogo';
import { colors, radius } from '@/src/theme/colors';

function AccessCard({
  label,
  sub,
  color,
  icon,
  onPress,
}: {
  label: string;
  sub: string;
  color: 'green' | 'blue' | 'white';
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}) {
  const bg = color === 'green' ? colors.green : color === 'blue' ? colors.blue : colors.white;
  const titleColor = color === 'white' ? colors.ink : '#fff';
  const subColor = color === 'white' ? colors.soft : 'rgba(255,255,255,0.72)';
  const iconColor = color === 'white' ? colors.green : '#fff';

  return (
    <Pressable style={({ pressed }) => [styles.accessCard, { backgroundColor: bg }, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: color === 'white' ? colors.greenLight : 'rgba(255,255,255,0.2)' }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.accessTitle, { color: titleColor }]}>{label}</Text>
        <Text style={[styles.accessSub, { color: subColor }]}>{sub}</Text>
      </View>
      <Text style={[styles.arrow, { color: titleColor }]}>›</Text>
    </Pressable>
  );
}

export function ChooseScreen() {
  const router = useRouter();

  return (
    <AppShell>
      <View style={styles.hero}>
        <NobtiLogo size={44} showWordmark whiteMode />
        <Text style={styles.heroSub}>Accès établissement</Text>
      </View>

      <View style={{ gap: 12 }}>
        <AccessCard
          label="Accès Établissement"
          sub="Gérer vos files · Tableau de bord"
          color="blue"
          icon="grid"
          onPress={() => router.push('/establishment/auth')}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 18,
  },
  heroSub: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  accessCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  accessTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  accessSub: {
    marginTop: 3,
    fontSize: 12,
  },
  arrow: {
    fontSize: 24,
    opacity: 0.65,
  },
});
