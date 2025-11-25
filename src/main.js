/**
 * Main Game Entry Point - Refactored
 * This is a cleaner, modular version of main.js
 */

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { GameState, gameData } from './core/GameState.js';
import { CAMERA_SCENES } from './core/SceneConfig.js';
import { Renderer } from './core/Renderer.js';
import { RenderManager } from './core/RenderManager.js';
import { SceneLoader } from './core/SceneLoader.js';
import { PowerUpManager } from './systems/PowerUpManager.js';
import { PlayerManager } from './systems/PlayerManager.js';
import ZombieManager from './enemies/ZombieManager.js';
import { updateRecoil, setRecoilWeapon } from './combat/Recoil.js';
import { initShootingSystem, updateImpactSpheres } from './combat/ShootingSystem.js';
import { initHUD, createUI, updateUI, updateFinalStats, saveLeaderboard } from './ui/HUD.js';
import { WeaponModelManager } from './weapons/WeaponModelManager.js';
import { RailMovementManager } from './systems/RailMovementManager.js';
import { CrosshairManager } from './ui/CrosshairManager.js';
import { MouseLookManager } from './systems/MouseLookManager.js';
import { SceneCameraManager } from './systems/SceneCameraManager.js';

// ============================================================================
// THREE.JS SETUP
// ============================================================================
const threeRenderer = new Renderer();
const scene = threeRenderer.scene;
const renderer = threeRenderer.renderer;
const camera = threeRenderer.camera;
const clock = threeRenderer.clock;

// ============================================================================
// MANAGERS
// ============================================================================
const sceneLoader = new SceneLoader();
const renderManager = new RenderManager(renderer, scene, camera, clock);
renderManager.setSceneLoader(sceneLoader);

let currentCameraScene = CAMERA_SCENES[0];

// Player Manager
const playerManager = new PlayerManager(
    updateUI,
    () => playerManager.resetCombo(),
    gameOver
);

// Power-Up Manager
const powerUpManager = new PowerUpManager(
    scene,
    camera,
    gameData,
    updateUI,
    showPowerUpMessage
);

// Zombie Manager
const zombieManager = new ZombieManager(
    scene,
    camera,
    gameData,
    (amount) => playerManager.damage(amount),
    () => playerManager.incrementCombo()
);

// Weapon Model Manager
const weaponModelManager = new WeaponModelManager(scene, camera);

// Rail Movement Manager
const railMovementManager = new RailMovementManager(camera, threeRenderer, gameData, GameState, clock);
railMovementManager.init(); // Initialize paths

// Set up enemy spawn callback for rail movement
railMovementManager.setEnemySpawnCallback((position, type, zombiePath) => {
    // TODO: Spawn enemy at position with type and optional path
    // This will be called automatically when the camera reaches spawn points along the path
    console.log(`🎯 Rail enemy spawn: ${type} at`, position, 'path:', zombiePath);
    // Example: zombieManager.spawnZombieAt(position, type, zombiePath);
});

/**
 * Enable free look after rail movement completes
 * Ensures camera is looking at exact SceneConfig lookAt before enabling free look
 */
function enableFreeLookAfterRailMovement() {
    if (!mouseLookManager) {
        console.error('❌ MouseLookManager not available');
        return;
    }
    
    // CRITICAL: Ensure camera is looking at exact SceneConfig lookAt before syncing free look
    // This ensures the starting direction matches what your partner intended
    if (currentCameraScene && currentCameraScene.lookAt) {
        // Reset camera up vector
        camera.up.set(0, 1, 0);
        
        // Set EXACT lookAt from SceneConfig (this is what your partner intended)
        camera.lookAt(
            currentCameraScene.lookAt.x,
            currentCameraScene.lookAt.y,
            currentCameraScene.lookAt.z
        );
        
        // Force matrix update to ensure rotation is applied
        camera.updateMatrixWorld(true);
        
        console.log('📐 Setting initial direction from SceneConfig:');
        console.log(`  Position: { x: ${camera.position.x.toFixed(2)}, y: ${camera.position.y.toFixed(2)}, z: ${camera.position.z.toFixed(2)} }`);
        console.log(`  LookAt: { x: ${currentCameraScene.lookAt.x.toFixed(2)}, y: ${currentCameraScene.lookAt.y.toFixed(2)}, z: ${currentCameraScene.lookAt.z.toFixed(2)} }`);
        console.log(`  Camera rotation: { x: ${camera.rotation.x.toFixed(4)}, y: ${camera.rotation.y.toFixed(4)}, z: ${camera.rotation.z.toFixed(4)} }`);
    }
    
    // Sync mouse look rotation with camera's exact SceneConfig direction
    mouseLookManager.updateRotationFromCamera();
    mouseLookManager.unlock();
    mouseLookManager.enable();
    
    // Clear rail movement flags after a short delay to ensure callback completes
    const FLAG_CLEAR_DELAY_MS = 100;
    setTimeout(() => {
        wasRailMovementActive = false;
        isRailMovementActive = false;
    }, FLAG_CLEAR_DELAY_MS);
}

