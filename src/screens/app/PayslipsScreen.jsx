import React, {useState} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, FlatList, RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Plus, ChevronRight, Banknote, Calendar} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin, selectHasPerm, selectRole} from '@features/auth/authSlice';
import {AppText, Card, Button, Spinner, EmptyState, Badge} from '@components/ui';
import {AppHeader} from '@components/common';
import {
  useListPeriodsQuery,
  useListAvailablePeriodsQuery,
  useGeneratePeriodMutation,
  useFinalisePeriodMutation,
  useDeletePeriodMutation,
  useUnlockPeriodMutation,
} from '@features/payroll/payrollApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(val) {
  if (val == null) return '—';
  return '$' + Number(val).toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year: 'numeric'});
}

function fmtDateRange(start, end) {
  if (!start) return '—';
  const s = new Date(start).toLocaleDateString('en-AU', {day: 'numeric', month: 'short'});
  const e = end ? new Date(end).toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
  return e ? `${s} – ${e}` : s;
}

const STATUS_LABEL = {DRAFT: 'Draft', FINALISED: 'Finalised', PAID: 'Paid', ISSUED: 'Issued'};
const STATUS_MAP   = {DRAFT: 'DRAFT', FINALISED: 'IN_PROGRESS', PAID: 'PAID', ISSUED: 'COMPLETED'};

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({label, value, color}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <AppText style={[styles.statLabel, {color: colors.textSecondary}]}>{label}</AppText>
      <AppText style={[styles.statValue, {color: color ?? colors.text}]}>{value}</AppText>
    </View>
  );
}

// ── Generate Period Modal ──────────────────────────────────────────────────

function GenerateModal({visible, onClose}) {
  const colors = useColors();
  const {data: available, isLoading} = useListAvailablePeriodsQuery(undefined, {skip: !visible});
  const [generatePeriod, {isLoading: generating}] = useGeneratePeriodMutation();
  const periods = Array.isArray(available) ? available : (available?.periods ?? []);

  async function handleGenerate(period) {
    try {
      await generatePeriod({date: period.periodStart}).unwrap();
      Alert.alert('Success', `Period generated: ${fmtDateRange(period.periodStart, period.periodEnd)}`);
      onClose();
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Failed to generate period');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, {color: colors.text}]}>Generate Payroll Period</AppText>
            <TouchableOpacity onPress={onClose}>
              <AppText style={{color: colors.primary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centered}><Spinner size="small" /></View>
          ) : periods.length === 0 ? (
            <View style={styles.centered}>
              <AppText style={{color: colors.textSecondary, textAlign: 'center', padding: spacing[4]}}>
                No available periods to generate.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={periods}
              keyExtractor={p => p.periodStart}
              style={{maxHeight: 320}}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => handleGenerate(item)}
                  disabled={generating}
                  style={[styles.periodRow, {borderBottomColor: colors.border}]}
                  activeOpacity={0.7}>
                  <View style={{flex: 1}}>
                    <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text}}>
                      {fmtDateRange(item.periodStart, item.periodEnd)}
                    </AppText>
                    <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2}}>
                      Pay date: {fmtDate(item.payDate)}
                    </AppText>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Admin: Period card ─────────────────────────────────────────────────────

