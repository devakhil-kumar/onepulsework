import React, {useState, useMemo} from 'react';
import {
  View, Modal, TouchableOpacity, FlatList, TextInput,
  StyleSheet,
} from 'react-native';
import {ChevronDown, Check, Search, X} from 'lucide-react-native';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import AppText from './AppText';

/**
 * options: Array of { value, label } or plain strings
 * If strings, value === label
 */
export default function Dropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  searchable = false,
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Normalise to {value, label}
  const normalised = useMemo(
    () => options.map(o => typeof o === 'string' ? {value: o, label: o} : o),
    [options],
  );

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return normalised;
    const q = query.toLowerCase();
    return normalised.filter(o => o.label.toLowerCase().includes(q));
  }, [normalised, searchable, query]);

  const selectedLabel = normalised.find(o => o.value === value)?.label ?? null;

  function handleSelect(opt) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <View style={styles.wrap}>
        {label ? (
          <AppText style={[styles.label, {color: colors.textSecondary}]}>{label}</AppText>
        ) : null}
        <TouchableOpacity
          onPress={() => setOpen(true)}
          activeOpacity={0.75}
          style={[
            styles.trigger,
            {
              borderColor: open ? colors.primary : colors.border,
              backgroundColor: colors.surfaceAlt,
            },
          ]}>
          <AppText
            style={[
              styles.triggerText,
              {color: selectedLabel ? colors.text : colors.textTertiary},
            ]}
            numberOfLines={1}>
            {selectedLabel ?? placeholder}
          </AppText>
          <ChevronDown
            size={16}
            color={colors.textSecondary}
            style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[styles.backdrop, {backgroundColor: colors.overlay}]}
          activeOpacity={1}
          onPress={() => { setOpen(false); setQuery(''); }}
        />
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>
              {label ?? 'Select'}
            </AppText>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
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
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <X size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={o => o.value}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => {
              const isActive = item.value === value;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  style={[
                    styles.option,
                    {borderBottomColor: colors.border},
                    isActive && {backgroundColor: colors.primaryLight},
                  ]}>
                  <AppText
                    style={[
                      styles.optionText,
                      {color: isActive ? colors.primary : colors.text},
                      isActive && {fontWeight: fontWeight.semiBold},
                    ]}
                    numberOfLines={2}>
                    {item.label}
                  </AppText>
                  {isActive && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <AppText style={[styles.empty, {color: colors.textSecondary}]}>
                No results found
              </AppText>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap:  {marginBottom: spacing[3]},
  label: {
    fontSize: 10, fontWeight: fontWeight.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    gap: spacing[2],
  },
  triggerText: {flex: 1, fontSize: fontSize.sm},

  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing[5], paddingBottom: 0,
    maxHeight: '70%',
    shadowColor: '#000', shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[3],
  },
  sheetTitle: {fontSize: fontSize.md, fontWeight: fontWeight.bold},

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},

  list: {maxHeight: 380},
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing[3], paddingHorizontal: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  optionText: {flex: 1, fontSize: fontSize.sm},
  empty: {textAlign: 'center', padding: spacing[5], fontSize: fontSize.sm},
});