// Set up path completion callback for zombie spawning when rail path completes
// This is only called for paths with sceneIndex (from RailPathConfig paths)
railMovementManager.setPathCompleteCallback((sceneIndex, scene) => {
    console.log(`🎬 Rail path completed - Scene ${sceneIndex + 1}: ${scene.name}`);
    
    // Update current scene
    gameData.currentScene = sceneIndex;
    currentCameraScene = scene;
    
    // Clear existing zombies and power-ups
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Spawn zombies for the new scene
    spawnSceneZombies();
    powerUpManager.spawnScenePowerUps(gameData.currentScene);
    showSceneTitle();
    
    // Set state back to gameplay
    gameData.currentState = GameState.GAMEPLAY;
    
    console.log(`✅ Scene ${sceneIndex + 1} setup complete - zombies spawned`);
    
    // Enable free look after scene setup completes
    // Use requestAnimationFrame to ensure this happens after camera is fully positioned
    requestAnimationFrame(enableFreeLookAfterRailMovement);
});

// Screen shake
let screenShakeIntensity = 0;

// Global flag to disable camera breathing/shake during rail movement
// This is checked directly in camera update functions
let isRailMovementActive = false;
let wasRailMovementActive = false; // Track previous state to detect when rail movement ends

// ============================================================================
// MOUSE LOOK MANAGER
// ============================================================================
const mouseLookManager = new MouseLookManager(camera, gameData, GameState);
mouseLookManager.init();

// ============================================================================
// SCENE CAMERA MANAGER
// ============================================================================
// Handles camera positioning and initial direction for each scene
// Provides clean integration between scene coordinates and free look system
const sceneCameraManager = new SceneCameraManager(camera, mouseLookManager);

// ============================================================================
// SHOOTING SYSTEM
// ============================================================================
initShootingSystem({
    sceneRef: scene,
    cameraRef: camera,
    gameDataRef: gameData,
    zombieManagerRef: zombieManager,
    powerUpsArrayRef: () => powerUpManager.getPowerUps(),
    reload: () => playerManager.reload(currentWeaponId),
    updateUI,
    resetCombo: () => playerManager.resetCombo(),
    createDamageNumber,
    showHeadshotIndicator,
    triggerScreenShake: () => { screenShakeIntensity = 0.02; }
});

// ============================================================================
// HUD INIT
// ============================================================================
initHUD({
    gameDataRef: gameData,
    zombieManagerRef: zombieManager,
    cameraRef: camera,
    getCurrentCameraSceneRef: () => currentCameraScene,
    GameStateRef: GameState
});

// ============================================================================
// WEAPON SYSTEM
// ============================================================================
let currentWeaponId = 'pistol';

// Weapon ammo configuration
const WEAPON_AMMO_CONFIG = {
    pistol: {
        clipSize: 11,
        reserveSize: 22 // 2 clips
    },
    shotgun: {
        clipSize: 6,
        reserveSize: 12 // 2 clips
    },
    rifle: {
        clipSize: 24,
        reserveSize: 48 // 2 clips
    }
};

