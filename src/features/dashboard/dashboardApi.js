import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const dashboardApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    getMyShifts: build.query({
      query: (params = {}) => ({url: API.SHIFT.MY, params}),
      providesTags: ['Shifts'],
    }),

    getMyTasks: build.query({
      query: (params = {}) => ({url: API.TASK.MY, params}),
      providesTags: ['Tasks'],
    }),
  }),
});

export const {useGetMyShiftsQuery, useGetMyTasksQuery} = dashboardApi;
