import { processTask } from '../../agents/runtime/task-processor'

export async function handleTask(req, res) {
  try {
    const result = await processTask(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