function switchCurrentWeapon(id) {
    if (currentWeaponId === id) return;
    
    currentWeaponId = id;
    setRecoilWeapon(id);
    
    // Switch weapon model
    if (weaponModelManager) {
        weaponModelManager.switchWeapon(id);
    }
    
    // Update ammo values for the new weapon
    const weaponConfig = WEAPON_AMMO_CONFIG[id];
    if (weaponConfig) {
        // If switching weapons, preserve current ammo ratio or set to full
        const oldMaxAmmo = gameData.maxAmmo;
        const ammoRatio = oldMaxAmmo > 0 ? gameData.currentAmmo / oldMaxAmmo : 1;
        
        gameData.maxAmmo = weaponConfig.clipSize;
        gameData.currentAmmo = Math.round(weaponConfig.clipSize * ammoRatio);
        gameData.reserveAmmo = weaponConfig.reserveSize;
        
        // Ensure we don't exceed max ammo
        if (gameData.currentAmmo > gameData.maxAmmo) {
            gameData.currentAmmo = gameData.maxAmmo;
        }
    }
    
    const weaponLabel = {
        pistol: 'PISTOL',
        shotgun: 'SHOTGUN',
        rifle: 'RIFLE'
    }[id] || id.toUpperCase();
    
    // Weapon name display removed - weapon selection shown in slots below ammo counter
    
    // Highlight current slot
    const slot1 = document.getElementById('weapon-slot-1');
    const slot2 = document.getElementById('weapon-slot-2');
    const slot3 = document.getElementById('weapon-slot-3');
    const allSlots = [slot1, slot2, slot3];
    allSlots.forEach(slot => {
        if (!slot) return;
        slot.style.borderColor = 'rgba(255,255,255,0.3)';
        slot.style.opacity = '0.7';
        slot.style.background = 'rgba(0,0,0,0.3)';
    });
    const activeSlot = id === 'pistol' ? slot1 : id === 'shotgun' ? slot2 : slot3;
    if (activeSlot) {
        activeSlot.style.borderColor = '#999999';
        activeSlot.style.opacity = '1';
        activeSlot.style.background = 'rgba(153,153,153,0.15)';
    }
    
    const indicator = document.getElementById('weapon-switch-message');
    if (indicator) {
        indicator.textContent = `SWITCHED TO ${weaponLabel}`;
        indicator.style.opacity = '1';
        indicator.style.display = 'block';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 600);
    }
}

// ============================================================================
// CAMERA SYSTEMS
// ============================================================================
/**
 * Update camera breathing effect (subtle position/rotation sway)
 * Only applies when free look is NOT active (during transitions, locked states)
 */
function updateCameraBreathing(elapsedTime) {
    // Early returns for conditions where breathing should not apply
    if (threeRenderer.isFreeCamera) return;
    if (gameData.currentState !== GameState.GAMEPLAY) return;
    if (screenShakeIntensity > 0.001) return;
    
    // Do not override camera during rail movement
    if (isRailMovementActive || (railMovementManager?.isMoving())) {
        return;
    }
    
    // Do not modify camera during free look - position should stay at rail endpoint
    if (mouseLookManager && !mouseLookManager.isLocked) {
        return;
    }
    
    // Breathing effect constants
    const BREATH_FREQUENCY_Y = 2.0;
    const BREATH_FREQUENCY_X = 1.5;
    const SWAY_FREQUENCY_Z = 1.8;
    const BREATH_AMPLITUDE_Y = 0.005;
    const BREATH_AMPLITUDE_X = 0.003;
    const SWAY_AMPLITUDE_Z = 0.002;
    
    // Calculate breathing offsets
    const breathY = Math.sin(elapsedTime * BREATH_FREQUENCY_Y) * BREATH_AMPLITUDE_Y;
    const breathX = Math.cos(elapsedTime * BREATH_FREQUENCY_X) * BREATH_AMPLITUDE_X;
    const swayZ = Math.sin(elapsedTime * SWAY_FREQUENCY_Z) * SWAY_AMPLITUDE_Z;
    
    // Apply breathing to camera position (only when using scene position)
    if (currentCameraScene?.position) {
        camera.position.set(
            currentCameraScene.position.x + breathX,
            currentCameraScene.position.y + breathY,
            currentCameraScene.position.z
        );
    }
    
    // Apply lookAt and roll sway only when mouse look is locked
    if (mouseLookManager?.isLocked && currentCameraScene?.lookAt) {
        camera.lookAt(
            currentCameraScene.lookAt.x,
            currentCameraScene.lookAt.y,
            currentCameraScene.lookAt.z
        );
        camera.rotation.z = swayZ;
    }
}

