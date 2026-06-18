import {createApi} from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'MyStatus', 'Attendance', 'LeaveBalance', 'Leave',
    'Shifts', 'ShiftTemplate', 'Task', 'Tasks', 'Notifications', 'NotificationPrefs',
    'OrgRoles', 'Departments', 'Employees', 'Employee', 'Announcements', 'Events', 'Document',
    'OrgInfo', 'MyEmployee', 'PayrollPolicy', 'Payslip', 'Users', 'Project', 'Job',
    'Holidays', 'Sessions',
  ],
  endpoints: () => ({}), // each feature file injects its own endpoints
});
