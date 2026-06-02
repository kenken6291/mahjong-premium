/**
 * Gunjin Shogi Premium - Game Logic & UI Orchestrator
 */

// --- Firebase Config (ユーザー設定エリア) ---
// ※ユーザーが独自のFirebaseを利用する場合はここを書き換えます
const firebaseConfig = {
  apiKey: "AIzaSyBS64JBBi64ei57PVDR4nLi-fEndQFbpmM",
  authDomain: "shogi-premium.firebaseapp.com",
  databaseURL: "https://shogi-premium-default-rtdb.firebaseio.com",
  projectId: "shogi-premium",
  storageBucket: "shogi-premium.firebasestorage.app",
  messagingSenderId: "260685844",
  appId: "1:260685844:web:3020c343950faa8027a701"
};

// --- Game Constants ---
const ROWS = 8;
const COLS = 6;

const PIECE_NAMES = {
    'marshal': '大将',
    'general': '中将',
    'major_gen': '少将',
    'colonel': '大佐',
    'lt_col': '中佐',
    'major': '少佐',
    'captain': '大尉',
    'lieutenant': '中尉',
    'sub_lieutenant': '少尉',
    'airplane': '飛行機',
    'engineer': '工兵',
    'spy': 'スパイ',
    'commando': '突撃兵',
    'mine': '地雷',
    'flag': '軍旗'
};

const PIECE_SYMBOLS = {
    'marshal': '将',
    'general': '中',
    'major_gen': '少',
    'colonel': '佐',
    'lt_col': '中佐',
    'major': '少佐',
    'captain': '尉',
    'lieutenant': '中尉',
    'sub_lieutenant': '少尉',
    'airplane': '飛',
    'engineer': '工',
    'spy': '諜',
    'commando': '突',
    'mine': '雷',
    'flag': '旗'
};

// INITIAL DECK of pieces (18 pieces total per player)
const INITIAL_DECK = [
    'marshal', 'general', 'major_gen', 'colonel', 'lt_col', 'major',
    'captain', 'lieutenant', 'sub_lieutenant', 'airplane',
    'engineer', 'engineer', 'spy', 'commando', 'commando',
    'mine', 'mine', 'flag'
];

// Special positions
const CAMPS = [
    { r: 2, c: 1 }, { r: 2, c: 4 }, { r: 1, c: 2 }, { r: 1, c: 3 },
    { r: 5, c: 1 }, { r: 5, c: 4 }, { r: 6, c: 2 }, { r: 6, c: 3 }
];

const HQS = [
    { r: 0, c: 1 }, { r: 0, c: 4 }, // Top side
    { r: 7, c: 1 }, { r: 7, c: 4 }  // Bottom side
];

function isCamp(r, c) {
    return CAMPS.some(p => p.r === r && p.c === c);
}

function isHQ(r, c) {
    return HQS.some(p => p.r === r && p.c === c);
}

// --- Audio Synth (Web Audio API) ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, volume, delay = 0) {
        if (this.muted) return;
        this.init();
        
        setTimeout(() => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                
                gain.gain.setValueAtTime(volume, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                console.error("Audio error", e);
            }
        }, delay * 1000);
    }

    playNoise(duration, volume, delay = 0) {
        if (this.muted) return;
        this.init();
        
        setTimeout(() => {
            try {
                const bufferSize = this.ctx.sampleRate * duration;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, this.ctx.currentTime);
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(volume, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                
                noise.start();
                noise.stop(this.ctx.currentTime + duration);
            } catch (e) {
                console.error("Audio noise error", e);
            }
        }, delay * 1000);
    }

    playPlaceSound() {
        this.playTone(280, 'triangle', 0.08, 0.4);
        this.playTone(850, 'sine', 0.02, 0.2);
    }

    playPlaceSoundOnline() {
        this.playTone(320, 'triangle', 0.08, 0.4);
        this.playTone(950, 'sine', 0.02, 0.2);
    }

    playBattleSound() {
        // Dramatic alarm horn
        this.playTone(180, 'sawtooth', 0.25, 0.3);
        this.playTone(180, 'sawtooth', 0.25, 0.3, 0.15);
    }

    playExplodeSound() {
        // Heavy bass boom + crackling noise
        this.playTone(90, 'sine', 0.6, 0.6);
        this.playTone(55, 'triangle', 0.4, 0.5);
        this.playNoise(0.5, 0.4);
    }

    playWinSound() {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord ascending
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'sine', 0.3, 0.25, idx * 0.1);
        });
    }

    playLoseSound() {
        const notes = [392.00, 311.13, 261.63, 196.00]; // Descending C minor
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'sine', 0.4, 0.25, idx * 0.12);
        });
    }
}

const synth = new SoundSynth();

// --- Game State Variables ---
let board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
let unplacedPieces = []; // Hand pieces left to place in setup phase
let cemetery = {
    player: [], // Lost player pieces (won by opponent)
    opp: []     // Lost opponent pieces (won by player)
};
let turn = 'black'; // 'black' (先手) or 'white' (後手)
let gameMode = 'pve'; // 'pve', 'local', 'online'
let aiDifficulty = 'medium';
let playerColor = 'black'; // Hand color for the human in PvE/Local
let gameActive = false;
let gamePhase = 'setup'; // 'setup' or 'playing' or 'finished'

// UI States
let selectedCell = null; // { r, c }
let selectedPoolPieceIdx = null; // index in unplacedPieces
let validMovesForSelected = [];
let localTurnConfirmed = false; // Flag for Local VS Friend screen blocking

// Stats
let gameStats = {
    pve: { wins: 0, losses: 0 },
    online: { wins: 0, losses: 0 }
};

// Timers
let timerInterval = null;
let timerSelf = 0;
let timerOpp = 0;

// Firebase States
let database = null;
let roomRef = null;
let roomId = null;
let myRole = null; // 'black' or 'white'
let isOnlineActive = false;
let oppConnected = false;
let oppReady = false;
let lastFirebaseSyncHash = '';

// Web Worker for AI
let aiWorker = null;

// --- DOM Elements ---
const boardEl = document.getElementById('board');
const piecePoolContainer = document.getElementById('piece-pool-container');
const piecePoolEl = document.getElementById('piece-pool');
const setupBanner = document.getElementById('setup-banner');
const btnSetupRandom = document.getElementById('btn-setup-random');
const btnSetupClear = document.getElementById('btn-setup-clear');
const btnSetupReady = document.getElementById('btn-setup-ready');

const nameSelfEl = document.getElementById('name-self');
const nameOppEl = document.getElementById('name-opp');
const timerSelfEl = document.getElementById('timer-self');
const timerOppEl = document.getElementById('timer-opp');
const playerSelfCard = document.getElementById('player-self-card');
const playerOppCard = document.getElementById('player-opp-card');
const statusSelfEl = document.getElementById('status-self');
const statusOppEl = document.getElementById('status-opp');

const cemeteryPlayerEl = document.getElementById('cemetery-player-pieces');
const cemeteryOppEl = document.getElementById('cemetery-opp-pieces');

