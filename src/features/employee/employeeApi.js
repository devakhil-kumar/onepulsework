import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const employeeApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    listEmployees: build.query({
      query: (params = {}) => ({url: API.EMPLOYEE.LIST, params}),
      providesTags: ['Employees'],
    }),
    getEmployee: build.query({
      query: id => ({url: API.EMPLOYEE.DETAIL(id)}),
      providesTags: (_r, _e, id) => [{type: 'Employee', id}],
    }),
    createEmployee: build.mutation({
      query: body => ({url: API.EMPLOYEE.LIST, method: 'POST', data: body}),
      invalidatesTags: ['Employees'],
    }),
    updateEmployee: build.mutation({
      query: ({id, ...body}) => ({url: API.EMPLOYEE.DETAIL(id), method: 'PATCH', data: body}),
      invalidatesTags: (_r, _e, {id}) => ['Employees', {type: 'Employee', id}],
    }),
    deleteEmployee: build.mutation({
      query: id => ({url: API.EMPLOYEE.DETAIL(id), method: 'DELETE'}),
      invalidatesTags: ['Employees'],
    }),
  }),
});

export const {
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;
