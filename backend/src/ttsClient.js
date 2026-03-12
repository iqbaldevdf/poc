import fetch from 'node-fetch';

/** Consume stream: node-fetch uses Node Readable (no getReader); native fetch uses Web ReadableStream. */
async function consumeBodyStream(body, onChunk) {
	if (typeof body.getReader === 'function') {
		const reader = body.getReader();
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			if (value) onChunk(value);
		}
	} else {
		for await (const chunk of body) {
			if (chunk) onChunk(chunk);
		}
	}
}

export async function streamTTS(text, onChunk, onDone) {
	try {
		const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'xi-api-key': process.env.ELEVENLABS_API_KEY,
				'Content-Type': 'application/json',
				'Accept': 'audio/mpeg'
			},
			body: JSON.stringify({
				text,
				model_id: 'eleven_flash_v2_5',
				voice_settings: { stability: 0.5, similarity_boost: 0.75 }
			})
		});
		if (!response.ok) {
			const errText = await response.text();
			console.error('TTS API error:', response.status, errText.slice(0, 200));
			if (response.status === 401 && errText.includes('text_to_speech')) {
				console.warn(
					'ElevenLabs: API key is missing the "text_to_speech" permission. Create a new API key at elevenlabs.io with Text-to-Speech enabled.'
				);
			}
			onDone();
			return;
		}
		await consumeBodyStream(response.body, onChunk);
		onDone();
	} catch (err) {
		console.error('TTS streaming error:', err.message || err);
		onDone();
	}
}
