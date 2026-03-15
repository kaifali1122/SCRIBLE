class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.isDrawing = false;
    this.hasGuessedCorrectly = false;
    this.guessTime = null;
  }

  addScore(points) {
    this.score += points;
  }

  resetRound() {
    this.hasGuessedCorrectly = false;
    this.guessTime = null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isDrawing: this.isDrawing,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
    };
  }
}

module.exports = Player;
