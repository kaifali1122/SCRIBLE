# 🎨 Skribbl.io Clone

A full-stack multiplayer drawing and guessing game (Pictionary) built with **React**, **Node.js**, **Express**, and **Socket.IO**.

## 🎮 How It Works

1. **Create or Join** a room
2. Each round, one player **draws** a chosen word
3. Other players **guess** the word by typing in the chat
4. Correct guesses earn **points** — faster guesses earn more!
5. Rounds rotate — everyone gets a turn to draw
6. Player with the most points **wins**!

## ✨ Features

### Must Have ✅
- Create/Join rooms with room code
- Turn-based rounds: one drawer, others guess
- Real-time drawing sync via WebSockets
- Word selection (drawer picks from multiple choices)
- Guessing with scoring and leaderboard
- Game over with winner display
- Drawing tools: brush, colors (24 colors), sizes, eraser, undo, clear

### Should Have ✅
- Hints (progressive letter reveals over time)
- Chat with close-guess detection ("🔥 So close!")
- Draw time countdown with circular timer
- Private rooms via invite code

### Nice to Have ✅
- Word categories (animals, objects, food, actions, places, things)
- Eraser tool
- Play again functionality

## 🛠️ Tech Stack

| Layer     | Technology                 | Purpose                              |
|-----------|----------------------------|--------------------------------------|
| Frontend  | React + Vite               | UI, Canvas, Lobby, Game screens      |
| Canvas    | HTML5 Canvas API           | Drawing & stroke sync                |
| Backend   | Node.js + Express          | API, Game logic, WebSocket server    |
| Real-time | Socket.IO                  | Drawing, Guesses, Chat, Game state   |
| Words     | JSON word list (180+ words)| Categorized words for gameplay       |

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd skribbl-clone
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```

### Running Locally

1. **Start the backend server** (from `server/` directory)
   ```bash
   npm start       # or: npm run dev (with auto-reload)
   ```
   Server runs at `http://localhost:3001`

2. **Start the frontend** (from `client/` directory)
   ```bash
   npm run dev
   ```
   Client runs at `http://localhost:5173`

3. **Play the game**
   - Open `http://localhost:5173` in Tab 1 → Enter name → Create Room
   - Open `http://localhost:5173` in Tab 2 → Enter name → Join with room code
   - Host clicks Start Game → Draw, Guess, and Have Fun!

## 🏗️ Architecture Overview

### WebSocket Communication
- **Socket.IO** handles all real-time events between clients and server
- Events are organized into three handlers:
  - `roomHandler.js` — Room creation, joining, disconnects
  - `gameHandler.js` — Word selection, guessing, scoring, round lifecycle
  - `drawHandler.js` — Stroke relay (start/move/end), undo, clear

### Canvas Drawing
- Strokes are captured as normalized coordinates (0-1 range) for resolution independence
- Each stroke includes: points, color, size, tool (brush/eraser)
- Server maintains stroke history for undo functionality
- Drawing is relayed in real-time to all connected clients

### Game State
- OOP architecture with classes: `Room`, `Game`, `Player`, `WordManager`
- State machine: `LOBBY → PICKING → DRAWING → ROUND_END → GAME_OVER`
- Turn order rotates through all players per round
- Scoring: 100-500 points based on guess speed; drawer earns based on % of correct guessers

### Word Matching
- Case-insensitive, trimmed comparison
- Close-guess detection using Levenshtein distance (≤2 edits)
- Progressive hints: reveal random letters at timed intervals

## 📁 Project Structure

```
├── server/
│   ├── index.js                 # Express + Socket.IO entry point
│   ├── game/
│   │   ├── Room.js              # Room management
│   │   ├── Game.js              # Game state & logic
│   │   ├── Player.js            # Player data
│   │   └── WordManager.js       # Word list & hints
│   ├── handlers/
│   │   ├── roomHandler.js       # Room socket events
│   │   ├── gameHandler.js       # Game socket events
│   │   └── drawHandler.js       # Draw socket events
│   └── data/
│       └── words.json           # 180+ categorized words
│
├── client/
│   └── src/
│       ├── App.jsx              # Screen router
│       ├── socket.js            # Socket.IO client
│       ├── pages/
│       │   ├── Home.jsx         # Landing page
│       │   ├── Lobby.jsx        # Game lobby
│       │   ├── Game.jsx         # Main game screen
│       │   └── GameOver.jsx     # Final leaderboard
│       └── components/
│           ├── Canvas.jsx       # Drawing canvas
│           ├── DrawingTools.jsx # Color palette, brush tools
│           ├── ChatPanel.jsx    # Chat & guess input
│           ├── PlayerList.jsx   # Score sidebar
│           ├── WordSelector.jsx # Word choice modal
│           └── Timer.jsx        # Countdown timer
```

## 🔌 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `create_room` | Client → Server | Host creates room |
| `join_room` | Client → Server | Player joins room |
| `start_game` | Client → Server | Host starts game |
| `word_chosen` | Client → Server | Drawer picks word |
| `draw_start/move/end` | Client → Server | Drawing strokes |
| `guess` | Client → Server | Player sends guess |
| `game_started` | Server → Clients | Game begins |
| `drawing_started` | Server → Clients | Drawing phase starts |
| `draw_data` | Server → Clients | Broadcast stroke data |
| `guess_result` | Server → Clients | Correct/incorrect |
| `round_end` | Server → Clients | Round over |
| `game_over` | Server → Clients | Game finished |

## 🌐 Deployment

Deploy using platforms with WebSocket support:
- **Render** — Full-stack, WebSocket support
- **Railway** — Full-stack, easy setup
- **Vercel + Render** — Frontend on Vercel, backend on Render