function updateScreenShake() {
        if (screenShakeIntensity > 0) {
        // CRITICAL: Do NOT apply screen shake during rail movement
        if (isRailMovementActive || (railMovementManager && railMovementManager.isMoving())) {
            // Rail movement controls camera, ignore shake
            screenShakeIntensity *= 0.85;
            if (screenShakeIntensity < 0.001) {
                screenShakeIntensity = 0;
            }
            return;
        }
        
        const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
        const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
        
        if (!threeRenderer.isFreeCamera) {
            camera.position.x = currentCameraScene.position.x + shakeX;
            camera.position.y = currentCameraScene.position.y + shakeY;
        }
        
        screenShakeIntensity *= 0.85;
        
        if (screenShakeIntensity < 0.001) {
            screenShakeIntensity = 0;
        }
    }
}

// Expose rail movement function globally for button
function startRailMovement() {
    // Set global flag before starting movement
    isRailMovementActive = true;
    wasRailMovementActive = true;
    // Disable free look during rail movement
    sceneCameraManager.disableFreeLook();
    railMovementManager.moveToNextPath();
}
window.startRailMovement = startRailMovement;
window.isRailMovementActive = false; // Initialize global flag

// ============================================================================
// RENDER MANAGER UPDATE CALLBACKS
// ============================================================================
    renderManager.setUpdateCallbacks({
        tween: () => {
            // Update rail movement (now uses manual interpolation, not TWEEN)
            railMovementManager.update();
            // Still update TWEEN for any other tweens in the system
            TWEEN.update();
        }, // Rail movement updates here - MUST be before camera updates
    freeCamera: {
        enabled: false,
        update: () => threeRenderer.controls.update()
    },
    gameplay: [
        (deltaTime) => {
            if (gameData.currentState === GameState.GAMEPLAY) {
                zombieManager.update(
                    deltaTime,
                    gameData.slowMoActive,
                    gameData.currentState,
                    GameState.GAMEPLAY,
                    onSceneCleared
                );
                playerManager.updateComboTimer(deltaTime);
                powerUpManager.update(deltaTime);
                powerUpManager.updateTimers(deltaTime);
                gameData.currentTime = (Date.now() - gameData.startTime) / 1000;
                updateUI();
            }
        }
    ],
    camera: [
        // IMPORTANT: These run AFTER tween updates, but check railMovementManager.isMoving()
        // to prevent overriding the rail movement camera position
        // Camera position updates first (breathing, shake)
        (elapsedTime) => updateCameraBreathing(elapsedTime),
        () => updateScreenShake(),
        // Mouse look rotation (runs after position updates, before recoil)
        (elapsedTime, deltaTime) => {
            if (mouseLookManager && !threeRenderer.isFreeCamera) {
                // Check rail movement status from both local flag and manager
                const isRailActive = isRailMovementActive || (railMovementManager && railMovementManager.isMoving());
                
                // Track rail movement state (callback handles enabling free look)
                if (isRailActive) {
                    wasRailMovementActive = true;
                }
                
                // Update mouse look if not locked and not in rail movement
                // The callback will enable free look after rail movement completes
                if (!isRailActive) {
                    mouseLookManager.update(deltaTime);
                }
            }
        },
        // Recoil modifies rotation after mouse look
        (elapsedTime, deltaTime) => updateRecoil(deltaTime, camera, threeRenderer.BASE_FOV),
        (elapsedTime, deltaTime) => {
            // Update weapon models to follow camera
            if (weaponModelManager) {
                weaponModelManager.update(deltaTime);
            }
        },
        // CRITICAL: Run rail movement safety check LAST to ensure camera position is correct
        // This runs after all other camera updates to fix any overrides
        // MUST be the absolute last callback to always win
        () => {
            if (railMovementManager && railMovementManager.isMoving()) {
                // Force camera position update from spline (safety check)
                // This ALWAYS overrides anything else that modified camera position
                railMovementManager.forceCameraUpdate();
            }
        }
    ],
    ui: [
        (deltaTime) => {
            // Update crosshair position (smooth interpolation)
            if (crosshairManager && gameData.currentState === GameState.GAMEPLAY) {
                crosshairManager.update(deltaTime);
            }
        },
        () => powerUpManager.updateUI(),
        (deltaTime) => {
            // Update impact spheres (fade out and scale up)
            if (gameData.currentState === GameState.GAMEPLAY) {
                updateImpactSpheres(deltaTime);
            }
        }
    ]
});

