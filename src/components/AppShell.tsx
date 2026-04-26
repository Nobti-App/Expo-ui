import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export function AppShell({ children, scroll = true, contentStyle }: Props) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const containerWidth = isWeb ? Math.min(Math.max(width - 32, 320), 1200) : width;

  return (
    <SafeAreaView style={styles.page}>
      <View style={[styles.container, { width: containerWidth }]}> 
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignSelf: 'center',
    ...(Platform.OS === 'web'
      ? {
          borderRadius: 20,
          marginVertical: 16,
          minHeight: '100vh' as never,
          boxShadow: '0px 4px 40px rgba(0,0,0,0.08)' as never,
        }
      : {}),
  },
  flex: { flex: 1 },
  content: { padding: 16 },
});
