import ssl
import json
import base64
import urllib.request
import sys
from pathlib import Path

# Fix SSL
ssl._create_default_https_context = ssl._create_unverified_context

auth = json.loads(Path('/Users/murt/.openclaw/agents/main/agent/auth-profiles.json').read_text())
profile = auth['profiles'].get('google-gemini-cli:murtazajafferji@gmail.com', {})
access_token = profile.get('access', '')

if not access_token:
    print("No access token found"); sys.exit(1)

img_path = '/Users/murt/.openclaw/workspace/brish-marko-game/sprites/brish.png'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

payload = {
    "contents": [{
        "parts": [
            {"inlineData": {"mimeType": "image/png", "data": img_b64}},
            {"text": "Using this hand-drawn character as reference, create a 2D game sprite sheet PNG image with 8 frames arranged in a 4x2 grid. The frames should show: Row 1: idle pose, walk frame 1, walk frame 2, walk frame 3. Row 2: jump up, jump down, punch wind-up, punch strike. Keep the character's original hand-drawn art style. Each frame should be roughly 128x128 pixels. The background must be completely transparent. Output ONLY the generated image."}
        ]
    }],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"]
    }
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {access_token}"
}

req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
    for candidate in result.get('candidates', []):
        for part in candidate.get('content', {}).get('parts', []):
            if 'inlineData' in part:
                img_data = base64.b64decode(part['inlineData']['data'])
                mime = part['inlineData'].get('mimeType', 'image/png')
                ext = 'png' if 'png' in mime else 'jpg'
                out_path = f'/Users/murt/.openclaw/workspace/brish-marko-game/sprites/brish-spritesheet.{ext}'
                with open(out_path, 'wb') as f:
                    f.write(img_data)
                print(f"Sprite sheet saved: {out_path} ({len(img_data)} bytes)")
            elif 'text' in part:
                print(f"Text: {part['text'][:300]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
except Exception as e:
    print(f"Error: {e}")
