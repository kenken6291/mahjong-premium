// --- ゲームの基本設定 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 16;
const MAP_WIDTH = 28;
const MAP_HEIGHT = 31;

// 安全なオーディオ再生ヘルパー
function playSound(methodName, ...args) {
    if (window.gameAudio && typeof window.gameAudio[methodName] === 'function') {
        try {
            window.gameAudio[methodName](...args);
        } catch (e) {
            console.error(`Error playing sound ${methodName}:`, e);
        }
    }
}

// タイルマップ定義 (0:空, 1:壁, 2:ドット, 3:パワーエサ, 4:ゲート, 5:ゴーストハウス)
const ORIGINAL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,1,2,1,1,2,1,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = JSON.parse(JSON.stringify(ORIGINAL_MAP));

// 方向の定義
const DIR_UP = { x: 0, y: -1, angle: 1.5 * Math.PI, name: 'up' };
const DIR_DOWN = { x: 0, y: 1, angle: 0.5 * Math.PI, name: 'down' };
const DIR_LEFT = { x: -1, y: 0, angle: Math.PI, name: 'left' };
const DIR_RIGHT = { x: 1, y: 0, angle: 0, name: 'right' };
const DIR_NONE = { x: 0, y: 0, angle: 0, name: 'none' };

// ゲーム状態
const STATE_START = 'start';
const STATE_PLAY = 'play';
const STATE_PAUSE = 'pause';
const STATE_DEATH = 'death';
const STATE_CLEAR = 'clear';
const STATE_OVER = 'over';

let gameState = STATE_START;
let score = 0;
let highScore = 0;
let level = 1;
let lives = 3;
let totalDots = 0;
let dotsEaten = 0;
let globalTimer = 0;

// イジケモードの管理
let frightenedTimer = 0;
let frightenedDuration = 600; // フレーム数 (約10秒)
let ghostEatenMultiplier = 1; // 連続で食べた時のスコア倍率

// フローティングスコア（+200などの文字アニメーション）の管理用配列
let floatingScores = [];

// ハイスコア読み込み
try {
    if (localStorage.getItem('pacman_neon_highscore')) {
        highScore = parseInt(localStorage.getItem('pacman_neon_highscore'));
        document.getElementById('highscore').innerText = String(highScore).padStart(6, '0');
    }
} catch (e) {
    console.warn("LocalStorage is not available:", e);
}

// --- キャラクターの定義 ---

