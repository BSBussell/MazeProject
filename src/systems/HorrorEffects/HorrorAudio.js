class HorrorAudio extends HorrorEffect {
    constructor(system) {
        super(system);

        this.musicIsOff = false;
        this.lastSoundPlayTime = -Infinity;

        // Base cooldown range in seconds. This will be scaled by horror intensity.
        this.soundCooldownMin = 8;  // Min seconds between sounds at high intensity
        this.soundCooldownMax = 45; // Max seconds between sounds at low intensity
        this.soundCooldown = this.soundCooldownMax;

        this.soundVolume = 0.65;

        this.scaryAmbienceFiles = [
            "assets/scary.mp3",
            "assets/scary_2.mp3",
            "assets/scary_3.mp3",
            "assets/sweeee.mp3",
            "assets/mustBeTheWind.mp3",
        ];
        this.scaryAmbienceWeights = [0.1, 0.26, 0.1, 0.27, 0.27];

        this.scaryAmbienceSounds = this.scaryAmbienceFiles.map((file) => {
            const sound = new Audio(file);
            sound.loop = false;
            sound.volume = this.soundVolume;
            return sound;
        });

        this.fadingOutSounds = []; // Array to manage sounds that are fading out

        this._pickWeightedIndex = (weights) => {
            const w = Array.isArray(weights) && weights.length === this.scaryAmbienceFiles.length
                ? weights.slice()
                : new Array(this.scaryAmbienceFiles.length).fill(1 / this.scaryAmbienceFiles.length);
            const sum = w.reduce((a, b) => a + (isFinite(b) ? Math.max(0, b) : 0), 0) || 1;
            for (let i = 0; i < w.length; i++) w[i] = Math.max(0, w[i]) / sum;
            let r = Math.random();
            for (let i = 0; i < w.length; i++) {
                if ((r -= w[i]) <= 0) return i;
            }
            return w.length - 1;
        };
    }

    onNewLevel(level) {
        // Fade out any currently playing ambient sounds instead of stopping abruptly
        this.scaryAmbienceSounds.forEach(sound => {
            if (!sound.paused) {
                this.fadeOutSound(sound);
            }
        });
    }

    onMazeReshuffle(maze) {
        // Manage music state change as a discrete event on shuffle
        if (this.system.horrorLevel > 0.4 && !this.musicIsOff) {
            this.system.audioSystem.stopBackgroundMusic();
            this.musicIsOff = true;
            console.log("[HorrorAudio] Music stopped on shuffle due to high horror.");
        } else if (this.system.horrorLevel <= 0.4 && this.musicIsOff) {
            this.system.audioSystem.startBackgroundMusic();
            this.musicIsOff = false;
            console.log("[HorrorAudio] Music restarted on shuffle due to low horror.");
        }
    }

    update(intensity, dt) {
        // Process sounds that are fading out
        for (let i = this.fadingOutSounds.length - 1; i >= 0; i--) {
            const fading = this.fadingOutSounds[i];
            fading.sound.volume -= fading.fadeSpeed * dt;

            if (fading.sound.volume <= 0) {
                fading.sound.pause();
                fading.sound.volume = this.soundVolume; // Reset for next time
                this.fadingOutSounds.splice(i, 1);
            }
        }

        const now = this.system.elapsed;

        // Ambience is independent of shuffle event, depends only on music being off
        if (this.musicIsOff) {
            if (now - this.lastSoundPlayTime > this.soundCooldown) {
                console.log(`[HorrorAudio] Cooldown finished. Playing ambient sound. Intensity: ${intensity.toFixed(2)}`);
                this.playRandomScarySound(now, intensity);
            }
        }
    }

    playRandomScarySound(now, intensity) {
        const randomIndex = this._pickWeightedIndex(this.scaryAmbienceWeights);
        const sound = this.scaryAmbienceSounds[randomIndex];

        // As intensity approaches 1, cooldown approaches soundCooldownMin.
        // As intensity approaches 0.4 (the minimum to be here), cooldown approaches soundCooldownMax.
        const intensityRange = 1.0 - 0.4;
        const effectiveIntensity = Math.max(0, (intensity - 0.4) / intensityRange);

        const cooldownRange = this.soundCooldownMax - this.soundCooldownMin;
        this.soundCooldown = this.soundCooldownMax - (effectiveIntensity * cooldownRange * (0.5 + Math.random() * 0.5));

        this.lastSoundPlayTime = now;
        sound.play().catch((e) => console.error("Error playing scary sound:", e));
        console.log(`[HorrorAudio] Playing ambient sound. Next sound in ~${this.soundCooldown.toFixed(1)}s.`);
    }

    setAmbienceWeights(weights) {
        if (Array.isArray(weights)) {
            if (weights.length === this.scaryAmbienceFiles.length) {
                this.scaryAmbienceWeights = weights.slice();
            } else {
                console.warn("[HorrorAudio] setAmbienceWeights: array length mismatch; ignoring.");
            }
        } else if (weights && typeof weights === "object") {
            const arr = this.scaryAmbienceFiles.map((f) => Number(weights[f]) || 0);
            if (arr.some((v) => v > 0)) {
                this.scaryAmbienceWeights = arr;
            } else {
                console.warn("[HorrorAudio] setAmbienceWeights: object provided but no valid values; ignoring.");
            }
        } else {
            console.warn("[HorrorAudio] setAmbienceWeights: unsupported type; ignoring.");
        }
    }

    fadeOutSound(sound, duration = 1.0) {
        // Avoid adding the same sound multiple times
        if (this.fadingOutSounds.some(f => f.sound === sound)) return;

        this.fadingOutSounds.push({
            sound: sound,
            fadeSpeed: sound.volume / duration,
        });
    }

    onGameOver() {
        console.log("[HorrorAudio] Game Over");
        this.musicIsOff = false;
        // Fade out any currently playing ambient sounds
        this.scaryAmbienceSounds.forEach(sound => {
            if (!sound.paused) {
                this.fadeOutSound(sound);
            }
        });
    }
}

if (typeof window !== "undefined") {
    window.HorrorAudio = HorrorAudio;
}
