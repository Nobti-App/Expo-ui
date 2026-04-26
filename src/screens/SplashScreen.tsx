import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NobtiLogo } from '@/src/components/NobtiLogo';
import { colors } from '@/src/theme/colors';

export function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/choose'), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.page}>
      <NobtiLogo size={88} />
      <Text style={styles.name}>Nobti.ma</Text>
      <Text style={styles.tag}>Gagnez du temps {'\n'} Arrivez au bon moment</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  name: {
    marginTop: 18,
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
  },
  tag: {
    marginTop: 10,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  track: {
    marginTop: 40,
    width: 52,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
});
