import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { ensureAnonymousSession } from '../lib/api/joinQueue';

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
  prefix: string | null;
  avg_wait_minutes: number | null;
};

type EstablishmentRow = {
  name: string | null;
};

function normalizeDisplayNumber(ticket: TicketRow) {
  if (ticket.display_number && ticket.display_number.trim()) return ticket.display_number;
  if (typeof ticket.ticket_number === 'number' && Number.isFinite(ticket.ticket_number)) return String(ticket.ticket_number);
  return '--';
}

function getClockTime() {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ShowboardScreen() {
  const { queueid } = useLocalSearchParams<{ queueid?: string }>();
  const queueId = useMemo(() => (typeof queueid === 'string' ? queueid : ''), [queueid]);

  const [establishmentName, setEstablishmentName] = useState('');
  const [queueName, setQueueName] = useState('');
  const [queuePrefix, setQueuePrefix] = useState('A');
  const [currentTicket, setCurrentTicket] = useState<TicketRow | null>(null);
  const [upcomingTickets, setUpcomingTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(getClockTime());
  const [servedCount, setServedCount] = useState(0);
  const [avgWaitMinutes, setAvgWaitMinutes] = useState<number | null>(null);
  const pulse = React.useRef(new Animated.Value(1)).current;

  const fetchSnapshot = useCallback(async () => {
    if (!queueId) {
      setError('Queue id is missing in route.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [queueResponse, ticketsResponse] = await Promise.all([
        supabase.from('queues').select('name, establishment_id, prefix, avg_wait_minutes').eq('id', queueId).maybeSingle<QueueRow>(),
        supabase
          .from('tickets')
          .select('id, display_number, ticket_number, status, holder_name, created_at')
          .eq('queue_id', queueId)
          .in('status', ['calling', 'waiting'])
          .order('created_at', { ascending: true })
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

      setQueueName(queueData?.name ?? '');
      setEstablishmentName(estabData?.name ?? '');
      setQueuePrefix(queueData?.prefix ?? 'A');
      setAvgWaitMinutes(queueData?.avg_wait_minutes ?? null);

      // Fetch served tickets from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: servedTodayCount, error: servedError } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('queue_id', queueId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      if (servedError) throw servedError;
      setServedCount(servedTodayCount ?? 0);

      const allTickets = ticketsData ?? [];
      const calling = allTickets.filter((t) => t.status === 'calling');
      const waiting = allTickets.filter((t) => t.status === 'waiting');

      setCurrentTicket(calling.length > 0 ? calling[0] : null);
      setUpcomingTickets(waiting);

      if (calling.length > 0) {
        pulse.setValue(1);
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    } catch (snapshotError) {
      const message = snapshotError instanceof Error ? snapshotError.message : 'Failed to load showboard data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [queueId, pulse]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getClockTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingCount = upcomingTickets.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandLogo}>
            <Text style={styles.brandLogoText}>N</Text>
          </View>
          <View>
            <Text style={styles.brandName}>{establishmentName || 'Établissement'}</Text>
            <Text style={styles.brandSub}>File d'attente</Text>
          </View>
        </View>
        <Text style={styles.headerTime}>{clock}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.mainGrid} showsVerticalScrollIndicator={false}>
        {/* Current ticket card */}
        <View style={styles.currentCard}>
          <Text style={styles.sectionLabel}>
            <Text style={styles.pulseDot}>●</Text>
            {' '}Numéro en cours
          </Text>
          <View style={styles.ticketDisplay}>
            <Animated.Text style={[styles.ticketNumber, { transform: [{ scale: pulse }] }]}>
              {currentTicket ? normalizeDisplayNumber(currentTicket) : '--'}
            </Animated.Text>
            <View style={styles.ticketDivider} />
            <View style={styles.ticketDetails}>
              <Text style={styles.ticketNowLabel}>Appelé maintenant</Text>
              <Text style={styles.ticketName}>{currentTicket?.holder_name || 'En attente'}</Text>
              <View style={styles.ticketMeta}>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{queueName || 'File'}</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{clock}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statHighlight]}>
            <Text style={styles.statValue}>{waitingCount}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{servedCount}</Text>
            <Text style={styles.statLabel}>Servis auj.</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgWaitMinutes !== null ? `~${avgWaitMinutes} min` : '--'}</Text>
            <Text style={styles.statLabel}>Temps moyen par ticket</Text>
          </View>
          {/* <View style={styles.statCard}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Guichets actifs</Text>
          </View> */}
        </View>

        {/* Queue list */}
        <View style={styles.queueSection}>
          <Text style={styles.sectionLabel}>À appeler ensuite</Text>
          <View style={styles.queueList}>
            {loading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : upcomingTickets.length === 0 ? (
              <Text style={styles.emptyText}>Aucun numéro en attente</Text>
            ) : (
              upcomingTickets.slice(0, 4).map((ticket, idx) => (
                <View key={ticket.id} style={[styles.queueItem, idx === 0 && styles.queueItemNext]}>
                  {/* <Text style={styles.queuePos}>{idx + 1}</Text> */}
                  <Text style={styles.queuePos}>{normalizeDisplayNumber(ticket)}</Text>
                  <Text style={styles.queueName}>{ticket.holder_name || ''}</Text>
                  {idx === 0 && <View style={styles.nextChip}><Text style={styles.nextChipText}>Suivant</Text></View>}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerMsg}>Merci de votre patience</Text>
        <Text style={styles.footerPowered}>nobtiapp.ma</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7faf9',
  },
  header: {
    backgroundColor: '#0f1c18',
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandLogo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1a8a6e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  brandName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  brandSub: {
    color: '#6b8e86',
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTime: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  mainGrid: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 20,
  },

  currentCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d4e4e0',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6b8e86',
    marginBottom: 16,
  },
  pulseDot: {
    color: '#22c55e',
    fontSize: 8,
    marginRight: 4,
  },
  ticketDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    minHeight: 150,
  },
  ticketNumber: {
    fontSize: 118,
    fontWeight: '800',
    color: '#0d5c4a',
    letterSpacing: 2,
    lineHeight: 118,
    minWidth: 170,
    textAlign: 'center',
  },
  ticketDivider: {
    width: 3,
    height: 110,
    backgroundColor: '#d4e4e0',
    borderRadius: 2,
  },
  ticketDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketNowLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a8a6e',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  ticketName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0f1c18',
    letterSpacing: -1,
    lineHeight: 52,
  },
  ticketMeta: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: '#e6f4f1',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  counterBadgeText: {
    color: '#0d5c4a',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeBadge: {
    backgroundColor: '#fdf6e7',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  timeBadgeText: {
    color: '#c8952a',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d4e4e0',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statHighlight: {
    backgroundColor: '#e6f4f1',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f1c18',
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b8e86',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  queueSection: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d4e4e0',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 24,
  },
  queueList: {
    gap: 8,
    marginTop: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f7faf9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  queueItemNext: {
    backgroundColor: '#e6f4f1',
    borderColor: '#1a8a6e',
  },
  queuePos: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6b8e86',
    width: 32,
    textAlign: 'center',
  },
  queueTicket: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1c18',
    minWidth: 52,
    fontVariant: ['tabular-nums'],
  },
  queueName: {
    fontSize: 14,
    color: '#0f1c18',
    fontWeight: '400',
  },
  nextChip: {
    marginLeft: 'auto',
    backgroundColor: '#1a8a6e',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  nextChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  emptyText: {
    color: '#6b8e86',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },

  footer: {
    backgroundColor: '#0f1c18',
    paddingHorizontal: 28,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerMsg: {
    color: 'rgba(255,255,255,.4)',
    fontSize: 12,
  },
  footerPowered: {
    color: 'rgba(255,255,255,.2)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
