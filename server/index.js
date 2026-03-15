const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { registerRoomHandlers } = require('./handlers/roomHandler');
const { registerGameHandlers } = require('./handlers/gameHandler');
const { registerDrawHandlers } = require('./handlers/drawHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Skribbl server running on http://localhost:${PORT}`);
});
