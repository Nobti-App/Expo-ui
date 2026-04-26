import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { supabase } from '@/src/lib/supabase';
import {
  cancelQueueTicket,
  connectQueueProgressSocket,
  createQueueTicket,
  ensureAnonymousSession,
  JoinTicket,
} from '@/src/lib/api/joinQueue';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

function splitTicketDisplay(displayNumber: string) {
  const value = displayNumber.trim();
  const match = value.match(/^([^\d]+)?(\d+.*)?$/);

  if (!value) {
    return { prefix: '--', number: '--' };
  }

  if (!match) {
    return { prefix: '--', number: value };
  }

  const prefix = match[1]?.trim() || '--';
  const number = match[2]?.trim() || value;

  return { prefix, number };
}

export function JoinQueueScreen() {
  const router = useRouter();
  const { queue_id } = useLocalSearchParams<{ queue_id?: string }>();
  const queueId = useMemo(() => (typeof queue_id === 'string' ? queue_id : ''), [queue_id]);
  const { setAuthSession } = useAppState();

  const [ticket, setTicket] = useState<JoinTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [treatedMessage, setTreatedMessage] = useState('');

  const stopSocketRef = useRef<(() => void) | null>(null);

  const clearAnonymousSession = async () => {
    if (stopSocketRef.current) {
      stopSocketRef.current();
      stopSocketRef.current = null;
    }

    setAuthSession(null, null);
    setAccessToken('');
    setTicket(null);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.error('signOut failed:', signOutError);
    }
  };

  const clearSessionAndFinish = async (message: string) => {
    await clearAnonymousSession();
    setTreatedMessage(message);
  };

  const isTreatedStatus = (status?: JoinTicket['status']) => status === 'done';

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        setLoading(true);
        setError('');

        if (!queueId) {
          setError('Queue ID is missing from the QR link.');
          return;
        }

        const session = await ensureAnonymousSession();
        if (!active) return;

        setAuthSession(session.accessToken, session.userId);
        setAccessToken(session.accessToken);

        const createdTicket = await createQueueTicket(queueId, session.accessToken, session.userId);
        if (!active) return;

        if (isTreatedStatus(createdTicket.status)) {
          await clearSessionAndFinish('ur ticket has been treated. thank u for ur visit');
          return;
        }

        setTicket(createdTicket);

        stopSocketRef.current = connectQueueProgressSocket(
          queueId,
          createdTicket.ticketId,
          session.accessToken,
          async (event) => {
            if (isTreatedStatus(event.status)) {
              await clearSessionAndFinish('ur ticket has been treated. thank u for ur visit');
              return;
            }

            setTicket((current) => (current ? { ...current, ...event } : current));
          },
          (wsError) => {
            setError(wsError.message);
          }
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to join queue.');
      } finally {
        if (active) setLoading(false);
      }
    };

    init();

    return () => {
      active = false;
      if (stopSocketRef.current) stopSocketRef.current();
    };
  }, [queueId, setAuthSession]);

  const displayEstimatedMinutes = ticket?.estimatedMinutes != null ? `${ticket.estimatedMinutes} min` : 'Temps indisponible';

  const onCancel = async () => {
    if (!ticket || !accessToken || cancelling) return;

    try {
      setCancelling(true);
      setError('');
      await cancelQueueTicket(ticket.ticketId, accessToken);
      await clearAnonymousSession();
      router.replace('/choose');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel ticket.');
    } finally {
      setCancelling(false);
    }
  };

  const chip = useMemo(() => {
    if (!ticket) return { label: 'En attente', bg: colors.amberLight, text: '#7A5000' };
    if (ticket.status === 'done') return { label: 'Traité', bg: colors.bg, text: colors.mid };
    if (ticket.status === 'calling') return { label: 'C’est votre tour !', bg: colors.green, text: '#fff' };
    if (ticket.beforeCount <= 2) return { label: 'Bientôt votre tour', bg: colors.greenLight, text: colors.greenDark };
    return { label: 'En attente', bg: colors.amberLight, text: '#7A5000' };
  }, [ticket]);

  const pct = Math.min(Math.max(ticket?.progressPercent ?? 0, 0), 100);
  const displayParts = ticket ? splitTicketDisplay(ticket.displayNumber) : { prefix: '--', number: '--' };

  return (
    <AppShell>
      <AppHeader title="Mon ticket" backLabel="Ma file" onBack={() => router.replace('/choose')} />

      {loading && <Text style={styles.state}>Création de votre ticket...</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!!treatedMessage && (
        <View style={styles.treatedBox}>
          <Text style={styles.treatedText}>{treatedMessage}</Text>
        </View>
      )}

      {ticket && !treatedMessage && (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.topLabel}>Votre ticket</Text>
            <View style={styles.ticketCodeRow}>
              <Text style={styles.ticketPrefix}>{displayParts.prefix}</Text>
              <Text style={styles.ticketNumber}>{displayParts.number}</Text>
            </View>
            <Text style={styles.estab}>{ticket.establishmentName}</Text>
          </View>

          <View style={styles.mid}>
            <View style={[styles.chip, { backgroundColor: chip.bg }]}>
              <Text style={[styles.chipText, { color: chip.text }]}>{chip.label}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ticket.beforeCount}</Text>
                <Text style={styles.statLabel}>Personnes avant vous</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{displayEstimatedMinutes}</Text>
                <Text style={styles.statLabel}>Temps estimé</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Progression</Text>
              <Text style={styles.progressLabel}>{`${Math.round(pct)}%`}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
          </View>
        </View>
      )}

      {ticket && !treatedMessage && ticket.status === 'waiting' && (
        <PrimaryButton
          label={cancelling ? 'Annulation...' : 'Annuler mon ticket'}
          variant="danger"
          onPress={onCancel}
          disabled={!ticket || !accessToken || cancelling}
        />
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  state: {
    textAlign: 'center',
    color: colors.soft,
    marginVertical: 12,
  },
  error: {
    color: '#C0392B',
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 12,
  },
  treatedBox: {
    borderWidth: 1.5,
    borderColor: '#9FE1CB',
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  treatedText: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  head: {
    backgroundColor: colors.green,
    padding: 20,
    alignItems: 'center',
  },
  topLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  ticketNumber: {
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '800',
    color: '#fff',
  },
  ticketPrefix: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    marginRight: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  ticketCodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginVertical: 4,
  },
  estab: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  mid: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  chip: {
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  chipText: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.ink,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 20,
    color: colors.soft,
    textAlign: 'center',
  },
  progressWrap: {
    padding: 14,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 20,
    color: colors.soft,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 4,
  },
});
