import * as THREE from 'three';
import Zombie from './Zombie.js';

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
        
        this.zombies = [];
        this.sceneZombiesKilled = 0;
        this._sceneClearedNotified = false; // Track if we've already notified about scene being cleared
    }
    
    /**
     * Spawn all zombies for the current scene from spawn point config.
     * @param {{x:number,y:number,z:number,type:string}[]} spawnPoints
     */
    spawnSceneZombies(spawnPoints) {
        console.log(`🎬 Spawning zombies for Scene ${this.gameData.currentScene + 1}`);
        
        this.sceneZombiesKilled = 0;
        this._sceneClearedNotified = false; // Reset notification flag for new scene
        this.clearZombies();
        
        spawnPoints.forEach((spawn, index) => {
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
            }, index * 300);
        });
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
        this.zombies.forEach(zombie => {
            if (!zombie.isDead) {
                zombie.update(deltaTime, slowMoActive);
            }
        });
        
        const aliveCount = this.zombies.filter(z => !z.isDead).length;
        
        // Check if scene is cleared (all zombies dead)
        if (
            aliveCount === 0 &&
            this.zombies.length > 0 &&
            currentState === gameplayStateConst &&
            !this._sceneClearedNotified // Only notify once per scene
        ) {
            // Wait for death animations to finish before transitioning
            if (this.hasAnimatingDeaths()) {
                // Only call waitForDeathAnimations once per scene clear
                if (!this._waitingForAnimations) {
                    this._waitingForAnimations = true;
                    this._sceneClearedNotified = true; // Mark as notified
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
                this._sceneClearedNotified = true; // Mark as notified
                onSceneClearedCb();
            }
        } else if (aliveCount > 0) {
            // Reset flags if zombies are still alive (new zombies spawned)
            this._waitingForAnimations = false;
            this._sceneClearedNotified = false;
        }
    }
    
    clearZombies(force = false) {
        // If zombies are animating death and not forcing, wait for them to finish first
        if (!force && this.hasAnimatingDeaths()) {
            console.log('⏳ Waiting for death animations before clearing zombies...');
            this.waitForDeathAnimations(() => {
                this.zombies.forEach(z => z.remove());
                this.zombies.length = 0;
                this.sceneZombiesKilled = 0;
                this._waitingForAnimations = false;
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
        }
    }
    
    getZombies() {
        return this.zombies;
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
}


