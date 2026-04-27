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

CREATE TABLE IF NOT EXISTS qr_issuers (
 id SERIAL PRIMARY KEY,
 issuer_id VARCHAR(120) UNIQUE NOT NULL,
 issuer_name VARCHAR(255) NOT NULL,
 status VARCHAR(40) DEFAULT 'active',
 created_at TIMESTAMP DEFAULT NOW(),
 updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_hash_registry (
 id SERIAL PRIMARY KEY,
 qrvid VARCHAR(120) NOT NULL,
 hash TEXT NOT NULL,
 algorithm VARCHAR(40) DEFAULT 'sha256',
 created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_certificates (
 id SERIAL PRIMARY KEY,
 qrvid VARCHAR(120) UNIQUE NOT NULL,
 recipient_name VARCHAR(255),
 certificate_title VARCHAR(255),
 issuer_name VARCHAR(255),
 issue_date DATE,
 expiration_date DATE,
 status VARCHAR(40) DEFAULT 'verified',
 created_at TIMESTAMP DEFAULT NOW(),
 updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_objects_qrvid ON qr_objects(qrvid);
CREATE INDEX IF NOT EXISTS idx_qr_objects_status ON qr_objects(status);
CREATE INDEX IF NOT EXISTS idx_qr_objects_hash ON qr_objects(hash);
CREATE INDEX IF NOT EXISTS idx_qr_audit_qrvid ON qr_audit_log(qrvid);
CREATE INDEX IF NOT EXISTS idx_qr_issuers_issuer_id ON qr_issuers(issuer_id);
CREATE INDEX IF NOT EXISTS idx_qr_hash_registry_qrvid ON qr_hash_registry(qrvid);
CREATE INDEX IF NOT EXISTS idx_qr_certificates_qrvid ON qr_certificates(qrvid);

DROP VIEW IF EXISTS registry_records;
CREATE VIEW registry_records AS
SELECT
  qrvid,
  record_type AS "recordType",
  record_type AS type,
  COALESCE(owner, '') AS subject,
  COALESCE(owner, '') AS title,
  issuer,
  owner,
  hash,
  CASE
    WHEN LOWER(COALESCE(status, '')) IN ('verified', 'valid', 'active') THEN 'active'
    WHEN LOWER(status) = 'revoked' THEN 'revoked'
    WHEN LOWER(status) = 'expired' THEN 'expired'
    ELSE COALESCE(status, 'unknown')
  END AS status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM qr_objects;
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
