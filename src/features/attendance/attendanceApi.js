import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const attendanceApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // Returns { employee, currentAttendance, todayShift }
    getMyStatus: build.query({
      query: () => ({url: API.ATTENDANCE.ME}),
      providesTags: ['MyStatus'],
    }),

    // Manager: list all org attendance (paginated)
    getAttendanceList: build.query({
      query: (params = {}) => ({url: API.ATTENDANCE.LIST, params}),
      providesTags: ['Attendance'],
    }),

    clockIn: build.mutation({
      query: (body = {}) => ({url: API.ATTENDANCE.SELF_CLOCK_IN, method: 'POST', data: body}),
      invalidatesTags: ['MyStatus'],
    }),

    clockOut: build.mutation({
      query: (body = {}) => ({url: API.ATTENDANCE.SELF_CLOCK_OUT, method: 'POST', data: body}),
      invalidatesTags: ['MyStatus'],
    }),

    breakStart: build.mutation({
      query: (body = {}) => ({url: API.ATTENDANCE.SELF_BREAK_START, method: 'POST', data: body}),
      invalidatesTags: ['MyStatus'],
    }),

    breakEnd: build.mutation({
      query: () => ({url: API.ATTENDANCE.SELF_BREAK_END, method: 'POST', data: {}}),
      invalidatesTags: ['MyStatus'],
    }),

    // Admin: clock in an employee by employeeId
    adminClockIn: build.mutation({
      query: body => ({url: API.ATTENDANCE.CLOCK_IN, method: 'POST', data: body}),
      invalidatesTags: ['Attendance'],
    }),

    // Admin: adjust an attendance record
    adjustAttendance: build.mutation({
      query: ({id, ...body}) => ({url: API.ATTENDANCE.ADJUST(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetMyStatusQuery,
  useGetAttendanceListQuery,
  useClockInMutation,
  useClockOutMutation,
  useBreakStartMutation,
  useBreakEndMutation,
  useAdminClockInMutation,
  useAdjustAttendanceMutation,
} = attendanceApi;
