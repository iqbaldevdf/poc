
// import TranslatorPanel from './components/TranslatorPanel';

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Chat server is Socket.IO on port 5000 (backend/server.js). Use HTTP URL, not ws://
const socket = io('http://127.0.0.1:5000');

export default function App() {
	const [room, setRoom] = useState('');
	const [message, setMessage] = useState('');
	const [messages, setMessages] = useState([]);
	const [joined, setJoined] = useState(false);

	useEffect(() => {
		socket.on('receive_message', (data) => {
			setMessages((prev) => [...prev, data]);
		});
		return () => {
			socket.off('receive_message');
		};
	}, []);

	const handleJoin = () => {
		if (room) {
			socket.emit('join_room', room);
			setJoined(true);
		}
	};

	const handleSend = () => {
		if (room && message) {
			socket.emit('send_message', { room, message });
			setMessage('');
		}
	};

	return (
		<div style={{ maxWidth: 400, margin: '40px auto', padding: 20, background: '#222', color: '#fff', borderRadius: 8 }}>
			<h2>Room Chat Demo</h2>
			<div style={{ marginBottom: 16 }}>
				<input
					type="text"
					placeholder="Room ID"
					value={room}
					onChange={e => setRoom(e.target.value)}
					style={{ width: '100%', padding: 8, marginBottom: 8 }}
				/>
				<button onClick={handleJoin} disabled={joined} style={{ width: '100%', padding: 8, marginBottom: 8 }}>
					Join Room
				</button>
			</div>
			<div style={{ marginBottom: 16 }}>
				<input
					type="text"
					placeholder="Message"
					value={message}
					onChange={e => setMessage(e.target.value)}
					style={{ width: '100%', padding: 8, marginBottom: 8 }}
				/>
				<button onClick={handleSend} disabled={!joined} style={{ width: '100%', padding: 8 }}>
					Send Message
				</button>
			</div>
			<div style={{ background: '#333', borderRadius: 4, padding: 8, minHeight: 100 }}>
				<h4>Messages:</h4>
				<ul style={{ listStyle: 'none', padding: 0 }}>
					{messages.map((msg, idx) => (
						<li key={idx} style={{ marginBottom: 6 }}>
							<span style={{ fontWeight: 'bold' }}>{msg.sender}:</span> {msg.message}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
