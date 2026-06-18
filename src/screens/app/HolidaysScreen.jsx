import React, {useState, useMemo} from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Plus, Calendar, Trash2, Pencil, DownloadCloud, Check,
  List, CalendarDays,
} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectIsAdmin, selectHasPerm} from '@features/auth/authSlice';
import {AppText, Button, Spinner, EmptyState} from '@components/ui';
import {AppHeader, MonthCalendar} from '@components/common';
import {
  useListHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useSeedHolidaysMutation,
} from '@features/holiday/holidayApi';

// ── Config ───────────────────────────────────────────────────────────────────

const AU_STATES = [
  {value: 'NSW', label: 'NSW'},
  {value: 'VIC', label: 'VIC'},
  {value: 'QLD', label: 'QLD'},
  {value: 'WA',  label: 'WA'},
  {value: 'SA',  label: 'SA'},
  {value: 'TAS', label: 'TAS'},
  {value: 'ACT', label: 'ACT'},
  {value: 'NT',  label: 'NT'},
];

const STATE_COLORS = {
  NSW: '#3B82F6', VIC: '#8B5CF6', QLD: '#F59E0B', WA: '#10B981',
  SA: '#EF4444', TAS: '#06B6D4', ACT: '#6366F1', NT: '#F97316',
};

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({length: 5}, (_, i) => CURRENT_YEAR - 1 + i);

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthOf(iso) {
  return new Date(iso).toLocaleString('en-AU', {month: 'long', timeZone: 'UTC'});
}
function weekdayOf(iso) {
  return new Date(iso).toLocaleString('en-AU', {weekday: 'short', timeZone: 'UTC'}).toUpperCase();
}
function dayNumOf(iso) {
  return new Date(iso).toLocaleString('en-AU', {day: 'numeric', timeZone: 'UTC'});
}
function monthShortOf(iso) {
  return new Date(iso).toLocaleString('en-AU', {month: 'short', timeZone: 'UTC'});
}
function isPast(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(iso) < today;
}

// ── Add / Edit modal ─────────────────────────────────────────────────────────

