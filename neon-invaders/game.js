// game.js - NEON INVADERS

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const scoreVal = document.getElementById('scoreVal');
const hiScoreVal = document.getElementById('hiScoreVal');
const waveVal = document.getElementById('waveVal');
const livesContainer = document.getElementById('livesContainer');
const screenOverlay = document.getElementById('screenOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startBtn = document.getElementById('startBtn');
const touchControls = document.getElementById('touchControls');
const btnPause = document.getElementById('btnPause');
const btnMute = document.getElementById('btnMute');

// Game Settings & Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Color Palette
const COLORS = {
    player: '#00f0ff',     // Neon Cyan
    invaderA: '#ff007f',   // Neon Pink
    invaderB: '#bd00ff',   // Neon Purple
    invaderC: '#39ff14',   // Neon Green
    bulletPlayer: '#00f0ff',
    bulletEnemy: '#fffb00',  // Neon Yellow
    bunker: '#bd00ff',
    bg: '#000000'
};

// Web Audio API Synthesizer (SE Engine)
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('neon_invaders_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('neon_invaders_muted', this.muted);
    }

    playShoot() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playInvaderShoot() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playExplosion() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        
        // Noise buffer generation for retro explosion
        const bufferSize = this.ctx.sampleRate * 0.35;
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
        filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.35);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    playHit() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playBeep(frequency, duration = 0.1) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + duration);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}
const sound = new SoundEngine();

// --- Game Classes ---

// Particle System
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.color = color;
        this.alpha = 1;
        this.life = 0.9 + Math.random() * 0.1; // Decay rate factor
        this.size = 2 + Math.random() * 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.03 * this.life;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Projectile
class Projectile {
    constructor(x, y, vy, color, isPlayer) {
        this.x = x;
        this.y = y;
        this.vy = vy;
        this.width = 4;
        this.height = 15;
        this.color = color;
        this.isPlayer = isPlayer;
        this.active = true;
    }

    update() {
        this.y += this.vy;
        if (this.y < -20 || this.y > GAME_HEIGHT + 20) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        ctx.restore();
    }
}

// Player
class Player {
    constructor() {
        this.width = 50;
        this.height = 30;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = GAME_HEIGHT - 60;
        this.speed = 6;
        this.cooldown = 0;
        this.color = COLORS.player;
    }

    update(keys, isMobileLeft, isMobileRight) {
        // Horizontal Movement
        if (keys['ArrowLeft'] || keys['KeyA'] || isMobileLeft) {
            this.x -= this.speed;
        }
        if (keys['ArrowRight'] || keys['KeyD'] || isMobileRight) {
            this.x += this.speed;
        }

        // Bound check
        if (this.x < 10) this.x = 10;
        if (this.x > GAME_WIDTH - this.width - 10) this.x = GAME_WIDTH - this.width - 10;

        if (this.cooldown > 0) this.cooldown--;
    }

    shoot() {
        if (this.cooldown === 0) {
            this.cooldown = 25; // 射撃間隔の制限
            sound.playShoot();
            return new Projectile(this.x + this.width / 2, this.y - 10, -8, COLORS.bulletPlayer, true);
        }
        return null;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Custom Neon Starship Path
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y); // Nose
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom right
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.7); // Inner wing R
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.7); // Inner wing L
        ctx.lineTo(this.x, this.y + this.height); // Bottom left
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = COLORS.invaderA;
        ctx.fillRect(this.x + this.width * 0.4, this.y + this.height * 0.75, this.width * 0.2, 5);

        ctx.restore();
    }
}

// Invader (Enemy)
class Invader {
    constructor(x, y, type, speedMultiplier) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.type = type; // 'A', 'B', 'C'
        this.animFrame = 0;
        
