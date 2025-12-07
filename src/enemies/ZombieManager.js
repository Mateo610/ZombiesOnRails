import * as THREE from 'three';
import Zombie from './Zombie.js';
import { SpawnDustEffect } from '../effects/SpawnDustEffect.js';

/**
 * Manages all zombies for the current scene.
 * Keeps the array small and hides spawn / update details from main.js.
 */
export default class ZombieManager {
    constructor(scene, camera, gameData, damagePlayer, incrementCombo) {
        this.scene = scene;
        this.camera = camera;
        this.gameData = gameData;
        this.damagePlayer = damagePlayer;
        this.incrementCombo = incrementCombo;
        this.lockManager = null; // Will be set externally when lock is loaded
        
        this.zombies = [];
        this.sceneZombiesKilled = 0;
        this._sceneClearedNotified = false; // Track if we've already notified about scene being cleared
        this.spawnDustEffects = []; // Track active dust effects
        
        // Wave system properties
        this.currentWave = 1;
        this.maxWaves = 1; // Will be set based on difficulty
        this.sceneStartTime = 0;
        this.currentSpawnPoints = [];
        this.waveTimer = 7000; // 7 seconds in milliseconds
        this.waveTimerActive = false;
        this._waitingForAnimations = false;
        this._lastSceneIndex = -1; // Track last scene index to detect scene changes
        this._spawningNextWave = false; // Flag to prevent premature transitions during wave spawn
        this._spawningZombies = false; // Flag to track if zombies are currently being spawned
        this._expectedZombieCount = 0; // Expected number of zombies to spawn
    }
    
    /**
     * Spawn all zombies for the current scene from spawn point config.
     * @param {{x:number,y:number,z:number,type:string}[]} spawnPoints
     */
    spawnSceneZombies(spawnPoints) {
        // Store spawn points for wave respawning
        this.currentSpawnPoints = spawnPoints;
        
        // Set max waves based on difficulty
        const difficultyWaves = {
            easy: 1,
            medium: 2,
            hard: 3
        };
        this.maxWaves = difficultyWaves[this.gameData.difficulty] || 1;
        
        // Reset wave counter and scene start time for new scene
        if (this.gameData.currentScene !== this._lastSceneIndex) {
            // New scene - reset everything
            this.currentWave = 1;
            this.sceneStartTime = Date.now();
            this.waveTimerActive = true;
            this._lastSceneIndex = this.gameData.currentScene;
            console.log(`🔄 New scene detected - resetting wave system`);
        }
        
        console.log(`🎬 Spawning Wave ${this.currentWave}/${this.maxWaves} for Scene ${this.gameData.currentScene + 1} (Difficulty: ${this.gameData.difficulty})`);
        
        this.sceneZombiesKilled = 0;
        this._sceneClearedNotified = false; // Reset notification flag for new wave
        
        // Only clear zombies if starting a new scene (wave 1), not for respawns
        if (this.currentWave === 1) {
            this.clearZombies();
        }
        
        // Track spawning state
        this._spawningZombies = true;
        this._expectedZombieCount = spawnPoints.length;
        let spawnedCount = 0;
        
        if (spawnPoints.length === 0) {
            // No zombies to spawn, mark spawning as complete immediately
            this._spawningZombies = false;
            this._expectedZombieCount = 0;
        } else {
            spawnPoints.forEach((spawn, index) => {
                const spawnPosition = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
                
                // Create dust effect BEFORE spawning zombie
                const dustDelay = index * 300;
                const zombieSpawnDelay = dustDelay + 800; // Zombie appears 0.8s after dust starts
                
                // Start dust effect
                setTimeout(() => {
                    const dustEffect = new SpawnDustEffect(spawnPosition, this.scene);
                    this.spawnDustEffects.push(dustEffect);
                    
                    // Remove dust effect when it's done
                    setTimeout(() => {
                        const idx = this.spawnDustEffects.indexOf(dustEffect);
                        if (idx !== -1) {
                            this.spawnDustEffects.splice(idx, 1);
                        }
                    }, dustEffect.duration * 1000);
                }, dustDelay);
                
                // Spawn zombie after dust effect has started
                // Keep zombie hidden until dust cloud is dense enough
                setTimeout(() => {
                    const zombie = new Zombie(
                        spawnPosition,
                        spawn.type,
                        this.scene,
                        this.camera,
                        this.gameData,
                        this.damagePlayer,
                        this.incrementCombo
                    );
                    
                    // Keep zombie completely invisible during dust effect
                    zombie.mesh.visible = false;
                    
                    // Make zombie visible only after dust starts to fade (70% through effect)
                    const dustFadeStart = 800 + (1500 * 0.7); // 0.8s delay + 70% of 1.5s duration
                    setTimeout(() => {
                        zombie.mesh.visible = true;
                    }, dustFadeStart);
                    
                    this.zombies.push(zombie);
                    spawnedCount++;
                    
                    // Mark spawning as complete when all zombies have been added to the array
                    if (spawnedCount >= this._expectedZombieCount) {
                        this._spawningZombies = false;
                        console.log(`✅ All ${spawnedCount} zombies added to array`);
                    }
                }, zombieSpawnDelay);
            });
        }
    }
    
