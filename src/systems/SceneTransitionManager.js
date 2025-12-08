/**
* Scene Transition Manager
* Handles all scene transitions including fade-to-black, rail movement, and direct jumps
*/

import * as THREE from 'three';
import { GameState, gameData } from '../core/GameState.js';
import { CAMERA_SCENES } from '../core/SceneConfig.js';

export class SceneTransitionManager {
constructor({
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
showSceneTitle,
setupWarehouseVisibility,
loadWarehouseInterior,
spawnSceneZombies,
enableFreeLookAfterRailMovement
}) {
this.camera = camera;
this.sceneLoader = sceneLoader;
this.threeRenderer = threeRenderer;
this.zombieManager = zombieManager;
this.powerUpManager = powerUpManager;
this.railMovementManager = railMovementManager;
this.sceneCameraManager = sceneCameraManager;
this.mouseLookManager = mouseLookManager;
this.crosshairManager = crosshairManager;
this.soundManager = soundManager;
this.updateUI = updateUI;
this.showSceneTitle = showSceneTitle;
this.setupWarehouseVisibility = setupWarehouseVisibility;
this.loadWarehouseInterior = loadWarehouseInterior;
this.spawnSceneZombies = spawnSceneZombies;
this.enableFreeLookAfterRailMovement = enableFreeLookAfterRailMovement;

this.currentCameraScene = CAMERA_SCENES[0];
this.warehouseLoaded = false;
this._isRailMovementActive = false;
this._wasRailMovementActive = false;
this._transitionResetCallback = null; // Callback to reset transition flag
}

/**
* Set callback to reset transition flag when scene setup completes
*/
setTransitionResetCallback(callback) {
this._transitionResetCallback = callback;
}

/**
* Set current camera scene
*/
setCurrentCameraScene(scene) {
this.currentCameraScene = scene;
}

/**
* Get current camera scene
*/
getCurrentCameraScene() {
return this.currentCameraScene;
}

/**
* Set warehouse loaded flag
*/
setWarehouseLoaded(loaded) {
this.warehouseLoaded = loaded;
}

/**
* Get warehouse loaded flag
*/
isWarehouseLoaded() {
return this.warehouseLoaded;
}

/**
* Set rail movement active flag
*/
setRailMovementActive(active) {
this._isRailMovementActive = active;
}

/**
* Get rail movement active flag
*/
isRailMovementActive() {
return this._isRailMovementActive;
}

/**
* Set was rail movement active flag
*/
setWasRailMovementActive(active) {
this._wasRailMovementActive = active;
}

/**
* Get was rail movement active flag
*/
wasRailMovementActive() {
return this._wasRailMovementActive;
}

/**
* Fade to black and jump to interior scene
*/
fadeToBlackAndJumpToInterior(SCENE_INDICES) {
const fadeOverlay = document.getElementById('fade-transition');
if (!fadeOverlay) {
console.error('Fade transition overlay not found!');
return;
}

// Quick fade in black overlay
fadeOverlay.style.transition = 'opacity 0.3s ease-in-out';
fadeOverlay.classList.add('active');

// Wait for fade in, then load warehouse and jump to Scene 15
setTimeout(() => {
// Load warehouse if needed
if (!this.warehouseLoaded || !this.sceneLoader.warehouseModel) {
this.loadWarehouseInterior(() => {
this.setupWarehouseVisibility();
this.jumpToInteriorScene(SCENE_INDICES);
});
} else {
// Warehouse already loaded, just setup visibility
this.setupWarehouseVisibility();
this.jumpToInteriorScene(SCENE_INDICES);
}
}, 300); // Wait for fade in to complete
}

/**
* Jump directly to Scene 15 (Warehouse Interior) without rail movement
*/
jumpToInteriorScene(SCENE_INDICES) {
// Stop any existing rail movement
this.stopRailMovement();

// Use Scene 15 (Warehouse Interior) - index 15
const interiorSceneIndex = SCENE_INDICES ? SCENE_INDICES.WAREHOUSE_INTERIOR: 15;

console.log(`Jumping to interior scene: index ${interiorSceneIndex}`);
gameData.currentScene = interiorSceneIndex;
this.currentCameraScene = CAMERA_SCENES[interiorSceneIndex];

// Set camera directly to interior position (no rail movement, no interpolation)
this.camera.position.set(
this.currentCameraScene.position.x,
this.currentCameraScene.position.y,
this.currentCameraScene.position.z
);

// Set camera look-at direction
const lookAtPos = new THREE.Vector3(
this.currentCameraScene.lookAt.x,
this.currentCameraScene.lookAt.y,
this.currentCameraScene.lookAt.z
);
this.camera.lookAt(lookAtPos);
this.camera.updateMatrixWorld();
this.camera.updateProjectionMatrix();

// Clear zombies and power-ups (no spawning for interior scenes)
this.zombieManager.clearZombies();
this.powerUpManager.clear();

// Update UI and show scene title
this.updateUI();
this.showSceneTitle();

// Set game state back to gameplay
gameData.currentState = GameState.GAMEPLAY;

// Enable crosshair and center it
if (this.crosshairManager) {
this.crosshairManager.enable();
// Pass mouseLookManager if available to sync mouse position
const mouseLookMgr = this.sceneCameraManager?.mouseLookManager || null;
this.crosshairManager.center(mouseLookMgr); // Reset crosshair to center at start of scene
if (this.crosshairManager.crosshairElement) {
this.crosshairManager.crosshairElement.style.display = 'block';
}
}

// Enable free look after everything is set up
this.sceneCameraManager.setSceneCamera(this.currentCameraScene);

// Fade back in quickly
const fadeOverlay = document.getElementById('fade-transition');
if (fadeOverlay) {
setTimeout(() => {
fadeOverlay.classList.remove('active');
}, 50);
}
}

/**
* Stop rail movement
*/
stopRailMovement() {
this._isRailMovementActive = false;
this._wasRailMovementActive = false;
if (this.railMovementManager) {
this.railMovementManager.stop();
}
}

/**
* Start rail movement (called by button or manually)
* Handles special case for Scene 14 -> Scene 15 transition (interior)
*/
startRailMovement(SCENE_INDICES) {
// At Scene 12 (lock scene), proceed normally - transition happens at Scene 13->14
// Scene 12 (lock cleared) -> Scene 13 (travel) -> Scene 14 (interior via fade-to-black)

// Set global flag before starting movement
this._isRailMovementActive = true;
this._wasRailMovementActive = true;

// Disable free look during rail movement
this.sceneCameraManager.disableFreeLook();

// Start rail movement
this.railMovementManager.moveToNextPath();
}

/**
* Handle scene cleared event
*/
onSceneCleared(SCENE_INDICES) {
console.log(`Transition: Current scene index ${gameData.currentScene}, Scene: ${CAMERA_SCENES[gameData.currentScene]?.name || 'NOT FOUND'}`);

// For Front of Door Pivot (Scene 12, WP13), check if lock is opened before transitioning
// After Scene 12 (lock shot), go to Scene 13 (shooting scene with zombie)
// After Scene 13 (zombie killed), go to Scene 14 (travel scene)
// After Scene 14, go to Scene 15 (interior)
if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT) {
// Check if lock is blocking (lock exists and is still active/not opened)
const lockBlocking = this.zombieManager && 
this.zombieManager.lockManager && 
this.zombieManager.lockManager.isActive();

if (lockBlocking) {
console.log('Lock scene cleared but lock not opened - cannot transition until lock is shot');
return 'lock_blocked';
}

// Lock is opened - transition to Scene 13 (shooting scene with zombie)
console.log('Scene 12 (Lock Scene) cleared - lock opened, proceeding to Scene 13');
// Use normal rail movement to Scene 13
this.advanceToNextSceneWithRail(SCENE_INDICES);
return 'transition';
}

// Check if this is the last scene (Scene 16 - boss fight)
// Only complete mission if Scene 16 is cleared AND all zombies (including boss) are killed
if (gameData.currentScene === SCENE_INDICES.WAREHOUSE_INTERIOR_FINAL) {
// Scene 16 is the boss fight - check if zombies have been spawned and all are dead
const sceneConfig = CAMERA_SCENES[gameData.currentScene];
const hasSpawnPoints = sceneConfig && sceneConfig.spawnPoints && sceneConfig.spawnPoints.length > 0;
const hasZombies = this.zombieManager && this.zombieManager.zombies && this.zombieManager.zombies.length > 0;
const hasBoss = hasZombies && this.zombieManager.zombies.some(z => z.type === 'reaper' && !z.isDead);

// Only complete mission if:
// 1. Scene has spawn points (zombies should have spawned)
// 2. No zombies are alive (all killed, including boss)
if (hasSpawnPoints && !hasZombies) {
console.log('Scene 16 (boss fight) cleared - all zombies killed, mission complete!');
// Return signal to complete mission (handled by caller)
return 'complete';
} else if (hasBoss) {
return 'boss_active';
} else if (hasZombies) {
return 'zombies_active';
} else {
// Scene 16 just loaded, zombies haven't spawned yet - don't complete mission
return 'waiting_for_spawn';
}
}

// Check if we've exceeded the scene count (safety check)
if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
console.log('Last scene cleared - mission complete!');
return 'complete';
}

