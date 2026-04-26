import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  title?: string;
  backLabel?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function AppHeader({ title, backLabel, onBack, rightLabel, onRightPress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {backLabel ? (
          <Pressable onPress={onBack} style={styles.sideBtn}>
            <Text style={styles.back}>{`← ${backLabel}`}</Text>
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}
        <Text style={styles.title}>{title}</Text>
        {rightLabel ? (
          <Pressable onPress={onRightPress} style={styles.sideBtn}>
            <Text style={styles.right}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  sideBtn: {
    width: 84,
  },
  back: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  right: {
    fontSize: 12,
    color: colors.soft,
    textAlign: 'right',
  },
});
