const WordManager = require('./WordManager');

const PHASES = {
  LOBBY: 'lobby',
  PICKING: 'picking',
  DRAWING: 'drawing',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',
};

class Game {
  constructor(settings = {}) {
    this.wordManager = new WordManager();
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
      wordCount: settings.wordCount || 3,
      hints: settings.hints || 2,
    };
    this.currentRound = 0;
    this.currentDrawerIndex = -1;
    this.currentWord = null;
    this.phase = PHASES.LOBBY;
    this.timer = null;
    this.timeLeft = 0;
    this.hintTimer = null;
    this.hintsRevealed = 0;
    this.correctGuessers = 0;
    this.strokes = [];
  }

  getWordOptions() {
    return this.wordManager.getRandomWords(this.settings.wordCount);
  }

  setWord(word) {
    this.currentWord = word;
    this.hintsRevealed = 0;
  }

  getCurrentHint() {
    if (!this.currentWord) return '';
    if (this.hintsRevealed === 0) {
      return this.wordManager.getWordLength(this.currentWord);
    }
    return this.wordManager.generateHint(this.currentWord, this.hintsRevealed);
  }

  checkGuess(guess) {
    if (!this.currentWord) return false;
    return guess.toLowerCase().trim() === this.currentWord.toLowerCase().trim();
  }

  calculatePoints(timeLeft, totalTime) {
    const timeRatio = timeLeft / totalTime;
    const basePoints = 100;
    const timeBonus = Math.floor(timeRatio * 400);
    return basePoints + timeBonus;
  }

  calculateDrawerPoints(correctGuessers, totalPlayers) {
    if (correctGuessers === 0) return 0;
    const ratio = correctGuessers / Math.max(totalPlayers - 1, 1);
    return Math.floor(ratio * 200);
  }

  clearStrokes() {
    this.strokes = [];
  }

  addStroke(stroke) {
    this.strokes.push(stroke);
  }

  undoLastStroke() {
    return this.strokes.pop();
  }

  reset() {
    this.currentRound = 0;
    this.currentDrawerIndex = -1;
    this.currentWord = null;
    this.phase = PHASES.LOBBY;
    this.timeLeft = 0;
    this.hintsRevealed = 0;
    this.correctGuessers = 0;
    this.strokes = [];
    this.clearTimers();
  }

  clearTimers() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.hintTimer) {
      clearInterval(this.hintTimer);
      this.hintTimer = null;
    }
  }
}

Game.PHASES = PHASES;

module.exports = Game;
