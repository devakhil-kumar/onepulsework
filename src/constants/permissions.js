// Mirror of cyberpulse-au-web/frontend/src/constants/permissions.js
// Keep in sync with backend/src/utils/permissions.js

export const PERMISSIONS = Object.freeze({
  EMPLOYEES_VIEW:   'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT:   'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',

  SHIFTS_VIEW:   'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',

  ATTENDANCE_VIEW:   'attendance.view',
  ATTENDANCE_ADJUST: 'attendance.adjust',

  LEAVE_VIEW:    'leave.view',
  LEAVE_APPROVE: 'leave.approve',

  PAYROLL_VIEW:     'payroll.view',
  PAYROLL_MANAGE:   'payroll.manage',
  PAYROLL_FINALISE: 'payroll.finalise',

  DOCUMENTS_VIEW:   'documents.view',
  DOCUMENTS_MANAGE: 'documents.manage',

  PROJECTS_VIEW:     'projects.view',
  PROJECTS_VIEW_ALL: 'projects.viewAll',
  PROJECTS_MANAGE:   'projects.manage',

  JOBS_VIEW:   'jobs.view',
  JOBS_MANAGE: 'jobs.manage',

  ANNOUNCEMENTS_VIEW:   'announcements.view',
  ANNOUNCEMENTS_MANAGE: 'announcements.manage',
  EVENTS_VIEW:          'events.view',

  REPORTS_VIEW: 'reports.view',

  NOTIFICATIONS_VIEW_ALL:    'notifications.view_all',
  NOTIFICATIONS_CLOCK:       'notifications.clock',
  NOTIFICATIONS_LEAVE_APPLY: 'notifications.leave_apply',

  ROLES_MANAGE:       'roles.manage',
  DEPARTMENTS_MANAGE: 'departments.manage',
});

export const PERMISSION_GROUPS = [
  {label: 'Employees',     keys: ['employees.view', 'employees.create', 'employees.edit', 'employees.delete']},
  {label: 'Shifts',        keys: ['shifts.view', 'shifts.manage']},
  {label: 'Attendance',    keys: ['attendance.view', 'attendance.adjust']},
  {label: 'Leave',         keys: ['leave.view', 'leave.approve']},
  {label: 'Payroll',       keys: ['payroll.view', 'payroll.manage', 'payroll.finalise']},
  {label: 'Documents',     keys: ['documents.view', 'documents.manage']},
  {label: 'Tasks',         keys: ['tasks.view', 'tasks.manage']},
  {label: 'Projects',      keys: ['projects.view', 'projects.viewAll', 'projects.manage']},
  {label: 'Jobs',          keys: ['jobs.view', 'jobs.manage']},
  {label: 'Announcements', keys: ['announcements.view', 'announcements.manage']},
  {label: 'Events',        keys: ['events.view']},
  {label: 'Reports',       keys: ['reports.view']},
  {label: 'Notifications', keys: ['notifications.view_all', 'notifications.clock', 'notifications.leave_apply']},
  {label: 'Admin',         keys: ['roles.manage', 'departments.manage']},
];

export const PERMISSION_LABELS = {
  'employees.view':       'View employees',
  'employees.create':     'Create employees',
  'employees.edit':       'Edit employees',
  'employees.delete':     'Delete employees',
  'shifts.view':          'View shifts',
  'shifts.manage':        'Manage shifts',
  'attendance.view':      'View attendance',
  'attendance.adjust':    'Adjust attendance',
  'leave.view':           'View leave',
  'leave.approve':        'Approve leave',
  'payroll.view':         'View payroll',
  'payroll.manage':       'Manage payroll',
  'payroll.finalise':     'Finalise payroll',
  'documents.view':       'View documents',
  'documents.manage':     'Manage documents',
  'projects.view':        'View assigned projects',
  'projects.viewAll':     'View all projects',
  'projects.manage':      'Create, edit & delete projects',
  'jobs.view':            'View jobs',
  'jobs.manage':          'Create & manage jobs',
  'announcements.view':   'View announcements',
  'announcements.manage': 'Post announcements',
  'events.view':          'View events',
  'reports.view':         'View reports',
  'notifications.view_all':    'View all organisation notifications',
  'notifications.clock':       'Receive clock in / clock out alerts',
  'notifications.leave_apply': 'Receive new leave request alerts',
  'roles.manage':              'Manage roles',
  'departments.manage':        'Manage departments',
};