        switch (type) {
            case 'A':
                this.color = COLORS.invaderA;
                this.points = 30;
                break;
            case 'B':
                this.color = COLORS.invaderB;
                this.points = 20;
                break;
            case 'C':
            default:
                this.color = COLORS.invaderC;
                this.points = 10;
                break;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // エイリアンをピクセル風またはベクターで描画
        // animFrameが0と1で手足が交互に動く
        ctx.beginPath();
        const px = this.x;
        const py = this.y;
        const w = this.width;
        const h = this.height;

        if (this.type === 'A') {
            // エイリアンA (最高得点・カニ風)
            ctx.fillRect(px + w * 0.3, py, w * 0.4, h * 0.2); // 頭
            ctx.fillRect(px + w * 0.1, py + h * 0.2, w * 0.8, h * 0.3); // 体
            ctx.clearRect(px + w * 0.2, py + h * 0.3, w * 0.1, h * 0.1); // 目L
            ctx.clearRect(px + w * 0.7, py + h * 0.3, w * 0.1, h * 0.1); // 目R
            
            // アニメーションする足
            if (this.animFrame === 0) {
                ctx.fillRect(px, py + h * 0.5, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.8, py + h * 0.5, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.3, py + h * 0.8, w * 0.1, h * 0.2);
                ctx.fillRect(px + w * 0.6, py + h * 0.8, w * 0.1, h * 0.2);
            } else {
                ctx.fillRect(px + w * 0.1, py + h * 0.5, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.7, py + h * 0.5, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.2, py + h * 0.8, w * 0.1, h * 0.2);
                ctx.fillRect(px + w * 0.7, py + h * 0.8, w * 0.1, h * 0.2);
            }
        } else if (this.type === 'B') {
            // エイリアンB (中位・タコ風)
            ctx.fillRect(px + w * 0.2, py, w * 0.6, h * 0.3);
            ctx.fillRect(px + w * 0.1, py + h * 0.3, w * 0.8, h * 0.4);
            ctx.clearRect(px + w * 0.25, py + h * 0.4, w * 0.12, h * 0.12); // 目L
            ctx.clearRect(px + w * 0.63, py + h * 0.4, w * 0.12, h * 0.12); // 目R

            if (this.animFrame === 0) {
                ctx.fillRect(px, py + h * 0.7, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.4, py + h * 0.7, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.8, py + h * 0.7, w * 0.2, h * 0.3);
            } else {
                ctx.fillRect(px + w * 0.2, py + h * 0.7, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.6, py + h * 0.7, w * 0.2, h * 0.3);
            }
        } else {
            // エイリアンC (下位・イカ風)
            ctx.fillRect(px + w * 0.35, py, w * 0.3, h * 0.2);
            ctx.fillRect(px + w * 0.2, py + h * 0.2, w * 0.6, h * 0.5);
            ctx.clearRect(px + w * 0.3, py + h * 0.35, w * 0.1, h * 0.1);
            ctx.clearRect(px + w * 0.6, py + h * 0.35, w * 0.1, h * 0.1);

            if (this.animFrame === 0) {
                ctx.fillRect(px + w * 0.1, py + h * 0.7, w * 0.2, h * 0.3);
                ctx.fillRect(px + w * 0.7, py + h * 0.7, w * 0.2, h * 0.3);
            } else {
                ctx.fillRect(px + w * 0.25, py + h * 0.7, w * 0.15, h * 0.3);
                ctx.fillRect(px + w * 0.6, py + h * 0.7, w * 0.15, h * 0.3);
            }
        }

        ctx.restore();
    }
}

// Bunker (Bridges/Shields) - Pixel-perfect destructible shield
class Bunker {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 50;
        this.cellSize = 4; // サイズ単位(ピクセルグリッド化)
        this.rows = this.height / this.cellSize;
        this.cols = this.width / this.cellSize;
        
        // 2次元配列でシールドを作成。1が残っているピクセル、0が破壊されたピクセル
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                // ドーム型のトンネルを掘るようにバンカーを成形
                let isTunnel = (r > this.rows * 0.6 && c > this.cols * 0.25 && c < this.cols * 0.75);
                let isTopLeftCorner = (r < this.rows * 0.3 && c < this.cols * 0.15);
                let isTopRightCorner = (r < this.rows * 0.3 && c > this.cols * 0.85);

                if (isTunnel || isTopLeftCorner || isTopRightCorner) {
                    this.grid[r][c] = 0;
                } else {
                    this.grid[r][c] = 1; // 健全なピクセル
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.bunker;
        ctx.shadowBlur = 5;
        ctx.shadowColor = COLORS.bunker;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    ctx.fillRect(
                        this.x + c * this.cellSize,
                        this.y + r * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
        ctx.restore();
    }

    // 弾との衝突判定、ヒット時はピクセルを削る
    checkCollision(projectile) {
        // 簡単な矩形判定
        if (projectile.x >= this.x &&
            projectile.x <= this.x + this.width &&
            projectile.y >= this.y &&
            projectile.y <= this.y + this.height) {
            
            // バンカーのローカル座標に変換
            const localX = projectile.x - this.x;
            const localY = projectile.y - this.y;

            const c = Math.floor(localX / this.cellSize);
            const r = Math.floor(localY / this.cellSize);

            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                // ピクセルにヒットしたか確認
                if (this.grid[r][c] === 1) {
                    // 半径2セル以内の周囲のセルもついでに破壊して削る
                    this.destroyRadius(r, c, 3);
                    sound.playHit();
                    return true;
                }
            }
        }
        return false;
    }

