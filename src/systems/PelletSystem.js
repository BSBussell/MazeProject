/**
 * PelletSystem - Manages point pellets, time pellets, and speed pellets
 */
class PelletSystem {
    constructor() {
        this.pointPellets = [];
        this.timePellets = [];
        this.speedPellets = [];
        this.animTime = 0;
        
        // Speed boost tracking
        this.speedBoostActive = false;
        this.speedBoostEndTime = 0;
        
        // Combo system
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;
        this.COMBO_WINDOW_MS = 1500;
    }
    
    spawn(maze, level) {
        this.reset();
        
        // No pellets for tutorial level
        if (level < 2) return;
        
        let deadEndCount = 0;
        let pelletCount = 0;
        let timePelletCount = 0;
        let speedPelletCount = 0;
        
        for (let y = 1; y < maze.length - 1; y++) {
            for (let x = 1; x < maze[0].length - 1; x++) {
                if (this.isDeadEnd(maze, x, y)) {
                    deadEndCount++;
                    
                    const rand = Math.random();
                    
                    if (level >= 7 && rand < 0.03) { // 3% rare chance for speed pellets
                        this.speedPellets.push({
                            x: x * 25 + 12.5,
                            y: y * 25 + 12.5,
                            collected: false
                        });
                        speedPelletCount++;
                    } else if (level >= 3 && rand < 0.20) { // Increased from 8% to 20% chance for time pellets, start at level 3
                        this.timePellets.push({
                            x: x * 25 + 12.5,
                            y: y * 25 + 12.5,
                            collected: false
                        });
                        timePelletCount++;
                    } else if (level >= 2 && rand < 0.15) { // 15% chance for point pellets
                        this.pointPellets.push({
                            x: x * 25 + 12.5,
                            y: y * 25 + 12.5,
                            collected: false
                        });
                        pelletCount++;
                    }
                }
            }
        }
        
        console.log(`Level ${level}: Found ${deadEndCount} dead ends, spawned ${pelletCount} point, ${timePelletCount} time, ${speedPelletCount} speed pellets`);
    }
    
    isDeadEnd(maze, tileX, tileY) {
        // Must be a passable tile
        if (!maze[tileY] || maze[tileY][tileX] === undefined || maze[tileY][tileX] > 0) return false;
        
        let openDirections = 0;
        const directions = [
            {dx: 0, dy: -1}, // up
            {dx: 0, dy: 1},  // down
            {dx: -1, dy: 0}, // left
            {dx: 1, dy: 0}   // right
        ];
        
        for (const dir of directions) {
            const adjX = tileX + dir.dx;
            const adjY = tileY + dir.dy;
            if (adjY >= 0 && adjY < maze.length && adjX >= 0 && adjX < maze[0].length) {
                if (maze[adjY][adjX] <= 0) {
                    openDirections++;
                }
            }
        }
        
        return openDirections === 1;
    }
    
    checkCollisions(player) {
        const playerBounds = player.getCollisionBounds();
        let collected = false;
        
        // Check point pellets
        for (const pellet of this.pointPellets) {
            if (!pellet.collected && this.checkPelletCollision(playerBounds, pellet)) {
                pellet.collected = true;
                this.collectPointPellet(playerBounds.centerX, playerBounds.centerY);
                collected = true;
            }
        }
        
        // Check time pellets
        for (const pellet of this.timePellets) {
            if (!pellet.collected && this.checkPelletCollision(playerBounds, pellet)) {
                pellet.collected = true;
                this.collectTimePellet(playerBounds.centerX, playerBounds.centerY);
                collected = true;
            }
        }
        
        // Check speed pellets
        for (const pellet of this.speedPellets) {
            if (!pellet.collected && this.checkPelletCollision(playerBounds, pellet)) {
                pellet.collected = true;
                this.collectSpeedPellet(playerBounds.centerX, playerBounds.centerY);
                collected = true;
            }
        }
        
        return collected;
    }
    
    checkPelletCollision(playerBounds, pellet) {
        const dx = playerBounds.centerX - pellet.x;
        const dy = playerBounds.centerY - pellet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 10;
    }
    
