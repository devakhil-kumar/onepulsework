import React, {useState} from 'react';
import {View, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, StyleSheet} from 'react-native';
import {Plus, X, Pencil, Trash2} from 'lucide-react-native';
import {AppText, Button, Card, Badge, Dropdown, TimeField, EmptyState, Spinner} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {
  useListShiftTemplatesQuery, useCreateShiftTemplateMutation,
  useUpdateShiftTemplateMutation, useDeleteShiftTemplateMutation,
} from '@features/shift/shiftTemplateApi';

const AU_STATES = [
  {value: '', label: 'Any state'},
  {value: 'NSW', label: 'NSW'}, {value: 'VIC', label: 'VIC'}, {value: 'QLD', label: 'QLD'},
  {value: 'WA', label: 'WA'}, {value: 'SA', label: 'SA'}, {value: 'TAS', label: 'TAS'},
  {value: 'ACT', label: 'ACT'}, {value: 'NT', label: 'NT'},
];
const COLORS = ['#7B61FF', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6'];
const apiMsg = e => (typeof e?.data === 'string' ? e.data : e?.data?.message) || 'Something went wrong';

function TemplateForm({visible, onClose, editing}) {
  const colors = useColors();
  const isEdit = !!editing;
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [color, setColor] = useState('#7B61FF');
  const [state, setState] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState(null);

  const [createTpl, {isLoading: creating}] = useCreateShiftTemplateMutation();
  const [updateTpl, {isLoading: updating}] = useUpdateShiftTemplateMutation();

  React.useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name); setStartTime(editing.startTime); setEndTime(editing.endTime);
      setBreakMinutes(String(editing.breakMinutes ?? 0)); setColor(editing.color || '#7B61FF');
      setState(editing.state || ''); setSkills((editing.requiredSkills ?? []).join(', '));
    } else {
      setName(''); setStartTime('09:00'); setEndTime('17:00'); setBreakMinutes('30');
      setColor('#7B61FF'); setState(''); setSkills('');
    }
    setError(null);
  }, [visible, editing]);

  async function submit() {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    const payload = {
      name: name.trim(), startTime, endTime,
      breakMinutes: Number(breakMinutes) || 0,
      color, state: state || undefined,
      requiredSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit) await updateTpl({id: editing.id, ...payload}).unwrap();
      else await createTpl(payload).unwrap();
      onClose();
    } catch (e) { setError(apiMsg(e)); }
  }

  const inputStyle = [styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.headerRow}>
            <AppText style={[styles.title, {color: colors.text}]}>{isEdit ? 'Edit Template' : 'New Template'}</AppText>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {error ? <View style={[styles.errorBox, {backgroundColor: colors.errorLight, borderColor: colors.error}]}><AppText style={{color: colors.error, fontSize: fontSize.sm}}>{error}</AppText></View> : null}

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>NAME</AppText>
            <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="e.g. Day, Evening, Night" placeholderTextColor={colors.textTertiary} />

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>START</AppText>
                <TimeField value={startTime} onChange={setStartTime} />
              </View>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>END</AppText>
                <TimeField value={endTime} onChange={setEndTime} />
              </View>
            </View>
            <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing[2]}}>End ≤ start = overnight shift.</AppText>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>BREAK (MIN)</AppText>
                <TextInput style={inputStyle} value={breakMinutes} onChangeText={setBreakMinutes} keyboardType="number-pad" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={styles.col}>
                <Dropdown label="Default state" value={state} onChange={setState} options={AU_STATES} />
              </View>
            </View>

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>COLOUR</AppText>
            <View style={{flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3]}}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setColor(c)}
                  style={[styles.swatch, {backgroundColor: c, borderColor: color === c ? colors.text : 'transparent'}]} />
              ))}
            </View>

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>REQUIRED SKILLS (COMMA, OPTIONAL)</AppText>
            <TextInput style={inputStyle} value={skills} onChangeText={setSkills} placeholder="forklift, first-aid" placeholderTextColor={colors.textTertiary} autoCapitalize="none" />

            <View style={{height: spacing[3]}} />
            <Button label={isEdit ? 'Save Changes' : 'Create Template'} variant="primary" fullWidth loading={creating || updating} onPress={submit} />
            <View style={{height: spacing[6]}} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ShiftTemplatesPanel() {
  const colors = useColors();
  const {data: templates, isLoading} = useListShiftTemplatesQuery();
  const [deleteTpl] = useDeleteShiftTemplateMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(t) { setEditing(t); setFormOpen(true); }
  function confirmDelete(t) {
    Alert.alert('Delete template?', `"${t.name}" will be removed. Existing shifts are kept.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteTpl(t.id)},
    ]);
  }

  const list = templates ?? [];

  return (
    <View>
      <View style={styles.panelHeader}>
        <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm, flex: 1}}>Reusable shift patterns for assigning shifts.</AppText>
        <Button label="New" variant="primary" size="sm" iconLeft={<Plus size={15} color="#fff" />} onPress={openCreate} />
      </View>

      {isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No templates yet" description="Create Day, Evening, Night — or any pattern your team uses" />
      ) : (
        list.map(t => (
          <Card key={t.id} style={styles.tplCard}>
            <View style={[styles.dot, {backgroundColor: t.color || '#7B61FF'}]} />
            <View style={{flex: 1}}>
              <AppText style={{color: colors.text, fontWeight: fontWeight.semiBold}}>{t.name}</AppText>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>
                {t.startTime}–{t.endTime} · {t.breakMinutes ?? 0}m break{t.state ? ` · ${t.state}` : ''}
              </AppText>
              {t.requiredSkills?.length ? (
                <AppText style={{color: colors.textTertiary, fontSize: fontSize.xs}}>Skills: {t.requiredSkills.join(', ')}</AppText>
              ) : null}
            </View>
            <Badge status={t.isActive ? 'PUBLISHED' : 'DRAFT'} label={t.isActive ? 'Active' : 'Off'} size="sm" />
            <TouchableOpacity onPress={() => openEdit(t)} hitSlop={8} style={{marginLeft: spacing[2]}}><Pencil size={17} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(t)} hitSlop={8} style={{marginLeft: spacing[3]}}><Trash2 size={17} color={colors.error} /></TouchableOpacity>
          </Card>
        ))
      )}

      <TemplateForm visible={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </View>
  );
}

const styles = StyleSheet.create({
  panelHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3]},
  tplCard: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2], paddingVertical: spacing[3]},
  dot: {width: 12, height: 12, borderRadius: 4},
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing[5], maxHeight: '90%'},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  title: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  fieldLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1], marginTop: spacing[1]},
  textInput: {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm, marginBottom: spacing[2]},
  row: {flexDirection: 'row', gap: spacing[3]},
  col: {flex: 1},
  swatch: {width: 30, height: 30, borderRadius: 8, borderWidth: 2},
  errorBox: {borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginBottom: spacing[3]},
});