// ============================================================================
// SCENE MANAGEMENT
// ============================================================================
let factorySceneLoaded = false;
let warehouseLoaded = false;
let isFirstGameStart = true;

function spawnSceneZombies() {
    console.log(`🎬 Spawning zombies for Scene ${gameData.currentScene + 1}: ${currentCameraScene.name}`);
    zombieManager.spawnSceneZombies(currentCameraScene.spawnPoints);
    updateUI();
}

function onSceneCleared() {
    console.log(`✅ Scene ${gameData.currentScene + 1} cleared!`);
    
    // Check if this is the last scene (Scene 3, index 2 - Warehouse Interior is index 3)
    if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
        completeMission();
        return;
    }
    
    // For scene 2 (index 2, which is Scene 3), load warehouse before transitioning
    if (gameData.currentScene === 2 && !warehouseLoaded) {
        console.log('🚪 Scene 3 cleared! Loading warehouse interior...');
        loadWarehouseInterior(() => {
            // After warehouse loads, transition to warehouse interior using rail movement
            advanceToNextSceneWithRail();
        });
        return;
    }
    
    // For all other scenes, use rail movement to transition
    advanceToNextSceneWithRail();
}

/**
 * Advance to next scene using rail movement
 */
function advanceToNextSceneWithRail() {
    // Check if there's a next scene available
    if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
        console.log('⚠️ No next scene available');
        return;
    }
    
    // Set transition state
    gameData.currentState = GameState.SCENE_TRANSITION;
    console.log(`🎥 Advancing from Scene ${gameData.currentScene + 1} to Scene ${gameData.currentScene + 2} using rail movement...`);
    
    // Get the next scene
    const nextSceneIndex = gameData.currentScene + 1;
    const nextScene = CAMERA_SCENES[nextSceneIndex];
    
    if (!nextScene) {
        console.error('❌ Next scene not found at index:', nextSceneIndex);
        gameData.currentState = GameState.GAMEPLAY;
        return;
    }
    
    // Clear zombies and power-ups before transition
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Start rail movement to exact scene position
    const movementStarted = railMovementManager.moveToScenePosition(nextScene, () => {
        // Callback fired when movement completes
        console.log('✅ Rail movement to scene complete');
        
        // Update scene index and current camera scene
        gameData.currentScene = nextSceneIndex;
        currentCameraScene = nextScene;
        
        // Verify camera position matches exactly
        const expectedPos = nextScene.position;
        const actualPos = camera.position;
        const posMatch = Math.abs(actualPos.x - expectedPos.x) < 0.001 &&
                        Math.abs(actualPos.y - expectedPos.y) < 0.001 &&
                        Math.abs(actualPos.z - expectedPos.z) < 0.001;
        
        console.log('🔍 Position verification:');
        console.log(`  Expected: { x: ${expectedPos.x.toFixed(3)}, y: ${expectedPos.y.toFixed(3)}, z: ${expectedPos.z.toFixed(3)} }`);
        console.log(`  Actual:   { x: ${actualPos.x.toFixed(3)}, y: ${actualPos.y.toFixed(3)}, z: ${actualPos.z.toFixed(3)} }`);
        console.log(`  Match: ${posMatch ? '✅ YES' : '❌ NO'}`);
        
        // Spawn zombies and power-ups for new scene
        spawnSceneZombies();
        powerUpManager.spawnScenePowerUps(gameData.currentScene);
        showSceneTitle();
        
        // Set state back to gameplay
        gameData.currentState = GameState.GAMEPLAY;
        
        // Enable free look after scene setup completes
        // Use requestAnimationFrame to ensure this happens after camera is fully positioned
        requestAnimationFrame(enableFreeLookAfterRailMovement);
    });
    
    if (!movementStarted) {
        console.error('❌ Failed to start rail movement to scene');
        gameData.currentState = GameState.GAMEPLAY;
    }
}

