import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const REDACTED = '[REDACTED]';
const PRIVATE_KEYS = /password|token|secret|authorization|cpf|phone|email|birth.?date|notes?|full.?name|patient.?name|doctor.?name/i;

function safeValue(value, key = '') {
  if (PRIVATE_KEYS.test(key)) return REDACTED;
  if (Array.isArray(value)) return value.map(item => safeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, safeValue(childValue, childKey)]));
  }
  return value;
}

function safeUrl(rawUrl) {
  const url = new URL(rawUrl);
  for (const [key, value] of url.searchParams.entries()) {
    if (key.toLowerCase() === 'q' && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      url.searchParams.set(key, REDACTED);
    }
  }
  return `${url.origin}${url.pathname}${url.search}`;
}

function safeJson(text) {
  if (!text) return null;
  try {
    return safeValue(JSON.parse(text));
  } catch {
    return text.length > 5000 ? `${text.slice(0, 5000)}…[truncated]` : text;
  }
}

export class RunRecorder {
  constructor(page, testInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.events = [];
    this.pending = new WeakMap();
    this.pendingResponses = [];
    this.startedAt = new Date().toISOString();

    page.on('request', request => {
      const started = performance.now();
      const entry = {
        kind: 'network',
        method: request.method(),
        url: safeUrl(request.url()),
        startedAt: new Date().toISOString(),
        requestHeaders: this.#safeHeaders(request.headers()),
        requestPayload: safeJson(request.postData() || '')
      };
      this.pending.set(request, { entry, started });
      this.events.push(entry);
    });

    page.on('response', response => {
      const pendingResponse = this.#recordResponse(response);
      this.pendingResponses.push(pendingResponse);
    });
    page.on('requestfailed', request => {
      const pending = this.pending.get(request);
      if (!pending) return;
      pending.entry.failed = request.failure()?.errorText || 'Falha de rede';
      pending.entry.durationMs = Number((performance.now() - pending.started).toFixed(2));
    });
  }

  mark(label, details = {}) {
    this.events.push({ kind: 'step', label, at: new Date().toISOString(), details: safeValue(details) });
  }

  async screenshot(label) {
    const file = this.testInfo.outputPath(`${this.#slug(label)}.png`);
    await this.page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    await this.testInfo.attach(label, { path: file, contentType: 'image/png' });
    this.mark('screenshot', { label, file: path.basename(file), viewport: '1920x1080' });
  }

  async save() {
    await this.flush();
    const report = {
      schemaVersion: 1,
      capturedAt: this.startedAt,
      test: this.testInfo.title,
      viewport: '1920x1080',
      privacy: 'Authorization, credentials, patient and doctor names, clinical notes, and patient contact fields are redacted.',
      events: this.events
    };
    const outputPath = this.testInfo.outputPath('rede-trilha.json');
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await this.testInfo.attach('rede-trilha.json', { path: outputPath, contentType: 'application/json' });
  }

  async flush() {
    await Promise.allSettled(this.pendingResponses);
  }

  async #recordResponse(response) {
    const pending = this.pending.get(response.request());
    if (!pending) return;
    const { entry, started } = pending;
    entry.status = response.status();
    entry.durationMs = Number((performance.now() - started).toFixed(2));
    entry.responseHeaders = this.#safeHeaders(await response.allHeaders());
    const contentType = entry.responseHeaders['content-type'] || '';
    if (contentType.includes('json')) {
      try {
        const body = await response.text();
        entry.responsePayload = safeJson(body);
      } catch {
        entry.responsePayload = '[response body unavailable]';
      }
    }
  }

  #safeHeaders(headers) {
    const allowed = ['content-type', 'x-correlation-id'];
    return Object.fromEntries(allowed.filter(key => headers[key]).map(key => [key, headers[key]]));
  }

  #slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'evidencia';
  }
}
