import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Line } from 'react-native-svg';

import { colors } from '@/src/theme/colors';

type Props = {
  size?: number;
  showWordmark?: boolean;
  whiteMode?: boolean;
};

export function NobtiLogo({ size = 48, showWordmark = false, whiteMode = false }: Props) {
  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Rect width="512" height="512" fill={whiteMode ? 'rgba(255,255,255,0.15)' : colors.green} />
        <Defs>
          <LinearGradient id="logoGrad" x1="80" y1="80" x2="430" y2="430">
            <Stop offset="0" stopColor="#fff" />
            <Stop offset="1" stopColor="rgba(255,255,255,0.75)" />
          </LinearGradient>
        </Defs>
        <Path d="M110 370L110 142L176 142L300 295L300 142L366 142L366 370L300 370L176 217L176 370Z" fill="url(#logoGrad)" />
        <Circle cx="366" cy="142" r="44" fill="#fff" opacity={0.92} />
        <Line x1="366" y1="127" x2="366" y2="143" stroke={colors.green} strokeWidth="5.5" strokeLinecap="round" />
        <Line x1="366" y1="143" x2="379" y2="153" stroke={colors.green} strokeWidth="5.5" strokeLinecap="round" />
        <Circle cx="366" cy="143" r="3.5" fill={colors.green} />
      </Svg>
      {showWordmark && (
        <Text style={[styles.wordmark, whiteMode && styles.wordmarkWhite]}>
          Nobti<Text style={styles.dot}>.ma</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  wordmarkWhite: {
    color: '#fff',
  },
  dot: {
    color: 'rgba(255,255,255,0.65)',
  },
});
