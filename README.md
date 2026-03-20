# qrv-registry

Canonical registry service for the QR-V verification network.

## Purpose

This service operates as the authoritative registry layer for `registry.qrv.network`. It stores canonical QR-V records, issuer metadata, hash anchors, revocation state, and audit events. The design aligns with the QR-V registry role as the canonical source of truth for verification operations and deterministic identifier resolution. fileciteturn7file4

## Production Scope

Implemented capabilities:
- health and readiness endpoints
- registry-backed create, lookup, revoke, and audit APIs
- issuer management endpoints
- QRVID generation and SHA-256 hash anchoring
- audit logging on reads and writes
- bearer-token protection for write operations
- PostgreSQL schema for `qr_objects`, `qr_hash_registry`, `qr_certificates`, `qr_issuers`, and `qr_audit_log`
- structured error handling
- graceful shutdown and pool lifecycle management

## Endpoints

### Health
- `GET /health`
- `GET /ready`

### Registry
- `POST /registry/create`
- `GET /registry/:qrvid`
- `GET /registry/hash/:hash`
- `POST /registry/:qrvid/revoke`
- `GET /registry/:qrvid/audit`

### Issuers
- `POST /issuers`
- `GET /issuers`
- `GET /issuers/:issuerId`

## Environment

See `.env.example`.

## Run

```bash
npm install
npm run migrate
npm start
```

## Deploy

Point `registry.qrv.network` to the running Node service. The database should target the PostgreSQL registry datastore described in the deployment record. fileciteturn7file2
