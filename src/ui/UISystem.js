/**
 * UISystem - Handles all user interface rendering and state
 */
class UISystem {
    constructor() {
        this.countdownValue = 3.9;
        this.textAnimStartTime = 0;
        this.textAnimActive = false;
        this.introComplete = false;
        this.fadeInStartTime = 0;
        this.fadeInActive = false;

        // Game over state
        this.showingGameOver = false;
        this.highScores = [];
        this.newHighScoreIndex = -1;
        this.gameOverShuffleTimer = 0;

        // Simple tint system: red color override based on coverage thresholds
        this.tintColor = { r: 255, g: 0, b: 0 }; // always red
        this.tintCoverage = 0.0; // 0..1, controls which elements turn red

        // Element thresholds - when coverage exceeds threshold, element turns red
        this.elementThresholds = {
            aesthetic: 0.1, // rainbow/aesthetic elements get special treatment
            rgb: 0.1, // RGB cycling elements get special treatment
            subtitle: 0.25, // "FROM BEE'S ARCHIVES"
            combo: 0.3, // combo counter
            cursor: 0.35, // text cursor effect
            hud: 0.5, // score/high score/level
            celebration: 0.65, // +100 Points text
            timer: 0.7, // countdown timer
            gameover: 0.8, // game over screen elements
            everything: 0.9, // catch-all
        };
    }

    startFadeIn() {
        this.fadeInActive = true;
        this.fadeInStartTime = performance.now();
    }

    // === Color Bias API ===
    /**
     * Public API: set tint coverage (0..1).
     * Example: set_color('#ff0000', 0.4) — elements with threshold <= 0.4 turn red.
     */
    set_color(coverage = 0.0) {
        // Always use red regardless of hex input
        this.tintColor = { r: 255, g: 0, b: 0 };
        this.tintCoverage = Math.max(0, Math.min(1, Number(coverage) || 0));
    }

    /**
     * Alternative API - maps coverage to the new system.
     */
    set_color_bias(hex, strength = 0.5, coverage = 0.5) {
        // Use coverage as the main control
        const finalCoverage = Math.max(
            Number(strength) || 0,
            Number(coverage) || 0,
        );
        this.set_color(hex, finalCoverage);
    }