function transitionToNextScene() {
    gameData.currentState = GameState.SCENE_TRANSITION;
    console.log('🎥 Transitioning to next scene...');
    
    gameData.currentScene++;
    currentCameraScene = CAMERA_SCENES[gameData.currentScene];

    zombieManager.clearZombies();
    powerUpManager.clear();

    // Camera start/end
    // Convert plain objects to THREE.Vector3 (they're {x, y, z} objects, not Vector3 instances)
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(
        currentCameraScene.position.x,
        currentCameraScene.position.y,
        currentCameraScene.position.z
    );

    const startLookAt = camera.getWorldDirection(new THREE.Vector3()).add(camera.position);
    const endLookAt = new THREE.Vector3(
        currentCameraScene.lookAt.x,
        currentCameraScene.lookAt.y,
        currentCameraScene.lookAt.z
    );

    // Temporarily disable camera overrides during transition
    const prevScreenShake = screenShakeIntensity;
    screenShakeIntensity = 0;

    const tweenPos = new TWEEN.Tween(startPos)
        .to(endPos, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            camera.position.copy(startPos);
        })
        .start();

    const tweenLookAt = new TWEEN.Tween(startLookAt)
        .to(endLookAt, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            camera.up.set(0, 1, 0); // ADD THIS LINE
            camera.lookAt(startLookAt);
        })
        .onComplete(() => {
            // Camera is now at the new scene position
            // Set initial direction and enable free look using SceneCameraManager
            // This ensures camera faces zombies (from lookAt) then enables free look
            sceneCameraManager.setSceneCamera(currentCameraScene);
            
            gameData.currentState = GameState.GAMEPLAY;
            screenShakeIntensity = prevScreenShake; // restore shake
            spawnSceneZombies();
            powerUpManager.spawnScenePowerUps(gameData.currentScene);
            showSceneTitle();
        })
        .start();
}

/**
 * Advance to next scene using rail movement system
 * Uses RailMovementManager to smoothly animate camera, then snaps to exact SceneConfig position
 * This is the global function that can be called manually
 */
function advanceToNextScene() {
    return advanceToNextSceneWithRail();
}

// Expose advanceToNextScene globally
window.advanceToNextScene = advanceToNextScene;

