import React, {useState, useMemo} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Plus, Edit2, Trash2, Users, Search, X, ChevronDown, ChevronRight} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin, selectCanManage} from '@features/auth/authSlice';
import {AppText, Card, Button, Badge, Spinner, EmptyState, Avatar} from '@components/ui';
import {
  useListEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '@features/employee/employeeApi';
import {useListDepartmentsQuery, useListOrgRolesQuery} from '@features/admin/adminApi';
import {formatDate, formatCurrency} from '@utils/format';

// ── Constants ──────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  {code: 'FULL_TIME',   name: 'Full-time'},
  {code: 'PART_TIME',   name: 'Part-time'},
  {code: 'CASUAL',      name: 'Casual'},
  {code: 'CONTRACTOR',  name: 'Contractor'},
];

const AU_STATES = [
  {code: 'NSW', name: 'New South Wales'},
  {code: 'VIC', name: 'Victoria'},
  {code: 'QLD', name: 'Queensland'},
  {code: 'WA',  name: 'Western Australia'},
  {code: 'SA',  name: 'South Australia'},
  {code: 'TAS', name: 'Tasmania'},
  {code: 'ACT', name: 'Australian Capital Territory'},
  {code: 'NT',  name: 'Northern Territory'},
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function empTypeName(code) {
  return EMPLOYMENT_TYPES.find(t => t.code === code)?.name ?? code;
}

// ── Field components ─────────────────────────────────────────────────────────

function FieldLabel({children}) {
  const colors = useColors();
  return (
    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>
      {children}
    </AppText>
  );
}

function StyledInput({value, onChangeText, ...props}) {
  const colors = useColors();
  return (
    <TextInput
      style={[styles.textInput, {
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        color: colors.text,
      }]}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={colors.textTertiary}
      {...props}
    />
  );
}

function InlineDropdown({label, value, options, keyProp = 'code', labelProp = 'name', onChange, placeholder = 'Select…'}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o[keyProp] === value)?.[labelProp] ?? placeholder;

  return (
    <View style={styles.dropdownWrap}>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        style={[styles.dropdownBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}
        onPress={() => setOpen(v => !v)}>
        <AppText style={[styles.dropdownText, {color: value ? colors.text : colors.textTertiary}]}>
          {selectedLabel}
        </AppText>
        <ChevronDown size={15} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          {options.map(o => (
            <TouchableOpacity
              key={o[keyProp]}
              onPress={() => {onChange(o[keyProp]); setOpen(false);}}
              style={[styles.dropdownOption, {borderBottomColor: colors.border}]}>
              <AppText style={[styles.dropdownOptionText, {
                color: o[keyProp] === value ? colors.primary : colors.text,
                fontWeight: o[keyProp] === value ? fontWeight.semiBold : fontWeight.regular,
              }]}>
                {o[labelProp]}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ChipSelector({label, options, value, onChange}) {
  const colors = useColors();
  return (
    <View style={styles.dropdownWrap}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.chipRow}>
        {options.map(o => {
          const active = value === o.code;
          return (
            <TouchableOpacity
              key={o.code}
              onPress={() => onChange(o.code)}
              style={[styles.chip, {
                borderColor:       active ? colors.primary : colors.border,
                backgroundColor:   active ? colors.primaryLight : colors.surface,
              }]}>
              <AppText style={[styles.chipText, {color: active ? colors.primary : colors.textSecondary}]}>
                {o.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Employee form modal ──────────────────────────────────────────────────────

function EmpFormModal({initial, departments, orgRoles, onClose, onSave, saving}) {
  const colors = useColors();
  const isEdit = !!initial;

  const [firstName,      setFirstName]      = useState(initial?.firstName ?? '');
  const [lastName,       setLastName]       = useState(initial?.lastName  ?? '');
  const [email,          setEmail]          = useState(initial?.email     ?? '');
  const [employeeNumber, setEmployeeNumber] = useState(initial?.employeeNumber ?? '');
  const [employmentType, setEmploymentType] = useState(initial?.employmentType ?? 'CASUAL');
  const [baseHourlyRate, setBaseHourlyRate] = useState(initial?.baseHourlyRate != null ? String(initial.baseHourlyRate) : '');
  const [startDate,      setStartDate]      = useState(initial?.startDate ? initial.startDate.split('T')[0] : '');
  const [endDate,        setEndDate]        = useState(initial?.endDate   ? initial.endDate.split('T')[0]   : '');
  const [departmentId,   setDepartmentId]   = useState(initial?.departmentId ?? '');
  const [orgRoleId,      setOrgRoleId]      = useState(initial?.orgRoleId ?? '');
  const [state,          setState]          = useState(initial?.state ?? '');
  const [password,       setPassword]       = useState('');

  const deptOptions = [{code: '', name: 'No department'}, ...(departments ?? []).map(d => ({code: d.id, name: d.name}))];
  const roleOptions = [{code: '', name: 'No role'},       ...(orgRoles  ?? []).map(r => ({code: r.id, name: r.name}))];
  const stateOptions = [{code: '', name: 'Select state'}, ...AU_STATES];

  function handleSave() {
    if (!firstName.trim())      { Alert.alert('Required', 'First name is required.');  return; }
    if (!lastName.trim())       { Alert.alert('Required', 'Last name is required.');   return; }
    if (!email.trim())          { Alert.alert('Required', 'Email is required.');       return; }
    if (!employeeNumber.trim()) { Alert.alert('Required', 'Employee # is required.');  return; }
    const rate = parseFloat(baseHourlyRate);
    if (!baseHourlyRate || isNaN(rate) || rate <= 0) {
      Alert.alert('Required', 'A valid hourly rate is required.'); return;
    }
    const body = {
      firstName:      firstName.trim(),
      lastName:       lastName.trim(),
      email:          email.trim().toLowerCase(),
      employeeNumber: employeeNumber.trim(),
      employmentType,
      baseHourlyRate: rate,
      startDate:      startDate || undefined,
      endDate:        endDate   || undefined,
      departmentId:   departmentId || null,
      orgRoleId:      orgRoleId    || null,
      state:          state || undefined,
    };
    if (!isEdit && password.trim()) body.password = password.trim();
    onSave(body);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>
              {isEdit ? 'Edit Employee' : 'Add Employee'}
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>PERSONAL</AppText>
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>FIRST NAME *</FieldLabel>
                <StyledInput value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
              </View>
              <View style={{flex: 1}}>
                <FieldLabel>LAST NAME *</FieldLabel>
                <StyledInput value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
              </View>
            </View>
            <FieldLabel>EMAIL *</FieldLabel>
            <StyledInput value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <FieldLabel>EMPLOYEE # *</FieldLabel>
            <StyledInput value={employeeNumber} onChangeText={setEmployeeNumber} placeholder="e.g. EMP-001" autoCapitalize="characters" />

            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>EMPLOYMENT</AppText>
            <ChipSelector
              label="TYPE *"
              options={EMPLOYMENT_TYPES}
              value={employmentType}
              onChange={setEmploymentType}
            />
            <FieldLabel>BASE HOURLY RATE ($) *</FieldLabel>
            <StyledInput
              value={baseHourlyRate}
              onChangeText={setBaseHourlyRate}
              placeholder="e.g. 28.50"
              keyboardType="decimal-pad"
            />
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>START DATE</FieldLabel>
                <StyledInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
              {isEdit && (
                <View style={{flex: 1}}>
                  <FieldLabel>END DATE</FieldLabel>
                  <StyledInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
                </View>
              )}
            </View>

            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>ORGANISATION</AppText>
            <InlineDropdown
              label="DEPARTMENT"
              value={departmentId}
              options={deptOptions}
              onChange={setDepartmentId}
              placeholder="No department"
            />
            <InlineDropdown
              label="ROLE"
              value={orgRoleId}
              options={roleOptions}
              onChange={setOrgRoleId}
              placeholder="No role"
            />
            <InlineDropdown
              label="STATE"
              value={state}
              options={stateOptions}
              onChange={setState}
              placeholder="Select state"
            />

            {!isEdit && (
              <>
                <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>PORTAL ACCESS (OPTIONAL)</AppText>
                <AppText style={[styles.hint, {color: colors.textTertiary}]}>
                  Set a password so this employee can log in immediately. Leave blank to skip.
                </AppText>
                <FieldLabel>PASSWORD</FieldLabel>
                <StyledInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                />
              </>
            )}

            <Button
              label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
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

// ── Employee card ─────────────────────────────────────────────────────────────

function EmpCard({emp, canEdit, canDelete, onPress, onEdit, onDelete}) {
  const colors = useColors();
  const name   = `${emp.firstName} ${emp.lastName}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.empCard}>
        <Avatar name={name} size="md" />
        <View style={styles.empInfo}>
          <View style={styles.empTop}>
            <AppText style={[styles.empName, {color: colors.text}]} numberOfLines={1}>{name}</AppText>
            <Badge status={emp.employmentType} label={empTypeName(emp.employmentType)} size="sm" />
          </View>
          <AppText style={[styles.empEmail, {color: colors.textSecondary}]} numberOfLines={1}>
            {emp.email ?? '—'}
          </AppText>
          <View style={styles.empMeta}>
            <AppText style={[styles.empNum, {color: colors.textTertiary}]}>
              #{emp.employeeNumber}
            </AppText>
            {emp.department && (
              <View style={styles.dotLabel}>
                <View style={[styles.colorDot, {backgroundColor: emp.department.color ?? colors.primary}]} />
                <AppText style={[styles.dotText, {color: colors.textSecondary}]}>
                  {emp.department.name}
                </AppText>
              </View>
            )}
            {emp.orgRole && (
              <View style={styles.dotLabel}>
                <View style={[styles.colorDot, {backgroundColor: emp.orgRole.color ?? colors.info}]} />
                <AppText style={[styles.dotText, {color: colors.textSecondary}]}>
                  {emp.orgRole.name}
                </AppText>
              </View>
            )}
          </View>
          <AppText style={[styles.empRate, {color: colors.textTertiary}]}>
            {formatCurrency(emp.baseHourlyRate)} / hr
          </AppText>
        </View>

        <View style={styles.empActions}>
          <ChevronRight size={14} color={colors.textTertiary} />
        </View>

        {(canEdit || canDelete) && (
          <View style={styles.actionBtns}>
            {canEdit && (
              <TouchableOpacity
                onPress={e => { e.stopPropagation?.(); onEdit(); }}
                style={[styles.iconBtn, {backgroundColor: colors.primaryLight}]}>
                <Edit2 size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={e => { e.stopPropagation?.(); onDelete(); }}
                style={[styles.iconBtn, {backgroundColor: colors.errorLight ?? '#FEE2E2'}]}>
                <Trash2 size={13} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EmployeesScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const isAdmin    = useAppSelector(selectIsAdmin);
  const canManage  = useAppSelector(selectCanManage);

  const canCreate = isAdmin;
  const canEdit   = isAdmin || canManage;
  const canDelete = isAdmin;

  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null); // {mode:'create'} | {mode:'edit', emp}
  const [refreshing,  setRefreshing]  = useState(false);

  const {data, isLoading, refetch}    = useListEmployeesQuery({pageSize: 200});
  const {data: departments = []}      = useListDepartmentsQuery(undefined, {skip: !canEdit});
  const {data: orgRoles = []}         = useListOrgRolesQuery(undefined,    {skip: !canEdit});

  const [createEmp, {isLoading: creating}] = useCreateEmployeeMutation();
  const [updateEmp, {isLoading: updating}] = useUpdateEmployeeMutation();
  const [deleteEmp]                        = useDeleteEmployeeMutation();

  const employees = Array.isArray(data) ? data : (data?.items ?? []);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.employeeNumber?.toLowerCase().includes(q),
    );
  }, [employees, search]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSave(body) {
    try {
      if (modal.mode === 'create') await createEmp(body).unwrap();
      else await updateEmp({id: modal.emp.id, ...body}).unwrap();
      setModal(null);
    } catch (err) {
      Alert.alert('Error', err?.data?.error?.message ?? err?.data ?? 'Could not save employee.');
    }
  }

  function confirmDelete(emp) {
    Alert.alert(
      `Remove ${emp.firstName}?`,
      'This will soft-delete the employee record. Attendance history is retained.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: async () => {
          try { await deleteEmp(emp.id).unwrap(); }
          catch (e) { Alert.alert('Error', e?.data?.error?.message ?? 'Could not delete.'); }
        }},
      ],
    );
  }

  function openEdit(emp) {
    setModal({mode: 'edit', emp});
  }

  const deptList = Array.isArray(departments) ? departments : (departments?.items ?? []);
  const roleList = Array.isArray(orgRoles)    ? orgRoles    : (orgRoles?.items ?? []);

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
          <AppText style={[styles.headerTitle, {color: colors.text}]}>Employees</AppText>
          <AppText style={[styles.headerSub, {color: colors.textSecondary}]}>
            {employees.length > 0 ? `${employees.length} total` : 'Team members'}
          </AppText>
        </View>
        {canCreate && (
          <TouchableOpacity
            onPress={() => setModal({mode: 'create'})}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <Search size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, {color: colors.text}]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, employee #…"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : filtered.length === 0 ? (
        <View style={[styles.center, {paddingBottom: insets.bottom + spacing[4]}]}>
          <EmptyState
            icon={<Users size={44} color={colors.primary} />}
            title={search ? 'No results' : 'No employees yet'}
            description={
              search
                ? `No employees matching "${search}"`
                : canCreate ? 'Add your first employee to get started.' : 'No employees in your organisation yet.'
            }
          />
          {!search && canCreate && (
            <Button
              label="Add Employee"
              variant="primary"
              onPress={() => setModal({mode: 'create'})}
              style={{marginTop: spacing[4]}}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({item}) => (
            <EmpCard
              emp={item}
              canEdit={canEdit}
              canDelete={canDelete}
              onPress={() => navigation.navigate('EmployeeDetail', {id: item.id})}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
        />
      )}

      {modal && (
        <EmpFormModal
          initial={modal.emp}
          departments={deptList}
          orgRoles={roleList}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={creating || updating}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingBottom: spacing[4],
    borderBottomWidth: 1, gap: spacing[3],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  backBtn:     {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  headerSub:   {fontSize: fontSize.xs, marginTop: 1},
  addBtn:      {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    gap: spacing[2], borderBottomWidth: 1,
  },
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},

  list: {padding: spacing[4]},

  // Employee card
  empCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: spacing[4], gap: spacing[3],
  },
  empInfo:    {flex: 1, minWidth: 0, gap: spacing[1]},
  empTop:     {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2]},
  empName:    {flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  empEmail:   {fontSize: fontSize.xs},
  empMeta:    {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], alignItems: 'center'},
  empNum:     {fontSize: fontSize.xs},
  dotLabel:   {flexDirection: 'row', alignItems: 'center', gap: 4},
  colorDot:   {width: 7, height: 7, borderRadius: 4},
  dotText:    {fontSize: fontSize.xs},
  empRate:    {fontSize: fontSize.xs, marginTop: 2},
  empActions: {justifyContent: 'center'},
  actionBtns: {flexDirection: 'column', gap: spacing[1], alignSelf: 'flex-start'},
  iconBtn:    {width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},

  // Modal
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0, maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[4],
  },
  sheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  closeBtn:   {padding: spacing[2]},

  sectionDivider: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: spacing[4], marginBottom: spacing[2],
  },
  formRow: {flexDirection: 'row', gap: spacing[3]},
  hint:    {fontSize: 11, marginBottom: spacing[2]},

  // Field components
  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm, marginBottom: spacing[3],
  },

  // Dropdown
  dropdownWrap:       {marginBottom: spacing[3]},
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  dropdownText: {fontSize: fontSize.sm, flex: 1},
  dropdownList: {
    borderWidth: 1, borderRadius: radius.md,
    marginTop: spacing[1], overflow: 'hidden', zIndex: 10,
  },
  dropdownOption:     {paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1},
  dropdownOptionText: {fontSize: fontSize.sm},

  // Chips
  chipRow:  {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  chip:     {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  chipText: {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},
});
