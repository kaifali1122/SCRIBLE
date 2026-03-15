# Skribbl.io Clone — Architecture & Code Documentation

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [WebSocket Communication](#websocket-communication)
6. [Canvas Drawing System](#canvas-drawing-system)
7. [Game State Machine](#game-state-machine)
8. [Scoring System](#scoring-system)
9. [Word & Hint System](#word--hint-system)
10. [How to Build (Step-by-Step)](#how-to-build-step-by-step)
11. [Technical Challenges & Solutions](#technical-challenges--solutions)
12. [Interview Q&A](#interview-qa)

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 16+ | JavaScript runtime for server |
| **Express** | 4.18 | HTTP server framework |
| **Socket.IO** | 4.7 | WebSocket library for real-time events |
| **CORS** | 2.8 | Cross-origin resource sharing |
| **UUID** | 9.0 | Unique ID generation |

**Why Node.js?** — Same language (JavaScript) on both frontend and backend. Its event-driven, non-blocking I/O model is perfect for real-time multiplayer games where we handle many simultaneous connections.

**Why Socket.IO over raw WebSockets?**
- Built-in **rooms** concept (perfect for game rooms)  
- **Auto-reconnection** if connection drops  
- **Fallback** to HTTP long-polling if WebSockets are blocked  
- **Event-based API** (`.emit()` and `.on()`) is cleaner than raw message strings  
- **Broadcasting** helpers (`io.to(room)`, `socket.to(room)`)

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19 | Component-based UI framework |
| **Vite** | 8 | Build tool with instant HMR |
| **Socket.IO Client** | 4.7 | WebSocket client library |
| **HTML5 Canvas API** | Native | Drawing surface for the game |

**Why React?** — Component-based architecture maps perfectly to our UI: each game element (Canvas, Chat, PlayerList, Timer) is an independent, reusable component.

**Why Vite over Create React App?** — 10x faster dev server startup, instant hot module replacement (HMR), modern ESM-based build system.

**Why HTML5 Canvas over Fabric.js/Konva.js?** — No external dependency needed. We only need basic line drawing, which the native Canvas API handles perfectly. Fabric.js/Konva.js add object-based manipulation overhead we don't need.

---

## Project Structure

```
skribbl-clone/
│
├── server/                          # BACKEND
│   ├── package.json                 # Dependencies: express, socket.io, cors, uuid
│   ├── index.js                     # Entry point: Express + Socket.IO server setup
│   │
│   ├── game/                        # OOP Game Logic Classes
│   │   ├── Player.js                # Player data model (name, score, state)
│   │   ├── Room.js                  # Room management (join, leave, turns)
│   │   ├── Game.js                  # Game state machine (phases, timer, scoring)
│   │   └── WordManager.js           # Word selection and hint generation
│   │
│   ├── handlers/                    # Socket.IO Event Handlers
│   │   ├── roomHandler.js           # create_room, join_room, start_game, disconnect
│   │   ├── gameHandler.js           # word_chosen, guess, chat, round lifecycle
│   │   └── drawHandler.js           # draw_start, draw_move, draw_end, undo, clear
│   │
│   └── data/
│       └── words.json               # 180+ words in 6 categories
│
├── client/                          # FRONTEND
│   ├── package.json                 # Dependencies: react, socket.io-client
│   ├── index.html                   # HTML entry point
│   └── src/
│       ├── main.jsx                 # React root render
│       ├── App.jsx                  # Screen-based router (Home/Lobby/Game/GameOver)
│       ├── App.css                  # App container styles
│       ├── index.css                # Global design system (colors, typography, animations)
│       ├── socket.js                # Socket.IO client singleton
│       │
│       ├── pages/                   # Full-screen views
│       │   ├── Home.jsx + .css      # Landing: enter name, create/join room
│       │   ├── Lobby.jsx + .css     # Waiting room: players, settings, start
│       │   ├── Game.jsx + .css      # Main game: canvas + chat + players + timer
│       │   └── GameOver.jsx + .css  # Final leaderboard, play again
│       │
│       └── components/              # Reusable UI pieces
│           ├── Canvas.jsx + .css    # HTML5 Canvas: drawing + rendering remote strokes
│           ├── DrawingTools.jsx+css # Tool bar: colors, brush size, eraser, undo, clear
│           ├── ChatPanel.jsx + .css # Guess input + message list
│           ├── PlayerList.jsx + css # Scoreboard sidebar
│           ├── WordSelector.jsx+css # Word choice modal (drawer only)
│           └── Timer.jsx + .css     # SVG circular countdown
│
└── README.md                        # Setup instructions + live URL
```

---

## Backend Architecture

### Server Entry Point (`index.js`)

```javascript
// 1. Create Express app
const app = express();

// 2. Create HTTP server (Socket.IO needs raw HTTP server, not Express's built-in)
const server = http.createServer(app);

// 3. Create Socket.IO server with CORS (frontend is on different port)
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' }
});

// 4. On each new connection, register all event handlers
io.on('connection', (socket) => {
  registerRoomHandlers(io, socket);    // Room lifecycle events
  registerGameHandlers(io, socket);    // Game logic events
  registerDrawHandlers(io, socket);    // Drawing events
});

// 5. Listen on port 3001
server.listen(3001);
```

### OOP Class Design

```
Room
├── id: string (6-char code like "3KOOL6")
├── hostId: string (socket.id of room creator)
├── players: Player[]
├── game: Game
│   ├── phase: 'lobby' | 'picking' | 'drawing' | 'round_end' | 'game_over'
│   ├── currentRound: number
│   ├── currentDrawerIndex: number
│   ├── currentWord: string
│   ├── timeLeft: number
│   ├── strokes: Stroke[] (for undo support)
│   ├── settings: { rounds, drawTime, wordCount, hints, maxPlayers }
│   └── wordManager: WordManager
│       ├── allWords: string[] (180+ words)
│       └── wordsByCategory: { animals: [...], food: [...], ... }
└── methods:
    ├── addPlayer(id, name)
    ├── removePlayer(id)
    ├── nextTurn() → { drawer, wordOptions, round }
    ├── getLeaderboard() → sorted players by score
    └── allGuessedCorrectly() → boolean
```

#### Player.js — What it stores:
```javascript
class Player {
  constructor(id, name) {
    this.id = id;                    // Socket.IO's unique socket ID
    this.name = name;                // Display name chosen by player
    this.score = 0;                  // Accumulated points
    this.isDrawing = false;          // true only for current drawer
    this.hasGuessedCorrectly = false; // true after correct guess this round
  }
}
```

#### Room.js — Turn Rotation Logic:
```javascript
nextTurn() {
  // Reset all players for new turn
  this.players.forEach(p => { p.isDrawing = false; p.resetRound(); });
  
  // Move to next drawer
  this.game.currentDrawerIndex++;
  
  // If all players drew this round, start next round
  if (this.game.currentDrawerIndex >= this.players.length) {
    this.game.currentDrawerIndex = 0;
    this.game.currentRound++;
  }
  
  // If all rounds done, game over
  if (this.game.currentRound >= this.game.settings.rounds) {
    return { gameOver: true };
  }
  
  // Set next drawer and get word options
  const drawer = this.players[this.game.currentDrawerIndex];
  drawer.isDrawing = true;
  return { drawer, wordOptions: this.game.getWordOptions() };
}
```

#### Game.js — Scoring Formulas:
```javascript
// GUESSER POINTS: faster = more points (100-500 range)
calculatePoints(timeLeft, totalTime) {
  const timeRatio = timeLeft / totalTime;    // 1.0=instant, 0.0=last second
  return 100 + Math.floor(timeRatio * 400);  // 500 if instant, 100 if last sec
}

// DRAWER POINTS: more correct guessers = more points (0-200 range)
calculateDrawerPoints(correctGuessers, totalPlayers) {
  const ratio = correctGuessers / (totalPlayers - 1);
  return Math.floor(ratio * 200);  // 200 if everyone guessed, 0 if nobody
}
```

#### WordManager.js — Hint Generation:
```javascript
// Word: "elephant", revealCount: 2
// Output: "_ l _ _ _ _ n _" (2 random letters revealed)
generateHint(word, revealCount) {
  const letterIndices = [];  // indices of non-space characters
  word.split('').forEach((ch, i) => { if (ch !== ' ') letterIndices.push(i); });
  
  // Pick random indices to reveal
  const toReveal = shuffle(letterIndices).slice(0, revealCount);
  
  return word.split('').map((ch, i) => {
    if (ch === ' ') return ' ';           // Keep spaces
    if (toReveal.includes(i)) return ch;  // Show this letter
    return '_';                            // Hide
  }).join('');
}
```

### Event Handler Design

**Why 3 separate handler files?**  
Separation of concerns. Each file handles one domain:

| File | Responsibility | Key Events |
|------|---------------|------------|
| `roomHandler.js` | Room lifecycle | create, join, leave, disconnect, play_again |
| `gameHandler.js` | Game logic | word_chosen, guess, chat, round timing |
| `drawHandler.js` | Drawing relay | draw_start, draw_move, draw_end, undo, clear |

**In-memory storage:**
```javascript
const rooms = new Map();  // Key: roomCode ("3KOOL6") → Value: Room instance
```
No database needed — all data is session-based. When a room empties, it's deleted from memory.

---

## Frontend Architecture

### Screen Flow (State-based Routing)

```
Home → Lobby → Game → GameOver
  ↑                      │
  └──────────────────────┘  (Play Again or Leave)
```

No React Router needed. Simple `useState('home')` controls which screen renders:
```javascript
{screen === 'home'     && <Home />}
{screen === 'lobby'    && <Lobby />}
{screen === 'game'     && <Game />}
{screen === 'gameOver' && <GameOver />}
```

### Component Hierarchy
```
App
├── Home (landing page)
│   └── Create/Join Room forms
├── Lobby (waiting room)
│   └── Player cards + Settings panel
├── Game (main game screen)
│   ├── TopBar (round info + word/hint + Timer)
│   ├── PlayerList (left sidebar - scores)
│   ├── Canvas (center - drawing area)
│   ├── DrawingTools (below canvas - colors, brush, eraser)
│   ├── ChatPanel (right sidebar - guesses)
│   └── WordSelector (modal overlay - word choices)
└── GameOver (final leaderboard)
```

### Socket.IO Client (`socket.js`)
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  autoConnect: false,  // Only connect when user clicks Create/Join
});

export default socket;  // Singleton — same instance used everywhere
```

### Design System (`index.css`)
- **Font**: Outfit (Google Fonts) — modern, clean
- **Theme**: Dark glassmorphism (frosted glass cards with blur)
- **Colors**: Custom CSS variables (purple-blue primary, pink-orange accent)
- **Animations**: fadeIn, slideUp, popIn, float, pulse, shimmer

---

## WebSocket Communication

### Full Event Map

#### Client → Server (Player Actions)
| Event | Payload | When |
|-------|---------|------|
| `create_room` | `{ hostName, settings }` | Host creates room |
| `join_room` | `{ roomId, playerName }` | Player joins via code |
| `start_game` | `{}` | Host starts game |
| `word_chosen` | `{ word }` | Drawer picks word |
| `draw_start` | `{ x, y, color, size, tool }` | Pen goes down |
| `draw_move` | `{ x, y }` | Pen moves |
| `draw_end` | `{}` | Pen lifts up |
| `canvas_clear` | `{}` | Drawer clears canvas |
| `draw_undo` | `{}` | Drawer undoes last stroke |
| `guess` | `{ text }` | Player submits guess |
| `chat` | `{ text }` | General chat message |
| `play_again` | `{}` | Request new game |
| `update_settings` | `{ settings }` | Host changes settings |

#### Server → Client(s) (Game Updates)
| Event | Payload | Sent To |
|-------|---------|---------|
| `player_joined` | `{ player, players }` | All in room |
| `player_left` | `{ playerId, players, newHostId }` | All in room |
| `settings_updated` | `{ settings }` | All in room |
| `game_started` | `{ phase, drawerId, round, players }` | All in room |
| `word_options` | `{ words: ["cat","dog","fish"] }` | Drawer only |
| `drawing_started` | `{ hint, drawTime, drawerId }` | All in room |
| `your_word` | `{ word: "elephant" }` | Drawer only |
| `draw_data` | `{ type, x, y, color, size }` | All except drawer |
| `canvas_cleared` | `{}` | All in room |
| `canvas_undo` | `{ strokes }` | All in room |
| `timer_update` | `{ timeLeft }` | All in room |
| `hint_update` | `{ hint: "_ l _ _ _ _ n _" }` | Non-drawers only |
| `guess_result` | `{ correct, playerName, points }` | All in room |
| `chat_message` | `{ playerName, text, isClose }` | All in room |
| `round_end` | `{ word, players, leaderboard }` | All in room |
| `game_over` | `{ leaderboard, reason }` | All in room |
| `back_to_lobby` | `{ room }` | All in room |

### Broadcasting Patterns
```javascript
io.to(roomId).emit(...)       // Send to ALL in room (including sender)
socket.to(roomId).emit(...)   // Send to ALL in room EXCEPT sender
io.to(socketId).emit(...)     // Send to ONE specific player
```

---

## Canvas Drawing System

### How Drawing Sync Works

```
[Drawer's Browser]                    [Server]                    [Viewer's Browser]
       |                                 |                                |
  Mouse Down                             |                                |
  → getPos(e)                            |                                |
  → normalize: x/width, y/height        |                                |
  → draw locally on canvas              |                                |
  → emit('draw_start', {x,y,color})  ──►│                                |
       |                                 │ broadcast 'draw_data'         |
       |                                 │──────────────────────────────►│
       |                                 |                    handleRemoteDraw()
       |                                 |                    → denormalize: x*width
  Mouse Move                             |                    → ctx.lineTo()
  → emit('draw_move', {x,y})  ─────────►│                                |
       |                                 │──────────────────────────────►│
       |                                 |                    → ctx.lineTo()
  Mouse Up                               |                                |
  → emit('draw_end')  ─────────────────►│                                |
       |                                 │──────────────────────────────►│
       |                                 |                    → ctx.closePath()
```

### Coordinate Normalization (Critical Concept!)

**Problem**: Player A has a 1920px wide screen. Player B has 1366px. If A draws at pixel x=960 (center), B would render it at x=960 which is NOT their center (it's at 70%).

**Solution**: Normalize to 0-1 range:
```javascript
// SENDING (drawer): divide by canvas size
const normalizedX = (mouseX - canvasLeft) / canvasWidth;   // 0.0 to 1.0
const normalizedY = (mouseY - canvasTop) / canvasHeight;   // 0.0 to 1.0

// RECEIVING (viewer): multiply by local canvas size
const pixelX = normalizedX * myCanvasWidth;    // Correct for ANY screen
const pixelY = normalizedY * myCanvasHeight;
```

### Stroke History & Undo
```javascript
// Server stores all strokes
game.strokes = [
  { points: [{x:0.1,y:0.2}, {x:0.3,y:0.4}], color: '#ff0000', size: 4 },
  { points: [{x:0.5,y:0.5}, {x:0.7,y:0.8}], color: '#0000ff', size: 8 },
];

// Undo: remove last stroke, send remaining history
game.strokes.pop();
io.to(roomId).emit('canvas_undo', { strokes: game.strokes });

// Client: clear canvas, redraw all remaining strokes
function redrawStrokes(strokes) {
  ctx.fillRect(0, 0, width, height);  // Clear
  strokes.forEach(stroke => drawStroke(ctx, stroke));  // Redraw
}
```

### Eraser Implementation
```javascript
// Eraser = drawing with the background color
ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : brushColor;
```
Simple and effective — no pixel manipulation needed.

---

## Game State Machine

```
┌─────────┐   start_game   ┌─────────┐  word_chosen  ┌─────────┐
│  LOBBY  │ ────────────► │ PICKING │ ──────────── ► │ DRAWING │
│         │                │(drawer  │                │(timer   │
│wait for │                │picks a  │                │counting,│
│players  │                │word)    │                │strokes  │
└─────────┘                └─────────┘                │syncing) │
     ▲                          ▲                     └────┬────┘
     │                          │                          │
play_again             nextTurn (if more              time=0 or
     │                   rounds left)               all guessed
     │                          │                          │
┌────┴─────┐              ┌────┴─────┐                    ▼
│ GAME     │◄─────────── │ ROUND    │◄──────────────────────
│ OVER     │  all rounds  │ END      │
│(winner   │  complete    │(5s pause,│
│ shown)   │              │ show word│
└──────────┘              └──────────┘
```

### Phase Transitions in Code:
```javascript
// LOBBY → PICKING: room.startGame() + room.nextTurn()
// PICKING → DRAWING: word_chosen event received
// DRAWING → ROUND_END: timer hits 0 OR all players guessed
// ROUND_END → PICKING: 5-second setTimeout, then room.nextTurn()
// ROUND_END → GAME_OVER: if all rounds complete
// GAME_OVER → LOBBY: play_again event
```

---

## Scoring System

### Guesser Points (100-500)
```
Points = 100 + (timeLeft ÷ totalTime) × 400

Examples (80-second round):
  Guessed at 75s remaining → 100 + (75/80 × 400) = 475 points
  Guessed at 40s remaining → 100 + (40/80 × 400) = 300 points
  Guessed at  5s remaining → 100 + (5/80  × 400) = 125 points
```

### Drawer Points (0-200)
```
Points = (correctGuessers ÷ (totalPlayers - 1)) × 200

Examples (5 players):
  4/4 guessed → 200 points (everyone!)
  2/4 guessed → 100 points
  0/4 guessed →   0 points (bad drawing!)
```

---

## Word & Hint System

### Word Categories (words.json)
| Category | Examples | Count |
|----------|----------|-------|
| Animals | cat, elephant, penguin, dolphin | 30 |
| Objects | umbrella, guitar, telescope | 30 |
| Food | pizza, sushi, avocado, pancake | 30 |
| Actions | swimming, juggling, skateboarding | 30 |
| Places | beach, volcano, pyramid, subway | 30 |
| Things | rainbow, rocket, dragon, wizard | 30 |
| **Total** | | **180+** |

### Hint Timeline (Example: 80s round, 2 hints)
```
0s  → Drawing starts     → Hint: "_ _ _ _ _ _ _ _" (8 blanks)
27s → First hint reveals  → Hint: "_ l _ _ _ _ n _" (2 letters)
54s → Second hint reveals → Hint: "e l _ p _ _ n t" (5 letters)
80s → Time up!            → Word: "elephant" revealed
```

### Close Guess Detection (Levenshtein Distance)
```javascript
// Levenshtein distance = minimum edits (insert/delete/replace) to transform one string to another
// If distance ≤ 2, show "🔥 So close!"

"elefant"  vs "elephant" → distance 1 (missing 'ph', extra 'f') → CLOSE!
"elephnt"  vs "elephant" → distance 1 (missing 'a')             → CLOSE!
"cat"      vs "elephant" → distance 7                            → NOT close
```

---

## How to Build (Step-by-Step)

### Phase 1: Backend Setup
1. `mkdir server && cd server && npm init -y`
2. `npm install express socket.io cors uuid`
3. Create `index.js` — Express + Socket.IO server
4. Create `data/words.json` — word list
5. Test: `node index.js` → should see "server running on :3001"

### Phase 2: OOP Classes
6. Create `game/Player.js` — player data model
7. Create `game/WordManager.js` — word loading + hints
8. Create `game/Game.js` — state machine, scoring, timers
9. Create `game/Room.js` — room management, turn rotation

### Phase 3: Socket Handlers
10. Create `handlers/roomHandler.js` — create/join/leave/start
11. Create `handlers/gameHandler.js` — word selection, guessing, rounds
12. Create `handlers/drawHandler.js` — stroke relay
13. Register all handlers in `index.js`

### Phase 4: Frontend Setup
14. `npx create-vite client --template react`
15. `cd client && npm install socket.io-client`
16. Create `src/socket.js` — Socket.IO client singleton
17. Create `src/index.css` — design system (dark theme, animations)

### Phase 5: Frontend Pages
18. Create `Home.jsx` — name input, create/join room
19. Create `Lobby.jsx` — player list, settings, start button
20. Create `Game.jsx` — main game layout + event orchestration
21. Create `GameOver.jsx` — final leaderboard

### Phase 6: Frontend Components
22. Create `Canvas.jsx` — HTML5 Canvas with normalized coordinates
23. Create `DrawingTools.jsx` — color palette, brush size, eraser
24. Create `ChatPanel.jsx` — guess input + message list
25. Create `PlayerList.jsx` — score sidebar
26. Create `WordSelector.jsx` — word choice modal
27. Create `Timer.jsx` — SVG countdown ring

### Phase 7: Test & Fix
28. Open 2 browser tabs → create room → join → start → draw → guess
29. Fix bugs (timing issues, phase checks, etc.)

---

## Technical Challenges & Solutions

### 1. Drawing Not Appearing on Other Screens
**Root Cause**: Sending raw pixel coordinates that only work on the sender's screen size.  
**Solution**: Normalize all coordinates to 0–1 range by dividing by canvas dimensions.

### 2. Word Selector Not Appearing
**Root Cause**: `word_options` event fired before `game_started`, so Game component wasn't mounted yet to receive it.  
**Solution**: Emit `game_started` first, then `word_options` after 600ms delay.

### 3. Drawing During Word Selection
**Root Cause**: Canvas checked `isDrawer` but not the game phase.  
**Solution**: Added `canDraw = isDrawer && phase === 'drawing'` prop.

### 4. Player Disconnect Mid-Game
**Root Cause**: Game would break if drawer disconnected.  
**Solution**: If drawer leaves → auto advance to next turn. If < 2 players remain → end game. Host auto-transfers to next player.

### 5. Performance During Drawing
**Root Cause**: Using `useState` for drawing state causes React re-renders 60+ times/sec.  
**Solution**: Use `useRef` for drawing state (isDrawing, lastPoint, strokes). Ref updates don't trigger re-renders.

### 6. Canvas Resize Issues
**Root Cause**: Canvas has its own resolution separate from CSS size. If CSS says 800px but canvas.width is 300, drawing is blurry.  
**Solution**: Set `canvas.width = parentElement.clientWidth` on mount and window resize.

---

## Interview Q&A

**Q: Walk me through what happens when a player draws a line.**
> Mouse down fires → I get the position, normalize it to 0-1 by dividing by canvas size → draw locally on the HTML5 Canvas context → emit `draw_start` with {x, y, color, size}. Server receives it, stores the stroke in history, and broadcasts `draw_data` to all other players via `socket.to()`. On receiving clients, the coordinates are denormalized by multiplying by their local canvas size, and the stroke is rendered.

**Q: How do you manage game state?**
> I use a state machine with 5 phases: LOBBY, PICKING, DRAWING, ROUND_END, GAME_OVER. All transitions happen on the server. The server controls timers, validates guesses, and broadcasts state changes. Clients only render what the server tells them.

**Q: How is the scoring calculated?**
> Guesser gets 100-500 points based on speed: `100 + (timeLeft/totalTime * 400)`. Faster = more points. The drawer gets 0-200 points based on how many people guessed: `(correctGuessers/(totalPlayers-1)) * 200`.

**Q: How do hints work?**
> The draw time is divided into intervals based on hint count. At each interval, the server increments a reveal counter and calls `generateHint()` which randomly picks that many letter positions to show. The hint is sent only to non-drawers via `hint_update`.

**Q: How do you prevent cheating?**
> All validation is server-side. The actual word is never sent to guessers — only the hint. Drawing permission is verified server-side (checks if sender is the current drawer). Guesses are validated on the server. No client can manipulate scores.

**Q: What happens if a player disconnects?**
> Socket.IO fires `disconnect`. I loop through all rooms to find which one the player was in. Remove them. If they were the host, transfer host to next player. If they were the drawer, auto-skip to next turn. If fewer than 2 players remain, end the game.

**Q: Why did you use `forwardRef` and `useImperativeHandle` in Canvas?**
> The Game component needs to call methods on the Canvas — like `clearCanvas()` when a new round starts, or `handleRemoteDraw()` when another player's strokes come in. React normally flows data parent → child via props. `forwardRef` + `useImperativeHandle` lets the parent call child methods directly.

**Q: Why `useRef` instead of `useState` for drawing?**
> Drawing fires mouse events 60+ times per second. `useState` would cause a React re-render on every event, which would be a performance. `useRef` updates the value instantly without triggering any re-renders. I use it for `isDrawing`, `lastPoint`, and `strokes`.

**Q: How would you deploy this?**
> I'd use Render or Railway because they support WebSockets. Vercel's serverless functions DON'T support persistent WebSocket connections. I could split it: frontend on Vercel, backend on Render. The frontend would connect to the Render backend URL via the `VITE_SERVER_URL` env variable.

**Q: How would you scale this to 10,000 concurrent users?**
> Use Redis adapter for Socket.IO (`@socket.io/redis-adapter`) to share events across multiple Node.js processes. Use `cluster` module or PM2 to run multiple server instances. Move room storage from in-memory Map to Redis. Add a load balancer (nginx) in front.
