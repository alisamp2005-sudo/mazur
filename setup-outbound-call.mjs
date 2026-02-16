/**
 * Полная настройка и тестирование исходящего звонка
 * VoximPlant + ElevenLabs
 */

const ACCOUNT_ID = '10266354';
const API_KEY = '96760ec5-b82e-4e4f-95fa-ab4b56e25cfd';
const ELEVENLABS_API_KEY = 'sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14';
const ELEVENLABS_AGENT_ID = 'agent_8301kfgw54f5eekabw8htz6ekgnw';
const CALLER_ID = '79011478030'; // Ваш купленный номер
const TARGET_PHONE = '79854619523'; // Номер для звонка

// Шаг 1: Создание Application
async function createApplication() {
  console.log('\n=== Шаг 1: Создание Application ===');
  
  const timestamp = Date.now();
  const appName = `outbound-test-${timestamp}`;
  
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_name: appName,
  });
  
  console.log('Creating application:', appName);

  const response = await fetch(`https://api.voximplant.com/platform_api/AddApplication?${params}`);
  const data = await response.json();
  
  if (data.error) {
    console.error('Ошибка:', data.error.msg);
    // Если приложение уже существует, получим его ID
    if (data.error.msg.includes('not unique')) {
      const apps = await getApplications();
      const app = apps.find(a => a.application_name === 'outbound-test-agent');
      if (app) {
        console.log('✅ Application уже существует, ID:', app.application_id);
        return app.application_id;
      }
    }
    throw new Error(data.error.msg);
  }
  
  console.log('✅ Application создан, ID:', data.application_id);
  return data.application_id;
}

