/**
 * EffectsSystem - Handles visual effects like popups, particles, and screen effects
 */
class EffectsSystem {
    constructor() {
        this.popups = [];
        this.particles = [];
        this.screenEffects = [];
        
        // Animation states
        this.shuffleScaleActive = false;
        this.shuffleScaleStartTime = 0;
        this.shuffleScaleDuration = 300;
        this.shuffleScaleIntensity = 1.05;
        
        this.pelletZoomActive = false;
        this.pelletZoomStartTime = 0;
        this.pelletZoomDuration = 200;
        this.pelletZoomIntensity = 1.08;
    }
    
    // Popup system
    addPopup(text, x, y, kind = "score") {
        this.popups.push({
            text,
            kind,
            x,
            y,
            vx: (Math.random() - 0.5) * 20,
            vy: -35 - Math.random() * 25,
            age: 0,
            life: 0.8
        });
        
        // Limit popups to prevent performance issues
        if (this.popups.length > 40) {
            this.popups.splice(0, this.popups.length - 40);
        }
    }
    
    // Particle system
    addParticles(x, y, color = "#39ff14", count = 10) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 120;
            this.particles.push({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                age: 0,
                life: 0.5 + Math.random() * 0.4,
                color,
                sz: 2 + Math.random() * 2
            });
        }
        
        // Limit particles to prevent performance issues
        if (this.particles.length > 200) {
            this.particles.splice(0, this.particles.length - 200);
        }
    }
    
    // Screen effect triggers
    triggerShuffleScale() {
        this.shuffleScaleActive = true;
        this.shuffleScaleStartTime = performance.now();
    }
    
    triggerPelletZoom() {
        this.pelletZoomActive = true;
        this.pelletZoomStartTime = performance.now();
    }
    
    update(dt, currentTime) {
        // Update popups
        for (const popup of this.popups) {
            popup.age += dt;
            popup.x += popup.vx * dt;
            popup.y += popup.vy * dt;
        }
        this.popups = this.popups.filter(p => p.age < p.life);
        
        // Update particles
        for (const particle of this.particles) {
            particle.age += dt;
            // Apply drag
            particle.vx *= (1 - 5 * dt);
            particle.vy *= (1 - 5 * dt);
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
        }
        this.particles = this.particles.filter(p => p.age < p.life);
        
        // Update screen effects
        this.updateShuffleScale();
        this.updatePelletZoom();
    }
    
    updateShuffleScale() {
        if (!this.shuffleScaleActive) return;
        
        const elapsed = performance.now() - this.shuffleScaleStartTime;
        const progress = Math.min(elapsed / this.shuffleScaleDuration, 1.0);
        
        if (progress >= 1.0) {
            this.shuffleScaleActive = false;
        }
    }
    
    updatePelletZoom() {
        if (!this.pelletZoomActive) return;
        
        const elapsed = performance.now() - this.pelletZoomStartTime;
        const progress = Math.min(elapsed / this.pelletZoomDuration, 1.0);
        
        if (progress >= 1.0) {
            this.pelletZoomActive = false;
        }
    }
    
    render(ctx, currentTime) {
        // Render popups
        this.renderPopups(ctx, currentTime);
        
        // Render particles
        this.renderParticles(ctx);
    }
    
    renderPopups(ctx, currentTime) {
        for (const popup of this.popups) {
            const t = popup.age / popup.life;
            const alpha = 1 - this.easeOutQuad(t);
            const hue = (currentTime * 8 + popup.x + popup.y) % 360;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = "bold " + (popup.kind === "combo" ? "36px" : "32px") + " 'Nova Square', monospace"; // Increased from 20px/18px to 36px/32px
            ctx.fillStyle = this.hueColor(hue, 90, 60, 1);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.textAlign = "center";
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        }
    }
    
    renderParticles(ctx) {
        for (const particle of this.particles) {
            const t = particle.age / particle.life;
            const alpha = 1 - t;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.fillRect(
                particle.x - particle.sz * 0.5, 
                particle.y - particle.sz * 0.5, 
                particle.sz, 
                particle.sz
            );
            ctx.restore();
        }
    }
    
    // Get current screen effects scale
    getWorldScale() {
        let scale = 1.0;
        
        // Apply shuffle scale
        if (this.shuffleScaleActive) {
            const elapsed = performance.now() - this.shuffleScaleStartTime;
            const progress = Math.min(elapsed / this.shuffleScaleDuration, 1.0);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            scale *= 1.0 + (this.shuffleScaleIntensity - 1.0) * (1 - easeOut);
        }
        
        // Apply pellet zoom
        if (this.pelletZoomActive) {
            const elapsed = performance.now() - this.pelletZoomStartTime;
            const progress = Math.min(elapsed / this.pelletZoomDuration, 1.0);
            
            let zoomProgress;
            if (progress < 0.5) {
                zoomProgress = progress * 2;
            } else {
                zoomProgress = (1.0 - progress) * 2;
            }
            const zoomAmount = (this.pelletZoomIntensity - 1.0) * zoomProgress;
            scale *= 1.0 + zoomAmount;
        }
        
        return scale;
    }
    
    // Apply world scale transform for screen effects
    applyWorldScale(ctx, mazeSize) {
        const scale = this.getWorldScale();
        if (scale !== 1.0) {
            const worldCenterX = (mazeSize / 2) * 25;
            const worldCenterY = (mazeSize / 2) * 25;
            
            ctx.save();
            ctx.translate(worldCenterX, worldCenterY);
            ctx.scale(scale, scale);
            ctx.translate(-worldCenterX, -worldCenterY);
            return true; // Indicates transform was applied
        }
        return false;
    }
    
    restoreWorldScale(ctx, wasApplied) {
        if (wasApplied) {
            ctx.restore();
        }
    }
    
    reset() {
        this.popups = [];
        this.particles = [];
        this.screenEffects = [];
        this.shuffleScaleActive = false;
        this.pelletZoomActive = false;
    }
    
    // Utility functions
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }
    
    hueColor(h, s = 100, l = 60, a = 1) {
        return `hsla(${h % 360},${s}%,${l}%,${a})`;
    }
}

// Make available globally
window.EffectsSystem = EffectsSystem;
