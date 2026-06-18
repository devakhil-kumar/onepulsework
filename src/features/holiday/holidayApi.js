import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const holidayApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // Read — any authenticated user. params: { year, state? }
    listHolidays: build.query({
      query: (params = {}) => ({url: API.HOLIDAY.LIST, params}),
      providesTags: ['Holidays'],
    }),

    // Admin (holidays.manage) — create a single holiday
    createHoliday: build.mutation({
      query: body => ({url: API.HOLIDAY.ADMIN, method: 'POST', data: body}),
      invalidatesTags: ['Holidays'],
    }),

    // Admin — import standard AU public holidays for a year. body: { year }
    seedHolidays: build.mutation({
      query: body => ({url: API.HOLIDAY.SEED, method: 'POST', data: body}),
      invalidatesTags: ['Holidays'],
    }),

    // Admin — update
    updateHoliday: build.mutation({
      query: ({id, ...body}) => ({url: API.HOLIDAY.BY_ID(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Holidays'],
    }),

    // Admin — delete
    deleteHoliday: build.mutation({
      query: id => ({url: API.HOLIDAY.BY_ID(id), method: 'DELETE'}),
      invalidatesTags: ['Holidays'],
    }),
  }),
});

export const {
  useListHolidaysQuery,
  useCreateHolidayMutation,
  useSeedHolidaysMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} = holidayApi;
