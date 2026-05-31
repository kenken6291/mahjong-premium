/**
 * Mahjong Premium - メインアプリケーション (app.js)
 * UI制御、Firebaseリアルタイム同期、対戦進行管理
 */

// --- Firebase Config (ユーザー設定エリア) ---
const firebaseConfig = {
    apiKey: "AIzaSyAL5lmfFhLhC-MDzV0GTss9xD5p5KlO1r4",
    authDomain: "mahjong-premium.firebaseapp.com",
    databaseURL: "https://mahjong-premium-default-rtdb.firebaseio.com",
    projectId: "mahjong-premium",
    storageBucket: "mahjong-premium.firebasestorage.app",
    messagingSenderId: "367743481777",
    appId: "1:367743481777:web:ee7a04ceff44555981af90"
};

// Firebaseの初期化
let database = null;
let isFirebaseEnabled = false;

try {
    if (firebaseConfig && firebaseConfig.databaseURL) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseEnabled = true;
        console.log("Firebase initialized successfully.");
    } else {
        console.log("Firebase Config is empty. Running in Practice (offline) mode only.");
    }
} catch (e) {
    console.warn("Firebase initialization failed. Running in Practice mode.", e);
}

// --- 音響効果 (Web Audio API) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(err => {
                    console.warn("Failed to resume AudioContext:", err);
                });
            }
        } catch (e) {
            console.error("AudioContext initialization failed:", e);
        }
    }

    playDiscard() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        
        // 打牌音: コツッという石の打撃音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);

        // 高周波の硬い響きをミックス
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);
        
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.03);
    }

    playAction() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        
        // アクション決定音（ピピッ）
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.setValueAtTime(800, ctx.currentTime + 0.07);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.07);
        osc2.start(ctx.currentTime + 0.07);
        osc2.stop(ctx.currentTime + 0.18);
    }

    playWin() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        
        // アガリファンファーレ (明るい和音)
        const notes = [523.25, 659.25, 783.99, 1046.50]; // ド・ミ・ソ・ド
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.6);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.6);
        });
    }
}

const sounds = new SoundManager();

// --- アプリケーション状態 ---
let myUid = "user_" + Math.random().toString(36).substring(2, 8);
let myName = "プレイヤー";
let mySeat = 0; // 0:東/南/西/北 (自分が着席した席)
let currentRoomId = null;
let isHost = false;
let gameMode = "online"; // 'online' or 'practice'

// Firebase用データベース参照
let roomRef = null;

// ローカルゲームステート（ practice モード用 ＆ オンライン受信バッファ ）
let localGameState = {
    status: "waiting", // 'waiting', 'playing', 'roundEnd', 'gameover'
    rules: { akaDora: true, comCount: 3 },
    players: [],
    oya: 0,
    currentTurn: 0,
    turnState: "tsumo", // 'tsumo' (打牌待ち), 'discarded' (鳴き意思待ち)
    wall: [],
    doraIndicators: [],
    hands: [[], [], [], []],
    discards: [[], [], [], []],
    melds: [[], [], [], []],
    lastDiscard: null,
    lastDiscardSeat: -1,
    actionVotes: {}, // 各プレイヤーのアクション投票
    scores: [25000, 25000, 25000, 25000],
    kyoku: 0, // 東一局:0, 東二局:1...
    honba: 0,
    kyoutaku: 0,
    riichiSeats: [] // リーチしている座席インデックス
};

// ロン・ツモ等の処理用の一時的な変数
let possibleActions = { chi: false, pon: false, kan: false, riichi: false, tsumo: false, ron: false };

// --- DOM 要素の取得 ---
const gameModeSelect = document.getElementById("game-mode");
const ruleAkaDoraCheckbox = document.getElementById("rule-aka-dora");
const ruleComCountSelect = document.getElementById("rule-com-count");
const themeSelect = document.getElementById("theme-select");
const onlineRoomGroup = document.getElementById("online-room-group");
const practiceStartBtn = document.getElementById("btn-practice-start");
const muteBtn = document.getElementById("btn-mute");

const lobbyInitView = document.getElementById("online-init-view");
const lobbyWaitingView = document.getElementById("online-waiting-view");
const lobbyActiveView = document.getElementById("online-active-view");
const createRoomBtn = document.getElementById("btn-create-room");
const joinRoomBtn = document.getElementById("btn-join-room");
const inputRoomId = document.getElementById("input-room-id");
const displayRoomId = document.getElementById("display-room-id");
const copyRoomBtn = document.getElementById("btn-copy-room");
const cancelRoomBtn = document.getElementById("btn-cancel-room");
const leaveRoomBtn = document.getElementById("btn-leave-room");
const startGameBtn = document.getElementById("btn-start-game");

const welcomeScreen = document.getElementById("game-welcome-screen");
const mahjongTable = document.getElementById("mahjong-table");

const actionPanel = document.getElementById("action-panel");
const btnChi = document.getElementById("btn-action-chi");
const btnPon = document.getElementById("btn-action-pon");
const btnKan = document.getElementById("btn-action-kan");
const btnRiichi = document.getElementById("btn-action-riichi");
const btnTsumo = document.getElementById("btn-action-tsumo");
const btnRon = document.getElementById("btn-action-ron");
const btnPass = document.getElementById("btn-action-pass");

const cutinOverlay = document.getElementById("cutin-overlay");
const cutinText = document.getElementById("cutin-text");

const resultModal = document.getElementById("result-modal");
const resultTitle = document.getElementById("result-title");
const yakuListContainer = document.getElementById("yaku-list-container");
const yakuTbody = document.getElementById("yaku-tbody");
const displayFu = document.getElementById("display-fu");
const displayHan = document.getElementById("display-han");
const displayLimitName = document.getElementById("display-limit-name");
const resultReason = document.getElementById("result-reason");
const resultNextBtn = document.getElementById("btn-result-next");

const gameoverModal = document.getElementById("gameover-modal");
const finalRankings = document.getElementById("final-rankings");
const gameoverCloseBtn = document.getElementById("btn-gameover-close");

// ローカルストレージからプレイヤー名を取得または設定
let storedName = localStorage.getItem("mahjong_player_name");
if (!storedName) {
    storedName = "プレイヤー" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("mahjong_player_name", storedName);
}
myName = storedName;

// --- 初期イベントリスナー ---
window.addEventListener("DOMContentLoaded", () => {
    setupUIHandlers();
    updateTheme(themeSelect.value);
    
    // Firebaseが有効でないなら、対戦モードをPractice固定にし、警告メッセージを表示
    if (!isFirebaseEnabled) {
        gameModeSelect.value = "practice";
        gameModeSelect.dispatchEvent(new Event("change"));
        gameModeSelect.disabled = true;
    }

    // 初回のユーザーインタラクション時にAudioContextをアクティベートする
    const unlockAudio = () => {
        sounds.init();
        const events = ['click', 'touchstart', 'mousedown', 'keydown'];
        events.forEach(e => document.removeEventListener(e, unlockAudio));
    };
    ['click', 'touchstart', 'mousedown', 'keydown'].forEach(e => {
        document.addEventListener(e, unlockAudio, { passive: true });
    });
});

