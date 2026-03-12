import { useRef, useState } from 'react';

export default function useAudioCapture(onAudioChunk) {
	const mediaRecorderRef = useRef(null);
	const [isRecording, setIsRecording] = useState(false);
	const firstChunkLogged = useRef(false);

	const startRecording = async () => {
		firstChunkLogged.current = false;
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const mediaRecorder = new window.MediaRecorder(stream, {
			mimeType: 'audio/webm;codecs=opus'
		});
		mediaRecorderRef.current = mediaRecorder;
		mediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				if (!firstChunkLogged.current) {
					firstChunkLogged.current = true;
					console.log('[Mic] First audio chunk captured, size:', e.data.size);
				}
				onAudioChunk(e.data);
			}
		};
		mediaRecorder.start(250);
		setIsRecording(true);
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
		}
		setIsRecording(false);
	};

	return { startRecording, stopRecording, isRecording };
}
