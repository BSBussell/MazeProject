---
applyTo: '**'
---

# ShuffleRunner - Comprehensive Project Documentation

## Project Overview
ShuffleRunner is a fast-paced arcade maze game built with HTML5 Canvas and modular JavaScript architecture. Originally a 2600+ line monolithic file, it has been refactored into a clean, extensible system for easy modification and feature addition.

## Game Mechanics
- **Core Gameplay**: Navigate mazes to reach the goal before time runs out
- **Maze Shuffling**: Mazes regenerate every 15 seconds (decreasing by 3s each shuffle)
- **Progressive Difficulty**: Maze size increases ~15% per level (25x25 → 29x29 → 33x33...)
- **Collectibles**: Pellets spawn in levels 2+ that affect time/speed/points
- **Physics**: AABB collision detection with spring-damped movement
- **Visual Effects**: Trail particles, CRT filter, screen shake, and particle effects

## Project Structure

### Entry Points
- **`index-modular.html`**: Main modular entry point (recommended)
- **`index.html`**: Original monolithic version (legacy)

### Core Architecture (`src/core/`)
- **`GameCore.js`**: Central game controller with hook system for extensibility
  - Manages game states: intro, cinematic, countdown, playing, gameover
  - Orchestrates all systems and entities
  - Provides event hooks for custom logic injection
  - Handles level progression and scoring

- **`GameInit.js`**: Initialization and setup
  - Canvas configuration and responsive design
  - System initialization and global accessibility
  - Debug tools and event listener setup

### Systems (`src/systems/`)
- **`PhysicsSystem.js`**: AABB collision detection and player movement
  - Configurable physics constants (MAX_SPEED, STEER, DRAG)
  - Sweep collision detection for smooth wall interactions
  - State management for position and velocity

- **`MazeSystem.js`**: Maze generation and rendering
  - Stack-based recursive maze generation
  - Flood-fill connectivity verification
  - Wall rendering with proper scaling

- **`CameraSystem.js`**: Camera movement and cinematic sequences
  - Spring-damped camera following system
  - Viewport transformation and scaling
  - Cinematic sequences for level transitions
  - Screen shake effects

- **`InputSystem.js`**: Input handling for desktop and mobile
  - Keyboard WASD/Arrow key support
  - Virtual joystick integration for mobile
  - Touch and mouse event handling

- **`UISystem.js`**: Complete user interface management
  - Intro screen with animated title and "From Bee's Archives" subtitle
  - Countdown system, score display, timer
  - Game over screen with high score system
  - Fade-in effects and responsive scaling

- **`AudioSystem.js`**: Sound and music management
  - Audio loading and playback
  - Volume control and sound effects

- **`PelletSystem.js`**: Collectible pellet system
  - Three pellet types: time (+3s), speed boost, points (+10)
  - Collision detection with player
  - Visual rendering with type-specific colors

### Effects (`src/effects/`)
- **`EffectsSystem.js`**: Visual effects and screen transitions
  - Particle systems for various effects
  - Screen transition animations
  - Popup text system for scoring feedback

### Entities (`src/entities/`)
- **`Player.js`**: Player entity with movement and trail effects
  - Trail particle system for movement feedback
  - Collision bounds for pellet detection
  - Safe position finding when stuck in walls

### Utilities (`src/utils/`)
- **`GameUtils.js`**: Utility functions for common operations
  - Canvas resizing and mobile detection
  - Debug logging and helper functions

- **`VirtualJoystick.js`**: Mobile touch controls
  - Touch-based joystick for mobile devices
  - Configurable appearance and sensitivity

- **`Camera.js`**: Legacy camera compatibility layer

### Visual Effects
- **`CRTFilter.js`**: WebGL-based CRT monitor simulation
  - Barrel distortion, scanlines, chromatic aberration
  - Configurable intensity and effects
  - Auto-enable with dramatic burst effects

## Hook System for Extensibility

