/**
 * ヘッドオン（Head-On）ゲーム メインロジック
 */

// キャンバス設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_SIZE = 600;

// Retina（DPR）高解像度ディスプレイ対応
function setupCanvasDPI() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  ctx.scale(dpr, dpr);
}
setupCanvasDPI();

// ゲームオーディオのインスタンス化
const audio = new GameAudio();

// コースのレーン定義 (4レーン)
const L = [50, 110, 170, 230]; // 各レーンの左端 X座標
const R = [550, 490, 430, 370]; // 各レーンの右端 X座標
const T = [50, 110, 170, 230]; // 各レーンの上端 Y座標
const B = [550, 490, 430, 370]; // 各レーンの下端 Y座標
const LANE_WIDTH = 60;

// ゲーム状態
let score = 0;
let highScore = parseInt(localStorage.getItem('headon_highscore')) || 0;
let lives = 3;
let stage = 1;
let gameState = 'START'; // START, PLAYING, CRASHED, CLEAR, GAMEOVER
let dots = [];
let particles = [];
let screenShake = 0;

// 入力状態
const keys = {};
let mobileInput = {
  in: false,
  out: false,
  accel: false
};
let swipeLaneChangeQueue = null; // スワイプ予約 ('in' または 'out')

// プレイヤー車オブジェクト
const player = {
  x: 0,
  y: 0,
  lane: 0,
  side: 'bottom', // 'top', 'left', 'bottom', 'right'
  direction: 'RIGHT', // 'UP', 'DOWN', 'LEFT', 'RIGHT'
  speed: 3,
  baseSpeed: 3,
  accelSpeed: 6,
  sliding: false,
  slideProgress: 0,
  slideFromLane: 0,
  slideToLane: 0,
  slideSpeed: 0.1, // スライドの完了速度
  invulnerableTime: 0, // 無敵フレーム数
  width: 20,
  height: 32
};

// 敵車リスト
let enemies = [];

// スコア・ライフ等のUI要素
const scoreVal = document.getElementById('scoreVal');
const livesContainer = document.getElementById('livesContainer');
const stageVal = document.getElementById('stageVal');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameClearOverlay = document.getElementById('gameClearOverlay');
const finalScoreSpan = document.getElementById('finalScoreSpan');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const nextBtn = document.getElementById('nextBtn');
const muteBtn = document.getElementById('muteBtn');

// モバイル操作ボタン
const btnIn = document.getElementById('btnIn');
const btnOut = document.getElementById('btnOut');
const btnAccel = document.getElementById('btnAccel');

// ハイスコア初期表示
updateUI();

// ----------------------------------------------------
// イベントリスナー
// ----------------------------------------------------
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  // スペースキーでの画面スクロールを防止
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// スワイプ・タッチ操作用の状態変数
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
  if (e.cancelable) e.preventDefault();
  audio.init();

  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;

  // 画面タッチ中はアクセルON（直感的なワンハンド操作）
  mobileInput.accel = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (e.cancelable) e.preventDefault();
  mobileInput.accel = false;

  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const distance = Math.hypot(dx, dy);

  // 30px 以上の移動でスワイプと判定
  if (distance > 30) {
    let swipeDir = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      swipeDir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      swipeDir = dy > 0 ? 'DOWN' : 'UP';
    }

    if (swipeDir) {
      let action = null;
      const side = player.side;
      if (side === 'top') {
        if (swipeDir === 'DOWN') action = 'in';
        if (swipeDir === 'UP') action = 'out';
      } else if (side === 'bottom') {
        if (swipeDir === 'UP') action = 'in';
        if (swipeDir === 'DOWN') action = 'out';
      } else if (side === 'left') {
        if (swipeDir === 'RIGHT') action = 'in';
        if (swipeDir === 'LEFT') action = 'out';
      } else if (side === 'right') {
        if (swipeDir === 'LEFT') action = 'in';
        if (swipeDir === 'RIGHT') action = 'out';
      }

      if (action) {
        swipeLaneChangeQueue = action;
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }
  }
}, { passive: false });

