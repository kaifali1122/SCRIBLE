import './WordSelector.css';

function WordSelector({ words, onSelect }) {
  return (
    <div className="word-selector-overlay">
      <div className="word-selector glass-card animate-pop-in">
        <h2>Choose a word to draw!</h2>
        <p className="ws-subtitle">Pick one of the words below</p>
        <div className="ws-options">
          {words.map((word, i) => (
            <button
              key={i}
              className="ws-word-btn"
              onClick={() => onSelect(word)}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WordSelector;
