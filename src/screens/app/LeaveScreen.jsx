import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput, Alert, RefreshControl} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppHeader} from '@components/common';
import {AppText, Card, Button, Badge, EmptyState, Spinner} from '@components/ui';
import {Umbrella, Plus, X, ChevronDown} from 'lucide-react-native';
import {spacing, radius, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatDate} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectEmployeeId} from '@features/auth/authSlice';
import {useGetLeaveBalanceQuery, useGetMyLeaveQuery, useApplyLeaveMutation} from '@features/leave/leaveApi';

const LEAVE_TYPES = [
  {value: 'ANNUAL',        label: 'Annual Leave'},
  {value: 'SICK',          label: 'Sick Leave'},
  {value: 'PERSONAL',      label: 'Personal Leave'},
  {value: 'COMPASSIONATE', label: 'Compassionate Leave'},
  {value: 'OTHER',         label: 'Other'},
];

function getLeaveColor(type, colors) {
  const map = {
    ANNUAL: colors.success, SICK: colors.info,
    PERSONAL: colors.warning, COMPASSIONATE: colors.error,
  };
  return map[type] ?? colors.textSecondary;
}

// ── Balance card ───────────────────────────────────────────────────────────

function BalanceCard({type, label, hoursAvailable}) {
  const colors = useColors();
  const color  = getLeaveColor(type, colors);
  return (
    <Card style={styles.balanceCard}>
      <View style={[styles.balanceDot, {backgroundColor: color}]} />
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>{label}</AppText>
      <AppText style={[styles.balanceHours, {color}]}>
        {hoursAvailable != null ? `${hoursAvailable}h` : '—'}
      </AppText>
      <AppText variant="caption" color={colors.textTertiary}>available</AppText>
    </Card>
  );
}

// ── Leave request card ─────────────────────────────────────────────────────

function LeaveRequestCard({item}) {
  const colors = useColors();
  const color  = getLeaveColor(item.type, colors);
  return (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={[styles.requestType, {backgroundColor: color + '18'}]}>
          <AppText variant="caption" style={{color, fontWeight: fontWeight.semiBold}}>
            {LEAVE_TYPES.find(t => t.value === item.type)?.label ?? item.type}
          </AppText>
        </View>
        <Badge status={item.status} />
      </View>
      <AppText style={[styles.requestDates, {color: colors.text}]}>
        {formatDate(item.startDate)} → {formatDate(item.endDate)}
      </AppText>
      {item.reason ? (
        <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
          {item.reason}
        </AppText>
      ) : null}
    </Card>
  );
}

// ── Apply modal ────────────────────────────────────────────────────────────

function ApplyModal({visible, onClose}) {
  const colors = useColors();
  const [type, setType]       = useState('ANNUAL');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd]     = useState('');
  const [reason, setReason]   = useState('');
  const [showPicker, setPicker] = useState(false);
  const [applyLeave, {isLoading}] = useApplyLeaveMutation();

  async function handleSubmit() {
    if (!startDate || !endDate) {
      Alert.alert('Missing Fields', 'Please enter both start and end dates (YYYY-MM-DD).');
      return;
    }
    try {
      await applyLeave({type, startDate, endDate, reason: reason.trim() || undefined}).unwrap();
      onClose();
      setStart(''); setEnd(''); setReason(''); setType('ANNUAL');
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
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, {color: colors.text}]}>Apply for Leave</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

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
          <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} value={startDate} onChangeText={setStart} />

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>END DATE</AppText>
          <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} value={endDate} onChangeText={setEnd} />

          <AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>REASON (OPTIONAL)</AppText>
          <TextInput style={[...inputStyle, styles.textArea]} placeholder="Brief reason..." placeholderTextColor={colors.textTertiary} value={reason} onChangeText={setReason} multiline numberOfLines={3} />

          <Button label="Submit Request" variant="primary" fullWidth loading={isLoading} onPress={handleSubmit} style={{marginTop: spacing[4]}} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function LeaveScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const [applyOpen, setApplyOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const employeeId = useAppSelector(selectEmployeeId);

  const {data: balances, isLoading: balancesLoading, refetch: refetchBalances} = useGetLeaveBalanceQuery(employeeId, {skip: !employeeId});
  const {data: leaveData, isLoading: leaveLoading,   refetch: refetchLeave}   = useGetMyLeaveQuery({});

  const requests = leaveData?.items ?? leaveData ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchBalances(), refetchLeave()]);
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader title="Leave" />
      <ApplyModal visible={applyOpen} onClose={() => setApplyOpen(false)} />

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
          MY REQUESTS
        </AppText>

        {leaveLoading ? (
          <Spinner size="small" />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Umbrella size={44} color={colors.primary} />}
            title="No leave requests"
            description="Your leave requests will appear here."
          />
        ) : (
          <View style={styles.requestsList}>
            {requests.map(item => <LeaveRequestCard key={item.id} item={item} />)}
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
  requestHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  requestType: {paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full},
  requestDates: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
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
  textInput: {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm, marginBottom: spacing[2]},
  textArea: {height: 80, textAlignVertical: 'top'},
});
