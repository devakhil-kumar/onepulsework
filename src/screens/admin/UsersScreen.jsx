import React, {useState, useMemo} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, UserPlus, Edit2, Search, Users, X} from 'lucide-react-native';
import {colors, spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {AppText, Card, Button, Spinner, Avatar, Badge, EmptyState} from '@components/ui';
import {AppHeader} from '@components/common';
import {
  useListUsersQuery,
  useInviteUserMutation,
  useUpdateUserMutation,
} from '@features/admin/adminApi';
import {formatDate} from '@utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const ROLE_LABELS = {OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', EMPLOYEE: 'Employee'};
const STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
const STATUS_COLORS = {
  ACTIVE:      {bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981'},
  SUSPENDED:   {bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B'},
  DEACTIVATED: {bg: 'rgba(239, 68, 68, 0.15)',  text: '#EF4444'},
};

// ── Styled input helper ────────────────────────────────────────────────────────

function StyledInput({label, value, onChangeText, ...rest}) {
  const colors = useColors();
  return (
    <View style={styles.inputWrap}>
      {label ? (
        <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{label}</AppText>
      ) : null}
      <TextInput
        style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textTertiary}
        {...rest}
      />
    </View>
  );
}

// ── Chip picker helper ────────────────────────────────────────────────────────

function ChipPicker({options, value, onChange, labels}) {
  const colors = useColors();
  return (
    <View style={styles.chipRow}>
      {options.map(o => {
        const active = value === o;
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onChange(o)}
            style={[styles.chip, {
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primaryLight : colors.surface,
            }]}>
            <AppText style={[styles.chipText, {color: active ? colors.primary : colors.textSecondary}]}>
              {labels?.[o] ?? o}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({onClose, onSave, saving}) {
  const colors = useColors();
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [role,     setRole]     = useState('EMPLOYEE');

  function handleSave() {
    if (!fullName.trim()) { Alert.alert('Required', 'Full name is required.'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid', 'A valid email is required.'); return; }
    onSave({fullName: fullName.trim(), email: email.trim().toLowerCase(), role});
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, {color: colors.text}]}>Invite Team Member</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <StyledInput label="FULL NAME *"   value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <StyledInput label="EMAIL *"        value={email}    onChangeText={setEmail}    keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>ROLE</AppText>
          <ChipPicker options={ROLES} value={role} onChange={setRole} labels={ROLE_LABELS} />

          <View style={[styles.infoAlert, {backgroundColor: colors.infoLight, borderColor: colors.info + '40'}]}>
            <AppText style={[styles.infoAlertText, {color: colors.info}]}>
              An invitation email will be sent. They can set their password when they accept.
            </AppText>
          </View>

          <Button
            label={saving ? 'Sending…' : 'Send Invitation'}
            loading={saving}
            onPress={handleSave}
            style={{marginTop: spacing[2], marginBottom: spacing[6]}}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Edit user modal ───────────────────────────────────────────────────────────

function EditUserModal({user, onClose, onSave, saving}) {
  const colors = useColors();
  const [role,   setRole]   = useState(user.role   ?? 'EMPLOYEE');
  const [status, setStatus] = useState(user.status ?? 'ACTIVE');

  const canEditRole = user.role !== 'OWNER';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.modalSheet, {backgroundColor: colors.surface}]}>
          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, {color: colors.text}]}>Edit {user.fullName}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.userPreview}>
            <Avatar name={user.fullName} size="md" />
            <View style={{flex: 1, minWidth: 0}}>
              <AppText style={[styles.previewName, {color: colors.text}]} numberOfLines={1}>{user.fullName}</AppText>
              <AppText style={[styles.previewEmail, {color: colors.textSecondary}]} numberOfLines={1}>{user.email}</AppText>
            </View>
          </View>

          {canEditRole ? (
            <>
              <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>ROLE</AppText>
              <ChipPicker options={ROLES} value={role} onChange={setRole} labels={ROLE_LABELS} />
            </>
          ) : (
            <View style={[styles.ownerNotice, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
              <AppText style={[styles.ownerNoticeText, {color: colors.textSecondary}]}>
                Organisation owner role cannot be changed.
              </AppText>
            </View>
          )}

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary, marginTop: spacing[3]}]}>STATUS</AppText>
          <ChipPicker options={STATUSES} value={status} onChange={setStatus} />

          <Button
            label={saving ? 'Saving…' : 'Save Changes'}
            loading={saving}
            onPress={() => onSave({role: canEditRole ? role : undefined, status})}
            style={{marginTop: spacing[4], marginBottom: spacing[6]}}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({user, onEdit}) {
  const colors   = useColors();
  const sc       = STATUS_COLORS[user.status] ?? STATUS_COLORS.ACTIVE;
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <Card style={[styles.userCard, {backgroundColor: colors.surface}]}>
      <Avatar name={user.fullName} size="md" />
      <View style={styles.userInfo}>
        <View style={styles.userTop}>
          <AppText style={[styles.userName, {color: colors.text}]} numberOfLines={1}>
            {user.fullName}
          </AppText>
          <View style={[styles.statusDot, {backgroundColor: sc.bg, borderColor: sc.text + '60'}]}>
            <View style={[styles.statusDotInner, {backgroundColor: sc.text}]} />
            <AppText style={[styles.statusText, {color: sc.text}]}>{user.status}</AppText>
          </View>
        </View>
        <AppText style={[styles.userEmail, {color: colors.textSecondary}]} numberOfLines={1}>{user.email}</AppText>
        <View style={styles.userMeta}>
          <Badge status={user.role} label={roleLabel} size="sm" />
          {user.lastLoginAt ? (
            <AppText style={[styles.lastLogin, {color: colors.textTertiary}]}>
              Last login {formatDate(user.lastLoginAt)}
            </AppText>
          ) : (
            <AppText style={[styles.lastLogin, {color: colors.textTertiary}]}>Never logged in</AppText>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onEdit} style={[styles.editBtn, {backgroundColor: colors.surfaceAlt}]}>
        <Edit2 size={15} color={colors.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function UsersScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const [search,     setSearch]     = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const {data, isLoading} = useListUsersQuery({});
  const [inviteUser, {isLoading: inviting}] = useInviteUserMutation();
  const [updateUser, {isLoading: updating}] = useUpdateUserMutation();

  const users = data?.items ?? data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function handleInvite(body) {
    try {
      await inviteUser(body).unwrap();
      setShowInvite(false);
      Alert.alert('Sent', `Invitation sent to ${body.email}.`);
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not send invitation.');
    }
  }

  async function handleEdit(updates) {
    try {
      await updateUser({id: editTarget.id, ...updates}).unwrap();
      setEditTarget(null);
      Alert.alert('Saved', 'User updated.');
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not update user.');
    }
  }

  const total = users.length;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Team Members"
        rightAction={
          <TouchableOpacity onPress={() => setShowInvite(true)} style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <UserPlus size={18} color={colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Search bar */}
      <View style={[styles.searchBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <Search size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, {color: colors.text}]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email…"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : filtered.length === 0 ? (
        <View style={[styles.center, {paddingBottom: insets.bottom + spacing[4]}]}>
          <EmptyState
            icon={<Users size={44} color={colors.primary} />}
            title={search ? 'No results' : 'No team members yet'}
            description={search ? `No users matching "${search}"` : 'Invite your team to get started.'}
          />
          {!search && (
            <Button
              label="Invite First Member"
              onPress={() => setShowInvite(true)}
              style={{marginTop: spacing[4]}}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <UserCard user={item} onEdit={() => setEditTarget(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
        />
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSave={handleInvite}
          saving={inviting}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
          saving={updating}
        />
      )}
    </View>
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
  addBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    gap: spacing[2], borderBottomWidth: 1,
  },
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},

  list: {padding: spacing[4]},

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing[4], gap: spacing[3],
  },
  userInfo:  {flex: 1, minWidth: 0, gap: spacing[1]},
  userTop:   {flexDirection: 'row', alignItems: 'center', gap: spacing[2], justifyContent: 'space-between'},
  userName:  {flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  userEmail: {fontSize: fontSize.xs},
  userMeta:  {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap'},
  lastLogin: {fontSize: fontSize.xs},
  statusDot: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full, borderWidth: 1},
  statusDotInner: {width: 5, height: 5, borderRadius: 3},
  statusText: {fontSize: 10, fontWeight: fontWeight.semiBold},
  editBtn: {width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},

  // Modals
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[5],
  },
  modalTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  modalClose: {padding: spacing[2]},

  userPreview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    marginBottom: spacing[5],
  },
  previewName:  {fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  previewEmail: {fontSize: fontSize.xs, marginTop: 2},

  ownerNotice: {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing[3], marginBottom: spacing[3],
  },
  ownerNoticeText: {fontSize: fontSize.sm},

  // Inputs
  inputWrap: {marginBottom: spacing[4]},
  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1],
  },
  textInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    fontSize: fontSize.sm,
  },
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3]},
  chip:    {paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1.5},
  chipText:{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  infoAlert:     {borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginTop: spacing[2]},
  infoAlertText: {fontSize: fontSize.xs},
});