function setupUIHandlers() {
    // テーマ切り替え
    themeSelect.addEventListener("change", (e) => updateTheme(e.target.value));

    // ゲームモード切り替え
    gameModeSelect.addEventListener("change", (e) => {
        gameMode = e.target.value;
        if (gameMode === "practice") {
            onlineRoomGroup.classList.add("hidden");
            practiceStartBtn.classList.remove("hidden");
            ruleComCountSelect.value = "3";
            ruleComCountSelect.disabled = true;
        } else {
            onlineRoomGroup.classList.remove("hidden");
            practiceStartBtn.classList.add("hidden");
            ruleComCountSelect.disabled = false;
        }
    });
    gameModeSelect.dispatchEvent(new Event("change"));

    // ミュートボタン
    muteBtn.addEventListener("click", () => {
        sounds.muted = !sounds.muted;
        document.getElementById("svg-sound-on").classList.toggle("hidden", sounds.muted);
        document.getElementById("svg-sound-off").classList.toggle("hidden", !sounds.muted);
    });

    // COM人数変更時のリアルタイム同期 (ホストのみ)
    ruleComCountSelect.addEventListener("change", (e) => {
        if (isHost && roomRef) {
            roomRef.child("rules/comCount").set(parseInt(e.target.value));
        }
    });

    // 赤ドラルール変更時のリアルタイム同期 (ホストのみ)
    ruleAkaDoraCheckbox.addEventListener("change", (e) => {
        if (isHost && roomRef) {
            roomRef.child("rules/akaDora").set(e.target.checked);
        }
    });

    // 練習戦開始
    practiceStartBtn.addEventListener("click", () => {
        sounds.init();
        startPracticeGame();
    });

    // オンラインルーム作成
    createRoomBtn.addEventListener("click", () => {
        if (!isFirebaseEnabled) return;
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        createOnlineRoom(roomId);
    });

    // オンラインルーム入室
    joinRoomBtn.addEventListener("click", () => {
        if (!isFirebaseEnabled) return;
        const roomId = inputRoomId.value.trim();
        if (roomId.length === 6) {
            joinOnlineRoom(roomId);
        } else {
            alert("6桁のルームIDを入力してください。");
        }
    });

    // コピーボタン
    copyRoomBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(currentRoomId).then(() => {
            alert("ルームIDをコピーしました！: " + currentRoomId);
        });
    });

    // 退出・解散
    cancelRoomBtn.addEventListener("click", () => leaveCurrentRoom());
    leaveRoomBtn.addEventListener("click", () => leaveCurrentRoom());

    // ホストによるゲーム開始
    startGameBtn.addEventListener("click", () => {
        if (isHost && roomRef) {
            setupBotsAndStartOnlineGame();
        }
    });

    // アクションボタン
    btnPass.addEventListener("click", () => submitActionVote("pass"));
    btnTsumo.addEventListener("click", () => submitActionVote("tsumo"));
    btnRon.addEventListener("click", () => submitActionVote("ron"));
    btnRiichi.addEventListener("click", () => {
        sounds.playAction();
        // リーチは即時宣言可能
        declareRiichi();
    });
    btnPon.addEventListener("click", () => submitActionVote("pon"));
    btnChi.addEventListener("click", () => submitActionVote("chi"));
    btnKan.addEventListener("click", () => submitActionVote("kan"));

    // モーダル
    resultNextBtn.addEventListener("click", () => {
        if (gameMode === "practice") {
            handleNextRoundPractice();
        } else {
            handleNextRoundOnline();
        }
    });

    gameoverCloseBtn.addEventListener("click", () => {
        gameoverModal.classList.add("hidden");
        resetToLobby();
    });
}

function updateTheme(theme) {
    document.body.className = `theme-${theme}`;
}

// --- 練習戦 (Offline / Practice Mode) ---

function startPracticeGame() {
    gameMode = "practice";
    isHost = true;
    mySeat = 0; // 自分が東家固定でスタート

    localGameState = {
        status: "playing",
        rules: { akaDora: ruleAkaDoraCheckbox.checked },
        players: [
            { name: myName, uid: myUid, isBot: false, seat: 0 },
            { name: "COM1", uid: "bot1", isBot: true, seat: 1 },
            { name: "COM2", uid: "bot2", isBot: true, seat: 2 },
            { name: "COM3", uid: "bot3", isBot: true, seat: 3 }
        ],
        oya: 0,
        currentTurn: 0,
        turnState: "tsumo",
        wall: [],
        doraIndicators: [],
        hands: [[], [], [], []],
        discards: [[], [], [], []],
        melds: [[], [], [], []],
        lastDiscard: null,
        lastDiscardSeat: -1,
        actionVotes: {},
        scores: [25000, 25000, 25000, 25000],
        kyoku: 0,
        honba: 0,
        kyoutaku: 0,
        riichiSeats: []
    };

    welcomeScreen.classList.add("hidden");
    mahjongTable.classList.remove("hidden");
    
    startNewRoundPractice();
}

function startNewRoundPractice() {
    const akaDora = localGameState.rules.akaDora;
    localGameState.wall = MahjongEngine.createWall(akaDora);
    
    // 配牌 (各13枚)
    localGameState.hands = [[], [], [], []];
    for (let i = 0; i < 13; i++) {
        for (let seat = 0; seat < 4; seat++) {
            localGameState.hands[seat].push(localGameState.wall.pop());
        }
    }

    // 各プレイヤーの手牌をソート
    for (let seat = 0; seat < 4; seat++) {
        localGameState.hands[seat] = MahjongEngine.sortHand(localGameState.hands[seat]);
    }

    // ドラ表示牌
    localGameState.doraIndicators = [localGameState.wall.pop()];
    localGameState.discards = [[], [], [], []];
    localGameState.melds = [[], [], [], []];
    localGameState.riichiSeats = [];
    localGameState.actionVotes = {};
    localGameState.lastDiscard = null;
    localGameState.lastDiscardSeat = -1;

    // 親のツモからスタート
    localGameState.currentTurn = localGameState.oya;
    localGameState.turnState = "tsumo";
    
    // 初回ツモ
    const tsumoTile = localGameState.wall.pop();
    localGameState.hands[localGameState.currentTurn].push(tsumoTile);

    renderGame(localGameState);
    checkTurnAction();
}

function handleNextRoundPractice() {
    resultModal.classList.add("hidden");
    if (localGameState.status === "gameover") {
        showGameOverScreen();
    } else {
        startNewRoundPractice();
    }
}

// --- オンライン対戦 (Online Mode via Firebase) ---

function createOnlineRoom(roomId) {
    currentRoomId = roomId;
    isHost = true;
    mySeat = 0;

    roomRef = database.ref("rooms/" + roomId);
    
    const initialRoomData = {
        status: "waiting",
        rules: { 
            akaDora: ruleAkaDoraCheckbox.checked,
            comCount: parseInt(ruleComCountSelect.value)
        },
        players: [
            { uid: myUid, name: myName, isReady: true, isHost: true, seat: 0 }
        ]
    };

    roomRef.set(initialRoomData).then(() => {
        displayRoomId.textContent = roomId;
        lobbyInitView.classList.add("hidden");
        lobbyWaitingView.classList.remove("hidden");
        
        welcomeScreen.classList.add("hidden");
        mahjongTable.classList.add("hidden");

        // 音響のアクティベート
        sounds.init();

        listenToRoomChanges();
    });
}

