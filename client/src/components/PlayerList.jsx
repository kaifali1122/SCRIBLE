import './PlayerList.css';

function PlayerList({ players, playerId, drawerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="player-list">
      <h3>🏆 Players</h3>
      <div className="player-list-items">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`pl-player ${p.id === playerId ? 'is-me' : ''} ${p.id === drawerId ? 'is-drawer' : ''} ${p.hasGuessedCorrectly ? 'has-guessed' : ''}`}
          >
            <span className="pl-rank">#{i + 1}</span>
            <div className="pl-avatar" style={{ background: getColor(i) }}>
              {p.isDrawing ? '✏️' : p.name.charAt(0).toUpperCase()}
            </div>
            <div className="pl-info">
              <span className="pl-name">
                {p.name}
                {p.id === playerId && <span className="pl-you"> (You)</span>}
              </span>
              <span className="pl-score">{p.score} pts</span>
            </div>
            {p.hasGuessedCorrectly && <span className="pl-guessed">✅</span>}
            {p.isDrawing && <span className="pl-drawing">🎨</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function getColor(i) {
  const colors = [
    '#6c63ff', '#ff6584', '#00d2ff', '#00e676',
    '#ffab40', '#ff4081', '#7c4dff', '#18ffff',
  ];
  return colors[i % colors.length];
}

export default PlayerList;
