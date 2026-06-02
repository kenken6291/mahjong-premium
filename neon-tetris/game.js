/**
 * NEON TETRIS - Game Engine, Render Loop & Sound Synthesizer
 */

// Grid dimensions
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // pixels

// Tetromino configurations and shapes
const SHAPES = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'O': [
        [1, 1],
        [1, 1]
    ],
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'S': [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    'Z': [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    'J': [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// Colors mapping for neon styles
const COLORS = {
    'I': { main: '#00f0ff', glow: 'rgba(0, 240, 255, 0.65)', border: '#ffffff' },
    'O': { main: '#ffe600', glow: 'rgba(255, 230, 0, 0.65)', border: '#ffffff' },
    'T': { main: '#ba00ff', glow: 'rgba(186, 0, 255, 0.65)', border: '#ffffff' },
    'S': { main: '#00ff66', glow: 'rgba(0, 255, 102, 0.65)', border: '#ffffff' },
    'Z': { main: '#ff0055', glow: 'rgba(255, 0, 85, 0.65)', border: '#ffffff' },
    'J': { main: '#0066ff', glow: 'rgba(0, 102, 255, 0.65)', border: '#ffffff' },
    'L': { main: '#ff9900', glow: 'rgba(255, 153, 0, 0.65)', border: '#ffffff' }
};

// SRS (Super Rotation System) wall kick translations
const KICK_DATA = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-2, 0],
    [2, 0],
];

/**
 * SoundManager: Web Audio API-based Synthesizer
 * No external audio assets needed; all SFX and BGM are dynamically generated.
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmInterval = null;
        this.currentNoteIndex = 0;
        this.bgmPlaying = false;
        this.tempo = 145; // BPM

        // Korobeiniki (Tetris Theme) Melody
        // Format: [noteName, duration (in 16th note units)]
        this.melody = [
            ['E5', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['C5', 2], ['B4', 2],
            ['A4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
            ['B4', 6], ['C5', 2], ['D5', 4], ['E5', 4],
            ['C5', 4], ['A4', 4], ['A4', 4], ['P', 4],
            
            ['D5', 6], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2],
            ['E5', 6], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
            ['B4', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['E5', 4],
            ['C5', 4], ['A4', 4], ['A4', 4], ['P', 4]
        ];

        this.frequencies = {
            'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33,
            'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
            'P': 0
        };
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBGM();
        } else {
            this.resume();
            if (window.game && window.game.isPlaying && !window.game.paused && !window.game.gameOver) {
                this.startBGM();
            }
        }
        return this.muted;
    }

    playMove() {
        if (this.muted) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playRotate() {
        if (this.muted) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playLock() {
        if (this.muted) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playClear() {
        if (this.muted) return;
        this.resume();
        
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const start = now + idx * 0.06;
            const duration = 0.2;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(start);
            osc.stop(start + duration);
        });
    }

    playTetris() {
        if (this.muted) return;
        this.resume();
        
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Power Chord)
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            const start = now + idx * 0.05;
            const duration = 0.35;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(start);
            osc.stop(start + duration);
        });
    }

    playGameOver() {
        if (this.muted) return;
        this.resume();
        
        const now = this.ctx.currentTime;
        const notes = [440.00, 415.30, 392.00, 349.23]; // Downwards scale
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const start = now + idx * 0.12;
            const duration = 0.3;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(start);
            osc.stop(start + duration);
        });
    }

    startBGM() {
        if (this.muted || this.bgmPlaying) return;
        this.resume();
        this.bgmPlaying = true;
        this.currentNoteIndex = 0;
        this.playNextBGMNote();
    }

    playNextBGMNote() {
        if (!this.bgmPlaying || this.muted) return;
        
        const note = this.melody[this.currentNoteIndex];
        const noteName = note[0];
        const durationUnits = note[1];
        
        const stepTime = 60 / this.tempo / 4; // 16th note length in seconds
        const durationSec = durationUnits * stepTime;
        
        if (noteName !== 'P') {
            const freq = this.frequencies[noteName];
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle'; // Smooth retro bass sound
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationSec - 0.02);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + durationSec);
        }
        
        this.bgmInterval = setTimeout(() => {
            this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
            this.playNextBGMNote();
        }, durationSec * 1000);
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmInterval) {
            clearTimeout(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

class TetrisGame {
    constructor() {
        // Canvas setups
        this.boardCanvas = document.getElementById('game-board');
        this.ctx = this.boardCanvas.getContext('2d');
        
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Dom Elements
        this.scoreEl = document.getElementById('score');
        this.levelEl = document.getElementById('level');
        this.linesEl = document.getElementById('lines');
        this.finalScoreEl = document.getElementById('final-score');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.muteBtn = document.getElementById('mute-btn');
        this.muteIcon = document.getElementById('mute-icon');
        
        // Audio Manager
        this.sound = new SoundManager();
        
        // Game Board model
        this.grid = this.createEmptyGrid();
        
        // Game States
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.isPlaying = false;
        
        // Current, next, and hold pieces
        this.currentPiece = null;
        this.holdPieceType = null;
        this.holdUsed = false;
        
        // Piece bag (7-bag system)
        this.bag = [];
        this.nextPieceType = this.pullFromBag();
        
        // Animation & Game loop timings
        this.dropCounter = 0;
        this.lastTime = 0;
        
        // Level up speeds
        this.dropIntervals = {
            1: 800, 2: 720, 3: 630, 4: 550, 5: 470,
            6: 380, 7: 300, 8: 220, 9: 130, 10: 100,
            11: 80, 12: 80, 13: 70, 14: 70, 15: 50
        };

        this.initEventListeners();
        this.drawEmptyPanels();
    }

    createEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    getDropInterval() {
        const lvl = Math.min(this.level, 15);
        return this.dropIntervals[lvl];
    }

    pullFromBag() {
        if (this.bag.length === 0) {
            this.bag = Object.keys(SHAPES);
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    spawnPiece() {
        const type = this.nextPieceType;
        this.nextPieceType = this.pullFromBag();
        this.holdUsed = false;
        
        this.currentPiece = {
            type: type,
            matrix: SHAPES[type],
            x: Math.floor((COLS - SHAPES[type][0].length) / 2),
            y: type === 'I' ? -1 : 0
        };

        if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
            this.triggerGameOver();
        }

        this.drawNext();
    }

    checkCollision(matrix, xOffset, yOffset) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const nextX = xOffset + c;
                    const nextY = yOffset + r;

                    if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
                        return true;
                    }

                    if (nextY >= 0 && this.grid[nextY][nextX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    move(dir) {
        if (!this.isPlaying || this.paused || this.gameOver) return;
        
        this.currentPiece.x += dir;
        if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.x -= dir;
        } else {
            this.sound.playMove();
        }
    }

    drop() {
        if (!this.isPlaying || this.paused || this.gameOver) return;

        this.currentPiece.y += 1;
        if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.y -= 1;
            this.lockPiece();
            this.spawnPiece();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        if (!this.isPlaying || this.paused || this.gameOver) return;

        let droppedRows = 0;
        while (!this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y += 1;
            droppedRows++;
        }
        
        this.score += droppedRows * 2;
        this.updateUI();

        this.lockPiece();
        this.spawnPiece();
        this.dropCounter = 0;
    }

    rotate() {
        if (!this.isPlaying || this.paused || this.gameOver) return;
        if (this.currentPiece.type === 'O') return;

        const matrix = this.currentPiece.matrix;
        const n = matrix.length;
        
        const rotated = Array.from({ length: n }, () => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                rotated[c][n - 1 - r] = matrix[r][c];
            }
        }

        const originalX = this.currentPiece.x;
        const originalY = this.currentPiece.y;

        for (let i = 0; i < KICK_DATA.length; i++) {
            const [kickX, kickY] = KICK_DATA[i];
            this.currentPiece.x = originalX + kickX;
            this.currentPiece.y = originalY + kickY;

            if (!this.checkCollision(rotated, this.currentPiece.x, this.currentPiece.y)) {
                this.currentPiece.matrix = rotated;
                this.sound.playRotate();
                return;
            }
        }

        this.currentPiece.x = originalX;
        this.currentPiece.y = originalY;
    }

    hold() {
        if (!this.isPlaying || this.paused || this.gameOver || this.holdUsed) return;

        const currentType = this.currentPiece.type;

        if (this.holdPieceType === null) {
            this.holdPieceType = currentType;
            this.spawnPiece();
        } else {
            const temp = this.holdPieceType;
            this.holdPieceType = currentType;
            this.currentPiece = {
                type: temp,
                matrix: SHAPES[temp],
                x: Math.floor((COLS - SHAPES[temp][0].length) / 2),
                y: temp === 'I' ? -1 : 0
            };
        }

        this.holdUsed = true;
        this.sound.playRotate(); // use rotate sound for hold swap feedback
        this.drawHold();
    }

    lockPiece() {
        const matrix = this.currentPiece.matrix;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const gridY = this.currentPiece.y + r;
                    const gridX = this.currentPiece.x + c;

                    if (gridY < 0) {
                        this.triggerGameOver();
                        return;
                    }
                    this.grid[gridY][gridX] = this.currentPiece.type;
                }
            }
        }

        this.sound.playLock();
        this.clearLines();
    }

    clearLines() {
        let cleared = 0;

        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every(val => val !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(0));
                cleared++;
                r++;
            }
        }

        if (cleared > 0) {
            const scoreValues = { 1: 100, 2: 300, 3: 500, 4: 800 };
            const points = (scoreValues[cleared] || 800) * this.level;
            
            this.score += points;
            this.lines += cleared;
            this.level = Math.floor(this.lines / 10) + 1;
            
            this.updateUI();

            // Trigger corresponding sound effects
            if (cleared === 4) {
                this.sound.playTetris();
            } else {
                this.sound.playClear();
            }
        }
    }

    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(this.currentPiece.matrix, this.currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    updateUI() {
        this.scoreEl.innerText = String(this.score).padStart(6, '0');
        this.levelEl.innerText = this.level;
        this.linesEl.innerText = this.lines;
    }

    togglePause() {
        if (!this.isPlaying || this.gameOver) return;

        this.paused = !this.paused;
        if (this.paused) {
            this.sound.stopBGM();
            this.pauseScreen.classList.remove('hidden');
            this.startBtn.innerText = 'RESUME';
            this.startBtn.classList.remove('primary-btn');
            this.startBtn.classList.add('secondary-btn');
        } else {
            this.sound.startBGM();
            this.pauseScreen.classList.add('hidden');
            this.startBtn.innerText = 'PAUSE';
            this.startBtn.classList.remove('secondary-btn');
            this.startBtn.classList.add('primary-btn');
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    start() {
        // Resume Audio Context on start click (Required by browser security policies)
        this.sound.resume();

        if (this.isPlaying) {
            this.togglePause();
            return;
        }

        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.isPlaying = true;
        this.holdPieceType = null;
        this.bag = [];
        
        this.nextPieceType = this.pullFromBag();
        this.spawnPiece();
        this.updateUI();
        
        this.gameOverScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.startBtn.innerText = 'PAUSE';
        this.startBtn.classList.remove('primary-btn');
        this.startBtn.classList.add('secondary-btn');

        this.sound.startBGM();

        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    reset() {
        this.sound.stopBGM();
        this.isPlaying = false;
        this.paused = false;
        this.gameOver = false;
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.holdPieceType = null;
        
        this.updateUI();
        this.drawEmptyPanels();
        
        this.gameOverScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.startBtn.innerText = 'START';
        this.startBtn.classList.remove('secondary-btn');
        this.startBtn.classList.add('primary-btn');
    }

    triggerGameOver() {
        this.sound.stopBGM();
        this.sound.playGameOver();
        
        this.gameOver = true;
        this.isPlaying = false;
        this.finalScoreEl.innerText = this.score;
        this.gameOverScreen.classList.remove('hidden');
        
        this.startBtn.innerText = 'START';
        this.startBtn.classList.remove('secondary-btn');
        this.startBtn.classList.add('primary-btn');
    }

    gameLoop(time) {
        if (!this.isPlaying || this.paused || this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.getDropInterval()) {
            this.drop();
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
        this.drawGrid();
        
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== 0) {
                    this.drawBlock(this.ctx, c, r, this.grid[r][c]);
                }
            }
        }

        if (this.currentPiece) {
            const ghostY = this.getGhostY();
            this.drawBlockMatrix(this.ctx, this.currentPiece.matrix, this.currentPiece.x, ghostY, this.currentPiece.type, true);
            this.drawBlockMatrix(this.ctx, this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y, this.currentPiece.type, false);
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;

        for (let c = 0; c < COLS; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * BLOCK_SIZE, 0);
            this.ctx.lineTo(c * BLOCK_SIZE, this.boardCanvas.height);
            this.ctx.stroke();
        }
        for (let r = 0; r < ROWS; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * BLOCK_SIZE);
            this.ctx.lineTo(this.boardCanvas.width, r * BLOCK_SIZE);
            this.ctx.stroke();
        }
    }

    drawBlock(context, x, y, type, isGhost = false) {
        if (y < 0) return;

        const colorSet = COLORS[type];
        if (!colorSet) return;

        const px = x * BLOCK_SIZE;
        const py = y * BLOCK_SIZE;
        const radius = 5;

        context.save();

        if (isGhost) {
            context.strokeStyle = colorSet.main;
            context.shadowColor = colorSet.glow;
            context.shadowBlur = 6;
            context.lineWidth = 2;
            context.fillStyle = 'rgba(0, 0, 0, 0.2)';
            
            this.drawRoundedRect(context, px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, radius);
            context.fill();
            context.stroke();
        } else {
            context.fillStyle = colorSet.main;
            context.shadowColor = colorSet.glow;
            context.shadowBlur = 12;
            
            this.drawRoundedRect(context, px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, radius);
            context.fill();

            context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            context.lineWidth = 1;
            context.shadowBlur = 0;
            
            context.beginPath();
            context.moveTo(px + 4, py + BLOCK_SIZE - 4);
            context.lineTo(px + 4, py + 4);
            context.lineTo(px + BLOCK_SIZE - 4, py + 4);
            context.stroke();
        }

        context.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawBlockMatrix(context, matrix, xOffset, yOffset, type, isGhost = false) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    this.drawBlock(context, xOffset + c, yOffset + r, type, isGhost);
                }
            }
        }
    }

    drawHold() {
        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        if (!this.holdPieceType) return;

        const matrix = SHAPES[this.holdPieceType];
        this.drawCenteredPiece(this.holdCtx, this.holdCanvas, matrix, this.holdPieceType);
    }

    drawNext() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        if (!this.nextPieceType) return;

        const matrix = SHAPES[this.nextPieceType];
        this.drawCenteredPiece(this.nextCtx, this.nextCanvas, matrix, this.nextPieceType);
    }

    drawCenteredPiece(ctx, canvas, matrix, type) {
        const shapeRows = matrix.length;
        const shapeCols = matrix[0].length;
        
        let minRow = shapeRows, maxRow = -1, minCol = shapeCols, maxCol = -1;
        for (let r = 0; r < shapeRows; r++) {
            for (let c = 0; c < shapeCols; c++) {
                if (matrix[r][c] !== 0) {
                    if (r < minRow) minRow = r;
                    if (r > maxRow) maxRow = r;
                    if (c < minCol) minCol = c;
                    if (c > maxCol) maxCol = c;
                }
            }
        }
        
        const actWidth = (maxCol - minCol + 1) * BLOCK_SIZE;
        const actHeight = (maxRow - minRow + 1) * BLOCK_SIZE;
        
        const offsetX = (canvas.width - actWidth) / 2 - minCol * BLOCK_SIZE;
        const offsetY = (canvas.height - actHeight) / 2 - minRow * BLOCK_SIZE;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        for (let r = 0; r < shapeRows; r++) {
            for (let c = 0; c < shapeCols; c++) {
                if (matrix[r][c] !== 0) {
                    const colorSet = COLORS[type];
                    ctx.fillStyle = colorSet.main;
                    ctx.shadowColor = colorSet.glow;
                    ctx.shadowBlur = 10;
                    
                    const px = c * BLOCK_SIZE;
                    const py = r * BLOCK_SIZE;
                    this.drawRoundedRect(ctx, px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 5);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.moveTo(px + 4, py + BLOCK_SIZE - 4);
                    ctx.lineTo(px + 4, py + 4);
                    ctx.lineTo(px + BLOCK_SIZE - 4, py + 4);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    drawEmptyPanels() {
        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.ctx.clearRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
        this.drawGrid();
    }

    initEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
                return;
            }

            if (!this.isPlaying || this.paused || this.gameOver) return;

            switch (e.key) {
                case 'ArrowLeft':
                    this.move(-1);
                    break;
                case 'ArrowRight':
                    this.move(1);
                    break;
                case 'ArrowDown':
                    this.drop();
                    break;
                case 'ArrowUp':
                    this.rotate();
                    break;
                case ' ':
                    this.hardDrop();
                    break;
                case 'c':
                case 'C':
                case 'Shift':
                    this.hold();
                    break;
            }
            this.draw();
        });

        // Click buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.restartBtn.addEventListener('click', () => this.start());
        
        // Mute Button listener
        this.muteBtn.addEventListener('click', () => {
            const isMuted = this.sound.toggleMute();
            this.muteIcon.innerText = isMuted ? '🔇' : '🔊';
            // Visual pulse on click
            this.muteBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.muteBtn.style.transform = '';
            }, 100);
        });

        // Mobile touch controls setup
        const touchBtns = {
            'btn-left': () => this.move(-1),
            'btn-right': () => this.move(1),
            'btn-down': () => this.drop(),
            'btn-rotate': () => this.rotate(),
            'btn-drop': () => this.hardDrop(),
            'btn-hold': () => this.hold()
        };

        const dasDelay = 220; // delay before auto-repeat starts (ms)
        const arrInterval = 45; // auto-repeat interval (ms)
        const activeTimers = {};

        Object.entries(touchBtns).forEach(([id, handler]) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const isRepeatable = ['btn-left', 'btn-right', 'btn-down'].includes(id);

            const startAction = (e) => {
                e.preventDefault();
                this.sound.resume();
                
                // Immediately perform the action
                handler();
                this.draw();

                // Subtle tactile feedback (if supported)
                if (navigator.vibrate) {
                    try {
                        navigator.vibrate(12);
                    } catch (err) {
                        // Ignore any browser security restrictions for vibration
                    }
                }

                if (isRepeatable) {
                    clearTimers(id);

                    // Setup DAS/ARR timers
                    activeTimers[id] = {
                        timeout: setTimeout(() => {
                            activeTimers[id].interval = setInterval(() => {
                                handler();
                                this.draw();
                            }, arrInterval);
                        }, dasDelay),
                        interval: null
                    };
                }
            };

            const stopAction = (e) => {
                e.preventDefault();
                if (isRepeatable) {
                    clearTimers(id);
                }
            };

            const clearTimers = (buttonId) => {
                if (activeTimers[buttonId]) {
                    clearTimeout(activeTimers[buttonId].timeout);
                    if (activeTimers[buttonId].interval) {
                        clearInterval(activeTimers[buttonId].interval);
                    }
                    delete activeTimers[buttonId];
                }
            };

            btn.addEventListener('touchstart', startAction, { passive: false });
            btn.addEventListener('touchend', stopAction, { passive: false });
            btn.addEventListener('touchcancel', stopAction, { passive: false });
        });
    }
}

// Initialise on load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new TetrisGame();
});
