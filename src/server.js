import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import pkg from 'pg'
import crypto from 'crypto'

dotenv.config()
const { Pool } = pkg

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))

const VERSION = '1.1.0'
const SERVICE = 'qrv-registry'
const STARTED_AT = new Date().toISOString()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const PORT = process.env.PORT || 4000

function now() {
  return new Date().toISOString()
}

function generateQRVID(type = 'GEN') {
  const prefix = String(type || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'GEN'
  const ts = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `QRV-${prefix}-${ts}-${rand}`
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex')
}

function normalizeStatus(row) {
  if (!row) return 'NOT_FOUND'
  const status = String(row.status || '').toLowerCase()
  if (status === 'revoked') return 'REVOKED'
  if (status === 'expired') return 'EXPIRED'
  return 'VERIFIED'
}

function requireWriteAuth(req, res, next) {
  const expected = process.env.REGISTRY_API_KEY || process.env.ADMIN_API_KEY
  if (!expected) return next()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-api-key']
  if (token !== expected) return res.status(401).json({ status: 'UNAUTHORIZED', error: 'write authorization required' })
  next()
}

async function audit(qrvid, event, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO qr_audit_log (qrvid, event_type, metadata) VALUES ($1,$2,$3)`,
      [qrvid, event, metadata]
    )
  } catch (err) {
    console.error('Audit log failed:', err.message)
  }
}

app.get('/', (_, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR-V Registry Service</title><style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.5;color:#0f172a}.card{max-width:760px;border:1px solid #dbe3ef;border-radius:16px;padding:28px}code{background:#f1f5f9;padding:3px 6px;border-radius:6px}</style></head><body><div class="card"><h1>QR-V Registry Service</h1><p><strong>Status:</strong> Running</p><p><strong>Service:</strong> ${SERVICE}</p><p><strong>Version:</strong> ${VERSION}</p><p><strong>Started:</strong> ${STARTED_AT}</p><p>This is the registry API for QR-V verification records. Public verification should resolve through <code>verify.qrv.network</code>.</p><p>Health: <code>/health</code> · Readiness: <code>/ready</code> · Version: <code>/version</code></p></div></body></html>`)
})

app.get('/health', (_, res) => res.json({ status: 'ok', service: SERVICE, version: VERSION, timestamp: now() }))

app.get('/ready', async (_, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ready', database: 'connected', timestamp: now() })
  } catch (err) {
    res.status(500).json({ status: 'not_ready', database: 'error', error: err.message, timestamp: now() })
  }
})

app.get('/version', (_, res) => res.json({ service: SERVICE, version: VERSION, startedAt: STARTED_AT }))

app.get('/metrics', async (_, res) => {
  try {
    const objects = await pool.query('SELECT COUNT(*)::int AS count FROM qr_objects')
    const audits = await pool.query('SELECT COUNT(*)::int AS count FROM qr_audit_log')
    res.json({ service: SERVICE, version: VERSION, records: objects.rows[0].count, auditEvents: audits.rows[0].count, timestamp: now() })
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message })
  }
})

app.post('/registry/create', requireWriteAuth, async (req, res) => {
  try {
    const { type, issuer, owner, payload } = req.body
    if (!type || !issuer) return res.status(400).json({ status: 'INVALID_REQUEST', error: 'type and issuer are required' })
    const qrvid = generateQRVID(type)
    const hash = hashPayload({ type, issuer, owner, payload })
    await pool.query(
      `INSERT INTO qr_objects (qrvid, record_type, issuer, owner, hash, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [qrvid, type, issuer, owner || null, hash, 'verified']
    )
    await audit(qrvid, 'CREATE', { issuer, type, owner })
    res.status(201).json({ status: 'CREATED', qrvid, verificationStatus: 'VERIFIED', hash, verifyUrl: `https://verify.qrv.network/${qrvid}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'ERROR', error: 'create failed' })
  }
})

app.get('/registry/:qrvid', async (req, res) => {
  try {
    const { qrvid } = req.params
    const r = await pool.query(`SELECT * FROM qr_objects WHERE qrvid=$1`, [qrvid])
    if (!r.rows.length) return res.status(404).json({ status: 'NOT_FOUND', qrvid })
    const record = r.rows[0]
    const verificationStatus = normalizeStatus(record)
    await audit(qrvid, 'LOOKUP', { verificationStatus })
    res.json({ status: verificationStatus, record, timestamp: now() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'ERROR', error: 'lookup failed' })
  }
})

app.get('/verify/:qrvid', async (req, res) => {
  try {
    const { qrvid } = req.params
    const r = await pool.query(`SELECT * FROM qr_objects WHERE qrvid=$1`, [qrvid])
    if (!r.rows.length) return res.status(404).json({ status: 'NOT_FOUND', qrvid, verified: false, timestamp: now() })
    const record = r.rows[0]
    const status = normalizeStatus(record)
    await audit(qrvid, 'VERIFY', { status })
    res.json({ verified: status === 'VERIFIED', status, qrvid, issuer: record.issuer, recordType: record.record_type, owner: record.owner, hash: record.hash, createdAt: record.created_at, timestamp: now() })
  } catch (err) {
    res.status(500).json({ status: 'ERROR', verified: false, error: 'verification failed' })
  }
})

app.get('/registry/hash/:hash', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM qr_objects WHERE hash=$1`, [req.params.hash])
    if (!r.rows.length) return res.status(404).json({ status: 'NOT_FOUND', hash: req.params.hash })
    res.json({ status: 'FOUND', records: r.rows })
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: 'hash lookup failed' })
  }
})

app.get('/registry/:qrvid/audit', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM qr_audit_log WHERE qrvid=$1 ORDER BY created_at DESC LIMIT 100`, [req.params.qrvid])
    res.json({ status: 'OK', qrvid: req.params.qrvid, events: r.rows })
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: 'audit lookup failed' })
  }
})

app.post('/registry/:qrvid/revoke', requireWriteAuth, async (req, res) => {
  try {
    const { qrvid } = req.params
    const result = await pool.query(`UPDATE qr_objects SET status='revoked', updated_at=NOW() WHERE qrvid=$1 RETURNING *`, [qrvid])
    if (!result.rows.length) return res.status(404).json({ status: 'NOT_FOUND', qrvid })
    await audit(qrvid, 'REVOKE', { reason: req.body?.reason || null })
    res.json({ status: 'REVOKED', qrvid, record: result.rows[0] })
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: 'revoke failed' })
  }
})

app.use((_, res) => res.status(404).json({ status: 'NOT_FOUND', error: 'route not found' }))

const server = app.listen(PORT, () => console.log(`Registry running on port ${PORT}`))

async function shutdown() {
  console.log('Shutting down registry service')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
