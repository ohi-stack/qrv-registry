import pkg from 'pg'
import crypto from 'crypto'

const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex')
}

export async function createRecord(req, res, next) {
  try {
    const { type, issuer, owner, payload } = req.body
    if (!type || !issuer) return res.status(400).json({ error: 'missing fields' })

    const qrvid = `QRV-${Date.now()}`
    const hash = hashPayload(payload)

    await pool.query(
      `INSERT INTO qr_objects (qrvid, record_type, issuer, owner, hash) VALUES ($1,$2,$3,$4,$5)`,
      [qrvid, type, issuer, owner || null, hash]
    )

    res.json({ qrvid, hash })
  } catch (e) {
    next(e)
  }
}

export async function getRecord(req, res, next) {
  try {
    const r = await pool.query(`SELECT * FROM qr_objects WHERE qrvid=$1`, [req.params.qrvid])
    if (!r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json(r.rows[0])
  } catch (e) {
    next(e)
  }
}

export async function revokeRecord(req, res, next) {
  try {
    await pool.query(`UPDATE qr_objects SET status='revoked' WHERE qrvid=$1`, [req.params.qrvid])
    res.json({ status: 'revoked' })
  } catch (e) {
    next(e)
  }
}
