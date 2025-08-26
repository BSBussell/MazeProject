/**
 * PhysicsSystem - Handles AABB collision detection and player movement
 */
class PhysicsSystem {
    constructor() {
        // Physics configuration
        this.MAX_SPEED = 300;
        this.STEER = 7.5;
        this.DRAG = 9.0;
        this.TILE = 25;
        this.PW = 13; // Player width
        this.PH = 13; // Player height
        this.EPS = 0.0001;
        
        // State
        this.x = 25;
        this.y = 25;
        this.vx = 0;
        this.vy = 0;
        this.mazeRef = null;
    }
    
    configure(opts) {
        if (opts.MAX_SPEED !== undefined) this.MAX_SPEED = opts.MAX_SPEED;
        if (opts.STEER !== undefined) this.STEER = opts.STEER;
        if (opts.DRAG !== undefined) this.DRAG = opts.DRAG;
        if (opts.TILE !== undefined) this.TILE = opts.TILE;
        if (opts.PW !== undefined) this.PW = opts.PW;
        if (opts.PH !== undefined) this.PH = opts.PH;
    }
    
    setMaze(maze) {
        this.mazeRef = maze;
    }
    
    setPose(px, py) {
        this.x = px;
        this.y = py;
        this.vx = 0;
        this.vy = 0;
    }
    
    getPose() {
        return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
    }
    
    getConfig() {
        return {
            MAX_SPEED: this.MAX_SPEED,
            STEER: this.STEER,
            DRAG: this.DRAG,
            TILE: this.TILE,
            PW: this.PW,
            PH: this.PH
        };
    }
    
    isSolid(r, c) {
        if (!this.mazeRef) return false;
        return (r < 0 || c < 0 || r >= this.mazeRef.length || c >= this.mazeRef[0].length) 
            ? true 
            : this.mazeRef[r][c] > 0;
    }
    
    step(dt, inputX, inputY) {
        // 1) Shape input -> desired velocity
        const desiredVx = inputX * this.MAX_SPEED;
        const desiredVy = inputY * this.MAX_SPEED;
        
        // 2) Steer vx,vy toward desired
        const steer = 1 - Math.exp(-this.STEER * dt);
        this.vx += (desiredVx - this.vx) * steer;
        this.vy += (desiredVy - this.vy) * steer;
        
        // 3) Apply drag when no input
        if (inputX === 0 && inputY === 0) {
            const drag = Math.exp(-this.DRAG * dt);
            this.vx *= drag;
            this.vy *= drag;
            
            // Stop micro-movements
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
            if (Math.abs(this.vy) < 0.1) this.vy = 0;
        }
        
        // 4) Sweep X then Y against maze grid
        this.sweepX(dt);
        this.sweepY(dt);
        
        return this.getPose();
    }
    
    sweepX(dt) {
        let dir = Math.sign(this.vx);
        let newX = this.x + this.vx * dt;
        
        if (dir !== 0) {
            const topRow = Math.floor(this.y / this.TILE);
            const bottomRow = Math.floor((this.y + this.PH - 1) / this.TILE);
            const startEdge = this.x + (dir > 0 ? this.PW : 0);
            const endEdge = newX + (dir > 0 ? this.PW : 0);
            let startCol = Math.floor(startEdge / this.TILE);
            const endCol = Math.floor(endEdge / this.TILE);
            
            for (let col = startCol + dir; (dir > 0 ? col <= endCol : col >= endCol); col += dir) {
                for (let row = topRow; row <= bottomRow; row++) {
                    if (this.isSolid(row, col)) {
                        const faceX = dir > 0 ? col * this.TILE : (col + 1) * this.TILE;
                        newX = dir > 0 ? faceX - this.PW - this.EPS : faceX + this.EPS;
                        this.vx = 0;
                        col = endCol + dir; // Stop processing
                        break;
                    }
                }
            }
        }
        this.x = newX;
    }
    
    sweepY(dt) {
        let dir = Math.sign(this.vy);
        let newY = this.y + this.vy * dt;
        
        if (dir !== 0) {
            const leftCol = Math.floor(this.x / this.TILE);
            const rightCol = Math.floor((this.x + this.PW - 1) / this.TILE);
            const startEdge = this.y + (dir > 0 ? this.PH : 0);
            const endEdge = newY + (dir > 0 ? this.PH : 0);
            let startRow = Math.floor(startEdge / this.TILE);
            const endRow = Math.floor(endEdge / this.TILE);
            
            for (let row = startRow + dir; (dir > 0 ? row <= endRow : row >= endRow); row += dir) {
                for (let col = leftCol; col <= rightCol; col++) {
                    if (this.isSolid(row, col)) {
                        const faceY = dir > 0 ? row * this.TILE : (row + 1) * this.TILE;
                        newY = dir > 0 ? faceY - this.PH - this.EPS : faceY + this.EPS;
                        this.vy = 0;
                        row = endRow + dir; // Stop processing
                        break;
                    }
                }
            }
        }
        this.y = newY;
    }
}

// Make available globally
window.PhysicsSystem = PhysicsSystem;
