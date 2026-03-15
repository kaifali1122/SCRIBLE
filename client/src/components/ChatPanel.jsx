import { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

function ChatPanel({ messages, onSubmit, isDrawer, phase, hasGuessed }) {
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
  };

  const getPlaceholder = () => {
    if (isDrawer) return "You're drawing! 🎨";
    if (hasGuessed) return "You already guessed! ✅";
    if (phase !== 'drawing') return "Waiting...";
    return "Type your guess...";
  };

  const isDisabled = isDrawer || hasGuessed || phase !== 'drawing';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 Chat</h3>
      </div>
      
      <div className="chat-messages" ref={listRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${msg.type} ${msg.correct ? 'correct' : ''} ${msg.isClose ? 'close' : ''}`}
          >
            {msg.type === 'system' ? (
              <span className="msg-system">{msg.text}</span>
            ) : (
              <>
                <span className="msg-name">{msg.playerName}</span>
                <span className="msg-text">{msg.text}</span>
                {msg.isClose && <span className="msg-close-hint">🔥 So close!</span>}
              </>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="chat-empty">
            Guesses will appear here...
          </div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isDisabled}
          maxLength={100}
          autoComplete="off"
        />
        <button
          className="chat-send-btn"
          type="submit"
          disabled={isDisabled || !input.trim()}
        >
          ➤
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
