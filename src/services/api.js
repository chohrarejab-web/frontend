/**
 * SahaTN / Maw2idi — Unified Frontend API Client
 * Automatically handles JWT Bearer tokens, CSRF token protection & FR/AR alert localization
 */
import { translateAlertMessage, getCurrentLang } from '../utils/alertTranslator';
import { isNativeMobile } from '../utils/mobilePlatform';

export const PRIMARY_API_URL = (import.meta.env.VITE_API_URL || 'https://maw3edi-backend-production.up.railway.app').replace(/\/$/, '');
const isDesktopLocalDev =
  typeof window !== 'undefined' &&
  !isNativeMobile() &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) &&
  window.location.port === '5173';
export const FALLBACK_API_URL = isDesktopLocalDev
  ? (import.meta.env.VITE_FALLBACK_API_URL || 'http://localhost:4000').replace(/\/$/, '')
  : '';
export const API_BASE_URL = PRIMARY_API_URL;

let activeApiUrl = PRIMARY_API_URL;
let csrfToken = null;

export function getActiveApiUrl() {
  return activeApiUrl;
}

export function buildApiUrl(endpoint, baseUrl = activeApiUrl) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  return `${baseUrl}${path}`;
}

export async function fetchWithFallback(endpoint, options = {}) {
  const url = buildApiUrl(endpoint, activeApiUrl);
  try {
    const response = await fetch(url, options);
    if (
      activeApiUrl !== FALLBACK_API_URL &&
      FALLBACK_API_URL &&
      [502, 503, 504].includes(response.status)
    ) {
      console.warn(`[API] Primary backend (${activeApiUrl}) returned ${response.status}. Trying fallback ${FALLBACK_API_URL}`);
      try {
        const fbRes = await fetch(buildApiUrl(endpoint, FALLBACK_API_URL), options);
        activeApiUrl = FALLBACK_API_URL;
        csrfToken = null;
        return fbRes;
      } catch {
        return response;
      }
    }
    return response;
  } catch (err) {
    if (activeApiUrl !== FALLBACK_API_URL && FALLBACK_API_URL && err?.name !== 'AbortError') {
      console.warn(`[API] Primary backend (${activeApiUrl}) unavailable (${err.message}). Trying fallback ${FALLBACK_API_URL}`);
      try {
        const fbRes = await fetch(buildApiUrl(endpoint, FALLBACK_API_URL), options);
        activeApiUrl = FALLBACK_API_URL;
        csrfToken = null;
        return fbRes;
      } catch {
        // Keep primary URL active if fallback is also unreachable
        throw err;
      }
    }
    throw err;
  }
}

