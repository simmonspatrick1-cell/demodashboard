/**
 * OAuth Diagnostic Script
 * Tests different account ID formats and shows detailed OAuth headers
 */

require('dotenv').config();
const { buildOAuthHeader } = require('./api/netsuite-headers');
const fetch = require('node-fetch');

const testUrl = process.env.NETSUITE_REST_URL;
const accountVariations = [
  process.env.NETSUITE_ACCOUNT_ID,           // td3049589
  process.env.NETSUITE_ACCOUNT_ID.toUpperCase(), // TD3049589
  process.env.NETSUITE_ACCOUNT_ID.replace(/^td/, 'TD'), // TD3049589
  process.env.NETSUITE_ACCOUNT_ID.replace(/^td/, ''), // 3049589
  '_' + process.env.NETSUITE_ACCOUNT_ID,     // _td3049589
];

console.log('='.repeat(80));
console.log('NetSuite OAuth Diagnostic Test');
console.log('='.repeat(80));
console.log('');
console.log('Testing URL:', testUrl);
console.log('');

async function testAccountFormat(account, index) {
  console.log(`\nTest ${index + 1}: Account ID = "${account}"`);
  console.log('-'.repeat(80));

  try {
    const headers = buildOAuthHeader({
      account,
      consumerKey: process.env.NETSUITE_CONSUMER_KEY,
      consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
      tokenId: process.env.NETSUITE_TOKEN_ID,
      tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
      url: testUrl,
      method: 'GET'
    });

    console.log('Authorization Header:');
    console.log(headers.Authorization);
    console.log('');

    // Make the request
    const response = await fetch(testUrl, {
      method: 'GET',
      headers
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('\n✅ SUCCESS! This account ID format works!');
        return true;
      }
    } else {
      const text = await response.text();
      console.log('Response (first 500 chars):', text.substring(0, 500));
    }

    console.log('❌ Failed with this account format');
    return false;

  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing different account ID formats...\n');

  for (let i = 0; i < accountVariations.length; i++) {
    const success = await testAccountFormat(accountVariations[i], i);
    if (success) {
      console.log('\n' + '='.repeat(80));
      console.log(`✅ SOLUTION FOUND: Use account ID "${accountVariations[i]}"`);
      console.log('='.repeat(80));
      process.exit(0);
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('❌ None of the account ID formats worked.');
  console.log('This suggests the issue is with credentials or NetSuite configuration.');
  console.log('='.repeat(80));
}

runTests().catch(console.error);
