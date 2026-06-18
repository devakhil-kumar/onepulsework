import React, {useState, useMemo} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Plus, Trash2, Calendar, List, CalendarDays} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm} from '@features/auth/authSlice';
import {AppText, Avatar, Button, Spinner, EmptyState, DateField} from '@components/ui';
import {AppHeader, MonthCalendar} from '@components/common';
import {getDisplayTimezone} from '@utils/format';
import {
  useListEventsQuery,
  useCreateEventMutation,
  useDeleteEventMutation,
} from '@features/admin/adminApi';

// ── Config ─────────────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  BIRTHDAY: {
    emoji:  '🎂',
    color:  '#FF6B6B',
    label:  'Birthday',
    banner: ['#FF6B6B', '#FF8E53'],
  },
  WORK_ANNIVERSARY: {
    emoji:  '🏆',
    color:  '#F59E0B',
    label:  'Work Anniversary',
    banner: ['#F59E0B', '#FBBF24'],
  },
  CUSTOM: {
    emoji:  '🎯',
    color:  '#7B61FF',
    label:  'Event',
    banner: ['#7B61FF', '#1D6FFF'],
  },
};

function daysUntil(dateIso) {
  const now   = new Date(); now.setHours(0,0,0,0);
  const ev    = new Date(dateIso); ev.setHours(0,0,0,0);
  return Math.round((ev - now) / 86400000);
}

