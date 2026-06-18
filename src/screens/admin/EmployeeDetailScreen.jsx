import React, {useState, useMemo} from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  ArrowLeft, Edit2, X, ChevronDown, ChevronLeft, ChevronRight as ChevRight,
  Mail, Phone, MapPin, Briefcase, DollarSign, Calendar,
  Shield, Clock, Umbrella, CalendarDays, Banknote,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin, selectCanManage, selectHasPerm} from '@features/auth/authSlice';
import {AppText, Card, Badge, Spinner, Avatar, Button} from '@components/ui';
import {useGetEmployeeQuery, useUpdateEmployeeMutation} from '@features/employee/employeeApi';
import {useListDepartmentsQuery, useListOrgRolesQuery, useListShiftsQuery} from '@features/admin/adminApi';
import {useGetLeaveBalanceQuery, useListLeaveQuery} from '@features/leave/leaveApi';
import {useGetAttendanceListQuery} from '@features/attendance/attendanceApi';
import {useGetPayrollPolicyQuery, useListEmployeePayslipsQuery} from '@features/payroll/payrollApi';
import {formatDate, formatCurrency, formatTime, formatHours} from '@utils/format';

// ── Constants ──────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  {code: 'FULL_TIME',  name: 'Full-time'},
  {code: 'PART_TIME',  name: 'Part-time'},
  {code: 'CASUAL',     name: 'Casual'},
  {code: 'CONTRACTOR', name: 'Contractor'},
];

const AU_STATES = [
  {code: 'NSW', name: 'NSW'}, {code: 'VIC', name: 'VIC'},
  {code: 'QLD', name: 'QLD'}, {code: 'WA',  name: 'WA'},
  {code: 'SA',  name: 'SA'},  {code: 'TAS', name: 'TAS'},
  {code: 'ACT', name: 'ACT'}, {code: 'NT',  name: 'NT'},
];

const LEAVE_TYPE_LABEL = {
  ANNUAL: 'Annual', SICK: 'Sick', PERSONAL: 'Personal',
  COMPASSIONATE: 'Compassionate', OTHER: 'Other',
};

function empTypeName(c) {
  return EMPLOYMENT_TYPES.find(t => t.code === c)?.name ?? c;
}

// ── Period builder — mirrors web buildPeriods exactly ─────────────────────

function buildPeriods(cycleType, cycleDays = 14, count = 12) {
  const anchor  = dayjs('2020-01-06');
  const periods = [];

  if (cycleType === 'monthly') {
    for (let i = 0; i < count; i++) {
      const d       = dayjs().subtract(i, 'month');
      const start   = d.startOf('month');
      const end     = d.endOf('month');
      const payDate = end.add(1, 'day').startOf('month').add(2, 'day');
      periods.push({
        periodStart: start.toDate(),
        periodEnd:   end.toDate(),
        payDate:     payDate.toDate(),
        label:       d.format('MMMM YYYY'),
      });
    }
  } else {
    const diffDays   = dayjs().diff(anchor, 'day');
    const currentIdx = Math.floor(diffDays / cycleDays);
    for (let i = 0; i < count; i++) {
      const idx     = currentIdx - i;
      const start   = anchor.add(idx * cycleDays, 'day');
      const end     = start.add(cycleDays - 1, 'day').endOf('day');
      const payDate = end.add(3, 'day').startOf('day');
      periods.push({
        periodStart: start.toDate(),
        periodEnd:   end.toDate(),
        payDate:     payDate.toDate(),
        label:       `${start.format('D MMM')} – ${end.format('D MMM')}`,
      });
    }
  }
  return periods;
}

// ── Shared atoms ─────────────────────────────────────────────────────────────

function SectionTitle({children}) {
  const colors = useColors();
  return <AppText style={[styles.sectionTitle, {color: colors.textSecondary}]}>{children}</AppText>;
}

