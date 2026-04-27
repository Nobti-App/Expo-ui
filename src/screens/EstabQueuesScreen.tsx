import { useRouter } from 'expo-router';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { appConfig } from '@/src/lib/appConfig';
import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

type TicketStatus = 'waiting' | 'calling' | 'completed' | 'cancelled' | 'no_show' | null;

type QueueRow = {
  id: string;
  name: string | null;
  prefix: string | null;
};

type TicketRow = {
  id: string;
  queue_id: string;
  display_number: string | null;
  ticket_number: number | null;
  holder_name: string | null;
  created_at: string | null;
  status: TicketStatus;
};

function normalizeDisplayNumber(ticket: TicketRow) {
  if (ticket.display_number && ticket.display_number.trim()) return ticket.display_number;
  if (typeof ticket.ticket_number === 'number' && Number.isFinite(ticket.ticket_number)) return String(ticket.ticket_number);
  return '--';
}

function formatCreatedAt(value: string | null) {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getApiBaseUrl() {
  const base = appConfig.apiBaseUrl.trim().replace(/\/$/, '');
  if (!base) {
    throw new Error('API base URL is missing. Configure apiBaseUrl in app config.');
  }

  return base;
}

function getAxiosErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData;
    }

    if (
      responseData &&
      typeof responseData === 'object' &&
      'message' in responseData &&
      typeof responseData.message === 'string' &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

async function patchTicketStatus(
  ticketId: string,
  status: Exclude<TicketStatus, null>,
  accessToken: string
) {
  const base = getApiBaseUrl();
  const normalizedBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  const endpointCandidates = [
    `${base}/tickets/${encodeURIComponent(ticketId)}/status`,
    `${normalizedBase}/tickets/${encodeURIComponent(ticketId)}/status`,
  ];

  let lastError: unknown = null;

  for (const endpoint of endpointCandidates) {
    try {
      await axios.post(
        endpoint,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return;
    } catch (error) {
      lastError = error;

      if (!axios.isAxiosError(error)) continue;
      if (error.response?.status !== 404 && error.response?.status !== 405) throw error;
    }

    try {
      await axios.patch(
        endpoint,
        { status },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return;
    } catch (error) {
      lastError = error;

      if (!axios.isAxiosError(error)) continue;
      if (error.response?.status !== 404) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Ticket action request failed.');
}

export function EstabQueuesScreen() {
  const router = useRouter();
  const { authSessionToken } = useAppState();
  const [establishmentId, setEstablishmentId] = useState('');
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [ticketsByQueueId, setTicketsByQueueId] = useState<Record<string, TicketRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const previousStatuses = useRef<Record<string, TicketStatus>>({});
  const [animatedTicketId, setAnimatedTicketId] = useState('');

  const resolveAccessToken = useCallback(async () => {
    if (authSessionToken) return authSessionToken;
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? '';
  }, [authSessionToken]);

  const fetchSnapshot = useCallback(async () => {
    try {
      setError('');

      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        setError('Session invalide. Reconnectez-vous pour gérer les files.');
        return;
      }

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

      if (estabError) throw estabError;

      const ownedEstablishmentId = (ownedEstabs?.[0]?.id as string | undefined) ?? '';
      setEstablishmentId(ownedEstablishmentId);

      if (!ownedEstablishmentId) {
        setQueues([]);
        setTicketsByQueueId({});
        setError('Aucun établissement trouvé pour ce compte.');
        return;
      }

      const { data: queueRows, error: queueError } = await supabase
        .from('queues')
        .select('id, name, prefix')
        .eq('establishment_id', ownedEstablishmentId)
        .order('updated_at', { ascending: false })
        .returns<QueueRow[]>();

      if (queueError) throw queueError;

      const normalizedQueues = queueRows ?? [];
      setQueues(normalizedQueues);
      setSelectedQueueId((prev) => {
        if (prev && normalizedQueues.some((queue) => queue.id === prev)) return prev;
        return normalizedQueues[0]?.id ?? '';
      });

      const queueIds = normalizedQueues.map((queue) => queue.id);
      if (queueIds.length === 0) {
        setTicketsByQueueId({});
        return;
      }

      const { data: ticketRows, error: ticketError } = await supabase
        .from('tickets')
        .select('id, queue_id, display_number, ticket_number, holder_name, created_at, status')
        .in('queue_id', queueIds)
        .in('status', ['waiting', 'calling', 'completed'])
        .order('ticket_number', { ascending: true })
        .returns<TicketRow[]>();

      if (ticketError) throw ticketError;

      const grouped = queueIds.reduce<Record<string, TicketRow[]>>((acc, queueId) => {
        acc[queueId] = [];
        return acc;
      }, {});

      for (const ticket of ticketRows ?? []) {
        if (!grouped[ticket.queue_id]) grouped[ticket.queue_id] = [];
        grouped[ticket.queue_id].push(ticket);

        const previousStatus = previousStatuses.current[ticket.id] ?? null;
        if (previousStatus === 'waiting' && ticket.status === 'calling') {
          setAnimatedTicketId(ticket.id);
          pulse.setValue(1);
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.06, duration: 220, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1.04, duration: 180, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            setAnimatedTicketId('');
          });
        }

        previousStatuses.current[ticket.id] = ticket.status;
      }

      setTicketsByQueueId(grouped);
    } catch (snapshotError) {
      setError(snapshotError instanceof Error ? snapshotError.message : 'Impossible de charger les files.');
    } finally {
      setLoading(false);
    }
  }, [pulse, resolveAccessToken]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await fetchSnapshot();
      if (!active) return;

      channel = supabase
        .channel('establishment-queues')
        .on('broadcast', { event: 'status-update' }, async () => {
          if (!active) return;
          await fetchSnapshot();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, async () => {
          if (!active) return;
          await fetchSnapshot();
        })
        .subscribe();
    };

    init();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchSnapshot]);

  const selectedQueueTickets = useMemo(() => ticketsByQueueId[selectedQueueId] ?? [], [ticketsByQueueId, selectedQueueId]);

  const waiting = useMemo(
    () => selectedQueueTickets.filter((ticket) => ticket.status === 'waiting'),
    [selectedQueueTickets]
  );

  const current = useMemo(
    () => selectedQueueTickets.filter((ticket) => ticket.status === 'calling'),
    [selectedQueueTickets]
  );

  const hasCurrent = current.length > 0;

  const updateTicketStatus = useCallback(
    async (ticketId: string, status: Exclude<TicketStatus, null | 'waiting'>) => {
      if (!ticketId) return;

      try {
        setError('');
        setActionLoading(true);

        const accessToken = await resolveAccessToken();
        if (!accessToken) {
          throw new Error('Session invalide. Reconnectez-vous pour gérer les tickets.');
        }

        await patchTicketStatus(ticketId, status, accessToken);

        await fetchSnapshot();
      } catch (statusError) {
        setError(getAxiosErrorMessage(statusError, 'Mise à jour du ticket impossible.'));
      } finally {
        setActionLoading(false);
      }
    },
    [fetchSnapshot, resolveAccessToken]
  );

  const onCallNext = useCallback(async () => {
    if (!selectedQueueId || waiting.length === 0 || hasCurrent) return;
    await updateTicketStatus(waiting[0].id, 'calling');
  }, [selectedQueueId, waiting, hasCurrent, updateTicketStatus]);

  const selectedQueueName = useMemo(() => {
    return queues.find((queue) => queue.id === selectedQueueId)?.name ?? 'File';
  }, [queues, selectedQueueId]);

  return (
    <AppShell>
      <AppHeader title="Gestion des files" backLabel="Dashboard" onBack={() => router.push('/establishment/dashboard')} />

      <View style={styles.tabs}>
        {queues.map((queue) => (
          <Pressable key={queue.id} onPress={() => setSelectedQueueId(queue.id)} style={[styles.tab, selectedQueueId === queue.id && styles.tabOn]}>
            <Text style={[styles.tabText, selectedQueueId === queue.id && styles.tabTextOn]}>{queue.name || `File ${queue.prefix || ''}`}</Text>
          </Pressable>
        ))}
      </View>

      {queues.length > 0 && <Text style={styles.queueLabel}>{selectedQueueName}</Text>}

      <View style={styles.cardTop}>
        <Mini v={String(waiting.length)} l="Attente" color={colors.amber} />
        <Mini v={String(current.length)} l="En cours" color={colors.green} />
        {/* <Mini v={String(establishmentId ? queues.length : 0)} l="Files" color={colors.blueDark} /> */}
        {/* /// Mini for the number of treated tickets */}
        <Mini v={String(establishmentId ? Object.values(ticketsByQueueId).flat().filter((t) => t.status === 'completed').length : 0)} l="Traités" color={colors.blueDark} />
      </View>

      <View style={styles.quickRow}>
        <PrimaryButton
          label={
            !hasCurrent && waiting.length > 0
              ? `Appeler suivant — ${normalizeDisplayNumber(waiting[0])}`
              : hasCurrent
                ? 'Un ticket est déjà en cours'
                : 'Aucun ticket à appeler'
          }
          style={{ flex: 1 }}
          onPress={onCallNext}
          disabled={actionLoading || hasCurrent || waiting.length === 0 || !selectedQueueId}
        />
      </View>

      <Text style={styles.lbl}>Numéros en file</Text>

      {[...current, ...waiting].map((ticket) => {
        const isCurrent = ticket.status === 'calling';
        const AnimatedContainer = isCurrent ? Animated.View : View;
        const animatedStyle = isCurrent && ticket.id === animatedTicketId ? { transform: [{ scale: pulse }] } : undefined;

        return (
          <AnimatedContainer key={ticket.id} style={[styles.item, isCurrent && styles.itemCurrent, animatedStyle]}>
            <View style={[styles.badge, isCurrent && styles.badgeCurrent]}>
              <Text style={[styles.badgeText, isCurrent && styles.badgeTextCurrent]}>{normalizeDisplayNumber(ticket)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, isCurrent && styles.itemTitleCurrent]}>{isCurrent ? 'En cours' : 'En attente'}</Text>
              <Text style={styles.itemSub}>{`Pris à ${formatCreatedAt(ticket.created_at)}`}</Text>
              {ticket.holder_name ? <Text style={styles.itemName}>{ticket.holder_name}</Text> : null}
            </View>

            {isCurrent ? (
              <View style={styles.currentActions}>
                <PrimaryButton
                  label="Terminé"
                  variant="outline"
                  style={styles.actionBtn}
                  onPress={() => updateTicketStatus(ticket.id, 'completed')}
                  disabled={actionLoading}
                />
                <PrimaryButton
                  label="No show"
                  variant="gray"
                  style={styles.actionBtn}
                  onPress={() => updateTicketStatus(ticket.id, 'no_show')}
                  disabled={actionLoading}
                />
                <PrimaryButton
                  label="Annuler"
                  variant="danger"
                  style={styles.actionBtn}
                  onPress={() => updateTicketStatus(ticket.id, 'cancelled')}
                  disabled={actionLoading}
                />
              </View>
            ) : null}
          </AnimatedContainer>
        );
      })}

      {loading && <Text style={styles.empty}>Chargement des files...</Text>}
      {!loading && queues.length === 0 && <Text style={styles.empty}>Aucune file créée pour cet établissement.</Text>}
      {!loading && queues.length > 0 && current.length + waiting.length === 0 && (
        <Text style={styles.empty}>Aucun ticket en attente.</Text>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </AppShell>
  );
}

function Mini({ v, l, color }: { v: string; l: string; color: string }) {
  return (
    <View style={styles.mini}>
      <Text style={[styles.miniV, { color }]}>{v}</Text>
      <Text style={styles.miniL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.bg,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.green, borderColor: colors.green },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.mid },
  tabTextOn: { color: '#fff' },
  queueLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mini: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 10, alignItems: 'center' },
  miniV: { fontSize: 20, fontWeight: '800' },
  miniL: { fontSize: 10, color: colors.soft, marginTop: 2, fontWeight: '700' },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  item: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemCurrent: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
    paddingVertical: 16,
    minHeight: 114,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCurrent: {
    backgroundColor: colors.green,
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  badgeText: { fontWeight: '800', color: colors.ink, fontSize: 12 },
  badgeTextCurrent: { color: colors.white, fontSize: 16 },
  itemTitle: { fontSize: 12, fontWeight: '800', color: colors.ink },
  itemTitleCurrent: { fontSize: 15 },
  itemSub: { fontSize: 11, color: colors.soft, marginTop: 2 },
  itemName: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mid,
    fontWeight: '700',
  },
  currentActions: {
    width: 100,
  },
  actionBtn: {
    width: 100,
    marginBottom: 6,
    paddingVertical: 10,
  },
  empty: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
    color: colors.soft,
    marginBottom: 12,
  },
  error: {
    color: colors.red,
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 12,
  },
});
