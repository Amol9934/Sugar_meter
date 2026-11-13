export class ApiError extends Error {
  constructor(message, { status, field } = {}) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error?.message ?? 'Something went wrong. Please try again.', {
      status: res.status,
      field: data.error?.field,
    });
  }
  return data;
}

const inFlightReports = new Map();

export const api = {
  me: () => request('/auth/me'),
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  report: (date, force = false) => {
    if (!force && inFlightReports.has(date)) {
      return inFlightReports.get(date);
    }
    const promise = request(`/reports?date=${date}`).finally(() => {
      inFlightReports.delete(date);
    });
    inFlightReports.set(date, promise);
    return promise;
  },
  summary: (days = 30, date) => request(`/reports/summary?days=${days}${date ? `&date=${date}` : ''}`),
  trend: (days = 30, date) => request(`/reports/trend?days=${days}${date ? `&date=${date}` : ''}`),
  createReading: (b) => request('/readings', { method: 'POST', body: b }),
  updateReading: (id, b) => request(`/readings/${id}`, { method: 'PUT', body: b }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),
};
