export const agentRegistry = new Map()

export function registerAgent(name, agent) {
  agentRegistry.set(name, agent)
}

export function getAgent(name) {
  return agentRegistry.get(name)
}

export function listAgents() {
  return Array.from(agentRegistry.keys())
}
