class HorrorGhost extends HorrorEffect {
    constructor(system) {
        super(system);
        this.cost = 0.2; // Cost to spawn a ghost
        this.triggerIntensity = 0.5; // Intensity required to consider spawning a ghost
    }

    onMazeReshuffle(maze) {
        const game = window.game;
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
        if (intensity <= this.triggerIntensity) {
            return;
        }

        const baseCost = this.cost;
        let numActiveGhosts = game.activeGhosts.length;

        while (true) {
            const spawnCost = numActiveGhosts > 0 ? baseCost / numActiveGhosts : baseCost;

            if (this.system.horrorLevel >= spawnCost && Math.random() < 0.4) {
                console.log(`[HorrorGhost] Spawning ghost (cost: ${spawnCost.toFixed(3)}). Total ghosts: ${numActiveGhosts + 1}`);
                this.system.horrorLevel -= spawnCost;

                const spawnPoint = this.findSafeSpawnPoint(game, maze);
                if (!spawnPoint) {
                    console.warn("[HorrorGhost] Could not find a safe spawn point.");
                    continue; // Try again next time if no spot found
                }

                let ghost;
                if (Math.random() < 0.2 && game.playerPaths.length > 0) {
                    console.log("[HorrorGhost] Spawning a COSMIC CLONE!");
                    ghost = new Ghost(null, true, spawnPoint);
                } else {
                    if (game.playerPaths.length === 0) break; // No paths for regular ghosts
                    const chosenPath = game.playerPaths.splice(0, 1)[0]; // Use oldest path
                    ghost = new Ghost(chosenPath, false, spawnPoint);
                }

                game.activeGhosts.push(ghost);
                numActiveGhosts++;
            } else {
                break;
            }
        }
    }

    findSafeSpawnPoint(game, maze) {
        const player = game.entities.player;
        const mazeSystem = game.systems.maze;
        const playerTileX = Math.floor(player.x / 25);
        const playerTileY = Math.floor(player.y / 25);

        // Search in an expanding radius around the player
        for (let radius = 3; radius < 10; radius++) {
            for (let i = 0; i < 10; i++) { // Try 10 random positions at this radius
                const angle = Math.random() * 2 * Math.PI;
                const checkX = playerTileX + Math.round(radius * Math.cos(angle));
                const checkY = playerTileY + Math.round(radius * Math.sin(angle));

                if (!mazeSystem.isSolid(checkY, checkX)) {
                    return { x: checkX * 25 + 7.5, y: checkY * 25 + 7.5 };
                }
            }
        }
        return null; // No safe spot found
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorGhost = HorrorGhost;
}
