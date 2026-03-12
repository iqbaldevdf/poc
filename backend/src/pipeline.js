
import { createDeepgramStream } from './deepgramClient.js';
import { translate } from './translator.js';
import { streamTTS } from './ttsClient.js';

export function handleConnection(ws) {
	ws.targetLang = 'hi';
	console.log('[WS] Client connected');

	async function onFinalTranscript(transcript) {
		const label = `pipeline-${Date.now()}`;
		console.time(label);
		const done = () => {
			ws.send(JSON.stringify({ type: 'audio_done' }));
			console.timeEnd(label);
		};
		try {
			ws.send(JSON.stringify({ type: 'transcript', text: transcript }));
			const translatedText = await translate(transcript, ws.targetLang);
			ws.send(JSON.stringify({ type: 'translation', text: translatedText }));
			streamTTS(
				translatedText,
				(chunk) => ws.send(JSON.stringify({ type: 'audio', data: Array.from(chunk) })),
				done
			);
		} catch (err) {
			console.error('Pipeline error:', err);
			done();
		}
	}

	const deepgramStream = createDeepgramStream(onFinalTranscript);

	ws.on('message', (message) => {
		const isBinary = Buffer.isBuffer(message) || message instanceof ArrayBuffer;
		if (isBinary) {
			deepgramStream.send(message);
			if (!ws._audioLogCount) ws._audioLogCount = 0;
			ws._audioLogCount++;
			if (ws._audioLogCount === 1 || ws._audioLogCount % 20 === 0) {
				console.log('[WS] Received audio chunk', ws._audioLogCount, 'size', message?.length ?? message?.byteLength ?? 0);
			}
		} else {
			try {
				const msg = JSON.parse(message);
				if (msg.type === 'config') {
					ws.targetLang = msg.targetLang;
					console.log('[WS] Config targetLang:', msg.targetLang);
					return;
				}
			} catch (err) {
				deepgramStream.send(message);
			}
		}
	});

	ws.on('close', () => {
		console.log('[WS] Client disconnected');
		deepgramStream.close();
	});

	ws.on('error', (err) => {
		console.error('WebSocket error:', err);
	});
}

