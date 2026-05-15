import React, {useState} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Plus, Edit2, Trash2, Megaphone, Pin} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin} from '@features/auth/authSlice';
import {AppText, Card, Button, Spinner, EmptyState} from '@components/ui';
import {
  useListAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} from '@features/admin/adminApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'});
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year: 'numeric'}) +
    ', ' + d.toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit', hour12: true});
}

// ── Ann form modal ─────────────────────────────────────────────────────────

function AnnModal({initial, onClose, onSave, saving}) {
  const colors = useColors();
  const [title, setTitle]   = useState(initial?.title ?? '');
  const [body,  setBody]    = useState(initial?.body ?? '');
  const [pin,   setPin]     = useState(
    initial?.pinnedUntil ? new Date(initial.pinnedUntil).toISOString().split('T')[0] : '',
  );

  function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    if (!body.trim())  { Alert.alert('Required', 'Message is required.'); return; }
    onSave({
      title: title.trim(),
      body:  body.trim(),
      pinnedUntil: pin || undefined,
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle}>
              {initial ? 'Edit Announcement' : 'Post Announcement'}
            </AppText>
            <TouchableOpacity onPress={onClose}>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>TITLE</AppText>
            <TextInput
              style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title"
              placeholderTextColor={colors.textTertiary}
            />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>MESSAGE</AppText>
            <TextInput
              style={[styles.input, {
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                height: 120, textAlignVertical: 'top',
              }]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your message..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>PIN UNTIL (OPTIONAL)</AppText>
            <TextInput
              style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
              value={pin}
              onChangeText={setPin}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
            />
            <AppText style={[styles.hint, {color: colors.textTertiary}]}>
              Pinned announcements appear at the top. Leave blank to unpin.
            </AppText>

            <Button
              label={saving ? 'Saving…' : 'Save Announcement'}
              variant="primary"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{marginTop: spacing[5], marginBottom: spacing[6]}}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Ann card ───────────────────────────────────────────────────────────────

function AnnCard({ann, canManage, onEdit, onDelete}) {
  const colors = useColors();
  return (
    <Card style={[styles.annCard, ann.isPinned && {borderLeftColor: colors.primary, borderLeftWidth: 3}]}>
      {ann.isPinned && (
        <View style={[styles.pinnedBadge, {backgroundColor: colors.primaryLight}]}>
          <Pin size={10} color={colors.primary} />
          <AppText style={[styles.pinnedText, {color: colors.primary}]}>Pinned</AppText>
        </View>
      )}
      <View style={styles.annRow}>
        <View style={{flex: 1, minWidth: 0}}>
          <AppText style={styles.annTitle} numberOfLines={2}>{ann.title}</AppText>
          <AppText style={[styles.annBody, {color: colors.textSecondary}]} numberOfLines={4}>
            {ann.body}
          </AppText>
          <View style={styles.annMeta}>
            <AppText style={[styles.annMetaText, {color: colors.textTertiary}]}>
              {ann.createdBy?.fullName ?? 'Unknown'}
            </AppText>
            <AppText style={[styles.annMetaDot, {color: colors.textTertiary}]}>·</AppText>
            <AppText style={[styles.annMetaText, {color: colors.textTertiary}]}>
              {formatDateTime(ann.createdAt)}
            </AppText>
          </View>
          {ann.isPinned && ann.pinnedUntil && (
            <AppText style={[styles.pinUntil, {color: colors.textTertiary}]}>
              Pinned until {formatDate(ann.pinnedUntil)}
            </AppText>
          )}
        </View>
        {canManage && (
          <View style={styles.annActions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Edit2 size={15} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Trash2 size={15} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const navigation = useNavigation();
  const isAdmin   = useAppSelector(selectIsAdmin);

  const [modal, setModal] = useState(null); // {mode:'create'} | {mode:'edit', ann}
  const [refreshing, setRefreshing] = useState(false);

  const {data: raw = {}, isLoading, refetch} = useListAnnouncementsQuery({page: 1, pageSize: 50});
  const announcements = raw.items ?? (Array.isArray(raw) ? raw : []);

  const [createAnn, {isLoading: creating}] = useCreateAnnouncementMutation();
  const [updateAnn, {isLoading: updating}] = useUpdateAnnouncementMutation();
  const [deleteAnn] = useDeleteAnnouncementMutation();

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSave(data) {
    try {
      if (modal.mode === 'create') await createAnn(data).unwrap();
      else await updateAnn({id: modal.ann.id, ...data}).unwrap();
      setModal(null);
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not save announcement.');
    }
  }

  function confirmDelete(ann) {
    Alert.alert(
      `Delete "${ann.title}"?`,
      'This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteAnn(ann.id).unwrap(); }
          catch (e) { Alert.alert('Error', e.data ?? 'Could not delete.'); }
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
          <AppText style={styles.headerTitle}>Announcements</AppText>
          <AppText style={[styles.headerSub, {color: colors.textSecondary}]}>
            {announcements.length > 0 ? `${announcements.length} total` : 'Company updates'}
          </AppText>
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setModal({mode: 'create'})}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : announcements.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Megaphone size={44} color={colors.primary} />}
            title="No announcements yet"
            description={isAdmin ? 'Post an announcement to keep your team informed.' : 'No announcements from your organisation yet.'}
          />
          {isAdmin && (
            <Button
              label="Post Announcement"
              variant="primary"
              onPress={() => setModal({mode: 'create'})}
              style={{marginTop: spacing[4]}}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={a => a.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({item}) => (
            <AnnCard
              ann={item}
              canManage={isAdmin}
              onEdit={() => setModal({mode: 'edit', ann: item})}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
        />
      )}

      {modal && (
        <AnnModal
          initial={modal.ann}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={creating || updating}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   {flex: 1},
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

  // Card
  annCard:    {padding: spacing[4]},
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: 20, marginBottom: spacing[2],
  },
  pinnedText: {fontSize: 11, fontWeight: fontWeight.bold},
  annRow:     {flexDirection: 'row', gap: spacing[3]},
  annTitle:   {fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing[1]},
  annBody:    {fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing[2]},
  annMeta:    {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  annMetaText:{fontSize: 11},
  annMetaDot: {fontSize: 11},
  pinUntil:   {fontSize: 11, marginTop: 4},
  annActions: {flexDirection: 'row', gap: spacing[1]},
  actionBtn:  {padding: spacing[2]},

  // Modal
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0, maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[5],
  },
  sheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},
  fieldLabel: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[2],
  },
  input: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    fontSize: fontSize.sm, marginBottom: spacing[4],
  },
  hint: {fontSize: 11, marginTop: -spacing[3], marginBottom: spacing[4]},
});
