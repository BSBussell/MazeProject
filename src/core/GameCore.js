/**
 * GameCore - Main game controller that orchestrates all systems
 * Provides hooks for easy modification and extension
 */
class GameCore {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.lastTime = performance.now();
        this.isRunning = false;

        // Game state
        this.gameState = "intro"; // intro, countdown, playing, winning, gameover, cinematic
        this.gameScore = 0;
        this.mazeLevel = 1;
        this.baseMazeSize = 25;
        this.currentMazeSize = this.baseMazeSize;

        // Timing constants
        this.BASE_SHUFFLE_TIME = 15;
        this.SHUFFLE_TIME_DECREASE = 3;

        // Speed multipliers
        this.countdownSpeed = 1; // Faster pre-game 3..2..1
        this.shuffleTimerSpeed = 1.0; // In-round reshuffle countdown speed

        // Timing
        this.baseShuffleTime = this.BASE_SHUFFLE_TIME;
        this.currentShuffleTime = this.baseShuffleTime;
        this.shuffleTimeRemaining = 0; // The single source of truth for the shuffle timer
        this.Wait = this.baseShuffleTime; // Represents the *duration* of the next round

        // Flags
        this.transitioningToNext = false;
        this.showingScore = false;
        this.pelletsSpawned = false;

        // Systems (will be initialized)
        this.systems = {};
        this.entities = {};

        // Ghost-related properties
        this.playerPaths = []; // Array to store historical player paths
        this.activeGhosts = []; // Array to manage active ghost entities

        // Light finish scale effect state
        this.winScale = {
            active: false,
            startTime: 0,
            duration: 400, // ms
            pos: { x: 0, y: 0 },
        };

        // Level start scale-in effect
        this.spawnScale = {
            active: false,
            startTime: 0,
            duration: 400, // ms
        };

        // Event hooks for easy extension
        this.hooks = {
            onGameStart: [],
            onLevelComplete: [],
            onGameOver: [],
            onPelletCollected: [],
            onMazeGenerated: [],
            onMazeReshuffle: [],
            beforeUpdate: [],
            afterUpdate: [],
            beforeRender: [],
            afterRender: [],
        };

