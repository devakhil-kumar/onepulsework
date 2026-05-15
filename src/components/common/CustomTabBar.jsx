import React, {useRef, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Home, Clock, Umbrella, Bell} from 'lucide-react-native';
import {fontWeight, spacing} from '@theme';
import {useColors} from '@app/ThemeContext';

// Static metadata for each possible tab — drives icon + label
const TAB_META = {
  Dashboard:     {label: 'Home',       Icon: Home},
  Attendance:    {label: 'Attendance',  Icon: Clock},
  Leave:         {label: 'Leave',       Icon: Umbrella},
  Notifications: {label: 'Alerts',      Icon: Bell},
};
const MAX_TABS = Object.keys(TAB_META).length;

const IS_IOS = Platform.OS === 'ios';
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const H_MARGIN  = IS_IOS ? 14 : 0;
const CARD_W    = SCREEN_WIDTH - H_MARGIN * 2;
const PILL_W    = 90;
const PILL_H    = 56;
const CARD_H    = 62;
const ICON_SIZE = 22;

export default function CustomTabBar({state, navigation, unreadCount = 0}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Derive actual tabs from navigator state (only registered/rendered screens)
  const tabs  = state.routes.map(r => ({name: r.name, ...TAB_META[r.name]}));
  const tabCount = tabs.length;
  const tabW  = CARD_W / tabCount;

  // Always allocate MAX_TABS animated values — hook count must be stable
  const pillX  = useRef(new Animated.Value(0)).current;
  const scales = useRef(Array.from({length: MAX_TABS}, () => new Animated.Value(1))).current;
  const lblOps = useRef(Array.from({length: MAX_TABS}, (_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    const toX = state.index * tabW + (tabW - PILL_W) / 2;
    Animated.spring(pillX, {
      toValue: toX,
      useNativeDriver: true,
      damping: 22,
      stiffness: 320,
      mass: 0.75,
    }).start();

    tabs.forEach((_, i) => {
      Animated.timing(lblOps[i], {
        toValue: i === state.index ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, tabW]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePress(index, routeName) {
    Animated.sequence([
      Animated.spring(scales[index], {toValue: 0.80, useNativeDriver: true, speed: 80}),
      Animated.spring(scales[index], {toValue: 1,    useNativeDriver: true, damping: 14, stiffness: 380}),
    ]).start();

    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <View style={[
      styles.outerWrap,
      {backgroundColor: IS_IOS ? colors.background : colors.surface},
      IS_IOS
        ? {paddingBottom: insets.bottom > 0 ? insets.bottom : spacing[3]}
        : {paddingBottom: insets.bottom},
    ]}>
      <View style={[
        styles.card,
        {backgroundColor: colors.surface},
        !IS_IOS && {borderTopColor: colors.border},
      ]}>
        <Animated.View
          style={[styles.pill, {backgroundColor: colors.primaryLight, transform: [{translateX: pillX}]}]}
          pointerEvents="none"
        />

        {tabs.map((tab, index) => {
          const focused   = state.index === index;
          const iconColor = focused ? colors.primary : colors.textTertiary;
          const showBadge = tab.name === 'Notifications' && unreadCount > 0;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handlePress(index, tab.name)}
              activeOpacity={1}
              style={[styles.tab, {width: tabW}]}>
              <Animated.View style={[styles.tabInner, {transform: [{scale: scales[index]}]}]}>
                <View style={styles.iconWrap}>
                  <tab.Icon
                    size={ICON_SIZE}
                    color={iconColor}
                    strokeWidth={focused ? 2.3 : 1.7}
                  />
                  {showBadge && (
                    <View style={[styles.badge, {borderColor: colors.surface}]} />
                  )}
                </View>
                <Animated.Text
                  style={[styles.label, {opacity: lblOps[index], color: colors.primary}]}
                  numberOfLines={1}>
                  {tab.label}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: H_MARGIN,
    paddingTop: IS_IOS ? spacing[2] : 0,
  },
  card: {
    height: CARD_H,
    borderRadius: IS_IOS ? 22 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...(IS_IOS
      ? {
          shadowColor: '#0D1326',
          shadowOffset: {width: 0, height: 6},
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 16,
        }
      : {
          borderTopWidth: 1,
          elevation: 8,
        }),
  },
  pill: {
    position: 'absolute',
    top: (CARD_H - PILL_H) / 2,
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
  },
  tab: {
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    position: 'relative',
    width: ICON_SIZE + 4,
    height: ICON_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.semiBold,
    lineHeight: 13,
    letterSpacing: 0.2,
  },
});
