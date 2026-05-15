import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const notificationsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    getNotifications: build.query({
      query: (params = {}) => ({url: API.NOTIFICATION.LIST, params}),
      providesTags: ['Notifications'],
    }),

    markRead: build.mutation({
      query: id => ({url: API.NOTIFICATION.READ(id), method: 'PATCH'}),
      invalidatesTags: ['Notifications'],
    }),

    markAllRead: build.mutation({
      query: () => ({url: API.NOTIFICATION.READ_ALL, method: 'PATCH'}),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
