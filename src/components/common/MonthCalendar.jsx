import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';
import {spacing, fontSize, fontWeight} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from '@components/ui/AppText';

/**
 * Reusable month grid with coloured day markers. Monday-start week.
 *
 * @param {object}   props
 * @param {number}   props.year
 * @param {number}   props.month    0–11
 * @param {Array<{day: string, color: string}>} props.markers  day = 'YYYY-MM-DD'
 * @param {Function} props.onPrev
 * @param {Function} props.onNext
 */

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = n => String(n).padStart(2, '0');

export default function MonthCalendar({year, month, markers = [], onPrev, onNext}) {
  const colors = useColors();

  const byDay = useMemo(() => {
    const m = {};
    for (const mk of markers) {
      if (!mk?.day) continue;
      (m[mk.day] = m[mk.day] || []).push(mk);
    }
    return m;
  }, [markers]);

  const first        = new Date(year, month, 1);
  const offset       = (first.getDay() + 6) % 7;       // Monday-start
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const monthName    = first.toLocaleString('en-AU', {month: 'long'});

  const now            = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const todayNum       = now.getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      {/* Month nav header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrev} style={styles.nav} hitSlop={8}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.title, {color: colors.text}]}>{monthName} {year}</AppText>
        <TouchableOpacity onPress={onNext} style={styles.nav} hitSlop={8}>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.row}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <AppText style={[styles.week, {color: colors.textTertiary}]}>{w}</AppText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((d, di) => {
            if (d == null) return <View key={di} style={styles.cell} />;
            const dayStr  = `${year}-${pad(month + 1)}-${pad(d)}`;
            const mk      = byDay[dayStr];
            const isMk    = !!mk;
            const isToday = isCurrentMonth && d === todayNum;
            const c       = isMk ? mk[0].color : null;
            return (
              <View key={di} style={styles.cell}>
                <View style={[
                  styles.inner,
                  isMk && {backgroundColor: c + '1A'},
                  isToday && {borderColor: colors.primary, borderWidth: 1.5},
                ]}>
                  <AppText style={[
                    styles.num,
                    {color: isMk ? c : colors.text, fontWeight: isToday ? fontWeight.bold : fontWeight.medium},
                  ]}>
                    {d}
                  </AppText>
                  {isMk && <View style={[styles.dot, {backgroundColor: c}]} />}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card:   {borderWidth: 1, borderRadius: 16, padding: spacing[3]},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2]},
  nav:    {padding: spacing[2]},
  title:  {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  row:    {flexDirection: 'row'},
  week:   {fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase'},
  cell:   {flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2},
  inner:  {
    flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent',
  },
  num:    {fontSize: fontSize.sm},
  dot:    {width: 5, height: 5, borderRadius: 3, marginTop: 2},
});
