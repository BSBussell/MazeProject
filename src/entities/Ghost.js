class Ghost {
    constructor(path) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0] ? path[0].x : 0;
        this.y = path[0] ? path[0].y : 0;
        this.width = 15;
        this.height = 15;
        this.active = true;
    }

    update(dt) {
        if (!this.active || !this.path || this.path.length === 0) {
            return;
        }

        // Move to the next position in the path
        if (this.pathIndex < this.path.length - 1) {
            this.pathIndex++;
        } else {
            // Deactivate when path is complete
            this.active = false;
        }

        const nextPos = this.path[this.pathIndex];
        this.x = nextPos.x;
        this.y = nextPos.y;
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
