import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

const periodTags = (_r, _e, id) => [
  {type: 'Payslip', id},
  {type: 'Payslip', id: 'LIST'},
];

export const payrollApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // Returns { payrollCycleType, payrollCycleDays }
    getPayrollPolicy: build.query({
      query: () => ({url: API.PAYROLL.POLICY}),
      providesTags: ['PayrollPolicy'],
    }),

    // Admin: list all payroll periods (paginated)
    listPeriods: build.query({
      query: (params = {}) => ({url: API.PAYROLL.PERIODS, params}),
      providesTags: result => {
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return [
          ...items.map(p => ({type: 'Payslip', id: p.id})),
          {type: 'Payslip', id: 'LIST'},
        ];
      },
    }),

    // Get a single period with all payslips inside it
    getPeriod: build.query({
      query: id => ({url: API.PAYROLL.PERIOD_BY_ID(id)}),
      providesTags: (_r, _e, id) => [{type: 'Payslip', id}],
    }),

    // Admin: list ungenerated available periods to choose from
    listAvailablePeriods: build.query({
      query: () => ({url: API.PAYROLL.AVAILABLE}),
      providesTags: [{type: 'Payslip', id: 'AVAILABLE'}],
    }),

    // Admin: generate a new payroll period
    generatePeriod: build.mutation({
      query: body => ({url: API.PAYROLL.GENERATE, method: 'POST', data: body}),
      invalidatesTags: [{type: 'Payslip', id: 'LIST'}, {type: 'Payslip', id: 'AVAILABLE'}],
    }),

    // Admin: finalise a DRAFT period — issues all payslips
    finalisePeriod: build.mutation({
      query: id => ({url: API.PAYROLL.FINALISE(id), method: 'POST', data: {}}),
      invalidatesTags: periodTags,
    }),

    // Admin: delete a DRAFT period
    deletePeriod: build.mutation({
      query: id => ({url: API.PAYROLL.DELETE(id), method: 'DELETE'}),
      invalidatesTags: periodTags,
    }),

    // Owner only: unlock a FINALISED period back to DRAFT
    unlockPeriod: build.mutation({
      query: id => ({url: API.PAYROLL.UNLOCK(id), method: 'POST', data: {}}),
      invalidatesTags: periodTags,
    }),

    // Admin: list payslips filtered by employeeId — requires payroll.manage
    listEmployeePayslips: build.query({
      query: (params = {}) => ({url: API.PAYROLL.PAYSLIPS, params}),
      providesTags: ['Payslip'],
    }),

    // Employee: list own payslips — no payroll.manage required
    listMyPayslips: build.query({
      query: (params = {}) => ({url: API.PAYROLL.MY_PAYSLIPS, params}),
      providesTags: ['Payslip'],
    }),
  }),
});

export const {
  useGetPayrollPolicyQuery,
  useListPeriodsQuery,
  useGetPeriodQuery,
  useListAvailablePeriodsQuery,
  useGeneratePeriodMutation,
  useFinalisePeriodMutation,
  useDeletePeriodMutation,
  useUnlockPeriodMutation,
  useListEmployeePayslipsQuery,
  useListMyPayslipsQuery,
} = payrollApi;
