const fs = require('fs');
const path = require('path');

class WordManager {
  constructor() {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'words.json'), 'utf-8');
    this.wordsByCategory = JSON.parse(raw);
    this.allWords = Object.values(this.wordsByCategory).flat();
  }

  getRandomWords(count = 3) {
    const shuffled = [...this.allWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  generateHint(word, revealCount) {
    const chars = word.split('');
    const letterIndices = [];
    chars.forEach((ch, i) => {
      if (ch !== ' ') letterIndices.push(i);
    });

    const shuffledIndices = [...letterIndices].sort(() => Math.random() - 0.5);
    const toReveal = shuffledIndices.slice(0, Math.min(revealCount, letterIndices.length));

    return chars.map((ch, i) => {
      if (ch === ' ') return ' ';
      if (toReveal.includes(i)) return ch;
      return '_';
    }).join('');
  }

  getWordLength(word) {
    return word.split('').map(ch => (ch === ' ' ? ' ' : '_')).join('');
  }
}

module.exports = WordManager;
