/**
 * AudioSystem - Handles game audio and music
 */
class AudioSystem {
    constructor() {
        this.tickTockAudio = null;
        this.buzzAmbience = null;
        this.backgroundMusicStarted = false;
        this.audioEnabled = true;
        this.userInteracted = false; // Track if user has interacted
        this.pendingMusicStart = false; // Track if we should start music when interaction occurs

        this.initializeAudio();
        this.setupUserInteractionTracking();
    }

    initializeAudio() {
        try {
            // Load tick-tock music
            this.tickTockAudio = new Audio("assets/tick-tock.mp3");
            this.tickTockAudio.loop = true;
            this.tickTockAudio.volume = 0.1;

            // Load buzz ambience
            this.buzzAmbience = new Audio("assets/buzz.mp3");
            this.buzzAmbience.loop = true;
            this.buzzAmbience.volume = 0.75; // Slightly quieter for ambience

            // Load lighter hit SFX
            this.lighterHitSfx = new Audio("assets/lighterHit.mp3");
            this.lighterHitSfx.volume = 0.3;
        } catch (error) {
            console.warn("Could not load audio:", error);
            this.audioEnabled = false;
        }
    }

    setupUserInteractionTracking() {
        // Set up user interaction tracking
        const markInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log("[Audio] User interaction detected");

                // If music was pending, try to start it now
                if (this.pendingMusicStart) {
                    this.pendingMusicStart = false;
                    this.startBackgroundMusic();
                }
            }
        };

        // Listen for various user interaction events
        document.addEventListener("click", markInteraction, { once: false });
        document.addEventListener("keydown", markInteraction, { once: false });
        document.addEventListener("touchstart", markInteraction, {
            once: false,
        });
    }

    startBackgroundMusic() {
        if (!this.audioEnabled || this.backgroundMusicStarted) return;

        // Check if user has interacted yet
        if (!this.userInteracted) {
            console.log("[Audio] Deferring music start until user interaction");
            this.pendingMusicStart = true;
            return;
        }

        console.log("[Audio] Starting background music...");

        // Start tick-tock music
        if (this.tickTockAudio) {
            this.tickTockAudio.currentTime = 0;
            this.tickTockAudio
                .play()
                .then(() => {
                    console.log("[Audio] Tick-tock started successfully");
                })
                .catch((e) => {
                    console.log("Tick-tock audio play failed:", e);
                    // Try again in a moment
                    setTimeout(() => this.retryTickTock(), 500);
                });
        }

        // Start buzz ambience
        if (this.buzzAmbience) {
            this.buzzAmbience.currentTime = 0;
            this.buzzAmbience
                .play()
                .then(() => {
                    console.log("[Audio] Buzz ambience started successfully");
                })
                .catch((e) => {
                    console.log("Buzz ambience play failed:", e);
                    // Try again in a moment
                    setTimeout(() => this.retryBuzzAmbience(), 500);
                });
        }

        this.backgroundMusicStarted = true;
    }

    retryTickTock() {
        if (
            this.tickTockAudio &&
            this.backgroundMusicStarted &&
            this.userInteracted
        ) {
            this.tickTockAudio.currentTime = 0;
            this.tickTockAudio.play().catch((e) => {
                console.log("Tick-tock retry failed:", e);
            });
        }
    }

    retryBuzzAmbience() {
        if (
            this.buzzAmbience &&
            this.backgroundMusicStarted &&
            this.userInteracted
        ) {
            this.buzzAmbience.currentTime = 0;
            this.buzzAmbience.play().catch((e) => {
                console.log("Buzz ambience retry failed:", e);
            });
        }
    }

    stopBackgroundMusic() {
        if (!this.audioEnabled) return;

        if (this.tickTockAudio) {
            this.tickTockAudio.pause();
        }

        this.backgroundMusicStarted = false;
        this.pendingMusicStart = false; // Clear any pending start
    }

    // Prevent background music from starting later in the run
    cancelPendingMusicStart() {
        this.pendingMusicStart = false;
    }

    // Force audio start for dev/debug purposes
    forceStartAudio() {
        this.userInteracted = true;
        this.pendingMusicStart = false;
        this.backgroundMusicStarted = false; // Reset to allow restart
        this.startBackgroundMusic();
    }

    setVolume(volume) {
        if (!this.audioEnabled) return;

        const clampedVolume = Math.max(0, Math.min(1, volume));

        if (this.tickTockAudio) {
            this.tickTockAudio.volume = clampedVolume * 0.2; // Base volume 20%
        }

        if (this.buzzAmbience) {
            this.buzzAmbience.volume = clampedVolume * 0.15; // Base volume 15%
        }
    }

    // SFX functions
    sfxLighterHit() {
        if (!this.audioEnabled || !this.lighterHitSfx) return;

        // Reset and play the sound
        this.lighterHitSfx.currentTime = 0;
        this.lighterHitSfx.play().catch((e) => {
            console.log("Lighter hit SFX play failed:", e);
        });
    }

    sfxTick() {
        // Play short tick sound
        if (!this.audioEnabled) return;
        // Implementation would go here
    }

    sfxPickup() {
        // Play pickup blip sound
        if (!this.audioEnabled) return;
        // Implementation would go here
    }

    sfxBurst() {
        // Play whoosh/burst sound
        if (!this.audioEnabled) return;
        // Implementation would go here
    }

    sfxGameOver() {
        // Play game over sound
        if (!this.audioEnabled) return;
        // Implementation would go here
    }

    sfxLevelComplete() {
        // Play level complete sound
        if (!this.audioEnabled) return;
        // Implementation would go here
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;

        if (!this.audioEnabled) {
            this.stopBackgroundMusic();
        } else if (this.backgroundMusicStarted) {
            this.startBackgroundMusic();
        }
    }

    isAudioEnabled() {
        return this.audioEnabled;
    }

    setMusicPitch(pitch) {
        if (!this.audioEnabled) return;

        const clampedPitch = Math.max(0.1, pitch); // Don't let it go to 0 or negative

        if (this.tickTockAudio) {
            this.tickTockAudio.playbackRate = clampedPitch;
        }

        if (this.buzzAmbience) {
            this.buzzAmbience.playbackRate = clampedPitch;
        }
    }
}

// Make available globally
window.AudioSystem = AudioSystem;