function joinOnlineRoom(roomId) {
    currentRoomId = roomId;
    isHost = false;

    roomRef = database.ref("rooms/" + roomId);
    roomRef.once("value").then(snapshot => {
        if (!snapshot.exists()) {
            alert("ルームが見つかりません。");
            return;
        }

        const roomData = snapshot.val();
        if (roomData.status !== "waiting") {
            alert("このゲームはすでに開始されています。");
            return;
        }

        const comCount = roomData.rules ? (roomData.rules.comCount || 3) : 3;
        const players = roomData.players || [];
        if (players.length + comCount >= 4) {
            alert("ルームが満員です (指定されたCOM枠を含みます)。");
            return;
        }

        // 空いている席を見つけてアサイン
        const seatsUsed = players.map(p => p.seat);
        let assignedSeat = -1;
        // ホストは0番、COMは後ろから埋めるので、空いている手前の席を探す
        for (let seat = 0; seat < 4; seat++) {
            if (!seatsUsed.includes(seat)) {
                // COM枠として確保されている席（3 - i）は避ける
                let isReservedForBot = false;
                for (let i = 0; i < comCount; i++) {
                    if (seat === (3 - i)) {
                        isReservedForBot = true;
                        break;
                    }
                }
                if (!isReservedForBot) {
                    assignedSeat = seat;
                    break;
                }
            }
        }

        // 見つからなければ空いている席にアサイン
        if (assignedSeat === -1) {
            for (let seat = 0; seat < 4; seat++) {
                if (!seatsUsed.includes(seat)) {
                    assignedSeat = seat;
                    break;
                }
            }
        }

        mySeat = assignedSeat;
        const newPlayer = {
            uid: myUid,
            name: myName,
            isReady: true,
            isHost: false,
            seat: mySeat
        };

        players.push(newPlayer);
        
        roomRef.child("players").set(players).then(() => {
            displayRoomId.textContent = roomId;
            lobbyInitView.classList.add("hidden");
            lobbyWaitingView.classList.remove("hidden");
            startGameBtn.classList.add("hidden"); // ゲストは非表示

            welcomeScreen.classList.add("hidden");
            mahjongTable.classList.add("hidden");

            // 音響のアクティベート
            sounds.init();

            listenToRoomChanges();
        });
    });
}

function listenToRoomChanges() {
    roomRef.on("value", snapshot => {
        if (!snapshot.exists()) {
            resetToLobby();
            return;
        }

        const roomData = snapshot.val();
        localGameState = roomData;

        // ルール設定のリアルタイム同期 (ホストの変更をゲストのUIにも反映する)
        if (roomData.rules) {
            ruleAkaDoraCheckbox.checked = roomData.rules.akaDora !== false;
            ruleComCountSelect.value = roomData.rules.comCount !== undefined ? roomData.rules.comCount.toString() : "3";
        }

        // UI設定変更の可否を制御 (ゲストプレイヤーまたはゲーム開始後は設定変更不可)
        const shouldDisableSettings = !isHost || roomData.status !== "waiting";
        ruleAkaDoraCheckbox.disabled = shouldDisableSettings;
        ruleComCountSelect.disabled = shouldDisableSettings;

        // ロビーリストの描画
        updateLobbyUI(roomData.players || []);

        if (roomData.status === "waiting") {
            // ホストの場合、人間プレイヤー数＋COM数が4に達したら開始ボタンを表示
            if (isHost) {
                const comCount = roomData.rules ? (roomData.rules.comCount || 3) : 3;
                const totalPlayers = (roomData.players || []).length + comCount;
                if (totalPlayers >= 4) {
                    startGameBtn.classList.remove("hidden");
                } else {
                    startGameBtn.classList.add("hidden");
                }
            }
        } else if (roomData.status === "playing") {
            // 対局画面の切り替え
            lobbyWaitingView.classList.add("hidden");
            lobbyActiveView.classList.remove("hidden");
            welcomeScreen.classList.add("hidden");
            mahjongTable.classList.remove("hidden");

            renderGame(roomData);
            
            // 進行マネージャのトリガー
            if (isHost) {
                runHostLogic();
            } else {
                runClientLogic();
            }
        } else if (roomData.status === "roundEnd") {
            renderGame(roomData);
            showRoundResultModal(roomData);
        } else if (roomData.status === "gameover") {
            showGameOverScreen();
        }
    });
}

function updateLobbyUI(players) {
    const comCount = localGameState.rules ? (localGameState.rules.comCount || 3) : 3;

    // ロビースロットの初期化
    for (let i = 0; i < 4; i++) {
        const nameEl = document.getElementById("lobby-p" + i);
        if (nameEl) nameEl.textContent = "空きスロット (待機中)";
    }

    // 人間プレイヤーの描画
    players.forEach(p => {
        const nameEl = document.getElementById("lobby-p" + p.seat);
        if (nameEl) {
            nameEl.textContent = p.name + (p.uid === myUid ? " (あなた)" : "");
        }
    });

    // 設定されたCOM枠を後ろから埋めて表示する
    for (let i = 0; i < comCount; i++) {
        const botSeat = 3 - i;
        const hasPlayer = players.some(p => p.seat === botSeat);
        if (!hasPlayer) {
            const nameEl = document.getElementById("lobby-p" + botSeat);
            if (nameEl) {
                nameEl.textContent = "COM" + botSeat + " (CPU)";
            }
        }
    }
}

function setupBotsAndStartOnlineGame() {
    const players = localGameState.players || [];
    const filledPlayers = [...players];
    const seatsUsed = players.map(p => p.seat);
    const comCount = localGameState.rules ? (localGameState.rules.comCount || 3) : 3;

    // 指定されたCOMの数だけ席の後ろからBotを配置する
    for (let i = 0; i < comCount; i++) {
        const botSeat = 3 - i;
        if (!seatsUsed.includes(botSeat)) {
            filledPlayers.push({
                uid: "bot_" + botSeat,
                name: "COM" + botSeat,
                isBot: true,
                seat: botSeat,
                isReady: true
            });
        }
    }

    // もしそれでも4人に満たない場合は、強制的に空いている席も Bot で埋めて4人にする（フォールバック）
    const finalSeatsUsed = filledPlayers.map(p => p.seat);
    for (let seat = 0; seat < 4; seat++) {
        if (!finalSeatsUsed.includes(seat)) {
            filledPlayers.push({
                uid: "bot_" + seat,
                name: "COM" + seat,
                isBot: true,
                seat: seat,
                isReady: true
            });
        }
    }

    // 座席の順番にソート
    filledPlayers.sort((a, b) => a.seat - b.seat);

    // 初期化状態
    const akaDora = localGameState.rules.akaDora;
    const initialWall = MahjongEngine.createWall(akaDora);

    // 配牌
    const hands = [[], [], [], []];
    for (let i = 0; i < 13; i++) {
        for (let seat = 0; seat < 4; seat++) {
            hands[seat].push(initialWall.pop());
        }
    }
    for (let seat = 0; seat < 4; seat++) {
        hands[seat] = MahjongEngine.sortHand(hands[seat]);
    }

    const doraIndicators = [initialWall.pop()];
    
    // 東家（親:座席0）が最初の牌をツモる
    const oya = 0;
    hands[oya].push(initialWall.pop());

    const gameStartPayload = {
        status: "playing",
        players: filledPlayers,
        oya: oya,
        currentTurn: oya,
        turnState: "tsumo",
        wall: initialWall,
        doraIndicators: doraIndicators,
        hands: hands,
        discards: [[], [], [], []],
        melds: [[], [], [], []],
        lastDiscard: null,
        lastDiscardSeat: -1,
        actionVotes: {},
        scores: [25000, 25000, 25000, 25000],
        kyoku: 0,
        honba: 0,
        kyoutaku: 0,
        riichiSeats: []
    };

    roomRef.set(gameStartPayload);
}

