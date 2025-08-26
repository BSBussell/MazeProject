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
    }
    
    startFadeIn() {
        this.fadeInActive = true;
        this.fadeInStartTime = performance.now();
    }
    
    update(dt, currentTime) {
        // Handle canvas fade-in
        if (this.fadeInActive) {
            const elapsed = currentTime - this.fadeInStartTime;
            const fadeProgress = Math.min(elapsed / 2000, 1.0); // 2 second fade
            
            if (typeof document !== 'undefined') {
                const canvas = document.getElementById('canvas');
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
        const gameArea = window.gameArea || { offsetX: 0, offsetY: 0, scale: 1 };
        
        // Don't apply transform for intro - it's handled in world space
        if (gameState === 'intro') {
            return; // Intro is rendered separately in world space
        }
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
        ctx.translate(gameArea.offsetX, gameArea.offsetY);
        ctx.scale(gameArea.scale, gameArea.scale);
        
        switch (gameState) {
            case 'countdown':
                this.renderCountdown(ctx, currentTime);
                break;
            case 'playing':
                this.renderGameplay(ctx, uiData, currentTime);
                break;
            case 'gameover':
                this.renderGameOver(ctx, currentTime);
                break;
            case 'cinematic':
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
        this.renderAnimatedText(ctx, titleText, centerX, centerY, this.textAnimStartTime, currentTime, 60, "aesthetic");
        
        // Add flickering subtitle "From Bee's Archives" in blood red
        const subtitleDelay = 1000; // Start subtitle after 1 second
        if (currentTime - this.textAnimStartTime > subtitleDelay) {
            const flickerTime = (currentTime - this.textAnimStartTime - subtitleDelay) / 100;
            const flickerIntensity = Math.random() * 0.4 + 0.6; // Random flicker between 0.7 and 1.0
            const bloodRed = `rgba(255, 0, 0, ${flickerIntensity})`;
            
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
            const pulseTime = (currentTime - this.textAnimStartTime - titleDelay) / 1000;
            const pulseScale = 1 + Math.sin(pulseTime * 3) * 0.15;
            
            ctx.save();
            ctx.translate(centerX, centerY + 220);
            ctx.scale(pulseScale, pulseScale);
            ctx.translate(-centerX, -(centerY + 120));
            
            this.renderAnimatedText(ctx, "Click to Start", centerX, centerY + 120, this.textAnimStartTime + titleDelay, currentTime, 32, "rgb");
            
            ctx.restore();
        }
    }
    
    renderCountdown(ctx, currentTime) {
        ctx.font = "60px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF0000";
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
        this.renderScoreDisplay(ctx, uiData.score, uiData.mazeSize, 20, 35, currentTime);
        
        // Timer in top right
        if (uiData.timeRemaining !== undefined) {
            const timerX = 1000 - 50;
            const timerY = 50;
            this.renderJuicyTimer(ctx, uiData.timeRemaining, uiData.maxTime, timerX, timerY);
        }
        
        // Combo counter (if active)
        if (window.game && window.game.systems.pellets) {
            const comboInfo = window.game.systems.pellets.getComboInfo();
            if (comboInfo.active) {
                const comboX = 1000 - 170;
                const comboY = 50;
                
                ctx.fillStyle = "#FFD700";
                ctx.font = "24px 'Nova Square', monospace";
                ctx.textAlign = "center";
                ctx.fillText(`Combo x${comboInfo.count}`, comboX, comboY);
            }
        }
        
        // Show score celebration when completing a maze
        if (uiData.showingScore) {
            this.renderScoreCelebration(ctx, uiData.score, uiData.level, currentTime);
        }
    }
    
    renderCinematic(ctx, uiData, currentTime) {
        // Show level info during cinematic
        if (uiData.level > 1) {
            const titleText = `Level: ${uiData.mazeSize}x${uiData.mazeSize}`;
            const centerX = 500;
            const centerY = 300;
            
            this.renderAnimatedText(ctx, titleText, centerX, centerY, this.textAnimStartTime, currentTime, 60, "aesthetic");
        }
    }
    
    renderGameOver(ctx, currentTime) {
        if (!this.showingGameOver) return;
        
        const centerX = 500;
        const startY = 200;
        
        // Game Over Title
        ctx.font = "60px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF0000";
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillText("Game Over", centerX, startY);
        ctx.shadowBlur = 0;
        
        // High Scores List
        for (let i = 0; i < this.highScores.length; i++) {
            const score = this.highScores[i];
            const y = startY + 60 + (i * 40);
            const isNewScore = i === this.newHighScoreIndex;
            
            if (isNewScore) {
                ctx.fillStyle = "#00FFFF";
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#FF0000";
                ctx.shadowBlur = 0;
            }
            
            ctx.font = isNewScore ? "32px 'Nova Square', monospace" : "28px 'Nova Square', monospace";
            ctx.fillText(`${i + 1}. ${score.score} Level(${score.mazeSize}x${score.mazeSize})`, centerX, y);
        }
        
        ctx.shadowBlur = 0;
        
        // Instructions
        ctx.font = "24px 'Nova Square', monospace";
        ctx.fillStyle = "#00FF00";
        ctx.fillText("Click to Play Again", centerX, startY + 280);
    }
    
    renderScoreDisplay(ctx, score, mazeSize, x, y, currentTime) {
        const highScores = this.getHighScores();
        const highScore = highScores.length > 0 ? highScores[0].score : 0;
        
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
        
        // Score - bright neon pink
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.font = "26px 'Nova Square', monospace";
        ctx.fillStyle = "#FF0080";
        ctx.fillText(`Score: ${score}`, x, y);
        
        // High Score - RGB cycling
        const rgbTime = (currentTime / 1000) * 2;
        const r = Math.floor((Math.sin(rgbTime) + 1) * 127.5);
        const g = Math.floor((Math.sin(rgbTime + 2) + 1) * 127.5);
        const b = Math.floor((Math.sin(rgbTime + 4) + 1) * 127.5);
        const rgbColor = `rgb(${r}, ${g}, ${b})`;
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.font = "22px 'Nova Square', monospace";
        ctx.fillStyle = rgbColor;
        ctx.fillText(`High Score: ${highScore}`, x, y + 35);
        
        // Level - bright neon cyan
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.font = "20px 'Nova Square', monospace";
        ctx.fillStyle = "#00FFFF";
        ctx.fillText(`Level: ${mazeSize}x${mazeSize}`, x, y + 65);
        
        ctx.shadowBlur = 0;
    }
    
    renderJuicyTimer(ctx, timeRemaining, maxTime, x, y) {
        const radius = 30;
        const progress = timeRemaining / maxTime;
        
        // Background circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Progress circle
        if (progress > 0) {
            ctx.beginPath();
            ctx.arc(x, y, radius - 3, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * progress));
            ctx.strokeStyle = progress > 0.3 ? "#00FF00" : progress > 0.1 ? "#FFFF00" : "#FF0000";
            ctx.lineWidth = 6;
            ctx.stroke();
        }
        
        // Timer text
        ctx.font = "24px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = progress > 0.3 ? "#00FF00" : progress > 0.1 ? "#FFFF00" : "#FF0000";
        ctx.fillText(String(timeRemaining), x, y + 8);
    }
    
    renderScoreCelebration(ctx, score, level, currentTime) {
        // This would render the score celebration animation
        const centerX = 500;
        const centerY = 300;
        
        ctx.save();
        ctx.font = "48px 'Nova Square', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#00FFFF";
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillText(`+100 Points!`, centerX, centerY - 50);
        ctx.shadowBlur = 0;
        
        ctx.font = "36px 'Nova Square', monospace";
        ctx.fillStyle = "#00FF00";
        ctx.fillText(`Score: ${score}`, centerX, centerY + 10);
        ctx.fillText(`Level ${level}`, centerX, centerY + 60);
        
        ctx.restore();
    }
    
    renderAnimatedText(ctx, text, x, y, startTime, currentTime, fontSize = 60, colorType = "aesthetic") {
        const animDuration = 2000;
        const charDelay = 80;
        const elapsed = currentTime - startTime;
        
        ctx.font = `${fontSize}px 'Nova Square', monospace`;
        ctx.textAlign = "center";
        
        let visibleChars = Math.floor((elapsed - 300) / charDelay);
        visibleChars = Math.max(0, visibleChars);
        
        for (let i = 0; i < text.length; i++) {
            if (i < visibleChars) {
                const charAge = elapsed - 300 - (i * charDelay);
                const alpha = Math.min(1, charAge / 200);
                
                // Glitch effect
                let offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1;
                if (charAge < 150) {
                    const glitchIntensity = 1 - (charAge / 150);
                    offsetX = (Math.random() - 0.5) * 6 * glitchIntensity;
                    offsetY = (Math.random() - 0.5) * 4 * glitchIntensity;
                    scaleX = 1 + (Math.random() - 0.5) * 0.3 * glitchIntensity;
                    scaleY = 1 + (Math.random() - 0.5) * 0.2 * glitchIntensity;
                }
                
                const charX = x + offsetX - (ctx.measureText(text).width / 2) + ctx.measureText(text.substring(0, i)).width + ctx.measureText(text[i]).width / 2;
                
                // Color selection
                let color;
                if (colorType === "aesthetic") {
                    const hue = (currentTime / 20 + i * 30) % 360;
                    const lightness = 60 + Math.sin(currentTime / 500 + i) * 10;
                    color = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
                } else if (colorType === "rgb") {
                    const speed = 150;
                    const r = Math.sin(currentTime / speed) * 127 + 128;
                    const g = Math.sin(currentTime / speed + 2) * 127 + 128;
                    const b = Math.sin(currentTime / speed + 4) * 127 + 128;
                    color = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`;
                } else {
                    color = `rgba(255, 255, 255, ${alpha})`;
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
                    ctx.fillStyle = `rgba(0, 255, 150, ${cursorAlpha})`;
                    ctx.fillRect(charX + ctx.measureText(text[i]).width / 2, y - fontSize + 10, 3, fontSize - 10);
                }
            }
        }
    }
    
    // Countdown system
    updateCountdown(dt) {
        this.countdownValue -= 0.020;
        return this.countdownValue < -2; // Return true when countdown is complete
    }
    
    // High score management
    getHighScores() {
        const scores = localStorage.getItem('shuffleRunnerHighScores');
        return scores ? JSON.parse(scores) : [];
    }
    
    saveHighScore(score, level, mazeSize) {
        const highScores = this.getHighScores();
        const newScore = {
            score: score,
            level: level,
            mazeSize: mazeSize,
            date: new Date().toLocaleDateString()
        };
        
        highScores.push(newScore);
        highScores.sort((a, b) => b.score - a.score);
        highScores.splice(5); // Keep only top 5
        
        localStorage.setItem('shuffleRunnerHighScores', JSON.stringify(highScores));
        return highScores;
    }
    
    showGameOver(score, level, mazeSize) {
        this.highScores = this.saveHighScore(score, level, mazeSize);
        this.newHighScoreIndex = this.highScores.findIndex(s => 
            s.score === score && s.level === level && s.mazeSize === mazeSize
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
        if (typeof document !== 'undefined') {
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.style.opacity = "0";
            }
        }
    }
}

// Make available globally
window.UISystem = UISystem;
