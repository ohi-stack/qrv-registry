import { buildWebhookHeaders } from '../../security/webhooks/signature.js'
import { enqueueWebhook } from '../../services/webhook-queue.service.js'

function generateDeliveryId() {
  return `dlv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
}

export function deliverWebhook(webhook, eventName, payload) {
  const deliveryId = generateDeliveryId()
  const body = JSON.stringify({ event: eventName, payload, timestamp: new Date().toISOString() })

  enqueueWebhook({
    execute: async (job) => {
      const headers = buildWebhookHeaders({
        secret: process.env.WEBHOOK_SECRET || 'default_secret',
        payload: body,
        eventName,
        deliveryId,
        attempt: job.attempts + 1
      })

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body
      })

      if (!res.ok) {
        throw new Error(`Webhook failed: ${res.status}`)
      }
    }
  })
}
