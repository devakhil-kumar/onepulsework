import client from './client';

// Wraps our existing axios client (which already handles JWT inject + 401 refresh)
// so RTK Query can use it as its fetcher without duplicating that logic
const axiosBaseQuery = () => async ({url, method = 'GET', data, params}) => {
  try {
    const result = await client({url, method, data, params});
    // Backend wraps all responses: { success: true, data: <payload> }
    return {data: result.data.data ?? result.data};
  } catch (err) {
    const apiErr = err.response?.data?.error;
    return {
      error: {
        status: err.response?.status ?? 'FETCH_ERROR',
        // `data` stays the human message (back-compat with existing screens).
        data: apiErr?.message ?? err.response?.data?.message ?? err.message,
        // Also surface the machine-readable code + details so screens can react
        // to specific errors (e.g. SEAT_LIMIT_REACHED → upgrade prompt).
        code: apiErr?.code,
        details: apiErr?.details,
      },
    };
  }
};

export default axiosBaseQuery;
