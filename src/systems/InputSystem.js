/**
 * InputSystem - Handles keyboard, mouse, and joystick input
 */
class InputSystem {
    constructor() {
        this.keys = [];
        this.joystick = null;
        this.clicked = false;
        this.inputVector = { x: 0, y: 0 }; // Reused object for performance
        
        this.setupEventListeners();
        this.initializeJoystick();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.body.addEventListener("keydown", (e) => {
            this.keys[e.keyCode] = true;
            this.handleSpecialKeys(e);
        });
        
        document.body.addEventListener("keyup", (e) => {
            this.keys[e.keyCode] = false;
        });
        
        // Mouse/touch events
        document.body.addEventListener("click", () => {
            this.clicked = true;
        });
        
        document.body.addEventListener("touchstart", () => {
            this.clicked = true;
        });
        
        // Prevent scrolling on mobile
        this.disableScroll();
    }
    
    initializeJoystick() {
        // Calculate responsive joystick size
        const minDimension = Math.min(window.innerWidth, window.innerHeight);
        const stickRadius = Math.max(15, Math.min(25, minDimension * 0.015));
        
        this.joystick = new VirtualJoystick({
            mouseSupport: false,
            limitStickTravel: true,
            stickRadius: stickRadius,
            strokeStyle: "#4444cc"
        });
        
        // Force override sizing
        setTimeout(() => this.resizeJoystickElements(), 100);
    }
    
    resizeJoystickElements() {
        if (!this.joystick) return;
        
        const size = Math.max(15, Math.min(25, Math.min(window.innerWidth, window.innerHeight) * 0.015));
        const baseSize = size * 3;
        const stickSize = size * 2;
        
        if (this.joystick._baseEl) {
            this.joystick._baseEl.style.width = baseSize + 'px';
            this.joystick._baseEl.style.height = baseSize + 'px';
            this.joystick._baseEl.style.transform = 'scale(2.0)';
        }
        if (this.joystick._stickEl) {
            this.joystick._stickEl.style.width = stickSize + 'px';
            this.joystick._stickEl.style.height = stickSize + 'px';
            this.joystick._stickEl.style.transform = 'scale(2.0)';
        }
    }
    
    handleSpecialKeys(e) {
        // Debug controls
        if (e.keyCode === 112) { // F1
            window.showDebug = !window.showDebug;
            e.preventDefault();
        }
        
        // CRT Filter toggle with F2
        if (e.keyCode === 113) { // F2
            if (typeof window.toggleCRT === 'function') {
                window.toggleCRT();
            }
            e.preventDefault();
        }
        
        // Instant game over with Delete key
        if (e.keyCode === 46) { // Delete key
            if (window.game) {
                window.game.Wait = -1;
            }
            e.preventDefault();
        }
        
        // Debug physics controls (if debug mode is on)
        if (window.showDebug && window.game && window.game.systems.physics) {
            this.handleDebugControls(e);
        }
    }
    
    handleDebugControls(e) {
        const physics = window.game.systems.physics;
        const currentConfig = physics.getConfig();
        let newConfig = {};
        let changed = false;
        
        if (e.keyCode === 191) { // "/" - increase STEER
            newConfig.STEER = Math.min(currentConfig.STEER + 0.5, 20);
            changed = true;
        }
        if (e.keyCode === 186) { // ";" - decrease STEER  
            newConfig.STEER = Math.max(currentConfig.STEER - 0.5, 0.5);
            changed = true;
        }
        if (e.keyCode === 222) { // "'" - increase DRAG
            newConfig.DRAG = Math.min(currentConfig.DRAG + 0.5, 15);
            changed = true;
        }
        if (e.keyCode === 59) { // semicolon - decrease DRAG
            newConfig.DRAG = Math.max(currentConfig.DRAG - 0.5, 0.5);
            changed = true;
        }
        if (e.keyCode === 189) { // "-" - decrease MAX_SPEED
            newConfig.MAX_SPEED = Math.max(currentConfig.MAX_SPEED - 10, 50);
            changed = true;
        }
        if (e.keyCode === 187) { // "=" - increase MAX_SPEED  
            newConfig.MAX_SPEED = Math.min(currentConfig.MAX_SPEED + 10, 400);
            changed = true;
        }
        
        if (changed) {
            physics.configure(newConfig);
            console.log('Physics config:', physics.getConfig());
            e.preventDefault();
        }
    }
    
    getGameInput() {
        // Keyboard input - Arrow keys + WASD
        let ix = (this.keys[39] || this.keys[68] ? 1 : 0) - (this.keys[37] || this.keys[65] ? 1 : 0); // Right/D - Left/A
        let iy = (this.keys[40] || this.keys[83] ? 1 : 0) - (this.keys[38] || this.keys[87] ? 1 : 0); // Down/S - Up/W
        
        // Add joystick input
        if (this.joystick) {
            ix += this.clamp(this.joystick.deltaX() / (this.joystick._stickRadius || 50), -1, 1);
            iy += this.clamp(this.joystick.deltaY() / (this.joystick._stickRadius || 50), -1, 1);
        }
        
        // Apply deadzone
        const mag = Math.hypot(ix, iy);
        if (mag < 0.15) {
            this.inputVector.x = 0;
            this.inputVector.y = 0;
        } else if (mag > 1) {
            this.inputVector.x = ix / mag;
            this.inputVector.y = iy / mag;
        } else {
            this.inputVector.x = ix;
            this.inputVector.y = iy;
        }
        
        return this.inputVector;
    }
    
    isClicked() {
        const wasClicked = this.clicked;
        this.clicked = false; // Reset after checking
        return wasClicked;
    }
    
    clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }
    
    disableScroll() {
        const keys = { 37: 1, 38: 1, 39: 1, 40: 1, 65: 1, 87: 1, 83: 1, 68: 1 }; // Arrow keys + WASD
        
        function preventDefault(e) {
            e = e || window.event;
            if (e.preventDefault) e.preventDefault();
            e.returnValue = false;
        }
        
        function preventDefaultForScrollKeys(e) {
            if (keys[e.keyCode]) {
                preventDefault(e);
                return false;
            }
        }
        
        if (window.addEventListener) {
            window.addEventListener('DOMMouseScroll', preventDefault, { passive: false });
        }
        window.onwheel = preventDefault;
        window.onmousewheel = document.onmousewheel = preventDefault;
        window.ontouchmove = preventDefault;
        document.onkeydown = preventDefaultForScrollKeys;
    }
    
    // Cleanup
    destroy() {
        if (this.joystick) {
            this.joystick.destroy();
        }
    }
}

// Make available globally
window.InputSystem = InputSystem;
