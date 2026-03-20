import { registerAgent } from './agent-registry'
import { registryAgent } from '../registry-agent/registry.agent'
import { verificationAgent } from '../verification-agent/verification.agent'

registerAgent('registry', registryAgent)
registerAgent('verification', verificationAgent)

console.log('QR-V Agents Initialized:', ['registry', 'verification'])
