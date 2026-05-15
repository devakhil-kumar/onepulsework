import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {spacing, radius} from '@theme';
import {useColors} from '@app/ThemeContext';

export default function Card({children, onPress, style, padding = spacing[4]}) {
  const colors = useColors();
  const cardStyle = [
    styles.card,
    {backgroundColor: colors.surface},
    {padding},
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    shadowColor: '#1A1A2E',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
});
