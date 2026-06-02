/**
 * Gunjin Shogi Premium - AI Thinking Engine (Web Worker)
 */

// --- Constants & Rules Config ---
const ROWS = 8;
const COLS = 6;

// Piece Value definitions for AI evaluation
const PIECE_VALUES = {
    'marshal': 90,     // 大将
    'general': 80,     // 中将
    'major_gen': 70,   // 少将
    'colonel': 60,     // 大佐
    'lt_col': 50,      // 中佐
    'major': 45,       // 少佐
    'captain': 35,     // 大尉
    'lieutenant': 25,  // 中尉
    'sub_lieutenant': 20, // 少尉
    'airplane': 50,    // 飛行機
    'engineer': 30,    // 工兵
    'spy': 40,         // スパイ
    'commando': 15,    // 突撃兵
    'mine': 40,        // 地雷
    'flag': 1000       // 軍旗
};

// Camp Positions (0-indexed)
const CAMPS = [
    { r: 2, c: 1 }, { r: 2, c: 4 }, { r: 1, c: 2 }, { r: 1, c: 3 }, // Top side (White/Opponent default)
    { r: 5, c: 1 }, { r: 5, c: 4 }, { r: 6, c: 2 }, { r: 6, c: 3 }  // Bottom side (Black/Player default)
];

// HQ Positions
const HQS = [
    { r: 0, c: 1 }, { r: 0, c: 4 }, // Top side
    { r: 7, c: 1 }, { r: 7, c: 4 }  // Bottom side
];

// Check if position is camp
function isCamp(r, c) {
    return CAMPS.some(p => p.r === r && p.c === c);
}

// Check if position is HQ
function isHQ(r, c) {
    return HQS.some(p => p.r === r && p.c === c);
}

// AI Setup Templates (Representing a 3-row x 6-col area for the self side)
// Indices map to relative rows 0, 1, 2 from the back, and cols 0 to 5.
// Note: When placing, these will be mapped to the actual top rows (0,1,2) or bottom rows (5,6,7) depending on AI color.
// HQ positions are always at relative row 0, col 1 and 4.
// Mines (mine) cannot be placed on the frontline (relative row 2).
// Flags (flag) must be placed in one of the HQs (relative row 0, col 1 or 4).
const SETUP_TEMPLATES = [
    // Template 1: Balanced (Flag Left)
    [
        ['engineer', 'flag', 'mine', 'lt_col', 'mine', 'captain'], // row 0 (back)
        ['spy', 'camp', 'major', 'camp', 'major_gen', 'lieutenant'], // row 1 (middle)
        ['commando', 'sub_lieutenant', 'general', 'marshal', 'airplane', 'engineer'] // row 2 (front)
    ],
    // Template 2: Defensive (Flag Right, heavily guarded)
    [
        ['captain', 'mine', 'engineer', 'lt_col', 'flag', 'engineer'],
        ['major_gen', 'camp', 'spy', 'camp', 'mine', 'colonel'],
        ['commando', 'airplane', 'general', 'marshal', 'sub_lieutenant', 'lieutenant']
    ],
    // Template 3: Aggressive (Flag Left, fast attackers frontline)
    [
        ['major', 'flag', 'mine', 'colonel', 'mine', 'captain'],
        ['lt_col', 'camp', 'spy', 'camp', 'engineer', 'lieutenant'],
        ['airplane', 'general', 'marshal', 'sub_lieutenant', 'engineer', 'commando']
    ]
];

