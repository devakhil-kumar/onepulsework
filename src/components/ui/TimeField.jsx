import React, {useState} from 'react';
import {View, TouchableOpacity, Platform, Modal, StyleSheet} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Clock} from 'lucide-react-native';
import {spacing, fontSize, radius} from '@theme';
import {useColors, useIsDark} from '@app/ThemeContext';
import AppText from './AppText';
import Button from './Button';

function hm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Build a Date for today carrying the given "HH:mm" (or now). */
function fromHM(value) {
  const d = new Date();
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function pretty(value) {
  if (!value) return null;
  const d = fromHM(value);
  return d.toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit'});
}

/**
 * Cross-platform time field — tap to pick a time of day. Value is an "HH:mm" string.
 * Android uses the native clock dialog; iOS shows an inline spinner (safe inside modals).
 */
export default function TimeField({value, onChange, placeholder = 'Select time'}) {
  const colors = useColors();
  const isDark = useIsDark();
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(null);

  const current = fromHM(value);

  function open() {
    setTemp(current);
    setShow(true);
  }

  function onAndroidChange(event, selected) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(hm(selected));
  }

  return (
    <View>
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.7}
        style={[styles.field, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
        <Clock size={15} color={colors.textTertiary} />
        <AppText style={{flex: 1, fontSize: fontSize.sm, color: value ? colors.text : colors.textTertiary}}>
          {pretty(value) ?? placeholder}
        </AppText>
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={current}
          mode="time"
          display="clock"
          is24Hour={false}
          onChange={onAndroidChange}
        />
      )}

      {/* iOS — full-width bottom sheet so the spinner is never squeezed into a
          narrow column (e.g. the START/END time pair on the shift form). */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShow(false)} style={styles.backdrop}>
            <TouchableOpacity activeOpacity={1} style={[styles.iosSheet, {backgroundColor: colors.surface}]}>
              <DateTimePicker
                value={temp ?? current}
                mode="time"
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_e, d) => d && setTemp(d)}
                style={{alignSelf: 'stretch'}}
              />
              <Button
                label="Done"
                variant="primary"
                fullWidth
                onPress={() => { if (temp) onChange(hm(temp)); setShow(false); }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
  backdrop: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosSheet: {
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing[4], paddingBottom: spacing[6],
  },
});
