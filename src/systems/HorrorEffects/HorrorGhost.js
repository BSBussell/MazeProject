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
        if (intensity <= this.triggerIntensity || game.playerPaths.length === 0) {
            return;
        }

        const baseCost = this.cost;
        let numActiveGhosts = game.activeGhosts.length;

        // Loop to allow multiple ghosts to spawn, with diminishing costs
        while (true) {
            // Calculate spawn cost with diminishing returns
            const spawnCost = numActiveGhosts > 0 ? baseCost / numActiveGhosts : baseCost;

            // Check if we can afford to spawn and if a random chance passes
            if (this.system.horrorLevel >= spawnCost && Math.random() < 0.4) {
                console.log(`[HorrorGhost] Spawning ghost (cost: ${spawnCost.toFixed(3)}). Total ghosts: ${numActiveGhosts + 1}`);
                this.system.horrorLevel -= spawnCost;

                // Select a random path from the stored paths
                const pathIndex = Math.floor(Math.random() * game.playerPaths.length);
                const path = game.playerPaths[pathIndex];

                // Remove the used path to prevent multiple ghosts from following the exact same track
                const chosenPath = game.playerPaths.splice(pathIndex, 1)[0];

                const ghost = new Ghost(chosenPath);
                game.activeGhosts.push(ghost);

                numActiveGhosts++; // Increment for the next iteration's cost calculation

                // If we run out of paths, stop.
                if (game.playerPaths.length === 0) {
                    break;
                }
            } else {
                // Stop if we can't afford it or fail the chance roll
                break;
            }
        }
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorGhost = HorrorGhost;
}
