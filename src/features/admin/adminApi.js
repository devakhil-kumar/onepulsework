import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const adminApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({

    // ── Org Roles ──────────────────────────────────────────────────
    listOrgRoles: build.query({
      query: () => ({url: API.ORG_ROLE.LIST}),
      providesTags: ['OrgRoles'],
    }),
    createOrgRole: build.mutation({
      query: body => ({url: API.ORG_ROLE.LIST, method: 'POST', data: body}),
      invalidatesTags: ['OrgRoles'],
    }),
    updateOrgRole: build.mutation({
      query: ({id, ...body}) => ({url: API.ORG_ROLE.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: ['OrgRoles'],
    }),
    deleteOrgRole: build.mutation({
      query: id => ({url: API.ORG_ROLE.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: ['OrgRoles'],
    }),

    // ── Departments ────────────────────────────────────────────────
    listDepartments: build.query({
      query: () => ({url: API.DEPARTMENT.LIST}),
      providesTags: ['Departments'],
    }),
    createDepartment: build.mutation({
      query: body => ({url: API.DEPARTMENT.LIST, method: 'POST', data: body}),
      invalidatesTags: ['Departments'],
    }),
    updateDepartment: build.mutation({
      query: ({id, ...body}) => ({url: API.DEPARTMENT.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Departments'],
    }),
    deleteDepartment: build.mutation({
      query: id => ({url: API.DEPARTMENT.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: ['Departments'],
    }),

    // ── For management dashboard ───────────────────────────────────
    listEmployees: build.query({
      query: (params = {}) => ({url: API.EMPLOYEE.LIST, params}),
      providesTags: ['Employees'],
    }),
    listAnnouncements: build.query({
      query: (params = {}) => ({url: API.ANNOUNCEMENT.LIST, params}),
      providesTags: ['Announcements'],
    }),
    createAnnouncement: build.mutation({
      query: body => ({url: API.ANNOUNCEMENT.LIST, method: 'POST', data: body}),
      invalidatesTags: ['Announcements'],
    }),
    updateAnnouncement: build.mutation({
      query: ({id, ...body}) => ({url: API.ANNOUNCEMENT.BY_ID(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Announcements'],
    }),
    deleteAnnouncement: build.mutation({
      query: id => ({url: API.ANNOUNCEMENT.BY_ID(id), method: 'DELETE'}),
      invalidatesTags: ['Announcements'],
    }),
    listEvents: build.query({
      query: (params = {}) => ({url: API.EVENT.LIST, params}),
      providesTags: ['Events'],
    }),
    createEvent: build.mutation({
      query: body => ({url: API.EVENT.LIST, method: 'POST', data: body}),
      invalidatesTags: ['Events'],
    }),
    deleteEvent: build.mutation({
      query: id => ({url: API.EVENT.BY_ID(id), method: 'DELETE'}),
      invalidatesTags: ['Events'],
    }),
    listShifts: build.query({
      query: (params = {}) => ({url: API.SHIFT.LIST, params}),
      providesTags: ['Shifts'],
    }),
    getOrgInfo: build.query({
      query: () => ({url: API.ORGANISATION.ME}),
      providesTags: ['OrgInfo'],
    }),
    updateOrgInfo: build.mutation({
      query: body => ({url: API.ORGANISATION.ME, method: 'PATCH', data: body}),
      invalidatesTags: ['OrgInfo'],
    }),
    getPayrollPolicy: build.query({
      query: () => ({url: API.ORGANISATION.POLICY}),
      providesTags: ['PayrollPolicy'],
    }),
    updatePayrollPolicy: build.mutation({
      query: body => ({url: API.ORGANISATION.POLICY, method: 'PATCH', data: body}),
      invalidatesTags: ['PayrollPolicy'],
    }),

    // ── Users ──────────────────────────────────────────────────────
    listUsers: build.query({
      query: (params = {}) => ({url: API.USER.LIST, params}),
      providesTags: ['Users'],
    }),
    inviteUser: build.mutation({
      query: body => ({url: API.USER.INVITE, method: 'POST', data: body}),
      invalidatesTags: ['Users'],
    }),
    updateUser: build.mutation({
      query: ({id, ...body}) => ({url: API.USER.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useListOrgRolesQuery,
  useCreateOrgRoleMutation,
  useUpdateOrgRoleMutation,
  useDeleteOrgRoleMutation,
  useListDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useListEmployeesQuery,
  useListAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useListEventsQuery,
  useCreateEventMutation,
  useDeleteEventMutation,
  useListShiftsQuery,
  useGetOrgInfoQuery,
  useUpdateOrgInfoMutation,
  useGetPayrollPolicyQuery,
  useUpdatePayrollPolicyMutation,
  useListUsersQuery,
  useInviteUserMutation,
  useUpdateUserMutation,
} = adminApi;
