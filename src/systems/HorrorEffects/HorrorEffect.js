// Base class for all horror effects — updated signatures: system is first arg.
class HorrorEffect {
    constructor(system) {
        // Keep this for backwards compatibility; system will also be passed into methods.
        this.system = system;
    }

    /**
     * Called every frame.
     * New signature: update(system, intensity, dt, context)
     */
    update(system, intensity, dt, context) {
        // To be implemented by subclasses
    }

    /**
     * Called when the game starts a new run.
     * New signature: onGameStart(system)
     */
    onGameStart(system) {
        // To be implemented by subclasses
    }

    /**
     * Called when a new level begins.
     * New signature: onNewLevel(system, level)
     */
    onNewLevel(system, level) {
        // To be implemented by subclasses
    }

    /**
     * Called when the game is over.
     * New signature: onGameOver(system)
     */
    onGameOver(system) {
        // To be implemented by subclasses
    }

    /**
     * Called when the player collects a pellet.
     * New signature: onPelletCollected(system, player)
     */
    onPelletCollected(system, player) {
        // To be implemented by subclasses
    }

    /**
     * Called when the maze is reshuffled.
     * New signature: onMazeReshuffle(system)
     */
    onMazeReshuffle(system) {
        // To be implemented by subclasses
    }
}

// Also expose globally for the existing codebase that constructs classes directly
if (typeof window !== 'undefined') {
    window.HorrorEffect = HorrorEffect;
}
