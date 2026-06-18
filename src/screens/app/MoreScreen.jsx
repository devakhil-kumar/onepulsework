import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {ScreenWrapper} from '@components/common';
import {AppText, Avatar, Card, Divider} from '@components/ui';
import {
  Bell,
  Briefcase,
  ClipboardList,
  Megaphone,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import {spacing, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {logout, selectUser} from '@features/auth/authSlice';
import {authApi} from '@api';
import {getStackNav} from '@navigation/stackNav';

const menuItems = [
  {icon: Bell,          label: 'Notifications',        screen: 'Notifications'},
  {icon: Settings,      label: 'Notification Settings', screen: 'NotificationPreferences'},
  {icon: Briefcase,     label: 'Jobs',                  screen: 'Jobs'},
  {icon: ClipboardList, label: 'Tasks',                 screen: 'Tasks'},
  {icon: Megaphone,     label: 'Announcements',         screen: 'Announcements'},
  {icon: Calendar,      label: 'Events',                screen: 'Events'},
  {icon: CalendarDays,  label: 'Public Holidays',       screen: 'Holidays'},
  {icon: Settings,      label: 'Settings',              screen: 'Settings'},
];

export default function MoreScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const colors = useColors();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (_) {}
    dispatch(logout());
  }

  return (
    <ScreenWrapper bg={colors.background} scrollable>
      {/* Profile section */}
      <View style={[styles.header, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <AppText variant="h3">More</AppText>
      </View>

      <View style={styles.profileSection}>
        <Avatar name={user?.fullName} size="lg" />
        <View style={styles.profileInfo}>
          <AppText variant="h4">{user?.fullName}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {user?.email}
          </AppText>
          <AppText variant="caption" color={colors.primary} style={styles.role}>
            {user?.role}
          </AppText>
        </View>
      </View>

      <View style={styles.menu}>
        <Card style={styles.menuCard} padding={0}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.7}
                  onPress={() => item.screen && getStackNav()?.navigate(item.screen)}>
                  <View style={[styles.menuIconWrap, {backgroundColor: colors.primaryLight}]}>
                    <Icon size={18} color={colors.primary} />
                  </View>
                  <AppText variant="bodyMedium" style={styles.menuLabel}>
                    {item.label}
                  </AppText>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                {index < menuItems.length - 1 && (
                  <Divider style={styles.itemDivider} />
                )}
              </React.Fragment>
            );
          })}
        </Card>

        <TouchableOpacity style={[styles.logoutBtn, {backgroundColor: colors.errorLight}]} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={18} color={colors.error} />
          <AppText variant="bodyMedium" color={colors.error} style={styles.logoutText}>
            Sign Out
          </AppText>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    gap: spacing[4],
  },
  profileInfo: {gap: 2},
  role: {marginTop: spacing[1]},
  menu: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuLabel: {flex: 1},
  itemDivider: {
    marginVertical: 0,
    marginHorizontal: spacing[4],
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  logoutText: {fontWeight: '600'},
});