    /**
     * Update all zombies and notify when scene is cleared.
     * @param {number} deltaTime
     * @param {boolean} slowMoActive
     * @param {string} currentState
     * @param {string} gameplayStateConst
     * @param {() => void} onSceneClearedCb
     */
    update(deltaTime, slowMoActive, currentState, gameplayStateConst, onSceneClearedCb) {
        // Update wave system (check for respawns)
        this.updateWaveSystem();
        
        // Update spawn dust effects
        if (this.spawnDustEffects && this.spawnDustEffects.length > 0) {
            this.spawnDustEffects.forEach(effect => {
                if (effect && effect.active) {
                    effect.update(deltaTime);
                }
            });
            
            // Clean up finished dust effects
            this.spawnDustEffects = this.spawnDustEffects.filter(effect => effect && effect.active);
        }
        
        this.zombies.forEach(zombie => {
            if (!zombie.isDead) {
                zombie.update(deltaTime, slowMoActive);
            }
        });
        
        // Remove dead zombies from the array (cleanup)
        this.zombies = this.zombies.filter(zombie => {
            if (zombie.isDead) {
                // Zombie is dead, remove it from scene if not already removed
                if (zombie.mesh && zombie.mesh.parent) {
                    zombie.remove();
                }
                return false; // Remove from array
            }
            return true; // Keep in array
        });
        
        const aliveCount = this.zombies.length;
        
        // Only check for scene transition if ALL waves are complete
        // Don't transition if we're still waiting for more waves to spawn or currently spawning
        const allWavesComplete = this.currentWave >= this.maxWaves;
        
        // Check if scene is cleared (all zombies dead AND all waves complete)
        // For Scene 5 (Front of Door Pivot), also check if lock is opened
        const isLockScene = this.gameData.currentScene === 5; // FRONT_OF_DOOR_PIVOT
        
        // Check if lock is blocking transition (lock exists and is still active/not opened)
        const lockBlocking = isLockScene && this.lockManager && this.lockManager.isActive();
        
        // Special case: If this is the lock scene with no zombies, always check lock first
        if (isLockScene && aliveCount === 0 && allWavesComplete) {
            if (lockBlocking) {
                if (!this._sceneClearedNotified) {
                    const isLoading = this.lockManager?.isLoading || false;
                    const isOpened = this.lockManager?.isOpened || false;
                    const hasModel = this.lockManager?.lockModel !== null;
                    console.log('🔒 Lock scene with no zombies - waiting for lock to be shot before transitioning');
                    console.log(`   Lock manager exists: ${!!this.lockManager}, Loading: ${isLoading}, Opened: ${isOpened}, Has model: ${hasModel}, Active: ${this.lockManager?.isActive()}`);
                    this._sceneClearedNotified = true; // Prevent duplicate logs
                }
                return; // Block transition until lock is opened
            } else if (!this._sceneClearedNotified) {
                console.log('🔓 Lock scene cleared - lock opened or not present, proceeding with transition');
            }
        }
        
        if (
            aliveCount === 0 && // All zombies are dead
            currentState === gameplayStateConst &&
            allWavesComplete && // Only transition if all waves are done
            !this._spawningNextWave && // Don't transition if we're spawning a new wave
            !this._spawningZombies && // Don't transition if zombies are still being spawned
            !this._sceneClearedNotified && // Only notify once per scene - GUARD to prevent duplicate calls
            !lockBlocking // Lock must be opened if on lock scene
        ) {
            // All waves cleared - proceed with scene transition
            // Set guard immediately to prevent duplicate calls
            this._sceneClearedNotified = true;
            
            // Wait for death animations to finish before transitioning
            if (this.hasAnimatingDeaths()) {
                // Only call waitForDeathAnimations once per scene clear
                if (!this._waitingForAnimations) {
                    this._waitingForAnimations = true;
                    console.log('⏳ Waiting for death animations to finish...');
                    this.waitForDeathAnimations(() => {
                        this._waitingForAnimations = false;
                        console.log('✅ All death animations finished, transitioning scene');
                        // Only call callback if still in gameplay state (check actual current state)
                        if (this.gameData.currentState === gameplayStateConst) {
                            onSceneClearedCb();
                        } else {
                            console.log(`⚠️ State changed during animation wait (now ${this.gameData.currentState}), skipping transition callback`);
                        }
                    });
                }
            } else {
                // No animations playing, transition immediately
                console.log(`✅ Scene cleared! All waves complete. Calling onSceneCleared...`);
                onSceneClearedCb();
            }
        } else if (aliveCount > 0) {
            // Reset flags if zombies are still alive (new zombies spawned)
            this._waitingForAnimations = false;
            this._sceneClearedNotified = false;
        } else if (aliveCount === 0 && !allWavesComplete) {
            // Wave cleared but more waves coming - log and wait
            if (!this._sceneClearedNotified) {
                console.log(`✅ Wave ${this.currentWave}/${this.maxWaves} cleared - waiting for next wave...`);
                this._sceneClearedNotified = true; // Mark as notified to prevent duplicate logs
            }
        } else if (aliveCount === 0 && allWavesComplete && lockBlocking) {
            // Scene cleared but lock is blocking transition
            if (!this._sceneClearedNotified) {
                console.log('🔒 All zombies cleared but lock not opened - shoot the lock to proceed');
                this._sceneClearedNotified = true; // Mark as notified to prevent duplicate logs
            }
        }
    }
    
