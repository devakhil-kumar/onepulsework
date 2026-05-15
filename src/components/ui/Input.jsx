import React, {useState} from 'react';
import {View, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {Eye, EyeOff} from 'lucide-react-native';
import {spacing, radius, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from './AppText';

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helper,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  iconLeft,
  iconRight,
  keyboardType,
  autoCapitalize = 'none',
  style,
  inputStyle,
  ...rest
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus
    : colors.border;

  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <AppText variant="label" style={[styles.label, {color: colors.text}]}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.container,
          {borderColor, backgroundColor: editable ? colors.surface : colors.surfaceAlt},
          multiline && {height: undefined, paddingVertical: spacing[3]},
        ]}>
        {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, {color: colors.text}, inputStyle]}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            style={styles.iconRight}>
            {showPassword ? (
              <EyeOff size={18} color={colors.textTertiary} />
            ) : (
              <Eye size={18} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        ) : iconRight ? (
          <View style={styles.iconRight}>{iconRight}</View>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {marginBottom: spacing[4]},
  label: {marginBottom: spacing[1]},
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    padding: 0,
    fontWeight: fontWeight.regular,
  },
  iconLeft: {marginRight: spacing[2]},
  iconRight: {marginLeft: spacing[2]},
  helper: {marginTop: spacing[1]},
});
