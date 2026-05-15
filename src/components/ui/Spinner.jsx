import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {useColors} from '@app/ThemeContext';

export default function Spinner({size = 'large', color, full = false}) {
  const colors = useColors();
  const spinColor = color ?? colors.primary;

  if (full) {
    return (
      <View style={[styles.fullScreen, {backgroundColor: colors.background}]}>
        <ActivityIndicator size={size} color={spinColor} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={spinColor} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
