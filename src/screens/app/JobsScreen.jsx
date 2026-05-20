import React, {useState, useMemo, useEffect} from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Modal, TextInput,
  TouchableOpacity, RefreshControl, FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Plus, X, Search, UserCheck, Briefcase, MapPin, Calendar, Clock,
  AlertCircle, Edit3, Trash2, ChevronRight,
} from 'lucide-react-native';
import {AppHeader} from '@components/common';
import {AppText, Card, Button, Badge, Spinner, EmptyState, Avatar} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin} from '@features/auth/authSlice';
import {
  useListJobsQuery, useCreateJobMutation,
  useUpdateJobMutation, useDeleteJobMutation,
} from '@features/job/jobApi';
import {useListEmployeesQuery} from '@features/employee/employeeApi';

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  {value: 'PENDING',     label: 'Pending'},
  {value: 'ASSIGNED',    label: 'Assigned'},
  {value: 'IN_PROGRESS', label: 'In Progress'},
  {value: 'COMPLETED',   label: 'Completed'},
  {value: 'CANCELLED',   label: 'Cancelled'},
];

const PRIORITY_OPTS = [
  {value: 'LOW',    label: 'Low'},
  {value: 'MEDIUM', label: 'Medium'},
  {value: 'HIGH',   label: 'High'},
  {value: 'URGENT', label: 'Urgent'},
];

const TYPE_OPTS = [
  {value: 'GENERAL',      label: 'General'},
  {value: 'INSPECTION',   label: 'Inspection'},
  {value: 'DELIVERY',     label: 'Delivery'},
  {value: 'INSTALLATION', label: 'Installation'},
  {value: 'MAINTENANCE',  label: 'Maintenance'},
  {value: 'SALES_VISIT',  label: 'Sales Visit'},
  {value: 'SUPPORT',      label: 'Support'},
];

const AU_STATE_OPTS = [
  {value: '',    label: '— State —'},
  {value: 'NSW', label: 'NSW'}, {value: 'VIC', label: 'VIC'},
  {value: 'QLD', label: 'QLD'}, {value: 'WA',  label: 'WA' },
  {value: 'SA',  label: 'SA' }, {value: 'TAS', label: 'TAS'},
  {value: 'ACT', label: 'ACT'}, {value: 'NT',  label: 'NT' },
];

const PRIORITY_COLOR = {
  LOW: '#10B981', MEDIUM: '#3B82F6', HIGH: '#F59E0B', URGENT: '#EF4444',
};

const STATUS_MAP = {
  PENDING: 'DRAFT', ASSIGNED: 'IN_PROGRESS', IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED',
};

const STATUS_LABEL = {
  PENDING: 'Pending', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

const TYPE_LABEL = {
  GENERAL: 'General', INSPECTION: 'Inspection', DELIVERY: 'Delivery',
  INSTALLATION: 'Installation', MAINTENANCE: 'Maintenance',
  SALES_VISIT: 'Sales Visit', SUPPORT: 'Support',
};

const FILTERS = [
  {key: '',            label: 'All'},
  {key: 'PENDING',     label: 'Pending'},
  {key: 'ASSIGNED',    label: 'Assigned'},
  {key: 'IN_PROGRESS', label: 'Active'},
  {key: 'COMPLETED',   label: 'Done'},
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year: 'numeric'});
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-AU', {day: 'numeric', month: 'short'});
  const time = d.toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit'});
  return `${date}, ${time}`;
}

function toISOInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0, 16);
}

