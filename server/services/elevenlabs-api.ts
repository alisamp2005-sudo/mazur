import axios from 'axios';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

interface CallDetails {
  conversation_id: string;
  agent_id: string;
  status: 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';
  transcript: Array<{
    role: 'user' | 'agent';
    message: string;
    time_in_call_secs: number;
  }>;
  metadata?: {
    start_time_unix_secs: number;
    call_duration_secs: number;
  };
  has_audio: boolean;
  has_user_audio: boolean;
  has_response_audio: boolean;
}

/**
 * Fetch call details including transcript from ElevenLabs API
 */
export async function getCallDetails(conversationId: string, apiKey: string): Promise<CallDetails | null> {
  try {
    const response = await axios.get(
      `${ELEVENLABS_API_BASE}/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': apiKey
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`[ElevenLabs API] Failed to fetch call details for ${conversationId}:`, error.message);
    return null;
  }
}

/**
 * Download call recording audio from ElevenLabs API
 * Returns audio buffer that can be sent to Telegram
 */
export async function downloadCallAudio(conversationId: string, apiKey: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(
      `${ELEVENLABS_API_BASE}/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`[ElevenLabs API] Failed to download audio for ${conversationId}:`, error.message);
    return null;
  }
}



/**
 * Format transcript for Telegram message
 */
export function formatTranscript(transcript: Array<{ role: string; message: string }>): string {
  if (!transcript || transcript.length === 0) {
    return 'No transcript available';
  }

  return transcript
    .map(entry => {
      const role = entry.role === 'agent' ? '🤖 AI' : '👤 User';
      return `${role}: ${entry.message}`;
    })
    .join('\n\n');
}
