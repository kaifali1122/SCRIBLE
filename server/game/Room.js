const { v4: uuidv4 } = require('uuid');
const Player = require('./Player');
const Game = require('./Game');

class Room {
  constructor(hostId, hostName, settings = {}) {
    this.id = this.generateRoomCode();
    this.hostId = hostId;
    this.players = [];
    this.game = new Game(settings);

    this.addPlayer(hostId, hostName);
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(id, name) {
    if (this.players.length >= this.game.settings.maxPlayers) {
      return { error: 'Room is full' };
    }
    if (this.game.phase !== Game.PHASES.LOBBY) {
      return { error: 'Game already in progress' };
    }

    const player = new Player(id, name);
    this.players.push(player);
    return { player };
  }

  removePlayer(id) {
    const index = this.players.findIndex(p => p.id === id);
    if (index === -1) return null;

    const removed = this.players.splice(index, 1)[0];

    if (this.players.length === 0) {
      return { removed, empty: true };
    }

    // Transfer host if host left
    if (id === this.hostId) {
      this.hostId = this.players[0].id;
    }

    // If the drawer left during a game, end the round
    if (removed.isDrawing && this.game.phase === Game.PHASES.DRAWING) {
      return { removed, drawerLeft: true };
    }

    return { removed };
  }

  getPlayer(id) {
    return this.players.find(p => p.id === id);
  }

  getDrawer() {
    return this.players.find(p => p.isDrawing);
  }

  startGame() {
    this.game.currentRound = 0;
    this.game.currentDrawerIndex = -1;
    this.players.forEach(p => {
      p.score = 0;
      p.isDrawing = false;
      p.hasGuessedCorrectly = false;
    });
    this.game.phase = Game.PHASES.PICKING;
  }

  nextTurn() {
    // Reset all players for this round
    this.players.forEach(p => {
      p.isDrawing = false;
      p.resetRound();
    });

    this.game.currentDrawerIndex++;

    // If we've gone through all players, next round
    if (this.game.currentDrawerIndex >= this.players.length) {
      this.game.currentDrawerIndex = 0;
      this.game.currentRound++;
    }

    // Check if game is over
    if (this.game.currentRound >= this.game.settings.rounds) {
      this.game.phase = Game.PHASES.GAME_OVER;
      return { gameOver: true };
    }

    // Set the next drawer
    const drawer = this.players[this.game.currentDrawerIndex];
    drawer.isDrawing = true;
    this.game.phase = Game.PHASES.PICKING;
    this.game.currentWord = null;
    this.game.correctGuessers = 0;
    this.game.clearStrokes();

    return {
      drawer,
      wordOptions: this.game.getWordOptions(),
      round: this.game.currentRound + 1,
      totalRounds: this.game.settings.rounds,
    };
  }

  getLeaderboard() {
    return [...this.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
      }));
  }

  allGuessedCorrectly() {
    const nonDrawers = this.players.filter(p => !p.isDrawing);
    return nonDrawers.every(p => p.hasGuessedCorrectly);
  }

  toJSON() {
    return {
      id: this.id,
      hostId: this.hostId,
      players: this.players.map(p => p.toJSON()),
      phase: this.game.phase,
      currentRound: this.game.currentRound + 1,
      totalRounds: this.game.settings.rounds,
      settings: this.game.settings,
      timeLeft: this.game.timeLeft,
    };
  }
}

module.exports = Room;
