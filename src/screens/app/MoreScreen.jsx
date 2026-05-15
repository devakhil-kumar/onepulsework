import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {ScreenWrapper} from '@components/common';
import {AppText, Avatar, Card, Divider} from '@components/ui';
import {
  Bell,
  Briefcase,
  ClipboardList,
  Megaphone,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import {colors, spacing, radius} from '@theme';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {logout, selectUser} from '@features/auth/authSlice';
import {authApi} from '@api';

const menuItems = [
  {icon: Bell, label: 'Notifications', screen: 'Notifications'},
  {icon: Briefcase, label: 'Jobs', screen: 'Jobs'},
  {icon: ClipboardList, label: 'Tasks', screen: 'Tasks'},
  {icon: Megaphone, label: 'Announcements', screen: 'Announcements'},
  {icon: Calendar, label: 'Events', screen: 'Events'},
  {icon: Settings, label: 'Settings', screen: 'Settings'},
];

export default function MoreScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (_) {}
    dispatch(logout());
  }

  return (
    <ScreenWrapper bg={colors.background} scrollable>
      {/* Profile section */}
      <View style={styles.header}>
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
                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                  <View style={styles.menuIconWrap}>
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.primaryLight,
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
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    gap: spacing[2],
  },
  logoutText: {fontWeight: '600'},
});