    /**
     * Update wave system - check if it's time to spawn the next wave
     */
    updateWaveSystem() {
        // Only check if timer is active and we're in gameplay
        if (!this.waveTimerActive || this.gameData.currentState !== 'GAMEPLAY') {
            return;
        }
        
        // Don't check for next wave if we've already reached max waves
        if (this.currentWave >= this.maxWaves) {
            this.waveTimerActive = false;
            return;
        }
        
        // Check if current wave is cleared (all zombies dead)
        const aliveCount = this.zombies.filter(z => !z.isDead).length;
        
        // Calculate time since scene started
        const elapsed = Date.now() - this.sceneStartTime;
        const timeForNextWave = this.currentWave * this.waveTimer; // Wave 2 at 7s, Wave 3 at 14s
        
        // Spawn next wave if:
        // 1. At least 7 seconds have passed since scene start (or 7s since last wave)
        // 2. Current wave is cleared (all zombies dead)
        if (elapsed >= timeForNextWave && aliveCount === 0 && !this._spawningNextWave) {
            // Spawn next wave
            this._spawningNextWave = true; // Set flag to prevent premature transitions
            this.currentWave++;
            console.log(`🌊 Spawning Wave ${this.currentWave}/${this.maxWaves} (${(elapsed / 1000).toFixed(1)}s elapsed since scene start)`);
            this._sceneClearedNotified = false; // Reset notification flag for new wave
            
            // Spawn next wave using stored spawn points
            if (this.currentSpawnPoints && this.currentSpawnPoints.length > 0) {
                const spawnCount = this.currentSpawnPoints.length;
                let spawnedCount = 0;
                
                // Track spawning state for next wave
                this._spawningZombies = true;
                this._expectedZombieCount = spawnCount;
                
                this.currentSpawnPoints.forEach((spawn, index) => {
                    setTimeout(() => {
                        const zombie = new Zombie(
                            new THREE.Vector3(spawn.x, spawn.y, spawn.z),
                            spawn.type,
                            this.scene,
                            this.camera,
                            this.gameData,
                            this.damagePlayer,
                            this.incrementCombo
                        );
                        this.zombies.push(zombie);
                        spawnedCount++;
                        
                        // Clear flag once all zombies are spawned
                        if (spawnedCount >= spawnCount) {
                            this._spawningNextWave = false;
                            this._spawningZombies = false;
                            console.log(`✅ All ${spawnedCount} zombies added for next wave`);
                        }
                    }, index * 300);
                });
            } else {
                // No spawn points, clear flag immediately
                this._spawningNextWave = false;
                this._spawningZombies = false;
            }
        }
        
        // Deactivate timer if all waves are done
        if (this.currentWave >= this.maxWaves) {
            this.waveTimerActive = false;
        }
    }
    
