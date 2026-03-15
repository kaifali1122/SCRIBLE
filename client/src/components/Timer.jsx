import './Timer.css';

function Timer({ timeLeft, totalTime, active }) {
  const percentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLow = timeLeft <= 10;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`timer ${active ? 'active' : ''} ${isLow ? 'low' : ''}`}>
      <svg className="timer-svg" viewBox="0 0 48 48">
        <circle
          className="timer-bg-circle"
          cx="24" cy="24" r={radius}
          fill="none"
          strokeWidth="4"
        />
        <circle
          className="timer-progress-circle"
          cx="24" cy="24" r={radius}
          fill="none"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="timer-text">{active ? timeLeft : '--'}</span>
    </div>
  );
}

export default Timer;
