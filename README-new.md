# ShuffleRunner - Modular Horror Arcade Game

## 🎮 What Changed

Your massive `index.html` file has been completely reorganized into a clean, modular structure that makes it super easy to add psychological horror elements and experiment with new features!

## 📁 New Project Structure

```
MazeProject/
├── assets/
│   └── audio/                    # Audio files
│       ├── tick-tock.mp3
│       └── PM_squeaky_metalDesigned_Spooky_Drone_2_447.mp3
├── src/
│   ├── core/
│   │   └── GameCore.js          # Central game state & event system
│   ├── systems/
│   │   ├── PhysicsSystem.js     # Player movement & collision
│   │   ├── MazeSystem.js        # Maze generation & management
│   │   ├── InputSystem.js       # Keyboard, mouse, touch input
│   │   ├── CameraSystem.js      # Enhanced camera with smooth following
│   │   └── EffectsSystem.js     # Particles, CRT filter, visual effects
│   ├── entities/
│   │   └── Player.js            # Player entity with trail system
│   ├── effects/
│   │   └── CRTFilter.js         # Moved CRT filter
│   └── horror/
│       ├── HorrorSystem.js      # 🎃 MAIN HORROR SYSTEM
│       └── ExampleHorrorModules.js # Example spooky effects
├── index-new.html               # Clean new HTML file
├── index.html                   # Original (backup)
└── README.md                    # This file
```

## 🚀 How to Run

1. Open `index-new.html` in your browser
2. The modular game will load automatically
3. Click to start playing!

## 🎃 Horror System Features

The new horror system is designed for easy expansion:

### Core Horror Triggers
- `onPlayerMove` - Track player movement patterns
- `onLevelStart` - Escalate horror as levels progress
- `onMazeShuffle` - Perfect timing for jump scares
- `onTimeWarning` - Build pressure when time runs low
- `onScoreThreshold` - Trigger events at score milestones
- `onGameOver` - Dramatic finale effects

### Built-in Horror Effects
- **Screen Shake** - Physical impact effects
- **Flash Effects** - Sudden visual jolts
- **Color Distortion** - Gradual visual corruption
- **CRT Burst** - Intensify retro filter for drama
- **Darkness Overlay** - Increasing atmospheric pressure

### Example Horror Modules
Check out `src/horror/ExampleHorrorModules.js` for examples:
- **Shadow Followers** - Ghostly trails that follow the player
- **Whisper Text** - Creepy messages that appear randomly
- **False Walls** - Walls that flicker between solid and passable
- **Maze Breathing** - Subtle breathing animation for the entire maze

## 🛠 Adding Your Own Horror Effects

It's incredibly easy to add new spooky elements:

```javascript
// 1. Create your horror module
class MyScaryEffect {
    init(gameCore) {
        // Hook into game events
        gameCore.addHorrorTrigger('onPlayerMove', (data) => {
            // Do something scary when player moves
        });
    }
    
    update(deltaTime) {
        // Update your effect
    }
    
    render(ctx) {
        // Draw your spooky visuals
    }
}

// 2. Register it with the game
const myEffect = new MyScaryEffect();
gameCore.addEntity('myScaryEffect', myEffect);
```

## 🎮 Controls

### Gameplay
- **Arrow Keys / WASD** - Move player
- **Touch/Drag** - Mobile joystick

### Debug/Testing
- **H** - Toggle horror system on/off
- **J** - Trigger manual jump scare
- **F1** - Toggle debug overlay
- **F2** - Toggle CRT filter
- **Delete** - Force game over (for testing)

## 🔧 System Architecture

### GameCore
The central hub that manages all systems and entities. It provides:
- Event system for communication between modules
- Horror trigger system for easy effect integration
- State management
- Update/render coordination

### Systems
Independent modules that handle specific functionality:
- **PhysicsSystem** - Movement and collision detection
- **MazeSystem** - Generation, shuffling, and rendering
- **InputSystem** - All input handling
- **CameraSystem** - Smooth camera following with effects
- **EffectsSystem** - Particles, CRT filter, visual effects
- **HorrorSystem** - Psychological horror management

### Entities
Game objects like the Player that have position, behavior, and rendering.

## 🎨 Visual Effects

The new system includes:
- **Particle Systems** - For score popups and celebrations
- **CRT Filter** - Retro screen effects with burst capability
- **Screen Shake** - Camera shake for impact
- **Trail System** - Player movement trails
- **Flash Effects** - Full-screen color flashes

## 📱 Mobile Support

Fully responsive with:
- Touch controls via virtual joystick
- Responsive canvas sizing
- Safe area support for notched devices
- Optimized performance

## 🚨 Horror Features

### Intensity Scaling
Horror effects scale based on:
- Level progression (higher levels = more intense)
- Player behavior (getting lost increases tension)
- Time pressure (effects intensify as time runs out)
- Score milestones (every 500 points triggers something)

### Easy Integration
Adding horror effects is as simple as:
1. Hook into existing triggers
2. Create visual/audio effects
3. Scale intensity based on game state

## 🎵 Audio System

Background music and sound effects are handled through the audio system:
- Automatic audio loading
- Volume control
- Loop management
- Horror-triggered audio effects

## 🐛 Debug Features

Press F1 to see:
- FPS counter
- Horror level indicator
- Control reference
- Real-time system status

## 💡 Next Steps

Now you can easily:

1. **Add New Horror Elements** - Use the example modules as templates
2. **Create New Visual Effects** - Hook into the effects system
3. **Implement Audio Scares** - Use the audio hooks
4. **Add New Game Mechanics** - Create new systems
5. **Experiment with Timing** - Use the trigger system for perfect timing

The modular structure makes it trivial to add things like:
- Fake walls that disappear
- Audio distortions
- Visual glitches
- Maze transformations
- Player hallucinations
- Time manipulation effects
- And much more!

## 🎯 Quick Start for Horror Development

1. Open `src/horror/ExampleHorrorModules.js`
2. Copy one of the example classes
3. Modify it to do something spooky
4. Add it to the game in `src/main.js`
5. Test with the debug controls

The hook system makes it incredibly easy to trigger effects at exactly the right moments for maximum psychological impact!

Happy horror game development! 🎃👻💀