function showSceneTitle() {
    const title = document.createElement('div');
    title.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Courier New', monospace;
        font-size: 48px;
        color: #ffff00;
        text-shadow: 0 0 20px #ffff00, 4px 4px 8px #000;
        z-index: 200;
        animation: fadeInOut 3s;
    `;
    // Format scene title: if scene name is just a number, show "SCENE X", otherwise show "SCENE X: NAME"
    const sceneNumber = gameData.currentScene + 1;
    const sceneName = currentCameraScene.name;
    // Check if scene name is just a number (like "1", "2", "3")
    const isNumericName = /^\d+$/.test(sceneName);
    title.textContent = isNumericName 
        ? `SCENE ${sceneNumber}` 
        : `SCENE ${sceneNumber}: ${sceneName.toUpperCase()}`;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            20%, 80% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(title);
    
    setTimeout(() => {
        title.remove();
        style.remove();
    }, 3000);
}

// ============================================================================
// GAME FLOW
// ============================================================================
function startGame() {
    console.log('🚀 Starting Game');
    
    const startPrompt = document.getElementById('start-prompt');
    if (startPrompt) {
        startPrompt.classList.remove('visible');
    }
    
    gameData.gameStarted = true;
    gameData.currentScene = 0;
    
    // Initialize weapon ammo for starting weapon (pistol)
    const pistolConfig = WEAPON_AMMO_CONFIG['pistol'];
    if (pistolConfig) {
        gameData.maxAmmo = pistolConfig.clipSize;
        gameData.currentAmmo = pistolConfig.clipSize;
        gameData.reserveAmmo = pistolConfig.reserveSize;
    }
    
    playerManager.resetStats(WEAPON_AMMO_CONFIG);
    
    // Reset power-ups
    powerUpManager.clear();
    gameData.doubleDamageActive = false;
    gameData.doubleDamageTimer = 0;
    gameData.slowMoActive = false;
    gameData.slowMoTimer = 0;
    gameData.startTime = Date.now();
    
// Camera setup - ALWAYS reset to exact scene position on game start
// This must happen BEFORE setting game state to GAMEPLAY to prevent camera breathing from overriding
currentCameraScene = CAMERA_SCENES[0];

// Reset rail movement state
railMovementManager.reset();

// Set camera position and initial direction from scene config, then enable free look
// This uses SceneCameraManager which handles everything cleanly and modularly
sceneCameraManager.setSceneCamera(currentCameraScene);
    
    // Now set game state to GAMEPLAY after camera is positioned
    gameData.currentState = GameState.GAMEPLAY;
    
    // Show weapon models when game starts
    if (weaponModelManager) {
        weaponModelManager.showWeapons();
        // Ensure current weapon is set
        weaponModelManager.switchWeapon(currentWeaponId);
    }
    
    // Disable free camera by default (can be re-enabled later if needed)
    threeRenderer.isFreeCamera = false;
    threeRenderer.controls.enabled = false;
    renderManager.updateCallbacks.freeCamera.enabled = false;
    
    // Spawn entities
    if (factorySceneLoaded || gameData.currentScene > 0) {
        spawnSceneZombies();
        powerUpManager.spawnScenePowerUps(gameData.currentScene);
        if (!isFirstGameStart) {
            showSceneTitle();
        }
        isFirstGameStart = false;
        updateUI();
    }
}

function restartGame() {
    console.log('🔄 Restarting Game');
    zombieManager.clearZombies();
    powerUpManager.clear();
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('mission-complete').style.display = 'none';
    startGame();
}

function gameOver() {
    gameData.currentState = GameState.GAME_OVER;
    console.log('💀 GAME OVER');
    document.getElementById('game-over-screen').style.display = 'flex';
    updateFinalStats();
    saveLeaderboard();
}

function completeMission() {
    gameData.currentState = GameState.MISSION_COMPLETE;
    console.log('🎉 MISSION COMPLETE!');
    setTimeout(() => {
        document.getElementById('mission-complete').style.display = 'flex';
        updateFinalStats();
        saveLeaderboard();
    }, 2000);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function showPowerUpMessage(text) {
    const msgEl = document.getElementById('powerup-message');
    if (!msgEl) return;
    
    msgEl.textContent = text;
    msgEl.style.display = 'block';
    msgEl.dataset.visible = 'true';
    
    setTimeout(() => {
        msgEl.style.display = 'none';
        delete msgEl.dataset.visible;
    }, 1500);
}

function showHeadshotIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Courier New', monospace;
        font-size: 64px;
        color: #ff0000;
        text-shadow: 0 0 30px #ff0000, 4px 4px 8px #000;
        z-index: 999;
        animation: popIn 0.5s;
        pointer-events: none;
    `;
    indicator.textContent = 'HEADSHOT!';
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes popIn {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
        style.remove();
    }, 500);
}

function createDamageNumber(position, damage, isHeadshot) {
    const vector = position.clone();
    vector.project(camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    
    const damageDiv = document.createElement('div');
    damageDiv.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-family: 'Courier New', monospace;
        font-size: ${isHeadshot ? '48px' : '32px'};
        font-weight: bold;
        color: ${isHeadshot ? '#ffff00' : '#ff0000'};
        text-shadow: 0 0 ${isHeadshot ? '20px' : '10px'} ${isHeadshot ? '#ffff00' : '#ff0000'}, 2px 2px 4px #000;
        pointer-events: none;
        z-index: 999;
        animation: floatUp 1s ease-out forwards;
    `;
    damageDiv.textContent = `-${damage}${isHeadshot ? ' 💀' : ''}`;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-50px); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(damageDiv);
    
    setTimeout(() => {
        damageDiv.remove();
        style.remove();
    }, 1000);
}

async function loadWarehouseInterior(onComplete) {
    if (warehouseLoaded) {
        if (onComplete) onComplete();
        return;
    }
    
    warehouseLoaded = true;
    
    await sceneLoader.loadWarehouseInterior(scene, (warehouseModel) => {
        if (warehouseModel) {
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-family: 'Courier New', monospace;
                font-size: 36px;
                color: #ffff00;
                text-shadow: 0 0 20px #ffff00, 4px 4px 8px #000;
                z-index: 200;
                pointer-events: none;
            `;
            message.textContent = 'WAREHOUSE ACCESSED';
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
                if (onComplete) onComplete();
            }, 2000);
        } else {
            if (onComplete) onComplete();
        }
    });
}

// ============================================================================
// INPUT HANDLERS
// ============================================================================
import { shoot as shootWeapon } from './combat/ShootingSystem.js';