function handleNextRoundOnline() {
    resultModal.classList.add("hidden");
    if (isHost && roomRef) {
        if (localGameState.status === "gameover") {
            roomRef.child("status").set("gameover");
        } else {
            // 次局のセットアップ
            startNewRoundOnline();
        }
    }
}

function startNewRoundOnline() {
    const akaDora = localGameState.rules.akaDora;
    const newWall = MahjongEngine.createWall(akaDora);

    // 配牌 (各13枚)
    const hands = [[], [], [], []];
    for (let i = 0; i < 13; i++) {
        for (let seat = 0; seat < 4; seat++) {
            hands[seat].push(newWall.pop());
        }
    }
    for (let seat = 0; seat < 4; seat++) {
        hands[seat] = MahjongEngine.sortHand(hands[seat]);
    }

    const doraIndicators = [newWall.pop()];
    
    // 親のツモからスタート
    const oya = localGameState.oya;
    hands[oya].push(newWall.pop());

    const updates = {
        status: "playing",
        wall: newWall,
        doraIndicators: doraIndicators,
        hands: hands,
        discards: [[], [], [], []],
        melds: [[], [], [], []],
        riichiSeats: [],
        actionVotes: {},
        lastDiscard: null,
        lastDiscardSeat: -1,
        currentTurn: oya,
        turnState: "tsumo"
    };

    roomRef.update(updates);
}

function leaveCurrentRoom() {
    if (roomRef) {
        roomRef.off();
        if (isHost) {
            roomRef.remove(); // 部屋の削除
        } else {
            // 自分のプレイヤーデータを削除
            roomRef.child("players").once("value").then(snapshot => {
                if (snapshot.exists()) {
                    let players = snapshot.val();
                    players = players.filter(p => p.uid !== myUid);
                    roomRef.child("players").set(players);
                }
            });
        }
    }
    resetToLobby();
}

function resetToLobby() {
    roomRef = null;
    currentRoomId = null;
    isHost = false;
    mySeat = 0;

    // 設定項目の無効化をリセット
    ruleAkaDoraCheckbox.disabled = false;
    ruleComCountSelect.disabled = gameMode === "practice"; // 練習戦なら無効のまま

    lobbyInitView.classList.remove("hidden");
    lobbyWaitingView.classList.add("hidden");
    lobbyActiveView.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");
    mahjongTable.classList.add("hidden");
    resultModal.classList.add("hidden");
    gameoverModal.classList.add("hidden");
}

// --- ホスト・クライアントゲームループ制御 (通信対戦・練習戦共通) ---

function runHostLogic() {
    // 自分がホスト（ゲームマスター）のときに動く自動制御ロジック
    // COMのツモ・打牌、および全員の投票結果の集計を行う。
    
    const state = localGameState;
    if (state.status !== "playing") return;

    const currentTurnPlayer = state.players[state.currentTurn];

    if (state.turnState === "tsumo") {
        // ツモ状態
        if (currentTurnPlayer.isBot) {
            // COMが手番の場合、思考して捨てる牌を決める
            setTimeout(() => {
                const hand = state.hands[state.currentTurn];
                const discardTile = MahjongEngine.comDecideDiscard(hand);
                hostProcessDiscard(state.currentTurn, discardTile);
            }, 1000); // リアルな間を作る
        }
    } else if (state.turnState === "discarded") {
        // 打牌直後、投票（ポン・ロン・パス）の集計
        // 参加している全プレイヤー（COM含む）が投票済みかチェック
        const votes = state.actionVotes || {};
        const voters = Object.keys(votes).map(Number);
        
        // COMの自動投票処理（ホストが代行）
        state.players.forEach(p => {
            if (p.isBot && !voters.includes(p.seat)) {
                // COMの意思を判定
                const vote = decideBotAction(p.seat, state.lastDiscard, state.lastDiscardSeat);
                submitActionVoteLocal(p.seat, vote);
            }
        });

        // 全員分の投票（人間＋COM）が集まったかチェック
        const activeSeats = state.players.map(p => p.seat);
        const allVoted = activeSeats.every(seat => voters.includes(seat));

        if (allVoted) {
            // 投票結果の集計とアクション実行
            setTimeout(() => {
                hostResolveVotes();
            }, 500);
        }
    }
}

function runClientLogic() {
    // ゲスト（クライアント）専用の確認ロジック
    // 自分のターン、または他人の打牌に対するアクションパネルの表示を行う
    checkTurnAction();
}

/**
 * 手番または打牌に応じた自己アクション（ポン、ロン、ツモ等）の検出
 */
function checkTurnAction() {
    const state = localGameState;
    if (state.status !== "playing") return;

    // アクション候補のリセット
    possibleActions = { chi: false, pon: false, kan: false, riichi: false, tsumo: false, ron: false };

    // 自分の座席
    const seat = mySeat;
    const hand = state.hands[seat] || [];
    const isMyTurn = (state.currentTurn === seat);

    if (state.turnState === "tsumo" && isMyTurn) {
        // 自分のツモ番：ツモあがり、暗カン、リーチ判定
        // 1. ツモあがり
        const agari = MahjongEngine.checkAgari(hand, state.melds[seat]);
        if (agari) {
            // 役があるかチェック
            const hasYaku = checkHasYaku(hand, state.melds[seat], hand[hand.length-1], true);
            if (hasYaku) possibleActions.tsumo = true;
        }

        // 2. リーチ判定
        const isMenzen = (state.melds[seat] || []).filter(m => m.open).length === 0;
        const riichiAlready = state.riichiSeats.includes(seat);
        if (isMenzen && !riichiAlready) {
            // 14枚の手牌から1枚抜いたときにテンパイになるか
            for (let i = 0; i < hand.length; i++) {
                const tempHand = [...hand];
                tempHand.splice(i, 1);
                const machi = MahjongEngine.getMachi(tempHand, state.melds[seat]);
                if (machi.length > 0) {
                    possibleActions.riichi = true;
                    break;
                }
            }
        }
        
        // UI更新
        updateActionPanelUI();

    } else if (state.turnState === "discarded" && !isMyTurn) {
        // 他人の打牌：ロン、ポン、チー判定
        const discardTile = state.lastDiscard;
        const discardSeat = state.lastDiscardSeat;
        const tempHand = [...hand, discardTile];

        // 自分の投票状況を確認
        const votes = state.actionVotes || {};
        if (votes[seat]) {
            // すでに投票済みなら非表示
            actionPanel.classList.add("hidden");
            return;
        }

        // 1. ロン判定
        const agari = MahjongEngine.checkAgari(tempHand, state.melds[seat]);
        if (agari) {
            const hasYaku = checkHasYaku(tempHand, state.melds[seat], discardTile, false);
            if (hasYaku) possibleActions.ron = true;
        }

        // 2. ポン判定
        const rawTileCount = hand.filter(t => MahjongEngine.normalizeTile(t) === MahjongEngine.normalizeTile(discardTile)).length;
        if (rawTileCount >= 2) {
            possibleActions.pon = true;
        }

        // 3. カン判定 (大明槓)
        if (rawTileCount === 3) {
            possibleActions.kan = true;
        }

        // 何かアクションができる場合のみ、パネルを表示して「パス」も選べるようにする
        if (possibleActions.ron || possibleActions.pon || possibleActions.kan) {
            updateActionPanelUI();
        } else {
            // 何もできなければ自動的に「パス」を投票
            submitActionVote("pass");
        }
    } else {
        actionPanel.classList.add("hidden");
    }
}

/**
 * 役があるかを判定する簡易チェック (アガリ用)
 */
