import socket from '../socket';
import './GameOver.css';

function GameOver({ data, onPlayAgain, onLeave }) {
  const leaderboard = data?.leaderboard || [];
  const winner = leaderboard[0];

  const handlePlayAgain = () => {
    socket.on('back_to_lobby', (lobbyData) => {
      socket.off('back_to_lobby');
      onPlayAgain(lobbyData.room);
    });
    socket.emit('play_again');
  };

  return (
    <div className="game-over">
      <div className="go-content animate-fade-in">
        <div className="go-header">
          <span className="go-trophy">🏆</span>
          <h1>Game Over!</h1>
          {winner && (
            <div className="go-winner animate-pop-in">
              <span className="go-winner-label">Winner</span>
              <span className="go-winner-name">{winner.name}</span>
              <span className="go-winner-score">{winner.score} points</span>
            </div>
          )}
          {data?.reason && (
            <p className="go-reason">{data.reason}</p>
          )}
        </div>

        <div className="go-leaderboard glass-card">
          <h3>Final Standings</h3>
          <div className="go-rankings">
            {leaderboard.map((p, i) => (
              <div
                key={p.id}
                className={`go-rank-item rank-${i + 1}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="go-rank-pos">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="go-rank-name">{p.name}</span>
                <span className="go-rank-score">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="go-actions">
          <button className="btn btn-primary btn-lg" onClick={handlePlayAgain}>
            🔄 Play Again
          </button>
          <button className="btn btn-secondary" onClick={onLeave}>
            🚪 Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameOver;
