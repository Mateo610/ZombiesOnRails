import { gameData } from '../core/GameState.js';
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
        // God mode - no damage taken (development only)
        if (gameData.godMode) {
            console.log(`🛡️ God mode active - damage blocked (${amount} damage)`);
            return;
        }
        
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
    
    reload(weaponId = 'pistol') {
        if (gameData.isReloading) return;
        
        // Use per-weapon ammo storage
        const weaponAmmo = gameData.weaponAmmo[weaponId];
        if (!weaponAmmo) return;
        if (weaponAmmo.current === weaponAmmo.max) return;
        if (weaponAmmo.reserve === 0) return;
        
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
                // Reload complete - update per-weapon ammo storage
                const ammoNeeded = weaponAmmo.max - weaponAmmo.current;
                const ammoToReload = Math.min(ammoNeeded, weaponAmmo.reserve);
                
                weaponAmmo.current += ammoToReload;
                weaponAmmo.reserve -= ammoToReload;
                
                // Sync legacy properties for UI compatibility
                gameData.currentAmmo = weaponAmmo.current;
                gameData.maxAmmo = weaponAmmo.max;
                gameData.reserveAmmo = weaponAmmo.reserve;
                
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
        
        // Reset ammo for all weapons
        if (weaponAmmoConfig) {
            Object.keys(weaponAmmoConfig).forEach(weaponId => {
                const config = weaponAmmoConfig[weaponId];
                if (config && gameData.weaponAmmo[weaponId]) {
                    gameData.weaponAmmo[weaponId].max = config.clipSize;
                    gameData.weaponAmmo[weaponId].current = config.clipSize;
                    gameData.weaponAmmo[weaponId].reserve = config.reserveSize;
                }
            });
        }
        
        // Sync legacy properties for starting weapon (pistol)
        if (gameData.weaponAmmo['pistol']) {
            gameData.maxAmmo = gameData.weaponAmmo['pistol'].max;
            gameData.currentAmmo = gameData.weaponAmmo['pistol'].current;
            gameData.reserveAmmo = gameData.weaponAmmo['pistol'].reserve;
        }
        
        gameData.isReloading = false;
    }
}

