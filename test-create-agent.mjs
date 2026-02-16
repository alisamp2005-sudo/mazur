import { createFullAgent } from './server/voximplant-api.ts';

const credentials = {
  accountId: '10266354',
  apiKey: '96760ec5-b82e-4e4f-95fa-ab4b56e25cfd'
};

const params = {
  agentName: `manus-ai-agent-${Date.now()}`,
  elevenlabsApiKey: 'sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14',
  elevenlabsAgentId: 'agent_8301kfgw54f5eekabw8htz6ekgnw'
};

console.log('Testing createFullAgent...');
console.log('Credentials:', credentials);
console.log('Params:', params);

try {
  const result = await createFullAgent(credentials, params);
  console.log('\n✅ SUCCESS!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n❌ ERROR!');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
