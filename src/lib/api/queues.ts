import { supabase } from '@/src/lib/supabase';

export type QueueEntity = {
  id: string;
  establishment_id: string;
  name: string;
  prefix: string;
  is_open: boolean;
  max_tickets: number | null;
  avg_wait_minutes: number | null;
  updated_at: string | null;
};

type UpsertQueuePayload = {
  establishment_id: string;
  name: string;
  prefix: string;
  max_tickets: number | null;
  avg_wait_minutes?: number | null;
};

export async function listQueues(): Promise<QueueEntity[]> {
  const { data, error } = await supabase
    .from('queues')
    .select('id, establishment_id, name, prefix, is_open, max_tickets, avg_wait_minutes, updated_at')
    .returns<QueueEntity[]>();

  if (error) {
    throw new Error(error.message || 'Impossible de récupérer les files.');
  }

  return data ?? [];
}

export async function createQueue(payload: UpsertQueuePayload): Promise<QueueEntity> {
  const { data, error } = await supabase
    .from('queues')
    .insert([
      {
        establishment_id: payload.establishment_id,
        name: payload.name,
        prefix: payload.prefix,
        max_tickets: payload.max_tickets,
        avg_wait_minutes: payload.avg_wait_minutes ?? null,
        is_open: true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible de créer la file.');
  }

  return data as QueueEntity;
}

export async function updateQueue(queueId: string, payload: UpsertQueuePayload): Promise<QueueEntity> {
  const { data, error } = await supabase
    .from('queues')
    .update({
      name: payload.name,
      prefix: payload.prefix,
      max_tickets: payload.max_tickets,
      avg_wait_minutes: payload.avg_wait_minutes ?? null,
    })
    .eq('id', queueId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible de mettre à jour la file.');
  }

  return data as QueueEntity;
}