// For all other scenes, use rail movement to transition automatically
console.log(`Advancing to next scene using rail movement...`);
this.advanceToNextSceneWithRail(SCENE_INDICES);
return 'transition';
}

/**
* Advance to next scene using rail movement
*/
advanceToNextSceneWithRail(SCENE_INDICES) {
// Check if there's a next scene available
if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
return;
}

// Get the next scene
// CRITICAL: Ensure we're using the correct current scene index
const currentSceneIndex = gameData.currentScene;
const nextSceneIndex = currentSceneIndex + 1;

console.log(`Rail transition: Scene ${currentSceneIndex} -> Scene ${nextSceneIndex}`);

// Skip rail movement for transition from Scene 14 (travel) to Scene 15 (interior - uses fade-to-black instead)
// Scene 12 (lock) -> Scene 13 (shooting) -> Scene 14 (travel) -> Scene 15 (interior transition)
if (gameData.currentScene === 14 && nextSceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR) {
this.fadeToBlackAndJumpToInterior(SCENE_INDICES);
return;
}

// Set transition state
gameData.currentState = GameState.SCENE_TRANSITION;

const nextScene = CAMERA_SCENES[nextSceneIndex];

if (!nextScene) {
console.error('Next scene not found at index:', nextSceneIndex);
gameData.currentState = GameState.GAMEPLAY;
return;
}

