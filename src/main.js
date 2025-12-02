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
import { initHUD, createUI, updateUI, updateFinalStats, saveLeaderboard, showGameUI } from './ui/HUD.js';
import { WeaponModelManager } from './weapons/WeaponModelManager.js';
import { RailMovementManager } from './systems/RailMovementManager.js';
import { CrosshairManager } from './ui/CrosshairManager.js';
import { MouseLookManager } from './systems/MouseLookManager.js';
import { SceneCameraManager } from './systems/SceneCameraManager.js';
import { PostProcessingManager } from './systems/PostProcessingManager.js';
import { soundManager } from './systems/SoundManager.js';
import { SceneTransitionManager } from './systems/SceneTransitionManager.js';
import { UIEffectsManager } from './ui/UIEffectsManager.js';
import { CameraEffectsManager } from './systems/CameraEffectsManager.js';
import { GameFlowManager } from './systems/GameFlowManager.js';
import { SceneSetupManager } from './systems/SceneSetupManager.js';

// ============================================================================
// THREE.JS SETUP
// ============================================================================
const threeRenderer = new Renderer();
const scene = threeRenderer.scene;
const renderer = threeRenderer.renderer;
const camera = threeRenderer.camera;
const clock = threeRenderer.clock;

// Post-processing manager
let postProcessingManager;

// ============================================================================
// MANAGERS
// ============================================================================
const sceneLoader = new SceneLoader();
const renderManager = new RenderManager(renderer, scene, camera, clock);
renderManager.setSceneLoader(sceneLoader);

// Setup post-processing after renderer is ready
postProcessingManager = new PostProcessingManager(renderer, scene, camera);
renderManager.setComposer(
    postProcessingManager.getComposer(), 
    () => postProcessingManager.isEnabled()
);

// Setup resize handler (must be after renderManager and postProcessingManager are created)
threeRenderer.setupResizeHandler(renderManager);

let currentCameraScene = CAMERA_SCENES[0];

// Scene index constants for clarity
const SCENE_INDICES = {
    FRONT_OF_DOOR_PIVOT: 5,      // Scene 6 - triggers interior transition
    WAREHOUSE_INTERIOR: 6,        // Scene 7 - first interior scene
    WAREHOUSE_INTERIOR_FINAL: 7,  // Scene 8 - final interior scene
    INTERIOR_START: 6             // First interior scene index
};

// Forward declarations for managers referenced before initialization
let mouseLookManager;
let sceneCameraManager;
let crosshairManager;
let uiEffectsManager;
let sceneTransitionManager;
let gameFlowManager;
let warehouseLoaded = false;

// Rail movement flags managed by SceneTransitionManager
let isRailMovementActive = false;

// Transition guard
let isTransitioning = false;

// Player Manager - gameOver will be defined later
// Use a callback variable that will be updated when gameOver is defined
let gameOverCallback = () => {
    console.warn('gameOver callback not yet initialized');
};
const playerManager = new PlayerManager(
    updateUI,
    () => playerManager.resetCombo(),
    () => gameOverCallback()
);

// Power-Up Manager - will be reinitialized after uiEffectsManager is available
// Temporary initialization with placeholder callback
let powerUpManager = new PowerUpManager(
    scene,
    camera,
    gameData,
    updateUI,
    (text) => {
        // Placeholder - will be replaced when uiEffectsManager is available
        console.log('Power-up message:', text);
    }
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

// ============================================================================
// SCENE SETUP MANAGER
// ============================================================================
// Will be initialized after SCENE_INDICES is defined
let sceneSetupManager;

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
        if (sceneTransitionManager) {
            sceneTransitionManager.setWasRailMovementActive(false);
            sceneTransitionManager.setRailMovementActive(false);
        } else {
            isRailMovementActive = false;
        }
    }, FLAG_CLEAR_DELAY_MS);
}

