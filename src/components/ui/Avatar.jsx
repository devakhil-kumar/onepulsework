import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {colors, fontWeight} from '@theme';
import AppText from './AppText';

const sizes = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const bgPalette = [
  '#7B61FF', '#3B82F6', '#22C55E', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
];

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function getBg(name = '') {
  const code = name.charCodeAt(0) || 0;
  return bgPalette[code % bgPalette.length];
}

export default function Avatar({name = '', uri, size = 'md', style}) {
  const dim = typeof size === 'number' ? size : sizes[size] ?? 40;
  const initials = getInitials(name);
  const bg = getBg(name);
  const fontSize = dim * 0.36;

  if (uri) {
    return (
      <Image
        source={{uri}}
        style={[styles.base, {width: dim, height: dim, borderRadius: dim / 2}, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        {width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg},
        style,
      ]}>
      <AppText style={{fontSize, fontWeight: fontWeight.bold, color: colors.white}}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
