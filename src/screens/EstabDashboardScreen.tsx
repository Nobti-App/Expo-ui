import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/src/components/AppShell';
import { NobtiLogo } from '@/src/components/NobtiLogo';
import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';
import { colors, radius } from '@/src/theme/colors';

function ActionCard({
  title,
  sub,
  icon,
  iconColor,
  iconBg,
  onPress,
}: {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </Pressable>
  );
}

type EstablishmentRow = {
  id: string;
  name: string | null;
  category: string | null;
  address: string | null;
  is_active: boolean | null;
};

type QueueRow = {
  id: string;
};

type TicketRow = {
  id: string;
  status: 'waiting' | 'calling' | 'completed' | 'cancelled' | 'no_show' | null;
};

export function EstabDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { authUserId, authReady, setAuthSession } = useAppState();

  const [establishment, setEstablishment] = useState<EstablishmentRow | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const establishmentName = establishment?.name ?? 'Établissement';
  const establishmentMeta = useMemo(() => {
    const category = establishment?.category ?? '';
    const isActive = establishment?.is_active ?? true;
    const categoryLabel =
      category === 'doctor'
        ? 'Cabinet médical'
        : category === 'clinic'
          ? 'Clinique'
          : category === 'bank'
            ? 'Banque'
            : category === 'laboratory'
              ? 'Laboratoire'
              : category === 'administration'
                ? 'Administration'
                : category === 'leisure'
                  ? 'Loisir'
                  : '';

    const parts = [establishment?.address?.trim(), categoryLabel, isActive ? 'Ouvert' : 'Fermé'].filter(Boolean);
    return parts.join(' · ');
  }, [establishment]);

  const cardWidth = width >= 1100 ? '23.5%' : '48.6%';

  const fetchSnapshot = useCallback(async () => {
    try {
      setError('');

      if (!authUserId) {
        throw new Error('Session utilisateur introuvable.');
      }

      const { data: estabData, error: estabError } = await supabase
        .from('establishments')
        .select('id, name, category, address, is_active')
        .eq('owner', authUserId)
        .limit(1)
        .maybeSingle<EstablishmentRow>();

      if (estabError) throw estabError;
      if (!estabData?.id) {
        setEstablishment(null);
        setWaiting(0);
        setCurrent(0);
        setDone(0);
        setTotalTickets(0);
        return;
      }

      setEstablishment(estabData);

      const { data: queuesData, error: queuesError } = await supabase
        .from('queues')
        .select('id')
        .eq('establishment_id', estabData.id)
        .returns<QueueRow[]>();

      if (queuesError) throw queuesError;

      const queueIds = (queuesData ?? []).map((queue) => queue.id);
      if (queueIds.length === 0) {
        setWaiting(0);
        setCurrent(0);
        setDone(0);
        setTotalTickets(0);
        return;
      }

      const { data: ticketRows, error: ticketError } = await supabase
        .from('tickets')
        .select('id, status')
        .in('queue_id', queueIds)
        .returns<TicketRow[]>();

      if (ticketError) throw ticketError;

      const tickets = ticketRows ?? [];
      setTotalTickets(tickets.length);
      setWaiting(tickets.filter((ticket) => ticket.status === 'waiting').length);
      setCurrent(tickets.filter((ticket) => ticket.status === 'calling').length);
      setDone(tickets.filter((ticket) => ticket.status === 'completed').length);
    } catch (snapshotError) {
      setError(snapshotError instanceof Error ? snapshotError.message : 'Impossible de charger le tableau de bord.');
    } finally {
      setIsLoading(false);
    }
  }, [authUserId]);

  const handleLogout = useCallback(async () => {
    try {
      setError('');

      await supabase.auth.signOut();
      setAuthSession(null, null);

      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = Object.keys(window.localStorage).filter(
          (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
        );

        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      }

      router.replace('/establishment/auth');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Impossible de se déconnecter.');
    }
  }, [router, setAuthSession]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      if (!authReady) return;

      if (!authUserId) {
        router.replace('/establishment/auth');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await fetchSnapshot();
      if (!active || !authUserId) return;

      channel = supabase
        .channel(`estab-dashboard:${authUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, async () => {
          if (!active) return;
          await fetchSnapshot();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, async () => {
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
  }, [authReady, authUserId, fetchSnapshot, router]);

  return (
    <AppShell>
      <View style={styles.top}>
        <View>
          <NobtiLogo size={32} showWordmark />
          <Text style={styles.topSub}>Tableau de bord</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.9 }]} onPress={handleLogout}>
          <Feather name="log-out" size={16} color="#fff" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
      </View>

      <View style={styles.profile}>
        <Text style={styles.profileName}>{establishmentName}</Text>
        <Text style={styles.profileSub}>{establishmentMeta || '—'}</Text>
      </View>

      {!!error && <Text style={styles.error}>⚠ {error}</Text>}

      <View style={styles.statRow}>
        <Stat v={String(waiting)} l="En attente" color="#B8620A" isLoading={isLoading} />
        <Stat v={String(current)} l="En cours" color={colors.green} isLoading={isLoading} />
        <Stat v={String(done)} l="Traités" color={colors.blueDark} isLoading={isLoading} />
        <Stat v={String(totalTickets)} l="Total tickets" color={colors.ink} isLoading={isLoading} />
      </View>

      <Text style={styles.lbl}>Actions</Text>
      <View style={styles.grid}>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Gestion des files"
            sub="Tickets · Appels · Historique"
            icon="list"
            iconColor={colors.greenDark}
            iconBg={colors.greenLight}
            onPress={() => router.push('/establishment/queues')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Mon compte"
            sub="Profil · Infos"
            icon="user"
            iconColor={colors.blueDark}
            iconBg={colors.blueLight}
            onPress={() => router.push('/establishment/account')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Analytiques"
            sub="Stats · Flux"
            icon="bar-chart"
            iconColor="#B8620A"
            iconBg={colors.amberLight}
            onPress={() => router.push('/establishment/analytics')}
          />
        </View>
        <View style={{ width: cardWidth }}>
          <ActionCard
            title="Configuration files"
            sub="Créer · Modifier · QR"
            icon="plus-circle"
            iconColor={colors.greenDark}
            iconBg={colors.greenLight}
            onPress={() => router.push('/establishment/create-queue')}
          />
        </View>
      </View>
    </AppShell>
  );
}

function Stat({ v, l, color, isLoading }: { v: string; l: string; color: string; isLoading?: boolean }) {
  return (
    <View style={styles.stat}>
      {isLoading ? <ActivityIndicator size="small" color={color} /> : <Text style={[styles.statV, { color }]}>{v}</Text>}
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topSub: { marginTop: 4, fontSize: 12, color: colors.soft },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  profile: {
    backgroundColor: colors.blue,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  profileSub: { marginTop: 2, color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 120, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 10, alignItems: 'center' },
  statV: { fontSize: 22, fontWeight: '800' },
  statL: { marginTop: 2, fontSize: 10, fontWeight: '700', color: colors.soft },
  error: { fontSize: 11, color: '#d32f2f', marginBottom: 12, fontWeight: '600' },
  lbl: {
    fontSize: 11,
    color: colors.soft,
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  actionSub: { marginTop: 4, fontSize: 11, color: colors.soft },
});