    destroyRadius(centerR, centerC, radius) {
        for (let r = centerR - radius; r <= centerR + radius; r++) {
            for (let c = centerC - radius; c <= centerC + radius; c++) {
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    // 円形に破壊する
                    const dist = Math.sqrt((r - centerR)**2 + (c - centerC)**2);
                    if (dist <= radius) {
                        this.grid[r][c] = 0;
                    }
                }
            }
        }
    }
}

// --- Game Controller (Manager) ---

class Game {
    constructor() {
        this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER, CLEAR
        this.score = 0;
        this.hiScore = parseInt(localStorage.getItem('neon_invaders_hiscore')) || 10000;
        this.lives = 3;
        this.wave = 1;
        
        this.player = null;
        this.invaders = [];
        this.bunkers = [];
        this.projectiles = [];
        this.particles = [];

        // インベーダー群の制御
        this.invaderDirection = 1; // 1 = 右, -1 = 左
        this.invaderSpeed = 1;
        this.invaderBaseY = 0;
        this.invaderStepTimer = 0;
        this.invaderStepDuration = 60; // 敵が動くフレーム間隔 (少ないほど速い)
        this.invaderMoveSoundStep = 0;

        // キー入力状態
        this.keys = {};
        
        // モバイル操作状態
        this.isMobileLeft = false;
        this.isMobileRight = false;
        this.isMobileFire = false;

        // イベントバインド
        this.bindEvents();
        this.updateHUD();
        this.updateMuteUI();
    }

    bindEvents() {
        // キーボード操作
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 一時停止
            if (e.code === 'KeyP' && this.state === 'PLAYING') {
                this.state = 'PAUSED';
                btnPause.textContent = '▶';
                btnPause.classList.add('paused');
                this.showOverlay('PAUSED', '一時停止中', 'Pキーで再開');
            } else if (e.code === 'KeyP' && this.state === 'PAUSED') {
                this.state = 'PLAYING';
                btnPause.textContent = '⏸';
                btnPause.classList.remove('paused');
                this.hideOverlay();
            }

            // スペースキーのブラウザデフォルトスクロール防止
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // スタートボタン
        startBtn.addEventListener('click', () => {
            sound.init(); // ユーザー操作契機でオーディオ初期化
            if (this.state === 'START' || this.state === 'GAMEOVER' || this.state === 'CLEAR') {
                this.resetGame();
                this.state = 'PLAYING';
                this.hideOverlay();
            } else if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                btnPause.textContent = '⏸';
                btnPause.classList.remove('paused');
                this.hideOverlay();
            }
        });