const selectGameMode = document.getElementById('game-mode');
const selectAiDifficulty = document.getElementById('ai-difficulty');
const selectPlayerColor = document.getElementById('player-color');
const selectTheme = document.getElementById('theme-select');

const btnRestart = document.getElementById('btn-restart');
const btnResign = document.getElementById('btn-resign');
const btnUndo = document.getElementById('btn-undo');
const btnMute = document.getElementById('btn-mute');
const svgSoundOn = document.getElementById('svg-sound-on');
const svgSoundOff = document.getElementById('svg-sound-off');
const btnClearStats = document.getElementById('btn-clear-stats');

// Online DOM Elements
const onlineRoomGroup = document.getElementById('online-room-group');
const onlineChatGroup = document.getElementById('online-chat-group');
const onlineInitView = document.getElementById('online-init-view');
const onlineWaitingView = document.getElementById('online-waiting-view');
const onlineActiveView = document.getElementById('online-active-view');
const displayRoomId = document.getElementById('display-room-id');
const inputRoomId = document.getElementById('input-room-id');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const btnCopyRoom = document.getElementById('btn-copy-room');
const btnCancelRoom = document.getElementById('btn-cancel-room');
const btnLeaveRoom = document.getElementById('btn-leave-room');

// Modals
const battleModal = document.getElementById('battle-modal');
const battleAttackerName = document.getElementById('battle-attacker-name');
const battleDefenderName = document.getElementById('battle-defender-name');
const battleResultText = document.getElementById('battle-result-text');
const battleResultDesc = document.getElementById('battle-result-desc');

const turnTransitionModal = document.getElementById('turn-transition-modal');
const nextPlayerNameEl = document.getElementById('next-player-name');
const btnStartTurn = document.getElementById('btn-start-turn');

const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const winnerTextEl = document.getElementById('winner-text');
const resultReason = document.getElementById('result-reason');
const btnModalClose = document.getElementById('btn-modal-close');

// Chat
const chatOverlaySelf = document.getElementById('chat-overlay-self');
const chatOverlayOpp = document.getElementById('chat-overlay-opp');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    initWorker();
    setupEventListeners();
    applyTheme(selectTheme.value);
    initGame();
});

function initWorker() {
    if (window.Worker) {
        try {
            aiWorker = new Worker('ai-worker.js');
            aiWorker.onmessage = function(e) {
                const { action, pieces, move } = e.data;
                
                if (action === 'setup' && pieces) {
                    // Set up AI pieces
                    pieces.forEach(p => {
                        board[p.r][p.c] = { type: p.type, color: p.color };
                    });
                    oppReady = true;
                    updateUI();
                    checkBothReady();
                } else if (action === 'move') {
                    if (move) {
                        setTimeout(() => {
                            executeMove(move.from, move.to);
                        }, 600); // Natural thinking delay
                    } else {
                        // AI Resigns
                        endGame(playerColor, "AIが打てる手がなくなり、投了しました。");
                    }
                }
            };
        } catch (e) {
            console.error("AI Worker failed to initialize:", e);
        }
    }
}

function setupEventListeners() {
    // Mode changing
    selectGameMode.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (gameMode === 'online' && roomRef) {
            if (!confirm("オンライン対局を終了してモードを変更しますか？")) {
                selectGameMode.value = 'online';
                return;
            }
            cleanupOnlineRoom();
        }
        
        gameMode = mode;
        const aiGroup = document.getElementById('ai-difficulty-group');
        const colorGroup = document.getElementById('player-color-group');
        
        if (gameMode === 'pve') {
            aiGroup.classList.remove('hidden');
            colorGroup.classList.remove('hidden');
            onlineRoomGroup.classList.add('hidden');
            onlineChatGroup.classList.add('hidden');
            btnUndo.classList.remove('hidden');
        } else if (gameMode === 'local') {
            aiGroup.classList.add('hidden');
            colorGroup.classList.remove('hidden');
            onlineRoomGroup.classList.add('hidden');
            onlineChatGroup.classList.add('hidden');
            btnUndo.classList.remove('hidden');
        } else if (gameMode === 'online') {
            aiGroup.classList.add('hidden');
            colorGroup.classList.add('hidden');
            onlineRoomGroup.classList.remove('hidden');
            onlineChatGroup.classList.remove('hidden');
            btnUndo.classList.add('hidden'); // No undo online
            
            if (!initFirebase()) {
                alert("Firebaseが初期化されていません。FIREBASE_SETUP.mdを参照してFirebaseを設定してください。");
                selectGameMode.value = 'pve';
                gameMode = 'pve';
                aiGroup.classList.remove('hidden');
                colorGroup.classList.remove('hidden');
                onlineRoomGroup.classList.add('hidden');
                onlineChatGroup.classList.add('hidden');
                return;
            }
            showOnlineView('init');
        }
        initGame();
    });

    selectAiDifficulty.addEventListener('change', (e) => {
        aiDifficulty = e.target.value;
        initGame();
    });

    selectPlayerColor.addEventListener('change', (e) => {
        playerColor = e.target.value;
        initGame();
    });

    selectTheme.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    btnRestart.addEventListener('click', () => {
        if (gameMode === 'online' && roomRef) {
            if (!confirm("現在のオンライン対戦を終了し、再度準備フェーズに戻りますか？")) return;
            // Clear ready flags, reset board status
            roomRef.update({
                status: 'setup',
                'ready/black': false,
                'ready/white': false,
                moves: null,
                battle: null,
                battle_result: null
            });
            return;
        }
        initGame();
    });

    btnResign.addEventListener('click', () => {
        if (!gameActive) return;
        if (confirm("投了しますか？（相手の勝利となります）")) {
            if (gameMode === 'online') {
                sendResignToFirebase();
            } else {
                const winner = playerColor === 'black' ? 'white' : 'black';
                endGame(winner, "投了による決着です。");
            }
        }
    });

    btnUndo.addEventListener('click', () => {
        // Implement single step undo (VS PC or Local only)
        if (gameMode === 'online' || !gameActive || gamePhase !== 'playing') return;
        alert("一手戻す機能は未実装です。");
    });

    btnMute.addEventListener('click', () => {
        synth.muted = !synth.muted;
        if (synth.muted) {
            svgSoundOn.classList.add('hidden');
            svgSoundOff.classList.remove('hidden');
        } else {
            svgSoundOn.classList.remove('hidden');
            svgSoundOff.classList.add('hidden');
            synth.init();
        }
    });

    btnClearStats.addEventListener('click', () => {
        if (confirm("対戦成績データをすべて削除してもよろしいですか？")) {
            gameStats = {
                pve: { wins: 0, losses: 0 },
                online: { wins: 0, losses: 0 }
            };
            saveStats();
        }
    });

    // Setup action triggers
    btnSetupRandom.addEventListener('click', autoSetupSelf);
    btnSetupClear.addEventListener('click', clearSetupSelf);
    btnSetupReady.addEventListener('click', readySetupSelf);

    // Online room actions
    btnCreateRoom.addEventListener('click', createOnlineRoom);
    btnJoinRoom.addEventListener('click', () => {
        const rId = inputRoomId.value.trim().toUpperCase();
        if (rId.length !== 6) {
            alert("正しい6桁のルームIDを入力してください。");
            return;
        }
        joinOnlineRoom(rId);
    });
    btnCopyRoom.addEventListener('click', copyRoomId);
    btnCancelRoom.addEventListener('click', cleanupOnlineRoom);
    btnLeaveRoom.addEventListener('click', cleanupOnlineRoom);

    // Chat Presets click handler
    document.querySelectorAll('.btn-chat').forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.getAttribute('data-msg');
            sendChatMessage(msg);
        });
    });

    // Modals close button
    btnModalClose.addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });

    btnStartTurn.addEventListener('click', () => {
        localTurnConfirmed = true;
        turnTransitionModal.classList.add('hidden');
        renderBoard();
        startTimers();
    });

    // Handle board grid cell clicks
    boardEl.addEventListener('click', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        
        handleCellClick(r, c);
    });

    // Handle piece pool selection
    piecePoolEl.addEventListener('click', (e) => {
        if (gamePhase !== 'setup') return;
        const item = e.target.closest('.piece');
        if (!item) return;
        
        const idx = parseInt(item.dataset.index);
        selectPoolPiece(idx);
    });
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
}

