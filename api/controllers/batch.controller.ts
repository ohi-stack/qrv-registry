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

export async function batchVerify(req, res, next) {
  try {
    const { qrvids } = req.body || {}
    if (!Array.isArray(qrvids) || !qrvids.length) {
      return res.status(400).json({ error: 'qrvids array required' })
    }

    const result = await pool.query(
      `SELECT qrvid, record_type, issuer, status, hash, created_at, updated_at
       FROM qr_objects WHERE qrvid = ANY($1)`,
      [qrvids]
    )

    const map = new Map(result.rows.map(r => [r.qrvid, r]))

    const response = qrvids.map(qrvid => {
      const record = map.get(qrvid)

      if (!record) {
        return { qrvid, status: 'NOT_FOUND' }
      }

      return {
        qrvid: record.qrvid,
        status: normalizeStatus(record.status),
        issuer: record.issuer,
        recordType: record.record_type,
        timestamp: record.updated_at || record.created_at,
        hash: record.hash
      }
    })

    res.json({ results: response })
  } catch (err) {
    next(err)
  }
}
