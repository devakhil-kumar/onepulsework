import React, {useState, useEffect} from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Modal,
  TextInput, TouchableOpacity, FlatList, RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {AppHeader} from '@components/common';
import {AppText, Card, Button, Badge, Spinner, Avatar} from '@components/ui';
import {
  Clock, Coffee, Play, Pause, CheckCircle, XCircle,
  RotateCcw, ClipboardList, Users, UserCheck, Plus, ChevronRight, History,
} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatTime, formatHours, getDisplayTimezone} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin, selectEmployeeId} from '@features/auth/authSlice';
import {
  useGetMyStatusQuery,
  useClockInMutation,
  useClockOutMutation,
  useBreakStartMutation,
  useBreakEndMutation,
  useGetAttendanceListQuery,
  useAdminClockInMutation,
} from '@features/attendance/attendanceApi';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {
  useListTasksQuery,
  useCreateTaskMutation,
  useStartTaskMutation,
  usePauseTaskMutation,
  useDoneTaskMutation,
  useCompleteTaskMutation,
  useReportIssueTaskMutation,
  useRestartTaskMutation,
} from '@features/task/taskApi';
import {CreateTaskModal} from '@screens/app/TasksScreen';

// ── Constants ────────────────────────────────────────────────────────────────

const BREAK_PRESETS = ['Coffee break', 'Tea break', 'Lunch break', 'Prayer break', 'Other'];

// ── Live clock ───────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function calcMinutes(fromISO) {
  if (!fromISO) return 0;
  return Math.floor((Date.now() - new Date(fromISO).getTime()) / 60000);
}

// ── Task helpers ─────────────────────────────────────────────────────────────

const TASK_STATUS_LABEL = {
  TODO:         'To Do',
  IN_PROGRESS:  'In Progress',
  PAUSED:       'Paused',
  DONE:         'Pending Review',
  NEEDS_REWORK: 'Needs Rework',
  COMPLETED:    'Completed',
  CANCELLED:    'Cancelled',
};

// ── Break Picker Sheet ───────────────────────────────────────────────────────

function BreakPickerSheet({visible, onClose, onStart, loading}) {
  const colors = useColors();
  const [selected, setSelected] = useState('Coffee break');
  const [custom, setCustom] = useState('');

  // Reset on open
  React.useEffect(() => {
    if (visible) { setSelected('Coffee break'); setCustom(''); }
  }, [visible]);

  function handleStart() {
    const label = selected === 'Other' ? (custom.trim() || 'Break') : selected;
    onStart(label);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.breakSheet, {backgroundColor: colors.surface}]}>
          <AppText style={[styles.breakSheetTitle, {color: colors.text}]}>Start a Break</AppText>
          <View style={styles.presetsGrid}>
            {BREAK_PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setSelected(p)}
                style={[styles.presetChip, {
                  backgroundColor: selected === p ? colors.primary : colors.surfaceAlt,
                  borderColor: selected === p ? colors.primary : colors.border,
                }]}>
                <AppText style={[styles.presetText, {color: selected === p ? '#fff' : colors.text}]}>
                  {p}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          {selected === 'Other' && (
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="Describe break…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.customInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
              maxLength={80}
            />
          )}
          <View style={styles.breakActions}>
            <Button label="Cancel" variant="secondary" onPress={onClose} style={{flex: 1}} />
            <Button label="Start Break" variant="primary" loading={loading} onPress={handleStart} style={{flex: 1}}
              iconLeft={<Coffee size={14} color="#fff" />} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Completed Breaks List ────────────────────────────────────────────────────

function CompletedBreaksList({breaks}) {
  const colors = useColors();
  const done = (breaks ?? []).filter(b => b.endAt);
  if (done.length === 0) return null;

  const totalMins = done.reduce(
    (s, b) => s + Math.round((new Date(b.endAt) - new Date(b.startAt)) / 60000), 0,
  );

  return (
    <Card style={styles.breaksCard} padding={spacing[4]}>
      <AppText variant="label" color={colors.textSecondary} style={styles.breaksHeader}>
        BREAKS TODAY
      </AppText>
      {done.map(b => {
        const mins = Math.round((new Date(b.endAt) - new Date(b.startAt)) / 60000);
        return (
          <View key={b.id} style={[styles.completedBreakRow, {borderBottomColor: colors.border}]}>
            <Coffee size={12} color={colors.warning} style={{flexShrink: 0}} />
            <AppText variant="bodySmall" style={{flex: 1, color: colors.text}}>{b.label}</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              {formatTime(b.startAt)} – {formatTime(b.endAt)} · {mins} min
            </AppText>
          </View>
        );
      })}
      <View style={[styles.breaksTotalRow, {borderTopColor: colors.border}]}>
        <AppText variant="bodySmall" color={colors.textSecondary}>Total break time</AppText>
        <AppText style={[styles.breaksTotalValue, {color: colors.text}]}>{formatHours(totalMins)}</AppText>
      </View>
    </Card>
  );
}

