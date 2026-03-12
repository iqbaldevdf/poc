
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export function createDeepgramStream(onFinalTranscript) {
	const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
	const connection = deepgram.listen.live({
		model: 'nova-3',
		language: 'en-US',
		interim_results: true,
		endpointing: 300
	});

	connection.on(LiveTranscriptionEvents.Transcript, (event) => {
		const transcript = event.channel.alternatives[0]?.transcript || '';
		if (event.is_final && transcript.trim()) {
			onFinalTranscript(transcript);
		}
	});

	connection.on(LiveTranscriptionEvents.Error, (err) => {
		const msg = err?.message ?? err?.reason ?? (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
		console.error('Deepgram error:', msg);
	});

	return {
		send: (audioChunk) => connection.send(audioChunk),
		close: () => connection.finish()
	};
}
