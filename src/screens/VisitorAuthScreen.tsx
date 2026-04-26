import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors, radius } from '@/src/theme/colors';

export function VisitorAuthScreen() {
  const router = useRouter();

  return (
    <AppShell>
      <AppHeader title="Connexion visiteur" backLabel="Accueil" onBack={() => router.push('/choose')} />

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Connexion optionnelle</Text>
        <Text style={styles.noticeText}>Vous pouvez utiliser Nobti.ma sans compte. La connexion permet de retrouver votre historique.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email (optionnel)</Text>
        <TextInput style={styles.input} placeholder="votre@email.ma" keyboardType="email-address" />

        <Text style={[styles.label, { marginTop: 10 }]}>Mot de passe</Text>
        <TextInput style={styles.input} placeholder="••••••••" secureTextEntry />
      </View>

      <PrimaryButton label="Se connecter" onPress={() => router.push('/visitor/list')} />
      <PrimaryButton label="Continuer sans compte" variant="outline" onPress={() => router.push('/visitor/list')} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1.5,
    borderColor: '#FAC775',
    backgroundColor: colors.amberLight,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#854F0B',
  },
  noticeText: {
    marginTop: 3,
    fontSize: 12,
    color: colors.mid,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: colors.mid,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
