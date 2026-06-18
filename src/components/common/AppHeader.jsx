import React from 'react';
import {View, TouchableOpacity, StyleSheet, StatusBar, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Menu, Bell, ArrowLeft} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from '@components/ui/AppText';
import Avatar from '@components/ui/Avatar';
import {useDrawer} from '@app/DrawerContext';
import {useAppSelector} from '@app/hooks';
import {selectUser} from '@features/auth/authSlice';
import {getStackNav} from '@navigation/stackNav';
import logo2 from '@assets/OnePulseWork_logo_2.png';

export default function AppHeader({title, showAvatar = false, unreadCount = 0, rightAction, showBack = false}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {toggle} = useDrawer();
  const user = useAppSelector(selectUser);

  return (
    <>
      <StatusBar
        barStyle={colors.text === '#E8EAF2' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
        translucent
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
          },
        ]}>
        <View style={styles.inner}>
          <TouchableOpacity
            onPress={showBack ? () => getStackNav()?.goBack() : toggle}
            style={styles.iconBtn}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {showBack
              ? <ArrowLeft size={22} color={colors.text} strokeWidth={1.8} />
              : <Menu size={22} color={colors.text} strokeWidth={1.8} />
            }
          </TouchableOpacity>

          <AppText style={[styles.title, {color: colors.text}]} numberOfLines={1}>
            {title}
          </AppText>

          <View style={styles.rightActions}>
            {rightAction}
           
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => getStackNav()?.navigate('Notifications', {fromHeader: true})}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Bell size={20} color={colors.textSecondary} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.notifDot,
                    {backgroundColor: colors.error, borderColor: colors.surface},
                  ]}
                />
              )}
            </TouchableOpacity>
            <Image
              source={logo2}
              style={styles.orgLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    shadowColor: '#0D1326',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  iconBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, position: 'relative',
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
  rightActions: {flexDirection: 'row', alignItems: 'center', gap: spacing[1]},
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 4, borderWidth: 1,
  },
  avatar: {marginLeft: spacing[1]},
  orgLogo: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    // borderWidth: 1,
  },
});
