/**
* Scene Setup Manager
* Handles scene setup logic like warehouse visibility, zombie spawning, and model loading
*/

import * as THREE from 'three';

export class SceneSetupManager {
constructor({
sceneLoader,
threeRenderer,
zombieManager,
powerUpManager,
CAMERA_SCENES,
SCENE_INDICES
}) {
this.sceneLoader = sceneLoader;
this.threeRenderer = threeRenderer;
this.zombieManager = zombieManager;
this.powerUpManager = powerUpManager;
this.CAMERA_SCENES = CAMERA_SCENES;
this.SCENE_INDICES = SCENE_INDICES;

this.warehouseLoaded = false;
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
* Setup warehouse visibility for interior scenes
*/
setupWarehouseVisibility(setGround = true) {
if (!this.sceneLoader.warehouseModel) {
console.warn('Warehouse model not loaded yet');
return;
}

// Make warehouse visible
this.sceneLoader.warehouseModel.visible = true;

// Ensure warehouse is in the scene
if (!this.threeRenderer.scene.children.includes(this.sceneLoader.warehouseModel)) {
this.threeRenderer.scene.add(this.sceneLoader.warehouseModel);
}

// Make all children visible
this.sceneLoader.warehouseModel.traverse((child) => {
if (child.isMesh) {
child.visible = true;
if (child.material) {
if (Array.isArray(child.material)) {
child.material.forEach(mat => {
if (mat) {
mat.visible = true;
mat.opacity = 1.0;
mat.transparent = false;
}
});
} else {
child.material.visible = true;
child.material.opacity = 1.0;
child.material.transparent = false;
}
}
}
});

// Hide factory exterior
if (this.sceneLoader.currentSceneModel) {
this.sceneLoader.currentSceneModel.visible = false;
}

// Setup floor if needed
if (setGround) {
this.setupInteriorFloor();
}
}

/**
* Setup interior floor
*/
setupInteriorFloor() {
if (!this.sceneLoader.warehouseModel) return;

let floorMesh = null;
const floorCandidates = [];

// Find floor mesh
this.sceneLoader.warehouseModel.traverse((child) => {
if (child.isMesh) {
const name = child.name.toLowerCase();
const materialName = child.material?.name?.toLowerCase() || '';

// Check by name
if (name.includes('floor') || name.includes('ground') || 
materialName.includes('floor') || materialName.includes('ground')) {
floorCandidates.push(child);
}

// Check by position (lowest horizontal mesh)
if (child.position.y < 0.5 && Math.abs(child.rotation.x) < 0.1) {
floorCandidates.push(child);
}
}
});

// Use first candidate or create fallback
if (floorCandidates.length > 0) {
floorMesh = floorCandidates[0];
floorMesh.visible = true;
if (floorMesh.material) {
if (Array.isArray(floorMesh.material)) {
floorMesh.material.forEach(mat => {
if (mat) {
mat.visible = true;
mat.opacity = 1.0;
}
});
} else {
floorMesh.material.visible = true;
floorMesh.material.opacity = 1.0;
}
}
console.log('Interior floor found and made visible');
} else {
// Create fallback floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ 
color: 0x333333,
roughness: 0.8,
metalness: 0.2
});
floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0;
floorMesh.receiveShadow = true;
this.threeRenderer.scene.add(floorMesh);
console.log('No floor found in model, created fallback floor');
}
}

/**
* Load warehouse interior model
*/
async loadWarehouseInterior(scene, onComplete) {
// Check if already loaded
if (this.warehouseLoaded && this.sceneLoader.warehouseModel) {
console.log('Warehouse already loaded');
if (onComplete) onComplete();
return;
}

// Reset flag if loading failed previously
if (this.warehouseLoaded && !this.sceneLoader.warehouseModel) {
console.log('Warehouse flag set but model is null - resetting and reloading...');
this.warehouseLoaded = false;
}

console.log('Loading warehouse interior model...');

try {
await this.sceneLoader.loadWarehouseInterior(scene, (warehouseModel) => {
if (warehouseModel && this.sceneLoader.warehouseModel) {
console.log('Warehouse model loaded successfully');
this.warehouseLoaded = true;

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
console.error('Warehouse model failed to load - resetting flag');
this.warehouseLoaded = false;
if (onComplete) onComplete();
}
});
} catch (error) {
console.error('Error loading warehouse interior:', error);
this.warehouseLoaded = false;
if (onComplete) onComplete();
}
}

/**
* Spawn zombies for current scene
*/
spawnSceneZombies(gameData) {
// Skip spawning zombies for interior scenes EXCEPT the final location (Scene 8)
if (gameData.currentScene >= this.SCENE_INDICES.INTERIOR_START && 
gameData.currentScene !== this.SCENE_INDICES.WAREHOUSE_INTERIOR_FINAL) {
console.log(`⏭ Skipping zombie spawn for interior scene ${gameData.currentScene + 1}`);
return;
}

const currentScene = this.CAMERA_SCENES[gameData.currentScene];
if (!currentScene) {
console.warn(`No scene config found for scene index ${gameData.currentScene}`);
return;
}

if (!currentScene.spawnPoints || currentScene.spawnPoints.length === 0) {
console.log(`ℹ No spawn points defined for Scene ${gameData.currentScene} (index ${gameData.currentScene}): ${currentScene.name}`);
return;
}

console.log(`Spawning ${currentScene.spawnPoints.length} zombies for Scene ${gameData.currentScene} (index ${gameData.currentScene}): ${currentScene.name}`);
console.log('Spawn points:', currentScene.spawnPoints);

if (!this.zombieManager) {
console.error('zombieManager not available in SceneSetupManager!');
return;
}

this.zombieManager.spawnSceneZombies(currentScene.spawnPoints);
}
}

