/**
 * Game Flow Manager
 * Handles game flow functions like start, restart, game over, and mission complete
 */

import { GameState, gameData } from '../core/GameState.js';
import { CAMERA_SCENES } from '../core/SceneConfig.js';
// WEAPON_AMMO_CONFIG is defined in main.js, will be passed as parameter

export class GameFlowManager {
    constructor({
        sceneLoader,
        threeRenderer,
        renderManager,
        playerManager,
        powerUpManager,
        weaponModelManager,
        railMovementManager,
        sceneCameraManager,
        crosshairManager,
        soundManager,
        updateUI,
        showSceneTitle,
        spawnSceneZombies,
        factorySceneLoaded,
        currentWeaponId,
        switchCurrentWeapon,
        onCompleteMission,
        WEAPON_AMMO_CONFIG  // Pass as parameter instead of importing
    }) {
        this.sceneLoader = sceneLoader;
        this.threeRenderer = threeRenderer;
        this.renderManager = renderManager;
        this.playerManager = playerManager;
        this.powerUpManager = powerUpManager;
        this.weaponModelManager = weaponModelManager;
        this.railMovementManager = railMovementManager;
        this.sceneCameraManager = sceneCameraManager;
        this.crosshairManager = crosshairManager;
        this.soundManager = soundManager;
        this.updateUI = updateUI;
        this.showSceneTitle = showSceneTitle;
        this.spawnSceneZombies = spawnSceneZombies;
        // factorySceneLoaded and currentWeaponId can be functions (getters) or values
        this.factorySceneLoaded = typeof factorySceneLoaded === 'function' ? factorySceneLoaded : () => factorySceneLoaded;
        this.currentWeaponId = typeof currentWeaponId === 'function' ? currentWeaponId() : currentWeaponId;
        this.getCurrentWeaponId = typeof currentWeaponId === 'function' ? currentWeaponId : () => currentWeaponId;
        this.switchCurrentWeapon = switchCurrentWeapon;
        this.onCompleteMission = onCompleteMission;
        this.WEAPON_AMMO_CONFIG = WEAPON_AMMO_CONFIG;
        this.showGameUI = null; // Will be set by caller
        
        this.isFirstGameStart = true;
        this.musicStarted = false;
    }
    
    /**
     * Set the showGameUI function
     */
    setShowGameUI(showGameUIFn) {
        this.showGameUI = showGameUIFn;
    }
    
    /**
     * Start the game
     */
    startGame() {
        // Prevent multiple calls
        if (gameData.gameStarted) {
            console.warn('⚠️ Game already started, ignoring startGame() call');
            return;
        }
        
        console.log('🚀 Starting Game');
        
        // Validate critical dependencies
        if (!this.sceneLoader) {
            console.error('❌ SceneLoader not available, cannot start game');
            return;
        }
        
        if (!this.playerManager) {
            console.error('❌ PlayerManager not available, cannot start game');
            return;
        }
        
        // Hide start screen if it exists
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            // Restore main game canvas immediately (before hiding start screen)
            if (this.threeRenderer && this.threeRenderer.renderer && this.threeRenderer.renderer.domElement) {
                const canvas = this.threeRenderer.renderer.domElement;
                canvas.style.opacity = '1';
                canvas.style.visibility = 'visible';
                canvas.style.zIndex = 'auto';
                canvas.style.pointerEvents = 'auto';
                canvas.classList.add('visible');
                console.log('✅ Main game canvas restored');
            }
            
            startScreen.classList.add('hidden');
            setTimeout(() => {
                startScreen.style.display = 'none';
                // Dispose of 3D start screen scene (handled by inline script)
                if (window.disposeStartScreenScene) {
                    window.disposeStartScreenScene();
                }
            }, 500);
        } else {
            // If no start screen, ensure canvas is visible
            if (this.threeRenderer && this.threeRenderer.renderer && this.threeRenderer.renderer.domElement) {
                const canvas = this.threeRenderer.renderer.domElement;
                canvas.style.opacity = '1';
                canvas.style.visibility = 'visible';
                canvas.style.zIndex = 'auto';
                canvas.style.pointerEvents = 'auto';
                canvas.classList.add('visible');
            }
        }
        
        // Show game UI elements
        if (this.showGameUI) {
            this.showGameUI();
        }
        