// Set up path completion callback for zombie spawning when rail path completes
// This is only called for paths with sceneIndex (from RailPathConfig paths)
railMovementManager.setPathCompleteCallback((sceneIndex, sceneConfig) => {
    // Get scene config from CAMERA_SCENES if not provided
    const sceneDefinition = sceneConfig || CAMERA_SCENES[sceneIndex];
    if (!sceneDefinition) {
        console.error(`❌ Scene config not found for index ${sceneIndex}`);
        return;
    }
    
    console.log(`🎬 Rail path completed - Scene ${sceneIndex + 1}: ${sceneDefinition.name}`);
    
    // Update current scene
    gameData.currentScene = sceneIndex;
    currentCameraScene = sceneDefinition;
    
    // Ensure warehouse is visible ONLY for interior scenes (index 6 and 7)
    // Exterior scenes should use factory exterior model
    if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
        if (sceneLoader.warehouseModel) {
            // Explicitly set warehouse visible and ensure it's in scene
            sceneLoader.warehouseModel.visible = true;
            // Use the main scene object, not the scene config
            if (!threeRenderer.scene.children.includes(sceneLoader.warehouseModel)) {
                console.log('⚠️ Warehouse model not in scene, adding...');
                threeRenderer.scene.add(sceneLoader.warehouseModel);
            }
            sceneLoader.warehouseModel.traverse((child) => {
                child.visible = true;
            });
            console.log(`✅ Warehouse model visible: ${sceneLoader.warehouseModel.visible}`);
            
            // Ensure factory exterior is hidden
            if (sceneLoader.currentSceneModel) {
                sceneLoader.currentSceneModel.visible = false;
                console.log(`✅ Factory exterior hidden: ${!sceneLoader.currentSceneModel.visible}`);
            }
        } else {
            console.error(`❌ Warehouse model is null at interior scene (index ${sceneIndex})! Attempting emergency load...`);
            // Emergency load if model is null - reset flag and load
            if (sceneSetupManager) {
                sceneSetupManager.setWarehouseLoaded(false);
            }
            warehouseLoaded = false; // Legacy variable
            loadWarehouseInterior(() => {
                if (sceneLoader.warehouseModel) {
                    sceneLoader.warehouseModel.visible = true;
                    sceneLoader.warehouseModel.traverse((child) => {
                        child.visible = true;
                    });
                    if (sceneLoader.currentSceneModel) {
                        sceneLoader.currentSceneModel.visible = false;
                    }
                    console.log('✅ Emergency warehouse load successful');
                } else {
                    console.error('❌ Emergency warehouse load failed!');
                }
            });
        }
    } else {
        // Exterior scenes - ensure factory is visible and warehouse is hidden
        if (sceneLoader.currentSceneModel) {
            sceneLoader.currentSceneModel.visible = true;
        }
        if (sceneLoader.warehouseModel) {
            sceneLoader.warehouseModel.visible = false;
        }
    }
    
    // Clear existing zombies and power-ups
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Spawn zombies for the new scene
    spawnSceneZombies();
    powerUpManager.spawnScenePowerUps(gameData.currentScene);
    showSceneTitle();
    
    // Set state back to gameplay
    gameData.currentState = GameState.GAMEPLAY;
    // Ensure gameStarted flag is set
    if (!gameData.gameStarted) {
        gameData.gameStarted = true;
    }
    
    // Enable crosshair and center it
    if (crosshairManager) {
        crosshairManager.enable();
        crosshairManager.center(); // Reset crosshair to center
        if (crosshairManager.crosshairElement) {
            crosshairManager.crosshairElement.style.display = 'block';
        }
    }
    
    // CRITICAL: Clear rail movement flags immediately
    if (sceneTransitionManager) {
        sceneTransitionManager.setRailMovementActive(false);
        sceneTransitionManager.setWasRailMovementActive(false);
    } else {
        isRailMovementActive = false;
    }
    if (railMovementManager) {
        railMovementManager.stop();
    }
    
    // Reset transition flag to allow next scene transition
    isTransitioning = false;
    
    console.log(`✅ Scene ${sceneIndex + 1} setup complete - zombies spawned`);
    
    // Switch to boss music if entering final interior scene (Scene 8)
    if (sceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR_FINAL && soundManager) {
        try {
            if (soundManager.musicEnabled) {
                // Only switch if not already playing boss music
                const currentType = soundManager.getCurrentMusicType();
                if (currentType !== 'boss') {
                    console.log('🎵 Switching to boss music for final location');
                    soundManager.playBossMusic();
                }
            }
        } catch (err) {
            console.warn('⚠️ Error switching to boss music:', err);
        }
    }
    
    // Enable free look after scene setup completes
    // For interior scenes, use SceneCameraManager
    if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
        if (sceneCameraManager) {
            sceneCameraManager.setInitialDirection(currentCameraScene);
        } else if (mouseLookManager) {
            mouseLookManager.updateRotationFromCamera();
            mouseLookManager.unlock();
            mouseLookManager.enable();
        }
    } else {
        // Use requestAnimationFrame to ensure this happens after camera is fully positioned
        requestAnimationFrame(enableFreeLookAfterRailMovement);
    }
});

// Screen shake
let screenShakeIntensity = 0;

// ============================================================================
// MOUSE LOOK MANAGER
// ============================================================================
mouseLookManager = new MouseLookManager(camera, gameData, GameState);
mouseLookManager.init();

// ============================================================================
// SCENE CAMERA MANAGER
// ============================================================================
// Handles camera positioning and initial direction for each scene
// Provides clean integration between scene coordinates and free look system
sceneCameraManager = new SceneCameraManager(camera, mouseLookManager);

