import React, {useState, useMemo} from 'react';
import {
  View, Modal, TouchableOpacity, FlatList, TextInput, StyleSheet,
} from 'react-native';
import {ChevronDown, Check, Search, X} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from './AppText';
import Button from './Button';

/**
 * Multi-select field — value is string[]; onChange(string[]).
 * options: Array of { value, label }.
 */
export default function MultiSelectField({
  label,
  value = [],
  onChange,
  options = [],
  placeholder = 'Select…',
  searchable = true,
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = Array.isArray(value) ? value : [];
  const selectedSet = useMemo(() => new Set(Array.isArray(value) ? value : []), [value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  const summary = selected.length === 0
    ? placeholder
    : `${selected.length} selected`;

  function toggle(val) {
    if (selectedSet.has(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  }

  return (
    <>
      <View style={styles.wrap}>
        {label ? <AppText style={[styles.label, {color: colors.textSecondary}]}>{label}</AppText> : null}
        <TouchableOpacity
          onPress={() => setOpen(true)}
          activeOpacity={0.75}
          style={[styles.trigger, {borderColor: open ? colors.primary : colors.border, backgroundColor: colors.surfaceAlt}]}>
          <AppText style={[styles.triggerText, {color: selected.length ? colors.text : colors.textTertiary}]} numberOfLines={1}>
            {summary}
          </AppText>
          <ChevronDown size={16} color={colors.textSecondary} style={{transform: [{rotate: open ? '180deg' : '0deg'}]}} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[styles.backdrop, {backgroundColor: colors.overlay}]}
          activeOpacity={1}
          onPress={() => { setOpen(false); setQuery(''); }}
        />
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>{label ?? 'Select'}</AppText>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={[styles.searchRow, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
              <Search size={15} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, {color: colors.text}]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={o => o.value}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => {
              const active = selectedSet.has(item.value);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item.value)}
                  activeOpacity={0.7}
                  style={[styles.option, {borderBottomColor: colors.border}, active && {backgroundColor: colors.primaryLight}]}>
                  <AppText
                    style={[styles.optionText, {color: active ? colors.primary : colors.text}, active && {fontWeight: fontWeight.semiBold}]}
                    numberOfLines={2}>
                    {item.label}
                  </AppText>
                  {active && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<AppText style={[styles.empty, {color: colors.textSecondary}]}>No results found</AppText>}
          />

          <View style={{paddingVertical: spacing[3]}}>
            <Button label={`Done${selected.length ? ` (${selected.length})` : ''}`} variant="primary" fullWidth onPress={() => { setOpen(false); setQuery(''); }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: spacing[3]},
  label: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1],
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3], gap: spacing[2],
  },
  triggerText: {flex: 1, fontSize: fontSize.sm},
  backdrop: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing[5], paddingBottom: 0, maxHeight: '75%',
  },
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3]},
  sheetTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3],
    paddingVertical: spacing[2], marginBottom: spacing[2],
  },
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},
  list: {flexGrow: 0},
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {flex: 1, fontSize: fontSize.sm, marginRight: spacing[2]},
  empty: {textAlign: 'center', paddingVertical: spacing[5], fontSize: fontSize.sm},
});