// --- Stats Management ---
function loadStats() {
    const data = localStorage.getItem('gunjin_shogi_stats');
    if (data) {
        try {
            gameStats = JSON.parse(data);
        } catch (e) {
            console.error(e);
        }
    }
    updateStatsDOM();
}

function saveStats() {
    localStorage.setItem('gunjin_shogi_stats', JSON.stringify(gameStats));
    updateStatsDOM();
}

function updateStatsDOM() {
    document.getElementById('stat-pve-wins').textContent = gameStats.pve.wins;
    document.getElementById('stat-pve-losses').textContent = gameStats.pve.losses;
    document.getElementById('stat-online-wins').textContent = gameStats.online.wins;
    document.getElementById('stat-online-losses').textContent = gameStats.online.losses;
}

// --- Game Engine Setup & Flow ---
function initGame() {
    // Reset Board Array
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    
    // Reset Cemeteries
    cemetery = { player: [], opp: [] };
    cemeteryPlayerEl.innerHTML = '';
    cemeteryOppEl.innerHTML = '';
    
    // Setup Phase setup
    gamePhase = 'setup';
    gameActive = false;
    oppReady = false;
    localTurnConfirmed = false;
    
    // Load local deck for human player
    unplacedPieces = [...INITIAL_DECK];
    selectedPoolPieceIdx = null;
    selectedCell = null;
    validMovesForSelected = [];
    
    // Reset Timer values
    resetTimers();
    
    // UI update
    setupBanner.style.display = 'block';
    piecePoolContainer.classList.remove('hidden');
    btnResign.disabled = true;
    
    if (gameMode === 'pve') {
        nameSelfEl.textContent = 'あなた';
        nameOppEl.textContent = 'AI (PC)';
        statusSelfEl.textContent = '配置中';
        statusOppEl.textContent = '配置中...';
        statusSelfEl.className = 'status-indicator active';
        statusOppEl.className = 'status-indicator';
        
        // Trigger AI to make setup configuration
        if (aiWorker) {
            const aiColor = playerColor === 'black' ? 'white' : 'black';
            aiWorker.postMessage({ action: 'setup', aiColor });
        }
    } else if (gameMode === 'local') {
        nameSelfEl.textContent = '先手 (あなた)';
        nameOppEl.textContent = '後手 (対面)';
        statusSelfEl.textContent = '配置中';
        statusOppEl.textContent = '配置中';
        statusSelfEl.className = 'status-indicator active';
        statusOppEl.className = 'status-indicator active';
        
        // In local play, players place pieces sequentially.
        // We will make playerColor = 'black' (first player) do setup.
        playerColor = 'black'; 
    } else if (gameMode === 'online') {
        nameSelfEl.textContent = 'あなた';
        nameOppEl.textContent = oppConnected ? '対戦相手' : '接続待機中...';
        statusSelfEl.textContent = '準備中';
        statusOppEl.textContent = oppReady ? '準備完了' : '配置中';
        statusSelfEl.className = 'status-indicator active';
        statusOppEl.className = 'status-indicator';
        
        // Disable ready button initially until all placed
        btnSetupReady.disabled = true;
    }
    
    renderBoard();
    renderPiecePool();
    updateUI();
}

// Render the 8x6 board grid
function renderBoard() {
    boardEl.innerHTML = '';
    
    // Create cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Apply Camp or HQ classes
            if (isCamp(r, c)) {
                cell.classList.add('cell-camp');
            }
            if (isHQ(r, c)) {
                cell.classList.add('cell-hq');
            }
            
            // River representation (Row 3 bottom border / Row 4 top border)
            if (r === 3) {
                cell.classList.add('cell-river-edge');
                // Bridge cells on river edge
                if (c === 1 || c === 4) {
                    cell.classList.add('cell-bridge');
                }
            }
            
            // Highlight selected cell
            if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
                cell.classList.add('selected');
            }
            
            // Highlight valid movement hints
            const isHint = validMovesForSelected.some(vm => vm.r === r && vm.c === c);
            if (isHint) {
                cell.classList.add('hint');
            }
            
            // Render piece inside cell
            const piece = board[r][c];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';
                
                // Set piece color class
                const isMyPiece = piece.color === playerColor || (gameMode === 'online' && piece.color === myRole);
                if (isMyPiece) {
                    pieceEl.classList.add('self');
                    pieceEl.innerHTML = `
                        <span class="piece-name">${PIECE_NAMES[piece.type]}</span>
                        <span class="piece-symbol">${PIECE_SYMBOLS[piece.type]}</span>
                    `;
                } else {
                    // Opponent piece
                    pieceEl.classList.add('opp');
                    // Hide identity unless game over, or it's Local turn confirmed
                    const showIdentity = (gamePhase === 'finished') || (gameMode === 'local' && localTurnConfirmed && turn === piece.color);
                    
                    if (showIdentity) {
                        pieceEl.innerHTML = `
                            <span class="piece-name">${PIECE_NAMES[piece.type]}</span>
                            <span class="piece-symbol">${PIECE_SYMBOLS[piece.type]}</span>
                        `;
                    } else {
                        pieceEl.classList.add('hidden-piece');
                    }
                }
                
                cell.appendChild(pieceEl);
            }
            
            boardEl.appendChild(cell);
        }
    }
}

