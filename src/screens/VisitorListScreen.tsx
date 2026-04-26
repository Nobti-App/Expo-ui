import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { EstablishmentCard } from '@/src/components/EstablishmentCard';
import { NobtiLogo } from '@/src/components/NobtiLogo';
import { useAppState } from '@/src/state/AppContext';
import { colors } from '@/src/theme/colors';

export function VisitorListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const { estabs, setCurEstabId, estabCount, estabWait } = useAppState();
  const columns = width >= 1100 ? 3 : width >= 760 ? 2 : 1;
  const colWidth = `${100 / columns}%` as const;

  const filtered = useMemo(() => {
    if (!search.trim()) return estabs;
    const needle = search.toLowerCase();
    return estabs.filter((e) => e.name.toLowerCase().includes(needle) || e.city.toLowerCase().includes(needle));
  }, [estabs, search]);

  return (
    <AppShell>
      <View style={styles.top}>
        <NobtiLogo size={32} showWordmark />
        <Text style={styles.sub}>Autour de vous</Text>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#B8C0CC" />
        <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..." style={styles.search} />
      </View>

      <Text style={styles.lbl}>Établissements</Text>

      <View style={styles.grid}>
        {filtered.map((estab) => (
          <View key={estab.id} style={[styles.col, { width: colWidth }]}>
            <EstablishmentCard
              estab={estab}
              waitingCount={estabCount(estab.id)}
              waitingMinutes={estabWait(estab.id)}
              onPress={() => {
                setCurEstabId(estab.id);
                router.push('/visitor/fiche');
              }}
            />
          </View>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  top: {
    marginBottom: 12,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.soft,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.bg,
    marginBottom: 14,
  },
  search: {
    flex: 1,
    fontSize: 14,
    paddingRight: 12,
    paddingVertical: 10,
  },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  col: {
    paddingHorizontal: 6,
  },
});
