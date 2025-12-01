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
import { PostProcessingManager } from './systems/PostProcessingManager.js';

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
    
    // Ensure warehouse is visible ONLY for interior scenes (index 6 and 7)
    // Exterior scenes should use factory exterior model
    if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
        if (sceneLoader.warehouseModel) {
            // Explicitly set warehouse visible and ensure it's in scene
            sceneLoader.warehouseModel.visible = true;
            if (!scene.children.includes(sceneLoader.warehouseModel)) {
                console.log('⚠️ Warehouse model not in scene, adding...');
                scene.add(sceneLoader.warehouseModel);
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
            warehouseLoaded = false; // Reset flag to allow reload
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
    // At Scene 6, use fade-to-black transition instead of rail movement
    if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT) {
        onSceneCleared(); // Triggers fade-to-black and jump to interior
        return;
    }
    
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

// ============================================================================
// SCENE MANAGEMENT
// ============================================================================
// Scene index constants for clarity
const SCENE_INDICES = {
    FRONT_OF_DOOR_PIVOT: 5,      // Scene 6 - triggers interior transition
    WAREHOUSE_INTERIOR: 6,        // Scene 7 - first interior scene
    WAREHOUSE_INTERIOR_FINAL: 7,  // Scene 8 - final interior scene
    INTERIOR_START: 6             // First interior scene index
};

let factorySceneLoaded = false;
let warehouseLoaded = false;
let warehouseLoading = false; // Track if warehouse is currently being loaded
let isFirstGameStart = true;

/**
 * Setup warehouse model visibility and hide factory exterior
 * @param {boolean} setGround - Whether to set ground from warehouse model
 */
function setupWarehouseVisibility(setGround = true) {
    if (!sceneLoader.warehouseModel) return;
    
    // Show warehouse and ensure it's in scene
    sceneLoader.warehouseModel.visible = true;
    if (!scene.children.includes(sceneLoader.warehouseModel)) {
        scene.add(sceneLoader.warehouseModel);
    }
    sceneLoader.warehouseModel.traverse((child) => {
        child.visible = true;
    });
    
    // Hide factory exterior
    if (sceneLoader.currentSceneModel) {
        sceneLoader.currentSceneModel.visible = false;
    }
    
    // Set ground from warehouse if requested
    if (setGround) {
        let foundGround = false;
        
        // First, try to find floor by name
        sceneLoader.warehouseModel.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                const matName = child.material?.name?.toLowerCase() || '';
                
                // Check name, material name, or if mesh is roughly horizontal (floor-like)
                if (name.includes('ground') || name.includes('floor') || 
                    matName.includes('ground') || matName.includes('floor')) {
                    child.name = 'ground';
                    child.receiveShadow = true;
                    
                    // Ensure material is visible (not transparent)
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat.transparent && mat.opacity < 0.5) {
                                mat.transparent = false;
                                mat.opacity = 1.0;
                            }
                            if (mat.visible === false) {
                                mat.visible = true;
                            }
                        });
                    }
                    
                    threeRenderer.setGround(child);
                    foundGround = true;
                    console.log('✅ Found warehouse floor mesh:', child.name);
                }
            }
        });
        
        // If no ground found, try to find by position (lowest mesh near Y=0)
        if (!foundGround) {
            let lowestMesh = null;
            let lowestY = Infinity;
            
            sceneLoader.warehouseModel.traverse((child) => {
                if (child.isMesh) {
                    // Get world position
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    
                    // Check if this mesh is near ground level and roughly horizontal
                    if (worldPos.y > -2 && worldPos.y < 2) {
                        // Check if mesh rotation suggests it's a floor (rotated 90° on X axis)
                        const rotation = child.rotation.x;
                        if (Math.abs(rotation + Math.PI / 2) < 0.5 || Math.abs(rotation) < 0.3) {
                            if (worldPos.y < lowestY) {
                                lowestY = worldPos.y;
                                lowestMesh = child;
                            }
                        }
                    }
                }
            });
            
            if (lowestMesh) {
                lowestMesh.name = 'ground';
                lowestMesh.receiveShadow = true;
                
                // Ensure material is visible
                if (lowestMesh.material) {
                    const materials = Array.isArray(lowestMesh.material) ? lowestMesh.material : [lowestMesh.material];
                    materials.forEach(mat => {
                        if (mat.transparent && mat.opacity < 0.5) {
                            mat.transparent = false;
                            mat.opacity = 1.0;
                        }
                        if (mat.visible === false) {
                            mat.visible = true;
                        }
                    });
                }
                
                threeRenderer.setGround(lowestMesh);
                foundGround = true;
                console.log('✅ Found warehouse floor by position:', lowestMesh.name, 'at Y:', lowestY.toFixed(2));
            }
        }
        
        // If still no ground found, create a fallback floor
        if (!foundGround) {
            console.log('⚠️ No floor mesh found in warehouse model, creating fallback floor');
            const groundGeo = new THREE.PlaneGeometry(50, 50);
            const groundMat = new THREE.MeshStandardMaterial({ 
                color: 0x3a3a3a,
                roughness: 0.9,
                metalness: 0.1
            });
            const fallbackGround = new THREE.Mesh(groundGeo, groundMat);
            fallbackGround.name = 'ground';
            fallbackGround.rotation.x = -Math.PI / 2;
            fallbackGround.position.y = 0;
            fallbackGround.receiveShadow = true;
            fallbackGround.visible = true;
            threeRenderer.setGround(fallbackGround);
        }
        
        // Hide the old exterior ground to prevent seeing through
        const oldGround = scene.getObjectByName('ground');
        if (oldGround && oldGround.parent !== sceneLoader.warehouseModel) {
            // Only hide if it's not part of the warehouse model
            oldGround.visible = false;
        }
    }
}

