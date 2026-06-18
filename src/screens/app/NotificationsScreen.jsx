import React, {useState} from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Bell, CheckCheck, Clock, LogOut, FileText, Megaphone,
  Calendar, ClipboardList, Trash2,
} from 'lucide-react-native';
import {AppHeader} from '@components/common';
import {AppText, Card, EmptyState, Spinner} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatDateTime} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectRole, selectHasPerm} from '@features/auth/authSlice';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
} from '@features/notifications/notificationsApi';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  CLOCK_IN:          {label: 'Clock In',         Icon: Clock,       color: '#22c55e'},
  CLOCK_OUT:         {label: 'Clock Out',         Icon: LogOut,      color: '#64748b'},
  LEAVE_APPLY:       {label: 'Leave Apply',       Icon: ClipboardList, color: '#f59e0b'},
  LEAVE_STATUS:      {label: 'Leave Status',      Icon: ClipboardList, color: '#7b61ff'},
  SHIFT_CREATED:     {label: 'Shift Created',     Icon: Calendar,    color: '#3b82f6'},
  NEW_EVENT:         {label: 'New Event',         Icon: Calendar,    color: '#ec4899'},
  ANNOUNCEMENT:      {label: 'Announcement',      Icon: Megaphone,   color: '#f97316'},
  DOCUMENT_ASSIGNED: {label: 'Document Assigned', Icon: FileText,    color: '#14b8a6'},
};

// Each tab declares which permission gates it (null = everyone)
const TAB_DEFINITIONS = [
  {key: null,                label: 'All',          permission: null},
  {key: 'CLOCK_IN',         label: 'Clock In',     permission: 'notifications.clock'},
  {key: 'CLOCK_OUT',        label: 'Clock Out',    permission: 'notifications.clock'},
  {key: 'LEAVE_APPLY',      label: 'Leave',        permission: 'notifications.leave_apply'},
  {key: 'LEAVE_STATUS',     label: 'Leave Status', permission: null},
  {key: 'SHIFT_CREATED',    label: 'Shifts',       permission: null},
  {key: 'NEW_EVENT',        label: 'Events',       permission: null},
  {key: 'ANNOUNCEMENT',     label: 'Announcements',permission: null},
  {key: 'DOCUMENT_ASSIGNED',label: 'Documents',    permission: null},
];