function PeriodCard({period, canFinalise, canManage, isOwner}) {
  const colors     = useColors();
  const navigation = useNavigation();
  const [finalisePeriod, {isLoading: finalising}] = useFinalisePeriodMutation();
  const [deletePeriod,   {isLoading: deleting}]   = useDeletePeriodMutation();
  const [unlockPeriod,   {isLoading: unlocking}]  = useUnlockPeriodMutation();

  async function handleFinalise() {
    Alert.alert(
      'Finalise Period',
      'This will mark the period as FINALISED, issue all payslips, and lock the record. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Finalise', style: 'destructive',
          onPress: async () => {
            try {
              await finalisePeriod(period.id).unwrap();
              Alert.alert('Success', 'Period finalised and payslips issued.');
            } catch (e) {
              Alert.alert('Error', e?.data?.error?.message ?? 'Failed to finalise');
            }
          },
        },
      ],
    );
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Period',
      'This will permanently delete the period and all its payslips. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deletePeriod(period.id).unwrap();
            } catch (e) {
              Alert.alert('Error', e?.data?.error?.message ?? 'Failed to delete');
            }
          },
        },
      ],
    );
  }

  async function handleUnlock() {
    Alert.alert(
      'Unlock Period',
      'This will re-open the period back to DRAFT and revoke all issued payslips. Fix the data, then regenerate and re-finalise.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Unlock', style: 'destructive',
          onPress: async () => {
            try {
              await unlockPeriod(period.id).unwrap();
            } catch (e) {
              Alert.alert('Error', e?.data?.error?.message ?? 'Failed to unlock');
            }
          },
        },
      ],
    );
  }

  const isDraft     = period.status === 'DRAFT';
  const isFinalised = period.status === 'FINALISED';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('PayrollDetail', {periodId: period.id})}>
      <Card style={styles.periodCard} padding={spacing[4]}>
        <View style={styles.periodCardHeader}>
          <View style={{flex: 1}}>
            <AppText style={[styles.periodRange, {color: colors.text}]}>
              {fmtDateRange(period.periodStart, period.periodEnd)}
            </AppText>
            <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2}}>
              Pay date: {fmtDate(period.payDate)}
            </AppText>
          </View>
          <Badge status={STATUS_MAP[period.status]} label={STATUS_LABEL[period.status] ?? period.status} size="sm" />
        </View>

        <View style={styles.periodAmounts}>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Gross</AppText>
            <AppText style={[styles.amountValue, {color: colors.text}]}>{fmtCurrency(period.totalGross)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Tax</AppText>
            <AppText style={[styles.amountValue, {color: colors.warning}]}>{fmtCurrency(period.totalTax)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Super</AppText>
            <AppText style={[styles.amountValue, {color: colors.info}]}>{fmtCurrency(period.totalSuper)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Net</AppText>
            <AppText style={[styles.amountValue, {color: colors.success}]}>{fmtCurrency(period.totalNet)}</AppText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.periodActions}>
          {isDraft && canFinalise && (
            <Button label="Finalise" variant="primary" size="sm" loading={finalising} onPress={handleFinalise} />
          )}
          {isDraft && canManage && (
            <Button label="Delete" variant="danger" size="sm" loading={deleting} onPress={handleDelete} />
          )}
          {isFinalised && isOwner && (
            <Button label="Unlock" variant="secondary" size="sm" loading={unlocking} onPress={handleUnlock} />
          )}
          <View style={{flex: 1}} />
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Employee: My Payslip card ─────────────────────────────────────────────

function MyPayslipCard({period}) {
  const colors     = useColors();
  const navigation = useNavigation();
  const payslip    = period.payslips?.[0];
  const status     = payslip?.status ?? period.status;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('PayrollDetail', {periodId: period.id})}>
      <Card style={styles.periodCard} padding={spacing[4]}>
        <View style={styles.periodCardHeader}>
          <View style={{flex: 1}}>
            <AppText style={[styles.periodRange, {color: colors.text}]}>
              {fmtDateRange(period.periodStart, period.periodEnd)}
            </AppText>
            <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2}}>
              Pay date: {fmtDate(period.payDate)}
            </AppText>
          </View>
          <Badge status={status === 'ISSUED' ? 'COMPLETED' : STATUS_MAP[status]} label={STATUS_LABEL[status] ?? status} size="sm" />
        </View>

        <View style={styles.periodAmounts}>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Gross</AppText>
            <AppText style={[styles.amountValue, {color: colors.text}]}>{fmtCurrency(payslip?.grossPay)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Tax</AppText>
            <AppText style={[styles.amountValue, {color: colors.warning}]}>{fmtCurrency(payslip?.taxWithheld)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Super</AppText>
            <AppText style={[styles.amountValue, {color: colors.info}]}>{fmtCurrency(payslip?.superContribution)}</AppText>
          </View>
          <View style={styles.amountItem}>
            <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Net</AppText>
            <AppText style={[styles.amountValue, {color: colors.success}]}>{fmtCurrency(payslip?.netPay)}</AppText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function PayslipsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();

  const isAdmin      = useAppSelector(selectIsAdmin);
  const canManage    = useAppSelector(selectHasPerm('payroll.manage'));
  const canFinalise  = useAppSelector(selectHasPerm('payroll.finalise'));
  const role         = useAppSelector(selectRole);
  const isOwner      = role === 'OWNER';
  const isManagerView = isAdmin || canManage;

  const [showGenerate, setShowGenerate] = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // Both admin and employee use the same periods endpoint (web parity)
  const {data: periodsData, isLoading, refetch} =
    useListPeriodsQuery({pageSize: 50});

  const periods = Array.isArray(periodsData) ? periodsData : (periodsData?.items ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Summary stats — latest period
  const latest     = periods[0];
  const statsGross = isManagerView ? latest?.totalGross            : latest?.payslips?.[0]?.grossPay;
  const statsNet   = isManagerView ? latest?.totalNet              : latest?.payslips?.[0]?.netPay;
  const statsTax   = isManagerView ? latest?.totalTax              : latest?.payslips?.[0]?.taxWithheld;
  const statsSuper = isManagerView ? latest?.totalSuper            : latest?.payslips?.[0]?.superContribution;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title={isManagerView ? 'Payroll' : 'My Payslips'}
        rightAction={isManagerView && (
          <TouchableOpacity
            onPress={() => setShowGenerate(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {/* Summary stat cards */}
        {latest && (
          <View style={styles.statsRow}>
            <StatCard label="Gross"  value={fmtCurrency(statsGross)} />
            <StatCard label="Tax"    value={fmtCurrency(statsTax)}   color={colors.warning} />
            <StatCard label="Super"  value={fmtCurrency(statsSuper)} color={colors.info} />
            <StatCard label="Net"    value={fmtCurrency(statsNet)}   color={colors.success} />
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}><Spinner /></View>
        ) : isManagerView ? (
          periods.length === 0 ? (
            <EmptyState
              icon={<Banknote size={44} color={colors.primary} />}
              title="No payroll periods"
              description="Generate the first payroll period using the + button above."
            />
          ) : (
            periods.map(p => (
              <PeriodCard
                key={p.id}
                period={p}
                canFinalise={canFinalise}
                canManage={canManage || isAdmin}
                isOwner={isOwner}
              />
            ))
          )
        ) : (
          periods.length === 0 ? (
            <EmptyState
              icon={<Banknote size={44} color={colors.primary} />}
              title="No payslips yet"
              description="Your payslips will appear here once they are issued."
            />
          ) : (
            periods.map(p => <MyPayslipCard key={p.id} period={p} />)
          )
        )}
      </ScrollView>

      <GenerateModal visible={showGenerate} onClose={() => setShowGenerate(false)} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    {flex: 1},
  content: {padding: spacing[4], gap: spacing[3]},
  centered:{paddingTop: spacing[10], alignItems: 'center'},

  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row', gap: spacing[2],
    marginBottom: spacing[1],
  },
  statCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[3], alignItems: 'center',
  },
  statLabel: {fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4},
  statValue: {fontSize: fontSize.sm, fontWeight: fontWeight.bold},

  periodCard:       {gap: spacing[3]},
  periodCardHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2]},
  periodRange:      {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},

  periodAmounts: {
    flexDirection: 'row', gap: spacing[2],
    backgroundColor: 'transparent',
  },
  amountItem:  {flex: 1, alignItems: 'center'},
  amountLabel: {fontSize: 9, fontWeight: fontWeight.semiBold, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2},
  amountValue: {fontSize: fontSize.xs, fontWeight: fontWeight.bold},

  periodActions: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},

  // Generate modal
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet:   {borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing[5], paddingBottom: spacing[8]},
  modalHeader:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4]},
  modalTitle:   {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  periodRow:    {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1},
});
