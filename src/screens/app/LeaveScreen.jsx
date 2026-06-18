import React, {useState, useMemo} from 'react';
import {View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@components/common';
import {AppText, Card, Button, Badge, EmptyState, Spinner, DateField, Avatar} from '@components/ui';
import {Umbrella, Plus, X, ChevronDown, Search} from 'lucide-react-native';
import {spacing, radius, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatDate} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectEmployeeId, selectHasPerm, selectCanManage} from '@features/auth/authSlice';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {
  useGetLeaveBalanceQuery, useApplyLeaveMutation,
  useListLeaveQuery, useReviewLeaveMutation,
} from '@features/leave/leaveApi';

const LEAVE_TYPES = [
  {value: 'ANNUAL',        label: 'Annual Leave'},
  {value: 'PERSONAL',      label: 'Personal / Sick Leave'},
  {value: 'COMPASSIONATE', label: 'Compassionate Leave'},
  {value: 'LONG_SERVICE',  label: 'Long Service'},
  {value: 'PARENTAL',      label: 'Parental'},
  {value: 'UNPAID',        label: 'Unpaid'},
  {value: 'OTHER',         label: 'Other'},
];

const STATUS_FILTERS = [
  {code: '',         name: 'All'},
  {code: 'PENDING',  name: 'Pending'},
  {code: 'APPROVED', name: 'Approved'},
  {code: 'REJECTED', name: 'Rejected'},
];

function getLeaveColor(type, colors) {
  const map = {
    ANNUAL: colors.success, SICK: colors.info,
    PERSONAL: colors.warning, COMPASSIONATE: colors.error,
  };
  return map[type] ?? colors.textSecondary;
}

// ── Balance card ───────────────────────────────────────────────────────────

function BalanceCard({type, label, hoursAvailable, hoursTaken}) {
  const colors = useColors();
  const color  = getLeaveColor(type, colors);
  const negative = hoursAvailable != null && hoursAvailable < 0;
  const round1 = n => Math.round(n * 10) / 10;
  return (
    <Card style={styles.balanceCard}>
      <View style={[styles.balanceDot, {backgroundColor: negative ? colors.error : color}]} />
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>{label}</AppText>
      <AppText style={[styles.balanceHours, {color: negative ? colors.error : color}]}>
        {hoursAvailable != null ? `${round1(hoursAvailable)}h` : '—'}
      </AppText>
      <AppText variant="caption" color={colors.textTertiary}>
        available{hoursTaken != null && hoursTaken > 0 ? ` · ${round1(hoursTaken)}h taken` : ''}
      </AppText>
    </Card>
  );
}

// ── Leave request card ─────────────────────────────────────────────────────

