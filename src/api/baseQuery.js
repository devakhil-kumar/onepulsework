import client from './client';

// Wraps our existing axios client (which already handles JWT inject + 401 refresh)
// so RTK Query can use it as its fetcher without duplicating that logic
const axiosBaseQuery = () => async ({url, method = 'GET', data, params}) => {
  try {
    const result = await client({url, method, data, params});
    // Backend wraps all responses: { success: true, data: <payload> }
    return {data: result.data.data ?? result.data};
  } catch (err) {
    return {
      error: {
        status: err.response?.status ?? 'FETCH_ERROR',
        data: err.response?.data?.message ?? err.message,
      },
    };
  }
};

export default axiosBaseQuery;
