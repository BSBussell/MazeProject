class HorrorGhost extends HorrorEffect {
    constructor(system) {
        super(system);
        this.cost = 0.2; // Cost to spawn a ghost
        this.triggerIntensity = 0.5; // Intensity required to consider spawning a ghost
    }

    onMazeReshuffle(maze) {
        const game = window.game; // Access the global game core
        if (!game) return;

        // 1. Despawn any active cosmic clones from the PREVIOUS round.
        for (let i = game.activeGhosts.length - 1; i >= 0; i--) {
            const ghost = game.activeGhosts[i];
            if (ghost.isClone) {
                ghost.destroy();
                game.activeGhosts.splice(i, 1);
                console.log("[HorrorGhost] Despawned a cosmic clone on shuffle.");
            }
        }

        // 2. Spawn new ghosts for the CURRENT round.
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

                let ghost;
                // 20% chance to spawn a "cosmic clone" that follows the player
                if (Math.random() < 0.2) {
                    console.log("[HorrorGhost] Spawning a COSMIC CLONE!");
                    ghost = new Ghost(null, true); // No path, isClone = true
                } else {
                    // Select a random path from the stored paths
                    const pathIndex = Math.floor(Math.random() * game.playerPaths.length);

                    // Remove the used path to prevent multiple ghosts from following the exact same track
                    const chosenPath = game.playerPaths.splice(pathIndex, 1)[0];
                    ghost = new Ghost(chosenPath, false);
                }

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
