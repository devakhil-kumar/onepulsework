import React from 'react';
import {View, StyleSheet} from 'react-native';
import {spacing} from '@theme';
import AppText from './AppText';
import Button from './Button';

export default function EmptyState({icon, title, description, actionLabel, onAction}) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      {description && (
        <AppText variant="body" style={styles.description}>
          {description}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  iconWrap: {
    marginBottom: spacing[4],
    opacity: 0.5,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  action: {
    marginTop: spacing[2],
  },
});
