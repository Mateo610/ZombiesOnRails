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
            startScreen.classList.add('hidden');
            setTimeout(() => {
                startScreen.style.display = 'none';
            }, 500);
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
        
        // Initialize weapon ammo for starting weapon (pistol)
        const pistolConfig = this.WEAPON_AMMO_CONFIG['pistol'];
        if (pistolConfig) {
            gameData.maxAmmo = pistolConfig.clipSize;
            gameData.currentAmmo = pistolConfig.clipSize;
            gameData.reserveAmmo = pistolConfig.reserveSize;
        }
        
        // Initialize weapon slot highlighting for starting weapon
        const currentWeapon = this.getCurrentWeaponId();
        if (currentWeapon === 'pistol') {
            this.switchCurrentWeapon('pistol');
        }
        
        this.playerManager.resetStats(this.WEAPON_AMMO_CONFIG);
        
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
        
        // Enable crosshair at game start
        if (this.crosshairManager) {
            this.crosshairManager.enable();
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
        // Clear entities
        if (zombieManager) {
            zombieManager.clearZombies();
        }
        this.powerUpManager.clear();
        
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('mission-complete').style.display = 'none';
        
        // Reset music flag so it can start again
        this.musicStarted = false;
        
        this.startGame();
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