    collectPointPellet(playerX, playerY) {
        // Update combo
        this.comboCount += 1;
        this.comboMul = Math.min(3.0, 1.0 + 0.25 * (this.comboCount - 1));
        this.comboWindowUntil = performance.now() + this.COMBO_WINDOW_MS;
        
        // Calculate score with multiplier
        const base = 25;
        const gained = Math.floor(base * this.comboMul);
        
        // Add to game score (this would need to be connected to the game)
        if (window.game) {
            window.game.gameScore += gained;
        }
        
        // Trigger effects
        this.triggerPelletEffects(playerX, playerY, `+${gained}`, "#ff4081", 14);
    }
    
    collectTimePellet(playerX, playerY) {
        // Add 3 seconds to countdown (matches documentation)
        if (window.game) {
            window.game.startDate = new Date(window.game.startDate.getTime() + 3000);
        }
        
        this.triggerPelletEffects(playerX, playerY, "+3s", "#39ff14", 12);
    }
    
    collectSpeedPellet(playerX, playerY) {
        this.speedBoostActive = true;
        this.speedBoostEndTime = Date.now() + 10000; // 10 seconds
        
        // Apply speed boost to physics system
        if (window.game && window.game.systems.physics) {
            window.game.systems.physics.configure({ MAX_SPEED: 450 });
        }
        
        this.triggerPelletEffects(playerX, playerY, "+Speed", "#0099ff", 12);
    }
    
    triggerPelletEffects(x, y, text, color, particleCount) {
        // Add popup and particles (would need to be connected to effects system)
        if (window.game && window.game.systems.effects) {
            window.game.systems.effects.addPopup(text, x, y - 15, "score");
            window.game.systems.effects.addParticles(x, y, color, particleCount);
        }
        
        // Camera kick
        if (window.game && window.game.systems.camera) {
            window.game.systems.camera.addCameraKick(0.8);
        }
        
        // CRT zoom effect
        if (window.game) {
            // Trigger zoom animation (this would be handled by the game core)
        }
    }
    
    update(dt) {
        this.animTime += dt;
        
        // Update speed boost
        if (this.speedBoostActive && this.speedBoostEndTime > 0 && Date.now() > this.speedBoostEndTime) {
            this.speedBoostActive = false;
            this.speedBoostEndTime = 0;
            
            // Reset speed to normal
            if (window.game && window.game.systems.physics) {
                window.game.systems.physics.configure({ MAX_SPEED: 300 });
            }
        }
        
        // Update combo
        const nowMs = performance.now();
        if (this.comboCount > 0 && nowMs > this.comboWindowUntil) {
            this.comboCount = 0;
            this.comboMul = 1.0;
        }
    }
    
    render(ctx, currentTime) {
        // Render point pellets (pink)
        for (const pellet of this.pointPellets) {
            if (!pellet.collected) {
                const pulse = Math.sin(this.animTime * 4) * 0.3 + 0.7;
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = "#ff4081";
                ctx.beginPath();
                ctx.arc(pellet.x, pellet.y, 4 * pulse, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        // Render time pellets (green)
        for (const pellet of this.timePellets) {
            if (!pellet.collected) {
                const pulse = Math.sin(this.animTime * 3) * 0.4 + 0.6;
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = "#39ff14";
                ctx.beginPath();
                ctx.arc(pellet.x, pellet.y, 5 * pulse, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        // Render speed pellets (blue)
        for (const pellet of this.speedPellets) {
            if (!pellet.collected) {
                const pulse = Math.sin(this.animTime * 5) * 0.3 + 0.7;
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = "#0099ff";
                ctx.beginPath();
                ctx.arc(pellet.x, pellet.y, 4 * pulse, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
    
    reset() {
        this.pointPellets = [];
        this.timePellets = [];
        this.speedPellets = [];
        this.speedBoostActive = false;
        this.speedBoostEndTime = 0;
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;
    }
    
    getComboInfo() {
        return {
            count: this.comboCount,
            multiplier: this.comboMul,
            active: this.comboCount > 0
        };
    }
    
    isSpeedBoosted() {
        return this.speedBoostActive;
    }
}

// Make available globally
window.PelletSystem = PelletSystem;
