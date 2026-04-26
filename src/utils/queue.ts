import { QueueMap } from '@/src/types';

export const cloneQueues = (queues: QueueMap) =>
  Object.fromEntries(
    Object.entries(queues).map(([k, items]) => [k, items.map((item) => ({ ...item }))])
  ) as QueueMap;

export const fmtTime = () =>
  new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