// ── Notification card ─────────────────────────────────────────────────────────
function NotifCard({item, onPress, onDelete}) {
  const colors = useColors();
  const cfg = TYPE_CONFIG[item.type] ?? {};
  const Icon = cfg.Icon ?? Bell;
  const color = cfg.color ?? colors.primary;
  const isRead = Boolean(item.readAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={[
        styles.notifCard,
        !isRead && {borderLeftWidth: 3, borderLeftColor: color},
      ]}>
        {/* Icon */}
        <View style={[styles.notifIcon, {backgroundColor: color + '20'}]}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </View>

        {/* Content */}
        <View style={styles.notifBody}>
          <View style={styles.notifTitleRow}>
            {!isRead && (
              <View style={[styles.unreadDot, {backgroundColor: color}]} />
            )}
            <AppText
              style={[
                styles.notifTitle,
                {color: isRead ? colors.textSecondary : colors.text},
                !isRead && {fontWeight: fontWeight.semiBold},
              ]}
              numberOfLines={1}>
              {item.title}
            </AppText>
          </View>

          {/* Type badge */}
          {cfg.label && (
            <View style={[styles.typeBadge, {backgroundColor: color + '18'}]}>
              <AppText style={[styles.typeBadgeText, {color}]}>{cfg.label}</AppText>
            </View>
          )}

          {item.body ? (
            <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
              {item.body}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textTertiary}>
            {formatDateTime(item.createdAt)}
          </AppText>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.deleteBtn}>
          <Trash2 size={16} color={colors.textTertiary} strokeWidth={1.8} />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

// ── Filter tab ────────────────────────────────────────────────────────────────
function FilterTab({label, active, onPress, colors}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tab,
        active
          ? {backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: {width: 0, height: 2}, elevation: 4}
          : {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1},
      ]}>
      <AppText
        style={[
          styles.tabText,
          {color: active ? '#fff' : colors.textSecondary, fontWeight: active ? fontWeight.semiBold : fontWeight.regular},
        ]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({navigation, route}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const role = useAppSelector(selectRole);
  const isFullAccess = role === 'OWNER' || role === 'ADMIN';
  const hasClockPerm = useAppSelector(selectHasPerm('notifications.clock'));
  const hasLeavePerm = useAppSelector(selectHasPerm('notifications.leave_apply'));

  // Build visible tabs
  const visibleTabs = TAB_DEFINITIONS.filter(({key, permission}) => {
    if (key === null || permission === null) return true;
    if (isFullAccess) return true;
    if (permission === 'notifications.clock') return hasClockPerm;
    if (permission === 'notifications.leave_apply') return hasLeavePerm;
    return false;
  });

  const [activeType, setActiveType] = useState(null);
  const safeType = visibleTabs.some(t => t.key === activeType) ? activeType : null;

  const {data, isLoading, refetch} = useGetNotificationsQuery(
    safeType ? {pageSize: 50, type: safeType} : {pageSize: 50},
    {pollingInterval: 120000},
  );
  const [markRead]    = useMarkReadMutation();
  const [markAllRead, {isLoading: markingAll}] = useMarkAllReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

  const items = data?.items ?? data ?? [];
  const unreadCount = data?.meta?.unread ?? items.filter(n => !n.readAt).length;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Notifications"
        unreadCount={unreadCount}
        showBack={route?.params?.fromHeader ?? false}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => markAllRead()}
              disabled={markingAll}
              style={styles.markAllBtn}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              {markingAll
                ? <ActivityIndicator size={18} color={colors.primary} />
                : <CheckCheck size={20} color={colors.primary} strokeWidth={1.8} />
              }
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Filter tabs — horizontal scroll, partial chip visible on right hints scrollability */}
      <View style={[styles.tabsWrapper, {backgroundColor: colors.background, borderBottomColor: colors.border}]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          decelerationRate="fast"
          snapToAlignment="start">
          {visibleTabs.map(({key, label}) => (
            <FilterTab
              key={String(key)}
              label={label}
              active={safeType === key}
              onPress={() => setActiveType(key)}
              colors={colors}
            />
          ))}
          {/* Extra breathing room so last chip doesn't touch the edge */}
          <View style={{width: 8}} />
        </ScrollView>
        {/* Right-side fade overlay to signal more content */}
        <View
          pointerEvents="none"
          style={[styles.tabsFade, {backgroundColor: colors.background}]}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Bell size={44} color={colors.primary} />}
            title="All caught up"
            description="No notifications right now."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({item}) => (
            <NotifCard
              item={item}
              onPress={() => !item.readAt && markRead(item.id)}
              onDelete={() => deleteNotif(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[2]}} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1},
  center:        {flex: 1, alignItems: 'center', justifyContent: 'center'},

  // Tab strip
  tabsWrapper: {
    borderBottomWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tabsContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing[4],
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  tabText:  {fontSize: fontSize.xs},
  // Fade on the right edge — transparent-to-background colour
  tabsFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    opacity: 0.85,
  },

  list:          {padding: spacing[4]},
  notifCard:      {flexDirection: 'row', alignItems: 'flex-start', padding: spacing[3], gap: spacing[3]},
  notifIcon:      {width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  notifBody:      {flex: 1, gap: 3},
  notifTitleRow:  {flexDirection: 'row', alignItems: 'center', gap: 6},
  notifTitle:     {fontSize: fontSize.sm, flex: 1},
  unreadDot:      {width: 7, height: 7, borderRadius: 4, flexShrink: 0},
  typeBadge:      {alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginBottom: 2},
  typeBadgeText:  {fontSize: 10, fontWeight: fontWeight.semiBold},
  deleteBtn:      {padding: spacing[1], flexShrink: 0, marginTop: 2},
  markAllBtn:     {width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10},
});