// モバイルボタンイベント
function setupMobileButton(btn, field) {
  if (!btn) return;
  btn.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    mobileInput[field] = true;
    btn.classList.add('active');
    audio.init();
  }, { passive: false });

  btn.addEventListener('touchend', (e) => {
    if (e.cancelable) e.preventDefault();
    mobileInput[field] = false;
    btn.classList.remove('active');
  }, { passive: false });

  // マウスイベント（PCテスト用）
  btn.addEventListener('mousedown', (e) => {
    mobileInput[field] = true;
    btn.classList.add('active');
    audio.init();
  });
  btn.addEventListener('mouseup', () => {
    mobileInput[field] = false;
    btn.classList.remove('active');
  });
  btn.addEventListener('mouseleave', () => {
    mobileInput[field] = false;
    btn.classList.remove('active');
  });
}

setupMobileButton(btnIn, 'in');
setupMobileButton(btnOut, 'out');
setupMobileButton(btnAccel, 'accel');

// ミュートボタン
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    if (isMuted) {
      muteBtn.classList.add('muted');
      muteBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4 9v6h4l5 5V4L8 9H4zm12.5-3.37l-1.42 1.42C16.89 8.08 18 9.9 18 12c0 2.1-.11 3.92-1.92 4.95l1.42 1.42C19.82 16.74 21 14.52 21 12c0-2.52-1.18-4.74-3.5-6.37z"/></svg>`;
    } else {
      muteBtn.classList.remove('muted');
      muteBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L8 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    }
  });
}

// フルスクリーンボタン
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    audio.init();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    fullscreenBtn.classList.add('active');
  } else {
    fullscreenBtn.classList.remove('active');
  }
});

// UIボタン
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
nextBtn.addEventListener('click', startNextStage);

// ----------------------------------------------------
// ゲーム制御関数
// ----------------------------------------------------

function startGame() {
  audio.init();
  score = 0;
  lives = 3;
  stage = 1;
  gameState = 'PLAYING';
  
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  gameClearOverlay.classList.add('hidden');

  initStage();
  audio.resumeEngine();
  gameLoop();
}

function startNextStage() {
  stage++;
  gameState = 'PLAYING';
  gameClearOverlay.classList.add('hidden');
  initStage();
  audio.resumeEngine();
}

function initStage() {
  // プレイヤーの初期化
  player.lane = 0;
  player.side = 'bottom';
  player.direction = 'RIGHT';
  player.x = L[0];
  player.y = B[0];
  player.sliding = false;
  player.invulnerableTime = 120; // 2秒間の無敵

  // 敵車の初期化 (ステージ数に応じて台数と速度を変更)
  enemies = [];
  const enemyCount = Math.min(1 + Math.floor(stage / 2), 3); // 最大3台
  const enemyBaseSpeed = 2.5 + (stage * 0.3); // ステージが上がると速くなる

  for (let i = 0; i < enemyCount; i++) {
    // 異なるレーンや場所から開始する
    const enemyLane = Math.min(i + 1, 3);
    enemies.push({
      x: R[enemyLane],
      y: T[enemyLane],
      lane: enemyLane,
      side: 'top',
      direction: 'RIGHT', // 時計回りの top は右へ走る
      speed: enemyBaseSpeed - (i * 0.3), // 2台目以降は少し遅くして避ける余地を作る
      sliding: false,
      slideProgress: 0,
      slideFromLane: 0,
      slideToLane: 0,
      slideSpeed: 0.08,
      width: 20,
      height: 32,
      color: '#ff0055',
      glowColor: 'rgba(255, 0, 85, 0.8)'
    });
  }

  // ドットの生成
  generateDots();
  particles = [];
  updateUI();
}

function generateDots() {
  dots = [];
  // 各レーンの辺にドットを配置
  for (let lane = 0; lane < 4; lane++) {
    const left = L[lane];
    const right = R[lane];
    const top = T[lane];
    const bottom = B[lane];

    // 間隔の設定 (内側ほど狭いので間隔を調整)
    const step = 40;

    // 上辺 (x: left から right)
    for (let x = left; x <= right; x += step) {
      addDot(x, top, lane, 'top');
    }
    // 下辺 (x: left から right)
    for (let x = left; x <= right; x += step) {
      addDot(x, bottom, lane, 'bottom');
    }
    // 左辺 (y: top + step から bottom - step)
    for (let y = top + step; y < bottom; y += step) {
      addDot(left, y, lane, 'left');
    }
    // 右辺 (y: top + step から bottom - step)
    for (let y = top + step; y < bottom; y += step) {
      addDot(right, y, lane, 'right');
    }
  }
}

