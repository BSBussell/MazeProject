// HorrorUI - Syncs UI tint coverage with horror intensity
class HorrorUI extends HorrorEffect {
    constructor(system, uiSystem) {
        super(system);
        this.uiSystem = uiSystem;
    }

    update(intensity, dt) {
        // Clamp intensity to [0, 1] just in case
        const coverage = Math.max(0, Math.min(1, intensity));
        // Set the UI tint coverage (always red)
        if (this.uiSystem && typeof this.uiSystem.set_color === "function") {
            this.uiSystem.set_color(coverage);
        }
    }
}

// Expose globally if needed
if (typeof window !== "undefined") {
    window.HorrorUI = HorrorUI;
}
