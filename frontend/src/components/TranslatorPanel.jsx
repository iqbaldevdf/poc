
import React, { useState, useRef } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import useAudioCapture from '../hooks/useAudioCapture';
import useAudioPlayer from '../hooks/useAudioPlayer';

const LANGUAGES = [
	{ code: 'es', name: 'Spanish' },
	{ code: 'fr', name: 'French' },
	{ code: 'de', name: 'German' },
	{ code: 'hi', name: 'Hindi' },
	{ code: 'ar', name: 'Arabic' },
	{ code: 'zh', name: 'Chinese' },
	{ code: 'ja', name: 'Japanese' },
	{ code: 'ko', name: 'Korean' },
	{ code: 'pt', name: 'Portuguese' }
];

export default function TranslatorPanel() {
	const [transcript, setTranscript] = useState('');
	const [translation, setTranslation] = useState('');
	const [targetLang, setTargetLang] = useState('hi');
	const [latencyMs, setLatencyMs] = useState(null);
	const transcriptTime = useRef(null);
	const { appendChunk, playAccumulated } = useAudioPlayer();

	const onMessage = (msg) => {
		if (msg.type === 'transcript') {
			setTranscript(msg.text);
			transcriptTime.current = Date.now();
		} else if (msg.type === 'translation') {
			setTranslation(msg.text);
		} else if (msg.type === 'audio') {
			appendChunk(new Uint8Array(msg.data));
		} else if (msg.type === 'audio_done') {
			playAccumulated();
			if (transcriptTime.current) {
				setLatencyMs(Date.now() - transcriptTime.current);
			}
		}
	};

	const wsUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:3001';
	const { send, isConnected } = useWebSocket(wsUrl, onMessage);
	const { startRecording, stopRecording, isRecording } = useAudioCapture(async (blob) => {
		const arrayBuffer = await blob.arrayBuffer();
		send(arrayBuffer);
	});

	const handleLangChange = (e) => {
		const value = e.target.value;
		setTargetLang(value);
		send(JSON.stringify({ type: 'config', targetLang: value }));
	};

	const handleToggle = () => {
		if (!isRecording) {
			startRecording();
		} else {
			stopRecording();
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
			<h1 className="text-3xl font-bold mb-6">Real-Time Voice Translator</h1>
			<div className="flex items-center mb-4">
				<span className={`h-3 w-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
				<span>{isConnected ? 'Connected' : 'Disconnected'}</span>
			</div>
			<div className="mb-6 flex items-center">
				<label className="mr-2">Translate to:</label>
				<select value={targetLang} onChange={handleLangChange} className="bg-slate-800 text-white rounded px-3 py-1">
					{LANGUAGES.map(lang => (
						<option key={lang.code} value={lang.code}>{lang.name}</option>
					))}
				</select>
			</div>
			<button
				onClick={handleToggle}
				className={`w-32 h-32 rounded-full flex items-center justify-center text-xl font-bold mb-8 transition-all duration-200 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-blue-800 hover:bg-blue-700'}`}
			>
				{isRecording ? 'Stop' : 'Start'}
			</button>
			<div className="flex w-full max-w-3xl gap-6 mb-8">
				<div className="flex-1 bg-slate-800 rounded p-4 overflow-y-auto max-h-64">
					<h2 className="text-lg font-semibold mb-2">Original (English)</h2>
					<div className="whitespace-pre-wrap break-words">{transcript}</div>
				</div>
				<div className="flex-1 bg-slate-800 rounded p-4 overflow-y-auto max-h-64">
					<h2 className="text-lg font-semibold mb-2">Translation</h2>
					<div className="whitespace-pre-wrap break-words">{translation}</div>
				</div>
			</div>
			<div className="mt-4 text-slate-400">Latency: {latencyMs !== null ? `${latencyMs} ms` : '---'}</div>
		</div>
	);
}