/**
 * Stop rail movement completely
 */
function stopRailMovement() {
    if (railMovementManager) {
        railMovementManager.stop();
    }
    isRailMovementActive = false;
}

function spawnSceneZombies() {
    // Skip spawning zombies for interior scenes
    if (gameData.currentScene >= SCENE_INDICES.INTERIOR_START) {
        return;
    }
    
    console.log(`🎬 Spawning zombies for Scene ${gameData.currentScene + 1}: ${currentCameraScene.name}`);
    zombieManager.spawnSceneZombies(currentCameraScene.spawnPoints);
    updateUI();
}

/**
 * Quick fade to black, load warehouse, then directly set camera to Scene 7 (no rail movement)
 */
function fadeToBlackAndJumpToInterior() {
    const fadeOverlay = document.getElementById('fade-transition');
    if (!fadeOverlay) {
        console.error('❌ Fade transition overlay not found!');
        return;
    }
    
    // Quick fade in black overlay
    fadeOverlay.style.transition = 'opacity 0.3s ease-in-out';
    fadeOverlay.classList.add('active');
    
    // Wait for fade in, then load warehouse and jump to Scene 7
    setTimeout(() => {
        // Load warehouse if needed
        if (!warehouseLoaded || !sceneLoader.warehouseModel) {
            loadWarehouseInterior(() => {
                setupWarehouseVisibility();
                jumpToInteriorScene();
            });
        } else {
            // Warehouse already loaded, just setup visibility
            setupWarehouseVisibility();
            jumpToInteriorScene();
        }
    }, 300); // Wait for fade in to complete
}

/**
 * Jump directly to Scene 7 (Warehouse Interior) without rail movement
 */
function jumpToInteriorScene() {
    // Stop any existing rail movement
    stopRailMovement();
    
    // Set to Scene 7 (Warehouse Interior)
    gameData.currentScene = SCENE_INDICES.WAREHOUSE_INTERIOR;
    currentCameraScene = CAMERA_SCENES[SCENE_INDICES.WAREHOUSE_INTERIOR];
    
    // Set camera directly to interior position (no rail movement, no interpolation)
    camera.position.set(
        currentCameraScene.position.x,
        currentCameraScene.position.y,
        currentCameraScene.position.z
    );
    
    // Set camera look-at direction
    const lookAtPos = new THREE.Vector3(
        currentCameraScene.lookAt.x,
        currentCameraScene.lookAt.y,
        currentCameraScene.lookAt.z
    );
    camera.lookAt(lookAtPos);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    
    // Clear zombies and power-ups (no spawning for interior scenes)
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Update UI and show scene title
    updateUI();
    showSceneTitle();
    
    // Set game state back to gameplay
    gameData.currentState = GameState.GAMEPLAY;
    
    // Enable crosshair
    if (crosshairManager) {
        crosshairManager.enable();
        if (crosshairManager.crosshairElement) {
            crosshairManager.crosshairElement.style.display = 'block';
        }
    }
    
    // Enable free look after everything is set up
    sceneCameraManager.setSceneCamera(currentCameraScene);
    
    // Fade back in quickly
    const fadeOverlay = document.getElementById('fade-transition');
    if (fadeOverlay) {
        setTimeout(() => {
            fadeOverlay.classList.remove('active');
        }, 50);
    }
}