function addDot(x, y, lane, side) {
  // 交差点 (x=300 または y=300) に重複して配置しすぎないよう調整しつつ追加
  // すでに同じ場所にドットがあれば追加しない
  const exists = dots.some(d => Math.abs(d.x - x) < 5 && Math.abs(d.y - y) < 5);
  if (!exists) {
    dots.push({ x, y, lane, side });
  }
}

// ----------------------------------------------------
// 更新系ロジック
// ----------------------------------------------------

function gameLoop() {
  if (gameState !== 'PLAYING' && gameState !== 'CRASHED') return;

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

function update() {
  // 無敵タイマーのカウントダウン
  if (player.invulnerableTime > 0) {
    player.invulnerableTime--;
  }

  // スクリーンシェイクの減衰
  if (screenShake > 0) {
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }

  if (gameState === 'PLAYING') {
    // プレイヤーの移動と入力処理
    handlePlayerMovement();
    
    // 敵車の移動とAI
    handleEnemiesMovement();

    // ドットの回収
    checkDotCollisions();

    // プレイヤーと敵車の衝突判定
    checkCarCollisions();
  }

  // パーティクルの更新
  updateParticles();
}

/**
 * プレイヤー車の移動およびレーンチェンジロジック
 */
function handlePlayerMovement() {
  // スピードの設定 (アクセルキー/ボタンで加速)
  const isAccelPressed = keys['Space'] || keys['ShiftLeft'] || mobileInput.accel;
  player.speed = isAccelPressed ? player.accelSpeed : player.baseSpeed;

  // エンジン音のピッチ更新
  const speedRatio = isAccelPressed ? 1.0 : 0.4;
  audio.updateEngineSpeed(speedRatio);

  if (player.sliding) {
    // スライド処理中
    player.slideProgress += player.slideSpeed;
    if (player.slideProgress >= 1.0) {
      player.lane = player.slideToLane;
      player.sliding = false;
      player.slideProgress = 0;
    }
    // 座標の更新 (スライド中の座標補間)
    applySlideCoordinates(player);
  } else {
    // 通常走行
    let moveAmount = player.speed;
    
    // 現在の進行方向に応じた移動と、交差点（x=300 または y=300）の通過判定
    if (player.side === 'top') {
      // CCW: 右から左へ移動 (x減少)
      const nextX = player.x - moveAmount;
      if (player.x > 300 && nextX <= 300) {
        // 交差点をまたぐ
        player.x = 300;
        checkPlayerLaneChange('top', nextX - 300);
      } else {
        player.x = nextX;
        // 角に達したかチェック
        if (player.x <= L[player.lane]) {
          player.x = L[player.lane];
          player.side = 'left';
          player.direction = 'DOWN';
        }
      }
    } 
    else if (player.side === 'left') {
      // CCW: 上から下へ移動 (y増加)
      const nextY = player.y + moveAmount;
      if (player.y < 300 && nextY >= 300) {
        player.y = 300;
        checkPlayerLaneChange('left', nextY - 300);
      } else {
        player.y = nextY;
        if (player.y >= B[player.lane]) {
          player.y = B[player.lane];
          player.side = 'bottom';
          player.direction = 'RIGHT';
        }
      }
    } 
    else if (player.side === 'bottom') {
      // CCW: 左から右へ移動 (x増加)
      const nextX = player.x + moveAmount;
      if (player.x < 300 && nextX >= 300) {
        player.x = 300;
        checkPlayerLaneChange('bottom', nextX - 300);
      } else {
        player.x = nextX;
        if (player.x >= R[player.lane]) {
          player.x = R[player.lane];
          player.side = 'right';
          player.direction = 'UP';
        }
      }
    } 
    else if (player.side === 'right') {
      // CCW: 下から上へ移動 (y減少)
      const nextY = player.y - moveAmount;
      if (player.y > 300 && nextY <= 300) {
        player.y = 300;
        checkPlayerLaneChange('right', nextY - 300);
      } else {
        player.y = nextY;
        if (player.y <= T[player.lane]) {
          player.y = T[player.lane];
          player.side = 'top';
          player.direction = 'LEFT';
        }
      }
    }

    // スライドが開始されなかった場合の実座標反映
    if (!player.sliding) {
      syncStandardCoordinates(player);
    }
  }
}

/**
 * プレイヤーの交差点でのレーンチェンジ判定
 */
function checkPlayerLaneChange(side, remainingDist) {
  let changeDirection = 0; // +1: 内側へ, -1: 外側へ

  // キーボード・ボタン・スワイプ入力の確認
  const inWanted = keys['ArrowDown'] || keys['ArrowUp'] || keys['ArrowLeft'] || keys['ArrowRight'] || 
                   keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || 
                   mobileInput.in || swipeLaneChangeQueue === 'in';
  const outWanted = mobileInput.out || swipeLaneChangeQueue === 'out';

  if (inWanted || outWanted) {
    // どのキーが押されたかと現在の辺から、内側/外側の意図を判定する
    let wantIn = mobileInput.in || swipeLaneChangeQueue === 'in';
    let wantOut = mobileInput.out || swipeLaneChangeQueue === 'out';

    // キーボード入力の方向マッピング
    if (!wantIn && !wantOut) {
      if (side === 'top') {
        if (keys['ArrowDown'] || keys['KeyS']) wantIn = true;
        if (keys['ArrowUp'] || keys['KeyW']) wantOut = true;
      } else if (side === 'bottom') {
        if (keys['ArrowUp'] || keys['KeyW']) wantIn = true;
        if (keys['ArrowDown'] || keys['KeyS']) wantOut = true;
      } else if (side === 'left') {
        if (keys['ArrowRight'] || keys['KeyD']) wantIn = true;
        if (keys['ArrowLeft'] || keys['KeyA']) wantOut = true;
      } else if (side === 'right') {
        if (keys['ArrowLeft'] || keys['KeyA']) wantIn = true;
        if (keys['ArrowRight'] || keys['KeyD']) wantOut = true;
      }
    }

    if (wantIn && player.lane < 3) {
      changeDirection = 1;
    } else if (wantOut && player.lane > 0) {
      changeDirection = -1;
    }
  }

  if (changeDirection !== 0) {
    player.sliding = true;
    player.slideProgress = 0;
    player.slideFromLane = player.lane;
    player.slideToLane = player.lane + changeDirection;
    audio.playLaneChangeSound();

    // レーンチェンジ時のごく短い振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  } else {
    // スライドしない場合は、交差点を通過して残りの移動量を適用
    if (side === 'top') player.x += remainingDist; // remainingDist は負の値
    else if (side === 'left') player.y += remainingDist; // 正の値
    else if (side === 'bottom') player.x += remainingDist; // 正の値
    else if (side === 'right') player.y += remainingDist; // 負の値
  }

  // 交差点を通過・曲がった後はスワイプ予約を消費してリセット
  swipeLaneChangeQueue = null;
}

/**
 * 敵車の移動およびAI（追跡レーンチェンジ）
 */
function handleEnemiesMovement() {
  enemies.forEach(enemy => {
    if (enemy.sliding) {
      enemy.slideProgress += enemy.slideSpeed;
      if (enemy.slideProgress >= 1.0) {
        enemy.lane = enemy.slideToLane;
        enemy.sliding = false;
        enemy.slideProgress = 0;
      }
      applySlideCoordinates(enemy);
    } else {
      let moveAmount = enemy.speed;

      // 時計回り (CW) で進行
      if (enemy.side === 'top') {
        // CW: 左から右へ移動 (x増加)
        const nextX = enemy.x + moveAmount;
        if (enemy.x < 300 && nextX >= 300) {
          enemy.x = 300;
          decideEnemyLaneChange(enemy, 'top', nextX - 300);
        } else {
          enemy.x = nextX;
          if (enemy.x >= R[enemy.lane]) {
            enemy.x = R[enemy.lane];
            enemy.side = 'right';
            enemy.direction = 'DOWN';
          }
        }
      }
      else if (enemy.side === 'right') {
        // CW: 上から下へ移動 (y増加)
        const nextY = enemy.y + moveAmount;
        if (enemy.y < 300 && nextY >= 300) {
          enemy.y = 300;
          decideEnemyLaneChange(enemy, 'right', nextY - 300);
        } else {
          enemy.y = nextY;
          if (enemy.y >= B[enemy.lane]) {
            enemy.y = B[enemy.lane];
            enemy.side = 'bottom';
            enemy.direction = 'LEFT';
          }
        }
      }
      else if (enemy.side === 'bottom') {
        // CW: 右から左へ移動 (x減少)
        const nextX = enemy.x - moveAmount;
        if (enemy.x > 300 && nextX <= 300) {
          enemy.x = 300;
          decideEnemyLaneChange(enemy, 'bottom', nextX - 300);
        } else {
          enemy.x = nextX;
          if (enemy.x <= L[enemy.lane]) {
            enemy.x = L[enemy.lane];
            enemy.side = 'left';
            enemy.direction = 'UP';
          }
        }
      }
      else if (enemy.side === 'left') {
        // CW: 下から上へ移動 (y減少)
        const nextY = enemy.y - moveAmount;
        if (enemy.y > 300 && nextY <= 300) {
          enemy.y = 300;
          decideEnemyLaneChange(enemy, 'left', nextY - 300);
        } else {
          enemy.y = nextY;
          if (enemy.y <= T[enemy.lane]) {
            enemy.y = T[enemy.lane];
            enemy.side = 'top';
            enemy.direction = 'RIGHT';
          }
        }
      }

      if (!enemy.sliding) {
        syncStandardCoordinates(enemy);
      }
    }
  });
}

/**
 * 敵車のAI車線変更決定
 * プレイヤーの現在のレーンに近づくように車線変更を行う
 */
function decideEnemyLaneChange(enemy, side, remainingDist) {
  let changeDirection = 0;

  // プレイヤーが同じ軸（対面）または近い場所にいる時にプレイヤーの車線に合わせようとする
  // 基本的にプレイヤーのレーン (player.lane) と自分のレーン (enemy.lane) を比較
  if (player.lane > enemy.lane && enemy.lane < 3) {
    // プレイヤーがより内側にいる場合、内側へ変更
    changeDirection = 1;
  } else if (player.lane < enemy.lane && enemy.lane > 0) {
    // プレイヤーがより外側にいる場合、外側へ変更
    changeDirection = -1;
  }

  // ステージ難易度に応じて、一定確率で賢く動く (ステージ1は気まぐれ、高ステージは確実に追ってくる)
  const aiTriggerChance = 0.4 + (stage * 0.1); // ステージ6以上で 100% 追跡
  if (changeDirection !== 0 && Math.random() < aiTriggerChance) {
    enemy.sliding = true;
    enemy.slideProgress = 0;
    enemy.slideFromLane = enemy.lane;
    enemy.slideToLane = enemy.lane + changeDirection;
  } else {
    // 直進
    if (side === 'top') enemy.x += remainingDist;
    else if (side === 'right') enemy.y += remainingDist;
    else if (side === 'bottom') enemy.x += remainingDist;
    else if (side === 'left') enemy.y += remainingDist;
  }
}

/**
 * 通常走行時のレーン外周に沿った座標同期
 */
function syncStandardCoordinates(car) {
  if (car.side === 'top') car.y = T[car.lane];
  else if (car.side === 'bottom') car.y = B[car.lane];
  else if (car.side === 'left') car.x = L[car.lane];
  else if (car.side === 'right') car.x = R[car.lane];
}

/**
 * スライド（車線変更中）の座標補間
 */
function applySlideCoordinates(car) {
  const p = car.slideProgress;
  const from = car.slideFromLane;
  const to = car.slideToLane;

  if (car.side === 'top') {
    car.x = 300;
    car.y = T[from] * (1 - p) + T[to] * p;
    // スライド方向に応じて車の向きを一時的に変える
    car.direction = to > from ? 'DOWN' : 'UP';
  } 
  else if (car.side === 'bottom') {
    car.x = 300;
    car.y = B[from] * (1 - p) + B[to] * p;
    car.direction = to > from ? 'UP' : 'DOWN';
  } 
  else if (car.side === 'left') {
    car.y = 300;
    car.x = L[from] * (1 - p) + L[to] * p;
    car.direction = to > from ? 'RIGHT' : 'LEFT';
  } 
  else if (car.side === 'right') {
    car.y = 300;
    car.x = R[from] * (1 - p) + R[to] * p;
    car.direction = to > from ? 'LEFT' : 'RIGHT';
  }

  // スライド完了直前または完了時に向きを通常方向に戻す
  if (p >= 0.95) {
    if (car.side === 'top') car.direction = (car === player) ? 'LEFT' : 'RIGHT';
    else if (car.side === 'bottom') car.direction = (car === player) ? 'RIGHT' : 'LEFT';
    else if (car.side === 'left') car.direction = (car === player) ? 'DOWN' : 'UP';
    else if (car.side === 'right') car.direction = (car === player) ? 'UP' : 'DOWN';
  }
}

/**
 * ドットとの当たり判定
 */
function checkDotCollisions() {
  const eatDistance = 15;
  const initialCount = dots.length;

  dots = dots.filter(dot => {
    const dist = Math.hypot(player.x - dot.x, player.y - dot.y);
    if (dist < eatDistance) {
      score += 10;
      audio.playDotSound();
      updateUI();
      // スコアがハイスコアを超えたら更新
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('headon_highscore', highScore);
      }
      // パーティクル発生
      createSparks(dot.x, dot.y, varColor('--neon-yellow'), 4);
      return false; // 削除
    }
    return true; // 残す
  });

  // 全ドットクリア判定
  if (dots.length === 0 && initialCount > 0) {
    stageClear();
  }
}

