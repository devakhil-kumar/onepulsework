import React from 'react';
import {View, StyleSheet} from 'react-native';
import {colors, spacing} from '@theme';
import AppText from './AppText';

export default function Divider({label, style}) {
  if (label) {
    return (
      <View style={[styles.row, style]}>
        <View style={styles.line} />
        <AppText variant="caption" color={colors.textTertiary} style={styles.labelText}>
          {label}
        </AppText>
        <View style={styles.line} />
      </View>
    );
  }
  return <View style={[styles.simple, style]} />;
}

const styles = StyleSheet.create({
  simple: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  labelText: {
    marginHorizontal: spacing[3],
  },
});
