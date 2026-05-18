import React, {useState, useMemo} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Clock, Coffee, ClipboardList, ChevronDown, ChevronRight} from 'lucide-react-native';
import dayjs from 'dayjs';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin} from '@features/auth/authSlice';
import {AppText, Card, Spinner, Avatar, Badge} from '@components/ui';
import {AppHeader} from '@components/common';
import {useGetAttendanceListQuery} from '@features/attendance/attendanceApi';
import {useListTasksQuery} from '@features/task/taskApi';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {formatTime, formatHours} from '@utils/format';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMins(mins) {
  if (!mins && mins !== 0) return '—';
  return formatHours(mins);
}

function netMinutes(att) {
  if (!att.clockOutAt) return null;
  const total = Math.round((new Date(att.clockOutAt) - new Date(att.clockInAt)) / 60000);
  return Math.max(0, total - (att.breakMinutes ?? 0));
}

function workDateKey(att) {
  const d = att.workDate ?? att.clockInAt;
  return dayjs(d).format('YYYY-MM-DD');
}

function dateLabel(key) {
  const d = dayjs(key);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('dddd, D MMMM YYYY');
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  {value: 7,  label: '7 days'},
  {value: 14, label: '14 days'},
  {value: 30, label: '30 days'},
  {value: 60, label: '60 days'},
];

const STATUS_INFO = {
  CLOCKED_IN:  {color: '#10B981', label: 'Active'},
  ON_BREAK:    {color: '#F59E0B', label: 'On Break'},
  CLOCKED_OUT: {color: '#6B7280', label: 'Clocked Out'},
  MISSED:      {color: '#EF4444', label: 'Missed'},
  ADJUSTED:    {color: '#7B61FF', label: 'Adjusted'},
};

const TASK_STATUS_COLOR = {
  TODO:         '#6B7280',
  IN_PROGRESS:  '#3B82F6',
  PAUSED:       '#F59E0B',
  DONE:         '#8B5CF6',
  NEEDS_REWORK: '#EF4444',
  COMPLETED:    '#10B981',
  CANCELLED:    '#9CA3AF',
};

const TASK_STATUS_LABEL = {
  TODO:         'To Do',
  IN_PROGRESS:  'In Progress',
  PAUSED:       'Paused',
  DONE:         'Pending Review',
  NEEDS_REWORK: 'Needs Rework',
  COMPLETED:    'Completed',
  CANCELLED:    'Cancelled',
};

// ── Attendance Row ────────────────────────────────────────────────────────────

