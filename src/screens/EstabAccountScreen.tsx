import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type DimensionValue } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { supabase } from '@/src/lib/supabase';
import { colors, radius } from '@/src/theme/colors';
import { EstablishmentCategory } from '@/src/types';

type EstablishmentRow = {
  id: string;
  name: string;
  category: EstablishmentCategory;
  address: string | null;
};

const categoryLabelMap: Record<EstablishmentCategory, string> = {
  bank: 'Banque',
  doctor: 'Médecin',
  clinic: 'Clinique',
  laboratory: 'Laboratoire',
  administration: 'Administration',
  leisure: 'Loisir',
};

const categoryFromLabel: Record<string, EstablishmentCategory> = {
  banque: 'bank',
  bank: 'bank',
  médecin: 'doctor',
  medecin: 'doctor',
  doctor: 'doctor',
  clinique: 'clinic',
  clinic: 'clinic',
  laboratoire: 'laboratory',
  laboratory: 'laboratory',
  administration: 'administration',
  loisir: 'leisure',
  leisure: 'leisure',
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} />
    </View>
  );
}

export function EstabAccountScreen() {
  const router = useRouter();
  const [establishmentId, setEstablishmentId] = useState('');
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalizedCategory = useMemo(() => {
    const normalized = activity.trim().toLowerCase();
    return categoryFromLabel[normalized] ?? null;
  }, [activity]);

  const loadAccount = useCallback(async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const userResult = await supabase.auth.getUser();
      const currentUser = userResult.data.user;
      if (!currentUser?.id) {
        setError('Utilisateur introuvable.');
        return;
      }

      const { data: establishment, error: establishmentError } = await supabase
        .from('establishments')
        .select('id, name, category, address')
        .eq('owner', currentUser.id)
        .limit(1)
        .maybeSingle<EstablishmentRow>();

      if (establishmentError) throw establishmentError;

      if (!establishment?.id) {
        setError('Aucun établissement trouvé pour ce compte.');
        return;
      }

      const metadata = currentUser.user_metadata ?? {};

      setEstablishmentId(establishment.id);
      setName(establishment.name ?? '');
      setActivity(categoryLabelMap[establishment.category] ?? '');
      setAddress(establishment.address ?? '');
      setPhone(
        typeof metadata.contact_phone === 'string'
          ? metadata.contact_phone
          : typeof currentUser.phone === 'string'
            ? currentUser.phone
            : ''
      );
      setHours(typeof metadata.hours === 'string' ? metadata.hours : '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les informations du compte.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const onSave = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Le nom de l’établissement est requis.');
      return;
    }

    if (!normalizedCategory) {
      setError('Nature de l’activité invalide. Utilisez: Banque, Médecin, Clinique, Laboratoire, Administration ou Loisir.');
      return;
    }

    if (!establishmentId) {
      setError('Établissement introuvable.');
      return;
    }

    try {
      setSaving(true);

      const { error: establishmentError } = await supabase
        .from('establishments')
        .update({
          name: name.trim(),
          category: normalizedCategory,
          address: address.trim() || null,
        })
        .eq('id', establishmentId);

      if (establishmentError) throw establishmentError;

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          contact_phone: phone.trim(),
          hours: hours.trim(),
        },
      });

      if (authUpdateError) throw authUpdateError;

      setSuccess('Informations mises à jour avec succès.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible de sauvegarder les informations.');
    } finally {
      setSaving(false);
    }
  }, [address, establishmentId, hours, name, normalizedCategory, phone]);

  if (loading) {
    return (
      <AppShell>
        <AppHeader title="Mon compte" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />
        <View style={styles.card}>
          <LoadingLine width="78%" />
          <LoadingLine width="92%" />
          <LoadingLine width="68%" />
          <LoadingLine width="88%" />
          <LoadingLine width="74%" />
        </View>
        <Text style={styles.info}>Chargement des informations du compte...</Text>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Mon compte" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      {!loading && (
      <>
        <View style={styles.card}>
        <Field label="Nom de l'établissement" value={name} onChangeText={setName} placeholder="Ex: Cabinet Karim" />
        <Field
          label="Nature de l'activité"
          value={activity}
          onChangeText={setActivity}
          placeholder="Banque, Médecin, Clinique, Laboratoire..."
        />
        <Field label="Numéro de téléphone" value={phone} onChangeText={setPhone} placeholder="Ex: +212 6 12 34 56 78" />
        <Field label="Adresse" value={address} onChangeText={setAddress} placeholder="Ex: Hay Ismailia, Beni Mellal" />
        <Field label="Horaires" value={hours} onChangeText={setHours} placeholder="Ex: Lun–Ven 08:00–18:00" />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}

        <PrimaryButton label={saving ? 'Sauvegarde...' : 'Sauvegarder'} onPress={onSave} disabled={loading || saving} />
        {/* <PrimaryButton label="Modifier le mot de passe" variant="danger" onPress={() => router.push('/change-password')} /> */}
      </>
      )}
    </AppShell>
  );
}

function LoadingLine({ width }: { width: DimensionValue }) {
  return <View style={[styles.loadingLine, { width }]} />;
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
    color: colors.ink,
  },
  loadingLine: {
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  info: {
    color: colors.soft,
    marginBottom: 8,
    fontSize: 12,
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
