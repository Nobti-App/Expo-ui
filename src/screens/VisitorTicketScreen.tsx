import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/AppHeader';
import { AppShell } from '@/src/components/AppShell';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { TicketCard } from '@/src/components/TicketCard';
import { useAppState } from '@/src/state/AppContext';
import { colors } from '@/src/theme/colors';

export function VisitorTicketScreen() {
  const router = useRouter();
  const { myTicket, advanceMyTicket } = useAppState();

  return (
    <AppShell>
      <AppHeader title="Mon ticket" backLabel="Ma file" onBack={() => router.push('/visitor/fiche')} />

      {myTicket ? (
        <>
          {myTicket.before <= 2 && (
            <View style={styles.notif}>
              <Text style={styles.notifTitle}>{myTicket.before === 0 ? "C'est votre tour !" : `Il reste ${myTicket.before} personne(s) avant vous`}</Text>
              <Text style={styles.notifText}>Préparez-vous à vous déplacer vers l&apos;établissement.</Text>
            </View>
          )}

          <TicketCard ticket={myTicket} />

          <PrimaryButton label="Simuler l'avancement de la file →" variant="gray" onPress={advanceMyTicket} />
          <PrimaryButton label="Rejoindre une autre file" variant="outline" onPress={() => router.push('/visitor/list')} />
        </>
      ) : (
        <View>
          <Text style={styles.empty}>Aucun ticket actif.</Text>
          <PrimaryButton label="Voir les établissements" onPress={() => router.push('/visitor/list')} />
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  notif: {
    borderWidth: 1.5,
    borderColor: '#9FE1CB',
    backgroundColor: colors.greenLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  notifTitle: { fontSize: 13, fontWeight: '800', color: colors.greenDark },
  notifText: { marginTop: 2, fontSize: 12, color: colors.mid },
  empty: { textAlign: 'center', marginVertical: 20, color: colors.soft },
});
