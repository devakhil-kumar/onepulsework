import React, {useState, useEffect} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Building2, Clock, DollarSign} from 'lucide-react-native';
import {colors, spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {AppText, Button, Spinner} from '@components/ui';
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
      {title && <AppText style={[styles.sectionTitle, {color: colors.text}]}>{title}</AppText>}
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
        <FieldLabel label="INDUSTRY" />
        <ChipPicker options={INDUSTRIES} value={form.industry} onChange={set('industry')} />
      </SectionCard>

      <SectionCard title="Address">
        <StyledInput label="ADDRESS LINE 1" value={form.addressLine1} onChangeText={set('addressLine1')} autoCapitalize="words" />
        <StyledInput label="ADDRESS LINE 2" value={form.addressLine2} onChangeText={set('addressLine2')} placeholder="Apartment, unit…" autoCapitalize="words" />
        <StyledInput label="SUBURB / CITY" value={form.suburb} onChangeText={set('suburb')} autoCapitalize="words" />
        <FieldLabel label="STATE" />
        <View style={styles.stateRow}>
          {AU_STATES.map(s => {
            const active = form.state === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => set('state')(s)}
                style={[styles.stateChip, {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primaryLight : colors.surface,
                }]}>
                <AppText style={[styles.stateText, {color: active ? colors.primary : colors.textSecondary}]}>{s}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
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
        {TZ_OPTS.map(o => {
          const active = timezone === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => setTimezone(o.value)}
              style={[styles.listOption, {
                borderBottomColor: colors.border,
                backgroundColor: active ? colors.primaryLight : 'transparent',
              }]}>
              <View style={[styles.radioCircle, {borderColor: active ? colors.primary : colors.border}]}>
                {active && <View style={[styles.radioDot, {backgroundColor: colors.primary}]} />}
              </View>
              <AppText style={[styles.listOptionLabel, {color: active ? colors.primary : colors.text}]}>
                {o.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
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

  const set = key => val => setForm(f => ({...f, [key]: val}));
  const setNum = key => val => setForm(f => ({...f, [key]: parseFloat(val) || 0}));

  function handleSave() {
    onSave(form);
  }

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={[styles.infoAlert, {backgroundColor: colors.infoLight, borderColor: colors.info + '40'}]}>
        <AppText style={[styles.infoAlertText, {color: colors.info}]}>
          Empty fields use the platform default. Values cannot go below the Australian statutory minimum shown below each field.
        </AppText>
      </View>

      <SectionCard title="Penalty Rates (× multiplier)">
        <View style={styles.policyRow}>
          <PolicyInput label="SATURDAY RATE"       value={form.saturdayRate}      onChangeText={setNum('saturdayRate')}      helper="Min: 1.25×" />
          <View style={{width: spacing[3]}} />
          <PolicyInput label="SUNDAY RATE"         value={form.sundayRate}        onChangeText={setNum('sundayRate')}        helper="Min: 1.5×" />
          <View style={{width: spacing[3]}} />
          <PolicyInput label="PUBLIC HOLIDAY RATE" value={form.publicHolidayRate} onChangeText={setNum('publicHolidayRate')} helper="Min: 2.0×" />
        </View>
      </SectionCard>

      <SectionCard title="Overtime">
        <View style={styles.policyRow}>
          <PolicyInput label="TIER 1 THRESHOLD (hrs/day)" value={form.overtimeTier1Hours} onChangeText={setNum('overtimeTier1Hours')} helper="Hours before OT kicks in" />
          <View style={{width: spacing[3]}} />
          <PolicyInput label="TIER 1 RATE (×)"            value={form.overtimeTier1Rate}  onChangeText={setNum('overtimeTier1Rate')}  helper="Min: 1.5×" />
        </View>
        <View style={styles.policyRow}>
          <PolicyInput label="TIER 2 THRESHOLD (hrs/day)" value={form.overtimeTier2Hours} onChangeText={setNum('overtimeTier2Hours')} helper="Hours before Tier 2 OT" />
          <View style={{width: spacing[3]}} />
          <PolicyInput label="TIER 2 RATE (×)"            value={form.overtimeTier2Rate}  onChangeText={setNum('overtimeTier2Rate')}  helper="Min: 2.0×" />
        </View>
      </SectionCard>

      <SectionCard title="Leave (hours/year)">
        <View style={styles.policyRow}>
          <PolicyInput label="ANNUAL LEAVE"          value={form.annualLeaveHoursPerYear} onChangeText={setNum('annualLeaveHoursPerYear')} helper="NES min: 152 h" />
          <View style={{width: spacing[3]}} />
          <PolicyInput label="SICK / PERSONAL LEAVE" value={form.sickLeaveHoursPerYear}   onChangeText={setNum('sickLeaveHoursPerYear')}   helper="NES min: 76 h" />
        </View>
      </SectionCard>

      <SectionCard title="Superannuation">
        <View style={{width: '50%'}}>
          <PolicyInput label="SG RATE (e.g. 0.115 = 11.5%)" value={form.superRate} onChangeText={setNum('superRate')} helper="Min: 0.115 (11.5%)" />
        </View>
      </SectionCard>

      <SectionCard title="Pay Cycle">
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary}]}>
          Changing this only affects new periods — already-generated periods keep their original cycle.
        </AppText>
        <RadioGroup options={PAY_CYCLES} value={form.payrollCycleType} onChange={set('payrollCycleType')} />
      </SectionCard>

      <SectionCard title="Tax Withholding (ATO PAYG)">
        <AppText style={[styles.sectionDesc, {color: colors.textSecondary}]}>
          Controls how PAYG tax is withheld from employee pay. Uses ATO FY 2024-25 withholding tables.
        </AppText>
        <RadioGroup options={TAX_SCALES} value={form.taxScale} onChange={set('taxScale')} />

        <View style={[styles.toggleRow, {borderTopColor: colors.border}]}>
          <View style={{flex: 1}}>
            <AppText style={[styles.toggleLabel, {color: colors.text}]}>Medicare Levy Exempt</AppText>
            <AppText style={[styles.toggleDesc, {color: colors.textSecondary}]}>
              Enable if all employees are exempt (e.g. certain visa categories). Consult your accountant before enabling.
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
        loading={saving}
        onPress={handleSave}
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
