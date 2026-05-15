import React, {useState, useEffect, useMemo} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  ArrowLeft, User, Shield, Palette, MapPin, Banknote,
  Camera, Check,
} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {selectUser, setUser} from '@features/auth/authSlice';
import {selectTheme, setTheme} from '@features/ui/uiSlice';
import {
  useGetMyEmployeeQuery,
  useUpdateMeMutation,
  useUpdateMyEmployeeMutation,
  useChangePasswordMutation,
} from '@features/profile/profileApi';
import {AppText, Card, Button, Input, Avatar, Badge, Spinner} from '@components/ui';
import {formatDate} from '@utils/format';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

// ── Hero ───────────────────────────────────────────────────────────────────

function ProfileHero({user, emp}) {
  const colors = useColors();
  const chips  = emp ? [
    emp.employmentType?.replace(/_/g, ' '),
    emp.department?.name,
    emp.orgRole?.name,
  ].filter(Boolean) : [];

  return (
    <View style={[styles.heroCard, {backgroundColor: colors.surface}]}>
      {/* Gradient banner */}
      <View style={[styles.heroBanner, {backgroundColor: colors.primary}]}>
        <View style={styles.bannerCircle1} />
        <View style={styles.bannerCircle2} />
      </View>

      {/* Avatar row */}
      <View style={styles.heroBody}>
        <View style={styles.avatarWrap}>
          <Avatar name={user?.fullName} size={80} />
          <View style={[styles.cameraBtn, {backgroundColor: colors.primary}]}>
            <Camera size={14} color={colors.white} />
          </View>
        </View>

        <View style={styles.heroInfo}>
          <AppText style={[styles.heroName, {color: colors.text}]} numberOfLines={1}>
            {user?.fullName ?? '—'}
          </AppText>
          <AppText style={[styles.heroEmail, {color: colors.textSecondary}]} numberOfLines={1}>
            {user?.email ?? ''}
          </AppText>
          {user?.phone ? (
            <AppText style={[styles.heroPhone, {color: colors.textSecondary}]}>
              {user.phone}
            </AppText>
          ) : null}
          <View style={styles.heroBadgeRow}>
            <Badge status={user?.role} label={user?.role} size="sm" />
          </View>

          {chips.length > 0 && (
            <View style={styles.chipRow}>
              {chips.map(c => (
                <View key={c} style={[styles.chip, {backgroundColor: colors.primaryLight}]}>
                  <AppText style={[styles.chipText, {color: colors.primary}]}>{c}</AppText>
                </View>
              ))}
              {emp?.startDate && (
                <View style={[styles.chip, {backgroundColor: colors.surfaceAlt}]}>
                  <AppText style={[styles.chipText, {color: colors.textSecondary}]}>
                    Since {formatDate(emp.startDate, {month: 'short', year: 'numeric'})}
                  </AppText>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Stats strip */}
      <View style={[styles.statsStrip, {borderTopColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
        {[
          {label: 'Member since', value: user?.createdAt ? formatDate(user.createdAt) : '—'},
          {label: 'Status',       value: user?.status ?? 'ACTIVE'},
          {label: 'Role',         value: user?.role ?? '—'},
        ].map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.stripItem,
              i < 2 && {borderRightWidth: 1, borderRightColor: colors.border},
            ]}>
            <AppText style={[styles.stripLabel, {color: colors.textSecondary}]}>{s.label}</AppText>
            <AppText style={[styles.stripValue, {color: colors.text}]}>{s.value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────

const TAB_ICONS = {
  profile:    User,
  security:   Shield,
  appearance: Palette,
  contact:    MapPin,
  financial:  Banknote,
};

function TabBar({tabs, active, onChange}) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.tabBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}
      contentContainerStyle={styles.tabBarContent}>
      {tabs.map(t => {
        const Icon  = TAB_ICONS[t.id];
        const isActive = active === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[styles.tab, isActive && {borderBottomColor: colors.primary}]}>
            <Icon size={15} color={isActive ? colors.primary : colors.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
            <AppText style={[styles.tabLabel, {color: isActive ? colors.primary : colors.textSecondary}, isActive && {fontWeight: fontWeight.semiBold}]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Section card ───────────────────────────────────────────────────────────

function SectionCard({title, subtitle, children}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      {title && (
        <View style={styles.sectionCardHeader}>
          <AppText style={[styles.sectionCardTitle, {color: colors.text}]}>{title}</AppText>
          {subtitle && (
            <AppText style={[styles.sectionCardSub, {color: colors.textSecondary}]}>{subtitle}</AppText>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

// ── Info row (read-only) ───────────────────────────────────────────────────

function InfoGrid({items}) {
  const colors = useColors();
  return (
    <View style={styles.infoGrid}>
      {items.map(r => (
        <View key={r.label} style={[styles.infoItem, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
          <AppText style={[styles.infoLabel, {color: colors.textSecondary}]}>{r.label}</AppText>
          <AppText style={[styles.infoValue, {color: colors.text}]}>{r.value ?? '—'}</AppText>
        </View>
      ))}
    </View>
  );
}

// ── Tab: Profile ───────────────────────────────────────────────────────────

function ProfileTab({user, emp}) {
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone,    setPhone]    = useState(user?.phone ?? '');
  const [updateMe, {isLoading}] = useUpdateMeMutation();

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.id]);

  const isDirty = fullName !== (user?.fullName ?? '') || phone !== (user?.phone ?? '');

  async function handleSave() {
    if (!fullName.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    try {
      const updated = await updateMe({fullName: fullName.trim(), phone: phone.trim() || undefined}).unwrap();
      dispatch(setUser(updated));
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not update profile.');
    }
  }

  const empItems = emp ? [
    {label: 'Employee #',       value: emp.employeeNumber ?? '—'},
    {label: 'Employment type',  value: emp.employmentType?.replace(/_/g, ' ') ?? '—'},
    {label: 'Department',       value: emp.department?.name ?? '—'},
    {label: 'Role / position',  value: emp.orgRole?.name ?? '—'},
    {label: 'Start date',       value: emp.startDate ? formatDate(emp.startDate) : '—'},
    {label: 'Pay rate',         value: emp.payRate != null ? `$${Number(emp.payRate).toFixed(2)} / hr` : '—'},
  ] : [];

  return (
    <View style={styles.tabContent}>
      <SectionCard title="Personal Information">
        <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" helper="+61 400 000 000" />
        <Button label={isLoading ? 'Saving…' : 'Save Changes'} loading={isLoading} disabled={!isDirty} onPress={handleSave} style={styles.saveBtn} />
      </SectionCard>

      {emp && (
        <SectionCard title="Employment" subtitle="Contact your admin to update these.">
          <InfoGrid items={empItems} />
        </SectionCard>
      )}
    </View>
  );
}

// ── Tab: Security ──────────────────────────────────────────────────────────

function SecurityTab() {
  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [changePassword, {isLoading}] = useChangePasswordMutation();

  async function handleChange() {
    if (!current || !newPass || !confirm) { Alert.alert('Required', 'Fill in all fields.'); return; }
    if (newPass.length < 8) { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
    if (newPass !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    try {
      await changePassword({currentPassword: current, newPassword: newPass}).unwrap();
      Alert.alert('Done', 'Password changed successfully.');
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not change password.');
    }
  }

  return (
    <View style={styles.tabContent}>
      <SectionCard title="Change Password" subtitle="Choose a strong password of at least 8 characters.">
        <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <Input label="New password"     value={newPass} onChangeText={setNewPass} secureTextEntry helper="Minimum 8 characters" />
        <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button label={isLoading ? 'Updating…' : 'Update Password'} loading={isLoading} onPress={handleChange} style={styles.saveBtn} />
      </SectionCard>
    </View>
  );
}

// ── Tab: Appearance ────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  {id: 'light',  label: 'Light',  desc: 'Clean white interface',  lightBg: '#F1F3F8', darkBg: null},
  {id: 'dark',   label: 'Dark',   desc: 'Easy on the eyes',       lightBg: '#0D1117', darkBg: '#0D1117'},
  {id: 'system', label: 'System', desc: 'Follows your device',    lightBg: null,      darkBg: null},
];

function AppearanceTab() {
  const colors  = useColors();
  const dispatch = useAppDispatch();
  const theme    = useAppSelector(selectTheme);

  return (
    <View style={styles.tabContent}>
      <SectionCard title="Appearance" subtitle="Saved locally — each device remembers its own setting.">
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map(opt => {
            const isActive = theme === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => dispatch(setTheme(opt.id))}
                style={[
                  styles.themeOption,
                  {borderColor: isActive ? colors.primary : colors.border,
                   backgroundColor: isActive ? colors.primaryLight : colors.surface},
                ]}>
                {/* Preview mini */}
                {opt.id === 'system' ? (
                  <View style={styles.themePreview}>
                    <View style={[styles.themeHalf, {backgroundColor: '#F1F3F8'}]} />
                    <View style={[styles.themeHalf, {backgroundColor: '#0D1117'}]} />
                  </View>
                ) : (
                  <View style={[styles.themePreview, {backgroundColor: opt.lightBg}]}>
                    <View style={[styles.themeBar, {backgroundColor: '#7B61FF'}]} />
                    <View style={[styles.themeBarSm, {backgroundColor: opt.id === 'light' ? '#E5E8F0' : '#2A3050'}]} />
                  </View>
                )}
                <AppText style={[styles.themeLabel, {color: isActive ? colors.primary : colors.text}]}>
                  {opt.label}
                </AppText>
                <AppText style={[styles.themeDesc, {color: colors.textSecondary}]}>
                  {opt.desc}
                </AppText>
                {isActive && (
                  <View style={[styles.themeCheck, {backgroundColor: colors.primary}]}>
                    <Check size={10} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>
    </View>
  );
}

// ── Tab: Contact & Address ─────────────────────────────────────────────────

function ContactTab({emp}) {
  const colors = useColors();
  const [form, setForm] = useState({
    phone:        emp?.phone        ?? '',
    dateOfBirth:  emp?.dateOfBirth  ? emp.dateOfBirth.slice(0, 10) : '',
    addressLine1: emp?.addressLine1 ?? '',
    addressLine2: emp?.addressLine2 ?? '',
    suburb:       emp?.suburb       ?? '',
    state:        emp?.state        ?? '',
    postcode:     emp?.postcode     ?? '',
  });
  const [updateMyEmployee, {isLoading}] = useUpdateMyEmployeeMutation();

  const set = key => val => setForm(f => ({...f, [key]: val}));

  async function handleSave() {
    try {
      await updateMyEmployee(form).unwrap();
      Alert.alert('Saved', 'Contact details updated.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save.');
    }
  }

  return (
    <View style={styles.tabContent}>
      <SectionCard title="Contact & Address">
        <Input label="Mobile / phone"  value={form.phone}        onChangeText={set('phone')}        keyboardType="phone-pad" />
        <Input label="Date of birth"   value={form.dateOfBirth}  onChangeText={set('dateOfBirth')}  placeholder="YYYY-MM-DD" />
        <Input label="Address line 1"  value={form.addressLine1} onChangeText={set('addressLine1')} autoCapitalize="words" />
        <Input label="Address line 2"  value={form.addressLine2} onChangeText={set('addressLine2')} placeholder="Apartment, unit…" autoCapitalize="words" />
        <Input label="Suburb / city"   value={form.suburb}       onChangeText={set('suburb')}       autoCapitalize="words" />

        {/* State picker */}
        <AppText style={[styles.stateLabel, {color: colors.text}]}>State</AppText>
        <View style={styles.stateRow}>
          {AU_STATES.map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => set('state')(s)}
              style={[
                styles.stateChip,
                {borderColor: form.state === s ? colors.primary : colors.border,
                 backgroundColor: form.state === s ? colors.primaryLight : colors.surface},
              ]}>
              <AppText style={[styles.stateChipText, {color: form.state === s ? colors.primary : colors.textSecondary}]}>
                {s}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Postcode" value={form.postcode} onChangeText={set('postcode')} keyboardType="number-pad" style={styles.postcode} />
        <Button label={isLoading ? 'Saving…' : 'Save'} loading={isLoading} onPress={handleSave} style={styles.saveBtn} />
      </SectionCard>
    </View>
  );
}

// ── Tab: Financial ─────────────────────────────────────────────────────────

function FinancialTab({emp}) {
  const colors = useColors();
  const [form, setForm] = useState({
    taxFileNumber:     emp?.taxFileNumber     ?? '',
    bankBsb:           emp?.bankBsb           ?? '',
    bankAccount:       emp?.bankAccount       ?? '',
    superFundName:     emp?.superFundName     ?? '',
    superMemberNumber: emp?.superMemberNumber ?? '',
  });
  const [updateMyEmployee, {isLoading}] = useUpdateMyEmployeeMutation();
  const set = key => val => setForm(f => ({...f, [key]: val}));

  async function handleSave() {
    try {
      await updateMyEmployee(form).unwrap();
      Alert.alert('Saved', 'Financial details updated.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save.');
    }
  }

  return (
    <View style={styles.tabContent}>
      <View style={[styles.infoAlert, {backgroundColor: colors.infoLight, borderColor: colors.info + '40'}]}>
        <AppText style={[styles.infoAlertText, {color: colors.info}]}>
          Your TFN and bank details are stored securely and only used for payroll processing.
        </AppText>
      </View>
      <SectionCard title="Financial Details" subtitle="Used for payroll processing. Kept secure and private.">
        <Input label="Tax File Number (TFN)" value={form.taxFileNumber} onChangeText={set('taxFileNumber')} secureTextEntry keyboardType="number-pad" helper="8 or 9 digits" />
        <View style={styles.bsbRow}>
          <View style={{flex: 1}}>
            <Input label="Bank BSB" value={form.bankBsb} onChangeText={set('bankBsb')} keyboardType="number-pad" placeholder="000000" helper="6 digits, no dash" />
          </View>
          <View style={{flex: 1, marginLeft: spacing[3]}}>
            <Input label="Bank account #" value={form.bankAccount} onChangeText={set('bankAccount')} keyboardType="number-pad" />
          </View>
        </View>
        <Input label="Super fund name"     value={form.superFundName}     onChangeText={set('superFundName')}     autoCapitalize="words" />
        <Input label="Super member number" value={form.superMemberNumber} onChangeText={set('superMemberNumber')} />
        <Button label={isLoading ? 'Saving…' : 'Save'} loading={isLoading} onPress={handleSave} style={styles.saveBtn} />
      </SectionCard>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const user       = useAppSelector(selectUser);
  const [activeTab, setTab] = useState('profile');

  const {data: emp, isError: noEmp, isLoading: empLoading} = useGetMyEmployeeQuery();
  const hasEmp = !noEmp && !!emp;

  const TABS = useMemo(() => [
    {id: 'profile',    label: 'Profile'},
    {id: 'security',   label: 'Security'},
    {id: 'appearance', label: 'Appearance'},
    ...(hasEmp ? [
      {id: 'contact',   label: 'Contact'},
      {id: 'financial', label: 'Financial'},
    ] : []),
  ], [hasEmp]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Header and TabBar are outside KAV so keyboard never hides them */}
      <View style={[styles.header, {paddingTop: insets.top + spacing[2], backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <AppText style={[styles.headerTitle, {color: colors.text}]}>My Profile</AppText>
          <AppText style={[styles.headerSub, {color: colors.textSecondary}]}>Account settings</AppText>
        </View>
      </View>

      <TabBar tabs={TABS} active={activeTab} onChange={setTab} />

      {empLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : (
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, {paddingBottom: insets.bottom + spacing[6]}]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            <ProfileHero user={user} emp={hasEmp ? emp : null} />

            {activeTab === 'profile'    && <ProfileTab    user={user} emp={hasEmp ? emp : null} />}
            {activeTab === 'security'   && <SecurityTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'contact'    && hasEmp && <ContactTab    emp={emp} />}
            {activeTab === 'financial'  && hasEmp && <FinancialTab  emp={emp} />}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingBottom: spacing[4],
    borderBottomWidth: 1, gap: spacing[3],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  backBtn: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  headerSub:   {fontSize: fontSize.xs, marginTop: 1},

  tabBar: {
    borderBottomWidth: 1, maxHeight: 52, flexGrow: 0,
  },
  tabBarContent: {paddingHorizontal: spacing[2]},
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    marginHorizontal: spacing[1],
  },
  tabLabel: {fontSize: fontSize.sm},

  scrollContent: {padding: spacing[4]},

  // Hero
  heroCard: {borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing[4], shadowColor: '#0D1326', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3},
  heroBanner: {height: 100, position: 'relative', overflow: 'hidden'},
  bannerCircle1: {position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)'},
  bannerCircle2: {position: 'absolute', bottom: -50, right: 80, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)'},
  heroBody: {flexDirection: 'row', alignItems: 'flex-start', padding: spacing[4], paddingTop: 0, marginTop: -36, gap: spacing[3]},
  avatarWrap: {position: 'relative', flexShrink: 0},
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  heroInfo: {flex: 1, minWidth: 0, paddingTop: 42},
  heroName:     {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  heroEmail:    {fontSize: fontSize.sm, marginTop: 2},
  heroPhone:    {fontSize: fontSize.sm, marginTop: 1},
  heroBadgeRow: {marginTop: spacing[2]},
  chipRow:      {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[2]},
  chip:         {paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full},
  chipText:     {fontSize: 11, fontWeight: fontWeight.semiBold},

  statsStrip:    {flexDirection: 'row'},
  stripItem:     {flex: 1, paddingVertical: spacing[3], alignItems: 'center'},
  stripLabel:    {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3},
  stripValue:    {fontSize: fontSize.sm, fontWeight: fontWeight.bold},

  // Sections
  sectionCard: {
    borderWidth: 1, borderRadius: radius.lg,
    padding: spacing[5], marginBottom: spacing[4],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionCardHeader: {marginBottom: spacing[4]},
  sectionCardTitle:  {fontSize: fontSize.base, fontWeight: fontWeight.bold},
  sectionCardSub:    {fontSize: fontSize.sm, marginTop: 3},

  tabContent: {gap: 0},
  saveBtn: {marginTop: spacing[2]},

  // Info grid
  infoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3]},
  infoItem: {
    width: '47%', borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  infoLabel: {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  infoValue: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},

  // Appearance
  themeGrid: {flexDirection: 'row', gap: spacing[3]},
  themeOption: {
    flex: 1, borderWidth: 2, borderRadius: radius.lg,
    padding: spacing[3], alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  themePreview: {width: '100%', height: 50, borderRadius: radius.md, marginBottom: spacing[3], flexDirection: 'row', overflow: 'hidden'},
  themeHalf:    {flex: 1},
  themeBar:     {position: 'absolute', left: spacing[2], top: spacing[2], width: 20, height: 20, borderRadius: 4},
  themeBarSm:   {position: 'absolute', right: spacing[2], top: spacing[2], width: 28, height: 8, borderRadius: 4},
  themeLabel:   {fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 2},
  themeDesc:    {fontSize: fontSize.xs, textAlign: 'center'},
  themeCheck:   {position: 'absolute', top: spacing[2], right: spacing[2], width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},

  // Contact
  stateLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: spacing[2]},
  stateRow:   {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4]},
  stateChip:  {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  stateChipText: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  postcode:   {width: 100},

  // Financial
  infoAlert: {borderWidth: 1, borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[4]},
  infoAlertText: {fontSize: fontSize.sm},
  bsbRow:    {flexDirection: 'row'},
});
