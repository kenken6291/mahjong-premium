class GameAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.sirenInterval = null;
        this.powerSirenInterval = null;
    }

    init() {
        if (this.ctx) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn("Web Audio API is not supported in this browser.");
                this.muted = true;
                return;
            }
            this.ctx = new AudioContextClass();
        } catch (e) {
            console.error("Failed to initialize AudioContext:", e);
            this.muted = true;
            return;
        }

        if (this.ctx && this.ctx.state === 'suspended') {
            try {
                this.ctx.resume();
            } catch (e) {
                console.error("Failed to resume AudioContext:", e);
            }
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopSiren();
            this.stopPowerSiren();
        }
        return this.muted;
    }

    playWaka() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.quadraticRampToValueAtTime(600, now + 0.04);
            osc.frequency.quadraticRampToValueAtTime(150, now + 0.08);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {
            console.error("Failed to play waka sound:", e);
        }
    }

    playPowerPellet() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {
            console.error("Failed to play power pellet sound:", e);
        }
    }

    playEatGhost() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const duration = 0.4;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.error("Failed to play eat ghost sound:", e);
        }
    }

    playDeath() {
        if (this.muted) return;
        this.init();
        this.stopSiren();
        this.stopPowerSiren();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const duration = 1.2;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, now);
            
            for (let i = 1; i <= 10; i++) {
                const timeOffset = (duration / 10) * i;
                const freq = 500 - (i * 45);
                osc.frequency.setValueAtTime(freq, now + timeOffset);
            }

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.error("Failed to play death sound:", e);
        }
    }

    playLevelComplete() {
        if (this.muted) return;
        this.init();
        this.stopSiren();
        this.stopPowerSiren();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
            const noteDuration = 0.15;

            notes.forEach((freq, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + index * noteDuration);

                gain.gain.setValueAtTime(0.15, now + index * noteDuration);
                gain.gain.linearRampToValueAtTime(0.01, now + (index + 1) * noteDuration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + index * noteDuration);
                osc.stop(now + (index + 1) * noteDuration);
            });
        } catch (e) {
            console.error("Failed to play level complete sound:", e);
        }
    }

    playStartBGM() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const introMelody = [
                { note: 247.94, dur: 0.1 },
                { note: 495.88, dur: 0.1 },
                { note: 369.99, dur: 0.1 },
                { note: 311.13, dur: 0.1 },
                { note: 495.88, dur: 0.08 },
                { note: 369.99, dur: 0.08 },
                { note: 311.13, dur: 0.15 },
                
                { note: 261.63, dur: 0.1 },
                { note: 523.25, dur: 0.1 },
                { note: 392.00, dur: 0.1 },
                { note: 329.63, dur: 0.1 },
                { note: 523.25, dur: 0.08 },
                { note: 392.00, dur: 0.08 },
                { note: 329.63, dur: 0.15 },

                { note: 247.94, dur: 0.1 },
                { note: 495.88, dur: 0.1 },
                { note: 369.99, dur: 0.1 },
                { note: 311.13, dur: 0.1 },
                { note: 495.88, dur: 0.08 },
                { note: 369.99, dur: 0.08 },
                { note: 311.13, dur: 0.15 },

                { note: 311.13, dur: 0.05 },
                { note: 329.63, dur: 0.05 },
                { note: 349.23, dur: 0.05 },
                { note: 369.99, dur: 0.05 },
                { note: 392.00, dur: 0.05 },
                { note: 415.30, dur: 0.05 },
                { note: 440.00, dur: 0.05 },
                { note: 495.88, dur: 0.15 }
            ];

            let elapsed = 0;
            introMelody.forEach((item) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(item.note, now + elapsed);

                gain.gain.setValueAtTime(0.12, now + elapsed);
                gain.gain.linearRampToValueAtTime(0.01, now + elapsed + item.dur);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + elapsed);
                osc.stop(now + elapsed + item.dur);

                elapsed += item.dur + 0.02;
            });
        } catch (e) {
            console.error("Failed to play start BGM:", e);
        }
    }

    startSiren() {
        if (this.muted) return;
        this.init();
        if (this.sirenInterval) return;
        if (!this.ctx) return;

        this.sirenInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.linearRampToValueAtTime(350, now + 0.25);
                osc.frequency.linearRampToValueAtTime(250, now + 0.5);

                gain.gain.setValueAtTime(0.04, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 0.4);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.5);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.5);
            } catch (e) {
                console.error("Error in siren interval:", e);
            }
        }, 500);
    }

    stopSiren() {
        if (this.sirenInterval) {
            clearInterval(this.sirenInterval);
            this.sirenInterval = null;
        }
    }

    startPowerSiren() {
        if (this.muted) return;
        this.init();
        if (this.powerSirenInterval) return;
        this.stopSiren();
        if (!this.ctx) return;

        this.powerSirenInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.15);
                osc.frequency.linearRampToValueAtTime(400, now + 0.3);

                gain.gain.setValueAtTime(0.03, now);
                gain.gain.linearRampToValueAtTime(0.03, now + 0.25);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.3);
            } catch (e) {
                console.error("Error in power siren interval:", e);
            }
        }, 300);
    }

    stopPowerSiren() {
        if (this.powerSirenInterval) {
            clearInterval(this.powerSirenInterval);
            this.powerSirenInterval = null;
        }
    }
}

window.gameAudio = new GameAudio();
