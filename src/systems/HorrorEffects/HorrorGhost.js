class HorrorGhost extends HorrorEffect {
    constructor(system) {
        super(system);
        this.cost = 0.2; // Cost to spawn a ghost
        this.triggerIntensity = 0.5; // Intensity required to consider spawning a ghost
    }

    onMazeReshuffle(maze) {
        const game = window.game; // Access the global game core
        if (!game) return;

        const intensity = this.system.getIntensity();

        // Check conditions for spawning a ghost
        if (
            intensity > this.triggerIntensity &&
            this.system.horrorLevel >= this.cost &&
            game.playerPaths.length > 0
        ) {
            // 30% chance to spawn to avoid being too predictable
            if (Math.random() < 0.3) {
                console.log("[HorrorGhost] Spawning ghost.");
                this.system.horrorLevel -= this.cost;

                // Select a random path from the stored paths
                const pathIndex = Math.floor(Math.random() * game.playerPaths.length);
                const path = game.playerPaths[pathIndex];

                const ghost = new Ghost(path);
                game.activeGhosts.push(ghost);
            }
        }
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorGhost = HorrorGhost;
}
