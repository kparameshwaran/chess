/**
 * Grandmaster 3D Chess by Abdul | FIDE World Standard Edition
 * Complete 3D Chess Engine, Staunton Geometries, PBR Themes, AI Engine, Clocks & Full FIDE Rules
 */

// ============================================================================
// 1. SOUND ENGINE (Pure Web Audio API - Zero Asset Dependencies)
// ============================================================================
const SoundEngine = (function () {
  let ctx = null;
  let muted = false;

  function initContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freq, type, duration, gainStart = 0.3, gainEnd = 0.001) {
    if (muted) return;
    initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainStart, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainEnd, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  return {
    init: initContext,
    setMuted: (val) => { muted = val; },
    isMuted: () => muted,

    // Crisp wooden tap
    playMove: function () {
      if (muted) return;
      initContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {}
    },

    // Resonant piece capture thud
    playCapture: function () {
      if (muted) return;
      initContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        // Low impact thud
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(40, now + 0.16);
        gain1.gain.setValueAtTime(0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.16);

        // Snap
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.06);
        gain2.gain.setValueAtTime(0.3, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.06);
      } catch (e) {}
    },

    // Check alarm chime
    playCheck: function () {
      if (muted) return;
      playTone(587.33, 'sawtooth', 0.18, 0.25, 0.001); // D5
      setTimeout(() => playTone(880, 'sine', 0.35, 0.35, 0.001), 90); // A5
    },

    // Castling double slide
    playCastle: function () {
      if (muted) return;
      this.playMove();
      setTimeout(() => this.playMove(), 110);
    },

    // Promotion fanfare
    playPromotion: function () {
      if (muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'triangle', 0.22, 0.3, 0.001), idx * 75);
      });
    },

    // Victory triumphant fanfare
    playVictory: function () {
      if (muted) return;
      const chords = [
        [523.25, 659.25, 783.99],       // C Maj
        [587.33, 739.99, 880.00],       // D Maj
        [659.25, 830.61, 987.77],       // E Maj
        [783.99, 987.77, 1174.66, 1567.98] // G Maj high
      ];
      chords.forEach((chord, i) => {
        setTimeout(() => {
          chord.forEach(f => playTone(f, 'triangle', 0.45, 0.2, 0.001));
        }, i * 160);
      });
    },

    // Draw peaceful chord
    playDraw: function () {
      if (muted) return;
      [440, 554.37, 659.25].forEach(f => playTone(f, 'sine', 0.6, 0.2, 0.001));
    },

    // UI Click
    playClick: function () {
      if (muted) return;
      playTone(800, 'sine', 0.03, 0.15, 0.001);
    },

    // Low time tick
    playTick: function () {
      if (muted) return;
      playTone(900, 'square', 0.02, 0.1, 0.001);
    }
  };
})();

// ============================================================================
// 2. CHESS AI ENGINE (Minimax with Alpha-Beta, PSTs, Quiescence & MVV-LVA)
// ============================================================================
const ChessAI = (function () {
  // Piece values for evaluation
  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  // Positional Piece-Square Tables (White perspective, flipped for Black)
  const PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ];

  const KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  const BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  const ROOK_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
  ];

  const QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  const KING_MIDDLE_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ];

  const PST = {
    p: PAWN_TABLE,
    n: KNIGHT_TABLE,
    b: BISHOP_TABLE,
    r: ROOK_TABLE,
    q: QUEEN_TABLE,
    k: KING_MIDDLE_TABLE
  };

  // Convert algebraic square e.g. "e4" to 0..63 index
  function squareToIndex(sq) {
    const file = sq.charCodeAt(0) - 97; // 'a' -> 0
    const rank = 8 - parseInt(sq[1], 10); // '8' -> 0, '1' -> 7
    return rank * 8 + file;
  }

  // Full board evaluation function from White's perspective (+ = White advantage, - = Black advantage)
  function evaluateBoard(game) {
    if (game.in_checkmate()) {
      return game.turn() === 'w' ? -99999 : 99999;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      return 0;
    }

    let score = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type];
        const sqIndex = r * 8 + c;
        const flippedSqIndex = (7 - r) * 8 + c;
        const table = PST[piece.type];
        const posScore = table ? (piece.color === 'w' ? table[sqIndex] : table[flippedSqIndex]) : 0;

        if (piece.color === 'w') {
          score += val + posScore;
        } else {
          score -= (val + posScore);
        }
      }
    }
    return score;
  }

  // MVV-LVA move ordering helper (order high-value captures first)
  function orderMoves(moves) {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.captured) {
        scoreA = (PIECE_VALUES[a.captured] * 10) - (PIECE_VALUES[a.piece] || 100);
      }
      if (b.captured) {
        scoreB = (PIECE_VALUES[b.captured] * 10) - (PIECE_VALUES[b.piece] || 100);
      }
      if (a.promotion) scoreA += 800;
      if (b.promotion) scoreB += 800;
      return scoreB - scoreA;
    });
  }

  // Quiescence search to mitigate horizon effect on captures
  function quiescence(game, alpha, beta, isMaximizing, depthLeft = 3) {
    const standPat = evaluateBoard(game);

    if (depthLeft === 0) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;

      const captures = orderMoves(game.moves({ verbose: true }).filter(m => m.captured || m.promotion));
      for (let i = 0; i < captures.length; i++) {
        game.move(captures[i]);
        const score = quiescence(game, alpha, beta, false, depthLeft - 1);
        game.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (beta > standPat) beta = standPat;

      const captures = orderMoves(game.moves({ verbose: true }).filter(m => m.captured || m.promotion));
      for (let i = 0; i < captures.length; i++) {
        game.move(captures[i]);
        const score = quiescence(game, alpha, beta, true, depthLeft - 1);
        game.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  // Minimax with Alpha-Beta Pruning
  function minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return quiescence(game, alpha, beta, isMaximizing, 2);
    }

    const moves = orderMoves(game.moves({ verbose: true }));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        const evalVal = minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        const evalVal = minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minEval;
    }
  }

  return {
    evaluate: evaluateBoard,

    // Finds the best move asynchronously
    findBestMove: function (game, level = 2, callback) {
      setTimeout(() => {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) {
          callback(null, 0);
          return;
        }

        // Level 1: Beginner (~800 ELO) - Fast, makes occasional random blunders
        if (level === 1) {
          if (Math.random() < 0.35) {
            const randMove = moves[Math.floor(Math.random() * moves.length)];
            callback(randMove, evaluateBoard(game));
            return;
          }
        }

        const isMaximizing = (game.turn() === 'w');
        const depth = level === 1 ? 1 : (level === 2 ? 3 : 4);

        let bestMove = null;
        let bestVal = isMaximizing ? -Infinity : Infinity;

        const ordered = orderMoves(moves);

        for (let i = 0; i < ordered.length; i++) {
          const move = ordered[i];
          game.move(move);
          const val = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
          game.undo();

          if (isMaximizing) {
            if (val > bestVal) {
              bestVal = val;
              bestMove = move;
            }
          } else {
            if (val < bestVal) {
              bestVal = val;
              bestMove = move;
            }
          }
        }

        callback(bestMove || ordered[0], bestVal);
      }, 60);
    }
  };
})();