// Clear zombies and power-ups before transition
this.zombieManager.clearZombies();
this.powerUpManager.clear();

// Show/hide appropriate scene models based on next scene
if (nextSceneIndex >= SCENE_INDICES.INTERIOR_START) {
// Ensure warehouse is loaded
if (!this.warehouseLoaded || !this.sceneLoader.warehouseModel) {
this.loadWarehouseInterior(() => {
this.setupWarehouseVisibility();
this.startRailMovementToScene(nextSceneIndex);
});
} else {
this.setupWarehouseVisibility();
this.startRailMovementToScene(nextSceneIndex);
}
} else {
// Exterior scene - ensure factory is visible
if (this.sceneLoader.currentSceneModel) {
this.sceneLoader.currentSceneModel.visible = true;
}
if (this.sceneLoader.warehouseModel) {
this.sceneLoader.warehouseModel.visible = false;
}
this.startRailMovementToScene(nextSceneIndex);
}
}

/**
* Start rail movement to a specific scene
*/
startRailMovementToScene(nextSceneIndex) {
console.log(`Starting rail movement to Scene ${nextSceneIndex}`);

// Validate rail movement manager
if (!this.railMovementManager) {
console.error('RailMovementManager not available!');
gameData.currentState = GameState.GAMEPLAY;
return;
}

// Disable free look during rail movement
if (this.sceneCameraManager) {
this.sceneCameraManager.disableFreeLook();
}

// Start rail movement
const movementStarted = this.railMovementManager.moveToNextPath();

// Only set flags if movement actually started
if (movementStarted) {
this._isRailMovementActive = true;
this._wasRailMovementActive = true;
} else {
console.error('Rail movement failed to start');
// Reset state back to gameplay if movement failed
gameData.currentState = GameState.GAMEPLAY;
// Reset transition flag so user can try again
if (this._transitionResetCallback) {
this._transitionResetCallback();
}
}
}

