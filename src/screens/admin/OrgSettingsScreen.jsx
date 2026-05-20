import React, {useState, useEffect} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Building2, Clock, DollarSign, TrendingUp, CalendarDays, PiggyBank, RefreshCw, Receipt} from 'lucide-react-native';
import {colors, spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {AppText, Button, Spinner, Dropdown} from '@components/ui';
import {AppHeader} from '@components/common';
import {
  useGetOrgInfoQuery,
  useUpdateOrgInfoMutation,
  useGetPayrollPolicyQuery,
  useUpdatePayrollPolicyMutation,
} from '@features/admin/adminApi';

// ── AU states & industries ──────────────────────────────────────────────────

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const INDUSTRIES = [
  'Agriculture', 'Construction', 'Education', 'Finance & Insurance',
  'Healthcare', 'Hospitality', 'IT & Technology', 'Manufacturing',
  'Mining', 'Professional Services', 'Retail', 'Transport & Logistics', 'Other',
];

const TZ_OPTS = [
  {value: 'Australia/Sydney',    label: 'Sydney / Melbourne / Canberra (AEDT)'},
  {value: 'Australia/Brisbane',  label: 'Brisbane (AEST, no DST)'},
  {value: 'Australia/Adelaide',  label: 'Adelaide (ACDT/ACST)'},
  {value: 'Australia/Perth',     label: 'Perth (AWST)'},
  {value: 'Australia/Darwin',    label: 'Darwin (ACST, no DST)'},
  {value: 'Australia/Hobart',    label: 'Hobart (AEDT/AEST)'},
  {value: 'Pacific/Auckland',    label: 'Auckland (NZDT/NZST)'},
  {value: 'Asia/Kolkata',        label: 'India (IST, UTC+5:30)'},
  {value: 'Asia/Singapore',      label: 'Singapore (SGT, UTC+8)'},
  {value: 'America/New_York',    label: 'New York (EST/EDT)'},
  {value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)'},
  {value: 'UTC',                 label: 'UTC (Coordinated Universal Time)'},
];

const TIME_FMT = [
  {value: '12h', label: '12-hour  (e.g. 3:45 PM)'},
  {value: '24h', label: '24-hour  (e.g. 15:45)'},
];

const DATE_FMT = [
  {value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — Australian standard'},
  {value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — US style'},
  {value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — ISO 8601'},
  {value: 'D MMM YYYY', label: 'D MMM YYYY — Human-readable'},
];

const PAY_CYCLES = [
  {value: 'fortnightly', label: 'Fortnightly', desc: 'Every 14 days — most common in Australia'},
  {value: 'monthly',     label: 'Monthly',     desc: '1st to last day of each calendar month'},
];

const TAX_SCALES = [
  {value: 'scale1', label: 'Scale 1 — Tax-free threshold claimed', desc: 'Lower withholding. Employee claimed threshold on TFN declaration.'},
  {value: 'scale2', label: 'Scale 2 — No tax-free threshold',      desc: 'Higher withholding. Employee did not claim or has not lodged a TFN declaration.'},
];

// ── Reusable field components ────────────────────────────────────────────────

function FieldLabel({label}) {
  const colors = useColors();
  return (
    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{label}</AppText>
  );
}

function StyledInput({label, value, onChangeText, ...rest}) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      {label ? <FieldLabel label={label} /> : null}
      <TextInput
        style={[styles.textInput, {
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          color: colors.text,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textTertiary}
        {...rest}
      />
    </View>
  );
}

function SectionCard({title, children}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      {title ? <AppText style={[styles.sectionTitle, {color: colors.text}]}>{title}</AppText> : null}
      {children}
    </View>
  );
}

function Row({children}) {
  return <View style={styles.row}>{children}</View>;
}

function RadioGroup({options, value, onChange}) {
  const colors = useColors();
  return (
    <View style={styles.radioGroup}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.radioCard,
              {borderColor: active ? colors.primary : colors.border,
               backgroundColor: active ? colors.primaryLight : colors.surface},
            ]}>
            <View style={[styles.radioCircle, {borderColor: active ? colors.primary : colors.border}]}>
              {active && <View style={[styles.radioDot, {backgroundColor: colors.primary}]} />}
            </View>
            <View style={{flex: 1}}>
              <AppText style={[styles.radioLabel, {color: active ? colors.primary : colors.text}]}>
                {o.label}
              </AppText>
              {o.desc && (
                <AppText style={[styles.radioDesc, {color: colors.textSecondary}]}>{o.desc}</AppText>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ChipPicker({options, value, onChange}) {
  const colors = useColors();
  return (
    <View style={styles.chipPicker}>
      {options.map(o => {
        const active = value === o;
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onChange(o)}
            style={[
              styles.chip,
              {borderColor: active ? colors.primary : colors.border,
               backgroundColor: active ? colors.primaryLight : colors.surface},
            ]}>
            <AppText style={[styles.chipText, {color: active ? colors.primary : colors.textSecondary}]}>
              {o}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PolicyInput({label, helper, value, onChangeText}) {
  const colors = useColors();
  return (
    <View style={[styles.inputWrap, {flex: 1}]}>
      <FieldLabel label={label} />
      <TextInput
        style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textTertiary}
      />
      {helper ? <AppText style={[styles.helper, {color: colors.textTertiary}]}>{helper}</AppText> : null}
    </View>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  {id: 'org',     label: 'Organisation', Icon: Building2},
  {id: 'display', label: 'Display & Time', Icon: Clock},
  {id: 'payroll', label: 'Payroll Policy', Icon: DollarSign},
];

function TabBar({active, onChange}) {
  const colors = useColors();
  return (
    <View style={[styles.tabBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
      {TABS.map(t => {
        const isActive = active === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[styles.tab, isActive && {borderBottomColor: colors.primary}]}>
            <t.Icon size={14} color={isActive ? colors.primary : colors.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
            <AppText style={[styles.tabLabel, {color: isActive ? colors.primary : colors.textSecondary},
              isActive && {fontWeight: fontWeight.semiBold}]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Organisation tab ─────────────────────────────────────────────────────────

function OrgTab({org, saving, onSave}) {
  const colors = useColors();
  const [form, setForm] = useState({
    name:         org?.name         ?? '',
    legalName:    org?.legalName    ?? '',
    contactEmail: org?.contactEmail ?? '',
    contactPhone: org?.contactPhone ?? '',
    industry:     org?.industry     ?? '',
    addressLine1: org?.addressLine1 ?? '',
    addressLine2: org?.addressLine2 ?? '',
    suburb:       org?.suburb       ?? '',
    state:        org?.state        ?? '',
    postcode:     org?.postcode     ?? '',
  });

  useEffect(() => {
    if (org) setForm({
      name:         org.name         ?? '',
      legalName:    org.legalName    ?? '',
      contactEmail: org.contactEmail ?? '',
      contactPhone: org.contactPhone ?? '',
      industry:     org.industry     ?? '',
      addressLine1: org.addressLine1 ?? '',
      addressLine2: org.addressLine2 ?? '',
      suburb:       org.suburb       ?? '',
      state:        org.state        ?? '',
      postcode:     org.postcode     ?? '',
    });
  }, [org?.id]);

  const set = key => val => setForm(f => ({...f, [key]: val}));

  return (
    <ScrollView
      contentContainerStyle={styles.tabScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <SectionCard title="Organisation Details">
        <Row>
          <StyledInput label="ORGANISATION NAME *" value={form.name} onChangeText={set('name')} autoCapitalize="words" />
          <StyledInput label="LEGAL NAME" value={form.legalName} onChangeText={set('legalName')} autoCapitalize="words" />
        </Row>
        <Row>
          <StyledInput label="CONTACT EMAIL" value={form.contactEmail} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" />
          <StyledInput label="CONTACT PHONE" value={form.contactPhone} onChangeText={set('contactPhone')} keyboardType="phone-pad" />
        </Row>
        <Dropdown
          label="INDUSTRY"
          value={form.industry}
          onChange={set('industry')}
          options={INDUSTRIES}
          placeholder="Select industry…"
          searchable
        />
      </SectionCard>

      <SectionCard title="Address">
        <StyledInput label="ADDRESS LINE 1" value={form.addressLine1} onChangeText={set('addressLine1')} autoCapitalize="words" />
        <StyledInput label="ADDRESS LINE 2" value={form.addressLine2} onChangeText={set('addressLine2')} placeholder="Apartment, unit…" autoCapitalize="words" />
        <StyledInput label="SUBURB / CITY" value={form.suburb} onChangeText={set('suburb')} autoCapitalize="words" />
        <Dropdown
          label="STATE"
          value={form.state}
          onChange={set('state')}
          options={AU_STATES.map(s => ({value: s, label: s}))}
          placeholder="Select state…"
        />
        <View style={{width: 140}}>
          <StyledInput label="POSTCODE" value={form.postcode} onChangeText={set('postcode')} keyboardType="number-pad" maxLength={4} />
        </View>
      </SectionCard>

      <Button
        label={saving ? 'Saving…' : 'Save Changes'}
        loading={saving}
        onPress={() => onSave(form)}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

// ── Display & Time tab ───────────────────────────────────────────────────────

function DisplayTab({org, saving, onSave}) {
  const colors = useColors();
  const [timezone,   setTimezone]   = useState(org?.timezone   ?? 'Australia/Sydney');
  const [timeFormat, setTimeFormat] = useState(org?.timeFormat ?? '12h');
  const [dateFormat, setDateFormat] = useState(org?.dateFormat ?? 'DD/MM/YYYY');

  useEffect(() => {
    if (org) {
      setTimezone(org.timezone   ?? 'Australia/Sydney');
      setTimeFormat(org.timeFormat ?? '12h');
      setDateFormat(org.dateFormat ?? 'DD/MM/YYYY');
    }
  }, [org?.id]);

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.infoAlert, {backgroundColor: colors.infoLight, borderColor: colors.info + '40'}]}>
        <AppText style={[styles.infoAlertText, {color: colors.info}]}>
          These settings apply to all users. Times and dates will be displayed in the selected timezone and format everywhere in the app.
        </AppText>
      </View>

      <SectionCard title="Timezone">
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary}]}>
          All clock-in/out times, shift schedules, and payroll dates are stored in UTC and displayed in this timezone.
        </AppText>
        <Dropdown
          label="TIMEZONE"
          value={timezone}
          onChange={setTimezone}
          options={TZ_OPTS}
          placeholder="Select timezone…"
          searchable
        />
      </SectionCard>

      <SectionCard title="Time Format">
        <RadioGroup options={TIME_FMT} value={timeFormat} onChange={setTimeFormat} />
      </SectionCard>

      <SectionCard title="Date Format">
        <RadioGroup options={DATE_FMT} value={dateFormat} onChange={setDateFormat} />
      </SectionCard>

      <Button
        label={saving ? 'Saving…' : 'Save Display Preferences'}
        loading={saving}
        onPress={() => onSave({timezone, timeFormat, dateFormat})}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

// ── Payroll Policy tab ───────────────────────────────────────────────────────

function RateRow({label, value, onChangeText, min, unit = '×', isLast = false}) {
  const colors = useColors();
  return (
    <View style={[styles.rateRow, !isLast && {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border}]}>
      <AppText style={[styles.rateLabel, {color: colors.text}]}>{label}</AppText>
      <View style={styles.rateRight}>
        {min && (
          <AppText style={[styles.rateMin, {color: colors.textTertiary}]}>min {min}</AppText>
        )}
        <View style={[styles.rateInputWrap, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
          <TextInput
            style={[styles.rateInput, {color: colors.text}]}
            value={String(value ?? '')}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <AppText style={[styles.rateUnit, {color: colors.textSecondary}]}>{unit}</AppText>
        </View>
      </View>
    </View>
  );
}

function TierCard({tier, color, hours, rate, onHours, onRate}) {
  const colors = useColors();
  return (
    <View style={[styles.tierCard, {borderColor: color + '40', backgroundColor: color + '08'}]}>
      <View style={styles.tierCardHeader}>
        <View style={[styles.tierBadge, {backgroundColor: color + '18'}]}>
          <AppText style={[styles.tierBadgeText, {color}]}>Tier {tier}</AppText>
        </View>
        <AppText style={[styles.rateMin, {color: colors.textTertiary}]}>
          {tier === 1 ? 'min 1.5×' : 'min 2.0×'}
        </AppText>
      </View>
      <View style={styles.tierFields}>
        <View style={styles.tierField}>
          <AppText style={[styles.rateMin, {color: colors.textSecondary, marginBottom: spacing[1]}]}>
            AFTER (hrs/day)
          </AppText>
          <View style={[styles.tierInputWrap, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <TextInput
              style={[styles.tierInput, {color: colors.text}]}
              value={String(hours ?? '')}
              onChangeText={onHours}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <AppText style={[styles.rateUnit, {color: colors.textSecondary}]}>h</AppText>
          </View>
        </View>
        <AppText style={[styles.tierArrow, {color: colors.textTertiary}]}>→</AppText>
        <View style={styles.tierField}>
          <AppText style={[styles.rateMin, {color: colors.textSecondary, marginBottom: spacing[1]}]}>
            RATE
          </AppText>
          <View style={[styles.tierInputWrap, {borderColor: colors.border, backgroundColor: colors.surface}]}>
            <TextInput
              style={[styles.tierInput, {color: colors.text}]}
              value={String(rate ?? '')}
              onChangeText={onRate}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <AppText style={[styles.rateUnit, {color: colors.textSecondary}]}>×</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

function PolicySectionHeader({Icon, title, color}) {
  const colors = useColors();
  return (
    <View style={styles.policySectionHeader}>
      <View style={[styles.policyIconWrap, {backgroundColor: color + '18'}]}>
        <Icon size={15} color={color} strokeWidth={2} />
      </View>
      <AppText style={[styles.sectionTitle, {color: colors.text, marginBottom: 0}]}>{title}</AppText>
    </View>
  );
}

function PayrollTab({policy, saving, onSave}) {
  const colors = useColors();
  const [form, setForm] = useState({
    saturdayRate:            policy?.saturdayRate            ?? 1.25,
    sundayRate:              policy?.sundayRate              ?? 1.5,
    publicHolidayRate:       policy?.publicHolidayRate       ?? 2.0,
    overtimeTier1Hours:      policy?.overtimeTier1Hours      ?? 8,
    overtimeTier1Rate:       policy?.overtimeTier1Rate       ?? 1.5,
    overtimeTier2Hours:      policy?.overtimeTier2Hours      ?? 10,
    overtimeTier2Rate:       policy?.overtimeTier2Rate       ?? 2.0,
    annualLeaveHoursPerYear: policy?.annualLeaveHoursPerYear ?? 152,
    sickLeaveHoursPerYear:   policy?.sickLeaveHoursPerYear   ?? 76,
    superRate:               policy?.superRate               ?? 0.115,
    payrollCycleType:        policy?.payrollCycleType        ?? 'fortnightly',
    taxScale:                policy?.taxScale                ?? 'scale1',
    medicareLevyExempt:      policy?.medicareLevyExempt      ?? false,
  });

  useEffect(() => {
    if (policy) setForm({
      saturdayRate:            policy.saturdayRate            ?? 1.25,
      sundayRate:              policy.sundayRate              ?? 1.5,
      publicHolidayRate:       policy.publicHolidayRate       ?? 2.0,
      overtimeTier1Hours:      policy.overtimeTier1Hours      ?? 8,
      overtimeTier1Rate:       policy.overtimeTier1Rate       ?? 1.5,
      overtimeTier2Hours:      policy.overtimeTier2Hours      ?? 10,
      overtimeTier2Rate:       policy.overtimeTier2Rate       ?? 2.0,
      annualLeaveHoursPerYear: policy.annualLeaveHoursPerYear ?? 152,
      sickLeaveHoursPerYear:   policy.sickLeaveHoursPerYear   ?? 76,
      superRate:               policy.superRate               ?? 0.115,
      payrollCycleType:        policy.payrollCycleType        ?? 'fortnightly',
      taxScale:                policy.taxScale                ?? 'scale1',
      medicareLevyExempt:      policy.medicareLevyExempt      ?? false,
    });
  }, [policy]);

  const set    = key => val => setForm(f => ({...f, [key]: val}));
  const setNum = key => val => setForm(f => ({...f, [key]: parseFloat(val) || 0}));

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Info banner */}
      <View style={[styles.infoAlert, {backgroundColor: colors.infoLight, borderColor: colors.info + '40'}]}>
        <AppText style={[styles.infoAlertText, {color: colors.info}]}>
          Values apply to all employees. Cannot go below Australian statutory minimums.
        </AppText>
      </View>

      {/* Penalty Rates */}
      <SectionCard>
        <PolicySectionHeader Icon={TrendingUp} title="Penalty Rates" color="#F59E0B" />
        <View style={[styles.rateTable, {borderColor: colors.border}]}>
          <RateRow label="Saturday"      value={form.saturdayRate}      onChangeText={setNum('saturdayRate')}      min="1.25×" />
          <RateRow label="Sunday"        value={form.sundayRate}        onChangeText={setNum('sundayRate')}        min="1.5×" />
          <RateRow label="Public Holiday" value={form.publicHolidayRate} onChangeText={setNum('publicHolidayRate')} min="2.0×" isLast />
        </View>
      </SectionCard>

      {/* Overtime */}
      <SectionCard>
        <PolicySectionHeader Icon={Clock} title="Overtime Tiers" color="#8B5CF6" />
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary, marginTop: spacing[1]}]}>
          Hours per day before each overtime tier kicks in.
        </AppText>
        <View style={styles.tierStack}>
          <TierCard
            tier={1} color="#8B5CF6"
            hours={form.overtimeTier1Hours} rate={form.overtimeTier1Rate}
            onHours={setNum('overtimeTier1Hours')} onRate={setNum('overtimeTier1Rate')}
          />
          <TierCard
            tier={2} color="#EF4444"
            hours={form.overtimeTier2Hours} rate={form.overtimeTier2Rate}
            onHours={setNum('overtimeTier2Hours')} onRate={setNum('overtimeTier2Rate')}
          />
        </View>
      </SectionCard>

      {/* Leave */}
      <SectionCard>
        <PolicySectionHeader Icon={CalendarDays} title="Leave Entitlements" color="#10B981" />
        <View style={[styles.rateTable, {borderColor: colors.border, marginTop: spacing[3]}]}>
          <RateRow label="Annual Leave"       value={form.annualLeaveHoursPerYear} onChangeText={setNum('annualLeaveHoursPerYear')} min="152 h" unit="h" />
          <RateRow label="Sick / Personal"    value={form.sickLeaveHoursPerYear}   onChangeText={setNum('sickLeaveHoursPerYear')}   min="76 h"  unit="h" isLast />
        </View>
      </SectionCard>

      {/* Superannuation */}
      <SectionCard>
        <PolicySectionHeader Icon={PiggyBank} title="Superannuation" color="#0EA5E9" />
        <View style={[styles.superRow, {marginTop: spacing[3]}]}>
          <View style={[styles.superInputWrap, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
            <TextInput
              style={[styles.superInput, {color: colors.text}]}
              value={String(form.superRate ?? '')}
              onChangeText={setNum('superRate')}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <View style={[styles.superPct, {backgroundColor: colors.primaryLight}]}>
              <AppText style={[styles.superPctText, {color: colors.primary}]}>
                {((parseFloat(form.superRate) || 0) * 100).toFixed(1)}%
              </AppText>
            </View>
          </View>
          <AppText style={[styles.superHelper, {color: colors.textTertiary}]}>
            Statutory min: 0.115 (11.5%)
          </AppText>
        </View>
      </SectionCard>

      {/* Pay Cycle */}
      <SectionCard>
        <PolicySectionHeader Icon={RefreshCw} title="Pay Cycle" color="#6366F1" />
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary, marginTop: spacing[1]}]}>
          Changing this only affects new periods.
        </AppText>
        <RadioGroup options={PAY_CYCLES} value={form.payrollCycleType} onChange={set('payrollCycleType')} />
      </SectionCard>

      {/* Tax Withholding */}
      <SectionCard>
        <PolicySectionHeader Icon={Receipt} title="Tax Withholding (ATO PAYG)" color="#EF4444" />
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary, marginTop: spacing[1]}]}>
          Uses ATO FY 2024-25 withholding tables.
        </AppText>
        <RadioGroup options={TAX_SCALES} value={form.taxScale} onChange={set('taxScale')} />

        <View style={[styles.toggleRow, {borderTopColor: colors.border}]}>
          <View style={{flex: 1}}>
            <AppText style={[styles.toggleLabel, {color: colors.text}]}>Medicare Levy Exempt</AppText>
            <AppText style={[styles.toggleDesc, {color: colors.textSecondary}]}>
              Enable for employees exempt from Medicare (e.g. certain visa holders).
            </AppText>
          </View>
          <Switch
            value={form.medicareLevyExempt}
            onValueChange={set('medicareLevyExempt')}
            trackColor={{false: colors.border, true: colors.primary}}
            thumbColor={colors.white}
          />
        </View>
      </SectionCard>

      <Button
        label={saving ? 'Saving…' : 'Save Policy'}
        variant="primary"
        fullWidth
        loading={saving}
        onPress={() => onSave(form)}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OrgSettingsScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setTab] = useState('org');

  const {data: org,    isLoading: orgLoading}    = useGetOrgInfoQuery();
  const {data: policy, isLoading: policyLoading} = useGetPayrollPolicyQuery();
  const [updateOrg,    {isLoading: savingOrg}]    = useUpdateOrgInfoMutation();
  const [updatePolicy, {isLoading: savingPolicy}] = useUpdatePayrollPolicyMutation();

  async function handleSaveOrg(data) {
    if (!data.name?.trim()) { Alert.alert('Required', 'Organisation name is required.'); return; }
    try {
      await updateOrg(data).unwrap();
      Alert.alert('Saved', 'Organisation details updated.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save.');
    }
  }

  async function handleSaveDisplay(data) {
    try {
      await updateOrg(data).unwrap();
      Alert.alert('Saved', 'Display preferences saved.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save.');
    }
  }

  async function handleSavePolicy(data) {
    try {
      await updatePolicy(data).unwrap();
      Alert.alert('Saved', 'Payroll policy updated.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save.');
    }
  }

  const isLoading = orgLoading || policyLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.root, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <AppHeader title="Organisation" />

      <TabBar active={activeTab} onChange={setTab} />

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : (
        <>
          {activeTab === 'org'     && <OrgTab     org={org}    saving={savingOrg}    onSave={handleSaveOrg} />}
          {activeTab === 'display' && <DisplayTab org={org}    saving={savingOrg}    onSave={handleSaveDisplay} />}
          {activeTab === 'payroll' && <PayrollTab policy={policy} saving={savingPolicy} onSave={handleSavePolicy} />}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[1], paddingVertical: spacing[3],
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: {fontSize: fontSize.xs},

  tabScroll: {padding: spacing[4], paddingBottom: spacing[8]},

  sectionCard: {
    borderWidth: 1, borderRadius: radius.lg,
    padding: spacing[4], marginBottom: spacing[4],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing[4]},
  sectionDesc:  {fontSize: fontSize.sm, marginBottom: spacing[3]},

  row:     {flexDirection: 'row', gap: spacing[3]},
  inputWrap: {flex: 1, marginBottom: spacing[3]},
  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm,
  },
  helper: {fontSize: 11, marginTop: spacing[1]},

  chipPicker: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3]},
  chip:       {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  chipText:   {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  stateRow:  {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3]},
  stateChip: {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  stateText: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},

  radioGroup: {gap: spacing[2]},
  radioCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    borderWidth: 1.5, borderRadius: radius.md,
    padding: spacing[4], marginBottom: spacing[2],
  },
  radioCircle: {width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0},
  radioDot:    {width: 8, height: 8, borderRadius: 4},
  radioLabel:  {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  radioDesc:   {fontSize: fontSize.xs, marginTop: 2},

  listOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[1],
  },
  listOptionLabel: {fontSize: fontSize.sm, flex: 1},

  policyRow: {flexDirection: 'row', marginBottom: spacing[2]},

  policySectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3]},
  policyIconWrap: {width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},

  rateTable: {borderWidth: 1, borderRadius: radius.md, overflow: 'hidden'},
  rateRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  rateLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1},
  rateRight: {flexDirection: 'row', alignItems: 'center', gap: spacing[3]},
  rateMin:   {fontSize: 10, fontWeight: fontWeight.semiBold, letterSpacing: 0.3, textTransform: 'uppercase'},
  rateInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.md,
    overflow: 'hidden', width: 86,
  },
  rateInput: {
    flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold,
    paddingHorizontal: spacing[2], paddingVertical: spacing[2],
    textAlign: 'center',
  },
  rateUnit: {
    paddingHorizontal: spacing[2], paddingVertical: spacing[2],
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
  },

  tierStack: {gap: spacing[3], marginTop: spacing[3]},
  tierCard:  {borderWidth: 1.5, borderRadius: radius.lg, padding: spacing[4], gap: spacing[3]},
  tierCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  tierBadge: {alignSelf: 'flex-start', paddingHorizontal: spacing[3], paddingVertical: 3, borderRadius: 999},
  tierBadgeText: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase'},
  tierFields:{flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2]},
  tierField: {flex: 1},
  tierArrow: {fontSize: fontSize.md, fontWeight: fontWeight.bold, paddingBottom: spacing[2]},
  tierInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.md, overflow: 'hidden',
  },
  tierInput: {
    flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold,
    paddingHorizontal: spacing[2], paddingVertical: spacing[2],
    textAlign: 'center', minWidth: 0,
  },

  superRow: {gap: spacing[2]},
  superInputWrap: {
    flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1, borderRadius: radius.md, overflow: 'hidden',
  },
  superInput: {
    flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  superPct: {paddingHorizontal: spacing[3], alignItems: 'center', justifyContent: 'center'},
  superPctText: {fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  superHelper: {fontSize: fontSize.xs},

  infoAlert:     {borderWidth: 1, borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[4]},
  infoAlertText: {fontSize: fontSize.sm},

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingTop: spacing[4], marginTop: spacing[2], borderTopWidth: 1,
  },
  toggleLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  toggleDesc:  {fontSize: fontSize.xs, marginTop: 2},

  saveBtn: {marginBottom: spacing[2]},
});
