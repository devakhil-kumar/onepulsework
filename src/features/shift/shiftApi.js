import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const shiftApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // Backend role-scopes this: EMPLOYEE sees only their own shifts, managers see all.
    listShifts: build.query({
      query: (params = {}) => ({url: API.SHIFT.LIST, params}),
      providesTags: ['Shifts'],
    }),

    getShift: build.query({
      query: id => ({url: API.SHIFT.DETAIL(id)}),
      providesTags: (r, e, id) => [{type: 'Shifts', id}],
    }),

    // Manual: one employee, one shift (optionally recurring).
    createShift: build.mutation({
      query: body => ({url: API.SHIFT.LIST, method: 'POST', data: body}),
      invalidatesTags: ['Shifts'],
    }),

    // Assign team: many employees at once (optionally recurring).
    bulkAssignShifts: build.mutation({
      query: body => ({url: API.SHIFT.BULK, method: 'POST', data: body}),
      invalidatesTags: ['Shifts'],
    }),

    // Auto-assign: fair-rotation across a date range. dryRun previews only.
    autoAssignShifts: build.mutation({
      query: body => ({url: API.SHIFT.AUTO_ASSIGN, method: 'POST', data: body}),
      invalidatesTags: (r, e, arg) => (arg?.dryRun ? [] : ['Shifts']),
    }),

    updateShift: build.mutation({
      query: ({id, ...patch}) => ({url: API.SHIFT.DETAIL(id), method: 'PATCH', data: patch}),
      invalidatesTags: ['Shifts'],
    }),

    deleteShift: build.mutation({
      query: id => ({url: API.SHIFT.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: ['Shifts'],
    }),
  }),
});

export const {
  useListShiftsQuery,
  useGetShiftQuery,
  useCreateShiftMutation,
  useBulkAssignShiftsMutation,
  useAutoAssignShiftsMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
} = shiftApi;