// Shuffle helper
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Generate an AI layout based on template and random variations
function generateAiSetup(aiColor) {
    // Pick a template randomly
    const templateIndex = Math.floor(Math.random() * SETUP_TEMPLATES.length);
    const template = SETUP_TEMPLATES[templateIndex];
    
    // Create an actual layout matrix (3x6)
    const layout = template.map(row => [...row]);
    
    // We can swap some equivalent combat pieces to introduce variation
    // combatants: general, major_gen, colonel, lt_col, major, captain, lieutenant, sub_lieutenant
    // Let's identify their positions and shuffle them
    const interchangeable = ['colonel', 'lt_col', 'major', 'captain', 'lieutenant'];
    const positions = [];
    const piecesToShuffle = [];
    
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
            const piece = layout[r][c];
            // Don't shuffle camps, flags, mines, spy, marshal, general, engineer, airplane, commando to keep template structure
            if (interchangeable.includes(piece)) {
                positions.push({ r, c });
                piecesToShuffle.push(piece);
            }
        }
    }
    
    shuffleArray(piecesToShuffle);
    
    // Put back shuffled pieces
    positions.forEach((pos, idx) => {
        layout[pos.r][pos.c] = piecesToShuffle[idx];
    });
    
    // Map to actual board positions
    const setupPieces = [];
    const startRow = aiColor === 'white' ? 0 : 5;
    
    for (let relR = 0; relR < 3; relR++) {
        const boardR = aiColor === 'white' ? relR : 7 - relR;
        for (let c = 0; c < 6; c++) {
            const type = layout[relR][c];
            if (type !== 'camp') {
                setupPieces.push({
                    r: boardR,
                    c: c,
                    type: type,
                    color: aiColor
                });
            }
        }
    }
    
    return setupPieces;
}

