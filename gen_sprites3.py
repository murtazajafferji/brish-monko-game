import ssl
import json
import base64
import urllib.request
import sys
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

# Try to get API key from auth or use refresh token flow
auth = json.loads(Path('/Users/murt/.openclaw/agents/main/agent/auth-profiles.json').read_text())
profile = auth['profiles'].get('google-gemini-cli:murtazajafferji@gmail.com', {})
refresh_token = profile.get('refresh', '')
project_id = profile.get('projectId', '')

# First refresh the access token
token_url = "https://oauth2.googleapis.com/token"
token_data = urllib.parse.urlencode({
    "grant_type": "refresh_token",
    "refresh_token": refresh_token,
    "client_id": "710997120104-rvea5tlkb3sa82gitmlhie3207s0fhjq.apps.googleusercontent.com",
    "client_secret": ""
}).encode()

# Actually, the Gemini API needs an API key, not OAuth
# Let's try using the Vertex AI endpoint instead which supports OAuth
import urllib.parse

# Get fresh access token
print("Refreshing token...")
# We need the client_id and client_secret from the OAuth credentials
# Let's check if there's a Gemini API key in env or config
import os

api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
if api_key:
    print(f"Found API key: {api_key[:8]}...")
else:
    print("No GOOGLE_API_KEY or GEMINI_API_KEY found in env")
    # Try using curl with gcloud-style auth
    print("Trying node-based approach...")
    sys.exit(1)