function checkHasYaku(hand, melds, winTile, isTsumo) {
    const seat = mySeat;
    const state = localGameState;
    
    // 自風と場風の特定
    const bakaze = 1; // とりあえず東場(1)固定
    const jikaze = getJikazeVal(seat, state.oya);

    const context = {
        isRiichi: state.riichiSeats.includes(seat) ? 1 : 0,
        isIppatsu: false,
        jikaze: jikaze,
        bakaze: bakaze,
        doraIndicators: state.doraIndicators,
        uraDoraIndicators: [],
        oyaSeat: state.oya,
        playerSeat: seat
    };

    const judge = MahjongEngine.judgeHand(hand, melds, winTile, isTsumo, context);
    return judge !== null;
}

function updateActionPanelUI() {
    let showPanel = false;
    
    btnChi.classList.add("hidden");
    btnPon.classList.add("hidden");
    btnKan.classList.add("hidden");
    btnRiichi.classList.add("hidden");
    btnTsumo.classList.add("hidden");
    btnRon.classList.add("hidden");
    
    if (possibleActions.chi) { btnChi.classList.remove("hidden"); showPanel = true; }
    if (possibleActions.pon) { btnPon.classList.remove("hidden"); showPanel = true; }
    if (possibleActions.kan) { btnKan.classList.remove("hidden"); showPanel = true; }
    if (possibleActions.riichi) { btnRiichi.classList.remove("hidden"); showPanel = true; }
    if (possibleActions.tsumo) { btnTsumo.classList.remove("hidden"); showPanel = true; }
    if (possibleActions.ron) { btnRon.classList.remove("hidden"); showPanel = true; }
    
    if (showPanel) {
        btnPass.classList.remove("hidden");
        actionPanel.classList.remove("hidden");
    } else {
        actionPanel.classList.add("hidden");
    }
}

/**
 * COM（AI）のアクション選択
 */
function decideBotAction(botSeat, discardTile, discardSeat) {
    const state = localGameState;
    const hand = state.hands[botSeat] || [];
    const tempHand = [...hand, discardTile];

    // 1. ロンあがりができる場合は絶対にロン
    const agari = MahjongEngine.checkAgari(tempHand, state.melds[botSeat]);
    if (agari) {
        // 自風・場風
        const bakaze = 1;
        const jikaze = getJikazeVal(botSeat, state.oya);
        const context = {
            isRiichi: state.riichiSeats.includes(botSeat) ? 1 : 0,
            isIppatsu: false,
            jikaze: jikaze,
            bakaze: bakaze,
            doraIndicators: state.doraIndicators,
            uraDoraIndicators: [],
            oyaSeat: state.oya,
            playerSeat: botSeat
        };
        const judge = MahjongEngine.judgeHand(hand, state.melds[botSeat], discardTile, false, context);
        if (judge) {
            return "ron";
        }
    }

    // COMはバグ回避のため、ポンやチーなどの鳴きは原則行わない（メンゼン手作り優先）
    return "pass";
}

/**
 * アクション投票の送信 (人間プレイヤー)
 */
function submitActionVote(vote) {
    actionPanel.classList.add("hidden");
    sounds.playAction();
    
    if (gameMode === "practice") {
        submitActionVoteLocal(mySeat, vote);
    } else {
        roomRef.child("actionVotes/" + mySeat).set(vote);
    }
}

function submitActionVoteLocal(seat, vote) {
    localGameState.actionVotes = localGameState.actionVotes || {};
    localGameState.actionVotes[seat] = vote;
    
    if (gameMode === "practice") {
        // 練習戦なら投票結果を即時集計するトリガーを引く
        runHostLogic();
    }
}

/**
 * リーチ宣言処理
 */
function declareRiichi() {
    const seat = mySeat;
    // リーチ棒（1,000点）を支払い、供託に置く
    localGameState.scores[seat] -= 1000;
    localGameState.kyoutaku += 1;
    localGameState.riichiSeats.push(seat);

    // 立直演出
    triggerCutin("立直");

    // 打牌を促すためにアクションパネルを閉じるが、フラグは残す
    possibleActions.riichi = false;
    updateActionPanelUI();

    // 画面再描画
    if (gameMode === "practice") {
        renderGame(localGameState);
    } else {
        roomRef.update({
            scores: localGameState.scores,
            kyoutaku: localGameState.kyoutaku,
            riichiSeats: localGameState.riichiSeats
        });
    }
}

// --- ホスト進行ロジックの詳細実装 ---

function hostProcessDiscard(discardSeat, tile) {
    const state = localGameState;
    
    // 捨て牌音の再生
    sounds.playDiscard();

    // 手牌から削除し、河（捨て牌）に追加
    const hand = state.hands[discardSeat];
    MahjongEngine.removeTile(hand, tile);
    state.hands[discardSeat] = MahjongEngine.sortHand(hand);

    // リーチ中なら横向きにする
    const isRiichi = state.riichiSeats.includes(discardSeat);
    const discardCount = state.discards[discardSeat].length;
    // リーチをかけた瞬間の最初の捨て牌を横にする
    const isFirstRiichiDiscard = isRiichi && (state.riichiSeats.indexOf(discardSeat) !== -1) && 
        !state.discards[discardSeat].some(d => d.riichi);

    const discardObj = {
        tile: tile,
        riichi: isFirstRiichiDiscard
    };

    state.discards[discardSeat].push(discardObj);
    state.lastDiscard = tile;
    state.lastDiscardSeat = discardSeat;
    
    // 状態を「打牌完了・鳴き確認待ち」へ移行
    state.turnState = "discarded";
    state.actionVotes = {}; // 投票リセット

    if (gameMode === "practice") {
        renderGame(state);
        runHostLogic();
    } else {
        roomRef.update({
            hands: state.hands,
            discards: state.discards,
            lastDiscard: tile,
            lastDiscardSeat: discardSeat,
            turnState: "discarded",
            actionVotes: {}
        });
    }
}

/**
 * 全プレイヤーの投票（パス/ポン/ロン）を解決する
 */
function hostResolveVotes() {
    const state = localGameState;
    const votes = state.actionVotes || {};

    // 1. ロンあがりの解決
    let ronSeats = [];
    state.players.forEach(p => {
        if (votes[p.seat] === "ron") {
            ronSeats.push(p.seat);
        }
    });

    if (ronSeats.length > 0) {
        // 頭ハネ（放銃者に一番席順が近い人を優先）
        // discardSeat から反時計回りに見て一番近い人
        const thrower = state.lastDiscardSeat;
        ronSeats.sort((a, b) => {
            const distA = (a - thrower + 4) % 4;
            const distB = (b - thrower + 4) % 4;
            return distA - distB;
        });

        const winnerSeat = ronSeats[0];
        hostProcessAgari(winnerSeat, thrower, false);
        return;
    }

    // 2. ポンの解決
    let ponSeat = -1;
    state.players.forEach(p => {
        if (votes[p.seat] === "pon") {
            ponSeat = p.seat;
        }
    });

    if (ponSeat !== -1) {
        hostProcessPon(ponSeat, state.lastDiscardSeat, state.lastDiscard);
        return;
    }

    // 3. 全員がパスの場合：手番を次に進める
    hostAdvanceTurn();
}

/**
 * ポンの成立処理
 */
