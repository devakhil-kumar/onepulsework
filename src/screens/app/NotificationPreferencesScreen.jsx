import React from 'react';
import {View, StyleSheet, ScrollView, Switch, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Clock, LogOut, ClipboardList, Calendar, Megaphone, FileText, Bell,
} from 'lucide-react-native';
import {AppHeader} from '@components/common';
import {AppText, Card, Spinner} from '@components/ui';
import {spacing, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectRole, selectHasPerm} from '@features/auth/authSlice';
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@features/notifications/notificationsApi';
import {usePushToggle} from '@hooks/usePushNotification';

// All preference items — each tagged with permission required (null = everyone)
const ALL_ITEMS = [
  {
    type: 'CLOCK_IN',
    label: 'Clock In Alerts',
    desc: 'When an employee clocks in',
    Icon: Clock,
    color: '#22c55e',
    group: 'Attendance',
    permission: 'notifications.clock',
  },
  {
    type: 'CLOCK_OUT',
    label: 'Clock Out Alerts',
    desc: 'When an employee clocks out',
    Icon: LogOut,
    color: '#64748b',
    group: 'Attendance',
    permission: 'notifications.clock',
  },
  {
    type: 'LEAVE_APPLY',
    label: 'Leave Requests',
    desc: 'When an employee submits a leave request',
    Icon: ClipboardList,
    color: '#f59e0b',
    group: 'Leave',
    permission: 'notifications.leave_apply',
  },
  {
    type: 'LEAVE_STATUS',
    label: 'Leave Decisions',
    desc: 'When your leave is approved or rejected',
    Icon: ClipboardList,
    color: '#7b61ff',
    group: 'Leave',
    permission: null,
  },
  {
    type: 'SHIFT_CREATED',
    label: 'New Shifts',
    desc: 'When a shift is assigned to you',
    Icon: Calendar,
    color: '#3b82f6',
    group: 'Shifts',
    permission: null,
  },
  {
    type: 'ANNOUNCEMENT',
    label: 'Announcements',
    desc: 'When a new announcement is posted',
    Icon: Megaphone,
    color: '#f97316',
    group: 'Organisation',
    permission: null,
  },
  {
    type: 'NEW_EVENT',
    label: 'Events',
    desc: 'When a new event is created',
    Icon: Calendar,
    color: '#ec4899',
    group: 'Organisation',
    permission: null,
  },
  {
    type: 'DOCUMENT_ASSIGNED',
    label: 'Documents Shared',
    desc: 'When a document is shared with you',
    Icon: FileText,
    color: '#14b8a6',
    group: 'Organisation',
    permission: null,
  },
];

function SectionHeader({title}) {
  const colors = useColors();
  return (
    <AppText style={[styles.sectionHeader, {color: colors.textTertiary}]}>
      {title.toUpperCase()}
    </AppText>
  );
}

function PrefRow({item, enabled, onToggle}) {
  const colors = useColors();
  const {Icon, color, label, desc} = item;
  return (
    <View style={[styles.row, {borderBottomColor: colors.border}]}>
      <View style={[styles.rowIcon, {backgroundColor: color + '20'}]}>
        <Icon size={18} color={color} strokeWidth={1.8} />
      </View>
      <View style={styles.rowBody}>
        <AppText style={[styles.rowLabel, {color: colors.text}]}>{label}</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>{desc}</AppText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{false: colors.border, true: color}}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationPreferencesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const role = useAppSelector(selectRole);
  const isFullAccess = role === 'OWNER' || role === 'ADMIN';
  const hasClockPerm = useAppSelector(selectHasPerm('notifications.clock'));
  const hasLeavePerm = useAppSelector(selectHasPerm('notifications.leave_apply'));

  const {data: prefs, isLoading} = useGetNotificationPreferencesQuery();
  const [update] = useUpdateNotificationPreferencesMutation();
  const {pushEnabled, toggle: togglePush} = usePushToggle();

  const handlePushToggle = async (val) => {
    try {
      await togglePush(val);
    } catch {
      Alert.alert('Error', 'Failed to update push preference.');
    }
  };

  // Filter items by role/permissions
  const visibleItems = ALL_ITEMS.filter(({permission}) => {
    if (permission === null) return true;
    if (isFullAccess) return true;
    if (permission === 'notifications.clock') return hasClockPerm;
    if (permission === 'notifications.leave_apply') return hasLeavePerm;
    return false;
  });

  // Group by section
  const grouped = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleToggle = async (type, enabled) => {
    try {
      await update({[type]: enabled}).unwrap();
    } catch {
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    }
  };

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Notification Settings" showBack />

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}>

          {/* ── Push master toggle ──────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionHeader title="Push Notifications" />
            <Card style={styles.card}>
              <View style={[styles.row, {borderBottomWidth: 0}]}>
                <View style={[styles.rowIcon, {backgroundColor: '#6366f120'}]}>
                  <Bell size={18} color="#6366f1" strokeWidth={1.8} />
                </View>
                <View style={styles.rowBody}>
                  <AppText style={[styles.rowLabel, {color: colors.text}]}>
                    Push Notifications
                  </AppText>
                  <AppText variant="bodySmall" color={colors.textSecondary}>
                    {pushEnabled
                      ? 'This device will receive push notifications'
                      : 'Disabled — in-app notifications still work'}
                  </AppText>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={handlePushToggle}
                  trackColor={{false: colors.border, true: '#6366f1'}}
                  thumbColor="#fff"
                />
              </View>
            </Card>
          </View>

          {Object.entries(grouped).map(([group, items]) => (
            <View key={group} style={styles.section}>
              <SectionHeader title={group} />
              <Card style={styles.card}>
                {items.map((item, idx) => (
                  <PrefRow
                    key={item.type}
                    item={item}
                    enabled={prefs?.[item.type] !== false}
                    onToggle={val => handleToggle(item.type, val)}
                  />
                ))}
              </Card>
            </View>
          ))}

          {visibleItems.length === 0 && (
            <View style={styles.center}>
              <Bell size={44} color={colors.textTertiary} />
              <AppText variant="bodySmall" color={colors.textTertiary} style={{marginTop: spacing[3]}}>
                No notification settings available for your role.
              </AppText>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1},
  center:        {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6]},
  content:       {padding: spacing[4]},
  section:       {marginBottom: spacing[4]},
  sectionHeader: {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, letterSpacing: 0.8, marginBottom: spacing[2], marginLeft: spacing[1]},
  card:          {padding: 0, overflow: 'hidden'},
  row:           {flexDirection: 'row', alignItems: 'center', padding: spacing[4], gap: spacing[3], borderBottomWidth: 1},
  rowIcon:       {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  rowBody:       {flex: 1, gap: 2},
  rowLabel:      {fontSize: fontSize.sm, fontWeight: fontWeight.medium},
});
