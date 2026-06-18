import React, {useEffect, useRef, useState} from 'react';
import {
  Animated, DeviceEventEmitter, StyleSheet,
  TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell} from 'lucide-react-native';
import {useColors} from '@app/ThemeContext';
import AppText from '@components/ui/AppText';
import {FCM_FOREGROUND_EVENT} from '../../services/pushNotification';
import {getStackNav} from '@navigation/stackNav';
import {spacing, fontSize, fontWeight, radius} from '@theme';

const BANNER_HEIGHT = 72;
const SHOW_DURATION = 4000;

export default function InAppNotificationBanner() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const slideY  = useRef(new Animated.Value(-(BANNER_HEIGHT + 20))).current;
  const timerRef = useRef(null);

  const [msg, setMsg] = useState(null);

  function show(data) {
    setMsg(data);
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.spring(slideY, {
      toValue: insets.top + spacing[2],
      useNativeDriver: true,
      damping: 14,
      stiffness: 140,
    }).start();

    timerRef.current = setTimeout(hide, SHOW_DURATION);
  }

  function hide() {
    Animated.timing(slideY, {
      toValue: -(BANNER_HEIGHT + 20),
      duration: 260,
      useNativeDriver: true,
    }).start(() => setMsg(null));
  }

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FCM_FOREGROUND_EVENT, show);
    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [insets.top]);

  if (!msg) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.text,
          transform: [{translateY: slideY}],
        },
      ]}>
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.85}
        onPress={() => {
          hide();
          getStackNav()?.navigate('Notifications');
        }}>
        <View style={[styles.iconWrap, {backgroundColor: colors.primary + '1A'}]}>
          <Bell size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.textWrap}>
          <AppText style={[styles.title, {color: colors.text}]} numberOfLines={1}>
            {msg.title}
          </AppText>
          {msg.body ? (
            <AppText style={[styles.body, {color: colors.textSecondary}]} numberOfLines={1}>
              {msg.body}
            </AppText>
          ) : null}
        </View>
        <TouchableOpacity onPress={hide} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <AppText style={[styles.dismiss, {color: colors.textSecondary}]}>✕</AppText>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    height: BANNER_HEIGHT,
    zIndex: 9999,
    elevation: 20,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {flex: 1, minWidth: 0, gap: 2},
  title:   {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  body:    {fontSize: fontSize.xs},
  dismiss: {fontSize: 14, paddingLeft: spacing[2]},
});
