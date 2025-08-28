// Base class for all horror effects — updated signatures: system is first arg.
class HorrorEffect {
    constructor(system) {
        // Store system reference for use in all effect methods.
        this.system = system;
    }

    /**
     * Called every frame.
     * Use this.system for the system reference.
     */
    update(intensity, dt) {
        // To be implemented by subclasses
    }

    /**
     * Called when the game starts a new run.
     * Use this.system for the system reference.
     */
    onGameStart() {
        // To be implemented by subclasses
    }

    /**
     * Called when a new level begins.
     * Use this.system for the system reference.
     */
    onNewLevel(level) {
        // To be implemented by subclasses
    }

    /**
     * Called when the game is over.
     * Use this.system for the system reference.
     */
    onGameOver() {
        // To be implemented by subclasses
    }

    /**
     * Called when the player collects a pellet.
     * Use this.system for the system reference.
     */
    onPelletCollected(player) {
        // To be implemented by subclasses
    }

    /**
     * Called when the maze is reshuffled.
     * Use this.system for the system reference.
     */
    onMazeReshuffle() {
        // To be implemented by subclasses
    }
}

// Also expose globally for the existing codebase that constructs classes directly
if (typeof window !== "undefined") {
    window.HorrorEffect = HorrorEffect;
}