/**
* Setup path completion callback for rail movement
*/
setupPathCompleteCallback(SCENE_INDICES) {
this.railMovementManager.setPathCompleteCallback((sceneIndex, sceneConfig) => {
// Get scene config from CAMERA_SCENES if not provided
const scene = sceneConfig || CAMERA_SCENES[sceneIndex];
if (!scene) {
console.error(`Scene config not found for index ${sceneIndex}`);
return;
}

console.log(`Rail path completed - Scene ${sceneIndex}: ${scene.name}`);

// Update current scene
gameData.currentScene = sceneIndex;
this.currentCameraScene = scene;

// Ensure warehouse is visible ONLY for interior scenes
if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
if (this.sceneLoader.warehouseModel) {
this.sceneLoader.warehouseModel.visible = true;
if (!this.threeRenderer.scene.children.includes(this.sceneLoader.warehouseModel)) {
this.threeRenderer.scene.add(this.sceneLoader.warehouseModel);
}
this.sceneLoader.warehouseModel.traverse((child) => {
child.visible = true;
});

// Ensure factory exterior is hidden
if (this.sceneLoader.currentSceneModel) {
this.sceneLoader.currentSceneModel.visible = false;
}
} else {
console.error(`Warehouse model is null at interior scene (index ${sceneIndex})! Attempting emergency load...`);
this.warehouseLoaded = false;
this.loadWarehouseInterior(() => {
if (this.sceneLoader.warehouseModel) {
this.sceneLoader.warehouseModel.visible = true;
this.sceneLoader.warehouseModel.traverse((child) => {
child.visible = true;
});
if (this.sceneLoader.currentSceneModel) {
this.sceneLoader.currentSceneModel.visible = false;
}
} else {
console.error('Emergency warehouse load failed!');
}
});
}
} else {
// Exterior scenes - ensure factory is visible and warehouse is hidden
if (this.sceneLoader.currentSceneModel) {
this.sceneLoader.currentSceneModel.visible = true;
}
if (this.sceneLoader.warehouseModel) {
this.sceneLoader.warehouseModel.visible = false;
}
}

// Clear existing zombies and power-ups
this.zombieManager.clearZombies();
this.powerUpManager.clear();

// Spawn zombies for the new scene
this.spawnSceneZombies();
this.powerUpManager.spawnScenePowerUps(gameData.currentScene);
this.powerUpManager.spawnSceneHealthBottles(gameData.currentScene);
this.showSceneTitle();

// Set state back to gameplay
gameData.currentState = GameState.GAMEPLAY;
if (!gameData.gameStarted) {
gameData.gameStarted = true;
}

// Enable crosshair
if (this.crosshairManager) {
this.crosshairManager.enable();
if (this.crosshairManager.crosshairElement) {
this.crosshairManager.crosshairElement.style.display = 'block';
}
}

// CRITICAL: Clear rail movement flags immediately
this._isRailMovementActive = false;
this._wasRailMovementActive = false;
if (this.railMovementManager) {
this.railMovementManager.stop();
}

// Reset transition flag now that scene setup is complete
if (this._transitionResetCallback) {
this._transitionResetCallback();
}

// Switch to boss music if entering final interior scene (Scene 8)
if (sceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR_FINAL && this.soundManager) {
try {
if (this.soundManager.musicEnabled) {
const currentType = this.soundManager.getCurrentMusicType();
if (currentType !== 'boss') {
this.soundManager.playBossMusic();
}
}
} catch (err) {
}
}

// Enable free look after scene setup completes
if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
if (this.sceneCameraManager) {
this.sceneCameraManager.setInitialDirection(this.currentCameraScene);
} else if (this.mouseLookManager) {
// CRITICAL: Reset mouse look rotation to center FIRST
this.mouseLookManager.reset();
// Reset camera rotation before setting lookAt
this.camera.up.set(0, 1, 0);
this.camera.rotation.set(0, 0, 0);
this.camera.rotation.order = 'YXZ';
if (this.currentCameraScene?.lookAt) {
this.camera.lookAt(
this.currentCameraScene.lookAt.x,
this.currentCameraScene.lookAt.y,
this.currentCameraScene.lookAt.z
);
this.camera.updateMatrixWorld(true);
}
this.mouseLookManager.updateRotationFromCamera();
this.mouseLookManager.unlock();
this.mouseLookManager.enable();
}
} else {
// Use requestAnimationFrame to ensure this happens after camera is fully positioned
requestAnimationFrame(this.enableFreeLookAfterRailMovement);
}
});
}
}

