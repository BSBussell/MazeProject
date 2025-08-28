/**
 * CameraSystem - Handles camera movement, following, and cinematic sequences
 */
class CameraSystem {
    constructor(context, settings = {}) {
        this.distance = 1000.0;
        this.lookat = [0, 0];
        this.context = context;
        this.fieldOfView = settings.fieldOfView || Math.PI / 4.0;
        this.viewport = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0,
            scale: [1.0, 1.0]
        };
        
        // Spring camera follow system
        this.camX = 25 + 7.5;
        this.camY = 25 + 7.5;
        this.camVX = 0;
        this.camVY = 0;
        this.camZeta = 0.85; // damping ratio
        this.camOmega = 12.0; // natural frequency
        this.CAM_FOLLOW_OFFSET = {x: 7.5, y: 7.5};
        
        // Camera effects
        this.camKick = 0; // Screen shake effect
        
        // Countdown zoom tracking
        this.lastCountdownSecond = -1; // Track last countdown second to trigger sounds
        
        // Cinematic state
        this.cinematicActive = false;
        this.cinematicTime = 0;
        this.cinematicTotalDuration = 3.0;

        // Cinematic easing & zoom defaults (configurable)
        this.cinematicEaseA = { p1x: 0.25, p1y: 0.35, p2x: 0.75, p2y: 0.65 }; // goal → center
        this.cinematicEaseB = { p1x: 0.25, p1y: 0.35, p2x: 0.75, p2y: 0.65 }; // center → start
        this.cinematicZoomIn = 1000;   // zoomed in (near)
        this.cinematicZoomOut = 1800;  // zoomed out (far)
        
        this.shuffleCount = 0;
        this.lastShuffleTime = 0;
        
