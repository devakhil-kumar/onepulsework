import React from 'react';
import {TouchableOpacity, ActivityIndicator, StyleSheet, View} from 'react-native';
import {spacing, radius, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from './AppText';

const sizeStyles = {
  sm: {height: 40, paddingHorizontal: spacing[4], fontSize: fontSize.sm},
  md: {height: 52, paddingHorizontal: spacing[6], fontSize: fontSize.base},
  lg: {height: 60, paddingHorizontal: spacing[8], fontSize: fontSize.md},
};

function getVariant(variant, colors) {
  switch (variant) {
    case 'primary':   return {bg: colors.primary,      text: colors.white,         border: colors.primary};
    case 'secondary': return {bg: colors.surfaceAlt,   text: colors.text,          border: colors.surfaceAlt};
    case 'outline':   return {bg: colors.transparent,  text: colors.primary,       border: colors.primary};
    case 'ghost':     return {bg: colors.transparent,  text: colors.primary,       border: colors.transparent};
    case 'danger':    return {bg: colors.error,        text: colors.white,         border: colors.error};
    default:          return {bg: colors.primary,      text: colors.white,         border: colors.primary};
  }
}

export default function Button({
  variant = 'primary',
  size = 'md',
  label,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  style,
}) {
  const colors = useColors();
  const v = getVariant(variant, colors);
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        variant === 'primary' && {
          shadowColor: colors.primary,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.row}>
          {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
          <AppText
            style={{
              fontSize: s.fontSize,
              fontWeight: fontWeight.semiBold,
              color: v.text,
            }}>
            {label}
          </AppText>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  iconLeft: {marginRight: spacing[2]},
  iconRight: {marginLeft: spacing[2]},
});
