import React from 'react';
import {View, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@components/common';
import {AppText, Card, EmptyState, Spinner} from '@components/ui';
import {Bell, CheckCheck, Info, AlertTriangle, Award} from 'lucide-react-native';
import {spacing, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatDateTime} from '@utils/format';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@features/notifications/notificationsApi';

const TYPE_ICON = {INFO: Info, WARNING: AlertTriangle, SUCCESS: Award};

function NotifCard({item, onPress}) {
  const colors = useColors();
  const Icon      = TYPE_ICON[item.type] ?? Bell;
  const iconColor = item.isRead ? colors.textTertiary : colors.primary;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={[
        styles.notifCard,
        !item.isRead && {borderLeftWidth: 3, borderLeftColor: colors.primary},
      ]}>
        <View style={[styles.notifIcon, {backgroundColor: iconColor + '18'}]}>
          <Icon size={18} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={styles.notifBody}>
          <AppText
            style={[
              styles.notifTitle,
              {color: item.isRead ? colors.textSecondary : colors.text},
              !item.isRead && {fontWeight: fontWeight.semiBold},
            ]}
            numberOfLines={1}>
            {item.title}
          </AppText>
          {item.message ? (
            <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
              {item.message}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textTertiary}>
            {formatDateTime(item.createdAt)}
          </AppText>
        </View>
        {!item.isRead && (
          <View style={[styles.unreadDot, {backgroundColor: colors.primary}]} />
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({route}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fromHeader = route?.params?.fromHeader ?? false;

  const {data, isLoading, refetch} = useGetNotificationsQuery({}, {pollingInterval: 120000});
  const [markRead]     = useMarkReadMutation();
  const [markAllRead, {isLoading: markingAll}] = useMarkAllReadMutation();

  const notifications = data?.items ?? data ?? [];
  const unreadCount   = notifications.filter(n => !n.isRead).length;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Notifications" unreadCount={unreadCount} showBack={fromHeader} />

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Bell size={44} color={colors.primary} />}
            title="All caught up"
            description="No notifications right now."
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListHeaderComponent={
            unreadCount > 0 ? (
              <TouchableOpacity style={styles.markAllBtn} onPress={() => markAllRead()} disabled={markingAll}>
                <CheckCheck size={16} color={colors.primary} />
                <AppText style={[styles.markAllText, {color: colors.primary}]}>
                  {markingAll ? 'Marking...' : 'Mark all as read'}
                </AppText>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({item}) => (
            <NotifCard item={item} onPress={() => !item.isRead && markRead(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[2]}} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {padding: spacing[4]},
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    alignSelf: 'flex-end', paddingVertical: spacing[2], marginBottom: spacing[2],
  },
  markAllText: {fontSize: fontSize.sm, fontWeight: fontWeight.medium},
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: spacing[4], gap: spacing[3],
  },
  notifIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifBody: {flex: 1, gap: 4},
  notifTitle: {fontSize: fontSize.sm},
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    marginTop: spacing[1], flexShrink: 0,
  },
});
