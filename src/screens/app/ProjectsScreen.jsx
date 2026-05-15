import React, {useState, useMemo} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, ScrollView, RefreshControl, Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  ArrowLeft, Plus, Edit2, Trash2, ExternalLink, FolderOpen,
  X, ChevronDown, ChevronRight, Search, Users, Calendar,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin, selectCanManage, selectEmployeeId} from '@features/auth/authSlice';
import {AppText, Card, Button, Badge, Spinner, EmptyState, Avatar} from '@components/ui';
import {
  useListProjectsQuery, useCreateProjectMutation,
  useUpdateProjectMutation, useDeleteProjectMutation,
} from '@features/project/projectApi';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {formatDate} from '@utils/format';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  {code: 'ACTIVE',    name: 'Active'},
  {code: 'ON_HOLD',   name: 'On Hold'},
  {code: 'COMPLETED', name: 'Completed'},
  {code: 'ARCHIVED',  name: 'Archived'},
];

const PRIORITY_OPTS = [
  {code: 'LOW',      name: 'Low'},
  {code: 'MEDIUM',   name: 'Medium'},
  {code: 'HIGH',     name: 'High'},
  {code: 'CRITICAL', name: 'Critical'},
];

const PRIORITY_STYLE = {
  LOW:      {bg: '#ECFDF5', text: '#059669'},
  MEDIUM:   {bg: '#EFF6FF', text: '#1D4ED8'},
  HIGH:     {bg: '#FFF7ED', text: '#B45309'},
  CRITICAL: {bg: '#FEF2F2', text: '#DC2626'},
};

const STATUS_FILTER = [{code: '', name: 'All'}, ...STATUS_OPTS];

function fmtDate(iso) {
  if (!iso) return null;
  return dayjs(iso).format('D MMM YY');
}

function toPayload({name, description, priority, status, clientName, clientEmail, clientPhone,
  liveUrl, startDate, endDate, managerId, memberIds, tagsRaw}) {
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  return {
    name: name.trim(),
    description: description.trim() || undefined,
    priority, status,
    clientName:  clientName.trim()  || undefined,
    clientEmail: clientEmail.trim() || undefined,
    clientPhone: clientPhone.trim() || undefined,
    liveUrl:     liveUrl.trim()     || undefined,
    startDate:   startDate ? new Date(startDate).toISOString() : undefined,
    endDate:     endDate   ? new Date(endDate).toISOString()   : undefined,
    managerId:   managerId || undefined,
    memberIds:   memberIds.length ? memberIds : undefined,
    tags,
  };
}

// ── Shared form components ─────────────────────────────────────────────────────

function FieldLabel({children}) {
  const colors = useColors();
  return (
    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{children}</AppText>
  );
}

function StyledInput({value, onChangeText, style, ...props}) {
  const colors = useColors();
  return (
    <TextInput
      style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}, style]}
      value={value} onChangeText={onChangeText}
      placeholderTextColor={colors.textTertiary}
      {...props}
    />
  );
}

