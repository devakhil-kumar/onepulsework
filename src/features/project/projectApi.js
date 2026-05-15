import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const projectApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listProjects: build.query({
      query: (params = {}) => ({url: API.PROJECT.LIST, params}),
      providesTags: result => {
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return [...items.map(p => ({type: 'Project', id: p.id})), {type: 'Project', id: 'LIST'}];
      },
    }),
    createProject: build.mutation({
      query: body => ({url: API.PROJECT.LIST, method: 'POST', data: body}),
      invalidatesTags: [{type: 'Project', id: 'LIST'}],
    }),
    updateProject: build.mutation({
      query: ({id, ...body}) => ({url: API.PROJECT.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: (_r, _e, {id}) => [{type: 'Project', id}, {type: 'Project', id: 'LIST'}],
    }),
    deleteProject: build.mutation({
      query: id => ({url: API.PROJECT.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: [{type: 'Project', id: 'LIST'}],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectApi;