    clearZombies(force = false) {
        // Clean up any active dust effects
        this.spawnDustEffects.forEach(effect => effect.dispose());
        this.spawnDustEffects = [];
        
        // If zombies are animating death and not forcing, wait for them to finish first
        if (!force && this.hasAnimatingDeaths()) {
            console.log('⏳ Waiting for death animations before clearing zombies...');
            this.waitForDeathAnimations(() => {
                this.zombies.forEach(z => z.remove());
                this.zombies.length = 0;
                this.sceneZombiesKilled = 0;
                this._waitingForAnimations = false;
                this._sceneClearedNotified = false; // Reset guard when clearing
                this._spawningZombies = false; // Reset spawning flag when clearing
                this._expectedZombieCount = 0; // Reset expected count
                console.log('✅ All zombies cleared after animations');
            });
        } else {
            // Force clear or no animations, clear immediately
            if (force && this.hasAnimatingDeaths()) {
                console.log('⚠️ Force clearing zombies (animations may be interrupted)');
            }
            this.zombies.forEach(z => z.remove());
            this.zombies.length = 0;
            this.sceneZombiesKilled = 0;
            this._waitingForAnimations = false;
            this._sceneClearedNotified = false; // Reset guard when clearing
            this._spawningZombies = false; // Reset spawning flag when clearing
            this._expectedZombieCount = 0; // Reset expected count
        }
    }
    
    getZombies() {
        return this.zombies;
    }
    
    /**
     * Get max waves for current difficulty
     * @returns {number} Maximum number of waves
     */
    getMaxWaves() {
        return this.maxWaves;
    }
    
    /**
     * Get current wave number
     * @returns {number} Current wave (1-indexed)
     */
    getCurrentWave() {
        return this.currentWave;
    }
    
    incrementSceneZombiesKilled() {
        this.sceneZombiesKilled++;
    }
    
    /**
     * Check if any zombies are still playing death animations
     * @returns {boolean} True if any zombie is still animating death
     */
    hasAnimatingDeaths() {
        return this.zombies.some(z => z.isAnimatingDeath);
    }
    
    /**
     * Wait for all death animations to complete before proceeding
     * @param {() => void} callback Function to call when all animations are done
     * @param {number} maxWaitTime Maximum time to wait in milliseconds (default 5 seconds)
     */
    waitForDeathAnimations(callback, maxWaitTime = 5000) {
        const startTime = Date.now();
        const checkInterval = 50; // Check every 50ms
        
        const checkAnimations = () => {
            if (!this.hasAnimatingDeaths()) {
                // All animations complete
                callback();
                return;
            }
            
            // Check if we've exceeded max wait time
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('⚠️ Max wait time exceeded for death animations, proceeding anyway');
                callback();
                return;
            }
            
            // Check again after a short delay
            setTimeout(checkAnimations, checkInterval);
        };
        
        checkAnimations();
    }
    
    /**
     * Set the lock manager reference (called when lock is loaded/unloaded)
     * @param {LockManager|null} lockManager - The lock manager instance or null
     */
    setLockManager(lockManager) {
        this.lockManager = lockManager;
    }
}
