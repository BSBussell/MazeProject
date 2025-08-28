/**
 * PelletSystem - Manages point, time, and speed pellets.
 * Refactored to use a single pellets array and a unified collection logic.
 */
class PelletSystem {
    constructor() {
        this.pellets = [];
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

        if (level < 2) return;

        let deadEndCount = 0;
        let pointPelletCount = 0;
        let timePelletCount = 0;
        let speedPelletCount = 0;

        for (let y = 1; y < maze.length - 1; y++) {
            for (let x = 1; x < maze[0].length - 1; x++) {
                if (this.isDeadEnd(maze, x, y)) {
                    deadEndCount++;

                    // Independent check for point pellets
                    if (level >= 2 && Math.random() < 0.15) {
                        this.pellets.push({
                            x: x * 25 + 12.5, y: y * 25 + 12.5,
                            collected: false, type: 'point'
                        });
                        pointPelletCount++;
                    }

                    // Independent check for time pellets
                    if (level >= 3 && Math.random() < 0.20) {
                        this.pellets.push({
                            x: x * 25 + 12.5, y: y * 25 + 12.5,
                            collected: false, type: 'time'
                        });
                        timePelletCount++;
                    }

                    // Independent check for speed pellets
                    if (level >= 7 && Math.random() < 0.03) {
                        this.pellets.push({
                            x: x * 25 + 12.5, y: y * 25 + 12.5,
                            collected: false, type: 'speed'
                        });
                        speedPelletCount++;
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

                // Original time pellet logic
                if (window.game) {
                    window.game.startDate = new Date(window.game.startDate.getTime() + 3000);
                }
                this.triggerPelletEffects(playerX, playerY, "+3s", "#39ff14", 12);
                break;

            case 'speed':
                // Original speed pellet logic
                this.speedBoostActive = true;
                this.speedBoostEndTime = Date.now() + 10000;
                if (window.game && window.game.systems.physics) {
                    window.game.systems.physics.configure({ MAX_SPEED: 450 });
                }
                this.triggerPelletEffects(playerX, playerY, "+Speed", "#0099ff", 12);
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

        if (this.speedBoostActive && Date.now() > this.speedBoostEndTime) {
            this.speedBoostActive = false;
            if (window.game && window.game.systems.physics) {
                window.game.systems.physics.configure({ MAX_SPEED: 300 });
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
        this.speedBoostActive = false;
        this.speedBoostEndTime = 0;
        this.comboCount = 0;
        this.comboMul = 1.0;
        this.comboWindowUntil = 0;
    }

    getComboInfo() {
        return { count: this.comboCount, multiplier: this.comboMul, active: this.comboCount > 0 };
    }

    isSpeedBoosted() {
        return this.speedBoostActive;
    }
}

window.PelletSystem = PelletSystem;
