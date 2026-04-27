import { supabase } from '@/src/lib/supabase';

type DbTicketStatus = 'waiting' | 'calling' | 'completed' | 'done' | 'cancelled' | 'no_show' | null;

type TicketRow = {
  id: string;
  queue_id: string;
  ticket_number: number;
  display_number: string | null;
  status: DbTicketStatus;
  holder_name: string | null;
};

type QueueRow = {
  id: string;
  name: string;
  prefix: string | null;
  avg_wait_minutes: number | null;
  establishment_id: string | null;
  last_issued_number: number | null;
};

type EstablishmentRow = {
  name: string | null;
};

export type JoinTicket = {
  ticketId: string;
  displayNumber: string;
  establishmentName: string;
  queueName: string;
  holderName: string | null;
  beforeCount: number;
  estimatedMinutes: number | null;
  progressPercent: number;
  status: 'waiting' | 'calling' | 'done' | 'cancelled' | 'no_show';
};

export type QueueProgressEvent = Partial<JoinTicket>;

export type PublicQueueDetails = {
  id: string;
  name: string;
  prefix: string;
  avgServiceMinutes: number | null;
  peopleWaiting: number;
  establishmentName: string;
};

export const JOIN_SESSION_RESET_REQUIRED = 'JOIN_SESSION_RESET_REQUIRED';

export async function ensureAnonymousSession() {
  const currentSessionResult = await supabase.auth.getSession();
  const currentSession = currentSessionResult.data.session;

  if (currentSession?.access_token && currentSession.user?.id) {
    return {
      accessToken: currentSession.access_token,
      userId: currentSession.user.id,
    };
  }

  const anonResult = await supabase.auth.signInAnonymously();
  if (anonResult.error) {
    throw new Error(anonResult.error.message);
  }

  const anonSession = anonResult.data.session;
  if (!anonSession?.access_token || !anonSession.user?.id) {
    throw new Error('Anonymous session was not returned by Supabase.');
  }

  return {
    accessToken: anonSession.access_token,
    userId: anonSession.user.id,
  };
}

function mapStatus(rawStatus: DbTicketStatus): JoinTicket['status'] {
  if (rawStatus === 'completed' || rawStatus === 'done') return 'done';
  if (rawStatus === 'calling' || rawStatus === 'cancelled' || rawStatus === 'no_show') return rawStatus;
  return 'waiting';
}

function isActiveStatus(status: JoinTicket['status']) {
  return status === 'waiting' || status === 'calling';
}

function isTerminalStatus(status: JoinTicket['status']) {
  return status === 'done' || status === 'cancelled' || status === 'no_show';
}

function computeProgress(status: JoinTicket['status'], beforeCount: number, totalActive: number) {
  if (status === 'done' || status === 'cancelled' || status === 'no_show') return 100;
  if (status === 'calling') return 100;
  if (totalActive <= 0) return 0;

  const positionFromStart = Math.max(0, totalActive - (beforeCount + 1));
  const value = Math.round((positionFromStart / totalActive) * 100);
  return Math.max(0, Math.min(100, value));
}

function buildDisplayNumber(ticket: TicketRow, queue: QueueRow) {
  if (ticket.display_number && ticket.display_number.trim()) {
    return ticket.display_number;
  }

  const prefix = queue.prefix?.trim() ?? '';
  const numberPart = Number.isFinite(ticket.ticket_number) ? String(ticket.ticket_number) : ticket.id;
  return `${prefix}${numberPart}`;
}

async function fetchQueueRow(queueId: string) {
  const { data, error } = await supabase
    .from('queues')
    .select('id, name, prefix, avg_wait_minutes, establishment_id, last_issued_number')
    .eq('id', queueId)
    .maybeSingle<QueueRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Queue not found.');
  return data;
}

async function buildJoinTicket(ticket: TicketRow): Promise<JoinTicket> {
  const queue = await fetchQueueRow(ticket.queue_id);

  const { data: establishment, error: establishmentError } = await supabase
    .from('establishments')
    .select('name')
    .eq('id', queue.establishment_id ?? '')
    .maybeSingle<EstablishmentRow>();

  if (establishmentError) throw new Error(establishmentError.message);

  const activeStatuses: DbTicketStatus[] = ['waiting', 'calling'];

  const { count: beforeCount, error: beforeError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', ticket.queue_id)
    .in('status', activeStatuses)
    .lt('ticket_number', ticket.ticket_number);

  if (beforeError) throw new Error(beforeError.message);

  const { count: totalActive, error: totalError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', ticket.queue_id)
    .in('status', activeStatuses);

  if (totalError) throw new Error(totalError.message);

  const normalizedStatus = mapStatus(ticket.status);
  const normalizedBeforeCount = beforeCount ?? 0;
  const avgServiceMinutes = queue.avg_wait_minutes ?? null;

  return {
    ticketId: ticket.id,
    displayNumber: buildDisplayNumber(ticket, queue),
    establishmentName: establishment?.name ?? '',
    queueName: queue.name,
    holderName: ticket.holder_name,
    beforeCount: normalizedBeforeCount,
    estimatedMinutes: avgServiceMinutes != null ? avgServiceMinutes * normalizedBeforeCount : null,
    progressPercent: computeProgress(normalizedStatus, normalizedBeforeCount, totalActive ?? 0),
    status: normalizedStatus,
  };
}

export async function fetchJoinTicketSnapshot(ticketId: string) {
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, queue_id, ticket_number, display_number, status, holder_name')
    .eq('id', ticketId)
    .maybeSingle<TicketRow>();

  if (ticketError) throw new Error(ticketError.message);
  if (!ticket) throw new Error('Ticket not found.');

  return buildJoinTicket(ticket);
}

async function createTicketWithFallbackNumber(queueId: string, userId: string, holderName?: string) {
  const queue = await fetchQueueRow(queueId);
  const nextNumber = (queue.last_issued_number ?? 0) + 1;

  const { error: queueUpdateError } = await supabase.from('queues').update({ last_issued_number: nextNumber }).eq('id', queueId);
  if (queueUpdateError) throw new Error(queueUpdateError.message);

  const displayNumber = `${queue.prefix?.trim() ?? ''}${nextNumber}`;

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      queue_id: queueId,
      user_id: userId,
      holder_name: holderName?.trim() ? holderName.trim() : null,
      ticket_number: nextNumber,
      display_number: displayNumber,
      status: 'waiting',
    })
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Ticket creation failed.');

  return fetchJoinTicketSnapshot(data.id);
}

