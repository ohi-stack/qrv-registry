import { getAgent } from './agent-registry'

export async function dispatchTask(task) {
  const agent = getAgent(task.agent)
  if (!agent) throw new Error('Agent not found')
  return await agent.execute(task)
}
