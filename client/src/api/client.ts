import axios from 'axios';
import { getCookie, setCookie, removeCookie, extendCookie, getPartnerCookie, removePartnerCookie } from './cookie';
import { config } from '../config';

export function telegramSessionId(body: any): string | null {
  const payload = body?.data ?? body;
  const item = Array.isArray(payload) ? payload[0] : payload;
  const error = body?.error || item?.error;
  if (error) throw new Error(typeof error === 'string' ? error : 'Telegram отклонил авторизацию.');
  const value = item?.session_id ?? item?.id;
  return typeof value === 'string' && value.trim() ? value : null;
}

export const api = axios.create({
  baseURL: '/shm/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getCookie();
    if (token) {
      config.headers['session_id'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    extendCookie();
    return response;
  },
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/auth');
    if (error.response?.status === 401 && !isAuthRequest && !(error.config?.url === '/user' && error.config?.method === 'get')) {
      removeCookie();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username: string, password: string, otpToken?: string) => {
    const response = await api.post('/user/auth', {
      login: username,
      password,
      ...(otpToken ? { otp_token: otpToken } : {})
    });

    if (response.data?.otp_required) {
      return { otpRequired: true };
    }

    const sessionId = response.data?.session_id || response.data?.id;
    if (sessionId) {
      setCookie(sessionId);
    }
    return { otpRequired: false };
  },

  getCurrentUser: () => api.get('/user'),

  logout: async () => {
    await api.delete('/user/auth');
    removeCookie();
    window.location.href = '/login';
  },

  telegramWidgetAuth: async (userData: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
    bind_to_profile?: number;
    uid?: number;
    register_if_not_exists?: number;
  }) => {
    const partnerId = getPartnerCookie();
    const bindingSession = userData.bind_to_profile ? getCookie() : null;
    if (userData.bind_to_profile && !bindingSession) {
      throw new Error('Сессия истекла. Войдите в кабинет заново перед привязкой Telegram.');
    }
    const response = await api.post('/telegram/web/auth', {
      ...userData,
      profile: config.TELEGRAM_BOT_AUTH_PROFILE,
      ...(partnerId && { partner_id: partnerId }),
      ...(userData.bind_to_profile && { bind_to_profile: userData.bind_to_profile }),
      ...(bindingSession && { session_id: bindingSession }),
      ...(userData.register_if_not_exists && { register_if_not_exists: userData.register_if_not_exists }),
    });
    const sessionId = telegramSessionId(response.data);
    if (!userData.bind_to_profile && !sessionId) throw new Error('SHM не вернул сессию Telegram.');
    if (sessionId && !userData.bind_to_profile) {
      setCookie(sessionId);
      if (partnerId) {
        removePartnerCookie();
      }
    }
    return response;
  },

  register: async (username: string, password: string, captchaToken?: string, captchaAnswer?: string) => {
    const partnerId = getPartnerCookie();
    const data: Record<string, string> = { login: username, password };
    if (partnerId) {
      data.partner_id = partnerId;
    }
    if (captchaToken && captchaAnswer !== undefined) {
      data.captcha_token = captchaToken;
      data.captcha_answer = captchaAnswer;
    }
    const response = await api.put('/user', data);
    if (partnerId) {
      removePartnerCookie();
    }
    return response;
  },
  getCaptcha: () => api.get<{ data: { image?: string; question?: string; token: string } }>('/user/captcha'),

  telegramWebAppAuth: async (initData: string, profile: string) => {
    const partnerId = getPartnerCookie();
    const params = new URLSearchParams({
      initData,
      profile,
      ...(partnerId && { partner_id: partnerId }),
    });
    const response = await api.get(`/telegram/webapp/auth?${params.toString()}`);
    const sessionId = telegramSessionId(response.data);
    if (!sessionId) throw new Error('SHM не вернул сессию Telegram Web App.');
    if (sessionId) {
      setCookie(sessionId);
      if (partnerId) {
        removePartnerCookie();
      }
    }
    return response;
  },

  telegramOidcInit: (params?: {
    profile?: string;
    register_if_not_exists?: number;
    return_url?: string;
  }) => {
    const queryParams = {
      profile: params?.profile || config.TELEGRAM_BOT_AUTH_PROFILE,
      register_if_not_exists: params?.register_if_not_exists ?? 1,
      ...(params?.return_url ? { return_url: params.return_url } : {}),
    };
    return api.get('/telegram/web/auth/init', { params: queryParams });
  },
};

export const userApi = {
  getProfile: () => api.get('/user'),
  updateProfile: (data: { full_name?: string; phone?: string }) => api.post('/user/profile', data),
  changePassword: (password: string) => api.post('/user/passwd', { password }),
  resetPassword: (params: { login?: string; email?: string }) => api.post('/user/passwd/reset', params),
  verifyResetToken: (token: string) => api.get('/user/passwd/reset/verify', { params: { token } }),
  resetPasswordWithToken: (token: string, password: string) => api.post('/user/passwd/reset/verify', { token, password }),
  getServices: () => api.get('/user/service', { params: { limit: 1000 } }),
  getHwid: (userServiceId: number | string) => api.get('/user/service/hwid', { params: { user_service_id: Number(userServiceId) } }),
  deleteHwid: (userServiceId: number | string, hwid: string) => api.delete('/user/service/hwid', { data: { user_service_id: Number(userServiceId), hwid } }),
  resetHwid: (userServiceId: number | string) => api.post('/user/service/hwid/reset', { user_service_id: Number(userServiceId) }),
  stopService: (userServiceId: number) => api.post('/user/service/stop', { user_service_id: userServiceId }),
  changeService: (userServiceId: number, serviceId: number, finish_active: number, partial_renew: number) => api.post('/user/service/change', {
    user_service_id: userServiceId,
    service_id: serviceId,
    finish_active: finish_active,
    allow_partial_period: partial_renew,
  }),
  getPayments: (params?: { limit?: number; offset?: number; sort_field?: string; sort_direction?: string; filter?: Record<string, unknown> }) => {
    const { filter, ...rest } = params || {};
    return api.get('/user/pay', { params: { ...rest, ...(filter ? { filter: JSON.stringify(filter) } : {}) } });
  },
  getPaySystems: () => api.get('/user/pay/paysystems'),
  getForecast: () => api.get('/user/pay/forecast'),
  deleteAutopayment: (paySystem: string) => api.delete('/user/autopayment', { params: { pay_system: paySystem } }),
  getWithdrawals: (params?: { limit?: number; offset?: number; sort_field?: string; sort_direction?: string; filter?: Record<string, unknown> }) => {
    const { filter, ...rest } = params || {};
    return api.get('/user/withdraw', { params: { ...rest, ...(filter ? { filter: JSON.stringify(filter) } : {}) } });
  },
};

export interface TicketMedia {
  id: number;
  name: string;
  mime_type?: string;
  size?: number;
  created?: string;
}

export interface TicketMessage {
  message_id: number;
  ticket_id: number;
  user_id?: number;
  is_admin?: number;
  message: string;
  created?: string;
  media?: TicketMedia[];
}

export interface TicketItem {
  ticket_id: number;
  subject: string;
  status: string;
  priority?: string;
  ticket_type?: string;
  user_service_id?: number;
  created?: string;
  updated?: string;
  closed_at?: string;
  archived_at?: string;
  messages?: TicketMessage[];
  responder?: 'ai' | 'human' | null;
  telegram_error?: string | null;
}

export const ticketApi = {
  options: () => api.get<{ data: { ai_available: number }[] | { ai_available: number } }>('/user/ticket/options'),
  setResponder: (ticketId: number, responder: 'ai' | 'human') =>
    api.post(`/user/ticket/responder/${ticketId}`, { responder }),
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<{ data: TicketItem[] }>('/user/ticket', { params }),
  get: (ticketId: number | string) =>
    api.get<{ data: TicketItem[] }>(`/user/ticket/${ticketId}`),
  create: (data: {
    subject: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    ticket_type?: 'service' | 'payment' | 'other';
    user_service_id?: number;
    media_ids?: number[];
    responder?: 'ai' | 'human';
  }) => api.put<{ data: TicketItem }>('/user/ticket', data),
  sendMessage: (ticketId: number | string, data: { message: string; media_ids?: number[] }) =>
    api.post<{ data: TicketMessage }>(`/user/ticket/${ticketId}`, data),
  close: (ticketId: number | string) =>
    api.delete<{ data: TicketItem }>(`/user/ticket/${ticketId}`),
  uploadMedia: (data: { name: string; data: string; mime_type?: string }) =>
    api.put<{ data: TicketMedia }>('/user/ticket/media', data),
  mediaSource: async (id: number, fallback = false): Promise<{ url: string; temporary: boolean }> => {
    if (fallback) {
      const response = await ticketApi.downloadMedia(id);
      return { url: URL.createObjectURL(response.data), temporary: true };
    }
    const response = await api.get(`/user/ticket/media/${id}`, { params: { delivery: 'url' }, timeout: 15_000 });
    const payload = response.data?.data;
    const media = Array.isArray(payload) ? payload[0] : payload;
    if (typeof media?.url === 'string' && media.url.startsWith('https://')) {
      return { url: media.url, temporary: false };
    }
    if (typeof media?.data !== 'string') throw new Error('Не удалось загрузить вложение');
    const binary = atob(media.data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return { url: URL.createObjectURL(new Blob([bytes], { type: media.mime_type || 'application/octet-stream' })), temporary: true };
  },
  downloadMedia: async (id: number | string): Promise<{ data: Blob }> => {
    const response = await api.get<{ data: { data: string; mime_type?: string } | { data: string; mime_type?: string }[] }>(`/user/ticket/media/${id}`, { timeout: 45_000 });
    const payload = response.data?.data;
    const media = Array.isArray(payload) ? payload[0] : payload;
    if (!media || typeof media.data !== 'string') throw new Error('Не удалось загрузить вложение');
    const binary = atob(media.data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return { data: new Blob([bytes], { type: media.mime_type || 'application/octet-stream' }) };
  },
};

export const userEmailApi = {
  getEmail: () => api.get<{ data: { email: string, email_verified: number }[] }>('/user/email'),
  setEmail: (email: string) => api.put('/user/email', { email: email }),
  sendVerifyCode: (email: string) => api.post('/user/email', { email: email }),
  confirmEmail: (email: string, code: string) => api.post('/user/email', { email: email, code: code }),
  deleteEmail: (email: string) => api.delete('/user/email', { params: { email } }),
};

export const referralsApi = {
  getCount: () => api.get<{ data: { total: number }[] }>('/user/referrals'),
};

export const storageApi = {
  get: (name: string, params?: Record<string, string>) => api.get(`/storage/manage/${name}`, { params }),
  list: () => api.get('/storage/manage'),
};

export const servicesApi = {
  list: () => api.get('/service'),
  order_list: (filter?: { category?: string; service_id?: number | string }) => api.get('/service/order', {
    params: filter ? { filter: JSON.stringify(filter) } : {},
  }),
  order: (serviceId: number) => api.put('/service/order', { service_id: serviceId }),
  getOrderList: () => api.get('/service/order'),
};

export const telegramApi = {
  getSettings: () => api.get('/telegram/user'),
  updateSettings: (data: Record<string, unknown>) => api.post('/telegram/user', data),
  unbindAccount: () => api.delete('/telegram/user'),
  initOidc: (params: { return_url: string; profile?: string }) => api.get('/telegram/web/auth/init', {
    params: {
      bind_to_profile: 1,
      register_if_not_exists: 0,
      ...params,
    },
  }),
};

export const promoApi = {
  apply: (code: string) => api.get(`/promo/apply/${code}`),
  list: () => api.get('/promo'),
};

export interface PasskeyCredential {
  id: string;
  name: string;
  created_at: string;
}

export interface PasskeyRegisterOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout: number;
  attestation: string;
  excludeCredentials: Array<{ id: string; type: string }>;
  authenticatorSelection: {
    authenticatorAttachment: string;
    residentKey: string;
    userVerification: string;
  };
}

export interface PasskeyAuthOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: string;
}

export const passkeyApi = {
  list: () => api.get<{ data: { credentials: PasskeyCredential[]; enabled: boolean } }>('/user/passkey'),
  rename: (credentialId: string, name: string) => api.post('/user/passkey', { credential_id: credentialId, name }),
  delete: (credentialId: string) => api.delete('/user/passkey', { params: { credential_id: credentialId } }),
  registerOptions: () => api.get<{ data: PasskeyRegisterOptions }>('/user/passkey/register'),
  registerComplete: (data: {
    credential_id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
    name?: string;
  }) => api.post('/user/passkey/register', data),
  authOptionsPublic: () => api.get<{ data: PasskeyAuthOptions }>('/user/auth/passkey', {}),
  authPublic: (data: {
    credential_id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
  }) => api.post<{ data: { id: string } }>('/user/auth/passkey', data),
};

export interface OtpStatus {
  enabled: boolean;
  verified: boolean;
  required: boolean;
  last_verified?: string;
}

export interface OtpSetupResponse {
  qr_url: string;
  secret: string;
  backup_codes: string[];
}

export const otpApi = {
  status: () => api.get<{ data: OtpStatus }>('/user/otp'),
  setup: () => api.post<{ data: OtpSetupResponse }>('/user/otp/setup'),
  enable: (token: string) => api.put('/user/otp', { token }),
  disable: (token: string) => api.delete('/user/otp', { params: { token } }),
  verify: (token: string) => api.post('/user/otp', { token }),
};

export interface PasswordAuthStatus {
  password_auth_disabled: number;
  passkey_enabled: number;
  otp_enabled: number;
}

export const passwordAuthApi = {
  status: () => api.get<{ data: PasswordAuthStatus }>('/user/password-auth'),
  disable: () => api.delete('/user/password-auth'),
  enable: () => api.post('/user/password-auth'),
};
