import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('Call to 9176193743', () => {
  it('should create batch call successfully', async () => {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found');
    }

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      {
        call_name: 'Test call to 9176193743',
        agent_id: 'agent_8301kfgw54f5eekabw8htz6ekgnw',
        agent_phone_number_id: 'phnum_2401kfgya520f2xagfd4vv3c4qee',
        recipients: [{ phone_number: '+19176193743' }],
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Call initiated! Batch ID: ${response.data.id}`);
    console.log('📞 Calling +1 (917) 619-3743...');
    expect(response.data.id).toBeDefined();
  }, 30000);
});
