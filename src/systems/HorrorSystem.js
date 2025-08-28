/**
 * HorrorSystem - Manages horror intensity tied to map events
 * Horror increases with each map reshuffle and level completion
 */
class HorrorSystem {
    constructor({ targetTime = 240, cooldown = 45, rng = Math.random } = {}) {
        this.targetTime = targetTime;
        this.cooldown = cooldown;
        this.rng = rng;

        this.elapsed = 0;
        this.running = false;
        this.nextAllowedAt = 0; // seconds since run start

        // Horror accumulation tied to map events
        this.horrorLevel = 0; // 0-1, increases with map events
        this.lastReliefEvent = 0; // Track events since last relief
        this.totalMapEvents = 0; // Count of all map events (reshuffles + completions)

        // An array of horror effect instances
        this.effects = [];
    }

    addEffect(effect) {
        // keep a reference available on the effect and allow either wiring style
        if (effect) {
            effect.system = this;
            this.effects.push(effect);
        }
    }

    startRun() {
        this.elapsed = 0;
        this.running = true;
        this.nextAllowedAt = 0;

        // Call start for each horror effect (no system param, effect uses this.system)
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.onGameStart === "function")
                    effect.onGameStart();
            } catch (e) {
                console.warn("[HorrorSystem] effect onGameStart failed", e);
            }
        });

        console.log(
            `[HorrorSystem] Run started - Horror level: ${this.horrorLevel.toFixed(2)}`,
        );
    }

    endRun() {
        this.running = false;

        // Call end for each horror effect (no system param, effect uses this.system)
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.onGameOver === "function")
                    effect.onGameOver();
            } catch (e) {
                console.warn("[HorrorSystem] effect end handler failed", e);
            }
        });

        console.log("[HorrorSystem] Run ended");
    }

    // Call when map reshuffles (+0.04 horror, halved from 0.08)
    onMapReshuffle(maze) {
        this.horrorLevel = Math.min(1.0, this.horrorLevel + 0.04);
        this.totalMapEvents++;
        this.checkForRelief();

        // Notify each horror effect, now passing the maze data
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.onMazeReshuffle === "function")
                    effect.onMazeReshuffle(maze);
            } catch (e) {
                console.warn("[HorrorSystem] effect onMazeReshuffle failed", e);
            }
        });

        console.log(
            `[HorrorSystem] Map reshuffle - Horror level: ${this.horrorLevel.toFixed(2)}`,
        );
    }

    // Call when level completed (+0.08 horror, halved from 0.16)
    onLevelComplete(level) {
        this.horrorLevel = Math.min(1.0, this.horrorLevel + 0.08);
        this.totalMapEvents++;
        this.checkForRelief();

        // Notify effects about new level (no system param, effect uses this.system)
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.onNewLevel === "function")
                    effect.onNewLevel(level);
            } catch (e) {
                console.warn("[HorrorSystem] effect onNewLevel failed", e);
            }
        });

        console.log(
            `[HorrorSystem] Level ${level} complete - Horror level: ${this.horrorLevel.toFixed(2)}`,
        );
    }

    onPelletCollected(player, pellet) {
        // Grant 0.025 horror relief, as before.
        // The new effects for specific pellets are handled in PelletSystem.

        console.log(pellet);

        // Punish Greed
        if (pellet.type === "point") {
            this.horrorLevel = Math.max(0, this.horrorLevel + 0.015);

            // Reward self preservation
        } else {
            this.horrorLevel = Math.max(0, this.horrorLevel - 0.0125);
        }

        // This is how scream says horror movies should work

        // Notify effects, passing both player and pellet
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.onPelletCollected === "function")
                    effect.onPelletCollected(player, pellet);
            } catch (e) {
                console.warn(
                    "[HorrorSystem] effect onPelletCollected failed",
                    e,
                );
            }
        });
    }

    // Occasional drop in horror level
    checkForRelief() {
        const eventsSinceRelief = this.totalMapEvents - this.lastReliefEvent;

        // 10% chance of relief after 8+ events, but only if horror is high enough
        if (
            eventsSinceRelief >= 8 &&
            this.horrorLevel >= 0.4 &&
            this.rng() < 0.1
        ) {
            this.horrorLevel = Math.max(0, this.horrorLevel - 0.2);
            this.lastReliefEvent = this.totalMapEvents;
            console.log(
                `[HorrorSystem] RELIEF! Horror reduced after ${eventsSinceRelief} events`,
            );
        }
    }

    // Call this when game is reset/restarted
    resetHorrorState() {
        this.horrorLevel = 0;
        this.totalMapEvents = 0;
        this.lastReliefEvent = 0;
        console.log("[HorrorSystem] Horror state reset for new game");
    }

    // Set audio system reference for horror audio updates
    setAudioSystem(audioSystem) {
        this.audioSystem = audioSystem;
    }

    update(dt) {
        if (!this.running) return;
        this.elapsed += dt;

        const intensity = this.getIntensity();
        // Call each horrorEffect, effect uses this.system internally
        this.effects.forEach((effect) => {
            try {
                if (typeof effect.update === "function") {
                    effect.update(intensity, dt);
                }
            } catch (e) {
                console.warn("[HorrorSystem] effect update failed", e);
            }
        });
    }

    getIntensity() {
        const t = Math.min(1, Math.max(0, this.elapsed / this.targetTime));
        const timeBasedIntensity = t * t * t; // cubic ease-in

        // Combine time-based intensity with horror level from map events
        // This ensures intensity is always at least horrorLevel
        return Math.max(this.horrorLevel, timeBasedIntensity);
    }

    // Get total horror influence (for UI display, etc.)
    getTotalHorrorInfluence() {
        return Math.min(1, this.getIntensity() + this.horrorLevel * 0.5);
    }

    // Debug helpers
    getDebugInfo() {
        return {
            elapsed: this.elapsed.toFixed(1),
            timeIntensity: (this.elapsed / this.targetTime).toFixed(3),
            totalIntensity: this.getIntensity().toFixed(3),
            horrorLevel: this.horrorLevel.toFixed(3),
            totalHorrorInfluence: this.getTotalHorrorInfluence().toFixed(3),
            running: this.running,
            nextAllowedAt: this.nextAllowedAt.toFixed(1),
            silentRoundReady: window.GameFlags?.forceSilentRound || false,
            totalMapEvents: this.totalMapEvents,
            eventsSinceRelief: this.totalMapEvents - this.lastReliefEvent,
        };
    }
}

// Make available globally
window.HorrorSystem = HorrorSystem;
