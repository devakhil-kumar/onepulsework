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
      query: id => ({url: API.NOTIFICATION.READ(id), method: 'POST'}),
      invalidatesTags: ['Notifications'],
    }),

    markAllRead: build.mutation({
      query: () => ({url: API.NOTIFICATION.READ_ALL, method: 'POST'}),
      invalidatesTags: ['Notifications'],
    }),

    deleteNotification: build.mutation({
      query: id => ({url: API.NOTIFICATION.DELETE(id), method: 'DELETE'}),
      invalidatesTags: ['Notifications'],
    }),

    getNotificationPreferences: build.query({
      query: () => ({url: API.NOTIFICATION.PREFERENCES}),
      transformResponse: r => r.data,
      providesTags: ['NotificationPrefs'],
    }),

    updateNotificationPreferences: build.mutation({
      query: data => ({url: API.NOTIFICATION.PREFERENCES, method: 'PATCH', data}),
      invalidatesTags: ['NotificationPrefs'],
    }),

    registerPushToken: build.mutation({
      query: data => ({url: API.NOTIFICATION.PUSH_TOKEN, method: 'POST', data}),
    }),

    unregisterPushToken: build.mutation({
      query: data => ({url: API.NOTIFICATION.PUSH_TOKEN, method: 'DELETE', data}),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} = notificationsApi;
