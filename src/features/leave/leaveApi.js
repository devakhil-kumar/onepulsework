import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const leaveApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // employeeId comes from user.employeeId in Redux state
    getLeaveBalance: build.query({
      query: employeeId => ({url: API.LEAVE.BALANCE(employeeId)}),
      providesTags: ['LeaveBalance'],
    }),

    // Backend filters by role — employees see only their own requests
    getMyLeave: build.query({
      query: (params = {}) => ({url: API.LEAVE.LIST, params}),
      providesTags: ['Leave'],
    }),

    applyLeave: build.mutation({
      query: body => ({url: API.LEAVE.REQUEST, method: 'POST', data: body}),
      invalidatesTags: ['Leave', 'LeaveBalance'],
    }),

    reviewLeave: build.mutation({
      query: ({id, ...body}) => ({url: API.LEAVE.REVIEW(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Leave'],
    }),

    // Manager/admin: list leave for any employee
    listLeave: build.query({
      query: (params = {}) => ({url: API.LEAVE.LIST, params}),
      providesTags: ['Leave'],
    }),
  }),
});

export const {
  useGetLeaveBalanceQuery,
  useGetMyLeaveQuery,
  useApplyLeaveMutation,
  useReviewLeaveMutation,
  useListLeaveQuery,
} = leaveApi;
