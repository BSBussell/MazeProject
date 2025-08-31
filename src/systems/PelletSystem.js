/**
 * PelletSystem - Manages point, time, and speed pellets.
 * Refactored to use a single pellets array and a unified collection logic.
 */
class PelletSystem {
    constructor() {
        this.pellets = [];
        this.animTime = 0;

        // Speed boost tracking (stackable until level reset; no timer)
        this.speedBoosts = []; // array elements just track count; no expirations
        this.speedBoostActive = false; // derived from boosts length
        this.baseMaxSpeed = 300; // baseline when no boosts are active
        this.speedIncFirst = 120; // first boost adds this much speed
        this.speedDecay = 0.6; // each additional boost adds inc * decay^i
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
                // Stackable speed boost with diminishing returns (no timer/expiry)
                // Base is fixed per level and set in reset(); simply add a stack
                this.speedBoosts.push(1);
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

        // No expiry: speed stacks persist for the level; nothing to do here

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

    // Add additional time pellets into available dead ends without resetting existing pellets
    spawnExtraTimePellets(count = 12) {
        try {
            const maze = window.game?.systems?.maze?.getMaze?.();
            if (!maze || !Array.isArray(maze) || maze.length === 0) return 0;

            // Build a set of occupied tiles (having any uncollected pellet)
            const occupied = new Set();
            const key = (x, y) => `${x},${y}`;
            for (const p of this.pellets) {
                if (p && !p.collected) {
                    const tx = Math.round((p.x - 12.5) / 25);
                    const ty = Math.round((p.y - 12.5) / 25);
                    occupied.add(key(tx, ty));
                }
            }

            // Collect candidate dead-end tiles that are free
            const candidates = [];
            for (let y = 1; y < maze.length - 1; y++) {
                for (let x = 1; x < maze[0].length - 1; x++) {
                    if (x === 1 && y === 1) continue; // skip start tile
                    if (this.isDeadEnd(maze, x, y) && !occupied.has(key(x, y))) {
                        candidates.push({ x, y });
                    }
                }
            }

            if (candidates.length === 0) return 0;

            // Shuffle candidates
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = candidates[i];
                candidates[i] = candidates[j];
                candidates[j] = tmp;
            }

            const toPlace = Math.min(count, candidates.length);
            for (let i = 0; i < toPlace; i++) {
                const c = candidates[i];
                this.pellets.push({
                    x: c.x * 25 + 12.5,
                    y: c.y * 25 + 12.5,
                    collected: false,
                    type: 'time',
                });
            }

            if (toPlace > 0) {
                console.log(`[PelletSystem] Spawned ${toPlace} extra time pellets after collision.`);
            }
            return toPlace;
        } catch (e) {
            console.warn('[PelletSystem] Failed to spawn extra time pellets:', e);
            return 0;
        }
    }

    reset() {
        this.pellets = [];
        this.speedBoosts = [];
        this.speedBoostActive = false;
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;

        // Reset player speed to baseline at level start
        this.baseMaxSpeed = 300;
        if (window.game && window.game.systems.physics) {
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

    // Expose speed stack and display multiplier for UI
    getSpeedInfo() {
        const count = this.speedBoosts.length;
        const current = this._computeBoostedSpeed(count);
        const base = this.baseMaxSpeed;
        const multiplier = base > 0 ? current / base : 1;
        return { count, multiplier, current, base };
    }
}

window.PelletSystem = PelletSystem;
