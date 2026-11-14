import { useAuthStore } from '../store/authStore';
import { createApiUrl, createPath } from './basePath';

export async function shm_request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const sessionId = useAuthStore.getState().getSessionId();

  // Ensure API URLs use proper base path
  const fullUrl = url.startsWith('http') ? url : createApiUrl(url);

  const response = await fetch(fullUrl, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'session-id': sessionId } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = createPath('/login');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return data;

}

export interface ApiListResponse<T = any> {
  data: T[];
  total: number;
}

export function normalizeListResponse<T = any>(res: any): ApiListResponse<T> {
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const data = res.data || [];
  const total = res.items ?? res.total ?? data.length;
  return { data, total };
}

export async function shm_login(login: string, password: string, otpToken?: string): Promise<any> {
  const response = await fetch(createApiUrl('shm/v1/user/auth'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login,
      password,
      ...(otpToken ? { otp_token: otpToken } : {})
    }),
  });

  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* handled below */ }

  if (!response.ok) {
    const message = data?.error || data?.message || data?.msg || data?.data?.[0]?.error;
    throw new Error(message || (response.status === 401 ? 'Неверный логин или пароль' : `Ошибка входа (${response.status})`));
  }

  // SHM may return either a plain object or the standard { data: [...] } envelope.
  const payload = Array.isArray(data?.data) ? (data.data[0] || {}) : (data?.data || data);

  if ((payload.status === 'fail' || data.status === 'fail') && (payload.msg || data.msg) === 'INVALID_OTP_TOKEN') {
    throw new Error('Неверный OTP код');
  }

  if (payload.otp_required || data.otp_required) {
    return { otpRequired: true, login: payload.login || data.login || login };
  }

  const sessionId = payload.id || data.id || data.session_id;

  if (!sessionId) {
    throw new Error('Не получен session_id');
  }

  const userResponse = await fetch(createApiUrl('shm/v1/user'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'session-id': sessionId,
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    const user = userData.data?.[0] || userData;
    return { user, sessionId };
  }

  return {
    user: {
      user_id: 0,
      login,
      gid: 1
    },
    sessionId
  };
}
