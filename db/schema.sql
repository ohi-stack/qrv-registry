CREATE TABLE qr_certificates (
  id SERIAL PRIMARY KEY,
  qrvid VARCHAR(255) UNIQUE NOT NULL,
  record_type VARCHAR(50),
  issuer VARCHAR(255),
  owner VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  hash TEXT,
  signature TEXT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_issuers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  public_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_audit_log (
  id SERIAL PRIMARY KEY,
  qrvid VARCHAR(255),
  event_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