function onSceneCleared() {
    // For Front of Door Pivot (Scene 6), fade to black and jump directly to interior
    if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT) {
        stopRailMovement();
        gameData.currentState = GameState.SCENE_TRANSITION;
        fadeToBlackAndJumpToInterior();
        return;
    }
    
    // Check if this is the last scene (Warehouse Interior Final is index 4, which is the last scene)
    if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
        completeMission();
        return;
    }
    
    // For all other scenes (including first warehouse interior), use rail movement to transition
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
    
    // Get the next scene
    const nextSceneIndex = gameData.currentScene + 1;
    
    // Skip rail movement for transition from Scene 6 to Scene 7 (uses fade-to-black instead)
    if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT && 
        nextSceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR) {
        return;
    }
    
    // Set transition state
    gameData.currentState = GameState.SCENE_TRANSITION;
    console.log(`🎥 Advancing from Scene ${gameData.currentScene + 1} to Scene ${gameData.currentScene + 2} using rail movement...`);
    
    const nextScene = CAMERA_SCENES[nextSceneIndex];
    
    if (!nextScene) {
        console.error('❌ Next scene not found at index:', nextSceneIndex);
        gameData.currentState = GameState.GAMEPLAY;
        return;
    }
    
    // Clear zombies and power-ups before transition
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Show/hide appropriate scene models based on next scene
    // Warehouse interior scenes need warehouse model visible
    if (nextSceneIndex >= SCENE_INDICES.INTERIOR_START) {
        
        // Ensure warehouse is loaded - check both flag AND model existence
        if (!warehouseLoaded || !sceneLoader.warehouseModel) {
            console.log('⚠️ Warehouse not loaded yet, loading now...');
            loadWarehouseInterior(() => {
                // After warehouse loads, show it and continue with transition
                if (sceneLoader.warehouseModel) {
                    sceneLoader.showWarehouse();
                    // Set ground from warehouse
                    sceneLoader.warehouseModel.traverse((child) => {
                        if (child.isMesh) {
                            const name = child.name.toLowerCase();
                            if (name.includes('ground') || name.includes('floor')) {
                                child.name = 'ground';
                                child.receiveShadow = true;
                                threeRenderer.setGround(child);
                            }
                        }
                    });
                }
            });
        } else if (sceneLoader.warehouseModel) {
            // Warehouse is loaded - ensure it's visible
            sceneLoader.warehouseModel.visible = true;
            
            // Ensure it's in the scene
            if (!scene.children.includes(sceneLoader.warehouseModel)) {
                console.log('⚠️ Warehouse model not in scene, adding it...');
                scene.add(sceneLoader.warehouseModel);
            }
            
            console.log(`✅ Warehouse model visible: ${sceneLoader.warehouseModel.visible}, in scene: ${scene.children.includes(sceneLoader.warehouseModel)}`);
            
            // Set ground from warehouse
            sceneLoader.warehouseModel.traverse((child) => {
                if (child.isMesh) {
                    const name = child.name.toLowerCase();
                    if (name.includes('ground') || name.includes('floor')) {
                        child.name = 'ground';
                        child.receiveShadow = true;
                        threeRenderer.setGround(child);
                    }
                }
            });
        } else {
            console.error('❌ Warehouse model not available! Cannot show interior.');
            // Try to load it as fallback
            loadWarehouseInterior(() => {
                if (sceneLoader.warehouseModel) {
                    sceneLoader.warehouseModel.visible = true;
                    if (sceneLoader.currentSceneModel) {
                        sceneLoader.currentSceneModel.visible = false;
                    }
                }
            });
        }
        // Hide factory exterior
        if (sceneLoader.currentSceneModel) {
            sceneLoader.currentSceneModel.visible = false;
            console.log('✅ Factory exterior hidden');
        }
    } else {
        // Transitioning to factory exterior scenes - show factory, hide warehouse
        if (sceneLoader.currentSceneModel) {
            sceneLoader.currentSceneModel.visible = true;
        }
        if (sceneLoader.warehouseModel) {
            sceneLoader.warehouseModel.visible = false;
        }
    }
    
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
        
        // CRITICAL: Ensure warehouse is visible for interior scenes (index 6 and 7)
        // Force visibility AFTER rail movement completes to ensure interior model shows
        if (nextSceneIndex >= SCENE_INDICES.INTERIOR_START) {
            if (sceneLoader.warehouseModel) {
                // Force visibility - set on model and all children
                sceneLoader.warehouseModel.visible = true;
                sceneLoader.warehouseModel.traverse((child) => {
                    if (child.isMesh || child.isGroup || child.isObject3D) {
                        child.visible = true;
                    }
                });
                
                // Ensure warehouse is in scene
                if (!scene.children.includes(sceneLoader.warehouseModel)) {
                    console.log('⚠️ Warehouse not in scene, adding...');
                    scene.add(sceneLoader.warehouseModel);
                }
                
                // CRITICAL: Force factory exterior to be hidden
                if (sceneLoader.currentSceneModel) {
                    sceneLoader.currentSceneModel.visible = false;
                    sceneLoader.currentSceneModel.traverse((child) => {
                        if (child.isMesh || child.isGroup || child.isObject3D) {
                            child.visible = false;
                        }
                    });
                }
                
                console.log(`✅ Warehouse FORCED visible: ${sceneLoader.warehouseModel.visible}`);
                console.log(`✅ Factory exterior FORCED hidden: ${sceneLoader.currentSceneModel ? !sceneLoader.currentSceneModel.visible : 'N/A'}`);
            } else {
                console.error(`❌ CRITICAL: Warehouse model is null at interior scene!`);
                // Emergency load
                loadWarehouseInterior(() => {
                    if (sceneLoader.warehouseModel) {
                        sceneLoader.warehouseModel.visible = true;
                        if (sceneLoader.currentSceneModel) {
                            sceneLoader.currentSceneModel.visible = false;
                        }
                    }
                });
            }
        }
        
        // Spawn zombies and power-ups for new scene
        spawnSceneZombies();
        powerUpManager.spawnScenePowerUps(gameData.currentScene);
        showSceneTitle();
        
        // Set state back to gameplay
        gameData.currentState = GameState.GAMEPLAY;
        
        // Enable crosshair for all scenes
        if (crosshairManager) {
            crosshairManager.enable();
            if (crosshairManager.crosshairElement) {
                crosshairManager.crosshairElement.style.display = 'block';
            }
        }
        
        // Enable free look after scene setup completes
        // For interior scenes, use SceneCameraManager to ensure proper setup
        if (nextSceneIndex >= SCENE_INDICES.INTERIOR_START) {
            // Use SceneCameraManager for interior scenes to ensure free look is properly enabled
            sceneCameraManager.setInitialDirection(currentCameraScene);
        } else {
            // Use requestAnimationFrame to ensure this happens after camera is fully positioned
            requestAnimationFrame(enableFreeLookAfterRailMovement);
        }
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
    
    // Start in normal mode (factory exterior, scene 0)
    // Show factory exterior, hide warehouse
    if (sceneLoader.currentSceneModel) {
        sceneLoader.currentSceneModel.visible = true;
    }
    if (sceneLoader.warehouseModel) {
        sceneLoader.warehouseModel.visible = false;
    }
    // Set to first scene (index 0)
    gameData.currentScene = 0;
    currentCameraScene = CAMERA_SCENES[0];
    
    gameData.gameStarted = true;
    
    // Initialize weapon ammo for starting weapon (pistol)
    const pistolConfig = WEAPON_AMMO_CONFIG['pistol'];
    if (pistolConfig) {
        gameData.maxAmmo = pistolConfig.clipSize;
        gameData.currentAmmo = pistolConfig.clipSize;
        gameData.reserveAmmo = pistolConfig.reserveSize;
    }
    
    // Initialize weapon slot highlighting for starting weapon
    if (currentWeaponId === 'pistol') {
        switchCurrentWeapon('pistol');
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
// currentCameraScene is already set above based on toggle selection (factory interior or exterior)

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
    
    // Enable crosshair at game start
    if (crosshairManager) {
        crosshairManager.enable();
        if (crosshairManager.crosshairElement) {
            crosshairManager.crosshairElement.style.display = 'block';
        }
    }
    
    // Spawn entities
    // Check if factory scene is loaded OR if we're past the first scene
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
    
    // Color coding: white for normal hits, red for all headshots
    let color, glowColor, fontSize;
    if (isHeadshot) {
        // Headshot: always red
        color = '#ff0000';
        glowColor = '#ff0000';
        fontSize = '40px'; // Larger for headshots
    } else {
        // Normal hit: white
        color = '#ffffff';
        glowColor = '#ffffff';
        fontSize = '32px';
    }
    
    const damageDiv = document.createElement('div');
    damageDiv.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-family: 'Courier New', monospace;
        font-size: ${fontSize};
        font-weight: bold;
        color: ${color};
        text-shadow: 
            0 0 10px ${glowColor}, 
            0 0 20px ${glowColor},
            2px 2px 4px #000;
        pointer-events: none;
        z-index: 999;
        animation: floatUp${isHeadshot ? 'Headshot' : 'Normal'} 1s ease-out forwards;
        transform: translate(-50%, -50%);
    `;
    
    // Add "HEADSHOT" prefix for headshots
    if (isHeadshot) {
        damageDiv.textContent = `HEADSHOT +${damage}`;
        // Add extra glow effect for headshots
        damageDiv.style.filter = `drop-shadow(0 0 8px ${glowColor})`;
    } else {
        damageDiv.textContent = `+${damage}`;
    }
    
    // Add animation keyframes if not already added
    if (!document.getElementById('damage-animations-style')) {
        const style = document.createElement('style');
        style.id = 'damage-animations-style';
        style.textContent = `
            @keyframes floatUpNormal {
                0% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) translateY(0) scale(1);
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) translateY(-50px) scale(0.8);
                }
            }
            @keyframes floatUpHeadshot {
                0% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) translateY(0) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) translateY(-25px) scale(1.1);
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) translateY(-60px) scale(0.9);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(damageDiv);
    
    setTimeout(() => {
        damageDiv.remove();
    }, 1000);
}

