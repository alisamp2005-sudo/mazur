/**
 * ElevenLabs Conversational AI API Client
 * Wrapper for ElevenLabs HTTP API calls
 */

interface ElevenLabsCredentials {
  apiKey: string;
}

interface TranscriptMessage {
  role: 'user' | 'agent';
  time_in_call_secs: number;
  message: string;
}

interface ConversationDetails {
  agent_id: string;
  status: 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';
  transcript: TranscriptMessage[];
  metadata: {
    start_time_unix_secs: number;
    call_duration_secs: number;
  };
  conversation_id: string;
  has_audio: boolean;
  has_user_audio: boolean;
  has_response_audio: boolean;
}

/**
 * Make authenticated request to ElevenLabs API
 */
async function makeElevenLabsRequest(
  endpoint: string,
  credentials: ElevenLabsCredentials,
  method: string = 'GET'
): Promise<any> {
  const baseUrl = 'https://api.elevenlabs.io';
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': credentials.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get conversation details including transcript
 */
export async function getConversationDetails(
  credentials: ElevenLabsCredentials,
  conversationId: string
): Promise<ConversationDetails> {
  return makeElevenLabsRequest(
    `/v1/convai/conversations/${conversationId}`,
    credentials
  );
}

/**
 * List all conversations for an agent
 */
export async function listConversations(
  credentials: ElevenLabsCredentials,
  agentId?: string
): Promise<any> {
  const endpoint = agentId
    ? `/v1/convai/conversations?agent_id=${agentId}`
    : '/v1/convai/conversations';
  
  return makeElevenLabsRequest(endpoint, credentials);
}

/**
 * Get conversation audio URL
 */
export async function getConversationAudioUrl(
  credentials: ElevenLabsCredentials,
  conversationId: string
): Promise<string> {
  const endpoint = `/v1/convai/conversations/${conversationId}/audio`;
  const data = await makeElevenLabsRequest(endpoint, credentials);
  return data.audio_url || '';
}
