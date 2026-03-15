import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import Canvas from '../components/Canvas';
import DrawingTools from '../components/DrawingTools';
import ChatPanel from '../components/ChatPanel';
import PlayerList from '../components/PlayerList';
import WordSelector from '../components/WordSelector';
import Timer from '../components/Timer';
import './Game.css';

function Game({ roomData, playerId, playerName, onGameOver, onLeave }) {
  const [phase, setPhase] = useState('picking');
  const [players, setPlayers] = useState(roomData?.players || []);
  const [drawerId, setDrawerId] = useState(roomData?.drawerId || null);
  const [drawerName, setDrawerName] = useState(roomData?.drawerName || '');
  const [hint, setHint] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [wordOptions, setWordOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [drawTime, setDrawTime] = useState(roomData?.settings?.drawTime || 80);
  const [round, setRound] = useState(roomData?.round || 1);
  const [totalRounds, setTotalRounds] = useState(roomData?.totalRounds || 3);
  const [messages, setMessages] = useState([]);
  const [roundEndData, setRoundEndData] = useState(null);
  
  // Drawing state
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('brush'); // brush, eraser
  const canvasRef = useRef(null);

  const isDrawer = playerId === drawerId;

  useEffect(() => {
    // Word options for the drawer
    socket.on('word_options', (data) => {
      setWordOptions(data.words);
      setPhase('picking');
    });

    // Drawing started
    socket.on('drawing_started', (data) => {
      setPhase('drawing');
      setHint(data.hint);
      setDrawTime(data.drawTime);
      setTimeLeft(data.drawTime);
      setDrawerId(data.drawerId);
      setRoundEndData(null);
    });

    // Word sent to drawer
    socket.on('your_word', (data) => {
      setCurrentWord(data.word);
    });

    // Timer updates
    socket.on('timer_update', (data) => {
      setTimeLeft(data.timeLeft);
    });

    // Hint updates
    socket.on('hint_update', (data) => {
      setHint(data.hint);
    });

    // Guess results
    socket.on('guess_result', (data) => {
      setPlayers(data.players);
      setMessages(prev => [...prev, {
        type: 'system',
        text: `🎉 ${data.playerName} guessed the word! (+${data.points})`,
        correct: true,
      }]);
    });

    // Chat messages
    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, {
        type: data.type,
        playerId: data.playerId,
        playerName: data.playerName,
        text: data.text,
        isClose: data.isClose,
      }]);
    });

    // Round end
    socket.on('round_end', (data) => {
      setPhase('round_end');
      setPlayers(data.players);
      setRoundEndData(data);
      setMessages(prev => [...prev, {
        type: 'system',
        text: `⏰ Round over! The word was: ${data.word}`,
      }]);
    });

    // New turn
    socket.on('new_turn', (data) => {
      setDrawerId(data.drawerId);
      setDrawerName(data.drawerName);
      setRound(data.round);
      setTotalRounds(data.totalRounds);
      setPhase('picking');
      setPlayers(data.players);
      setCurrentWord('');
      setHint('');
      setRoundEndData(null);
      // Clear canvas ref
      if (canvasRef.current) canvasRef.current.clearCanvas();
    });

    // Game over
    socket.on('game_over', (data) => {
      onGameOver(data);
    });

    // Player left during game
    socket.on('player_left', (data) => {
      setPlayers(data.players);
      setMessages(prev => [...prev, {
        type: 'system',
        text: `😢 ${data.playerName} left the game`,
      }]);
    });

    // Canvas events
    socket.on('draw_data', (data) => {
      if (canvasRef.current) {
        canvasRef.current.handleRemoteDraw(data);
      }
    });

    socket.on('canvas_cleared', () => {
      if (canvasRef.current) canvasRef.current.clearCanvas();
    });

    socket.on('canvas_undo', (data) => {
      if (canvasRef.current) canvasRef.current.redrawStrokes(data.strokes);
    });

    return () => {
      socket.off('word_options');
      socket.off('drawing_started');
      socket.off('your_word');
      socket.off('timer_update');
      socket.off('hint_update');
      socket.off('guess_result');
      socket.off('chat_message');
      socket.off('round_end');
      socket.off('new_turn');
      socket.off('game_over');
      socket.off('player_left');
      socket.off('draw_data');
      socket.off('canvas_cleared');
      socket.off('canvas_undo');
    };
  }, [onGameOver, playerId]);

  const handleWordSelect = (word) => {
    socket.emit('word_chosen', { word });
    setWordOptions([]);
  };

  const handleGuess = (text) => {
    socket.emit('guess', { text });
  };

  const handleClearCanvas = () => {
    socket.emit('canvas_clear');
  };

  const handleUndo = () => {
    socket.emit('draw_undo');
  };

  return (
    <div className="game">
      {/* Word selector modal */}
      {isDrawer && wordOptions.length > 0 && phase === 'picking' && (
        <WordSelector words={wordOptions} onSelect={handleWordSelect} />
      )}

      {/* Top bar */}
      <div className="game-topbar">
        <div className="topbar-left">
          <span className="round-badge">
            Round {round}/{totalRounds}
          </span>
        </div>
        <div className="topbar-center">
          {phase === 'picking' && !isDrawer && (
            <div className="word-display picking-text">
              {drawerName} is choosing a word...
            </div>
          )}
          {phase === 'picking' && isDrawer && (
            <div className="word-display picking-text">
              Choose a word to draw!
            </div>
          )}
          {phase === 'drawing' && isDrawer && (
            <div className="word-display drawer-word">
              ✏️ Draw: <strong>{currentWord}</strong>
            </div>
          )}
          {phase === 'drawing' && !isDrawer && (
            <div className="word-display hint-display">
              {hint.split('').map((ch, i) => (
                <span key={i} className={`hint-char ${ch === '_' ? 'blank' : ch === ' ' ? 'space' : 'revealed'}`}>
                  {ch === '_' ? '_' : ch}
                </span>
              ))}
            </div>
          )}
          {phase === 'round_end' && roundEndData && (
            <div className="word-display round-end-word">
              The word was: <strong>{roundEndData.word}</strong>
            </div>
          )}
        </div>
        <div className="topbar-right">
          <Timer timeLeft={timeLeft} totalTime={drawTime} active={phase === 'drawing'} />
        </div>
      </div>

      {/* Main game area */}
      <div className="game-body">
        <div className="game-sidebar-left">
          <PlayerList
            players={players}
            playerId={playerId}
            drawerId={drawerId}
          />
        </div>

        <div className="game-canvas-area">
          <Canvas
            ref={canvasRef}
            isDrawer={isDrawer}
            canDraw={isDrawer && phase === 'drawing'}
            brushColor={brushColor}
            brushSize={brushSize}
            tool={tool}
          />
          {isDrawer && phase === 'drawing' && (
            <DrawingTools
              brushColor={brushColor}
              setBrushColor={setBrushColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              tool={tool}
              setTool={setTool}
              onClear={handleClearCanvas}
              onUndo={handleUndo}
            />
          )}
        </div>

        <div className="game-sidebar-right">
          <ChatPanel
            messages={messages}
            onSubmit={handleGuess}
            isDrawer={isDrawer}
            phase={phase}
            hasGuessed={players.find(p => p.id === playerId)?.hasGuessedCorrectly}
          />
        </div>
      </div>
    </div>
  );
}

export default Game;
