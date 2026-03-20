import { enqueueWebhookJob } from '../../services/redis-queue.service.js'

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
  const matches = Array.from(webhookStore.values()).filter(
    webhook => webhook.isActive && webhook.events.includes(eventName)
  )

  for (const webhook of matches) {
    await enqueueWebhookJob({
      webhook,
      eventName,
      payload
    })
  }

  return matches.map(webhook => ({
    webhookId: webhook.id,
    url: webhook.url,
    queued: true
  }))
}
