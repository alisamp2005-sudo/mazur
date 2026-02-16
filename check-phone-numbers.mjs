import fetch from 'node-fetch';

const ACCOUNT_ID = '10266354';
const API_KEY = '96760ec5-b82e-4e4f-95fa-ab4b56e25cfd';

async function getPhoneNumbers() {
  const params = new URLSearchParams({
    account_id: ACCOUNT_ID,
    api_key: API_KEY,
  });

  const response = await fetch(`https://api.voximplant.com/platform_api/GetPhoneNumbers?${params}`);
  const data = await response.json();
  
  console.log('=== VoximPlant Phone Numbers ===');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.result) {
    console.log('\n=== Summary ===');
    data.result.forEach((phone, index) => {
      console.log(`\n${index + 1}. Phone Number: ${phone.phone_number}`);
      console.log(`   ID: ${phone.phone_id}`);
      console.log(`   Category: ${phone.phone_category_name}`);
      console.log(`   Price: ${phone.phone_price}`);
      console.log(`   Verified: ${phone.verified || 'N/A'}`);
    });
  }
}

getPhoneNumbers().catch(console.error);
