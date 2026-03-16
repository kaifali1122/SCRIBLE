import { useState, useEffect } from 'react';
import socket from '../socket';
import './Home.css';

function Home({ onJoinLobby, inviteCode }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState('menu'); // menu, create, join
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Room settings
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hints: 2,
  });

  // If invite code from URL, auto-open join panel
  useEffect(() => {
    if (inviteCode) {
      setRoomCode(inviteCode);
      setMode('join');
    }
  }, [inviteCode]);

  const connect = () => {
    if (!socket.connected) {
      socket.connect();
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setLoading(true);
    connect();

    socket.emit('create_room', { hostName: name.trim(), settings }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoinLobby(res.room, res.playerId, name.trim());
      } else {
        setError(res.error || 'Failed to create room');
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }
    setError('');
    setLoading(true);
    connect();

    socket.emit('join_room', { roomId: roomCode.trim(), playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoinLobby(res.room, res.playerId, name.trim());
      } else {
        setError(res.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="home">
      <div className="home-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="home-content animate-fade-in">
        <div className="home-logo">
          <span className="logo-icon">🎨</span>
          <h1 className="logo-text">
            Skribbl<span className="logo-accent">.io</span>
          </h1>
          <p className="logo-tagline">Draw, Guess, and Have Fun!</p>
        </div>

        {mode === 'menu' && (
          <div className="home-menu animate-slide-up">
            <div className="name-input-group">
              <label>Your Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="menu-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => setMode('create')}>
                ✨ Create Room
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => setMode('join')}>
                🔗 Join Room
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="home-panel glass-card animate-pop-in">
            <h2>Create a Room</h2>

            <div className="settings-grid">
              <div className="setting-item">
                <label>Rounds</label>
                <select
                  className="input"
                  value={settings.rounds}
                  onChange={(e) => setSettings({ ...settings, rounds: +e.target.value })}
                >
                  {[2, 3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <label>Draw Time (sec)</label>
                <select
                  className="input"
                  value={settings.drawTime}
                  onChange={(e) => setSettings({ ...settings, drawTime: +e.target.value })}
                >
                  {[15, 30, 45, 60, 80, 100, 120, 180, 240].map(n => (
                    <option key={n} value={n}>{n}s</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <label>Max Players</label>
                <select
                  className="input"
                  value={settings.maxPlayers}
                  onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <label>Word Choices</label>
                <select
                  className="input"
                  value={settings.wordCount}
                  onChange={(e) => setSettings({ ...settings, wordCount: +e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <label>Hints</label>
                <select
                  className="input"
                  value={settings.hints}
                  onChange={(e) => setSettings({ ...settings, hints: +e.target.value })}
                >
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="panel-actions">
              <button className="btn btn-secondary" onClick={() => { setMode('menu'); setError(''); }}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? '⏳ Creating...' : '🚀 Create Room'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="home-panel glass-card animate-pop-in">
            <h2>Join a Room</h2>

            {!name.trim() && (
              <div className="name-input-group">
                <label>Your Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                />
              </div>
            )}

            <div className="join-input-group">
              <label>Room Code</label>
              <input
                className="input room-code-input"
                type="text"
                placeholder="Enter room code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="panel-actions">
              <button className="btn btn-secondary" onClick={() => { setMode('menu'); setError(''); setRoomCode(''); }}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
                {loading ? '⏳ Joining...' : '🎮 Join Room'}
              </button>
            </div>
          </div>
        )}

        {/* Developer Credit */}
        <div className="home-credit">
          Developed by <span className="credit-name">Kaif</span>
        </div>
      </div>
    </div>
  );
}

export default Home;