// 1. パックマン
const pacman = {
    x: 14 * TILE_SIZE + TILE_SIZE / 2,
    y: 23 * TILE_SIZE + TILE_SIZE / 2,
    gridX: 14,
    gridY: 23,
    speed: 2,
    dir: DIR_LEFT,
    nextDir: DIR_LEFT,
    mouthAngle: 0.2,
    mouthClosing: false,
    color: '#ffe600',
    
    reset() {
        this.gridX = 14;
        this.gridY = 23;
        this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
        this.dir = DIR_LEFT;
        this.nextDir = DIR_LEFT;
        this.mouthAngle = 0.2;
        this.mouthClosing = false;
    },

    update() {
        // グリッドに完全に揃っているかチェック
        const isAligned = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0 && (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

        if (isAligned) {
            this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
            this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);

            // トンネルの処理
            if (this.gridX < 0) {
                this.gridX = MAP_WIDTH - 1;
                this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
            } else if (this.gridX >= MAP_WIDTH) {
                this.gridX = 0;
                this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
            }

            // 先行入力方向が移動可能か確認
            if (canMove(this.gridX, this.gridY, this.nextDir, false)) {
                this.dir = this.nextDir;
            }
        }

        // 現在の方向に進めるか確認
        const nextGridX = this.gridX + this.dir.x;
        const nextGridY = this.gridY + this.dir.y;
        
        let shouldMove = true;
        if (isAligned) {
            if (!canMove(this.gridX, this.gridY, this.dir, false)) {
                shouldMove = false;
            }
        }

        if (shouldMove) {
            this.x += this.dir.x * this.speed;
            this.y += this.dir.y * this.speed;

            // アニメーション (口の開閉)
            if (this.mouthClosing) {
                this.mouthAngle -= 0.03;
                if (this.mouthAngle <= 0.01) {
                    this.mouthAngle = 0.01;
                    this.mouthClosing = false;
                }
            } else {
                this.mouthAngle += 0.03;
                if (this.mouthAngle >= 0.4) {
                    this.mouthAngle = 0.4;
                    this.mouthClosing = true;
                }
            }
        } else {
            this.mouthAngle = 0.2; // 停止時は口を少し開ける
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // パックマンの向きに合わせて回転
        ctx.rotate(this.dir.angle);

        // ネオン風グローエフェクト
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // 口を開けた扇形を描画
        ctx.arc(0, 0, TILE_SIZE / 2 - 1, this.mouthAngle * Math.PI, (2 - this.mouthAngle) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
};

// 2. ゴーストクラス
class Ghost {
    constructor(name, color, scatterX, scatterY, homeGridX, homeGridY, dotLimit) {
        this.name = name;
        this.color = color;
        
        // 初期位置とターゲット
        this.homeX = homeGridX * TILE_SIZE + TILE_SIZE / 2;
        this.homeY = homeGridY * TILE_SIZE + TILE_SIZE / 2;
        this.scatterTarget = { x: scatterX, y: scatterY };
        this.dotLimit = dotLimit; // 巣から出るために必要な捕食ドット数
        
        this.reset();
    }

    reset() {
        this.x = this.homeX;
        this.y = this.homeY;
        this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
        this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);
        this.dir = DIR_UP;
        this.speed = 2;
        
        // 状態: 'house' (巣の中), 'exit' (脱出中), 'chase', 'scatter', 'frightened', 'eaten'
        this.mode = 'house';
        
        // Blinky(赤)は最初から外にいる
        if (this.name === 'Blinky') {
            this.mode = 'scatter';
            this.y = 11 * TILE_SIZE + TILE_SIZE / 2;
            this.gridY = 11;
        }

        this.target = { x: 0, y: 0 };
        this.animationFrame = 0;
    }

    update() {
        this.animationFrame++;
        
        // モード別の速度調整
        if (this.mode === 'frightened') {
            this.speed = 1; // イジケ中は遅い
        } else if (this.mode === 'eaten') {
            this.speed = 4; // 食べられた目は超高速
        } else {
            this.speed = 2; // 通常速度
        }

        const isAligned = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0 && (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

        if (isAligned) {
            this.gridX = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
            this.gridY = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);

            // トンネルの処理
            if (this.gridX < 0) {
                this.gridX = MAP_WIDTH - 1;
                this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
            } else if (this.gridX >= MAP_WIDTH) {
                this.gridX = 0;
                this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
            }

            // 巣からの脱出処理
            if (this.mode === 'house') {
                if (dotsEaten >= this.dotLimit || globalTimer > 300) {
                    this.mode = 'exit';
                } else {
                    // 巣の中での上下運動
                    if (this.gridY === 13) this.dir = DIR_UP;
                    if (this.gridY === 15) this.dir = DIR_DOWN;
                }
            }

            if (this.mode === 'exit') {
                // 巣のゲートに向かって直進
                this.target = { x: 14, y: 11 };
                if (this.gridX < 14) this.dir = DIR_RIGHT;
                else if (this.gridX > 14) this.dir = DIR_LEFT;
                else if (this.gridY > 11) this.dir = DIR_UP;
                
                if (this.gridX === 14 && this.gridY === 11) {
                    this.mode = 'scatter';
                    this.dir = DIR_LEFT;
                }
            } else if (this.mode === 'eaten') {
                // 巣に戻ったら復活
                if (this.gridX === 14 && this.gridY === 14) {
                    this.mode = 'exit';
                } else {
                    this.target = { x: 14, y: 14 };
                    this.dir = this.getNextDirection();
                }
            } else if (this.mode === 'frightened') {
                // ランダム移動
                this.dir = this.getRandomDirection();
            } else {
                // 通常追跡または散開モード
                this.updateTarget();
                this.dir = this.getNextDirection();
            }
        }

        // 移動
        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;
    }

    updateTarget() {
        // 各ゴーストの行動特性
        if (this.mode === 'scatter') {
            this.target = this.scatterTarget;
            return;
        }

        // CHASE モード
        switch(this.name) {
            case 'Blinky': // 赤：直接追跡
                this.target = { x: pacman.gridX, y: pacman.gridY };
                break;

            case 'Pinky': // ピンク：4マス先回り
                this.target = {
                    x: pacman.gridX + pacman.dir.x * 4,
                    y: pacman.gridY + pacman.dir.y * 4
                };
                // バグ再現：上を向いているときは左にも4マスずれる
                if (pacman.dir === DIR_UP) {
                    this.target.x -= 4;
                }
                break;

            case 'Inky': // 水色：BlinkyとPacmanの連動
                const pX = pacman.gridX + pacman.dir.x * 2;
                const pY = pacman.gridY + pacman.dir.y * 2;
                if (pacman.dir === DIR_UP) pX -= 2;

                const blinky = ghosts[0];
                this.target = {
                    x: pX + (pX - blinky.gridX),
                    y: pY + (pY - blinky.gridY)
                };
                break;

            case 'Clyde': // オレンジ：きまぐれ（距離8以内で逃走、外で追跡）
                const dist = Math.hypot(this.gridX - pacman.gridX, this.gridY - pacman.gridY);
                if (dist > 8) {
                    this.target = { x: pacman.gridX, y: pacman.gridY };
                } else {
                    this.target = this.scatterTarget;
                }
                break;
        }
    }

    getNextDirection() {
        // 次の交差点でターゲットに最も近づく方向を選択
        // 戻る方向は禁止
        const opposite = getOppositeDirection(this.dir);
        const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
        let bestDir = this.dir;
        let minDistance = Infinity;

        directions.forEach(d => {
            if (d.name === opposite.name) return; // Uターン禁止

            // 壁チェック (ゴーストハウスのゲートは eaten と exit モード時のみ通過可能)
            const isGateAllowed = (this.mode === 'eaten' || this.mode === 'exit');
            if (canMove(this.gridX, this.gridY, d, isGateAllowed)) {
                const nextX = this.gridX + d.x;
                const nextY = this.gridY + d.y;
                const distance = Math.hypot(nextX - this.target.x, nextY - this.target.y);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestDir = d;
                }
            }
        });

        return bestDir;
    }

    getRandomDirection() {
        const opposite = getOppositeDirection(this.dir);
        const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
        const validDirs = [];

        directions.forEach(d => {
            if (d.name === opposite.name) return;
            if (canMove(this.gridX, this.gridY, d, false)) {
                validDirs.push(d);
            }
        });

        if (validDirs.length > 0) {
            return validDirs[Math.floor(Math.random() * validDirs.length)];
        }
        return opposite; // 行き止まりならUターン
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // ネオンカラーの決定
        let bodyColor = this.color;
        let isFlickering = false;

        if (this.mode === 'frightened') {
            const timeLeft = frightenedTimer;
            // 終了直前の2秒間（120フレーム）点滅
            if (timeLeft < 120 && Math.floor(timeLeft / 10) % 2 === 0) {
                bodyColor = '#ffffff'; // 点滅時の白
            } else {
                bodyColor = '#0055ff'; // イジケ時の青
            }
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = bodyColor;

        if (this.mode !== 'eaten') {
            // ゴーストの体の描画
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            // 頭部の半円
            ctx.arc(0, -2, TILE_SIZE / 2 - 1, Math.PI, 0, false);
            // 胴体
            ctx.lineTo(TILE_SIZE / 2 - 1, TILE_SIZE / 2 - 2);
            
            // 足元のウネウネ（波のアニメーション）
            const waveOffset = Math.sin(this.animationFrame * 0.15) * 2;
            ctx.lineTo(TILE_SIZE / 4, TILE_SIZE / 2 - 4 + waveOffset);
            ctx.lineTo(0, TILE_SIZE / 2 - 2 - waveOffset);
            ctx.lineTo(-TILE_SIZE / 4, TILE_SIZE / 2 - 4 + waveOffset);
            ctx.lineTo(-(TILE_SIZE / 2 - 1), TILE_SIZE / 2 - 2);
            
            ctx.closePath();
            ctx.fill();
        }

        // 目の描画（通常時＆イジケ時＆食べられた時共通）
        if (this.mode === 'frightened') {
            // イジケ目の描画（怯えた表情の小さな目）
            ctx.fillStyle = '#ffb852'; // オレンジ色の怒り眉/悲しい目
            ctx.fillRect(-4, -4, 2, 2);
            ctx.fillRect(2, -4, 2, 2);
            // 波打つ口
            ctx.strokeStyle = '#ffb852';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, 2);
            ctx.lineTo(-2, 0);
            ctx.lineTo(0, 2);
            ctx.lineTo(2, 0);
            ctx.lineTo(4, 2);
            ctx.stroke();
        } else {
            // 通常の目（白目と黒目。向いている方向に視線が動く）
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-3, -3, 3, 0, 2 * Math.PI);
            ctx.arc(3, -3, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#0000ff';
            ctx.beginPath();
            // 視線のオフセット
            const dx = this.dir.x * 1.5;
            const dy = this.dir.y * 1.5;
            ctx.arc(-3 + dx, -3 + dy, 1.5, 0, 2 * Math.PI);
            ctx.arc(3 + dx, -3 + dy, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ゴーストのインスタンス作成
const ghosts = [
    // Blinky (赤): 散開ターゲット右上, 初期位置 (14, 11), ドット制限 0
    new Ghost('Blinky', '#ff3333', MAP_WIDTH - 2, -2, 14, 11, 0),
    // Pinky (ピンク): 散開ターゲット左上, 初期位置 (14, 14), ドット制限 0
    new Ghost('Pinky', '#ffb8ff', 2, -2, 14, 14, 0),
    // Inky (水色): 散開ターゲット右下, 初期位置 (12, 14), ドット制限 30
    new Ghost('Inky', '#00ffff', MAP_WIDTH - 1, MAP_HEIGHT + 2, 12, 14, 30),
    // Clyde (オレンジ): 散開ターゲット左下, 初期位置 (16, 14), ドット制限 60
    new Ghost('Clyde', '#ffb852', 0, MAP_HEIGHT + 2, 16, 14, 60)
];

// --- ヘルパー関数 ---

// 反対方向を取得
function getOppositeDirection(dir) {
    if (dir === DIR_UP) return DIR_DOWN;
    if (dir === DIR_DOWN) return DIR_UP;
    if (dir === DIR_LEFT) return DIR_RIGHT;
    if (dir === DIR_RIGHT) return DIR_LEFT;
    return DIR_NONE;
}

// 移動可能か判定
function canMove(gridX, gridY, dir, isGateAllowed) {
    const nextX = gridX + dir.x;
    const nextY = gridY + dir.y;

    // トンネル部ははみ出し移動OK
    if (nextY === 13 && (nextX < 0 || nextX >= MAP_WIDTH)) {
        return true;
    }

    if (nextX < 0 || nextX >= MAP_WIDTH || nextY < 0 || nextY >= MAP_HEIGHT) {
        return false;
    }

    const tile = map[nextY][nextX];
    
    if (tile === 1) return false; // 壁
    if (tile === 4) return isGateAllowed; // 巣のゲート
    return true;
}

// 全ドット数を数える
function countTotalDots() {
    let count = 0;
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            if (map[r][c] === 2 || map[r][c] === 3) {
                count++;
            }
        }
    }
    return count;
}

totalDots = countTotalDots();

// --- 描画処理 ---

// マップの描画（ネオン調）
function drawMap() {
    ctx.save();
    
    // ネオンブルーの発光スタイル
    ctx.strokeStyle = '#0055ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00aaff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            const tile = map[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (tile === 1) {
                // 周囲の壁と繋げるように綺麗に描画
                ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (tile === 2) {
                // ドット（小さな点）
                ctx.save();
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#ffea00';
                ctx.fillStyle = '#ffb800';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            } else if (tile === 3) {
                // パワーエサ（点滅する大きな円）
                const pulseRadius = 5 + Math.sin(globalTimer * 0.15) * 1.5;
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ffe600';
                ctx.fillStyle = '#ffe600';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulseRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            } else if (tile === 4) {
                // ゴーストのゲート
                ctx.save();
                ctx.strokeStyle = '#ffb8ff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ffb8ff';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.moveTo(x, y + TILE_SIZE / 2);
                ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
    ctx.restore();
}

// スコアとライフのUI更新
function updateUI() {
    document.getElementById('score').innerText = String(score).padStart(6, '0');
    document.getElementById('level').innerText = level;
    
    // ライフアイコンの動的描画
    const livesDiv = document.getElementById('lives');
    livesDiv.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const lifeIcon = document.createElement('div');
        lifeIcon.className = 'life-icon';
        livesDiv.appendChild(lifeIcon);
    }
}

// --- 衝突判定＆イベント ---

// ドット・エサ捕食チェック
function checkEatenItems() {
    const isAligned = (pacman.x - TILE_SIZE / 2) % TILE_SIZE === 0 && (pacman.y - TILE_SIZE / 2) % TILE_SIZE === 0;
    if (!isAligned) return;

    const tile = map[pacman.gridY][pacman.gridX];
    
    if (tile === 2) {
        // 普通のドット
        map[pacman.gridY][pacman.gridX] = 0;
        score += 10;
        dotsEaten++;
        playSound('playWaka');
        checkHighScore();
    } else if (tile === 3) {
        // パワーエサ
        map[pacman.gridY][pacman.gridX] = 0;
        score += 50;
        dotsEaten++;
        playSound('playPowerPellet');
        
        // ゴースト全員をイジケ状態にする
        frightenedTimer = frightenedDuration;
        ghostEatenMultiplier = 1;
        ghosts.forEach(g => {
            if (g.mode !== 'house' && g.mode !== 'exit' && g.mode !== 'eaten') {
                g.mode = 'frightened';
                g.dir = getOppositeDirection(g.dir); // 即座に反転
            }
        });
        playSound('startPowerSiren');
        checkHighScore();
    }

    // クリアチェック
    if (dotsEaten >= totalDots) {
        gameState = STATE_CLEAR;
        playSound('playLevelComplete');
        setTimeout(nextLevel, 2000);
    }
}

// ゴーストとの衝突判定
function checkGhostCollisions() {
    if (gameState !== STATE_PLAY) return;

    for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        // 近接度チェック (ピクセル距離で判定)
        const dist = Math.hypot(pacman.x - g.x, pacman.y - g.y);
        
        if (dist < TILE_SIZE * 0.8) {
            if (g.mode === 'frightened') {
                // ゴーストを食べる
                g.mode = 'eaten';
                const points = 200 * ghostEatenMultiplier;
                score += points;
                ghostEatenMultiplier *= 2; // 次に食べたゴーストはスコア2倍
                playSound('playEatGhost');
                
                // フローティングスコア等の視覚フィードバックを登録（描画フェーズで安全に描画）
                floatingScores.push({
                    x: g.x,
                    y: g.y,
                    text: points,
                    timer: 45 // 45フレーム表示
                });
                
                checkHighScore();
                break; // 同時衝突回避のためブレイク
            } else if (g.mode !== 'eaten' && g.mode !== 'house' && g.mode !== 'exit') {
                // パックマン死亡
                gameState = STATE_DEATH;
                playSound('playDeath');
                setTimeout(handleDeath, 1500);
                break; // 死亡処理の重複登録（フリーズバグ）を防ぐために即ブレイク！
            }
        }
    }
}

// ハイスコア更新チェック
function checkHighScore() {
    if (score > highScore) {
        highScore = score;
        try {
            localStorage.setItem('pacman_neon_highscore', highScore);
        } catch (e) {
            console.warn("Could not save high score to LocalStorage:", e);
        }
        document.getElementById('highscore').innerText = String(highScore).padStart(6, '0');
    }
}

// 死亡処理
function handleDeath() {
    try {
        lives--;
        if (lives <= 0) {
            gameState = STATE_OVER;
            showResultModal('GAME OVER', 'over');
        } else {
            // キャラクターだけリセット
            pacman.reset();
            ghosts.forEach(g => {
                try {
                    g.reset();
                } catch (ge) {
                    console.error("Error resetting ghost:", ge);
                }
            });
            gameState = STATE_PLAY;
            playSound('startSiren');
        }
    } catch (e) {
        console.error("Error during handleDeath:", e);
    }
}

// 次のレベル（クリア）処理
function nextLevel() {
    level++;
    map = JSON.parse(JSON.stringify(ORIGINAL_MAP));
    dotsEaten = 0;
    frightenedDuration = Math.max(200, 600 - (level * 50)); // レベルアップでイジケ時間短縮
    pacman.reset();
    ghosts.forEach(g => g.reset());
    gameState = STATE_PLAY;
    playSound('startSiren');
}

// --- リザルトモーダル表示 ---
function showResultModal(title, styleClass) {
    const modal = document.getElementById('result-modal');
    const titleEl = document.getElementById('modal-title');
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-level').innerText = level;
    
    titleEl.innerText = title;
    titleEl.className = `modal-title ${styleClass}`;
    
    modal.classList.add('active');
}

function hideResultModal() {
    document.getElementById('result-modal').classList.remove('active');
}

// --- メインゲームループ ---
function gameLoop() {
    try {
        globalTimer++;

        // 画面クリア
        ctx.fillStyle = '#030008';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // マップとUI描画
        drawMap();
        updateUI();

        if (gameState === STATE_PLAY) {
            // モード変更タイマー（CHASEとSCATTERの周期切り替え）
            // 20秒CHASE, 7秒SCATTERの繰り返し
            const cycle = globalTimer % 1620; // 約27秒周期
            
            // イジケ時間の減少
            if (frightenedTimer > 0) {
                frightenedTimer--;
                if (frightenedTimer === 0) {
                    playSound('stopPowerSiren');
                    playSound('startSiren');
                    ghosts.forEach(g => {
                        if (g.mode === 'frightened') g.mode = 'chase';
                    });
                }
            }

            ghosts.forEach(g => {
                if (g.mode !== 'house' && g.mode !== 'exit' && g.mode !== 'eaten' && frightenedTimer === 0) {
                    if (cycle < 1200) {
                        g.mode = 'chase';
                    } else {
                        g.mode = 'scatter';
                    }
                }
            });

            // キャラクター位置更新
            pacman.update();
            ghosts.forEach(g => g.update());

            // 衝突チェック
            checkEatenItems();
            checkGhostCollisions();
        }

        // プレイヤーとゴーストの描画
        if (gameState !== STATE_DEATH) {
            pacman.draw();
            ghosts.forEach(g => g.draw());
        } else {
            // 死亡時のパックマンの簡単な消滅エフェクト
            try {
                ctx.save();
                ctx.translate(pacman.x, pacman.y);
                ctx.fillStyle = '#ffe600';
                ctx.beginPath();
                const deathProgress = (globalTimer % 30) / 30; // 0〜1
                const radius = Math.max(0.1, (TILE_SIZE / 2) * (1 - deathProgress));
                ctx.arc(0, 0, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            } catch (e) {
                console.error("Error drawing death effect:", e);
                try { ctx.restore(); } catch (_) {}
            }
        }

        // フローティングスコアの安全な描画と更新
        for (let i = floatingScores.length - 1; i >= 0; i--) {
            const fs = floatingScores[i];
            try {
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px "Press Start 2P"';
                ctx.textAlign = 'center';
                // 上にふわっと浮き上がるアニメーション
                ctx.fillText(fs.text, fs.x, fs.y - (45 - fs.timer) * 0.4);
                ctx.restore();
            } catch (fsErr) {
                console.error("Error drawing floating score:", fsErr);
                try { ctx.restore(); } catch (_) {}
            }
            fs.timer--;
            if (fs.timer <= 0) {
                floatingScores.splice(i, 1);
            }
        }

        // 各ステータスの画面表示
        if (gameState === STATE_START) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00f2fe';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS START GAME', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#ffe600';
            ctx.font = '10px "Orbitron"';
            ctx.fillText('CLICK BUTTON OR PRESS ENTER', canvas.width / 2, canvas.height / 2 + 10);
        } else if (gameState === STATE_PAUSE) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff007f';
            ctx.font = '18px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        // 仮想キーのハイライト更新
        if (gameState === STATE_PLAY) {
            document.querySelectorAll('.ctrl-btn').forEach(btn => {
                const btnDir = btn.getAttribute('data-dir');
                if (btnDir === pacman.nextDir.name) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else {
            document.querySelectorAll('.ctrl-btn').forEach(btn => btn.classList.remove('active'));
        }
    } catch (e) {
        console.error("Error in gameLoop:", e);
    }

    requestAnimationFrame(gameLoop);
}

// --- 入力ハンドラー ---

function handleDirectionInput(dirStr) {
    if (gameState !== STATE_PLAY) return;
    
    switch(dirStr) {
        case 'up':
            pacman.nextDir = DIR_UP;
            break;
        case 'down':
            pacman.nextDir = DIR_DOWN;
            break;
        case 'left':
            pacman.nextDir = DIR_LEFT;
            break;
        case 'right':
            pacman.nextDir = DIR_RIGHT;
            break;
    }
}

// キーボード
window.addEventListener('keydown', (e) => {
    // 矢印キーやスペースによるブラウザスクロール防止
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            handleDirectionInput('up');
            break;
        case 'arrowdown':
        case 's':
            handleDirectionInput('down');
            break;
        case 'arrowleft':
        case 'a':
            handleDirectionInput('left');
            break;
        case 'arrowright':
        case 'd':
            handleDirectionInput('right');
            break;
        case 'p':
            if (gameState === STATE_PLAY) {
                gameState = STATE_PAUSE;
                playSound('stopSiren');
                playSound('stopPowerSiren');
            } else if (gameState === STATE_PAUSE) {
                gameState = STATE_PLAY;
                if (frightenedTimer > 0) playSound('startPowerSiren');
                else playSound('startSiren');
            }
            break;
        case 'enter':
            if (gameState === STATE_START) {
                startGame();
            }
            break;
    }
});

// --- タッチ操作およびスワイプ、スクロール防止、タッチデバイス自動検出 ---
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30; // スワイプと判定する最小ピクセル数

// タッチデバイス判定とコントロール表示の制御
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const mobileControls = document.querySelector('.mobile-controls');

if (mobileControls) {
    if (isTouchDevice) {
        mobileControls.style.display = ''; // CSSの定義(grid)に従う
    } else {
        // 非タッチデバイスでは画面を縮めても非表示に強制する
        mobileControls.style.setProperty('display', 'none', 'important');
    }
}

// 仮想キーのイベントハンドリング（touchstart & mousedown）
document.querySelectorAll('.ctrl-btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.getAttribute('data-dir');
        handleDirectionInput(dir);
        
        // 音声のアンロック
        if (window.gameAudio && typeof window.gameAudio.init === 'function') {
            try { window.gameAudio.init(); } catch (_) {}
        }
    }, { passive: false });
    
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const dir = btn.getAttribute('data-dir');
        handleDirectionInput(dir);
    });
});