// Получение списка приложений
async function getApplications() {
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/GetApplications?${params}`);
  const data = await response.json();
  return data.result || [];
}

// Шаг 2: Создание Scenario для исходящего звонка
async function createScenario(applicationId) {
  console.log('\n=== Шаг 2: Создание Scenario ===');
  
  // Генерация VoxEngine кода для исходящего звонка
  const scenarioCode = `
// Outbound call scenario with ElevenLabs integration
VoxEngine.addEventListener(AppEvents.Started, async (e) => {
  Logger.write("Starting outbound call to ${TARGET_PHONE}");
  
  // Create outbound call
  const call = VoxEngine.callPSTN("${TARGET_PHONE}", "${CALLER_ID}");
  
  // Wait for call to be answered
  call.addEventListener(CallEvents.Connected, async () => {
    Logger.write("Call connected, starting ElevenLabs agent");
    
    // ElevenLabs configuration
    const elevenlabsConfig = {
      apiKey: "${ELEVENLABS_API_KEY}",
      agentId: "${ELEVENLABS_AGENT_ID}",
    };
    
    try {
      // Connect to ElevenLabs Conversational AI
      const wsUrl = \`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=\${elevenlabsConfig.agentId}\`;
      const ws = Net.connect(wsUrl, {
        headers: {
          "xi-api-key": elevenlabsConfig.apiKey
        }
      });
      
      // Forward audio between call and ElevenLabs
      VoxEngine.sendMediaBetween(call, ws);
      
      Logger.write("ElevenLabs agent connected");
    } catch (error) {
      Logger.write("Error connecting to ElevenLabs: " + error);
      call.hangup();
    }
  });
  
  // Handle call end
  call.addEventListener(CallEvents.Disconnected, () => {
    Logger.write("Call disconnected");
    VoxEngine.terminate();
  });
  
  call.addEventListener(CallEvents.Failed, (e) => {
    Logger.write("Call failed: " + e.code + " - " + e.reason);
    VoxEngine.terminate();
  });
});
`.trim();

  const timestamp = Date.now();
  const scenarioName = `outboundscenario${timestamp}`;
  
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
    scenario_name: scenarioName,
    scenario_script: scenarioCode,
  });
  
  console.log('Creating scenario:', scenarioName);

  const response = await fetch('https://api.voximplant.com/platform_api/AddScenario', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  const data = await response.json();
  
  if (data.error) {
    console.error('Ошибка:', data.error.msg);
    // Если сценарий уже существует, получим его ID
    if (data.error.msg.includes('not unique')) {
      const scenarios = await getScenarios(applicationId);
      const scenario = scenarios.find(s => s.scenario_name === 'outbound_elevenlabs_scenario');
      if (scenario) {
        console.log('✅ Scenario уже существует, ID:', scenario.scenario_id);
        return scenario.scenario_id;
      }
    }
    throw new Error(data.error.msg);
  }
  
  console.log('✅ Scenario создан, ID:', data.scenario_id);
  return data.scenario_id;
}

// Получение списка сценариев
async function getScenarios(applicationId) {
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/GetScenarios?${params}`);
  const data = await response.json();
  return data.result || [];
}

// Привязка сценария к правилу
async function bindScenario(ruleId, scenarioId) {
  console.log('\n=== Привязка Scenario к Rule ===');
  
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    rule_id: ruleId.toString(),
    scenario_id: scenarioId.toString(),
    bind: 'true',
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/BindScenario?${params}`);
  const data = await response.json();
  
  if (data.error) {
    console.error('Ошибка:', data.error.msg);
    throw new Error(data.error.msg);
  }
  
  console.log('✅ Scenario привязан к Rule');
  return data.result;
}

// Шаг 3: Создание Routing Rule
async function createRule(applicationId, scenarioId) {
  console.log('\n=== Шаг 3: Создание Routing Rule ===');
  
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
    rule_name: 'outbound_rule',
    rule_pattern: '.*',
    scenarios: scenarioId.toString(),
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/AddRule?${params}`);
  const data = await response.json();
  
  if (data.error) {
    console.error('Ошибка:', data.error.msg);
    // Если правило уже существует, получим его ID
    if (data.error.msg.includes('not unique')) {
      const rules = await getRules(applicationId);
      const rule = rules.find(r => r.rule_name === 'outbound_rule');
      if (rule) {
        console.log('✅ Rule уже существует, ID:', rule.rule_id);
        return rule.rule_id;
      }
    }
    throw new Error(data.error.msg);
  }
  
  console.log('✅ Rule создан, ID:', data.rule_id);
  return data.rule_id;
}

// Получение списка правил
async function getRules(applicationId) {
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/GetRules?${params}`);
  const data = await response.json();
  return data.result || [];
}

// Шаг 4: Запуск исходящего звонка
async function startOutboundCall(ruleId) {
  console.log('\n=== Шаг 4: Запуск исходящего звонка ===');
  console.log(`Звоним на номер: +${TARGET_PHONE}`);
  console.log(`С номера: +${CALLER_ID}`);
  
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    rule_id: ruleId.toString(),
    script_custom_data: JSON.stringify({
      target_phone: TARGET_PHONE,
      caller_id: CALLER_ID,
    }),
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/StartScenarios?${params}`);
  const data = await response.json();
  
  if (data.error) {
    console.error('❌ Ошибка запуска звонка:', data.error.msg);
    throw new Error(data.error.msg);
  }
  
  console.log('✅ Звонок запущен!');
  console.log('Media Session ID:', data.result.media_session_access_url);
  console.log('\n🎉 Проверьте телефон +79854619523 - должен поступить звонок!');
  
  return data.result;
}

// Главная функция
async function main() {
  try {
    console.log('🚀 Настройка исходящего звонка VoximPlant + ElevenLabs');
    console.log('=' .repeat(60));
    
    const applicationId = await createApplication();
    const scenarioId = await createScenario(applicationId);
    const ruleId = await createRule(applicationId, scenarioId);
    await bindScenario(ruleId, scenarioId);
    
    console.log('\n📋 Резюме:');
    console.log(`Application ID: ${applicationId}`);
    console.log(`Scenario ID: ${scenarioId}`);
    console.log(`Rule ID: ${ruleId}`);
    
    // Запуск звонка
    await startOutboundCall(ruleId);
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
