const { rooms, getRoomId } = require('./roomHandler');
const Game = require('../game/Game');

function registerDrawHandlers(io, socket) {
  // Draw start - new stroke begins
  socket.on('draw_start', (data) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== Game.PHASES.DRAWING) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.isDrawing) return;

    // Store stroke data
    const stroke = {
      points: [{ x: data.x, y: data.y }],
      color: data.color,
      size: data.size,
      tool: data.tool || 'brush',
    };
    room.game.addStroke(stroke);

    // Broadcast to other players
    socket.to(roomId).emit('draw_data', {
      type: 'start',
      x: data.x,
      y: data.y,
      color: data.color,
      size: data.size,
      tool: data.tool || 'brush',
    });
  });

  // Draw move - stroke continues
  socket.on('draw_move', (data) => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== Game.PHASES.DRAWING) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.isDrawing) return;

    // Add point to current stroke
    const strokes = room.game.strokes;
    if (strokes.length > 0) {
      strokes[strokes.length - 1].points.push({ x: data.x, y: data.y });
    }

    // Broadcast to other players
    socket.to(roomId).emit('draw_data', {
      type: 'move',
      x: data.x,
      y: data.y,
    });
  });

  // Draw end - stroke ends
  socket.on('draw_end', () => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    socket.to(roomId).emit('draw_data', { type: 'end' });
  });

  // Clear canvas
  socket.on('canvas_clear', () => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.isDrawing) return;

    room.game.clearStrokes();
    io.to(roomId).emit('canvas_cleared');
  });

  // Undo last stroke
  socket.on('draw_undo', () => {
    const roomId = getRoomId(socket);
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.isDrawing) return;

    room.game.undoLastStroke();

    // Send all remaining strokes for redraw
    io.to(roomId).emit('canvas_undo', {
      strokes: room.game.strokes,
    });
  });
}

module.exports = { registerDrawHandlers };
