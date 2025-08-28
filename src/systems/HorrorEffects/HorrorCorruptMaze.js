class HorrorCorruptMaze extends HorrorEffect {
    constructor(system) {
        super(system);
        this.cost = 0.05; // The amount of horror points this effect costs to trigger.
        this.corruptionChanceMultiplier = 0.5; // Multiplier for turning horror intensity into a trigger chance.
        this.corruptionAmount = 0.01; // Percentage of tiles to corrupt.
    }

    onMazeReshuffle(maze) {
        if (!maze || !maze.data) {
            console.warn("[HorrorCorruptMaze] Maze data not available.");
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
        const mazeArray = maze.data;
        const tilesToCorrupt = Math.floor(mazeArray.length * this.corruptionAmount);

        for (let i = 0; i < tilesToCorrupt; i++) {
            const randomIndex = Math.floor(Math.random() * mazeArray.length);

            // Flip the tile state (0 to 1, or 1 to 0)
            // We should avoid changing the start/end points or the border walls.
            // For now, a simple flip is fine as a first pass.
            const originalValue = mazeArray[randomIndex];
            mazeArray[randomIndex] = 1 - originalValue; // Flip 0 to 1 or 1 to 0

            // Optional: A check to prevent blocking the start/end could be added here.
            // For example, by checking if the index is near the player start or maze goal.
        }

        console.log(`[HorrorCorruptMaze] Corrupted ${tilesToCorrupt} tiles.`);
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorCorruptMaze = HorrorCorruptMaze;
}
