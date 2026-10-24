const API_BASE = '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('vyaparpilot_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('vyaparpilot_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('vyaparpilot_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
    throw new Error('Session expired or unauthorized');
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials: any) => request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    register: (data: any) => request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    demoLogin: () => request<{ access_token: string }>('/auth/demo-login', {
      method: 'POST',
    }),
    getMe: () => request<any>('/auth/me'),
  },

  business: {
    getProfile: () => request<any>('/business/profile'),
    updateProfile: (data: any) => request<any>('/business/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getSettings: () => request<any>('/business/settings'),
    updateSettings: (data: any) => request<any>('/business/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  products: {
    list: (params: { page?: number; page_size?: number; search?: string; category?: string; low_stock_only?: boolean } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', params.page.toString());
      if (params.page_size) q.set('page_size', params.page_size.toString());
      if (params.search) q.set('search', params.search);
      if (params.category) q.set('category', params.category);
      if (params.low_stock_only) q.set('low_stock_only', 'true');
      return request<any>(`/products/?${q.toString()}`);
    },
    create: (data: any) => request<any>('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: number) => request<any>(`/products/${id}`),
    update: (id: number, data: any) => request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<any>(`/products/${id}`, {
      method: 'DELETE',
    }),
    importCsv: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<any>('/products/import-csv', {
        method: 'POST',
        body: formData,
      });
    },
    exportCsvUrl: () => `${API_BASE}/products/export-csv`,
  },

  customers: {
    list: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<any[]>(`/customers/${q}`);
    },
    create: (data: any) => request<any>('/customers/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: number) => request<any>(`/customers/${id}`),
    update: (id: number, data: any) => request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  enquiries: {
    list: () => request<any[]>('/enquiries/'),
    process: (data: { raw_text: string; title: string; customer_id?: number; force_demo_mode?: boolean }) => request<any>('/enquiries/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: number) => request<any>(`/enquiries/${id}`),
  },

  quotations: {
    list: (params: { page?: number; page_size?: number; status_filter?: string; customer_id?: number; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', params.page.toString());
      if (params.page_size) q.set('page_size', params.page_size.toString());
      if (params.status_filter) q.set('status_filter', params.status_filter);
      if (params.customer_id) q.set('customer_id', params.customer_id.toString());
      if (params.search) q.set('search', params.search);
      return request<any>(`/quotations/?${q.toString()}`);
    },
    calculate: (data: any) => request<any>('/quotations/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    create: (data: any) => request<any>('/quotations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: number) => request<any>(`/quotations/${id}`),
    update: (id: number, data: any) => request<any>(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    submitApproval: (id: number) => request<any>(`/quotations/${id}/submit-approval`, {
      method: 'POST',
    }),
    approve: (id: number, data: { comments?: string; review_time_seconds?: number; corrections_made_count?: number } = {}) =>
      request<any>(`/quotations/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action: 'APPROVE', ...data }),
      }),
    reject: (id: number, comments: string) => request<any>(`/quotations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ action: 'REJECT', comments }),
    }),
    getPdfUrl: (id: number) => `${API_BASE}/quotations/${id}/pdf`,
  },

  roi: {
    getSummary: (filter_type?: string) => {
      const q = filter_type ? `?filter_type=${encodeURIComponent(filter_type)}` : '';
      return request<any>(`/roi/summary${q}`);
    },
    record: (data: any) => request<any>('/roi/record', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  audit: {
    list: (params: { quotation_id?: number; event_type?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.quotation_id) q.set('quotation_id', params.quotation_id.toString());
      if (params.event_type) q.set('event_type', params.event_type);
      if (params.limit) q.set('limit', params.limit.toString());
      if (params.offset) q.set('offset', params.offset.toString());
      return request<any>(`/audit/?${q.toString()}`);
    },
  },

  reports: {
    getSummary: () => request<any>('/reports/summary'),
    exportCsvUrl: () => `${API_BASE}/reports/export-csv`,
  },

  health: {
    check: () => request<any>('/health/'),
  },
};
