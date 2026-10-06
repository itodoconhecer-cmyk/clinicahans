import { config } from '../config.js';
import { session } from '../state/session.js';

export class ApiError extends Error {
  constructor(message, status, code, correlationId, fieldErrors = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  const token = session.get()?.accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers });
  const correlationId = response.headers.get('X-Correlation-Id');
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (response.status === 401) {
    session.clear();
    window.location.hash = '#/login';
    throw new ApiError('Sessão expirada ou credenciais inválidas.', 401, 'UNAUTHORIZED', correlationId);
  }

  if (!response.ok) {
    throw new ApiError(
      body?.message || (response.status === 403 ? 'Acesso negado para esta operação.' : 'Erro ao acessar o servidor.'),
      response.status,
      body?.code,
      body?.correlationId || correlationId,
      body?.fieldErrors || []
    );
  }
  return body;
}

export const api = {
  get: path => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: path => request(path, { method: 'DELETE' })
};

export const authApi = {
  login: (username, password) => api.post('/api/v1/auth/login', { username, password })
};

export const patientApi = {
  search: (q = '', limit = 30) => api.get(`/api/v1/patients?q=${encodeURIComponent(q)}&limit=${limit}`),
  get: id => api.get(`/api/v1/patients/${id}`),
  create: body => api.post('/api/v1/patients', body),
  update: (id, body) => api.put(`/api/v1/patients/${id}`, body)
};

export const doctorApi = {
  search: (q = '', limit = 30) => api.get(`/api/v1/doctors?q=${encodeURIComponent(q)}&limit=${limit}`),
  get: id => api.get(`/api/v1/doctors/${id}`),
  specialties: () => api.get('/api/v1/doctors/specialties'),
  create: body => api.post('/api/v1/doctors', body),
  createSpecialty: body => api.post('/api/v1/doctors/specialties', body),
  availability: id => api.get(`/api/v1/doctors/${id}/availability`),
  addAvailability: (id, body) => api.post(`/api/v1/doctors/${id}/availability`, body),
  blocks: (id, from, to) => api.get(`/api/v1/doctors/${id}/blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  addBlock: (id, body) => api.post(`/api/v1/doctors/${id}/blocks`, body),
  linkSpecialty: (id, specialtyId, primary = false) => api.post(`/api/v1/doctors/${id}/specialties/${specialtyId}?primary=${primary}`),
  linkUser: (id, userId) => api.post(`/api/v1/doctors/${id}/user-link`, { userId })
};

export const appointmentApi = {
  list: (from, to, doctorId) => api.get(`/api/v1/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${doctorId ? `&doctorId=${doctorId}` : ''}`),
  create: body => api.post('/api/v1/appointments', body),
  transition: (id, target, reason) => api.post(`/api/v1/appointments/${id}/transition`, { target, reason })
};

export const waitlistApi = {
  list: () => api.get('/api/v1/waitlist'),
  create: body => api.post('/api/v1/waitlist', body),
  convert: (id, body) => api.post(`/api/v1/waitlist/${id}/convert`, body)
};

export const clinicalApi = {
  snapshot: patientId => api.get(`/api/v1/clinical/patients/${patientId}/safety-snapshot`),
  timeline: patientId => api.get(`/api/v1/clinical/patients/${patientId}/timeline`),
  documents: patientId => api.get(`/api/v1/clinical/patients/${patientId}/documents`),
  startEncounter: appointmentId => api.post('/api/v1/clinical/encounters/start', { appointmentId }),
  saveDraft: (id, body) => api.put(`/api/v1/clinical/encounters/${id}/draft`, body),
  finalize: (id, version) => api.post(`/api/v1/clinical/encounters/${id}/finalize`, { version }),
  addAddendum: (id, body) => api.post(`/api/v1/clinical/encounters/${id}/addenda`, body),
  addAllergy: (patientId, body) => api.post(`/api/v1/clinical/patients/${patientId}/allergies`, body),
  addMedication: (patientId, body) => api.post(`/api/v1/clinical/patients/${patientId}/medications`, body),
  addCondition: (patientId, body) => api.post(`/api/v1/clinical/patients/${patientId}/conditions`, body),
  addAlert: (patientId, body) => api.post(`/api/v1/clinical/patients/${patientId}/alerts`, body),
  deactivateAlert: (patientId, alertId) => api.delete(`/api/v1/clinical/patients/${patientId}/alerts/${alertId}`),
  addDocument: (patientId, body) => api.post(`/api/v1/clinical/patients/${patientId}/documents`, body)
};

export const continuityApi = {
  pendingExams: () => api.get('/api/v1/continuity/exams/pending'),
  createExam: body => api.post('/api/v1/continuity/exams', body),
  receiveResult: (id, body) => api.post(`/api/v1/continuity/exams/${id}/result`, body),
  reviewResult: (id, note) => api.post(`/api/v1/continuity/results/${id}/review`, { note }),
  followUps: () => api.get('/api/v1/continuity/follow-ups/operational'),
  createFollowUp: body => api.post('/api/v1/continuity/follow-ups', body),
  addFollowUpAction: (id, body) => api.post(`/api/v1/continuity/follow-ups/${id}/actions`, body)
};

export const financeApi = {
  list: (from, to) => api.get(`/api/v1/finance/receivables?from=${from}&to=${to}`),
  create: body => api.post('/api/v1/finance/receivables', body),
  pay: (id, body) => api.post(`/api/v1/finance/receivables/${id}/payments`, body)
};

export const managementApi = {
  dashboard: (from, to) => api.get(`/api/v1/management/dashboard?from=${from}&to=${to}`)
};

export const adminApi = {
  users: () => api.get('/api/v1/admin/users'),
  createUser: body => api.post('/api/v1/admin/users', body),
  deactivateUser: id => api.post(`/api/v1/admin/users/${id}/deactivate`),
  audit: (entityType = '', entityId = '') => api.get(`/api/v1/audit?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`)
};