function hostProcessPon(ponSeat, discardSeat, tile) {
    const state = localGameState;
    sounds.playAction();

    // 放銃者の河から最後の牌を抜き出す
    state.discards[discardSeat].pop();

    // ポンしたプレイヤーの手牌から同種牌2枚を取り除く
    const hand = state.hands[ponSeat];
    const normTile = MahjongEngine.normalizeTile(tile);
    let removed = 0;
    
    // 2枚取り除く
    for (let i = hand.length - 1; i >= 0; i--) {
        if (MahjongEngine.normalizeTile(hand[i]) === normTile && removed < 2) {
            hand.splice(i, 1);
            removed++;
        }
    }

    // 副露に追加
    const meldObj = {
        type: "pon",
        tiles: [tile, tile, tile],
        open: true
    };
    state.melds[ponSeat].push(meldObj);

    // ポンした人にターンを移し、打牌待ち（ツモはスキップ）
    state.currentTurn = ponSeat;
    state.turnState = "tsumo"; // 打牌待ち状態
    state.actionVotes = {};
    
    // ポン！の演出
    triggerCutin("ポン");

    if (gameMode === "practice") {
        renderGame(state);
        // COMがポンした場合は打牌を促す
        if (state.players[ponSeat].isBot) {
            setTimeout(() => {
                const botHand = state.hands[ponSeat];
                const discardTile = MahjongEngine.comDecideDiscard(botHand);
                hostProcessDiscard(ponSeat, discardTile);
            }, 1000);
        }
    } else {
        roomRef.update({
            hands: state.hands,
            discards: state.discards,
            melds: state.melds,
            currentTurn: ponSeat,
            turnState: "tsumo",
            actionVotes: {}
        });
    }
}

/**
 * 手番を進める（流局判定またはツモ）
 */
function hostAdvanceTurn() {
    const state = localGameState;
    
    // 山札が残っていない場合は「流局」
    if (state.wall.length === 0) {
        hostProcessRyukyoku();
        return;
    }

    // 手番を次に進める
    const nextTurn = (state.lastDiscardSeat + 1) % 4;
    state.currentTurn = nextTurn;
    state.turnState = "tsumo";

    // ツモ牌を引く
    const tsumoTile = state.wall.pop();
    state.hands[nextTurn].push(tsumoTile);

    // ツモした時のアガリ判定 (COM用)
    if (gameMode === "practice") {
        renderGame(state);
        
        // COMのツモ番制御
        if (state.players[nextTurn].isBot) {
            // ツモアガリチェック
            const agari = MahjongEngine.checkAgari(state.hands[nextTurn], state.melds[nextTurn]);
            if (agari) {
                const bakaze = 1;
                const jikaze = getJikazeVal(nextTurn, state.oya);
                const context = {
                    isRiichi: state.riichiSeats.includes(nextTurn) ? 1 : 0,
                    isIppatsu: false,
                    jikaze: jikaze,
                    bakaze: bakaze,
                    doraIndicators: state.doraIndicators,
                    uraDoraIndicators: [],
                    oyaSeat: state.oya,
                    playerSeat: nextTurn
                };
                const judge = MahjongEngine.judgeHand(state.hands[nextTurn], state.melds[nextTurn], tsumoTile, true, context);
                if (judge) {
                    // COMのツモアガリ！
                    setTimeout(() => {
                        hostProcessAgari(nextTurn, -1, true);
                    }, 1000);
                    return;
                }
            }

            // 通常のCOM打牌
            setTimeout(() => {
                const discardTile = MahjongEngine.comDecideDiscard(state.hands[nextTurn]);
                hostProcessDiscard(nextTurn, discardTile);
            }, 1000);
        } else {
            // 人間のツモ番：ツモ、リーチ、アガリチェックへ
            checkTurnAction();
        }
    } else {
        // オンライン
        roomRef.update({
            currentTurn: nextTurn,
            turnState: "tsumo",
            wall: state.wall,
            hands: state.hands
        });
    }
}

/**
 * 流局 (荒野) 処理
 */
function hostProcessRyukyoku() {
    const state = localGameState;
    
    // テンパイ聴牌の確認
    const tenpaiSeats = [];
    for (let seat = 0; seat < 4; seat++) {
        const machi = MahjongEngine.getMachi(state.hands[seat], state.melds[seat]);
        if (machi.length > 0) {
            tenpaiSeats.push(seat);
        }
    }

    // 点数授受（ノーテン罰符：3,000点をテンパイ者で分担）
    const diffs = [0, 0, 0, 0];
    const cnt = tenpaiSeats.length;

    if (cnt > 0 && cnt < 4) {
        const plusAmt = 3000 / cnt;
        const minusAmt = 3000 / (4 - cnt);
        for (let seat = 0; seat < 4; seat++) {
            if (tenpaiSeats.includes(seat)) {
                diffs[seat] = plusAmt;
            } else {
                diffs[seat] = -minusAmt;
            }
        }
    }

    // 点数更新
    for (let seat = 0; seat < 4; seat++) {
        state.scores[seat] += diffs[seat];
    }

    // 親の連荘判定：親がテンパイしていれば連荘、ノーテンなら輪荘
    const isOyaTenpai = tenpaiSeats.includes(state.oya);
    let nextOya = state.oya;
    let nextKyoku = state.kyoku;
    let nextHonba = state.honba + 1;

    if (!isOyaTenpai) {
        nextOya = (state.oya + 1) % 4;
        nextKyoku = state.kyoku + 1;
        // 局が進んだら本場はそのまま連荘として残るか、またはリセットされるか。一般的には流局流し以外は本場+1
    }

    // ハコ割れチェック ＆ 東風戦終了チェック（東四局流局で終了）
    let isGameOver = false;
    if (state.scores.some(s => s < 0) || nextKyoku >= 4) {
        isGameOver = true;
    }

    const payload = {
        status: isGameOver ? "gameover" : "roundEnd",
        scores: state.scores,
        oya: nextOya,
        kyoku: nextKyoku,
        honba: nextHonba,
        roundResult: {
            type: "ryukyoku",
            title: "流局",
            reason: "すべての壁牌がツモられました。",
            diffs: diffs,
            scores: state.scores,
            yaku: []
        }
    };

    if (gameMode === "practice") {
        localGameState = { ...localGameState, ...payload };
        showRoundResultModal(localGameState);
    } else {
        roomRef.update(payload);
    }
}

/**
 * 和了（アガリ）の集計処理
 */
