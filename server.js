import express from 'express';
import crypto from 'crypto';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || '1.2.0';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';
const STARTED_AT = new Date().toISOString();

const registryRecords = new Map([
  ['QRV-DEMO-001', {
    qrvid: 'QRV-DEMO-001',
    status: 'VERIFIED',
    state: 'VERIFIED',
    recordType: 'Certificate',
    title: 'QR-V Demo Verified Certificate',
    subject: 'Demo Certificate Holder',
    issuer: 'QR-V Demo Issuer',
    issuedAt: '2026-04-27T00:00:00.000Z',
    expiresAt: null,
    hash: 'SHA256:DEMO001-CERTIFICATE-HASH',
    visibility: 'public'
  }],
  ['QRV-DEMO-002', {
    qrvid: 'QRV-DEMO-002',
    status: 'VERIFIED',
    state: 'VERIFIED',
    recordType: 'Product',
    title: 'QR-V Demo Product Authentication',
    subject: 'Demo Product Serial PRD-0002',
    issuer: 'QR-V Demo Manufacturer',
    issuedAt: '2026-04-27T00:00:00.000Z',
    expiresAt: null,
    hash: 'SHA256:DEMO002-PRODUCT-HASH',
    visibility: 'public'
  }],
  ['QRV-DEMO-003', {
    qrvid: 'QRV-DEMO-003',
    status: 'VERIFIED',
    state: 'VERIFIED',
    recordType: 'Membership',
    title: 'QR-V Demo Membership Credential',
    subject: 'Demo Member M-0003',
    issuer: 'QR-V Demo Membership Authority',
    issuedAt: '2026-04-27T00:00:00.000Z',
    expiresAt: null,
    hash: 'SHA256:DEMO003-MEMBERSHIP-HASH',
    visibility: 'public'
  }],
  ['QRV-DEMO-REVOKED', {
    qrvid: 'QRV-DEMO-REVOKED',
    status: 'REVOKED',
    state: 'REVOKED',
    recordType: 'Certificate',
    title: 'QR-V Demo Revoked Certificate',
    subject: 'Revoked Demo Holder',
    issuer: 'QR-V Demo Issuer',
    issuedAt: '2026-04-27T00:00:00.000Z',
    revokedAt: '2026-04-27T12:00:00.000Z',
    hash: 'SHA256:DEMO-REVOKED-HASH',
    visibility: 'public'
  }],
  ['QRV-DEMO-EXPIRED', {
    qrvid: 'QRV-DEMO-EXPIRED',
    status: 'EXPIRED',
    state: 'EXPIRED',
    recordType: 'Certificate',
    title: 'QR-V Demo Expired Certificate',
    subject: 'Expired Demo Holder',
    issuer: 'QR-V Demo Issuer',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    hash: 'SHA256:DEMO-EXPIRED-HASH',
    visibility: 'public'
  }]
]);

const QRVID_FORMAT = /^QRV-[A-Z0-9][A-Z0-9-]{2,127}$/;

function normalizeQrvid(rawValue) {
  try {
    return decodeURIComponent(String(rawValue || '').trim()).toUpperCase().replace(/\s+/g, '');
  } catch (_error) {
    return '';
  }
}

function canonicalUrl(qrvid) {
  return `${VERIFY_BASE_URL}/${encodeURIComponent(qrvid)}`;
}