function extractName(ev) {
  if (!ev.employeeId) return null;
  const m = ev.title.match(/^(.+?)'s\s/);
  return m ? m[1] : null;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {timeZone: getDisplayTimezone(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
}

function ymd(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Event card ─────────────────────────────────────────────────────────────

function EventCard({ev, canManage, onDelete}) {
  const colors   = useColors();
  const cfg      = EVENT_CONFIG[ev.eventType] ?? EVENT_CONFIG.CUSTOM;
  const days     = daysUntil(ev.eventDate);
  const isToday  = days === 0;
  const empName  = extractName(ev);

  const countdownLabel = isToday ? '🎊 Today!'
    : days === 1 ? 'Tomorrow'
    : `In ${days} days`;

  const countdownBg    = isToday ? '#10B981' : cfg.color + '22';
  const countdownColor = isToday ? '#fff'    : cfg.color;

  return (
    <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      {/* Banner */}
      <View style={[styles.cardBanner, {backgroundColor: cfg.banner[0]}]}>
        <AppText style={styles.bannerEmoji}>{cfg.emoji}</AppText>
        {isToday && (
          <View style={styles.todayRing}>
            <AppText style={styles.todayText}>TODAY</AppText>
          </View>
        )}
        {empName && (
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, {borderColor: cfg.color}]}>
              <Avatar name={empName} size={46} />
            </View>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <AppText style={styles.cardName} numberOfLines={2}>
          {empName ?? ev.title}
        </AppText>
        <AppText style={[styles.cardType, {color: cfg.color}]}>{cfg.label}</AppText>
        <AppText style={[styles.cardDate, {color: colors.textSecondary}]}>
          {formatDate(ev.eventDate)}
        </AppText>
        {ev.description ? (
          <AppText style={[styles.cardDesc, {color: colors.textTertiary}]} numberOfLines={2}>
            {ev.description}
          </AppText>
        ) : null}
        <View style={[styles.countdown, {backgroundColor: countdownBg}]}>
          <AppText style={[styles.countdownText, {color: countdownColor}]}>
            {countdownLabel}
          </AppText>
        </View>
      </View>

      {/* Delete — only for custom events */}
      {canManage && !ev.isSystem && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Add event modal ────────────────────────────────────────────────────────

function AddEventModal({onClose, onSave, saving}) {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [date,  setDate]  = useState('');
  const [desc,  setDesc]  = useState('');

  function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Event title is required.'); return; }
    if (!date.trim())  { Alert.alert('Required', 'Date is required.'); return; }
    onSave({title: title.trim(), eventDate: date.trim(), description: desc.trim() || undefined});
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle}>Add Custom Event</AppText>
            <TouchableOpacity onPress={onClose}>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>EVENT TITLE</AppText>
          <TextInput
            style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Team Celebration"
            placeholderTextColor={colors.textTertiary}
          />

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DATE</AppText>
          <DateField value={date} onChange={setDate} placeholder="Select date" />

          <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DESCRIPTION (OPTIONAL)</AppText>
          <TextInput
            style={[styles.input, {
              borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text,
              height: 80, textAlignVertical: 'top',
            }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Brief description..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          <Button
            label={saving ? 'Adding…' : 'Add Event'}
            variant="primary"
            fullWidth
            loading={saving}
            onPress={handleSave}
            style={{marginTop: spacing[3], marginBottom: spacing[6]}}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

const GROUPS = [
  {key: 'today', label: '🎊 Today'},
  {key: 'week',  label: 'This Week'},
  {key: 'later', label: 'Later This Month'},
];

export default function EventsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  // OWNER/ADMIN (null permissions) and any role with announcements.manage can add events.
  const canManage = useAppSelector(selectHasPerm('announcements.manage'));

  const [showAdd, setShowAdd] = useState(false);
  const [view,     setView]     = useState('calendar'); // 'list' | 'calendar' — calendar shown first
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear,  setCalYear]  = useState(new Date().getFullYear());

  const shiftMonth = (delta) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    else if (m > 11) { m = 0; y += 1; }
    setCalMonth(m);
    setCalYear(y);
  };

  // List view → upcoming 30 days. Calendar view → the whole shown month.
  const lastDay  = new Date(calYear, calMonth + 1, 0).getDate();
  const calRange = view === 'calendar'
    ? {
        from: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`,
        to:   `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      }
    : undefined;

  const {data: events = [], isLoading} = useListEventsQuery(calRange);
  const [createEvent, {isLoading: creating}] = useCreateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();

  async function handleCreate(data) {
    try {
      await createEvent(data).unwrap();
      setShowAdd(false);
    } catch (err) {
      Alert.alert('Error', err.data ?? 'Could not add event.');
    }
  }

  function confirmDelete(ev) {
    Alert.alert(
      `Remove "${ev.title}"?`,
      'This event will be removed.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: async () => {
          try { await deleteEvent(ev.id).unwrap(); }
          catch (e) { Alert.alert('Error', e.data ?? 'Could not remove.'); }
        }},
      ],
    );
  }

  // Group events: today / this week / later
  const grouped = useMemo(() => {
    const now   = new Date(); now.setHours(0,0,0,0);
    const week  = new Date(now); week.setDate(week.getDate() + 7);
    return (Array.isArray(events) ? events : []).reduce((acc, ev) => {
      const d    = new Date(ev.eventDate); d.setHours(0,0,0,0);
      const days = Math.round((d - now) / 86400000);
      const key  = days === 0 ? 'today' : d < week ? 'week' : 'later';
      (acc[key] = acc[key] ?? []).push(ev);
      return acc;
    }, {});
  }, [events]);

  const hasEvents = (Array.isArray(events) ? events : []).length > 0;

  // Calendar dot markers + the shown month's events
  const eventMarkers = (Array.isArray(events) ? events : []).map(ev => ({
    day:   ymd(ev.eventDate),
    color: (EVENT_CONFIG[ev.eventType] ?? EVENT_CONFIG.CUSTOM).color,
  }));
  const monthEvents = (Array.isArray(events) ? events : []).filter(ev => {
    const d = new Date(ev.eventDate);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Events"
        rightAction={canManage && (
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      />

      {/* View toggle: list / calendar */}
      <View style={styles.toolbar}>
        <View style={[styles.segment, {borderColor: colors.border}]}>
          <TouchableOpacity
            onPress={() => setView('list')}
            style={[styles.segBtn, view === 'list' && {backgroundColor: colors.primary}]}>
            <List size={16} color={view === 'list' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('calendar')}
            style={[styles.segBtn, view === 'calendar' && {backgroundColor: colors.primary}]}>
            <CalendarDays size={16} color={view === 'calendar' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner /></View>
      ) : view === 'calendar' ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}>
          <MonthCalendar
            year={calYear}
            month={calMonth}
            markers={eventMarkers}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
          />
          <View style={{marginTop: spacing[5]}}>
            {monthEvents.length === 0 ? (
              <AppText style={[styles.monthEmpty, {color: colors.textTertiary}]}>No events this month</AppText>
            ) : (
              <View style={styles.grid}>
                {monthEvents.map(ev => (
                  <View key={ev.id} style={styles.gridItem}>
                    <EventCard ev={ev} canManage={canManage} onDelete={() => confirmDelete(ev)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : !hasEvents ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Calendar size={44} color={colors.primary} />}
            title="No upcoming events"
            description={'Birthdays and work anniversaries will appear here automatically.' + (canManage ? '\nYou can also add custom events.' : '')}
          />
          {canManage && (
            <Button
              label="Add Custom Event"
              variant="primary"
              onPress={() => setShowAdd(true)}
              style={{marginTop: spacing[4]}}
            />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + spacing[6]}]}
          showsVerticalScrollIndicator={false}>
          {GROUPS.map(({key, label}) => {
            const group = grouped[key];
            if (!group?.length) return null;
            return (
              <View key={key} style={styles.group}>
                <AppText style={[styles.groupLabel, {color: colors.textTertiary}]}>{label}</AppText>
                <View style={styles.grid}>
                  {group.map(ev => (
                    <View key={ev.id} style={styles.gridItem}>
                      <EventCard
                        ev={ev}
                        canManage={canManage}
                        onDelete={() => confirmDelete(ev)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
          saving={creating}
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

  toolbar: {flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing[4], paddingVertical: spacing[2]},
  segment: {flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden'},
  segBtn:  {paddingHorizontal: spacing[4], paddingVertical: spacing[2], alignItems: 'center', justifyContent: 'center'},
  monthEmpty: {textAlign: 'center', fontSize: fontSize.sm, paddingVertical: spacing[4]},

  scroll: {padding: spacing[4]},
  group:  {marginBottom: spacing[6]},
  groupLabel: {
    fontSize: 11, fontWeight: fontWeight.bold,
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: spacing[3],
  },
  grid:     {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3]},
  gridItem: {width: '47%'},

  // Event card
  card: {
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardBanner: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerEmoji: {fontSize: 32},
  todayRing: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: {color: '#fff', fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.5},
  avatarWrap: {
    position: 'absolute', bottom: -20,
    alignSelf: 'center',
  },
  avatarRing: {
    borderWidth: 2, borderRadius: 26,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  cardBody: {padding: spacing[3], paddingTop: spacing[5] + 4},
  cardName: {fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 2, textAlign: 'center'},
  cardType: {fontSize: 11, fontWeight: fontWeight.semiBold, textAlign: 'center', marginBottom: 4},
  cardDate: {fontSize: 10, textAlign: 'center', marginBottom: spacing[2]},
  cardDesc: {fontSize: 10, textAlign: 'center', marginBottom: spacing[2]},
  countdown: {
    alignSelf: 'center', paddingHorizontal: spacing[3], paddingVertical: 4,
    borderRadius: 20, marginBottom: spacing[1],
  },
  countdownText: {fontSize: 11, fontWeight: fontWeight.bold, textAlign: 'center'},
  deleteBtn: {
    position: 'absolute', top: 8, right: 8,
    padding: 4,
  },

  // Modal
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0,
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
});
