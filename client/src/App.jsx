import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import GameOver from './pages/GameOver';
import './App.css';

function App() {
  const [screen, setScreen] = useState('home');
  const [roomData, setRoomData] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameOverData, setGameOverData] = useState(null);
  const [inviteCode, setInviteCode] = useState('');

  // Check URL for invite link on load: ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      setInviteCode(roomCode.toUpperCase());
    }
  }, []);

  const goToLobby = (room, id, name) => {
    setRoomData(room);
    setPlayerId(id);
    setPlayerName(name);
    setScreen('lobby');
    // Clean URL after joining
    window.history.replaceState({}, '', window.location.pathname);
    setInviteCode('');
  };

  const goToGame = (data) => {
    setRoomData(prev => ({ ...prev, ...data }));
    setScreen('game');
  };

  const goToGameOver = (data) => {
    setGameOverData(data);
    setScreen('gameOver');
  };

  const goToHome = () => {
    setScreen('home');
    setRoomData(null);
    setPlayerId(null);
    setPlayerName('');
    setGameOverData(null);
  };

  const goBackToLobby = (room) => {
    setRoomData(room);
    setScreen('lobby');
    setGameOverData(null);
  };

  return (
    <div className="app">
      {screen === 'home' && (
        <Home onJoinLobby={goToLobby} inviteCode={inviteCode} />
      )}
      {screen === 'lobby' && (
        <Lobby
          roomData={roomData}
          playerId={playerId}
          playerName={playerName}
          onGameStart={goToGame}
          onLeave={goToHome}
        />
      )}
      {screen === 'game' && (
        <Game
          roomData={roomData}
          playerId={playerId}
          playerName={playerName}
          onGameOver={goToGameOver}
          onLeave={goToHome}
        />
      )}
      {screen === 'gameOver' && (
        <GameOver
          data={gameOverData}
          onPlayAgain={goBackToLobby}
          onLeave={goToHome}
        />
      )}
    </div>
  );
}

export default App;