        // Start in normal mode (factory exterior, scene 0)
        // Show factory exterior, hide warehouse
        if (this.sceneLoader.currentSceneModel) {
            this.sceneLoader.currentSceneModel.visible = true;
        }
        if (this.sceneLoader.warehouseModel) {
            this.sceneLoader.warehouseModel.visible = false;
        }
        
        // Set to first scene (index 0)
        gameData.currentScene = 0;
        const currentCameraScene = CAMERA_SCENES[0];
        // Note: The global currentCameraScene in main.js should be updated by the caller if needed
        
        // Mark game as started early to prevent race conditions
        gameData.gameStarted = true;
        
        // Reset stats first (this will initialize all weapon ammo)
        this.playerManager.resetStats(this.WEAPON_AMMO_CONFIG);
        
        // Initialize weapon slot highlighting for starting weapon
        // This will also sync the legacy ammo properties for the current weapon
        const currentWeapon = this.getCurrentWeaponId();
        if (currentWeapon === 'pistol') {
            this.switchCurrentWeapon('pistol');
        }
        
        // Reset power-ups
        this.powerUpManager.clear();
        gameData.doubleDamageActive = false;
        gameData.doubleDamageTimer = 0;
        gameData.slowMoActive = false;
        gameData.slowMoTimer = 0;
        gameData.startTime = Date.now();
        
        // Camera setup - ALWAYS reset to exact scene position on game start
        // Reset rail movement state
        this.railMovementManager.reset();
        
        // Set camera position and initial direction from scene config, then enable free look
        this.sceneCameraManager.setSceneCamera(currentCameraScene);
        
        // Now set game state to GAMEPLAY after camera is positioned
        gameData.currentState = GameState.GAMEPLAY;
        
        // Show weapon models when game starts
        if (this.weaponModelManager) {
            this.weaponModelManager.showWeapons();
            // Ensure current weapon is set
            this.weaponModelManager.switchWeapon(this.getCurrentWeaponId());
        }
        
        // Disable free camera by default
        this.threeRenderer.isFreeCamera = false;
        this.threeRenderer.controls.enabled = false;
        this.renderManager.updateCallbacks.freeCamera.enabled = false;
        
        // Enable crosshair at game start and center it
        if (this.crosshairManager) {
            this.crosshairManager.enable();
            this.crosshairManager.center(); // Reset crosshair to center at game start
            if (this.crosshairManager.crosshairElement) {
                this.crosshairManager.crosshairElement.style.display = 'block';
            }
        }
        
        // Start background music (main theme) - only if not already playing
        if (this.soundManager && !this.soundManager.isMusicPlaying) {
            this.soundManager.playMainMusic();
        }
        
