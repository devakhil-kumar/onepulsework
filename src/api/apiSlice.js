import {createApi} from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'MyStatus', 'Attendance', 'LeaveBalance', 'Leave',
    'Shifts', 'Task', 'Tasks', 'Notifications',
    'OrgRoles', 'Departments', 'Employees', 'Employee', 'Announcements', 'Events', 'Document',
    'OrgInfo', 'MyEmployee', 'PayrollPolicy', 'Payslip', 'Users', 'Project',
  ],
  endpoints: () => ({}), // each feature file injects its own endpoints
});
