import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { createQueue, listQueues, QueueEntity, updateQueue } from '@/src/lib/api/queues';
import { appConfig } from '@/src/lib/appConfig';
import { supabase } from '@/src/lib/supabase';
import { colors, radius } from '@/src/theme/colors';


function parseMaxTickets(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, parsed);
}

function parseAvgWait(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

function normalizeDomain(domain: string) {
  const trimmed = domain.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export function EstabCreateQueueScreen() {
  const router = useRouter();
  const baseUrl = normalizeDomain(appConfig.domain);
  const [queues, setQueues] = useState<QueueEntity[]>([]);
  const [establishmentId, setEstablishmentId] = useState('');
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [maxTickets, setMaxTickets] = useState('');
  const [avgWaitMinutes, setAvgWaitMinutes] = useState('');
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [visibleQrQueueId, setVisibleQrQueueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = useCallback(() => {
    setEditingQueueId(null);
    setName('');
    setPrefix('A');
    setMaxTickets('');
    setAvgWaitMinutes('');
  }, []);

  const navigateToQueueLink = useCallback((queueId: string) => {
    if (!baseUrl) {
      setError('Domain manquant. Vérifiez EXPO_PUBLIC_DOMAIN.');
      return;
    }

    const queueUrl = `${baseUrl}/establishment/queues?queue_id=${queueId}`;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(queueUrl, '_blank', 'noopener,noreferrer');
    }
  }, [baseUrl]);


  const loadQueues = useCallback(async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      if (!userId) {
        setError('Utilisateur introuvable.');
        return;
      }

      const { data: ownedEstabs, error: estabError } = await supabase
        .from('establishments')
        .select('id')
        .eq('owner', userId)
        .limit(1);

      if (estabError) {
        setError(estabError.message);
        return;
      }

      const currentEstablishmentId = (ownedEstabs?.[0]?.id as string | undefined) ?? '';
      if (!currentEstablishmentId) {
        setError('Aucun établissement trouvé pour ce compte.');
        return;
      }

      setEstablishmentId(currentEstablishmentId);

      const fetchedQueues = await listQueues();
      const ownQueues = fetchedQueues.filter((queue) => queue.establishment_id === currentEstablishmentId);
      setQueues(ownQueues);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  const onSubmit = useCallback(async () => {
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Le nom de la file est requis.');
      return;
    }

    if (!establishmentId) {
      setError('Établissement introuvable.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        establishment_id: establishmentId,
        name: trimmedName,
        prefix,
        max_tickets: parseMaxTickets(maxTickets),
        avg_wait_minutes: parseAvgWait(avgWaitMinutes),
      };

      if (editingQueueId) {
        const updatedQueue = await updateQueue(editingQueueId, payload);
        setQueues((prev) => prev.map((queue) => (queue.id === updatedQueue.id ? updatedQueue : queue)));
        setSuccess('File mise à jour.');
      } else {
        const createdQueue = await createQueue(payload);
        setQueues((prev) => [createdQueue, ...prev]);
        setSuccess('File créée.');
      }

      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la file.');
    } finally {
      setSaving(false);
    }
  }, [avgWaitMinutes, editingQueueId, establishmentId, maxTickets, name, prefix, resetForm]);

  const openShowboardLink = useCallback(async (queueId: string) => {
    if (!baseUrl) {
      setError('Domain manquant. Vérifiez EXPO_PUBLIC_DOMAIN.');
      return;
    }

    const showboardUrl = `${baseUrl}/showboard/${queueId}`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(showboardUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      await Linking.openURL(showboardUrl);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Impossible d’ouvrir le showboard.');
    }
  }, [baseUrl]);

  const formTitle = editingQueueId ? 'Modifier la file' : 'Créer une file';
  const submitLabel = editingQueueId ? 'Enregistrer les modifications' : 'Créer la file';

  return (
    <AppShell>
      <AppHeader title="Configuration des files" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      <View style={styles.card}>
        <Text style={styles.formTitle}>{formTitle}</Text>

        <Text style={styles.label}>Nom de la file</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ex : Consultations générales" />

        <Text style={[styles.label, { marginTop: 10 }]}>Préfixe ticket (A/B/C)</Text>
        <View style={styles.prefixRow}>
          {/* /// input to choose the ticket prefix. max 2 characters.  */}
          <TextInput
            value={prefix}
            onChangeText={(text) => setPrefix(text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
            maxLength={2}
            style={[styles.input, { flex: 1 }]}
            placeholder="Ex : A"
            autoCapitalize="characters"
            // allow only alphanumeric characters
          />
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Max tickets</Text>
        <TextInput
          value={maxTickets}
          onChangeText={setMaxTickets}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Ex : 100"
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Avg wait (minutes)</Text>
        <TextInput
          value={avgWaitMinutes}
          onChangeText={setAvgWaitMinutes}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Ex : 5"
        />

        <PrimaryButton label={saving ? 'Enregistrement...' : submitLabel} onPress={onSubmit} disabled={saving || !name.trim()} />
        {editingQueueId && <PrimaryButton label="Annuler la modification" variant="outline" onPress={resetForm} />}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!success && <Text style={styles.success}>{success}</Text>}

      <Text style={styles.sectionLabel}>Files créées</Text>

      {loading ? (
        <View style={styles.result}>
          <Text style={styles.rSub}>Chargement des files...</Text>
        </View>
      ) : queues.length === 0 ? (
        <View style={styles.result}>
          <Text style={styles.rSub}>Aucune file créée pour le moment.</Text>
        </View>
      ) : (
        queues.map((queue) => {
          const joinUrl = baseUrl ? `${baseUrl}/join/${queue.id}` : '';
          const qrVisible = visibleQrQueueId === queue.id;
          const maxTicketsLabel = queue.max_tickets ?? '—';

          return (
            <View key={queue.id} style={styles.queueCard}>
              <View style={styles.queueHead}>
                <Text style={styles.rName}>{queue.name}</Text>
                <Text style={styles.prefixBadge}>{queue.prefix}</Text>
              </View>

              <Text style={styles.queueMeta}>{`Max tickets: ${maxTicketsLabel} · Avg wait: ${queue.avg_wait_minutes ?? '—'} min`}</Text>

              <View style={styles.queueActions}>
                <PrimaryButton
                  label="Modifier"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setEditingQueueId(queue.id);
                    setName(queue.name);
                    setPrefix(queue.prefix || '');
                      setMaxTickets(queue.max_tickets ? String(queue.max_tickets) : '');
                      setAvgWaitMinutes(queue.avg_wait_minutes !== null && queue.avg_wait_minutes !== undefined
                        ? String(queue.avg_wait_minutes)
                        : '');
                    setVisibleQrQueueId(null);
                  }}
                />
                <PrimaryButton
                  label={qrVisible ? 'Masquer QR' : 'Générer QR'}
                  style={{ flex: 1 }}
                  onPress={() => setVisibleQrQueueId((prev) => (prev === queue.id ? null : queue.id))}
                />
              </View>
                
              <View style={styles.queueActions}>
              <PrimaryButton
                label="Ouvrir showboard"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => void openShowboardLink(queue.id)}
              />
              <PrimaryButton
                label="naviguer vers la file"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => void navigateToQueueLink(queue.id)}
              />
              </View>

              {qrVisible && (
                <View style={styles.qrWrap}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}` }}
                    style={styles.qrImage}
                  />
                  <Text style={styles.url}>{joinUrl}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
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
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 10,
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
  prefixRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  result: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  queueCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  queueHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  queueMeta: {
    fontSize: 12,
    color: colors.soft,
    marginBottom: 10,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  showboardAction: {
    marginTop: 8,
    marginBottom: 0,
  },
  qrWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    padding: 12,
    alignItems: 'center',
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: radius.sm,
    marginBottom: 10,
  },
  prefixBadge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.greenLight,
    color: colors.greenDark,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 12,
  },
  rName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  rSub: { fontSize: 12, color: colors.soft, marginTop: 3, textAlign: 'center' },
  url: {
    fontSize: 11,
    color: colors.soft,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    textAlign: 'center',
  },
  error: {
    color: colors.red,
    backgroundColor: colors.redLight,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
    fontSize: 12,
  },
  success: {
    color: colors.greenDark,
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
    fontSize: 12,
  },
});
