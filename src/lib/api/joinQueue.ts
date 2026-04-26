import { supabase } from '@/src/lib/supabase';
import { appConfig } from '@/src/lib/appConfig';
import { Platform } from 'react-native';
import axios from 'axios';

type JoinTicketPayload = {
  ticket_id: string;
  display_number: string;
  establishment_name: string;
  queue_name: string;
  before_count?: number | null;
  estimated_minutes?: number | null;
  progress_percent?: number | null;
  status?: 'waiting' | 'calling' | 'completed' | 'done' | 'cancelled' | 'no_show' | null;
};

type TicketLike = Record<string, unknown>;

function readStringField(source: TicketLike, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return '';
}

function readNumberField(source: TicketLike, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return null;
}

function unwrapTicketPayload(payload: unknown): TicketLike {
  if (payload && typeof payload === 'object') {
    const source = payload as TicketLike;

    if ('data' in source && source.data && typeof source.data === 'object') {
      const nested = source.data as TicketLike;

      if ('ticket' in nested && nested.ticket && typeof nested.ticket === 'object') {
        return nested.ticket as TicketLike;
      }

      return nested;
    }

    if ('ticket' in source && source.ticket && typeof source.ticket === 'object') {
      return source.ticket as TicketLike;
    }

    return source;
  }

  return {};
}

export type JoinTicket = {
  ticketId: string;
  displayNumber: string;
  establishmentName: string;
  queueName: string;
  beforeCount: number;
  estimatedMinutes: number | null;
  progressPercent: number;
  status: 'waiting' | 'calling' | 'done' | 'cancelled' | 'no_show';
};

export type QueueProgressEvent = Partial<JoinTicket>;

const apiBaseUrl = appConfig.apiBaseUrl;
const wsBaseUrl = appConfig.wsBaseUrl;

