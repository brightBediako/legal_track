type ApiError = {
  message?: string;
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

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers: buildHeaders(undefined, { auth: true }),
  });
  return parseResponse<TResponse>(res);
}

export async function apiGetBlob(urlOrPath: string): Promise<Blob> {
  const url = urlOrPath.startsWith('http') ? urlOrPath : `${getBaseUrl()}${urlOrPath}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(undefined, { auth: true }),
  });

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
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: buildHeaders(undefined, { json: true, auth: options?.auth ?? true }),
    body: JSON.stringify(body),
  });
  return parseResponse<TResponse>(res);
}

export async function apiPatch<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(undefined, { json: true, auth: true }),
    body: JSON.stringify(body),
  });
  return parseResponse<TResponse>(res);
}

export async function apiUpload<TResponse>(path: string, form: FormData): Promise<TResponse> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: buildHeaders(undefined, { auth: true }),
    body: form,
  });
  return parseResponse<TResponse>(res);
}
