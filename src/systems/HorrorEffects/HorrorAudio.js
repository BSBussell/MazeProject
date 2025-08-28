class HorrorAudio extends HorrorEffect {
    constructor(system) {
        super(system);

        this.musicIsOff = false;
        this.lastSoundPlayTime = -Infinity; // use a unified timebase; allows immediate first play if needed

        this.soundCooldownMin = 25;
        this.soundCooldownMax = 60;
        this.soundCooldown = 35; // Cooldown in seconds between ambient sounds

        this.soundVolume = 0.65;

        // Array of scary files
        this.scaryAmbienceFiles = [
            "assets/scary.mp3",
            "assets/scary_2.mp3",
            "assets/scary_3.mp3",
            "assets/sweeee.mp3",
            "assets/mustBeTheWind.mp3",
        ];
        this.scaryAmbienceWeights = [0.1, 0.26, 0.1, 0.27, 0.27];

        // Optional per-file play probabilities (weights). Must sum to ~1.0; if not, we normalize.
        // Default: equal probability per file.
        // this.scaryAmbienceWeights = new Array(this.scaryAmbienceFiles.length).fill(1 / this.scaryAmbienceFiles.length);

        // Create sound variable for each scary file
        this.scaryAmbienceSounds = this.scaryAmbienceFiles.map((file) => {
            const sound = new Audio(file);
            sound.loop = false;
            sound.volume = this.soundVolume;
            return sound;
        });

        // Pre-bind helper for weighted selection
        this._pickWeightedIndex = (weights) => {
            // Normalize defensively
            const w =
                Array.isArray(weights) &&
                weights.length === this.scaryAmbienceFiles.length
                    ? weights.slice()
                    : new Array(this.scaryAmbienceFiles.length).fill(
                          1 / this.scaryAmbienceFiles.length,
                      );
            const sum =
                w.reduce((a, b) => a + (isFinite(b) ? Math.max(0, b) : 0), 0) ||
                1;
            for (let i = 0; i < w.length; i++) w[i] = Math.max(0, w[i]) / sum;
            let r = Math.random();
            for (let i = 0; i < w.length; i++) {
                if ((r -= w[i]) <= 0) return i;
            }
            return w.length - 1; // fallback
        };
    }

    onNewLevel(system, level) {
        // accept the passed system but also keep this.system for compatibility
        this.system = this.system || system;
        console.log(`[HorrorAudio] New level started: ${level}`);

        // Turn off all ambient sounds
        this.scaryAmbienceSounds.forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });
        if (this.system.horrorLevel < 0.4) {
            this.musicIsOff = false;
        }
    }

    onMazeReshuffle(system) {
        // accept the passed system but also keep this.system for compatibility
        this.system = this.system || system;
        console.log("[HorrorAudio] Maze reshuffled.");

        if (!this.musicIsOff && this.system.horrorLevel > 0.4) {
            this.system.audioSystem.stopBackgroundMusic();
            this.musicIsOff = true;

            this.soundCooldown =
                Math.random() *
                    (this.soundCooldownMax - this.soundCooldownMin) +
                this.soundCooldownMin;

            // JavaScript is just such a cool language dontcha think? Don't you agree? Javascript is so cool oo wowie
            const now =
                this.system && typeof this.system.timeElapsed === "number"
                    ? this.system.timeElapsed
                    : 0;
            this.lastSoundPlayTime = now;
        } else if (this.musicIsOff) {
            this.system.audioSystem.startBackgroundMusic();
        }
    }

    update(intensity, dt) {
        if (this.musicIsOff) {
            const now =
                typeof this.system.timeElapsed === "number"
                    ? this.system.timeElapsed
                    : 0;
            if (
                now - this.lastSoundPlayTime > this.soundCooldown &&
                intensity > 0.6 &&
                Math.random() < 0.2
            ) {
                console.log("[HorrorAudio] Playing scary sound.");
                this.playRandomScarySound(now);
            }
        }
    }

    playRandomScarySound(now) {
        const randomIndex = this._pickWeightedIndex(this.scaryAmbienceWeights);
        const sound = this.scaryAmbienceSounds[randomIndex];
        this.soundCooldown =
            Math.random() * (this.soundCooldownMax - this.soundCooldownMin) +
            this.soundCooldownMin;
        this.lastSoundPlayTime = typeof now === "number" ? now : 0;
        sound
            .play()
            .catch((e) => console.error("Error playing scary sound:", e));
        console.log("[HorrorAudio] Playing ambient horror sound.");
    }

    /**
     * Set per-file play probabilities. You can pass either:
     *  - an array aligned to scaryAmbienceFiles (e.g., [0.3, 0.3, 0.4])
     *  - an object keyed by filename (e.g., {"assets/scary.mp3":0.3, ...})
     * Values will be normalized to sum to 1.
     */
    setAmbienceWeights(weights) {
        if (Array.isArray(weights)) {
            if (weights.length === this.scaryAmbienceFiles.length) {
                this.scaryAmbienceWeights = weights.slice();
            } else {
                console.warn(
                    "[HorrorAudio] setAmbienceWeights: array length mismatch; ignoring.",
                );
            }
            return;
        }
        if (weights && typeof weights === "object") {
            const arr = this.scaryAmbienceFiles.map(
                (f) => Number(weights[f]) || 0,
            );
            const hasAny = arr.some((v) => v > 0);
            if (hasAny) {
                this.scaryAmbienceWeights = arr;
            } else {
                console.warn(
                    "[HorrorAudio] setAmbienceWeights: object provided but no valid values; ignoring.",
                );
            }
            return;
        }
        console.warn(
            "[HorrorAudio] setAmbienceWeights: unsupported type; ignoring.",
        );
    }

    onGameOver() {
        console.log("[HorrorAudio] Game Over");
        this.musicIsOff = false;
    }
}

// Also expose globally for the existing codebase
if (typeof window !== "undefined") {
    window.HorrorAudio = HorrorAudio;
}
