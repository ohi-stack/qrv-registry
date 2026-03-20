import { dispatchTask } from './agent-dispatcher'

export async function processTask(task) {
  const result = await dispatchTask(task)

  return {
    status: 'success',
    taskId: task.id,
    result,
    timestamp: new Date().toISOString()
  }
}
