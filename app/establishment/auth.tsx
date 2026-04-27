import { Redirect } from 'expo-router';
import React from 'react';

import { EstabAuthScreen } from '@/src/screens/EstabAuthScreen';
import { supabase } from '@/src/lib/supabase';
import { useAppState } from '@/src/state/AppContext';

type RedirectTarget = '/establishment/dashboard' | '/establishment/signup' | null;

function EstablishmentAuthGate() {
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
					setReady(true);
					return;
				}

				setTarget((ownedEstabs?.length ?? 0) > 0 ? '/establishment/dashboard' : '/establishment/signup');
				setReady(true);
			} catch {
				if (active) {
					setReady(true);
				}
			}
		};

		checkSession();

		return () => {
			active = false;
		};
	}, [setAuthSession]);

	if (!ready) return null;
	if (target) return <Redirect href={target} />;

	return <EstabAuthScreen />;
}

export default EstablishmentAuthGate;
