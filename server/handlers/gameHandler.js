const Game = require('../game/Game');
const { rooms, getRoomId, handleNextTurn } = require('./roomHandler');

function registerGameHandlers(io, socket) {
  // Word chosen by drawer
  socket.on('word_chosen', ({ word }) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    const drawer = room.getDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    room.game.setWord(word);
    room.game.phase = Game.PHASES.DRAWING;
    room.game.timeLeft = room.game.settings.drawTime;

    const hint = room.game.getCurrentHint();

    // Broadcast drawing phase started
    io.to(roomId).emit('drawing_started', {
      phase: Game.PHASES.DRAWING,
      hint: hint,
      drawTime: room.game.settings.drawTime,
      drawerId: drawer.id,
    });

    // Send actual word to drawer
    io.to(drawer.id).emit('your_word', { word });

    // Start countdown timer
    room.game.timer = setInterval(() => {
      room.game.timeLeft--;

      io.to(roomId).emit('timer_update', { timeLeft: room.game.timeLeft });

      if (room.game.timeLeft <= 0) {
        endRound(io, room, roomId, 'Time is up!');
      }
    }, 1000);

    // Start hint timer
    if (room.game.settings.hints > 0) {
      const hintInterval = Math.floor(room.game.settings.drawTime / (room.game.settings.hints + 1));
      room.game.hintTimer = setInterval(() => {
        room.game.hintsRevealed++;
        const newHint = room.game.getCurrentHint();
        
        // Send hint update to non-drawers only
        room.players.forEach(p => {
          if (!p.isDrawing) {
            io.to(p.id).emit('hint_update', { hint: newHint });
          }
        });

        if (room.game.hintsRevealed >= room.game.settings.hints) {
          clearInterval(room.game.hintTimer);
          room.game.hintTimer = null;
        }
      }, hintInterval * 1000);
    }
  });

  // Guess
  socket.on('guess', ({ text }) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== Game.PHASES.DRAWING) return;

    const player = room.getPlayer(socket.id);
    if (!player || player.isDrawing || player.hasGuessedCorrectly) return;

    const isCorrect = room.game.checkGuess(text);

    if (isCorrect) {
      player.hasGuessedCorrectly = true;
      player.guessTime = Date.now();
      room.game.correctGuessers++;

      // Calculate and add points
      const guesserPoints = room.game.calculatePoints(
        room.game.timeLeft,
        room.game.settings.drawTime
      );
      player.addScore(guesserPoints);

      // Award drawer points
      const drawer = room.getDrawer();
      if (drawer) {
        const drawerPoints = room.game.calculateDrawerPoints(
          room.game.correctGuessers,
          room.players.length
        );
        drawer.score = room.players.find(p => p.isDrawing).score; // Reset
        drawer.addScore(drawerPoints);
      }

      // Broadcast correct guess
      io.to(roomId).emit('guess_result', {
        correct: true,
        playerId: player.id,
        playerName: player.name,
        points: guesserPoints,
        players: room.players.map(p => p.toJSON()),
      });

      // Check if all non-drawers guessed correctly
      if (room.allGuessedCorrectly()) {
        endRound(io, room, roomId, 'Everyone guessed it!');
      }
    } else {
      // Check for close guess (within 1-2 characters)
      const isClose = isCloseGuess(text, room.game.currentWord);

      // Broadcast incorrect guess as chat message
      io.to(roomId).emit('chat_message', {
        playerId: player.id,
        playerName: player.name,
        text: text,
        isClose: isClose,
        type: 'guess',
      });
    }
  });

  // Chat message
  socket.on('chat', ({ text }) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    // Don't allow drawer to chat during drawing
    if (player.isDrawing && room.game.phase === Game.PHASES.DRAWING) return;

    io.to(roomId).emit('chat_message', {
      playerId: player.id,
      playerName: player.name,
      text: text,
      type: 'chat',
    });
  });
}

function endRound(io, room, roomId, reason) {
  room.game.clearTimers();
  room.game.phase = Game.PHASES.ROUND_END;

  io.to(roomId).emit('round_end', {
    word: room.game.currentWord,
    reason: reason,
    players: room.players.map(p => p.toJSON()),
    leaderboard: room.getLeaderboard(),
  });

  // Wait 5 seconds then start next turn
  setTimeout(() => {
    if (!rooms.has(roomId)) return;
    handleNextTurn(io, room, roomId);
  }, 5000);
}

function isCloseGuess(guess, word) {
  if (!word) return false;
  const g = guess.toLowerCase().trim();
  const w = word.toLowerCase().trim();
  if (g.length < 2) return false;
  
  // Check if the guess is within 2 edit distance
  const distance = levenshtein(g, w);
  return distance <= 2 && distance > 0;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

module.exports = { registerGameHandlers };
