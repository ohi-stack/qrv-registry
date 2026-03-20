import { Worker } from 'bullmq'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { redisConnection } from '../services/redis-queue.service.js'

const secret = process.env.WEBHOOK_SECRET || 'qrv_default_secret'

function signPayload(payload) {
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
}

const worker = new Worker(
  'qrv-webhooks',
  async job => {
    const { webhook, eventName, payload } = job.data

    const body = JSON.stringify({ event: eventName, data: payload })
    const signature = signPayload(payload)

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-QRV-Signature': signature,
        'X-QRV-Event': eventName
      },
      body
    })

    if (!res.ok) {
      throw new Error(`Webhook delivery failed: ${res.status}`)
    }

    return { status: 'delivered', webhookId: webhook.id }
  },
  { connection: redisConnection }
)

worker.on('completed', job => {
  console.log(`Webhook delivered: ${job.id}`)
})

worker.on('failed', (job, err) => {
  console.error(`Webhook failed: ${job?.id}`, err)
})

export default worker
