class Ghost {
    constructor(path) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0] ? path[0].x : 0;
        this.y = path[0] ? path[0].y : 0;
        this.width = 15;
        this.height = 15;
        this.active = true;

        // Ambient sound properties
        this.ambientSound = new Audio('assets/sweeee.mp3');
        this.ambientSound.loop = true;
        this.ambientSound.volume = 0.25;
        this.soundIsPlaying = false;
    }

    update(dt, player, camera) {
        if (!this.active || !this.path || this.path.length === 0) {
            this.destroy(); // Clean up sound if deactivated externally
            return false;
        }

        // Move to the next position in the path
        if (this.pathIndex < this.path.length - 1) {
            this.pathIndex++;
        } else {
            // Deactivate when path is complete
            this.active = false;
            this.destroy();
            return false;
        }

        const nextPos = this.path[this.pathIndex];
        this.x = nextPos.x;
        this.y = nextPos.y;

        // Manage ambient sound based on visibility
        if (camera) {
            this.manageAmbientSound(camera);
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

        if (isVisible && !this.soundIsPlaying) {
            this.ambientSound.play().catch(e => console.error("Ghost sound play error:", e));
            this.soundIsPlaying = true;
        } else if (!isVisible && this.soundIsPlaying) {
            this.ambientSound.pause();
            this.soundIsPlaying = false;
        }
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