/**
 * プレイヤーと敵車の当たり判定 (クラッシュ)
 */
function checkCarCollisions() {
  if (player.invulnerableTime > 0) return;

  const crashDistance = 22; // 車の中心距離

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < crashDistance) {
      triggerCrash();
      break;
    }
  }
}

/**
 * クラッシュ演出とペナルティ
 */
function triggerCrash() {
  gameState = 'CRASHED';
  screenShake = 15;
  audio.playCrashSound();
  audio.pauseEngine();

  // クラッシュ時のバイブレーションフィードバック (激しい振動)
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 150]);
  }

  // クラッシュの激しいパーティクル
  createSparks(player.x, player.y, '#ffffff', 20);
  createSparks(player.x, player.y, varColor('--neon-pink'), 15);
  createSparks(player.x, player.y, varColor('--neon-blue'), 15);

  lives--;
  updateUI();

  setTimeout(() => {
    if (lives <= 0) {
      gameOver();
    } else {
      // 残機がある場合はリスタート
      gameState = 'PLAYING';
      initStage();
      audio.resumeEngine();
    }
  }, 1500);
}

/**
 * ステージクリア時の処理
 */
function stageClear() {
  gameState = 'CLEAR';
  audio.playClearJingle();

  // ステージクリア時のバイブレーションフィードバック
  if (navigator.vibrate) {
    navigator.vibrate([50, 50, 100]);
  }

  // クリアエフェクトのパーティクル
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    particles.push({
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      vx: cos * (Math.random() * 4 + 2),
      vy: sin * (Math.random() * 4 + 2),
      life: 60,
      color: varColor('--neon-green'),
      size: Math.random() * 3 + 2
    });
  }

  gameClearOverlay.classList.remove('hidden');
}

