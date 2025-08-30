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

        const flags = (typeof window !== "undefined" && window.GameFlags) || {};
        const testingMax = !!flags.maxCorrupt;

        const intensity = this.system.getIntensity();
        let triggerChance = intensity * this.corruptionChanceMultiplier;
        const hMul = Math.max(0.1, this.system.horrorBuildupMultiplier || 1);
        let adjustedCost = this.cost / hMul; // Lower cost as horror multiplier rises

        // Test mode: no cost, always trigger, and corrupt aggressively
        let amountOverride = null;
        let rareMax = false;
        if (!testingMax && intensity >= 0.999) {
            // Somewhat rare burst when intensity has fully ramped
            const rareChance = 0.1; // 10% per reshuffle at max intensity
            if (Math.random() < rareChance) rareMax = true;
        }

        if (testingMax || rareMax) {
            triggerChance = 1;
            adjustedCost = 0;
            const maxAmt = testingMax
                ? (typeof flags.maxCorruptAmount === "number" ? flags.maxCorruptAmount : 0.5)
                : 0.3; // default rare burst amount
            amountOverride = Math.min(Math.max(maxAmt, 0.05), 0.9);
        }

        // Check if the effect triggers based on chance and if there are enough points.
        if (
            Math.random() < triggerChance &&
            this.system.horrorLevel >= adjustedCost
        ) {
            const modeTag = testingMax ? " | MAX TEST" : (rareMax ? " | MAX RARE" : "");
            console.log(
                `[HorrorCorruptMaze] Triggering maze corruption. Intensity: ${intensity.toFixed(2)} | cost: ${adjustedCost.toFixed(3)} | hMul: ${hMul.toFixed(2)}${modeTag}`,
            );
            this.system.horrorLevel -= adjustedCost;

            this.corruptMaze(maze, amountOverride);
        }
    }

    corruptMaze(maze, amountOverride = null) {
        const height = maze.length;
        if (height === 0) return;
        const width = maze[0].length;
        const totalTiles = width * height;
        const amount = amountOverride == null ? this.corruptionAmount : amountOverride;
        const tilesToCorrupt = Math.floor(totalTiles * amount);
        let corruptedCount = 0;
        let attempts = 0;

        while (
            corruptedCount < tilesToCorrupt &&
            attempts < tilesToCorrupt * 3
        ) {
            const row = Math.floor(Math.random() * (height - 2)) + 1;
            const col = Math.floor(Math.random() * (width - 2)) + 1;

            if (maze[row] && typeof maze[row][col] === "number") {
                const isWall = maze[row][col] === 1;
                let openNeighbors = 0;
                // Check cardinal neighbors
                if (maze[row - 1][col] === 0) openNeighbors++;
                if (maze[row + 1][col] === 0) openNeighbors++;
                if (maze[row][col - 1] === 0) openNeighbors++;
                if (maze[row][col + 1] === 0) openNeighbors++;

                // If it's a wall and has 1 or fewer open neighbors, it's safe to turn into a floor.
                // This prevents creating 2x2 open squares or wider hallways.
                if (isWall && openNeighbors <= 1) {
                    maze[row][col] = 0; // Turn wall to floor
                    corruptedCount++;
                }
                // If it's a floor, we are more careful about turning it into a wall.
                // We don't want to block off paths entirely.
                // For now, we'll stick to only corrupting walls into floors to avoid complex pathfinding checks.
            }
            attempts++;
        }

        console.log(
            `[HorrorCorruptMaze] Corrupted ${corruptedCount} tiles after ${attempts} attempts.`,
        );
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.HorrorCorruptMaze = HorrorCorruptMaze;
}
