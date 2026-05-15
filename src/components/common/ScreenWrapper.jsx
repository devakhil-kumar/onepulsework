import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '@theme';

export default function ScreenWrapper({
  children,
  scrollable = false,
  keyboard = false,
  bg = colors.background,
  edges = ['bottom'],
  contentContainerStyle,
  style,
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;

  const inner = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[{paddingBottom}, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, {paddingBottom}, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.flex, {backgroundColor: bg, paddingTop}, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
});