    // === Color helpers ===
    _parseHex(hex) {
        if (!hex) return null;
        const s = hex.toString().trim();
        const m = s.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
        if (!m) return null;
        let h = m[1];
        if (h.length === 3) {
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("");
        }
        const num = parseInt(h, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    _clamp01(v) {
        return Math.max(0, Math.min(1, v));
    }

    _rgbToString(rgb, a = 1) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
    }

    /**
     * Check if element should be tinted based on threshold
     */
    _shouldTint(elementType) {
        const threshold =
            this.elementThresholds[elementType] ||
            this.elementThresholds.everything;
        return this.tintCoverage >= threshold;
    }

    /**
     * Get color for element - either red or original color based on threshold
     */
    _getElementColor(originalColor, alpha = 1, elementType = "everything") {
        if (this._shouldTint(elementType)) {
            return this._rgbToString(this.tintColor, alpha);
        }
        return this._rgbToString(originalColor, alpha);
    }

    /**
     * Get color from hex for element
     */
    _getElementColorFromHex(hex, alpha = 1, elementType = "everything") {
        if (this._shouldTint(elementType)) {
            return this._rgbToString(this.tintColor, alpha);
        }
        const rgb = this._parseHex(hex) || { r: 255, g: 255, b: 255 };
        return this._rgbToString(rgb, alpha);
    }

    /**
     * Special RGB color that lingers on red based on coverage
     */
    _getRGBColor(currentTime, charIndex = 0, alpha = 1) {
        if (this.tintCoverage >= 1.0) {
            // Full coverage = always red
            return this._rgbToString(this.tintColor, alpha);
        }

        if (this.tintCoverage <= 0.1) {
            // Low coverage = normal RGB cycling
            const speed = 150;
            const r = Math.floor(Math.sin(currentTime / speed) * 127 + 128);
            const g = Math.floor(Math.sin(currentTime / speed + 2) * 127 + 128);
            const b = Math.floor(Math.sin(currentTime / speed + 4) * 127 + 128);
            return this._rgbToString({ r, g, b }, alpha);
        }

        // Partial coverage = linger on red
        const speed = 150;
        const baseTime = currentTime / speed;
        const redBias = this.tintCoverage; // 0.1 to 1.0

        // Create a time offset that makes red appear more often
        const redLingerTime = Math.sin(baseTime) * (1 - redBias) + redBias;

        if (redLingerTime > 0.7) {
            // Show red
            return this._rgbToString(this.tintColor, alpha);
        } else {
            // Show normal cycling colors but dimmed
            const r = Math.floor(Math.sin(baseTime) * 127 + 128);
            const g = Math.floor(Math.sin(baseTime + 2) * 127 + 128);
            const b = Math.floor(Math.sin(baseTime + 4) * 127 + 128);
            return this._rgbToString({ r, g, b }, alpha);
        }
    }

    /**
     * Special aesthetic color that shifts rainbow spectrum toward red based on coverage
     */
    _getAestheticColor(currentTime, charIndex = 0, alpha = 1) {
        if (this.tintCoverage >= 1.0) {
            // Full coverage = always red
            return this._rgbToString(this.tintColor, alpha);
        }

        if (this.tintCoverage <= 0.1) {
            // Low coverage = normal rainbow
            const rawHue = (currentTime / 20 + charIndex * 30) % 360;
            const lightness = 60 + Math.sin(currentTime / 500 + charIndex) * 10;
            const rgb = this._hslToRgb(rawHue, 0.8, lightness / 100);
            return this._rgbToString(rgb, alpha);
        }

        // Partial coverage = bias rainbow toward red spectrum
        const rawHue = (currentTime / 20 + charIndex * 30) % 360;
        const redHue = 0; // Red is at 0 degrees
        const coverage = this.tintCoverage;

        // Map the hue to be closer to red based on coverage
        // Higher coverage = more of the spectrum becomes red-ish
        const redRange = coverage * 180; // How much of 360° spectrum becomes red

        let finalHue;
        if (rawHue <= redRange || rawHue >= 360 - redRange) {
            // This part of spectrum becomes red
            finalHue = redHue;
        } else {
            // Keep original hue but shift it away from red zone
            const normalizedHue = (rawHue - redRange) / (360 - 2 * redRange);
            finalHue = normalizedHue * (360 - 2 * redRange) + redRange;
        }

        const lightness = 60 + Math.sin(currentTime / 500 + charIndex) * 10;
        const rgb = this._hslToRgb(finalHue, 0.8, lightness / 100);
        return this._rgbToString(rgb, alpha);
    }

    // HSL helpers for hue-biased animations
    _rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        let h,
            s,
            l = (max + min) / 2;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l };
    }

    _hueLerp(fromDeg, toDeg, t) {
        // Shortest angular interpolation 0..360
        let d = ((toDeg - fromDeg + 540) % 360) - 180;
        return (fromDeg + d * t + 360) % 360;
    }

    _hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(1, s));
        l = Math.max(0, Math.min(1, l));
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r1 = 0,
            g1 = 0,
            b1 = 0;
        if (h < 60) {
            r1 = c;
            g1 = x;
        } else if (h < 120) {
            r1 = x;
            g1 = c;
        } else if (h < 180) {
            g1 = c;
            b1 = x;
        } else if (h < 240) {
            g1 = x;
            b1 = c;
        } else if (h < 300) {
            r1 = x;
            b1 = c;
        } else {
            r1 = c;
            b1 = x;
        }
        return {
            r: Math.round((r1 + m) * 255),
            g: Math.round((g1 + m) * 255),
            b: Math.round((b1 + m) * 255),
        };
    }

    update(dt, currentTime) {
        // Handle canvas fade-in
        if (this.fadeInActive) {
            const elapsed = currentTime - this.fadeInStartTime;
            const fadeProgress = Math.min(elapsed / 2000, 1.0); // 2 second fade

            if (typeof document !== "undefined") {
                const canvas = document.getElementById("canvas");
                if (canvas) {
                    canvas.style.opacity = fadeProgress.toString();
                }
            }

            if (fadeProgress >= 1.0) {
                this.fadeInActive = false;
            }
        }
    }

    render(ctx, gameState, uiData, currentTime) {
        // Apply game area scaling for mobile
        const gameArea = window.gameArea || {
            offsetX: 0,
            offsetY: 0,
            scale: 1,
        };

        // Don't apply transform for intro - it's handled in world space
        if (gameState === "intro") {
            return; // Intro is rendered separately in world space
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
        ctx.translate(gameArea.offsetX, gameArea.offsetY);
        ctx.scale(gameArea.scale, gameArea.scale);

        switch (gameState) {
            case "countdown":
                this.renderCountdown(ctx, currentTime);
                break;
            case "playing":
                this.renderGameplay(ctx, uiData, currentTime);
                break;
            case "gameover":
                this.renderGameOver(ctx, currentTime);
                break;
            case "cinematic":
                this.renderCinematic(ctx, uiData, currentTime);
                break;
        }

        ctx.restore();
    }

    renderIntro(ctx, currentTime) {
        if (!this.textAnimActive) {
            this.textAnimActive = true;
            this.textAnimStartTime = currentTime;
        }

        const titleText = "ShuffleRunner";
        // Position title at maze center (world coordinates, not screen coordinates)
        const mazeSize = window.game ? window.game.currentMazeSize : 25;
        const centerX = (mazeSize / 2) * 25; // World X coordinate
        const centerY = (mazeSize / 3) * 25; // World Y coordinate

        // Animated title with aesthetic colors
        this.renderAnimatedText(
            ctx,
            titleText,
            centerX,
            centerY,
            this.textAnimStartTime,
            currentTime,
            60,
            "aesthetic",
        );

        // Add flickering subtitle "From Bee's Archives" in blood red
        const subtitleDelay = 1000; // Start subtitle after 1 second
        if (currentTime - this.textAnimStartTime > subtitleDelay) {
            const flickerTime =
                (currentTime - this.textAnimStartTime - subtitleDelay) / 100;
            const flickerIntensity = Math.random() * 0.4 + 0.6; // Random flicker between 0.7 and 1.0
            const bloodRed = this._getElementColor(
                { r: 255, g: 0, b: 0 },
                flickerIntensity,
                "subtitle",
            );

            ctx.save();
            ctx.font = "28px 'Nova Square', monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = bloodRed;
            ctx.fillText("- FROM BEE'S ARCHIVES -", centerX, centerY + 45);
            ctx.restore();
        }

        // Show "Click to Start" after title animation
        const titleDelay = 2000;
        if (currentTime - this.textAnimStartTime > titleDelay) {
            this.introComplete = true;

            // Add pulsing scale effect
            const pulseTime =
                (currentTime - this.textAnimStartTime - titleDelay) / 1000;
            const pulseScale = 1 + Math.sin(pulseTime * 3) * 0.15;

            ctx.save();
            ctx.translate(centerX, centerY + 220);
            ctx.scale(pulseScale, pulseScale);
            ctx.translate(-centerX, -(centerY + 120));

            this.renderAnimatedText(
                ctx,
                "Click to Start",
                centerX,
                centerY + 120,
                this.textAnimStartTime + titleDelay,
                currentTime,
                32,
                "rgb",
            );

            ctx.restore();
        }
    }

    renderCountdown(ctx, currentTime) {
        ctx.font = "60px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = this._getElementColorFromHex("#FF0000", 1, "timer");
        const centerX = 500;
        const centerY = 300;

        if (this.countdownValue >= 1) {
            ctx.fillText(Math.floor(this.countdownValue), centerX, centerY);
        } else if (this.countdownValue <= 0 && this.countdownValue > -2) {
            ctx.fillText("GO!", centerX, centerY);
        }
    }

    renderGameplay(ctx, uiData, currentTime) {
        // Score display in top left
        this.renderScoreDisplay(
            ctx,
            uiData.score,
            uiData.mazeSize,
            20,
            35,
            currentTime,
        );

        // Timer in top right
        if (uiData.timeRemaining !== undefined) {
            const timerX = 1000 - 50;
            const timerY = 50;
            this.renderJuicyTimer(
                ctx,
                uiData.timeRemaining,
                uiData.maxTime,
                timerX,
                timerY,
            );
        }

        // Combo counter (if active)
        if (window.game && window.game.systems.pellets) {
            const comboInfo = window.game.systems.pellets.getComboInfo();
            if (comboInfo.active) {
                const comboX = 1000 - 170;
                const comboY = 50;

                ctx.fillStyle = this._getElementColorFromHex(
                    "#FFD700",
                    1,
                    "combo",
                );
                ctx.font = "24px 'Nova Square', monospace";
                ctx.textAlign = "center";
                ctx.fillText(`Combo x${comboInfo.count}`, comboX, comboY);
            }
        }

        // Show score celebration when completing a maze
        if (uiData.showingScore) {
            this.renderScoreCelebration(
                ctx,
                uiData.score,
                uiData.level,
                currentTime,
            );
        }
    }

    renderCinematic(ctx, uiData, currentTime) {
        // Show level info during cinematic
        if (uiData.level > 1) {
            const titleText = `Level: ${uiData.mazeSize}x${uiData.mazeSize}`;
            const centerX = 500;
            const centerY = 300;

            this.renderAnimatedText(
                ctx,
                titleText,
                centerX,
                centerY,
                this.textAnimStartTime,
                currentTime,
                60,
                "aesthetic",
            );
        }
    }

    renderGameOver(ctx, currentTime) {
        if (!this.showingGameOver) return;

        const centerX = 500;
        const startY = 200;

        // Game Over Title
        ctx.font = "60px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = this._getElementColorFromHex("#FF0000", 1, "gameover");
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fillText("Game Over", centerX, startY);
        ctx.shadowBlur = 0;

        // High Scores List
        for (let i = 0; i < this.highScores.length; i++) {
            const score = this.highScores[i];
            const y = startY + 60 + i * 40;
            const isNewScore = i === this.newHighScoreIndex;

            if (isNewScore) {
                ctx.fillStyle = this._getElementColorFromHex(
                    "#00FFFF",
                    1,
                    "gameover",
                );
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = this._getElementColorFromHex(
                    "#FF0000",
                    1,
                    "gameover",
                );
                ctx.shadowBlur = 0;
            }

            ctx.font = isNewScore
                ? "32px 'Nova Square', monospace"
                : "28px 'Nova Square', monospace";
            ctx.fillText(
                `${i + 1}. ${score.score} Level(${score.mazeSize}x${score.mazeSize})`,
                centerX,
                y,
            );
        }

        ctx.shadowBlur = 0;

        // Instructions
        ctx.font = "24px 'Nova Square', monospace";
        ctx.fillStyle = this._getElementColorFromHex("#00FF00", 1, "gameover");
        ctx.fillText("Click to Play Again", centerX, startY + 280);
    }

    renderScoreDisplay(ctx, score, mazeSize, x, y, currentTime) {
        const highScores = this.getHighScores();
        const highScore = highScores.length > 0 ? highScores[0].score : 0;

        ctx.shadowBlur = 0;
        ctx.textAlign = "left";

        // Score - bright neon pink
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.font = "26px 'Nova Square', monospace";
        ctx.fillStyle = this._getElementColorFromHex("#FF0080", 1, "hud");
        ctx.fillText(`Score: ${score}`, x, y);

        // High Score - RGB cycling
        const rgbTime = (currentTime / 1000) * 2;
        const r = Math.floor((Math.sin(rgbTime) + 1) * 127.5);
        const g = Math.floor((Math.sin(rgbTime + 2) + 1) * 127.5);
        const b = Math.floor((Math.sin(rgbTime + 4) + 1) * 127.5);
        const rgbBase = { r, g, b };
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.font = "22px 'Nova Square', monospace";
        ctx.fillStyle = this._getElementColor(rgbBase, 1, "hud");
        ctx.fillText(`High Score: ${highScore}`, x, y + 35);

        // Level - bright neon cyan
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.font = "20px 'Nova Square', monospace";
        ctx.fillStyle = this._getElementColorFromHex("#00FFFF", 1, "hud");
        ctx.fillText(`Level: ${mazeSize}x${mazeSize}`, x, y + 65);

        ctx.shadowBlur = 0;
    }

    renderJuicyTimer(ctx, timeRemaining, maxTime, x, y) {
        const radius = 30;
        const progress = timeRemaining / maxTime;

        // Background circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = this._getElementColor(
            { r: 0, g: 0, b: 0 },
            0.3,
            "timer",
        );
        ctx.fill();
        ctx.strokeStyle = this._getElementColorFromHex("#333333", 1, "timer");
        ctx.lineWidth = 2;
        ctx.stroke();

        // Progress circle
        if (progress > 0) {
            ctx.beginPath();
            ctx.arc(
                x,
                y,
                radius - 3,
                -Math.PI / 2,
                -Math.PI / 2 + 2 * Math.PI * progress,
            );
            const baseStroke =
                progress > 0.3
                    ? "#00FF00"
                    : progress > 0.1
                      ? "#FFFF00"
                      : "#FF0000";
            ctx.strokeStyle = this._getElementColorFromHex(
                baseStroke,
                1,
                "timer",
            );
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        // Timer text
        ctx.font = "24px 'Nova Square', monospace";
        ctx.textAlign = "center";
        {
            const baseText =
                progress > 0.3
                    ? "#00FF00"
                    : progress > 0.1
                      ? "#FFFF00"
                      : "#FF0000";
            ctx.fillStyle = this._getElementColorFromHex(baseText, 1, "timer");
        }
        ctx.fillText(String(timeRemaining), x, y + 8);
    }

    renderScoreCelebration(ctx, score, level, currentTime) {
        // This would render the score celebration animation
        const centerX = 500;
        const centerY = 300;

        ctx.save();
        ctx.font = "48px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = this._getElementColorFromHex(
            "#FF0000",
            1,
            "celebration",
        );
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fillText(`+100 Points!`, centerX, centerY - 50);
        ctx.shadowBlur = 0;

        ctx.font = "36px 'Nova Square', monospace";
        ctx.fillStyle = this._getElementColorFromHex(
            "#00FF00",
            1,
            "celebration",
        );
        ctx.fillText(`Score: ${score}`, centerX, centerY + 10);
        ctx.fillText(`Level ${level}`, centerX, centerY + 60);

        ctx.restore();
    }

    renderAnimatedText(
        ctx,
        text,
        x,
        y,
        startTime,
        currentTime,
        fontSize = 60,
        colorType = "aesthetic",
    ) {
        const animDuration = 2000;
        const charDelay = 80;
        const elapsed = currentTime - startTime;

        ctx.font = `${fontSize}px 'Nova Square', monospace`;
        ctx.textAlign = "center";

        let visibleChars = Math.floor((elapsed - 300) / charDelay);
        visibleChars = Math.max(0, visibleChars);

        for (let i = 0; i < text.length; i++) {
            if (i < visibleChars) {
                const charAge = elapsed - 300 - i * charDelay;
                const alpha = Math.min(1, charAge / 200);

                // Glitch effect
                let offsetX = 0,
                    offsetY = 0,
                    scaleX = 1,
                    scaleY = 1;
                if (charAge < 150) {
                    const glitchIntensity = 1 - charAge / 150;
                    offsetX = (Math.random() - 0.5) * 6 * glitchIntensity;
                    offsetY = (Math.random() - 0.5) * 4 * glitchIntensity;
                    scaleX = 1 + (Math.random() - 0.5) * 0.3 * glitchIntensity;
                    scaleY = 1 + (Math.random() - 0.5) * 0.2 * glitchIntensity;
                }

                const charX =
                    x +
                    offsetX -
                    ctx.measureText(text).width / 2 +
                    ctx.measureText(text.substring(0, i)).width +
                    ctx.measureText(text[i]).width / 2;

                // Color selection
                let color;
                if (colorType === "aesthetic") {
                    color = this._getAestheticColor(currentTime, i, alpha);
                } else if (colorType === "rgb") {
                    color = this._getRGBColor(currentTime, i, alpha);
                } else {
                    color = this._getElementColor(
                        { r: 255, g: 255, b: 255 },
                        alpha,
                        "everything",
                    );
                }

                ctx.save();
                ctx.translate(charX, y + offsetY);
                ctx.scale(scaleX, scaleY);
                ctx.translate(-charX, -(y + offsetY));

                ctx.fillStyle = color;
                ctx.fillText(text[i], charX, y + offsetY);

                ctx.restore();

                // Cursor effect
                if (i === visibleChars - 1 && charAge < 600) {
                    const cursorAlpha = Math.sin(elapsed / 80) * 0.5 + 0.5;
                    ctx.fillStyle = this._getElementColor(
                        { r: 0, g: 255, b: 150 },
                        cursorAlpha,
                        "cursor",
                    );
                    ctx.fillRect(
                        charX + ctx.measureText(text[i]).width / 2,
                        y - fontSize + 10,
                        3,
                        fontSize - 10,
                    );
                }
            }
        }
    }

    // Countdown system
    updateCountdown(dt) {
        this.countdownValue -= dt; // Use delta time for frame-rate independence
        return this.countdownValue < -2; // Return true when countdown is complete
    }

    // High score management
    getHighScores() {
        const scores = localStorage.getItem("shuffleRunnerHighScores");
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScore(score, level, mazeSize) {
        const highScores = this.getHighScores();
        const newScore = {
            score: score,
            level: level,
            mazeSize: mazeSize,
            date: new Date().toLocaleDateString(),
        };

        highScores.push(newScore);
        highScores.sort((a, b) => b.score - a.score);
        highScores.splice(5); // Keep only top 5

        localStorage.setItem(
            "shuffleRunnerHighScores",
            JSON.stringify(highScores),
        );
        return highScores;
    }

    showGameOver(score, level, mazeSize) {
        this.highScores = this.saveHighScore(score, level, mazeSize);
        this.newHighScoreIndex = this.highScores.findIndex(
            (s) =>
                s.score === score &&
                s.level === level &&
                s.mazeSize === mazeSize,
        );
        this.showingGameOver = true;
        this.gameOverShuffleTimer = performance.now();
    }

    isIntroComplete() {
        return this.introComplete;
    }

    reset() {
        this.countdownValue = 3.9;
        this.textAnimStartTime = 0;
        this.textAnimActive = false;
        this.introComplete = false;
        this.showingGameOver = false;
        this.highScores = [];
        this.newHighScoreIndex = -1;
        this.fadeInActive = false;
        this.fadeInStartTime = 0;

        // Reset canvas opacity for restart
        if (typeof document !== "undefined") {
            const canvas = document.getElementById("canvas");
            if (canvas) {
                canvas.style.opacity = "0";
            }
        }
    }
}

// Make available globally
window.UISystem = UISystem;