// --- Rules & Battle Resolver ---
// Returns: 'attacker_win', 'defender_win', or 'draw'
function resolveBattle(attacker, defender) {
    if (attacker === defender) return 'draw';
    
    // Mine interaction
    if (defender === 'mine') {
        if (attacker === 'engineer') return 'attacker_win'; // Engineer sweeps mine
        return 'draw'; // Anyone else triggers mine, both explode
    }
    
    // Flag has no defense
    if (defender === 'flag') return 'attacker_win';
    
    // Spy interaction
    if (attacker === 'spy') {
        if (defender === 'marshal') return 'attacker_win'; // Spy kills Marshal
        return 'defender_win'; // Spy loses to everyone else
    }
    if (defender === 'spy') {
        return 'attacker_win'; // Spy loses on defense
    }
    
    // Engineer interaction
    if (attacker === 'engineer') {
        if (defender === 'flag' || defender === 'spy') return 'attacker_win';
        return 'defender_win'; // Weakest attacker
    }
    
    // Commando interaction
    if (attacker === 'commando') {
        if (defender === 'engineer' || defender === 'spy' || defender === 'flag') return 'attacker_win';
        return 'defender_win';
    }
    
    // Airplane interaction
    if (attacker === 'airplane') {
        // Airplane beats: sub_lieutenant, engineer, spy, commando, flag, mine (we checked mine above)
        const airplaneBeats = ['sub_lieutenant', 'engineer', 'spy', 'commando', 'flag'];
        if (airplaneBeats.includes(defender)) return 'attacker_win';
        return 'defender_win'; // Loses or draws with lieutenant or higher
    }
    if (defender === 'airplane') {
        // Defender airplane loses to lieutenant or higher, beats or draws with others
        const airplaneLosesTo = ['lieutenant', 'captain', 'major', 'lt_col', 'colonel', 'major_gen', 'general', 'marshal'];
        if (airplaneLosesTo.includes(attacker)) return 'attacker_win';
        return 'defender_win';
    }
    
    // Standard combat hierarchy comparison
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

// --- Movement Rules Validation ---
function isValidMove(from, to, board, playerColor) {
    const piece = board[from.r][from.c];
    if (!piece) return false;
    
    const dr = to.r - from.r;
    const dc = to.c - from.c;
    const dist = Math.abs(dr) + Math.abs(dc);
    
    // Cannot move to own piece
    const target = board[to.r][to.c];
    if (target && target.color === piece.color) return false;
    
    // Mine and Flag cannot move
    if (piece.type === 'mine' || piece.type === 'flag') return false;
    
    // Once in HQ, a piece cannot move
    if (isHQ(from.r, from.c)) return false;
    
    // Camp safety: Cannot attack a piece in camp
    if (isCamp(to.r, to.c) && target) return false;
    
    // River and Bridge restriction
    // River is between row 3 and row 4
    const crossesRiver = (from.r <= 3 && to.r >= 4) || (from.r >= 4 && to.r <= 3);
    
    // Bridge Check helper
    function isBridgeRoute(fR, fC, tR, tC) {
        // Vertical bridges
        if (fC === 1 && tC === 1 && ((fR === 3 && tR === 4) || (fR === 4 && tR === 3))) return true;
        if (fC === 4 && tC === 4 && ((fR === 3 && tR === 4) || (fR === 4 && tR === 3))) return true;
        // Diagonal bridges
        if (fR === 3 && fC === 2 && tR === 4 && tC === 3) return true;
        if (fR === 4 && fC === 3 && tR === 3 && tC === 2) return true;
        if (fR === 3 && fC === 3 && tR === 4 && tC === 2) return true;
        if (fR === 4 && fC === 2 && tR === 3 && tC === 3) return true;
        return false;
    }
    
    // Airplane movement (Flies over everything)
    if (piece.type === 'airplane') {
        // Moves straight in any direction (orthogonal) any distance, jumping over pieces
        if (dr !== 0 && dc !== 0) return false; // Orthogonal only
        // River jump is free for airplane
        return true;
    }
    
    // Engineer movement (Moves straight any distance, but blocked by pieces)
    if (piece.type === 'engineer') {
        if (dr !== 0 && dc !== 0) return false; // Orthogonal only
        
        // Path check: must not hit any piece before landing
        const stepR = dr === 0 ? 0 : Math.sign(dr);
        const stepC = dc === 0 ? 0 : Math.sign(dc);
        let currR = from.r + stepR;
        let currC = from.c + stepC;
        
        while (currR !== to.r || currC !== to.c) {
            if (board[currR][currC]) return false; // Blocked by piece
            
            // River check: if crossing river between curr and next
            const nextR = currR + stepR;
            const nextC = currC + stepC;
            const crossesRiverHere = (currR <= 3 && nextR >= 4) || (currR >= 4 && nextR <= 3);
            if (crossesRiverHere) {
                // Engineers can cross river anywhere (custom advantage) or only on bridge?
                // Standard rules say engineers can cross river anywhere on road lines.
                // Let's allow engineer to cross river anywhere as long as path is clear.
            }
            
            currR = nextR;
            currC = nextC;
        }
        return true;
    }
    
    // Standard pieces movement (Moves 1 step in any orthogonal/diagonal direction depending on rule)
    // In Gunjin Shogi, typical pieces move 1 step in 4 cardinal directions (up, down, left, right).
    // Let's implement 4 cardinal directions.
    if (dist !== 1) return false; // Must be adjacent (1 step)
    
    // If crossing river, must use a bridge route
    if (crossesRiver) {
        return isBridgeRoute(from.r, from.c, to.r, to.c);
    }
    
    return true;
}

// Generate all valid moves for a color
function generateMoves(board, color) {
    const moves = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                // Find potential target positions
                // Airplane & Engineer can move multiple cells, others move 1 cell
                const targets = [];
                
                if (piece.type === 'airplane' || piece.type === 'engineer') {
                    // Orthogonal rays
                    const dirs = [{ r: 1, c: 0 }, { r: -1, c: 0 }, { r: 0, c: 1 }, { r: 0, c: -1 }];
                    dirs.forEach(d => {
                        let step = 1;
                        while (true) {
                            const tr = r + d.r * step;
                            const tc = c + d.c * step;
                            if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) break;
                            
                            targets.push({ r: tr, c: tc });
                            
                            // If blocked, stop ray (airplane flies OVER but cannot land beyond a blocked square? Actually, airplane can jump, so it can land on ANY orthogonal cell as long as own piece isn't there. If opponent piece is there, it can land there to attack. But it cannot land on empty cells BEYOND an opponent piece?
                            // In Gunjin Shogi, airplane can jump over pieces and land anywhere. But to keep AI code simple, let's treat it as flying over everything.
                            if (board[tr][tc]) {
                                if (piece.type === 'engineer') {
                                    break; // Engineer is blocked
                                }
                            }
                            step++;
                        }
                    });
                } else {
                    // Adjacent 4 directions
                    const adj = [
                        { r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 }
                    ];
                    adj.forEach(p => {
                        if (p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS) {
                            targets.push(p);
                        }
                    });
                }
                
                targets.forEach(t => {
                    if (isValidMove({ r, c }, t, board, color)) {
                        moves.push({
                            from: { r, c },
                            to: t,
                            pieceType: piece.type
                        });
                    }
                });
            }
        }
    }
    return moves;
}

