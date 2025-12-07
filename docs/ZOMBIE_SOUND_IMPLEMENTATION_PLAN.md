# Zombie Sound Implementation Plan

## Overview
Implement a comprehensive sound system for zombies that plays appropriate sounds based on zombie type, animation state, and random groans.

## Available Sound Files

### Attack Sounds
- `sounds/zombies/walker_attack.wav` - Walker attack sound
- `sounds/zombies/runner_attack.wav` - Runner attack sound
- `sounds/zombies/runnner_attack.wav` - Runner attack (typo variant, use runner_attack.wav)
- `sounds/zombies/crawler_attack.wav` - Crawler attack sound

### Movement Sounds
- `sounds/zombies/runner_steps.wav` - Runner movement/running sound
- `sounds/zombies/crawler_steps.wav` - Crawler movement sound
- `sounds/zombies/zombie_step.wav` - Generic zombie step (fallback)

### Groan Sounds
- `sounds/zombies/walker_groan.wav` - Walker groan
- `sounds/zombies/reaper_groan.wav` - Reaper groan

## Zombie Types and Animations

### Walker
- **Type**: `walker`
- **Move Animation**: `walk`
- **Attack Animation**: `attack`
- **Sounds**:
  - Attack: `walker_attack.wav`
  - Movement: `zombie_step.wav` (generic, no walker_steps.wav available)
  - Groan: `walker_groan.wav`

### Runner
- **Type**: `runner`
- **Move Animation: `run`
- **Attack Animation**: `attack`
- **Sounds**:
  - Attack: `runner_attack.wav`
  - Movement: `runner_steps.wav`
  - Groan: `walker_groan.wav` (fallback, no runner_groan.wav)

### Crawler
- **Type**: `crawler`
- **Move Animation**: `walk`
- **Attack Animation**: `attack`
- **Sounds**:
  - Attack: `crawler_attack.wav`
  - Movement: `crawler_steps.wav`
  - Groan: `walker_groan.wav` (fallback, no crawler_groan.wav)

### Reaper
- **Type**: `reaper`
- **Move Animation**: `Armature|run`
- **Attack Animation**: `attack`
- **Sounds**:
  - Attack: `runner_attack.wav` (fallback, no reaper_attack.wav)
  - Movement: `runner_steps.wav` (uses run animation)
  - Groan: `reaper_groan.wav`

## Implementation Plan

### 1. Create Sound Manager for Zombies

**File**: `src/systems/ZombieSoundManager.js`

**Purpose**: Centralized sound loading and management for zombie sounds.

**Features**:
- Preload all zombie sounds at game start
- Provide methods to play sounds with proper volume/spatialization
- Handle sound pooling to prevent too many simultaneous sounds
- Manage sound cleanup

**Key Methods**:
```javascript
class ZombieSoundManager {
    constructor() {
        this.sounds = {}; // Cache loaded sounds
        this.audioContext = null;
        this.maxConcurrentSounds = 10; // Limit simultaneous sounds
    }
    
    async preloadSounds() // Load all zombie sounds
    playSound(zombieType, soundType, position) // Play sound with 3D positioning
    playGroan(zombieType, position) // Play random groan
    playAttackSound(zombieType, position) // Play attack sound
    playMovementSound(zombieType, animationName, position) // Play movement sound
}
```

### 2. Sound Mapping Configuration

**File**: `src/enemies/ZombieSoundConfig.js`

**Purpose**: Map zombie types and animations to sound files.

**Structure**:
```javascript
export const ZOMBIE_SOUND_MAP = {
    walker: {
        attack: '/sounds/zombies/walker_attack.wav',
        move: {
            walk: '/sounds/zombies/zombie_step.wav'
        },
        groan: '/sounds/zombies/walker_groan.wav'
    },
    runner: {
        attack: '/sounds/zombies/runner_attack.wav',
        move: {
            run: '/sounds/zombies/runner_steps.wav'
        },
        groan: '/sounds/zombies/walker_groan.wav' // Fallback
    },
    crawler: {
        attack: '/sounds/zombies/crawler_attack.wav',
        move: {
            walk: '/sounds/zombies/crawler_steps.wav'
        },
        groan: '/sounds/zombies/walker_groan.wav' // Fallback
    },
    reaper: {
        attack: '/sounds/zombies/runner_attack.wav', // Fallback
        move: {
            'Armature|run': '/sounds/zombies/runner_steps.wav'
        },
        groan: '/sounds/zombies/reaper_groan.wav'
    }
};
```

