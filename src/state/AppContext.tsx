import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { BASE_QUEUES, ESTABS } from '@/src/data/mockData';
import { supabase } from '@/src/lib/supabase';
import { Establishment, MyTicket, PayMethod, PayOption, QueueMap } from '@/src/types';
import { cloneQueues, fmtTime } from '@/src/utils/queue';

type AppContextValue = {
  authSessionToken: string | null;
  authUserId: string | null;
  authReady: boolean;
  setAuthSession: (token: string | null, userId: string | null) => void;
  estabs: Establishment[];
  queues: QueueMap;
  curEstabId: number;
  setCurEstabId: (id: number) => void;
  myTicket: MyTicket | null;
  payOption: PayOption;
  setPayOption: (option: PayOption) => void;
  payMethod: PayMethod;
  setPayMethod: (method: PayMethod) => void;
  curQueue: string;
  setCurQueue: (queue: string) => void;
  qWait: (k: string) => number;
  qDone: (k: string) => number;
  estabCount: (id: number) => number;
  estabWait: (id: number) => number;
  currentTicket: () => string;
  takeTicket: (isVip?: boolean, forcedNum?: string) => string;
  advanceMyTicket: () => void;
  queueCall: (k: string, n: string) => void;
  queueDone: (k: string, n: string) => void;
  queueCallNext: (k: string) => void;
  queueCreateTicket: (k: string) => void;
  queueReset: (k: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authSessionToken, setAuthSessionToken] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [queues, setQueues] = useState<QueueMap>(() => cloneQueues(BASE_QUEUES));
  const [curEstabId, setCurEstabId] = useState(0);
  const [myTicket, setMyTicket] = useState<MyTicket | null>(null);
  const [payOption, setPayOption] = useState<PayOption>('vip1');
  const [payMethod, setPayMethod] = useState<PayMethod>('cmi');
  const [curQueue, setCurQueue] = useState('A');

  useEffect(() => {
    let mounted = true;

    const hydrateAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setAuthSession(data.session?.access_token ?? null, data.session?.user?.id ?? null);
      setAuthReady(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session?.access_token ?? null, session?.user?.id ?? null);
      setAuthReady(true);
    });

    hydrateAuth().catch(() => {
      if (!mounted) return;
      setAuthSession(null, null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const qWait = (k: string) => (queues[k] || []).filter((t) => t.s === 'waiting' || t.s === 'current').length;
  const qDone = (k: string) => (queues[k] || []).filter((t) => t.s === 'done').length;
  const estabCount = (_id: number) => ['A', 'B', 'C'].reduce((sum, key) => sum + qWait(key), 0);

  const estabWait = (id: number) => {
    const estab = ESTABS.find((x) => x.id === id) || ESTABS[0];
    return estabCount(id) * estab.avg;
  };

  const currentTicket = () => {
    const curr = (queues.A || []).find((t) => t.s === 'current');
    return curr ? curr.n : '—';
  };

  const takeTicket = (isVip = false, forcedNum?: string) => {
    const estab = ESTABS.find((x) => x.id === curEstabId) || ESTABS[0];
    const queueKey = 'A';

    let nextNum = '';

    setQueues((prev) => {
      const next = cloneQueues(prev);
      const waitingBefore = (next[queueKey] || []).filter((t) => t.s === 'waiting').length;
      nextNum = forcedNum || `${isVip ? 'V' : 'A'}${String((next[queueKey] || []).length + 1).padStart(2, '0')}`;
      if (!next[queueKey]) next[queueKey] = [];
      next[queueKey].push({ n: nextNum, s: 'waiting', t: fmtTime() });

      setMyTicket({
        before: waitingBefore,
        total: waitingBefore + 1,
        num: nextNum,
        estab: estab.name,
        avg: estab.avg || 4,
        isVip,
      });

      return next;
    });

    return nextNum;
  };

  const advanceMyTicket = () => {
    setMyTicket((prev) => {
      if (!prev || prev.before <= 0) return prev;
      return { ...prev, before: prev.before - 1 };
    });
  };

  const queueCall = (k: string, n: string) => {
    setQueues((prev) => {
      const next = cloneQueues(prev);
      const item = (next[k] || []).find((t) => t.n === n);
      if (item) item.s = 'current';
      return next;
    });
  };

  const queueDone = (k: string, n: string) => {
    setQueues((prev) => {
      const next = cloneQueues(prev);
      const item = (next[k] || []).find((t) => t.n === n);
      if (item) item.s = 'done';
      return next;
    });
  };

  const queueCallNext = (k: string) => {
    setQueues((prev) => {
      const next = cloneQueues(prev);
      const firstWaiting = (next[k] || []).find((t) => t.s === 'waiting');
      if (firstWaiting) firstWaiting.s = 'current';
      return next;
    });
  };

  const queueCreateTicket = (k: string) => {
    setQueues((prev) => {
      const next = cloneQueues(prev);
      const queue = next[k] || [];
      queue.push({
        n: `${k}${String(queue.length + 1).padStart(2, '0')}`,
        s: 'waiting',
        t: fmtTime(),
      });
      next[k] = queue;
      return next;
    });
  };

  const queueReset = (k: string) => {
    setQueues((prev) => ({ ...prev, [k]: [] }));
  };

  const setAuthSession = useCallback((token: string | null, userId: string | null) => {
    setAuthSessionToken(token);
    setAuthUserId(userId);
  }, []);

  const value: AppContextValue = {
    authSessionToken,
    authUserId,
    authReady,
    setAuthSession,
    estabs: ESTABS,
    queues,
    curEstabId,
    setCurEstabId,
    myTicket,
    payOption,
    setPayOption,
    payMethod,
    setPayMethod,
    curQueue,
    setCurQueue,
    qWait,
    qDone,
    estabCount,
    estabWait,
    currentTicket,
    takeTicket,
    advanceMyTicket,
    queueCall,
    queueDone,
    queueCallNext,
    queueCreateTicket,
    queueReset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used inside AppProvider');
  return ctx;
}
