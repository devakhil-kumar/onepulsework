import {apiSlice} from '@api/apiSlice';
import {API} from '@constants/apiRoutes';

export const payrollApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    // Returns { payrollCycleType, payrollCycleDays }
    getPayrollPolicy: build.query({
      query: () => ({url: API.PAYROLL.POLICY}),
      providesTags: ['PayrollPolicy'],
    }),

    // List payslips — requires payroll.manage permission on backend
    // Accepts { employeeId, pageSize, page }
    listEmployeePayslips: build.query({
      query: (params = {}) => ({url: API.PAYROLL.PAYSLIPS, params}),
      providesTags: ['Payslip'],
    }),
  }),
});

export const {
  useGetPayrollPolicyQuery,
  useListEmployeePayslipsQuery,
} = payrollApi;
