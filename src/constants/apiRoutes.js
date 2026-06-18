const BASE = '/api/v1';

export const API = {
  AUTH: {
    LOGIN: `${BASE}/auth/login`,
    LOGOUT: `${BASE}/auth/logout`,
    REFRESH: `${BASE}/auth/refresh`,
    ME: `${BASE}/auth/me`,
    REGISTER: `${BASE}/auth/register`,
    ACCEPT_INVITE: `${BASE}/auth/accept-invite`,
    CHANGE_PASSWORD: `${BASE}/auth/change-password`,
    AVATAR: `${BASE}/auth/me/avatar`,
    FORGOT_PASSWORD: `${BASE}/auth/forgot-password`,
    RESET_PASSWORD: `${BASE}/auth/reset-password`,
    SESSIONS: `${BASE}/auth/sessions`,
    SESSIONS_REVOKE_OTHERS: `${BASE}/auth/sessions/revoke-others`,
  },
  EMPLOYEE: {
    LIST: `${BASE}/org/employees`,
    DETAIL: id => `${BASE}/org/employees/${id}`,
    ME: `${BASE}/org/employees/me`,
  },
  ATTENDANCE: {
    LIST: `${BASE}/org/attendance`,
    ME: `${BASE}/org/attendance/me`,
    SELF_CLOCK_IN:   `${BASE}/org/attendance/me/clock-in`,
    SELF_CLOCK_OUT:  `${BASE}/org/attendance/me/clock-out`,
    SELF_BREAK_START:`${BASE}/org/attendance/me/break-start`,
    SELF_BREAK_END:  `${BASE}/org/attendance/me/break-end`,
    CLOCK_IN:  `${BASE}/org/attendance/clock-in`,
    CLOCK_OUT: employeeId => `${BASE}/org/attendance/clock-out/${employeeId}`,
    ADJUST:    id => `${BASE}/org/attendance/${id}/adjust`,
  },
  LEAVE: {
    LIST: `${BASE}/org/leave`,
    REQUEST: `${BASE}/org/leave/request`,
    DETAIL: id => `${BASE}/org/leave/${id}`,
    REVIEW: id => `${BASE}/org/leave/${id}/review`,
    BALANCE: employeeId => `${BASE}/org/leave/balances/${employeeId}`,
  },
  SHIFT: {
    LIST: `${BASE}/org/shifts`,
    MY: `${BASE}/org/shifts/my`,
    BULK: `${BASE}/org/shifts/bulk`,
    AUTO_ASSIGN: `${BASE}/org/shifts/auto-assign`,
    DETAIL: id => `${BASE}/org/shifts/${id}`,
  },
  SHIFT_TEMPLATE: {
    LIST: `${BASE}/org/shift-templates`,
    DETAIL: id => `${BASE}/org/shift-templates/${id}`,
  },
  PAYROLL: {
    POLICY:       `${BASE}/org/payroll/policy`,
    PERIODS:      `${BASE}/org/payroll/periods`,
    AVAILABLE:    `${BASE}/org/payroll/periods/available`,
    GENERATE:     `${BASE}/org/payroll/periods/generate`,
    PERIOD_BY_ID: id => `${BASE}/org/payroll/periods/${id}`,
    FINALISE:     id => `${BASE}/org/payroll/periods/${id}/finalise`,
    DELETE:       id => `${BASE}/org/payroll/periods/${id}`,
    UNLOCK:       id => `${BASE}/org/payroll/periods/${id}/unlock`,
    PAYSLIPS:     `${BASE}/org/payroll/payslips`,
    MY_PAYSLIPS:  `${BASE}/org/payroll/my-payslips`,
    PAYSLIP:      id => `${BASE}/org/payroll/payslips/${id}`,
  },
  NOTIFICATION: {
    LIST:        `${BASE}/org/notifications`,
    READ:        id => `${BASE}/org/notifications/${id}/read`,
    READ_ALL:    `${BASE}/org/notifications/read-all`,
    DELETE:      id => `${BASE}/org/notifications/${id}`,
    PREFERENCES: `${BASE}/org/notifications/preferences`,
    PUSH_TOKEN:  `${BASE}/org/notifications/push-token`,
  },
  PROJECT: {
    LIST: `${BASE}/org/projects`,
    OPTIONS: `${BASE}/org/projects/options`,
    DETAIL: id => `${BASE}/org/projects/${id}`,
  },
  TASK: {
    LIST:         `${BASE}/org/tasks`,
    DETAIL:       id => `${BASE}/org/tasks/${id}`,
    START:        id => `${BASE}/org/tasks/${id}/start`,
    PAUSE:        id => `${BASE}/org/tasks/${id}/pause`,
    DONE:         id => `${BASE}/org/tasks/${id}/done`,
    CANCEL:       id => `${BASE}/org/tasks/${id}/cancel`,
    COMPLETE:     id => `${BASE}/org/tasks/${id}/complete`,
    REPORT_ISSUE: id => `${BASE}/org/tasks/${id}/report-issue`,
    RESTART:      id => `${BASE}/org/tasks/${id}/restart`,
  },
  JOB: {
    LIST: `${BASE}/org/jobs`,
    MY: `${BASE}/org/jobs/my`,
    DETAIL: id => `${BASE}/org/jobs/${id}`,
    START: id => `${BASE}/org/jobs/${id}/start`,
    COMPLETE: id => `${BASE}/org/jobs/${id}/complete`,
  },
  DOCUMENT: {
    LIST:     `${BASE}/org/documents`,
    BY_ID:    id => `${BASE}/org/documents/${id}`,
    DOWNLOAD: (id, inline) => `${BASE}/org/documents/${id}/download${inline ? '?inline=1' : ''}`,
  },
  ANNOUNCEMENT: {
    LIST:   `${BASE}/org/announcements`,
    BY_ID:  id => `${BASE}/org/announcements/${id}`,
  },
  EVENT: {
    LIST:   `${BASE}/org/events`,
    BY_ID:  id => `${BASE}/org/events/${id}`,
  },
  ORG_ROLE: {
    LIST:   `${BASE}/org/roles`,
    DETAIL: id => `${BASE}/org/roles/${id}`,
  },
  DEPARTMENT: {
    LIST:   `${BASE}/org/departments`,
    DETAIL: id => `${BASE}/org/departments/${id}`,
  },
  ORGANISATION: {
    ME:     `${BASE}/org/organisation/me`,
    LOGO:   `${BASE}/org/organisation/me/logo`,
    POLICY: `${BASE}/org/organisation/policy`,
  },
  USER: {
    LIST:   `${BASE}/org/users`,
    INVITE: `${BASE}/org/users/invite`,
    DETAIL: id => `${BASE}/org/users/${id}`,
    FORCE_LOGOUT:   id => `${BASE}/org/users/${id}/force-logout`,
    RESET_PASSWORD: id => `${BASE}/org/users/${id}/reset-password`,
  },
  HOLIDAY: {
    LIST:  `${BASE}/reference/public-holidays`, // read — all authenticated users
    ADMIN: `${BASE}/org/holidays`,              // create — holidays.manage
    SEED:  `${BASE}/org/holidays/seed`,         // import AU holidays for a year
    BY_ID: id => `${BASE}/org/holidays/${id}`,  // update / delete
  },
};
