/**
 * VyaparPilot AI - Unified Frontend API Client
 * Connects frontend to FastAPI backend using a single shared API_BASE_URL.
 * Supports both direct production URLs (e.g. https://vyaparpilot.onrender.com)
 * and local dev proxy (/api/v1) seamlessly without duplicate slashes.
 */

function resolveApiBaseUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim();

  // If no custom env URL is set, default to relative '/api/v1' (works with Vite proxy & unified Docker)
  if (!envUrl) {
    return '/api/v1';
  }

  // Remove any trailing slashes
  const cleanUrl = envUrl.replace(/\/+$/, '');

  // If the user already appended /api/v1, use as is
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }

  // If the user appended /api, add /v1
  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/v1`;
  }

  // Otherwise append /api/v1
  return `${cleanUrl}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Builds the complete request URL from an endpoint path.
 * Guarantees no duplicate slashes or duplicate /api/v1 prefixes.
 */
export function buildEndpointUrl(path: string): string {
  // Ensure path starts with a single slash
  const withSlash = path.startsWith('/') ? path : `/${path}`;

  // Strip duplicate /api/v1 prefix if the endpoint itself included it
  const normalizedPath = withSlash.startsWith('/api/v1/')
    ? withSlash.substring('/api/v1'.length)
    : withSlash === '/api/v1'
    ? ''
    : withSlash;

  return `${API_BASE_URL}${normalizedPath}`;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('vyaparpilot_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('vyaparpilot_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('vyaparpilot_token');
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = buildEndpointUrl(endpoint);

  // Set timeout controller for responsive UI error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after 30 seconds. The server at ${API_BASE_URL} took too long to respond.`);
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      throw new Error('You appear to be offline. Please verify your internet connection.');
    }

    console.error(`[VyaparPilot API] Network error connecting to ${url}:`, err);
    throw new Error(
      `Unable to reach backend server at ${API_BASE_URL}. If the backend is hosted on Render, it may be waking up from free-tier sleep (takes ~45 seconds). Please try again shortly.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    removeAuthToken();
    if (
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/' &&
      !window.location.pathname.startsWith('/portal')
    ) {
      window.location.href = '/login';
    }
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        // FastAPI 422 Unprocessable Entity array
        errorDetail = errJson.detail.map((e: any) => `${e.loc?.join('.') || 'field'}: ${e.msg}`).join('; ');
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else {
        errorDetail = JSON.stringify(errJson);
      }
    } catch {
      errorDetail = `Server returned HTTP ${response.status}: ${response.statusText || 'Error'}`;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: any) =>
      request<{ access_token: string; token_type: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    demoLogin: () =>
      request<{ access_token: string; token_type: string }>('/auth/demo-login', {
        method: 'POST',
      }),
    getMe: () => request<any>('/auth/me'),
  },

  business: {
    getProfile: () => request<any>('/business/profile'),
    updateProfile: (data: any) =>
      request<any>('/business/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getSettings: () => request<any>('/business/settings'),
    updateSettings: (data: any) =>
      request<any>('/business/settings', {
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
    create: (data: any) =>
      request<any>('/products/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: number) => request<any>(`/products/${id}`),
    update: (id: number, data: any) =>
      request<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/products/${id}`, {
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
    exportCsvUrl: () => buildEndpointUrl('/products/export-csv'),
  },

  customers: {
    list: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<any[]>(`/customers/${q}`);
    },
    create: (data: any) =>
      request<any>('/customers/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: number) => request<any>(`/customers/${id}`),
    update: (id: number, data: any) =>
      request<any>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  enquiries: {
    list: () => request<any[]>('/enquiries/'),
    process: (data: { raw_text: string; title: string; customer_id?: number; force_demo_mode?: boolean }) =>
      request<any>('/enquiries/process', {
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
    getStatusCounts: () => request<any>('/quotations/status-counts'),
    calculate: (data: any) =>
      request<any>('/quotations/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    create: (data: any) =>
      request<any>('/quotations/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: number) => request<any>(`/quotations/${id}`),
    update: (id: number, data: any) =>
      request<any>(`/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    submitApproval: (id: number) =>
      request<any>(`/quotations/${id}/submit-approval`, {
        method: 'POST',
      }),
    approve: (id: number, data: { comments?: string; review_time_seconds?: number; corrections_made_count?: number } = {}) =>
      request<any>(`/quotations/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action: 'APPROVE', ...data }),
      }),
    reject: (id: number, comments: string) =>
      request<any>(`/quotations/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ action: 'REJECT', comments }),
      }),
    sendToRetailer: (id: number, data: { deadline_hours?: number; custom_note?: string } = {}) =>
      request<any>(`/quotations/${id}/send-to-retailer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    retailerResponse: (id: number, data: { action: 'ACCEPT' | 'REJECT'; notes?: string; retailer_name?: string }) =>
      request<any>(`/quotations/${id}/retailer-response`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPublicPortal: (token: string) =>
      request<any>(`/quotations/public/portal/${token}`),
    retailerRespondPublic: (token: string, data: { action: 'ACCEPT' | 'REJECT'; notes?: string; retailer_name?: string }) =>
      request<any>(`/quotations/public/portal/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPdfUrl: (id: number) => {
      const token = getAuthToken();
      const base = buildEndpointUrl(`/quotations/${id}/pdf`);
      return token ? `${base}?token=${encodeURIComponent(token)}` : base;
    },
    downloadPdf: async (id: number, quotationNumber: string = 'quotation') => {
      const token = getAuthToken();
      const url = buildEndpointUrl(`/quotations/${id}/pdf`);
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download PDF (${response.status}): ${errorText || response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Quotation_${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    },
  },

  roi: {
    getSummary: (filter_type?: string) => {
      const q = filter_type ? `?filter_type=${encodeURIComponent(filter_type)}` : '';
      return request<any>(`/roi/summary${q}`);
    },
    record: (data: any) =>
      request<any>('/roi/record', {
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
    exportCsvUrl: () => buildEndpointUrl('/reports/export-csv'),
  },

  health: {
    check: () => request<any>('/health/'),
  },
};
