import { AgentStepHud as SharedAgentStepHud } from '@siteed/agentic-dev'
import { registerAgenticStepHudCallback } from '../agentic-bridge'

export function AgentStepHud() {
  return <SharedAgentStepHud register={registerAgenticStepHudCallback} />
}