// ============================================================================
// CAMERA EFFECTS MANAGER
// ============================================================================
// Initialize after mouseLookManager and railMovementManager are available
let cameraEffectsManager = new CameraEffectsManager({
    camera,
    gameData,
    GameState,
    threeRenderer,
    getCurrentCameraScene: () => currentCameraScene, // Pass getter function
    mouseLookManager,
    railMovementManager
});

// ============================================================================
// SHOOTING SYSTEM
// ============================================================================
// Initialize shooting system early with placeholder callbacks
// Will be reinitialized later with proper UI effects manager
let shootingSystemInitialized = false;
initShootingSystem({
    sceneRef: scene,
    cameraRef: camera,
    gameDataRef: gameData,
    zombieManagerRef: zombieManager,
    powerUpsArrayRef: () => powerUpManager ? powerUpManager.getPowerUps() : [],
    reload: () => playerManager.reload(),
    updateUI,
    resetCombo: () => playerManager.resetCombo(),
    createDamageNumber: (position, damage, isHeadshot) => {
        // Placeholder - will be replaced when uiEffectsManager is available
        console.log('Damage:', damage, isHeadshot ? 'HEADSHOT' : '');
    },
    showHeadshotIndicator: () => {
        // Placeholder
    },
    triggerScreenShake: () => { 
        screenShakeIntensity = 0.02; // Use legacy variable for now
    }
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
    
    // Enhanced weapon switch message with better animation
    const indicator = document.getElementById('weapon-switch-message');
    if (indicator) {
        indicator.textContent = `▶ ${weaponLabel}`;
        indicator.style.display = 'block';
        
        // Reset and show with animation
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateY(0) scale(1)';
        });
        
        // Hide after delay with fade out
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 1200);
    }
}

// ============================================================================
// CAMERA SYSTEMS
// ============================================================================
/**
 * Update camera breathing effect (subtle position/rotation sway)
 * Only applies when free look is NOT active (during transitions, locked states)
 */
// ============================================================================
// CAMERA EFFECTS WRAPPER FUNCTIONS (delegate to CameraEffectsManager)
// ============================================================================
function updateCameraBreathing(elapsedTime) {
    if (cameraEffectsManager) {
        // Get rail movement state from SceneTransitionManager if available
        const railActive = (sceneTransitionManager && typeof sceneTransitionManager.isRailMovementActive === 'function') 
            ? sceneTransitionManager.isRailMovementActive() 
            : isRailMovementActive;
        cameraEffectsManager.updateCameraBreathing(elapsedTime, railActive);
    }
}

function updateScreenShake() {
    if (cameraEffectsManager) {
        // Sync legacy variable for backward compatibility
        screenShakeIntensity = cameraEffectsManager.getShakeIntensity();
        // Get rail movement state from SceneTransitionManager if available
        const railActive = (sceneTransitionManager && typeof sceneTransitionManager.isRailMovementActive === 'function') 
            ? sceneTransitionManager.isRailMovementActive() 
            : isRailMovementActive;
        cameraEffectsManager.updateScreenShake(railActive);
        // Update legacy variable after update
        screenShakeIntensity = cameraEffectsManager.getShakeIntensity();
    }
}

