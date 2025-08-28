class HorrorCorruptMaze extends HorrorEffect {
    constructor(system) {
        super(system);
        this.cost = 0.05; // The amount of horror points this effect costs to trigger.
        this.corruptionChanceMultiplier = 0.5; // Multiplier for turning horror intensity into a trigger chance.
        this.corruptionAmount = 0.01; // Percentage of tiles to corrupt.
    }

    onMazeReshuffle(maze) {
        // The maze is the array itself, not an object with a .data property.
        if (!maze || !Array.isArray(maze) || maze.length === 0) {
            console.warn("[HorrorCorruptMaze] Invalid maze data received.");
            return;
        }

        const intensity = this.system.getIntensity();
        const triggerChance = intensity * this.corruptionChanceMultiplier;

        // Check if the effect triggers based on chance and if there are enough points.
        if (Math.random() < triggerChance && this.system.horrorLevel >= this.cost) {
            console.log(`[HorrorCorruptMaze] Triggering maze corruption. Intensity: ${intensity.toFixed(2)}`);
            this.system.horrorLevel -= this.cost;

            this.corruptMaze(maze);
        }
    }

    corruptMaze(maze) {
        const height = maze.length;
        if (height === 0) return;
        const width = maze[0].length;
        const totalTiles = width * height;
        const tilesToCorrupt = Math.floor(totalTiles * this.corruptionAmount);

        for (let i = 0; i < tilesToCorrupt; i++) {
            // Pick a random, non-border tile to corrupt
            const randomRow = Math.floor(Math.random() * (height - 2)) + 1;
            const randomCol = Math.floor(Math.random() * (width - 2)) + 1;

            // Flip the tile state (0 to 1, or 1 to 0), ensuring the tile exists
            if (maze[randomRow] && typeof maze[randomRow][randomCol] === 'number') {
                 maze[randomRow][randomCol] = 1 - maze[randomRow][randomCol];
            }
        }

        console.log(`[HorrorCorruptMaze] Corrupted ${tilesToCorrupt} tiles.`);
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorCorruptMaze = HorrorCorruptMaze;
}