// ============================================================================
// 3. 3D GRAPHICS & STAUNTON PROCEDURAL GEOMETRIES (Three.js)
// ============================================================================
const Chess3D = (function () {
  const SQUARE_SIZE = 2.0;
  const BOARD_HALF = 8.0;

  let container = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;

  // Board meshes & pieces storage
  let boardGroup = null;
  let piecesGroup = null;
  let markersGroup = null;
  let particlesGroup = null;

  // Cache of tile objects: map key "e4" -> Mesh
  const tileMeshes = {};
  // Map of active 3D piece objects: key pieceId -> Mesh/Group
  const pieceObjects = {};

  // Raycaster & Interactivity
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredTile = null;

  // Drag and Drop State
  let isPointerDown = false;
  let isDraggingPiece = false;
  let draggedPieceMesh = null;
  let dragOriginSquare = null;
  const dragOriginPosition = new THREE.Vector3();
  const pointerDownCoords = { x: 0, y: 0 };
  const dragMathPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.85);
  const dragIntersection = new THREE.Vector3();

  // Active theme
  let currentTheme = 'gold';

  // Camera presets
  const CAM_PRESETS = {
    '3d': { pos: new THREE.Vector3(0, 13.5, 14.5), lookAt: new THREE.Vector3(0, 0, 0) },
    'top': { pos: new THREE.Vector3(0, 22, 0.01), lookAt: new THREE.Vector3(0, 0, 0) },
    'white': { pos: new THREE.Vector3(0, 11, 13), lookAt: new THREE.Vector3(0, 0, 0) },
    'black': { pos: new THREE.Vector3(0, 11, -13), lookAt: new THREE.Vector3(0, 0, 0) }
  };

  // Luxury Themes Material Definitions
  const THEME_CONFIG = {
    wood: {
      lightSquare: 0xe6cfaf,
      darkSquare: 0x764222,
      boardBorder: 0x221208,
      lightPiece: { color: 0xf7efe1, roughness: 0.22, metalness: 0.04, clearcoat: 0.45 },
      darkPiece: { color: 0x11100e, roughness: 0.24, metalness: 0.14, clearcoat: 0.45 },
      groundColor: 0x090705,
      ambientColor: 0xfff6ea,
      lightIntensity: 1.2
    },
    marble: {
      lightSquare: 0xe8ecf2,
      darkSquare: 0x1e2736,
      boardBorder: 0x0d131f,
      lightPiece: { color: 0xf8fafc, roughness: 0.12, metalness: 0.1, clearcoat: 0.9 },
      darkPiece: { color: 0x0c0f14, roughness: 0.14, metalness: 0.18, clearcoat: 0.9 },
      groundColor: 0x05070f,
      ambientColor: 0xe0f2fe,
      lightIntensity: 1.25
    },
    neon: {
      lightSquare: 0x0b192c,
      darkSquare: 0x040814,
      boardBorder: 0x030712,
      lightPiece: { color: 0x00f0ff, emissive: 0x006688, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.3 },
      darkPiece: { color: 0xff0066, emissive: 0x880033, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.3 },
      groundColor: 0x040108,
      ambientColor: 0x38bdf8,
      lightIntensity: 1.15
    },
    gold: {
      lightSquare: 0xedd6a4,
      darkSquare: 0x383428,
      boardBorder: 0x1a1710,
      lightPiece: { color: 0xffd700, roughness: 0.18, metalness: 0.96, clearcoat: 0.5 },
      darkPiece: { color: 0x1e2026, roughness: 0.22, metalness: 0.88, clearcoat: 0.6 },
      groundColor: 0x0c0a07,
      ambientColor: 0xfef08a,
      lightIntensity: 1.3
    }
  };

  // Convert algebraic square (e.g. "e4") to 3D world coordinates {x, z}
  function squareToWorld(square) {
    const file = square.charCodeAt(0) - 97; // 0..7 (a..h)
    const rank = parseInt(square[1], 10) - 1; // 0..7 (1..8)
    const x = (file - 3.5) * SQUARE_SIZE;
    const z = (3.5 - rank) * SQUARE_SIZE; // White (rank 1) at positive Z
    return { x, z };
  }

  // Convert 3D world coordinates {x, z} back to algebraic square
  function worldToSquare(x, z) {
    const file = Math.round(x / SQUARE_SIZE + 3.5);
    const rank = Math.round(3.5 - z / SQUARE_SIZE);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
  }

  // ==========================================================================
  // Staunton Procedural Geometries (Lathe, Bevels & Extrusions)
  // ==========================================================================
  const PieceGeometries = (function () {
    const geos = {};

    function createLathe(points, segments = 32) {
      const v2Points = points.map(p => new THREE.Vector2(p[0], p[1]));
      return new THREE.LatheGeometry(v2Points, segments);
    }

    // Pawn Geometry
    function buildPawn() {
      const group = new THREE.Group();
      const pts = [
        [0, 0], [0.72, 0], [0.72, 0.15], [0.65, 0.25], [0.60, 0.35],
        [0.45, 0.45], [0.38, 0.70], [0.32, 1.05], [0.30, 1.35],
        [0.44, 1.45], [0.46, 1.55], [0.32, 1.62], [0.35, 1.72],
        [0.48, 1.95], [0.42, 2.20], [0.22, 2.38], [0, 2.45]
      ];
      const lathe = new THREE.Mesh(createLathe(pts));
      group.add(lathe);
      return group;
    }

    // Rook Geometry
    function buildRook() {
      const group = new THREE.Group();
      const basePts = [
        [0, 0], [0.78, 0], [0.78, 0.2], [0.70, 0.3], [0.55, 0.5],
        [0.50, 1.2], [0.54, 1.8], [0.68, 2.0], [0.70, 2.45], [0.52, 2.45],
        [0.52, 2.15], [0, 2.15]
      ];
      const lathe = new THREE.Mesh(createLathe(basePts));
      group.add(lathe);

      // 4 Castle Crenellations on parapet
      const crenelGeo = new THREE.BoxGeometry(0.32, 0.4, 0.32);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const crenel = new THREE.Mesh(crenelGeo);
        crenel.position.set(Math.cos(angle) * 0.58, 2.45, Math.sin(angle) * 0.58);
        group.add(crenel);
      }
      return group;
    }

    // Knight Geometry (Stylized Horse bust)
    function buildKnight() {
      const group = new THREE.Group();

      // Lathe base pedestal
      const basePts = [
        [0, 0], [0.76, 0], [0.76, 0.22], [0.68, 0.35], [0.55, 0.55],
        [0.46, 0.8], [0.48, 0.95], [0, 0.95]
      ];
      const base = new THREE.Mesh(createLathe(basePts));
      group.add(base);

      // Extruded / sculpted horse head & neck shape
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.9);
      shape.lineTo(0.35, 0.95);
      shape.quadraticCurveTo(0.55, 1.35, 0.52, 1.9); // Back of neck / mane
      shape.lineTo(0.48, 2.65); // Ear tip
      shape.lineTo(0.32, 2.5);  // Ear notch
      shape.lineTo(0.20, 2.55); // Forehead
      shape.quadraticCurveTo(0.15, 2.2, -0.45, 1.95); // Snout / muzzle
      shape.lineTo(-0.45, 1.65); // Chin
      shape.quadraticCurveTo(-0.1, 1.6, -0.15, 1.2); // Throat
      shape.lineTo(0, 0.9);

      const extrudeSettings = {
        steps: 1,
        depth: 0.45,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.08,
        bevelSegments: 4
      };
      const horseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      horseGeo.center();
      const horse = new THREE.Mesh(horseGeo);
      horse.position.set(0, 1.82, 0);
      group.add(horse);

      return group;
    }

    // Bishop Geometry
    function buildBishop() {
      const group = new THREE.Group();
      const pts = [
        [0, 0], [0.75, 0], [0.75, 0.2], [0.66, 0.32], [0.52, 0.5],
        [0.42, 1.0], [0.36, 1.5], [0.45, 1.7], [0.48, 1.8], [0.35, 1.9],
        [0.55, 2.25], [0.52, 2.75], [0.35, 3.1], [0.12, 3.3], [0, 3.35]
      ];
      const lathe = new THREE.Mesh(createLathe(pts));
      group.add(lathe);

      // Finial sphere on tip
      const tipGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const tip = new THREE.Mesh(tipGeo);
      tip.position.set(0, 3.44, 0);
      group.add(tip);

      return group;
    }

    // Queen Geometry
    function buildQueen() {
      const group = new THREE.Group();
      const pts = [
        [0, 0], [0.82, 0], [0.82, 0.22], [0.72, 0.35], [0.58, 0.55],
        [0.46, 1.2], [0.40, 1.9], [0.52, 2.15], [0.55, 2.25], [0.38, 2.38],
        [0.56, 2.9], [0.68, 3.35], [0.48, 3.35], [0, 3.2]
      ];
      const lathe = new THREE.Mesh(createLathe(pts));
      group.add(lathe);

      // Coronet Jewels (8 mini spheres circling the crown)
      const jewelGeo = new THREE.SphereGeometry(0.09, 12, 12);
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const jewel = new THREE.Mesh(jewelGeo);
        jewel.position.set(Math.cos(angle) * 0.64, 3.42, Math.sin(angle) * 0.64);
        group.add(jewel);
      }

      // Center orb
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16));
      orb.position.set(0, 3.52, 0);
      group.add(orb);

      return group;
    }

    // King Geometry with Regal Latin Cross
    function buildKing() {
      const group = new THREE.Group();
      const pts = [
        [0, 0], [0.86, 0], [0.86, 0.25], [0.76, 0.4], [0.60, 0.6],
        [0.48, 1.4], [0.42, 2.1], [0.55, 2.35], [0.58, 2.45], [0.42, 2.6],
        [0.62, 3.1], [0.70, 3.65], [0.48, 3.65], [0, 3.5]
      ];
      const lathe = new THREE.Mesh(createLathe(pts));
      group.add(lathe);

      // Cross finial on top
      const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12));
      crossVertical.position.set(0, 3.9, 0);
      group.add(crossVertical);

      const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12));
      crossHorizontal.position.set(0, 3.98, 0);
      group.add(crossHorizontal);

      return group;
    }

    return {
      getGeometry: function (type) {
        if (!geos[type]) {
          switch (type) {
            case 'p': geos[type] = buildPawn(); break;
            case 'r': geos[type] = buildRook(); break;
            case 'n': geos[type] = buildKnight(); break;
            case 'b': geos[type] = buildBishop(); break;
            case 'q': geos[type] = buildQueen(); break;
            case 'k': geos[type] = buildKing(); break;
          }
        }
        return geos[type];
      }
    };
  })();

  // Material builder based on active theme
  function getPieceMaterial(color) {
    const theme = THEME_CONFIG[currentTheme];
    const props = (color === 'w') ? theme.lightPiece : theme.darkPiece;
    return new THREE.MeshStandardMaterial({
      color: props.color,
      emissive: props.emissive || 0x000000,
      emissiveIntensity: props.emissiveIntensity || 0.0,
      roughness: props.roughness !== undefined ? props.roughness : 0.3,
      metalness: props.metalness !== undefined ? props.metalness : 0.1,
      roughnessMap: null,
      metalnessMap: null
    });
  }

  // Initialize Scene, Camera, Lights, and Renderer
  function initScene(elemId) {
    container = document.getElementById(elemId);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME_CONFIG[currentTheme].groundColor);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(CAM_PRESETS['3d'].pos);
    camera.lookAt(CAM_PRESETS['3d'].lookAt);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // OrbitControls with fallback
    if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.05; // Never submerge below board
      controls.minDistance = 6;
      controls.maxDistance = 45;
      controls.target.set(0, 0, 0);
    } else {
      controls = { update: () => {}, target: new THREE.Vector3(0, 0, 0) };
    }

    // Groups
    boardGroup = new THREE.Group();
    piecesGroup = new THREE.Group();
    markersGroup = new THREE.Group();
    particlesGroup = new THREE.Group();

    scene.add(boardGroup);
    scene.add(piecesGroup);
    scene.add(markersGroup);
    scene.add(particlesGroup);

    setupLights();
    buildBoard();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('pointermove', onPointerMove, false);
    renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
    renderer.domElement.addEventListener('pointerup', onPointerUp, false);
    window.addEventListener('pointerup', onPointerUp, false);

    // Start render loop
    animate();
  }

  // Setup studio 3-point lighting
  function setupLights() {
    // Remove existing lights
    const toRemove = [];
    scene.traverse(child => {
      if (child.isLight) toRemove.push(child);
    });
    toRemove.forEach(l => scene.remove(l));

    const theme = THEME_CONFIG[currentTheme];

    // Ambient fill
    const ambientLight = new THREE.AmbientLight(theme.ambientColor, 0.8 * theme.lightIntensity);
    scene.add(ambientLight);

    // Hemisphere Light (sky/ground warmth contrast)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.45);
    scene.add(hemiLight);

    // Main Key Light (Warm sunlight casting crisp shadows)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4 * theme.lightIntensity);
    keyLight.position.set(16, 26, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    // Cool Rim Light (silhouette definition)
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75 * theme.lightIntensity);
    rimLight.position.set(-16, 18, -18);
    scene.add(rimLight);

    // Subtle table reflection floor
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      color: theme.groundColor,
      roughness: 0.85,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.65;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  // Build 3D Chessboard with Plinth and Coordinate Labels
  function buildBoard() {
    // Clear existing board
    while (boardGroup.children.length > 0) {
      boardGroup.remove(boardGroup.children[0]);
    }
    for (let k in tileMeshes) delete tileMeshes[k];

    const theme = THEME_CONFIG[currentTheme];

    // Outer Plinth / Frame
    const plinthGeo = new THREE.BoxGeometry(18.2, 0.6, 18.2);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: theme.boardBorder,
      roughness: 0.4,
      metalness: 0.2
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.3;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    boardGroup.add(plinth);

    // Inner board bezel
    const innerBezelGeo = new THREE.BoxGeometry(16.5, 0.1, 16.5);
    const innerBezelMat = new THREE.MeshStandardMaterial({
      color: theme.boardBorder,
      roughness: 0.25,
      metalness: 0.3
    });
    const innerBezel = new THREE.Mesh(innerBezelGeo, innerBezelMat);
    innerBezel.position.y = 0.02;
    boardGroup.add(innerBezel);

    // 64 Tiles
    const tileGeo = new THREE.BoxGeometry(SQUARE_SIZE - 0.04, 0.12, SQUARE_SIZE - 0.04);
    const lightMat = new THREE.MeshStandardMaterial({
      color: theme.lightSquare,
      roughness: 0.3,
      metalness: 0.05
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: theme.darkSquare,
      roughness: 0.35,
      metalness: 0.05
    });

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = files[f] + (r + 1);
        const isLight = (r + f) % 2 === 1;
        const mat = (isLight ? lightMat : darkMat).clone();

        const tile = new THREE.Mesh(tileGeo, mat);
        const { x, z } = squareToWorld(sq);
        tile.position.set(x, 0.06, z);
        tile.receiveShadow = true;
        tile.userData = { square: sq, isLight, originalColor: mat.color.clone() };

        boardGroup.add(tile);
        tileMeshes[sq] = tile;
      }
    }

    // Add 3D Coordinate Notation Decals along border
    addCoordinates();
  }

  // Draw rank numbers and file letters on board margins
  function addCoordinates() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    function createTextCanvas(text) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 38px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 32);
      return c;
    }

    // Files (a-h) on front and back margins
    files.forEach((file, idx) => {
      const x = (idx - 3.5) * SQUARE_SIZE;
      const tex = new THREE.CanvasTexture(createTextCanvas(file));
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(x, 0.08, 8.55);
      boardGroup.add(plane);
    });

    // Ranks (1-8) on left and right margins
    ranks.forEach((rank, idx) => {
      const z = (3.5 - idx) * SQUARE_SIZE;
      const tex = new THREE.CanvasTexture(createTextCanvas(rank));
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(-8.55, 0.08, z);
      boardGroup.add(plane);
    });
  }

  // Create an individual 3D piece mesh group
  function createPieceMesh(type, color, id) {
    const template = PieceGeometries.getGeometry(type);
    const piece = template.clone();
    const mat = getPieceMaterial(color);

    piece.traverse(child => {
      if (child.isMesh) {
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Face White knights forward (towards Black) and Black knights forward (towards White)
    if (type === 'n') {
      piece.rotation.y = (color === 'w') ? 0 : Math.PI;
    }

    piece.userData = { pieceId: id, type, color, square: null };
    return piece;
  }

  // Synchronize 3D board pieces with FIDE Chess game state
  function syncBoard(game) {
    // Clear piecesGroup
    while (piecesGroup.children.length > 0) {
      piecesGroup.remove(piecesGroup.children[0]);
    }
    for (let k in pieceObjects) delete pieceObjects[k];

    const board = game.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const sq = files[c] + (8 - r);
        const id = `${piece.color}_${piece.type}_${sq}`;
        const mesh = createPieceMesh(piece.type, piece.color, id);
        const { x, z } = squareToWorld(sq);

        mesh.position.set(x, 0.12, z);
        mesh.userData.square = sq;
        mesh.userData.pieceId = id;
        mesh.traverse(child => {
          child.userData.square = sq;
          child.userData.pieceId = id;
          child.userData.rootMesh = mesh;
        });
        piecesGroup.add(mesh);
        pieceObjects[id] = mesh;
      }
    }
  }

  // Smooth physical piece movement animation using GSAP
  function animateMove(fromSq, toSq, onComplete, isAlreadyAtTarget = false) {
    let movingMesh = null;
    let capturedMesh = null;

    // Find moving mesh at fromSq
    for (let id in pieceObjects) {
      if (pieceObjects[id].userData.square === fromSq) {
        movingMesh = pieceObjects[id];
      } else if (pieceObjects[id].userData.square === toSq) {
        capturedMesh = pieceObjects[id];
      }
    }

    const { x: destX, z: destZ } = squareToWorld(toSq);

    // If a piece is captured, play particle burst and swoop away
    if (capturedMesh) {
      createCaptureExplosion(destX, 0.5, destZ);
      gsap.to(capturedMesh.position, {
        y: 4.5,
        x: capturedMesh.position.x + (Math.random() - 0.5) * 4,
        z: capturedMesh.position.z + (Math.random() - 0.5) * 4,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: () => {
          piecesGroup.remove(capturedMesh);
          delete pieceObjects[capturedMesh.userData.pieceId];
        }
      });
      gsap.to(capturedMesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.45 });
    }

    if (movingMesh) {
      if (isAlreadyAtTarget) {
        // Dragged piece was already moved by user, smoothly settle onto square center
        gsap.to(movingMesh.position, {
          x: destX,
          y: 0.12,
          z: destZ,
          duration: 0.16,
          ease: 'power2.out',
          onComplete: () => {
            movingMesh.userData.square = toSq;
            if (onComplete) onComplete();
          }
        });
      } else {
        // Parabolic Arc Lift and Snap
        const tl = gsap.timeline({
          onComplete: () => {
            movingMesh.userData.square = toSq;
            if (onComplete) onComplete();
          }
        });

        tl.to(movingMesh.position, {
          x: destX,
          z: destZ,
          duration: 0.38,
          ease: 'power2.inOut'
        }, 0);

        // Arc Y position
        tl.to(movingMesh.position, {
          y: 1.8,
          duration: 0.19,
          ease: 'power1.out'
        }, 0);

        tl.to(movingMesh.position, {
          y: 0.12,
          duration: 0.19,
          ease: 'bounce.out'
        }, 0.19);
      }
    } else {
      if (onComplete) onComplete();
    }
  }

  // 3D Particle explosion for captures
  function createCaptureExplosion(x, y, z) {
    const particleCount = 28;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      velocities.push({
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 5 + 2,
        vz: (Math.random() - 0.5) * 6
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: (currentTheme === 'neon') ? 0x00f0ff : 0xffaa33,
      size: 0.28,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    particlesGroup.add(pSystem);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      const posAttr = geo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] += velocities[i].vx * 0.05;
        posAttr.array[i * 3 + 1] += velocities[i].vy * 0.05;
        posAttr.array[i * 3 + 2] += velocities[i].vz * 0.05;
        velocities[i].vy -= 0.25; // Gravity
      }
      posAttr.needsUpdate = true;
      mat.opacity = 1 - progress;

      if (progress >= 1) {
        clearInterval(interval);
        particlesGroup.remove(pSystem);
        geo.dispose();
        mat.dispose();
      }
    }, 20);
  }

  // Clear all highlight markers
  function clearMarkers() {
    while (markersGroup.children.length > 0) {
      markersGroup.remove(markersGroup.children[0]);
    }
  }

  // Highlight active selected piece
  function highlightSelected(square) {
    if (!square) return;
    const { x, z } = squareToWorld(square);

    // Luminous square tile illumination
    const baseGeo = new THREE.PlaneGeometry(SQUARE_SIZE - 0.06, SQUARE_SIZE - 0.06);
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.set(x, 0.138, z);
    markersGroup.add(base);

    // Glowing halo ring around the piece base
    const haloGeo = new THREE.RingGeometry(0.35, 0.92, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(x, 0.145, z);
    markersGroup.add(halo);

    // Gentle pulsing animation
    gsap.to(halo.scale, {
      x: 1.1,
      y: 1.1,
      duration: 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  // Show legal move positions and directional movement trajectories according to FIDE standards
  function showLegalMoves(moves) {
    if (!moves || moves.length === 0) return;

    moves.forEach(m => {
      const fromPos = squareToWorld(m.from);
      const toPos = squareToWorld(m.to);
      const isCapture = !!m.captured;

      // 1. Broad Invisible Raycast Hit Plate (covers entire 2.0x2.0 square for effortless mouse interaction)
      // Must use transparent: true, opacity: 0.0, depthWrite: false so Three.js Raycaster intersects it!
      const hitPlateGeo = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
      const hitPlateMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const hitPlate = new THREE.Mesh(hitPlateGeo, hitPlateMat);
      hitPlate.rotation.x = -Math.PI / 2;
      hitPlate.position.set(toPos.x, 0.145, toPos.z);
      hitPlate.userData = { targetSquare: m.to, isMoveMarker: true };
      markersGroup.add(hitPlate);

      // 2. Directional Trajectory Indicators
      if (m.piece === 'n') {
        // --- KNIGHT JUMP: 3D Parabolic Trajectory Arc (Curves over intervening pieces) ---
        const midX = (fromPos.x + toPos.x) / 2;
        const midZ = (fromPos.z + toPos.z) / 2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(fromPos.x, 0.25, fromPos.z),
          new THREE.Vector3(midX, 2.0, midZ), // High apex jump
          new THREE.Vector3(toPos.x, 0.25, toPos.z)
        );
        const pts = curve.getPoints(24);
        const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const arcMat = new THREE.LineBasicMaterial({
          color: isCapture ? 0xf43f5e : 0xa855f7, // Electric purple for quiet jump, crimson for capture
          linewidth: 3,
          transparent: true,
          opacity: 0.85
        });
        const arcLine = new THREE.Line(arcGeo, arcMat);
        arcLine.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(arcLine);

        // Ground trajectory guide beam
        const groundDist = Math.hypot(toPos.x - fromPos.x, toPos.z - fromPos.z);
        const groundBeamGeo = new THREE.PlaneGeometry(0.14, groundDist);
        const groundBeamMat = new THREE.MeshBasicMaterial({
          color: isCapture ? 0xf43f5e : 0xc084fc,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const groundBeam = new THREE.Mesh(groundBeamGeo, groundBeamMat);
        groundBeam.rotation.x = -Math.PI / 2;
        groundBeam.rotation.z = -Math.atan2(toPos.x - fromPos.x, toPos.z - fromPos.z);
        groundBeam.position.set(midX, 0.132, midZ);
        groundBeam.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(groundBeam);

      } else {
        // --- STRAIGHT & DIAGONAL PATHS (Rook, Bishop, Queen, King, Pawn) ---
        const dx = toPos.x - fromPos.x;
        const dz = toPos.z - fromPos.z;
        const dist = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);

        // Directional ground beam along the path
        const beamGeo = new THREE.PlaneGeometry(0.18, dist);
        const beamMat = new THREE.MeshBasicMaterial({
          color: isCapture ? 0xef4444 : 0x06b6d4, // Crimson or cyan
          transparent: true,
          opacity: isCapture ? 0.45 : 0.4,
          side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.rotation.x = -Math.PI / 2;
        beam.rotation.z = -angle;
        beam.position.set((fromPos.x + toPos.x) / 2, 0.134, (fromPos.z + toPos.z) / 2);
        beam.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(beam);

        // Movement Direction Arrowhead
        const arrowGeo = new THREE.ConeGeometry(0.24, 0.45, 3);
        const arrowMat = new THREE.MeshBasicMaterial({
          color: isCapture ? 0xf87171 : 0x38bdf8,
          transparent: true,
          opacity: 0.85
        });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.rotation.x = -Math.PI / 2;
        arrow.rotation.z = -angle + Math.PI;
        // Position slightly before center of target square
        const tipDist = 0.42;
        arrow.position.set(toPos.x - (dx / dist) * tipDist, 0.142, toPos.z - (dz / dist) * tipDist);
        arrow.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(arrow);
      }

      // 3. Target Position Destination Beacon
      if (isCapture) {
        // --- CRIMSON ATTACK TARGETING RETICLE ---
        const sqGeo = new THREE.PlaneGeometry(SQUARE_SIZE - 0.12, SQUARE_SIZE - 0.12);
        const sqMat = new THREE.MeshBasicMaterial({
          color: 0xdc2626,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide
        });
        const sqMesh = new THREE.Mesh(sqGeo, sqMat);
        sqMesh.rotation.x = -Math.PI / 2;
        sqMesh.position.set(toPos.x, 0.136, toPos.z);
        sqMesh.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(sqMesh);

        // Outer targeting reticle ring
        const ringGeo = new THREE.RingGeometry(0.55, 0.88, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(toPos.x, 0.15, toPos.z);
        ring.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(ring);

        // Pulsing animation
        gsap.to(ring.scale, {
          x: 1.12,
          y: 1.12,
          duration: 0.6,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        });

      } else {
        // --- LUMINOUS EMERALD/CYAN BEACON DISC ---
        const dotGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 32);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.92
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(toPos.x, 0.16, toPos.z);
        dot.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(dot);

        // Soft outer glowing ring
        const glowGeo = new THREE.RingGeometry(0.35, 0.68, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x34d399,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(toPos.x, 0.14, toPos.z);
        glow.userData = { targetSquare: m.to, isMoveMarker: true };
        markersGroup.add(glow);

        // Gentle breathing pulse
        gsap.to(glow.scale, {
          x: 1.15,
          y: 1.15,
          duration: 0.75,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        });
      }
    });
  }

  // Highlight departure and destination squares of the last move
  function highlightLastMove(fromSq, toSq) {
    [fromSq, toSq].forEach(sq => {
      if (!sq) return;
      const { x, z } = squareToWorld(sq);
      const markGeo = new THREE.PlaneGeometry(SQUARE_SIZE - 0.08, SQUARE_SIZE - 0.08);
      const markMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0.13, z);
      markersGroup.add(mark);
    });
  }

  // Highlight King in Check with pulsing crimson warning beacon
  function highlightCheck(kingSquare) {
    if (!kingSquare) return;
    const { x, z } = squareToWorld(kingSquare);
    const beaconGeo = new THREE.RingGeometry(0.1, 0.95, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.set(x, 0.15, z);
    markersGroup.add(beacon);

    gsap.to(beacon.scale, {
      x: 1.15,
      y: 1.15,
      duration: 0.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  // Highlight AI suggested hint move
  function highlightHint(fromSq, toSq) {
    [fromSq, toSq].forEach((sq, i) => {
      const { x, z } = squareToWorld(sq);
      const ringGeo = new THREE.RingGeometry(0.4, 0.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x38bdf8 : 0x4ade80,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.15, z);
      markersGroup.add(ring);

      gsap.to(ring.scale, {
        x: 1.25,
        y: 1.25,
        duration: 0.5,
        yoyo: true,
        repeat: 5
      });
    });
  }

  // Smooth camera preset transition with GSAP
  function setCameraPreset(presetName) {
    const target = CAM_PRESETS[presetName];
    if (!target) return;

    if (controls) {
      if (presetName === 'top') {
        controls.enableRotate = false; // Lock 2D tactical view
      } else {
        controls.enableRotate = true; // Enable 3D orbit
      }
    }

    gsap.to(camera.position, {
      x: target.pos.x,
      y: target.pos.y,
      z: target.pos.z,
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => controls && controls.update && controls.update()
    });

    if (controls && controls.target) {
      gsap.to(controls.target, {
        x: target.lookAt.x,
        y: target.lookAt.y,
        z: target.lookAt.z,
        duration: 1.0,
        ease: 'power2.inOut'
      });
    }
  }

  // Flip board perspective 180 degrees smoothly
  function flipBoard() {
    const currentX = camera.position.x;
    const currentZ = camera.position.z;
    const currentY = camera.position.y;

    gsap.to(camera.position, {
      x: -currentX,
      z: -currentZ,
      y: currentY,
      duration: 1.1,
      ease: 'power2.inOut',
      onUpdate: () => controls.update()
    });
  }

  // Camera Zoom In / Out / Reset
  function zoomCamera(direction) {
    if (!camera || !controls) return;
    // direction: -1 for Zoom In, +1 for Zoom Out
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const currentDist = offset.length();
    const factor = direction < 0 ? 0.78 : 1.25;
    const newDist = THREE.MathUtils.clamp(currentDist * factor, 6, 42);

    offset.setLength(newDist);
    const newPos = new THREE.Vector3().addVectors(controls.target, offset);

    gsap.to(camera.position, {
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => controls.update()
    });
  }

  function resetZoom() {
    setCameraPreset('3d');
  }

  // Switch Theme (Wood, Marble, Neon, Gold)
  function setTheme(themeName) {
    if (!THEME_CONFIG[themeName]) return;
    currentTheme = themeName;
    scene.background.set(THEME_CONFIG[themeName].groundColor);

    setupLights();
    buildBoard();

    // Re-apply materials to all pieces
    for (let id in pieceObjects) {
      const p = pieceObjects[id];
      const mat = getPieceMaterial(p.userData.color);
      p.traverse(c => {
        if (c.isMesh) c.material = mat;
      });
    }
  }

  // Resize handler
  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Dynamic drop hover highlight square
  let dragHoverMesh = null;
  function updateDragHoverMarker(square) {
    if (!dragHoverMesh) {
      const geo = new THREE.PlaneGeometry(SQUARE_SIZE - 0.08, SQUARE_SIZE - 0.08);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      dragHoverMesh = new THREE.Mesh(geo, mat);
      dragHoverMesh.rotation.x = -Math.PI / 2;
      dragHoverMesh.position.y = 0.145;
      scene.add(dragHoverMesh);
    }
    if (square) {
      const { x, z } = squareToWorld(square);
      dragHoverMesh.position.x = x;
      dragHoverMesh.position.z = z;
      dragHoverMesh.visible = true;
    } else {
      dragHoverMesh.visible = false;
    }
  }

  function clearDragHoverMarker() {
    if (dragHoverMesh) {
      dragHoverMesh.visible = false;
    }
  }

  // Comprehensive, 100% resilient square identification from pointer event
  function getSquareFromPointer(e) {
    if (!renderer || !camera) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ptr = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ptr, camera);

    // 1. Move markers, hit plates, and reticles
    const markerHits = raycaster.intersectObjects(markersGroup.children, true);
    for (let i = 0; i < markerHits.length; i++) {
      const obj = markerHits[i].object;
      if (obj && obj.userData && obj.userData.targetSquare) {
        return obj.userData.targetSquare;
      }
    }

    // 2. Pieces (checks direct child stamped userData or climbs to root piece mesh)
    const pieceHits = raycaster.intersectObjects(piecesGroup.children, true);
    for (let i = 0; i < pieceHits.length; i++) {
      let obj = pieceHits[i].object;
      while (obj && obj !== piecesGroup) {
        if (obj.userData && obj.userData.square) {
          return obj.userData.square;
        }
        obj = obj.parent;
      }
    }

    // 3. Board tiles
    const tileHits = raycaster.intersectObjects(boardGroup.children, true);
    for (let i = 0; i < tileHits.length; i++) {
      const obj = tileHits[i].object;
      if (obj && obj.userData && obj.userData.square) {
        return obj.userData.square;
      }
    }

    // 4. Mathematical board plane fallback (y = 0.06 is the tile surface)
    // Board is 8x8 squares of size SQUARE_SIZE (2.0) centered at 0, 0
    const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(boardPlane, pt)) {
      const sq = worldToSquare(pt.x, pt.z);
      if (sq) return sq;
    }

    return null;
  }

  // Hover detection and Piece Dragging
  function onPointerMove(e) {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Handle active piece dragging
    if (isPointerDown && draggedPieceMesh) {
      const dx = e.clientX - pointerDownCoords.x;
      const dy = e.clientY - pointerDownCoords.y;
      const dist = Math.hypot(dx, dy);

      if (!isDraggingPiece && dist > 6) {
        isDraggingPiece = true;
        if (controls) controls.enabled = false;
        document.body.style.cursor = 'grabbing';
        GameController.selectPiece(dragOriginSquare);
      }

      if (isDraggingPiece) {
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragMathPlane, dragIntersection)) {
          draggedPieceMesh.position.x = dragIntersection.x;
          draggedPieceMesh.position.z = dragIntersection.z;
          draggedPieceMesh.position.y = 1.2;

          const hoverSq = worldToSquare(dragIntersection.x, dragIntersection.z);
          updateDragHoverMarker(hoverSq);
        }
        return;
      }
    }

    // Default hover cursor state when not dragging
    const sq = getSquareFromPointer(e);
    if (sq) {
      if (GameController.canMovePiece(sq) || GameController.isLegalTargetSquare(sq)) {
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    document.body.style.cursor = 'default';
  }

  // Pointer down handler (Prepares drag or click selection)
  function onPointerDown(e) {
    if (e.button !== 0 || !renderer) return; // Left mouse button only

    isPointerDown = true;
    pointerDownCoords.x = e.clientX;
    pointerDownCoords.y = e.clientY;
    isDraggingPiece = false;
    draggedPieceMesh = null;
    dragOriginSquare = null;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // If pointer is pressed down directly on a friendly piece belonging to active turn,
    // prepare for potential drag-and-drop
    const pieceHits = raycaster.intersectObjects(piecesGroup.children, true);
    if (pieceHits.length > 0) {
      let target = pieceHits[0].object;
      while (target.parent && target.parent !== piecesGroup) {
        target = target.parent;
      }
      if (target.userData && target.userData.square) {
        const sq = target.userData.square;
        if (GameController.canMovePiece(sq)) {
          draggedPieceMesh = target;
          dragOriginSquare = sq;
          dragOriginPosition.copy(target.position);
        }
      }
    }
  }

  // Pointer up handler (Handles piece drop or click completion)
  function onPointerUp(e) {
    if (!isPointerDown) return;
    isPointerDown = false;

    // Restore OrbitControls
    if (controls) controls.enabled = true;
    document.body.style.cursor = 'default';
    clearDragHoverMarker();

    if (isDraggingPiece && draggedPieceMesh) {
      // Completed drag-and-drop
      const dropSq = worldToSquare(draggedPieceMesh.position.x, draggedPieceMesh.position.z);
      const fromSq = dragOriginSquare;
      const mesh = draggedPieceMesh;
      const origPos = dragOriginPosition.clone();

      isDraggingPiece = false;
      draggedPieceMesh = null;
      dragOriginSquare = null;

      if (dropSq && GameController.isLegalTarget(fromSq, dropSq)) {
        GameController.executeMoveOrPromotion(fromSq, dropSq, true);
      } else {
        // Return piece to origin square
        gsap.to(mesh.position, {
          x: origPos.x,
          y: origPos.y,
          z: origPos.z,
          duration: 0.28,
          ease: 'power2.out'
        });
        SoundEngine.playClick();
      }
    } else {
      // Intentional pure CLICK (or tap)
      isDraggingPiece = false;
      draggedPieceMesh = null;
      dragOriginSquare = null;

      const dx = e.clientX - pointerDownCoords.x;
      const dy = e.clientY - pointerDownCoords.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        const sq = getSquareFromPointer(e);
        if (sq) {
          GameController.onSquareClicked(sq);
        } else {
          GameController.onBackgroundClicked();
        }
      }
    }
  }

  // Animation render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  return {
    init: initScene,
    syncBoard,
    animateMove,
    highlightSelected,
    showLegalMoves,
    highlightLastMove,
    highlightCheck,
    highlightHint,
    clearMarkers,
    setCameraPreset,
    flipBoard,
    zoomCamera,
    resetZoom,
    setTheme
  };
})();

// ============================================================================
// 4. GAME CONTROLLER & FIDE LOGIC INTEGRATION
// ============================================================================
const GameController = (function () {
  let chess = null;

  // Game configuration
  let gameMode = 'ai'; // 'ai' | 'local' | 'analysis'
  let aiLevel = 2; // 1 | 2 | 3
  let playerColor = 'w'; // In vs AI: 'w' or 'b'
  let autoFlip = false;

  // Selection & Promotion State
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let pendingPromotionMove = null;
  let isMoveAnimating = false;

  // Redo History & FIDE Draw Claims
  let redoStack = [];
  let claimableDrawReason = null;

  // Clocks
  let initialTimeSec = 300; // 5 min default
  let whiteTimeSec = 300;
  let blackTimeSec = 300;
  let timerInterval = null;
  let isTimerRunning = false;
  let matchStartTime = null;

  // Move Navigation / Review
  let moveHistory = []; // Array of { san, from, to, fen }
  let currentReviewIndex = -1;

  // Select piece helper (called by pointer drag or click)
  function selectPiece(square) {
    if (isMoveAnimating) return;
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) return;
    selectedSquare = square;
    legalMovesForSelected = chess.moves({ square, verbose: true });
    Chess3D.clearMarkers();
    Chess3D.highlightSelected(square);
    Chess3D.showLegalMoves(legalMovesForSelected);
  }

  // Initialize Game Controller
  function init() {
    if (typeof Chess === 'undefined') {
      console.error('chess.js library not loaded! Check network or CDN link.');
      showToast('Chess engine loading error. Please refresh.', 5000);
      return;
    }

    chess = new Chess();
    Chess3D.init('canvas-container');

    setupDOMEvents();
    startNewGame();
  }

  // Setup UI Click & Change Handlers
  function setupDOMEvents() {
    // Game Mode
    const modeSelect = document.getElementById('game-mode-select');
    modeSelect.addEventListener('change', (e) => {
      gameMode = e.target.value;
      const aiGroup = document.getElementById('ai-difficulty-group');
      if (gameMode === 'ai') {
        aiGroup.style.display = 'flex';
      } else {
        aiGroup.style.display = 'none';
      }
      startNewGame();
    });

    // AI Difficulty Level
    const aiSelect = document.getElementById('ai-level-select');
    aiSelect.addEventListener('change', (e) => {
      aiLevel = parseInt(e.target.value, 10);
      updatePlayerInfo();
      showToast(`AI level set to ${aiSelect.options[aiSelect.selectedIndex].text}`);
    });

    // Time Control
    const timeSelect = document.getElementById('time-control-select');
    timeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'unlimited') {
        initialTimeSec = 0;
      } else {
        initialTimeSec = parseInt(e.target.value, 10);
      }
      resetClocks();
      showToast(`Clock set to ${timeSelect.options[timeSelect.selectedIndex].text}`);
    });

    // Theme Picker
    const themeSelect = document.getElementById('theme-select');
    themeSelect.addEventListener('change', (e) => {
      const th = e.target.value;
      document.body.className = `theme-${th}`;
      Chess3D.setTheme(th);
      showToast(`Theme changed to ${themeSelect.options[themeSelect.selectedIndex].text}`);
    });

    // Camera Preset Buttons
    document.getElementById('cam-3d-btn').addEventListener('click', () => setCamActive('3d'));
    document.getElementById('cam-top-btn').addEventListener('click', () => setCamActive('top'));
    document.getElementById('cam-white-btn').addEventListener('click', () => setCamActive('white'));
    document.getElementById('cam-black-btn').addEventListener('click', () => setCamActive('black'));

    // Sound Toggle
    const soundBtn = document.getElementById('sound-toggle-btn');
    soundBtn.addEventListener('click', () => {
      const isMuted = !SoundEngine.isMuted();
      SoundEngine.setMuted(isMuted);
      soundBtn.classList.toggle('muted', isMuted);
      showToast(isMuted ? 'Sound Muted' : 'Sound Enabled');
    });

    // Fullscreen Toggle
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Floating Action Buttons
    document.getElementById('btn-new-game').addEventListener('click', () => {
      SoundEngine.playClick();
      startNewGame();
    });

    document.getElementById('btn-undo-move').addEventListener('click', () => {
      SoundEngine.playClick();
      undoMove();
    });

    const redoBtn = document.getElementById('btn-redo-move');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        SoundEngine.playClick();
        redoMove();
      });
    }

    const claimBtn = document.getElementById('btn-claim-draw');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        SoundEngine.playClick();
        claimDraw();
      });
    }

    document.getElementById('btn-ai-hint').addEventListener('click', () => {
      SoundEngine.playClick();
      requestHint();
    });

    document.getElementById('btn-flip-board').addEventListener('click', () => {
      SoundEngine.playClick();
      Chess3D.flipBoard();
      showToast('Board Flipped');
    });

    // History Panel Toggle
    const histPanel = document.getElementById('history-panel');
    document.getElementById('btn-toggle-history').addEventListener('click', () => {
      SoundEngine.playClick();
      histPanel.classList.toggle('collapsed');
    });
    document.getElementById('btn-close-history').addEventListener('click', () => {
      histPanel.classList.add('collapsed');
    });

    // Replay Navigation
    document.getElementById('nav-first-btn').addEventListener('click', () => jumpToMove(0));
    document.getElementById('nav-prev-btn').addEventListener('click', () => stepMove(-1));
    document.getElementById('nav-next-btn').addEventListener('click', () => stepMove(1));
    document.getElementById('nav-last-btn').addEventListener('click', () => jumpToMove(moveHistory.length));

    // FEN / PGN Utilities
    document.getElementById('btn-copy-fen').addEventListener('click', copyFEN);
    document.getElementById('btn-export-pgn').addEventListener('click', exportPGN);
    document.getElementById('btn-load-fen').addEventListener('click', openFENModal);

    // Tools Modal
    document.getElementById('btn-more-options').addEventListener('click', () => {
      document.getElementById('tools-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-tools').addEventListener('click', () => {
      document.getElementById('tools-modal').classList.add('hidden');
    });
    document.getElementById('tool-resign-btn').addEventListener('click', () => {
      document.getElementById('tools-modal').classList.add('hidden');
      resignGame();
    });
    document.getElementById('tool-draw-btn').addEventListener('click', () => {
      document.getElementById('tools-modal').classList.add('hidden');
      offerDraw();
    });
    document.getElementById('tool-auto-rotate-btn').addEventListener('click', () => {
      autoFlip = !autoFlip;
      document.getElementById('auto-flip-status').textContent = autoFlip ? 'Enabled (Flips on Turn)' : 'Disabled';
      showToast(autoFlip ? 'Auto-Flip Enabled' : 'Auto-Flip Disabled');
    });
    document.getElementById('tool-camera-reset-btn').addEventListener('click', () => {
      document.getElementById('tools-modal').classList.add('hidden');
      setCamActive('3d');
    });

    // Promotion Modal Choices
    document.querySelectorAll('.promo-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const piece = btn.getAttribute('data-piece');
        completePromotion(piece);
      });
    });

    // Rules Modal
    document.getElementById('rules-btn').addEventListener('click', () => {
      document.getElementById('rules-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      document.getElementById('rules-modal').classList.add('hidden');
    });

    // FEN Modal
    document.getElementById('btn-close-fen').addEventListener('click', () => {
      document.getElementById('fen-modal').classList.add('hidden');
    });
    document.getElementById('fen-cancel-btn').addEventListener('click', () => {
      document.getElementById('fen-modal').classList.add('hidden');
    });
    document.getElementById('fen-submit-btn').addEventListener('click', submitFEN);

    // Game Over Rematch
    document.getElementById('modal-rematch-btn').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.add('hidden');
      startNewGame();
    });
    document.getElementById('modal-review-btn').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.add('hidden');
      showToast('Reviewing game board');
    });
    document.getElementById('modal-pgn-btn').addEventListener('click', () => {
      exportPGN();
    });

    // Floating Zoom Widget Controls
    const zoomInBtn = document.getElementById('btn-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        SoundEngine.playClick();
        Chess3D.zoomCamera(-1);
      });
    }
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        SoundEngine.playClick();
        Chess3D.zoomCamera(1);
      });
    }
    const zoomResetBtn = document.getElementById('btn-zoom-reset');
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', () => {
        SoundEngine.playClick();
        Chess3D.resetZoom();
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyShortcuts);
  }

  function setCamActive(preset) {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`cam-${preset}-btn`);
    if (btn) btn.classList.add('active');
    Chess3D.setCameraPreset(preset);
  }

  function handleKeyShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redoMove();
      else undoMove();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redoMove();
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'u': undoMove(); break;
      case 'y': redoMove(); break;
      case 'h': requestHint(); break;
      case 'f': Chess3D.flipBoard(); break;
      case 'm': document.getElementById('sound-toggle-btn').click(); break;
      case '1': setCamActive('3d'); break;
      case '2': setCamActive('top'); break;
      case '3': setCamActive('white'); break;
      case '4': setCamActive('black'); break;
      case '+':
      case '=':
        Chess3D.zoomCamera(-1);
        break;
      case '-':
      case '_':
        Chess3D.zoomCamera(1);
        break;
      case '0':
        Chess3D.resetZoom();
        break;
      case 'q': if (pendingPromotionMove) completePromotion('q'); break;
      case 'r': if (pendingPromotionMove) completePromotion('r'); break;
      case 'b': if (pendingPromotionMove) completePromotion('b'); break;
      case 'n': if (pendingPromotionMove) completePromotion('n'); break;
      case 'escape':
        deselect();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        break;
    }
  }

  // Start fresh match
  function startNewGame() {
    chess.reset();
    selectedSquare = null;
    legalMovesForSelected = [];
    pendingPromotionMove = null;
    moveHistory = [];
    redoStack = [];
    isMoveAnimating = false;
    claimableDrawReason = null;
    currentReviewIndex = -1;
    matchStartTime = Date.now();

    const claimBtn = document.getElementById('btn-claim-draw');
    if (claimBtn) claimBtn.classList.add('hidden');

    Chess3D.clearMarkers();
    Chess3D.syncBoard(chess);

    resetClocks();
    startClocks();
    updateUI();
    showToast('New match started. Good luck!');

    // If AI is playing as White, make initial move
    if (gameMode === 'ai' && playerColor === 'b' && chess.turn() === 'w') {
      makeAIMove();
    }
  }

  // Clocks Management
  function resetClocks() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    whiteTimeSec = initialTimeSec;
    blackTimeSec = initialTimeSec;
    updateClockDisplay();
  }

  function startClocks() {
    if (initialTimeSec === 0) return; // Unlimited
    clearInterval(timerInterval);
    isTimerRunning = true;

    timerInterval = setInterval(() => {
      if (chess.game_over()) {
        clearInterval(timerInterval);
        return;
      }

      if (chess.turn() === 'w') {
        whiteTimeSec--;
        if (whiteTimeSec <= 10 && whiteTimeSec > 0) SoundEngine.playTick();
        if (whiteTimeSec <= 0) {
          whiteTimeSec = 0;
          clearInterval(timerInterval);
          handleTimeout('w');
        }
      } else {
        blackTimeSec--;
        if (blackTimeSec <= 10 && blackTimeSec > 0) SoundEngine.playTick();
        if (blackTimeSec <= 0) {
          blackTimeSec = 0;
          clearInterval(timerInterval);
          handleTimeout('b');
        }
      }
      updateClockDisplay();
    }, 1000);
  }

  function handleTimeout(color) {
    const winner = (color === 'w') ? 'Black' : 'White';
    SoundEngine.playVictory();
    triggerConfetti();
    showGameOverModal('Time Out!', `${winner} wins on time.`);
  }

  function updateClockDisplay() {
    function formatTime(sec) {
      if (initialTimeSec === 0) return '∞';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    const wElem = document.getElementById('white-clock');
    const bElem = document.getElementById('black-clock');
    wElem.textContent = formatTime(whiteTimeSec);
    bElem.textContent = formatTime(blackTimeSec);

    wElem.classList.toggle('low-time', whiteTimeSec > 0 && whiteTimeSec < 30);
    bElem.classList.toggle('low-time', blackTimeSec > 0 && blackTimeSec < 30);
  }

  // Helper to verify if a piece at square can be selected / moved
  function canMovePiece(square) {
    if (currentReviewIndex !== -1 && currentReviewIndex !== moveHistory.length - 1) return false;
    if (gameMode === 'ai' && chess.turn() !== playerColor) return false;
    const piece = chess.get(square);
    return !!(piece && piece.color === chess.turn());
  }

  // Helper to check if a destination square is legal from fromSquare
  function isLegalTarget(fromSquare, toSquare) {
    if (!fromSquare || !toSquare || fromSquare === toSquare) return false;
    const moves = chess.moves({ square: fromSquare, verbose: true });
    return moves.some(m => m.to === toSquare);
  }

  // Helper to check if a square is a legal target for currently selected piece
  function isLegalTargetSquare(square) {
    if (!selectedSquare || !square) return false;
    return legalMovesForSelected.some(m => m.to === square);
  }

  // Execute a verified legal move (or trigger promotion if applicable)
  function executeMoveOrPromotion(fromSquare, toSquare, isAlreadyAtTarget = false) {
    const moves = chess.moves({ square: fromSquare, verbose: true });
    const matchMove = moves.find(m => m.to === toSquare);
    if (!matchMove) return false;

    if (matchMove.flags.includes('p')) {
      pendingPromotionMove = { from: fromSquare, to: toSquare, isAlreadyAtTarget };
      openPromotionModal();
    } else {
      executeMove({ from: fromSquare, to: toSquare }, isAlreadyAtTarget);
    }
    return true;
  }

  // Handle Square Clicks on 3D Board
  function onSquareClicked(square) {
    if (isMoveAnimating) return; // Prevent clicks during active piece animation

    // If currently reviewing past moves, return to active move first
    if (currentReviewIndex !== -1 && currentReviewIndex !== moveHistory.length - 1) {
      jumpToMove(moveHistory.length);
    }

    if (chess.game_over()) return;

    // In AI mode, ignore human input if it's AI's turn
    if (gameMode === 'ai' && chess.turn() !== playerColor) return;

    if (!square) {
      deselect();
      return;
    }

    const piece = chess.get(square);
    const isFriendly = piece && piece.color === chess.turn();

    // 1. Clicking the already selected piece -> Deselect immediately!
    if (selectedSquare && square === selectedSquare) {
      deselect();
      SoundEngine.playClick();
      return;
    }

    // 2. If a piece was already selected, check if clicked square is a legal destination
    if (selectedSquare) {
      const matchMove = legalMovesForSelected.find(m => m.to === square);

      if (matchMove) {
        // Check for pawn promotion (FIDE standard rule: promotion choice on 8th rank)
        if (matchMove.flags.includes('p')) {
          pendingPromotionMove = { from: selectedSquare, to: square, isAlreadyAtTarget: false };
          openPromotionModal();
        } else {
          executeMove({ from: selectedSquare, to: square }, false);
        }
        return;
      }
    }

    // 3. If clicking on one of our own pieces, select it and show legal moves
    if (isFriendly) {
      selectedSquare = square;
      legalMovesForSelected = chess.moves({ square, verbose: true });

      Chess3D.clearMarkers();
      Chess3D.highlightSelected(square);
      Chess3D.showLegalMoves(legalMovesForSelected);
      SoundEngine.playClick();
      return;
    }

    // 4. Otherwise deselect
    deselect();
  }

  function onBackgroundClicked() {
    deselect();
  }

  function deselect() {
    selectedSquare = null;
    legalMovesForSelected = [];
    Chess3D.clearMarkers();
    if (moveHistory.length > 0) {
      const last = moveHistory[moveHistory.length - 1];
      Chess3D.highlightLastMove(last.from, last.to);
    }
    if (chess.in_check()) {
      highlightCurrentCheck();
    }
  }

  // Execute a verified legal move
  function executeMove(moveObj, isAlreadyAtTarget = false) {
    if (isMoveAnimating) return;
    const move = chess.move(moveObj);
    if (!move) return;

    isMoveAnimating = true; // Lock user input during animation
    selectedSquare = null;
    legalMovesForSelected = [];
    redoStack = []; // Clear redo stack on new move branch
    Chess3D.clearMarkers();

    // Sound effect
    if (move.flags.includes('k') || move.flags.includes('q')) {
      SoundEngine.playCastle();
    } else if (move.captured) {
      SoundEngine.playCapture();
    } else if (move.promotion) {
      SoundEngine.playPromotion();
    } else {
      SoundEngine.playMove();
    }

    // Record in history
    moveHistory.push({
      san: move.san,
      from: move.from,
      to: move.to,
      fen: chess.fen(),
      color: move.color,
      captured: move.captured,
      promotion: move.promotion,
      flags: move.flags
    });
    currentReviewIndex = moveHistory.length - 1;

    // Animate 3D piece move
    Chess3D.animateMove(move.from, move.to, () => {
      // Sync board for castling, en passant, promotion
      Chess3D.syncBoard(chess);
      Chess3D.clearMarkers();
      Chess3D.highlightLastMove(move.from, move.to);

      if (chess.in_check()) {
        highlightCurrentCheck();
        SoundEngine.playCheck();
      }

      updateUI();
      checkGameEnd();
      isMoveAnimating = false; // Unlock input

      // Auto-flip if enabled
      if (autoFlip && !chess.game_over()) {
        Chess3D.flipBoard();
      }

      // Trigger AI turn if applicable
      if (gameMode === 'ai' && !chess.game_over() && chess.turn() !== playerColor) {
        makeAIMove();
      }
    }, isAlreadyAtTarget);
  }

  // Pawn Promotion Handlers
  function openPromotionModal() {
    const turn = chess.turn();
    const symbols = (turn === 'w')
      ? { q: '♕', r: '♖', b: '♗', n: '♘' }
      : { q: '♛', r: '♜', b: '♝', n: '♞' };
    document.querySelectorAll('.promo-choice-btn').forEach(btn => {
      const p = btn.getAttribute('data-piece');
      const icon = btn.querySelector('.promo-piece-icon');
      if (icon && symbols[p]) icon.textContent = symbols[p];
    });
    document.getElementById('promotion-modal').classList.remove('hidden');
  }

  function completePromotion(promoPiece) {
    document.getElementById('promotion-modal').classList.add('hidden');
    if (!pendingPromotionMove) return;

    const moveObj = {
      from: pendingPromotionMove.from,
      to: pendingPromotionMove.to,
      promotion: promoPiece
    };
    const isAlreadyAtTarget = !!pendingPromotionMove.isAlreadyAtTarget;
    pendingPromotionMove = null;
    executeMove(moveObj, isAlreadyAtTarget);
  }

  // Make AI Move
  function makeAIMove() {
    const aiIndicator = document.getElementById('ai-status-indicator');
    aiIndicator.classList.add('active');

    ChessAI.findBestMove(chess, aiLevel, (bestMove, evalScore) => {
      aiIndicator.classList.remove('active');
      if (bestMove) {
        executeMove(bestMove);
      }
    });
  }

  // Request AI Hint
  function requestHint() {
    if (chess.game_over()) return;
    showToast('Calculating best tactical move...');

    ChessAI.findBestMove(chess, 3, (bestMove) => {
      if (bestMove) {
        Chess3D.highlightHint(bestMove.from, bestMove.to);
        showToast(`Hint: Move ${bestMove.san} (${bestMove.from} → ${bestMove.to})`, 4000);
      }
    });
  }

  // Undo Move with Redo Stack Tracking
  function undoMove() {
    if (isMoveAnimating) return;
    if (moveHistory.length === 0) return;

    function undoOne() {
      const undone = chess.undo();
      if (!undone) return null;
      const historyItem = moveHistory.pop();
      redoStack.push({
        move: undone,
        historyItem: historyItem
      });
      return undone;
    }

    // In AI mode, undo both player and AI moves
    if (gameMode === 'ai') {
      undoOne();
      if (chess.turn() !== playerColor && moveHistory.length > 0) {
        undoOne();
      }
    } else {
      undoOne();
    }

    currentReviewIndex = moveHistory.length - 1;
    Chess3D.clearMarkers();
    Chess3D.syncBoard(chess);

    if (moveHistory.length > 0) {
      const last = moveHistory[moveHistory.length - 1];
      Chess3D.highlightLastMove(last.from, last.to);
    }
    if (chess.in_check()) {
      highlightCurrentCheck();
    }

    updateUI();
    showToast('Move undone');
  }

  // Redo Move from Redo Stack
  function redoMove() {
    if (isMoveAnimating) return;
    if (redoStack.length === 0) {
      showToast('No moves to redo');
      return;
    }

    function redoOne() {
      if (redoStack.length === 0) return null;
      const item = redoStack.pop();
      const move = chess.move(item.move);
      if (move) {
        moveHistory.push(item.historyItem || {
          san: move.san,
          from: move.from,
          to: move.to,
          fen: chess.fen(),
          color: move.color,
          captured: move.captured,
          promotion: move.promotion,
          flags: move.flags
        });
      }
      return move;
    }

    if (gameMode === 'ai') {
      redoOne();
      if (chess.turn() !== playerColor && redoStack.length > 0) {
        redoOne();
      }
    } else {
      redoOne();
    }

    currentReviewIndex = moveHistory.length - 1;
    Chess3D.clearMarkers();
    Chess3D.syncBoard(chess);

    if (moveHistory.length > 0) {
      const last = moveHistory[moveHistory.length - 1];
      Chess3D.highlightLastMove(last.from, last.to);
    }
    if (chess.in_check()) {
      highlightCurrentCheck();
    }

    updateUI();
    checkGameEnd();
    showToast('Move redone');
  }

  // Check Game End Conditions (FIDE Standards)
  function checkGameEnd() {
    if (chess.in_checkmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      SoundEngine.playVictory();
      triggerConfetti();
      showGameOverModal('Checkmate!', `${winner} wins by checkmate.`);
    } else if (chess.in_stalemate()) {
      SoundEngine.playDraw();
      showGameOverModal('Stalemate', 'Draw by stalemate (no legal moves).');
    } else if (chess.insufficient_material()) {
      SoundEngine.playDraw();
      showGameOverModal('Draw: Insufficient Material', 'Neither side has sufficient pieces to checkmate.');
    } else {
      const fenTokens = chess.fen().split(' ');
      const halfMoves = parseInt(fenTokens[4], 10) || 0;
      // Mandatory 75-move rule under FIDE 9.6.2
      if (halfMoves >= 150) {
        SoundEngine.playDraw();
        showGameOverModal('Draw: 75-Move Rule', 'Mandatory FIDE draw (75 moves without a pawn move or capture).');
        return;
      }
      // Check claimable draw conditions (Threefold Repetition or 50-move rule)
      updateClaimableDrawState(halfMoves);
    }
  }

  function updateClaimableDrawState(halfMoves) {
    const claimBtn = document.getElementById('btn-claim-draw');
    if (!claimBtn) return;

    if (chess.in_threefold_repetition()) {
      claimableDrawReason = 'Threefold Repetition';
      claimBtn.textContent = 'Claim Draw (Repetition)';
      claimBtn.classList.remove('hidden');
    } else if (halfMoves >= 100) {
      claimableDrawReason = '50-Move Rule';
      claimBtn.textContent = 'Claim Draw (50 Moves)';
      claimBtn.classList.remove('hidden');
    } else {
      claimableDrawReason = null;
      claimBtn.classList.add('hidden');
    }
  }

  function claimDraw() {
    const reason = claimableDrawReason || 'Mutual Claim';
    claimableDrawReason = null;
    const claimBtn = document.getElementById('btn-claim-draw');
    if (claimBtn) claimBtn.classList.add('hidden');

    SoundEngine.playDraw();
    showGameOverModal(`Draw Claimed (${reason})`, `Game concluded under FIDE Article 9 (${reason}).`);
  }

  function resignGame() {
    const resigner = (gameMode === 'ai') ? 'You have resigned.' : `${chess.turn() === 'w' ? 'White' : 'Black'} resigned.`;
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    showGameOverModal('Resignation', `${resigner} ${winner} wins.`);
  }

  function offerDraw() {
    SoundEngine.playDraw();
    showGameOverModal('Draw Agreed', 'The game concluded as a mutual draw.');
  }

  function showGameOverModal(title, reason) {
    clearInterval(timerInterval);
    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-reason').textContent = reason;
    document.getElementById('stat-moves').textContent = Math.ceil(moveHistory.length / 2);

    const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    document.getElementById('stat-time').textContent = `${m}:${String(s).padStart(2, '0')}`;

    let result = '1/2 - 1/2';
    if (title.includes('Checkmate') || title.includes('Time Out') || title.includes('Resignation')) {
      result = (chess.turn() === 'w') ? '0 - 1' : '1 - 0';
    }
    document.getElementById('stat-result').textContent = result;

    document.getElementById('game-over-modal').classList.remove('hidden');
  }

  function highlightCurrentCheck() {
    const board = chess.board();
    const kingColor = chess.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === kingColor) {
          const sq = String.fromCharCode(97 + c) + (8 - r);
          Chess3D.highlightCheck(sq);
          return;
        }
      }
    }
  }

  // Update UI Elements (Status, Cards, History Table, Eval Bar)
  function updateUI() {
    updateTurnIndicator();
    updatePlayerCards();
    updateEvaluation();
    updateHistoryTable();
    updateCapturedPieces();
  }

  function updateTurnIndicator() {
    const turnText = document.getElementById('turn-text');
    const turnDot = document.getElementById('turn-dot');

    const isWhite = chess.turn() === 'w';
    turnDot.className = `turn-indicator-dot ${isWhite ? '' : 'black-turn'}`;

    if (chess.in_checkmate()) {
      turnText.textContent = `Checkmate! ${isWhite ? 'Black' : 'White'} wins!`;
      turnText.className = 'turn-text check-alert';
    } else if (chess.in_check()) {
      turnText.textContent = `Check! ${isWhite ? 'White' : 'Black'} King threatened!`;
      turnText.className = 'turn-text check-alert';
    } else if (chess.game_over()) {
      turnText.textContent = 'Game Over (Draw)';
      turnText.className = 'turn-text';
    } else {
      turnText.textContent = `${isWhite ? 'White' : 'Black'} to move`;
      turnText.className = 'turn-text';
    }
  }

  function updatePlayerCards() {
    const isWhite = chess.turn() === 'w';
    const wCard = document.getElementById('player-white-card');
    const bCard = document.getElementById('player-black-card');

    wCard.classList.toggle('active-turn', isWhite && !chess.game_over());
    bCard.classList.toggle('active-turn', !isWhite && !chess.game_over());

    wCard.classList.toggle('in-check', isWhite && chess.in_check());
    bCard.classList.toggle('in-check', !isWhite && chess.in_check());
  }

  function updatePlayerInfo() {
    const bName = document.getElementById('black-player-name');
    const bTag = document.getElementById('black-rating-tag');

    if (gameMode === 'ai') {
      const labels = ['Beginner (800)', 'Intermediate (1400)', 'Grandmaster (2000+)'];
      const ratings = ['800', '1400', '2100'];
      bName.textContent = `AI: ${labels[aiLevel - 1]}`;
      bTag.textContent = ratings[aiLevel - 1];
    } else if (gameMode === 'local') {
      bName.textContent = 'Player 2 (Black)';
      bTag.textContent = '1500';
    } else {
      bName.textContent = 'Black Analysis';
      bTag.textContent = 'ANALYSIS';
    }
  }

  function updateEvaluation() {
    const evalScore = ChessAI.evaluate(chess);
    const scoreElem = document.getElementById('eval-score');
    const fillElem = document.getElementById('eval-meter-fill');

    // Convert centipawns to decimal score
    const pawnScore = (evalScore / 100).toFixed(1);
    scoreElem.textContent = (evalScore > 0 ? `+${pawnScore}` : pawnScore);

    // Map score -1000..+1000 to percentage 5%..95%
    const clamped = Math.max(-1000, Math.min(1000, evalScore));
    const pct = 50 + (clamped / 1000) * 45;
    fillElem.style.width = `${pct}%`;
  }

  function updateCapturedPieces() {
    const PIECE_SYMBOLS = {
      p: '♟', n: '♞', b: '♝', r: '♜', q: '♛'
    };
    const PIECE_WEIGHTS = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    let whiteCaptured = [];
    let blackCaptured = [];
    let whiteScore = 0;
    let blackScore = 0;

    moveHistory.forEach(m => {
      if (m.captured) {
        if (m.color === 'w') {
          // White captured Black piece
          whiteCaptured.push(m.captured);
          whiteScore += PIECE_WEIGHTS[m.captured] || 0;
        } else {
          // Black captured White piece
          blackCaptured.push(m.captured);
          blackScore += PIECE_WEIGHTS[m.captured] || 0;
        }
      }
    });

    const wTray = document.getElementById('white-captured-tray');
    const bTray = document.getElementById('black-captured-tray');
    wTray.innerHTML = '';
    bTray.innerHTML = '';

    whiteCaptured.forEach(p => {
      const s = document.createElement('span');
      s.className = 'captured-icon';
      s.textContent = PIECE_SYMBOLS[p] || '';
      wTray.appendChild(s);
    });

    blackCaptured.forEach(p => {
      const s = document.createElement('span');
      s.className = 'captured-icon';
      s.textContent = PIECE_SYMBOLS[p] || '';
      bTray.appendChild(s);
    });

    const wLead = document.getElementById('white-lead-badge');
    const bLead = document.getElementById('black-lead-badge');
    wLead.textContent = (whiteScore > blackScore) ? `+${whiteScore - blackScore}` : '';
    bLead.textContent = (blackScore > whiteScore) ? `+${blackScore - whiteScore}` : '';
  }

  function updateHistoryTable() {
    const tbody = document.getElementById('moves-table-body');
    const emptyNotice = document.getElementById('empty-history-notice');
    tbody.innerHTML = '';

    if (moveHistory.length === 0) {
      emptyNotice.style.display = 'block';
      return;
    }
    emptyNotice.style.display = 'none';

    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];

      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = `${moveNum}.`;

      const tdWhite = document.createElement('td');
      tdWhite.className = 'col-white';
      tdWhite.textContent = whiteMove ? whiteMove.san : '';
      if (i === currentReviewIndex) tdWhite.classList.add('active-move');
      tdWhite.addEventListener('click', () => jumpToMove(i + 1));

      const tdBlack = document.createElement('td');
      tdBlack.className = 'col-black';
      tdBlack.textContent = blackMove ? blackMove.san : '';
      if (i + 1 === currentReviewIndex) tdBlack.classList.add('active-move');
      if (blackMove) {
        tdBlack.addEventListener('click', () => jumpToMove(i + 2));
      }

      tr.appendChild(tdNum);
      tr.appendChild(tdWhite);
      tr.appendChild(tdBlack);
      tbody.appendChild(tr);
    }

    // Auto scroll to bottom
    const scrollContainer = document.querySelector('.history-scroll-container');
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  // Step Move in Replay
  function stepMove(delta) {
    if (moveHistory.length === 0) return;
    const target = Math.max(0, Math.min(moveHistory.length, (currentReviewIndex + 1) + delta));
    jumpToMove(target);
  }

  // Jump to specific move index in history (0 = start)
  function jumpToMove(moveCount) {
    if (moveCount === 0) {
      chess.reset();
      currentReviewIndex = -1;
    } else {
      currentReviewIndex = moveCount - 1;
      const targetFen = moveHistory[currentReviewIndex].fen;
      chess.load(targetFen);
    }

    Chess3D.clearMarkers();
    Chess3D.syncBoard(chess);

    if (currentReviewIndex >= 0 && moveHistory[currentReviewIndex]) {
      const last = moveHistory[currentReviewIndex];
      Chess3D.highlightLastMove(last.from, last.to);
    }
    if (chess.in_check()) {
      highlightCurrentCheck();
    }

    updateUI();
  }

  // Copy FEN String
  function copyFEN() {
    const fen = chess.fen();
    navigator.clipboard.writeText(fen).then(() => {
      showToast('FEN copied to clipboard!');
    }).catch(() => {
      showToast('FEN: ' + fen, 4000);
    });
  }

  // Export PGN Game File
  function exportPGN() {
    const pgn = chess.pgn();
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_match_${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('PGN game file exported!');
  }

  // Custom FEN Loader
  function openFENModal() {
    document.getElementById('fen-input').value = chess.fen();
    document.getElementById('fen-error-msg').classList.add('hidden');
    document.getElementById('fen-modal').classList.remove('hidden');
  }

  function submitFEN() {
    const fen = document.getElementById('fen-input').value.trim();
    if (chess.validate_fen(fen).valid) {
      chess.load(fen);
      moveHistory = [];
      currentReviewIndex = -1;
      Chess3D.clearMarkers();
      Chess3D.syncBoard(chess);
      updateUI();
      document.getElementById('fen-modal').classList.add('hidden');
      showToast('Custom position loaded!');
    } else {
      document.getElementById('fen-error-msg').classList.remove('hidden');
    }
  }

  // In-Game Toast notification
  function showToast(msg, duration = 2800) {
    const toast = document.getElementById('game-toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  // Celebration Confetti
  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 60,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 60,
          origin: { x: 1 }
        });
      }, 250);
    }
  }

  return {
    init,
    startNewGame,
    onSquareClicked,
    onBackgroundClicked,
    selectPiece,
    undoMove,
    redoMove,
    claimDraw,
    canMovePiece,
    isLegalTarget,
    isLegalTargetSquare,
    executeMoveOrPromotion,
    getChess: () => chess,
    getMoveHistory: () => moveHistory,
    getRedoStack: () => redoStack
  };
})();

// Initialize when DOM content is loaded
window.addEventListener('DOMContentLoaded', () => {
  GameController.init();
});