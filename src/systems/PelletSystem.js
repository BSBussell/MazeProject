/**
 * PelletSystem - Manages point, time, and speed pellets.
 * Refactored to use a single pellets array and a unified collection logic.
 */
class PelletSystem {
    constructor() {
        this.pellets = [];
        this.animTime = 0;

        // Speed boost tracking (stackable with diminishing returns)
        this.speedBoosts = []; // array of expiry timestamps (ms)
        this.speedBoostActive = false; // derived from boosts length
        this.baseMaxSpeed = 300; // baseline when no boosts are active
        this.speedIncFirst = 120; // first boost adds this much speed
        this.speedDecay = 0.6; // each additional boost adds inc * decay^i
        this.speedDurationMs = 10000; // duration per boost
        this._lastAppliedSpeed = null;

        // Combo system
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;
        this.COMBO_WINDOW_MS = 1500;
    }

    spawn(maze, level) {
        this.reset();

        if (level < 2) return;

        let deadEndCount = 0;
        let pointPelletCount = 0;
        let timePelletCount = 0;
        let speedPelletCount = 0;

        // Track occupied dead-end tiles to prevent multiple pellets on the same tile
        const occupied = new Set();
        const key = (x, y) => `${x},${y}`;

        for (let y = 1; y < maze.length - 1; y++) {
            for (let x = 1; x < maze[0].length - 1; x++) {
                if (this.isDeadEnd(maze, x, y)) {
                    // Skip the player starting tile (1,1)
                    if (x === 1 && y === 1) continue;

                    deadEndCount++;
                    const k = key(x, y);
                    if (occupied.has(k)) continue; // already has a pellet

                    // Try to spawn at most one pellet per dead end, with priorities
                    const placePellet = (type) => {
                        this.pellets.push({
                            x: x * 25 + 12.5,
                            y: y * 25 + 12.5,
                            collected: false,
                            type,
                        });
                        occupied.add(k);
                        return true;
                    };

                    // Prefer rarer pellets slightly by checking in order: speed -> time -> point
                    if (level >= 7 && Math.random() < 0.03 && !occupied.has(k)) {
                        if (placePellet('speed')) speedPelletCount++;
                        continue;
                    }
                    if (level >= 3 && Math.random() < 0.20 && !occupied.has(k)) {
                        if (placePellet('time')) timePelletCount++;
                        continue;
                    }
                    if (level >= 2 && Math.random() < 0.15 && !occupied.has(k)) {
                        if (placePellet('point')) pointPelletCount++;
                        continue;
                    }
                }
            }
        }

        console.log(`Level ${level}: Found ${deadEndCount} dead ends, spawned ${pointPelletCount} point, ${timePelletCount} time, ${speedPelletCount} speed pellets`);
    }