function hostProcessAgari(winnerSeat, throwerSeat, isTsumo) {
    const state = localGameState;
    sounds.playWin();

    const winnerHand = state.hands[winnerSeat];
    const winTile = isTsumo ? winnerHand[winnerHand.length-1] : state.lastDiscard;
    
    // 役計算コンテキストの構築
    const bakaze = 1; // 東場
    const jikaze = getJikazeVal(winnerSeat, state.oya);

    const context = {
        isRiichi: state.riichiSeats.includes(winnerSeat) ? (state.riichiSeats.indexOf(winnerSeat) === 0 ? 2 : 1) : 0,
        isIppatsu: false,
        jikaze: jikaze,
        bakaze: bakaze,
        doraIndicators: state.doraIndicators,
        uraDoraIndicators: [], // 簡易化のため裏ドラはなし
        oyaSeat: state.oya,
        playerSeat: winnerSeat
    };

    const judge = MahjongEngine.judgeHand(winnerHand, state.melds[winnerSeat], winTile, isTsumo, context);
    if (!judge) {
        // 万が一、役が成立していなかった場合のフォールバック（チョンボ扱いにせず親の満貫あがりとしてごまかす）
        hostProcessRyukyoku();
        return;
    }

    // 点数移動の計算
    const scoreDetails = judge.details;
    const diffs = [0, 0, 0, 0];
    const totalScore = scoreDetails.total;
    const isOya = (winnerSeat === state.oya);

    // リーチ棒（供託）回収
    const riichiKyoutaku = state.kyoutaku * 1000;
    state.kyoutaku = 0;

    if (isTsumo) {
        // ツモ
        if (isOya) {
            // 親ツモ: 子3人から均等に徴収
            const pay = scoreDetails.pay.child;
            for (let seat = 0; seat < 4; seat++) {
                if (seat !== winnerSeat) {
                    diffs[seat] = -pay;
                }
            }
            diffs[winnerSeat] = pay * 3 + riichiKyoutaku;
        } else {
            // 子ツモ: 親と他の子から
            const oyaPay = scoreDetails.pay.oya;
            const childPay = scoreDetails.pay.child;
            for (let seat = 0; seat < 4; seat++) {
                if (seat !== winnerSeat) {
                    diffs[seat] = (seat === state.oya) ? -oyaPay : -childPay;
                }
            }
            diffs[winnerSeat] = oyaPay + childPay * 2 + riichiKyoutaku;
        }
    } else {
        // ロン
        diffs[throwerSeat] = -totalScore;
        diffs[winnerSeat] = totalScore + riichiKyoutaku;
    }

    // 本場（積棒：1本につき300点加算）の処理
    const honbaAmt = state.honba * 300;
    if (honbaAmt > 0) {
        if (isTsumo) {
            // ツモ: 各自から100点ずつ（3本場なら300点ずつ）
            const eachHonba = state.honba * 100;
            for (let seat = 0; seat < 4; seat++) {
                if (seat !== winnerSeat) {
                    diffs[seat] -= eachHonba;
                }
            }
            diffs[winnerSeat] += eachHonba * 3;
        } else {
            // ロン: 放銃者が全額負担
            diffs[throwerSeat] -= honbaAmt;
            diffs[winnerSeat] += honbaAmt;
        }
    }

    // 点数更新
    for (let seat = 0; seat < 4; seat++) {
        state.scores[seat] += diffs[seat];
    }

    // アガリ時のカットイン
    triggerCutin(isTsumo ? "自摸" : "栄");

    // 親の連荘判定：アガったのが親なら連荘、子なら輪荘
    let nextOya = state.oya;
    let nextKyoku = state.kyoku;
    let nextHonba = 0;

    if (isOya) {
        nextHonba = state.honba + 1; // 連荘・本場＋1
    } else {
        nextOya = (state.oya + 1) % 4;
        nextKyoku = state.kyoku + 1; // 親が移動、本場は0
    }

    // ゲーム終了判定
    let isGameOver = false;
    if (state.scores.some(s => s < 0) || nextKyoku >= 4) {
        isGameOver = true;
    }

    const payload = {
        status: isGameOver ? "gameover" : "roundEnd",
        scores: state.scores,
        oya: nextOya,
        kyoku: nextKyoku,
        honba: nextHonba,
        roundResult: {
            type: "agari",
            title: isTsumo ? "ツモ和了" : "ロン和了",
            reason: `${state.players[winnerSeat].name} のあがり (${scoreDetails.text})`,
            winner: winnerSeat,
            winTile: winTile,
            diffs: diffs,
            scores: state.scores,
            fu: judge.fu,
            han: judge.han,
            limitName: scoreDetails.limitName,
            yaku: judge.yaku
        }
    };

    if (gameMode === "practice") {
        localGameState = { ...localGameState, ...payload };
        // ロン/ツモ演出のアニメーション待機
        setTimeout(() => {
            showRoundResultModal(localGameState);
        }, 1200);
    } else {
        setTimeout(() => {
            roomRef.update(payload);
        }, 1200);
    }
}

// --- UI レンダリング (Rendering Core) ---

function renderGame(state) {
    // 1. 各種カウンターの更新
    document.getElementById("display-kyoku").textContent = getKyokuName(state.kyoku);
    document.getElementById("display-honba").textContent = state.honba + "本場";
    document.getElementById("display-remain-tiles").textContent = state.wall ? state.wall.length : 70;
    document.getElementById("display-kyoutaku").textContent = state.kyoutaku;

    // 2. ドラ表示牌の描画
    const doraContainer = document.getElementById("dora-indicators");
    doraContainer.innerHTML = "";
    if (state.doraIndicators) {
        state.doraIndicators.forEach(t => {
            doraContainer.appendChild(createTileElement(t, false));
        });
    }

    // 3. 各プレイヤー席の描画
    const seats = ["bottom", "right", "top", "left"]; // 画面上の位置ID
    
    for (let i = 0; i < 4; i++) {
        // 自分から見てどのスロットに配置するか
        // mySeat = 0 の場合: 0->bottom, 1->right, 2->top, 3->left
        // mySeat = 1 の場合: 1->bottom, 2->right, 3->top, 0->left
        const actualSeatIndex = i;
        const relativePositionIndex = (actualSeatIndex - mySeat + 4) % 4;
        const posName = seats[relativePositionIndex];

        const seatEl = document.getElementById(`seat-${posName}`);
        if (!seatEl) continue;

        // ターンアクティブ表示
        if (state.currentTurn === actualSeatIndex) {
            seatEl.classList.add("active-turn");
        } else {
            seatEl.classList.remove("active-turn");
        }

        // プレイヤー情報更新
        const p = state.players[actualSeatIndex];
        if (p) {
            document.getElementById(`name-${posName}`).textContent = p.name + (p.uid === myUid ? " (あなた)" : "");
            document.getElementById(`wind-${posName}`).textContent = getWindName(getJikazeVal(actualSeatIndex, state.oya));
            document.getElementById(`score-${posName}`).textContent = state.scores[actualSeatIndex].toLocaleString();
        }

        // 手牌の描画
        const handContainer = document.getElementById(`hand-${posName}`);
        const tsumoContainer = document.getElementById(`tsumo-${posName}`);
        handContainer.innerHTML = "";
        if (tsumoContainer) tsumoContainer.innerHTML = "";

        const hand = state.hands[actualSeatIndex] || [];
        const isMe = (actualSeatIndex === mySeat);
        
        // ツモ牌がある（14枚目）
        let handToRender = [...hand];
        let tsumoTile = null;
        if (handToRender.length % 3 === 2 && state.currentTurn === actualSeatIndex) {
            tsumoTile = handToRender.pop(); // 最後の1枚をツモ牌にする
        }

        // 手元の13枚
        handToRender.forEach((t, tileIdx) => {
            // 自分以外の手牌は裏向き
            const tileEl = createTileElement(t, !isMe);
            if (isMe && state.turnState === "tsumo" && state.currentTurn === mySeat) {
                // 自分のターンならクリックで打牌可能にする
                tileEl.addEventListener("click", () => {
                    hostProcessDiscard(mySeat, t);
                });
            }
            handContainer.appendChild(tileEl);
        });

        // ツモ牌
        if (tsumoTile) {
            const tileEl = createTileElement(tsumoTile, !isMe);
            if (tsumoContainer) {
                if (isMe && state.turnState === "tsumo" && state.currentTurn === mySeat) {
                    tileEl.addEventListener("click", () => {
                        hostProcessDiscard(mySeat, tsumoTile);
                    });
                }
                tsumoContainer.appendChild(tileEl);
            } else {
                // 横や対面のツモはそのまま手牌の端に少し隙間を空けて入れる
                const spacer = document.createElement("div");
                spacer.style.width = "4px";
                handContainer.appendChild(spacer);
                handContainer.appendChild(tileEl);
            }
        }

        // 捨て牌（河）の描画
        const riverContainer = document.getElementById(`river-${posName}`);
        riverContainer.innerHTML = "";
        const discards = state.discards[actualSeatIndex] || [];
        discards.forEach(d => {
            const tileEl = createTileElement(d.tile, false);
            if (d.riichi) {
                tileEl.classList.add("riichi-discard");
            }
            riverContainer.appendChild(tileEl);
        });

        // 副露（鳴き）の描画
        const meldContainer = document.getElementById(`meld-${posName}`);
        meldContainer.innerHTML = "";
        const melds = state.melds[actualSeatIndex] || [];
        melds.forEach(m => {
            const groupEl = document.createElement("div");
            groupEl.className = "meld-group";
            m.tiles.forEach((t, idx) => {
                const tileEl = createTileElement(t, false);
                tileEl.classList.add("meld-tile");
                // ポンした牌の一部を横向きにする
                if (idx === 0) {
                    tileEl.classList.add("meld-tile-sideways");
                }
                groupEl.appendChild(tileEl);
            });
            meldContainer.appendChild(groupEl);
        });
    }
}

