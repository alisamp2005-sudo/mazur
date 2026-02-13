/**
 * Voximplant Management API Client
 * Wrapper for Voximplant HTTP API calls
 */

interface VoximplantCredentials {
  accountId: string;
  apiKey: string;
}

interface VoximplantCallHistoryItem {
  call_session_history_id: number;
  start_date: string;
  duration: number;
  cost: number;
  local_number: string;
  remote_number: string;
  incoming: boolean;
  successful: boolean;
}

/**
 * Make authenticated request to Voximplant API
 */
async function makeVoximplantRequest(
  method: string,
  params: Record<string, any>,
  credentials: VoximplantCredentials
): Promise<any> {
  const baseUrl = 'https://api.voximplant.com/platform_api';
  
  // Build query string
  const queryParams = new URLSearchParams({
    ...params,
    account_id: credentials.accountId,
  });

  // Add API key authentication
  queryParams.append('api_key', credentials.apiKey);

  const url = `${baseUrl}/${method}/?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voximplant API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Voximplant API error: ${data.error.msg || JSON.stringify(data.error)}`);
  }

  return data.result || data;
}

/**
 * Test Voximplant credentials
 */
export async function testVoximplantConnection(credentials: VoximplantCredentials): Promise<boolean> {
  try {
    await makeVoximplantRequest('GetAccountInfo', {}, credentials);
    return true;
  } catch (error) {
    console.error('Voximplant connection test failed:', error);
    return false;
  }
}

/**
 * Get account information
 */
export async function getAccountInfo(credentials: VoximplantCredentials) {
  return makeVoximplantRequest('GetAccountInfo', {}, credentials);
}

/**
 * Get list of applications
 */
export async function getApplications(credentials: VoximplantCredentials) {
  return makeVoximplantRequest('GetApplications', {}, credentials);
}

/**
 * Get application by ID
 */
export async function getApplication(credentials: VoximplantCredentials, applicationId: string) {
  const result = await makeVoximplantRequest('GetApplications', {
    application_id: applicationId,
  }, credentials);
  
  return result[0] || null;
}

/**
 * Get call history
 */
export async function getCallHistory(
  credentials: VoximplantCredentials,
  params: {
    fromDate?: string; // YYYY-MM-DD HH:mm:ss
    toDate?: string;
    count?: number;
    offset?: number;
    timezone?: string;
  } = {}
): Promise<VoximplantCallHistoryItem[]> {
  const result = await makeVoximplantRequest('GetCallHistory', {
    from_date: params.fromDate,
    to_date: params.toDate,
    count: params.count || 50,
    offset: params.offset || 0,
    timezone: params.timezone || 'UTC',
  }, credentials);

  return result.result || [];
}

/**
 * Get detailed call information
 */
export async function getCallDetails(credentials: VoximplantCredentials, callSessionHistoryId: number) {
  return makeVoximplantRequest('GetCallHistory', {
    call_session_history_id: callSessionHistoryId,
  }, credentials);
}

/**
 * Get phone numbers
 */
export async function getPhoneNumbers(credentials: VoximplantCredentials) {
  return makeVoximplantRequest('GetPhoneNumbers', {}, credentials);
}

/**
 * Get scenarios
 */
export async function getScenarios(credentials: VoximplantCredentials) {
  return makeVoximplantRequest('GetScenarios', {}, credentials);
}

/**
 * Generate VoxEngine scenario code for ElevenLabs integration
 */
export function generateScenarioCode(params: {
  elevenlabsApiKey: string;
  elevenlabsAgentId: string;
}): string {
  return `require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({ call }) => {
  let conversationalAIClient = undefined;
  
  call.answer();
  
  const callBaseHandler = () => {
    if (conversationalAIClient) conversationalAIClient.close();
    VoxEngine.terminate();
  };
  
  call.addEventListener(CallEvents.Disconnected, callBaseHandler);
  call.addEventListener(CallEvents.Failed, callBaseHandler);

  const onWebSocketClose = (event) => {
    Logger.write('===ON_WEB_SOCKET_CLOSE===');
    Logger.write(JSON.stringify(event));
    VoxEngine.terminate();
  };

  const ELEVENLABS_API_KEY = '${params.elevenlabsApiKey}';
  const ELEVENLABS_AGENT_ID = '${params.elevenlabsAgentId}';

  const conversationalAIClientParameters = {
    xiApiKey: ELEVENLABS_API_KEY,
    agentId: ELEVENLABS_AGENT_ID,
    onWebSocketClose,
  };

  try {
    conversationalAIClient = await ElevenLabs.createConversationalAIClient(conversationalAIClientParameters);
    VoxEngine.sendMediaBetween(call, conversationalAIClient);

    // Log user transcripts
    conversationalAIClient.addEventListener(ElevenLabs.ConversationalAIEvents.UserTranscript, (event) => {
      Logger.write('===USER_TRANSCRIPT===');
      Logger.write(JSON.stringify(event));
    });

    // Log agent responses
    conversationalAIClient.addEventListener(ElevenLabs.ConversationalAIEvents.AgentResponse, (event) => {
      Logger.write('===AGENT_RESPONSE===');
      Logger.write(JSON.stringify(event));
    });

    // Handle interruptions
    conversationalAIClient.addEventListener(ElevenLabs.ConversationalAIEvents.Interruption, (event) => {
      Logger.write('===INTERRUPTION===');
      Logger.write(JSON.stringify(event));
      if (conversationalAIClient) conversationalAIClient.clearMediaBuffer();
    });

    // Log conversation metadata
    conversationalAIClient.addEventListener(ElevenLabs.ConversationalAIEvents.ConversationInitiationMetadata, (event) => {
      Logger.write('===CONVERSATION_METADATA===');
      Logger.write(JSON.stringify(event));
    });

  } catch (error) {
    Logger.write('===ERROR===');
    Logger.write(error);
    call.hangup();
    VoxEngine.terminate();
  }
});`;
}
