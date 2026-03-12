
# Real-Time Voice Translator

## Prerequisites

- Node.js 18 or higher
- Docker Desktop
- Deepgram account at [console.deepgram.com](https://console.deepgram.com)
- ElevenLabs account at [elevenlabs.io](https://elevenlabs.io)

## Setup

1. Clone the repo
2. Add your API keys to backend/.env
3. Run `docker compose up -d` to start LibreTranslate
4. Run `cd backend && npm install && npm run dev`
5. In a new terminal run `cd frontend && npm install && npm run dev`
6. Open [http://localhost:5173](http://localhost:5173) in Chrome or Firefox
7. Allow microphone permissions, select a target language, click Start and speak

## Troubleshooting

- If LibreTranslate returns 503: wait 60 seconds for models to finish loading then retry
- If audio does not play: click anywhere on the page first to unlock the AudioContext
- If WebSocket disconnects: the frontend will auto-reconnect every 2 seconds

## Verification

Verify that all process.env variable names in deepgramClient.js, translator.js, ttsClient.js, and server.js exactly match the variable names defined in backend/.env. Fix any mismatches.
