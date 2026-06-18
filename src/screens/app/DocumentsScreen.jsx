import React, {useState, useMemo} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, RefreshControl,
  Image, Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  ArrowLeft, Plus, Edit2, Trash2, Download, FileText,
  Search, X, ChevronDown, Eye, Users, Lock, Globe, UploadCloud,
} from 'lucide-react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useColors} from '@app/ThemeContext';
import {useAppSelector} from '@app/hooks';
import {selectHasPerm, selectIsAdmin} from '@features/auth/authSlice';
import {AppText, Card, Button, Badge, Spinner, EmptyState, Avatar, MultiSelectField} from '@components/ui';
import {AppHeader} from '@components/common';
import {
  useListDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  fetchDocumentBuffer,
  openDocumentInViewer,
  arrayBufferToBase64,
} from '@features/document/documentApi';
import {useListEmployeesQuery} from '@features/employee/employeeApi';
import {formatDate} from '@utils/format';

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  {code: 'contract',      name: 'Contract'},
  {code: 'certification', name: 'Certification'},
  {code: 'id',            name: 'ID'},
  {code: 'other',         name: 'Other'},
];

const CATEGORY_COLORS = {
  contract:      {bg: '#EFF6FF', text: '#1D4ED8'},
  certification: {bg: '#ECFDF5', text: '#065F46'},
  id:            {bg: '#FFF7ED', text: '#C2410C'},
  other:         {bg: '#F9FAFB', text: '#374151'},
};

const INLINEABLE_IMAGE = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);

function catName(code) {
  return CATEGORIES.find(c => c.code === code)?.name ?? code;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeLabel(mimeType) {
  if (!mimeType) return {label: 'FILE', color: '#6B7280'};
  if (mimeType === 'application/pdf')             return {label: 'PDF',  color: '#EF4444'};
  if (mimeType.startsWith('image/'))              return {label: 'IMG',  color: '#3B82F6'};
  if (mimeType.includes('word'))                  return {label: 'DOC',  color: '#2563EB'};
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return {label: 'XLS', color: '#059669'};
  if (mimeType.includes('zip'))                   return {label: 'ZIP',  color: '#7C3AED'};
  if (mimeType.includes('text'))                  return {label: 'TXT',  color: '#6B7280'};
  return {label: 'FILE', color: '#6B7280'};
}

// ── Shared sub-components ──────────────────────────────────────────────────

function FieldLabel({children}) {
  const colors = useColors();
  return <AppText style={[styles.fieldLabel, {color: colors.textSecondary}]}>{children}</AppText>;
}

function StyledInput({value, onChangeText, ...props}) {
  const colors = useColors();
  return (
    <TextInput
      style={[styles.textInput, {borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text}]}
      value={value} onChangeText={onChangeText}
      placeholderTextColor={colors.textTertiary} {...props}
    />
  );
}

// One control for visibility: pick "Everyone" or specific employees in a single
// multi-select. "Everyone" is mutually exclusive with individual picks.
const EVERYONE = '__all__';
function VisibilityPicker({employees, visibleToAll, visibleToIds, onChange}) {
  const value = visibleToAll ? [EVERYONE] : visibleToIds;
  const options = [
    {value: EVERYONE, label: '🌐  Everyone (all employees)'},
    ...employees.map(e => ({value: e.id, label: `${e.firstName} ${e.lastName}`})),
  ];
  function handle(next) {
    let result = next;
    if (next.includes(EVERYONE) && next.length > 1) {
      const justAddedAll = !value.includes(EVERYONE);
      result = justAddedAll ? [EVERYONE] : next.filter(v => v !== EVERYONE);
    }
    const all = result.length === 0 || result.includes(EVERYONE);
    onChange({visibleToAll: all, visibleToIds: all ? [] : result});
  }
  return (
    <>
      <FieldLabel>WHO CAN SEE THIS?</FieldLabel>
      <MultiSelectField value={value} onChange={handle} options={options} placeholder="Everyone, or search employees…" />
    </>
  );
}

function InlineDropdown({label, value, options, onChange}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.code === value);
  return (
    <View style={styles.dropdownWrap}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <TouchableOpacity
        style={[styles.dropdownBtn, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}
        onPress={() => setOpen(v => !v)}>
        <AppText style={[{fontSize: fontSize.sm, flex: 1}, {color: selected ? colors.text : colors.textTertiary}]}>
          {selected?.name ?? 'Select…'}
        </AppText>
        <ChevronDown size={15} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownList, {borderColor: colors.border, backgroundColor: colors.surface}]}>
          {options.map(o => (
            <TouchableOpacity key={o.code} onPress={() => {onChange(o.code); setOpen(false);}}
              style={[styles.dropdownOption, {borderBottomColor: colors.border}]}>
              <AppText style={{fontSize: fontSize.sm, color: o.code === value ? colors.primary : colors.text,
                fontWeight: o.code === value ? fontWeight.semiBold : fontWeight.regular}}>
                {o.name}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Image viewer modal ─────────────────────────────────────────────────────

function ImageViewerModal({visible, uri, title, onClose}) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.imgOverlay, {backgroundColor: 'rgba(0,0,0,0.92)'}]}>
        <TouchableOpacity
          style={[styles.imgCloseBtn, {top: insets.top + spacing[3]}]}
          onPress={onClose}
          hitSlop={{top: 12, left: 12, bottom: 12, right: 12}}>
          <View style={styles.imgCloseBtnInner}>
            <X size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        {uri && (
          <Image
            source={{uri}}
            style={styles.imgFull}
            resizeMode="contain"
          />
        )}
        <AppText style={[styles.imgTitle, {paddingBottom: insets.bottom + spacing[3]}]} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </Modal>
  );
}

