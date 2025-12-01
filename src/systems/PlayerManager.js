import { gameData } from '../core/GameState.js';
import { GameState } from '../core/GameState.js';
import { soundManager } from './SoundManager.js';

/**
 * PlayerManager
 * Manages player health, combos, reload, and related systems
 */
export class PlayerManager {
    constructor(updateUIFn, resetComboFn, gameOverFn) {
        this.updateUI = updateUIFn;
        // Note: resetComboFn is not used - PlayerManager has its own resetCombo method
        // The resetComboFn parameter is kept for backward compatibility but not assigned
        this.gameOver = gameOverFn;
    }
    
    damage(amount) {
        // TESTING MODE: Player cannot die
        // Uncomment the code below to re-enable damage
        return;
        
        /* DISABLED FOR TESTING
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
        */
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
    
    reload(weaponId = 'pistol') {
        if (gameData.isReloading) return;
        if (gameData.currentAmmo === gameData.maxAmmo) return;
        if (gameData.reserveAmmo === 0) return;
        
        // Play reload sound
        soundManager.playReload(weaponId);
        
        gameData.isReloading = true;
        const reloadIndicator = document.getElementById('reload-indicator');
        const reloadProgressCircle = document.getElementById('reload-progress-circle');
        const reloadText = document.getElementById('reload-text');
        
        if (reloadIndicator) {
            reloadIndicator.style.display = 'block';
        }
        
        // Initialize progress
        const circumference = 2 * Math.PI * 25; // radius = 25
        if (reloadProgressCircle) {
            reloadProgressCircle.style.strokeDasharray = circumference;
            reloadProgressCircle.style.strokeDashoffset = circumference;
        }
        
        // Animate progress
        const startTime = Date.now();
        const reloadDuration = gameData.reloadTime;
        
        const updateProgress = () => {
            if (!gameData.isReloading) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / reloadDuration, 1);
            const remaining = 1 - progress;
            
            // Update circular progress
            if (reloadProgressCircle) {
                const offset = circumference * remaining;
                reloadProgressCircle.style.strokeDashoffset = offset;
            }
            
            // Update text with percentage
            if (reloadText) {
                const percentage = Math.floor(progress * 100);
                reloadText.textContent = percentage < 100 ? percentage + '%' : '✓';
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateProgress);
            } else {
                // Reload complete
                const ammoNeeded = gameData.maxAmmo - gameData.currentAmmo;
                const ammoToReload = Math.min(ammoNeeded, gameData.reserveAmmo);
                
                gameData.currentAmmo += ammoToReload;
                gameData.reserveAmmo -= ammoToReload;
                gameData.isReloading = false;
                
                if (reloadIndicator) {
                    // Brief delay to show completion, then hide
                    setTimeout(() => {
                        reloadIndicator.style.display = 'none';
                    }, 200);
                }
                this.updateUI();
            }
        };
        
        requestAnimationFrame(updateProgress);
    }
    
    resetStats(weaponAmmoConfig = null) {
        gameData.health = gameData.maxHealth;
        gameData.totalZombiesKilled = 0;
        gameData.shotsFired = 0;
        gameData.shotsHit = 0;
        gameData.headshotKills = 0;
        gameData.currentCombo = 0;
        gameData.maxCombo = 0;
        gameData.score = 0;
        gameData.currentAmmo = gameData.maxAmmo;
        
        // Set reserve ammo based on current weapon config if provided
        if (weaponAmmoConfig) {
            const currentWeaponConfig = weaponAmmoConfig['pistol']; // Default to pistol on reset
            if (currentWeaponConfig) {
                gameData.reserveAmmo = currentWeaponConfig.reserveSize;
            }
        }
        
        gameData.isReloading = false;
    }
}