### 3. Integrate into Zombie Class

**File**: `src/enemies/Zombie.js`

**Changes Needed**:

#### A. Add Sound Properties
```javascript
constructor(...) {
    // ... existing code ...
    this.soundManager = null; // Will be set externally
    this.groanTimer = 0;
    this.groanInterval = 2.0; // 2 seconds between groans
    this.lastGroanTime = 0;
    this.currentMovementSound = null; // Track playing movement sound
    this.isPlayingMovementSound = false;
}
```

#### B. Update Method - Groan System
```javascript
update(deltaTime, slowMoActive) {
    // ... existing update code ...
    
    // Random groans every 2 seconds
    this.groanTimer += deltaTime;
    if (this.groanTimer >= this.groanInterval) {
        // Random chance to groan (30% chance)
        if (Math.random() < 0.3 && !this.isDead && !this.isAttacking) {
            this.playGroan();
        }
        this.groanTimer = 0;
        // Randomize next interval (1.5-2.5 seconds)
        this.groanInterval = 1.5 + Math.random() * 1.0;
    }
}
```

#### C. Attack Method - Attack Sound
```javascript
attack() {
    // ... existing attack code ...
    
    // Play attack sound
    if (this.soundManager) {
        this.soundManager.playAttackSound(this.type, this.mesh.position);
    }
}
```

#### D. Animation System - Movement Sounds
```javascript
playAnimation(name) {
    // ... existing animation code ...
    
    // Play movement sound when move animation starts
    if (name === 'move' && this.soundManager && !this.isPlayingMovementSound) {
        const animationName = this.currentAnimationName || this.config.animations.move;
        this.soundManager.playMovementSound(
            this.type, 
            animationName, 
            this.mesh.position,
            this // Pass zombie reference for looping
        );
        this.isPlayingMovementSound = true;
    }
    
    // Stop movement sound when attack starts
    if (name === 'attack' && this.isPlayingMovementSound) {
        this.stopMovementSound();
    }
}

stopMovementSound() {
    if (this.currentMovementSound) {
        this.currentMovementSound.stop();
        this.currentMovementSound = null;
    }
    this.isPlayingMovementSound = false;
}
```

### 4. Movement Sound Looping

**Challenge**: Movement sounds need to loop while the zombie is moving, but stop when:
- Zombie stops moving
- Zombie starts attacking
- Zombie dies

**Solution**: 
- Use `THREE.Audio` with `setLoop(true)` for movement sounds
- Track the active movement sound per zombie
- Stop/cleanup when animation changes or zombie dies

**Implementation**:
```javascript
playMovementSound(zombieType, animationName, position, zombieRef) {
    // Get sound file based on zombie type and animation
    const soundConfig = ZOMBIE_SOUND_MAP[zombieType];
    if (!soundConfig) return null;
    
    const soundPath = soundConfig.move[animationName] || soundConfig.move.walk || soundConfig.move.run;
    if (!soundPath) return null;
    
    // Create 3D positioned audio
    const listener = this.audioListener;
    const sound = new THREE.Audio(listener);
    
    // Load and play
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(soundPath, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.setRefDistance(5);
        sound.setRolloffFactor(2);
        sound.position.copy(position);
        sound.play();
        
        // Store reference in zombie
        zombieRef.currentMovementSound = sound;
    });
    
    return sound;
}
```

### 5. Groan Sound System

**Requirements**:
- Random groans every ~2 seconds per zombie
- 30% chance to actually groan (prevents all zombies groaning at once)
- Random interval between 1.5-2.5 seconds
- Only groan when zombie is alive and not attacking

