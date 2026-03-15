import { useState, useEffect } from 'react';
import socket from '../socket';
import './Lobby.css';

function Lobby({ roomData, playerId, playerName, onGameStart, onLeave }) {
  const [players, setPlayers] = useState(roomData?.players || []);
  const [settings, setSettings] = useState(roomData?.settings || {});
  const [copied, setCopied] = useState(false);
  const isHost = playerId === roomData?.hostId;

  useEffect(() => {
    socket.on('player_joined', (data) => {
      setPlayers(data.players);
    });

    socket.on('player_left', (data) => {
      setPlayers(data.players);
    });

    socket.on('settings_updated', (data) => {
      setSettings(data.settings);
    });

    socket.on('game_started', (data) => {
      onGameStart(data);
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('settings_updated');
      socket.off('game_started');
    };
  }, [onGameStart]);

  const handleStartGame = () => {
    socket.emit('start_game', {}, (res) => {
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  const handleUpdateSettings = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    socket.emit('update_settings', { settings: newSettings });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomData?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    socket.disconnect();
    onLeave();
  };

  return (
    <div className="lobby">
      <div className="lobby-container animate-fade-in">
        <div className="lobby-header">
          <h1>🎮 Game Lobby</h1>
          <div className="room-code-display" onClick={copyRoomCode}>
            <span className="room-code-label">Room Code</span>
            <span className="room-code-value">{roomData?.id}</span>
            <span className="room-code-copy">{copied ? '✅ Copied!' : '📋 Click to copy'}</span>
          </div>
        </div>

        <div className="lobby-body">
          <div className="lobby-players glass-card">
            <h3>Players ({players.length}/{settings.maxPlayers || 8})</h3>
            <div className="players-grid">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`player-card ${p.id === playerId ? 'is-you' : ''} ${p.id === roomData?.hostId ? 'is-host' : ''}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="player-avatar" style={{ background: getAvatarColor(i) }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="player-name">
                    {p.name}
                    {p.id === roomData?.hostId && <span className="host-badge">👑</span>}
                    {p.id === playerId && <span className="you-badge">(You)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="lobby-settings glass-card">
              <h3>⚙️ Room Settings</h3>
              <div className="settings-list">
                <div className="setting-row">
                  <label>Rounds</label>
                  <select value={settings.rounds} onChange={(e) => handleUpdateSettings('rounds', +e.target.value)}>
                    {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="setting-row">
                  <label>Draw Time</label>
                  <select value={settings.drawTime} onChange={(e) => handleUpdateSettings('drawTime', +e.target.value)}>
                    {[15, 30, 45, 60, 80, 100, 120, 180, 240].map(n => <option key={n} value={n}>{n}s</option>)}
                  </select>
                </div>
                <div className="setting-row">
                  <label>Max Players</label>
                  <select value={settings.maxPlayers} onChange={(e) => handleUpdateSettings('maxPlayers', +e.target.value)}>
                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="setting-row">
                  <label>Word Choices</label>
                  <select value={settings.wordCount} onChange={(e) => handleUpdateSettings('wordCount', +e.target.value)}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="setting-row">
                  <label>Hints</label>
                  <select value={settings.hints} onChange={(e) => handleUpdateSettings('hints', +e.target.value)}>
                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lobby-footer">
          <button className="btn btn-secondary" onClick={handleLeave}>
            🚪 Leave Room
          </button>
          {isHost && (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStartGame}
              disabled={players.length < 2}
            >
              {players.length < 2 ? '⏳ Waiting for players...' : '🚀 Start Game'}
            </button>
          )}
          {!isHost && (
            <div className="waiting-text">
              ⏳ Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(index) {
  const colors = [
    'linear-gradient(135deg, #6c63ff, #4834d4)',
    'linear-gradient(135deg, #ff6584, #ee5a24)',
    'linear-gradient(135deg, #00d2ff, #0078ff)',
    'linear-gradient(135deg, #00e676, #00c853)',
    'linear-gradient(135deg, #ffab40, #ff6f00)',
    'linear-gradient(135deg, #ff4081, #c51162)',
    'linear-gradient(135deg, #7c4dff, #651fff)',
    'linear-gradient(135deg, #18ffff, #00b8d4)',
  ];
  return colors[index % colors.length];
}

export default Lobby;
