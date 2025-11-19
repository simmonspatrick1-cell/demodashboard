/**
 * Gmail API Authorization Script
 * 
 * Run this script locally to generate the Refresh Token needed for the NetSuite script.
 * 
 * Usage:
 * 1. Create OAuth credentials in Google Cloud Console (see guide)
 * 2. Download 'credentials.json' or copy Client ID and Client Secret
 * 3. Run: node scripts/setup-gmail-auth.js
 */

import express from 'express';
import { createServer } from 'http';
import open from 'open'; // You might need to install this or manually open URL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const app = express();
const PORT = 3000;

// ============ CONFIGURATION ============
// IMPORTANT: Set these as environment variables before running:
//   export GMAIL_CLIENT_ID="your-client-id"
//   export GMAIL_CLIENT_SECRET="your-client-secret"
if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
  console.error('\n❌ ERROR: Missing required environment variables!\n');
  console.error('Please set the following environment variables:');
  console.error('  export GMAIL_CLIENT_ID="your-client-id-here"');
  console.error('  export GMAIL_CLIENT_SECRET="your-client-secret-here"\n');
  console.error('Get these from: https://console.cloud.google.com/apis/credentials\n');
  process.exit(1);
}

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Scopes needed for the script
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// ============ MAIN LOGIC ============

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=${SCOPES.join(' ')}&` +
  `access_type=offline&` + // CRITICAL: Requests a refresh token
  `prompt=consent`;        // CRITICAL: Forces consent screen to ensure refresh token is returned

console.log('\n=== Gmail API Authorization Setup ===\n');

if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
  console.error('ERROR: Please edit this script and set CLIENT_ID and CLIENT_SECRET');
  console.log('Or set environment variables: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
  process.exit(1);
}

// Start server to handle callback
const server = app.listen(PORT, async () => {
  console.log(`1. Server listening on http://localhost:${PORT}`);
  console.log(`2. Please open this URL in your browser to authorize:`);
  console.log(`\n   ${authUrl}\n`);
  
  try {
    // Try to open automatically (requires 'open' package, but we'll catch error if missing)
    const { default: openBrowser } = await import('open');
    await openBrowser(authUrl);
  } catch (e) {
    console.log('(Copy and paste the URL above into your browser)');
  }
});

// Handle OAuth Callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    res.send('Error: No code received');
    return;
  }

  res.send('<h1>Authorization Successful!</h1><p>You can close this window and check your terminal.</p>');
  
  console.log('3. Authorization code received');
  console.log('4. Exchanging code for tokens...');
  
  try {
    const tokens = await exchangeCodeForToken(code);
    
    console.log('\n=== SUCCESS! ===\n');
    console.log('Add these credentials to your NetSuite Script:\n');
    console.log(`GMAIL_CLIENT_ID:     ${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET: ${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN: ${tokens.refresh_token}`);
    console.log('\n(Note: Access Token expires in 1 hour, use Refresh Token to get new ones automatically)');
    
    if (!tokens.refresh_token) {
      console.log('\nWARNING: No refresh_token returned. Did you already authorize?');
      console.log('Go to https://myaccount.google.com/permissions and remove the app, then try again.');
    }

  } catch (error) {
    console.error('Error exchanging token:', error);
  } finally {
    server.close();
    process.exit(0);
  }
});

// Helper to exchange code for token using native https
function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }).toString();

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(data);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

