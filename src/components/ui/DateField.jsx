import React, {useState} from 'react';
import {View, TouchableOpacity, Platform, StyleSheet} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Calendar} from 'lucide-react-native';
import {spacing, fontSize, radius} from '@theme';
import {useColors, useIsDark} from '@app/ThemeContext';
import AppText from './AppText';
import Button from './Button';

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pretty(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-AU', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'});
}

/**
 * Cross-platform date field — tap to open a calendar.
 * Android uses the native dialog; iOS shows an inline calendar (no nested Modal,
 * so it works inside other modals/sheets). Value is a 'YYYY-MM-DD' string.
 */
export default function DateField({value, onChange, placeholder = 'Select date', minimumDate, maximumDate}) {
  const colors = useColors();
  const isDark = useIsDark();
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(null);

  const current = value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date();

  function open() {
    setTemp(current);
    setShow(true);
  }

  function onAndroidChange(event, selected) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(ymd(selected));
  }

  return (
    <View>
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.7}
        style={[styles.field, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
        <Calendar size={15} color={colors.textTertiary} />
        <AppText style={{flex: 1, fontSize: fontSize.sm, color: value ? colors.text : colors.textTertiary}}>
          {pretty(value) ?? placeholder}
        </AppText>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={8}>
            <AppText style={{fontSize: fontSize.xs, color: colors.textTertiary}}>Clear</AppText>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {/* Android — native dialog (a system window, no nesting issue) */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={current}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      )}

      {/* iOS — inline calendar (a View, safe inside other modals) */}
      {show && Platform.OS === 'ios' && (
        <View style={[styles.iosBox, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          <DateTimePicker
            value={temp ?? current}
            mode="date"
            display="inline"
            themeVariant={isDark ? 'dark' : 'light'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_e, d) => d && setTemp(d)}
            style={{alignSelf: 'stretch'}}
          />
          <Button
            label="Done"
            variant="primary"
            fullWidth
            onPress={() => { if (temp) onChange(ymd(temp)); setShow(false); }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  iosBox: {
    borderWidth: 1, borderRadius: radius.md, marginTop: spacing[2],
    padding: spacing[2],
  },
});
