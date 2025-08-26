# ShuffleRunner - Modular Edition

## What Changed

I've reorganized your monster HTML file into a clean, modular structure that makes it super easy to hook into and extend. The game functions identically to before, but now it's organized like a proper arcade game framework.

## New Structure

```
src/
├── core/
│   ├── GameCore.js     # Main game controller with hooks
│   └── GameInit.js     # Initialization and setup
├── systems/
│   ├── PhysicsSystem.js    # AABB collision and movement
│   ├── MazeSystem.js       # Maze generation and rendering
│   ├── CameraSystem.js     # Camera movement and following
│   ├── InputSystem.js      # Keyboard, mouse, and joystick
│   ├── AudioSystem.js      # Sound and music
│   └── PelletSystem.js     # Point/time/speed pellets
├── entities/
│   └── Player.js           # Player entity with trail effects
├── effects/
│   └── EffectsSystem.js    # Visual effects and screen transitions
├── ui/
│   └── UISystem.js         # All UI rendering and management
└── utils/
    ├── GameUtils.js        # Utility functions
    ├── Camera.js           # Legacy camera compatibility
    └── VirtualJoystick.js  # Mobile joystick controls
```

## How to Use

### 1. Basic Usage
Just open `index-modular.html` - the game works exactly the same as before!

### 2. Hook Into Events
Add custom logic when things happen:

```javascript
// Run code when pellets are collected
window.game.addHook('onPelletCollected', (player) => {
  console.log('Pellet collected!');
  // Add your own effects, scoring, etc.
});

// Do something when levels are completed
window.game.addHook('onLevelComplete', (level, score) => {
  console.log(`Level ${level} done with score ${score}`);
  // Trigger custom celebrations, unlock features, etc.
});

// React to maze generation
window.game.addHook('onMazeGenerated', (maze, level) => {
  // Modify the maze, add special tiles, etc.
  if (level > 10) {
    // Add special challenge mode features
  }
});
```

### 3. Add Custom Systems
Create your own game systems:

```javascript
class MyAwesomeSystem {
  update(dt, currentTime) {
    // Your update logic
  }
  
  render(ctx, currentTime) {
    // Your rendering
  }
}

window.gameInit.addCustomSystem('myAwesome', new MyAwesomeSystem());
```

### 4. Access Any System
Modify or extend existing systems:

```javascript
// Make the game faster
window.game.systems.physics.configure({ MAX_SPEED: 500 });

// Add camera shake
window.game.systems.camera.addCameraKick(2.0);

// Spawn custom effects
window.game.systems.effects.addPopup('EPIC!', 100, 100);
window.game.systems.effects.addParticles(100, 100, '#ff00ff', 20);
```

### 5. Debug Mode
- Press **F3** for debug panel
- Press **F1** for performance overlay  
- Press **F2** for CRT filter toggle
- Press **Delete** for instant game over

## Available Hooks

- `onGameStart` - Game begins
- `onLevelComplete` - Level finished  
- `onGameOver` - Game ended
- `onPelletCollected` - Any pellet collected
- `onMazeGenerated` - New maze created
- `beforeUpdate` - Before each frame update
- `afterUpdate` - After each frame update
- `beforeRender` - Before each frame render
- `afterRender` - After each frame render

## Available Systems

- `physics` - Movement and collision
- `maze` - Generation and rendering
- `camera` - Following and cinematics
- `input` - Controls and interaction
- `ui` - Interface and menus
- `audio` - Sound and music
- `effects` - Visual effects
- `pellets` - Collectibles

## Easy Modifications

### Change Game Balance
```javascript
// Faster gameplay
window.game.systems.physics.configure({ 
  MAX_SPEED: 400,
  STEER: 10,
  DRAG: 12 
});

// Longer shuffle times
window.game.baseShuffleTime = 30;
```

### Add Power-ups
```javascript
window.game.addHook('onPelletCollected', (player) => {
  // Random chance for special effects
  if (Math.random() < 0.1) {
    window.game.systems.effects.addPopup('BONUS!', player.x, player.y);
    // Add bonus points, temporary invincibility, etc.
  }
});
```

### Custom Maze Modifications
```javascript
window.game.addHook('onMazeGenerated', (maze, level) => {
  // Add random holes in walls for shortcuts
  if (level > 5) {
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * maze[0].length);
      const y = Math.floor(Math.random() * maze.length);
      if (maze[y] && maze[y][x] > 0) {
        maze[y][x] = 0; // Make it passable
      }
    }
  }
});
```

## Files You Can Safely Ignore

The original `index.html` is still there and unchanged. All the new modular code is separate, so you can switch between versions easily.

## What's the Same

- Exact same gameplay and physics
- All visual effects and animations
- Mobile joystick controls  
- CRT filter effects
- High score system
- Progressive difficulty

## What's Better

- Easy to add new features
- Clean separation of concerns
- Debugging tools built-in
- Hook system for extensions
- Modular architecture
- Easy to understand code structure

Now you can easily add weird new elements, power-ups, game modes, or whatever wild ideas you come up with! 🎮
