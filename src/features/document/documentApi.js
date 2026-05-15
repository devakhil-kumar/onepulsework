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
