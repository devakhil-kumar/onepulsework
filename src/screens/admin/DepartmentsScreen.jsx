import React, {useState} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Plus, Edit2, Trash2, Building2} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {AppText, Card, Button, Spinner, EmptyState} from '@components/ui';
import {
  useListDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from '@features/admin/adminApi';

const PRESET_COLORS = ['#7B61FF', '#1D6FFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

// ── Dept form modal ────────────────────────────────────────────────────────

function DeptModal({initial, onClose, onSave, saving}) {
  const colors = useColors();
  const [name, setName]        = useState(initial?.name ?? '');
  const [description, setDesc] = useState(initial?.description ?? '');
  const [color, setColor]      = useState(initial?.color ?? '#7B61FF');

  function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Department name is required.'); return; }
    onSave({name: name.trim(), description: description.trim() || undefined, color});
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>
              {initial ? 'Edit department' : 'New department'}
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>NAME</AppText>
          <TextInput
            style={[styles.textInput, {
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
            }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Engineering"
            placeholderTextColor={colors.textTertiary}
          />

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DESCRIPTION (OPTIONAL)</AppText>
          <TextInput
            style={[styles.textInput, {
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
              height: 80, textAlignVertical: 'top',
            }]}
            value={description}
            onChangeText={setDesc}
            placeholder="Brief description..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>COLOUR</AppText>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  {backgroundColor: c},
                  color === c && {borderWidth: 3, borderColor: c, transform: [{scale: 1.25}]},
                ]}
              />
            ))}
          </View>

          {/* Preview */}
          <View style={[styles.preview, {borderLeftColor: color}]}>
            <View style={[styles.previewDot, {backgroundColor: color}]} />
            <AppText style={styles.previewName}>{name || 'Department name'}</AppText>
          </View>

          <Button
            label={saving ? 'Saving...' : 'Save Department'}
            variant="primary"
            fullWidth
            loading={saving}
            onPress={handleSave}
            style={{marginTop: spacing[5], marginBottom: spacing[6]}}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Dept card ──────────────────────────────────────────────────────────────

function DeptCard({dept, onEdit, onDelete}) {
  const colors = useColors();
  const empCount = dept._count?.employees ?? 0;
  return (
    <Card style={styles.deptCard}>
      <View style={[styles.deptColorBar, {backgroundColor: dept.color ?? colors.primary}]} />
      <View style={styles.deptContent}>
        <View style={styles.deptMain}>
          <View style={{flex: 1, minWidth: 0}}>
            <AppText style={styles.deptName} numberOfLines={1}>{dept.name}</AppText>
            {dept.description ? (
              <AppText style={[styles.deptDesc, {color: colors.textSecondary}]} numberOfLines={2}>
                {dept.description}
              </AppText>
            ) : null}
            <AppText style={[styles.deptCount, {color: colors.textTertiary}]}>
              {empCount} {empCount === 1 ? 'employee' : 'employees'}
            </AppText>
          </View>
          <View style={styles.deptActions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Edit2 size={15} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Trash2 size={15} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function DepartmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [modal, setModal] = useState(null);

  const {data: departments = [], isLoading} = useListDepartmentsQuery();
  const [createDept, {isLoading: creating}] = useCreateDepartmentMutation();
  const [updateDept, {isLoading: updating}] = useUpdateDepartmentMutation();
  const [deleteDept] = useDeleteDepartmentMutation();

  async function handleSave(data) {
    try {
      if (modal.mode === 'create') await createDept(data).unwrap();
      else await updateDept({id: modal.dept.id, ...data}).unwrap();
      setModal(null);
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save department.');
    }
  }

  function confirmDelete(id, name) {
    Alert.alert(
      `Delete "${name}"?`,
      'Employees in this department will be unassigned. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteDept(id).unwrap(); } catch (e) { Alert.alert('Error', e.data ?? 'Could not delete.'); }
        }},
      ],
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + spacing[2],
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <AppText style={styles.headerTitle}>Departments</AppText>
          <AppText style={[styles.headerSub, {color: colors.textSecondary}]}>
            Organise your workforce
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => setModal({mode: 'create'})}
          style={[styles.addBtn, {backgroundColor: colors.primary}]}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : departments.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Building2 size={44} color={colors.primary} />}
            title="No departments yet"
            description="Organise your workforce into departments."
          />
          <Button
            label="Create First Department"
            variant="primary"
            onPress={() => setModal({mode: 'create'})}
            style={{marginTop: spacing[4]}}
          />
        </View>
      ) : (
        <FlatList
          data={departments}
          keyExtractor={d => d.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <DeptCard
              dept={item}
              onEdit={() => setModal({mode: 'edit', dept: item})}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
        />
      )}

      {modal && (
        <DeptModal
          initial={modal.dept}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={creating || updating}
        />
      )}
    </View>
  );
}

// ── Styles — NO color properties here, all applied inline via useColors() ──

const styles = StyleSheet.create({
  root: {flex: 1},
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
  addBtn:      {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  center:      {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list:        {padding: spacing[4]},

  deptCard:     {flexDirection: 'row', padding: 0, overflow: 'hidden'},
  deptColorBar: {width: 5},
  deptContent:  {flex: 1, padding: spacing[4]},
  deptMain:     {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3]},
  deptName:     {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  deptDesc:     {fontSize: fontSize.sm, marginTop: 2},
  deptCount:    {fontSize: fontSize.xs, marginTop: spacing[2]},
  deptActions:  {flexDirection: 'row', gap: spacing[1]},
  actionBtn:    {padding: spacing[2]},

  // Modal
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[5],
  },
  modalTitle:  {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  modalClose:  {padding: spacing[2]},
  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[2],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    fontSize: fontSize.sm, marginBottom: spacing[4],
  },
  colorRow:    {flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5], flexWrap: 'wrap'},
  colorDot:    {width: 30, height: 30, borderRadius: 15},
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderLeftWidth: 4, paddingLeft: spacing[3],
    marginBottom: spacing[4], paddingVertical: spacing[2],
  },
  previewDot:  {width: 10, height: 10, borderRadius: 5},
  previewName: {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
});
