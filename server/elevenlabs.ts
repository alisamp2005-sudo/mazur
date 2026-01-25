import axios from 'axios';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export interface InitiateCallParams {
  agentId: string;
  agentPhoneNumberId: string;
  toNumber: string;
  conversationInitiationClientData?: Record<string, any>;
}

export interface InitiateCallResponse {
  success: boolean;
  message: string;
  conversation_id: string | null;
  sip_call_id?: string | null; // For SIP Trunk
  callSid?: string | null; // For Twilio (legacy)
}

export interface ConversationDetails {
  agent_id: string;
  conversation_id: string;
  status: 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';
  transcript: Array<{
    role: 'user' | 'agent';
    message: string;
    time_in_call_secs: number;
  }>;
  metadata: {
    start_time_unix_secs: number;
    call_duration_secs: number;
  };
  has_audio: boolean;
  has_user_audio: boolean;
  has_response_audio: boolean;
}

/**
 * Initiate an outbound call via ElevenLabs SIP Trunk
 */
export async function initiateOutboundCall(
  apiKey: string,
  params: InitiateCallParams
): Promise<InitiateCallResponse> {
  try {
    const response = await axios.post<InitiateCallResponse>(
      `${ELEVENLABS_API_URL}/v1/convai/sip-trunk/outbound-call`,
      {
        agent_id: params.agentId,
        agent_phone_number_id: params.agentPhoneNumberId,
        to_number: params.toNumber,
        conversation_initiation_client_data: params.conversationInitiationClientData,
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[ElevenLabs] Failed to initiate call:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initiate call');
  }
}

/**
 * Get conversation details by conversation_id
 */
export async function getConversationDetails(
  apiKey: string,
  conversationId: string
): Promise<ConversationDetails> {
  try {
    const response = await axios.get<ConversationDetails>(
      `${ELEVENLABS_API_URL}/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[ElevenLabs] Failed to get conversation:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to get conversation details');
  }
}

/**
 * Get conversation audio URL (signed URL for downloading)
 */
export async function getConversationAudio(
  apiKey: string,
  conversationId: string
): Promise<{ audio_url: string }> {
  try {
    const response = await axios.get<{ audio_url: string }>(
      `${ELEVENLABS_API_URL}/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[ElevenLabs] Failed to get audio:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to get conversation audio');
  }
}

/**
 * Download audio file from URL and return buffer
 */
export async function downloadAudioFile(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('[ElevenLabs] Failed to download audio:', error.message);
    throw new Error('Failed to download audio file');
  }
}