    isDeadEnd(maze, tileX, tileY) {
        if (!maze[tileY] || maze[tileY][tileX] === undefined || maze[tileY][tileX] > 0) return false;
        let openDirections = 0;
        const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];
        for (const dir of directions) {
            const adjX = tileX + dir.dx;
            const adjY = tileY + dir.dy;
            if (adjY >= 0 && adjY < maze.length && adjX >= 0 && adjX < maze[0].length && maze[adjY][adjX] <= 0) {
                openDirections++;
            }
        }
        return openDirections === 1;
    }

    checkCollisions(player) {
        const playerBounds = player.getCollisionBounds();
        let collectedAny = false;

        for (const pellet of this.pellets) {
            if (!pellet.collected && this.checkPelletCollision(playerBounds, pellet)) {
                pellet.collected = true;
                this.collectPellet(player, pellet);
                collectedAny = true;
            }
        }
        return collectedAny;
    }

    checkPelletCollision(playerBounds, pellet) {
        const dx = playerBounds.centerX - pellet.x;
        const dy = playerBounds.centerY - pellet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 10;
    }

    collectPellet(player, pellet) {
        // Trigger the hook with both player and pellet info (Task E)
        if (window.game) {
            window.game.triggerHook('onPelletCollected', player, pellet);
        }

        const playerX = player.getCollisionBounds().centerX;
        const playerY = player.getCollisionBounds().centerY;

        switch (pellet.type) {
            case 'point':
                // Task F: Increase horror intensity
                if (window.game && window.game.systems.horror) {
                    const horrorSystem = window.game.systems.horror;
                    horrorSystem.horrorLevel = Math.min(1.0, horrorSystem.horrorLevel + 0.02); // Increased from 0.01
                }

                // Original point pellet logic
                this.comboCount++;
                this.comboMul = Math.min(3.0, 1.0 + 0.25 * (this.comboCount - 1));
                this.comboWindowUntil = performance.now() + this.COMBO_WINDOW_MS;
                const base = 25;
                const gained = Math.floor(base * this.comboMul);
                if (window.game) window.game.gameScore += gained;
                this.triggerPelletEffects(playerX, playerY, `+${gained}`, "#ff4081", 14);
                break;

            case 'time':
                // Task F: Subtract points
                if (window.game) {
                    window.game.gameScore -= 10;
                }

                // Original time pellet logic, now hooked into the new unified timer
                if (window.game) {
                    window.game.shuffleTimeRemaining += 3;
                }
                this.triggerPelletEffects(playerX, playerY, "+3s", "#39ff14", 12);
                break;

            case 'speed':
                // Stackable speed boost with diminishing returns
                if (window.game && window.game.systems.physics) {
                    // Capture current base when starting a new stack
                    if (this.speedBoosts.length === 0) {
                        try {
                            this.baseMaxSpeed = window.game.systems.physics.getConfig().MAX_SPEED || this.baseMaxSpeed;
                        } catch (e) { /* ignore */ }
                    }
                }
                this.speedBoosts.push(Date.now() + this.speedDurationMs);
                this.speedBoostActive = this.speedBoosts.length > 0;
                this.applyCurrentSpeed();
                this.triggerPelletEffects(playerX, playerY, `+Speed x${this.speedBoosts.length}` , "#0099ff", 12);
                break;
        }
    }

    triggerPelletEffects(x, y, text, color, particleCount) {
        if (window.game && window.game.systems.effects) {
            window.game.systems.effects.addPopup(text, x, y - 15, "score");
            window.game.systems.effects.addParticles(x, y, color, particleCount);
        }
        if (window.game && window.game.systems.camera) {
            window.game.systems.camera.addCameraKick(0.8);
        }
    }

    update(dt) {
        this.animTime += dt;

        // Expire speed boosts and update speed accordingly
        if (this.speedBoosts.length > 0) {
            const now = Date.now();
            const before = this.speedBoosts.length;
            this.speedBoosts = this.speedBoosts.filter(ts => ts > now);
            if (this.speedBoosts.length !== before) {
                if (this.speedBoosts.length === 0) {
                    // Stack ended: restore base speed
                    this.speedBoostActive = false;
                    if (window.game && window.game.systems.physics) {
                        window.game.systems.physics.configure({ MAX_SPEED: this.baseMaxSpeed });
                        this._lastAppliedSpeed = this.baseMaxSpeed;
                    }
                } else {
                    this.speedBoostActive = true;
                    this.applyCurrentSpeed();
                }
            }
        } else {
            // Keep base in sync with any external adjustments when idle
            if (window.game && window.game.systems.physics) {
                try {
                    this.baseMaxSpeed = window.game.systems.physics.getConfig().MAX_SPEED;
                } catch (e) { /* ignore */ }
            }
        }

        if (this.comboCount > 0 && performance.now() > this.comboWindowUntil) {
            this.comboCount = 0;
            this.comboMul = 1.0;
        }
    }

    render(ctx) {
        for (const pellet of this.pellets) {
            if (pellet.collected) continue;

            let color, radius;
            const pulse = Math.sin(this.animTime * 4) * 0.3 + 0.7;

            switch (pellet.type) {
                case 'point':
                    color = "#ff4081";
                    radius = 4 * pulse;
                    break;
                case 'time':
                    color = "#39ff14";
                    radius = 5 * (Math.sin(this.animTime * 3) * 0.4 + 0.6);
                    break;
                case 'speed':
                    color = "#0099ff";
                    radius = 4 * (Math.sin(this.animTime * 5) * 0.3 + 0.7);
                    break;
                default:
                    continue;
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pellet.x, pellet.y, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    reset() {
        this.pellets = [];
        this.speedBoosts = [];
        this.speedBoostActive = false;
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;

        // Also ensure the player's speed is reset in the physics system
        if (window.game && window.game.systems.physics) {
            // Reset base to current physics speed and clear any applied boost
            try {
                this.baseMaxSpeed = window.game.systems.physics.getConfig().MAX_SPEED || 300;
            } catch (e) {
                this.baseMaxSpeed = 300;
            }
            window.game.systems.physics.configure({ MAX_SPEED: this.baseMaxSpeed });
            this._lastAppliedSpeed = this.baseMaxSpeed;
        }
    }

    getComboInfo() {
        return { count: this.comboCount, multiplier: this.comboMul, active: this.comboCount > 0 };
    }

    isSpeedBoosted() {
        return this.speedBoostActive;
    }

    // Compute boosted speed based on active stack
    _computeBoostedSpeed(stackCount) {
        let bonus = 0;
        for (let i = 0; i < stackCount; i++) {
            bonus += this.speedIncFirst * Math.pow(this.speedDecay, i);
        }
        return this.baseMaxSpeed + bonus;
    }

    applyCurrentSpeed() {
        if (!(window.game && window.game.systems.physics)) return;
        const target = this._computeBoostedSpeed(this.speedBoosts.length);
        if (this._lastAppliedSpeed === null || Math.abs(target - this._lastAppliedSpeed) > 0.001) {
            window.game.systems.physics.configure({ MAX_SPEED: target });
            this._lastAppliedSpeed = target;
        }
    }
}

window.PelletSystem = PelletSystem;
