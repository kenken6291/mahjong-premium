/**
 * Web Audio API を使用したレトロゲームサウンドクラス
 */
class GameAudio {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isMuted = false;
    this.initialized = false;
  }

  /**
   * ユーザー操作時に呼び出して AudioContext を初期化する
   */
  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.initialized = true;
      this.startEngineSound();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser", e);
    }
  }

  /**
   * エンジン音の開始（低音オシレータのループ）
   */
  startEngineSound() {
    if (!this.initialized || this.isMuted || this.engineOsc) return;

    // 低音エンジン音（三角波）
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime); // C2付近

    // エンジン音は控えめに
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  /**
   * エンジンのピッチ（周波数）を更新する（スピードに応じた音の変化）
   * @param {number} speedRatio 0.0 (停止) から 1.0 (最高速)
   */
  updateEngineSpeed(speedRatio) {
    if (!this.initialized || this.isMuted || !this.engineOsc) return;
    
    // 65Hz (C2) から 130Hz (C3) 程度まで変化させる
    const targetFreq = 65 + (speedRatio * 65);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  /**
   * エンジン音の一時停止
   */
  pauseEngine() {
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * エンジン音の再開
   */
  resumeEngine() {
    if (this.engineGain) {
      const targetGain = this.isMuted ? 0 : 0.08;
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * ドット（餌）を食べる音
   */
  playDotSound() {
    if (!this.initialized || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square'; // レトロなピコピコ感
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.05); // A6へ急速スイープ

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  /**
   * レーンチェンジ時のスライド音
   */
  playLaneChangeSound() {
    if (!this.initialized || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15); // 上昇音

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  /**
   * クラッシュ（激突）音
   */
  playCrashSound() {
    if (!this.initialized || this.isMuted) return;

    const duration = 0.8;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // ホワイトノイズの生成
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // ローパスフィルタで重低音爆発にする
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  /**
   * ステージクリア時のファンファーレ
   */
  playClearJingle() {
    if (!this.initialized || this.isMuted) return;

    this.pauseEngine();

    const tempo = 0.12; // 1音の長さ
    const notes = [
      { freq: 523.25, type: 'square' }, // C5
      { freq: 659.25, type: 'square' }, // E5
      { freq: 783.99, type: 'square' }, // G5
      { freq: 1046.50, type: 'square' }, // C6
      { freq: 1318.51, type: 'square' }, // E6
      { freq: 1567.98, type: 'square' }, // G6 (ハモり)
    ];

    notes.forEach((note, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, this.ctx.currentTime + index * tempo);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime + index * tempo);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + index * tempo + tempo * 1.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + index * tempo);
      osc.stop(this.ctx.currentTime + index * tempo + tempo * 1.6);
    });

    // 少し経ってからエンジン音を再開
    setTimeout(() => this.resumeEngine(), notes.length * tempo * 1000 + 500);
  }

  /**
   * ミュート切り替え
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.engineGain) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      if (this.engineGain) {
        this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      }
    }
    return this.isMuted;
  }
}

// グローバルスコープまたはESモジュールとしてエクスポート
window.GameAudio = GameAudio;