async function findLatestUserTicketInQueue(queueId: string, userId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, queue_id, ticket_number, display_number, status, holder_name')
    .eq('queue_id', queueId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TicketRow>();

  if (error) throw new Error(error.message);
  return data;
}

export async function createQueueTicket(queueId: string, _accessToken: string, userId: string, holderName?: string) {
  const existingTicket = await findLatestUserTicketInQueue(queueId, userId);

  if (existingTicket) {
    const existing = await buildJoinTicket(existingTicket);

    if (isActiveStatus(existing.status)) {
      if (holderName?.trim() && holderName.trim() !== (existing.holderName ?? '')) {
        return updateTicketHolderName(existing.ticketId, holderName);
      }

      return existing;
    }

    if (isTerminalStatus(existing.status)) {
      throw new Error(JOIN_SESSION_RESET_REQUIRED);
    }
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      queue_id: queueId,
      user_id: userId,
      holder_name: holderName?.trim() ? holderName.trim() : null,
      status: 'waiting',
    })
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error) {
    return createTicketWithFallbackNumber(queueId, userId, holderName);
  }

  if (!data?.id) {
    throw new Error('Ticket creation failed.');
  }

  return fetchJoinTicketSnapshot(data.id);
}

export async function updateTicketHolderName(ticketId: string, holderName: string) {
  const { error } = await supabase
    .from('tickets')
    .update({ holder_name: holderName.trim() ? holderName.trim() : null })
    .eq('id', ticketId);

  if (error) throw new Error(error.message);

  return fetchJoinTicketSnapshot(ticketId);
}

export async function cancelQueueTicket(ticketId: string) {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('Missing ticket id for cancellation.');
  }

  const { error } = await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticketId);
  if (error) throw new Error(error.message);
}

export async function fetchPublicQueueDetails(queueId: string): Promise<PublicQueueDetails> {
  const queue = await fetchQueueRow(queueId);

  const { data: establishment, error: establishmentError } = await supabase
    .from('establishments')
    .select('name')
    .eq('id', queue.establishment_id ?? '')
    .maybeSingle<EstablishmentRow>();

  if (establishmentError) throw new Error(establishmentError.message);

  const { count, error: countError } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', queueId)
    .in('status', ['waiting', 'calling']);

  if (countError) throw new Error(countError.message);

  return {
    id: queue.id,
    name: queue.name,
    prefix: queue.prefix?.trim() || '',
    avgServiceMinutes: queue.avg_wait_minutes ?? null,
    peopleWaiting: count ?? 0,
    establishmentName: establishment?.name ?? '',
  };
}

export function connectQueueProgressSocket(
  queueId: string,
  ticketId: string,
  accessToken: string,
  onEvent: (event: QueueProgressEvent) => void,
  onError: (error: Error) => void
) {
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const emitLatest = async () => {
    try {
      const latest = await fetchJoinTicketSnapshot(ticketId);
      if (!active) return;
      onEvent(latest);
    } catch (error) {
      if (!active) return;
      onError(error instanceof Error ? error : new Error('Failed to refresh ticket.'));
    }
  };

  const fallbackInterval = setInterval(() => {
    if (!active) return;
    void emitLatest();
  }, 4000);

  void (async () => {
    try {
      await supabase.realtime.setAuth(accessToken);
    } catch {
    }

    if (!active) return;

    channel = supabase
      .channel(`join-ticket:${queueId}:${ticketId}`)
      .on('broadcast', { event: 'status-update' }, async () => {
        if (!active) return;
        await emitLatest();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, async () => {
        if (!active) return;
        await emitLatest();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `queue_id=eq.${queueId}` }, async () => {
        if (!active) return;
        await emitLatest();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queues', filter: `id=eq.${queueId}` }, async () => {
        if (!active) return;
        await emitLatest();
      })
      .subscribe((status) => {
        if (!active) return;

        if (status === 'SUBSCRIBED') {
          void emitLatest();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          onError(new Error('Realtime subscription failed.'));
        }
      });
  })();

  void emitLatest();

  return () => {
    active = false;
    clearInterval(fallbackInterval);
    if (channel) supabase.removeChannel(channel);
  };
}