        this.initializeSystems();
    }

    initializeSystems() {
        // Initialize global game flags
        window.GameFlags = window.GameFlags || {
            forceSilentRound: false,
            inSilentRound: false,
        };

        // Initialize all game systems
        this.systems.physics = new PhysicsSystem();
        this.systems.maze = new MazeSystem();
        this.systems.camera = new CameraSystem(this.ctx);
        this.systems.input = new InputSystem();
        this.systems.ui = new UISystem();
        this.systems.audio = new AudioSystem();
        this.systems.effects = new EffectsSystem();
        this.systems.pellets = new PelletSystem();
        this.systems.horror = new HorrorSystem(this, {
            targetTime: 120,
            cooldown: 45,
        });

        this.systems.horror.addEffect(
            new HorrorUI(this.systems.horror, this.systems.ui),
        );
        this.systems.horror.addEffect(new HorrorAudio(this.systems.horror));
        this.systems.horror.addEffect(new HorrorCRT(this.systems.horror));
        this.systems.horror.addEffect(
            new HorrorCorruptMaze(this.systems.horror),
        );
        this.systems.horror.addEffect(new HorrorGhost(this.systems.horror));

        // Connect horror system to audio system for scary audio
        this.systems.horror.setAudioSystem(this.systems.audio);

        // Wire common game hooks to the horror system so events flow through
        // the central hook API (this keeps behaviour consistent with other
        // systems and with user-provided hooks).
        // Wire the onPelletCollected hook to the horror system.
        // The pellet object is now available, but the horror system only needs the player.
        this.addHook("onPelletCollected", (player, pellet) => {
            try {
                // For now, we only pass the player, but the pellet is available for future use.
                this.systems.horror.onPelletCollected(player, pellet);
            } catch (e) {
                console.error("Horror hook error (pellet):", e);
            }
        });

        this.addHook("onMazeReshuffle", (maze) => {
            try {
                this.systems.horror.onMapReshuffle(maze);
            } catch (e) {
                console.error("Horror hook error (reshuffle):", e);
            }
        });

        this.addHook("onLevelComplete", (level) => {
            try {
                this.systems.horror.onLevelComplete(level);
            } catch (e) {
                console.error("Horror hook error (level):", e);
            }
        });

        // Update Hook
        this.addHook("beforeUpdate", (dt) => {
            try {
                this.systems.horror.update(dt);
            } catch (e) {
                console.error("Horror hook error (update):", e);
            }
        });

        this.addHook("onGameStart", () => {
            try {
                this.systems.horror.startRun();
            } catch (e) {
                console.error("Horror hook error (start):", e);
            }
        });

        this.addHook("onGameOver", () => {
            try {
                this.systems.horror.endRun();
            } catch (e) {
                console.error("Horror hook error (gameover):", e);
            }
        });

        // Initialize player entity
        this.entities.player = new Player(25, 25);

        // Setup initial maze
        this.generateNewMaze();

        // Position camera at maze center for title screen
        this.systems.camera.positionAtMazeCenter(this.currentMazeSize);

        // Start with canvas faded out for smooth intro
        if (typeof document !== "undefined") {
            const canvas = document.getElementById("canvas");
            if (canvas) {
                canvas.style.opacity = "0";
            }
        }
    }

    // Hook system for easy extension
    addHook(event, callback) {
        if (this.hooks[event]) {
            this.hooks[event].push(callback);
        }
    }

    triggerHook(event, ...args) {
        if (this.hooks[event]) {
            this.hooks[event].forEach((callback) => callback(...args));
        }
    }

    // Main game loop
    update() {
        const currentTime = performance.now();
        const rawDt = (currentTime - this.lastTime) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.008), 0.025);
        this.lastTime = currentTime;

        this.triggerHook("beforeUpdate", dt, currentTime);

        // Update systems based on game state
        switch (this.gameState) {
            case "intro":
                this.updateIntro(dt, currentTime);
                break;
            case "cinematic":
                this.updateCinematic(dt, currentTime);
                break;
            case "countdown":
                this.updateCountdown(dt, currentTime);
                break;
            case "playing":
                this.updatePlaying(dt, currentTime);
                break;
            case "winning":
                this.updateWinning(dt, currentTime);
                break;
            case "gameover":
                this.updateGameOver(dt, currentTime);
                break;
        }

        // Always update certain systems
        this.systems.effects.update(dt, currentTime);
        this.systems.ui.update(dt, currentTime);

        this.triggerHook("afterUpdate", dt, currentTime);

        this.render(currentTime);

        if (this.isRunning) {
            requestAnimationFrame(() => this.update());
        }
    }

    updateIntro(dt, currentTime) {
        // Handle intro state - waiting for click to start
        if (
            this.systems.input.isClicked() &&
            this.systems.ui.isIntroComplete()
        ) {
            this.startGame();
        }
    }

    updateCinematic(dt, currentTime) {
        // Handle cinematic camera movement
        const isComplete = this.systems.camera.updateCinematic(dt, currentTime);
        if (isComplete) {
            // Ensure player is at center of the green tile when cinematic completes
            const { x, y } = this.getStartTopLeft();
            this.entities.player.reset(x, y);
            this.systems.physics.setPose(x, y);
            // Begin scale-in at the start tile
            this.spawnScale.active = true;
            this.spawnScale.startTime = performance.now();
            this.gameState = "countdown";
        }
    }

    updateCountdown(dt, currentTime) {
        // Handle countdown before gameplay
        if (this.systems.ui.updateCountdown(dt * this.countdownSpeed)) {
            this.gameState = "playing";
            // Prevent background music from starting mid-run if it was deferred
            if (this.systems && this.systems.audio && typeof this.systems.audio.cancelPendingMusicStart === "function") {
                this.systems.audio.cancelPendingMusicStart();
            }
            this.shuffleTimeRemaining = this.currentShuffleTime;
        }
    }

    updatePlaying(dt, currentTime) {
        // Decrement the unified shuffle timer
        this.shuffleTimeRemaining -= dt * this.shuffleTimerSpeed;

        // Main gameplay logic
        const input = this.systems.input.getGameInput();

        // Update player physics
        const playerState = this.systems.physics.step(dt, input.x, input.y);
        this.entities.player.update(playerState);

        // Update camera to follow player
        this.systems.camera.followPlayer(
            this.entities.player,
            dt,
            this.shuffleTimeRemaining,
        );

        // If player has reached the goal, trigger light scale-to-zero and then complete
        if (this.checkWinCondition()) {
            this.startWinScale();
            return;
        }

        // Update any active ghosts and check for collisions
        for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
            const ghost = this.activeGhosts[i];
            const collided = ghost.update(
                dt,
                this.entities.player,
                this.systems.camera,
            );
            if (collided) {
                this.handleGhostCollision(ghost);
                // Stop the loop for this frame since a shuffle was triggered
                break;
            }
            // Remove inactive ghosts (e.g., path complete), ensuring resources are cleaned up
            if (!ghost.active) {
                ghost.destroy();
                this.activeGhosts.splice(i, 1);
            }
        }

        // Pellet collision checking is now self-contained in PelletSystem,
        // including triggering the onPelletCollected hook.
        this.systems.pellets.checkCollisions(this.entities.player);

        // Win condition now handled before ghost checks above

        // Check shuffle timer (which now also handles game over)
        this.checkShuffleTimer();
    }

    updateGameOver(dt, currentTime) {
        // Handle game over state
        if (this.systems.input.isClicked()) {
            this.restartGame();
        }
    }

    render(currentTime) {
        this.triggerHook("beforeRender", currentTime);

        // Clear screen
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Begin camera transform
        this.systems.camera.begin();

        // Render maze
        this.systems.maze.render(this.ctx, this.systems.camera);

        // Render pellets
        this.systems.pellets.render(this.ctx, currentTime);

        // Render player (special cases: finish shrink, spawn grow). Otherwise hidden during cinematic/intro/celebration.
        if (this.gameState === "winning" && this.winScale.active) {
            const elapsed = performance.now() - this.winScale.startTime;
            const t = Math.min(elapsed / this.winScale.duration, 1.0);
            // Ease-out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            const s = Math.max(0, 1 - ease);

            const player = this.entities.player;
            const cx = player.x + player.width / 2;
            const cy = player.y + player.height / 2;

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.scale(s, s);
            this.ctx.translate(-cx, -cy);

            // Draw player rect in same color logic as Player.render()
            const pelletSystem = this.systems.pellets;
            // Match Player.render() tinting based on speed stacks
            if (pelletSystem && typeof pelletSystem.getSpeedInfo === "function") {
                const info = pelletSystem.getSpeedInfo();
                const count = info?.count || 0;
                const t = 1 - Math.pow(0.8, Math.max(0, count));
                const r = Math.round(0 * (1 - t) + 153 * t);
                const g = Math.round(0 * (1 - t) + 204 * t);
                const b = 255;
                this.ctx.fillStyle = `rgb(${r},${g},${b})`;
            } else {
                this.ctx.fillStyle = "#0000FF";
            }
            this.ctx.fillRect(player.x, player.y, player.width, player.height);

            this.ctx.restore();
        } else if (
            // Hide during cinematic, intro, or score celebration
            this.gameState !== "cinematic" &&
            this.gameState !== "intro" &&
            !this.showingScore
        ) {
            // If spawning, draw scaled-up player
            if (this.spawnScale.active) {
                const elapsed = performance.now() - this.spawnScale.startTime;
                const t = Math.min(elapsed / this.spawnScale.duration, 1.0);
                const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic 0->1
                const s = Math.max(0, Math.min(1, ease));

                const player = this.entities.player;
                const cx = player.x + player.width / 2;
                const cy = player.y + player.height / 2;

                this.ctx.save();
                this.ctx.translate(cx, cy);
                this.ctx.scale(s, s);
                this.ctx.translate(-cx, -cy);

                const pelletSystem = this.systems.pellets;
                if (pelletSystem && typeof pelletSystem.getSpeedInfo === "function") {
                    const info = pelletSystem.getSpeedInfo();
                    const count = info?.count || 0;
                    const t = 1 - Math.pow(0.8, Math.max(0, count));
                    const r = Math.round(0 * (1 - t) + 153 * t);
                    const g = Math.round(0 * (1 - t) + 204 * t);
                    const b = 255;
                    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
                } else {
                    this.ctx.fillStyle = "#0000FF";
                }
                this.ctx.fillRect(player.x, player.y, player.width, player.height);

                this.ctx.restore();

                if (t >= 1) {
                    this.spawnScale.active = false;
                }
            } else {
                this.entities.player.render(this.ctx);
            }
        } else {
            // Hidden during cinematic/intro/celebration
        }

        // Render any active ghosts
        this.activeGhosts.forEach((ghost) => ghost.render(this.ctx));

        // Render effects
        this.systems.effects.render(this.ctx, currentTime);

        // For intro state, render the title screen within the camera transform
        // so it appears at the maze center
        if (this.gameState === "intro") {
            this.systems.ui.renderIntro(this.ctx, currentTime);
        }

        // End camera transform
        this.systems.camera.end();

        // Render UI (outside camera transform) - except intro which is rendered above
        if (this.gameState !== "intro") {
            this.systems.ui.render(
                this.ctx,
                this.gameState,
                this.getUIData(),
                currentTime,
            );
        }

        this.triggerHook("afterRender", currentTime);
    }

    // Game state management
    startGame() {
        this.gameState = "cinematic";
        this.systems.camera.setMazeSize(this.currentMazeSize);
        this.systems.camera.startCinematic();

        // Start background music and ambience
        this.systems.audio.startBackgroundMusic();

        this.triggerHook("onGameStart");
    }

    completeLevel() {
        this.gameScore += 100;
        this.mazeLevel++;
        this.transitioningToNext = true;
        this.showingScore = true;

        // Despawn all ghosts immediately on level completion and stop any audio
        for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
            try { this.activeGhosts[i].destroy(); } catch (_) {}
        }
        this.activeGhosts.length = 0;

        this.triggerHook("onLevelComplete", this.mazeLevel, this.gameScore);

        // Calculate next level parameters
        this.currentMazeSize = Math.floor(
            this.baseMazeSize * Math.pow(1.15, this.mazeLevel - 1),
        );
        const levelBonus = Math.floor((this.mazeLevel - 1) / 4) * 5;
        this.currentShuffleTime = this.baseShuffleTime + levelBonus;

        // Trigger CRT burst
        if (typeof window.crtBurst === "function") {
            window.crtBurst(800);
        }

        // Start next level after delay
        setTimeout(() => {
            this.startNextLevel();
        }, 1500);
    }

    startNextLevel() {
        this.transitioningToNext = false;
        this.showingScore = false;
        this.pelletsSpawned = false;
        this.gameState = "cinematic";
        // Reset any scaling states
        this.winScale.active = false;
        this.spawnScale.active = false;

        // Reset the main shuffle timer duration for the new level
        this.Wait = this.currentShuffleTime;

        this.systems.camera.setMazeSize(this.currentMazeSize);
        this.systems.camera.startCinematic();
        this.generateNewMaze();

        // Reset player to center of green start tile for new level
        const { x, y } = this.getStartTopLeft();
        this.entities.player.reset(x, y);
        this.systems.physics.setPose(x, y);
    }

    gameOver() {
        this.gameState = "gameover";
        this.systems.ui.showGameOver(
            this.gameScore,
            this.mazeLevel - 1,
            this.currentMazeSize,
        );

        this.triggerHook("onGameOver", this.gameScore, this.mazeLevel);

        // CRT burst effect
        if (typeof window.crtBurst === "function") {
            window.crtBurst(2000);
        }

        this.triggerHook("onGameOver");
    }

    restartGame() {
        this.gameScore = 0;
        this.mazeLevel = 1;
        this.currentMazeSize = this.baseMazeSize;
        this.currentShuffleTime = this.baseShuffleTime;
        this.Wait = this.baseShuffleTime; // Also reset Wait timer duration
        this.transitioningToNext = false;
        this.showingScore = false;
        this.pelletsSpawned = false;
        this.gameState = "intro";
        this.winScale.active = false;
        this.spawnScale.active = false;

        this.systems.effects.reset();
        this.systems.pellets.reset();
        this.systems.ui.reset();
        this.generateNewMaze();
        const { x, y } = this.getStartTopLeft();
        this.entities.player.reset(x, y);
        this.systems.physics.setPose(x, y);

        // Recenter camera at maze center for intro
        this.systems.camera.positionAtMazeCenter(this.currentMazeSize);
    }

    generateNewMaze() {
        const maze = this.systems.maze.generate(
            this.currentMazeSize,
            this.currentMazeSize,
        );
        this.systems.physics.setMaze(maze);

        if (this.mazeLevel >= 2 && !this.pelletsSpawned) {
            this.systems.pellets.spawn(maze, this.mazeLevel);
            this.pelletsSpawned = true;
        }

        this.triggerHook("onMazeGenerated", maze, this.mazeLevel);
        return maze;
    }

    checkWinCondition() {
        const player = this.entities.player;
        const goalTileX = this.currentMazeSize - 2;
        const goalTileY = this.currentMazeSize - 2;
        const playerTileX = Math.floor(player.x / 25);
        const playerTileY = Math.floor(player.y / 25);

        return (
            playerTileX === goalTileX &&
            playerTileY === goalTileY &&
            !this.transitioningToNext
        );
    }

    checkShuffleTimer() {
        if (this.shuffleTimeRemaining <= 0 && !this.transitioningToNext) {
            // Check if the next shuffle would end the game
            if (this.Wait - this.SHUFFLE_TIME_DECREASE < 0) {
                this.gameOver();
            } else {
                this.shuffleMaze();
            }
        }
    }

    shuffleMaze() {
        this.Wait -= this.SHUFFLE_TIME_DECREASE;
        this.shuffleTimeRemaining = this.Wait;

        // Despawn all ghosts on reshuffle to prevent carry-over
        for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
            const g = this.activeGhosts[i];
            try { g.destroy(); } catch (_) {}
            this.activeGhosts.splice(i, 1);
        }

        // Store the last path for the ghost and reset the player's current path
        if (this.entities.player && this.entities.player.path.length > 0) {
            this.playerPaths.push([...this.entities.player.path]);
            this.entities.player.path = [];
        }

        // Preserve player's current tile position
        const playerPhysics = this.systems.physics.getPose();
        const playerTileX = Math.floor(playerPhysics.x / 25);
        const playerTileY = Math.floor(playerPhysics.y / 25);

        // Generate the new maze
        const maze = this.generateNewMaze();

        // Trigger the hook, allowing horror effects to corrupt the maze
        this.triggerHook("onMazeReshuffle", maze);

        // AFTER corruption, ensure there's still a path from the player's spot to the goal
        this.systems.maze.ensurePathFrom(playerTileX, playerTileY);

        // The player's position is now guaranteed to be a valid path,
        // so we just need to reset the physics system to that position.
        this.systems.physics.setPose(playerPhysics.x, playerPhysics.y);
    }

    handleGhostCollision(ghost) {
        console.log(
            "[GameCore] Player collided with ghost! Applying new consequences.",
        );

        // 1. Subtract points and show toaster text
        this.gameScore = Math.max(0, this.gameScore - 100);
        const playerPos = this.entities.player.getCenter();
        this.systems.effects.addPopup(
            "-100",
            playerPos.x,
            playerPos.y,
            "score",
        );

        // 2. Shake the screen
        this.systems.camera.addCameraKick(2.5);

        // 2b. Heavy CRT glitch burst to sell the grab
        if (typeof window.crtHeavyGlitch === "function") {
            window.crtHeavyGlitch(2000);
        } else if (typeof window.crtBurst === "function") {
            // Fallback to lighter burst if heavy not available
            window.crtBurst(1500);
        }

        // 3. Play collision sound
        // this.systems.audio.sfxBuzz();

        // 4. Despawn collided ghost, and if it was a cosmic clone, despawn ALL clones
        const wasClone = !!ghost.isClone;

        if (wasClone) {
            for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
                const g = this.activeGhosts[i];
                if (g && g.isClone) {
                    try { g.destroy(); } catch (_) {}
                    this.activeGhosts.splice(i, 1);
                }
            }
        } else {
            // Just remove this single ghost
            try { ghost.destroy(); } catch (_) {}
            const index = this.activeGhosts.indexOf(ghost);
            if (index > -1) {
                this.activeGhosts.splice(index, 1);
            }
        }

        // 5. Teleport player back to the start of the level (centered in green)
        const { x, y } = this.getStartTopLeft();
        this.entities.player.reset(x, y);
        this.systems.physics.setPose(x, y);

        // 6. Spawn extra time pellets to give a comeback window (scale with maze size)
        try {
            // Fewer pellets: roughly a quarter of maze dimension, minimum 3
            const extraCount = Math.max(3, Math.round(this.currentMazeSize * 0.25));
            const spawned = this.systems.pellets?.spawnExtraTimePellets?.(extraCount) || 0;
            if (spawned > 0) {
                this.systems.effects.addPopup(
                    `+${spawned} time`,
                    playerPos.x,
                    playerPos.y - 20,
                    "score",
                );
            }
        } catch (_) {}
    }

    getUIData() {
        return {
            score: this.gameScore,
            level: this.mazeLevel,
            mazeSize: this.currentMazeSize,
            timeRemaining: Math.max(0, Math.ceil(this.shuffleTimeRemaining)),
            maxTime: this.Wait, // Use Wait as it represents the current round's duration
            showingScore: this.showingScore,
        };
    }

    // Compute the top-left position so the player is centered in the green start tile
    getStartTopLeft() {
        const tileSize = 25;
        const px = tileSize + Math.floor((tileSize - this.entities.player.width) / 2);
        const py = tileSize + Math.floor((tileSize - this.entities.player.height) / 2);
        return { x: px, y: py };
    }

    // Start the light win scale effect
    startWinScale() {
        if (this.winScale.active) return;
        this.winScale.active = true;
        this.winScale.startTime = performance.now();
        const c = this.entities.player.getCenter();
        this.winScale.pos = { x: c.x, y: c.y };
        this.gameState = "winning";
    }

    // Update the light win scale effect and finish level
    updateWinning(dt, currentTime) {
        if (!this.winScale.active) {
            // Safety: if we're in winning but not active, bounce back to playing
            this.gameState = "playing";
            return;
        }
        const elapsed = performance.now() - this.winScale.startTime;
        if (elapsed >= this.winScale.duration) {
            this.winScale.active = false;
            // Switch state first so we don't re-enter winning next frame
            this.gameState = "playing";
            this.completeLevel();
        }
    }

    start() {
        this.isRunning = true;
        this.update();
    }

    stop() {
        this.isRunning = false;
    }
}

// Make available globally
window.GameCore = GameCore;