// Render pieces pool in setup phase
function renderPiecePool() {
    piecePoolEl.innerHTML = '';
    
    // Sort pool to make it look clean
    const uniqueTypes = [...new Set(unplacedPieces)].sort();
    
    uniqueTypes.forEach(type => {
        const count = unplacedPieces.filter(t => t === type).length;
        if (count === 0) return;
        
        // Find index of first match in array
        const idx = unplacedPieces.indexOf(type);
        
        const item = document.createElement('div');
        item.className = 'piece';
        item.dataset.index = idx;
        if (selectedPoolPieceIdx === idx) {
            item.classList.add('selected-in-pool');
        }
        
        item.innerHTML = `
            <span class="piece-name">${PIECE_NAMES[type]}</span>
            <span class="piece-symbol">${PIECE_SYMBOLS[type]}${count > 1 ? ` x${count}` : ''}</span>
        `;
        
        piecePoolEl.appendChild(item);
    });
}

// Handle cell selection and placing
function handleCellClick(r, c) {
    if (gamePhase === 'setup') {
        // Placement Phase Actions
        const piece = board[r][c];
        
        // Check if cell is within our self陣 (Black: rows 5,6,7; White: rows 0,1,2)
        const isSelfTerritory = (playerColor === 'black' && r >= 5) || (playerColor === 'white' && r <= 2);
        if (!isSelfTerritory) {
            if (selectedPoolPieceIdx !== null) {
                alert("自分の陣地（下部3段）にのみ配置できます。");
            }
            return;
        }
        
        // 1. If we have a pool piece selected, place it here
        if (selectedPoolPieceIdx !== null) {
            const pieceType = unplacedPieces[selectedPoolPieceIdx];
            
            // Mine rules: Cannot be placed on frontline (row 5 for black, row 2 for white)
            if (pieceType === 'mine') {
                const isFrontline = (playerColor === 'black' && r === 5) || (playerColor === 'white' && r === 2);
                if (isFrontline) {
                    alert("地雷は最前線には配置できません。");
                    return;
                }
            }
            
            // Flag rules: Must be placed in HQ
            if (pieceType === 'flag') {
                if (!isHQ(r, c)) {
                    alert("軍旗は司令部のどちらかに配置する必要があります。");
                    return;
                }
            }
            
            // Place on cell
            if (piece) {
                // If there's already a piece, return it to pool
                unplacedPieces.push(piece.type);
            }
            
            board[r][c] = { type: pieceType, color: playerColor };
            unplacedPieces.splice(selectedPoolPieceIdx, 1);
            
            selectedPoolPieceIdx = null;
            synth.playPlaceSound();
            
        } else {
            // 2. If no pool piece selected, pick up the piece on board back to pool
            if (piece && piece.color === playerColor) {
                unplacedPieces.push(piece.type);
                board[r][c] = null;
                synth.playPlaceSound();
            }
        }
        
        // Check if setup complete
        btnSetupReady.disabled = (unplacedPieces.length > 0);
        
        renderBoard();
        renderPiecePool();
        updateUI();
        
    } else if (gamePhase === 'playing') {
        // Active Play Actions
        
        // Prevent actions if not our turn
        const isMyTurn = (gameMode === 'online' && turn === myRole) || (gameMode !== 'online' && turn === playerColor);
        if (!isMyTurn) return;
        
        // If clicking a hint (movement destination)
        const isMoveAction = validMovesForSelected.some(vm => vm.r === r && vm.c === c);
        if (isMoveAction) {
            const from = selectedCell;
            const to = { r, c };
            executeMove(from, to);
            return;
        }
        
        // Selecting a piece
        const piece = board[r][c];
        const isMyPiece = piece && (piece.color === turn);
        
        if (isMyPiece) {
            // Cannot select Mine, Flag or pieces inside HQ (they can't move)
            if (piece.type === 'mine' || piece.type === 'flag' || isHQ(r, c)) {
                return;
            }
            
            selectedCell = { r, c };
            validMovesForSelected = getValidMoves({ r, c });
            synth.playPlaceSound();
        } else {
            // Cancel selection
            selectedCell = null;
            validMovesForSelected = [];
        }
        
        renderBoard();
    }
}

// Select a piece from the setup pool
function selectPoolPiece(idx) {
    selectedPoolPieceIdx = idx;
    renderPiecePool();
}

// --- Automatic / Clear Setup handlers ---
function autoSetupSelf() {
    clearSetupSelf();
    
    const selfRows = playerColor === 'black' ? [5, 6, 7] : [0, 1, 2];
    const flagRow = selfRows[2]; // Back row (row 7 for black, 0 for white)
    
    // Choose one HQ randomly for flag
    const flagCol = Math.random() < 0.5 ? 1 : 4;
    board[flagRow][flagCol] = { type: 'flag', color: playerColor };
    
    // Mine placement: Put mines to protect HQ
    // Mines placed around flag
    const defensePositions = [];
    if (flagCol === 1) {
        defensePositions.push({ r: selfRows[1], c: 1 }); // in front of left HQ
        defensePositions.push({ r: flagRow, c: 2 });     // right of left HQ
    } else {
        defensePositions.push({ r: selfRows[1], c: 4 }); // in front of right HQ
        defensePositions.push({ r: flagRow, c: 3 });     // left of right HQ
    }
    
    defensePositions.forEach(pos => {
        board[pos.r][pos.c] = { type: 'mine', color: playerColor };
    });
    
    // Place remaining pieces randomly
    const deck = [...INITIAL_DECK].filter(t => t !== 'flag' && t !== 'mine');
    
    // If not all defense slots filled (e.g. if we have more mines), handle them
    const mineCount = INITIAL_DECK.filter(t => t === 'mine').length - defensePositions.length;
    for (let i = 0; i < mineCount; i++) {
        deck.push('mine');
    }
    
    shuffleArray(deck);
    
    for (let r of selfRows) {
        for (let c = 0; c < COLS; c++) {
            // Skip camp spaces
            if (isCamp(r, c)) continue;
            
            // Skip already placed (flag & mine protectors)
            if (board[r][c]) continue;
            
            const nextPiece = deck.pop();
            if (nextPiece) {
                // Frontline row cannot have mines
                const isFrontline = (playerColor === 'black' && r === 5) || (playerColor === 'white' && r === 2);
                if (nextPiece === 'mine' && isFrontline) {
                    // Swap mine with a non-mine combat piece
                    deck.unshift('mine'); // Put mine back in list
                    // Find a combat piece
                    const nonMineIdx = deck.findIndex(p => p !== 'mine');
                    if (nonMineIdx !== -1) {
                        const combatPiece = deck.splice(nonMineIdx, 1)[0];
                        board[r][c] = { type: combatPiece, color: playerColor };
                    }
                } else {
                    board[r][c] = { type: nextPiece, color: playerColor };
                }
            }
        }
    }
    
    unplacedPieces = [];
    btnSetupReady.disabled = false;
    synth.playPlaceSound();
    renderBoard();
    renderPiecePool();
    updateUI();
}

function clearSetupSelf() {
    const selfRows = playerColor === 'black' ? [5, 6, 7] : [0, 1, 2];
    for (let r of selfRows) {
        for (let c = 0; c < COLS; c++) {
            board[r][c] = null;
        }
    }
    unplacedPieces = [...INITIAL_DECK];
    selectedPoolPieceIdx = null;
    btnSetupReady.disabled = true;
    renderBoard();
    renderPiecePool();
    updateUI();
}