/**
 * ゲームオーバー時の処理
 */
function gameOver() {
  gameState = 'GAMEOVER';
  finalScoreSpan.innerText = score;
  gameOverOverlay.classList.remove('hidden');
}

// ----------------------------------------------------
// パーティクルシステム
// ----------------------------------------------------
function createSparks(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.random() * 20 + 20,
      color,
      size: Math.random() * 2.5 + 1.5
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });
}

// CSS変数からカラーを取得するヘルパー
function varColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ----------------------------------------------------
// UI描画 / 更新
// ----------------------------------------------------

function updateUI() {
  if (scoreVal) scoreVal.innerText = score;
  if (stageVal) stageVal.innerText = stage;

  // ライフハートの描画
  if (livesContainer) {
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart';
      livesContainer.appendChild(heart);
    }
  }
}

function draw() {
  // 画面クリア（トレイル効果のために少し不透明度を下げてクリアする）
  ctx.fillStyle = 'rgba(11, 12, 16, 0.3)';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.save();
  // スクリーンシェイクの適用
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
  }

  // 1. コース（レーン）の描画
  drawCourse();

  // 2. ドットの描画
  drawDots();

  // 3. パーティクルの描画
  drawParticles();

  // 4. プレイヤー車の描画
  if (gameState !== 'CRASHED') {
    drawCar(player, varColor('--neon-blue'), varColor('--neon-green'), player.invulnerableTime > 0);
  }

  // 5. 敵車の描画
  enemies.forEach(enemy => {
    drawCar(enemy, enemy.color, '#ffcc00', false);
  });

  ctx.restore();
}

