import * as THREE from 'three';
import PowerUp from '../powerups/PowerUp.js';
import { POWERUP_SPAWN_POSITIONS } from '../core/SceneConfig.js';

/**
 * PowerUpManager
 * Manages power-up spawning, collection, and UI updates
 */
export class PowerUpManager {
    constructor(scene, camera, gameData, updateUIFn, showPowerUpMessageFn) {
        this.scene = scene;
        this.camera = camera;
        this.gameData = gameData;
        this.updateUI = updateUIFn;
        this.showPowerUpMessage = showPowerUpMessageFn;
        this.powerUps = [];
        this.messageTimeout = null;
    }
    
    spawnPowerUp(position, type) {
        let powerUp = null;
        const onCollect = (collectedType) => {
            this.handlePowerUpCollected(collectedType, powerUp);
        };
        
        const pos = position instanceof THREE.Vector3 
            ? position 
            : new THREE.Vector3(position.x, position.y, position.z);
        
        powerUp = new PowerUp(pos, type, this.scene, onCollect);
        this.powerUps.push(powerUp);
    }
    
    spawnScenePowerUps(sceneIndex) {
        const positions = POWERUP_SPAWN_POSITIONS[sceneIndex] || [];
        if (positions.length === 0) return;
        
        const numToSpawn = Math.min(
            positions.length,
            1 + Math.floor(Math.random() * 2) // 1–2 per scene
        );
        
        const availableIndices = positions.map((_, i) => i);
        const types = ['health', 'ammo', 'double_damage', 'slow_mo'];
        
        for (let i = 0; i < numToSpawn; i++) {
            if (availableIndices.length === 0) break;
            
            const index = Math.floor(Math.random() * availableIndices.length);
            const posIndex = availableIndices.splice(index, 1)[0];
            
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnPowerUp(positions[posIndex], type);
        }
    }
    
    clear() {
        this.powerUps.forEach(p => p._dispose && p._dispose());
        this.powerUps.length = 0;
    }
    
    handlePowerUpCollected(type, powerUpInstance) {
        // Remove from active list
        const idx = this.powerUps.indexOf(powerUpInstance);
        if (idx !== -1) this.powerUps.splice(idx, 1);
        
        const typeLabel = {
            health: 'HEALTH',
            ammo: 'AMMO',
            double_damage: 'DOUBLE DAMAGE',
            slow_mo: 'SLOW MOTION'
        }[type] || type.toUpperCase();
        
        this.showPowerUpMessage(`POWER-UP: ${typeLabel}`);
        
        switch (type) {
            case 'health':
                this.gameData.health = Math.min(
                    this.gameData.maxHealth,
                    this.gameData.health + 30
                );
                break;
            case 'ammo':
                this.gameData.reserveAmmo += 12;
                break;
            case 'double_damage':
                this.gameData.doubleDamageActive = true;
                this.gameData.doubleDamageTimer = 10;
                break;
            case 'slow_mo':
                this.gameData.slowMoActive = true;
                this.gameData.slowMoTimer = 5;
                break;
        }
        
        this.updateUI();
    }
    
    update(deltaTime) {
        this.powerUps.forEach(p => {
            p.update(deltaTime, this.camera);
            p.updateFade(deltaTime);
        });
    }
    
    updateTimers(deltaTime) {
        if (this.gameData.doubleDamageActive) {
            this.gameData.doubleDamageTimer -= deltaTime;
            if (this.gameData.doubleDamageTimer <= 0) {
                this.gameData.doubleDamageActive = false;
                this.gameData.doubleDamageTimer = 0;
            }
        }
        
        if (this.gameData.slowMoActive) {
            this.gameData.slowMoTimer -= deltaTime;
            if (this.gameData.slowMoTimer <= 0) {
                this.gameData.slowMoActive = false;
                this.gameData.slowMoTimer = 0;
            }
        }
    }
    
    updateUI() {
        const msgEl = document.getElementById('powerup-message');
        const ddEl = document.getElementById('double-damage-timer');
        const smEl = document.getElementById('slow-mo-timer');
        
        if (ddEl) {
            if (this.gameData.doubleDamageActive) {
                ddEl.style.display = 'inline-block';
                ddEl.textContent = `DOUBLE DAMAGE: ${Math.ceil(this.gameData.doubleDamageTimer)}s`;
            } else {
                ddEl.style.display = 'none';
            }
        }
        
        if (smEl) {
            if (this.gameData.slowMoActive) {
                smEl.style.display = 'inline-block';
                smEl.textContent = `SLOW MO: ${Math.ceil(this.gameData.slowMoTimer)}s`;
            } else {
                smEl.style.display = 'none';
            }
        }
        
        if (msgEl && !msgEl.dataset.visible) {
            msgEl.style.display = 'none';
        }
    }
    
    getPowerUps() {
        return this.powerUps;
    }
}