async function loadWarehouseInterior(onComplete) {
    // Check if already loaded by verifying the model exists
    if (warehouseLoaded && sceneLoader.warehouseModel) {
        console.log('✅ Warehouse already loaded');
        if (onComplete) onComplete();
        return;
    }
    
    // Reset flag if loading failed previously
    if (warehouseLoaded && !sceneLoader.warehouseModel) {
        console.log('⚠️ Warehouse flag set but model is null - resetting and reloading...');
        warehouseLoaded = false;
    }
    
    console.log('📦 Loading warehouse interior model...');
    // DO NOT set warehouseLoaded = true here - only set it AFTER successful load
    
    try {
        await sceneLoader.loadWarehouseInterior(scene, (warehouseModel) => {
            if (warehouseModel && sceneLoader.warehouseModel) {
                console.log('✅ Warehouse model loaded successfully');
                warehouseLoaded = true; // Only set flag AFTER successful load
                
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
                console.error('❌ Warehouse model failed to load - resetting flag');
                warehouseLoaded = false; // Reset flag on failure
                if (onComplete) onComplete();
            }
        });
    } catch (error) {
        console.error('❌ Error loading warehouse interior:', error);
        warehouseLoaded = false; // Reset flag on error
        if (onComplete) onComplete();
    }
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
        case 'C':
            const isFree = threeRenderer.toggleFreeCamera();
            renderManager.updateCallbacks.freeCamera.enabled = isFree;
            break;
            
        case 'e':
        case 'E':
            // Toggle post-processing on/off
            if (postProcessingManager) {
                postProcessingManager.toggle();
            }
            break;
            
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
                    threeRenderer.scene.fog.far = 200; // Restore normal fog distance
                }
                
                console.log('🎥 Orbit controls disabled - returned to game camera');
            } else {
                // Entering orbit controls - set target to current camera position for free movement
                // This allows panning anywhere without being locked to a specific orbit point
                threeRenderer.controls.target.copy(camera.position);
                
                // Disable or extend fog for better exploration (reduce visual barriers)
                if (threeRenderer.scene.fog) {
                    threeRenderer.scene.fog.far = 500; // Extend fog distance significantly
                }
                
                threeRenderer.controls.update();
                console.log('🎥 Orbit controls enabled - use mouse to navigate, M to mark position');
                console.log('💡 Right-click drag to pan, scroll to zoom, no movement limits');
            }
            break;
            
        case 'i':
        case 'I':
            // Shortcut to jump to warehouse interior scene for testing
            if (gameData.currentState === GameState.GAMEPLAY) {
                // Ensure warehouse is loaded first
                if (!warehouseLoaded || !sceneLoader.warehouseModel) {
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

