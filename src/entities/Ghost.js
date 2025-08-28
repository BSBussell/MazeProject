class Ghost {
    constructor(path, isClone = false) {
        this.path = path;
        this.isClone = isClone;
        this.pathIndex = 0;
        this.cloneDelay = 45; // 45 frames of delay

        const startPos = this.isClone ? (window.game.entities.player || {x: 0, y: 0}) : (path && path.length > 0 ? path[0] : {x: 0, y: 0});
        this.x = startPos.x;
        this.y = startPos.y;

        this.width = 15;
        this.height = 15;
        this.active = true;

        // Ambient sound properties for fading
        this.ambientSound = new Audio('assets/sweeee.mp3');
        this.ambientSound.loop = true;
        this.ambientSound.volume = 0; // Start silent
        this.targetVolume = 0;
        this.maxVolume = 0.25;
        this.fadeSpeed = 2.0; // Volume change per second

        // Start playing the sound immediately, but it's silent.
        this.ambientSound.play().catch(e => console.error("Ghost sound could not be started:", e));
    }

    update(dt, player, camera) {
        if (!this.active) {
            this.destroy();
            return false;
        }

        if (this.isClone) {
            const playerPath = player ? player.path : [];
            if (playerPath.length > this.cloneDelay) {
                const targetIndex = playerPath.length - this.cloneDelay;
                const nextPos = playerPath[targetIndex];
                this.x = nextPos.x;
                this.y = nextPos.y;
            } else {
                // Stay at player's start until delay is met
                if (playerPath.length > 0) {
                    this.x = playerPath[0].x;
                    this.y = playerPath[0].y;
                }
            }
        } else {
            // Original path-following logic
            if (!this.path || this.path.length === 0) {
                this.active = false;
                this.destroy();
                return false;
            }
            if (this.pathIndex < this.path.length - 1) {
                this.pathIndex++;
            } else {
                this.active = false;
                this.destroy();
                return false;
            }
            const nextPos = this.path[this.pathIndex];
            this.x = nextPos.x;
            this.y = nextPos.y;
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

        // Set the target volume based on visibility
        this.targetVolume = isVisible ? this.maxVolume : 0;
    }

    destroy() {
        if (this.ambientSound) {
            this.ambientSound.pause();
            this.ambientSound.src = ''; // Release resource
            this.ambientSound = null;
        }
        this.active = false;
    }

    render(ctx) {
        if (!this.active) {
            return;
        }

        ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; // Transparent blue
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