function readySetupSelf() {
    if (unplacedPieces.length > 0) return;
    
    if (gameMode === 'pve') {
        statusSelfEl.textContent = '準備完了';
        statusSelfEl.className = 'status-indicator';
        oppReady = true; // AI is always ready instantly
        checkBothReady();
    } else if (gameMode === 'local') {
        if (playerColor === 'black') {
            // Black setup done. Now hide black pieces and let White place.
            alert("先手の配置が完了しました。端末を後手プレイヤーに渡し、「後手配置開始」を押してください。");
            
            // Prepare for White setup
            playerColor = 'white';
            unplacedPieces = [...INITIAL_DECK];
            selectedPoolPieceIdx = null;
            
            // Temporarily hide black pieces on board to maintain secrecy during placement
            renderBoard();
            renderPiecePool();
            updateUI();
            
            btnSetupReady.disabled = true;
        } else {
            // White setup done. Both players ready.
            statusSelfEl.textContent = '準備完了';
            statusOppEl.textContent = '準備完了';
            oppReady = true;
            checkBothReady();
        }
    } else if (gameMode === 'online') {
        statusSelfEl.textContent = '準備完了';
        statusSelfEl.className = 'status-indicator';
        
        // Push setup to Firebase
        sendSetupToFirebase();
    }
}

function checkBothReady() {
    if (oppReady) {
        // Hide setup banner and pool
        setupBanner.style.display = 'none';
        piecePoolContainer.classList.add('hidden');
        btnResign.disabled = false;
        
        gamePhase = 'playing';
        gameActive = true;
        turn = 'black'; // Black starts first
        
        resetTimers();
        
        if (gameMode === 'local') {
            // Trigger turn confirmation overlay to hide initial state
            localTurnConfirmed = false;
            nextPlayerNameEl.textContent = '先手';
            turnTransitionModal.classList.remove('hidden');
        } else {
            startTimers();
            renderBoard();
            updateUI();
            
            // If AI is white and starts (actually black starts first, so if player is white, AI is black)
            if (gameMode === 'pve' && playerColor === 'white' && turn === 'black') {
                triggerAiMove();
            }
        }
    }
}

// --- Movement Calculations ---
function getValidMoves(from) {
    const valid = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (isValidMoveRules(from, { r, c }, board, turn)) {
                valid.push({ r, c });
            }
        }
    }
    return valid;
}

function isValidMoveRules(from, to, boardState, playerColor) {
    const piece = boardState[from.r][from.c];
    if (!piece) return false;
    
    // Cannot land on own color
    const target = boardState[to.r][to.c];
    if (target && target.color === piece.color) return false;
    
    // Mine and Flag cannot move
    if (piece.type === 'mine' || piece.type === 'flag') return false;
    
    // Once in HQ, a piece cannot move
    if (isHQ(from.r, from.c)) return false;
    
    // Camp safety: Cannot attack a piece in camp
    if (isCamp(to.r, to.c) && target) return false;
    
    const dr = to.r - from.r;
    const dc = to.c - from.c;
    const dist = Math.abs(dr) + Math.abs(dc);
    
    // River and Bridge restriction
    const crossesRiver = (from.r <= 3 && to.r >= 4) || (from.r >= 4 && to.r <= 3);
    
    // Bridge Check helper
    function isBridgeRoute(fR, fC, tR, tC) {
        if (fC === 1 && tC === 1 && ((fR === 3 && tR === 4) || (fR === 4 && tR === 3))) return true;
        if (fC === 4 && tC === 4 && ((fR === 3 && tR === 4) || (fR === 4 && tR === 3))) return true;
        if (fR === 3 && fC === 2 && tR === 4 && tC === 3) return true;
        if (fR === 4 && fC === 3 && tR === 3 && tC === 2) return true;
        if (fR === 3 && fC === 3 && tR === 4 && tC === 2) return true;
        if (fR === 4 && fC === 2 && tR === 3 && tC === 3) return true;
        return false;
    }
    
    // Airplane: straight move any distance, jumping over anything
    if (piece.type === 'airplane') {
        if (dr !== 0 && dc !== 0) return false;
        return true;
    }
    
    // Engineer: straight move any distance, blocked by pieces
    if (piece.type === 'engineer') {
        if (dr !== 0 && dc !== 0) return false;
        
        const stepR = dr === 0 ? 0 : Math.sign(dr);
        const stepC = dc === 0 ? 0 : Math.sign(dc);
        let currR = from.r + stepR;
        let currC = from.c + stepC;
        
        while (currR !== to.r || currC !== to.c) {
            if (boardState[currR][currC]) return false;
            currR += stepR;
            currC += stepC;
        }
        return true;
    }
    
    // Ordinary Pieces: moves 1 step vertically/horizontally
    if (dist !== 1) return false;
    
    if (crossesRiver) {
        return isBridgeRoute(from.r, from.c, to.r, to.c);
    }
    
    return true;
}

// --- Combat Resolution ---
function resolveBattle(attacker, defender) {
    if (attacker === defender) return 'draw';
    
    if (defender === 'mine') {
        if (attacker === 'engineer') return 'attacker_win';
        return 'draw'; // Explosion
    }
    
    if (defender === 'flag') return 'attacker_win';
    
    if (attacker === 'spy') {
        if (defender === 'marshal') return 'attacker_win';
        return 'defender_win';
    }
    if (defender === 'spy') {
        return 'attacker_win';
    }
    
    if (attacker === 'engineer') {
        if (defender === 'flag' || defender === 'spy') return 'attacker_win';
        return 'defender_win';
    }
    
    if (attacker === 'commando') {
        if (defender === 'engineer' || defender === 'spy' || defender === 'flag') return 'attacker_win';
        return 'defender_win';
    }
    
    if (attacker === 'airplane') {
        const airplaneBeats = ['sub_lieutenant', 'engineer', 'spy', 'commando', 'flag'];
        if (airplaneBeats.includes(defender)) return 'attacker_win';
        return 'defender_win';
    }
    if (defender === 'airplane') {
        const airplaneLosesTo = ['lieutenant', 'captain', 'major', 'lt_col', 'colonel', 'major_gen', 'general', 'marshal'];
        if (airplaneLosesTo.includes(attacker)) return 'attacker_win';
        return 'defender_win';
    }
    
    const rank = {
        'marshal': 9, 'general': 8, 'major_gen': 7, 'colonel': 6,
        'lt_col': 5, 'major': 4, 'captain': 3, 'lieutenant': 2, 'sub_lieutenant': 1
    };
    
    const attRank = rank[attacker] || 0;
    const defRank = rank[defender] || 0;
    
    if (attRank > defRank) return 'attacker_win';
    if (attRank < defRank) return 'defender_win';
    return 'draw';
}

