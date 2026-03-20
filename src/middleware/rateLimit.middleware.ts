const requests = new Map()

export function rateLimitMiddleware({ windowMs = 60000, max = 60 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress
    const now = Date.now()

    if (!requests.has(ip)) {
      requests.set(ip, [])
    }

    const timestamps = requests.get(ip).filter(ts => now - ts < windowMs)
    timestamps.push(now)
    requests.set(ip, timestamps)

    if (timestamps.length > max) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    next()
  }
}
