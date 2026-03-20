export function issuerAuthMiddleware(req, res, next) {
  const configuredKey = process.env.ISSUER_API_KEY
  if (!configuredKey) {
    return res.status(500).json({ error: 'Issuer auth is not configured' })
  }

  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  if (token !== configuredKey) {
    return res.status(403).json({ error: 'Invalid issuer credentials' })
  }

  next()
}
