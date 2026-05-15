import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@components/common';
import {AppText, Card, Avatar, Badge, Spinner} from '@components/ui';
import {
  Clock, Umbrella, Banknote, Calendar,
  Users, Megaphone, CalendarDays, ChevronRight, Building2,
} from 'lucide-react-native';
import {spacing, radius, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatTime, formatDate, formatHours} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectUser, selectEmployeeId, selectCanManage} from '@features/auth/authSlice';
import {useGetMyStatusQuery} from '@features/attendance/attendanceApi';
import {useGetLeaveBalanceQuery, useGetMyLeaveQuery} from '@features/leave/leaveApi';
import {useGetMyShiftsQuery} from '@features/dashboard/dashboardApi';
import {
  useListEmployeesQuery, useListAnnouncementsQuery,
  useListShiftsQuery, useGetOrgInfoQuery,
} from '@features/admin/adminApi';

// ── Shared ─────────────────────────────────────────────────────────────────

function QuickStat({icon: Icon, label, value, color, loading}) {
  const colors = useColors();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, {backgroundColor: color + '18'}]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <AppText style={[styles.statLabel, {color: colors.textSecondary}]}>{label}</AppText>
      {loading ? (
        <Spinner size="small" color={color} />
      ) : (
        <AppText style={[styles.statValue, {color: colors.text}]}>{value ?? '—'}</AppText>
      )}
    </Card>
  );
}

