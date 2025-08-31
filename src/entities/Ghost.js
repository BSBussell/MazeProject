class Ghost {
    constructor(path, isClone = false, startPos = null) {
        this.path = path;
        this.isClone = isClone;
        this.pathIndex = 0;
        // Default clone delay in frames, scaled later by horror intensity
        const horror = window.game?.systems?.horror;
        const intensity = horror?.getIntensity ? horror.getIntensity() : 0;
        // Reduce delay as horror increases (180 -> 80 frames across intensity 0..1)
        this.cloneDelay = Math.max(60, Math.floor(180 - 100 * intensity));

        // Non-clone ghosts spawn on the recorded route, but not too close to the player/start
        let initialPos;
        if (this.isClone) {
            initialPos = startPos || window.game.entities.player || { x: 0, y: 0 };
        } else if (path && path.length > 0) {
            const player = window.game?.entities?.player;
            const px = player ? player.x : 0;
            const py = player ? player.y : 0;
            const minDist = 80; // px; avoid frame-trap near start/player
            let safeIndex = 0;
            for (let i = 0; i < path.length; i++) {
                const dx = path[i].x - px;
                const dy = path[i].y - py;
                if (Math.hypot(dx, dy) >= minDist) { safeIndex = i; break; }
                // If nothing passes threshold, fall through to last point
                if (i === path.length - 1) safeIndex = i;
            }
            initialPos = path[safeIndex];
            this.pathIndex = safeIndex; // begin replay from this point
        } else {
            initialPos = startPos || { x: 0, y: 0 };
        }
        this.x = initialPos.x;
        this.y = initialPos.y;

        this.width = 15;
        this.height = 15;
        this.active = true;
        // Baseline movement speed; clones get dynamic speed boosts in update()
        this.moveSpeed = 1; // pixels per frame
        // Non-clone ghosts move ominously slow along their recorded path
        this.nonCloneSpeed = 0.6; // pixels per frame (very slow)

        // Spawn/flicker presentation for clones
        this.spawnAge = 0; // seconds alive
        this.flickerDuration = 1.2; // seconds
        this.flickerFreq = 18; // Hz
        this.spawnJitter = 1.5; // px max positional jitter during flicker

        // Ambient sound properties for fading (base ghost ambience)
        // Updated to a new base SFX
        this.ambientSound = new Audio("assets/buzz.opus");
        this.ambientSound.loop = true;
        this.ambientSound.volume = 0; // Start silent
        this.targetVolume = 0;
        this.maxVolume = 0.15; // Quieter ghost sound
        this.fadeSpeed = 2.0; // Volume change per second

        // Track on-camera visibility edge for one-time/cooldown SFX
        this._wasVisible = false;

        // Start playing the sound immediately, but it's silent.
        this.ambientSound
            .play()
            .catch((e) =>
                console.error("Ghost sound could not be started:", e),
            );

        // One-shot layered spawn stingers for cosmic clones
        if (this.isClone) {
            try {
                this._spawnAudios = this._spawnAudios || [];
                const hit = new Audio("assets/synthHit.mp3");
                hit.volume = 0.35;
                hit.currentTime = 0;
                this._spawnAudios.push(hit);
                hit.play().catch(() => {});

                const stinger = new Audio("assets/scary.mp3");
                stinger.volume = 0.15;
                stinger.currentTime = 0;
                this._spawnAudios.push(stinger);
                stinger.play().catch(() => {});
            } catch (_) {}
        }
    }

    update(dt, player, camera) {
        if (!this.active) {
            this.destroy();
            return false;
        }

        this.spawnAge += dt;

        if (this.isClone) {
            const playerPath = player ? player.path : [];
            if (playerPath.length > this.cloneDelay) {
                const targetIndex = playerPath.length - this.cloneDelay;
                const targetPos = playerPath[targetIndex];

                const dx = targetPos.x - this.x;
                const dy = targetPos.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Scale with player's current max speed so clones remain threatening
                const physics = window.game?.systems?.physics;
                const playerMax = physics?.getConfig ? physics.getConfig().MAX_SPEED : 300; // px/s
                const horror = window.game?.systems?.horror;
                const intensity = horror?.getIntensity ? horror.getIntensity() : 0; // 0..1

                // Base factor slightly above player, rising with horror
                const baseFactor = 1.05 + 0.25 * intensity; // 1.05..1.30x

                // Proximity boost when within ~170px
                let prox = 0;
                if (player) {
                    const pdx = player.x - this.x;
                    const pdy = player.y - this.y;
                    const pd = Math.sqrt(pdx * pdx + pdy * pdy);
                    prox = Math.max(0, Math.min(1, 1 - pd / 170));
                }
                const proxFactor = 0.25 * prox; // up to +0.25x near

                // Compute per-second speed and clamp relative to player's current max
                const capFactor = 1.35; // never exceed 135% of player
                let speedPerSec = playerMax * (baseFactor + proxFactor);
                speedPerSec = Math.min(speedPerSec, playerMax * capFactor);

                // Convert to per-frame step using dt
                const step = speedPerSec * dt;

                if (distance > step) {
                    this.x += (dx / distance) * step;
                    this.y += (dy / distance) * step;
                } else {
                    this.x = targetPos.x;
                    this.y = targetPos.y;
                }
            }
            // If delay is not met, the clone simply doesn't move from its spawn position.
        } else {
            // Ominous, slow path-following for recorded ghosts
            if (!this.path || this.path.length <= 1) {
                this.active = false;
                this.destroy();
                return false;
            }
            if (this.pathIndex < this.path.length - 1) {
                const target = this.path[this.pathIndex + 1];
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.hypot(dx, dy);

                // Slightly scale with horror, but keep slow and ominous
                const horror = window.game?.systems?.horror;
                const intensity = horror?.getIntensity ? horror.getIntensity() : 0;
                let speed = this.nonCloneSpeed + 0.3 * intensity; // 0.6 .. 0.9 px/frame
                speed = Math.min(speed, 1.0);

                if (dist > speed) {
                    this.x += (dx / dist) * speed;
                    this.y += (dy / dist) * speed;
                } else {
                    // Snap to the next node and advance
                    this.x = target.x;
                    this.y = target.y;
                    this.pathIndex++;
                }
            } else {
                this.active = false;
                this.destroy();
                return false;
            }
        }

        // Manage ambient sound based on visibility
        if (camera) {
            this.manageAmbientSound(camera);
        }

        // Tween volume towards target
        if (this.ambientSound) {
            const currentVolume = this.ambientSound.volume;
            const targetVolume = this.targetVolume;
            if (currentVolume !== targetVolume) {
                const direction = Math.sign(targetVolume - currentVolume);
                let newVolume = currentVolume + direction * this.fadeSpeed * dt;
                // Clamp to ensure it doesn't overshoot
                if (direction > 0) {
                    newVolume = Math.min(newVolume, targetVolume);
                } else {
                    newVolume = Math.max(newVolume, targetVolume);
                }
                this.ambientSound.volume = newVolume;
            }
        }

        // Perform collision check with the player
        if (player) {
            const playerBounds = player.getCollisionBounds();
            const ghostBounds = this.getCollisionBounds();

            if (
                playerBounds.x < ghostBounds.x + ghostBounds.width &&
                playerBounds.x + playerBounds.width > ghostBounds.x &&
                playerBounds.y < ghostBounds.y + ghostBounds.height &&
                playerBounds.y + playerBounds.height > ghostBounds.y
            ) {
                this.active = false;
                this.destroy();
                return true; // Signal that a collision occurred
            }
        }

        return false; // No collision
    }

    manageAmbientSound(camera) {
        const bounds = this.getCollisionBounds();
        const isVisible =
            bounds.x < camera.viewport.right &&
            bounds.x + bounds.width > camera.viewport.left &&
            bounds.y < camera.viewport.bottom &&
            bounds.y + bounds.height > camera.viewport.top;

        // On first appearance in view (rising edge), optionally play a stinger with cooldown
        if (isVisible && !this._wasVisible) {
            try {
                const now = Date.now();
                const cooldownMs = 25000; // 25 seconds global cooldown
                const lastTime = window._lastMustBeTheWindTime || 0;
                if (!lastTime || now - lastTime > cooldownMs) {
                    // Use existing asset as placeholder for "mustBeTheWind" SFX
                const sfx = (window._mustBeTheWindAudio =
                        window._mustBeTheWindAudio || new Audio("assets/mustBeTheWind.mp3"));
                    sfx.volume = 0.2;
                    // Restart from beginning and play
                    try { sfx.pause(); } catch (_) {}
                    sfx.currentTime = 0;
                    sfx.play().catch(() => {});
                    window._lastMustBeTheWindTime = now;
                }
            } catch (_) {}
        }

        // Set the target volume based on visibility and proximity
        if (isVisible) {
            // Louder as it nears the player (but capped by maxVolume)
            const game = window.game;
            const player = game?.entities?.player;
            if (player) {
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                const px = player.x + player.width / 2;
                const py = player.y + player.height / 2;
                const d = Math.hypot(px - cx, py - cy);
                const prox = Math.max(0, Math.min(1, 1 - d / 200));
                this.targetVolume = Math.min(this.maxVolume, 0.05 + prox * this.maxVolume);
            } else {
                this.targetVolume = this.maxVolume;
            }
        } else {
            this.targetVolume = 0;
        }

        // Remember visibility for next frame (to detect rising edge)
        this._wasVisible = isVisible;
    }

    destroy() {
        if (this.ambientSound) {
            this.ambientSound.pause();
            this.ambientSound.src = ""; // Release resource
            this.ambientSound = null;
        }
        if (this._spawnAudios && this._spawnAudios.length) {
            try {
                for (const a of this._spawnAudios) {
                    try { a.pause(); } catch (_) {}
                    try { a.src = ""; } catch (_) {}
                }
            } catch (_) {}
            this._spawnAudios.length = 0;
        }
        this.active = false;
    }

    render(ctx) {
        if (!this.active) {
            return;
        }

        ctx.save();
        let jitterX = 0;
        let jitterY = 0;
        let baseAlpha = 0.5;

        // Render clones with flicker/glitch during initial spawn
        if (this.isClone) {
            if (this.spawnAge < this.flickerDuration) {
                const t = this.spawnAge;
                const phase = Math.sin(2 * Math.PI * this.flickerFreq * t);
                const ramp = Math.min(1, t / this.flickerDuration);
                // Lower alpha at first, rising over time with rapid flicker
                baseAlpha = 0.25 + 0.55 * ramp * (0.5 + 0.5 * phase);
                // Occasional hard cuts
                if (Math.random() < 0.08) baseAlpha *= 0.2;
                jitterX = (Math.random() * 2 - 1) * this.spawnJitter;
                jitterY = (Math.random() * 2 - 1) * this.spawnJitter;
            } else {
                baseAlpha = 0.5;
            }
            // Purple-y body
            ctx.fillStyle = `rgba(150, 0, 255, ${baseAlpha.toFixed(3)})`;
            ctx.fillRect(this.x + jitterX, this.y + jitterY, this.width, this.height);

            // Add a subtle chromatic aura for extra creep
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(255, 0, 60, ${(baseAlpha * 0.25).toFixed(3)})`;
            ctx.fillRect(this.x - 1 + jitterX, this.y, this.width, this.height);
            ctx.fillStyle = `rgba(60, 0, 255, ${(baseAlpha * 0.25).toFixed(3)})`;
            ctx.fillRect(this.x + 1 + jitterX, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = `rgba(0, 0, 255, ${baseAlpha.toFixed(3)})`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();
    }

    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
}

// Make available globally
if (typeof window !== "undefined") {
    window.Ghost = Ghost;
}