function InfoRow({label, value, icon: Icon}) {
  const colors = useColors();
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={[styles.infoRow, {borderBottomColor: colors.border}]}>
      <View style={styles.infoLeft}>
        {Icon && <Icon size={12} color={colors.textTertiary} />}
        <AppText style={[styles.infoLabel, {color: colors.textSecondary}]}>{label}</AppText>
      </View>
      <AppText style={[styles.infoValue, {color: colors.text}]} numberOfLines={2}>{value}</AppText>
    </View>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────

function PeriodSelector({period, periodIdx, periods, onPrev, onNext, policy}) {
  const colors = useColors();
  const cycleLabel = policy
    ? (policy.payrollCycleType === 'monthly' ? 'Monthly' : 'Fortnightly')
    : '';

  return (
    <View style={[styles.periodSelector, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <TouchableOpacity
        onPress={onNext}
        disabled={periodIdx >= periods.length - 1}
        style={[styles.periodArrow, {opacity: periodIdx >= periods.length - 1 ? 0.3 : 1}]}>
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.periodCenter}>
        <AppText style={[styles.periodLabel, {color: colors.text}]}>
          {period?.label ?? '—'}
        </AppText>
        <AppText style={[styles.periodSub, {color: colors.textSecondary}]}>
          {cycleLabel}
          {period?.payDate ? `  ·  Pay ${formatDate(period.payDate)}` : ''}
        </AppText>
      </View>

      <TouchableOpacity
        onPress={onPrev}
        disabled={periodIdx === 0}
        style={[styles.periodArrow, {opacity: periodIdx === 0 ? 0.3 : 1}]}>
        <ChevRight size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ── Summary tiles (shown above sub-tabs) ─────────────────────────────────────

function SummaryTiles({attItems, shiftItems, leaveItems, payslip, canPayroll}) {
  const colors = useColors();

  const hoursWorked = attItems.reduce((sum, r) => {
    if (!r.clockOutAt || !r.clockInAt) return sum;
    return sum + (new Date(r.clockOutAt) - new Date(r.clockInAt)) / 60000;
  }, 0);

  const shiftHours = shiftItems.reduce((sum, s) => {
    const endAt   = s.endAt   ?? null;
    const startAt = s.startAt ?? null;
    if (!endAt || !startAt) return sum;
    const h = (new Date(endAt) - new Date(startAt)) / 60000 - (s.breakMinutes ?? 0);
    return sum + Math.max(0, h);
  }, 0);

  const leaveDays = leaveItems.reduce((sum, r) => {
    if (r.status === 'REJECTED' || r.status === 'CANCELLED') return sum;
    return sum + dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1;
  }, 0);

  const tiles = [
    {label: 'Hours Worked', value: formatHours(Math.round(hoursWorked)), sub: `${attItems.length} days`, color: colors.primary},
    {label: 'Shift Hours',  value: formatHours(Math.round(shiftHours)),  sub: `${shiftItems.length} shifts`, color: colors.info},
    {label: 'Leave Days',   value: String(leaveDays),                    sub: `${leaveItems.length} requests`, color: colors.warning},
    ...(canPayroll ? [{
      label: 'Net Pay',
      value: payslip ? formatCurrency(payslip.netPay) : '—',
      sub: payslip ? payslip.status : 'not processed',
      color: colors.success,
    }] : []),
  ];

  return (
    <View style={styles.tilesRow}>
      {tiles.map(t => (
        <View key={t.label} style={[styles.summaryTile, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <AppText style={[styles.tileLabel, {color: colors.textTertiary}]}>{t.label}</AppText>
          <AppText style={[styles.tileValue, {color: t.color}]}>{t.value}</AppText>
          <AppText style={[styles.tileSub,   {color: colors.textTertiary}]}>{t.sub}</AppText>
        </View>
      ))}
    </View>
  );
}

// ── Attendance tab content ────────────────────────────────────────────────────

function AttendanceContent({records, loading}) {
  const colors = useColors();
  if (loading) return <View style={styles.tabCenter}><Spinner /></View>;
  if (records.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <Clock size={32} color={colors.textTertiary} />
        <AppText style={[styles.tabEmptyText, {color: colors.textSecondary}]}>
          No attendance records this period
        </AppText>
      </View>
    );
  }
  return (
    <View style={{gap: spacing[2]}}>
      {records.map(r => {
        const workedMins = r.clockOutAt && r.clockInAt
          ? Math.max(0, (new Date(r.clockOutAt) - new Date(r.clockInAt)) / 60000 - (r.breakMinutes ?? 0))
          : null;
        return (
          <Card key={r.id} style={[styles.rowCard, {borderColor: colors.border}]}>
            <View style={styles.rowCardLeft}>
              <AppText style={[styles.rowCardDate, {color: colors.text}]}>
                {r.clockInAt ? dayjs(r.clockInAt).format('ddd D MMM') : '—'}
              </AppText>
              <AppText style={[styles.rowCardSub, {color: colors.textSecondary}]}>
                {formatTime(r.clockInAt)} → {r.clockOutAt ? formatTime(r.clockOutAt) : 'In progress'}
                {r.breakMinutes ? `  ·  ${r.breakMinutes}m break` : ''}
              </AppText>
              {workedMins !== null && (
                <AppText style={[styles.rowCardMeta, {color: colors.textTertiary}]}>
                  {formatHours(Math.round(workedMins))} worked
                </AppText>
              )}
            </View>
            <Badge status={r.status} size="sm" />
          </Card>
        );
      })}
    </View>
  );
}

// ── Shifts tab content ────────────────────────────────────────────────────────

function ShiftsContent({shifts, loading}) {
  const colors = useColors();
  if (loading) return <View style={styles.tabCenter}><Spinner /></View>;
  if (shifts.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <CalendarDays size={32} color={colors.textTertiary} />
        <AppText style={[styles.tabEmptyText, {color: colors.textSecondary}]}>
          No shifts this period
        </AppText>
      </View>
    );
  }
  return (
    <View style={{gap: spacing[2]}}>
      {shifts.map(s => {
        const date  = s.date      ? formatDate(s.date)      : s.startAt  ? formatDate(s.startAt)  : '—';
        const start = s.startTime ? formatTime(s.startTime) : s.startAt  ? formatTime(s.startAt)  : '—';
        const end   = s.endTime   ? formatTime(s.endTime)   : s.endAt    ? formatTime(s.endAt)    : '—';
        let shiftMins = null;
        if (s.endAt && s.startAt) {
          shiftMins = Math.max(0, (new Date(s.endAt) - new Date(s.startAt)) / 60000 - (s.breakMinutes ?? 0));
        }
        return (
          <Card key={s.id} style={[styles.rowCard, {borderColor: colors.border}]}>
            <View style={styles.rowCardLeft}>
              <AppText style={[styles.rowCardDate, {color: colors.text}]}>{date}</AppText>
              <AppText style={[styles.rowCardSub, {color: colors.textSecondary}]}>
                {start} → {end}
                {s.breakMinutes ? `  ·  ${s.breakMinutes}m break` : ''}
              </AppText>
              {shiftMins !== null && (
                <AppText style={[styles.rowCardMeta, {color: colors.textTertiary}]}>
                  {formatHours(Math.round(shiftMins))}
                </AppText>
              )}
            </View>
            <Badge status={s.status} size="sm" />
          </Card>
        );
      })}
    </View>
  );
}

// ── Leave tab content ─────────────────────────────────────────────────────────

function LeaveContent({requests, loading}) {
  const colors = useColors();
  if (loading) return <View style={styles.tabCenter}><Spinner /></View>;
  if (requests.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <Umbrella size={32} color={colors.textTertiary} />
        <AppText style={[styles.tabEmptyText, {color: colors.textSecondary}]}>
          No leave requests this period
        </AppText>
      </View>
    );
  }
  return (
    <View style={{gap: spacing[2]}}>
      {requests.map(r => {
        const typeName = LEAVE_TYPE_LABEL[r.type] ?? r.type;
        const start    = formatDate(r.startDate);
        const end      = formatDate(r.endDate);
        return (
          <Card key={r.id} style={[styles.rowCard, {borderColor: colors.border}]}>
            <View style={styles.rowCardLeft}>
              <AppText style={[styles.rowCardDate, {color: colors.text}]}>{typeName} Leave</AppText>
              <AppText style={[styles.rowCardSub, {color: colors.textSecondary}]}>
                {start}{start !== end ? ` → ${end}` : ''}
                {r.days ? `  ·  ${r.days}d` : r.totalDays ? `  ·  ${r.totalDays}d` : ''}
              </AppText>
              {r.reason && (
                <AppText style={[styles.rowCardMeta, {color: colors.textTertiary}]} numberOfLines={1}>
                  {r.reason}
                </AppText>
              )}
            </View>
            <Badge status={r.status} size="sm" />
          </Card>
        );
      })}
    </View>
  );
}

// ── Payslips tab content ──────────────────────────────────────────────────────

function PayslipsContent({payslip, allPayslips, loading}) {
  const colors = useColors();
  if (loading) return <View style={styles.tabCenter}><Spinner /></View>;
  if (!payslip) {
    return (
      <View style={styles.tabEmpty}>
        <Banknote size={32} color={colors.textTertiary} />
        <AppText style={[styles.tabEmptyText, {color: colors.textSecondary}]}>
          No payslip for this period yet
        </AppText>
      </View>
    );
  }

  const rows = [
    {label: 'Gross Pay',       value: formatCurrency(payslip.grossPay),         color: colors.text},
    {label: 'Tax Withheld',    value: `−${formatCurrency(payslip.taxWithheld)}`, color: colors.error},
    {label: 'Superannuation',  value: formatCurrency(payslip.superContribution), color: colors.info},
  ];

  return (
    <View style={{gap: spacing[3]}}>
      {/* Net pay hero */}
      <Card style={[styles.payslipHero, {borderColor: colors.border}]}>
        <View style={[styles.payslipAccent, {backgroundColor: colors.success}]} />
        <View style={styles.payslipHeroBody}>
          <View style={{flex: 1}}>
            <AppText style={[styles.payslipHeroLabel, {color: colors.textSecondary}]}>Net Pay</AppText>
            <AppText style={[styles.payslipHeroValue, {color: colors.success}]}>
              {formatCurrency(payslip.netPay)}
            </AppText>
            {payslip.payrollPeriod?.payDate && (
              <AppText style={[styles.payslipPayDate, {color: colors.textTertiary}]}>
                Pay date: {formatDate(payslip.payrollPeriod.payDate)}
              </AppText>
            )}
          </View>
          <Badge status={payslip.status} size="sm" />
        </View>
      </Card>

      {/* Breakdown */}
      <Card style={styles.infoCard}>
        {rows.map(r => (
          <View key={r.label} style={[styles.infoRow, {borderBottomColor: colors.border}]}>
            <AppText style={[styles.infoLabel, {color: colors.textSecondary}]}>{r.label}</AppText>
            <AppText style={[styles.infoValue, {color: r.color, fontWeight: fontWeight.bold}]}>{r.value}</AppText>
          </View>
        ))}
        <View style={[styles.infoRow, {borderBottomColor: 'transparent'}]}>
          <AppText style={[styles.infoLabel, {color: colors.text, fontWeight: fontWeight.bold}]}>NET PAY</AppText>
          <AppText style={[styles.infoValue, {color: colors.success, fontWeight: fontWeight.bold, fontSize: fontSize.md}]}>
            {formatCurrency(payslip.netPay)}
          </AppText>
        </View>
      </Card>

      {/* Period details */}
      {payslip.payrollPeriod && (
        <Card style={styles.infoCard}>
          <InfoRow label="Period Start" value={formatDate(payslip.payrollPeriod.periodStart)} />
          <InfoRow label="Period End"   value={formatDate(payslip.payrollPeriod.periodEnd)} />
          <InfoRow label="Pay Date"     value={formatDate(payslip.payrollPeriod.payDate)} />
          <InfoRow label="Hours"        value={payslip.hoursWorked ? `${payslip.hoursWorked}h` : null} />
        </Card>
      )}
    </View>
  );
}

// ── Details tab content ───────────────────────────────────────────────────────

function DetailsContent({emp, isAdmin}) {
  const portalStatus = emp.user?.status ?? null;
  const lastLogin    = emp.user?.lastLoginAt
    ? formatDate(emp.user.lastLoginAt)
    : 'Never';

  return (
    <View style={{gap: spacing[3]}}>
      <SectionTitle>CONTACT</SectionTitle>
      <Card style={styles.infoCard}>
        <InfoRow icon={Mail}     label="Email"     value={emp.email} />
        <InfoRow icon={Phone}    label="Phone"     value={emp.phone} />
        <InfoRow icon={Calendar} label="D.O.B."    value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null} />
        <InfoRow icon={Clock}    label="Last Login" value={lastLogin} />
      </Card>

      <SectionTitle>EMPLOYMENT</SectionTitle>
      <Card style={styles.infoCard}>
        <InfoRow icon={Briefcase}  label="Employee #"    value={emp.employeeNumber} />
        <InfoRow icon={Briefcase}  label="Type"          value={empTypeName(emp.employmentType)} />
        <InfoRow icon={DollarSign} label="Hourly Rate"   value={formatCurrency(emp.baseHourlyRate) + '/hr'} />
        <InfoRow icon={Clock}      label="Weekly Hours"  value={emp.weeklyHours ? `${emp.weeklyHours}h` : null} />
        <InfoRow icon={Calendar}   label="Start Date"    value={formatDate(emp.startDate)} />
        <InfoRow icon={Calendar}   label="End Date"      value={emp.endDate ? formatDate(emp.endDate) : 'Current'} />
        <InfoRow icon={Briefcase}  label="Department"    value={emp.department?.name} />
        <InfoRow icon={Shield}     label="Org Role"      value={emp.orgRole?.name} />
        <InfoRow icon={Shield}     label="Portal Access" value={portalStatus ?? 'No access'} />
      </Card>

      {(emp.addressLine1 || emp.suburb || emp.state || emp.postcode) && (
        <>
          <SectionTitle>ADDRESS</SectionTitle>
          <Card style={styles.infoCard}>
            <InfoRow icon={MapPin} label="Address"  value={emp.addressLine1} />
            <InfoRow icon={MapPin} label="Line 2"   value={emp.addressLine2} />
            <InfoRow icon={MapPin} label="Suburb"   value={emp.suburb} />
            <InfoRow icon={MapPin} label="State"    value={emp.state} />
            <InfoRow icon={MapPin} label="Postcode" value={emp.postcode} />
          </Card>
        </>
      )}

      {isAdmin && (
        <>
          <SectionTitle>FINANCIAL</SectionTitle>
          <Card style={styles.infoCard}>
            <InfoRow icon={DollarSign} label="TFN"        value={emp.taxFileNumber ? '•••  •••  •••' : '—'} />
            <InfoRow icon={DollarSign} label="BSB"        value={emp.bankBsb} />
            <InfoRow icon={DollarSign} label="Account #"  value={emp.bankAccount} />
            <InfoRow icon={DollarSign} label="Super Fund" value={emp.superFundName} />
            <InfoRow icon={DollarSign} label="Member #"   value={emp.superMemberNumber} />
          </Card>
        </>
      )}
    </View>
  );
}

// ── Edit form modal ───────────────────────────────────────────────────────────

function FieldLabel({children}) {
  const colors = useColors();
  return <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{children}</AppText>;
}
function StyledInput({value, onChangeText, ...props}) {
  const colors = useColors();
  return (
    <TextInput
      style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
      value={value} onChangeText={onChangeText}
      placeholderTextColor={colors.textTertiary} {...props}
    />
  );
}
function InlineDropdown({label, value, options, onChange}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.code === value);
  return (
    <View style={styles.dropdownWrap}>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        style={[styles.dropdownBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}
        onPress={() => setOpen(v => !v)}>
        <AppText style={[styles.dropdownText, {color: selected ? colors.text : colors.textTertiary}]}>
          {selected?.name ?? 'Select…'}
        </AppText>
        <ChevronDown size={15} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          {options.map(o => (
            <TouchableOpacity key={o.code}
              onPress={() => {onChange(o.code); setOpen(false);}}
              style={[styles.dropdownOption, {borderBottomColor: colors.border}]}>
              <AppText style={[styles.dropdownOptionText, {
                color: o.code === value ? colors.primary : colors.text,
                fontWeight: o.code === value ? fontWeight.semiBold : fontWeight.regular,
              }]}>{o.name}</AppText>
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
            <TouchableOpacity key={o.code} onPress={() => onChange(o.code)}
              style={[styles.chip, {borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.surface}]}>
              <AppText style={[styles.chipText, {color: active ? colors.primary : colors.textSecondary}]}>{o.name}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function EditEmpModal({emp, departments, orgRoles, onClose, onSave, saving}) {
  const colors = useColors();
  const [firstName,      setFirstName]      = useState(emp.firstName      ?? '');
  const [lastName,       setLastName]       = useState(emp.lastName       ?? '');
  const [email,          setEmail]          = useState(emp.email          ?? '');
  const [phone,          setPhone]          = useState(emp.phone          ?? '');
  const [employeeNumber, setEmployeeNumber] = useState(emp.employeeNumber ?? '');
  const [employmentType, setEmploymentType] = useState(emp.employmentType ?? 'CASUAL');
  const [baseHourlyRate, setBaseHourlyRate] = useState(emp.baseHourlyRate != null ? String(emp.baseHourlyRate) : '');
  const [weeklyHours,    setWeeklyHours]    = useState(emp.weeklyHours    != null ? String(emp.weeklyHours)    : '');
  const [startDate,      setStartDate]      = useState(emp.startDate ? emp.startDate.split('T')[0] : '');
  const [endDate,        setEndDate]        = useState(emp.endDate   ? emp.endDate.split('T')[0]   : '');
  const [departmentId,   setDepartmentId]   = useState(emp.departmentId ?? '');
  const [orgRoleId,      setOrgRoleId]      = useState(emp.orgRoleId ?? '');
  const [state,          setState]          = useState(emp.state ?? '');
  const [addressLine1,   setAddressLine1]   = useState(emp.addressLine1 ?? '');
  const [suburb,         setSuburb]         = useState(emp.suburb        ?? '');
  const [postcode,       setPostcode]       = useState(emp.postcode       ?? '');

  const deptOptions  = [{code: '', name: 'No department'}, ...(departments ?? []).map(d => ({code: d.id, name: d.name}))];
  const roleOptions  = [{code: '', name: 'No role'},       ...(orgRoles    ?? []).map(r => ({code: r.id, name: r.name}))];
  const stateOptions = [{code: '', name: 'Select state'},  ...AU_STATES];

  function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !employeeNumber.trim()) {
      Alert.alert('Required', 'First name, last name, and employee # are required.'); return;
    }
    const rate = parseFloat(baseHourlyRate);
    if (baseHourlyRate && (isNaN(rate) || rate <= 0)) {
      Alert.alert('Invalid', 'Enter a valid hourly rate.'); return;
    }
    onSave({
      firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim().toLowerCase() || undefined,
      phone: phone.trim() || undefined,
      employeeNumber: employeeNumber.trim(), employmentType,
      baseHourlyRate: baseHourlyRate ? rate : undefined,
      weeklyHours:    weeklyHours    ? parseFloat(weeklyHours) : undefined,
      startDate: startDate || undefined, endDate: endDate || undefined,
      departmentId: departmentId || null, orgRoleId: orgRoleId || null,
      state: state || undefined,
      addressLine1: addressLine1.trim() || undefined,
      suburb:       suburb.trim()       || undefined,
      postcode:     postcode.trim()     || undefined,
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>Edit Employee</AppText>
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
            <FieldLabel>EMAIL</FieldLabel>
            <StyledInput value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <FieldLabel>PHONE</FieldLabel>
            <StyledInput value={phone} onChangeText={setPhone} placeholder="04XX XXX XXX" keyboardType="phone-pad" />

            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>EMPLOYMENT</AppText>
            <FieldLabel>EMPLOYEE # *</FieldLabel>
            <StyledInput value={employeeNumber} onChangeText={setEmployeeNumber} placeholder="e.g. EMP-001" autoCapitalize="characters" />
            <ChipSelector label="TYPE *" options={EMPLOYMENT_TYPES} value={employmentType} onChange={setEmploymentType} />
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>HOURLY RATE ($)</FieldLabel>
                <StyledInput value={baseHourlyRate} onChangeText={setBaseHourlyRate} placeholder="28.50" keyboardType="decimal-pad" />
              </View>
              <View style={{flex: 1}}>
                <FieldLabel>WEEKLY HOURS</FieldLabel>
                <StyledInput value={weeklyHours} onChangeText={setWeeklyHours} placeholder="38" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>START DATE</FieldLabel>
                <StyledInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{flex: 1}}>
                <FieldLabel>END DATE</FieldLabel>
                <StyledInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>ORGANISATION</AppText>
            <InlineDropdown label="DEPARTMENT" value={departmentId} options={deptOptions} onChange={setDepartmentId} />
            <InlineDropdown label="ROLE"        value={orgRoleId}   options={roleOptions}  onChange={setOrgRoleId} />
            <AppText style={[styles.sectionDivider, {color: colors.textSecondary}]}>ADDRESS</AppText>
            <FieldLabel>ADDRESS LINE 1</FieldLabel>
            <StyledInput value={addressLine1} onChangeText={setAddressLine1} placeholder="Street address" />
            <View style={styles.formRow}>
              <View style={{flex: 1}}>
                <FieldLabel>SUBURB</FieldLabel>
                <StyledInput value={suburb} onChangeText={setSuburb} placeholder="Suburb" />
              </View>
              <View style={{flex: 1}}>
                <FieldLabel>POSTCODE</FieldLabel>
                <StyledInput value={postcode} onChangeText={setPostcode} placeholder="2000" keyboardType="number-pad" />
              </View>
            </View>
            <InlineDropdown label="STATE" value={state} options={stateOptions} onChange={setState} />
            <Button
              label={saving ? 'Saving…' : 'Save Changes'}
              variant="primary" fullWidth loading={saving} onPress={handleSave}
              style={{marginTop: spacing[4], marginBottom: spacing[8]}}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EmployeeDetailScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const {id}       = route.params ?? {};

  const isAdmin    = useAppSelector(selectIsAdmin);
  const canManage  = useAppSelector(selectCanManage);
  const canPayroll = useAppSelector(selectHasPerm('payroll.manage'));
  const canEdit    = useAppSelector(selectHasPerm('employees.edit'));

  const [activeTab,  setActiveTab]  = useState('details');
  const [periodIdx,  setPeriodIdx]  = useState(0);
  const [editOpen,   setEditOpen]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Static data ─────────────────────────────────────────────────────────
  const {data: emp,     isLoading, isError, refetch} = useGetEmployeeQuery(id, {skip: !id});
  const {data: policy}                                = useGetPayrollPolicyQuery(undefined, {skip: !id});
  const {data: balances = []}                         = useGetLeaveBalanceQuery(id, {skip: !id});
  const {data: departments = []}                      = useListDepartmentsQuery(undefined, {skip: !canEdit});
  const {data: orgRoles = []}                         = useListOrgRolesQuery(undefined,    {skip: !canEdit});
  const [updateEmp, {isLoading: updating}]            = useUpdateEmployeeMutation();

  // ── Build periods from policy ────────────────────────────────────────────
  const periods = useMemo(
    () => policy ? buildPeriods(policy.payrollCycleType, policy.payrollCycleDays) : buildPeriods('fortnightly'),
    [policy],
  );
  const period = periods[periodIdx] ?? null;

  const from = period?.periodStart instanceof Date ? period.periodStart.toISOString() : undefined;
  const to   = period?.periodEnd   instanceof Date ? period.periodEnd.toISOString()   : undefined;

  // ── Period-filtered data ─────────────────────────────────────────────────
  const {data: attData,   isFetching: attLoading}   = useGetAttendanceListQuery({employeeId: id, from, to, pageSize: 200}, {skip: !id || !from});
  const {data: shiftData, isFetching: shiftLoading} = useListShiftsQuery({employeeId: id, from, to, pageSize: 200},      {skip: !id || !from});
  const {data: leaveData, isFetching: leaveLoading} = useListLeaveQuery({employeeId: id, from, to, pageSize: 200},       {skip: !id || !from});
  const {data: payslipData, isFetching: payslipLoading} = useListEmployeePayslipsQuery({employeeId: id, pageSize: 50},   {skip: !id || !canPayroll});

  const attItems   = Array.isArray(attData)   ? attData   : (attData?.items   ?? []);
  const shiftItems = Array.isArray(shiftData) ? shiftData : (shiftData?.items ?? []);
  const leaveItems = Array.isArray(leaveData) ? leaveData : (leaveData?.items ?? []);
  const allPayslips = Array.isArray(payslipData) ? payslipData : (payslipData?.items ?? []);

  // Find the payslip that overlaps the selected period (same logic as web)
  const periodPayslip = period ? allPayslips.find(p => {
    const ps = p.payrollPeriod?.periodStart;
    const pe = p.payrollPeriod?.periodEnd;
    if (!ps || !pe) return false;
    return new Date(pe) >= period.periodStart && new Date(ps) <= period.periodEnd;
  }) ?? null : null;

  // ── Leave balance ────────────────────────────────────────────────────────
  const annualLeave = useMemo(() => {
    const arr = Array.isArray(balances) ? balances : (balances?.items ?? []);
    return arr.find(b => b.type === 'ANNUAL');
  }, [balances]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSave(patch) {
    try {
      await updateEmp({id: emp.id, ...patch}).unwrap();
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not update employee.');
    }
  }

  // ── Tab definitions (payslips tab only shown if canPayroll) ──────────────
  const SUB_TABS = [
    {id: 'details',    label: 'Details'},
    {id: 'attendance', label: 'Attendance'},
    {id: 'shifts',     label: 'Shifts'},
    {id: 'leave',      label: 'Leave'},
    ...(canPayroll ? [{id: 'payslip', label: 'Payslip'}] : []),
  ];

  // ── Loading / error guards ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {paddingTop: insets.top + spacing[2], backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, {color: colors.text}]}>Employee</AppText>
        </View>
        <View style={styles.center}><Spinner /></View>
      </View>
    );
  }

  if (isError || !emp) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {paddingTop: insets.top + spacing[2], backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, {color: colors.text}]}>Employee</AppText>
        </View>
        <View style={styles.center}>
          <AppText style={{color: colors.error}}>Employee not found.</AppText>
        </View>
      </View>
    );
  }

  const fullName     = `${emp.firstName} ${emp.lastName}`;
  const portalStatus = emp.user?.status ?? null;
  const deptList     = Array.isArray(departments) ? departments : (departments?.items ?? []);
  const roleList     = Array.isArray(orgRoles)    ? orgRoles    : (orgRoles?.items ?? []);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, {
        paddingTop: insets.top + spacing[2],
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, {color: colors.text}]} numberOfLines={1}>
          {fullName}
        </AppText>
        {canEdit && (
          <TouchableOpacity
            onPress={() => setEditOpen(true)}
            style={[styles.editHeaderBtn, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
            <Edit2 size={14} color={colors.primary} />
            <AppText style={[styles.editHeaderText, {color: colors.primary}]}>Edit</AppText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <Card style={styles.profileCard}>
          <View style={[styles.profileAccent, {backgroundColor: colors.primary}]} />
          <View style={styles.profileBody}>
            <Avatar name={fullName} size="xl" />
            <View style={styles.profileInfo}>
              <AppText style={[styles.profileName, {color: colors.text}]}>{fullName}</AppText>
              <AppText style={[styles.profileNum,  {color: colors.textTertiary}]}>#{emp.employeeNumber}</AppText>
              <View style={styles.badgeRow}>
                <Badge status={emp.employmentType} label={empTypeName(emp.employmentType)} size="sm" />
                {portalStatus && <Badge status={portalStatus} label={portalStatus} size="sm" />}
              </View>
              {(emp.department || emp.orgRole) && (
                <View style={styles.tagRow}>
                  {emp.department && (
                    <View style={[styles.colorTag, {backgroundColor: (emp.department.color ?? colors.primary) + '22'}]}>
                      <View style={[styles.tagDot, {backgroundColor: emp.department.color ?? colors.primary}]} />
                      <AppText style={[styles.tagText, {color: emp.department.color ?? colors.primary}]}>
                        {emp.department.name}
                      </AppText>
                    </View>
                  )}
                  {emp.orgRole && (
                    <View style={[styles.colorTag, {backgroundColor: (emp.orgRole.color ?? colors.info) + '22'}]}>
                      <View style={[styles.tagDot, {backgroundColor: emp.orgRole.color ?? colors.info}]} />
                      <AppText style={[styles.tagText, {color: emp.orgRole.color ?? colors.info}]}>
                        {emp.orgRole.name}
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* ── Quick stats ──────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            {label: 'Hourly Rate',  value: formatCurrency(emp.baseHourlyRate) + '/hr', icon: DollarSign, color: colors.primary},
            {label: 'Annual Leave', value: annualLeave ? `${Number(annualLeave.hoursAvailable).toFixed(1)}h` : '—', icon: Umbrella, color: colors.success},
            {label: 'Weekly Hours', value: emp.weeklyHours ? `${emp.weeklyHours}h` : '—', icon: Clock, color: colors.info},
            {label: 'Last Login',   value: emp.user?.lastLoginAt ? dayjs(emp.user.lastLoginAt).format('D MMM') : 'Never', icon: Shield, color: colors.warning},
          ].map(({label, value, icon: Icon, color}) => (
            <View key={label} style={[styles.statTile, {backgroundColor: colors.surface, borderColor: colors.border}]}>
              <View style={[styles.statIcon, {backgroundColor: color + '18'}]}>
                <Icon size={14} color={color} />
              </View>
              <AppText style={[styles.statLabel, {color: colors.textTertiary}]}>{label}</AppText>
              <AppText style={[styles.statValue, {color: colors.text}]} numberOfLines={1}>{value}</AppText>
            </View>
          ))}
        </View>

        {/* ── Period selector (shown on non-details tabs) ───────────────── */}
        {activeTab !== 'details' && (
          <PeriodSelector
            period={period}
            periodIdx={periodIdx}
            periods={periods}
            policy={policy}
            onPrev={() => setPeriodIdx(i => Math.max(0, i - 1))}
            onNext={() => setPeriodIdx(i => Math.min(periods.length - 1, i + 1))}
          />
        )}

        {/* ── Summary tiles (non-details tabs) ─────────────────────────── */}
        {activeTab !== 'details' && (
          <SummaryTiles
            attItems={attItems}
            shiftItems={shiftItems}
            leaveItems={leaveItems}
            payslip={periodPayslip}
            canPayroll={canPayroll}
          />
        )}

        {/* ── Sub-tab bar ───────────────────────────────────────────────── */}
        <View style={[styles.tabBar, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          {SUB_TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[styles.tabBtn, activeTab === t.id && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}>
              <AppText style={[styles.tabLabel, {color: activeTab === t.id ? colors.primary : colors.textSecondary}]}>
                {t.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        {activeTab === 'details' && <DetailsContent emp={emp} isAdmin={isAdmin} />}
        {activeTab === 'attendance' && <AttendanceContent records={attItems} loading={attLoading} />}
        {activeTab === 'shifts'     && <ShiftsContent    shifts={shiftItems}  loading={shiftLoading} />}
        {activeTab === 'leave'      && <LeaveContent     requests={leaveItems} loading={leaveLoading} />}
        {activeTab === 'payslip'    && <PayslipsContent  payslip={periodPayslip} allPayslips={allPayslips} loading={payslipLoading} />}
      </ScrollView>

      {editOpen && canEdit && (
        <EditEmpModal
          emp={emp}
          departments={deptList}
          orgRoles={roleList}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
          saving={updating}
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
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  backBtn:       {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  headerTitle:   {flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold},
  editHeaderBtn: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1},
  editHeaderText:{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  content: {padding: spacing[4], gap: spacing[3]},

  // Profile card
  profileCard:   {padding: 0, overflow: 'hidden'},
  profileAccent: {height: 4},
  profileBody:   {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], padding: spacing[4]},
  profileInfo:   {flex: 1, minWidth: 0, gap: spacing[2]},
  profileName:   {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  profileNum:    {fontSize: fontSize.xs},
  badgeRow:      {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  tagRow:        {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  colorTag:      {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full},
  tagDot:        {width: 6, height: 6, borderRadius: 3},
  tagText:       {fontSize: 11, fontWeight: fontWeight.semiBold},

  // Quick stats
  statsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  statTile: {flex: 1, minWidth: '44%', borderRadius: radius.md, borderWidth: 1, padding: spacing[3], gap: spacing[1]},
  statIcon: {width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 2},
  statLabel:{fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.4},
  statValue:{fontSize: fontSize.sm, fontWeight: fontWeight.bold},

  // Period selector
  periodSelector: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, padding: spacing[3],
  },
  periodArrow: {padding: spacing[2]},
  periodCenter:{flex: 1, alignItems: 'center', gap: 2},
  periodLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  periodSub:   {fontSize: fontSize.xs},

  // Summary tiles
  tilesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  summaryTile: {
    flex: 1, minWidth: '44%', borderRadius: radius.md,
    borderWidth: 1, padding: spacing[3], gap: 2,
  },
  tileLabel:{fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.4},
  tileValue:{fontSize: fontSize.lg, fontWeight: fontWeight.bold, lineHeight: 22},
  tileSub:  {fontSize: 11},

  // Sub-tab bar
  tabBar: {
    flexDirection: 'row', borderRadius: radius.md,
    borderWidth: 1, overflow: 'hidden',
  },
  tabBtn:  {flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 2, borderBottomColor: 'transparent'},
  tabLabel:{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  // Section title
  sectionTitle: {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.7},

  // Info rows (Details tab)
  infoCard: {padding: spacing[1]},
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderBottomWidth: 1, gap: spacing[3],
  },
  infoLeft:  {flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, minWidth: 80},
  infoLabel: {fontSize: fontSize.xs, fontWeight: fontWeight.medium},
  infoValue: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, textAlign: 'right', flex: 1},

  // Activity tab rows
  tabCenter:    {paddingVertical: spacing[8], alignItems: 'center'},
  tabEmpty:     {paddingVertical: spacing[8], alignItems: 'center', gap: spacing[3]},
  tabEmptyText: {fontSize: fontSize.sm, textAlign: 'center'},
  rowCard:      {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[3], gap: spacing[3], borderWidth: 1},
  rowCardLeft:  {flex: 1, gap: 2},
  rowCardDate:  {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  rowCardSub:   {fontSize: fontSize.xs},
  rowCardMeta:  {fontSize: 11},

  // Payslip tab
  payslipHero:     {padding: 0, overflow: 'hidden'},
  payslipAccent:   {height: 3},
  payslipHeroBody: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: spacing[4]},
  payslipHeroLabel:{fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5},
  payslipHeroValue:{fontSize: 28, fontWeight: fontWeight.bold, lineHeight: 34, marginTop: 4},
  payslipPayDate:  {fontSize: fontSize.xs, marginTop: 4},

  // Edit modal
  overlay:    {flex: 1, justifyContent: 'flex-end'},
  sheet:      {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '92%'},
  sheetHeader:{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  sheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  closeBtn:   {padding: spacing[2]},
  sectionDivider:{fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing[4], marginBottom: spacing[2]},
  formRow:    {flexDirection: 'row', gap: spacing[3]},
  fieldLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1]},
  textInput:  {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm, marginBottom: spacing[3]},
  dropdownWrap:{marginBottom: spacing[3]},
  dropdownBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3]},
  dropdownText:{fontSize: fontSize.sm, flex: 1},
  dropdownList:{borderWidth: 1, borderRadius: radius.md, marginTop: spacing[1], overflow: 'hidden', zIndex: 10},
  dropdownOption:{paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1},
  dropdownOptionText:{fontSize: fontSize.sm},
  chipRow:    {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2]},
  chip:       {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  chipText:   {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},
});
