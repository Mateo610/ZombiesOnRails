import { gameData } from '../core/GameState.js';
import { GameState } from '../core/GameState.js';

/**
 * PlayerManager
 * Manages player health, combos, reload, and related systems
 */
export class PlayerManager {
    constructor(updateUIFn, resetComboFn, gameOverFn) {
        this.updateUI = updateUIFn;
        this.resetCombo = resetComboFn;
        this.gameOver = gameOverFn;
    }
    
    damage(amount) {
        if (gameData.health <= 0) return;
        
        gameData.health = Math.max(0, gameData.health - amount);
        console.log(`💔 Player hit! Health: ${gameData.health}/${gameData.maxHealth}`);
        
        this.resetCombo();
        
        // Screen flash red
        const flash = document.getElementById('damage-flash');
        if (flash) {
            flash.style.opacity = '0.5';
            setTimeout(() => {
                if (flash) flash.style.opacity = '0';
            }, 200);
        }
        
        this.updateUI();
        
        if (gameData.health <= 0) {
            this.gameOver();
        }
    }
    
    incrementCombo() {
        gameData.currentCombo++;
        gameData.comboTimer = gameData.comboDecayTime;
        
        if (gameData.currentCombo > gameData.maxCombo) {
            gameData.maxCombo = gameData.currentCombo;
        }
        
        // Bonus points for combo
        if (gameData.currentCombo >= 5) {
            const bonusPoints = gameData.currentCombo * 10;
            gameData.score += bonusPoints;
            console.log(`🔥 COMBO x${gameData.currentCombo}! +${bonusPoints} bonus`);
        }
        
        this.updateUI();
    }
    
    resetCombo() {
        if (gameData.currentCombo > 0) {
            console.log(`❌ Combo broken at x${gameData.currentCombo}`);
        }
        gameData.currentCombo = 0;
        gameData.comboTimer = 0;
    }
    
    updateComboTimer(deltaTime) {
        if (gameData.comboTimer > 0) {
            gameData.comboTimer -= deltaTime;
            if (gameData.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }
    
    reload() {
        if (gameData.isReloading) return;
        if (gameData.currentAmmo === gameData.maxAmmo) return;
        if (gameData.reserveAmmo === 0) return;
        
        gameData.isReloading = true;
        const reloadIndicator = document.getElementById('reload-indicator');
        if (reloadIndicator) {
            reloadIndicator.style.display = 'block';
        }
        
        setTimeout(() => {
            const ammoNeeded = gameData.maxAmmo - gameData.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, gameData.reserveAmmo);
            
            gameData.currentAmmo += ammoToReload;
            gameData.reserveAmmo -= ammoToReload;
            gameData.isReloading = false;
            
            if (reloadIndicator) {
                reloadIndicator.style.display = 'none';
            }
            this.updateUI();
        }, gameData.reloadTime);
    }
    
    resetStats() {
        gameData.health = gameData.maxHealth;
        gameData.totalZombiesKilled = 0;
        gameData.shotsFired = 0;
        gameData.shotsHit = 0;
        gameData.headshotKills = 0;
        gameData.currentCombo = 0;
        gameData.maxCombo = 0;
        gameData.score = 0;
        gameData.currentAmmo = gameData.maxAmmo;
        gameData.reserveAmmo = 60;
        gameData.isReloading = false;
    }
}