// Expose rail movement function globally for button
function startRailMovement() {
    if (sceneTransitionManager && typeof sceneTransitionManager.startRailMovement === 'function') {
        sceneTransitionManager.startRailMovement(SCENE_INDICES);
    }
}
window.startRailMovement = startRailMovement;
// isRailMovementActive is now managed by SceneTransitionManager

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
                // Check rail movement status from SceneTransitionManager or railMovementManager
                const railActiveFromManager = (sceneTransitionManager && typeof sceneTransitionManager.isRailMovementActive === 'function') 
                    ? sceneTransitionManager.isRailMovementActive() 
                    : isRailMovementActive;
                const isRailActive = railActiveFromManager || (railMovementManager && railMovementManager.isMoving());
                
                // Track rail movement state (callback handles enabling free look)
                if (isRailActive) {
                    if (sceneTransitionManager && typeof sceneTransitionManager.setWasRailMovementActive === 'function') {
                        sceneTransitionManager.setWasRailMovementActive(true);
                    }
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
            // Only show crosshair during gameplay, not on start screen
            if (crosshairManager && gameData.currentState === GameState.GAMEPLAY && gameData.gameStarted) {
                crosshairManager.update(deltaTime);
                // Show crosshair
                if (crosshairManager.crosshairElement) {
                    crosshairManager.crosshairElement.style.display = 'block';
                }
            } else {
                // Hide crosshair on start screen
                if (crosshairManager && crosshairManager.crosshairElement) {
                    crosshairManager.crosshairElement.style.display = 'none';
                }
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

// Initialize Scene Setup Manager now that SCENE_INDICES is defined
sceneSetupManager = new SceneSetupManager({
    sceneLoader,
    threeRenderer,
    zombieManager,
    powerUpManager,
    CAMERA_SCENES,
    SCENE_INDICES
});

let factorySceneLoaded = false;
// Warehouse loaded flag - now managed by SceneSetupManager
// Legacy variable kept for backward compatibility during transition
// isFirstGameStart is now managed by GameFlowManager

// ============================================================================
// SCENE SETUP WRAPPER FUNCTIONS (delegate to SceneSetupManager)
// ============================================================================
function setupWarehouseVisibility(setGround = true) {
    if (sceneSetupManager) {
        sceneSetupManager.setupWarehouseVisibility(setGround);
    }
}

/**
 * Stop rail movement completely
 * Now handled by SceneTransitionManager
 */
window.stopRailMovement = () => {
    if (sceneTransitionManager) {
        sceneTransitionManager.stopRailMovement();
    }
};

function spawnSceneZombies() {
    if (sceneSetupManager) {
        sceneSetupManager.spawnSceneZombies(gameData);
        updateUI();
    } else {
        console.error('❌ sceneSetupManager not initialized!');
        // Fallback: use zombieManager directly
        if (gameData.currentScene < SCENE_INDICES.INTERIOR_START) {
            const currentScene = CAMERA_SCENES[gameData.currentScene];
            if (currentScene && currentScene.spawnPoints && currentScene.spawnPoints.length > 0) {
                console.log(`🎬 Fallback: Spawning zombies for Scene ${gameData.currentScene + 1}: ${currentScene.name}`);
                zombieManager.spawnSceneZombies(currentScene.spawnPoints);
    updateUI();
            }
        }
    }
}

/**
 * Quick fade to black, load warehouse, then directly set camera to Scene 7 (no rail movement)
 * Now handled by SceneTransitionManager
 */
window.fadeToBlackAndJumpToInterior = () => {
    if (sceneTransitionManager) {
        sceneTransitionManager.fadeToBlackAndJumpToInterior();
    }
};

/**
 * Jump directly to Scene 7 (Warehouse Interior) without rail movement
 * Now handled by SceneTransitionManager
 */
window.jumpToInteriorScene = () => {
    if (sceneTransitionManager) {
        sceneTransitionManager.jumpToInteriorScene();
        // Update global currentCameraScene
        currentCameraScene = sceneTransitionManager.getCurrentCameraScene();
    }
};

// Function to reset transition flag (called when scene setup completes)
function resetTransitionFlag() {
    isTransitioning = false;
    console.log('🔄 Transition flag reset - ready for next transition');
}

// Expose globally for GameFlowManager
window.resetTransitionFlag = resetTransitionFlag;

// Function to update global currentCameraScene (for GameFlowManager)
window.setCurrentCameraScene = (sceneConfig) => {
    currentCameraScene = sceneConfig;
};

function onSceneCleared() {
    // Prevent multiple calls
    if (isTransitioning) {
        console.log('⏳ Scene transition already in progress, ignoring duplicate call');
        return;
    }
    
    // Only allow transition if we're in gameplay state
    if (gameData.currentState !== GameState.GAMEPLAY) {
        console.log(`⚠️ Cannot transition - current state is ${gameData.currentState}, not GAMEPLAY`);
        return;
    }
    
    console.log(`✅ Scene ${gameData.currentScene + 1} cleared! Transitioning to next scene...`);
    isTransitioning = true;
    
    if (sceneTransitionManager) {
        // Pass reset function to SceneTransitionManager so it can reset the flag when scene setup completes
        sceneTransitionManager.setTransitionResetCallback(resetTransitionFlag);
        
        const result = sceneTransitionManager.onSceneCleared(SCENE_INDICES);
        if (result === 'complete') {
            gameFlowManager.completeMission(updateFinalStats, saveLeaderboard);
            isTransitioning = false;
        }
        // Note: For normal transitions, the flag will be reset by the callback when scene setup completes
    } else {
        console.error('❌ SceneTransitionManager not available!');
        isTransitioning = false;
    }
}

// Manual helper for debugging scene transitions
window.advanceToNextSceneWithRail = () => {
    if (sceneTransitionManager) {
        sceneTransitionManager.advanceToNextSceneWithRail(SCENE_INDICES);
    }
};

// transitionToNextScene is now handled by SceneTransitionManager
// Keeping the function below for backward compatibility if needed

window.transitionToNextScene = () => {
    gameData.currentState = GameState.SCENE_TRANSITION;
    console.log('🎥 Transitioning to next scene...');
    
    gameData.currentScene++;
    currentCameraScene = CAMERA_SCENES[gameData.currentScene];
    
    zombieManager.clearZombies();
    powerUpManager.clear();

    // Camera start/end
    // Convert plain objects to THREE.Vector3 (they're {x, y, z} objects, not Vector3 instances)
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
    
    new TWEEN.Tween(startPos)
        .to(endPos, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            camera.position.copy(startPos);
        })
        .start();
    
    new TWEEN.Tween(startLookAt)
        .to(endLookAt, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            camera.up.set(0, 1, 0);
            camera.lookAt(startLookAt);
        })
        .onComplete(() => {
            // Camera is now at the new scene position
            // Set initial direction and enable free look using SceneCameraManager
            // This ensures camera faces zombies (from lookAt) then enables free look
            sceneCameraManager.setSceneCamera(currentCameraScene);
            
            gameData.currentState = GameState.GAMEPLAY;
            // Restore shake
            if (cameraEffectsManager) {
                cameraEffectsManager.setShakeIntensity(prevScreenShake);
            } else {
                screenShakeIntensity = prevScreenShake;
            }
            spawnSceneZombies();
            powerUpManager.spawnScenePowerUps(gameData.currentScene);
            showSceneTitle();
        })
        .start();
};

