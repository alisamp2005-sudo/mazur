// Правильный сценарий для ИСХОДЯЩИХ звонков с ElevenLabs
// Комбинация VoxEngine.callPSTN + ElevenLabs.ConversationalAIClient

require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.Started, async (e) => {
  Logger.write('===SCENARIO_STARTED===');
  Logger.write('Custom data: ' + JSON.stringify(VoxEngine.customData()));
  
  const customDataStr = VoxEngine.customData();
  const customData = JSON.parse(customDataStr);
  const phoneNumber = customData.phone;
  const callerId = customData.caller_id;
  
  if (!phoneNumber) {
    Logger.write('ERROR: No phone number provided');
    VoxEngine.terminate();
    return;
  }
  
  Logger.write('Making outbound call to: ' + phoneNumber);
  Logger.write('Caller ID: ' + callerId);
  
  // Создаем исходящий звонок
  const outboundCall = VoxEngine.callPSTN(phoneNumber, callerId || '');
  
  let conversationalAIClient = undefined;
  
  // Обработчик успешного ответа на звонок
  outboundCall.addEventListener(CallEvents.Connected, async () => {
    Logger.write('===CALL_CONNECTED===');
    
    const onWebSocketClose = (event) => {
      Logger.write('===ON_WEB_SOCKET_CLOSE===');
      Logger.write(JSON.stringify(event));
      outboundCall.hangup();
      VoxEngine.terminate();
    };
    
    const ELEVENLABS_API_KEY = 'sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14';
    const ELEVENLABS_AGENT_ID = 'agent_8301kfgw54f5eekabw8htz6ekgnw';
    
    const conversationalAIClientParameters = {
      xiApiKey: ELEVENLABS_API_KEY,
      agentId: ELEVENLABS_AGENT_ID,
      onWebSocketClose,
    };
    
    try {
      Logger.write('===CREATING_ELEVENLABS_CLIENT===');
      conversationalAIClient = ElevenLabs.createConversationalAIClient(conversationalAIClientParameters);
      Logger.write('===CONNECTING_MEDIA===');
      VoxEngine.sendMediaBetween(outboundCall, conversationalAIClient);
      Logger.write('===MEDIA_CONNECTED===');
    } catch (error) {
      Logger.write('===ERROR_CREATING_CONVERSATIONAL_AI_CLIENT===');
      Logger.write(JSON.stringify(error));
      outboundCall.hangup();
    }
  });
  
  // Обработчик отключения звонка
  outboundCall.addEventListener(CallEvents.Disconnected, () => {
    Logger.write('===CALL_DISCONNECTED===');
    if (conversationalAIClient) conversationalAIClient.close();
    VoxEngine.terminate();
  });
  
  // Обработчик ошибки звонка
  outboundCall.addEventListener(CallEvents.Failed, (e) => {
    Logger.write('===CALL_FAILED===');
    Logger.write('Reason: ' + e.reason);
    Logger.write('Code: ' + e.code);
    if (conversationalAIClient) conversationalAIClient.close();
    VoxEngine.terminate();
  });
});
