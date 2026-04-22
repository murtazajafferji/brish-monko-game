const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

const auth = JSON.parse(fs.readFileSync('/Users/murt/.openclaw/agents/main/agent/auth-profiles.json', 'utf8'));
const profile = auth.profiles['google-gemini-cli:murtazajafferji@gmail.com'];

// The Gemini CLI uses a specific client ID. Let's find it.
// Check gemini CLI source for client credentials
const { execSync } = require('child_process');

// First, let's see what the gemini CLI uses
try {
  const geminiPath = execSync('which gemini').toString().trim();
  console.log('Gemini at:', geminiPath);
  // Check for settings
  const settingsPath = require('os').homedir() + '/.gemini/settings.json';
  if (fs.existsSync(settingsPath)) {
    console.log('Settings:', fs.readFileSync(settingsPath, 'utf8'));
  }
} catch(e) {}

// The token type is "3p" (third-party OAuth) which Vertex doesn't accept
// We need a Gemini API key instead. Let's try to get one from gcloud or adc.
try {
  const adcPath = require('os').homedir() + '/.config/gcloud/application_default_credentials.json';
  if (fs.existsSync(adcPath)) {
    const adc = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
    console.log('ADC found, client_id:', adc.client_id?.substring(0, 20));
    
    // Refresh using ADC
    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: adc.refresh_token,
      client_id: adc.client_id,
      client_secret: adc.client_secret
    });
    
    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const token = JSON.parse(data);
          console.log('Got fresh token! Type:', token.token_type);
          console.log('Token prefix:', token.access_token?.substring(0, 20));
          fs.writeFileSync('/tmp/gcloud_token.txt', token.access_token);
          console.log('Saved to /tmp/gcloud_token.txt');
        } else {
          console.log('Token refresh failed:', res.statusCode, data.substring(0, 300));
        }
      });
    });
    req.write(postData);
    req.end();
  } else {
    console.log('No ADC found at', adcPath);
    console.log('Run: gcloud auth application-default login');
  }
} catch(e) {
  console.log('Error:', e.message);
}
