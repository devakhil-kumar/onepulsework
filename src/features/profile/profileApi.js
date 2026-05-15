import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const profileApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    getMyEmployee: build.query({
      query: () => ({url: API.EMPLOYEE.ME}),
      providesTags: ['MyEmployee'],
    }),
    updateMe: build.mutation({
      query: body => ({url: API.AUTH.ME, method: 'PATCH', data: body}),
    }),
    updateMyEmployee: build.mutation({
      query: body => ({url: API.EMPLOYEE.ME, method: 'PATCH', data: body}),
      invalidatesTags: ['MyEmployee'],
    }),
    changePassword: build.mutation({
      query: body => ({url: API.AUTH.CHANGE_PASSWORD, method: 'POST', data: body}),
    }),
  }),
});

export const {
  useGetMyEmployeeQuery,
  useUpdateMeMutation,
  useUpdateMyEmployeeMutation,
  useChangePasswordMutation,
} = profileApi;
