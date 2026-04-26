import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

export function EstabAuthScreen() {
  const router = useRouter();
  const { setAuthSession } = useAppState();
  const [email, setEmail] = useState('karim@cabinet.ma');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignIn = async () => {
    setError('');

    try {
      setLoading(true);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const token = data.session?.access_token ?? null;
      const userId = data.user?.id ?? null;
      setAuthSession(token, userId);

      if (!userId) {
        setError('Session créée sans utilisateur valide.');
        return;
      }

      const { data: ownedEstabs, error: estabCheckError } = await supabase
        .from('establishments')
        .select('id')
        .eq('owner', userId)
        .limit(1);

      if (estabCheckError) {
        setError(estabCheckError.message);
        return;
      }

      if ((ownedEstabs?.length ?? 0) > 0) {
        router.replace('/establishment/dashboard');
      } else {
        router.replace('/establishment/signup' as never);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Espace établissement</Text>
        <Text style={styles.heroSub}>Connectez-vous pour accéder à votre tableau de bord</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Adresse email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Mot de passe</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton label={loading ? 'Connexion...' : 'Se connecter'} variant="blue" onPress={onSignIn} disabled={loading || !email.trim() || !password.trim()} />
      <PrimaryButton label="Créer un nouveau profil établissement" variant="outline" onPress={() => router.push('/establishment/signup' as never)} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { marginTop: 4, color: 'rgba(255,255,255,0.76)', fontSize: 13 },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: colors.mid, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: {
    color: '#C0392B',
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 12,
  },
});
