import { API_BASE_URL } from './config';
import { useAuthStore } from '@/store/auth-store';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, user, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          clear();
          return null;
        }
        const data = await res.json();
        if (user) setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user ?? user });
        return data.accessToken as string;
      })
      .catch(() => {
        clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  isForm?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, isForm, headers, ...rest } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const doFetch = async (token: string | null) => {
    const finalHeaders: HeadersInit = {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    };
    return fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  };

  let res = await doFetch(accessToken);

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
    // Refresh failed (session gone): retry once without a token so optional-auth public routes
    // (which now 401 on an expired token instead of ignoring it) still load anonymously.
    else if (accessToken) res = await doFetch(null);
  }

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      /* no body */
    }
    const message =
      (details as { message?: string | string[] })?.message ?? res.statusText ?? 'Request failed';
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message, details);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res.json();
  return res.text() as unknown as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

/** `?a=1&b=2` from a filter object, skipping undefined and empty-string values ('' when nothing is set). */
/**
 * Authenticated file download (e.g. the participant .xlsx). Same token + refresh handling as
 * apiFetch, but returns the body as a Blob plus the server's filename, then saves it via a
 * temporary object URL — the token never goes into a URL.
 */
export async function apiDownload(path: string, fallbackName: string): Promise<string> {
  const get = (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let res = await get(useAuthStore.getState().accessToken);
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await get(fresh);
  }
  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      /* no body */
    }
    const message = (details as { message?: string | string[] })?.message ?? res.statusText ?? 'Download failed';
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message, details);
  }
  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return filename;
}

export function toQueryString(filters: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