        // Spawn entities
        // Check if factory scene is loaded OR if we're past the first scene
        const factoryLoaded = this.factorySceneLoaded();
        if (factoryLoaded || gameData.currentScene > 0) {
            this.spawnSceneZombies();
            this.powerUpManager.spawnScenePowerUps(gameData.currentScene);
            if (!this.isFirstGameStart) {
                this.showSceneTitle(gameData, CAMERA_SCENES);
            }
            this.isFirstGameStart = false;
            this.updateUI();
        }
    }
    
    /**
     * Restart the game
     */
    restartGame(zombieManager) {
        console.log('🔄 Restarting Game');
        
        // Wait for death animations to finish before restarting
        if (zombieManager && zombieManager.hasAnimatingDeaths()) {
            console.log('⏳ Waiting for death animations before restarting...');
            zombieManager.waitForDeathAnimations(() => {
                this._doRestart(zombieManager);
            });
        } else {
            // No animations, restart immediately
            this._doRestart(zombieManager);
        }
    }
    
    /**
     * Internal method to perform the actual restart
     * @private
     */
    _doRestart(zombieManager) {
        console.log('🔄 Resetting to main menu...');
        
        // Clear entities
        if (zombieManager) {
            zombieManager.clearZombies(true); // Force clear since we already waited
        }
        this.powerUpManager.clear();
        
        // Hide game over and mission complete screens
        const gameOverScreen = document.getElementById('game-over-screen');
        const missionCompleteScreen = document.getElementById('mission-complete');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        if (missionCompleteScreen) missionCompleteScreen.style.display = 'none';
        
        // Hide game UI elements
        const hudLeft = document.getElementById('hud-left');
        const powerupIndicators = document.getElementById('powerup-indicators');
        const ammoDisplay = document.getElementById('ammo-display');
        const healthHearts = document.getElementById('health-hearts');
        const settingsBtn = document.getElementById('settings-btn');
        const crosshair = this.crosshairManager?.crosshairElement;
        
        if (hudLeft) hudLeft.style.display = 'none';
        if (powerupIndicators) powerupIndicators.style.display = 'none';
        if (ammoDisplay) ammoDisplay.style.display = 'none';
        if (healthHearts) healthHearts.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';
        if (crosshair) crosshair.style.display = 'none';
        
        // Stop music
        if (this.soundManager) {
            this.soundManager.stopMusic();
        }
        
        // Reset music flag
        this.musicStarted = false;
        
        // Reset game state flags
        gameData.gameStarted = false;
        gameData.currentState = GameState.LOADING;
        gameData.currentScene = 0;
        
        // Reset transition flag
        if (window.resetTransitionFlag) {
            window.resetTransitionFlag();
        }
        
        // Reset rail movement
        if (this.railMovementManager) {
            this.railMovementManager.reset();
        }
        
        // Reset camera to initial position (first scene)
        const firstScene = CAMERA_SCENES[0];
        if (firstScene) {
            // Update global currentCameraScene
            if (window.setCurrentCameraScene) {
                window.setCurrentCameraScene(firstScene);
            }
            // Set camera position
            if (this.sceneCameraManager) {
                this.sceneCameraManager.setSceneCamera(firstScene);
            }
        }
        
        // Reset scene visibility - show factory exterior, hide warehouse
        if (this.sceneLoader.currentSceneModel) {
            this.sceneLoader.currentSceneModel.visible = true;
        }
        if (this.sceneLoader.warehouseModel) {
            this.sceneLoader.warehouseModel.visible = false;
        }
        
        // Hide weapon models
        if (this.weaponModelManager) {
            this.weaponModelManager.hideWeapons();
        }
        
        // Disable free camera
        this.threeRenderer.isFreeCamera = false;
        this.threeRenderer.controls.enabled = false;
        this.renderManager.updateCallbacks.freeCamera.enabled = false;
        
        // Reset first game start flag so scene title shows on next start
        this.isFirstGameStart = true;
        
        // Show start screen
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'flex';
            startScreen.classList.remove('hidden');
            
            // Reset start screen UI elements
            const playButton = document.getElementById('play-button');
            const difficultySelector = document.getElementById('difficulty-selector');
            const confirmButton = document.getElementById('confirm-button');
            
            if (playButton) playButton.style.display = 'block';
            if (difficultySelector) difficultySelector.classList.remove('visible');
            if (confirmButton) {
                confirmButton.classList.remove('visible');
                confirmButton.style.pointerEvents = 'auto';
                confirmButton.style.opacity = '1';
                // Reset the isStarting flag so button can be clicked again
                confirmButton.dataset.isStarting = 'false';
            }
        }
        
        console.log('✅ Reset to main menu - ready for new game');
    }
    
    /**
     * Handle game over
     */
    gameOver(updateFinalStats, saveLeaderboard) {
        gameData.currentState = GameState.GAME_OVER;
        console.log('💀 GAME OVER');
        
        // Stop background music
        if (this.soundManager) {
            this.soundManager.stopMusic();
        }
        
        document.getElementById('game-over-screen').style.display = 'flex';
        updateFinalStats();
        saveLeaderboard();
    }
    
    /**
     * Complete the mission
     */
    completeMission(updateFinalStats, saveLeaderboard) {
        gameData.currentState = GameState.MISSION_COMPLETE;
        console.log('🎉 MISSION COMPLETE!');
        
        // Stop background music
        if (this.soundManager) {
            this.soundManager.stopMusic();
        }
        
        setTimeout(() => {
            document.getElementById('mission-complete').style.display = 'flex';
            updateFinalStats();
            saveLeaderboard();
        }, 2000);
    }
    
    /**
     * Start music on first user interaction
     */
    startMusicOnInteraction() {
        if (!this.musicStarted && this.soundManager && !this.soundManager.isMusicPlaying) {
            this.soundManager.playMainMusic();
            this.musicStarted = true;
        }
    }
}

