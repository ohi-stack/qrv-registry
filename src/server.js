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
app.use(express.json())
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const PORT = process.env.PORT || 4000

function generateQRVID() {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `QRV-${ts}-${rand}`.toUpperCase()
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

async function audit(qrvid, event, metadata) {
  await pool.query(
    `INSERT INTO qr_audit_log (qrvid, event_type, metadata) VALUES ($1,$2,$3)`,
    [qrvid, event, metadata]
  )
}

app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.get('/ready', async (_, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ready' })
  } catch {
    res.status(500).json({ status: 'not_ready' })
  }
})

app.post('/registry/create', async (req, res) => {
  const { type, issuer, owner, payload } = req.body
  if (!type || !issuer) return res.status(400).json({ error: 'missing fields' })

  const qrvid = generateQRVID()
  const hash = hashPayload(payload || {})

  await pool.query(
    `INSERT INTO qr_objects (qrvid, record_type, issuer, owner, hash) VALUES ($1,$2,$3,$4,$5)`,
    [qrvid, type, issuer, owner || null, hash]
  )

  await audit(qrvid, 'create', { issuer, type })
  res.json({ qrvid, hash })
})

app.get('/registry/:qrvid', async (req, res) => {
  const { qrvid } = req.params
  const r = await pool.query(`SELECT * FROM qr_objects WHERE qrvid=$1`, [qrvid])
  if (!r.rows.length) return res.status(404).json({ error: 'not found' })

  await audit(qrvid, 'lookup', {})
  res.json(r.rows[0])
})

app.post('/registry/:qrvid/revoke', async (req, res) => {
  const { qrvid } = req.params
  await pool.query(`UPDATE qr_objects SET status='revoked' WHERE qrvid=$1`, [qrvid])
  await audit(qrvid, 'revoke', {})
  res.json({ status: 'revoked' })
})

app.listen(PORT, () => console.log(`Registry running on ${PORT}`))
