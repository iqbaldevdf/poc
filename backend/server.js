import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { initPipeline } from './voicePipeline.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST']
	}
});

// Chat server uses 5000 so it doesn't conflict with PORT=3001 (voice translator in .env)
const PORT = Number(process.env.CHAT_PORT) || 5000;
const pipelines = new Map();

io.on('connection', (socket) => {
	console.log(`[Socket Connected] ${socket.id}`);

	socket.on('join_room', (data) => {
		const roomId = typeof data === 'string' ? data : data?.roomId;
		const language = typeof data === 'object' && data != null ? (data.language || 'es') : 'es';
		const userName = typeof data === 'object' && data != null && data.userName != null
			? String(data.userName).trim() || `User-${socket.id.slice(-6)}`
			: `User-${socket.id.slice(-6)}`;
		if (!roomId) return;
		socket.roomId = roomId;
		socket.language = language;
		socket.userName = userName;
		socket.join(roomId);
		pipelines.set(socket.id, initPipeline(socket, io));
		socket.emit('room_joined', { roomId, socketId: socket.id, userName });
		console.log(`[Join Room] ${socket.id} joined ${roomId} as "${userName}" language=${language}`);
	});

	socket.on('send_message', (data) => {
		const { room, message } = data;
		io.to(room).emit('receive_message', {
			room,
			message,
			sender: socket.id,
			senderName: socket.userName || socket.id
		});
		console.log(`[Send Message] Room: ${room}, ${socket.userName}: ${message}`);
	});

	socket.on('start_speaking', () => {
		const pipeline = pipelines.get(socket.id);
		if (pipeline) pipeline.startSpeaking();
	});

	socket.on('audio_chunk', (data) => {
		const pipeline = pipelines.get(socket.id);
		if (pipeline) pipeline.sendAudio(data);
	});

	socket.on('stop_speaking', () => {
		const pipeline = pipelines.get(socket.id);
		if (pipeline) pipeline.stopSpeaking();
	});

	socket.on('leave_room', () => {
		const pipeline = pipelines.get(socket.id);
		if (pipeline) pipeline.destroy();
		pipelines.delete(socket.id);
		socket.roomId = null;
	});

	socket.on('disconnect', () => {
		const pipeline = pipelines.get(socket.id);
		if (pipeline) pipeline.destroy();
		pipelines.delete(socket.id);
		console.log(`[Socket Disconnected] ${socket.id}`);
	});
});

app.get('/', (req, res) => {
	res.send('Room chat server running');
});

server.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});
