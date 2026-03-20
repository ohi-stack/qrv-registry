import pkg from 'pg'
import crypto from 'crypto'
import { triggerWebhookEvent } from '../../api/controllers/webhook.controller.js'

const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function generateQrvid() {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `QRV-${ts}-${rand}`.toUpperCase()
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex')
}

async function logAudit(qrvid, eventType, metadata = {}) {
  await pool.query(
    'INSERT INTO qr_audit_log (qrvid, event_type, metadata) VALUES ($1,$2,$3)',
    [qrvid, eventType, metadata]
  )
}

export const registryAgent = {
  name: 'registry',
  async execute(task) {
    switch (task.type) {
      case 'registry.create': {
        const { recordType, issuer, owner, data } = task.payload || {}
        if (!recordType || !issuer) {
          throw new Error('recordType and issuer are required')
        }

        const qrvid = generateQrvid()
        const hash = hashPayload(data)

        const insert = await pool.query(
          `INSERT INTO qr_objects (qrvid, record_type, issuer, owner, status, hash)
           VALUES ($1,$2,$3,$4,'valid',$5)
           RETURNING qrvid, record_type, issuer, owner, status, hash, created_at`,
          [qrvid, recordType, issuer, owner || null, hash]
        )

        await logAudit(qrvid, 'record.created', { issuer, recordType })

        await triggerWebhookEvent('record.created', {
          qrvid,
          issuer,
          recordType,
          hash
        })

        return {
          status: 'VERIFIED',
          qrvid,
          issuer,
          recordType,
          hash,
          record: insert.rows[0]
        }
      }

      case 'registry.query': {
        const { qrvid } = task.payload || {}
        if (!qrvid) throw new Error('qrvid is required')

        const result = await pool.query(
          `SELECT qrvid, record_type, issuer, owner, status, hash, created_at, updated_at
           FROM qr_objects WHERE qrvid = $1`,
          [qrvid]
        )

        if (!result.rows.length) {
          await logAudit(qrvid, 'record.query.not_found', {})
          return { status: 'NOT_FOUND', qrvid }
        }

        await logAudit(qrvid, 'record.queried', {})
        return result.rows[0]
      }

      case 'registry.revoke': {
        const { qrvid, reason } = task.payload || {}
        if (!qrvid) throw new Error('qrvid is required')

        const result = await pool.query(
          `UPDATE qr_objects
           SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
           WHERE qrvid = $1
           RETURNING qrvid, record_type, issuer, owner, status, hash, created_at, updated_at`,
          [qrvid]
        )

        if (!result.rows.length) {
          await logAudit(qrvid, 'record.revoke.not_found', { reason: reason || null })
          return { status: 'NOT_FOUND', qrvid }
        }

        await logAudit(qrvid, 'record.revoked', { reason: reason || null })

        await triggerWebhookEvent('record.revoked', {
          qrvid,
          reason: reason || null
        })

        return {
          status: 'REVOKED',
          qrvid,
          reason: reason || null,
          record: result.rows[0]
        }
      }

      default:
        throw new Error(`Unsupported registry task type: ${task.type}`)
    }
  }
}
