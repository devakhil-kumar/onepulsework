import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {spacing, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from './AppText';

function getPresets(colors) {
  return {
    ACTIVE:      {bg: colors.successLight, text: colors.success},
    APPROVED:    {bg: colors.successLight, text: colors.success},
    COMPLETED:   {bg: colors.successLight, text: colors.success},
    PAID:        {bg: colors.successLight, text: colors.success},
    PUBLISHED:   {bg: colors.successLight, text: colors.success},
    CLOCKED_IN:  {bg: colors.successLight, text: colors.success},

    PENDING:     {bg: colors.warningLight, text: colors.warning},
    DRAFT:       {bg: colors.warningLight, text: colors.warning},
    ON_HOLD:     {bg: colors.warningLight, text: colors.warning},

    IN_PROGRESS: {bg: colors.infoLight, text: colors.info},
    PROCESSING:  {bg: colors.infoLight, text: colors.info},
    TRIAL:       {bg: colors.infoLight, text: colors.info},
    SCHEDULED:   {bg: colors.infoLight, text: colors.info},

    REJECTED:    {bg: colors.errorLight, text: colors.error},
    CANCELLED:   {bg: colors.errorLight, text: colors.error},
    SUSPENDED:   {bg: colors.errorLight, text: colors.error},
    MISSED:      {bg: colors.errorLight, text: colors.error},
    ERROR:       {bg: colors.errorLight, text: colors.error},

    CLOCKED_OUT: {bg: colors.surfaceAlt, text: colors.textSecondary},
    ON_BREAK:    {bg: colors.warningLight, text: colors.warning},

    // Task statuses
    TODO:         {bg: colors.surfaceAlt,             text: colors.textSecondary},
    PAUSED:       {bg: colors.warningLight,            text: colors.warning},
    DONE:         {bg: 'rgba(139,92,246,0.12)',        text: '#8B5CF6'},
    NEEDS_REWORK: {bg: colors.errorLight,              text: colors.error},

    // Role badges
    OWNER:    {bg: colors.primaryLight, text: colors.primary},
    ADMIN:    {bg: colors.primaryLight, text: colors.primary},
    MANAGER:  {bg: colors.infoLight,   text: colors.info},
    EMPLOYEE: {bg: colors.surfaceAlt,  text: colors.textSecondary},
  };
}

const sizeMap = {
  sm: {paddingHorizontal: spacing[2], paddingVertical: 2,  fontSize: 'caption'},
  md: {paddingHorizontal: spacing[3], paddingVertical: 4,  fontSize: 'label'},
};

export default function Badge({status, label, color, bgColor, size = 'md'}) {
  const colors = useColors();
  const presets = useMemo(() => getPresets(colors), [colors]);

  const preset = presets[status] ?? {
    bg: bgColor ?? colors.surfaceAlt,
    text: color ?? colors.textSecondary,
  };
  const s = sizeMap[size];
  const displayLabel = label ?? (status ? status.replace(/_/g, ' ') : '');

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: preset.bg,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
        },
      ]}>
      <AppText variant={s.fontSize} color={preset.text} style={styles.text}>
        {displayLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {borderRadius: radius.full, alignSelf: 'flex-start'},
  text: {textTransform: 'capitalize'},
});
