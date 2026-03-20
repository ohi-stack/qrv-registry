import crypto from 'crypto'

export function signWebhookPayload(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function buildWebhookHeaders({ secret, payload, eventName, deliveryId, attempt }) {
  const signature = signWebhookPayload(secret, payload)

  return {
    'Content-Type': 'application/json',
    'X-QRV-Event': eventName,
    'X-QRV-Delivery-Id': deliveryId,
    'X-QRV-Attempt': String(attempt),
    'X-QRV-Signature': `sha256=${signature}`
  }
}
