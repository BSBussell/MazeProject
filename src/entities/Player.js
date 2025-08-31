/**
 * Player - Player entity with movement, trail effects, and rendering
 */
class Player {
    constructor(x = 25, y = 25) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 15;
        this.height = 15;
        
        // Path recording for ghost
        this.path = [];

        // Trail system
        this.trail = [];
        this.TRAIL_MAX = 6;
        this.TRAIL_MIN_SPEED = 220;
        this.trailEmitT = 0;
    }
    
    update(physicsState) {
        // Update position from physics
        this.x = physicsState.x;
        this.y = physicsState.y;
        this.vx = physicsState.vx;
        this.vy = physicsState.vy;
        
        // Record current position for ghost replay
        this.path.push({ x: this.x, y: this.y });

        // Update trail system
        this.updateTrail(0.016); // Approximate 60fps
    }
    
    updateTrail(dt) {
        const speed = Math.hypot(this.vx, this.vy);
        
        // Emit trail particles when moving fast enough
        if (speed > this.TRAIL_MIN_SPEED) {
            this.trailEmitT += dt;
            if (this.trailEmitT >= 0.06) {
                this.trail.push({ 
                    x: this.x, 
                    y: this.y, 
                    alpha: 0.2, 
                    life: 0.25 
                });
                if (this.trail.length > this.TRAIL_MAX) {
                    this.trail.shift();
                }
                this.trailEmitT = 0;
            }
        }
        
        // Decay trail
        for (const ghost of this.trail) {
            ghost.life -= dt;
            ghost.alpha = Math.max(0, ghost.life / 0.25) * 0.2;
        }
        this.trail = this.trail.filter(ghost => ghost.life > 0);
    }
    
    render(ctx) {
        // Render trail ghosts first (behind player)
        for (const ghost of this.trail) {
            ctx.fillStyle = `rgba(0, 80, 255, ${ghost.alpha.toFixed(3)})`;
            ctx.fillRect(ghost.x + 2, ghost.y + 2, 11, 11);
        }
        
        // Render player with tint based on speed stacks
        const pelletSystem = window.game ? window.game.systems.pellets : null;
        let color = "#0000FF"; // Standard blue
        if (pelletSystem && typeof pelletSystem.getSpeedInfo === "function") {
            const info = pelletSystem.getSpeedInfo();
            const count = info?.count || 0;
            // Ease toward baby blue as stacks increase
            const t = 1 - Math.pow(0.8, Math.max(0, count)); // 0..~1
            // Base blue (0,0,255) -> Baby blue (153,204,255)
            const r = Math.round(0 * (1 - t) + 153 * t);
            const g = Math.round(0 * (1 - t) + 204 * t);
            const b = 255; // stays at 255
            color = `rgb(${r},${g},${b})`;
        }
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    getTilePosition() {
        return {
            x: Math.floor(this.x / 25),
            y: Math.floor(this.y / 25)
        };
    }
    
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
    
    reset(x = 25, y = 25) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.trailEmitT = 0;
        this.path = []; // Reset path on new level/restart
    }
    
    moveToSafePosition(mazeSystem) {
        // Find nearest empty tile if player is stuck in a wall
        const currentTile = this.getTilePosition();
        
        for (let radius = 1; radius < 10; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const testY = currentTile.y + dy;
                    const testX = currentTile.x + dx;
                    
                    if (!mazeSystem.isSolid(testY, testX)) {
                        this.x = testX * 25 + 12;
                        this.y = testY * 25 + 12;
                        this.vx = 0;
                        this.vy = 0;
                        return;
                    }
                }
            }
        }
    }
    
    // Get collision bounds for pellet detection
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2
        };
    }
}

// Make available globally
window.Player = Player;