function HolidayFormModal({initial, onClose, onSave, saving}) {
  const colors = useColors();
  const [name,  setName]  = useState(initial?.name ?? '');
  const [date,  setDate]  = useState(initial?.date ? initial.date.slice(0, 10) : '');
  const [state, setState] = useState(initial?.state ?? 'NSW');
  const [nationwide, setNationwide] = useState(initial?.isNationwide ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Holiday name is required.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD.'); return;
    }
    onSave({
      name: name.trim(),
      date: date.trim(),
      state,
      isNationwide: nationwide,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle}>{initial ? 'Edit Holiday' : 'Add Public Holiday'}</AppText>
            <TouchableOpacity onPress={onClose}>
              <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm}}>Cancel</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>HOLIDAY NAME</AppText>
            <TextInput
              style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Christmas Day"
              placeholderTextColor={colors.textTertiary}
            />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>DATE</AppText>
            <TextInput
              style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
            />

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>STATE</AppText>
            <View style={styles.chipWrap}>
              {AU_STATES.map(s => {
                const active = state === s.value;
                const c = STATE_COLORS[s.value];
                return (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setState(s.value)}
                    style={[
                      styles.chip,
                      {borderColor: active ? c : colors.border, backgroundColor: active ? c + '22' : 'transparent'},
                    ]}>
                    <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: active ? c : colors.textSecondary}}>
                      {s.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setNationwide(v => !v)}
              activeOpacity={0.7}
              style={[styles.toggleRow, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
              <View style={[
                styles.checkbox,
                {borderColor: nationwide ? colors.primary : colors.border, backgroundColor: nationwide ? colors.primary : 'transparent'},
              ]}>
                {nationwide && <Check size={13} color="#fff" strokeWidth={3} />}
              </View>
              <View style={{flex: 1}}>
                <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.text}}>
                  Nationwide holiday
                </AppText>
                <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1}}>
                  Applies to all Australian states
                </AppText>
              </View>
            </TouchableOpacity>

            <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>NOTES (OPTIONAL)</AppText>
            <TextInput
              style={[styles.input, {
                borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text,
                height: 72, textAlignVertical: 'top',
              }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra info…"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <Button
              label={saving ? 'Saving…' : (initial ? 'Save changes' : 'Add holiday')}
              variant="primary"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{marginTop: spacing[3], marginBottom: spacing[6]}}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Holiday row ──────────────────────────────────────────────────────────────

function HolidayRow({h, canManage, onEdit, onDelete}) {
  const colors = useColors();
  const c      = STATE_COLORS[h.state] ?? colors.primary;
  const past   = isPast(h.date);

  return (
    <View style={[styles.row, {backgroundColor: colors.surface, borderColor: colors.border, opacity: past ? 0.55 : 1}]}>
      {/* Date badge */}
      <View style={[styles.badge, {backgroundColor: c + '1A', borderColor: c + '40'}]}>
        <AppText style={[styles.badgeDay, {color: c}]}>{weekdayOf(h.date)}</AppText>
        <AppText style={[styles.badgeNum, {color: colors.text}]}>{dayNumOf(h.date)}</AppText>
        <AppText style={[styles.badgeMon, {color: colors.textTertiary}]}>{monthShortOf(h.date)}</AppText>
      </View>

      {/* Info */}
      <View style={{flex: 1, minWidth: 0}}>
        <AppText style={[styles.rowName, {color: colors.text}]} numberOfLines={2}>{h.name}</AppText>
        <View style={styles.pillRow}>
          {h.isNationwide ? (
            <View style={[styles.pill, {backgroundColor: '#3B82F622', borderColor: '#3B82F640'}]}>
              <AppText style={[styles.pillText, {color: '#3B82F6'}]}>🇦🇺 Nationwide</AppText>
            </View>
          ) : (
            <View style={[styles.pill, {backgroundColor: c + '22', borderColor: c + '40'}]}>
              <AppText style={[styles.pillText, {color: c}]}>{h.state}</AppText>
            </View>
          )}
          {h.notes ? (
            <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary, flexShrink: 1}} numberOfLines={1}>
              {h.notes}
            </AppText>
          ) : null}
        </View>
      </View>

      {/* Admin actions */}
      {canManage && (
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
            <Pencil size={15} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconBtn} hitSlop={8}>
            <Trash2 size={15} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HolidaysScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const isAdmin = useAppSelector(selectIsAdmin);
  const hasPerm = useAppSelector(selectHasPerm('holidays.manage'));
  const canManage = isAdmin || hasPerm;

  const [year,        setYear]        = useState(CURRENT_YEAR);
  const [stateFilter, setStateFilter] = useState(''); // '' = all
  const [modal,       setModal]       = useState(null); // null | 'add' | holiday object
  const [view,        setView]        = useState('calendar'); // 'list' | 'calendar' — calendar shown first
  const [calMonth,    setCalMonth]    = useState(new Date().getMonth()); // 0–11

  // Move the calendar one month at a time, rolling the year over at the edges
  function shiftMonth(delta) {
    let m = calMonth + delta;
    if (m < 0)  { m = 11; setYear(y => y - 1); }
    else if (m > 11) { m = 0; setYear(y => y + 1); }
    setCalMonth(m);
  }

  const {data: holidays = [], isLoading} = useListHolidaysQuery({
    year,
    ...(stateFilter ? {state: stateFilter} : {}),
  });

  const [create, {isLoading: creating}] = useCreateHolidayMutation();
  const [update, {isLoading: updating}] = useUpdateHolidayMutation();
  const [remove]                        = useDeleteHolidayMutation();
  const [seed,   {isLoading: seeding}]  = useSeedHolidaysMutation();

  const saving = creating || updating;

  async function handleSave(data) {
    try {
      if (modal && modal !== 'add') {
        await update({id: modal.id, ...data}).unwrap();
      } else {
        await create(data).unwrap();
      }
      setModal(null);
    } catch (e) {
      Alert.alert('Error', e.data ?? 'Could not save holiday.');
    }
  }

  function confirmDelete(h) {
    Alert.alert(`Delete "${h.name}"?`, 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await remove(h.id).unwrap(); }
        catch (e) { Alert.alert('Error', e.data ?? 'Could not delete.'); }
      }},
    ]);
  }

  function handleSeed() {
    Alert.alert(
      `Import ${year} AU Holidays?`,
      'Standard Australian public holidays for this year will be added. Existing ones are skipped.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Import', onPress: async () => {
          try {
            const res = await seed({year}).unwrap();
            Alert.alert('Done', `Imported ${res.seeded} holidays${res.skipped ? ` (${res.skipped} already existed)` : ''}.`);
          } catch (e) {
            Alert.alert('Error', e.data ?? 'Could not import holidays.');
          }
        }},
      ],
    );
  }

  // Group by month in calendar order
  const grouped = useMemo(() => {
    const list = Array.isArray(holidays) ? holidays : [];
    return MONTH_ORDER.map(month => ({
      month,
      items: list.filter(h => monthOf(h.date) === month),
    })).filter(g => g.items.length > 0);
  }, [holidays]);

  const hasHolidays = (Array.isArray(holidays) ? holidays : []).length > 0;

  // Holidays falling in the calendar's currently-shown month
  const monthHolidays = useMemo(() => {
    const list = Array.isArray(holidays) ? holidays : [];
    return list
      .filter(h => {
        const d = new Date(h.date);
        return d.getUTCFullYear() === year && d.getUTCMonth() === calMonth;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidays, year, calMonth]);

  // Calendar dot markers for the shown month
  const holidayMarkers = monthHolidays.map(h => ({
    day:   h.date.slice(0, 10),
    color: h.isNationwide ? '#3B82F6' : (STATE_COLORS[h.state] ?? colors.primary),
  }));

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Public Holidays"
        showBack
        rightAction={canManage && (
          <TouchableOpacity
            onPress={() => setModal('add')}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={{paddingBottom: insets.bottom + spacing[6]}}
        showsVerticalScrollIndicator={false}>

        {/* Filters — scroll together with the list */}
        <View style={[styles.filters, {borderBottomColor: colors.border}]}>
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

          {/* Year chips — calendar view has its own month nav */}
          {view === 'list' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {YEARS.map(y => {
                const active = y === year;
                return (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    style={[styles.chip, {borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent'}]}>
                    <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: active ? '#fff' : colors.textSecondary}}>
                      {y}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, {marginTop: spacing[2]}]}>
            {[{value: '', label: 'All'}, ...AU_STATES].map(s => {
              const active = stateFilter === s.value;
              return (
                <TouchableOpacity
                  key={s.value || 'all'}
                  onPress={() => setStateFilter(s.value)}
                  style={[styles.chip, {borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : 'transparent'}]}>
                  <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: active ? colors.primary : colors.textSecondary}}>
                    {s.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : view === 'calendar' ? (
          <View style={styles.body}>
            {canManage && (
              <TouchableOpacity
                onPress={handleSeed}
                disabled={seeding}
                style={[styles.importBtn, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                <DownloadCloud size={16} color={colors.primary} />
                <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.primary}}>
                  {seeding ? 'Importing…' : `Import ${year} AU Holidays`}
                </AppText>
              </TouchableOpacity>
            )}
            <MonthCalendar
              year={year}
              month={calMonth}
              markers={holidayMarkers}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />
            <View style={styles.monthList}>
              {monthHolidays.length === 0 ? (
                <AppText style={[styles.monthEmpty, {color: colors.textTertiary}]}>No holidays this month</AppText>
              ) : monthHolidays.map(h => (
                <HolidayRow
                  key={h.id}
                  h={h}
                  canManage={canManage}
                  onEdit={() => setModal(h)}
                  onDelete={() => confirmDelete(h)}
                />
              ))}
            </View>
          </View>
        ) : !hasHolidays ? (
          <View style={styles.center}>
            <EmptyState
              icon={<Calendar size={44} color={colors.primary} />}
              title={`No holidays for ${year}`}
              description={canManage
                ? 'Import standard AU holidays or add them manually.'
                : `No public holidays recorded${stateFilter ? ` for ${stateFilter}` : ''}.`}
            />
            {canManage && (
              <Button
                label={seeding ? 'Importing…' : `Import ${year} AU Holidays`}
                variant="primary"
                loading={seeding}
                onPress={handleSeed}
                style={{marginTop: spacing[4]}}
              />
            )}
          </View>
        ) : (
          <View style={styles.body}>
            {canManage && (
              <TouchableOpacity
                onPress={handleSeed}
                disabled={seeding}
                style={[styles.importBtn, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                <DownloadCloud size={16} color={colors.primary} />
                <AppText style={{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold, color: colors.primary}}>
                  {seeding ? 'Importing…' : `Import ${year} AU Holidays`}
                </AppText>
              </TouchableOpacity>
            )}

            {grouped.map(({month, items}) => (
              <View key={month} style={styles.group}>
                <View style={styles.groupHead}>
                  <AppText style={[styles.groupLabel, {color: colors.textTertiary}]}>{month}</AppText>
                  <View style={[styles.countPill, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
                    <AppText style={{fontSize: 10, fontWeight: fontWeight.bold, color: colors.textTertiary}}>{items.length}</AppText>
                  </View>
                  <View style={[styles.divider, {backgroundColor: colors.border}]} />
                </View>
                <View style={{gap: spacing[2]}}>
                  {items.map(h => (
                    <HolidayRow
                      key={h.id}
                      h={h}
                      canManage={canManage}
                      onEdit={() => setModal(h)}
                      onDelete={() => confirmDelete(h)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {modal && (
        <HolidayFormModal
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   {flex: 1},
  addBtn: {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  center: {alignItems: 'center', paddingTop: 56, paddingHorizontal: spacing[4]},

  filters: {paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1},
  filterRow: {gap: spacing[2], paddingRight: spacing[4]},

  // View toggle
  toolbar: {flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing[2]},
  segment: {flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden'},
  segBtn:  {paddingHorizontal: spacing[4], paddingVertical: spacing[2], alignItems: 'center', justifyContent: 'center'},

  body: {padding: spacing[4]},

  // Calendar
  calCard: {borderWidth: 1, borderRadius: 16, padding: spacing[3]},
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  calNav:   {padding: spacing[2]},
  calTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  weekRow:  {flexDirection: 'row'},
  weekTxt:  {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase'},
  dayCell:  {flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2},
  dayInner: {
    flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayNum: {fontSize: fontSize.sm},
  dot:    {width: 5, height: 5, borderRadius: 3, marginTop: 2},
  monthList:  {marginTop: spacing[4], gap: spacing[2]},
  monthEmpty: {textAlign: 'center', fontSize: fontSize.sm, paddingVertical: spacing[4]},

  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    paddingVertical: spacing[3], borderRadius: radius.md, borderWidth: 1,
    marginBottom: spacing[5],
  },

  group: {marginBottom: spacing[5]},
  groupHead: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3]},
  groupLabel: {
    fontSize: 11, fontWeight: fontWeight.bold,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  countPill: {paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, borderWidth: 1},
  divider: {flex: 1, height: 1},

  // Holiday row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[3], borderRadius: 14, borderWidth: 1,
  },
  badge: {
    width: 50, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, alignItems: 'center',
  },
  badgeDay: {fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.4},
  badgeNum: {fontSize: 18, fontWeight: fontWeight.bold, lineHeight: 22},
  badgeMon: {fontSize: 9, fontWeight: fontWeight.semiBold},
  rowName: {fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 5},
  pillRow: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap'},
  pill: {paddingHorizontal: 9, paddingVertical: 2, borderRadius: 20, borderWidth: 1},
  pillText: {fontSize: 10, fontWeight: fontWeight.bold},
  rowActions: {flexDirection: 'row', gap: spacing[1]},
  iconBtn: {padding: 6},

  // Modal
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing[5], paddingBottom: 0, maxHeight: '88%',
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
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4]},
  chip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: 20, borderWidth: 1.5,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[3], borderRadius: radius.md, borderWidth: 1, marginBottom: spacing[4],
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