        this.updateViewport();
    }
    
    begin() {
        this.context.save();
        this.applyScale();
        this.applyTranslation();
    }
    
    end() {
        this.context.restore();
    }
    
    applyScale() {
        this.context.scale(this.viewport.scale[0], this.viewport.scale[1]);
    }
    
    applyTranslation() {
        this.context.translate(-this.viewport.left, -this.viewport.top);
    }
    
    updateViewport() {
        this.aspectRatio = this.context.canvas.width / this.context.canvas.height;
        this.viewport.width = this.distance * Math.tan(this.fieldOfView);
        this.viewport.height = this.viewport.width / this.aspectRatio;
        this.viewport.left = this.lookat[0] - (this.viewport.width / 2.0);
        this.viewport.top = this.lookat[1] - (this.viewport.height / 2.0);
        this.viewport.right = this.viewport.left + this.viewport.width;
        this.viewport.bottom = this.viewport.top + this.viewport.height;
        this.viewport.scale[0] = this.context.canvas.width / this.viewport.width;
        this.viewport.scale[1] = this.context.canvas.height / this.viewport.height;
    }
    
    zoomTo(z) {
        this.distance = z;
        this.updateViewport();
    }
    
    moveTo(x, y) {
        this.lookat[0] = x;
        this.lookat[1] = y;
        this.updateViewport();
    }
    
    followPlayer(player, dt) {
        const targetX = player.x + this.CAM_FOLLOW_OFFSET.x;
        const targetY = player.y + this.CAM_FOLLOW_OFFSET.y;
        
        // Spring physics for smooth following
        const dx = targetX - this.camX;
        const dy = targetY - this.camY;
        const ax = this.camOmega * this.camOmega * dx - 2 * this.camZeta * this.camOmega * this.camVX;
        const ay = this.camOmega * this.camOmega * dy - 2 * this.camZeta * this.camOmega * this.camVY;
        
        this.camVX += ax * dt;
        this.camVY += ay * dt;
        this.camX += this.camVX * dt;
        this.camY += this.camVY * dt;
        
        this.moveTo(this.camX, this.camY);
        
        // Update zoom with camera kick effects
        this.updateCameraZoom();
    }
    
    updateCameraZoom() {
        let baseZoom = 1000;
        
        // Decay camera kick
        if (this.camKick > 0) {
            this.camKick = Math.max(0, this.camKick - 6 * 0.016); // Approximate 60fps
        }
        
        // Apply countdown zoom effect
        const countdownZoom = this.getCountdownZoom();
        
        // Apply kick as zoom effect
        const kickScale = 1 + 0.04 * this.camKick;
        const finalZoom = baseZoom * kickScale * countdownZoom;
        this.zoomTo(finalZoom);
    }
    
    getCountdownZoom() {
        // Get time remaining from game
        if (!window.game || !window.game.systems.ui) return 1.0;
        
        // Get the canonical countdown value from the UI system for perfect sync.
        const timeRemaining = Math.ceil(window.game.systems.ui.countdownValue);

        // Apply zoom out effect for last 3 seconds and play sound
        if (timeRemaining <= 3 && timeRemaining > 0) {
            // Play lighter hit sound when countdown second changes
            if (timeRemaining !== this.lastCountdownSecond && window.game.systems.audio) {
                window.game.systems.audio.sfxLighterHit();
                this.lastCountdownSecond = timeRemaining;
            }
            
            switch (timeRemaining) {
                case 3: return 0.9;
                case 2: return 0.8;
                case 1: return 0.7;
                default: return 1.0;
            }
        } else {
            // Reset tracking when not in countdown
            this.lastCountdownSecond = -1;
        }
        
        return 1.0; // Normal zoom
    }
    
    addCameraKick(intensity = 1) {
        this.camKick = Math.min(1, this.camKick + intensity * 0.35);
    }
    
    startCinematic() {
        this.cinematicActive = true;
        this.cinematicTime = 0;
        this.shuffleCount = 0;
        this.lastShuffleTime = 0;
    }
    
    // Position camera at maze center for title screen
    positionAtMazeCenter(mazeSize) {
        const centerX = (mazeSize / 2) * 25;
        const centerY = (mazeSize / 2) * 25;
        this.camX = centerX;
        this.camY = centerY;
        this.moveTo(centerX, centerY);
        this.zoomTo(1200); // Slightly zoomed out for title
    }
    
    /**
     * Cubic Bezier easing helper (CSS-like, endpoints (0,0)→(1,1)).
     * Uses the Y component only as an easing curve.
     * @param {number} p1x
     * @param {number} p1y
     * @param {number} p2x
     * @param {number} p2y
     * @param {number} t  - progress [0,1]
     * @returns {number} eased progress in [0,1]
     */
    bezierEaseY(p1x, p1y, p2x, p2y, t) {
        const u = 1 - t;
        // Bezier Y for (0,0), (p1x,p1y), (p2x,p2y), (1,1)
        return (
            3 * u * u * t * p1y +
            3 * u * t * t * p2y +
            t * t * t
        );
    }

    /** Set the easing curves for the two cinematic segments. */
    setCinematicEasing(easeA, easeB) {
        // Each ease is an object {p1x, p1y, p2x, p2y}
        if (easeA) this.cinematicEaseA = { ...this.cinematicEaseA, ...easeA };
        if (easeB) this.cinematicEaseB = { ...this.cinematicEaseB, ...easeB };
    }

    /** Set zoom levels for near (in) and far (out). */
    setCinematicZooms(zoomIn, zoomOut) {
        if (typeof zoomIn === 'number') this.cinematicZoomIn = zoomIn;
        if (typeof zoomOut === 'number') this.cinematicZoomOut = zoomOut;
    }

    updateCinematic(dt, currentTime) {
        if (!this.cinematicActive) return false;

        this.cinematicTime += dt;

        // Fade in canvas as cinematic starts
        const fadeProgress = Math.min(this.cinematicTime / 1.0, 1.0);
        if (typeof document !== 'undefined') {
            const canvas = document.getElementById('canvas');
            if (canvas) canvas.style.opacity = fadeProgress;
        }

        // Overall progress [0,1]
        const raw = Math.min(this.cinematicTime / this.cinematicTotalDuration, 1.0);

        // --- Keyframes ---
        const mazeSize = this.currentMazeSize || 25;
        const goal = { x: (mazeSize - 2) * 25 + 12.5, y: (mazeSize - 2) * 25 + 12.5 };
        const center = { x: (mazeSize / 2) * 25, y: (mazeSize / 2) * 25 };
        const start = { x: 25 + 7.5, y: 25 + 7.5 };

        // Segment A: goal → center (zoom to far)
        // Segment B: center → start (zoom back to near)
        let segT, ease, from, to, zoomFrom, zoomTo;
        if (raw <= 0.5) {
            segT = raw * 2; // [0,1]
            ease = this.cinematicEaseA;
            from = goal; to = center;
            zoomFrom = this.cinematicZoomIn;  // start near
            zoomTo   = this.cinematicZoomOut; // go far
        } else {
            segT = (raw - 0.5) * 2; // [0,1]
            ease = this.cinematicEaseB;
            from = center; to = start;
            zoomFrom = this.cinematicZoomOut; // start far
            zoomTo   = this.cinematicZoomIn;  // go near
        }

        // Eased progress for the current segment
        const eased = this.bezierEaseY(ease.p1x, ease.p1y, ease.p2x, ease.p2y, Math.max(0, Math.min(1, segT)));

        // LERP position and zoom on the segment
        const camX = from.x + (to.x - from.x) * eased;
        const camY = from.y + (to.y - from.y) * eased;
        const zoom = zoomFrom + (zoomTo - zoomFrom) * eased;

        this.moveTo(camX, camY);
        this.zoomTo(zoom);

        if (raw >= 1.0) {
            this.cinematicActive = false;
            this.camX = camX;
            this.camY = camY;
            this.camVX = 0;
            this.camVY = 0;
            return true;
        }

        return false;
    }
    
    screenToWorld(x, y, obj = {}) {
        obj.x = (x / this.viewport.scale[0]) + this.viewport.left;
        obj.y = (y / this.viewport.scale[1]) + this.viewport.top;
        return obj;
    }
    
    worldToScreen(x, y, obj = {}) {
        obj.x = (x - this.viewport.left) * (this.viewport.scale[0]);
        obj.y = (y - this.viewport.top) * (this.viewport.scale[1]);
        return obj;
    }
    
    // Inject current maze size for cinematic
    setMazeSize(size) {
        this.currentMazeSize = size;
    }
}

// Make available globally
window.CameraSystem = CameraSystem;
