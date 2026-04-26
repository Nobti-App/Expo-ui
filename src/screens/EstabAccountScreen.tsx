import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors, radius } from '@/src/theme/colors';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} defaultValue={value} />
    </View>
  );
}

export function EstabAccountScreen() {
  const router = useRouter();

  return (
    <AppShell>
      <AppHeader title="Mon compte" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      <View style={styles.card}>
        <Field label="Nom de l'établissement" value="Dr. Karim — Cabinet médical" />
        <Field label="Nature de l'activité" value="Cabinet médical" />
        <Field label="Numéro de téléphone" value="+212 5 23 42 XX XX" />
        <Field label="Adresse" value="Hay Ismailia, Beni Mellal" />
        <Field label="Horaires" value="Lun–Ven 08:00–18:00, Sam 09:00–13:00" />
      </View>

      <PrimaryButton label="Sauvegarder" onPress={() => {}} />
      <PrimaryButton label="Modifier le mot de passe" variant="danger" onPress={() => {}} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: colors.mid, fontWeight: '700', marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
