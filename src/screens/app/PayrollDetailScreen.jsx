import React, {useState} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {X, ChevronDown, ChevronUp} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin, selectHasPerm} from '@features/auth/authSlice';
import {AppText, Card, Spinner, EmptyState, Badge, Avatar} from '@components/ui';
import {AppHeader} from '@components/common';
import {useGetPeriodQuery} from '@features/payroll/payrollApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(val) {
  if (val == null || val === 0) return '—';
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

function fmtHours(h) {
  if (!h || h === 0) return '—';
  return `${Number(h).toFixed(2)}h`;
}

const STATUS_LABEL = {DRAFT: 'Draft', FINALISED: 'Finalised', PAID: 'Paid', ISSUED: 'Issued'};
const STATUS_MAP   = {DRAFT: 'DRAFT', FINALISED: 'IN_PROGRESS', PAID: 'PAID', ISSUED: 'COMPLETED'};

const CLASS_LABEL = {
  ordinary:       'Ordinary',
  saturday:       'Saturday',
  sunday:         'Sunday',
  public_holiday: 'Public Holiday',
  overtime_tier1: 'Overtime (1.5×)',
  overtime_tier2: 'Overtime (2×)',
  leave:          'Leave',
};

function classColor(cls, colors) {
  switch (cls) {
    case 'saturday':       return '#F59E0B';
    case 'sunday':         return colors.info;
    case 'public_holiday': return colors.error;
    case 'overtime_tier1': return '#F59E0B';
    case 'overtime_tier2': return colors.error;
    case 'leave':          return colors.primary;
    default:               return colors.text;
  }
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({label, value, color}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
      <AppText style={[styles.statLabel, {color: colors.textSecondary}]}>{label}</AppText>
      <AppText style={[styles.statValue, {color: color ?? colors.text}]}>{value}</AppText>
    </View>
  );
}

// ── Breakdown Modal (admin per-employee detail) ────────────────────────────

