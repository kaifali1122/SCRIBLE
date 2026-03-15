const Room = require('../game/Room');
const Game = require('../game/Game');

// In-memory room storage
const rooms = new Map();

function registerRoomHandlers(io, socket) {
  // Create room
  socket.on('create_room', ({ hostName, settings }, callback) => {
    const room = new Room(socket.id, hostName, settings);
    rooms.set(room.id, room);
    socket.join(room.id);

    callback({
      success: true,
      room: room.toJSON(),
      playerId: socket.id,
    });
  });

  // Join room
  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const code = roomId.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    const result = room.addPlayer(socket.id, playerName);
    if (result.error) {
      return callback({ success: false, error: result.error });
    }

    socket.join(code);

    // Broadcast to other players
    socket.to(code).emit('player_joined', {
      player: result.player.toJSON(),
      players: room.players.map(p => p.toJSON()),
    });

    callback({
      success: true,
      room: room.toJSON(),
      playerId: socket.id,
    });
  });

  // Start game
  socket.on('start_game', (_, callback) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);

    if (!room) return callback?.({ success: false, error: 'Room not found' });
    if (socket.id !== room.hostId) return callback?.({ success: false, error: 'Only host can start' });
    if (room.players.length < 2) return callback?.({ success: false, error: 'Need at least 2 players' });

    room.startGame();
    const turnData = room.nextTurn();

    // Broadcast game started to all FIRST (so Game component mounts)
    io.to(roomId).emit('game_started', {
      phase: room.game.phase,
      drawerId: turnData.drawer.id,
      drawerName: turnData.drawer.name,
      round: turnData.round,
      totalRounds: turnData.totalRounds,
      players: room.players.map(p => p.toJSON()),
    });

    // Send word options AFTER a delay so the Game component has time to mount
    setTimeout(() => {
      io.to(turnData.drawer.id).emit('word_options', {
        words: turnData.wordOptions,
      });
    }, 600);

    callback?.({ success: true });
  });

  // Update settings
  socket.on('update_settings', ({ settings }) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.hostId) return;

    Object.assign(room.game.settings, settings);
    io.to(roomId).emit('settings_updated', { settings: room.game.settings });
  });

  // Player disconnect
  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms) {
      const result = room.removePlayer(socket.id);
      if (!result) continue;

      if (result.empty) {
        room.game.clearTimers();
        rooms.delete(roomId);
        break;
      }

      io.to(roomId).emit('player_left', {
        playerId: socket.id,
        playerName: result.removed.name,
        players: room.players.map(p => p.toJSON()),
        newHostId: room.hostId,
      });

      if (result.drawerLeft) {
        room.game.clearTimers();
        handleNextTurn(io, room, roomId);
      }

      // If only 1 player left during game, end the game
      if (room.players.length < 2 && room.game.phase !== Game.PHASES.LOBBY) {
        room.game.clearTimers();
        room.game.phase = Game.PHASES.GAME_OVER;
        io.to(roomId).emit('game_over', {
          leaderboard: room.getLeaderboard(),
          reason: 'Not enough players',
        });
      }

      break;
    }
  });

  // Play again
  socket.on('play_again', () => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    room.game.reset();
    room.players.forEach(p => {
      p.score = 0;
      p.isDrawing = false;
      p.hasGuessedCorrectly = false;
    });

    io.to(roomId).emit('back_to_lobby', {
      room: room.toJSON(),
    });
  });
}

function handleNextTurn(io, room, roomId) {
  const turnData = room.nextTurn();

  if (turnData.gameOver) {
    room.game.phase = Game.PHASES.GAME_OVER;
    io.to(roomId).emit('game_over', {
      leaderboard: room.getLeaderboard(),
    });
    return;
  }

  // Send word options to drawer
  io.to(turnData.drawer.id).emit('word_options', {
    words: turnData.wordOptions,
  });

  // Broadcast new turn to all
  io.to(roomId).emit('new_turn', {
    drawerId: turnData.drawer.id,
    drawerName: turnData.drawer.name,
    round: turnData.round,
    totalRounds: turnData.totalRounds,
    phase: Game.PHASES.PICKING,
    players: room.players.map(p => p.toJSON()),
  });
}

function getRoomId(socket) {
  const socketRooms = [...socket.rooms];
  return socketRooms.find(r => r !== socket.id);
}

module.exports = { registerRoomHandlers, rooms, getRoomId, handleNextTurn };