**Implementation**:
```javascript
playGroan() {
    if (!this.soundManager || this.isDead || this.isAttacking) return;
    
    this.soundManager.playGroan(this.type, this.mesh.position);
}
```

### 6. Attack Sound System

**Requirements**:
- Play attack sound when attack animation starts
- One-shot sound (not looped)
- Positioned at zombie location

**Implementation**:
```javascript
playAttackSound(zombieType, position) {
    const soundConfig = ZOMBIE_SOUND_MAP[zombieType];
    if (!soundConfig || !soundConfig.attack) return;
    
    // Play one-shot attack sound
    const sound = new THREE.Audio(this.audioListener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(soundConfig.attack, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(0.7);
        sound.setRefDistance(10);
        sound.position.copy(position);
        sound.play();
    });
}
```

### 7. Integration Points

#### A. Initialize Sound Manager
**File**: `src/main.js` or `src/systems/ZombieManager.js`

```javascript
import { ZombieSoundManager } from './systems/ZombieSoundManager.js';

const zombieSoundManager = new ZombieSoundManager();
await zombieSoundManager.preloadSounds();

// Pass to zombie manager
zombieManager.setSoundManager(zombieSoundManager);
```

#### B. Pass to Zombies
**File**: `src/enemies/ZombieManager.js`

```javascript
spawnSceneZombies(spawnPoints) {
    spawnPoints.forEach((spawn, index) => {
        setTimeout(() => {
            const zombie = new Zombie(/* ... */);
            zombie.soundManager = this.soundManager; // Set sound manager
            this.zombies.push(zombie);
        });
    });
}

setSoundManager(soundManager) {
    this.soundManager = soundManager;
    // Update existing zombies
    this.zombies.forEach(zombie => {
        zombie.soundManager = soundManager;
    });
}
```

### 8. Cleanup

**When zombie dies or is removed**:
```javascript
remove() {
    // Stop all sounds
    this.stopMovementSound();
    
    // Cleanup audio objects
    if (this.currentMovementSound) {
        this.currentMovementSound.stop();
        this.currentMovementSound.disconnect();
        this.currentMovementSound = null;
    }
    
    // ... existing cleanup code ...
}
```

## Implementation Steps

1. ✅ Create `ZombieSoundConfig.js` with sound mappings
2. ✅ Create `ZombieSoundManager.js` for sound loading and playback
3. ✅ Add sound properties and methods to `Zombie.js`
4. ✅ Integrate groan system (random every 2 seconds)
5. ✅ Integrate attack sound (play on attack animation)
6. ✅ Integrate movement sound (loop during move animation)
7. ✅ Add sound manager initialization in main.js
8. ✅ Add cleanup for sounds when zombies die
9. ✅ Test all zombie types and sound combinations
10. ✅ Adjust volumes and spatialization settings

## Technical Considerations

### Audio Context
- Use Three.js `AudioListener` attached to camera
- Ensure audio context is initialized (may require user interaction)

### Performance
- Limit concurrent sounds (max 10-15 simultaneous)
- Use sound pooling for frequently played sounds
- Preload all sounds at game start

### Spatial Audio
- Use 3D positioned audio for realistic sound
- Set appropriate `refDistance` and `rolloffFactor`
- Volume based on distance from camera

### Sound Volume Levels
- Groans: 0.4-0.5 (ambient, not too loud)
- Attack: 0.6-0.7 (more prominent)
- Movement: 0.3-0.4 (background, subtle)

## Testing Checklist

- [ ] Walker groan plays randomly every ~2 seconds
- [ ] Runner groan plays (using walker_groan fallback)
- [ ] Crawler groan plays (using walker_groan fallback)
- [ ] Reaper groan plays
- [ ] Walker attack sound plays on attack
- [ ] Runner attack sound plays on attack
- [ ] Crawler attack sound plays on attack
- [ ] Runner movement sound loops during run animation
- [ ] Crawler movement sound loops during walk animation
- [ ] Movement sounds stop when attack starts
- [ ] Movement sounds stop when zombie dies
- [ ] All sounds are properly positioned in 3D space
- [ ] No sound overlap/conflicts
- [ ] Performance is acceptable with many zombies