function toAbsoluteBaseUrl(raw: string, kind: 'http' | 'ws') {
  const input = raw.trim();

  if (!input) return '';

  if (kind === 'http' && /^https?:\/\//i.test(input)) return input.replace(/\/$/, '');
  if (kind === 'ws' && /^wss?:\/\//i.test(input)) return input.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined' && input.startsWith('/')) {
    const protocol = kind === 'http' ? window.location.protocol : window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${input}`.replace(/\/$/, '');
  }

  return '';
}

function requireApiBaseUrl() {
  const normalized = toAbsoluteBaseUrl(apiBaseUrl, 'http');
  console.log('Raw API Base URL from config:', apiBaseUrl);
  console.log('Normalized API Base URL:', normalized);
  if (!normalized) {
    throw new Error(
      'API base URL is invalid or missing. Set EXPO_PUBLIC_API_BASE_URL to an absolute http(s) URL (or a leading /path on web).'
    );
  }
  return normalized;
}

function requireWsBaseUrl() {
  const normalized = wsBaseUrl;
  if (!normalized) {
    throw new Error(
      'WS base URL is invalid or missing. Set EXPO_PUBLIC_WS_BASE_URL to an absolute ws(s) URL (or a leading /path on web).'
    );
  }
  return normalized;
}

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

function normalizeTicketPayload(payload: JoinTicketPayload): JoinTicket {
  const source = unwrapTicketPayload(payload);
  const ticketId = readStringField(source, ['ticket_id', 'ticketId', 'id']);
  const prefix = readStringField(source, ['prefix', 'ticket_prefix', 'queue_prefix']);
  const numericPart = readStringField(source, ['number', 'ticket_number', 'sequence', 'position']);
  const rawDisplayNumber = readStringField(source, ['display_number', 'displayNumber']);
  const displayNumber = rawDisplayNumber || (prefix && numericPart ? `${prefix}${numericPart}` : numericPart || ticketId);
  const establishmentName = readStringField(source, ['establishment_name', 'establishmentName']);
  const queueName = readStringField(source, ['queue_name', 'queueName']);
  const beforeCount = readNumberField(source, ['before_count', 'beforeCount']) ?? 0;
  const estimatedMinutes = readNumberField(source, ['estimated_minutes', 'estimatedMinutes']);
  const progressPercent = readNumberField(source, ['progress_percent', 'progressPercent']) ?? 0;
  const rawStatus = source.status;
  const status =
    rawStatus === 'completed' || rawStatus === 'done'
      ? 'done'
      : rawStatus === 'waiting' || rawStatus === 'calling' || rawStatus === 'cancelled' || rawStatus === 'no_show'
        ? rawStatus
        : 'waiting';

  if (!ticketId) {
    console.error('normalizeTicketPayload: missing ticket id in API response', payload);
  }

  return {
    ticketId,
    displayNumber,
    establishmentName,
    queueName,
    beforeCount,
    estimatedMinutes,
    progressPercent,
    status,
  };
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

export async function createQueueTicket(queueId: string, accessToken: string, userId: string) {
  try {
    const base = requireApiBaseUrl();
    const response = await axios.post<JoinTicketPayload>(
      `${base}/queues/${encodeURIComponent(queueId)}/tickets`,
      {
        user_id: userId,
        source: 'qr_join',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return normalizeTicketPayload(response.data);
  } catch (error) {
    console.error('createQueueTicket failed:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to create queue ticket.'));
  }
}

export async function cancelQueueTicket(ticketId: string, accessToken: string) {
  try {
    if (!ticketId || !ticketId.trim()) {
      throw new Error('Missing ticket id for cancellation.');
    }

    const base = requireApiBaseUrl();
    await axios.post(
      `${base}/tickets/${encodeURIComponent(ticketId)}/cancel`,
      undefined,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    console.error('cancelQueueTicket failed:', error);
    throw new Error(getAxiosErrorMessage(error, 'Failed to cancel ticket.'));
  }
}

function mapProgressEvent(raw: Record<string, unknown>): QueueProgressEvent {
  const event: QueueProgressEvent = {};

  if (typeof raw.ticket_id === 'string') event.ticketId = raw.ticket_id;
  if (typeof raw.display_number === 'string') event.displayNumber = raw.display_number;
  if (typeof raw.establishment_name === 'string') event.establishmentName = raw.establishment_name;
  if (typeof raw.queue_name === 'string') event.queueName = raw.queue_name;
  if (typeof raw.before_count === 'number') event.beforeCount = raw.before_count;
  if (typeof raw.estimated_minutes === 'number') event.estimatedMinutes = raw.estimated_minutes;
  if (typeof raw.progress_percent === 'number') event.progressPercent = raw.progress_percent;
  if (
    raw.status === 'waiting' ||
    raw.status === 'calling' ||
    raw.status === 'done' ||
    raw.status === 'completed' ||
    raw.status === 'cancelled' ||
    raw.status === 'no_show'
  ) {
    event.status = raw.status === 'completed' ? 'done' : (raw.status as JoinTicket['status']);
  }

  return event;
}

export function connectQueueProgressSocket(
  queueId: string,
  ticketId: string,
  accessToken: string,
  onEvent: (event: QueueProgressEvent) => void,
  onError: (error: Error) => void
) {
  const base = requireWsBaseUrl();
  const socketUrl = `${base}/queues/${encodeURIComponent(queueId)}/stream?ticket_id=${encodeURIComponent(ticketId)}&access_token=${encodeURIComponent(accessToken)}`;

  const ws = new WebSocket(socketUrl);

  ws.onmessage = (message) => {
    try {
      const parsed = JSON.parse(String(message.data)) as Record<string, unknown>;
      onEvent(mapProgressEvent(parsed));
    } catch {
      onError(new Error('Invalid websocket payload from backend.'));
    }
  };

  ws.onerror = () => {
    onError(new Error('Queue progress websocket connection failed.'));
  };

  return () => ws.close();
}
