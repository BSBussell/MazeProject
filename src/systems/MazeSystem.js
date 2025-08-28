/**
 * MazeSystem - Handles maze generation and rendering
 */
class MazeSystem {
    constructor() {
        this.maze = null;
        this.width = 0;
        this.height = 0;
    }
    
    generate(width, height, startX = 1, startY = 1) {
        this.width = width;
        this.height = height;
        
        // Initialize maze with walls (2) and unvisited cells (1)
        this.maze = [];
        
        // Top border
        let row = new Array(height);
        row.fill(2);
        this.maze.push(row);
        
        // Main maze area
        for (let i = 0; i <= width; i++) {
            row = [];
            row.push(2); // Left border
            for (let j = 0; j <= height - 3; j++) {
                row.push(1); // Unvisited cell
            }
            row.push(2); // Right border
            this.maze.push(row);
        }
        
        // Bottom border
        row = new Array(height);
        row.fill(2);
        this.maze.push(row);
        
        // Generate maze using stack-based algorithm
        this.generateMazeRecursive(startX, startY);
        
        // Ensure goal is accessible
        this.ensureGoalAccessible();
        
        return this.maze;
    }
    
    generateMazeRecursive(startX, startY) {
        const stack = [];
        let posX = startX;
        let posY = startY;
        
        // Mark starting position as visited
        this.maze[posY][posX] = 0;
        stack.push({x: posX, y: posY});
        
        // Track total cells to visit
        const totalCells = Math.floor((this.width - 1) / 2) * Math.floor((this.height - 3) / 2);
        let visitedCells = 1;
        
        // Directions: [dx, dy]
        const directions = [
            [2, 0],   // Right
            [-2, 0],  // Left  
            [0, 2],   // Down
            [0, -2]   // Up
        ];
        
        // Main generation loop with stack-based backtracking
        while (stack.length > 0 && visitedCells < totalCells) {
            const current = stack[stack.length - 1];
            const validDirections = [];
            
            // Check all four directions for unvisited cells
            for (let i = 0; i < directions.length; i++) {
                const newX = current.x + directions[i][0];
                const newY = current.y + directions[i][1];
                
                // Check bounds and if cell is unvisited
                if (newX > 0 && newX < this.width && newY > 0 && newY < this.height - 1 && this.maze[newY][newX] === 1) {
                    validDirections.push({
                        x: newX, 
                        y: newY, 
                        wallX: current.x + directions[i][0] / 2,
                        wallY: current.y + directions[i][1] / 2
                    });
                }
            }
            
            if (validDirections.length > 0) {
                // Choose random valid direction
                const chosen = validDirections[Math.floor(Math.random() * validDirections.length)];
                
                // Mark new cell as visited
                this.maze[chosen.y][chosen.x] = 0;
                
                // Remove wall between current and new cell
                this.maze[chosen.wallY][chosen.wallX] = 0;
                
                // Add new cell to stack
                stack.push({x: chosen.x, y: chosen.y});
                visitedCells++;
            } else {
                // No valid directions, backtrack
                stack.pop();
            }
            
            // Safety check to prevent infinite loops
            if (stack.length === 0 && visitedCells < totalCells * 0.7) {
                // Find an unvisited cell and start again
                for (let y = 1; y < this.height - 1; y += 2) {
                    for (let x = 1; x < this.width; x += 2) {
                        if (this.maze[y][x] === 1) {
                            this.maze[y][x] = 0;
                            stack.push({x: x, y: y});
                            visitedCells++;
                            break;
                        }
                    }
                    if (stack.length > 0) break;
                }
            }
        }
        
        // Convert remaining unvisited cells to passages
        this.connectIsolatedSections();
    }
    
    connectIsolatedSections() {
        for (let y = 1; y < this.height - 1; y += 2) {
            for (let x = 1; x < this.width; x += 2) {
                if (this.maze[y][x] === 1) {
                    this.maze[y][x] = 0; // Convert to passage
                    
                    // Connect to adjacent passage if possible
                    if (x > 2 && this.maze[y][x-2] === 0) {
                        this.maze[y][x-1] = 0;
                    } else if (x < this.width - 2 && this.maze[y][x+2] === 0) {
                        this.maze[y][x+1] = 0;
                    } else if (y > 2 && this.maze[y-2][x] === 0) {
                        this.maze[y-1][x] = 0;
                    } else if (y < this.height - 3 && this.maze[y+2][x] === 0) {
                        this.maze[y+1][x] = 0;
                    }
                }
            }
        }
    }
    