function drawCourse() {
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.lineWidth = 1;
  
  // 背景に走るネオングリッド線の描画
  for (let i = 0; i <= CANVAS_SIZE; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(CANVAS_SIZE, i);
    ctx.stroke();
  }

  // 外壁と内壁のネオン描画
  ctx.shadowBlur = 10;
  ctx.shadowColor = varColor('--neon-blue');
  ctx.strokeStyle = varColor('--neon-blue');
  ctx.lineWidth = 4;

  // 外枠 (レーン0の外側)
  ctx.strokeRect(20, 20, 560, 560);
  // 内枠 (レーン3の内側)
  ctx.strokeRect(200, 200, 200, 200);

  // 各レーンのセンターラインを描画 (破線にしてレトロ感を出す)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]);

  for (let lane = 0; lane < 4; lane++) {
    const size = R[lane] - L[lane];
    ctx.strokeRect(L[lane], T[lane], size, size);
  }
  ctx.setLineDash([]); // リセット

  // レーンチェンジ可能エリア（上下左右の中央部分）を示すネオン矢印/ライン
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 5;
  ctx.shadowColor = varColor('--neon-green');

  // 上中央の変更ゾーン
  ctx.beginPath();
  ctx.moveTo(300, 20);
  ctx.lineTo(300, 200);
  ctx.stroke();

  // 下中央の変更ゾーン
  ctx.beginPath();
  ctx.moveTo(300, 400);
  ctx.lineTo(300, 580);
  ctx.stroke();

  // 左中央の変更ゾーン
  ctx.beginPath();
  ctx.moveTo(20, 300);
  ctx.lineTo(200, 300);
  ctx.stroke();

  // 右中央の変更ゾーン
  ctx.beginPath();
  ctx.moveTo(400, 300);
  ctx.lineTo(580, 300);
  ctx.stroke();

  // 影リセット
  ctx.shadowBlur = 0;
}

