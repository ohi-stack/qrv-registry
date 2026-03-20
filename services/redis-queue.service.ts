import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
})

export const webhookQueue = new Queue('qrv-webhooks', {
  connection,
  defaultJobOptions: {
    attempts: Number(process.env.WEBHOOK_MAX_RETRIES || 5),
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
})

export async function enqueueWebhookJob(data) {
  return webhookQueue.add('deliver-webhook', data)
}

export { connection as redisConnection }
