import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';
import { EstablishmentCategory } from '@/src/types';

const categories: { label: string; value: EstablishmentCategory }[] = [
  { label: 'Banque', value: 'bank' },
  { label: 'Médecin', value: 'doctor' },
  { label: 'Clinique', value: 'clinic' },
  { label: 'Laboratoire', value: 'laboratory' },
  { label: 'Administration', value: 'administration' },
  { label: 'Loisir', value: 'leisure' },
];

export function EstabSignupScreen() {
  const router = useRouter();
  const { setAuthSession } = useAppState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<EstablishmentCategory>('doctor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setAuthSession(null, null);

    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove = Object.keys(window.localStorage).filter(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
      );

      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    }

    supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }, [setAuthSession]);

  const disabled = useMemo(
    () => loading || !email.trim() || !password.trim() || !name.trim(),
    [email, loading, name, password]
  );

  const onSignup = async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);


      const signUpResult = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        /// add "operator" role to app metadata for role-based access control in Supabase
        options: {
          data: {
            role: 'operator',
          },
        },
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message);
        return;
      }

      const userId = signUpResult.data.user?.id;
      if (!userId) {
        setError('Inscription créée mais l\'identifiant utilisateur est introuvable.');
        return;
      }

      let sessionToken = signUpResult.data.session?.access_token ?? null;

      if (!sessionToken) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!signInResult.error) {
          sessionToken = signInResult.data.session?.access_token ?? null;
        }
      }

      const { error: insertError } = await supabase.from('establishments').insert({
        name: name.trim(),
        category,
        address: address.trim() || null,
        owner: userId,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setAuthSession(sessionToken, userId);

      if (sessionToken) {
        setSuccess('Compte et établissement créés avec succès.');
        router.replace('/establishment/dashboard');
      } else {
        setSuccess('Compte créé. Vérifiez votre email puis connectez-vous pour continuer.');
        router.replace('/establishment/auth');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <AppHeader title="Créer un profil établissement" backLabel="Connexion" onBack={() => router.push('/establishment/auth')} />

      <View style={styles.card}>
        <Text style={styles.label}>Adresse email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="vous@etablissement.ma" />

        <Text style={[styles.label, styles.mt]}>Mot de passe</Text>
        <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholder="Minimum 6 caractères" />

        <Text style={[styles.label, styles.mt]}>Nom de l&apos;établissement</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ex: Dr. Karim — Cabinet médical" />

        <Text style={[styles.label, styles.mt]}>Adresse</Text>
        <TextInput value={address} onChangeText={setAddress} style={styles.input} placeholder="Hay Ismailia, Beni Mellal" />

        <Text style={[styles.label, styles.mt]}>Catégorie</Text>
        <View style={styles.catWrap}>
          {categories.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setCategory(item.value)}
              style={[styles.catBtn, category === item.value && styles.catBtnOn]}
            >
              <Text style={[styles.catTxt, category === item.value && styles.catTxtOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!success && <Text style={styles.success}>{success}</Text>}

      <PrimaryButton
        label={loading ? 'Création...' : 'Créer le compte et l’établissement'}
        variant="blue"
        onPress={onSignup}
        disabled={disabled}
      />
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
  label: {
    fontSize: 12,
    color: colors.mid,
    fontWeight: '700',
    marginBottom: 6,
  },
  mt: {
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.bg,
  },
  catBtnOn: {
    borderColor: colors.blue,
    backgroundColor: colors.blueLight,
  },
  catTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mid,
  },
  catTxtOn: {
    color: colors.blueDark,
  },
  error: {
    color: '#C0392B',
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 12,
  },
  success: {
    color: colors.greenDark,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 12,
  },
});