// ── Upload modal ───────────────────────────────────────────────────────────

const IMG_PICKER_OPTS = {mediaType: 'photo', quality: 0.85, maxWidth: 2200, maxHeight: 2200};

function stripExt(name) {
  if (!name) return '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function UploadModal({onClose, onSave, saving, employees}) {
  const colors = useColors();
  const [title,        setTitle]       = useState('');
  const [description,  setDesc]        = useState('');
  const [category,     setCategory]    = useState('other');
  const [vis,          setVis]         = useState({visibleToAll: true, visibleToIds: []});
  const [file,         setFile]        = useState(null); // {uri, name, type, size}

  // Pick the chosen file and pre-fill the title from its name if still empty
  function applyFile(f) {
    setFile(f);
    setTitle(t => (t.trim() ? t : stripExt(f.name)));
  }

  function pickFromGallery() {
    launchImageLibrary(IMG_PICKER_OPTS, res => {
      if (res.didCancel || res.errorCode) return;
      const a = res.assets?.[0];
      if (a?.uri) applyFile({uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.type || 'image/jpeg', size: a.fileSize});
    });
  }

  function takePhoto() {
    launchCamera(IMG_PICKER_OPTS, res => {
      if (res.didCancel || res.errorCode) {
        if (res.errorCode === 'camera_unavailable' || res.errorCode === 'permission') {
          Alert.alert('Camera unavailable', 'Please allow camera access to take a photo.');
        }
        return;
      }
      const a = res.assets?.[0];
      if (a?.uri) applyFile({uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.type || 'image/jpeg', size: a.fileSize});
    });
  }

  async function pickDocument() {
    let picker;
    try {
      picker = require('@react-native-documents/picker');
    } catch {
      Alert.alert('Update needed', 'Picking PDF / document files needs the latest app build. Photos work now — rebuild the app to enable file picking.');
      return;
    }
    try {
      const allowed = [
        picker.types.pdf, picker.types.images, picker.types.doc, picker.types.docx,
        picker.types.plainText, picker.types.xls, picker.types.xlsx, picker.types.csv,
      ].filter(Boolean);
      const results = await picker.pick({type: allowed, allowMultiSelection: false});
      const res = Array.isArray(results) ? results[0] : results;
      if (res?.uri) applyFile({uri: res.uri, name: res.name || 'document', type: res.type || 'application/octet-stream', size: res.size});
    } catch (err) {
      if (picker.isErrorWithCode?.(err) && err.code === picker.errorCodes?.OPERATION_CANCELED) return;
      const m = String(err?.message ?? '');
      if (/native module|not available|TurboModule|RNDocumentPicker|getEnforcing/i.test(m)) {
        Alert.alert('Update needed', 'PDF / document picking needs the latest app build. Photos work now — rebuild the app to enable file picking.');
      } else {
        Alert.alert('Error', 'Could not pick the file. Please try again.');
      }
    }
  }

  function handlePickFile() {
    Alert.alert('Add a file', 'Choose where to pick from', [
      {text: 'Photo Library', onPress: pickFromGallery},
      {text: 'Take Photo',    onPress: takePhoto},
      {text: 'PDF / Document', onPress: pickDocument},
      {text: 'Cancel', style: 'cancel'},
    ]);
  }

  function handleSave() {
    if (!file)         { Alert.alert('Required', 'Please choose a file to upload.'); return; }
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    onSave({
      file,
      title:        title.trim(),
      description:  description.trim(),
      category,
      visibleToAll: vis.visibleToAll,
      visibleToIds: vis.visibleToIds,
    });
  }

  const isImageFile = file?.type?.startsWith('image/');

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>Upload Document</AppText>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* File picker */}
            {!file ? (
              <TouchableOpacity
                onPress={handlePickFile}
                style={[styles.filePicker, {borderColor: colors.primary, backgroundColor: colors.primaryLight}]}>
                <UploadCloud size={22} color={colors.primary} />
                <View style={{flex: 1}}>
                  <AppText style={[styles.filePickerTitle, {color: colors.primary}]}>Choose a file</AppText>
                  <AppText style={[styles.filePickerSub, {color: colors.primary}]}>
                    Photo, PDF or document
                  </AppText>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.selectedFile, {borderColor: colors.border, backgroundColor: colors.surfaceAlt}]}>
                {isImageFile ? (
                  <Image source={{uri: file.uri}} style={styles.selectedThumb} />
                ) : (
                  <View style={[styles.selectedThumb, styles.selectedThumbDoc, {backgroundColor: getMimeLabel(file.type).color + '18'}]}>
                    <AppText style={{fontSize: 11, fontWeight: fontWeight.bold, color: getMimeLabel(file.type).color}}>
                      {getMimeLabel(file.type).label}
                    </AppText>
                  </View>
                )}
                <View style={{flex: 1, minWidth: 0}}>
                  <AppText style={[styles.selectedName, {color: colors.text}]} numberOfLines={1}>{file.name}</AppText>
                  <AppText style={[styles.selectedSize, {color: colors.textSecondary}]}>
                    {formatSize(file.size)} · Tap to change
                  </AppText>
                </View>
                <TouchableOpacity onPress={handlePickFile} hitSlop={{top: 8, left: 8, bottom: 8, right: 8}}>
                  <AppText style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semiBold}}>Change</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFile(null)} hitSlop={{top: 8, left: 8, bottom: 8, right: 8}}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <FieldLabel>TITLE *</FieldLabel>
            <StyledInput value={title} onChangeText={setTitle} placeholder="e.g. Employment Contract 2025" />

            <FieldLabel>DESCRIPTION</FieldLabel>
            <StyledInput value={description} onChangeText={setDesc}
              placeholder="Optional brief summary…" multiline style={{height: 70, textAlignVertical: 'top'}} />

            <InlineDropdown label="CATEGORY" value={category}
              options={CATEGORIES.map(c => ({code: c.code, name: c.name}))} onChange={setCategory} />

            <VisibilityPicker employees={employees} visibleToAll={vis.visibleToAll} visibleToIds={vis.visibleToIds} onChange={setVis} />

            <Button label="Upload Document" variant="primary" fullWidth loading={saving}
              onPress={handleSave} style={{marginTop: spacing[4], marginBottom: spacing[8]}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────

function EditModal({doc, onClose, onSave, saving, employees}) {
  const colors = useColors();
  const [title,       setTitle]      = useState(doc?.title ?? '');
  const [description, setDesc]       = useState(doc?.description ?? '');
  const [category,    setCategory]   = useState(doc?.category ?? 'other');
  const [vis,         setVis]        = useState({
    visibleToAll: doc?.visibleToAll !== false,
    visibleToIds: doc?.visibleToIds ?? [],
  });

  function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    onSave({
      title:        title.trim(),
      description:  description.trim() || '',
      category,
      visibleToAll: vis.visibleToAll,
      visibleToIds: vis.visibleToIds,
    });
  }

  if (!doc) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={styles.sheetHeader}>
            <AppText style={[styles.sheetTitle, {color: colors.text}]}>Edit Document</AppText>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* File info (read-only) */}
            <View style={[styles.fileInfo, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
              <FileText size={16} color={colors.textSecondary} />
              <AppText style={[styles.fileInfoText, {color: colors.textSecondary}]} numberOfLines={1}>
                {doc.fileName}  ·  {formatSize(doc.sizeBytes)}
              </AppText>
            </View>

            <FieldLabel>TITLE *</FieldLabel>
            <StyledInput value={title} onChangeText={setTitle} placeholder="Document title" />

            <FieldLabel>DESCRIPTION</FieldLabel>
            <StyledInput value={description} onChangeText={setDesc}
              placeholder="Optional brief summary…" multiline style={{height: 70, textAlignVertical: 'top'}} />

            <InlineDropdown label="CATEGORY" value={category}
              options={CATEGORIES.map(c => ({code: c.code, name: c.name}))} onChange={setCategory} />

            <VisibilityPicker employees={employees} visibleToAll={vis.visibleToAll} visibleToIds={vis.visibleToIds} onChange={setVis} />

            <Button label={saving ? 'Saving…' : 'Save Changes'} variant="primary" fullWidth
              loading={saving} onPress={handleSave}
              style={{marginTop: spacing[4], marginBottom: spacing[8]}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Document card ──────────────────────────────────────────────────────────

function DocCard({doc, canManage, onEdit, onDelete, onView}) {
  const colors = useColors();
  const {label: mimeLabel, color: mimeColor} = getMimeLabel(doc.mimeType);
  const catStyle = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.other;
  const canViewInline = INLINEABLE_IMAGE.has(doc.mimeType);

  return (
    <Card style={styles.docCard}>
      {/* MIME type icon */}
      <View style={[styles.mimeIcon, {backgroundColor: mimeColor + '18'}]}>
        <AppText style={[styles.mimeLabel, {color: mimeColor}]}>{mimeLabel}</AppText>
      </View>

      <View style={styles.docBody}>
        <View style={styles.docTop}>
          <AppText style={[styles.docTitle, {color: colors.text}]} numberOfLines={2}>
            {doc.title}
          </AppText>
          <View style={[styles.catBadge, {backgroundColor: catStyle.bg}]}>
            <AppText style={[styles.catText, {color: catStyle.text}]}>{catName(doc.category)}</AppText>
          </View>
        </View>

        {doc.description ? (
          <AppText style={[styles.docDesc, {color: colors.textSecondary}]} numberOfLines={2}>
            {doc.description}
          </AppText>
        ) : null}

        <AppText style={[styles.docFile, {color: colors.textTertiary}]} numberOfLines={1}>
          {doc.fileName}  ·  {formatSize(doc.sizeBytes)}
        </AppText>

        <View style={styles.docMeta}>
          {/* Visibility */}
          <View style={styles.visRow}>
            {doc.visibleToAll !== false ? (
              <>
                <Globe size={11} color={colors.success} />
                <AppText style={[styles.metaText, {color: colors.success}]}>All employees</AppText>
              </>
            ) : (
              <>
                <Lock size={11} color={colors.warning} />
                <AppText style={[styles.metaText, {color: colors.warning}]}>
                  {doc.visibleToIds?.length ?? 0} employees
                </AppText>
              </>
            )}
          </View>

          <AppText style={[styles.metaDot, {color: colors.textTertiary}]}>·</AppText>
          <AppText style={[styles.metaText, {color: colors.textTertiary}]} numberOfLines={1}>
            {doc.uploadedByName ?? 'Unknown'}
          </AppText>
          <AppText style={[styles.metaDot, {color: colors.textTertiary}]}>·</AppText>
          <AppText style={[styles.metaText, {color: colors.textTertiary}]}>
            {formatDate(doc.createdAt)}
          </AppText>
        </View>

        {/* Action row */}
        <View style={styles.docActions}>
          {canViewInline && (
            <TouchableOpacity onPress={() => onView(doc)} style={[styles.actionBtn, {backgroundColor: colors.infoLight ?? '#EFF6FF', borderColor: colors.info + '40'}]}>
              <Eye size={13} color={colors.info} />
              <AppText style={[styles.actionBtnText, {color: colors.info}]}>View</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onView(doc)} style={[styles.actionBtn, {backgroundColor: colors.primaryLight, borderColor: colors.primary + '40'}]}>
            <Download size={13} color={colors.primary} />
            <AppText style={[styles.actionBtnText, {color: colors.primary}]}>
              {canViewInline ? 'Open' : 'Download'}
            </AppText>
          </TouchableOpacity>
          {canManage && (
            <>
              <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, {backgroundColor: colors.surfaceAlt, borderColor: colors.border}]}>
                <Edit2 size={13} color={colors.text} />
                <AppText style={[styles.actionBtnText, {color: colors.text}]}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, {backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}]}>
                <Trash2 size={13} color={colors.error} />
                <AppText style={[styles.actionBtnText, {color: colors.error}]}>Delete</AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const isAdmin    = useAppSelector(selectIsAdmin);
  const canManage  = useAppSelector(selectHasPerm('documents.manage'));

  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('all');
  const [showUpload,  setShowUpload]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [imageViewer, setImageViewer] = useState(null); // {uri, title}
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingDocId,setLoadingDocId]= useState(null);

  const {data, isLoading, refetch}    = useListDocumentsQuery({pageSize: 100});
  const {data: empData}               = useListEmployeesQuery({pageSize: 500}, {skip: !(isAdmin || canManage)});

  const [uploadDoc,  {isLoading: uploading}] = useUploadDocumentMutation();
  const [updateDoc,  {isLoading: updating}]  = useUpdateDocumentMutation();
  const [deleteDoc,  {isLoading: deleting}]  = useDeleteDocumentMutation();

  const documents  = useMemo(() => Array.isArray(data) ? data : (data?.items ?? []), [data]);
  const employees  = useMemo(() => Array.isArray(empData) ? empData : (empData?.items ?? []), [empData]);

  const CAT_FILTERS = [{code: 'all', name: 'All'}, ...CATEGORIES];

  const filtered = useMemo(() => {
    let list = documents;
    if (catFilter !== 'all') list = list.filter(d => d.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title?.toLowerCase().includes(q) ||
        d.fileName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [documents, catFilter, search]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleView(doc) {
    const isImage = INLINEABLE_IMAGE.has(doc.mimeType);
    setLoadingDocId(doc.id);
    try {
      if (isImage) {
        // Inline preview: fetch → base64 data URI
        const buffer = await fetchDocumentBuffer(doc.id, true);
        const uri = `data:${doc.mimeType};base64,${arrayBufferToBase64(buffer)}`;
        setImageViewer({uri, title: doc.title});
      } else {
        // PDFs and other files: download and open in the device's native viewer
        await openDocumentInViewer(doc);
      }
    } catch (e) {
      const m = String(e?.message ?? '');
      if (/native module|not available|TurboModule|RNBlobUtil|getEnforcing/i.test(m)) {
        Alert.alert('Update needed', 'Opening files needs the latest app build. Please rebuild the app, then try again.');
      } else {
        Alert.alert('Could not open', isImage ? 'Could not load this image.' : 'This file could not be opened on your device.');
      }
    } finally {
      setLoadingDocId(null);
    }
  }

  async function handleUpload(payload) {
    try {
      await uploadDoc(payload).unwrap();
      setShowUpload(false);
    } catch (e) {
      const msg = e?.data?.error?.message ?? (typeof e?.data === 'string' ? e.data : null) ?? 'Could not upload document. Please try again.';
      Alert.alert('Upload Failed', msg);
    }
  }

  async function handleUpdate(patch) {
    try {
      await updateDoc({id: editTarget.id, ...patch}).unwrap();
      setEditTarget(null);
    } catch (e) {
      Alert.alert('Error', e?.data?.error?.message ?? 'Could not update document.');
    }
  }

  function confirmDelete(doc) {
    Alert.alert(
      `Delete "${doc.title}"?`,
      'This will permanently remove the document and its file.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc.id).unwrap(); }
          catch (e) { Alert.alert('Error', e?.data?.error?.message ?? 'Could not delete.'); }
        }},
      ],
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Documents"
        rightAction={(isAdmin || canManage) && (
          <TouchableOpacity
            onPress={() => setShowUpload(true)}
            style={[styles.addBtn, {backgroundColor: colors.primary}]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      />

      {/* Search */}
      <View style={[styles.searchBar, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, {color: colors.text}]}
          value={search} onChangeText={setSearch}
          placeholder="Search title, file, description…"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none" autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter tabs — fixed height wrapper so it never collapses */}
      <View style={[styles.catFilterBarWrap, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catFilterContent}>
          {CAT_FILTERS.map(c => {
            const active = catFilter === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => setCatFilter(c.code)}
                style={[styles.catFilterChip, {
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderColor: active ? colors.primary : colors.border,
                }]}>
                <AppText style={[styles.catFilterText, {color: active ? '#fff' : colors.textSecondary}]}>
                  {c.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content area — flex:1 so it always fills remaining space */}
      <View style={{flex: 1}}>
        {isLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <EmptyState
              icon={<FileText size={44} color={colors.primary} />}
              title={search || catFilter !== 'all' ? 'No matching documents' : 'No documents yet'}
              description={
                search || catFilter !== 'all'
                  ? 'Try a different search or category filter.'
                  : (isAdmin || canManage)
                    ? 'Upload contracts, certifications and other files.'
                    : 'No documents have been shared with you yet.'
              }
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={d => d.id}
            contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing[6]}]}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({item}) => (
              <DocCard
                doc={item}
                canManage={isAdmin || canManage}
                onEdit={() => setEditTarget(item)}
                onDelete={() => confirmDelete(item)}
                onView={() => handleView(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{height: spacing[3]}} />}
          />
        )}
      </View>

      {/* Loading indicator for image fetch — bottom respects Android nav bar */}
      {loadingDocId && (
        <View style={[styles.loadingOverlay, {bottom: insets.bottom}]}>
          <Spinner />
          <AppText style={{color: '#fff', marginTop: spacing[2], fontSize: fontSize.sm}}>
            Loading…
          </AppText>
        </View>
      )}

      {/* Modals */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSave={handleUpload}
          saving={uploading}
          employees={employees}
        />
      )}

      {editTarget && (
        <EditModal
          doc={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          saving={updating}
          employees={employees}
        />
      )}

      <ImageViewerModal
        visible={!!imageViewer}
        uri={imageViewer?.uri}
        title={imageViewer?.title}
        onClose={() => setImageViewer(null)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

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

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    gap: spacing[2], borderBottomWidth: 1,
  },
  searchInput: {flex: 1, fontSize: fontSize.sm, padding: 0},

  catFilterBarWrap: {height: 48, borderBottomWidth: 1},
  catFilterContent: {paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], alignItems: 'center'},
  catFilterChip:    {paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, borderWidth: 1},
  catFilterText:    {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},

  list: {padding: spacing[4]},

  // Document card
  docCard: {padding: spacing[4], flexDirection: 'row', gap: spacing[3]},
  mimeIcon: {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  mimeLabel:{fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.5},
  docBody:  {flex: 1, minWidth: 0, gap: spacing[1]},
  docTop:   {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2]},
  docTitle: {flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold},
  catBadge: {paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full},
  catText:  {fontSize: 10, fontWeight: fontWeight.bold},
  docDesc:  {fontSize: fontSize.xs, lineHeight: 16},
  docFile:  {fontSize: fontSize.xs},
  docMeta:  {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4},
  visRow:   {flexDirection: 'row', alignItems: 'center', gap: 3},
  metaText: {fontSize: 10},
  metaDot:  {fontSize: 10},
  docActions:{flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2]},
  actionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.md, borderWidth: 1},
  actionBtnText:{fontSize: 11, fontWeight: fontWeight.semiBold},

  // Image viewer
  imgOverlay:       {flex: 1, alignItems: 'center', justifyContent: 'center'},
  imgCloseBtn:      {position: 'absolute', right: spacing[4], zIndex: 10},
  imgCloseBtnInner: {width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center'},
  imgFull:          {width: '100%', height: '75%'},
  imgTitle:         {color: '#fff', fontSize: fontSize.sm, marginTop: spacing[3], paddingHorizontal: spacing[4], textAlign: 'center'},

  // Loading overlay — bottom is overridden inline with insets.bottom so Android nav buttons stay visible
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal sheet
  overlay:    {flex: 1, justifyContent: 'flex-end'},
  sheet:      {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], paddingBottom: 0, maxHeight: '92%'},
  sheetHeader:{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4]},
  sheetTitle: {fontSize: fontSize.lg, fontWeight: fontWeight.bold},

  // File picker button
  filePicker:     {flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: spacing[4]},
  filePickerTitle:{fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  filePickerSub:  {fontSize: fontSize.xs, marginTop: 2},

  // Selected file row
  selectedFile:     {flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: radius.md, borderWidth: 1, marginBottom: spacing[4]},
  selectedThumb:    {width: 44, height: 44, borderRadius: radius.sm, flexShrink: 0},
  selectedThumbDoc: {alignItems: 'center', justifyContent: 'center'},
  selectedName:     {fontSize: fontSize.sm, fontWeight: fontWeight.semiBold},
  selectedSize:     {fontSize: fontSize.xs, marginTop: 2},

  // File info row (edit modal)
  fileInfo:     {flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.md, borderWidth: 1, marginBottom: spacing[3]},
  fileInfoText: {fontSize: fontSize.sm, flex: 1},

  // Inputs
  fieldLabel: {fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing[1], marginTop: spacing[3]},
  textInput:  {borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm},

  // Dropdown
  dropdownWrap:   {marginTop: spacing[3]},
  dropdownBtn:    {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3]},
  dropdownList:   {borderWidth: 1, borderRadius: radius.md, marginTop: spacing[1], overflow: 'hidden'},
  dropdownOption: {paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1},

  // Employee multi-select
  empMulti:        {borderWidth: 1, borderRadius: radius.md, marginTop: spacing[1], overflow: 'hidden'},
  empMultiSearch:  {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1},
  empMultiInput:   {flex: 1, fontSize: fontSize.sm, padding: 0},
  empMultiList:    {maxHeight: 200},
  empMultiRow:     {flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1},
  empMultiEmpty:   {textAlign: 'center', padding: spacing[4], fontSize: fontSize.sm},
  empMultiSummary: {borderTopWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2]},
  empMultiSummaryText:{fontSize: fontSize.xs, fontWeight: fontWeight.semiBold},
  checkbox:        {width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
});