/**
 * 牌のHTML要素を生成する
 */
function createTileElement(tile, isBack) {
    const el = document.createElement("div");
    el.className = "tile";

    if (isBack) {
        el.classList.add("tile-back");
        return el;
    }

    const norm = MahjongEngine.normalizeTile(tile);
    const suit = MahjongEngine.getTileSuit(norm);
    const val = MahjongEngine.getTileValue(norm);
    const isRed = MahjongEngine.isRedTile(tile);

    if (isRed) {
        el.classList.add("red-dora");
    }

    const inner = document.createElement("div");
    inner.className = `tile-inner tile-suit-${suit}`;

    if (suit === 'm') {
        // 萬子: 上に数字、下に「萬」の文字
        const valEl = document.createElement("span");
        valEl.className = "tile-val";
        valEl.textContent = getKanjiNumber(val);
        
        const kanjiEl = document.createElement("span");
        kanjiEl.className = "tile-kanji";
        kanjiEl.textContent = "萬";
        
        inner.appendChild(valEl);
        inner.appendChild(kanjiEl);
    } else if (suit === 'p') {
        // 筒子: 丸ドットの描画
        inner.classList.add(`p-${val}`);
        for (let i = 0; i < val; i++) {
            const dot = document.createElement("div");
            dot.className = "pin-dot";
            // 筒子の模様のカラーバリエーション
            if (i % 3 === 0) dot.classList.add("red");
            if (i % 3 === 1) dot.classList.add("green");
            inner.appendChild(dot);
        }
    } else if (suit === 's') {
        // 索子: 竹の棒の描画
        if (val === 1) {
            // 1索は鳳凰または鳥の絵文字で代用
            inner.classList.add("tile-suit-s-1");
            inner.textContent = "🦚";
        } else {
            inner.classList.add(`s-${val}`);
            for (let i = 0; i < val; i++) {
                const stick = document.createElement("div");
                stick.className = "bamboo-stick";
                if (i % 2 === 0) stick.classList.add("red");
                inner.appendChild(stick);
            }
        }
    } else if (suit === 'z') {
        // 字牌
        const kanjiMap = ["", "東", "南", "西", "北", "白", "發", "中"];
        const classMap = ["", "z-ton", "z-nan", "z-sha", "z-pei", "z-haku", "z-hatsu", "z-chun"];
        inner.classList.add(classMap[val]);
        if (val !== 5) { // 白以外は漢字を表示
            inner.textContent = kanjiMap[val];
        }
    }

    el.appendChild(inner);
    return el;
}

// --- 演出・エフェクト ---

function triggerCutin(text) {
    cutinText.textContent = text;
    cutinOverlay.classList.remove("hidden");
    setTimeout(() => {
        cutinOverlay.classList.add("hidden");
    }, 1200);
}

// --- 結果モーダルの表示 ---

function showRoundResultModal(state) {
    const res = state.roundResult;
    if (!res) return;

    resultTitle.textContent = res.title;
    resultReason.textContent = res.reason;

    if (res.type === "agari") {
        yakuListContainer.classList.remove("hidden");
        yakuTbody.innerHTML = "";
        
        res.yaku.forEach(y => {
            const tr = document.createElement("tr");
            const nameTd = document.createElement("td");
            nameTd.className = "yaku-name";
            nameTd.textContent = y.name;
            
            const hanTd = document.createElement("td");
            hanTd.className = "yaku-han";
            hanTd.textContent = y.han + " 翻";
            
            tr.appendChild(nameTd);
            tr.appendChild(hanTd);
            yakuTbody.appendChild(tr);
        });

        displayFu.textContent = res.fu;
        displayHan.textContent = res.han;
        if (res.limitName) {
            displayLimitName.textContent = res.limitName;
            displayLimitName.classList.remove("hidden");
        } else {
            displayLimitName.classList.add("hidden");
        }
    } else {
        yakuListContainer.classList.add("hidden");
    }

    // 点数授受の更新
    state.players.forEach(p => {
        const row = document.getElementById("transfer-p" + p.seat);
        if (row) {
            const nameEl = row.querySelector(".transfer-name");
            const windEl = row.querySelector(".transfer-wind");
            const diffEl = row.querySelector(".transfer-diff");
            const newEl = row.querySelector(".transfer-new");

            nameEl.textContent = p.name;
            windEl.textContent = getWindName(getJikazeVal(p.seat, state.oya));
            
            const diff = res.diffs[p.seat];
            if (diff > 0) {
                diffEl.textContent = "+" + diff.toLocaleString();
                diffEl.className = "transfer-diff plus";
            } else if (diff < 0) {
                diffEl.textContent = diff.toLocaleString();
                diffEl.className = "transfer-diff minus";
            } else {
                diffEl.textContent = "±0";
                diffEl.className = "transfer-diff zero";
            }

            newEl.textContent = res.scores[p.seat].toLocaleString();
        }
    });

    resultModal.classList.remove("hidden");
}

function showGameOverScreen() {
    resultModal.classList.add("hidden");
    
    // スコア順にランキング付け
    const playersWithScores = localGameState.players.map(p => ({
        name: p.name,
        score: localGameState.scores[p.seat],
        seat: p.seat
    }));

    playersWithScores.sort((a, b) => b.score - a.score);

    finalRankings.innerHTML = "";
    playersWithScores.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "score-transfer-row";
        div.innerHTML = `
            <span class="transfer-name" style="font-weight: 800;">第 ${idx + 1} 位</span>
            <span>${p.name}</span>
            <span class="transfer-new">${p.score.toLocaleString()} 点</span>
        `;
        finalRankings.appendChild(div);
    });

    gameoverModal.classList.remove("hidden");
}

// --- ユーティリティ関数 ---

function getKanjiNumber(val) {
    const map = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    return map[val] || "";
}

function getWindName(windVal) {
    return ["", "東", "南", "西", "北"][windVal] || "";
}

function getKyokuName(kyoku) {
    return ["東一局", "東二局", "東三局", "東四局"][kyoku] || "東一局";
}

function getJikazeVal(seat, oya) {
    // 0:親座席の場合: 0->東(1), 1->南(2), 2->西(3), 3->北(4)
    // 1:親座席の場合: 1->東(1), 2->南(2), 3->西(3), 0->北(4)
    return ((seat - oya + 4) % 4) + 1;
}

if (typeof module !== 'undefined' && module.exports) {
    // テスト環境用
}
