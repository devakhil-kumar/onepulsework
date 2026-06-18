import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';
import client from '@api/client';

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

    listSessions: build.query({
      query: currentToken => ({
        url: API.AUTH.SESSIONS,
        params: currentToken ? {current: currentToken} : undefined,
      }),
      providesTags: ['Sessions'],
    }),
    revokeOtherSessions: build.mutation({
      query: refreshToken => ({
        url: API.AUTH.SESSIONS_REVOKE_OTHERS,
        method: 'POST',
        data: {refreshToken},
      }),
      invalidatesTags: ['Sessions'],
    }),

    // Uses queryFn + native fetch so React Native sets the multipart boundary automatically.
    // Axios's global Content-Type:application/json header breaks FormData uploads.
    uploadAvatar: build.mutation({
      queryFn: async (asset, api) => {
        try {
          const form = new FormData();
          form.append('avatar', {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'avatar.jpg',
          });

          const token = api.getState().auth.accessToken;
          const baseUrl = client.defaults.baseURL;

          const res = await fetch(`${baseUrl}${API.AUTH.AVATAR}`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`},
            body: form,
          });

          const json = await res.json();
          if (!res.ok) {
            return {
              error: {
                status: res.status,
                data: json?.error?.message ?? 'Upload failed',
              },
            };
          }
          return {data: json.data ?? json};
        } catch (err) {
          return {error: {status: 'FETCH_ERROR', data: err.message}};
        }
      },
    }),
  }),
});

export const {
  useGetMyEmployeeQuery,
  useUpdateMeMutation,
  useUpdateMyEmployeeMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useListSessionsQuery,
  useRevokeOtherSessionsMutation,
} = profileApi;
