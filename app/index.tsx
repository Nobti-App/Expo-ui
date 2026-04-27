import { Redirect } from 'expo-router';
import React from 'react';

import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';

type RedirectTarget = '/establishment/dashboard' | '/establishment/signup' | '/establishment/auth' | null;

function RootGate() {
	const { setAuthSession } = useAppState();
	const [ready, setReady] = React.useState(false);
	const [target, setTarget] = React.useState<RedirectTarget>(null);

	React.useEffect(() => {
		let active = true;

		const checkSession = async () => {
			try {
				const sessionResult = await supabase.auth.getSession();
				const session = sessionResult.data.session;

				const token = session?.access_token ?? null;
				const userId = session?.user?.id ?? null;

				if (!token || !userId) {
					if (active) {
						setAuthSession(null, null);
						setTarget('/establishment/auth');
						setReady(true);
					}
					return;
				}

				if (active) {
					setAuthSession(token, userId);
				}

				const { data: ownedEstabs, error: estabCheckError } = await supabase
					.from('establishments')
					.select('id')
					.eq('owner', userId)
					.limit(1);

				if (!active) return;

				if (estabCheckError) {
					setTarget('/establishment/auth');
					setReady(true);
					return;
				}

				setTarget((ownedEstabs?.length ?? 0) > 0 ? '/establishment/dashboard' : '/establishment/signup');
				setReady(true);
			} catch {
				if (active) {
					setTarget('/establishment/auth');
					setReady(true);
				}
			}
		};

		checkSession();

		return () => {
			active = false;
		};
	}, [setAuthSession]);

	if (!ready || !target) return null;

	return <Redirect href={target} />;
}

export default RootGate;
