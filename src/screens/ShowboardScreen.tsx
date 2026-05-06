import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { appConfig } from '@/src/lib/appConfig';
import { ensureAnonymousSession } from '../lib/api/joinQueue';

type TicketStatus = 'waiting' | 'calling' | 'completed' | 'cancelled' | 'no_show' | null;
function formatDomainLabel(domain: string) {
  return domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

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
  iptv_link: string | null;
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function ShowboardScreen() {
  const { queueid } = useLocalSearchParams<{ queueid?: string }>();
  const queueId = useMemo(() => (typeof queueid === 'string' ? queueid : ''), [queueid]);
  const domainLabel = formatDomainLabel(appConfig.domain || '');
  const { width, height } = useWindowDimensions();
  const uiScale = useMemo(() => clamp(Math.min(width / 1280, height / 720), 0.7, 1.25), [width, height]);

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
  const [iptvLink, setIptvLink] = useState<string | null>(null);
  const pulse = React.useRef(new Animated.Value(1)).current;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCalledTicketIdRef = useRef('');
  const hasLoadedOnceRef = useRef(false);
  const ReactPlayer = useMemo(() => {
    if (Platform.OS !== 'web') return null;
    return (require('react-player') as { default: React.ComponentType<any> }).default;
  }, []);

  const playCallSound = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // ignore audio failures (e.g. autoplay restrictions)
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const asset = require('../../assets/sounds/calling.mp3');
    const assetUri = typeof asset === 'string' ? asset : asset?.uri ?? '';
    if (!assetUri) return;

    const audio = new Audio(assetUri);
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audioRef.current = null;
    };
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (!queueId) {
      setError('Queue id is missing in route.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [queueResponse, ticketsResponse] = await Promise.all([
        supabase
          .from('queues')
          .select('name, establishment_id, prefix, avg_wait_minutes, iptv_link')
          .eq('id', queueId)
          .maybeSingle<QueueRow>(),
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
      setIptvLink(queueData?.iptv_link ?? null);

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
      const callingId = calling[0]?.id ?? '';

      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        lastCalledTicketIdRef.current = callingId;
      } else if (callingId && callingId !== lastCalledTicketIdRef.current) {
        lastCalledTicketIdRef.current = callingId;
        await playCallSound();
      } else if (!callingId) {
        lastCalledTicketIdRef.current = '';
      }

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
  }, [queueId, pulse, playCallSound]);

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
  const showIptvPlayer = Platform.OS === 'web' && !!iptvLink;
  const ticketName = currentTicket?.holder_name || '';
  const ticketNameWords = useMemo(() => ticketName.trim().split(/\s+/).filter(Boolean), [ticketName]);
  const allowTwoLineName = ticketNameWords.length >= 2;
  const ticketNameSize = useMemo(() => {
    const len = ticketName.trim().length;
    const base = Math.round(56 * uiScale);
    if (len > 26) return clamp(Math.round(34 * uiScale), 26, base);
    if (len > 20) return clamp(Math.round(40 * uiScale), 30, base);
    if (len > 14) return clamp(Math.round(46 * uiScale), 34, base);
    return base;
  }, [ticketName, uiScale]);
  const ticketNumberSize = clamp(Math.round(126 * uiScale), 86, 150);
  const ticketNumberLine = Math.round(ticketNumberSize * 0.98);
  const nameLine = Math.round(ticketNameSize * 1.08);
  const paddingX = Math.round(28 * uiScale);
  const paddingY = Math.round(20 * uiScale);
  const gridGap = Math.round(18 * uiScale);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: Math.round(24 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}
      >
        <View style={styles.brand}>
          <View style={[styles.brandLogo, { width: Math.round(40 * uiScale), height: Math.round(40 * uiScale) }]}
          >
            <Text style={[styles.brandLogoText, { fontSize: Math.round(20 * uiScale) }]}>N</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { fontSize: Math.round(16 * uiScale) }]}>{establishmentName || 'Établissement'}</Text>
            <Text style={[styles.brandSub, { fontSize: Math.round(11 * uiScale) }]}>File d'attente</Text>
          </View>
        </View>
        <Text style={[styles.headerTime, { fontSize: Math.round(15 * uiScale) }]}>{clock}</Text>
      </View>

      <View style={styles.body}>
        {showIptvPlayer ? (
          <View style={[styles.dualLayout, { paddingHorizontal: paddingX, paddingVertical: paddingY }]}
          >
            <View style={styles.playerColumn}>
              <View style={[styles.playerFrame, { minHeight: Math.round(300 * uiScale) }]}>
                {ReactPlayer ? (
                  <ReactPlayer url={iptvLink as string} muted controls playing width="100%" height="100%" />
                ) : (
                  <Text style={styles.emptyText}>Lecteur indisponible</Text>
                )}
              </View>
              {/* <Text style={[styles.playerLabel, { fontSize: Math.round(11 * uiScale) }]}>Live IPTV</Text> */}
            </View>
            <View style={styles.rightColumn}>
              <View style={[styles.mainGrid, { paddingHorizontal: paddingX, paddingVertical: paddingY, gap: gridGap, flex: 1, justifyContent: 'space-between' }]}
              >
              {/* Current ticket card */}
                <View style={[styles.currentCard, { paddingVertical: Math.round(26 * uiScale), paddingHorizontal: Math.round(28 * uiScale) }]}
                >
                  <Text style={[styles.sectionLabel, { fontSize: Math.round(11 * uiScale), marginBottom: Math.round(12 * uiScale) }]}
                  >
                  <Text style={styles.pulseDot}>●</Text>
                  {' '}Numéro en cours
                </Text>
                  <View style={[styles.ticketDisplay, { gap: Math.round(24 * uiScale), minHeight: Math.round(120 * uiScale) }]}
                  >
                    <Animated.Text style={[styles.ticketNumber, { fontSize: ticketNumberSize, lineHeight: ticketNumberLine, minWidth: Math.round(160 * uiScale), transform: [{ scale: pulse }] }]}
                    >
                    {currentTicket ? normalizeDisplayNumber(currentTicket) : '--'}
                  </Animated.Text>
                    <View style={[styles.ticketDivider, { height: Math.round(90 * uiScale) }]}
                    />
                    <View style={styles.ticketDetails}>
                      <Text style={[styles.ticketNowLabel, { fontSize: Math.round(12 * uiScale), marginBottom: Math.round(6 * uiScale) }]}
                      >
                        Appelé maintenant
                      </Text>
                      <Text
                        style={[styles.ticketName, { fontSize: ticketNameSize, lineHeight: nameLine }]}
                        numberOfLines={allowTwoLineName ? 2 : 1}
                        adjustsFontSizeToFit
                        minimumFontScale={allowTwoLineName ? 0.7 : 0.5}
                      >
                        {ticketName}
                      </Text>
                      <View style={[styles.ticketMeta, { marginTop: Math.round(10 * uiScale), gap: Math.round(10 * uiScale) }]}
                      >
                      <View style={styles.counterBadge}>
                        <Text style={[styles.counterBadgeText, { fontSize: Math.round(12 * uiScale) }]}>{queueName || 'File'}</Text>
                      </View>
                      {/* <View style={styles.timeBadge}>
                        <Text style={[styles.timeBadgeText, { fontSize: Math.round(12 * uiScale) }]}>{clock}</Text>
                      </View> */}
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats row */}
                <View style={[styles.statsRow, { gap: Math.round(12 * uiScale) }]}>
                  <View style={[styles.statCard, styles.statHighlight, { paddingHorizontal: Math.round(16 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}>
                    <Text style={[styles.statValue, { fontSize: Math.round(32 * uiScale) }]}>{waitingCount}</Text>
                    <Text style={[styles.statLabel, { fontSize: Math.round(11 * uiScale) }]}>En attente</Text>
                </View>
                {/* <View style={styles.statCard}>
                  <Text style={styles.statValue}>{servedCount}</Text>
                  <Text style={styles.statLabel}>Servis auj.</Text>
                </View> */}
                  <View style={[styles.statCard, { paddingHorizontal: Math.round(16 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}>
                    <Text style={[styles.statValue, { fontSize: Math.round(32 * uiScale) }]}>{avgWaitMinutes !== null ? `~${avgWaitMinutes} min` : '--'}</Text>
                    <Text style={[styles.statLabel, { fontSize: Math.round(11 * uiScale) }]}>Temps moyen par ticket</Text>
                  </View>
              </View>

              {/* Queue list */}
                <View style={[styles.queueSection, { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(18 * uiScale), flex: 1, minHeight: 0 }]}
                >
                  <Text style={[styles.sectionLabel, { fontSize: Math.round(11 * uiScale), marginBottom: Math.round(10 * uiScale) }]}
                  >
                    À appeler ensuite
                  </Text>
                  <View style={[styles.queueList , { overflow: 'hidden', flex: 1 }]}
                  >
                  {loading ? (
                    <Text style={styles.emptyText}>Chargement...</Text>
                  ) : upcomingTickets.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun numéro en attente</Text>
                  ) : (
                    upcomingTickets.slice(0, 5).map((ticket, idx) => (
                      <View key={ticket.id} style={[styles.queueItem, idx === 0 && styles.queueItemNext, { paddingVertical: Math.round(12 * uiScale), paddingHorizontal: Math.round(14 * uiScale) }]}>
                        <Text style={[styles.queuePos, { fontSize: Math.round(22 * uiScale), width: Math.round(48 * uiScale) }]}>{normalizeDisplayNumber(ticket)}</Text>
                        <Text style={[styles.queueName, { fontSize: Math.round(16 * uiScale) }]}>{ticket.holder_name || ''}</Text>
                        {idx === 0 && (
                          <View style={styles.nextChip}>
                            <Text style={[styles.nextChipText, { fontSize: Math.round(10 * uiScale) }]}>Suivant</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.mainGrid, { paddingHorizontal: paddingX, paddingVertical: paddingY, gap: gridGap, flex: 1, justifyContent: 'space-between' }]}>
            {/* Current ticket card */}
            <View style={[styles.currentCard, { paddingVertical: Math.round(26 * uiScale), paddingHorizontal: Math.round(28 * uiScale) }]}
            >
              <Text style={[styles.sectionLabel, { fontSize: Math.round(11 * uiScale), marginBottom: Math.round(12 * uiScale) }]}
              >
                <Text style={styles.pulseDot}>●</Text>
                {' '}Numéro en cours
              </Text>
              <View style={[styles.ticketDisplay, { gap: Math.round(24 * uiScale), minHeight: Math.round(120 * uiScale) }]}
              >
                <Animated.Text style={[styles.ticketNumber, { fontSize: ticketNumberSize, lineHeight: ticketNumberLine, minWidth: Math.round(160 * uiScale), transform: [{ scale: pulse }] }]}
                >
                  {currentTicket ? normalizeDisplayNumber(currentTicket) : '--'}
                </Animated.Text>
                <View style={[styles.ticketDivider, { height: Math.round(90 * uiScale) }]} />
                <View style={styles.ticketDetails}>
                  <Text style={[styles.ticketNowLabel, { fontSize: Math.round(12 * uiScale), marginBottom: Math.round(6 * uiScale) }]}
                  >
                    Appelé maintenant
                  </Text>
                  <Text
                    style={[styles.ticketName, { fontSize: ticketNameSize, lineHeight: nameLine }]}
                    numberOfLines={allowTwoLineName ? 2 : 1}
                    adjustsFontSizeToFit
                    minimumFontScale={allowTwoLineName ? 0.7 : 0.5}
                  >
                    {ticketName}
                  </Text>
                  <View style={[styles.ticketMeta, { marginTop: Math.round(10 * uiScale), gap: Math.round(10 * uiScale) }]}
                  >
                    <View style={styles.counterBadge}>
                      <Text style={[styles.counterBadgeText, { fontSize: Math.round(12 * uiScale) }]}>{queueName || 'File'}</Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={[styles.timeBadgeText, { fontSize: Math.round(12 * uiScale) }]}>{clock}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, { gap: Math.round(12 * uiScale) }]}>
              <View style={[styles.statCard, styles.statHighlight, { paddingHorizontal: Math.round(16 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}>
                <Text style={[styles.statValue, { fontSize: Math.round(32 * uiScale) }]}>{waitingCount}</Text>
                <Text style={[styles.statLabel, { fontSize: Math.round(11 * uiScale) }]}>En attente</Text>
              </View>
              <View style={[styles.statCard, { paddingHorizontal: Math.round(16 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}>
                <Text style={[styles.statValue, { fontSize: Math.round(32 * uiScale) }]}>{servedCount}</Text>
                <Text style={[styles.statLabel, { fontSize: Math.round(11 * uiScale) }]}>Servis auj.</Text>
              </View>
              <View style={[styles.statCard, { paddingHorizontal: Math.round(16 * uiScale), paddingVertical: Math.round(12 * uiScale) }]}>
                <Text style={[styles.statValue, { fontSize: Math.round(32 * uiScale) }]}>{avgWaitMinutes !== null ? `~${avgWaitMinutes} min` : '--'}</Text>
                <Text style={[styles.statLabel, { fontSize: Math.round(11 * uiScale) }]}>Temps moyen par ticket</Text>
              </View>
            </View>

            {/* Queue list */}
            <View style={[styles.queueSection, { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(18 * uiScale), flex: 1, minHeight: 0 }]}
            >
              <Text style={[styles.sectionLabel, { fontSize: Math.round(11 * uiScale), marginBottom: Math.round(10 * uiScale) }]}
              >
                À appeler ensuite
              </Text>
              <View style={[styles.queueList, { flex: 1, justifyContent: 'space-between', gap: Math.round(8 * uiScale) }]}
              >
                {loading ? (
                  <Text style={styles.emptyText}>Chargement...</Text>
                ) : upcomingTickets.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun numéro en attente</Text>
                ) : (
                  upcomingTickets.slice(0, 4).map((ticket, idx) => (
                    <View key={ticket.id} style={[styles.queueItem, idx === 0 && styles.queueItemNext, { paddingVertical: Math.round(10 * uiScale), paddingHorizontal: Math.round(14 * uiScale) }]}>
                      <Text style={[styles.queuePos, { fontSize: Math.round(22 * uiScale), width: Math.round(48 * uiScale) }]}>{normalizeDisplayNumber(ticket)}</Text>
                      <Text style={[styles.queueName, { fontSize: Math.round(16 * uiScale) }]}>{ticket.holder_name || ''}</Text>
                      {idx === 0 && (
                        <View style={styles.nextChip}>
                          <Text style={[styles.nextChipText, { fontSize: Math.round(10 * uiScale) }]}>Suivant</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingHorizontal: Math.round(24 * uiScale), paddingVertical: Math.round(8 * uiScale) }]}
      >
        <Text style={[styles.footerMsg, { fontSize: Math.round(11 * uiScale) }]}>Merci de votre patience</Text>
        <Text style={[styles.footerPowered, { fontSize: Math.round(10 * uiScale) }]}>{domainLabel}</Text>
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
    fontSize: 16,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  body: {
    flex: 1,
  },
  dualLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  playerColumn: {
    flex: 1.15,
    gap: 10,
  },
  playerFrame: {
    flex: 1,
    backgroundColor: '#0f1c18',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1a8a6e',
    minHeight: 360,
  },
  playerLabel: {
    color: '#6b8e86',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  rightColumn: {
    flex: 1,
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
    paddingVertical: 32,
    paddingHorizontal: 34,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
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
    fontSize: 126,
    fontWeight: '800',
    color: '#0d5c4a',
    letterSpacing: 2,
    lineHeight: 126,
    minWidth: 180,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#1a8a6e',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  ticketName: {
    fontSize: 56,
    fontWeight: '700',
    color: '#0f1c18',
    letterSpacing: -1,
    lineHeight: 60,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 36,
    fontWeight: '700',
    color: '#0f1c18',
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 12,
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
    paddingHorizontal: 26,
    paddingVertical: 24,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    fontSize: 26,
    fontWeight: '700',
    color: '#6b8e86',
    width: 55,
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
    fontSize: 18,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  emptyText: {
    color: '#6b8e86',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
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
