import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import socket from '../socket';
import './Canvas.css';

const Canvas = forwardRef(({ isDrawer, canDraw, brushColor, brushSize, tool }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { w: 800, h: 600 };
    return { w: canvas.width, h: canvas.height };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      const dpr = 1; // use 1 for consistency across devices
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
      
      // Redraw existing strokes
      redrawAllStrokes();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const redrawAllStrokes = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokesRef.current.forEach(stroke => {
      drawStroke(ctx, stroke);
    });
  };

  const drawStroke = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length === 0) return;
    
    const canvas = canvasRef.current;
    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const firstPoint = stroke.points[0];
    ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
    }
    ctx.stroke();
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      strokesRef.current = [];
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
    handleRemoteDraw: (data) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      if (data.type === 'start') {
        currentStrokeRef.current = {
          points: [{ x: data.x, y: data.y }],
          color: data.color,
          size: data.size,
          tool: data.tool || 'brush',
        };
        lastPointRef.current = { x: data.x, y: data.y };
        
        ctx.beginPath();
        ctx.strokeStyle = data.tool === 'eraser' ? '#1a1a2e' : data.color;
        ctx.lineWidth = data.size;
        ctx.moveTo(data.x * canvas.width, data.y * canvas.height);
      } else if (data.type === 'move' && lastPointRef.current) {
        if (currentStrokeRef.current) {
          currentStrokeRef.current.points.push({ x: data.x, y: data.y });
        }
        ctx.lineTo(data.x * canvas.width, data.y * canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(data.x * canvas.width, data.y * canvas.height);
        lastPointRef.current = { x: data.x, y: data.y };
      } else if (data.type === 'end') {
        ctx.closePath();
        if (currentStrokeRef.current) {
          strokesRef.current.push(currentStrokeRef.current);
          currentStrokeRef.current = null;
        }
        lastPointRef.current = null;
      }
    },
    redrawStrokes: (strokes) => {
      strokesRef.current = strokes || [];
      redrawAllStrokes();
    },
  }));

  // Drawing event handlers
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
    };
  };

  const startDrawing = (e) => {
    if (!canDraw) return;
    e.preventDefault();
    
    isDrawingRef.current = true;
    const pos = getPos(e);
    lastPointRef.current = pos;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.moveTo(pos.x * canvas.width, pos.y * canvas.height);

    currentStrokeRef.current = {
      points: [pos],
      color: brushColor,
      size: brushSize,
      tool: tool,
    };

    socket.emit('draw_start', {
      x: pos.x,
      y: pos.y,
      color: brushColor,
      size: brushSize,
      tool: tool,
    });
  };

  const draw = (e) => {
    if (!canDraw || !isDrawingRef.current) return;
    e.preventDefault();
    
    const pos = getPos(e);
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x * canvas.width, pos.y * canvas.height);

    lastPointRef.current = pos;
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pos);
    }

    socket.emit('draw_move', { x: pos.x, y: pos.y });
  };

  const stopDrawing = (e) => {
    if (!canDraw || !isDrawingRef.current) return;
    e?.preventDefault();
    
    isDrawingRef.current = false;
    const ctx = ctxRef.current;
    ctx.closePath();
    lastPointRef.current = null;

    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    socket.emit('draw_end');
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${canDraw ? 'can-draw' : 'view-only'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!isDrawer && (
        <div className="canvas-overlay-label">
          👀 Watching
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
