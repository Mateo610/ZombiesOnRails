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
        this.zombiesSpawnedForScene = 0; // Track how many zombies were spawned for current scene
        this.sceneClearedCalled = false; // Guard to prevent multiple calls
    }
    
    /**
     * Spawn all zombies for the current scene from spawn point config.
     * @param {{x:number,y:number,z:number,type:string}[]} spawnPoints
     */
    spawnSceneZombies(spawnPoints) {
        console.log(`🎬 Spawning ${spawnPoints.length} zombies for Scene ${this.gameData.currentScene + 1}`);
        
        this.sceneZombiesKilled = 0;
        this.zombiesSpawnedForScene = spawnPoints.length; // Track total zombies for this scene
        this.sceneClearedCalled = false; // Reset guard when spawning new scene
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
        // Update alive zombies first
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
        
        // Debug logging (only log when close to clearing or when zombies are killed)
        if (aliveCount <= 2 && this.zombiesSpawnedForScene > 0) {
            console.log(`🔍 Scene check: ${aliveCount} alive, ${this.sceneZombiesKilled}/${this.zombiesSpawnedForScene} killed, state: ${currentState}, required: ${gameplayStateConst}`);
        }
        
        // Check if scene is cleared: no alive zombies AND all spawned zombies are dead
        // We check sceneZombiesKilled against zombiesSpawnedForScene to ensure all zombies are dead
        if (
            !this.sceneClearedCalled && // Guard: only call once per scene
            aliveCount === 0 &&
            this.zombiesSpawnedForScene > 0 &&
            this.sceneZombiesKilled >= this.zombiesSpawnedForScene &&
            currentState === gameplayStateConst
        ) {
            console.log(`✅ Scene cleared! All ${this.zombiesSpawnedForScene} zombies eliminated (${this.sceneZombiesKilled} killed). Calling onSceneCleared...`);
            this.sceneClearedCalled = true; // Set guard immediately to prevent duplicate calls
            onSceneClearedCb();
            // Reset the counter to prevent multiple calls
            this.zombiesSpawnedForScene = 0;
        }
    }
    
    clearZombies() {
        this.zombies.forEach(z => z.remove());
        this.zombies.length = 0;
        this.sceneZombiesKilled = 0;
        this.zombiesSpawnedForScene = 0; // Reset spawn count when clearing
        this.sceneClearedCalled = false; // Reset guard when clearing
    }
    
    getZombies() {
        return this.zombies;
    }
    
    incrementSceneZombiesKilled() {
        this.sceneZombiesKilled++;
    }
}


