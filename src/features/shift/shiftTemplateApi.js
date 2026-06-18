import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const shiftTemplateApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listShiftTemplates: build.query({
      query: () => ({url: API.SHIFT_TEMPLATE.LIST}),
      providesTags: ['ShiftTemplate'],
    }),

    createShiftTemplate: build.mutation({
      query: body => ({url: API.SHIFT_TEMPLATE.LIST, method: 'POST', data: body}),
      invalidatesTags: ['ShiftTemplate'],
    }),

    updateShiftTemplate: build.mutation({
      query: ({id, ...patch}) => ({url: API.SHIFT_TEMPLATE.DETAIL(id), method: 'PATCH', data: patch}),
      invalidatesTags: ['ShiftTemplate'],
    }),

    deleteShiftTemplate: build.mutation({
      query: id => ({url: API.SHIFT_TEMPLATE.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: ['ShiftTemplate'],
    }),
  }),
});

export const {
  useListShiftTemplatesQuery,
  useCreateShiftTemplateMutation,
  useUpdateShiftTemplateMutation,
  useDeleteShiftTemplateMutation,
} = shiftTemplateApi;