// --- Opponent Model & AI Evaluation ---
// This keeps track of what the AI knows about player's pieces
class OpponentModel {
    constructor(cemetery) {
        this.movedPieces = {}; // Key: "r,c" -> boolean (true if moved, so not mine/flag)
        this.combatMinRank = {}; // Key: "r,c" -> minimum combat rank determined by battle history
        this.cemetery = cemetery || []; // Array of pieces that have died
    }
    
    updateMove(from, to) {
        const fromKey = `${from.r},${from.c}`;
        const toKey = `${to.r},${to.c}`;
        
        // Transfer info to new position
        this.movedPieces[toKey] = true;
        if (this.combatMinRank[fromKey]) {
            this.combatMinRank[toKey] = this.combatMinRank[fromKey];
        }
        
        delete this.movedPieces[fromKey];
        delete this.combatMinRank[fromKey];
    }
    
    recordBattle(pos, opponentPieceType, aiPieceType, result) {
        const key = `${pos.r},${pos.c}`;
        // If opponent won, it must be stronger than our piece
        const rank = {
            'marshal': 9, 'general': 8, 'major_gen': 7, 'colonel': 6,
            'lt_col': 5, 'major': 4, 'captain': 3, 'lieutenant': 2, 'sub_lieutenant': 1,
            'commando': 0.5, 'engineer': 0.2, 'spy': 0.1
        };
        
        if (result === 'defender_win') { // AI attacked and lost, opponent is defender
            const minRank = rank[aiPieceType] || 0;
            this.combatMinRank[key] = Math.max(this.combatMinRank[key] || 0, minRank);
        }
    }
    
    // Estimate a piece's value
    getEstimatedValue(r, c, actualPiece) {
        if (!actualPiece) return 0;
        
        const key = `${r},${c}`;
        
        // If AI is evaluating its own pieces, value is exact
        if (actualPiece.color !== 'player') { // assuming 'player' is opponent to AI
            return PIECE_VALUES[actualPiece.type] || 0;
        }
        
        // Opponent's pieces: use heuristics
        let baseVal = PIECE_VALUES[actualPiece.type];
        
        // If flag, return its true value (if AI knows or has high suspicion)
        if (actualPiece.type === 'flag') {
            // Is it in HQ? Flag is always in HQ.
            if (isHQ(r, c)) return 800; // High value target
            return 0; // If not in HQ, it can't be flag (unless rule violated, but in code it shouldn't happen)
        }
        
        // If it has moved, it cannot be mine or flag
        if (this.movedPieces[key]) {
            if (actualPiece.type === 'mine') return 0; // Model discrepancy (should not happen)
        }
        
        // Combat history minimum rank check
        if (this.combatMinRank[key]) {
            // If actual piece is weaker than our estimation, adjust (should not happen unless cheating)
            const minVal = this.combatMinRank[key] * 10;
            baseVal = Math.max(baseVal, minVal);
        }
        
        return baseVal;
    }
}