function drawDots() {
  ctx.shadowBlur = 8;
  ctx.shadowColor = varColor('--neon-yellow');
  ctx.fillStyle = varColor('--neon-yellow');

  dots.forEach(dot => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

/**
 * 車のレンダリング
 */
function drawCar(car, mainColor, glowColor, isInvulnerable) {
  // 無敵中の点滅処理
  if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(car.x, car.y);

  // 向き（direction）に応じて回転を適用する
  let angle = 0;
  if (car.direction === 'UP') angle = -Math.PI / 2;
  else if (car.direction === 'DOWN') angle = Math.PI / 2;
  else if (car.direction === 'LEFT') angle = Math.PI;
  else if (car.direction === 'RIGHT') angle = 0;

  ctx.rotate(angle);

  // ネオンシャドウ
  ctx.shadowBlur = 12;
  ctx.shadowColor = mainColor;

  // 車の輪郭（未来的なF1/スポーツカースタイル）
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#050608';

  const w = car.height; // 進行方向がX軸なので、長さが長方形の幅になる
  const h = car.width;  // 車幅が高さになる

  // ボディの描画
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // フロントガラス・ネオンライン
  ctx.shadowBlur = 0;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w/4, -h/3);
  ctx.lineTo(w/4, h/3);
  ctx.lineTo(-w/8, h/3);
  ctx.lineTo(-w/8, -h/3);
  ctx.closePath();
  ctx.stroke();

  // タイヤ（4輪）
  ctx.fillStyle = '#111';
  ctx.fillRect(-w/3 - 4, -h/2 - 2, 8, 2);
  ctx.fillRect(-w/3 - 4, h/2, 8, 2);
  ctx.fillRect(w/3 - 4, -h/2 - 2, 8, 2);
  ctx.fillRect(w/3 - 4, h/2, 8, 2);

  // ヘッドライト（黄色または青の発光）
  ctx.fillStyle = glowColor;
  ctx.fillRect(w/2 - 2, -h/4, 2, 2);
  ctx.fillRect(w/2 - 2, h/4 - 2, 2, 2);

  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}