function InlineDropdown({label, value, options, onChange}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.code === value);
  return (
    <View style={styles.dropdownWrap}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <TouchableOpacity
        style={[styles.dropdownBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}
        onPress={() => setOpen(v => !v)}>
        <AppText style={[{fontSize: fontSize.sm, flex: 1}, {color: selected ? colors.text : colors.textTertiary}]}>
          {selected?.name ?? 'Select…'}
        </AppText>
        <ChevronDown size={15} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          {options.map(o => (
            <TouchableOpacity
              key={o.code}
              onPress={() => { onChange(o.code); setOpen(false); }}
              style={[styles.dropdownOption, {borderBottomColor: colors.border}]}>
              <AppText style={{
                fontSize: fontSize.sm,
                color: o.code === value ? colors.primary : colors.text,
                fontWeight: o.code === value ? fontWeight.semiBold : fontWeight.regular,
              }}>
                {o.name}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Employee multi-select ──────────────────────────────────────────────────────

function EmpMultiSelect({selectedIds, onChange, employees, label}) {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q));
  }, [employees, search]);

  function toggle(id) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(i => i !== id));
    else onChange([...selectedIds, id]);
  }

  return (
    <View>
      {label && <FieldLabel>{label}</FieldLabel>}
      <View style={[styles.empMulti, {borderColor: colors.border}]}>
        <View style={[styles.empMultiSearch, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
          <Search size={13} color={colors.textTertiary} />
          <TextInput
            style={[styles.empMultiInput, {color: colors.text}]}
            value={search} onChangeText={setSearch}
            placeholder="Search employees…"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
        </View>
        <ScrollView style={styles.empMultiList} nestedScrollEnabled>
          {filtered.map(e => {
            const name = `${e.firstName} ${e.lastName}`;
            const checked = selectedIds.includes(e.id);
            return (
              <TouchableOpacity
                key={e.id}
                onPress={() => toggle(e.id)}
                style={[styles.empMultiRow, {borderBottomColor: colors.border},
                  checked && {backgroundColor: colors.primaryLight}]}>
                <View style={[styles.checkbox, {
                  borderColor: checked ? colors.primary : colors.border,
                  backgroundColor: checked ? colors.primary : 'transparent',
                }]}>
                  {checked && <AppText style={{color: '#fff', fontSize: 10}}>✓</AppText>}
                </View>
                <Avatar name={name} size="xs" />
                <AppText style={{fontSize: fontSize.sm, color: colors.text, flex: 1}} numberOfLines={1}>{name}</AppText>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <AppText style={[{textAlign: 'center', padding: spacing[3], fontSize: fontSize.xs, color: colors.textSecondary}]}>
              No employees found
            </AppText>
          )}
        </ScrollView>
        {selectedIds.length > 0 && (
          <View style={[styles.empMultiSummary, {borderTopColor: colors.border}]}>
            <AppText style={{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, color: colors.textSecondary}}>
              {selectedIds.length} selected
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Priority badge ─────────────────────────────────────────────────────────────

function PriorityBadge({priority}) {
  const style = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.MEDIUM;
  return (
    <View style={[styles.priorityBadge, {backgroundColor: style.bg}]}>
      <AppText style={[styles.priorityText, {color: style.text}]}>{priority}</AppText>
    </View>
  );
}

// ── Project card ───────────────────────────────────────────────────────────────

function ProjectCard({project, canManage, onPress, onEdit, onDelete}) {
  const colors = useColors();
  const p = project;
  const stripColor = PRIORITY_STYLE[p.priority]?.text ?? '#6B7280';
  const startStr = fmtDate(p.startDate);
  const endStr   = fmtDate(p.endDate);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.projectCard} padding={0}>
        {/* Priority strip */}
        <View style={[styles.priorityStrip, {backgroundColor: stripColor}]} />

        <View style={styles.projectBody}>
          {/* Top row: name + actions */}
          <View style={styles.projectTop}>
            <View style={{flex: 1, minWidth: 0}}>
              <AppText style={[styles.projectName, {color: colors.text}]} numberOfLines={2}>
                {p.name}
              </AppText>
              {p.clientName && (
                <AppText style={[styles.projectClient, {color: colors.textSecondary}]} numberOfLines={1}>
                  {p.clientName}
                </AppText>
              )}
            </View>
            {canManage && (
              <View style={styles.projectActions}>
                <TouchableOpacity onPress={onEdit} style={[styles.iconBtn, {backgroundColor: colors.surfaceAlt}]}>
                  <Edit2 size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, {backgroundColor: '#FEF2F2'}]}>
                  <Trash2 size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Description */}
          {p.description ? (
            <AppText style={[styles.projectDesc, {color: colors.textSecondary}]} numberOfLines={2}>
              {p.description}
            </AppText>
          ) : null}

          {/* Meta row */}
          <View style={styles.projectMeta}>
            <PriorityBadge priority={p.priority} />
            <Badge status={p.status} label={STATUS_OPTS.find(s => s.code === p.status)?.name ?? p.status} size="sm" />
            {(startStr || endStr) && (
              <View style={styles.metaItem}>
                <Calendar size={11} color={colors.textTertiary} />
                <AppText style={[styles.metaText, {color: colors.textTertiary}]}>
                  {startStr ?? '?'} → {endStr ?? 'ongoing'}
                </AppText>
              </View>
            )}
            {p._count?.tasks !== undefined && (
              <AppText style={[styles.metaText, {color: colors.textTertiary}]}>
                {p._count.tasks} task{p._count.tasks !== 1 ? 's' : ''}
              </AppText>
            )}
          </View>

          {/* Manager */}
          {p.manager && (
            <View style={styles.metaItem}>
              <Avatar name={`${p.manager.firstName} ${p.manager.lastName}`} size="xs" />
              <AppText style={[styles.metaText, {color: colors.textSecondary}]}>
                {p.manager.firstName} {p.manager.lastName}
              </AppText>
            </View>
          )}

          {/* Live URL */}
          {p.liveUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(p.liveUrl).catch(() => {})}
              style={styles.metaItem}>
              <ExternalLink size={11} color={colors.primary} />
              <AppText style={[styles.metaText, {color: colors.primary}]} numberOfLines={1}>
                {p.liveUrl.replace(/^https?:\/\//, '')}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Project detail modal ───────────────────────────────────────────────────────

function ProjectDetailModal({project, onClose, canManage, onEdit}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  if (!project) return null;
  const p = project;

  const memberNames = (p.members ?? []).map(m => `${m.firstName} ${m.lastName}`).join(', ');

  const rows = [
    {label: 'Status',        value: <Badge status={p.status} label={STATUS_OPTS.find(s => s.code === p.status)?.name ?? p.status} />},
    {label: 'Priority',      value: <PriorityBadge priority={p.priority} />},
    {label: 'Description',   value: p.description || null, skip: !p.description},
    {label: 'Client',        value: p.clientName || null, skip: !p.clientName},
    {label: 'Client email',  value: p.clientEmail || null, skip: !p.clientEmail},
    {label: 'Client phone',  value: p.clientPhone || null, skip: !p.clientPhone},
    {label: 'Start date',    value: p.startDate ? dayjs(p.startDate).format('D MMM YYYY') : null, skip: !p.startDate},
    {label: 'End date',      value: p.endDate   ? dayjs(p.endDate).format('D MMM YYYY')   : null, skip: !p.endDate},
    {label: 'Manager',       value: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : null, skip: !p.manager},
    {label: 'Team',          value: memberNames || null, skip: !memberNames},
    {label: 'Tasks',         value: p._count?.tasks !== undefined ? String(p._count.tasks) : null, skip: p._count?.tasks === undefined},
    {label: 'Tags',          value: p.tags?.length ? p.tags.join(', ') : null, skip: !p.tags?.length},
    {label: 'Live URL',      value: p.liveUrl || null, isUrl: true, skip: !p.liveUrl},
    {label: 'Created by',    value: p.createdBy?.fullName || null, skip: !p.createdBy?.fullName},
    {label: 'Created',       value: p.createdAt ? dayjs(p.createdAt).format('D MMM YYYY') : null, skip: !p.createdAt},
  ].filter(r => !r.skip);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.detailOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.detailSheet, {backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing[4]}]}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View style={{flex: 1, minWidth: 0, gap: 4}}>
              <AppText style={[styles.detailTitle, {color: colors.text}]} numberOfLines={2}>
                {p.name}
              </AppText>
              {p.clientName && (
                <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>{p.clientName}</AppText>
              )}
            </View>
            <View style={{flexDirection: 'row', gap: spacing[2], flexShrink: 0}}>
              {canManage && (
                <TouchableOpacity
                  onPress={() => { onClose(); setTimeout(onEdit, 300); }}
                  style={[styles.detailHeaderBtn, {backgroundColor: colors.primaryLight, borderColor: colors.primary + '30'}]}>
                  <Edit2 size={15} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.detailHeaderBtn, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
                <X size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}>
            {rows.map(row => (
              <View key={row.label} style={[styles.detailRow, {borderBottomColor: colors.border}]}>
                <AppText style={[styles.detailRowLabel, {color: colors.textSecondary}]}>{row.label}</AppText>
                {React.isValidElement(row.value) ? (
                  <View style={{flex: 1}}>{row.value}</View>
                ) : row.isUrl ? (
                  <TouchableOpacity
                    style={{flex: 1}}
                    onPress={() => Linking.openURL(row.value).catch(() => {})}>
                    <AppText style={[styles.detailRowValue, {color: colors.primary}]} numberOfLines={2}>{row.value}</AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={[styles.detailRowValue, {color: colors.text, flex: 1}]} numberOfLines={4}>
                    {row.value}
                  </AppText>
                )}
              </View>
            ))}
            <View style={{height: spacing[4]}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Project form modal (create & edit) ────────────────────────────────────────

const BLANK_FORM = {
  name: '', description: '', priority: 'MEDIUM', status: 'ACTIVE',
  clientName: '', clientEmail: '', clientPhone: '', liveUrl: '',
  startDate: '', endDate: '', managerId: '', memberIds: [], tagsRaw: '',
};

function ProjectFormModal({title, initial, onClose, onSave, saving, employees}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState(initial ?? BLANK_FORM);

  function set(key, value) { setForm(f => ({...f, [key]: value})); }

  const managerOpts = [
    {code: '', name: '— None —'},
    ...employees.map(e => ({code: e.id, name: `${e.firstName} ${e.lastName}`})),
  ];

  function handleSave() {
    if (!form.name.trim()) { Alert.alert('Required', 'Project name is required.'); return; }
    onSave(toPayload(form));
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.formSheet, {backgroundColor: colors.surface, paddingBottom: insets.bottom}]}>
          <View style={styles.formHeader}>
            <AppText style={[styles.formTitle, {color: colors.text}]}>{title}</AppText>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Basic */}
            <FieldLabel>PROJECT NAME *</FieldLabel>
            <StyledInput value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Website Redesign" />

            <FieldLabel>DESCRIPTION</FieldLabel>
            <StyledInput value={form.description} onChangeText={v => set('description', v)}
              placeholder="Brief project overview…" multiline style={{height: 72, textAlignVertical: 'top'}} />

            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <InlineDropdown label="PRIORITY" value={form.priority}
                  options={PRIORITY_OPTS} onChange={v => set('priority', v)} />
              </View>
              <View style={{flex: 1}}>
                <InlineDropdown label="STATUS" value={form.status}
                  options={STATUS_OPTS} onChange={v => set('status', v)} />
              </View>
            </View>

            {/* Client */}
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary, borderTopColor: colors.border}]}>
              CLIENT
            </AppText>
            <FieldLabel>CLIENT NAME</FieldLabel>
            <StyledInput value={form.clientName} onChangeText={v => set('clientName', v)} placeholder="Company or individual name" />
            <FieldLabel>CLIENT EMAIL</FieldLabel>
            <StyledInput value={form.clientEmail} onChangeText={v => set('clientEmail', v)}
              placeholder="client@example.com" keyboardType="email-address" autoCapitalize="none" />
            <FieldLabel>CLIENT PHONE</FieldLabel>
            <StyledInput value={form.clientPhone} onChangeText={v => set('clientPhone', v)}
              placeholder="+61 4xx xxx xxx" keyboardType="phone-pad" />
            <FieldLabel>LIVE URL</FieldLabel>
            <StyledInput value={form.liveUrl} onChangeText={v => set('liveUrl', v)}
              placeholder="https://…" keyboardType="url" autoCapitalize="none" />

            {/* Timeline */}
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary, borderTopColor: colors.border}]}>
              TIMELINE
            </AppText>
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>START DATE</FieldLabel>
                <StyledInput value={form.startDate} onChangeText={v => set('startDate', v)}
                  placeholder="YYYY-MM-DD" />
              </View>
              <View style={{flex: 1}}>
                <FieldLabel>END DATE</FieldLabel>
                <StyledInput value={form.endDate} onChangeText={v => set('endDate', v)}
                  placeholder="YYYY-MM-DD" />
              </View>
            </View>

            {/* Team */}
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary, borderTopColor: colors.border}]}>
              TEAM
            </AppText>
            <InlineDropdown label="PROJECT MANAGER" value={form.managerId}
              options={managerOpts} onChange={v => set('managerId', v)} />

            <EmpMultiSelect
              label="TEAM MEMBERS"
              selectedIds={form.memberIds}
              onChange={v => set('memberIds', v)}
              employees={employees}
            />

            {/* Tags */}
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary, borderTopColor: colors.border}]}>
              OTHER
            </AppText>
            <FieldLabel>TAGS (COMMA-SEPARATED)</FieldLabel>
            <StyledInput value={form.tagsRaw} onChangeText={v => set('tagsRaw', v)}
              placeholder="e.g. web, design, urgent" />

            <Button
              label={saving ? 'Saving…' : title}
              variant="primary"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{marginTop: spacing[5], marginBottom: spacing[8]}}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  // All hooks called unconditionally — no short-circuit violations
  const isAdmin      = useAppSelector(selectIsAdmin);
  const canMgr       = useAppSelector(selectCanManage); // OWNER/ADMIN/MANAGER system role
  const hasProjMgmt  = useAppSelector(selectHasPerm('projects.manage'));
  const myEmployeeId = useAppSelector(selectEmployeeId);

  // See ALL projects:
  //   - OWNER/ADMIN (permissions=null) always see all
  //   - MANAGER system role sees all (mirrors web's canManageWorkforce gate)
  //   - explicit projects.viewAll or projects.manage permission
  const canViewAll = canMgr || useAppSelector(s => {
    const perms = s.auth.user?.permissions;
    if (perms == null) return true;
    return Array.isArray(perms) &&
      (perms.includes('projects.viewAll') || perms.includes('projects.manage'));
  });

  // Manage (create/edit/delete) requires explicit projects.manage OR OWNER/ADMIN.
  // MANAGER system role alone is NOT enough — they need the permission explicitly.
  const canManage = isAdmin || hasProjMgmt;

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [viewTarget,   setViewTarget]   = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);

  const {data, isLoading, refetch} = useListProjectsQuery({
    pageSize: 200,
    ...(statusFilter ? {status: statusFilter} : {}),
  });
  const {data: empData} = useListEmployeesQuery({pageSize: 200}, {skip: !canManage});

  const [createProject, {isLoading: creating}] = useCreateProjectMutation();
  const [updateProject, {isLoading: updating}] = useUpdateProjectMutation();
  const [deleteProject, {isLoading: deleting}] = useDeleteProjectMutation();

  const allProjects = Array.isArray(data) ? data : (data?.items ?? []);
  const employees   = Array.isArray(empData) ? empData : (empData?.items ?? []);

  // Employees only see projects they manage or are a member of
  const projects = useMemo(() => {
    if (canViewAll) return allProjects;
    return allProjects.filter(p =>
      p.managerId === myEmployeeId ||
      (Array.isArray(p.memberIds) && p.memberIds.includes(myEmployeeId)),
    );
  }, [allProjects, canViewAll, myEmployeeId]);

  const total = projects.length;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleCreate(payload) {
    try {
      await createProject(payload).unwrap();
      setShowCreate(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not create project.');
    }
  }

  async function handleUpdate(payload) {
    try {
      await updateProject({id: editTarget.id, ...payload}).unwrap();
      setEditTarget(null);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not update project.');
    }
  }

  function confirmDelete(project) {
    Alert.alert(
      `Delete "${project.name}"?`,
      'Tasks linked to this project will remain but will no longer be grouped.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteProject(project.id).unwrap(); }
          catch (e) { Alert.alert('Error', e?.data?.error?.message ?? 'Could not delete.'); }
        }},
      ],
    );
  }

  function openEdit(project) {
    setEditTarget({
      ...project,
      _initial: {
        name:        project.name ?? '',
        description: project.description ?? '',
        priority:    project.priority ?? 'MEDIUM',
        status:      project.status ?? 'ACTIVE',
        clientName:  project.clientName  ?? '',
        clientEmail: project.clientEmail ?? '',
        clientPhone: project.clientPhone ?? '',
        liveUrl:     project.liveUrl ?? '',
        startDate:   project.startDate ? dayjs(project.startDate).format('YYYY-MM-DD') : '',
        endDate:     project.endDate   ? dayjs(project.endDate).format('YYYY-MM-DD')   : '',
        managerId:   project.managerId ?? '',
        memberIds:   project.memberIds ?? (project.members?.map(m => m.id) ?? []),
        tagsRaw:     (project.tags ?? []).join(', '),
      },
    });
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + spacing[2],
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <AppText style={[styles.headerTitle, {color: colors.text}]}>Projects</AppText>
          <AppText style={[styles.headerSub, {color: colors.textSecondary}]}>
            {isLoading ? 'Loading…' : canViewAll ? `${total} total` : `${total} assigned`}
          </AppText>
        </View>
        {canManage && (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter chips */}
      <View style={[styles.filterWrap, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {STATUS_FILTER.map(s => {
            const active = statusFilter === s.code;
            return (
              <TouchableOpacity
                key={s.code}
                onPress={() => setStatusFilter(s.code)}
                style={[styles.chip, {
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderColor: active ? colors.primary : colors.border,
                }]}>
                <AppText style={[styles.chipText, {color: active ? '#fff' : colors.textSecondary}]}>
                  {s.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : projects.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<FolderOpen size={44} color={colors.primary} />}
            title="No projects"
            description={statusFilter
              ? (canViewAll ? 'No projects with this status.' : 'No assigned projects with this status.')
              : canManage
                ? 'Create your first project using the + button.'
                : 'You haven\'t been assigned to any projects yet.'}
          />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={p => p.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
          renderItem={({item}) => (
            <ProjectCard
              project={item}
              canManage={canManage}
              onPress={() => setViewTarget(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}

      {/* Detail modal */}
      {viewTarget && (
        <ProjectDetailModal
          project={viewTarget}
          canManage={canManage}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); openEdit(viewTarget); }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <ProjectFormModal
          title="Create Project"
          initial={{...BLANK_FORM}}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          saving={creating}
          employees={employees}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <ProjectFormModal
          title="Edit Project"
          initial={editTarget._initial}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          saving={updating}
          employees={employees}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

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
  addBtn:      {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},

  // Filter
  filterWrap:  {height: 48, borderBottomWidth: 1},
  filterChips: {paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], alignItems: 'center'},
  chip:        {paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, borderWidth: 1},
  chipText:    {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  // List
  list: {padding: spacing[4]},

  // Project card
  projectCard: {flexDirection: 'row', overflow: 'hidden'},
  priorityStrip: {width: 4, flexShrink: 0},
  projectBody: {flex: 1, padding: spacing[4], gap: spacing[2]},
  projectTop:  {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2]},
  projectName: {fontSize: fontSize.sm, fontWeight: fontWeight.bold, lineHeight: 20},
  projectClient:{fontSize: fontSize.xs, marginTop: 2},
  projectDesc: {fontSize: fontSize.xs, lineHeight: 16},
  projectActions:{flexDirection: 'row', gap: spacing[2], flexShrink: 0},
  projectMeta: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2]},
  iconBtn:     {width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  metaItem:    {flexDirection: 'row', alignItems: 'center', gap: 4},
  metaText:    {fontSize: 11},

  // Priority badge
  priorityBadge: {paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full},
  priorityText:  {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.4},

  // Detail modal
  detailOverlay: {flex: 1, justifyContent: 'flex-end'},
  detailSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingTop: spacing[5], paddingHorizontal: spacing[5],
  },
  detailHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4]},
  detailTitle:  {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  detailHeaderBtn: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
  detailRow:    {flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[3], borderBottomWidth: 1, gap: spacing[3]},
  detailRowLabel:{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, textTransform: 'uppercase', letterSpacing: 0.4, width: 90, paddingTop: 2},
  detailRowValue:{fontSize: fontSize.sm},

  // Form modal
  overlay:    {flex: 1, justifyContent: 'flex-end'},
  formSheet:  {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], maxHeight: '95%'},
  formHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  formTitle:  {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  formRow:    {flexDirection: 'row', gap: spacing[3], marginTop: spacing[3]},

  sectionDivider: {
    fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: spacing[5], marginBottom: spacing[2], paddingTop: spacing[4],
    borderTopWidth: 1,
  },

  // Field inputs
  fieldLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1], marginTop: spacing[3]},
  input:      {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm},

  // Dropdown
  dropdownWrap:   {marginTop: spacing[3]},
  dropdownBtn:    {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3]},
  dropdownList:   {borderWidth: 1, borderRadius: radius.md, marginTop: spacing[1], overflow: 'hidden'},
  dropdownOption: {paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1},

  // Emp multi-select
  empMulti:       {borderWidth: 1, borderRadius: radius.md, overflow: 'hidden', marginTop: spacing[1]},
  empMultiSearch: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1},
  empMultiInput:  {flex: 1, fontSize: fontSize.sm, padding: 0},
  empMultiList:   {maxHeight: 180},
  empMultiRow:    {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1},
  empMultiSummary:{borderTopWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2]},
  checkbox:       {width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
});
