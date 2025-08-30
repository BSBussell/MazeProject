class HorrorCRT extends HorrorEffect {
    constructor(system) {
        super(system);
        this.originalConfig = null;
    }

    // Linear interpolation helper
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    onGameStart() {
        // Store original config if the CRT filter is available
        if (window.crtFilter && !this.originalConfig) {
            this.originalConfig = { ...window.crtFilter.config };
        }
    }

    update(intensity, dt) {
        if (!window.crtFilter || !window.crtEnabled) {
            return;
        }

        // Ensure originalConfig is captured
        if (!this.originalConfig) {
            this.onGameStart();
            if (!this.originalConfig) return; // Abort if filter is still not ready
        }

        // If a timed glitch override is active, avoid fighting those settings
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (window._crtGlitchOverrideUntil && now < window._crtGlitchOverrideUntil) {
            return;
        }

        const config = window.crtFilter.config;
        // Smoothly adjust CRT parameters based on horror intensity
        // Values chosen to create a noticeable but not overwhelming effect at max intensity
        config.staticNoise = this.lerp(
            this.originalConfig.staticNoise,
            0.08,
            intensity,
        );
        config.flicker = this.lerp(
            this.originalConfig.flicker,
            0.05,
            intensity,
        );
        config.horizontalTearing = this.lerp(
            this.originalConfig.horizontalTearing,
            0.007,
            intensity,
        );
        config.verticalJitter = this.lerp(
            this.originalConfig.verticalJitter,
            0.006,
            intensity,
        );
        config.barrelDistortion = this.lerp(
            this.originalConfig.barrelDistortion,
            0.12,
            intensity,
        );
        config.signalLoss = this.lerp(
            this.originalConfig.signalLoss,
            0.08,
            intensity,
        );
    }

    onGameOver() {
        // Restore original CRT settings when the game ends
        if (window.crtFilter && this.originalConfig) {
            Object.assign(window.crtFilter.config, this.originalConfig);
            this.originalConfig = null; // Clear stored config
        }
    }
}

// Expose globally if in a browser environment
if (typeof window !== "undefined") {
    window.HorrorCRT = HorrorCRT;
}
