import { Redirect, Slot, usePathname } from 'expo-router';
import React from 'react';

import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';

function isPublicEstablishmentRoute(pathname: string) {
  return pathname.startsWith('/establishment/auth') || pathname.startsWith('/establishment/signup');
}

export default function EstablishmentLayoutGuard() {
  const pathname = usePathname();
  const { setAuthSession } = useAppState();
  const [ready, setReady] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const sessionResult = await supabase.auth.getSession();
        const session = sessionResult.data.session;

        const token = session?.access_token ?? null;
        const userId = session?.user?.id ?? null;

        if (!active) return;

        setAuthSession(token, userId);
        setAuthenticated(Boolean(token && userId));
        setReady(true);
      } catch {
        if (!active) return;
        setAuthSession(null, null);
        setAuthenticated(false);
        setReady(true);
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [setAuthSession]);

  if (!ready) return null;

  const isPublic = isPublicEstablishmentRoute(pathname);

  if (!authenticated && !isPublic) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
