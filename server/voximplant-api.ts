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
  credentials: VoximplantCredentials,
  usePost: boolean = false
): Promise<any> {
  const baseUrl = 'https://api.voximplant.com/platform_api';
  
  // Build query string
  const queryParams = new URLSearchParams({
    ...params,
    account_id: String(credentials.accountId),
    api_key: credentials.apiKey,
  });

  const url = usePost 
    ? `${baseUrl}/${method}/`
    : `${baseUrl}/${method}/?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: usePost ? 'POST' : 'GET',
    headers: usePost ? {
      'Content-Type': 'application/x-www-form-urlencoded',
    } : {
      'Content-Type': 'application/json',
    },
    body: usePost ? queryParams.toString() : undefined,
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
  callType?: 'inbound' | 'outbound';
}): string {
  const callType = params.callType || 'inbound';
  
  if (callType === 'outbound') {
    // Outbound call scenario
    return `require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.Started, async (e) => {
  let agentsClient = undefined;
  let call = undefined;

  const callBaseHandler = () => {
    if (agentsClient) agentsClient.close();
    if (call) call.hangup();
    VoxEngine.terminate();
  };

  const onWebSocketClose = (event) => {
    Logger.write('===ON_WEB_SOCKET_CLOSE===');
    Logger.write(JSON.stringify(event));
    callBaseHandler();
  };

  const ELEVENLABS_API_KEY = '${params.elevenlabsApiKey}';
  const ELEVENLABS_AGENT_ID = '${params.elevenlabsAgentId}';

  const agentsClientParameters = {
    xiApiKey: ELEVENLABS_API_KEY,
    agentId: ELEVENLABS_AGENT_ID,
    onWebSocketClose,
  };

  try {
    // CRITICAL: Use await because createAgentsClient returns a Promise
    agentsClient = await ElevenLabs.createAgentsClient(agentsClientParameters);

    // Make outbound call
    call = VoxEngine.callPSTN(e.destination, e.callerid);

    call.addEventListener(CallEvents.Connected, () => {
      Logger.write('===CALL_CONNECTED===');
      VoxEngine.sendMediaBetween(call, agentsClient);
    });

    call.addEventListener(CallEvents.Disconnected, callBaseHandler);
    call.addEventListener(CallEvents.Failed, callBaseHandler);

    // Log user transcripts
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.UserTranscript, (event) => {
      Logger.write('===USER_TRANSCRIPT===');
      Logger.write(JSON.stringify(event));
    });

    // Log agent responses
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.AgentResponse, (event) => {
      Logger.write('===AGENT_RESPONSE===');
      Logger.write(JSON.stringify(event));
    });

    // Handle interruptions
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.Interruption, (event) => {
      Logger.write('===INTERRUPTION===');
      Logger.write(JSON.stringify(event));
      if (agentsClient) agentsClient.clearMediaBuffer();
    });

  } catch (error) {
    Logger.write('===ERROR===');
    Logger.write(JSON.stringify(error));
    callBaseHandler();
  }
});`;
  } else {
    // Inbound call scenario
    return `require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({ call }) => {
  let agentsClient = undefined;
  
  call.answer();
  
  const callBaseHandler = () => {
    if (agentsClient) agentsClient.close();
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

  const agentsClientParameters = {
    xiApiKey: ELEVENLABS_API_KEY,
    agentId: ELEVENLABS_AGENT_ID,
    onWebSocketClose,
  };

  try {
    // CRITICAL: Use await because createAgentsClient returns a Promise
    agentsClient = await ElevenLabs.createAgentsClient(agentsClientParameters);
    VoxEngine.sendMediaBetween(call, agentsClient);

    // Log user transcripts
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.UserTranscript, (event) => {
      Logger.write('===USER_TRANSCRIPT===');
      Logger.write(JSON.stringify(event));
    });

    // Log agent responses
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.AgentResponse, (event) => {
      Logger.write('===AGENT_RESPONSE===');
      Logger.write(JSON.stringify(event));
    });

    // Handle interruptions
    agentsClient.addEventListener(ElevenLabs.AgentsEvents.Interruption, (event) => {
      Logger.write('===INTERRUPTION===');
      Logger.write(JSON.stringify(event));
      if (agentsClient) agentsClient.clearMediaBuffer();
    });

  } catch (error) {
    Logger.write('===ERROR===');
    Logger.write(JSON.stringify(error));
    call.hangup();
    VoxEngine.terminate();
  }
});`;
  }
}
}

/**
 * Get call recording URL
 */
export async function getCallRecordingUrl(
  credentials: VoximplantCredentials,
  recordUrl: string
): Promise<string> {
  // Voximplant record URLs are already public and accessible
  // Just return the URL as-is
  return recordUrl;
}

/**
 * Get call recordings for a specific call session
 */
export async function getCallRecordings(
  credentials: VoximplantCredentials,
  callSessionHistoryId: number
) {
  return makeVoximplantRequest('GetCallHistory', {
    call_session_history_id: callSessionHistoryId,
    with_records: true,
  }, credentials);
}


/**
 * Create a new Voximplant application
 */
export async function createApplication(
  credentials: VoximplantCredentials,
  applicationName: string
): Promise<{ application_id: number; application_name: string }> {
  const result = await makeVoximplantRequest('AddApplication', {
    application_name: applicationName,
  }, credentials);
  
  return {
    application_id: result.application_id,
    application_name: result.application_name,
  };
}

/**
 * Create a new scenario in Voximplant
 */
export async function createScenario(
  credentials: VoximplantCredentials,
  applicationId: number,
  scenarioName: string,
  scenarioScript: string
): Promise<{ scenario_id: number }> {
  const result = await makeVoximplantRequest('AddScenario', {
    application_id: applicationId,
    scenario_name: scenarioName,
    scenario_script: scenarioScript,
  }, credentials, true); // Use POST
  
  return {
    scenario_id: result.scenario_id,
  };
}

/**
 * Create a new routing rule
 */
export async function createRule(
  credentials: VoximplantCredentials,
  applicationId: number,
  ruleName: string,
  rulePattern: string,
  scenarioId: number
): Promise<{ rule_id: number }> {
  const result = await makeVoximplantRequest('AddRule', {
    application_id: applicationId,
    rule_name: ruleName,
    rule_pattern: rulePattern,
    scenario_id: scenarioId,
  }, credentials);
  
  return {
    rule_id: result.rule_id,
  };
}

/**
 * Get phone numbers for account
 */
export async function getPhoneNumbers(
  credentials: VoximplantCredentials
): Promise<any[]> {
  const result = await makeVoximplantRequest('GetPhoneNumbers', {}, credentials);
  
  return result.result || [];
}

/**
 * Attach phone number to application
 */
export async function attachPhoneNumber(
  credentials: VoximplantCredentials,
  phoneId: number | string,
  applicationId: number,
  ruleId?: number
): Promise<void> {
  const params: Record<string, any> = {
    phone_id: phoneId,
    application_id: applicationId,
  };
  
  if (ruleId) {
    params.rule_id = ruleId;
  }
  
  await makeVoximplantRequest('AttachPhoneNumber', params, credentials);
}

/**
 * Full automation: Create agent with Application, Scenario, Rule
 */
export async function createFullAgent(
  credentials: VoximplantCredentials,
  params: {
    agentName: string;
    elevenlabsApiKey: string;
    elevenlabsAgentId: string;
    phoneNumberId?: string;
  }
): Promise<{
  applicationId: number;
  scenarioId: number;
  ruleId: number;
}> {
  // Step 1: Create Application
  const app = await createApplication(credentials, params.agentName);
  
  // Step 2: Generate VoxEngine script
  const script = generateScenarioCode({
    elevenlabsApiKey: params.elevenlabsApiKey,
    elevenlabsAgentId: params.elevenlabsAgentId,
  });
  
  // Step 3: Create Scenario
  // Scenario name must start with a letter and contain only letters, numbers, and underscores
  const scenarioName = `scenario_${params.agentName}`.replace(/-/g, '_');
  const scenario = await createScenario(
    credentials,
    app.application_id,
    scenarioName,
    script
  );
  
  // Step 4: Create Routing Rule (accept all calls)
  const rule = await createRule(
    credentials,
    app.application_id,
    `${params.agentName}_rule`,
    '.*', // Match all incoming calls
    scenario.scenario_id
  );
  
  // Step 5: Attach phone number if provided
  if (params.phoneNumberId) {
    await attachPhoneNumber(
      credentials,
      params.phoneNumberId,
      app.application_id,
      rule.rule_id
    );
  }
  
  return {
    applicationId: app.application_id,
    scenarioId: scenario.scenario_id,
    ruleId: rule.rule_id,
  };
}
