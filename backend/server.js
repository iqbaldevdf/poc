// Simple real-time room-based messaging server
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 5000;

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[Join Room] Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', (data) => {
    const { room, message } = data;
    io.to(room).emit('receive_message', { room, message, sender: socket.id });
    console.log(`[Send Message] Room: ${room}, Sender: ${socket.id}, Message: ${message}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('Room chat server running');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
