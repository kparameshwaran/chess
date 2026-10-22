# Grandmaster 3D Chess by Abdul | FIDE World Standard Edition

A tournament-grade, breathtaking 3D WebGL Chess experience built with **Three.js**, **chess.js**, **GSAP**, and the **Web Audio API**. Strictly compliant with international **FIDE Laws of Chess**, featuring intelligent AI opponents, multiple camera perspectives, real-time evaluation, luxury PBR themes, and authentic Staunton piece models.

### 🌐 Play Live on GitHub Pages
👉 **[Launch Chess Royale 3D](https://kparameshwaran.github.io/chess/)**

---

## 🌟 Key Features

### 1. Global Standard FIDE Chess Rules
- **Full FIDE Legal Move Enforcement**: Strictly disallows illegal moves and moves exposing the King to check (including pins and king escape checks).
- **Special Moves**:
  - **Castling**: Kingside ($O-O$) and Queenside ($O-O-O$) adhering to all FIDE requirements (unmoved pieces, unobstructed squares, king not in/passing through check).
  - **En Passant**: Accurate immediate-turn diagonal capture on enemy pawn double-advances.
  - **Pawn Promotion Modal**: Interactive selection of Queen, Rook, Bishop, or Knight with keyboard shortcuts (`Q`, `R`, `B`, `N`).
- **Complete Draw Conditions**:
  - Stalemate detection
  - 50-move rule without pawn push or capture
  - Threefold position repetition
  - Insufficient mating material ($K$ vs $K$, $K+B$ vs $K$, $K+N$ vs $K$, same-color bishops)
- **Check & Checkmate Detection**: Real-time visual alarms, red beacon indicators, audio chimes, and celebration confetti storms.
- **Move History & Notation**: Full Standard Algebraic Notation (SAN) table with interactive step-by-step move navigation (`<<`, `<`, `>`, `>>`).
- **Data Portability**: Copy FEN to clipboard, import custom FEN puzzle positions, and export PGN game files.

---

### 2. High-Fidelity 3D Graphics (Three.js)
- **Procedural 3D Staunton Pieces**: Custom lathe-turned curves, beveled crests, Latin cross finials, coronets, horse busts, and castle parapets.
- **Dynamic Lighting & Soft Shadows**: Multi-point studio lighting with `PCFSoftShadowMap` and HDR ACES tone mapping.
- **4 Luxury Themes**:
  1. **Walnut & Maple**: Classic tournament wood grain with satin finish and mahogany plinth.
  2. **Imperial Marble**: Polished Carrara white marble with gold veins vs Belgian black obsidian.
  3. **Cyber Neon 2077**: Translucent glowing holographic glass with cyan and magenta neon energy.
  4. **Royal Gold & Silver**: High-gloss 24K gold vs polished sterling silver.
- **3D Visual Indicators**:
  - Glowing halo ring for selected piece
  - Floating green/cyan beacon discs on valid empty target squares
  - Pulsing crimson targeting reticles on capturable pieces
  - Golden illumination on departure and arrival squares of the last move
  - 3D particle dust and spark explosions on capture
  - Pulsing ground alert beacon on a checked King

---

### 3. Integrated AI Engine (Minimax with Alpha-Beta Pruning)
- **Evaluation Function**: Material balance + Piece-Square Tables (PST) for opening, middlegame, and endgame king safety.
- **Quiescence Search**: Evaluates tactical captures beyond horizon depth to prevent blunders.
- **Move Ordering**: Most Valuable Victim - Least Valuable Attacker (MVV-LVA) for optimal pruning speed.
- **3 Difficulty Levels**:
  - **Beginner (ELO ~800)**: Casual, quick moves with friendly gameplay.
  - **Intermediate (ELO ~1400)**: Solid tactical awareness and center control.
  - **Grandmaster (ELO ~2000+)**: Deep calculation, positional strategy, and tactical punishment.

---

### 4. Synthesized Audio Engine (Web Audio API)
- Zero external audio files required (100% offline-ready, no 404s).
- Authentic wooden tap on move
- Deep resonant capture thud
- Suspense chord on Check
- Double-tap on Castling
- Ascending arpeggio on Pawn Promotion
- Triumphant brass fanfare on Checkmate
- Low-time urgency ticking

---

### 5. FIDE Match Clocks & HUD
- Preset time controls: Bullet (1 min), Blitz (3 min, 5 min), Rapid (10 min, 15 min), and Unlimited.
- Active clock countdown with millisecond precision, low-time warning, and timeout adjudication.
- Captured pieces gallery and dynamic material score lead (`+3 White`, etc.).
- Position evaluation bar showing dynamic White vs Black advantage.

---

## 🎮 Controls & Shortcuts

| Action | Control / Shortcut |
| :--- | :--- |
| **Select / Move** | Left Mouse Click |
| **Orbit Camera** | Left Mouse Drag |
| **Zoom In / Out** | Mouse Wheel Scroll |
| **Pan Camera** | Right Mouse Drag |
| **Undo Move** | <kbd>U</kbd> |
| **AI Hint** | <kbd>H</kbd> |
| **Flip Board** | <kbd>F</kbd> |
| **Mute / Unmute** | <kbd>M</kbd> |
| **Camera 3D View** | <kbd>1</kbd> |
| **Top-Down 2D View** | <kbd>2</kbd> |
| **White Perspective** | <kbd>3</kbd> |
| **Black Perspective** | <kbd>4</kbd> |
| **Promotion Pieces** | <kbd>Q</kbd>, <kbd>R</kbd>, <kbd>B</kbd>, <kbd>N</kbd> |
| **Deselect / Close** | <kbd>Esc</kbd> |

---

## 🚀 How to Run

1. Open `source code/index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari, etc.).
2. You can also serve it locally using any HTTP server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve "source code"
   ```
3. Enjoy the ultimate 3D Grandmaster Chess experience!
