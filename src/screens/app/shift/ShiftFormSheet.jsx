import React, {useState, useEffect} from 'react';
import {
  View, Modal, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import {X} from 'lucide-react-native';
import dayjs from 'dayjs';
import {AppText, Button, Dropdown, DateField, TimeField, MultiSelectField} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {useListShiftTemplatesQuery} from '@features/shift/shiftTemplateApi';
import {
  useCreateShiftMutation, useBulkAssignShiftsMutation, useUpdateShiftMutation,
  useAutoAssignShiftsMutation,
} from '@features/shift/shiftApi';
import {toWallClockInput} from '@utils/format';

const AU_STATES = [
  {value: 'NSW', label: 'New South Wales'}, {value: 'VIC', label: 'Victoria'},
  {value: 'QLD', label: 'Queensland'}, {value: 'WA', label: 'Western Australia'},
  {value: 'SA', label: 'South Australia'}, {value: 'TAS', label: 'Tasmania'},
  {value: 'ACT', label: 'Aust. Capital Territory'}, {value: 'NT', label: 'Northern Territory'},
];
const RECUR_OPTS = [
  {value: 'NONE', label: 'Does not repeat'}, {value: 'DAILY', label: 'Daily'},
  {value: 'WEEKLY', label: 'Weekly'}, {value: 'FORTNIGHTLY', label: 'Fortnightly'},
  {value: 'MONTHLY', label: 'Monthly'},
];
const STATUS_OPTS = [{value: 'DRAFT', label: 'Draft'}, {value: 'PUBLISHED', label: 'Published'}];
const ROTATION_OPTS = [
  {value: 'DAILY', label: 'Daily'}, {value: 'WEEKLY', label: 'Weekly'},
  {value: 'FORTNIGHTLY', label: 'Fortnightly'}, {value: 'MONTHLY', label: 'Monthly'},
];

const apiMsg = e => (typeof e?.data === 'string' ? e.data : e?.data?.message) || 'Something went wrong';

export default function ShiftFormSheet({visible, onClose, editShift}) {
  const colors = useColors();
  const isEdit = !!editShift;

  const [mode, setMode] = useState('manual'); // manual | assign
  const [employeeId, setEmployeeId] = useState('');
  const [employeeIds, setEmployeeIds] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [shiftDate, setShiftDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [state, setState] = useState('NSW');
  const [status, setStatus] = useState('DRAFT');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState('NONE');
  const [untilDate, setUntilDate] = useState('');
  const [error, setError] = useState(null);

  // Auto-assign fields
  const [dateFrom, setDateFrom] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [headcount, setHeadcount] = useState('1');
  const [rotation, setRotation] = useState('DAILY');
  const [autoSkills, setAutoSkills] = useState('');
  const [preview, setPreview] = useState(null);

  const {data: empRaw} = useListEmployeesQuery({pageSize: 200}, {skip: !visible});
  const {data: templates} = useListShiftTemplatesQuery(undefined, {skip: !visible});
  const [createShift, {isLoading: creating}] = useCreateShiftMutation();
  const [bulkAssign, {isLoading: bulking}] = useBulkAssignShiftsMutation();
  const [updateShift, {isLoading: updating}] = useUpdateShiftMutation();
  const [autoAssign, {isLoading: autoBusy}] = useAutoAssignShiftsMutation();

  const employees = Array.isArray(empRaw) ? empRaw : (empRaw?.items ?? []);
  const empOpts = employees.map(e => ({value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`}));
  const tplList = (templates ?? []).filter(t => t.isActive);
  const templateOpts = [{value: '', label: '— No template —'}, ...tplList.map(t => ({value: t.id, label: `${t.name} (${t.startTime}–${t.endTime})`}))];
  const templateOptsRequired = [{value: '', label: 'Select a template'}, ...tplList.map(t => ({value: t.id, label: `${t.name} (${t.startTime}–${t.endTime})`}))];

  // Prefill edit
  useEffect(() => {
    if (!visible) return;
    if (editShift) {
      const tz = editShift.timezone;
      const sWall = toWallClockInput(editShift.startAt, tz); // "YYYY-MM-DDTHH:mm"
      const eWall = toWallClockInput(editShift.endAt, tz);
      setShiftDate(sWall.slice(0, 10));
      setStartTime(sWall.slice(11, 16));
      setEndTime(eWall.slice(11, 16));
      setBreakMinutes(String(editShift.breakMinutes ?? 0));
      setState(editShift.state || 'NSW');
      setStatus(editShift.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
      setLocation(editShift.location || '');
      setNotes(editShift.notes || '');
      setFrequency('NONE');
    }
    setError(null);
  }, [visible, editShift]);

  function onPickTemplate(id) {
    setTemplateId(id);
    const tpl = tplList.find(t => t.id === id);
    if (tpl) {
      setStartTime(tpl.startTime);
      setEndTime(tpl.endTime);
      if (typeof tpl.breakMinutes === 'number') setBreakMinutes(String(tpl.breakMinutes));
      if (tpl.state) setState(tpl.state);
    }
  }

  function buildStartEnd() {
    const startAt = `${shiftDate}T${startTime}`;
    const endDay = endTime > startTime ? shiftDate : dayjs(shiftDate).add(1, 'day').format('YYYY-MM-DD');
    return {startAt, endAt: `${endDay}T${endTime}`};
  }
  const recurrence = () => (frequency === 'NONE' ? undefined : {frequency, until: untilDate || undefined});

  function repeatError() {
    if (frequency !== 'NONE' && !untilDate) return "Pick a 'Repeat until' date for the repeating shift.";
    if (frequency !== 'NONE' && untilDate && untilDate < shiftDate) return "'Repeat until' must be on or after the start date.";
    return null;
  }

  async function submit() {
    setError(null);
    const re = repeatError();
    if (re) { setError(re); return; }
    const {startAt, endAt} = buildStartEnd();
    const common = {
      breakMinutes: Number(breakMinutes) || 0,
      location: location.trim() || undefined,
      state, status,
    };
    try {
      if (isEdit) {
        await updateShift({id: editShift.id, startAt, endAt, notes: notes.trim() || undefined, ...common}).unwrap();
      } else if (mode === 'manual') {
        if (!employeeId) { setError('Select an employee.'); return; }
        await createShift({
          employeeId, templateId: templateId || undefined,
          startAt, endAt, notes: notes.trim() || undefined,
          recurrence: recurrence(), ...common,
        }).unwrap();
      } else {
        if (employeeIds.length === 0) { setError('Select at least one employee.'); return; }
        const res = await bulkAssign({
          employeeIds, templateId: templateId || undefined,
          startAt, endAt, recurrence: recurrence(), ...common,
        }).unwrap();
        if (res?.skipped > 0) {
          Alert.alert('Done', `${res.count} created · ${res.skipped} skipped (already had a shift).`);
        }
      }
      onClose();
    } catch (e) {
      setError(apiMsg(e));
    }
  }

  async function runAuto(dryRun) {
    setError(null);
    if (!templateId) { setError('Select a template.'); return; }
    try {
      const res = await autoAssign({
        templateId,
        dateFrom, dateTo,
        headcount: Number(headcount) || 1,
        rotation,
        requiredSkills: autoSkills.split(',').map(s => s.trim()).filter(Boolean),
        status,
        dryRun,
      }).unwrap();
      if (dryRun) {
        setPreview(res?.plan ?? []);
      } else {
        const n = res?.created ?? 0;
        Alert.alert('Done', `${n} shift${n === 1 ? '' : 's'} auto-assigned.`);
        onClose();
      }
    } catch (e) {
      setError(apiMsg(e));
    }
  }

  const busy = creating || bulking || updating;
  const title = isEdit ? 'Edit Shift' : 'Create Shifts';

  const inputStyle = [styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}];
  const Seg = ({k, label}) => (
    <TouchableOpacity
      onPress={() => { setMode(k); setPreview(null); setError(null); }}
      style={[styles.seg, {backgroundColor: mode === k ? colors.primary : colors.surfaceAlt}]}>
      <AppText style={{color: mode === k ? '#fff' : colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold}}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.header}>
            <AppText style={[styles.title, {color: colors.text}]}>{title}</AppText>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!isEdit && (
              <View style={styles.segRow}>
                <Seg k="manual" label="Manual" />
                <Seg k="assign" label="Assign" />
                <Seg k="auto" label="Auto" />
              </View>
            )}

            {error ? (
              <View style={[styles.errorBox, {backgroundColor: colors.errorLight, borderColor: colors.error}]}>
                <AppText style={{color: colors.error, fontSize: fontSize.sm}}>{error}</AppText>
              </View>
            ) : null}

            {mode === 'auto' && !isEdit ? (
              <>
                <Dropdown label="Template (sets the times)" value={templateId} onChange={onPickTemplate} options={templateOptsRequired} />
                <View style={styles.row}>
                  <View style={styles.col}>
                    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>FROM DATE</AppText>
                    <DateField value={dateFrom} onChange={v => { setDateFrom(v); setPreview(null); }} />
                  </View>
                  <View style={styles.col}>
                    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>TO DATE</AppText>
                    <DateField value={dateTo} onChange={v => { setDateTo(v); setPreview(null); }} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>PER DAY</AppText>
                    <TextInput style={inputStyle} value={headcount} onChangeText={v => { setHeadcount(v); setPreview(null); }} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.textTertiary} />
                  </View>
                  <View style={styles.col}>
                    <Dropdown label="Rotation" value={rotation} onChange={v => { setRotation(v); setPreview(null); }} options={ROTATION_OPTS} />
                  </View>
                </View>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>REQUIRED SKILLS (COMMA, OPTIONAL)</AppText>
                <TextInput style={inputStyle} value={autoSkills} onChangeText={v => { setAutoSkills(v); setPreview(null); }} placeholder="forklift, first-aid" placeholderTextColor={colors.textTertiary} />
                <Dropdown label="Status" value={status} onChange={setStatus} options={STATUS_OPTS} />
                <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing[2]}}>
                  One shift per day in the range, using the template's times. Rotation sets how often the person changes. Fair picks (fewest recent shifts) + skills/availability, skipping anyone already booked. Tap Preview first.
                </AppText>
                {preview ? (
                  <View style={[styles.previewBox, {borderColor: colors.border}]}>
                    <AppText style={{fontWeight: fontWeight.bold, fontSize: fontSize.sm, color: colors.text, marginBottom: spacing[2]}}>
                      Preview — {preview.reduce((n, d) => n + d.employees.length, 0)} shift(s) · {preview.length} day(s)
                    </AppText>
                    {preview.length === 0 ? (
                      <AppText style={{color: colors.textTertiary, fontSize: fontSize.sm}}>No dates in range.</AppText>
                    ) : preview.map(d => (
                      <View key={d.date} style={styles.previewRow}>
                        <AppText style={{width: 86, fontSize: fontSize.xs, color: colors.textTertiary}}>{dayjs(d.date).format('ddd D MMM')}</AppText>
                        <AppText style={{flex: 1, fontSize: fontSize.xs, color: d.employees.length ? colors.text : colors.error}}>
                          {d.employees.length ? d.employees.map(e => `${e.firstName} ${e.lastName}`).join(', ') : 'No eligible employee'}
                          {d.shortfall > 0 ? `  (${d.shortfall} short)` : ''}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {!isEdit && mode === 'manual' && (
                  <Dropdown label="Employee" value={employeeId} onChange={setEmployeeId} options={empOpts} placeholder="Select employee" searchable />
                )}
            {!isEdit && mode === 'assign' && (
              <MultiSelectField label="Employees" value={employeeIds} onChange={setEmployeeIds} options={empOpts} placeholder="Select employees" />
            )}

            {!isEdit && (
              <Dropdown label="Template (fills the times)" value={templateId} onChange={onPickTemplate} options={templateOpts} />
            )}

            {!isEdit && (
              <Dropdown label="Repeat" value={frequency} onChange={setFrequency} options={RECUR_OPTS} />
            )}

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{frequency === 'NONE' || isEdit ? 'DATE' : 'FROM DATE'}</AppText>
            <DateField value={shiftDate} onChange={setShiftDate} />

            {!isEdit && frequency !== 'NONE' && (
              <>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>REPEAT UNTIL</AppText>
                <DateField value={untilDate} onChange={setUntilDate} placeholder="End date for the repeat" />
              </>
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>START TIME</AppText>
                <TimeField value={startTime} onChange={setStartTime} />
              </View>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>END TIME</AppText>
                <TimeField value={endTime} onChange={setEndTime} />
              </View>
            </View>
            <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing[2]}}>
              🕒 Times are in {state} local time (same for everyone). End ≤ start = overnight.
            </AppText>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>BREAK (MIN)</AppText>
                <TextInput style={inputStyle} value={breakMinutes} onChangeText={setBreakMinutes} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={styles.col}>
                <Dropdown label="State" value={state} onChange={setState} options={AU_STATES} />
              </View>
            </View>

            <Dropdown label="Status" value={status} onChange={setStatus} options={STATUS_OPTS} />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>LOCATION (OPTIONAL)</AppText>
            <TextInput style={inputStyle} value={location} onChangeText={setLocation} placeholder="Site / address" placeholderTextColor={colors.textTertiary} />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>NOTES (OPTIONAL)</AppText>
            <TextInput style={[inputStyle, {height: 64, textAlignVertical: 'top'}]} value={notes} onChangeText={setNotes} multiline placeholder="Notes…" placeholderTextColor={colors.textTertiary} />
              </>
            )}

            <View style={{height: spacing[3]}} />
            {mode === 'auto' && !isEdit ? (
              <View style={{flexDirection: 'row', gap: spacing[3]}}>
                <View style={{flex: 1}}><Button label="Preview" variant="outline" fullWidth loading={autoBusy} onPress={() => runAuto(true)} /></View>
                <View style={{flex: 1}}><Button label="Assign" variant="primary" fullWidth loading={autoBusy} disabled={!preview} onPress={() => runAuto(false)} /></View>
              </View>
            ) : (
              <Button label={isEdit ? 'Save Changes' : (mode === 'assign' ? 'Assign Shifts' : 'Create Shift')} variant="primary" fullWidth loading={busy} onPress={submit} />
            )}
            <View style={{height: spacing[6]}} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing[5], maxHeight: '92%'},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  title: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  segRow: {flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4]},
  seg: {flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md},
  fieldLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1], marginTop: spacing[1]},
  textInput: {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm, marginBottom: spacing[2]},
  row: {flexDirection: 'row', gap: spacing[3]},
  col: {flex: 1},
  errorBox: {borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginBottom: spacing[3]},
  previewBox: {borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginTop: spacing[1], marginBottom: spacing[2]},
  previewRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], paddingVertical: 3},
});
