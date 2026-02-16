#!/usr/bin/env node

import { readFileSync } from 'fs';

const ACCOUNT_ID = '10266354';
const API_KEY = '96760ec5-b82e-4e4f-95fa-ab4b56e25cfd';
const PHONE_NUMBER = '+79854619523';
const CALLER_ID = '+79011478030';

// Читаем правильный сценарий из файла
const scenarioCode = readFileSync('/home/ubuntu/mazur/outbound-scenario-final.js', 'utf-8');

async function main() {
  console.log('🚀 Создание ИСХОДЯЩЕГО звонка с ElevenLabs AI');
  console.log('=============================================\n');

  const timestamp = Date.now();
  const appName = `outbound-${timestamp}`;
  const scenarioName = `outbound${timestamp}`;

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
    console.error('❌ Ошибка:', appData.error.msg);
    return;
  }

  const applicationId = appData.application_id;
  console.log(`✅ Application ID: ${applicationId}\n`);

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
    console.error('❌ Ошибка:', scenarioData.error.msg);
    return;
  }

  const scenarioId = scenarioData.scenario_id;
  console.log(`✅ Scenario ID: ${scenarioId}\n`);

  // Шаг 3: Создание Rule
  console.log('=== Шаг 3: Создание Rule ===');
  const ruleParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    application_id: applicationId.toString(),
    rule_name: `rule${timestamp}`,
    rule_pattern: '.*',
  });

  const ruleResponse = await fetch(`https://api.voximplant.com/platform_api/AddRule?${ruleParams}`);
  const ruleData = await ruleResponse.json();
  
  if (ruleData.error) {
    console.error('❌ Ошибка:', ruleData.error.msg);
    return;
  }

  const ruleId = ruleData.rule_id;
  console.log(`✅ Rule ID: ${ruleId}\n`);

  // Шаг 4: Привязка Scenario
  console.log('=== Шаг 4: Привязка Scenario ===');
  const bindParams = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
    rule_id: ruleId.toString(),
    scenario_id: scenarioId.toString(),
  });

  const bindResponse = await fetch(`https://api.voximplant.com/platform_api/BindScenario?${bindParams}`);
  const bindData = await bindResponse.json();
  
  if (bindData.error) {
    console.error('❌ Ошибка:', bindData.error.msg);
    return;
  }

  console.log(`✅ Scenario привязан\n`);

  // Шаг 5: Запуск звонка
  console.log('=== Шаг 5: Запуск звонка ===');
  console.log(`📞 Звоним на: ${PHONE_NUMBER}`);
  console.log(`📱 С номера: ${CALLER_ID}\n`);

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
    console.error('❌ Ошибка:', callData.error.msg);
    return;
  }

  console.log('✅ Звонок запущен!');
  console.log(`📊 Call Session History ID: ${callData.call_session_history_id}`);
  console.log('\n🎉 Проверьте телефон - должен поступить звонок!');
  console.log('После ответа подключится ElevenLabs AI агент.\n');
  
  // Информация о логах
  console.log('📝 Для просмотра логов выполните через 30 секунд:');
  console.log(`curl -s "https://api.voximplant.com/platform_api/GetCallHistory?account_id=${ACCOUNT_ID}&api_key=${API_KEY}&call_session_history_id=${callData.call_session_history_id}" | python3 -m json.tool`);
}

main().catch(console.error);
