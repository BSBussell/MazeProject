/**
 * Utility functions used throughout the game
 */
class GameUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    static easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }
    
    static easeInQuad(t) {
        return t * t;
    }
    
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static hueColor(h, s = 100, l = 60, a = 1) {
        return `hsla(${h % 360},${s}%,${l}%,${a})`;
    }
    
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    static angleTo(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    static resizeCanvas(canvas) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Maintain aspect ratio for game content
        const targetAspectRatio = 16 / 10;
        const screenAspectRatio = screenWidth / screenHeight;
        
        let gameWidth, gameHeight;
        
        if (screenAspectRatio > targetAspectRatio) {
            gameHeight = screenHeight;
            gameWidth = gameHeight * targetAspectRatio;
        } else {
            gameWidth = screenWidth;
            gameHeight = gameWidth / targetAspectRatio;
        }
        
        // Set canvas to full screen
        canvas.width = screenWidth;
        canvas.height = screenHeight;
        
        // Store game rendering dimensions
        const baseGameWidth = 1000;
        const baseGameHeight = 600;
        
        const scaleX = gameWidth / baseGameWidth;
        const scaleY = gameHeight / baseGameHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Store rendering info globally
        window.gameArea = {
            width: baseGameWidth * scale,
            height: baseGameHeight * scale,
            offsetX: (screenWidth - baseGameWidth * scale) / 2,
            offsetY: (screenHeight - baseGameHeight * scale) / 2,
            scale: scale
        };
        
        return window.gameArea;
    }
    
    static clearCircle(context, x, y, radius) {
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, true);
        context.clip();
        context.clearRect(x - radius, y - radius, radius * 2, radius * 2);
        context.restore();
    }
    
    static debugLog(message, data = null) {
        if (window.showDebug) {
            if (data) {
                console.log(message, data);
            } else {
                console.log(message);
            }
        }
    }
    
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    static localStorage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('localStorage not available:', e);
                return false;
            }
        }
    };
}

// Make available globally
window.GameUtils = GameUtils;
