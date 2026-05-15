import React, {useState, useMemo} from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Modal, TextInput,
  TouchableOpacity, RefreshControl, FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@components/common';
import {AppText, Card, Button, Badge, Spinner, EmptyState, Avatar} from '@components/ui';
import {
  Play, Pause, CheckCircle, XCircle, RotateCcw,
  Plus, X, Search, UserCheck, ClipboardList,
} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin, selectEmployeeId} from '@features/auth/authSlice';
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
import {useListEmployeesQuery} from '@features/employee/employeeApi';

// ── Constants ──────────────────────────────────────────────────────────────

const TASK_STATUS_LABEL = {
  TODO:         'To Do',
  IN_PROGRESS:  'In Progress',
  PAUSED:       'Paused',
  DONE:         'Pending Review',
  NEEDS_REWORK: 'Needs Rework',
  COMPLETED:    'Completed',
  CANCELLED:    'Cancelled',
};

const FILTERS = [
  {key: 'active', label: 'Active'},
  {key: 'review', label: 'Review'},
  {key: 'done',   label: 'Done'},
  {key: 'all',    label: 'All'},
];

const PRIORITY_COLOR = {HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', CRITICAL: '#8B5CF6'};

function filterTasks(tasks, filter) {
  switch (filter) {
    case 'active': return tasks.filter(t => ['TODO','IN_PROGRESS','PAUSED'].includes(t.status));
    case 'review': return tasks.filter(t => ['DONE','NEEDS_REWORK'].includes(t.status));
    case 'done':   return tasks.filter(t => t.status === 'COMPLETED');
    default:       return tasks;
  }
}

// ── Employee picker (used inside CreateTaskModal) ───────────────────────────

function EmpPickerSheet({visible, onClose, onSelect, selectedId}) {
  const colors = useColors();
  const [search, setSearch] = useState('');

  const {data: empData, isLoading} = useListEmployeesQuery({pageSize: 200}, {skip: !visible});
  const employees = Array.isArray(empData) ? empData : (empData?.items ?? []);
  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q),
    );
  }, [employees, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.pickerSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.pickerHeader}>
            <AppText style={[styles.pickerTitle, {color: colors.text}]}>Assign To</AppText>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.pickerSearch, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
            <Search size={15} color={colors.textTertiary} />
            <TextInput
              style={[styles.pickerSearchInput, {color: colors.text}]}
              value={search} onChangeText={setSearch}
              placeholder="Search employee…"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none" autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <View style={styles.pickerCenter}><Spinner size="small" /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={e => e.id}
              style={styles.pickerList}
              renderItem={({item}) => {
                const name = `${item.firstName} ${item.lastName}`;
                const isChosen = selectedId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item); onClose(); }}
                    style={[styles.pickerRow, {borderBottomColor: colors.border}, isChosen && {backgroundColor: colors.primaryLight}]}
                    activeOpacity={0.7}>
                    <Avatar name={name} size="sm" />
                    <View style={{flex: 1}}>
                      <AppText style={[styles.pickerRowName, {color: colors.text}]}>{name}</AppText>
                      {item.position && (
                        <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>{item.position}</AppText>
                      )}
                    </View>
                    {isChosen && <UserCheck size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <AppText style={[styles.pickerEmpty, {color: colors.textSecondary}]}>
                  No employees found
                </AppText>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Create Task Modal ──────────────────────────────────────────────────────

export function CreateTaskModal({visible, onClose, onSave, saving, canAssign, defaultAssigneeId}) {
  const colors  = useColors();
  const myEmpId = useAppSelector(selectEmployeeId);

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [assignedEmp,  setAssignedEmp]  = useState(null);
  const [dueAt,        setDueAt]        = useState('');
  const [notes,        setNotes]        = useState('');
  const [empPicker,    setEmpPicker]    = useState(false);

  // Reset on open
  React.useEffect(() => {
    if (visible) {
      setTitle(''); setDescription(''); setAssignedEmp(null);
      setDueAt(''); setNotes('');
    }
  }, [visible]);

  function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Task title is required.'); return; }
    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToId: canAssign ? (assignedEmp?.id ?? defaultAssigneeId ?? undefined) : myEmpId ?? undefined,
      dueAt: dueAt.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(body);
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
          <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
            <View style={styles.sheetHeader}>
              <AppText style={[styles.sheetTitle, {color: colors.text}]}>New Task</AppText>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>TITLE *</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={title} onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
              />

              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DESCRIPTION</AppText>
              <TextInput
                style={[styles.textInput, styles.textArea, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={description} onChangeText={setDescription}
                placeholder="Add details…"
                placeholderTextColor={colors.textTertiary}
                multiline numberOfLines={3}
              />

              {/* Assign To — shown only if user can assign to others */}
              {canAssign && (
                <>
                  <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>ASSIGN TO</AppText>
                  <TouchableOpacity
                    onPress={() => setEmpPicker(true)}
                    style={[styles.assigneeBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                    {assignedEmp ? (
                      <View style={styles.assigneeRow}>
                        <Avatar name={`${assignedEmp.firstName} ${assignedEmp.lastName}`} size="xs" />
                        <AppText style={[styles.assigneeName, {color: colors.text}]}>
                          {assignedEmp.firstName} {assignedEmp.lastName}
                        </AppText>
                      </View>
                    ) : (
                      <AppText style={[styles.assigneePlaceholder, {color: colors.textTertiary}]}>
                        Select employee (optional)
                      </AppText>
                    )}
                    <AppText style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semiBold}}>
                      {assignedEmp ? 'Change' : 'Select'}
                    </AppText>
                  </TouchableOpacity>
                </>
              )}

              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DUE DATE (OPTIONAL)</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={dueAt} onChangeText={setDueAt}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />

              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>NOTES</AppText>
              <TextInput
                style={[styles.textInput, styles.textArea, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={notes} onChangeText={setNotes}
                placeholder="Any additional notes…"
                placeholderTextColor={colors.textTertiary}
                multiline numberOfLines={3}
              />

              <Button
                label={saving ? 'Creating…' : 'Create Task'}
                variant="primary" fullWidth loading={saving} onPress={handleSave}
                style={{marginTop: spacing[4], marginBottom: spacing[8]}}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <EmpPickerSheet
        visible={empPicker}
        onClose={() => setEmpPicker(false)}
        onSelect={setAssignedEmp}
        selectedId={assignedEmp?.id}
      />
    </>
  );
}

// ── Report Issue Modal ────────────────────────────────────────────────────

function ReportIssueModal({visible, taskTitle, onClose, onSubmit, loading}) {
  const colors = useColors();
  const [note, setNote] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.centeredOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}
        activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalBox, {backgroundColor: colors.surface}]}>
          <AppText variant="h4" style={{marginBottom: spacing[1]}}>Report Issue</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{marginBottom: spacing[3]}}>
            {taskTitle}
          </AppText>
          <TextInput
            value={note} onChangeText={setNote}
            placeholder="Describe the issue (optional)"
            placeholderTextColor={colors.textTertiary}
            multiline numberOfLines={4}
            style={[styles.noteInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" variant="secondary" size="sm" onPress={onClose} style={{flex: 1}} />
            <Button label="Submit" variant="danger" size="sm" loading={loading}
              onPress={() => { onSubmit(note); setNote(''); }} style={{flex: 1}} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────

function TaskCard({task, canManage, myEmpId}) {
  const colors     = useColors();
  const [issueModal, setIssueModal] = useState(false);

  const [startTask,    {isLoading: starting}]   = useStartTaskMutation();
  const [pauseTask,    {isLoading: pausing}]    = usePauseTaskMutation();
  const [doneTask,     {isLoading: submitting}] = useDoneTaskMutation();
  const [complete,     {isLoading: completing}] = useCompleteTaskMutation();
  const [reportIssue,  {isLoading: reporting}]  = useReportIssueTaskMutation();
  const [restart,      {isLoading: restarting}] = useRestartTaskMutation();

  const isMyTask = task.assignedToId === myEmpId;

  async function act(fn, label) {
    try { await fn().unwrap(); }
    catch (e) { Alert.alert(label, e?.data?.error?.message ?? 'Something went wrong'); }
  }

  const {status} = task;
  const priorityColor = PRIORITY_COLOR[task.priority];

  return (
    <Card style={styles.taskCard} padding={spacing[4]}>
      {priorityColor && <View style={[styles.priorityStrip, {backgroundColor: priorityColor}]} />}

      <View style={styles.taskHeader}>
        <AppText variant="bodyMedium" style={{flex: 1, paddingLeft: priorityColor ? spacing[1] : 0}} numberOfLines={2}>
          {task.title}
        </AppText>
        <Badge status={status} label={TASK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ')} size="sm" />
      </View>

      <View style={styles.taskMeta}>
        {task.project?.name && (
          <AppText variant="caption" color={colors.textSecondary}>📁 {task.project.name}</AppText>
        )}
        {/* Show assignee name if canManage (admin/manager sees all tasks) */}
        {canManage && task.assignedTo && (
          <AppText variant="caption" color={colors.textSecondary}>
            👤 {task.assignedTo.firstName} {task.assignedTo.lastName}
          </AppText>
        )}
        {task.dueAt && (
          <AppText variant="caption" color={colors.textSecondary}>
            📅 Due {new Date(task.dueAt).toLocaleDateString('en-AU', {day: 'numeric', month: 'short'})}
          </AppText>
        )}
        {/* Legacy field name support */}
        {!task.dueAt && task.dueDate && (
          <AppText variant="caption" color={colors.textSecondary}>
            📅 Due {new Date(task.dueDate).toLocaleDateString('en-AU', {day: 'numeric', month: 'short'})}
          </AppText>
        )}
      </View>

      {status === 'NEEDS_REWORK' && task.issueNote && (
        <View style={[styles.issueNote, {backgroundColor: colors.errorLight, borderColor: '#EF4444'}]}>
          <AppText variant="caption" color={colors.error}>⚠ {task.issueNote}</AppText>
        </View>
      )}

      {/* Employee actions — only for assignee */}
      <View style={styles.actions}>
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

        {/* Manager actions — only for users with tasks.manage */}
        {canManage && status === 'DONE' && (<>
          <Button label="Approve ✓" variant="primary" size="sm" loading={completing}
            onPress={() => act(() => complete(task.id), 'Complete Failed')} />
          <Button label="Issue ✗" variant="danger" size="sm"
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
        onSubmit={async note => {
          try {
            await reportIssue({id: task.id, note}).unwrap();
            setIssueModal(false);
          } catch (e) {
            Alert.alert('Error', e?.data?.error?.message ?? 'Something went wrong');
          }
        }}
        loading={reporting}
      />
    </Card>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();

  const isAdmin        = useAppSelector(selectIsAdmin);
  const canViewTasks   = useAppSelector(selectHasPerm('tasks.view'));
  const canManageTasks = useAppSelector(selectHasPerm('tasks.manage'));
  const myEmpId        = useAppSelector(selectEmployeeId);

  // Everyone can create tasks (self-assign); tasks.manage = can also assign to others
  const canAssignToOthers = isAdmin || canManageTasks;
  // tasks.view or admin = sees all tasks (backend scopes automatically)
  const canManage = isAdmin || canManageTasks;

  const [filter,     setFilter]     = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const {data, isLoading, refetch} = useListTasksQuery({pageSize: 100});
  const [createTask, {isLoading: creating}] = useCreateTaskMutation();

  const allTasks = Array.isArray(data) ? data : (data?.items ?? []);
  const filtered = filterTasks(allTasks, filter);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleCreateTask(body) {
    try {
      await createTask(body).unwrap();
      setCreateOpen(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not create task.');
    }
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Header — "+" rendered via rightAction prop so it sits inside the header row */}
      <AppHeader
        title="Tasks"
        rightAction={
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Filter tabs */}
      <View style={[styles.filterBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterTab, filter === f.key && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}>
            <AppText variant="label" color={filter === f.key ? colors.primary : colors.textSecondary}>
              {f.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {isLoading ? (
          <View style={styles.centered}><Spinner /></View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={44} color={colors.primary} />}
            title="No tasks"
            description={
              filter === 'all'
                ? 'Create your first task using the + button above.'
                : `No ${filter} tasks right now.`
            }
          />
        ) : (
          filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManage}
              myEmpId={myEmpId}
            />
          ))
        )}
      </ScrollView>

      <CreateTaskModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreateTask}
        saving={creating}
        canAssign={canAssignToOthers}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    {flex: 1},

  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
  },

  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[3],
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  content:  {padding: spacing[4], gap: spacing[3]},
  centered: {paddingTop: spacing[10], alignItems: 'center'},

  // Task card
  taskCard:      {position: 'relative', overflow: 'hidden', gap: spacing[2]},
  priorityStrip: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3},
  taskHeader:    {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2]},
  taskMeta:      {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingLeft: spacing[1]},
  issueNote:     {padding: spacing[2], borderRadius: radius.sm, borderWidth: 1, marginTop: spacing[1]},
  actions:       {flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', marginTop: spacing[1]},

  // Report issue modal
  centeredOverlay: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6]},
  modalBox:        {width: '100%', borderRadius: radius.xl, padding: spacing[5]},
  noteInput: {
    borderWidth: 1, borderRadius: radius.md, padding: spacing[3],
    minHeight: 90, fontSize: fontSize.sm, textAlignVertical: 'top',
    marginBottom: spacing[3],
  },
  modalActions: {flexDirection: 'row', gap: spacing[3]},

  // Create task modal
  overlay:    {flex: 1, justifyContent: 'flex-end'},
  sheet:      {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '90%'},
  sheetHeader:{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  sheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},

  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: spacing[1], marginTop: spacing[3],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm,
  },
  textArea: {height: 80, textAlignVertical: 'top'},

  assigneeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  assigneeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},
  assigneeName:{fontSize: fontSize.sm, fontWeight: fontWeight.medium},
  assigneePlaceholder:{fontSize: fontSize.sm},

  // Employee picker sheet
  pickerSheet:      {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '75%'},
  pickerHeader:     {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3]},
  pickerTitle:      {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  pickerSearch:     {flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[2]},
  pickerSearchInput:{flex: 1, fontSize: fontSize.sm, padding: 0},
  pickerList:       {maxHeight: 320},
  pickerRow:        {flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[2], borderBottomWidth: 1},
  pickerRowName:    {fontSize: fontSize.sm, fontWeight: fontWeight.medium},
  pickerCenter:     {paddingVertical: spacing[6], alignItems: 'center'},
  pickerEmpty:      {textAlign: 'center', padding: spacing[4], fontSize: fontSize.sm},
});