export async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetchWithFallback('/api/auth/csrf-token', {
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success && data.csrfToken) {
      csrfToken = data.csrfToken;
    }
  } catch (err) {
    console.warn('[API] Failed to pre-fetch CSRF token:', err);
  }
  return csrfToken;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('sahatn_token');
  const lang = getCurrentLang();
  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': lang,
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Include anti-CSRF token on mutation requests (POST, PUT, DELETE, PATCH)
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrf = await getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const response = await fetchWithFallback(endpoint, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMsg = (lang === 'ar' && data.messageAr)
      ? data.messageAr
      : (data.message || data.error || `HTTP error ${response.status}`);
    const localizedMsg = translateAlertMessage(rawMsg, lang);
    const error = new Error(localizedMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (data && typeof data === 'object' && data.message) {
    const rawSuccess = (lang === 'ar' && data.messageAr) ? data.messageAr : data.message;
    data.message = translateAlertMessage(rawSuccess, lang);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  googleLogin: (payload) => apiRequest('/api/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  getGoogleConfig: () => apiRequest('/api/auth/google/config'),
  saveGoogleConfig: (payload) => apiRequest('/api/auth/google/config', { method: 'POST', body: JSON.stringify(payload) }),
  verify2FA: (payload) => apiRequest('/api/auth/verify-2fa', { method: 'POST', body: JSON.stringify(payload) }),
  resend2FA: (payload) => apiRequest('/api/auth/resend-2fa', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/api/auth/me'),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyResetCode: (payload) => apiRequest('/api/auth/verify-reset-code', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (payload) => apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  // Doctors
  getDoctors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/doctors${qs ? `?${qs}` : ''}`);
  },
  getDoctorById: (id) => apiRequest(`/api/doctors/${id}`),
  getDoctorSlots: (doctorId, date) => apiRequest(`/api/appointments/available-slots/${doctorId}?dateIso=${encodeURIComponent(date)}`),
  getDoctorSchedule: (doctorId = 'doc-1') => apiRequest(`/api/appointments/schedule/${doctorId}`),
  saveDoctorSchedule: (doctorId = 'doc-1', schedule) => apiRequest(`/api/appointments/schedule/${doctorId}`, { method: 'PUT', body: JSON.stringify(schedule) }),
  getAvailableSlots: (doctorId = 'doc-1', dateIso) => apiRequest(`/api/appointments/available-slots/${doctorId}${dateIso ? `?dateIso=${encodeURIComponent(dateIso)}` : ''}`),
  getAvailableSlotsBatch: (doctorId = 'doc-1', dates = []) => apiRequest(`/api/appointments/available-slots-batch/${doctorId}?dates=${encodeURIComponent(dates.join(','))}`),
  getBlockedSlots: (doctorId = 'doc-1') => apiRequest(`/api/appointments/blocked-slots/${doctorId}`),
  blockSlot: (payload) => apiRequest('/api/appointments/block', { method: 'POST', body: JSON.stringify(payload) }),
  unblockSlot: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/appointments/${id}/cancel${qs ? `?${qs}` : ''}`, { method: 'DELETE' });
  },
  updateDoctor: (doctorId, payload) => apiRequest(`/api/doctors/${doctorId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateDoctorSchedule: (doctorId, schedule) => apiRequest(`/api/appointments/schedule/${doctorId}`, { method: 'PUT', body: JSON.stringify(schedule) }),

  // Appointments
  getAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/appointments${qs ? `?${qs}` : ''}`);
  },
  createAppointment: (payload) => apiRequest('/api/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  cancelAppointment: (id) => apiRequest(`/api/appointments/${id}/cancel`, { method: 'PUT' }),
  updateAppointment: (id, payload) => apiRequest(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  completeAppointment: (id, payload = {}) => apiRequest(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', ...payload }) }),

  // Queue
  getQueue: (doctorId) => apiRequest(`/api/queue${doctorId ? `?doctorId=${doctorId}` : ''}`),
  callNextPatient: (doctorId) => apiRequest(`/api/queue/call-next`, { method: 'POST', body: JSON.stringify({ doctorId }) }),
  setDelay: (doctorId, minutes) => apiRequest('/api/queue/delay', { method: 'POST', body: JSON.stringify({ doctorId, minutes }) }),

  // Patient
  getPatientProfile: (params = {}) => {
    if (typeof params === 'string') {
      return apiRequest(`/api/patient/profile?patientId=${encodeURIComponent(params)}`);
    }
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const qs = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/api/patient/profile${qs ? `?${qs}` : ''}`);
  },
  updateHealthRecord: (payload) => apiRequest('/api/patient/health-record', { method: 'PUT', body: JSON.stringify(payload) }),
  addMedicalDocument: (payload) => apiRequest('/api/patient/documents', { method: 'POST', body: JSON.stringify(payload) }),
  addDependent: (payload) => apiRequest('/api/patient/dependents', { method: 'POST', body: JSON.stringify(payload) }),

  // Prescriptions
  getPrescriptions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/prescriptions${qs ? `?${qs}` : ''}`);
  },
  createPrescription: (payload) => apiRequest('/api/prescriptions', { method: 'POST', body: JSON.stringify(payload) }),
  verifyPrescription: (hash) => apiRequest(`/api/prescriptions/verify/${hash}`),

  // Admin Core & Analytics
  getAdminStats: () => apiRequest('/api/admin/stats'),
  getAdminAnalytics: () => apiRequest('/api/admin/analytics'),
  verifyAdminSession: () => apiRequest('/api/admin/verify-session'),

  // Admin Tables & CRUD
  getDatabaseDump: () => apiRequest('/api/admin/database/dump'),
  getDatabaseTable: (table) => apiRequest('/api/admin/table/' + table),
  createTableRow: (table, row) => apiRequest('/api/admin/table/' + table + '/row', { method: 'POST', body: JSON.stringify(row) }),
  updateTableRow: (table, id, row) => apiRequest('/api/admin/table/' + table + '/row/' + id, { method: 'PUT', body: JSON.stringify(row) }),
  deleteTableRow: (table, id) => apiRequest('/api/admin/table/' + table + '/row/' + id, { method: 'DELETE' }),

  // Admin Praticiens Demandes
  getPraticienRequests: () => apiRequest('/api/admin/praticiens/requests'),
  approvePraticienRequest: (id) => apiRequest('/api/admin/praticiens/approve', { method: 'POST', body: JSON.stringify({ id }) }),
  rejectPraticienRequest: (id, optionsOrReason) => {
    let payload = { id };
    if (typeof optionsOrReason === 'string') {
      payload.reason = optionsOrReason;
      payload.denialReason = optionsOrReason;
      payload.type = 'PERMANENT';
    } else if (optionsOrReason && typeof optionsOrReason === 'object') {
      payload = { id, ...optionsOrReason };
    }
    return apiRequest('/api/admin/praticiens/reject', { method: 'POST', body: JSON.stringify(payload) });
  },
  rejectUser: (id, optionsOrReason) => {
    let payload = { id };
    if (typeof optionsOrReason === 'string') {
      payload.reason = optionsOrReason;
      payload.type = 'PERMANENT';
    } else if (optionsOrReason && typeof optionsOrReason === 'object') {
      payload = { id, ...optionsOrReason };
    }
    return apiRequest('/api/admin/users/reject', { method: 'POST', body: JSON.stringify(payload) });
  },
  resetPraticienRequest: (id) => apiRequest('/api/admin/praticiens/reset', { method: 'POST', body: JSON.stringify({ id }) }),
  createTestPraticienRequest: () => apiRequest('/api/admin/praticiens/test-create', { method: 'POST' }),

  // Admin SQL Console & Postgres
  executeSql: (query) => apiRequest('/api/admin/sql', { method: 'POST', body: JSON.stringify({ query }) }),
  getPostgresStatus: () => apiRequest('/api/admin/database/postgres-status'),
  syncPostgres: (direction = 'both') => apiRequest('/api/admin/database/postgres-sync', { method: 'POST', body: JSON.stringify({ direction }) }),

  // Admin Security & Audit
  getSecurityOverview: () => apiRequest('/api/admin/security/overview'),
  getActiveSessions: () => apiRequest('/api/admin/security/overview').then(res => ({ success: true, data: res.activeSessions || [] })).catch(() => ({ success: false, data: [] })),
  revokeSession: (token, sessionId, email) => apiRequest('/api/admin/security/revoke-session', { method: 'POST', body: JSON.stringify({ token, sessionId, email }) }),
  getLockedAccounts: () => apiRequest('/api/admin/security/overview').then(res => ({ success: true, data: (res.lockedAccounts || []).filter(a => a.isLocked) })).catch(() => ({ success: false, data: [] })),
  unlockAccount: (email) => apiRequest('/api/admin/security/unlock-account', { method: 'POST', body: JSON.stringify({ email }) }),
  getAuditLogs: () => apiRequest('/api/admin/audit-logs'),
  verifyAuditLedger: () => apiRequest('/api/admin/audit-logs/verify-chain'),
  downloadEncryptedBackup: () => window.open('/api/admin/security/backup-encrypted', '_blank'),

  // Email Config & Logs
  getEmailConfigStatus: () => apiRequest('/api/admin/emails/config-status'),
  sendTestEmail: (email) => apiRequest('/api/admin/emails/test', { method: 'POST', body: JSON.stringify({ email }) }),
  getEmailLogs: () => apiRequest('/api/admin/emails/logs'),
  getEmailPreview: (id) => apiRequest('/api/admin/emails/preview/' + id),

  // Notifications & Broadcasts
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest('/api/notifications' + (qs ? '?' + qs : ''));
  },
  broadcastNotification: (payload) => apiRequest('/api/notifications', { method: 'POST', body: JSON.stringify(payload) }),
  markNotificationRead: (id, read = true) => apiRequest('/api/notifications/' + id + '/read', { method: 'PATCH', body: JSON.stringify({ read }) }),
  markAllNotificationsRead: (payload = {}) => apiRequest('/api/notifications/mark-all-read', { method: 'POST', body: JSON.stringify(payload) }),
  markAllNotificationsUnread: (payload = {}) => apiRequest('/api/notifications/mark-all-unread', { method: 'POST', body: JSON.stringify(payload) }),
  clearNotifications: (params = 'all') => {
    let qs = '';
    if (typeof params === 'string') {
      qs = '?space=' + encodeURIComponent(params);
    } else if (params && typeof params === 'object') {
      qs = '?' + new URLSearchParams(params).toString();
    }
    return apiRequest('/api/notifications' + qs, { method: 'DELETE' });
  },
  deleteNotification: (id) => apiRequest('/api/notifications/' + id, { method: 'DELETE' }),

  // AI DocBot
  queryDocBot: (query, history = []) => apiRequest('/api/ai/docbot', { method: 'POST', body: JSON.stringify({ query, history }) }),

  // Reviews
  getReviews: (doctorId) => apiRequest(`/api/reviews${doctorId ? `?doctorId=${doctorId}` : ''}`),
  submitReview: (payload) => apiRequest('/api/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  replyReview: (payload) => apiRequest('/api/reviews/reply', { method: 'POST', body: JSON.stringify(payload) }),

  // Doctor Onboarding & Account Setup
  getDoctorRequestStatus: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/doctors/request-status${qs ? '?' + qs : ''}`);
  },
  finalizeDoctorAccount: (payload) => apiRequest('/api/doctors/finalize-account', { method: 'POST', body: JSON.stringify(payload) }),
  notifyOnboardingIncomplete: (payload) => apiRequest('/api/doctors/onboarding-incomplete', { method: 'POST', body: JSON.stringify(payload) }),
  requestActivationReactivation: (payload) => apiRequest('/api/doctors/request-reactivation', { method: 'POST', body: JSON.stringify(payload) }),
  reactivatePraticienRequest: (id) => apiRequest('/api/admin/praticiens/reactivate', { method: 'POST', body: JSON.stringify({ id }) }),

  // Real-Time SMS & WhatsApp Communications
  getCommunications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest('/api/communications' + (qs ? '?' + qs : ''));
  },
  sendCommunication: (payload) => apiRequest('/api/communications/send', { method: 'POST', body: JSON.stringify(payload) }),
  replyCommunication: (payload) => apiRequest('/api/communications/reply', { method: 'POST', body: JSON.stringify(payload) }),
  broadcastDelayCommunications: (payload) => apiRequest('/api/communications/broadcast-delay', { method: 'POST', body: JSON.stringify(payload) }),
  getCommunicationPatients: (doctorId) => apiRequest(`/api/communications/patients?doctorId=${encodeURIComponent(doctorId || 'doc-1')}`),
  getWhatsAppStatus: () => apiRequest('/api/communications/whatsapp-status'),
  testWhatsApp: (payload) => apiRequest('/api/communications/test-whatsapp', { method: 'POST', body: JSON.stringify(payload) }),

  // Referral & Liaison Letters
  getReferralLetters: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/doctors/referral-letters${qs ? '?' + qs : ''}`);
  },
  sendReferralLetter: (payload) =>
    apiRequest('/api/doctors/referral-letters', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  markReferralLetterRead: (id) =>
    apiRequest(`/api/doctors/referral-letters/${id}/read`, {
      method: 'PATCH'
    }),

  // Real-Time Translation API (FR <-> AR)
  translate: (text, targetLang = 'ar', sourceLang = 'auto') =>
    apiRequest('/api/ai/translate', { method: 'POST', body: JSON.stringify({ text, targetLang, sourceLang }) }),

  // Doctor Offline Payments & Subscriptions
  getPaymentConfig: () => apiRequest('/api/payments/config'),
  getMyPayments: (doctorId) =>
    apiRequest(`/api/payments/my${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ''}`),
  submitOfflinePayment: (payload) =>
    apiRequest('/api/payments/offline', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminOfflinePayments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/payments/admin/list${qs ? '?' + qs : ''}`);
  },
  approveOfflinePayment: (id) =>
    apiRequest(`/api/payments/admin/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),
  rejectOfflinePayment: (id, rejectionReason) =>
    apiRequest(`/api/payments/admin/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason })
    }),
  fetchPaymentReceiptBlob: async (paymentId) => {
    const token = localStorage.getItem('sahatn_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/receipt`, { headers });
    if (!res.ok) throw new Error('Impossible de charger le justificatif.');
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), contentType: blob.type };
  }
};

export default api;