window.addEventListener('click', (event) => {
    // Use CrosshairManager's tracked mouse position instead of click position
    // This ensures shooting accuracy matches where the crosshair is pointing
    const mousePos = crosshairManager.getNormalizedMousePosition();
    shootWeapon(mousePos.x, mousePos.y, currentWeaponId);
});

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    switch(key) {
        case 'r':
            if (gameData.currentState === GameState.GAME_OVER || 
                gameData.currentState === GameState.MISSION_COMPLETE) {
                restartGame();
            } else if (gameData.currentState === GameState.GAMEPLAY) {
                playerManager.reload(currentWeaponId);
            }
            break;
            
        case ' ':
            if (gameData.currentState === GameState.LOADING && renderManager.isReady()) {
                startGame();
            }
            break;
            
        case 'c':
            const isFree = threeRenderer.toggleFreeCamera();
            renderManager.updateCallbacks.freeCamera.enabled = isFree;
            if (!isFree) {
                camera.position.set(
                    currentCameraScene.position.x,
                    currentCameraScene.position.y,
                    currentCameraScene.position.z
                );
                camera.lookAt(
                    currentCameraScene.lookAt.x,
                    currentCameraScene.lookAt.y,
                    currentCameraScene.lookAt.z
                );
            }
            break;
            
        case 'h':
            threeRenderer.toggleAxesHelper();
            break;
        
        case '1':
            switchCurrentWeapon('pistol');
            break;
        case '2':
            switchCurrentWeapon('shotgun');
            break;
        case '3':
            switchCurrentWeapon('rifle');
            break;
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================
createUI();

// ============================================================================
// CROSSHAIR MANAGER
// ============================================================================
const crosshairManager = new CrosshairManager();
crosshairManager.init('crosshair');

// Load factory scene on startup
sceneLoader.loadFactoryScene(scene, (factoryModel) => {
    if (factoryModel) {
        // Find ground mesh
        factoryModel.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                const matName = child.material?.name?.toLowerCase() || '';
                if (name.includes('ground') || name.includes('floor') || 
                    matName.includes('ground') || matName.includes('floor')) {
                    child.name = 'ground';
                    child.receiveShadow = true;
                    threeRenderer.setGround(child);
                    console.log('✅ Found ground mesh:', child.name);
                }
            }
        });
        
        // Fallback ground if none found
        if (!threeRenderer.getGround()) {
            console.log('⚠️ No ground found, creating fallback');
            const groundGeo = new THREE.PlaneGeometry(200, 200);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
            const fallbackGround = new THREE.Mesh(groundGeo, groundMat);
            fallbackGround.name = 'ground';
            fallbackGround.rotation.x = -Math.PI / 2;
            fallbackGround.position.y = -0.1;
            fallbackGround.receiveShadow = true;
            threeRenderer.setGround(fallbackGround);
        }
        
        factorySceneLoaded = true;
        console.log('✅ Warehouse exterior (factory scene) ready');
        
        if (!gameData.gameStarted) {
            currentCameraScene = CAMERA_SCENES[0];
            // Pre-render setup: ensure scene is ready before showing
            renderManager.prepareSceneForDisplay();
        }
    } else {
        // Fallback ground on load failure
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
        const fallbackGround = new THREE.Mesh(groundGeo, groundMat);
        fallbackGround.name = 'ground';
        fallbackGround.rotation.x = -Math.PI / 2;
        fallbackGround.position.y = -0.1;
        fallbackGround.receiveShadow = true;
        threeRenderer.setGround(fallbackGround);
        
        factorySceneLoaded = true;
        if (!gameData.gameStarted) {
            currentCameraScene = CAMERA_SCENES[0];
            renderManager.prepareSceneForDisplay();
        }
    }
});

// Preload warehouse
sceneLoader.loadWarehouseInterior(scene, () => {
    console.log('✅ Warehouse preloaded');
});

console.log('✅ Game Initialized');
console.log('Controls:');
console.log('  SPACE - Start Game');
console.log('  Click - Shoot');
console.log('  R - Reload / Restart');
console.log('  C - Toggle Camera');
console.log('  H - Toggle Helpers');

// Note: Scene pre-rendering happens before revealing to ensure renderer readiness
// This prevents startup glitch by ensuring textures are uploaded to GPU first