### Available Hooks
```javascript
// Game lifecycle hooks
window.game.addHook('onGameStart', callback);
window.game.addHook('onLevelComplete', (level, score) => {});
window.game.addHook('onGameOver', (score, level) => {});

// Gameplay hooks  
window.game.addHook('onPelletCollected', (player) => {});
window.game.addHook('onMazeGenerated', (maze, level) => {});

// Frame-level hooks
window.game.addHook('beforeUpdate', (dt, currentTime) => {});
window.game.addHook('afterUpdate', (dt, currentTime) => {});
window.game.addHook('beforeRender', (currentTime) => {});
window.game.addHook('afterRender', (currentTime) => {});
```

### System Access
```javascript
// Access any system for modification
window.game.systems.physics.configure({ MAX_SPEED: 500 });
window.game.systems.camera.addCameraKick(2.0);
window.game.systems.effects.addPopup('BONUS!', x, y);

// Add custom systems
window.gameInit.addCustomSystem('mySystem', new MySystem());
```

## Game States and Flow

1. **Intro**: Title screen at maze center, waiting for click
2. **Cinematic**: Camera pans from maze center to player start
3. **Countdown**: 3-2-1-GO countdown before gameplay
4. **Playing**: Main gameplay with maze shuffling timer
5. **Gameover**: High score screen, click to restart

## Physics Configuration
```javascript
const defaults = {
  MAX_SPEED: 300,    // Maximum player velocity
  STEER: 7.5,        // How quickly player accelerates to desired velocity
  DRAG: 9.0,         // Deceleration when no input
  TILE: 25,          // Tile size in pixels
  PW: 13, PH: 13     // Player dimensions
};
```

## Visual Style
- **Colors**: Blue player (#0000FF) with aesthetic title animations
- **Typography**: 'Nova Square' monospace font throughout
- **Effects**: CRT filter with configurable distortion and scanlines
- **UI**: Retro aesthetic with blood red "From Bee's Archives" subtitle
- **Responsive**: Full viewport scaling with mobile optimization

## Performance Features
- **Frame Rate**: Capped at ~60fps with delta time smoothing
- **Mobile Optimization**: Reduced physics speed and camera zoom for mobile
- **Efficient Rendering**: Systems only render when necessary
- **Memory Management**: Trail particles and effects properly cleaned up

## Debug Tools
- **F3**: Toggle debug panel with system information
- **F1**: Performance overlay (mentioned but not implemented)
- **F2**: CRT filter toggle
- **Delete**: Instant game over for testing
- **Console Access**: All systems accessible via `window.game.systems`

## Audio Assets
- **`tick-tock.mp3`**: Game audio file (likely timer sound)

## Extensibility Examples

### Custom Pellet Types
```javascript
window.game.addHook('onPelletCollected', (player) => {
  // Add random power-ups
  if (Math.random() < 0.1) {
    // Implement shield, double points, etc.
  }
});
```

### Maze Modifications
```javascript
window.game.addHook('onMazeGenerated', (maze, level) => {
  // Add shortcuts in higher levels
  if (level > 5) {
    // Punch holes in walls
  }
});
```

### Custom Visual Effects
```javascript
// Add dramatic screen shake on level complete
window.game.addHook('onLevelComplete', () => {
  window.game.systems.camera.addCameraKick(5.0);
  window.crtBurst(1500); // Intensify CRT effects
});
```

## Technical Notes
- **Coordinate System**: 25px per tile, world coordinates
- **Collision**: AABB with 13x13 player bounds within 25x25 tile
- **Camera**: 2D orthographic projection with viewport transformation
- **Maze Generation**: Ensures connectivity and proper goal accessibility
- **Mobile Support**: Virtual joystick and responsive scaling
- **Browser Compatibility**: Modern browsers with Canvas 2D and WebGL support

## Recent Modifications
- Added flickering "FROM BEE'S ARCHIVES" subtitle in blood red
- Positioned title screen at maze center for immersive intro
- Enhanced camera recentering on game restart
- Implemented fade-in effects for smooth game startup
- Fixed player position reset between levels