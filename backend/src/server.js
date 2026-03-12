
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { handleConnection } from './pipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
	handleConnection(ws);
});

const LIBRETRANSLATE_WARMUP_DELAY_MS = 5000;
const LIBRETRANSLATE_WARMUP_RETRIES = 3;
const LIBRETRANSLATE_WARMUP_RETRY_MS = 10000;

async function warmupLibreTranslate() {
	const { default: fetch } = await import('node-fetch');
	const url = `${process.env.LIBRETRANSLATE_URL}/translate`;
	const body = JSON.stringify({ q: 'hello', source: 'en', target: 'hi', format: 'text' });

	for (let attempt = 1; attempt <= LIBRETRANSLATE_WARMUP_RETRIES; attempt++) {
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body
			});
			
			const data = await res.json();
			if (data.translatedText != null) {
				console.log('LibreTranslate warmup OK');
				return;
			}
		} catch (err) {
			if (attempt === LIBRETRANSLATE_WARMUP_RETRIES) {
				console.warn(
					'LibreTranslate not ready yet. If Docker is running, wait ~60s for models to load, then retry translation.'
				);
				return;
			}
			await new Promise(r => setTimeout(r, LIBRETRANSLATE_WARMUP_RETRY_MS));
		}
	}
}

server.listen(PORT, () => {
	console.log(`Backend server listening on port ${PORT}`);
	setTimeout(warmupLibreTranslate, LIBRETRANSLATE_WARMUP_DELAY_MS);
});