function createQrvid() {
  return `QRV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function hashRecord(record) {
  return `SHA256:${crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex').toUpperCase()}`;
}

function verifyPayload(qrvidRaw) {
  const qrvid = normalizeQrvid(qrvidRaw);
  const checkedAt = new Date().toISOString();

  if (!QRVID_FORMAT.test(qrvid)) {
    return { statusCode: 422, body: { ok: false, verified: false, service: 'qrv-registry', qrvid, state: 'INVALID_FORMAT', status: 'INVALID_FORMAT', message: 'QRVID format is invalid.', checkedAt } };
  }

  const record = registryRecords.get(qrvid);
  if (!record) {
    return { statusCode: 404, body: { ok: false, verified: false, service: 'qrv-registry', qrvid, state: 'NOT_FOUND', status: 'NOT_FOUND', message: 'No registry record was found for this QRVID.', canonicalUrl: canonicalUrl(qrvid), checkedAt } };
  }

  const isVerified = record.state === 'VERIFIED';
  return { statusCode: 200, body: { ok: isVerified, verified: isVerified, service: 'qrv-registry', ...record, canonicalUrl: canonicalUrl(qrvid), checkedAt } };
}

function sanitizeText(value, fallback = '') {
  return String(value || fallback).trim().slice(0, 500);
}

function createRecord(payload) {
  const now = new Date().toISOString();
  const requestedQrvid = normalizeQrvid(payload.qrvid || '');
  const qrvid = requestedQrvid && QRVID_FORMAT.test(requestedQrvid) ? requestedQrvid : createQrvid();

  const record = {
    qrvid,
    status: 'VERIFIED',
    state: 'VERIFIED',
    recordType: sanitizeText(payload.recordType || payload.type, 'Certificate'),
    title: sanitizeText(payload.title || payload.assetName, 'Untitled QR-V Record'),
    subject: sanitizeText(payload.subject || payload.holder || payload.owner, 'Not provided'),
    issuer: sanitizeText(payload.issuer || payload.issuerName, 'QR-V Issuer'),
    description: sanitizeText(payload.description, ''),
    issuedAt: now,
    expiresAt: payload.expiresAt || null,
    visibility: payload.visibility || 'public'
  };

  record.hash = hashRecord(record);
  registryRecords.set(qrvid, record);
  return record;
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR-V Registry Service</title><style>body{font-family:Inter,Arial,sans-serif;background:#fff;color:#0f172a;margin:0}.wrap{max-width:760px;margin:14vh auto;padding:32px;border:1px solid #dbe3ef;border-radius:24px}h1{font-size:clamp(42px,8vw,72px);line-height:1.04}.k{font-weight:800}code{background:#f1f5f9;padding:4px 8px;border-radius:8px}</style></head><body><main class="wrap"><h1>QR-V Registry Service</h1><p><span class="k">Status:</span> Running</p><p><span class="k">Service:</span> qrv-registry</p><p><span class="k">Version:</span> ${VERSION}</p><p><span class="k">Started:</span> ${STARTED_AT}</p><p>This is the registry API for QR-V verification records. Public verification should resolve through <code>verify.qrv.network</code>.</p><p>Health: <code>/health</code> · Readiness: <code>/ready</code> · Version: <code>/version</code> · Verify: <code>/verify/QRV-DEMO-001</code> · Create: <code>POST /records</code></p></main></body></html>`);
});

app.get('/health', (_req, res) => res.json({ ok: true, status: 'ok', service: 'qrv-registry', version: VERSION }));
app.get('/healthz', (_req, res) => res.json({ ok: true, status: 'ok', service: 'qrv-registry', version: VERSION }));
app.get('/ready', (_req, res) => res.json({ ok: true, ready: true, service: 'qrv-registry', records: registryRecords.size }));
app.get('/readyz', (_req, res) => res.json({ ok: true, ready: true, service: 'qrv-registry', records: registryRecords.size }));
app.get('/version', (_req, res) => res.json({ ok: true, service: 'qrv-registry', version: VERSION, startedAt: STARTED_AT }));

app.get('/records/demo', (_req, res) => res.json({ ok: true, service: 'qrv-registry', records: Array.from(registryRecords.values()).filter((record) => record.qrvid.includes('DEMO')) }));
app.get('/records', (_req, res) => res.json({ ok: true, service: 'qrv-registry', records: Array.from(registryRecords.values()) }));

app.post('/records', (req, res) => {
  const record = createRecord(req.body || {});
  res.status(201).json({ ok: true, service: 'qrv-registry', record, canonicalUrl: canonicalUrl(record.qrvid) });
});

app.post('/registry/create', (req, res) => {
  const record = createRecord(req.body || {});
  res.status(201).json({ ok: true, service: 'qrv-registry', record, canonicalUrl: canonicalUrl(record.qrvid) });
});

app.get('/verify/:qrvid', (req, res) => {
  const { statusCode, body } = verifyPayload(req.params.qrvid);
  return res.status(statusCode).json(body);
});

app.get('/registry/verify/:qrvid', (req, res) => {
  const { statusCode, body } = verifyPayload(req.params.qrvid);
  return res.status(statusCode).json(body);
});

app.use((req, res) => {
  res.status(404).json({ ok: false, service: 'qrv-registry', error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
});

app.listen(PORT, '0.0.0.0', () => console.log(`qrv-registry running on 0.0.0.0:${PORT}`));
