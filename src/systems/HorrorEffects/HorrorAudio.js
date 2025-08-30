class HorrorAudio extends HorrorEffect {
    constructor(system) {
        super(system);

        this.musicIsOff = false;
        this.lastSoundPlayTime = -Infinity;

        // Base cooldown range in seconds. This will be scaled by horror intensity.
        this.soundCooldownMin = 8; // Min seconds between sounds at high intensity
        this.soundCooldownMax = 45; // Max seconds between sounds at low intensity
        this.soundCooldown = this.soundCooldownMax;

        // Extra silence time after music stops before any ambience plays
        this.silenceAfterMusicCut = 6; // seconds

        this.soundVolume = 0.2;

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
        this.fadingInSounds = []; // Array to manage sounds that are fading in

        this._pickWeightedIndex = (weights) => {
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
            return w.length - 1;
        };
    }

    onNewLevel(level) {
        // Fade out any currently playing ambient sounds instead of stopping abruptly
        this.scaryAmbienceSounds.forEach((sound) => {
            if (!sound.paused) {
                this.fadeOutSound(sound);
            }
        });
    }

    onMazeReshuffle(maze) {
        // Use total intensity, not raw horror level, and do not auto-resume within the run
        const intensity = this.system.getIntensity();
        if (intensity > 0.4 && !this.musicIsOff) {
            this.system.audioSystem.stopBackgroundMusic();
            this.musicIsOff = true;
            // Start a silence window before ambience begins
            this.lastSoundPlayTime = this.system.elapsed;
            this.soundCooldown = Math.max(this.soundCooldown, this.silenceAfterMusicCut);
            console.log("[HorrorAudio] Music stopped due to high intensity.");
        }
        // No else-branch to restart music during a run; game start handles music.
    }

    update(intensity, dt) {
        // if (intensity > -0.1) {
        //     // each update:
        //     const pitch = 1.0 - intensity * 0.5;
        //     this.system.audioSystem.setMusicPitch(pitch);
        // }

        // Process sounds that are fading in
        for (let i = this.fadingInSounds.length - 1; i >= 0; i--) {
            const fading = this.fadingInSounds[i];
            const newVolume = fading.sound.volume + fading.fadeSpeed * dt;

            fading.sound.volume = Math.min(fading.targetVolume, newVolume);

            if (fading.sound.volume >= fading.targetVolume) {
                // Fade in complete, remove from the array
                this.fadingInSounds.splice(i, 1);
            }
        }

        // Process sounds that are fading out
        for (let i = this.fadingOutSounds.length - 1; i >= 0; i--) {
            const fading = this.fadingOutSounds[i];
            const newVolume = fading.sound.volume - fading.fadeSpeed * dt;

            // Clamp the volume to ensure it never goes below 0, which causes a DOMException.
            fading.sound.volume = Math.max(0, newVolume);

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
                console.log(
                    `[HorrorAudio] Cooldown finished. Playing ambient sound. Intensity: ${intensity.toFixed(2)}`,
                );
                this.playRandomScarySound(now, intensity);
            }
        }
    }

    playRandomScarySound(now, intensity) {
        const randomIndex = this._pickWeightedIndex(this.scaryAmbienceWeights);
        const sound = this.scaryAmbienceSounds[randomIndex];

        // Do not play a sound that is currently fading in or out.
        if (
            this.fadingOutSounds.some((f) => f.sound === sound) ||
            this.fadingInSounds.some((f) => f.sound === sound)
        ) {
            return;
        }

        // As intensity approaches 1, cooldown approaches soundCooldownMin.
        // As intensity approaches 0.4 (the minimum to be here), cooldown approaches soundCooldownMax.
        const intensityRange = 1.0 - 0.4;
        const effectiveIntensity = Math.max(
            0,
            (intensity - 0.4) / intensityRange,
        );

        const cooldownRange = this.soundCooldownMax - this.soundCooldownMin;
        this.soundCooldown =
            this.soundCooldownMax -
            effectiveIntensity * cooldownRange * (0.5 + Math.random() * 0.5);

        this.lastSoundPlayTime = now;
        this.fadeInSound(sound, 3.0); // Fade in over 3 seconds
        console.log(
            `[HorrorAudio] Fading in ambient sound. Next sound in ~${this.soundCooldown.toFixed(1)}s.`,
        );
    }

    setAmbienceWeights(weights) {
        if (Array.isArray(weights)) {
            if (weights.length === this.scaryAmbienceFiles.length) {
                this.scaryAmbienceWeights = weights.slice();
            } else {
                console.warn(
                    "[HorrorAudio] setAmbienceWeights: array length mismatch; ignoring.",
                );
            }
        } else if (weights && typeof weights === "object") {
            const arr = this.scaryAmbienceFiles.map(
                (f) => Number(weights[f]) || 0,
            );
            if (arr.some((v) => v > 0)) {
                this.scaryAmbienceWeights = arr;
            } else {
                console.warn(
                    "[HorrorAudio] setAmbienceWeights: object provided but no valid values; ignoring.",
                );
            }
        } else {
            console.warn(
                "[HorrorAudio] setAmbienceWeights: unsupported type; ignoring.",
            );
        }
    }

    fadeInSound(sound, duration = 2.0) {
        // Don't try to fade a sound that's already playing or already fading in/out.
        if (
            !sound.paused ||
            this.fadingInSounds.some((f) => f.sound === sound) ||
            this.fadingOutSounds.some((f) => f.sound === sound)
        ) {
            return;
        }

        sound.volume = 0;
        sound
            .play()
            .catch((e) => console.error("Error playing scary sound:", e));

        this.fadingInSounds.push({
            sound: sound,
            fadeSpeed: this.soundVolume / duration, // Calculate speed to reach target volume
            targetVolume: this.soundVolume,
        });
    }

    fadeOutSound(sound, duration = 1.0) {
        // Don't try to fade a sound that's already silent or already fading.
        if (
            sound.volume === 0 ||
            this.fadingOutSounds.some((f) => f.sound === sound)
        ) {
            return;
        }

        this.fadingOutSounds.push({
            sound: sound,
            fadeSpeed: sound.volume / duration, // Calculate speed based on current volume
        });
    }

    onGameOver() {
        console.log("[HorrorAudio] Game Over");
        this.musicIsOff = false;
        // Fade out any currently playing ambient sounds
        this.scaryAmbienceSounds.forEach((sound) => {
            if (!sound.paused) {
                this.fadeOutSound(sound);
            }
        });
    }
}

if (typeof window !== "undefined") {
    window.HorrorAudio = HorrorAudio;
}