function AttRow({att, showEmployee}) {
  const colors = useColors();
  const [breaksOpen, setBreaksOpen] = useState(false);

  const completedBreaks = (att.breaks ?? []).filter(b => b.endAt);
  const net = netMinutes(att);
  const empName = att.employee
    ? `${att.employee.firstName} ${att.employee.lastName}`
    : '—';
  const statusInfo = STATUS_INFO[att.status] ?? STATUS_INFO.CLOCKED_OUT;

  return (
    <View style={[styles.attRow, {borderBottomColor: colors.border}]}>
      {showEmployee && (
        <View style={styles.attEmpRow}>
          <Avatar name={empName} size="xs" />
          <AppText variant="bodySmall" style={{fontWeight: fontWeight.semiBold, color: colors.text}}>
            {empName}
          </AppText>
        </View>
      )}

      {/* Times row */}
      <View style={styles.attTimesRow}>
        <View style={styles.attCell}>
          <AppText variant="caption" color={colors.textSecondary}>IN</AppText>
          <AppText style={[styles.attCellValue, {color: colors.text}]}>
            {formatTime(att.clockInAt)}
          </AppText>
        </View>

        <View style={styles.attCell}>
          <AppText variant="caption" color={colors.textSecondary}>OUT</AppText>
          <AppText style={[styles.attCellValue, {color: att.clockOutAt ? colors.text : '#10B981'}]}>
            {att.clockOutAt ? formatTime(att.clockOutAt) : 'Active'}
          </AppText>
        </View>

        <View style={styles.attCell}>
          <AppText variant="caption" color={colors.textSecondary}>NET</AppText>
          <AppText style={[styles.attCellValue, {fontWeight: fontWeight.bold, color: colors.text}]}>
            {net !== null ? fmtMins(net) : '—'}
          </AppText>
        </View>

        {/* Break — tappable if has completed breaks */}
        {att.breakMinutes > 0 ? (
          <TouchableOpacity style={styles.attCell} onPress={() => setBreaksOpen(v => !v)}>
            <AppText variant="caption" color={colors.textSecondary}>BREAK</AppText>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
              <AppText style={[styles.attCellValue, {color: colors.primary}]}>
                {fmtMins(att.breakMinutes)}
              </AppText>
              {breaksOpen
                ? <ChevronDown size={12} color={colors.primary} />
                : <ChevronRight size={12} color={colors.primary} />
              }
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.attCell}>
            <AppText variant="caption" color={colors.textSecondary}>BREAK</AppText>
            <AppText style={[styles.attCellValue, {color: colors.textTertiary}]}>—</AppText>
          </View>
        )}

        {/* Status pill */}
        <View style={[styles.attStatusPill, {backgroundColor: statusInfo.color + '20'}]}>
          <AppText style={[styles.attStatusText, {color: statusInfo.color}]}>
            {statusInfo.label}
          </AppText>
        </View>
      </View>

      {/* Expanded breaks */}
      {breaksOpen && completedBreaks.map(b => {
        const mins = Math.round((new Date(b.endAt) - new Date(b.startAt)) / 60000);
        return (
          <View key={b.id} style={[styles.breakDetailRow, {backgroundColor: colors.surfaceAlt, borderTopColor: colors.border}]}>
            <Coffee size={12} color={colors.textSecondary} />
            <AppText variant="caption" color={colors.textSecondary}>
              <AppText style={{fontWeight: fontWeight.semiBold}}>{b.label}</AppText>
              {' · '}{formatTime(b.startAt)} – {formatTime(b.endAt)} · {mins} min
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({task, showEmployee}) {
  const colors = useColors();
  const statusColor = TASK_STATUS_COLOR[task.status] ?? '#6B7280';
  const statusLabel = TASK_STATUS_LABEL[task.status] ?? task.status.replace(/_/g, ' ');
  const empName = task.assignedTo
    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
    : '—';

  return (
    <View style={[styles.taskRow, {borderBottomColor: colors.border}]}>
      <View style={[styles.taskRowStrip, {backgroundColor: statusColor}]} />
      <View style={styles.taskRowBody}>
        <View style={styles.taskRowTop}>
          <AppText
            style={[styles.taskRowTitle, {color: colors.text, flex: 1}]}
            numberOfLines={2}>
            {task.title}
          </AppText>
          <View style={[styles.taskStatusPill, {backgroundColor: statusColor + '20'}]}>
            <AppText style={[styles.taskStatusText, {color: statusColor}]}>{statusLabel}</AppText>
          </View>
        </View>

        <View style={styles.taskRowMeta}>
          {task.project?.name && (
            <AppText variant="caption" color={colors.textSecondary}>📁 {task.project.name}</AppText>
          )}
          {task.totalTrackedMinutes > 0 && (
            <AppText variant="caption" color={colors.textSecondary}>
              ⏱ {fmtMins(task.totalTrackedMinutes)}
            </AppText>
          )}
          {showEmployee && (
            <AppText variant="caption" color={colors.textSecondary}>👤 {empName}</AppText>
          )}
          {task.assignedBy?.fullName && (
            <AppText variant="caption" color={colors.textSecondary}>
              Assigned by {task.assignedBy.fullName}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Date Group ────────────────────────────────────────────────────────────────

function DateGroup({dateKey, attRows, taskRows, showEmployee}) {
  const colors = useColors();
  const [tasksOpen, setTasksOpen] = useState(true);

  const totalNet = attRows.reduce((s, a) => s + (netMinutes(a) ?? 0), 0);
  const activeCount = attRows.filter(a => !a.clockOutAt).length;

  return (
    <View style={styles.dateGroup}>
      {/* Date header */}
      <View style={[styles.dateHeader, {borderBottomColor: colors.border}]}>
        <View style={{flex: 1, minWidth: 0}}>
          <AppText style={[styles.datePrimary, {color: colors.text}]}>
            {dateLabel(dateKey)}
          </AppText>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2}}>
            <AppText variant="caption" color={colors.textSecondary}>
              {dayjs(dateKey).format('D MMM YYYY')}
            </AppText>
            {totalNet > 0 && (
              <AppText variant="caption" color={colors.textSecondary}>
                · {fmtMins(totalNet)} worked
              </AppText>
            )}
            {activeCount > 0 && (
              <AppText variant="caption" style={{color: '#10B981', fontWeight: fontWeight.semiBold}}>
                · {activeCount} active
              </AppText>
            )}
            {taskRows.length > 0 && (
              <AppText variant="caption" color={colors.textSecondary}>
                · {taskRows.length} task{taskRows.length !== 1 ? 's' : ''}
              </AppText>
            )}
          </View>
        </View>
      </View>

      {/* Attendance section */}
      {attRows.length > 0 && (
        <Card style={styles.sectionCard} padding={0}>
          <View style={[styles.sectionCardHeader, {borderBottomColor: colors.border}]}>
            <Clock size={13} color={colors.textSecondary} />
            <AppText variant="label" color={colors.textSecondary}>
              ATTENDANCE ({attRows.length})
            </AppText>
          </View>
          {attRows.map(a => (
            <AttRow key={a.id} att={a} showEmployee={showEmployee} />
          ))}
        </Card>
      )}

      {/* Tasks section */}
      {taskRows.length > 0 && (
        <Card style={styles.sectionCard} padding={0}>
          <TouchableOpacity
            style={[styles.sectionCardHeader, {borderBottomColor: colors.border}]}
            onPress={() => setTasksOpen(v => !v)}
            activeOpacity={0.7}>
            <ClipboardList size={13} color={colors.textSecondary} />
            <AppText variant="label" color={colors.textSecondary} style={{flex: 1}}>
              TASKS ({taskRows.length})
            </AppText>
            {tasksOpen
              ? <ChevronDown size={13} color={colors.textSecondary} />
              : <ChevronRight size={13} color={colors.textSecondary} />
            }
          </TouchableOpacity>
          {tasksOpen && taskRows.map(t => (
            <TaskRow key={t.id} task={t} showEmployee={showEmployee} />
          ))}
        </Card>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AttendanceHistoryScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const isAdmin    = useAppSelector(selectIsAdmin);
  const canViewAll = useAppSelector(selectHasPerm('attendance.view'));
  const showAll    = isAdmin || canViewAll;

  const [days,      setDays]      = useState(14);
  const [empFilter, setEmpFilter] = useState('');
  const [refreshing,setRefreshing]= useState(false);

  const from = useMemo(
    () => dayjs().subtract(days, 'day').startOf('day').toISOString(),
    [days],
  );

  const {data: attData, isFetching: attFetching, refetch: refetchAtt} =
    useGetAttendanceListQuery({
      pageSize: 500, from,
      ...(empFilter ? {employeeId: empFilter} : {}),
    });

  const {data: taskData, isFetching: taskFetching, refetch: refetchTasks} =
    useListTasksQuery({
      pageSize: 500,
      ...(empFilter ? {assignedToId: empFilter} : {}),
    });

  const {data: empData} = useListEmployeesQuery({pageSize: 200}, {skip: !showAll});

  const attItems  = Array.isArray(attData)  ? attData  : (attData?.items  ?? []);
  const taskItems = Array.isArray(taskData) ? taskData : (taskData?.items ?? []);
  const employees = Array.isArray(empData)  ? empData  : (empData?.items  ?? []);

  // Group attendance by workDate
  const attGroups = useMemo(() => {
    const map = {};
    for (const a of attItems) {
      const key = workDateKey(a);
      (map[key] = map[key] ?? []).push(a);
    }
    return map;
  }, [attItems]);

  // Group tasks by startedAt ?? createdAt, filter to selected period
  const taskGroups = useMemo(() => {
    const cutoff = dayjs().subtract(days, 'day').startOf('day');
    const map = {};
    for (const t of taskItems) {
      const relevantDate = t.startedAt ?? t.createdAt;
      if (dayjs(relevantDate).isBefore(cutoff)) continue;
      const key = dayjs(relevantDate).format('YYYY-MM-DD');
      (map[key] = map[key] ?? []).push(t);
    }
    return map;
  }, [taskItems, days]);

  // All unique dates, sorted descending
  const allDates = useMemo(() => {
    const keys = new Set([...Object.keys(attGroups), ...Object.keys(taskGroups)]);
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [attGroups, taskGroups]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchAtt(), refetchTasks()]);
    setRefreshing(false);
  }

  const loading = attFetching || taskFetching;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Attendance History"
        rightAction={loading && <Spinner size="small" />}
      />

      {/* Period filter chips */}
      <View style={[styles.filterWrap, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {PERIOD_OPTIONS.map(opt => {
            const active = days === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDays(opt.value)}
                style={[styles.chip, {
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderColor: active ? colors.primary : colors.border,
                }]}>
                <AppText style={[styles.chipText, {color: active ? '#fff' : colors.textSecondary}]}>
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Employee filter (admin only) */}
      {showAll && employees.length > 0 && (
        <View style={[styles.filterWrap, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {/* "All" chip */}
            <TouchableOpacity
              onPress={() => setEmpFilter('')}
              style={[styles.chip, {
                backgroundColor: !empFilter ? colors.primaryLight : colors.surfaceAlt,
                borderColor: !empFilter ? colors.primary : colors.border,
              }]}>
              <AppText style={[styles.chipText, {color: !empFilter ? colors.primary : colors.textSecondary}]}>
                All
              </AppText>
            </TouchableOpacity>
            {employees.map(e => {
              const name = `${e.firstName} ${e.lastName}`;
              const active = empFilter === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => setEmpFilter(active ? '' : e.id)}
                  style={[styles.chip, {
                    backgroundColor: active ? colors.primaryLight : colors.surfaceAlt,
                    borderColor: active ? colors.primary : colors.border,
                  }]}>
                  <AppText
                    style={[styles.chipText, {color: active ? colors.primary : colors.textSecondary}]}
                    numberOfLines={1}>
                    {name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {allDates.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Clock size={44} color={colors.textTertiary} />
            <AppText style={[styles.emptyTitle, {color: colors.text}]}>No records</AppText>
            <AppText variant="bodySmall" color={colors.textSecondary} style={{textAlign: 'center'}}>
              No attendance or tasks found for the selected period.
            </AppText>
          </View>
        ) : (
          allDates.map(key => (
            <DateGroup
              key={key}
              dateKey={key}
              attRows={attGroups[key] ?? []}
              taskRows={taskGroups[key] ?? []}
              showEmployee={showAll && !empFilter}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingBottom: spacing[4],
    borderBottomWidth: 1, gap: spacing[3],
    shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  backBtn:     {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  headerSub:   {fontSize: fontSize.xs, marginTop: 1},

  // Filters
  filterWrap:  {height: 48, borderBottomWidth: 1},
  filterChips: {paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], alignItems: 'center'},
  chip:        {paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, borderWidth: 1},
  chipText:    {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  // Content
  content: {padding: spacing[4], gap: spacing[4]},

  // Date group
  dateGroup: {gap: spacing[2]},
  dateHeader: {
    paddingVertical: spacing[2], borderBottomWidth: 1, marginBottom: spacing[1],
  },
  datePrimary: {fontSize: fontSize.md, fontWeight: fontWeight.bold},

  // Section card
  sectionCard: {overflow: 'hidden'},
  sectionCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },

  // Attendance row
  attRow:      {paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1},
  attEmpRow:   {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2]},
  attTimesRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap'},
  attCell:     {minWidth: 52, gap: 2},
  attCellValue:{fontSize: fontSize.sm, fontWeight: fontWeight.medium},
  attStatusPill:{
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full, marginLeft: 'auto',
  },
  attStatusText:{fontSize: 10, fontWeight: fontWeight.bold},

  // Break detail row
  breakDetailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderTopWidth: 1,
  },

  // Task row
  taskRow:      {flexDirection: 'row', borderBottomWidth: 1},
  taskRowStrip: {width: 3, flexShrink: 0},
  taskRowBody:  {flex: 1, padding: spacing[3], gap: spacing[1]},
  taskRowTop:   {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2]},
  taskRowTitle: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  taskStatusPill:{paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full},
  taskStatusText:{fontSize: 10, fontWeight: fontWeight.bold},
  taskRowMeta:  {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3]},

  // Empty state
  emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing[3]},
  emptyTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
});
