import { ENV } from "./_core/env";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io";

interface UpdateAgentPromptParams {
  agentId: string;
  prompt: string;
  firstMessage?: string;
}

/**
 * Update an ElevenLabs agent's prompt and first message via API
 */
export async function updateAgentPrompt(params: UpdateAgentPromptParams): Promise<void> {
  const { agentId, prompt, firstMessage } = params;

  const requestBody: any = {
    conversation_config: {
      agent: {
        prompt,
      },
    },
  };

  // Only include first_message if provided
  if (firstMessage) {
    requestBody.conversation_config.agent.first_message = firstMessage;
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": ENV.elevenlabsApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update agent prompt: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result = await response.json();
  console.log(`[ElevenLabs] Agent ${agentId} prompt updated successfully`);
  return result;
}

/**
 * Get agent details from ElevenLabs API
 */
export async function getAgent(agentId: string): Promise<any> {
  const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents/${agentId}`, {
    method: "GET",
    headers: {
      "xi-api-key": ENV.elevenlabsApiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get agent: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}