// ── Employee picker ───────────────────────────────────────────────────────

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
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>Assign To</AppText>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBox, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
            <Search size={15} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, {color: colors.text}]}
              value={search} onChangeText={setSearch}
              placeholder="Search employee…"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none" autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <View style={styles.centered}><Spinner size="small" /></View>
          ) : (
            <FlatList
              data={[{id: '__unassigned__', firstName: 'Unassigned', lastName: ''}, ...filtered]}
              keyExtractor={e => e.id}
              style={{maxHeight: 320}}
              renderItem={({item}) => {
                const isUnassigned = item.id === '__unassigned__';
                const name = isUnassigned ? 'Unassigned' : `${item.firstName} ${item.lastName}`;
                const isChosen = isUnassigned ? !selectedId : selectedId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(isUnassigned ? null : item); onClose(); }}
                    style={[styles.pickerRow, {borderBottomColor: colors.border}, isChosen && {backgroundColor: colors.primaryLight}]}
                    activeOpacity={0.7}>
                    {!isUnassigned && <Avatar name={name} size="sm" />}
                    {isUnassigned && <View style={[styles.unassignedDot, {backgroundColor: colors.surfaceAlt}]} />}
                    <View style={{flex: 1}}>
                      <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text}}>{name}</AppText>
                      {!isUnassigned && item.position && (
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

// ── Option picker (for status/priority/type/state) ───────────────────────

function OptionPicker({visible, onClose, title, options, selectedValue, onSelect}) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.fadeOverlay, {backgroundColor: colors.overlay}]}
        activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.optBox, {backgroundColor: colors.surface}]}>
          <AppText style={[styles.sheetTitle, {color: colors.text, marginBottom: spacing[3]}]}>{title}</AppText>
          {options.map(opt => {
            const isActive = selectedValue === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onSelect(opt.value); onClose(); }}
                style={[styles.optRow, {borderBottomColor: colors.border}, isActive && {backgroundColor: colors.primaryLight}]}>
                <AppText style={{flex: 1, fontSize: fontSize.sm, color: colors.text}}>{opt.label}</AppText>
                {isActive && <UserCheck size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Job form (create + edit) ─────────────────────────────────────────────

function JobFormSheet({visible, onClose, onSave, saving, initial, isEdit}) {
  const colors  = useColors();
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [jobType,      setJobType]      = useState('GENERAL');
  const [priority,     setPriority]     = useState('MEDIUM');
  const [status,       setStatus]       = useState('PENDING');
  const [address,      setAddress]      = useState('');
  const [suburb,       setSuburb]       = useState('');
  const [auState,      setAuState]      = useState('');
  const [postcode,     setPostcode]     = useState('');
  const [scheduledAt,  setScheduledAt]  = useState('');
  const [dueAt,        setDueAt]        = useState('');
  const [assignedEmp,  setAssignedEmp]  = useState(null);
  const [notes,        setNotes]        = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [empPicker,    setEmpPicker]    = useState(false);
  const [typePicker,   setTypePicker]   = useState(false);
  const [prioPicker,   setPrioPicker]   = useState(false);
  const [statusPicker, setStatusPicker] = useState(false);
  const [statePicker,  setStatePicker]  = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isEdit && initial) {
      setTitle(initial.title ?? '');
      setDescription(initial.description ?? '');
      setJobType(initial.jobType ?? 'GENERAL');
      setPriority(initial.priority ?? 'MEDIUM');
      setStatus(initial.status ?? 'PENDING');
      setAddress(initial.address ?? '');
      setSuburb(initial.suburb ?? '');
      setAuState(initial.state ?? '');
      setPostcode(initial.postcode ?? '');
      setScheduledAt(toISOInput(initial.scheduledAt));
      setDueAt(toISOInput(initial.dueAt));
      setAssignedEmp(initial.assignedTo ?? null);
      setNotes(initial.notes ?? '');
      setCompletionNotes(initial.completionNotes ?? '');
    } else {
      setTitle(''); setDescription(''); setJobType('GENERAL');
      setPriority('MEDIUM'); setStatus('PENDING');
      setAddress(''); setSuburb(''); setAuState(''); setPostcode('');
      setScheduledAt(''); setDueAt(''); setAssignedEmp(null);
      setNotes(''); setCompletionNotes('');
    }
  }, [visible, isEdit, initial]);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Required', 'Job title is required.');
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      jobType, priority,
      ...(isEdit ? {status} : {}),
      address:  address.trim()  || undefined,
      suburb:   suburb.trim()   || undefined,
      state:    auState         || undefined,
      postcode: postcode.trim() || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      dueAt:       dueAt       ? new Date(dueAt).toISOString()       : undefined,
      assignedToId: assignedEmp?.id ?? null,
      notes: notes.trim() || undefined,
      ...(isEdit ? {completionNotes: completionNotes.trim() || undefined} : {}),
    };
    onSave(body);
  }

  const typeLabel  = TYPE_OPTS.find(o => o.value === jobType)?.label ?? jobType;
  const prioLabel  = PRIORITY_OPTS.find(o => o.value === priority)?.label ?? priority;
  const statLabel  = STATUS_OPTS.find(o => o.value === status)?.label ?? status;
  const stateLabel = AU_STATE_OPTS.find(o => o.value === auState)?.label ?? '— State —';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
          <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
            <View style={styles.sheetHeader}>
              <AppText style={[styles.sheetTitle, {color: colors.text}]}>
                {isEdit ? 'Edit Job' : 'New Job'}
              </AppText>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>JOB TITLE *</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={title} onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.textTertiary}
              />

              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DESCRIPTION / INSTRUCTIONS</AppText>
              <TextInput
                style={[styles.textInput, styles.textArea, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={description} onChangeText={setDescription}
                placeholder="Add details…"
                placeholderTextColor={colors.textTertiary}
                multiline numberOfLines={3}
              />

              <View style={styles.row2}>
                <View style={{flex: 1}}>
                  <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>TYPE</AppText>
                  <TouchableOpacity
                    onPress={() => setTypePicker(true)}
                    style={[styles.selectBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                    <AppText style={{color: colors.text, fontSize: fontSize.sm}}>{typeLabel}</AppText>
                    <ChevronRight size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{flex: 1}}>
                  <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>PRIORITY</AppText>
                  <TouchableOpacity
                    onPress={() => setPrioPicker(true)}
                    style={[styles.selectBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                    <View style={[styles.prioDot, {backgroundColor: PRIORITY_COLOR[priority]}]} />
                    <AppText style={{color: colors.text, fontSize: fontSize.sm, flex: 1}}>{prioLabel}</AppText>
                    <ChevronRight size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {isEdit && (
                <>
                  <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>STATUS</AppText>
                  <TouchableOpacity
                    onPress={() => setStatusPicker(true)}
                    style={[styles.selectBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                    <AppText style={{color: colors.text, fontSize: fontSize.sm, flex: 1}}>{statLabel}</AppText>
                    <ChevronRight size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </>
              )}

              <AppText style={[styles.sectionLabel, {color: colors.textSecondary}]}>SITE ADDRESS</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={address} onChangeText={setAddress}
                placeholder="Street address"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, marginTop: spacing[2]}]}
                value={suburb} onChangeText={setSuburb}
                placeholder="Suburb"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={[styles.row2, {marginTop: spacing[2]}]}>
                <TouchableOpacity
                  onPress={() => setStatePicker(true)}
                  style={[styles.selectBtn, {flex: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                  <AppText style={{color: colors.text, fontSize: fontSize.sm, flex: 1}}>{stateLabel}</AppText>
                  <ChevronRight size={14} color={colors.textTertiary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, {flex: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, marginTop: 0}]}
                  value={postcode} onChangeText={setPostcode}
                  placeholder="Postcode"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <AppText style={[styles.sectionLabel, {color: colors.textSecondary}]}>SCHEDULE</AppText>
              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>SCHEDULED DATE/TIME</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={scheduledAt} onChangeText={setScheduledAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={colors.textTertiary}
              />
              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DUE DATE/TIME</AppText>
              <TextInput
                style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={dueAt} onChangeText={setDueAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={colors.textTertiary}
              />

              <AppText style={[styles.sectionLabel, {color: colors.textSecondary}]}>ASSIGNMENT</AppText>
              <TouchableOpacity
                onPress={() => setEmpPicker(true)}
                style={[styles.assigneeBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                {assignedEmp ? (
                  <View style={styles.assigneeRow}>
                    <Avatar name={`${assignedEmp.firstName} ${assignedEmp.lastName}`} size="xs" />
                    <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text}}>
                      {assignedEmp.firstName} {assignedEmp.lastName}
                    </AppText>
                  </View>
                ) : (
                  <AppText style={{fontSize: fontSize.sm, color: colors.textTertiary}}>
                    Unassigned — tap to assign
                  </AppText>
                )}
                <AppText style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semiBold}}>
                  {assignedEmp ? 'Change' : 'Select'}
                </AppText>
              </TouchableOpacity>

              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>PRE-JOB NOTES</AppText>
              <TextInput
                style={[styles.textInput, styles.textArea, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                value={notes} onChangeText={setNotes}
                placeholder="Any additional notes…"
                placeholderTextColor={colors.textTertiary}
                multiline numberOfLines={3}
              />

              {isEdit && (
                <>
                  <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>COMPLETION NOTES</AppText>
                  <TextInput
                    style={[styles.textInput, styles.textArea, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
                    value={completionNotes} onChangeText={setCompletionNotes}
                    placeholder="What was done…"
                    placeholderTextColor={colors.textTertiary}
                    multiline numberOfLines={3}
                  />
                </>
              )}

              <Button
                label={saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Job')}
                variant="primary" fullWidth loading={saving} onPress={handleSave}
                style={{marginTop: spacing[4], marginBottom: spacing[8]}}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <EmpPickerSheet visible={empPicker} onClose={() => setEmpPicker(false)} onSelect={setAssignedEmp} selectedId={assignedEmp?.id} />
      <OptionPicker  visible={typePicker}  onClose={() => setTypePicker(false)}  title="Job Type" options={TYPE_OPTS}     selectedValue={jobType}  onSelect={setJobType} />
      <OptionPicker  visible={prioPicker}  onClose={() => setPrioPicker(false)}  title="Priority" options={PRIORITY_OPTS} selectedValue={priority} onSelect={setPriority} />
      <OptionPicker  visible={statusPicker} onClose={() => setStatusPicker(false)} title="Status"  options={STATUS_OPTS}   selectedValue={status}   onSelect={setStatus} />
      <OptionPicker  visible={statePicker} onClose={() => setStatePicker(false)} title="State"   options={AU_STATE_OPTS} selectedValue={auState}  onSelect={setAuState} />
    </>
  );
}

// ── Job detail modal ────────────────────────────────────────────────────

function JobDetailModal({job, onClose, onEdit, onDelete, canManage}) {
  const colors = useColors();
  if (!job) return null;

  const siteAddress = [job.address, job.suburb, job.state, job.postcode].filter(Boolean).join(', ');
  const overdue = job.status !== 'COMPLETED' && job.dueAt && new Date(job.dueAt) < new Date();

  return (
    <Modal visible={!!job} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text, flex: 1}]} numberOfLines={2}>
              {job.title}
            </AppText>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.badgeRow}>
              <Badge status={STATUS_MAP[job.status]} label={STATUS_LABEL[job.status] ?? job.status} size="sm" />
              <View style={[styles.prioBadge, {backgroundColor: PRIORITY_COLOR[job.priority] + '22'}]}>
                <View style={[styles.prioDot, {backgroundColor: PRIORITY_COLOR[job.priority]}]} />
                <AppText style={{fontSize: 10, fontWeight: fontWeight.bold, color: PRIORITY_COLOR[job.priority], textTransform: 'uppercase', letterSpacing: 0.5}}>
                  {job.priority}
                </AppText>
              </View>
              <View style={[styles.typeBadge, {backgroundColor: colors.primaryLight}]}>
                <AppText style={{fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5}}>
                  {TYPE_LABEL[job.jobType] ?? job.jobType}
                </AppText>
              </View>
            </View>

            {job.description && (
              <AppText style={{color: colors.text, lineHeight: 22, marginBottom: spacing[4]}}>
                {job.description}
              </AppText>
            )}

            <DetailRow label="Assigned to" value={
              job.assignedTo
                ? `${job.assignedTo.firstName} ${job.assignedTo.lastName}`
                : 'Unassigned'
            } />
            <DetailRow label="Site address" value={siteAddress || '—'} />
            <DetailRow label="Scheduled"    value={fmtDateTime(job.scheduledAt)} />
            <DetailRow
              label="Due by"
              value={fmtDate(job.dueAt)}
              valueColor={overdue ? colors.error : undefined}
              warn={overdue}
            />
            <DetailRow label="Started"     value={fmtDateTime(job.startedAt)} />
            <DetailRow label="Completed"   value={fmtDateTime(job.completedAt)} />
            {job.notes && <DetailRow label="Notes" value={job.notes} multiline />}
            {job.completionNotes && <DetailRow label="Completion notes" value={job.completionNotes} multiline />}
            <DetailRow label="Created by"  value={job.assignedBy?.fullName ?? '—'} />
            <DetailRow label="Created"     value={fmtDate(job.createdAt)} />

            {canManage && (
              <View style={[styles.actionsRow, {marginTop: spacing[4], marginBottom: spacing[8]}]}>
                <Button label="Edit Job" variant="primary" fullWidth onPress={() => { onClose(); onEdit(job); }}
                  iconLeft={<Edit3 size={14} color="#fff" />} />
                <Button label="Delete" variant="danger" onPress={() => onDelete(job)}
                  iconLeft={<Trash2 size={14} color="#fff" />} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({label, value, valueColor, warn, multiline}) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, {borderTopColor: colors.border}]}>
      <AppText style={[styles.detailLabel, {color: colors.textSecondary}]}>{label}</AppText>
      <View style={{flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1]}}>
        <AppText
          style={{
            flex: 1,
            fontSize: fontSize.sm,
            color: valueColor ?? colors.text,
            fontWeight: warn ? fontWeight.semiBold : fontWeight.regular,
          }}
          numberOfLines={multiline ? undefined : 3}>
          {value}
        </AppText>
        {warn && <AlertCircle size={14} color={colors.error} />}
      </View>
    </View>
  );
}

// ── Job card (list item) ────────────────────────────────────────────────

function JobCard({job, onPress}) {
  const colors = useColors();
  const overdue = job.status !== 'COMPLETED' && job.dueAt && new Date(job.dueAt) < new Date();
  const location = [job.suburb, job.state].filter(Boolean).join(', ');

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(job)}>
      <Card style={styles.jobCard} padding={spacing[4]}>
        <View style={[styles.prioStrip, {backgroundColor: PRIORITY_COLOR[job.priority] ?? colors.border}]} />

        <View style={{flex: 1, gap: spacing[2], paddingLeft: spacing[2]}}>
          <View style={styles.jobHeader}>
            <AppText style={[styles.jobTitle, {color: colors.text, flex: 1}]} numberOfLines={1}>
              {job.title}
            </AppText>
            <Badge status={STATUS_MAP[job.status]} label={STATUS_LABEL[job.status] ?? job.status} size="sm" />
          </View>

          <View style={styles.metaRow}>
            <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semiBold}}>
              {TYPE_LABEL[job.jobType] ?? job.jobType}
            </AppText>
            {location ? (
              <>
                <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary}}>·</AppText>
                <View style={styles.metaItem}>
                  <MapPin size={11} color={colors.textSecondary} />
                  <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>{location}</AppText>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {job.assignedTo ? (
              <View style={styles.metaItem}>
                <Avatar name={`${job.assignedTo.firstName} ${job.assignedTo.lastName}`} size="xs" />
                <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>
                  {job.assignedTo.firstName} {job.assignedTo.lastName}
                </AppText>
              </View>
            ) : (
              <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, fontStyle: 'italic'}}>
                Unassigned
              </AppText>
            )}
            {job.scheduledAt && (
              <View style={styles.metaItem}>
                <Clock size={11} color={colors.textSecondary} />
                <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>
                  {fmtDateTime(job.scheduledAt)}
                </AppText>
              </View>
            )}
            {job.dueAt && (
              <View style={styles.metaItem}>
                <Calendar size={11} color={overdue ? colors.error : colors.textSecondary} />
                <AppText style={{
                  fontSize: fontSize.xs,
                  color: overdue ? colors.error : colors.textSecondary,
                  fontWeight: overdue ? fontWeight.semiBold : fontWeight.regular,
                }}>
                  Due {fmtDate(job.dueAt)}{overdue ? ' ⚠' : ''}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────

export default function JobsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();

  const isAdmin     = useAppSelector(selectIsAdmin);
  const canManage   = useAppSelector(selectHasPerm('jobs.manage')) || isAdmin;

  const [filter,       setFilter]      = useState('');
  const [refreshing,   setRefreshing]  = useState(false);
  const [createOpen,   setCreateOpen]  = useState(false);
  const [editTarget,   setEditTarget]  = useState(null);
  const [viewTarget,   setViewTarget]  = useState(null);

  const {data, isLoading, refetch} = useListJobsQuery({
    pageSize: 50,
    ...(filter ? {status: filter} : {}),
  });

  const [createJob, {isLoading: creating}] = useCreateJobMutation();
  const [updateJob, {isLoading: updating}] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();

  const jobs = Array.isArray(data) ? data : (data?.items ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleCreate(body) {
    try {
      await createJob(body).unwrap();
      setCreateOpen(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not create job.');
    }
  }

  async function handleUpdate(body) {
    if (!editTarget) return;
    try {
      await updateJob({id: editTarget.id, ...body}).unwrap();
      setEditTarget(null);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not update job.');
    }
  }

  function handleDelete(job) {
    Alert.alert(
      'Delete Job',
      `Delete "${job.title}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteJob(job.id).unwrap();
              setViewTarget(null);
            } catch (e) {
              Alert.alert('Error', e?.data?.error?.message ?? 'Could not delete job.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Jobs"
        rightAction={canManage && (
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      />

      {/* Filter pills */}
      <View style={[styles.filterBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: spacing[2], paddingHorizontal: spacing[4]}}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key || 'all'}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterPill,
                  {borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent'},
                ]}>
                <AppText style={{
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semiBold,
                  color: active ? '#fff' : colors.textSecondary,
                }}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {isLoading ? (
          <View style={styles.centered}><Spinner /></View>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={44} color={colors.primary} />}
            title="No jobs yet"
            description={canManage
              ? 'Create a job to dispatch field work to your team.'
              : 'No jobs have been assigned to you yet.'}
          />
        ) : (
          jobs.map(j => <JobCard key={j.id} job={j} onPress={setViewTarget} />)
        )}
      </ScrollView>

      {/* Create */}
      <JobFormSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        saving={creating}
        isEdit={false}
      />

      {/* Edit */}
      <JobFormSheet
        visible={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        saving={updating}
        initial={editTarget}
        isEdit={true}
      />

      {/* Detail */}
      <JobDetailModal
        job={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={setEditTarget}
        onDelete={handleDelete}
        canManage={canManage}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},

  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto',
  },

  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: spacing[3],
  },
  filterPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 1,
  },

  content:  {padding: spacing[4], gap: spacing[3]},
  centered: {paddingTop: spacing[10], alignItems: 'center'},

  // Job card
  jobCard: {position: 'relative', flexDirection: 'row', overflow: 'hidden'},
  prioStrip: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3},
  jobHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2]},
  jobTitle:  {fontSize: fontSize.md, fontWeight: fontWeight.semiBold},
  metaRow:   {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2]},
  metaItem:  {flexDirection: 'row', alignItems: 'center', gap: 4},

  // Detail modal
  badgeRow:    {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3]},
  prioBadge:   {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999},
  typeBadge:   {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999},
  prioDot:     {width: 6, height: 6, borderRadius: 3},
  detailRow:   {flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2], borderTopWidth: 1, gap: spacing[3]},
  detailLabel: {width: 110, fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, textTransform: 'uppercase', letterSpacing: 0.4},
  actionsRow:  {flexDirection: 'row', gap: spacing[2]},

  // Form sheet
  overlay:     {flex: 1, justifyContent: 'flex-end'},
  fadeOverlay: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5]},
  sheet:       {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '92%'},
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4], gap: spacing[2]},
  sheetTitle:  {fontSize: fontSize.lg, fontWeight: fontWeight.bold},

  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: spacing[1], marginTop: spacing[3],
  },
  sectionLabel: {
    fontSize: 11, fontWeight: fontWeight.bold,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: spacing[5], marginBottom: spacing[1],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm, marginTop: spacing[1],
  },
  textArea: {minHeight: 80, textAlignVertical: 'top'},

  row2: {flexDirection: 'row', gap: spacing[2], alignItems: 'flex-end'},

  selectBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    gap: spacing[2], marginTop: spacing[1],
  },

  assigneeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    marginTop: spacing[1],
  },
  assigneeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},

  // Picker sheets
  pickerSheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '75%'},
  searchBox:   {flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[2]},
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},
  pickerRow:   {flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[2], borderBottomWidth: 1},
  pickerEmpty: {textAlign: 'center', padding: spacing[4], fontSize: fontSize.sm},
  unassignedDot: {width: 32, height: 32, borderRadius: 16},

  // Option picker
  optBox: {width: '100%', maxWidth: 360, borderRadius: radius.xl, padding: spacing[5], maxHeight: '70%'},
  optRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[2], borderBottomWidth: 1},
});
