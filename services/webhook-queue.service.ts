const queue = []
let processing = false

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function enqueueWebhook(job) {
  queue.push({ ...job, attempts: 0 })
  processQueue()
}

async function processQueue() {
  if (processing) return
  processing = true

  while (queue.length) {
    const job = queue.shift()

    try {
      await job.execute(job)
    } catch (err) {
      job.attempts += 1

      if (job.attempts <= (process.env.WEBHOOK_MAX_RETRIES || 5)) {
        const delay = Math.pow(2, job.attempts) * 1000
        await sleep(delay)
        queue.push(job)
      }
    }
  }

  processing = false
}