// --- Execute Movement ---
function executeMove(from, to) {
    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];
    
    selectedCell = null;
    validMovesForSelected = [];
    
    let isBattle = false;
    let battleResult = null;
    let backupAttacker = piece.type;
    let backupDefender = target ? target.type : null;
    
    if (target) {
        // Combat occurs
        isBattle = true;
        
        if (gameMode === 'online') {
            // Online battle sync
            handleOnlineBattle(from, to, piece, target);
            return;
        } else {
            // Offline battle
            battleResult = resolveBattle(piece.type, target.type);
            showBattleOverlay(piece.type, target.type, battleResult);
            
            if (battleResult === 'attacker_win') {
                board[to.r][to.c] = piece;
                board[from.r][from.c] = null;
                cemetery[piece.color === 'black' ? 'opp' : 'player'].push(target.type);
                synth.playPlaceSound();
            } else if (battleResult === 'defender_win') {
                board[from.r][from.c] = null;
                cemetery[piece.color === 'black' ? 'player' : 'opp'].push(piece.type);
                synth.playPlaceSound();
            } else {
                // Draw: both explode
                board[from.r][from.c] = null;
                board[to.r][to.c] = null;
                cemetery[piece.color === 'black' ? 'player' : 'opp'].push(piece.type);
                cemetery[piece.color === 'black' ? 'opp' : 'player'].push(target.type);
                
                if (target.type === 'mine') {
                    synth.playExplodeSound();
                } else {
                    synth.playPlaceSound();
                }
            }
        }
    } else {
        // Simple move
        board[to.r][to.c] = piece;
        board[from.r][from.c] = null;
        synth.playPlaceSound();
    }
    
    // Post battle/move check
    postMoveChecks(from, to, isBattle, backupAttacker, backupDefender, battleResult);
}

function postMoveChecks(from, to, isBattle, attackerType, defenderType, result) {
    renderBoard();
    updateCemeteriesDOM();
    
    // Win conditions check
    checkVictoryConditions();
    
    if (!gameActive) return;
    
    // Switch turn
    turn = turn === 'black' ? 'white' : 'black';
    
    // Trigger next turn transitions
    if (gameMode === 'pve') {
        if (turn !== playerColor) {
            triggerAiMove(from, to, isBattle ? { pos: to, oppType: defenderType, aiType: attackerType, result } : null);
        } else {
            updateUI();
        }
    } else if (gameMode === 'local') {
        localTurnConfirmed = false;
        nextPlayerNameEl.textContent = turn === 'black' ? '先手' : '後手';
        turnTransitionModal.classList.remove('hidden');
        clearInterval(timerInterval);
    } else if (gameMode === 'online') {
        // Send move to Firebase
        sendMoveToFirebase(from, to);
    }
    
    updateUI();
}

function triggerAiMove(lastPlayerFrom = null, lastPlayerTo = null, lastBattleInfo = null) {
    if (aiWorker && gameActive) {
        statusOppEl.textContent = '思考中...';
        statusOppEl.className = 'status-indicator active';
        
        // Deep clone board for safety
        const clonedBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
        
        aiWorker.postMessage({
            action: 'think',
            board: clonedBoard,
            aiColor: playerColor === 'black' ? 'white' : 'black',
            difficulty: aiDifficulty,
            cemetery: cemetery.player,
            from: lastPlayerFrom,
            to: lastPlayerTo,
            battleInfo: lastBattleInfo
        });
    }
}

// Check if any player has achieved victory conditions
function checkVictoryConditions() {
    let blackFlagAlive = false;
    let whiteFlagAlive = false;
    let blackMobilePieces = 0;
    let whiteMobilePieces = 0;
    
    // 1. Scan board for Flags and remaining mobile pieces
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const p = board[r][c];
            if (p) {
                if (p.type === 'flag') {
                    if (p.color === 'black') blackFlagAlive = true;
                    else whiteFlagAlive = true;
                } else if (p.type !== 'mine') {
                    // Mobile combat pieces
                    if (p.color === 'black') blackMobilePieces++;
                    else whiteMobilePieces++;
                }
            }
        }
    }
    
    // Check if a player flag is captured (not on board)
    if (!blackFlagAlive) {
        endGame('white', "先手の軍旗が占領されました。");
        return;
    }
    if (!whiteFlagAlive) {
        endGame('black', "後手の軍旗が占領されました。");
        return;
    }
    
    // Check mobile piece annihilation
    if (blackMobilePieces === 0) {
        endGame('white', "先手の動ける戦闘駒が全滅しました。");
        return;
    }
    if (whiteMobilePieces === 0) {
        endGame('black', "後手の動ける戦闘駒が全滅しました。");
        return;
    }
    
    // 2. HQ invasion check (Invasion by lieutenant or higher)
    // Black HQs are (7, 1) and (7, 4). White can capture them.
    const blackHQs = [{ r: 7, c: 1 }, { r: 7, c: 4 }];
    blackHQs.forEach(hq => {
        const occupier = board[hq.r][hq.c];
        if (occupier && occupier.color === 'white') {
            // Must be lieutenant or higher (excluding spy, engineer, commando, mine, airplane has some rules but let's exclude special non-officers)
            const ranks = ['marshal', 'general', 'major_gen', 'colonel', 'lt_col', 'major', 'captain', 'lieutenant', 'sub_lieutenant'];
            if (ranks.includes(occupier.type)) {
                endGame('white', "後手に司令部を占領されました。");
            }
        }
    });
    
    // White HQs are (0, 1) and (0, 4). Black can capture them.
    const whiteHQs = [{ r: 0, c: 1 }, { r: 0, c: 4 }];
    whiteHQs.forEach(hq => {
        const occupier = board[hq.r][hq.c];
        if (occupier && occupier.color === 'black') {
            const ranks = ['marshal', 'general', 'major_gen', 'colonel', 'lt_col', 'major', 'captain', 'lieutenant', 'sub_lieutenant'];
            if (ranks.includes(occupier.type)) {
                endGame('black', "先手に司令部を占領されました。");
            }
        }
    });
}

function endGame(winner, reason) {
    gameActive = false;
    gamePhase = 'finished';
    clearInterval(timerInterval);
    
    // Render final state with opponent identities exposed
    renderBoard();
    
    // Save results
    if (gameMode === 'pve') {
        const playerWon = winner === playerColor;
        if (playerWon) gameStats.pve.wins++;
        else gameStats.pve.losses++;
        saveStats();
    } else if (gameMode === 'online') {
        const playerWon = winner === myRole;
        if (playerWon) gameStats.online.wins++;
        else gameStats.online.losses++;
        saveStats();
    }
    
    // Show stats modal
    winnerTextEl.textContent = (winner === 'black' ? '先手' : '後手') + "の勝利！";
    if (gameMode === 'online') {
        winnerTextEl.textContent = (winner === myRole ? 'あなたの勝利！' : 'あなたの敗北...');
    }
    resultReason.textContent = reason;
    resultModal.classList.remove('hidden');
    
    if (winner === playerColor || (gameMode === 'online' && winner === myRole)) {
        synth.playWinSound();
    } else {
        synth.playLoseSound();
    }
    
    updateUI();
}