// ── Report Issue Modal ───────────────────────────────────────────────────────

function ReportIssueModal({visible, taskTitle, onClose, onSubmit, loading}) {
  const colors = useColors();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalBox, {backgroundColor: colors.surface}]}>
          <AppText variant="h4" style={{marginBottom: spacing[2]}}>Report Issue</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{marginBottom: spacing[4]}}>
            {taskTitle}
          </AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Describe the issue (optional)"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            style={[styles.noteInput, {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
            }]}
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" variant="secondary" size="sm" onPress={onClose} style={{flex: 1}} />
            <Button
              label="Submit"
              variant="danger"
              size="sm"
              loading={loading}
              onPress={() => onSubmit(note)}
              style={{flex: 1}}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Clock In Employee Modal (admin) ──────────────────────────────────────────

function ClockInEmployeeModal({visible, onClose}) {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const {data: empData, isLoading} = useListEmployeesQuery({pageSize: 200}, {skip: !visible});
  const [adminClockIn, {isLoading: clocking}] = useAdminClockInMutation();

  const employees = (Array.isArray(empData) ? empData : (empData?.items ?? [])).filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  async function handleSubmit() {
    if (!selected) return;
    try {
      await adminClockIn({employeeId: selected.id}).unwrap();
      Alert.alert('Success', `${selected.firstName} ${selected.lastName} clocked in.`);
      onClose();
      setSelected(null);
      setSearch('');
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Something went wrong');
    }
  }

  function handleClose() {
    setSelected(null);
    setSearch('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
        <View style={[styles.clockInModal, {backgroundColor: colors.surface}]}>
          <AppText variant="h4" style={{marginBottom: spacing[3]}}>Clock In Employee</AppText>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search employee..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
            }]}
          />

          {isLoading ? (
            <View style={{paddingVertical: spacing[6], alignItems: 'center'}}><Spinner /></View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={e => e.id}
              style={styles.empList}
              renderItem={({item}) => {
                const name = `${item.firstName} ${item.lastName}`;
                const isChosen = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    style={[
                      styles.empRow,
                      {borderBottomColor: colors.border},
                      isChosen && {backgroundColor: colors.primaryLight},
                    ]}
                    activeOpacity={0.7}>
                    <Avatar name={name} size="sm" />
                    <View style={{flex: 1}}>
                      <AppText variant="bodySmall" style={{fontWeight: fontWeight.medium}}>{name}</AppText>
                      {item.position && (
                        <AppText variant="caption" color={colors.textSecondary}>{item.position}</AppText>
                      )}
                    </View>
                    {isChosen && <UserCheck size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <AppText variant="bodySmall" color={colors.textSecondary} style={{textAlign: 'center', padding: spacing[4]}}>
                  No employees found
                </AppText>
              }
            />
          )}

          <View style={[styles.modalActions, {marginTop: spacing[3]}]}>
            <Button label="Cancel" variant="secondary" size="sm" onPress={handleClose} style={{flex: 1}} />
            <Button
              label="Clock In"
              variant="primary"
              size="sm"
              loading={clocking}
              disabled={!selected}
              onPress={handleSubmit}
              style={{flex: 1}}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({task, canManage, myEmpId}) {
  const colors = useColors();
  const [issueModal, setIssueModal] = useState(false);

  const [startTask,  {isLoading: starting}]   = useStartTaskMutation();
  const [pauseTask,  {isLoading: pausing}]     = usePauseTaskMutation();
  const [doneTask,   {isLoading: submitting}]  = useDoneTaskMutation();
  const [complete,   {isLoading: completing}]  = useCompleteTaskMutation();
  const [reportIssue,{isLoading: reporting}]   = useReportIssueTaskMutation();
  const [restart,    {isLoading: restarting}]  = useRestartTaskMutation();

  const isMyTask = task.assignedToId === myEmpId;

  async function act(fn, errorLabel) {
    try { await fn().unwrap(); }
    catch (e) { Alert.alert(errorLabel, e?.data?.error?.message ?? 'Something went wrong'); }
  }

  async function handleIssueSubmit(note) {
    try {
      await reportIssue({id: task.id, note}).unwrap();
      setIssueModal(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Something went wrong');
    }
  }

  const {status} = task;
  const priorityColor = {HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', CRITICAL: '#8B5CF6'}[task.priority];

  return (
    <Card style={styles.taskCard} padding={spacing[4]}>
      {priorityColor && (
        <View style={[styles.priorityStrip, {backgroundColor: priorityColor}]} />
      )}

      <View style={styles.taskHeader}>
        <AppText variant="bodyMedium" style={{flex: 1}} numberOfLines={2}>{task.title}</AppText>
        <Badge
          status={status}
          label={TASK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}
          size="sm"
        />
      </View>

      <View style={styles.taskMeta}>
        {task.project?.name && (
          <AppText variant="caption" color={colors.textSecondary}>📁 {task.project.name}</AppText>
        )}
        {canManage && task.assignedTo && (
          <AppText variant="caption" color={colors.textSecondary}>
            👤 {task.assignedTo.firstName} {task.assignedTo.lastName}
          </AppText>
        )}
        {(task.dueAt || task.dueDate) && (
          <AppText variant="caption" color={colors.textSecondary}>
            📅 Due {new Date(task.dueAt ?? task.dueDate).toLocaleDateString('en-AU', {timeZone: getDisplayTimezone(), day: 'numeric', month: 'short'})}
          </AppText>
        )}
      </View>

      {status === 'NEEDS_REWORK' && task.issueNote && (
        <View style={[styles.issueNote, {backgroundColor: colors.errorLight, borderColor: '#EF4444'}]}>
          <AppText variant="caption" color={colors.error}>⚠ {task.issueNote}</AppText>
        </View>
      )}

      <View style={styles.taskActions}>
        {isMyTask && status === 'TODO' && (
          <Button label="Start" variant="primary" size="sm" loading={starting}
            iconLeft={<Play size={13} color="#fff" />}
            onPress={() => act(() => startTask(task.id), 'Start Failed')} />
        )}
        {isMyTask && status === 'IN_PROGRESS' && (<>
          <Button label="Pause" variant="secondary" size="sm" loading={pausing}
            iconLeft={<Pause size={13} color={colors.text} />}
            onPress={() => act(() => pauseTask(task.id), 'Pause Failed')} />
          <Button label="Submit" variant="outline" size="sm" loading={submitting}
            iconLeft={<CheckCircle size={13} color={colors.primary} />}
            onPress={() => act(() => doneTask(task.id), 'Submit Failed')} />
        </>)}
        {isMyTask && status === 'PAUSED' && (
          <Button label="Resume" variant="primary" size="sm" loading={starting}
            iconLeft={<Play size={13} color="#fff" />}
            onPress={() => act(() => startTask(task.id), 'Resume Failed')} />
        )}
        {isMyTask && status === 'NEEDS_REWORK' && (
          <Button label="Restart" variant="secondary" size="sm" loading={restarting}
            iconLeft={<RotateCcw size={13} color={colors.text} />}
            onPress={() => act(() => restart(task.id), 'Restart Failed')} />
        )}
        {canManage && status === 'DONE' && (<>
          <Button label="Complete" variant="primary" size="sm" loading={completing}
            iconLeft={<CheckCircle size={13} color="#fff" />}
            onPress={() => act(() => complete(task.id), 'Complete Failed')} />
          <Button label="Issue" variant="danger" size="sm"
            iconLeft={<XCircle size={13} color="#fff" />}
            onPress={() => setIssueModal(true)} />
        </>)}
        {canManage && status === 'COMPLETED' && (
          <Button label="Reopen" variant="secondary" size="sm" loading={restarting}
            iconLeft={<RotateCcw size={13} color={colors.text} />}
            onPress={() => act(() => restart(task.id), 'Reopen Failed')} />
        )}
      </View>

      <ReportIssueModal
        visible={issueModal}
        taskTitle={task.title}
        onClose={() => setIssueModal(false)}
        onSubmit={handleIssueSubmit}
        loading={reporting}
      />
    </Card>
  );
}

// ── Admin: compact my-status bar ─────────────────────────────────────────────

function AdminStatusBar({session, shift, isClockedIn, isOnBreak, clockingIn, clockingOut, breakStarting, breakEnding, onClockIn, onClockOut, onBreakStart, onBreakEnd}) {
  const colors = useColors();

  const statusColor = isOnBreak ? colors.warning : isClockedIn ? colors.success : colors.textTertiary;
  const statusLabel = isOnBreak ? 'On Break' : isClockedIn ? 'Clocked In' : session ? 'Clocked Out' : 'Not Clocked In';
  const activeBreak = isOnBreak ? (session?.breaks ?? []).find(b => !b.endAt) : null;

  return (
    <Card style={styles.adminStatusBar} padding={spacing[4]}>
      <View style={styles.adminStatusLeft}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <View style={{flex: 1, minWidth: 0}}>
          <AppText variant="bodySmall" style={{fontWeight: fontWeight.semiBold, color: statusColor}}>
            {statusLabel}
          </AppText>
          {isClockedIn && session?.clockInAt && (
            <AppText variant="caption" color={colors.textSecondary}>
              Since {formatTime(session.clockInAt)}
              {shift && ` · Shift ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`}
            </AppText>
          )}
          {!isClockedIn && !isOnBreak && shift && (
            <AppText variant="caption" color={colors.textSecondary}>
              Shift {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
            </AppText>
          )}
          {/* Active break label */}
          {isOnBreak && activeBreak && (
            <View style={styles.activeBreakInfo}>
              <Coffee size={11} color={colors.warning} />
              <AppText variant="caption" color={colors.warning} numberOfLines={1}>
                {activeBreak.label} · {calcMinutes(activeBreak.startAt)} min elapsed
              </AppText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.adminStatusActions}>
        {!isClockedIn && !isOnBreak && (
          <Button label="Clock In" variant="primary" size="sm" loading={clockingIn} onPress={onClockIn} />
        )}
        {isClockedIn && !isOnBreak && (
          <Button
            label="Break"
            variant="secondary"
            size="sm"
            loading={breakStarting}
            iconLeft={<Coffee size={13} color={colors.text} />}
            onPress={onBreakStart}
          />
        )}
        {isOnBreak && (
          <Button label="Resume" variant="outline" size="sm" loading={breakEnding} onPress={onBreakEnd} />
        )}
        {(isClockedIn || isOnBreak) && (
          <Button label="Out" variant="danger" size="sm" loading={clockingOut} onPress={onClockOut} />
        )}
      </View>
    </Card>
  );
}

// ── Admin: Who's In panel ────────────────────────────────────────────────────

function WhosInPanel({teamList, teamLoading}) {
  const colors = useColors();

  const active = (teamList ?? []).filter(r =>
    r.status === 'CLOCKED_IN' || r.status === 'ON_BREAK',
  );

  return (
    <Card style={styles.whosInCard} padding={spacing[4]}>
      <View style={styles.whosInHeader}>
        <Users size={14} color={colors.textSecondary} />
        <AppText variant="label" color={colors.textSecondary} style={styles.whosInLabel}>
          WHO'S IN RIGHT NOW
        </AppText>
        {active.length > 0 && (
          <View style={[styles.countBadge, {backgroundColor: colors.primaryLight}]}>
            <AppText variant="caption" color={colors.primary} style={{fontWeight: fontWeight.bold}}>
              {active.length}
            </AppText>
          </View>
        )}
      </View>

      {teamLoading ? (
        <View style={{paddingVertical: spacing[3], alignItems: 'center'}}><Spinner size="small" /></View>
      ) : active.length === 0 ? (
        <AppText variant="bodySmall" color={colors.textSecondary} style={{marginTop: spacing[2]}}>
          No one is clocked in right now.
        </AppText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {active.map(r => {
            const name = r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : 'Unknown';
            const isBreak = r.status === 'ON_BREAK';
            const dotColor = isBreak ? colors.warning : colors.success;
            return (
              <View
                key={r.id}
                style={[styles.employeeChip, {borderColor: colors.border, backgroundColor: colors.background}]}>
                <Avatar name={name} size={26} />
                <View style={{gap: 1}}>
                  <AppText variant="caption" style={{fontWeight: fontWeight.semiBold, lineHeight: 16}}>
                    {name}
                  </AppText>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor}} />
                    <AppText variant="caption" color={dotColor} style={{fontSize: 10}}>
                      {isBreak ? 'Break' : r.clockInAt ? `Since ${formatTime(r.clockInAt)}` : 'In'}
                    </AppText>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Card>
  );
}

// ── All team attendance list (admin) ─────────────────────────────────────────

function TeamAttendanceList({teamList, teamLoading}) {
  const colors = useColors();

  if (teamLoading) {
    return <View style={styles.centered}><Spinner size="small" /></View>;
  }

  if (!teamList || teamList.length === 0) {
    return (
      <Card padding={spacing[5]}>
        <AppText variant="bodySmall" color={colors.textSecondary} style={{textAlign: 'center'}}>
          No attendance records today
        </AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.teamCard} padding={0}>
      {teamList.map((rec, i) => {
        const name = rec.employee
          ? `${rec.employee.firstName} ${rec.employee.lastName}`
          : 'Unknown';
        const isLast = i === teamList.length - 1;
        return (
          <View
            key={rec.id}
            style={[
              styles.teamRow,
              {borderBottomColor: colors.border},
              isLast && {borderBottomWidth: 0},
            ]}>
            <View style={styles.teamRowLeft}>
              <View style={[styles.teamDot, {
                backgroundColor:
                  rec.status === 'CLOCKED_IN' ? colors.success :
                  rec.status === 'ON_BREAK'   ? colors.warning :
                  colors.textTertiary,
              }]} />
              <AppText variant="bodySmall" style={{fontWeight: fontWeight.medium}}>
                {name}
              </AppText>
            </View>
            <View style={styles.teamRowRight}>
              <Badge
                status={rec.status}
                label={
                  rec.status === 'CLOCKED_IN'  ? 'In' :
                  rec.status === 'ON_BREAK'    ? 'Break' :
                  rec.status === 'CLOCKED_OUT' ? 'Out' :
                  rec.status === 'MISSED'      ? 'Missed' : rec.status
                }
                size="sm"
              />
              {rec.clockInAt && (
                <AppText variant="caption" color={colors.textSecondary}>
                  {formatTime(rec.clockInAt)}
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

// ── History Link ─────────────────────────────────────────────────────────────

function HistoryLink({onPress}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.historyLink, {backgroundColor: colors.surface, borderColor: colors.border}]}
      activeOpacity={0.7}>
      <History size={15} color={colors.primary} />
      <AppText style={[styles.historyLinkText, {color: colors.primary}]}>
        View Attendance & Task History
      </AppText>
      <ChevronRight size={15} color={colors.primary} />
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const now     = useLiveClock();
  const navigation = useNavigation();

  const isAdmin        = useAppSelector(selectIsAdmin);
  const canViewAttend  = useAppSelector(selectHasPerm('attendance.view'));
  const canManageTasks = useAppSelector(selectHasPerm('tasks.manage'));
  const myEmpId        = useAppSelector(selectEmployeeId);

  const isAdminView = isAdmin || canViewAttend;

  const [clockInEmpModal, setClockInEmpModal] = useState(false);
  const [createTaskOpen,  setCreateTaskOpen]  = useState(false);
  const [breakPickerOpen, setBreakPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // My status
  const {data: statusData, isLoading: statusLoading, refetch: refetchStatus} =
    useGetMyStatusQuery(undefined, {pollingInterval: 60000});

  const session      = statusData?.currentAttendance ?? null;
  const shift        = statusData?.todayShift ?? null;
  const clockStatus  = session?.status ?? null;
  const isClockedIn  = clockStatus === 'CLOCKED_IN';
  const isOnBreak    = clockStatus === 'ON_BREAK';
  const activeBreak  = isOnBreak ? (session?.breaks ?? []).find(b => !b.endAt) : null;

  // Mutations
  const [createTask, {isLoading: creatingTask}]  = useCreateTaskMutation();
  const [clockIn,    {isLoading: clockingIn}]    = useClockInMutation();
  const [clockOut,   {isLoading: clockingOut}]   = useClockOutMutation();
  const [breakStart, {isLoading: breakStarting}] = useBreakStartMutation();
  const [breakEnd,   {isLoading: breakEnding}]   = useBreakEndMutation();

  // Tasks
  const {data: taskData, isLoading: tasksLoading, refetch: refetchTasks} = useListTasksQuery(
    isAdminView ? {pageSize: 100} : {pageSize: 50, assignedToId: myEmpId},
    {skip: !isAdminView && !myEmpId},
  );
  const tasks = (Array.isArray(taskData) ? taskData : (taskData?.items ?? [])).filter(
    t => !['COMPLETED', 'CANCELLED'].includes(t.status),
  );

  // Team attendance (admin only)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const {data: teamData, isLoading: teamLoading, refetch: refetchTeam} = useGetAttendanceListQuery(
    {pageSize: 200, from: todayStart.toISOString()},
    {skip: !isAdminView},
  );
  const teamList = Array.isArray(teamData) ? teamData : (teamData?.items ?? []);

  async function onRefresh() {
    setRefreshing(true);
    const fetches = [refetchStatus(), refetchTasks()];
    if (isAdminView) fetches.push(refetchTeam());
    await Promise.all(fetches);
    setRefreshing(false);
  }

  async function handleCreateTask(body) {
    try {
      await createTask(body).unwrap();
      setCreateTaskOpen(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not create task.');
    }
  }

  async function handleClockIn() {
    try { await clockIn({}).unwrap(); }
    catch (e) { Alert.alert('Clock In Failed', e?.data?.error?.message ?? 'Something went wrong'); }
  }
  async function handleClockOut() {
    try { await clockOut({}).unwrap(); }
    catch (e) { Alert.alert('Clock Out Failed', e?.data?.error?.message ?? 'Something went wrong'); }
  }
  async function handleBreakStart(label) {
    try { await breakStart({label}).unwrap(); setBreakPickerOpen(false); }
    catch (e) { Alert.alert('Break Failed', e?.data?.error?.message ?? 'Something went wrong'); }
  }
  async function handleBreakEnd() {
    try { await breakEnd({}).unwrap(); }
    catch (e) { Alert.alert('Break Failed', e?.data?.error?.message ?? 'Something went wrong'); }
  }

  const workMinutes = isClockedIn
    ? calcMinutes(session?.clockInAt) - (session?.breakMinutes ?? 0)
    : session?.clockOutAt
      ? calcMinutes(session.clockInAt) - (session?.breakMinutes ?? 0)
      : null;

  // ── ADMIN VIEW ───────────────────────────────────────────────────────────
  if (isAdminView) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <AppHeader title="Attendance" />

        <ScrollView
          contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

          {/* My Status compact bar */}
          {statusLoading ? (
            <Card style={{padding: spacing[4]}}><Spinner size="small" /></Card>
          ) : (
            <AdminStatusBar
              session={session}
              shift={shift}
              isClockedIn={isClockedIn}
              isOnBreak={isOnBreak}
              clockingIn={clockingIn}
              clockingOut={clockingOut}
              breakStarting={breakStarting}
              breakEnding={breakEnding}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onBreakStart={() => setBreakPickerOpen(true)}
              onBreakEnd={handleBreakEnd}
            />
          )}

          {/* Completed breaks for today */}
          <CompletedBreaksList breaks={session?.breaks} />

          {/* History link */}
          <HistoryLink onPress={() => navigation.navigate('AttendanceHistory')} />

          {/* Who's In Right Now */}
          <WhosInPanel teamList={teamList} teamLoading={teamLoading} />

          {/* Clock In Employee button */}
          <TouchableOpacity
            onPress={() => setClockInEmpModal(true)}
            style={[styles.clockInEmpBtn, {backgroundColor: colors.surface, borderColor: colors.border}]}
            activeOpacity={0.7}>
            <UserCheck size={16} color={colors.primary} />
            <AppText variant="bodySmall" color={colors.primary} style={{fontWeight: fontWeight.semiBold}}>
              Clock In Employee
            </AppText>
          </TouchableOpacity>

          {/* Full team list */}
          <View style={styles.sectionHeader}>
            <Users size={14} color={colors.textSecondary} />
            <AppText variant="label" color={colors.textSecondary} style={styles.sectionLabelInline}>
              TEAM TODAY
            </AppText>
          </View>
          <TeamAttendanceList teamList={teamList} teamLoading={teamLoading} />

          {/* Active tasks */}
          <View style={styles.sectionHeader}>
            <ClipboardList size={14} color={colors.textSecondary} />
            <AppText variant="label" color={colors.textSecondary} style={[styles.sectionLabelInline, {flex: 1}]}>
              ACTIVE TASKS
            </AppText>
            <TouchableOpacity
              onPress={() => setCreateTaskOpen(true)}
              style={[styles.sectionAddBtn, {backgroundColor: colors.primary}]}>
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {tasksLoading ? (
            <View style={styles.centered}><Spinner size="small" /></View>
          ) : tasks.length === 0 ? (
            <Card style={styles.emptyCard} padding={spacing[5]}>
              <AppText variant="bodySmall" color={colors.textSecondary} style={{textAlign: 'center'}}>
                No active tasks
              </AppText>
            </Card>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                canManage={canManageTasks}
                myEmpId={myEmpId}
              />
            ))
          )}
        </ScrollView>

        <BreakPickerSheet
          visible={breakPickerOpen}
          onClose={() => setBreakPickerOpen(false)}
          onStart={handleBreakStart}
          loading={breakStarting}
        />
        <ClockInEmployeeModal visible={clockInEmpModal} onClose={() => setClockInEmpModal(false)} />
        <CreateTaskModal
          visible={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          onSave={handleCreateTask}
          saving={creatingTask}
          canAssign={true}
        />
      </View>
    );
  }

  // ── EMPLOYEE VIEW ────────────────────────────────────────────────────────
  const statusLabel = isOnBreak ? 'On Break' : isClockedIn ? 'Clocked In' : session ? 'Clocked Out' : 'Not Clocked In';
  const statusColor = isOnBreak ? colors.warning : isClockedIn ? colors.success : colors.textTertiary;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Attendance" />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {/* Clock card */}
        <Card style={styles.clockCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
            <AppText variant="bodySmall" color={colors.textSecondary}>{statusLabel}</AppText>
          </View>

          <AppText style={[styles.timeBig, {color: colors.text}]}>
            {formatTime(now)}
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {now.toLocaleDateString('en-AU', {timeZone: getDisplayTimezone(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
          </AppText>

          {shift && (
            <View style={[styles.shiftBadge, {backgroundColor: colors.primaryLight}]}>
              <Clock size={13} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                Shift: {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
              </AppText>
            </View>
          )}

          {/* Active break info */}
          {isOnBreak && activeBreak && (
            <View style={[styles.activeBreakBanner, {backgroundColor: colors.warningLight ?? '#FEF3C7', borderColor: colors.warning}]}>
              <Coffee size={14} color={colors.warning} />
              <View style={{flex: 1}}>
                <AppText variant="bodySmall" style={{fontWeight: fontWeight.semiBold, color: colors.warning}}>
                  {activeBreak.label}
                </AppText>
                <AppText variant="caption" color={colors.warning}>
                  Started {formatTime(activeBreak.startAt)} · {calcMinutes(activeBreak.startAt)} min elapsed
                </AppText>
              </View>
            </View>
          )}

          {statusLoading ? (
            <View style={{marginTop: spacing[5], alignItems: 'center'}}><Spinner size="small" /></View>
          ) : (
            <View style={styles.actionRow}>
              {!isClockedIn && !isOnBreak && (
                <Button
                  label={session ? 'Clock In Again' : 'Clock In'}
                  variant="primary"
                  fullWidth
                  loading={clockingIn}
                  onPress={handleClockIn}
                />
              )}
              {(isClockedIn || isOnBreak) && (
                <Button
                  label="Clock Out"
                  variant="danger"
                  fullWidth
                  loading={clockingOut}
                  onPress={handleClockOut}
                />
              )}
              {isClockedIn && (
                <Button
                  label="Start Break"
                  variant="secondary"
                  fullWidth
                  loading={breakStarting}
                  iconLeft={<Coffee size={15} color={colors.text} />}
                  onPress={() => setBreakPickerOpen(true)}
                />
              )}
              {isOnBreak && (
                <Button
                  label="End Break"
                  variant="outline"
                  fullWidth
                  loading={breakEnding}
                  iconLeft={<Coffee size={15} color={colors.primary} />}
                  onPress={handleBreakEnd}
                />
              )}
            </View>
          )}
        </Card>

        {/* Today's summary */}
        <AppText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          TODAY'S SUMMARY
        </AppText>
        <Card style={styles.summaryCard}>
          {[
            {label: 'Shift Start',  value: shift ? formatTime(shift.startTime) : '—'},
            {label: 'Clock In',     value: session?.clockInAt  ? formatTime(session.clockInAt)  : '—'},
            {label: 'Break',        value: session?.breakMinutes ? `${session.breakMinutes} min` : '0 min'},
            {label: 'Clock Out',    value: session?.clockOutAt ? formatTime(session.clockOutAt) : isClockedIn || isOnBreak ? 'In progress' : '—'},
            {label: 'Hours Worked', value: workMinutes != null ? formatHours(workMinutes) : '—'},
          ].map(row => (
            <View key={row.label} style={[styles.summaryRow, {borderBottomColor: colors.border}]}>
              <AppText variant="bodySmall" color={colors.textSecondary}>{row.label}</AppText>
              <AppText style={[styles.summaryValue, {color: colors.text}]}>{row.value}</AppText>
            </View>
          ))}
        </Card>

        {/* Completed breaks for today */}
        <CompletedBreaksList breaks={session?.breaks} />

        {/* History link */}
        <HistoryLink onPress={() => navigation.navigate('AttendanceHistory')} />

        {/* My Active Tasks */}
        <View style={styles.sectionHeader}>
          <ClipboardList size={14} color={colors.textSecondary} />
          <AppText variant="label" color={colors.textSecondary} style={[styles.sectionLabelInline, {flex: 1}]}>
            MY TASKS
          </AppText>
          <TouchableOpacity
            onPress={() => setCreateTaskOpen(true)}
            style={[styles.sectionAddBtn, {backgroundColor: colors.primary}]}>
            <Plus size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {tasksLoading ? (
          <View style={styles.centered}><Spinner size="small" /></View>
        ) : tasks.length === 0 ? (
          <Card style={styles.emptyCard} padding={spacing[5]}>
            <AppText variant="bodySmall" color={colors.textSecondary} style={{textAlign: 'center'}}>
              No active tasks
            </AppText>
          </Card>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManageTasks}
              myEmpId={myEmpId}
            />
          ))
        )}
      </ScrollView>

      <BreakPickerSheet
        visible={breakPickerOpen}
        onClose={() => setBreakPickerOpen(false)}
        onStart={handleBreakStart}
        loading={breakStarting}
      />
      <CreateTaskModal
        visible={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onSave={handleCreateTask}
        saving={creatingTask}
        canAssign={isAdmin || canManageTasks}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    {flex: 1},
  content: {padding: spacing[4], gap: spacing[3]},

  // Break picker sheet
  overlay:    {flex: 1, justifyContent: 'flex-end'},
  breakSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: spacing[8],
  },
  breakSheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[4]},
  presetsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4]},
  presetChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1.5,
  },
  presetText: {fontSize: fontSize.sm, fontWeight: fontWeight.medium},
  customInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm, marginBottom: spacing[4],
  },
  breakActions: {flexDirection: 'row', gap: spacing[3]},

  // Completed breaks
  breaksCard:          {},
  breaksHeader:        {letterSpacing: 0.6, marginBottom: spacing[2]},
  completedBreakRow:   {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1},
  breaksTotalRow:      {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing[2], marginTop: spacing[1]},
  breaksTotalValue:    {fontSize: fontSize.sm, fontWeight: fontWeight.bold},

  // Active break banner (employee view)
  activeBreakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    padding: spacing[3], borderRadius: radius.md, borderWidth: 1, marginTop: spacing[1],
  },

  // Active break info (admin status bar)
  activeBreakInfo: {flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2},

  // History link
  historyLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.lg, borderWidth: 1,
  },
  historyLinkText: {flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},

  // Admin status bar
  adminStatusBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing[3],
  },
  adminStatusLeft:    {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1, minWidth: 0},
  adminStatusActions: {flexDirection: 'row', gap: spacing[2], flexShrink: 0},

  // Who's In
  whosInCard:   {gap: spacing[3]},
  whosInHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},
  whosInLabel:  {flex: 1, letterSpacing: 0.6},
  countBadge: {
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full, minWidth: 22, alignItems: 'center',
  },
  chipsRow: {gap: spacing[2], paddingVertical: spacing[1]},
  employeeChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1,
  },

  // Clock In Employee button
  clockInEmpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg,
    borderWidth: 1, borderStyle: 'dashed',
  },

  // Section headers
  sectionLabel: {letterSpacing: 0.6, marginTop: spacing[1]},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1]},
  sectionLabelInline: {letterSpacing: 0.6},
  sectionAddBtn: {width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},

  // Employee view — clock card
  clockCard:  {padding: spacing[5], gap: spacing[3]},
  statusRow:  {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},
  statusDot:  {width: 8, height: 8, borderRadius: 4},
  timeBig:    {fontSize: 44, fontWeight: fontWeight.bold, lineHeight: 52},
  shiftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  actionRow: {gap: spacing[2], marginTop: spacing[2]},

  // Summary
  summaryCard: {padding: spacing[4]},
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing[3], borderBottomWidth: 1,
  },
  summaryValue: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},

  // Task card
  taskCard:     {position: 'relative', overflow: 'hidden', gap: spacing[2]},
  priorityStrip:{position: 'absolute', left: 0, top: 0, bottom: 0, width: 3},
  taskHeader:   {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], paddingLeft: spacing[1]},
  taskMeta:     {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingLeft: spacing[1]},
  taskActions:  {flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', marginTop: spacing[1]},
  issueNote: {
    padding: spacing[2], borderRadius: radius.sm,
    borderWidth: 1, marginTop: spacing[1],
  },

  emptyCard: {alignItems: 'center'},
  centered:  {alignItems: 'center', paddingVertical: spacing[4]},

  // Team list
  teamCard: {borderRadius: radius.lg, overflow: 'hidden'},
  teamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1,
  },
  teamRowLeft:  {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1},
  teamRowRight: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},
  teamDot: {width: 7, height: 7, borderRadius: 4},

  // Modals
  modalOverlay: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6]},
  modalBox: {width: '100%', borderRadius: radius.xl, padding: spacing[5], gap: spacing[3]},
  noteInput: {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing[3], minHeight: 90,
    fontSize: fontSize.sm, textAlignVertical: 'top',
  },
  modalActions: {flexDirection: 'row', gap: spacing[3]},

  // Clock In Employee modal
  clockInModal: {
    width: '100%', borderRadius: radius.xl,
    padding: spacing[5], maxHeight: '80%',
  },
  searchInput: {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing[3], fontSize: fontSize.sm,
    marginBottom: spacing[2],
  },
  empList: {maxHeight: 280},
  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
  },
});
