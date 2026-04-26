import axios, { isAxiosError } from 'axios';
import { appConfig } from '@/src/lib/appConfig';

export type QueueEntity = {
  id: string;
  establishment_id: string;
  name: string;
  prefix: string;
  is_open: boolean;
  max_tickets: number | null;
  updated_at: string | null;
};

type QueueLike = Record<string, unknown>;

type UpsertQueuePayload = {
  establishment_id: string;
  name: string;
  prefix: string;
  max_tickets: number | null;
};

function readStringField(source: QueueLike, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return '';
}

function readNumberField(source: QueueLike, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return null;
}

function readBooleanField(source: QueueLike, keys: string[], fallback: boolean) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
  }

  return fallback;
}

function unwrapQueuesResponse(payload: unknown): QueueLike[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter((item): item is QueueLike => item !== null && typeof item === 'object');
  }

  if (typeof payload === 'object') {
    const source = payload as QueueLike;

    if (Array.isArray(source.items)) {
      return source.items.filter((item): item is QueueLike => item !== null && typeof item === 'object');
    }

    if (Array.isArray(source.data)) {
      return source.data.filter((item): item is QueueLike => item !== null && typeof item === 'object');
    }
  }

  return [];
}

function normalizeQueue(payload: unknown): QueueEntity {
  const source = (payload && typeof payload === 'object' ? payload : {}) as QueueLike;

  return {
    id: readStringField(source, ['id']),
    establishment_id: readStringField(source, ['establishment_id', 'establishmentId']),
    name: readStringField(source, ['name']),
    prefix: readStringField(source, ['prefix']) || 'A',
    is_open: readBooleanField(source, ['is_open', 'isOpen'], true),
    max_tickets: readNumberField(source, ['max_tickets', 'Max_tickets', 'maxTickets']),
    updated_at: readStringField(source, ['updated_at', 'updatedAt']) || null,
  };
}

function getApiBaseUrl() {
  const base = appConfig.apiBaseUrl.trim().replace(/\/$/, '');
  if (!base) {
    throw new Error('API base URL is missing. Configure apiBaseUrl in app config.');
  }

  return base;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) return responseData;

    if (
      responseData &&
      typeof responseData === 'object' &&
      'message' in responseData &&
      typeof responseData.message === 'string' &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }

    if (typeof error.message === 'string' && error.message.trim()) return error.message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;

  return fallback;
}

export async function listQueues(accessToken: string): Promise<QueueEntity[]> {
  try {
    const base = getApiBaseUrl();
    const response = await axios.get(`${base}/queues`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return unwrapQueuesResponse(response.data).map(normalizeQueue);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Impossible de récupérer les files.'));
  }
}

export async function createQueue(accessToken: string, payload: UpsertQueuePayload): Promise<QueueEntity> {
  try {
    const base = getApiBaseUrl();
    const response = await axios.post(`${base}/queues`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return normalizeQueue(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Impossible de créer la file.'));
  }
}

export async function updateQueue(accessToken: string, queueId: string, payload: UpsertQueuePayload): Promise<QueueEntity> {
  try {
    const base = getApiBaseUrl();
    const response = await axios.patch(`${base}/queues/${encodeURIComponent(queueId)}`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return normalizeQueue(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour la file.'));
  }
}