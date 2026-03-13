/**
 * Socket.IO voice pipeline: Deepgram STT -> translate -> TTS; stream to other client in room.
 */
import { createDeepgramStream } from './src/deepgramClient.js';
import { translate } from './src/translator.js';
import { streamTTS } from './src/ttsClient.js';

function getOtherInRoom(io, roomId, excludeSocketId) {
	if (!roomId || !io?.sockets?.adapter?.rooms) return null;
	const room = io.sockets.adapter.rooms.get(roomId);
	if (!room) return null;
	for (const sid of room) {
		if (sid !== excludeSocketId) return io.sockets.sockets.get(sid) || null;
	}
	return null;
}

export function initPipeline(socket, io) {
	let deepgramStream = null;
	let isActive = false;

	function startSpeaking() {
		if (isActive) return;
		isActive = true;
		deepgramStream = createDeepgramStream(onFinalTranscript);
	}

	function stopSpeaking() {
		if (!isActive) return;
		isActive = false;
		if (deepgramStream) deepgramStream.close();
		deepgramStream = null;
	}

	async function onFinalTranscript(transcript) {
		try {
			socket.emit('transcript', { text: transcript });
			const roomId = socket.roomId;
			const other = getOtherInRoom(io, roomId, socket.id);
			const targetLang = other?.language || 'es';
			const translatedText = await translate(transcript, targetLang);
			if (other) {
				other.emit('partner_translated', {
					original: transcript,
					translated: translatedText,
					senderName: socket.userName || socket.id
				});
				streamTTS(
					translatedText,
					(chunk) => other.emit('partner_audio', { data: Array.from(chunk) }),
					() => other.emit('partner_audio_done')
				);
			}
		} catch (err) {
			console.error('[VoicePipeline] error:', err?.message || err);
		}
	}

	function sendAudio(data) {
		if (!isActive || !deepgramStream) return;
		deepgramStream.send(data);
	}

	function destroy() {
		stopSpeaking();
	}

	return { startSpeaking, stopSpeaking, sendAudio, destroy };
}
