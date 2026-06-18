import {Platform} from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';
import client from '@api/client';

export const documentApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listDocuments: build.query({
      query: (params = {}) => ({url: API.DOCUMENT.LIST, params}),
      providesTags: result => {
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return [...items.map(d => ({type: 'Document', id: d.id})), {type: 'Document', id: 'LIST'}];
      },
    }),

    // Upload uses multipart/form-data — handled by our axios client
    uploadDocument: build.mutation({
      queryFn: async ({file, title, category, description, visibleToAll = true, visibleToIds = []}) => {
        try {
          const fd = new FormData();
          fd.append('file', file); // file must be {uri, name, type}
          fd.append('title', title);
          if (category)    fd.append('category', category);
          if (description) fd.append('description', description);
          fd.append('visibleToAll', String(visibleToAll));
          fd.append('visibleToIds', JSON.stringify(visibleToIds));
          const res = await client.post(API.DOCUMENT.LIST, fd, {
            headers: {'Content-Type': 'multipart/form-data'},
          });
          return {data: res.data.data ?? res.data};
        } catch (err) {
          return {error: {status: err.response?.status, data: err.response?.data?.message ?? err.message}};
        }
      },
      invalidatesTags: [{type: 'Document', id: 'LIST'}],
    }),

    updateDocument: build.mutation({
      query: ({id, ...body}) => ({url: API.DOCUMENT.BY_ID(id), method: 'PATCH', data: body}),
      invalidatesTags: (_r, _e, {id}) => [{type: 'Document', id}, {type: 'Document', id: 'LIST'}],
    }),

    deleteDocument: build.mutation({
      query: id => ({url: API.DOCUMENT.BY_ID(id), method: 'DELETE'}),
      invalidatesTags: [{type: 'Document', id: 'LIST'}],
    }),
  }),
});

export const {
  useListDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
} = documentApi;

// Helper: fetch document as arraybuffer (for inline viewing of images)
export async function fetchDocumentBuffer(docId, inline = false) {
  const res = await client.get(API.DOCUMENT.DOWNLOAD(docId, inline), {
    responseType: 'arraybuffer',
  });
  return res.data;
}

// ── base64 (Hermes has no global btoa) ─────────────────────────────────────
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : '=';
  }
  return out;
}

/**
 * Download a document (authenticated) to a temp file and open it in the
 * device's native viewer — works for images, PDFs, and any other file type.
 */
export async function openDocumentInViewer(doc) {
  const buffer = await fetchDocumentBuffer(doc.id, false);
  const b64 = arrayBufferToBase64(buffer);
  const safeName = (doc.fileName || `document_${doc.id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${RNBlobUtil.fs.dirs.CacheDir}/${safeName}`;
  await RNBlobUtil.fs.writeFile(path, b64, 'base64');
  const mime = doc.mimeType || 'application/octet-stream';
  if (Platform.OS === 'ios') {
    await RNBlobUtil.ios.openDocument(path);
  } else {
    await RNBlobUtil.android.actionViewIntent(path, mime);
  }
}