    ensureGoalAccessible() {
        const goalX = this.width - 2;
        const goalY = this.height - 2;
        
        // Make sure goal position is passable
        if (goalY > 0 && goalX > 0 && this.maze[goalY] && this.maze[goalY][goalX] !== undefined) {
            this.maze[goalY][goalX] = 0;
            
            // Create connections to ensure goal area is part of the maze
            if (goalX > 2) this.maze[goalY][goalX-1] = 0;
            if (goalY > 2) this.maze[goalY-1][goalX] = 0;
        }
        
        // Use flood fill to check connectivity from the default start
        if (!this.isReachable(1, 1, goalX, goalY)) {
            this.createPath(1, 1, goalX, goalY);
        }
    }

    ensurePathFrom(startX, startY) {
        const goalX = this.width - 2;
        const goalY = this.height - 2;

        // Ensure the player's tile is not a wall, just in case.
        if (this.maze[startY] && this.maze[startY][startX]) {
            this.maze[startY][startX] = 0;
        }

        if (!this.isReachable(startX, startY, goalX, goalY)) {
            this.createPath(startX, startY, goalX, goalY);
            console.log(`[MazeSystem] Carved new path from (${startX},${startY}) to goal.`);
        }
    }
    
    isReachable(startX, startY, targetX, targetY) {
        const visited = new Set();
        const queue = [{x: startX, y: startY}];
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (x === targetX && y === targetY) return true;
            
            // Check all 4 directions
            const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];
            for (const dir of directions) {
                const newX = x + dir.dx;
                const newY = y + dir.dy;
                
                if (this.maze[newY] && this.maze[newY][newX] !== undefined && 
                    this.maze[newY][newX] === 0 && !visited.has(`${newX},${newY}`)) {
                    queue.push({x: newX, y: newY});
                }
            }
        }
        return false;
    }
    
    createPath(startX, startY, goalX, goalY) {
        // Create a simple path from a given start to the goal
        let currentX = startX, currentY = startY;
        
        // Move horizontally first
        while (currentX < goalX) {
            currentX++;
            if (this.maze[currentY] && this.maze[currentY][currentX] !== undefined) {
                this.maze[currentY][currentX] = 0;
            }
        }
        
        // Then move vertically
        while (currentY < goalY) {
            currentY++;
            if (this.maze[currentY] && this.maze[currentY][currentX] !== undefined) {
                this.maze[currentY][currentX] = 0;
            }
        }
    }
    
    isSolid(r, c) {
        if (!this.maze) return false;
        return (r < 0 || c < 0 || r >= this.maze.length || c >= this.maze[0].length) 
            ? true 
            : this.maze[r][c] > 0;
    }
    
    render(ctx, camera) {
        if (!this.maze) return;
        
        // Optimized rendering - only render visible tiles
        const viewport = camera.viewport;
        const startCol = Math.max(0, Math.floor(viewport.left / 25));
        const endCol = Math.min(this.maze[0].length - 1, Math.ceil(viewport.right / 25));
        const startRow = Math.max(0, Math.floor(viewport.top / 25));
        const endRow = Math.min(this.maze.length - 1, Math.ceil(viewport.bottom / 25));
        
        for (let i = startRow; i <= endRow; i++) {
            const row = this.maze[i];
            for (let j = startCol; j <= endCol; j++) {
                if (row[j] <= 0) {
                    // Dynamic goal and start positions
                    const goalTileX = this.width - 2;
                    const goalTileY = this.height - 2;
                    
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    
                    if (i == goalTileY && j == goalTileX) {
                        ctx.fillStyle = "#FF0000"; // Red goal
                    } else if (i == 1 && j == 1) {
                        ctx.fillStyle = "#00FF00"; // Green start
                    } else {
                        ctx.fillStyle = "#CFCFCF"; // Regular path
                    }
                    
                    ctx.fillRect(25 * j, 25 * i, 27, 27);
                }
            }
        }
    }
    
    getMaze() {
        return this.maze;
    }
    
    getGoalPosition() {
        return {
            x: (this.width - 2) * 25 + 12.5,
            y: (this.height - 2) * 25 + 12.5
        };
    }
    
    getStartPosition() {
        return {
            x: 25 + 12.5,
            y: 25 + 12.5
        };
    }
}

// Make available globally
window.MazeSystem = MazeSystem;