// スワイプによる操作 & スクロール防止イベントリスナー
window.addEventListener('touchstart', (e) => {
    const target = e.target;
    // ゲーム画面、仮想キー、またはそのコンテナでのみスワイプ・スクロール制御を行う
    if (target.closest('#gameCanvas') || target.closest('.mobile-controls') || target.closest('.canvas-wrapper')) {
        if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
            e.preventDefault();
        }
    }
    
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    
    // 音声のアンロック
    if (window.gameAudio && typeof window.gameAudio.init === 'function') {
        try { window.gameAudio.init(); } catch (_) {}
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    const target = e.target;
    if (target.closest('#gameCanvas') || target.closest('.mobile-controls') || target.closest('.canvas-wrapper')) {
        if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
            e.preventDefault();
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    const target = e.target;
    if (target.closest('#gameCanvas') || target.closest('.mobile-controls') || target.closest('.canvas-wrapper')) {
        if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
            e.preventDefault();
        }
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.max(Math.abs(diffX), Math.abs(diffY)) > SWIPE_THRESHOLD) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 左右のスワイプ
            if (diffX > 0) {
                handleDirectionInput('right');
            } else {
                handleDirectionInput('left');
            }
        } else {
            // 上下のスワイプ
            if (diffY > 0) {
                handleDirectionInput('down');
            } else {
                handleDirectionInput('up');
            }
        }
    }
}, { passive: false });

