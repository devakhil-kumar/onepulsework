/**
 * @file src/screens/app/shift/ShiftCalendar.jsx
 * @description Month grid for the Shifts screen. Monday-start week, coloured day
 * dots driven by `markersByDay` ('YYYY-MM-DD' → [{ color }]). Only days with
 * shifts are tappable; tapping one calls `onSelectDay(day)`.
 */
import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import dayjs from 'dayjs';
import {AppText} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = n => String(n).padStart(2, '0');

export default function ShiftCalendar({month, markersByDay = {}, selectedDay, onSelectDay, colors}) {
  const year = month.year();
  const m = month.month(); // 0–11
  const first = dayjs(new Date(year, m, 1));
  const offset = (first.day() + 6) % 7; // Monday-start
  const daysInMonth = first.daysInMonth();
  const todayStr = dayjs().format('YYYY-MM-DD');

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[styles.wrap, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <View style={styles.weekRow}>
        {WEEKDAYS.map(w => (
          <View key={w} style={styles.headerCell}>
            <AppText style={{fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textTertiary}}>{w}</AppText>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, di) => {
            if (d == null) return <View key={di} style={styles.cell} />;
            const dayStr = `${year}-${pad(m + 1)}-${pad(d)}`;
            const dots = markersByDay[dayStr];
            const isMk = !!dots;
            const isToday = dayStr === todayStr;
            const isSel = dayStr === selectedDay;
            return (
              <TouchableOpacity
                key={di}
                disabled={!isMk}
                activeOpacity={0.7}
                onPress={() => onSelectDay(dayStr)}
                style={[styles.cell, styles.dayCell, {
                  backgroundColor: isSel ? colors.primary : (isMk ? colors.primaryLight : 'transparent'),
                  borderColor: isToday ? colors.primary : 'transparent',
                }]}>
                <AppText style={{
                  fontSize: fontSize.sm,
                  fontWeight: isToday ? fontWeight.bold : fontWeight.regular,
                  color: isSel ? '#fff' : (isMk ? colors.primary : colors.text),
                }}>{d}</AppText>
                {isMk ? (
                  <View style={styles.dotRow}>
                    {dots.slice(0, 3).map((dot, idx) => (
                      <View key={idx} style={[styles.dot, {backgroundColor: isSel ? '#fff' : (dot.color || colors.primary)}]} />
                    ))}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {borderWidth: 1, borderRadius: radius.lg, padding: spacing[3]},
  weekRow: {flexDirection: 'row', gap: 4, marginBottom: 4},
  headerCell: {flex: 1, alignItems: 'center', paddingVertical: spacing[1]},
  cell: {flex: 1, aspectRatio: 1},
  dayCell: {alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: radius.md},
  dotRow: {flexDirection: 'row', gap: 2, marginTop: 2},
  dot: {width: 5, height: 5, borderRadius: 3},
});