function LeaveRequestCard({item, canApprove, onReview, reviewing}) {
  const colors    = useColors();
  const color     = getLeaveColor(item.type, colors);
  const name      = `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim();
  const isPending = item.status === 'PENDING';
  return (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestWho}>
          {name ? <Avatar name={name} uri={item.employee?.user?.avatarUrl} size="sm" /> : null}
          <View style={{flex: 1, minWidth: 0}}>
            {name ? (
              <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}} numberOfLines={1}>
                {name}
              </AppText>
            ) : null}
            <AppText variant="caption" style={{color, fontWeight: fontWeight.semiBold}}>
              {LEAVE_TYPES.find(t => t.value === item.type)?.label ?? item.type}
            </AppText>
          </View>
        </View>
        <Badge status={item.status} size="sm" />
      </View>
      <AppText style={[styles.requestDates, {color: colors.text}]}>
        {formatDate(item.startDate)} → {formatDate(item.endDate)}
      </AppText>
      {item.reason ? (
        <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
          {item.reason}
        </AppText>
      ) : null}
      {canApprove && isPending && (
        <View style={styles.approvalActions}>
          <TouchableOpacity
            onPress={() => onReview(item, 'REJECTED')}
            disabled={reviewing}
            style={[styles.reviewBtn, {borderColor: colors.error, backgroundColor: colors.error + '12'}]}>
            <AppText style={{color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold}}>Reject</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReview(item, 'APPROVED')}
            disabled={reviewing}
            style={[styles.reviewBtn, {borderColor: colors.success, backgroundColor: colors.success}]}>
            <AppText style={{color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semiBold}}>Approve</AppText>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

// ── Apply modal ────────────────────────────────────────────────────────────

function ApplyModal({visible, onClose, canManage}) {
  const colors = useColors();
  const [type, setType]       = useState('ANNUAL');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd]     = useState('');
  const [reason, setReason]   = useState('');
  const [portion, setPortion] = useState('FULL'); // FULL | HALF
  const [showPicker, setPicker] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null); // null = self
  const [empOpen, setEmpOpen]     = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [applyLeave, {isLoading}] = useApplyLeaveMutation();

  // Managers/owner can file leave on behalf of an employee.
  const {data: empDataRaw} = useListEmployeesQuery({pageSize: 200}, {skip: !visible || !canManage});
  const filteredEmps = useMemo(() => {
    const emps = Array.isArray(empDataRaw) ? empDataRaw : (empDataRaw?.items ?? []);
    if (!empSearch.trim()) return emps;
    const q = empSearch.toLowerCase();
    return emps.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q));
  }, [empDataRaw, empSearch]);

  function resetForm() {
    setStart(''); setEnd(''); setReason(''); setType('ANNUAL'); setPortion('FULL');
    setSelectedEmp(null); setEmpOpen(false); setEmpSearch(''); setPicker(false);
  }

  async function handleSubmit() {
    if (!startDate || !endDate) {
      Alert.alert('Missing Fields', 'Please select both start and end dates.');
      return;
    }
    // Hours are computed server-side from business days × per-day hours × portion.
    try {
      await applyLeave({
        type, startDate, endDate, dayPortion: portion,
        reason: reason.trim() || undefined,
        ...(selectedEmp ? {employeeId: selectedEmp.id} : {}),
      }).unwrap();
      onClose();
      resetForm();
    } catch (err) {
      Alert.alert('Failed', err.data ?? 'Could not submit leave request.');
    }
  }

  const selectedLabel = LEAVE_TYPES.find(t => t.value === type)?.label ?? type;

  const inputStyle = [
    styles.textInput,
    {borderColor: colors.border, backgroundColor: colors.background, color: colors.text},
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, {color: colors.text}]}>Apply for Leave</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Employee — managers/owner can file leave on behalf of someone */}
          {canManage && (
            <>
              <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>EMPLOYEE</AppText>
              <TouchableOpacity
                style={[styles.pickerBtn, {borderColor: colors.border, backgroundColor: colors.background}]}
                onPress={() => setEmpOpen(o => !o)}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1, minWidth: 0}}>
                  {selectedEmp ? <Avatar name={`${selectedEmp.firstName} ${selectedEmp.lastName}`} size="xs" /> : null}
                  <AppText style={{color: colors.text, fontSize: fontSize.sm}} numberOfLines={1}>
                    {selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Myself'}
                  </AppText>
                </View>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {empOpen && (
                <View style={[styles.pickerList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                  <View style={[styles.empSearchRow, {borderBottomColor: colors.border}]}>
                    <Search size={14} color={colors.textTertiary} />
                    <TextInput
                      style={{flex: 1, fontSize: fontSize.sm, color: colors.text, padding: 0}}
                      value={empSearch} onChangeText={setEmpSearch}
                      placeholder="Search employee…" placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none" autoCorrect={false}
                    />
                  </View>
                  <ScrollView style={{maxHeight: 200}} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    <TouchableOpacity
                      onPress={() => { setSelectedEmp(null); setEmpOpen(false); setEmpSearch(''); }}
                      style={[styles.empOption, {borderBottomColor: colors.border}]}>
                      <AppText style={{flex: 1, fontSize: fontSize.sm, color: !selectedEmp ? colors.primary : colors.text}}>Myself</AppText>
                    </TouchableOpacity>
                    {filteredEmps.map(e => (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() => { setSelectedEmp(e); setEmpOpen(false); setEmpSearch(''); }}
                        style={[styles.empOption, {borderBottomColor: colors.border}, selectedEmp?.id === e.id && {backgroundColor: colors.primaryLight}]}>
                        <Avatar name={`${e.firstName} ${e.lastName}`} size="xs" />
                        <AppText style={{flex: 1, fontSize: fontSize.sm, color: selectedEmp?.id === e.id ? colors.primary : colors.text}} numberOfLines={1}>
                          {e.firstName} {e.lastName}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>LEAVE TYPE</AppText>
          <TouchableOpacity
            style={[styles.pickerBtn, {borderColor: colors.border, backgroundColor: colors.background}]}
            onPress={() => setPicker(v => !v)}>
            <AppText style={{color: colors.text, fontSize: fontSize.sm}}>{selectedLabel}</AppText>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showPicker && (
            <View style={[styles.pickerList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.pickerOption, {borderBottomColor: colors.border}]}
                  onPress={() => {setType(t.value); setPicker(false);}}>
                  <AppText style={{color: type === t.value ? colors.primary : colors.text, fontSize: fontSize.sm}}>
                    {t.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>START DATE</AppText>
          <DateField value={startDate} onChange={setStart} placeholder="Select start date" minimumDate={new Date()} />

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>END DATE</AppText>
          <DateField value={endDate} onChange={setEnd} placeholder="Select end date" minimumDate={startDate ? new Date(startDate) : new Date()} />

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>DAY PORTION</AppText>
          <View style={{flexDirection: 'row', gap: spacing[2]}}>
            {[{v: 'FULL', l: 'Full day'}, {v: 'HALF', l: 'Half day'}].map(o => (
              <TouchableOpacity
                key={o.v}
                onPress={() => setPortion(o.v)}
                style={{flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1, borderColor: portion === o.v ? colors.primary : colors.border, backgroundColor: portion === o.v ? colors.primary : colors.surfaceAlt}}>
                <AppText style={{color: portion === o.v ? '#fff' : colors.textSecondary, fontWeight: fontWeight.semiBold, fontSize: fontSize.sm}}>{o.l}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <AppText style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing[1]}}>
            Hours auto-calculated from working days (weekends & public holidays excluded).
          </AppText>

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>REASON (OPTIONAL)</AppText>
          <TextInput style={[...inputStyle, styles.textArea]} placeholder="Brief reason..." placeholderTextColor={colors.textTertiary} value={reason} onChangeText={setReason} multiline numberOfLines={3} />

          <Button label="Submit Request" variant="primary" fullWidth loading={isLoading} onPress={handleSubmit} style={{marginTop: spacing[4]}} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function LeaveScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const [applyOpen, setApplyOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'mine' — only meaningful for approvers
  const employeeId = useAppSelector(selectEmployeeId);
  // OWNER/ADMIN (null permissions) and roles with leave.approve can review requests.
  const canApprove = useAppSelector(selectHasPerm('leave.approve'));
  // OWNER/ADMIN/MANAGER can file leave on behalf of an employee.
  const canManage  = useAppSelector(selectCanManage);

  const {data: balances, isLoading: balancesLoading, refetch: refetchBalances} = useGetLeaveBalanceQuery(employeeId, {skip: !employeeId});
  // Backend scopes EMPLOYEEs to their own; managers/owner get the whole org.
  const {data: leaveData, isLoading: leaveLoading, refetch: refetchLeave} = useListLeaveQuery({status: statusFilter || undefined, scope: canApprove ? scope : undefined});
  const [reviewLeave, {isLoading: reviewing}] = useReviewLeaveMutation();

  const requests = Array.isArray(leaveData) ? leaveData : (leaveData?.items ?? []);

  function handleReview(item, status) {
    const verb = status === 'APPROVED' ? 'Approve' : 'Reject';
    const who  = `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || 'this employee';
    Alert.alert(
      `${verb} leave?`,
      `${verb} ${who}'s leave request (${formatDate(item.startDate)} → ${formatDate(item.endDate)})?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: verb,
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await reviewLeave({id: item.id, status}).unwrap();
              refetchLeave();
              refetchBalances();
            } catch (e) {
              Alert.alert('Failed', e?.data ?? 'Could not update the request.');
            }
          },
        },
      ],
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchBalances(), refetchLeave()]);
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Leave" />
      <ApplyModal visible={applyOpen} onClose={() => setApplyOpen(false)} canManage={canManage} />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        <AppText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          LEAVE BALANCES
        </AppText>
        {balancesLoading ? (
          <Spinner size="small" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceScroll}>
            {Array.isArray(balances) && balances.length > 0 ? (
              balances.map(b => (
                <BalanceCard
                  key={b.type}
                  type={b.type}
                  label={LEAVE_TYPES.find(t => t.value === b.type)?.label ?? b.type}
                  hoursAvailable={b.hoursAvailable}
                  hoursTaken={b.hoursTaken}
                />
              ))
            ) : (
              <AppText variant="bodySmall" color={colors.textSecondary} style={{paddingLeft: spacing[4]}}>
                No balance data
              </AppText>
            )}
            <View style={{width: spacing[4]}} />
          </ScrollView>
        )}

        <Button
          label="Apply for Leave"
          variant="primary"
          fullWidth
          iconLeft={<Plus size={18} color={colors.white} />}
          onPress={() => setApplyOpen(true)}
          style={styles.applyBtn}
        />

        <AppText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          {canApprove && scope === 'all' ? 'LEAVE REQUESTS' : 'MY REQUESTS'}
        </AppText>

        {/* Mine / All — only approvers can see others' requests; everyone else is always "mine". */}
        {canApprove && (
          <View style={styles.scopeRow}>
            {[{k: 'all', label: 'All requests'}, {k: 'mine', label: 'My requests'}].map(o => {
              const active = scope === o.k;
              return (
                <TouchableOpacity key={o.k} onPress={() => setScope(o.k)}
                  style={[styles.scopeBtn, {backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border}]}>
                  <AppText style={{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, color: active ? '#fff' : colors.textSecondary}}>{o.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Status filter — mirrors the web (All / Pending / Approved / Rejected) */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.code;
            return (
              <TouchableOpacity
                key={f.code || 'all'}
                onPress={() => setStatusFilter(f.code)}
                style={[styles.filterChip, {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                }]}>
                <AppText style={{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, color: active ? '#fff' : colors.textSecondary}}>
                  {f.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {leaveLoading ? (
          <Spinner size="small" />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Umbrella size={44} color={colors.primary} />}
            title="No leave requests"
            description={canApprove ? 'Leave requests will appear here.' : 'Your leave requests will appear here.'}
          />
        ) : (
          <View style={styles.requestsList}>
            {requests.map(item => (
              <LeaveRequestCard
                key={item.id}
                item={item}
                canApprove={canApprove}
                onReview={handleReview}
                reviewing={reviewing}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: spacing[4]},
  sectionLabel: {marginBottom: spacing[3], marginTop: spacing[4], letterSpacing: 0.6},
  balanceScroll: {marginHorizontal: -spacing[4]},
  balanceCard: {width: 130, marginLeft: spacing[4], padding: spacing[4], gap: spacing[1], alignItems: 'flex-start'},
  balanceDot: {width: 8, height: 8, borderRadius: 4, marginBottom: spacing[1]},
  balanceHours: {fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, lineHeight: 30, marginTop: spacing[1]},
  applyBtn: {marginTop: spacing[5]},
  requestsList: {gap: spacing[3]},
  requestCard: {padding: spacing[4], gap: spacing[2]},
  requestHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2]},
  requestWho: {flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0},
  requestType: {paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full},
  requestDates: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  scopeRow: {flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3]},
  scopeBtn: {flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1},
  filterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3]},
  filterChip: {paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2, borderRadius: radius.full, borderWidth: 1},
  approvalHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[3]},
  approvalActions: {flexDirection: 'row', gap: spacing[2], marginTop: spacing[1]},
  reviewBtn: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1},
  // Modal
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet: {borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing[6], paddingBottom: spacing[8]},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[5]},
  modalTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  modalClose: {padding: spacing[2]},
  fieldLabel: {letterSpacing: 0.6, marginBottom: spacing[2], marginTop: spacing[3]},
  pickerBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3]},
  pickerList: {borderWidth: 1, borderRadius: radius.md, marginTop: spacing[1], overflow: 'hidden'},
  pickerOption: {paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1},
  empSearchRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderBottomWidth: 1},
  empOption: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1},
  textInput: {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm, marginBottom: spacing[2]},
  textArea: {height: 80, textAlignVertical: 'top'},
});
