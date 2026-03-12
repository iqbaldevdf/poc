import { useRef } from 'react';

/** Concatenate multiple Uint8Arrays into one. */
function concatChunks(chunks) {
	const total = chunks.reduce((acc, c) => acc + c.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.length;
	}
	return out;
}

export default function useAudioPlayer() {
	const audioCtxRef = useRef(null);
	const chunkBufferRef = useRef([]);

	const appendChunk = (uint8array) => {
		if (uint8array && uint8array.length > 0) {
			chunkBufferRef.current.push(uint8array);
		}
	};

	const playAccumulated = async () => {
		const chunks = chunkBufferRef.current;
		chunkBufferRef.current = [];
		if (chunks.length === 0) return;
		try {
			if (!audioCtxRef.current) {
				audioCtxRef.current = new window.AudioContext();
			}
			const audioCtx = audioCtxRef.current;
			if (audioCtx.state === 'suspended') {
				await audioCtx.resume();
			}
			const combined = concatChunks(chunks);
			const buffer = await audioCtx.decodeAudioData(combined.buffer.slice(0));
			const source = audioCtx.createBufferSource();
			source.buffer = buffer;
			source.connect(audioCtx.destination);
			source.start(0);
		} catch (err) {
			console.error('AudioPlayer error:', err.message || err);
		}
	};

	return { appendChunk, playAccumulated };
}