// --- ゲーム開始・再起動 ---

function startGame() {
    try {
        gameState = STATE_PLAY;
        score = 0;
        level = 1;
        lives = 3;
        dotsEaten = 0;
        frightenedTimer = 0;
        floatingScores = []; // スコアアニメーションをクリア
        map = JSON.parse(JSON.stringify(ORIGINAL_MAP));
        pacman.reset();
        ghosts.forEach(g => g.reset());
        
        // UIを更新して音を鳴らす
        updateUI();
        
        playSound('playStartBGM');
        
        // イントロが終わるころ（約4秒後）にサイレン開始
        setTimeout(() => {
            if (gameState === STATE_PLAY) {
                playSound('startSiren');
            }
        }, 4500);

        const startBtn = document.getElementById('start-btn');
        startBtn.innerText = 'Restart';
        document.getElementById('game-title').classList.add('playing');
    } catch (e) {
        console.error("Error during startGame:", e);
    }
}

// イベントリスナー登録
document.getElementById('start-btn').addEventListener('click', () => {
    // ユーザー操作によるAudioContextの初期化
    if (window.gameAudio && typeof window.gameAudio.init === 'function') {
        try {
            window.gameAudio.init();
        } catch(e) {}
    }
    startGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    hideResultModal();
    startGame();
});

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
    let isMuted = false;
    if (window.gameAudio && typeof window.gameAudio.toggleMute === 'function') {
        try {
            isMuted = window.gameAudio.toggleMute();
        } catch(e) {}
    }
    muteBtn.innerText = `Mute: ${isMuted ? 'ON' : 'OFF'}`;
});

// ループの開始
requestAnimationFrame(gameLoop);
