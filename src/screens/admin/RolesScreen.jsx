import React, {useState} from 'react';
import {
  View, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Alert, Modal, TextInput, Switch,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Plus, Edit2, Trash2, Shield, ChevronDown, ChevronUp} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {AppText, Card, Button, Spinner, EmptyState} from '@components/ui';
import {AppHeader} from '@components/common';
import {PERMISSION_GROUPS, PERMISSION_LABELS} from '@constants/permissions';
import {
  useListOrgRolesQuery,
  useCreateOrgRoleMutation,
  useUpdateOrgRoleMutation,
  useDeleteOrgRoleMutation,
} from '@features/admin/adminApi';

const PRESET_COLORS = ['#7B61FF', '#1D6FFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const LEVEL_LABELS  = {1: 'Executive', 2: 'Senior', 3: 'Mid-level', 4: 'Junior', 5: 'Entry'};

// ── Permission matrix ──────────────────────────────────────────────────────

function PermissionMatrix({value = [], onChange}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState({});

  function toggle(key) {
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  }

  function toggleGroup(keys) {
    const allOn = keys.every(k => value.includes(k));
    if (allOn) {
      onChange(value.filter(k => !keys.includes(k)));
    } else {
      onChange([...new Set([...value, ...keys])]);
    }
  }

  return (
    <View style={styles.permMatrix}>
      {PERMISSION_GROUPS.map(group => {
        const allOn  = group.keys.every(k => value.includes(k));
        const someOn = group.keys.some(k => value.includes(k));
        const open   = expanded[group.label];

        return (
          <View key={group.label} style={[styles.permGroup, {borderColor: colors.border}]}>
            <TouchableOpacity
              style={[styles.permGroupHeader, {backgroundColor: colors.surfaceAlt}]}
              onPress={() => setExpanded(prev => ({...prev, [group.label]: !open}))}>
              <TouchableOpacity
                onPress={() => toggleGroup(group.keys)}
                style={[
                  styles.checkbox,
                  {borderColor: (allOn || someOn) ? colors.primary : colors.border},
                  (allOn || someOn) && {backgroundColor: colors.primary},
                ]}>
                {allOn  && <View style={[styles.checkMark, {borderColor: colors.white}]} />}
                {someOn && !allOn && <View style={[styles.minusMark, {backgroundColor: colors.white}]} />}
              </TouchableOpacity>
              <AppText style={styles.permGroupLabel}>{group.label}</AppText>
              {open
                ? <ChevronUp  size={14} color={colors.textSecondary} />
                : <ChevronDown size={14} color={colors.textSecondary} />
              }
            </TouchableOpacity>

            {open && (
              <View style={[styles.permItems, {borderTopColor: colors.border}]}>
                {group.keys.map(key => {
                  const on = value.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.permItem,
                        {borderBottomColor: colors.border},
                        on && {backgroundColor: colors.primaryLight + '40'},
                      ]}
                      onPress={() => toggle(key)}>
                      <View style={[
                        styles.checkbox, styles.checkboxSm,
                        {borderColor: on ? colors.primary : colors.border},
                        on && {backgroundColor: colors.primary},
                      ]}>
                        {on && <View style={[styles.checkMark, {borderColor: colors.white}]} />}
                      </View>
                      <AppText style={styles.permItemLabel}>
                        {PERMISSION_LABELS[key] ?? key}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Role form modal ────────────────────────────────────────────────────────

function RoleModal({initial, onClose, onSave, saving}) {
  const colors = useColors();
  const [name,        setName]       = useState(initial?.name        ?? '');
  const [description, setDesc]       = useState(initial?.description ?? '');
  const [color,       setColor]      = useState(initial?.color       ?? '#7B61FF');
  const [level,       setLevel]      = useState(initial?.level       ?? 3);
  const [isDefault,   setIsDefault]  = useState(initial?.isDefault   ?? false);
  const [permissions, setPerms]      = useState(initial?.permissions ?? []);

  function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Role name is required.'); return; }
    onSave({name: name.trim(), description: description.trim() || undefined, color, level, isDefault, permissions});
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>{initial ? 'Edit role' : 'New role'}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>ROLE NAME</AppText>
            <TextInput
              style={[styles.textInput, {
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
              }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Team Lead"
              placeholderTextColor={colors.textTertiary}
            />

            {/* Description */}
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DESCRIPTION (OPTIONAL)</AppText>
            <TextInput
              style={[styles.textInput, {
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                height: 72, textAlignVertical: 'top',
              }]}
              value={description}
              onChangeText={setDesc}
              placeholder="Brief description..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            {/* Level */}
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>LEVEL</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: spacing[4]}}>
              <View style={{flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[1]}}>
                {[1, 2, 3, 4, 5].map(l => {
                  const active = level === l;
                  return (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setLevel(l)}
                      style={[
                        styles.levelChip,
                        {borderColor: active ? colors.primary : colors.border,
                         backgroundColor: active ? colors.primaryLight : colors.surfaceAlt},
                      ]}>
                      <AppText style={[
                        styles.levelChipText,
                        {color: active ? colors.primary : colors.textSecondary},
                        active && {fontWeight: fontWeight.bold},
                      ]}>
                        {l} · {LEVEL_LABELS[l]}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Color */}
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>COLOUR</AppText>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    {backgroundColor: c},
                    color === c && {borderWidth: 3, borderColor: c, transform: [{scale: 1.2}]},
                  ]}
                />
              ))}
            </View>

            {/* Default toggle */}
            <View style={[styles.toggleRow, {borderTopColor: colors.border}]}>
              <View style={{flex: 1}}>
                <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.medium}}>
                  Default role for new employees
                </AppText>
                <AppText style={{fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2}}>
                  Automatically assigned when an employee joins
                </AppText>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor={colors.white}
              />
            </View>

            {/* Permissions */}
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary, marginTop: spacing[4]}]}>
              PERMISSIONS
            </AppText>
            <AppText style={[styles.permHint, {color: colors.textTertiary}]}>
              Tap group header to expand. Tap checkbox to toggle all in group.
            </AppText>
            <PermissionMatrix value={permissions} onChange={setPerms} />

            <Button
              label={saving ? 'Saving...' : 'Save Role'}
              variant="primary"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{marginTop: spacing[5], marginBottom: spacing[4]}}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Role card ──────────────────────────────────────────────────────────────

function RoleCard({role, onEdit, onDelete}) {
  const colors = useColors();
  const perms = Array.isArray(role.permissions) ? role.permissions : [];
  return (
    <Card style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <View style={[styles.roleIcon, {
          backgroundColor: (role.color ?? colors.primary) + '22',
          borderColor: role.color ?? colors.primary,
        }]}>
          <View style={[styles.roleIconDot, {backgroundColor: role.color ?? colors.primary}]} />
        </View>
        <View style={{flex: 1, minWidth: 0}}>
          <View style={styles.roleTitleRow}>
            <AppText style={styles.roleName} numberOfLines={1}>{role.name}</AppText>
            {role.isDefault && (
              <View style={[styles.defaultBadge, {backgroundColor: colors.primaryLight}]}>
                <AppText style={[styles.defaultBadgeText, {color: colors.primary}]}>Default</AppText>
              </View>
            )}
          </View>
          <AppText style={[styles.roleLevel, {color: colors.textSecondary}]}>
            Level {role.level} · {LEVEL_LABELS[role.level] ?? ''} · {role._count?.employees ?? 0} employees
          </AppText>
        </View>
        <View style={styles.roleActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Edit2 size={15} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Trash2 size={15} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {role.description ? (
        <AppText style={[styles.roleDesc, {color: colors.textSecondary}]} numberOfLines={2}>
          {role.description}
        </AppText>
      ) : null}

      {/* Permission pills */}
      <View style={styles.permPills}>
        {perms.length === 0 ? (
          <AppText style={[styles.noPerms, {color: colors.textTertiary}]}>No permissions assigned</AppText>
        ) : perms.slice(0, 6).map(p => (
          <View key={p} style={[styles.permPill, {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          }]}>
            <AppText style={[styles.permPillText, {color: colors.textSecondary}]}>
              {PERMISSION_LABELS[p] ?? p}
            </AppText>
          </View>
        ))}
        {perms.length > 6 && (
          <View style={[styles.permPill, {backgroundColor: colors.primaryLight, borderColor: colors.primary + '40'}]}>
            <AppText style={[styles.permPillText, {color: colors.primary}]}>+{perms.length - 6} more</AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function RolesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [modal, setModal] = useState(null);

  const {data: roles = [], isLoading} = useListOrgRolesQuery();
  const [createRole, {isLoading: creating}] = useCreateOrgRoleMutation();
  const [updateRole, {isLoading: updating}] = useUpdateOrgRoleMutation();
  const [deleteRole] = useDeleteOrgRoleMutation();

  async function handleSave(data) {
    try {
      if (modal.mode === 'create') await createRole(data).unwrap();
      else await updateRole({id: modal.role.id, ...data}).unwrap();
      setModal(null);
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save role.');
    }
  }

  function confirmDelete(id) {
    Alert.alert(
      'Delete role?',
      'Employees assigned this role will be unassigned. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteRole(id).unwrap(); } catch (e) { Alert.alert('Error', e.data ?? 'Could not delete role.'); }
        }},
      ],
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Roles & Permissions"
        rightAction={
          <TouchableOpacity
            onPress={() => setModal({mode: 'create'})}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : roles.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Shield size={44} color={colors.primary} />}
            title="No roles yet"
            description="Create custom roles to control what your team can access."
          />
          <Button
            label="Create First Role"
            variant="primary"
            onPress={() => setModal({mode: 'create'})}
            style={{marginTop: spacing[4]}}
          />
        </View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={r => r.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <RoleCard
              role={item}
              onEdit={() => setModal({mode: 'edit', role: item})}
              onDelete={() => confirmDelete(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
        />
      )}

      {modal && (
        <RoleModal
          initial={modal.role}
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
  addBtn:      {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  list:        {padding: spacing[4]},

  // Role card
  roleCard:     {padding: spacing[4], gap: spacing[3]},
  roleHeader:   {flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3]},
  roleIcon:     {width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  roleIconDot:  {width: 14, height: 14, borderRadius: 7},
  roleTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap'},
  roleName:     {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  roleLevel:    {fontSize: fontSize.xs, marginTop: 2},
  roleDesc:     {fontSize: fontSize.sm},
  roleActions:  {flexDirection: 'row', gap: spacing[1]},
  actionBtn:    {padding: spacing[2]},
  defaultBadge:     {borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2},
  defaultBadgeText: {fontSize: 10, fontWeight: fontWeight.bold},
  permPills:    {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1]},
  permPill:     {borderWidth: 1, borderRadius: 6, paddingHorizontal: spacing[2], paddingVertical: 3},
  permPillText: {fontSize: 10},
  noPerms:      {fontSize: fontSize.xs, fontStyle: 'italic'},

  // Modal
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing[5], paddingTop: spacing[5],
    maxHeight: '92%',
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
  levelChip:    {paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1},
  levelChipText:{fontSize: fontSize.xs, fontWeight: fontWeight.medium},
  colorRow:     {flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5], flexWrap: 'wrap'},
  colorDot:     {width: 30, height: 30, borderRadius: 15},
  toggleRow:    {flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderTopWidth: 1, marginBottom: spacing[2]},

  // Permission matrix
  permHint:        {fontSize: fontSize.xs, marginBottom: spacing[3]},
  permMatrix:      {gap: spacing[2], marginBottom: spacing[2]},
  permGroup:       {borderWidth: 1, borderRadius: radius.md, overflow: 'hidden'},
  permGroupHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3]},
  permGroupLabel:  {flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  permItems:       {borderTopWidth: 1},
  permItem:        {flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderBottomWidth: 1},
  permItemLabel:   {flex: 1, fontSize: fontSize.xs},
  checkbox:        {width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  checkboxSm:      {width: 18, height: 18, borderRadius: 5},
  checkMark:       {width: 10, height: 6, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{rotate: '-45deg'}], marginTop: -2},
  minusMark:       {width: 10, height: 2, borderRadius: 1},
});