// --- Battle Overlay Modal ---
function showBattleOverlay(attType, defType, result) {
    synth.playBattleSound();
    
    battleAttackerName.textContent = PIECE_NAMES[attType];
    battleDefenderName.textContent = PIECE_NAMES[defType];
    
    if (result === 'attacker_win') {
        battleResultText.textContent = "攻撃側の勝利！";
        battleResultText.style.color = "#7a9e73";
        battleResultDesc.textContent = `${PIECE_NAMES[defType]}は撃破され、盤面から除外されました。`;
    } else if (result === 'defender_win') {
        battleResultText.textContent = "防御側の勝利！";
        battleResultText.style.color = "#80302b";
        battleResultDesc.textContent = `${PIECE_NAMES[attType]}は撃破され、盤面から除外されました。`;
    } else {
        battleResultText.textContent = "相打ち！";
        battleResultText.style.color = "#ffd700";
        battleResultDesc.textContent = `両方の駒が消滅しました。`;
    }
    
    battleModal.classList.remove('hidden');
    
    setTimeout(() => {
        battleModal.classList.add('hidden');
    }, 1800);
}

function updateCemeteriesDOM() {
    cemeteryPlayerEl.innerHTML = '';
    cemeteryOppEl.innerHTML = '';
    
    cemetery.player.forEach(type => {
        const el = document.createElement('div');
        el.className = 'piece-mini self';
        el.textContent = PIECE_SYMBOLS[type];
        el.title = PIECE_NAMES[type];
        cemeteryPlayerEl.appendChild(el);
    });
    
    cemetery.opp.forEach(type => {
        const el = document.createElement('div');
        el.className = 'piece-mini opp';
        el.textContent = PIECE_SYMBOLS[type];
        el.title = PIECE_NAMES[type];
        cemeteryOppEl.appendChild(el);
    });
}

// --- Timers Logic ---
function startTimers() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        
        if (turn === 'black') {
            timerSelf++;
            updateTimerDOM(timerSelfEl, timerSelf);
        } else {
            timerOpp++;
            updateTimerDOM(timerOppEl, timerOpp);
        }
    }, 1000);
}

function updateTimerDOM(el, seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    el.textContent = `${mins}:${secs}`;
}

function resetTimers() {
    clearInterval(timerInterval);
    timerSelf = 0;
    timerOpp = 0;
    updateTimerDOM(timerSelfEl, 0);
    updateTimerDOM(timerOppEl, 0);
}

// --- UI / Control Sync ---
function updateUI() {
    // Sync buttons
    if (gamePhase === 'setup') {
        statusSelfEl.textContent = '配置中';
        statusOppEl.textContent = oppReady ? '準備完了' : '配置中';
    } else if (gamePhase === 'playing') {
        const isMyTurn = (gameMode === 'online' && turn === myRole) || (gameMode !== 'online' && turn === playerColor);
        statusSelfEl.textContent = isMyTurn ? 'あなたの番' : '待機中';
        statusOppEl.textContent = !isMyTurn ? '相手の番' : '待機中';
        
        statusSelfEl.className = isMyTurn ? 'status-indicator active' : 'status-indicator';
        statusOppEl.className = !isMyTurn ? 'status-indicator active' : 'status-indicator';
    } else {
        statusSelfEl.textContent = '対局終了';
        statusOppEl.textContent = '対局終了';
    }
}

// --- Firebase Synchronous Multiplaying System ---
function initFirebase() {
    if (typeof firebase === 'undefined') return false;
    
    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        return false;
    }
}

function showOnlineView(viewState) {
    onlineInitView.classList.add('hidden');
    onlineWaitingView.classList.add('hidden');
    onlineActiveView.classList.add('hidden');
    
    if (viewState === 'init') {
        onlineInitView.classList.remove('hidden');
    } else if (viewState === 'waiting') {
        onlineWaitingView.classList.remove('hidden');
        displayRoomId.textContent = roomId;
    } else if (viewState === 'active') {
        onlineActiveView.classList.remove('hidden');
    }
}

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // simple readable alphanumeric
    let res = '';
    for (let i = 0; i < 6; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

function createOnlineRoom() {
    roomId = generateRoomId();
    myRole = 'black'; // Host is black (first mover)
    playerColor = 'black';
    
    roomRef = database.ref('rooms/' + roomId);
    roomRef.set({
        status: 'waiting',
        host: 'black',
        'players/black': 'Host Player',
        'ready/black': false,
        'ready/white': false
    }).then(() => {
        showOnlineView('waiting');
        listenToRoom();
    }).catch(err => {
        alert("部屋の作成に失敗しました。" + err.message);
    });
}

function joinOnlineRoom(rId) {
    roomId = rId;
    myRole = 'white'; // Guest is white (second mover)
    playerColor = 'white';
    
    roomRef = database.ref('rooms/' + roomId);
    roomRef.once('value').then(snap => {
        if (!snap.exists()) {
            alert("部屋が見つかりません。ルームIDを確認してください。");
            return;
        }
        
        const data = snap.val();
        if (data.status !== 'waiting') {
            alert("この部屋はすでにゲームが開始されているか、満員です。");
            return;
        }
        
        // Join room
        roomRef.update({
            'players/white': 'Guest Player',
            status: 'setup'
        }).then(() => {
            showOnlineView('active');
            listenToRoom();
        });
    });
}

function listenToRoom() {
    if (!roomRef) return;
    
    roomRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;
        
        // Handle guest connection
        if (myRole === 'black' && data.players && data.players.white) {
            oppConnected = true;
            nameOppEl.textContent = '対戦相手 (Guest)';
            if (data.status === 'waiting') {
                roomRef.update({ status: 'setup' });
            }
            showOnlineView('active');
        }
        
        // Handle setup / readiness
        if (data.status === 'setup') {
            oppReady = myRole === 'black' ? data.ready.white : data.ready.black;
            statusOppEl.textContent = oppReady ? '準備完了' : '配置中';
            updateUI();
        }
        
        // Both players are ready, trigger playing start
        if (data.status === 'setup' && data.ready && data.ready.black && data.ready.white) {
            roomRef.update({
                status: 'playing',
                turn: 'black'
            });
        }
        
        // Core gameplaying phase
        if (data.status === 'playing') {
            if (gamePhase === 'setup') {
                // Transition to playing locally
                setupBanner.style.display = 'none';
                piecePoolContainer.classList.add('hidden');
                btnResign.disabled = false;
                gamePhase = 'playing';
                gameActive = true;
                attachDefendingListener();
            }
            
            // Sync current turn
            turn = data.turn;
            
            // Sync move history if last move exists
            if (data.lastMove && data.lastMove.sender !== myRole) {
                const lastMoveHash = `${data.lastMove.from.r},${data.lastMove.from.c}->${data.lastMove.to.r},${data.lastMove.to.c}_${data.lastMove.timestamp}`;
                if (lastMoveHash !== lastFirebaseSyncHash) {
                    lastFirebaseSyncHash = lastMoveHash;
                    applyFirebaseMove(data.lastMove);
                }
            }
            
            // Sync Resign state
            if (data.resigned) {
                const winner = data.resigned === 'black' ? 'white' : 'black';
                endGame(winner, `${data.resigned === 'black' ? '先手' : '後手'}が投了しました。`);
            }
            
            updateUI();
        }
        
        // Sync Chat Message
        if (data.chat && data.chat.timestamp > (Date.now() - 5000)) {
            showChatMessageBubble(data.chat.sender, data.chat.message);
        }
    });
}

