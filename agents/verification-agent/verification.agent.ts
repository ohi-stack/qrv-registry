import pkg from 'pg'

const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function normalizeStatus(status) {
  switch (status) {
    case 'valid': return 'VERIFIED'
    case 'revoked': return 'REVOKED'
    case 'expired': return 'EXPIRED'
    default: return 'NOT_FOUND'
  }
}

export const verificationAgent = {
  name: 'verification',
  async execute(task) {
    if (task.type !== 'verification.verify') {
      throw new Error('Unsupported verification task')
    }

    const { qrvid } = task.payload || {}
    if (!qrvid) throw new Error('qrvid is required')

    const result = await pool.query(
      `SELECT qrvid, record_type, issuer, owner, status, hash, created_at, updated_at
       FROM qr_objects WHERE qrvid = $1`,
      [qrvid]
    )

    if (!result.rows.length) {
      return {
        status: 'NOT_FOUND',
        qrvid
      }
    }

    const record = result.rows[0]
    const normalized = normalizeStatus(record.status)

    return {
      status: normalized,
      qrvid: record.qrvid,
      issuer: record.issuer,
      recordType: record.record_type,
      timestamp: record.updated_at || record.created_at,
      hash: record.hash
    }
  }
}
