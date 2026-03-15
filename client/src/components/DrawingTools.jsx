import './DrawingTools.css';

const COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ff0000', '#ff6600', '#ffff00', '#00ff00',
  '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
  '#ff9999', '#ffcc66', '#ffff99', '#99ff99',
  '#99ccff', '#9999ff', '#cc99ff', '#ff99cc',
  '#8B4513', '#A0522D', '#D2691E', '#F4A460',
];

function DrawingTools({ brushColor, setBrushColor, brushSize, setBrushSize, tool, setTool, onClear, onUndo }) {
  return (
    <div className="drawing-tools">
      <div className="tools-section colors-section">
        {COLORS.map(color => (
          <button
            key={color}
            className={`color-btn ${brushColor === color && tool === 'brush' ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => { setBrushColor(color); setTool('brush'); }}
            title={color}
          />
        ))}
      </div>

      <div className="tools-section">
        <div className="size-control">
          <span className="size-label">Size</span>
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(+e.target.value)}
            className="size-slider"
          />
          <span className="size-value">{brushSize}</span>
        </div>
      </div>

      <div className="tools-section tool-buttons">
        <button
          className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
          onClick={() => setTool('brush')}
          title="Brush"
        >
          ✏️
        </button>
        <button
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          🧹
        </button>
        <button className="tool-btn" onClick={onUndo} title="Undo">
          ↩️
        </button>
        <button className="tool-btn danger" onClick={onClear} title="Clear Canvas">
          🗑️
        </button>
      </div>
    </div>
  );
}

export default DrawingTools;
