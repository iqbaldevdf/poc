import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import useAudioCapture from './hooks/useAudioCapture';
import useAudioPlayer from './hooks/useAudioPlayer';

const socket = io('http://127.0.0.1:5000');

const LANGUAGES = [
	{ code: 'en', name: 'English' },
	{ code: 'es', name: 'Spanish' },
	{ code: 'fr', name: 'French' },
	{ code: 'de', name: 'German' },
	{ code: 'hi', name: 'Hindi' },
	{ code: 'ta', name: 'Tamil' },
	{ code: 'ar', name: 'Arabic' },
	{ code: 'zh', name: 'Chinese' },
	{ code: 'ja', name: 'Japanese' },
	{ code: 'ko', name: 'Korean' },
	{ code: 'pt', name: 'Portuguese' }
];

export default function App() {
	const [room, setRoom] = useState('');
	const [userName, setUserName] = useState('');
	const [message, setMessage] = useState('');
	const [messages, setMessages] = useState([]);
	const [joined, setJoined] = useState(false);
	const [language, setLanguage] = useState('es');
	const [myTranscript, setMyTranscript] = useState('');
	const [partnerTranslated, setPartnerTranslated] = useState(null);
	const [mySocketId, setMySocketId] = useState(null);
	const { appendChunk, playAccumulated } = useAudioPlayer();

	const sendAudioChunk = (blob) => {
		blob.arrayBuffer().then((buffer) => socket.emit('audio_chunk', buffer));
	};
	const { startRecording, stopRecording, isRecording } = useAudioCapture(sendAudioChunk);

	useEffect(() => {
		socket.on('room_joined', (data) => {
			if (data.socketId) setMySocketId(data.socketId);
		});
		socket.on('receive_message', (data) => {
			setMessages((prev) => [...prev, data]);
		});
		socket.on('transcript', (data) => {
			setMyTranscript(data.text || '');
		});
		socket.on('partner_translated', (data) => {
			setPartnerTranslated(data);
			setMessages((prev) => [...prev, {
				sender: 'partner',
				senderName: data.senderName || 'Partner',
				message: data.translated,
				original: data.original
			}]);
		});
		socket.on('partner_audio', (data) => {
			if (data?.data) appendChunk(new Uint8Array(data.data));
		});
		socket.on('partner_audio_done', () => {
			playAccumulated();
		});
		return () => {
			socket.off('room_joined');
			socket.off('receive_message');
			socket.off('transcript');
			socket.off('partner_translated');
			socket.off('partner_audio');
			socket.off('partner_audio_done');
		};
	}, [appendChunk, playAccumulated]);

	const handleJoin = () => {
		if (room) {
			const name = (userName && userName.trim()) ? userName.trim() : `User-${Date.now().toString(36).slice(-5)}`;
			socket.emit('join_room', { roomId: room, language, userName: name });
			setUserName(name);
			setJoined(true);
		}
	};

	const handleSend = () => {
		if (room && message) {
			socket.emit('send_message', { room, message });
			setMessage('');
		}
	};

	const handleStartRecording = () => {
		socket.emit('start_speaking');
		startRecording();
	};

	const handleStopRecording = () => {
		socket.emit('stop_speaking');
		stopRecording();
		setMyTranscript('');
		setPartnerTranslated(null);
	};

	return (
		<div style={{ maxWidth: 480, margin: '40px auto', padding: 20, background: '#222', color: '#fff', borderRadius: 8 }}>
			<h2>Room Chat + Voice Translate</h2>
			<div style={{ marginBottom: 16 }}>
				<input
					type="text"
					placeholder="Your name"
					value={userName}
					onChange={e => setUserName(e.target.value)}
					style={{ width: '100%', padding: 8, marginBottom: 8 }}
					disabled={joined}
				/>
				<input
					type="text"
					placeholder="Room ID"
					value={room}
					onChange={e => setRoom(e.target.value)}
					style={{ width: '100%', padding: 8, marginBottom: 8 }}
				/>
				<select
					value={language}
					onChange={e => setLanguage(e.target.value)}
					style={{ width: '100%', padding: 8, marginBottom: 8 }}
					disabled={joined}
				>
					{LANGUAGES.map(lang => (
						<option key={lang.code} value={lang.code}>{lang.name}</option>
					))}
				</select>
				<button onClick={handleJoin} disabled={joined} style={{ width: '100%', padding: 8, marginBottom: 8 }}>
					Join Room
				</button>
			</div>

			{joined && (
				<>
					<div style={{ marginBottom: 16, padding: 12, background: '#333', borderRadius: 4 }}>
						<div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>Voice (speak English → translated to your language)</div>
						{myTranscript && <div style={{ marginBottom: 6 }}>You said: {myTranscript}</div>}
						{partnerTranslated && (
							<div style={{ marginBottom: 6 }}>
								<div><strong>{partnerTranslated.senderName || 'Partner'}</strong> said (translated): {partnerTranslated.translated}</div>
								<div style={{ fontSize: 11, color: '#888' }}>Original: {partnerTranslated.original}</div>
							</div>
						)}
						<button
							onClick={isRecording ? handleStopRecording : handleStartRecording}
							style={{
								width: '100%',
								padding: 10,
								background: isRecording ? '#c00' : '#063',
								color: '#fff',
								border: 'none',
								borderRadius: 4,
								fontWeight: 'bold'
							}}
						>
							{isRecording ? 'Stop recording' : 'Start recording'}
						</button>
					</div>

					<div style={{ marginBottom: 16 }}>
						<input
							type="text"
							placeholder="Text message"
							value={message}
							onChange={e => setMessage(e.target.value)}
							style={{ width: '100%', padding: 8, marginBottom: 8 }}
						/>
						<button onClick={handleSend} disabled={!message} style={{ width: '100%', padding: 8 }}>
							Send Message
						</button>
					</div>
				</>
			)}

			<div style={{ background: '#333', borderRadius: 4, padding: 8, minHeight: 100 }}>
				<h4>Messages</h4>
				<ul style={{ listStyle: 'none', padding: 0 }}>
					{messages.map((msg, idx) => (
						<li key={idx} style={{ marginBottom: 6 }}>
							<span style={{ fontWeight: 'bold' }}>{msg.sender === mySocketId ? 'You' : (msg.senderName || (msg.sender === 'partner' ? 'Partner' : msg.sender))}:</span>{' '}
							{msg.message}
							{msg.original != null && <span style={{ fontSize: 11, color: '#888' }}> ({msg.original})</span>}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