// Evaluate full board state
function evaluateBoard(board, aiColor, opponentModel) {
    let score = 0;
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (piece) {
                const val = opponentModel.getEstimatedValue(r, c, piece);
                if (piece.color === aiColor) {
                    score += val;
                    
                    // Position bonus for AI pieces
                    // Encourage combat pieces (except flag, mine) to move forward
                    if (piece.type !== 'flag' && piece.type !== 'mine') {
                        // Dist from self back line (if white, row 0. if black, row 7)
                        const distFromHome = aiColor === 'white' ? r : 7 - r;
                        score += distFromHome * 1.5; // Encourages forward movement
                        
                        // HQ proximity bonus (attacking opponent HQ)
                        const oppHQs = aiColor === 'white' ? [{ r: 7, c: 1 }, { r: 7, c: 4 }] : [{ r: 0, c: 1 }, { r: 0, c: 4 }];
                        oppHQs.forEach(hq => {
                            const dist = Math.abs(hq.r - r) + Math.abs(hq.c - c);
                            score += (10 - dist) * 2; // Closer to enemy HQ is better
                        });
                    }
                    
                    // Camp bonus: being in camp is safe, slightly good for key pieces
                    if (isCamp(r, c) && ['marshal', 'general', 'spy'].includes(piece.type)) {
                        score += 5;
                    }
                } else {
                    score -= val;
                    
                    // Defensive evaluation: threat of opponent near our HQ
                    const selfHQs = aiColor === 'white' ? [{ r: 0, c: 1 }, { r: 0, c: 4 }] : [{ r: 7, c: 1 }, { r: 7, c: 4 }];
                    selfHQs.forEach(hq => {
                        const dist = Math.abs(hq.r - r) + Math.abs(hq.c - c);
                        if (dist <= 2) {
                            score -= (4 - dist) * 15; // Penalty for having enemy close to home HQ
                        }
                    });
                }
            }
        }
    }
    
    return score;
}

// Alpha-Beta Minimax Search
function alphaBeta(board, depth, alpha, beta, isMaximizing, aiColor, opponentModel) {
    // Terminal conditions
    // Check if Flag captured or no moves left
    let aiFlagAlive = false;
    let oppFlagAlive = false;
    let aiMobilePieces = 0;
    let oppMobilePieces = 0;
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const p = board[r][c];
            if (p) {
                if (p.type === 'flag') {
                    if (p.color === aiColor) aiFlagAlive = true;
                    else oppFlagAlive = true;
                } else if (p.type !== 'mine') {
                    if (p.color === aiColor) aiMobilePieces++;
                    else oppMobilePieces++;
                }
            }
        }
    }
    
    if (!aiFlagAlive) return -100000 + (3 - depth); // AI lost
    if (!oppFlagAlive) return 100000 - (3 - depth);  // AI won
    if (aiMobilePieces === 0) return -90000;
    if (oppMobilePieces === 0) return 90000;
    
    if (depth === 0) {
        return evaluateBoard(board, aiColor, opponentModel);
    }
    
    const activeColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    const moves = generateMoves(board, activeColor);
    
    if (moves.length === 0) {
        return isMaximizing ? -90000 : 90000;
    }
    
    // Sort moves to optimize AB pruning
    // Simple sort: attacks first
    moves.sort((a, b) => {
        const targetA = board[a.to.r][a.to.c] ? 1 : 0;
        const targetB = board[b.to.r][b.to.c] ? 1 : 0;
        return targetB - targetA;
    });
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            
            // Execute move (simulate)
            const backupFrom = board[move.from.r][move.from.c];
            const backupTo = board[move.to.r][move.to.c];
            
            // Resolve battle if any
            let result = null;
            if (backupTo) {
                result = resolveBattle(backupFrom.type, backupTo.type);
                if (result === 'attacker_win') {
                    board[move.to.r][move.to.c] = backupFrom;
                    board[move.from.r][move.from.c] = null;
                } else if (result === 'defender_win') {
                    board[move.from.r][move.from.c] = null;
                } else { // draw
                    board[move.from.r][move.from.c] = null;
                    board[move.to.r][move.to.c] = null;
                }
            } else {
                board[move.to.r][move.to.c] = backupFrom;
                board[move.from.r][move.from.c] = null;
            }
            
            const evaluation = alphaBeta(board, depth - 1, alpha, beta, false, aiColor, opponentModel);
            
            // Undo move
            board[move.from.r][move.from.c] = backupFrom;
            board[move.to.r][move.to.c] = backupTo;
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break; // Pruning
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            
            // Execute move (simulate)
            const backupFrom = board[move.from.r][move.from.c];
            const backupTo = board[move.to.r][move.to.c];
            
            // Resolve battle if any
            let result = null;
            if (backupTo) {
                result = resolveBattle(backupFrom.type, backupTo.type);
                if (result === 'attacker_win') {
                    board[move.to.r][move.to.c] = backupFrom;
                    board[move.from.r][move.from.c] = null;
                } else if (result === 'defender_win') {
                    board[move.from.r][move.from.c] = null;
                } else { // draw
                    board[move.from.r][move.from.c] = null;
                    board[move.to.r][move.to.c] = null;
                }
            } else {
                board[move.to.r][move.to.c] = backupFrom;
                board[move.from.r][move.from.c] = null;
            }
            
            const evaluation = alphaBeta(board, depth - 1, alpha, beta, true, aiColor, opponentModel);
            
            // Undo move
            board[move.from.r][move.from.c] = backupFrom;
            board[move.to.r][move.to.c] = backupTo;
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break; // Pruning
        }
        return minEval;
    }
}

