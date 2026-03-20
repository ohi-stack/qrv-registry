import { processTask } from '../../agents/runtime/task-processor.js'

export async function verifyRecord(req, res, next) {
  try {
    const result = await processTask({
      id: `verify_${Date.now()}`,
      agent: 'verification',
      type: 'verification.verify',
      payload: {
        qrvid: req.params.qrvid
      }
    })

    res.json(result.result)
  } catch (err) {
    next(err)
  }
}