/**
 * Advance to next scene using rail movement system
 * Uses RailMovementManager to smoothly animate camera, then snaps to exact SceneConfig position
 * This is the global function that can be called manually
 */
function advanceToNextScene() {
    if (sceneTransitionManager) {
        sceneTransitionManager.advanceToNextSceneWithRail(SCENE_INDICES);
    }
}

// Expose advanceToNextScene globally
window.advanceToNextScene = advanceToNextScene;

function showSceneTitle() {
    if (uiEffectsManager) {
        uiEffectsManager.showSceneTitle(gameData, CAMERA_SCENES);
    }
}

// ============================================================================
// GAME FLOW
// ============================================================================
// All game flow functions are now handled by GameFlowManager
// Update playerManager callback to use GameFlowManager
gameOverCallback = () => {
    gameFlowManager.gameOver(updateFinalStats, saveLeaderboard);
};

async function loadWarehouseInterior(onComplete) {
    if (sceneSetupManager) {
        await sceneSetupManager.loadWarehouseInterior(scene, onComplete);
        // Sync legacy variable
        warehouseLoaded = sceneSetupManager.isWarehouseLoaded();
    } else if (onComplete) {
        onComplete();
    }
}

// ============================================================================
// INPUT HANDLERS
// ============================================================================
import { shoot as shootWeapon } from './combat/ShootingSystem.js';

// One-time music start on first user interaction (browser requirement)
// Now handled by GameFlowManager.startMusicOnInteraction()

window.addEventListener('click', () => {
    // Start music on first click if not already started
    gameFlowManager.startMusicOnInteraction();
    
    // Only shoot if game is in gameplay state
    if (gameData.currentState === GameState.GAMEPLAY && gameData.gameStarted) {
        // Use CrosshairManager's tracked mouse position instead of click position
        // This ensures shooting accuracy matches where the crosshair is pointing
        const mousePos = crosshairManager.getNormalizedMousePosition();
        shootWeapon(mousePos.x, mousePos.y, currentWeaponId);
    }
});