        // ポーズボタンのクリック
        btnPause.addEventListener('click', () => {
            sound.init();
            if (this.state === 'PLAYING') {
                this.state = 'PAUSED';
                btnPause.textContent = '▶';
                btnPause.classList.add('paused');
                this.showOverlay('PAUSED', '一時停止中', 'ボタンまたはPキーで再開');
            } else if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                btnPause.textContent = '⏸';
                btnPause.classList.remove('paused');
                this.hideOverlay();
            }
        });

        // ミュートボタンのクリック
        btnMute.addEventListener('click', () => {
            sound.toggleMute();
            this.updateMuteUI();
        });

        // モバイルコントローラーイベント
        const btnLeft = document.getElementById('btnLeft');
        const btnRight = document.getElementById('btnRight');
        const btnFire = document.getElementById('btnFire');

        // タッチ操作検出時のコントロールパネル表示制御
        const showTouchControls = () => {
            touchControls.style.display = 'flex';
        };

        window.addEventListener('touchstart', showTouchControls, { once: true });

        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.isMobileLeft = true; });
        btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); this.isMobileLeft = false; });
        btnLeft.addEventListener('touchcancel', (e) => { e.preventDefault(); this.isMobileLeft = false; });
        
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.isMobileRight = true; });
        btnRight.addEventListener('touchend', (e) => { e.preventDefault(); this.isMobileRight = false; });
        btnRight.addEventListener('touchcancel', (e) => { e.preventDefault(); this.isMobileRight = false; });

        btnFire.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMobileFire = true;
        });
        btnFire.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isMobileFire = false;
        });
        btnFire.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.isMobileFire = false;
        });
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.projectiles = [];
        this.particles = [];
        this.player = new Player();
        this.updateHUD();
        this.initBunkers();
        this.initInvaders();
    }

    initBunkers() {
        this.bunkers = [];
        // 4個の防護壁を等間隔で作成
        const bunkerCount = 4;
        const spacing = GAME_WIDTH / (bunkerCount + 1);
        for (let i = 0; i < bunkerCount; i++) {
            const bx = (i + 1) * spacing - 40; // 40はバンカー幅の半分
            this.bunkers.push(new Bunker(bx, GAME_HEIGHT - 130));
        }
    }

    initInvaders() {
        this.invaders = [];
        this.invaderDirection = 1;
        
        // ウェーブ数に応じた初期スピード設定
        this.invaderSpeed = 1 + (this.wave - 1) * 0.25;
        this.invaderStepDuration = Math.max(10, 60 - (this.wave - 1) * 5);

        const rows = 5;
        const cols = 10;
        const spacingX = 55;
        const spacingY = 40;
        const startX = (GAME_WIDTH - (cols * spacingX)) / 2;
        const startY = 80;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // 行ごとに敵の種類を変える
                let type = 'C';
                if (r === 0) type = 'A';
                else if (r === 1 || r === 2) type = 'B';
                
                const ix = startX + c * spacingX;
                const iy = startY + r * spacingY;
                this.invaders.push(new Invader(ix, iy, type));
            }
        }
    }

    nextWave() {
        this.wave++;
        this.projectiles = [];
        this.initInvaders();
        this.updateHUD();
        sound.playBeep(880, 0.3); // レベルアップ音
    }

    updateHUD() {
        scoreVal.textContent = String(this.score).padStart(6, '0');
        hiScoreVal.textContent = String(this.hiScore).padStart(6, '0');
        waveVal.textContent = this.wave;

        // 残機表示の更新
        livesContainer.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            const ship = document.createElement('div');
            ship.className = 'live-indicator';
            livesContainer.appendChild(ship);
        }
    }

    showOverlay(status, title, message) {
        overlayTitle.className = status === 'GAMEOVER' ? 'neon-text-pink' : 'neon-text';
        overlayTitle.textContent = title;
        overlayMessage.textContent = message;
        startBtn.textContent = status === 'PAUSED' ? 'RESUME' : 'RESTART MISSION';
        screenOverlay.classList.add('active');
    }

    hideOverlay() {
        screenOverlay.classList.remove('active');
    }

    updateMuteUI() {
        if (sound.muted) {
            btnMute.textContent = '🔇';
            btnMute.title = '消音中';
        } else {
            btnMute.textContent = '🔊';
            btnMute.title = '音量ON';
        }
    }

    // AABB型衝突判定ユーティリティ
    checkAABB(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // パーティクル拡散トリガー
    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        sound.playExplosion();
        if (navigator.vibrate) navigator.vibrate(15); // 撃破時の軽いバイブレーション
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // 1. プレイヤーの更新
        this.player.update(this.keys, this.isMobileLeft, this.isMobileRight);

        // キーボードスペースキーまたはモバイル射撃ボタン連射対応 (updateループ内での射撃)
        if (this.keys['Space'] || this.isMobileFire) {
            const bullet = this.player.shoot();
            if (bullet) {
                this.projectiles.push(bullet);
                if (navigator.vibrate) navigator.vibrate(8); // 射撃時の短いバイブレーション
            }
        }

        // 2. 弾の更新
        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => p.active);

        // 3. パーティクルの更新
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.alpha > 0);

        // 4. インベーダー（敵）の行動
        this.updateInvaders();

        // 5. 衝突判定の処理
        this.handleCollisions();

        // 6. クリア・ゲームオーバー判定
        if (this.invaders.length === 0) {
            this.nextWave();
        }
    }

    updateInvaders() {
        this.invaderStepTimer++;
        
        let changeDirection = false;
        let speedMult = 1 + (1 - (this.invaders.length / 50)) * 1.5; // 残り少なくなると加速
        let currentStepDuration = Math.max(4, this.invaderStepDuration / speedMult);

        if (this.invaderStepTimer >= currentStepDuration) {
            this.invaderStepTimer = 0;
            
            // 敵の移動音 (ズン、ズンという段階的な低音)
            const frequencies = [60, 70, 80, 90];
            sound.playBeep(frequencies[this.invaderMoveSoundStep], 0.08);
            this.invaderMoveSoundStep = (this.invaderMoveSoundStep + 1) % frequencies.length;

            // アニメーションフレーム更新と横移動
            this.invaders.forEach(inv => {
                inv.animFrame = inv.animFrame === 0 ? 1 : 0;
                inv.x += 10 * this.invaderDirection * this.invaderSpeed;

                // 画面端判定
                if (inv.x < 15 || inv.x > GAME_WIDTH - inv.width - 15) {
                    changeDirection = true;
                }
            });

            // 端に達した場合、下に移動して方向転換
            if (changeDirection) {
                this.invaderDirection *= -1;
                this.invaders.forEach(inv => {
                    inv.y += 24; // 下降
                    
                    // 防衛ラインを突破されたらゲームオーバー
                    if (inv.y + inv.height >= this.player.y) {
                        this.triggerGameOver();
                    }
                });
            }
        }

        // 敵のランダム攻撃発射
        if (Math.random() < 0.015 + (this.wave * 0.005)) {
            // 一番下にいるインベーダーを列ごとに選定して発射
            const shooter = this.selectShooter();
            if (shooter) {
                sound.playInvaderShoot();
                this.projectiles.push(
                    new Projectile(
                        shooter.x + shooter.width / 2, 
                        shooter.y + shooter.height, 
                        4 + (this.wave * 0.5), 
                        COLORS.bulletEnemy, 
                        false
                    )
                );
            }
        }
    }

    selectShooter() {
        if (this.invaders.length === 0) return null;
        // 列ごとに最も下部にいるインベーダーを取得
        const columns = {};
        this.invaders.forEach(inv => {
            const colIndex = Math.floor(inv.x / 50);
            if (!columns[colIndex] || columns[colIndex].y < inv.y) {
                columns[colIndex] = inv;
            }
        });
        const bottomInvaders = Object.values(columns);
        // ランダムで1体選ぶ
        return bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];
    }

    handleCollisions() {
        // 弾とその他オブジェクトの判定
        this.projectiles.forEach(p => {
            // A. バンカー（シールド）との当たり判定
            for (let b of this.bunkers) {
                if (b.checkCollision(p)) {
                    p.active = false;
                    return; // 次の弾へ
                }
            }

            if (p.isPlayer) {
                // プレイヤーの弾が敵インベーダーに当たったか
                for (let i = 0; i < this.invaders.length; i++) {
                    const inv = this.invaders[i];
                    if (this.checkAABB(p, inv)) {
                        p.active = false;
                        this.invaders.splice(i, 1);
                        this.createExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color);
                        
                        this.score += inv.points;
                        if (this.score > this.hiScore) {
                            this.hiScore = this.score;
                            localStorage.setItem('neon_invaders_hiscore', this.hiScore);
                        }
                        this.updateHUD();
                        break;
                    }
                }
            } else {
                // 敵の弾がプレイヤーに当たったか
                if (this.checkAABB(p, this.player)) {
                    p.active = false;
                    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, COLORS.player);
                    this.lives--;
                    this.updateHUD();
                    if (navigator.vibrate) navigator.vibrate(100); // 被弾時の強いバイブレーション
                    
                    if (this.lives <= 0) {
                        this.triggerGameOver();
                    } else {
                        // 復活アクション
                        sound.playBeep(220, 0.4);
                        this.player.x = GAME_WIDTH / 2 - this.player.width / 2;
                    }
                }
            }
        });
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        btnPause.textContent = '⏸';
        btnPause.classList.remove('paused');
        this.showOverlay('GAMEOVER', 'MISSION FAILED', `最終スコア: ${this.score} - 地球はネオンに包まれた...`);
        sound.playBeep(110, 0.8);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // ゲームオーバー時の連続バイブレーション
    }

    draw() {
        // Canvasのクリア
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // サイバーパンク調の薄いスキャンライン効果（CRTレトロ感）
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_WIDTH, y);
            ctx.stroke();
        }
        ctx.restore();

        // 1. バンカーの描画
        this.bunkers.forEach(b => b.draw(ctx));

        // 2. プレイヤーの描画
        if (this.lives > 0 && this.player) {
            this.player.draw(ctx);
        }

        // 3. インベーダーの描画
        this.invaders.forEach(inv => inv.draw(ctx));

        // 4. 弾の描画
        this.projectiles.forEach(p => p.draw(ctx));

        // 5. パーティクルの描画
        this.particles.forEach(p => p.draw(ctx));
    }

    run() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// ゲームインスタンス起動
const game = new Game();
game.run();