function sendSetupToFirebase() {
    if (!roomRef) return;
    
    // Flag ready
    roomRef.update({
        [`ready/${myRole}`]: true
    });
}

// Synchronous online battle flow:
// 1. Attacker detects collision -> sets battle node: { attackerType, from, to, sender: myRole }
// 2. Defender catches battle node -> computes battle -> sets battle_result node: { result, defenderType }
// 3. Attacker catches battle_result -> updates locally, clears battle & battle_result
function handleOnlineBattle(from, to, attackerPiece, defenderPiece) {
    if (!roomRef) return;
    
    // Set battle request
    roomRef.child('battle').set({
        attackerType: attackerPiece.type,
        from: from,
        to: to,
        sender: myRole,
        timestamp: Date.now()
    });
    
    // Listen to battle result
    const resultRef = roomRef.child('battle_result');
    const listener = resultRef.on('value', snap => {
        const val = snap.val();
        if (val) {
            // Apply result locally
            const result = val.result;
            const defenderType = val.defenderType;
            
            showBattleOverlay(attackerPiece.type, defenderType, result);
            
            if (result === 'attacker_win') {
                board[to.r][to.c] = attackerPiece;
                board[from.r][from.c] = null;
                cemetery[myRole === 'black' ? 'opp' : 'player'].push(defenderType);
            } else if (result === 'defender_win') {
                board[from.r][from.c] = null;
                cemetery[myRole === 'black' ? 'player' : 'opp'].push(attackerPiece.type);
            } else {
                board[from.r][from.c] = null;
                board[to.r][to.c] = null;
                cemetery[myRole === 'black' ? 'player' : 'opp'].push(attackerPiece.type);
                cemetery[myRole === 'black' ? 'opp' : 'player'].push(defenderType);
            }
            
            renderBoard();
            updateCemeteriesDOM();
            checkVictoryConditions();
            
            // Clean battle entries from DB
            roomRef.child('battle').set(null);
            resultRef.set(null);
            resultRef.off('value', listener);
            
            // Switch turn and push
            const nextTurn = myRole === 'black' ? 'white' : 'black';
            roomRef.update({
                turn: nextTurn,
                lastMove: {
                    from: from,
                    to: to,
                    sender: myRole,
                    isBattle: true,
                    battleResult: result,
                    attackerType: attackerPiece.type,
                    defenderType: defenderType,
                    timestamp: Date.now()
                }
            });
        }
    });
}

// Watch for battle requests when I am the defender
database && database.ref('rooms').on('child_added', () => { /* placeholder to trigger init on global DB scope */ });
function listenToDefendingBattle() {
    if (!roomRef) return;
    
    roomRef.child('battle').on('value', snap => {
        const val = snap.val();
        if (val && val.sender !== myRole) {
            // Defensive battle logic
            const to = val.to;
            const from = val.from;
            const attackerType = val.attackerType;
            const myPiece = board[to.r][to.c];
            
            if (myPiece) {
                const result = resolveBattle(attackerType, myPiece.type);
                
                // Write result to DB for attacker to read
                roomRef.child('battle_result').set({
                    result: result,
                    defenderType: myPiece.type,
                    timestamp: Date.now()
                });
                
                // Apply locally
                showBattleOverlay(attackerType, myPiece.type, result);
                
                if (result === 'attacker_win') {
                    board[to.r][to.c] = { type: attackerType, color: val.sender };
                    board[from.r][from.c] = null;
                    cemetery[myRole === 'black' ? 'player' : 'opp'].push(myPiece.type);
                } else if (result === 'defender_win') {
                    board[from.r][from.c] = null;
                    cemetery[myRole === 'black' ? 'opp' : 'player'].push(attackerType);
                } else {
                    board[from.r][from.c] = null;
                    board[to.r][to.c] = null;
                    cemetery[myRole === 'black' ? 'player' : 'opp'].push(myPiece.type);
                    cemetery[myRole === 'black' ? 'opp' : 'player'].push(attackerType);
                }
                
                renderBoard();
                updateCemeteriesDOM();
                checkVictoryConditions();
            }
        }
    });
}

// Trigger defending battle observer right after entering active playing
let isDefendingListenerAttached = false;
function attachDefendingListener() {
    if (isDefendingListenerAttached) return;
    listenToDefendingBattle();
    isDefendingListenerAttached = true;
}

// Sync plain moves (no battles)
function sendMoveToFirebase(from, to) {
    if (!roomRef) return;
    
    const nextTurn = myRole === 'black' ? 'white' : 'black';
    roomRef.update({
        turn: nextTurn,
        lastMove: {
            from: from,
            to: to,
            sender: myRole,
            isBattle: false,
            timestamp: Date.now()
        }
    });
}

function applyFirebaseMove(move) {
    const from = move.from;
    const to = move.to;
    const piece = board[from.r][from.c];
    
    if (move.isBattle) {
        // Handled by battle listeners, but double check integrity
        return;
    }
    
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    
    synth.playPlaceSoundOnline();
    renderBoard();
    checkVictoryConditions();
}

function sendResignToFirebase() {
    if (!roomRef) return;
    roomRef.update({ resigned: myRole });
}

function cleanupOnlineRoom() {
    if (roomRef) {
        roomRef.off();
        roomRef.child('battle').off();
        if (myRole === 'black') {
            roomRef.remove();
        } else {
            roomRef.update({
                [`players/${myRole}`]: null,
                status: 'waiting'
            });
        }
    }
    
    roomRef = null;
    roomId = null;
    myRole = null;
    oppConnected = false;
    oppReady = false;
    isDefendingListenerAttached = false;
    
    showOnlineView('init');
    initGame();
}

function copyRoomId() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
        alert("ルームIDをクリップボードにコピーしました！");
    });
}

// --- Chat Messages Sync ---
function sendChatMessage(message) {
    if (!roomRef) return;
    roomRef.child('chat').set({
        sender: myRole,
        message: message,
        timestamp: Date.now()
    });
}

function showChatMessageBubble(sender, message) {
    const overlay = sender === myRole ? chatOverlaySelf : chatOverlayOpp;
    const bubble = overlay.querySelector('.chat-bubble');
    
    bubble.textContent = message;
    overlay.classList.remove('hidden');
    
    // Position bubble relative to player cards
    const card = sender === myRole ? playerSelfCard : playerOppCard;
    const rect = card.getBoundingClientRect();
    
    overlay.style.top = `${rect.top - 45 + window.scrollY}px`;
    overlay.style.left = `${rect.left + 20 + window.scrollX}px`;
    
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 3500);
}