window.addEventListener('keydown', (event) => {
    // Start music on first keypress if not already started
    gameFlowManager.startMusicOnInteraction();
    
    const key = event.key.toLowerCase();
    
    switch(key) {
        case 'r':
            if (gameData.currentState === GameState.GAME_OVER || 
                gameData.currentState === GameState.MISSION_COMPLETE) {
            gameFlowManager.restartGame(zombieManager);
            } else if (gameData.currentState === GameState.GAMEPLAY) {
            playerManager.reload(currentWeaponId);
            }
            break;
            
        case ' ':
        // Space key now handled by start screen menu
        // Keep this for backward compatibility but it won't trigger if start screen is visible
            if (gameData.currentState === GameState.LOADING && renderManager.isReady()) {
            const startScreen = document.getElementById('start-screen');
            if (!startScreen || startScreen.classList.contains('hidden')) {
                gameFlowManager.startGame();
                // Update global currentCameraScene to match
                currentCameraScene = CAMERA_SCENES[0];
            }
            }
            break;
            
        case 'c':
    case 'C': {
            const isFree = threeRenderer.toggleFreeCamera();
            renderManager.updateCallbacks.freeCamera.enabled = isFree;
        
        // Show/hide crosshair based on camera mode
        if (crosshairManager && crosshairManager.crosshairElement) {
            crosshairManager.crosshairElement.style.display = isFree ? 'none' : 'block';
        }
        
            if (!isFree) {
            // Exiting orbit controls - reset to scene position
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
            
            // Restore original fog distance
            if (threeRenderer.scene.fog) {
                threeRenderer.scene.fog.far = 200;
            }
            
            console.log('🎥 Orbit controls disabled - returned to game camera');
        } else {
            // Entering orbit controls - set target to current camera position for free movement
            threeRenderer.controls.target.copy(camera.position);
            
            // Disable or extend fog for better exploration (reduce visual barriers)
            if (threeRenderer.scene.fog) {
                threeRenderer.scene.fog.far = 500;
            }
            
            threeRenderer.controls.update();
            console.log('🎥 Orbit controls enabled - use mouse to navigate, M to mark position');
            console.log('💡 Right-click drag to pan, scroll to zoom, no movement limits');
        }
        break;
    }
        
    case 'e':
    case 'E':
        // Toggle post-processing on/off
        if (postProcessingManager) {
            postProcessingManager.toggle();
        }
        break;
        
    case 'i':
    case 'I':
        // Shortcut to jump to warehouse interior scene for testing
        if (gameData.currentState === GameState.GAMEPLAY) {
            // Ensure warehouse is loaded first
            const isLoaded = sceneSetupManager ? sceneSetupManager.isWarehouseLoaded() : warehouseLoaded;
            if (!isLoaded || !sceneLoader.warehouseModel) {
                loadWarehouseInterior(() => {
                    gameData.currentScene = SCENE_INDICES.WAREHOUSE_INTERIOR;
                    currentCameraScene = CAMERA_SCENES[SCENE_INDICES.WAREHOUSE_INTERIOR];
                    setupWarehouseVisibility();
                    sceneCameraManager.setSceneCamera(currentCameraScene);
                    zombieManager.clearZombies();
                    spawnSceneZombies();
                    
                    // Disable orbit controls, enable free look
                    threeRenderer.isFreeCamera = false;
                    threeRenderer.controls.enabled = false;
                    renderManager.updateCallbacks.freeCamera.enabled = false;
                    if (crosshairManager && crosshairManager.crosshairElement) {
                        crosshairManager.crosshairElement.style.display = 'block';
                    }
                });
            } else {
                // Warehouse already loaded, jump directly
                gameData.currentScene = SCENE_INDICES.WAREHOUSE_INTERIOR;
                currentCameraScene = CAMERA_SCENES[SCENE_INDICES.WAREHOUSE_INTERIOR];
                setupWarehouseVisibility();
                sceneCameraManager.setSceneCamera(currentCameraScene);
                zombieManager.clearZombies();
                spawnSceneZombies();
                
                // Disable orbit controls, enable free look
                threeRenderer.isFreeCamera = false;
                threeRenderer.controls.enabled = false;
                renderManager.updateCallbacks.freeCamera.enabled = false;
                if (crosshairManager && crosshairManager.crosshairElement) {
                    crosshairManager.crosshairElement.style.display = 'block';
                }
            }
        }
        break;
        
    case 'm':
    case 'M':
        // Mark current camera position and look-at direction for SceneConfig
        // Works in both gameplay and orbit controls mode
        if (gameData.currentState === GameState.GAMEPLAY || threeRenderer.isFreeCamera) {
            const pos = camera.position.clone();
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            
            // Calculate look-at point (position + direction * some distance)
            // Use orbit controls target if available, otherwise use direction
            let lookAt;
            if (threeRenderer.isFreeCamera && threeRenderer.controls && threeRenderer.controls.target) {
                // Use orbit controls target for more accurate look-at
                lookAt = threeRenderer.controls.target.clone();
            } else {
                // Use camera direction
                const lookAtDistance = 10;
                lookAt = pos.clone().add(direction.multiplyScalar(lookAtDistance));
            }
            
            // Get current scene name for context
            const sceneName = currentCameraScene ? currentCameraScene.name : 'Unknown Scene';
            const sceneNumber = gameData.currentScene + 1;
            
            // Output in a clean, copy-paste friendly format
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('📍 MARKED POSITION FOR SCENECONFIG');
            console.log('═══════════════════════════════════════════════════════\n');
            console.log(`Scene: ${sceneNumber} (${sceneName})`);
            console.log('Copy this into SceneConfig.js:\n');
            console.log('{');
            console.log(`    name: "${sceneName}",`);
            console.log(`    position: { x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} },`);
            console.log(`    lookAt: { x: ${lookAt.x.toFixed(2)}, y: ${lookAt.y.toFixed(2)}, z: ${lookAt.z.toFixed(2)} },`);
            console.log(`    transitionDuration: 3000,`);
            console.log(`    spawnPoints: [`);
            console.log(`        // Add spawn points here`);
            console.log(`    ]`);
            console.log('}\n');
            console.log('═══════════════════════════════════════════════════════\n');
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

// Start screen 3D scene is handled by inline script in index.html

// ============================================================================
// CROSSHAIR MANAGER
// ============================================================================
crosshairManager = new CrosshairManager();
crosshairManager.init('crosshair');

// ============================================================================
// UI EFFECTS MANAGER
// ============================================================================
uiEffectsManager = new UIEffectsManager({ camera });

// CameraEffectsManager is initialized earlier in the file (after mouseLookManager)

// Reinitialize Power-Up Manager now that uiEffectsManager is available
// Update the callback to use uiEffectsManager
if (powerUpManager && uiEffectsManager) {
    // PowerUpManager doesn't have a method to update the callback, so we need to recreate it
    // But first, let's check if we can just update it
    powerUpManager = new PowerUpManager(
        scene,
        camera,
        gameData,
        updateUI,
        (text) => uiEffectsManager.showPowerUpMessage(text)
    );
}

// Initialize shooting system now that uiEffectsManager is available
if (!shootingSystemInitialized) {
    initShootingSystem({
        sceneRef: scene,
        cameraRef: camera,
        gameDataRef: gameData,
        zombieManagerRef: zombieManager,
        powerUpsArrayRef: () => powerUpManager.getPowerUps(),
        reload: () => playerManager.reload(),
        updateUI,
        resetCombo: () => playerManager.resetCombo(),
        createDamageNumber: (position, damage, isHeadshot) => uiEffectsManager.createDamageNumber(position, damage, isHeadshot),
        triggerScreenShake: () => { 
            if (cameraEffectsManager) {
                cameraEffectsManager.triggerShake(0.02);
            } else {
                screenShakeIntensity = 0.02; // Fallback
            }
        }
    });
    shootingSystemInitialized = true;
}

// ============================================================================
// GAME FLOW MANAGER
// ============================================================================
// Initialize after all dependencies are available (uiEffectsManager, sceneSetupManager, etc.)
// Expose startGameFromMenu function for start screen
window.startGameFromMenu = () => {
    // Prevent multiple calls
    if (gameData.gameStarted) {
        console.warn('⚠️ Game already started, ignoring startGameFromMenu call');
        return;
    }
    
    // Restore main game canvas visibility before starting
    const mainCanvas = renderer.domElement;
    if (mainCanvas) {
        mainCanvas.style.opacity = '1';
        mainCanvas.style.visibility = 'visible';
        mainCanvas.style.zIndex = 'auto';
        mainCanvas.style.pointerEvents = 'auto';
        mainCanvas.classList.add('visible');
        console.log('✅ Main game canvas restored in startGameFromMenu');
    }
    
    // Check if scene is ready
    if (!renderManager.isReady()) {
        console.warn('⚠️ Scene not ready yet, waiting...');
        // Retry after a short delay
        setTimeout(() => {
            if (!gameData.gameStarted && renderManager.isReady()) {
                console.log('✅ Scene ready, starting game on retry');
                // Restore canvas
                const mainCanvas = renderer.domElement;
                if (mainCanvas) {
                    mainCanvas.style.opacity = '1';
                    mainCanvas.style.visibility = 'visible';
                    mainCanvas.style.zIndex = 'auto';
                    mainCanvas.style.pointerEvents = 'auto';
                    mainCanvas.classList.add('visible');
                }
                gameFlowManager.startGame();
                currentCameraScene = CAMERA_SCENES[0];
            }
        }, 100);
        return;
    }
    
    // Check if factory scene is loaded (or allow if we're past initial loading)
    if (!factorySceneLoaded) {
        console.warn('⚠️ Factory scene not loaded yet, waiting...');
        // Retry after a short delay
        setTimeout(() => {
            if (!gameData.gameStarted && factorySceneLoaded) {
                console.log('✅ Factory scene loaded, starting game on retry');
                // Restore canvas
                const mainCanvas = renderer.domElement;
                if (mainCanvas) {
                    mainCanvas.style.opacity = '1';
                    mainCanvas.style.visibility = 'visible';
                    mainCanvas.style.zIndex = 'auto';
                    mainCanvas.style.pointerEvents = 'auto';
                    mainCanvas.classList.add('visible');
                }
                gameFlowManager.startGame();
                currentCameraScene = CAMERA_SCENES[0];
            }
        }, 100);
        return;
    }
    
    // Start the game - allow starting from LOADING state or if game hasn't started
    if (gameData.currentState === GameState.LOADING || !gameData.gameStarted) {
        console.log('🚀 Starting game from menu');
        gameFlowManager.startGame();
        // Update global currentCameraScene to match
        currentCameraScene = CAMERA_SCENES[0];
    } else {
        console.warn(`⚠️ Cannot start game - current state: ${gameData.currentState}, gameStarted: ${gameData.gameStarted}`);
    }
};

gameFlowManager = new GameFlowManager({
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
    showSceneTitle: () => {
        if (uiEffectsManager) {
            uiEffectsManager.showSceneTitle(gameData, CAMERA_SCENES);
        }
    },
    spawnSceneZombies: () => {
        if (sceneSetupManager) {
            sceneSetupManager.spawnSceneZombies(gameData);
            updateUI();
        }
    },
    factorySceneLoaded: () => factorySceneLoaded,
    currentWeaponId: () => currentWeaponId,
    switchCurrentWeapon,
    onCompleteMission: null, // Not used in GameFlowManager
    WEAPON_AMMO_CONFIG
});

// Set showGameUI function for GameFlowManager
gameFlowManager.setShowGameUI(showGameUI);

// ============================================================================
// SCENE TRANSITION MANAGER
// ============================================================================
// Initialize after all dependencies are available
sceneTransitionManager = new SceneTransitionManager({
    camera,
    sceneLoader,
    threeRenderer,
    zombieManager,
    powerUpManager,
    railMovementManager,
    sceneCameraManager,
    mouseLookManager,
    crosshairManager,
    soundManager,
    updateUI,
    showSceneTitle: () => {
        if (uiEffectsManager) {
            uiEffectsManager.showSceneTitle(gameData, CAMERA_SCENES);
        }
    },
    setupWarehouseVisibility: (setGround = true) => {
        if (sceneSetupManager) {
            sceneSetupManager.setupWarehouseVisibility(setGround);
        }
    },
    loadWarehouseInterior: async (onComplete) => {
        if (sceneSetupManager) {
            await sceneSetupManager.loadWarehouseInterior(scene, onComplete);
            warehouseLoaded = sceneSetupManager.isWarehouseLoaded(); // Sync legacy variable
        } else if (onComplete) {
            onComplete();
        }
    },
    spawnSceneZombies: () => {
        if (sceneSetupManager) {
            sceneSetupManager.spawnSceneZombies(gameData);
            updateUI();
        }
    },
    enableFreeLookAfterRailMovement
});

// Immediately prepare scene for display (will start pre-rendering)
// This ensures the game can transition from LOADING state even if factory scene fails
if (!gameData.gameStarted) {
    currentCameraScene = CAMERA_SCENES[0];
    renderManager.prepareSceneForDisplay();
}

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
    } else {
        // Fallback ground on load failure
        console.warn('⚠️ Factory scene load failed, creating fallback ground');
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
        const fallbackGround = new THREE.Mesh(groundGeo, groundMat);
        fallbackGround.name = 'ground';
        fallbackGround.rotation.x = -Math.PI / 2;
        fallbackGround.position.y = -0.1;
        fallbackGround.receiveShadow = true;
        threeRenderer.setGround(fallbackGround);
        
        factorySceneLoaded = true;
    }
    
    // Always prepare scene for display after factory scene loads (or fails)
    // This ensures the game can transition from LOADING state
        if (!gameData.gameStarted) {
            currentCameraScene = CAMERA_SCENES[0];
        // Pre-render setup: ensure scene is ready before showing
            renderManager.prepareSceneForDisplay();
    }
});

// Fallback: If factory scene takes too long, prepare scene anyway after a timeout
setTimeout(() => {
    if (!renderManager.isReady() && !gameData.gameStarted) {
        console.warn('⚠️ Factory scene loading timeout, preparing scene anyway');
        currentCameraScene = CAMERA_SCENES[0];
        if (!threeRenderer.getGround()) {
            // Create fallback ground
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
        renderManager.prepareSceneForDisplay();
    }
}, 5000); // 5 second timeout

// Warehouse will be loaded on-demand when transitioning to interior scenes (index 7+)
// Do NOT preload to avoid crashes when loading at wrong time (e.g., during Turn Around scene)

console.log('✅ Game Initialized');
console.log('Controls:');
console.log('  SPACE - Start Game');
console.log('  Click - Shoot');
console.log('  R - Reload / Restart');
console.log('  C - Toggle Orbit Controls (for navigation/marking)');
console.log('  E - Toggle Post-Processing Effects');
console.log('  I - Jump to Warehouse Interior (testing)');
console.log('  M - Mark Position (for SceneConfig) - works in orbit mode');
console.log('  H - Toggle Helpers');
console.log('');
console.log('Orbit Controls:');
console.log('  Mouse Drag - Rotate camera');
console.log('  Scroll - Zoom in/out');
console.log('  Right-click Drag - Pan camera');

// Note: Scene pre-rendering happens before revealing to ensure renderer readiness
// This prevents startup glitch by ensuring textures are uploaded to GPU first