function SectionHeader({title, onPress}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <AppText style={[styles.sectionLabel, {color: colors.textSecondary}]}>{title}</AppText>
      {onPress && (
        <TouchableOpacity onPress={onPress} style={styles.seeAll}>
          <AppText style={[styles.seeAllText, {color: colors.primary}]}>See all</AppText>
          <ChevronRight size={13} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Employee view ──────────────────────────────────────────────────────────

function ShiftRow({shift}) {
  const colors = useColors();
  const start  = shift.startTime ? formatTime(shift.startTime) : '—';
  const end    = shift.endTime   ? formatTime(shift.endTime)   : '—';
  const date   = shift.date      ? formatDate(shift.date)      : '—';
  return (
    <View style={[styles.listRow, {borderBottomColor: colors.border}]}>
      <View style={[styles.shiftDot, {backgroundColor: colors.primary}]} />
      <View style={styles.rowInfo}>
        <AppText style={[styles.rowTitle, {color: colors.text}]}>{start} – {end}</AppText>
        <AppText style={[styles.rowSub, {color: colors.textSecondary}]}>{date}</AppText>
      </View>
      <Badge status={shift.status} size="sm" />
    </View>
  );
}

function EmployeeDashboard({insets}) {
  const colors     = useColors();
  const user       = useAppSelector(selectUser);
  const employeeId = useAppSelector(selectEmployeeId);
  const [refreshing, setRefreshing] = useState(false);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const {data: statusData,  isLoading: statusLoading,  refetch: refetchStatus}   = useGetMyStatusQuery();
  const {data: balances,    isLoading: balancesLoading, refetch: refetchBalances} = useGetLeaveBalanceQuery(employeeId, {skip: !employeeId});
  const {data: shiftsData,  isLoading: shiftsLoading,   refetch: refetchShifts}   = useGetMyShiftsQuery({limit: 5, upcoming: true});

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchStatus(), employeeId ? refetchBalances() : Promise.resolve(), refetchShifts()]);
    setRefreshing(false);
  }

  const session         = statusData?.currentAttendance;
  const hoursToday      = session?.clockInAt
    ? formatHours(Math.floor((Date.now() - new Date(session.clockInAt).getTime()) / 60000))
    : '—';
  const totalLeaveHours = Array.isArray(balances)
    ? balances.reduce((sum, b) => sum + (b.hoursAvailable ?? 0), 0)
    : null;
  const shifts = shiftsData?.items ?? shiftsData ?? [];

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Dashboard" showAvatar />
      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[4]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        <View style={[styles.welcomeCard, {backgroundColor: colors.surface}]}>
          <View style={styles.welcomeLeft}>
            <AppText style={[styles.greetText, {color: colors.textSecondary}]}>{greeting}</AppText>
            <AppText style={[styles.nameText, {color: colors.text}]}>{user?.fullName?.split(' ')[0] ?? 'Welcome'}</AppText>
            <View style={{marginTop: spacing[2]}}>
              <Badge status={user?.role} label={user?.role} size="sm" />
            </View>
          </View>
          <Avatar name={user?.fullName} size="xl" />
        </View>

        <SectionHeader title="QUICK OVERVIEW" />
        <View style={styles.statsGrid}>
          <QuickStat icon={Clock}    label="Hours Today"   value={session?.status === 'CLOCKED_IN' ? hoursToday : '—'}            color={colors.info}    loading={statusLoading} />
          <QuickStat icon={Umbrella} label="Leave Balance"  value={totalLeaveHours !== null ? `${totalLeaveHours}h` : '—'}         color={colors.success} loading={balancesLoading} />
          <QuickStat icon={Calendar} label="Today's Shift"  value={statusData?.todayShift ? 'Assigned' : 'None'}                  color={colors.primary} loading={statusLoading} />
          <QuickStat icon={Banknote} label="Status"         value={session?.status === 'CLOCKED_IN' ? 'Active' : 'Offline'}       color={colors.warning} loading={statusLoading} />
        </View>

        <SectionHeader title="UPCOMING SHIFTS" />
        {shiftsLoading ? <Spinner size="small" /> : shifts.length > 0 ? (
          <Card style={styles.listCard}>
            {shifts.map((s, i) => <ShiftRow key={s.id ?? i} shift={s} />)}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <AppText style={[styles.emptyText, {color: colors.textSecondary}]}>No upcoming shifts</AppText>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

// ── Management view ────────────────────────────────────────────────────────

function LeaveRow({req}) {
  const colors  = useColors();
  const name    = req.employee?.user?.fullName ?? req.employee?.fullName ?? 'Unknown';
  const type    = req.type?.replace(/_/g, ' ') ?? 'Leave';
  const start   = req.startDate ? formatDate(req.startDate) : '—';
  const end     = req.endDate   ? formatDate(req.endDate)   : null;
  const days    = req.days ?? req.totalDays ?? null;
  return (
    <View style={[styles.listRow, {borderBottomColor: colors.border}]}>
      <Avatar name={name} size="xs" />
      <View style={styles.rowInfo}>
        <AppText style={[styles.rowTitle, {color: colors.text}]} numberOfLines={1}>{name}</AppText>
        <AppText style={[styles.rowSub, {color: colors.textSecondary}]}>
          {type} • {start}{end && end !== start ? ` → ${end}` : ''}{days ? ` • ${days}d` : ''}
        </AppText>
      </View>
      <Badge status={req.status} size="sm" />
    </View>
  );
}

function MgmtShiftRow({shift}) {
  const colors  = useColors();
  const empName = shift.employee?.user?.fullName ?? shift.employee?.fullName ?? null;
  const start   = shift.startTime ? formatTime(shift.startTime) : '—';
  const end     = shift.endTime   ? formatTime(shift.endTime)   : '—';
  const date    = shift.date      ? formatDate(shift.date)      : '—';
  return (
    <View style={[styles.listRow, {borderBottomColor: colors.border}]}>
      <View style={[styles.shiftDot, {backgroundColor: colors.primary}]} />
      <View style={styles.rowInfo}>
        {empName ? <AppText style={[styles.rowTitle, {color: colors.text}]} numberOfLines={1}>{empName}</AppText> : null}
        <AppText style={[empName ? styles.rowSub : styles.rowTitle, {color: empName ? colors.textSecondary : colors.text}]}>{start} – {end}</AppText>
        <AppText style={[styles.rowSub, {color: colors.textSecondary}]}>{date}</AppText>
      </View>
      <Badge status={shift.status} size="sm" />
    </View>
  );
}

function AnnouncementRow({item}) {
  const colors = useColors();
  const date   = item.createdAt ? formatDate(item.createdAt) : '';
  return (
    <View style={[styles.listRow, {borderBottomColor: colors.border}]}>
      <View style={[styles.announceIcon, {backgroundColor: colors.primary + '18'}]}>
        <Megaphone size={14} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <AppText style={[styles.rowTitle, {color: colors.text}]} numberOfLines={1}>{item.title ?? 'Announcement'}</AppText>
        <AppText style={[styles.rowSub, {color: colors.textSecondary}]} numberOfLines={1}>{item.content ?? date}</AppText>
      </View>
    </View>
  );
}

function ManagementDashboard({insets}) {
  const colors = useColors();
  const user   = useAppSelector(selectUser);
  const hour   = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const [refreshing, setRefreshing] = useState(false);

  const {data: orgInfo,        refetch: refetchOrg}       = useGetOrgInfoQuery();
  const {data: employeesData,  isLoading: empLoad,   refetch: refetchEmp}    = useListEmployeesQuery({limit: 1});
  const {data: leaveData,      isLoading: leaveLoad, refetch: refetchLeave}  = useGetMyLeaveQuery({status: 'PENDING', limit: 5});
  const {data: shiftsData,     isLoading: shiftsLoad, refetch: refetchShifts} = useListShiftsQuery({upcoming: true, limit: 5});
  const {data: announcements,  isLoading: annLoad,   refetch: refetchAnn}    = useListAnnouncementsQuery({limit: 3});

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchOrg(), refetchEmp(), refetchLeave(), refetchShifts(), refetchAnn()]);
    setRefreshing(false);
  }

  const totalEmployees   = employeesData?.total   ?? (Array.isArray(employeesData) ? employeesData.length : '—');
  const pendingLeaves    = leaveData?.total        ?? (Array.isArray(leaveData) ? leaveData.length : 0);
  const leaveList        = leaveData?.items        ?? (Array.isArray(leaveData) ? leaveData : []);
  const shiftList        = shiftsData?.items       ?? (Array.isArray(shiftsData) ? shiftsData : []);
  const announcementList = announcements?.items    ?? (Array.isArray(announcements) ? announcements : []);
  const orgName          = orgInfo?.name ?? orgInfo?.organisation?.name ?? '';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Dashboard" showAvatar />
      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[4]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        <View style={[styles.mgmtWelcome, {backgroundColor: colors.surface, borderLeftColor: colors.primary}]}>
          <View style={styles.welcomeLeft}>
            <AppText style={[styles.greetText, {color: colors.textSecondary}]}>{greeting}</AppText>
            <AppText style={[styles.nameText, {color: colors.text}]}>{user?.fullName?.split(' ')[0] ?? 'Admin'}</AppText>
            {orgName ? (
              <View style={styles.orgBadgeRow}>
                <Building2 size={12} color={colors.textSecondary} />
                <AppText style={[styles.orgNameText, {color: colors.textSecondary}]}>{orgName}</AppText>
              </View>
            ) : null}
            <View style={{marginTop: spacing[2]}}>
              <Badge status={user?.role} label={user?.role} size="sm" />
            </View>
          </View>
          <Avatar name={user?.fullName} size="xl" />
        </View>

        <SectionHeader title="ORGANISATION OVERVIEW" />
        <View style={styles.statsGrid}>
          <QuickStat icon={Users}        label="Total Employees"  value={totalEmployees}          color={colors.primary} loading={empLoad} />
          <QuickStat icon={Umbrella}     label="Pending Leave"    value={pendingLeaves}           color={colors.warning} loading={leaveLoad} />
          <QuickStat icon={CalendarDays} label="Upcoming Shifts"  value={shiftList.length}        color={colors.info}    loading={shiftsLoad} />
          <QuickStat icon={Megaphone}    label="Announcements"    value={announcementList.length} color={colors.success} loading={annLoad} />
        </View>

        <SectionHeader title="PENDING LEAVE REQUESTS" />
        {leaveLoad ? <Spinner size="small" /> : leaveList.length > 0 ? (
          <Card style={styles.listCard}>
            {leaveList.map((r, i) => <LeaveRow key={r.id ?? i} req={r} />)}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <AppText style={[styles.emptyText, {color: colors.textSecondary}]}>No pending leave requests</AppText>
          </Card>
        )}

        <SectionHeader title="UPCOMING SHIFTS" />
        {shiftsLoad ? <Spinner size="small" /> : shiftList.length > 0 ? (
          <Card style={styles.listCard}>
            {shiftList.map((s, i) => <MgmtShiftRow key={s.id ?? i} shift={s} />)}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <AppText style={[styles.emptyText, {color: colors.textSecondary}]}>No upcoming shifts</AppText>
          </Card>
        )}

        {announcementList.length > 0 && (
          <>
            <SectionHeader title="LATEST ANNOUNCEMENTS" />
            <Card style={styles.listCard}>
              {announcementList.map((a, i) => <AnnouncementRow key={a.id ?? i} item={a} />)}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets    = useSafeAreaInsets();
  const canManage = useAppSelector(selectCanManage);
  return canManage
    ? <ManagementDashboard insets={insets} />
    : <EmployeeDashboard   insets={insets} />;
}

// ── Styles (layout only — colors applied inline) ───────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: spacing[4]},

  welcomeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, padding: spacing[5], marginBottom: spacing[5],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  mgmtWelcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, padding: spacing[5], marginBottom: spacing[5],
    borderLeftWidth: 4,
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  welcomeLeft: {flex: 1},
  greetText:   {fontSize: fontSize.sm},
  nameText:    {fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2},
  orgBadgeRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  orgNameText: {fontSize: fontSize.xs},

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing[3], marginTop: spacing[4],
  },
  sectionLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.6, textTransform: 'uppercase'},
  seeAll:       {flexDirection: 'row', alignItems: 'center', gap: 2},
  seeAllText:   {fontSize: fontSize.xs, fontWeight: fontWeight.medium},

  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3]},
  statCard:  {width: '47%', gap: spacing[1], padding: spacing[4]},
  statIcon:  {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2]},
  statLabel: {fontSize: fontSize.xs},
  statValue: {fontSize: fontSize.xl, fontWeight: fontWeight.bold},

  listCard:  {padding: spacing[2]},
  emptyCard: {padding: spacing[5], alignItems: 'center'},
  emptyText: {fontSize: fontSize.sm, textAlign: 'center'},

  listRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing[3], gap: spacing[3], borderBottomWidth: 1,
  },
  rowInfo:      {flex: 1, minWidth: 0, gap: 2},
  rowTitle:     {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  rowSub:       {fontSize: fontSize.xs},
  shiftDot:     {width: 8, height: 8, borderRadius: 4},
  announceIcon: {width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
});
