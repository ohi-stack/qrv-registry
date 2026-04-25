import dotenv from 'dotenv'
import pkg from 'pg'

dotenv.config()
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
CREATE TABLE IF NOT EXISTS qr_objects (
 id SERIAL PRIMARY KEY,
 qrvid VARCHAR(120) UNIQUE NOT NULL,
 record_type VARCHAR(80) NOT NULL,
 issuer VARCHAR(255) NOT NULL,
 owner VARCHAR(255),
 hash TEXT NOT NULL,
 status VARCHAR(40) DEFAULT 'verified',
 created_at TIMESTAMP DEFAULT NOW(),
 updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS qr_audit_log (
 id SERIAL PRIMARY KEY,
 qrvid VARCHAR(120) NOT NULL,
 event_type VARCHAR(80) NOT NULL,
 metadata JSONB,
 created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qr_objects_qrvid ON qr_objects(qrvid);
CREATE INDEX IF NOT EXISTS idx_qr_audit_qrvid ON qr_audit_log(qrvid);
`;

try {
 await pool.query(sql)
 console.log('Migration complete')
} catch (e) {
 console.error(e)
 process.exit(1)
} finally {
 await pool.end()
}
