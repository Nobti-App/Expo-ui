import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { ensureAnonymousSession } from '../lib/api/joinQueue';
import { supabase } from '@/src/lib/supabase';
import { colors, radius } from '@/src/theme/colors';

type TicketStatus = 'waiting' | 'calling' | 'completed' | 'cancelled' | 'no_show' | null;

type TicketRow = {
  id: string;
  display_number: string | null;
  ticket_number: number | null;
  holder_name: string | null;
  status: TicketStatus;
};

type QueueRow = {
  establishment_id: string | null;
  name: string | null;
};

type EstablishmentRow = {
  name: string | null;
};

function normalizeDisplayNumber(ticket: TicketRow, withName: boolean = false) {
  if (ticket.display_number && ticket.display_number.trim()) return withName && ticket.holder_name ? `${ticket.display_number} - ${ticket.holder_name}` : ticket.display_number;
  if (typeof ticket.ticket_number === 'number' && Number.isFinite(ticket.ticket_number)) return String(ticket.ticket_number);
  return '--';
}

function toBoardState(tickets: TicketRow[]) {
  const calling = tickets
    .filter((ticket) => ticket.status === 'calling')
    .sort((a, b) => (a.ticket_number ?? Number.MAX_SAFE_INTEGER) - (b.ticket_number ?? Number.MAX_SAFE_INTEGER));

  const waiting = tickets
    .filter((ticket) => ticket.status === 'waiting')
    .sort((a, b) => (a.ticket_number ?? Number.MAX_SAFE_INTEGER) - (b.ticket_number ?? Number.MAX_SAFE_INTEGER));

  return {
    current: calling.length > 0 ? calling.map((t) => normalizeDisplayNumber(t, true)) : null,
    upcoming: waiting.map((t) => normalizeDisplayNumber(t)),
  };
}

export function ShowboardScreen() {
  const { queueid } = useLocalSearchParams<{ queueid?: string }>();
  const queueId = useMemo(() => (typeof queueid === 'string' ? queueid : ''), [queueid]);

  const [establishmentName, setEstablishmentName] = useState('');
  const [queueName, setQueueName] = useState('');
  const [currentTicket, setCurrentTicket] = useState<string[] | null>(null);
  const [upcomingTickets, setUpcomingTickets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSnapshot = useCallback(async () => {
    if (!queueId) {
      setError('Queue id is missing in route.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [queueResponse, ticketsResponse] = await Promise.all([
        supabase.from('queues').select('name, establishment_id').eq('id', queueId).maybeSingle<QueueRow>(),
        supabase
          .from('tickets')
          .select('id, display_number, ticket_number, status, holder_name')
          .eq('queue_id', queueId)
          .in('status', ['calling', 'waiting'])
          .order('ticket_number', { ascending: true })
          .returns<TicketRow[]>(),
      ]);

      const { data: queueData, error: queueError } = queueResponse;
      const { data: ticketsData, error: ticketsError } = ticketsResponse;


      if (queueError) throw queueError;
      if (ticketsError) throw ticketsError;
      if (!queueData) {
        throw new Error('Queue not found.');
      }

      const { data: estabData, error: estabError } = await supabase
        .from('establishments')
        .select('name')
        .eq('id', queueData.establishment_id ?? '')
        .maybeSingle<EstablishmentRow>();

      if (estabError) throw estabError;

      console.log('Fetched showboard snapshot:', { queueData, ticketsData });

      setQueueName(queueData?.name ?? '');
      setEstablishmentName(estabData?.name ?? '');

      const boardState = toBoardState(ticketsData ?? []);
      setCurrentTicket(boardState.current);
      setUpcomingTickets(boardState.upcoming);
    } catch (snapshotError) {
      const message = snapshotError instanceof Error ? snapshotError.message : 'Failed to load showboard data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await ensureAnonymousSession();
      await fetchSnapshot();
      if (!active || !queueId) return;

      channel = supabase
        .channel(`queue:${queueId}`)
        .on('broadcast', { event: 'status-update' }, async () => {
          if (!active) return;
          await fetchSnapshot();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `queue_id=eq.${queueId}` }, async () => {
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
  }, [queueId, fetchSnapshot]);

  return (
    <AppShell>
      <View style={styles.header}>
        <Text style={styles.label}>Showboard</Text>
        <Text style={styles.establishment}>{establishmentName || 'Établissement'}</Text>
        <Text style={styles.queueName}>{queueName || 'File'}</Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.currentCard}>
        {/* <Text style={styles.sectionTitle}>Numéro en cours</Text>
        { currentTicket ? 
          currentTicket.map((num, index) => (
            <Text key={`${num}-${index}`} style={styles.currentNumber}>{num}</Text>
          ))
          : <Text style={styles.currentNumber}>--</Text>
        } */}
        <Text style={styles.sectionTitle}>Numéros en cours</Text>
        {/* // join with - */}
        {currentTicket ? (
          <Text style={styles.currentNumber}>{currentTicket.join(' - ')}</Text>
        ) : (
          <Text style={styles.currentNumber}>--</Text>
        )}
      </View>
                
      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>À appeler ensuite</Text>
        {loading ? (
          <Text style={styles.empty}>Chargement...</Text>
        ) : upcomingTickets.length === 0 ? (
          <Text style={styles.empty}>Aucun numéro en attente.</Text>
        ) : (
          <View style={styles.upcomingWrap}>
            {upcomingTickets.map((ticket, index) => (
              <View key={`${ticket}-${index}`} style={styles.upcomingItem}>
                <Text style={styles.upcomingText}>{ticket}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.soft,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  establishment: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  queueName: {
    marginTop: 6,
    fontSize: 14,
    color: colors.mid,
    fontWeight: '700',
  },
  error: {
    color: '#C0392B',
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 12,
  },
  currentCard: {
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: radius.lg,
    backgroundColor: colors.greenLight,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.soft,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
  },
  currentNumber: {
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '800',
    color: colors.greenDark,
  },
  listCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: 14,
  },
  upcomingWrap: {
    gap: 8,
  },
  upcomingItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  upcomingText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  empty: {
    color: colors.soft,
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
});