// --- Main Message Listener ---
let aiOpponentModel = null;

onmessage = function(e) {
    const { action, board, aiColor, difficulty, history, cemetery, from, to, battleInfo } = e.data;
    
    if (action === 'setup') {
        // Generate initial piece placement
        const pieces = generateAiSetup(aiColor);
        postMessage({ action: 'setup', pieces });
        return;
    }
    
    if (action === 'think') {
        // Initialize or update opponent model
        if (!aiOpponentModel) {
            aiOpponentModel = new OpponentModel(cemetery);
        } else {
            aiOpponentModel.cemetery = cemetery || [];
        }
        
        // Update model with the last player move if provided
        if (from && to) {
            aiOpponentModel.updateMove(from, to);
        }
        
        // Update model with battle result if provided
        if (battleInfo) {
            aiOpponentModel.recordBattle(battleInfo.pos, battleInfo.oppType, battleInfo.aiType, battleInfo.result);
        }
        
        // Determine search depth based on difficulty
        let depth = 2; // Medium default
        if (difficulty === 'easy') depth = 1;
        else if (difficulty === 'hard') depth = 3;
        
        const moves = generateMoves(board, aiColor);
        
        if (moves.length === 0) {
            // AI has no moves, must resign
            postMessage({ action: 'move', move: null });
            return;
        }
        
        let bestMove = null;
        let bestValue = -Infinity;
        
        // Simple shuffle of moves to introduce variety among equal evaluated moves
        shuffleArray(moves);
        
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            
            // Execute move (simulate)
            const backupFrom = board[move.from.r][move.from.c];
            const backupTo = board[move.to.r][move.to.c];
            
            let result = null;
            if (backupTo) {
                result = resolveBattle(backupFrom.type, backupTo.type);
                if (result === 'attacker_win') {
                    board[move.to.r][move.to.c] = backupFrom;
                    board[move.from.r][move.from.c] = null;
                } else if (result === 'defender_win') {
                    board[move.from.r][move.from.c] = null;
                } else { // draw
                    board[move.from.r][move.from.c] = null;
                    board[move.to.r][move.to.c] = null;
                }
            } else {
                board[move.to.r][move.to.c] = backupFrom;
                board[move.from.r][move.from.c] = null;
            }
            
            const boardVal = alphaBeta(board, depth - 1, -Infinity, Infinity, false, aiColor, aiOpponentModel);
            
            // Undo move
            board[move.from.r][move.from.c] = backupFrom;
            board[move.to.r][move.to.c] = backupTo;
            
            if (boardVal > bestValue) {
                bestValue = boardVal;
                bestMove = move;
            }
        }
        
        // Return selected best move
        postMessage({ action: 'move', move: bestMove });
    }
};
