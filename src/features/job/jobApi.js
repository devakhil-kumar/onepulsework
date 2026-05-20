import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const jobApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listJobs: build.query({
      query: (params = {}) => ({url: API.JOB.LIST, params}),
      providesTags: result => {
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return [
          ...items.map(j => ({type: 'Job', id: j.id})),
          {type: 'Job', id: 'LIST'},
        ];
      },
    }),

    getJob: build.query({
      query: id => ({url: API.JOB.DETAIL(id)}),
      providesTags: (_r, _e, id) => [{type: 'Job', id}],
    }),

    createJob: build.mutation({
      query: body => ({url: API.JOB.LIST, method: 'POST', data: body}),
      invalidatesTags: [{type: 'Job', id: 'LIST'}],
    }),

    updateJob: build.mutation({
      query: ({id, ...body}) => ({url: API.JOB.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'Job', id},
        {type: 'Job', id: 'LIST'},
      ],
    }),

    deleteJob: build.mutation({
      query: id => ({url: API.JOB.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: (_r, _e, id) => [
        {type: 'Job', id},
        {type: 'Job', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useListJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
} = jobApi;
