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
    }
    
    /**
     * Spawn all zombies for the current scene from spawn point config.
     * @param {{x:number,y:number,z:number,type:string}[]} spawnPoints
     */
    spawnSceneZombies(spawnPoints) {
        console.log(`🎬 Spawning zombies for Scene ${this.gameData.currentScene + 1}`);
        
        this.sceneZombiesKilled = 0;
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
        
        if (
            aliveCount === 0 &&
            this.zombies.length > 0 &&
            currentState === gameplayStateConst
        ) {
            onSceneClearedCb();
        }
    }
    
    clearZombies() {
        this.zombies.forEach(z => z.remove());
        this.zombies.length = 0;
        this.sceneZombiesKilled = 0;
    }
    
    getZombies() {
        return this.zombies;
    }
    
    incrementSceneZombiesKilled() {
        this.sceneZombiesKilled++;
    }
}


