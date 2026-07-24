type ApiError = {
  message?: string;
};

type AuthSessionResponse = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    role: string;
    clientId?: string | null;
    mustChangePassword?: boolean;
  };
};

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
  }
  return baseUrl;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function persistSession(data: AuthSessionResponse) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
}

function clearSessionStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function buildHeaders(init?: HeadersInit, options?: { json?: boolean; auth?: boolean }): Headers {
  const headers = new Headers(init);
  if (options?.json) {
    headers.set('Content-Type', 'application/json');
  }
  if (options?.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return headers;
}

async function parseResponse<TResponse>(res: Response): Promise<TResponse> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const msg =
      (data &&
        typeof data === 'object' &&
        'message' in (data as ApiError) &&
        (data as ApiError).message) ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : `Request failed (${res.status})`);
  }

  return data as TResponse;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearSessionStorage();
          return false;
        }
        const data = (await res.json()) as AuthSessionResponse;
        persistSession(data);
        return true;
      } catch {
        clearSessionStorage();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

async function requestWithAuth(
  path: string,
  init: RequestInit,
  options?: { auth?: boolean; json?: boolean },
): Promise<Response> {
  const headers = buildHeaders(init.headers, {
    auth: options?.auth,
    json: options?.json,
  });
  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });

  if (res.status !== 401 || options?.auth === false) {
    return res;
  }

  const refreshed = await tryRefreshSession();
  if (!refreshed) return res;

  const retryHeaders = buildHeaders(init.headers, {
    auth: true,
    json: options?.json,
  });
  return fetch(`${getBaseUrl()}${path}`, { ...init, headers: retryHeaders });
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const res = await requestWithAuth(path, { method: 'GET' }, { auth: true });
  return parseResponse<TResponse>(res);
}

export async function apiGetBlob(urlOrPath: string): Promise<Blob> {
  const isAbsolute = urlOrPath.startsWith('http');
  const path = isAbsolute ? urlOrPath.replace(getBaseUrl(), '') : urlOrPath;

  let res: Response;
  if (isAbsolute && path === urlOrPath) {
    res = await fetch(urlOrPath, {
      method: 'GET',
      headers: buildHeaders(undefined, { auth: true }),
    });
    if (res.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        res = await fetch(urlOrPath, {
          method: 'GET',
          headers: buildHeaders(undefined, { auth: true }),
        });
      }
    }
  } else {
    res = await requestWithAuth(path, { method: 'GET' }, { auth: true });
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      if (typeof data?.message === 'string') message = data.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown,
  options?: { auth?: boolean },
): Promise<TResponse> {
  const res = await requestWithAuth(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    { auth: options?.auth ?? true, json: true },
  );
  return parseResponse<TResponse>(res);
}

export async function apiPatch<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await requestWithAuth(
    path,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
    { auth: true, json: true },
  );
  return parseResponse<TResponse>(res);
}

export async function apiDelete<TResponse>(path: string): Promise<TResponse> {
  const res = await requestWithAuth(path, { method: 'DELETE' }, { auth: true });
  return parseResponse<TResponse>(res);
}

export async function apiUpload<TResponse>(path: string, form: FormData): Promise<TResponse> {
  const res = await requestWithAuth(path, { method: 'POST', body: form }, { auth: true });
  return parseResponse<TResponse>(res);
}

export async function apiLogout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${getBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearSessionStorage();
  }
}
