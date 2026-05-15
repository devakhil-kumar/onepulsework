import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

const invalidate = (result, _err, id) => [
  {type: 'Task', id},
  {type: 'Task', id: 'LIST'},
];

export const taskApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listTasks: build.query({
      query: (params = {}) => ({url: API.TASK.LIST, params}),
      providesTags: result => {
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return [
          ...items.map(t => ({type: 'Task', id: t.id})),
          {type: 'Task', id: 'LIST'},
        ];
      },
    }),

    createTask: build.mutation({
      query: body => ({url: API.TASK.LIST, method: 'POST', data: body}),
      invalidatesTags: [{type: 'Task', id: 'LIST'}, 'Tasks'],
    }),

    updateTask: build.mutation({
      query: ({id, ...body}) => ({url: API.TASK.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: (_r, _e, {id}) => [{type: 'Task', id}, {type: 'Task', id: 'LIST'}],
    }),

    startTask: build.mutation({
      query: id => ({url: API.TASK.START(id), method: 'POST', data: {}}),
      invalidatesTags: invalidate,
    }),

    pauseTask: build.mutation({
      query: id => ({url: API.TASK.PAUSE(id), method: 'POST', data: {}}),
      invalidatesTags: invalidate,
    }),

    doneTask: build.mutation({
      query: id => ({url: API.TASK.DONE(id), method: 'POST', data: {}}),
      invalidatesTags: invalidate,
    }),

    completeTask: build.mutation({
      query: id => ({url: API.TASK.COMPLETE(id), method: 'POST', data: {}}),
      invalidatesTags: invalidate,
    }),

    reportIssueTask: build.mutation({
      query: ({id, note}) => ({url: API.TASK.REPORT_ISSUE(id), method: 'POST', data: {note}}),
      invalidatesTags: invalidate,
    }),

    restartTask: build.mutation({
      query: id => ({url: API.TASK.RESTART(id), method: 'POST', data: {}}),
      invalidatesTags: invalidate,
    }),
  }),
});

export const {
  useListTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useStartTaskMutation,
  usePauseTaskMutation,
  useDoneTaskMutation,
  useCompleteTaskMutation,
  useReportIssueTaskMutation,
  useRestartTaskMutation,
} = taskApi;
