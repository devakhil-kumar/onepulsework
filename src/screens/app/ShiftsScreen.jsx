import React, {useState, useCallback} from 'react';
import {View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Plus, Pencil, Trash2, CalendarClock, List as ListIcon, CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react-native';
import dayjs from 'dayjs';
import {AppHeader} from '@components/common';
import {AppText, Card, Badge, Dropdown, EmptyState, Spinner} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {formatInTz, toTzDayKey} from '@utils/format';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm} from '@features/auth/authSlice';
import {useListShiftsQuery, useDeleteShiftMutation} from '@features/shift/shiftApi';
import ShiftFormSheet from './shift/ShiftFormSheet';
import ShiftTemplatesPanel from './shift/ShiftTemplatesPanel';
import ShiftCalendar from './shift/ShiftCalendar';

const STATUS_FILTER = [
  {value: '', label: 'All statuses'}, {value: 'DRAFT', label: 'Draft'},
  {value: 'PUBLISHED', label: 'Published'}, {value: 'COMPLETED', label: 'Completed'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

function ShiftCard({item, canManage, onEdit, onDelete, colors}) {
  const empName = item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '—';
  const isDraft = item.status === 'DRAFT';
  return (
    <Card style={styles.card}>
      <View style={{flex: 1, minWidth: 0}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing[2]}}>
          {item.template ? <View style={[styles.dot, {backgroundColor: item.template.color || colors.primary}]} /> : null}
          <AppText style={{color: colors.text, fontWeight: fontWeight.semiBold}} numberOfLines={1}>{empName}</AppText>
        </View>
        <AppText style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2}}>
          {formatInTz(item.startAt, item.timezone)} → {formatInTz(item.endAt, item.timezone, false)}
        </AppText>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1]}}>
          {item.template ? <AppText style={{color: colors.textTertiary, fontSize: fontSize.xs}}>{item.template.name}</AppText> : null}
          {item.assignmentType === 'AUTO' ? <AppText style={{color: colors.textTertiary, fontSize: fontSize.xs}}>· Auto</AppText> : null}
          {item.breakMinutes ? <AppText style={{color: colors.textTertiary, fontSize: fontSize.xs}}>· {item.breakMinutes}m break</AppText> : null}
        </View>
      </View>
      <View style={{alignItems: 'flex-end', gap: spacing[2]}}>
        <Badge status={item.status} size="sm" />
        {canManage && isDraft ? (
          <View style={{flexDirection: 'row', gap: spacing[3]}}>
            <TouchableOpacity onPress={() => onEdit(item)} hitSlop={8}><Pencil size={16} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}><Trash2 size={16} color={colors.error} /></TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function ViewToggle({value, onChange, colors}) {
  const opts = [{k: 'list', Icon: ListIcon}, {k: 'calendar', Icon: CalendarDays}];
  return (
    <View style={[styles.toggle, {borderColor: colors.border}]}>
      {opts.map(({k, Icon}) => {
        const active = value === k;
        return (
          <TouchableOpacity key={k} onPress={() => onChange(k)} style={[styles.toggleBtn, {backgroundColor: active ? colors.primary : colors.surface}]}>
            <Icon size={18} color={active ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ShiftsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Gated by the same permission the backend requires ('shifts.manage') so any
  // role granted it can manage shifts — not just OWNER/ADMIN/MANAGER.
  const canManage = useAppSelector(selectHasPerm('shifts.manage'));

  const [tab, setTab] = useState('schedule');
  const [view, setView] = useState('calendar');                   // 'list' | 'calendar' — calendar shown first
  const [scope, setScope] = useState('all');                      // 'all' | 'mine' — only meaningful for managers
  const [calMonth, setCalMonth] = useState(() => dayjs().startOf('month'));
  const [selectedDay, setSelectedDay] = useState(null);           // 'YYYY-MM-DD'
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);

  // ONE month-scoped query feeds both views (±1 day padding for tz edges); the list
  // and calendar then keep only shifts whose tz-day is actually in the month, so the
  // two views always show the exact same set.
  const monthKey = calMonth.format('YYYY-MM');
  const monthFrom = calMonth.startOf('month').subtract(1, 'day').toISOString();
  const monthTo = calMonth.endOf('month').add(1, 'day').toISOString();

  const {data, isFetching, refetch} = useListShiftsQuery({
    pageSize: 1000, from: monthFrom, to: monthTo, status: status || undefined,
    scope: canManage ? scope : undefined,
  });
  const [deleteShift] = useDeleteShiftMutation();

  const allShifts = Array.isArray(data) ? data : (data?.items ?? []);
  const shifts = allShifts.filter(s => toTzDayKey(s.startAt, s.timezone).startsWith(monthKey));

  const markersByDay = {};
  for (const s of shifts) {
    const day = toTzDayKey(s.startAt, s.timezone);
    (markersByDay[day] = markersByDay[day] || []).push({color: s.template?.color || colors.primary});
  }

  const dayShifts = (selectedDay ? shifts.filter(s => toTzDayKey(s.startAt, s.timezone) === selectedDay) : [])
    .slice()
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const goMonth = next => { setCalMonth(next); setSelectedDay(null); };
  const prevMonth = () => goMonth(calMonth.subtract(1, 'month'));
  const nextMonth = () => goMonth(calMonth.add(1, 'month'));

  function openCreate() { setEditShift(null); setFormOpen(true); }
  function openEdit(s) { setEditShift(s); setFormOpen(true); }
  function confirmDelete(s) {
    Alert.alert('Delete shift?', 'This shift will be removed. The employee is notified.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteShift(s.id)},
    ]);
  }

  const Tab = ({k, label}) => (
    <TouchableOpacity onPress={() => setTab(k)} style={[styles.tab, {backgroundColor: tab === k ? colors.primary : colors.surfaceAlt}]}>
      <AppText style={{color: tab === k ? '#fff' : colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold}}>{label}</AppText>
    </TouchableOpacity>
  );

  const isCalendar = view === 'calendar';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Shifts"
        rightAction={canManage && tab === 'schedule' ? (
          <TouchableOpacity onPress={openCreate} hitSlop={8} style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing[6]}]}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

        {canManage && (
          <View style={styles.tabRow}>
            <Tab k="schedule" label="Schedule" />
            <Tab k="templates" label="Templates" />
          </View>
        )}

        {tab === 'templates' && canManage ? (
          <ShiftTemplatesPanel />
        ) : (
          <>
            <Dropdown value={status} onChange={setStatus} options={STATUS_FILTER} />

            {/* Mine / All — only managers can see others' shifts; everyone else is always "mine". */}
            {canManage && (
              <View style={styles.scopeRow}>
                {[{k: 'all', label: 'All shifts'}, {k: 'mine', label: 'My shifts'}].map(o => {
                  const active = scope === o.k;
                  return (
                    <TouchableOpacity key={o.k} onPress={() => setScope(o.k)}
                      style={[styles.scopeBtn, {backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border}]}>
                      <AppText style={{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, color: active ? '#fff' : colors.textSecondary}}>{o.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Month navigator + list/calendar toggle */}
            <View style={styles.toolbar}>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} hitSlop={8} style={[styles.navBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>
                <AppText style={{color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.md, minWidth: 130, textAlign: 'center'}}>
                  {calMonth.format('MMMM YYYY')}
                </AppText>
                <TouchableOpacity onPress={nextMonth} hitSlop={8} style={[styles.navBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ViewToggle value={view} onChange={setView} colors={colors} />
            </View>

            {isFetching && allShifts.length === 0 ? (
              <Spinner />
            ) : isCalendar ? (
              <>
                <ShiftCalendar
                  month={calMonth}
                  markersByDay={markersByDay}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  colors={colors}
                />
                <View style={{marginTop: spacing[4]}}>
                  {!selectedDay ? (
                    <AppText style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing[4]}}>
                      Tap a highlighted day to see its shifts.
                    </AppText>
                  ) : (
                    <>
                      <AppText style={{color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.md, marginBottom: spacing[2]}}>
                        {dayjs(selectedDay).format('ddd, D MMM YYYY')}
                      </AppText>
                      {dayShifts.length === 0 ? (
                        <AppText style={{color: colors.textTertiary, fontSize: fontSize.sm}}>No shifts on this day.</AppText>
                      ) : (
                        dayShifts.map(s => (
                          <ShiftCard key={s.id} item={s} canManage={canManage} onEdit={openEdit} onDelete={confirmDelete} colors={colors} />
                        ))
                      )}
                    </>
                  )}
                </View>
              </>
            ) : shifts.length === 0 ? (
              <EmptyState icon={<CalendarClock size={40} color={colors.textTertiary} />} title="No shifts" description={canManage ? 'Tap + to create the first shift' : 'You have no shifts this month'} />
            ) : (
              shifts.map(s => (
                <ShiftCard key={s.id} item={s} canManage={canManage} onEdit={openEdit} onDelete={confirmDelete} colors={colors} />
              ))
            )}
          </>
        )}
      </ScrollView>

      <ShiftFormSheet visible={formOpen} onClose={() => setFormOpen(false)} editShift={editShift} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: spacing[4]},
  tabRow: {flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4]},
  tab: {flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md},
  addBtn: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  card: {flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2]},
  dot: {width: 10, height: 10, borderRadius: 3},
  scopeRow: {flexDirection: 'row', gap: spacing[2], marginTop: spacing[2]},
  scopeBtn: {flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1},
  toolbar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[3], marginBottom: spacing[3]},
  monthNav: {flexDirection: 'row', alignItems: 'center', gap: spacing[2]},
  navBtn: {width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  toggle: {flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden'},
  toggleBtn: {paddingHorizontal: spacing[3], paddingVertical: spacing[2], alignItems: 'center', justifyContent: 'center'},
});
