const fs = require('fs');
const https = require('https');
const path = require('path');

// Read auth
const auth = JSON.parse(fs.readFileSync('/Users/murt/.openclaw/agents/main/agent/auth-profiles.json', 'utf8'));
const profile = auth.profiles['google-gemini-cli:murtazajafferji@gmail.com'];
const accessToken = profile?.access;

if (!accessToken) { console.log('No access token'); process.exit(1); }

// Read image
const imgPath = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/brish.png';
const imgB64 = fs.readFileSync(imgPath).toString('base64');

// Use Imagen 3 via Vertex AI (supports OAuth)
// Project: singular-altar-wxdf2
const projectId = profile.projectId || 'singular-altar-wxdf2';
const location = 'us-central1';

// Try the generativelanguage API with imagen
const payload = JSON.stringify({
  contents: [{
    parts: [
      { inlineData: { mimeType: 'image/png', data: imgB64 } },
      { text: `Using this hand-drawn character called "Brish" as reference, generate a 2D game sprite sheet with 8 animation frames arranged in a 4x2 grid on a transparent background. 
Row 1: idle standing, walk frame 1 (left foot forward), walk frame 2 (right foot forward), walk frame 3 (mid-stride).
Row 2: jumping up, falling down, punching wind-up (fist back), punching strike (fist forward).
Keep the hand-drawn pencil art style. Each frame ~128x128px. Output only the image.` }
    ]
  }],
  generationConfig: {
    responseModalities: ['IMAGE', 'TEXT'],
    temperature: 1.0
  }
});

// Try Vertex AI endpoint
const hostname = `${location}-aiplatform.googleapis.com`;
const urlPath = `/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash-exp:generateContent`;

console.log(`Calling Vertex AI: ${hostname}${urlPath}`);

const options = {
  hostname,
  path: urlPath,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`);
      return;
    }
    try {
      const result = JSON.parse(data);
      for (const candidate of (result.candidates || [])) {
        for (const part of (candidate.content?.parts || [])) {
          if (part.inlineData) {
            const imgData = Buffer.from(part.inlineData.data, 'base64');
            const mime = part.inlineData.mimeType || 'image/png';
            const ext = mime.includes('png') ? 'png' : 'jpg';
            const outPath = `/Users/murt/.openclaw/workspace/brish-marko-game/sprites/brish-spritesheet.${ext}`;
            fs.writeFileSync(outPath, imgData);
            console.log(`Sprite sheet saved: ${outPath} (${imgData.length} bytes)`);
          } else if (part.text) {
            console.log(`Text: ${part.text.substring(0, 300)}`);
          }
        }
      }
    } catch (e) {
      console.log(`Parse error: ${e.message}`);
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', e => console.log(`Error: ${e.message}`));
req.write(payload);
req.end();
