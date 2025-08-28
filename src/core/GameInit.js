/**
 * Game initialization and main entry point
 */
class GameInit {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.game = null;
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        // Get canvas and context
        this.canvas = document.getElementById("canvas");
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }
        
        this.ctx = this.canvas.getContext("2d");
        if (!this.ctx) {
            console.error("Could not get 2D context!");
            return;
        }
        
        // Setup canvas and responsive design
        this.setupCanvas();
        
        // Initialize the game core
        this.game = new GameCore(this.canvas, this.ctx);
        
        // Make game globally accessible for debugging and hooks
        window.game = this.game;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Configure physics for mobile if needed
        if (GameUtils.isMobile()) {
            this.game.systems.physics.configure({ MAX_SPEED: 240 });
            this.game.systems.camera.zoomTo(1000);
        }
        
        // Setup some example hooks for easy modification
        this.setupExampleHooks();
        
        this.initialized = true;
        
        // Initialize debug overlay
        this.debugOverlay = {
            visible: false,
            messages: [],
            lastUpdate: 0
        };
        
        // Audio initialization tracking
        this.audioStartAttempted = false;
        
        // Start the game
        this.game.start();
        
        // Start fade-in effect
        setTimeout(() => {
            this.game.systems.ui.startFadeIn();
        }, 500); // Small delay before fade starts
        
        console.log("Game initialized successfully!");
        console.log("Available hooks:", Object.keys(this.game.hooks));
        console.log("Available systems:", Object.keys(this.game.systems));
    }
    
    tryStartAudio() {
        // Attempt to start audio after user interaction
        if (!this.audioStartAttempted && this.game && this.game.systems.audio) {
            this.audioStartAttempted = true;
            
            // If game is in playing state, try to start background music
            if (this.game.gameState === 'playing' || this.game.gameState === 'countdown') {
                try {
                    this.game.systems.audio.startBackgroundMusic();
                    console.log('[Audio] Background music started after user interaction');
                } catch (error) {
                    console.log('[Audio] Failed to start background music:', error);
                }
            }
            
            // Also ensure audio context is resumed if needed
            if (this.game.systems.audio.audioContext && this.game.systems.audio.audioContext.state === 'suspended') {
                this.game.systems.audio.audioContext.resume().then(() => {
                    console.log('[Audio] Audio context resumed');
                }).catch(error => {
                    console.log('[Audio] Failed to resume audio context:', error);
                });
            }
        }
    }
    
    setupCanvas() {
        // Initial canvas setup
        GameUtils.resizeCanvas(this.canvas);
        
        // Set initial opacity for fade-in effect
        this.canvas.style.opacity = "0";
        this.canvas.style.transition = "opacity 0.5s ease-in";
        
        // Resize listeners
        window.addEventListener('resize', () => {
            GameUtils.resizeCanvas(this.canvas);
            if (this.game && this.game.systems.camera) {
                this.game.systems.camera.updateViewport();
            }
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                GameUtils.resizeCanvas(this.canvas);
                if (this.game && this.game.systems.camera) {
                    this.game.systems.camera.updateViewport();
                }
            }, 100);
        });
    }
    
    setupEventListeners() {
        // Mouse/touch events for game interaction
        const handleClick = (e) => {
            e.preventDefault();
            if (this.game) {
                // Let the input system handle it
                this.game.systems.input.clicked = true;
                
                // Try to start audio after user interaction
                this.tryStartAudio();
            }
        };
        
        document.body.addEventListener("click", handleClick, { passive: false });
        document.body.addEventListener("touchstart", handleClick, { passive: false });
        
        // Debug key toggle
        document.addEventListener('keydown', (e) => {
            // Check for tilde-based debug commands
            if (e.key === '`') {
                e.preventDefault();
                // Check if a number follows (we'll handle this in a more robust way)
                this.handleTildeCommand(e);
            }
            
            // Legacy F3 support
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleDebugPanel();
            }
            
            // Dev command to simulate horror progression
            if (e.key === 'h' || e.key === 'H') {
                if (this.game && this.game.systems.horror) {
                    this.game.systems.horror.onMapReshuffle();
                    console.log('[DEV] Horror increased (+0.04):', this.game.systems.horror.getDebugInfo());
                }
            }
            
            // Force audio start
            if (e.key === 'z' || e.key === 'Z') {
                if (this.game && this.game.systems.audio) {
                    this.game.systems.audio.forceStartAudio();
                    this.showDebugMessage('Audio force started');
                    console.log('[DEV] Audio force started');
                }
            }
        }, { passive: false });
        
        // Handle tilde + number combinations
        let tildePressed = false;
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                tildePressed = true;
                setTimeout(() => { tildePressed = false; }, 1000); // Reset after 1 second
            } else if (tildePressed && (/^[0-9]$/.test(e.key) || e.key === '-')) {
                e.preventDefault();
                if (e.key === '-') {
                    this.handleTildeMinus();
                } else {
                    this.handleTildeNumber(parseInt(e.key));
                }
                tildePressed = false;
            }
        }, { passive: false });
    }
    
    setupExampleHooks() {
        // Example hooks that demonstrate how to extend the game
        
        // Log when pellets are collected, now with pellet info
        this.game.addHook('onPelletCollected', (player, pellet) => {
            GameUtils.debugLog(`Pellet collected: ${pellet.type} at`, player.getCenter());
        });
        
        // Hook to retry audio on game state changes
        this.game.addHook('beforeUpdate', (dt, currentTime) => {
            // Try to start audio if we haven't succeeded yet and game is playing
            if (!this.audioStartAttempted && 
                (this.game.gameState === 'playing' || this.game.gameState === 'countdown')) {
                this.tryStartAudio();
            }
        });
        
        // Log level completion with horror progression
        this.game.addHook('onLevelComplete', (level, score) => {
            const horrorInfo = this.game.systems.horror.getDebugInfo();
            console.log(`Level ${level} completed with score: ${score}`);
            console.log(`Horror progression: ${horrorInfo.horrorLevel} horror level, ${horrorInfo.eventsSinceRelief} events since relief`);
        });
        
        // Log game over
        this.game.addHook('onGameOver', (score, level) => {
            console.log(`Game over! Final score: ${score}, Level reached: ${level}`);
        });
        
        // Example of modifying maze generation
        this.game.addHook('onMazeGenerated', (maze, level) => {
            GameUtils.debugLog(`New maze generated for level ${level}, size: ${maze.length}x${maze[0].length}`);
            
            // Example: Add custom modifications to the maze here
            // if (level > 5) {
            //     // Add special tiles or modifications for higher levels
            // }
        });
        
        // Example of custom update logic
        this.game.addHook('beforeUpdate', (dt, currentTime) => {
            // Custom logic that runs every frame before main update
            // Example: Check for special conditions, update custom entities, etc.
        });
        
        // Example of custom rendering
        this.game.addHook('afterRender', (currentTime) => {
            // Custom rendering that happens after main game render
            // Render debug overlay
            if (this.debugOverlay) {
                this.renderDebugOverlay(this.ctx);
            }
        });
    }
    
    handleTildeCommand(e) {
        // Handle single tilde press - no longer forces silent round
        console.log('[DEV] Tilde pressed (use ~- to force silent round, ~0 for help)');
    }
    
    handleTildeMinus() {
        // Force silent round
        if (this.game && this.game.systems && this.game.systems.horror && typeof this.game.systems.horror.requestSilentRound === 'function') {
            this.game.systems.horror.requestSilentRound();
            console.log('[DEV] Forced Silent Round via HorrorSystem.requestSilentRound()');
        } else {
            window.GameFlags = window.GameFlags || {};
            window.GameFlags.forceSilentRound = true;
            console.log('[DEV] Forced Silent Round (legacy flag)');
        }
        this.showDebugMessage('Silent Round Forced');
    }
    
    handleTildeNumber(number) {
        console.log(`[DEV] Tilde + ${number} pressed`);
        
        switch(number) {
            case 1:
                // Toggle performance overlay
                this.showDebugMessage('Performance overlay (not implemented)');
                break;
                
            case 2:
                // Toggle CRT filter
                if (typeof window.toggleCRT === 'function') {
                    window.toggleCRT();
                    this.showDebugMessage('CRT filter toggled');
                } else {
                    this.showDebugMessage('CRT filter not available');
                }
                break;
                
            case 3:
                // Toggle debug panel
                this.debugOverlay.visible = !this.debugOverlay.visible;
                this.showDebugMessage(`Debug overlay ${this.debugOverlay.visible ? 'ON' : 'OFF'}`);
                console.log('Debug overlay:', this.debugOverlay.visible ? 'ON' : 'OFF');
                break;
                
            case 4:
                // Increase horror level
                if (this.game && this.game.systems.horror) {
                    this.game.systems.horror.onMapReshuffle();
                    const horror = this.game.systems.horror.getDebugInfo();
                    this.showDebugMessage(`Horror +0.04 (${horror.horrorLevel})`);
                    console.log('[DEV] Horror increased (+0.04):', horror);
                }
                break;
                
            case 5:
                // Instant game over
                if (this.game) {
                    this.game.gameOver();
                    this.showDebugMessage('Game Over triggered');
                }
                break;
                
            case 6:
                // Complete current level
                if (this.game && this.game.gameState === 'playing') {
                    this.game.completeLevel();
                    this.showDebugMessage('Level completed');
                }
                break;
                
            case 7:
                // Reset horror system
                if (this.game && this.game.systems.horror) {
                    this.game.systems.horror.resetHorrorState();
                    this.showDebugMessage('Horror system reset');
                }
                break;
                
            case 8:
                // Show current game state
                if (this.game) {
                    this.showDebugMessage(`State: ${this.game.gameState} L${this.game.mazeLevel}`);
                    console.log('[DEV] Game State:', {
                        state: this.game.gameState,
                        level: this.game.mazeLevel,
                        score: this.game.gameScore,
                        horror: this.game.systems.horror.getDebugInfo()
                    });
                }
                break;
                
            case 9:
                // Toggle audio
                if (this.game && this.game.systems.audio) {
                    this.game.systems.audio.toggleAudio();
                    this.showDebugMessage('Audio toggled');
                }
                break;
                
            case 0:
                // Help - show all commands
                this.showTildeHelp();
                this.showDebugMessage('Commands listed in console');
                break;
                
            default:
                this.showDebugMessage(`Unknown command: ~${number}`);
        }
    }    showTildeHelp() {
        console.log('=== TILDE DEBUG COMMANDS ===');
        console.log('~-          : Force Silent Round');
        console.log('~1          : Toggle performance overlay');
        console.log('~2          : Toggle CRT filter');
        console.log('~3          : Toggle debug overlay');
        console.log('~4          : Increase horror level (+0.04)');
        console.log('~5          : Instant game over');
        console.log('~6          : Complete current level');
        console.log('~7          : Reset horror system');
        console.log('~8          : Show current game state');
        console.log('~9          : Toggle audio');
        console.log('~-          : Force Silent Round');
        console.log('~0          : Show this help');
        console.log('H           : Increase horror (legacy)');
        console.log('Arrow keys  : Move player');
        console.log('============================');
    }
    
    showDebugMessage(message) {
        // Add temporary message to debug overlay
        this.debugOverlay.messages.push({
            text: message,
            timestamp: performance.now(),
            duration: 3000 // 3 seconds
        });
        
        // Limit to 5 messages
        if (this.debugOverlay.messages.length > 5) {
            this.debugOverlay.messages.shift();
        }
    }
    
    updateDebugOverlay() {
        const now = performance.now();
        
        // Remove expired messages
        this.debugOverlay.messages = this.debugOverlay.messages.filter(msg => 
            now - msg.timestamp < msg.duration
        );
        
        this.debugOverlay.lastUpdate = now;
    }
    
    renderDebugOverlay(ctx) {
        if (!this.debugOverlay.visible && this.debugOverlay.messages.length === 0) return;
        
        const canvas = ctx.canvas;
        const now = performance.now();
        
        // Update overlay
        this.updateDebugOverlay();
        
        // Save context
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any transforms
        
        let yOffset = 20;
        
        // Show debug panel if visible
        if (this.debugOverlay.visible && this.game) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, 10, 300, 200);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px monospace';
            
            yOffset = 30;
            ctx.fillText('=== DEBUG INFO ===', 20, yOffset);
            yOffset += 20;
            
            ctx.fillText(`State: ${this.game.gameState}`, 20, yOffset);
            yOffset += 15;
            ctx.fillText(`Level: ${this.game.mazeLevel}`, 20, yOffset);
            yOffset += 15;
            ctx.fillText(`Score: ${this.game.gameScore}`, 20, yOffset);
            yOffset += 15;
            
            if (this.game.systems.horror) {
                const horror = this.game.systems.horror.getDebugInfo();
                ctx.fillText(`Horror: ${horror.horrorLevel}`, 20, yOffset);
                yOffset += 15;
                ctx.fillText(`Intensity: ${horror.totalIntensity}`, 20, yOffset);
                yOffset += 15;
                ctx.fillText(`Events: ${horror.totalMapEvents}`, 20, yOffset);
                yOffset += 15;
                ctx.fillText(`Since Relief: ${horror.eventsSinceRelief}`, 20, yOffset);
                yOffset += 15;
            }
            
            ctx.fillText('Press ~0 for commands', 20, yOffset + 10);
        }
        
        // Show temporary messages
        if (this.debugOverlay.messages.length > 0) {
            let msgY = canvas.height - 100;
            
            this.debugOverlay.messages.forEach((msg, index) => {
                const age = now - msg.timestamp;
                const alpha = Math.max(0, 1 - (age / msg.duration));
                
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                ctx.font = '14px monospace';
                ctx.fillText(`[DEV] ${msg.text}`, 20, msgY + (index * 20));
            });
        }
        
        ctx.restore();
    }
    
    toggleDebugPanel() {
        // Toggle debug mode
        window.showDebug = !window.showDebug;
        console.log('Debug mode:', window.showDebug ? 'ON' : 'OFF');
        
        if (window.showDebug) {
            console.log('=== DEBUG PANEL ===');
            console.log('Use tilde commands (~0 for help)');
            console.log('Available systems:', Object.keys(this.game.systems));
            console.log('Game state:', this.game.gameState);
            console.log('Physics config:', this.game.systems.physics.getConfig());
            if (this.game.systems.horror) {
                console.log('Horror system:', this.game.systems.horror.getDebugInfo());
            }
            console.log('Type ~0 for full command list');
            console.log('==================');
        }
    }
    
    // Utility methods for external modification
    addCustomSystem(name, system) {
        if (this.game) {
            this.game.systems[name] = system;
            console.log(`Added custom system: ${name}`);
        }
    }
    
    addCustomEntity(name, entity) {
        if (this.game) {
            this.game.entities[name] = entity;
            console.log(`Added custom entity: ${name}`);
        }
    }
    
    getSystem(name) {
        return this.game ? this.game.systems[name] : null;
    }
    
    getEntity(name) {
        return this.game ? this.game.entities[name] : null;
    }
}

// Create and initialize the game when DOM is ready
let gameInit = null;

function initializeGame() {
    gameInit = new GameInit();
    gameInit.init().catch(error => {
        console.error("Failed to initialize game:", error);
    });
}

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Make gameInit globally accessible for debugging
window.gameInit = gameInit;
