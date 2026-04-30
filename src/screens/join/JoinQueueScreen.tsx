import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { supabase } from '@/src/lib/supabase';
import {
  cancelQueueTicket,
  connectQueueProgressSocket,
  createQueueTicket,
  ensureAnonymousSession,
  JOIN_SESSION_RESET_REQUIRED,
  JoinTicket,
  QueueProgressEvent,
  updateTicketHolderName,
} from '../../lib/api/joinQueue';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

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
  const { queue_id } = useLocalSearchParams<{ queue_id?: string }>();
  const queueId = useMemo(() => (typeof queue_id === 'string' ? queue_id : ''), [queue_id]);
  const { setAuthSession } = useAppState();

  const [ticket, setTicket] = useState<JoinTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState('');
  const [holderName, setHolderName] = useState('');
  const [treatedMessage, setTreatedMessage] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');

  const stopSocketRef = useRef<(() => void) | null>(null);

  const clearAnonymousSession = async () => {
    if (stopSocketRef.current) {
      stopSocketRef.current();
      stopSocketRef.current = null;
    }

    setAuthSession(null, null);
    setTicket(null);
    setHolderName('');

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.error('signOut failed:', signOutError);
    }
  };

  const clearSessionAndFinish = async (message: string) => {
    await clearAnonymousSession();
    setError('');
    setTreatedMessage(message);
  };

  const isTreatedStatus = (status?: JoinTicket['status']) =>
    status === 'done' || status === 'cancelled' || status === 'no_show';

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

        let session = await ensureAnonymousSession();
        if (!active) return;

        let createdTicket: JoinTicket;
        try {
          createdTicket = await createQueueTicket(queueId, session.accessToken, session.userId);
        } catch (ticketCreationError) {
          if (!(ticketCreationError instanceof Error) || ticketCreationError.message !== JOIN_SESSION_RESET_REQUIRED) {
            throw ticketCreationError;
          }

          await supabase.auth.signOut({ scope: 'local' });
          session = await ensureAnonymousSession();
          if (!active) return;

          createdTicket = await createQueueTicket(queueId, session.accessToken, session.userId);
        }

        setAuthSession(session.accessToken, session.userId);
        if (!active) return;

        if (isTreatedStatus(createdTicket.status)) {
          await clearSessionAndFinish('your ticket has been treated. thank u for ur visit');
          return;
        }

        setTicket(createdTicket);
        setHolderName(createdTicket.holderName ?? '');

        stopSocketRef.current = connectQueueProgressSocket(
          queueId,
          createdTicket.ticketId,
          session.accessToken,
          async (event: QueueProgressEvent) => {
            if (isTreatedStatus(event.status)) {
              await clearSessionAndFinish('your ticket has been treated. thank u for ur visit');
              return;
            }

            setTicket((current: JoinTicket | null) => (current ? { ...current, ...event } : current));
            if (typeof event.holderName === 'string') {
              setHolderName(event.holderName);
            }
          },
          (wsError: Error) => {
            setError(wsError.message);
          },
          setConnectionState
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
    if (!ticket || cancelling) return;

    try {
      setCancelling(true);
      setError('');
      await cancelQueueTicket(ticket.ticketId);
      await clearSessionAndFinish('your ticket has been treated. thank u for ur visit');
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
  const isCalled = ticket?.status === 'calling';
  const shouldShowReadyNow = !isCalled && (ticket?.beforeCount ?? -1) === 0 && (ticket?.estimatedMinutes ?? -1) === 0;

  const onSaveName = async () => {
    if (!ticket || savingName) return;

    try {
      setSavingName(true);
      setError('');
      const updated = await updateTicketHolderName(ticket.ticketId, holderName);
      setTicket(updated);
      setHolderName(updated.holderName ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update your name.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <AppShell>
      <AppHeader title="Mon ticket" />

      {loading && <Text style={styles.state}>Création de votre ticket...</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {connectionState !== 'connected' && !treatedMessage && (
        <View style={[styles.connectionBanner, connectionState === 'reconnecting' ? styles.connectionBannerReconnecting : styles.connectionBannerDisconnected]}>
          <Text style={styles.connectionText}>
            {connectionState === 'reconnecting' ? 'Connexion en cours…' : 'Connexion perdue'}
          </Text>
        </View>
      )}

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

            {!isCalled && (
              <View style={styles.nameCard}>
                <Text style={styles.nameLabel}>Nom affiché</Text>
                <TextInput
                  value={holderName}
                  onChangeText={setHolderName}
                  placeholder="Votre nom"
                  style={styles.nameInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <PrimaryButton
                  label={savingName ? 'Mise à jour...' : 'Mettre à jour le nom'}
                  variant="outline"
                  onPress={onSaveName}
                  disabled={savingName || !ticket || holderName.trim() === (ticket.holderName ?? '').trim()}
                  style={styles.nameSaveButton}
                />
              </View>
            )}

            {!isCalled &&
              (shouldShowReadyNow ? (
                <View style={styles.readyCard}>
                  <Text style={styles.readyText}>Préparez-vous, vous allez être appelé maintenant.</Text>
                </View>
              ) : (
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
              ))}
          </View>

          {/* <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Progression</Text>
              <Text style={styles.progressLabel}>{`${Math.round(pct)}%`}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
          </View> */}
        </View>
      )}

      {ticket && !treatedMessage && ticket.status === 'waiting' && (
        <PrimaryButton
          label={cancelling ? 'Annulation...' : 'Annuler mon ticket'}
          variant="danger"
          onPress={onCancel}
          disabled={!ticket || cancelling}
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
  connectionBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  connectionBannerReconnecting: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: '#E6B95A',
  },
  connectionBannerDisconnected: {
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: '#E8A3A3',
  },
  connectionText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
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
  nameCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 12,
    marginBottom: 12,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mid,
    marginBottom: 6,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 8,
  },
  nameSaveButton: {
    marginBottom: 0,
    paddingVertical: 10,
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
  readyCard: {
    backgroundColor: colors.greenLight,
    borderColor: '#9FE1CB',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: {
    color: colors.greenDark,
    fontSize: 18,
    fontWeight: '700',
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
