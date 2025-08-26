class HorrorAudio extends HorrorEffect {
    constructor(system) {
        super(system);
        this.musicIsOff = false;
        this.lastSoundPlayTime = 0;
        this.soundCooldown = 15; // Cooldown in seconds between ambient sounds

        this.soundVolume = 0.65;

        // Array of scary files
        this.scaryAmbienceFiles = ["assets/scary.mp3", "assets/scary_2.mp3", "assets/scary_3.mp3"];

        // Create sound variable for each scary file
        this.scaryAmbienceSounds = this.scaryAmbienceFiles.map(file => {
            const sound = new Audio(file);
            sound.loop = false;
            sound.volume = this.soundVolume;
            return sound;
        });
    }

    onMazeReshuffle(system) {
        // accept the passed system but also keep this.system for compatibility
        this.system = this.system || system;
        console.log('[HorrorAudio] Maze reshuffled.');

        if (this.system.horrorLevel > 0.4) {
            this.system.audioSystem.stopBackgroundMusic();
            this.musicIsOff = true;

        } else if (this.musicIsOff) {
            this.system.audioSystem.startBackgroundMusic();
        }
    }

    // new signature: update(system, intensity, dt, context)
    update(system, intensity, dt, context) {
        this.system = this.system || system;
        // console.log('[HorrorAudio] Update.', { intensity, dt, context });
        const now = (context && context.timeElapsed) || 0;
        if (now - this.lastSoundPlayTime > this.soundCooldown && intensity > 0.6) {
            this.playRandomScarySound();
            
        }
    }

    playRandomScarySound(context) {
        const audioSystem = this.system?.audioSystem || (this.system && this.system.audioSystem);
        if (!audioSystem || !audioSystem.scaryAmbienceFiles || audioSystem.scaryAmbienceFiles.length === 0) return;

        const randomIndex = Math.floor(Math.random() * this.scaryAmbienceSounds.length);
        const sound = this.scaryAmbienceSounds[randomIndex];
        
        // Reset cooldown
        const currentTime = (this.system.elapsedTime || 0);
        this.lastSoundPlayTime = currentTime;

        sound.play().catch(e => console.error("Error playing scary sound:", e));
        console.log('[HorrorAudio] Playing ambient horror sound.');
        
    }

    onNewLevel(system) {
        this.system = this.system || system;
        console.log('[HorrorAudio] New Level.');
        if (this.system.horrorLevel < 0.4) {
            this.musicIsOff = false;
        }
    }

    onGameOver(system) {
        this.system = this.system || system;
        console.log('[HorrorAudio] Game Over');
        this.musicIsOff = false;
    }
}

// Also expose globally for the existing codebase
if (typeof window !== 'undefined') {
    window.HorrorAudio = HorrorAudio;
}