function BreakdownModal({payslip, onClose}) {
  const colors = useColors();
  if (!payslip) return null;

  const empName = payslip.employee
    ? `${payslip.employee.firstName} ${payslip.employee.lastName}`
    : 'Employee';

  const breakdown = Array.isArray(payslip.breakdown) ? payslip.breakdown : [];

  const hourTypes = [
    {key: 'ordinaryHours',      label: 'Ordinary',        pay: 'ordinaryPay'},
    {key: 'saturdayHours',      label: 'Saturday',        pay: 'saturdayPay'},
    {key: 'sundayHours',        label: 'Sunday',          pay: 'sundayPay'},
    {key: 'publicHolidayHours', label: 'Public Holiday',  pay: 'publicHolidayPay'},
    {key: 'overtimeTier1Hours', label: 'Overtime (1.5×)', pay: 'overtimeTier1Pay'},
    {key: 'overtimeTier2Hours', label: 'Overtime (2×)',   pay: 'overtimeTier2Pay'},
    {key: 'leaveHours',         label: 'Leave',           pay: 'leavePay'},
  ].filter(t => payslip[t.key] > 0);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={[styles.modalTitle, {color: colors.text}]}>{empName}</AppText>
              <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>
                #{payslip.employee?.employeeNumber} · ${Number(payslip.baseRate ?? 0).toFixed(2)}/hr
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <View style={styles.statsRow}>
              <StatCard label="Gross" value={fmtCurrency(payslip.grossPay)} />
              <StatCard label="Tax"   value={fmtCurrency(payslip.taxWithheld)}      color={colors.warning} />
              <StatCard label="Super" value={fmtCurrency(payslip.superContribution)} color={colors.info} />
              <StatCard label="Net"   value={fmtCurrency(payslip.netPay)}            color={colors.success} />
            </View>

            {/* Hours summary */}
            {hourTypes.length > 0 && (
              <View style={[styles.tableSection, {borderColor: colors.border}]}>
                <AppText style={[styles.tableTitle, {color: colors.textSecondary}]}>HOURS BREAKDOWN</AppText>
                <View style={[styles.tableRow, styles.tableHead, {borderBottomColor: colors.border}]}>
                  <AppText style={[styles.colType, styles.headText, {color: colors.textSecondary}]}>Type</AppText>
                  <AppText style={[styles.colHours, styles.headText, {color: colors.textSecondary}]}>Hours</AppText>
                  <AppText style={[styles.colAmt, styles.headText, {color: colors.textSecondary}]}>Amount</AppText>
                </View>
                {hourTypes.map(t => (
                  <View key={t.key} style={[styles.tableRow, {borderBottomColor: colors.border}]}>
                    <AppText style={[styles.colType, {color: colors.text}]}>{t.label}</AppText>
                    <AppText style={[styles.colHours, {color: colors.text}]}>{fmtHours(payslip[t.key])}</AppText>
                    <AppText style={[styles.colAmt, {color: colors.text}]}>{fmtCurrency(payslip[t.pay])}</AppText>
                  </View>
                ))}
              </View>
            )}

            {/* Day by day */}
            {breakdown.length > 0 && (
              <View style={[styles.tableSection, {borderColor: colors.border}]}>
                <AppText style={[styles.tableTitle, {color: colors.textSecondary}]}>DAY BY DAY</AppText>
                <View style={[styles.tableRow, styles.tableHead, {borderBottomColor: colors.border}]}>
                  <AppText style={[styles.colDate, styles.headText, {color: colors.textSecondary}]}>Date</AppText>
                  <AppText style={[styles.colType, styles.headText, {color: colors.textSecondary}]}>Type</AppText>
                  <AppText style={[styles.colHours, styles.headText, {color: colors.textSecondary}]}>Hrs</AppText>
                  <AppText style={[styles.colAmt, styles.headText, {color: colors.textSecondary}]}>Pay</AppText>
                </View>
                {breakdown.map((row, idx) => (
                  <View key={idx} style={[styles.tableRow, {borderBottomColor: colors.border}]}>
                    <AppText style={[styles.colDate, {color: colors.textSecondary}]}>
                      {new Date(row.date).toLocaleDateString('en-AU', {day: 'numeric', month: 'short'})}
                    </AppText>
                    <AppText style={[styles.colType, {color: classColor(row.classification, colors), fontSize: fontSize.xs}]}>
                      {CLASS_LABEL[row.classification] ?? row.classification}
                    </AppText>
                    <AppText style={[styles.colHours, {color: colors.text}]}>{fmtHours(row.hours)}</AppText>
                    <AppText style={[styles.colAmt, {color: colors.text}]}>{fmtCurrency(row.pay)}</AppText>
                  </View>
                ))}
              </View>
            )}

            <View style={{height: spacing[6]}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Admin: payslip row ─────────────────────────────────────────────────────

function PayslipRow({payslip, onBreakdown}) {
  const colors  = useColors();
  const empName = payslip.employee
    ? `${payslip.employee.firstName} ${payslip.employee.lastName}`
    : 'Unknown';

  return (
    <Card style={styles.payslipCard} padding={spacing[4]}>
      <View style={styles.payslipHeader}>
        <Avatar name={empName} size="sm" />
        <View style={{flex: 1, minWidth: 0}}>
          <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}} numberOfLines={1}>
            {empName}
          </AppText>
          <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary}}>
            #{payslip.employee?.employeeNumber} · ${Number(payslip.baseRate ?? 0).toFixed(2)}/hr
          </AppText>
        </View>
        <Badge
          status={payslip.status === 'ISSUED' ? 'COMPLETED' : STATUS_MAP[payslip.status]}
          label={STATUS_LABEL[payslip.status] ?? payslip.status}
          size="sm"
        />
      </View>

      <View style={styles.periodAmounts}>
        <View style={styles.amountItem}>
          <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Gross</AppText>
          <AppText style={[styles.amountValue, {color: colors.text}]}>{fmtCurrency(payslip.grossPay)}</AppText>
        </View>
        <View style={styles.amountItem}>
          <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Tax</AppText>
          <AppText style={[styles.amountValue, {color: colors.warning}]}>{fmtCurrency(payslip.taxWithheld)}</AppText>
        </View>
        <View style={styles.amountItem}>
          <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Super</AppText>
          <AppText style={[styles.amountValue, {color: colors.info}]}>{fmtCurrency(payslip.superContribution)}</AppText>
        </View>
        <View style={styles.amountItem}>
          <AppText style={[styles.amountLabel, {color: colors.textSecondary}]}>Net</AppText>
          <AppText style={[styles.amountValue, {color: colors.success}]}>{fmtCurrency(payslip.netPay)}</AppText>
        </View>
      </View>

      <TouchableOpacity onPress={() => onBreakdown(payslip)} style={styles.breakdownBtn} activeOpacity={0.7}>
        <AppText style={{fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semiBold}}>
          Breakdown
        </AppText>
        <ChevronDown size={13} color={colors.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ── Employee: my payslip detail ────────────────────────────────────────────

function MyPayslipDetail({payslip, colors}) {
  const hourTypes = [
    {key: 'ordinaryHours',      label: 'Ordinary',        pay: 'ordinaryPay'},
    {key: 'saturdayHours',      label: 'Saturday',        pay: 'saturdayPay'},
    {key: 'sundayHours',        label: 'Sunday',          pay: 'sundayPay'},
    {key: 'publicHolidayHours', label: 'Public Holiday',  pay: 'publicHolidayPay'},
    {key: 'overtimeTier1Hours', label: 'Overtime (1.5×)', pay: 'overtimeTier1Pay'},
    {key: 'overtimeTier2Hours', label: 'Overtime (2×)',   pay: 'overtimeTier2Pay'},
    {key: 'leaveHours',         label: 'Leave',           pay: 'leavePay'},
  ].filter(t => payslip[t.key] > 0);

  const breakdown = Array.isArray(payslip.breakdown) ? payslip.breakdown : [];
  const [showDayByDay, setShowDayByDay] = useState(false);

  return (
    <>
      {/* Base rate info */}
      <Card padding={spacing[4]} style={{marginBottom: 0}}>
        <AppText style={[styles.sectionTitle, {color: colors.textSecondary}]}>PAYSLIP INFO</AppText>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2]}}>
          <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>Base Rate</AppText>
          <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}}>
            ${Number(payslip.baseRate ?? 0).toFixed(2)}/hr
          </AppText>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1]}}>
          <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>Status</AppText>
          <Badge
            status={payslip.status === 'ISSUED' ? 'COMPLETED' : STATUS_MAP[payslip.status]}
            label={STATUS_LABEL[payslip.status] ?? payslip.status}
            size="sm"
          />
        </View>
        {payslip.issuedAt && (
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1]}}>
            <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>Issued</AppText>
            <AppText style={{fontSize: fontSize.sm, color: colors.text}}>{fmtDate(payslip.issuedAt)}</AppText>
          </View>
        )}
      </Card>

      {/* Pay breakdown */}
      {hourTypes.length > 0 && (
        <View style={[styles.tableSection, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <AppText style={[styles.tableTitle, {color: colors.textSecondary}]}>PAY BREAKDOWN</AppText>
          <View style={[styles.tableRow, styles.tableHead, {borderBottomColor: colors.border}]}>
            <AppText style={[styles.colType, styles.headText, {color: colors.textSecondary}]}>Type</AppText>
            <AppText style={[styles.colHours, styles.headText, {color: colors.textSecondary}]}>Hours</AppText>
            <AppText style={[styles.colAmt, styles.headText, {color: colors.textSecondary}]}>Amount</AppText>
          </View>
          {hourTypes.map(t => (
            <View key={t.key} style={[styles.tableRow, {borderBottomColor: colors.border}]}>
              <AppText style={[styles.colType, {color: colors.text}]}>{t.label}</AppText>
              <AppText style={[styles.colHours, {color: colors.text}]}>{fmtHours(payslip[t.key])}</AppText>
              <AppText style={[styles.colAmt, {color: colors.text}]}>{fmtCurrency(payslip[t.pay])}</AppText>
            </View>
          ))}
          {/* Totals row */}
          <View style={[styles.tableRow, {borderBottomColor: 'transparent', paddingTop: spacing[1]}]}>
            <AppText style={[styles.colType, {color: colors.text, fontWeight: fontWeight.bold}]}>Net Pay</AppText>
            <AppText style={[styles.colHours, {color: colors.textSecondary}]}> </AppText>
            <AppText style={[styles.colAmt, {color: colors.success, fontWeight: fontWeight.bold}]}>
              {fmtCurrency(payslip.netPay)}
            </AppText>
          </View>
        </View>
      )}

      {/* Day by day — collapsible */}
      {breakdown.length > 0 && (
        <View style={[styles.tableSection, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <TouchableOpacity
            style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}
            onPress={() => setShowDayByDay(v => !v)}
            activeOpacity={0.7}>
            <AppText style={[styles.tableTitle, {color: colors.textSecondary}]}>DAY BY DAY</AppText>
            {showDayByDay
              ? <ChevronUp size={14} color={colors.textSecondary} />
              : <ChevronDown size={14} color={colors.textSecondary} />}
          </TouchableOpacity>
          {showDayByDay && (
            <>
              <View style={[styles.tableRow, styles.tableHead, {borderBottomColor: colors.border, marginTop: spacing[2]}]}>
                <AppText style={[styles.colDate, styles.headText, {color: colors.textSecondary}]}>Date</AppText>
                <AppText style={[styles.colType, styles.headText, {color: colors.textSecondary}]}>Type</AppText>
                <AppText style={[styles.colHours, styles.headText, {color: colors.textSecondary}]}>Hrs</AppText>
                <AppText style={[styles.colAmt, styles.headText, {color: colors.textSecondary}]}>Pay</AppText>
              </View>
              {breakdown.map((row, idx) => (
                <View key={idx} style={[styles.tableRow, {borderBottomColor: colors.border}]}>
                  <AppText style={[styles.colDate, {color: colors.textSecondary}]}>
                    {new Date(row.date).toLocaleDateString('en-AU', {day: 'numeric', month: 'short'})}
                  </AppText>
                  <AppText style={[styles.colType, {color: classColor(row.classification, colors), fontSize: fontSize.xs}]}>
                    {CLASS_LABEL[row.classification] ?? row.classification}
                  </AppText>
                  <AppText style={[styles.colHours, {color: colors.text}]}>{fmtHours(row.hours)}</AppText>
                  <AppText style={[styles.colAmt, {color: colors.text}]}>{fmtCurrency(row.pay)}</AppText>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function PayrollDetailScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const route   = useRoute();
  const {periodId} = route.params ?? {};

  const isAdmin   = useAppSelector(selectIsAdmin);
  const canManage = useAppSelector(selectHasPerm('payroll.manage'));
  const isManagerView = isAdmin || canManage;

  const {data: period, isLoading} = useGetPeriodQuery(periodId, {skip: !periodId});

  const [breakdownPayslip, setBreakdownPayslip] = useState(null);

  const payslips = Array.isArray(period?.payslips) ? period.payslips : [];
  // For employee view, the backend should return only their own payslip
  const myPayslip = isManagerView ? null : payslips[0];

  const title = period
    ? fmtDateRange(period.periodStart, period.periodEnd)
    : 'Payroll Detail';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title={title}
        rightAction={period && (
          <Badge
            status={STATUS_MAP[period.status]}
            label={STATUS_LABEL[period.status] ?? period.status}
            size="sm"
          />
        )}
      />

      {isLoading ? (
        <View style={styles.fullCenter}><Spinner /></View>
      ) : !period ? (
        <View style={styles.fullCenter}>
          <EmptyState title="Period not found" description="This payroll period could not be loaded." />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}>

          {/* Summary stat cards */}
          <View style={styles.statsRow}>
            {isManagerView ? (
              <>
                <StatCard label="Gross" value={fmtCurrency(period.totalGross)} />
                <StatCard label="Tax"   value={fmtCurrency(period.totalTax)}   color={colors.warning} />
                <StatCard label="Super" value={fmtCurrency(period.totalSuper)} color={colors.info} />
                <StatCard label="Net"   value={fmtCurrency(period.totalNet)}   color={colors.success} />
              </>
            ) : myPayslip ? (
              <>
                <StatCard label="Gross" value={fmtCurrency(myPayslip.grossPay)} />
                <StatCard label="Tax"   value={fmtCurrency(myPayslip.taxWithheld)}      color={colors.warning} />
                <StatCard label="Super" value={fmtCurrency(myPayslip.superContribution)} color={colors.info} />
                <StatCard label="Net"   value={fmtCurrency(myPayslip.netPay)}            color={colors.success} />
              </>
            ) : null}
          </View>

          {/* Pay date info */}
          <Card padding={spacing[4]} style={{marginBottom: 0}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>Pay Date</AppText>
              <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}}>
                {fmtDate(period.payDate)}
              </AppText>
            </View>
            {isManagerView && (
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1]}}>
                <AppText style={{fontSize: fontSize.sm, color: colors.textSecondary}}>Employees</AppText>
                <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}}>
                  {payslips.length}
                </AppText>
              </View>
            )}
          </Card>

          {/* Admin: list of all employee payslips */}
          {isManagerView && (
            payslips.length === 0 ? (
              <EmptyState title="No payslips" description="No payslips have been generated for this period." />
            ) : (
              payslips.map(ps => (
                <PayslipRow key={ps.id} payslip={ps} onBreakdown={setBreakdownPayslip} />
              ))
            )
          )}

          {/* Employee: their own payslip breakdown */}
          {!isManagerView && (
            myPayslip
              ? <MyPayslipDetail payslip={myPayslip} colors={colors} />
              : <EmptyState title="No payslip" description="You don't have a payslip for this period." />
          )}
        </ScrollView>
      )}

      {/* Admin breakdown modal */}
      {isManagerView && (
        <BreakdownModal
          payslip={breakdownPayslip}
          onClose={() => setBreakdownPayslip(null)}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:       {flex: 1},
  content:    {padding: spacing[4], gap: spacing[3]},
  fullCenter: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  statsRow: {
    flexDirection: 'row', gap: spacing[2],
  },
  statCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[3], alignItems: 'center',
  },
  statLabel: {fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4},
  statValue: {fontSize: fontSize.xs, fontWeight: fontWeight.bold},

  // Payslip row (admin)
  payslipCard:   {gap: spacing[3]},
  payslipHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[3]},

  periodAmounts: {flexDirection: 'row', gap: spacing[2]},
  amountItem:   {flex: 1, alignItems: 'center'},
  amountLabel:  {fontSize: 9, fontWeight: fontWeight.semiBold, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2},
  amountValue:  {fontSize: fontSize.xs, fontWeight: fontWeight.bold},

  breakdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    alignSelf: 'flex-end',
  },

  // Tables
  tableSection: {
    borderWidth: 1, borderRadius: radius.lg,
    padding: spacing[4], gap: 0, overflow: 'hidden',
  },
  tableTitle: {
    fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: spacing[1],
  },
  tableHead: {paddingBottom: spacing[2]},
  tableRow:  {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1},
  headText:  {fontSize: fontSize.xs, fontWeight: fontWeight.bold},

  colDate:  {flex: 1.2, fontSize: fontSize.xs},
  colType:  {flex: 2,   fontSize: fontSize.xs},
  colHours: {flex: 1,   fontSize: fontSize.xs, textAlign: 'right'},
  colAmt:   {flex: 1.5, fontSize: fontSize.xs, textAlign: 'right'},

  // Breakdown modal
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet:   {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0, maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing[4],
  },
  modalTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
});
