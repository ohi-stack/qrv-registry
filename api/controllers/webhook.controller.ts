const webhookStore = new Map()

function generateWebhookId() {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function createWebhook(req, res, next) {
  try {
    const { url, events } = req.body || {}
    if (!url || !Array.isArray(events) || !events.length) {
      return res.status(400).json({ error: 'url and events are required' })
    }

    const webhook = {
      id: generateWebhookId(),
      url,
      events,
      isActive: true,
      createdAt: new Date().toISOString()
    }

    webhookStore.set(webhook.id, webhook)
    res.status(201).json(webhook)
  } catch (err) {
    next(err)
  }
}

export async function listWebhooks(req, res, next) {
  try {
    res.json({ webhooks: Array.from(webhookStore.values()) })
  } catch (err) {
    next(err)
  }
}

export async function triggerWebhookEvent(eventName, payload) {
  const matches = Array.from(webhookStore.values()).filter(webhook => webhook.isActive && webhook.events.includes(eventName))

  const deliveries = await Promise.allSettled(
    matches.map(async webhook => {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, payload, timestamp: new Date().toISOString() })
      })

      return {
        webhookId: webhook.id,
        url: webhook.url,
        delivered: response.ok,
        statusCode: response.status
      }
    })
  )

  return deliveries.map((result, index) => {
    if (result.status === 'fulfilled') return result.value
    return {
      webhookId: matches[index]?.id || null,
      url: matches[index]?.url || null,
      delivered: false,
      error: result.reason?.message || 'delivery_failed'
    }
  })
}
