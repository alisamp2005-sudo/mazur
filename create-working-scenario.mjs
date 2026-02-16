#!/usr/bin/env node

// Создание рабочего сценария с правильной интеграцией ElevenLabs

const ACCOUNT_ID = '10266354';
const API_KEY = '96760ec5-b82e-4e4f-95fa-ab4b56e25cfd';
const ELEVENLABS_API_KEY = 'sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14';
const ELEVENLABS_AGENT_ID = 'agent_8301kfgw54f5eekabw8htz6ekgnw';
const PHONE_NUMBER = '+79854619523';
const CALLER_ID = '+79011478030';

// Правильный VoxEngine код из официальной документации
const scenarioCode = `
require(Modules.ElevenLabs);

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
    Logger.write('===ON_WEB_SOCKET_CLOSE==');
    Logger.write(JSON.stringify(event));
    VoxEngine.terminate();
  };

  const ELEVENLABS_API_KEY = '${ELEVENLABS_API_KEY}';
  const ELEVENLABS_AGENT_ID = '${ELEVENLABS_AGENT_ID}';

  const conversationalAIClientParameters = {
    xiApiKey: ELEVENLABS_API_KEY,
    agentId: ELEVENLABS_AGENT_ID,
    onWebSocketClose,
  };

  try {
    conversationalAIClient = ElevenLabs.createConversationalAIClient(conversationalAIClientParameters);
    VoxEngine.sendMediaBetween(call, conversationalAIClient);
  } catch (error) {
    Logger.write('===ERROR_CREATING_CONVERSATIONAL_AI_CLIENT===');
    Logger.write(JSON.stringify(error));
    call.hangup();
  }
});
`.trim();

async function main() {
  console.log('🚀 Создание рабочего сценария с ElevenLabs Conversational AI');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const appName = `working-agent-${timestamp}`;
  const scenarioName = `workingscenario${timestamp}`;

  // Шаг 1: Создание Application
  console.log('=== Шаг 1: Создание Application ===');
  const appParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_name: appName,
  });

  const appResponse = await fetch(`https://api.voximplant.com/platform_api/AddApplication?${appParams}`);
  const appData = await appResponse.json();
  
  if (appData.error) {
    console.error('❌ Ошибка создания Application:', appData.error.msg);
    return;
  }

  const applicationId = appData.application_id;
  console.log(`✅ Application создан, ID: ${applicationId}\n`);

  // Шаг 2: Создание Scenario
  console.log('=== Шаг 2: Создание Scenario ===');
  const scenarioParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    scenario_name: scenarioName,
    scenario_script: scenarioCode,
  });

  const scenarioResponse = await fetch(`https://api.voximplant.com/platform_api/AddScenario?${scenarioParams}`);
  const scenarioData = await scenarioResponse.json();
  
  if (scenarioData.error) {
    console.error('❌ Ошибка создания Scenario:', scenarioData.error.msg);
    return;
  }

  const scenarioId = scenarioData.scenario_id;
  console.log(`✅ Scenario создан, ID: ${scenarioId}\n`);

  // Шаг 3: Создание Rule
  console.log('=== Шаг 3: Создание Routing Rule ===');
  const ruleParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
    rule_name: `rule_${timestamp}`,
    rule_pattern: '.*',
  });

  const ruleResponse = await fetch(`https://api.voximplant.com/platform_api/AddRule?${ruleParams}`);
  const ruleData = await ruleResponse.json();
  
  if (ruleData.error) {
    console.error('❌ Ошибка создания Rule:', ruleData.error.msg);
    return;
  }

  const ruleId = ruleData.rule_id;
  console.log(`✅ Rule создан, ID: ${ruleId}\n`);

  // Шаг 4: Привязка Scenario к Rule
  console.log('=== Шаг 4: Привязка Scenario к Rule ===');
  const bindParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    rule_id: ruleId.toString(),
    scenario_id: scenarioId.toString(),
  });

  const bindResponse = await fetch(`https://api.voximplant.com/platform_api/BindScenario?${bindParams}`);
  const bindData = await bindResponse.json();
  
  if (bindData.error) {
    console.error('❌ Ошибка привязки Scenario:', bindData.error.msg);
    return;
  }

  console.log(`✅ Scenario привязан к Rule\n`);

  // Резюме
  console.log('📋 Резюме:');
  console.log(`Application ID: ${applicationId}`);
  console.log(`Scenario ID: ${scenarioId}`);
  console.log(`Rule ID: ${ruleId}\n`);

  // Шаг 5: Запуск тестового звонка
  console.log('=== Шаг 5: Запуск тестового звонка ===');
  console.log(`Звоним на номер: ${PHONE_NUMBER}`);
  console.log(`С номера: ${CALLER_ID}\n`);

  const callParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    rule_id: ruleId.toString(),
    script_custom_data: JSON.stringify({
      phone: PHONE_NUMBER,
      caller_id: CALLER_ID,
    }),
  });

  const callResponse = await fetch(`https://api.voximplant.com/platform_api/StartScenarios?${callParams}`);
  const callData = await callResponse.json();
  
  if (callData.error) {
    console.error('❌ Ошибка запуска звонка:', callData.error.msg);
    return;
  }

  console.log('✅ Звонок запущен!');
  console.log(`Call Session History ID: ${callData.call_session_history_id}`);
  console.log('\n🎉 Проверьте телефон - должен поступить звонок с ElevenLabs AI агентом!');
}

main().catch(console.error);
