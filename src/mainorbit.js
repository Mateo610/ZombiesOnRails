/**
 * Main Game Entry Point - Orbit Controls Version
 * This version has orbit controls enabled by default for free camera movement
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
import { initShootingSystem } from './combat/ShootingSystem.js';
import { initHUD, createUI, updateUI, updateFinalStats, saveLeaderboard } from './ui/HUD.js';

// ============================================================================
// THREE.JS SETUP
// ============================================================================
const threeRenderer = new Renderer();
const scene = threeRenderer.scene;
const renderer = threeRenderer.renderer;
const camera = threeRenderer.camera;
const clock = threeRenderer.clock;

// Enable orbit controls by default
threeRenderer.isFreeCamera = true;
threeRenderer.controls.enabled = true;

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

// Screen shake
let screenShakeIntensity = 0;

// ============================================================================
// SHOOTING SYSTEM
// ============================================================================
initShootingSystem({
    sceneRef: scene,
    cameraRef: camera,
    gameDataRef: gameData,
    zombieManagerRef: zombieManager,
    powerUpsArrayRef: () => powerUpManager.getPowerUps(),
    reload: () => playerManager.reload(),
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

function switchCurrentWeapon(id) {
    if (currentWeaponId === id) return;
    
    currentWeaponId = id;
    setRecoilWeapon(id);
    
    const weaponLabel = {
        pistol: 'PISTOL',
        shotgun: 'SHOTGUN',
        rifle: 'RIFLE'
    }[id] || id.toUpperCase();
    
    const nameEl = document.getElementById('weapon-name');
    if (nameEl) {
        nameEl.textContent = weaponLabel;
    }
    
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
        activeSlot.style.borderColor = '#00ffff';
        activeSlot.style.opacity = '1';
        activeSlot.style.background = 'rgba(0,255,255,0.15)';
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
function updateCameraBreathing(elapsedTime) {
    if (threeRenderer.isFreeCamera) return;
    if (gameData.currentState !== GameState.GAMEPLAY) return;
    if (screenShakeIntensity > 0.001) return;
    
    const breathY = Math.sin(elapsedTime * 2.0) * 0.005;
    const breathX = Math.cos(elapsedTime * 1.5) * 0.003;
    const swayZ = Math.sin(elapsedTime * 1.8) * 0.002;
    
    camera.position.x = currentCameraScene.position.x + breathX;
    camera.position.y = currentCameraScene.position.y + breathY;
    camera.position.z = currentCameraScene.position.z;
    
    camera.lookAt(
        currentCameraScene.lookAt.x,
        currentCameraScene.lookAt.y,
        currentCameraScene.lookAt.z
    );
    
    camera.rotation.z = swayZ;
}

function updateScreenShake() {
    if (screenShakeIntensity > 0) {
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

// WASD camera movement (only when in free camera mode)
function updateWASDMovement(deltaTime) {
    if (!threeRenderer.isFreeCamera) return;
    
    const moveDistance = moveSpeed * deltaTime;
    
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0; // Keep movement horizontal
    right.normalize();
    
    // Calculate movement vector
    const moveVector = new THREE.Vector3(0, 0, 0);
    
    if (keys.w) {
        moveVector.add(forward);
    }
    if (keys.s) {
        moveVector.sub(forward);
    }
    if (keys.a) {
        moveVector.sub(right);
    }
    if (keys.d) {
        moveVector.add(right);
    }
    
    // Normalize diagonal movement
    if (moveVector.length() > 0) {
        moveVector.normalize();
        moveVector.multiplyScalar(moveDistance);
        
        // Apply movement to camera position
        camera.position.add(moveVector);
        
        // Update orbit controls target to match camera movement
        threeRenderer.controls.target.add(moveVector);
    }
}

// ============================================================================
// RENDER MANAGER UPDATE CALLBACKS
// ============================================================================
renderManager.setUpdateCallbacks({
    tween: () => TWEEN.update(),
    freeCamera: {
        enabled: true, // Orbit controls enabled by default
        update: () => threeRenderer.controls.update()
    },
    gameplay: [
        (deltaTime) => {
            if (gameData.currentState === GameState.GAMEPLAY) {
                // Zombies disabled in orbit mode for exploration
                // zombieManager.update(
                //     deltaTime,
                //     gameData.slowMoActive,
                //     gameData.currentState,
                //     GameState.GAMEPLAY,
                //     onSceneCleared
                // );
                playerManager.updateComboTimer(deltaTime);
                powerUpManager.update(deltaTime);
                powerUpManager.updateTimers(deltaTime);
                gameData.currentTime = (Date.now() - gameData.startTime) / 1000;
                updateUI();
            }
        }
    ],
    camera: [
        (elapsedTime) => updateCameraBreathing(elapsedTime),
        (elapsedTime, deltaTime) => updateRecoil(deltaTime, camera, threeRenderer.BASE_FOV),
        () => updateScreenShake(),
        (elapsedTime, deltaTime) => updateWASDMovement(deltaTime)
    ],
    ui: [
        () => powerUpManager.updateUI(),
        () => {
            // Update impact spheres if needed
            const impactSpheres = [];
            // TODO: Integrate impact spheres update
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
    // Zombies disabled in orbit mode for exploration
    console.log(`🎬 Zombie spawning disabled in orbit mode`);
    // zombieManager.spawnSceneZombies(currentCameraScene.spawnPoints);
    updateUI();
}

function onSceneCleared() {
    console.log(`✅ Scene ${gameData.currentScene + 1} cleared!`);
    
    if (gameData.currentScene === 0) {
        checkDoorInteraction();
        return;
    }
    
    if (gameData.currentScene < gameData.totalScenes - 1) {
        transitionToNextScene();
    } else {
        completeMission();
    }
}

function transitionToNextScene() {
    gameData.currentState = GameState.SCENE_TRANSITION;
    console.log('🎥 Transitioning to next scene...');
    
    gameData.currentScene++;
    currentCameraScene = CAMERA_SCENES[gameData.currentScene];
    
    // Switch scene models
    if (gameData.currentScene === 1) {
        sceneLoader.transitionToWarehouse();
        // Update ground reference
        sceneLoader.warehouseModel?.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                const matName = child.material?.name?.toLowerCase() || '';
                if (name.includes('ground') || name.includes('floor') || 
                    matName.includes('ground') || matName.includes('floor')) {
                    child.name = 'ground';
                    child.receiveShadow = true;
                    threeRenderer.setGround(child);
                }
            }
        });
    } else if (gameData.currentScene === 0) {
        sceneLoader.showFactory();
        sceneLoader.currentSceneModel?.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (name.includes('ground') || name.includes('floor')) {
                    child.name = 'ground';
                    threeRenderer.setGround(child);
                }
            }
        });
    }
    
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Animate camera (only if not in free camera mode)
    if (!threeRenderer.isFreeCamera) {
        const startPos = camera.position.clone();
        const startLookAt = new THREE.Vector3(0, 1.5, 0);
        camera.getWorldDirection(startLookAt);
        startLookAt.add(camera.position);
        
        const endPos = new THREE.Vector3(
            currentCameraScene.position.x,
            currentCameraScene.position.y,
            currentCameraScene.position.z
        );
        const endLookAt = new THREE.Vector3(
            currentCameraScene.lookAt.x,
            currentCameraScene.lookAt.y,
            currentCameraScene.lookAt.z
        );
        
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
                camera.lookAt(startLookAt);
            })
            .onComplete(() => {
                gameData.currentState = GameState.GAMEPLAY;
                spawnSceneZombies();
                powerUpManager.spawnScenePowerUps(gameData.currentScene);
                showSceneTitle();
            })
            .start();
    } else {
        // If in free camera mode, just transition state
        gameData.currentState = GameState.GAMEPLAY;
        spawnSceneZombies();
        powerUpManager.spawnScenePowerUps(gameData.currentScene);
        showSceneTitle();
    }
}

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
    title.textContent = `SCENE ${gameData.currentScene + 1}: ${currentCameraScene.name.toUpperCase()}`;
    
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
    gameData.currentState = GameState.GAMEPLAY;
    gameData.currentScene = 0;
    playerManager.resetStats();
    
    // Reset power-ups
    powerUpManager.clear();
    gameData.doubleDamageActive = false;
    gameData.doubleDamageTimer = 0;
    gameData.slowMoActive = false;
    gameData.slowMoTimer = 0;
    gameData.startTime = Date.now();
    
    // Camera setup (only if not in free camera mode)
    currentCameraScene = CAMERA_SCENES[0];
    if (!threeRenderer.isFreeCamera) {
        const isCameraAtOrigin = camera.position.x === 0 && 
                                 camera.position.y === 0 && 
                                 camera.position.z === 0;
        
        if (isCameraAtOrigin) {
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
    }
    
    // Clear any existing zombies (disabled in orbit mode)
    zombieManager.clearZombies();
    
    // Spawn entities (zombies disabled in orbit mode)
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

function checkDoorInteraction() {
    if (gameData.currentScene === 0 && !warehouseLoaded) {
        const zombies = zombieManager.getZombies();
        const aliveZombies = zombies.filter(z => !z.isDead).length;
        
        if (aliveZombies === 0 && zombies.length > 0) {
            console.log('🚪 All zombies cleared! Loading warehouse interior...');
            loadWarehouseInterior();
        }
    }
}

async function loadWarehouseInterior() {
    if (warehouseLoaded) return;
    
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
                if (gameData.currentScene === 0 && warehouseLoaded) {
                    transitionToNextScene();
                }
            }, 2000);
        }
    });
}

// ============================================================================
// INPUT HANDLERS
// ============================================================================
import { shoot as shootWeapon } from './combat/ShootingSystem.js';

// Raycaster for teleportation and point placement
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Rail path point system
const railPoints = [];
const railPointMarkers = []; // Visual markers for points
let railPathLine = null; // Line connecting all points
const railPointGroup = new THREE.Group();
railPointGroup.name = 'RailPoints';
scene.add(railPointGroup);

// WASD movement controls
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

const moveSpeed = 5.0; // Units per second

// Place rail point at clicked location
function placeRailPoint(event) {
    if (!threeRenderer.isFreeCamera) return;
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Get all objects in the scene that can be intersected
    const intersectableObjects = [];
    scene.traverse((object) => {
        if (object.isMesh && object.visible && object.name !== 'RailPointMarker') {
            intersectableObjects.push(object);
        }
    });
    
    const intersects = raycaster.intersectObjects(intersectableObjects, true);
    
    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const hitObject = intersects[0].object;
        
        // Add point to array
        const pointData = {
            x: hitPoint.x,
            y: hitPoint.y,
            z: hitPoint.z,
            index: railPoints.length
        };
        railPoints.push(pointData);
        
        // Create visual marker (sphere)
        const markerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true,
            opacity: 0.8
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(hitPoint);
        marker.name = 'RailPointMarker';
        marker.userData.pointIndex = pointData.index;
        
        railPointMarkers.push(marker);
        railPointGroup.add(marker);
        
        // Update rail path line
        updateRailPathLine();
        
        // Console log
        console.log(`📍 Rail Point #${pointData.index + 1} placed:`);
        console.log(`  Position: { x: ${hitPoint.x.toFixed(2)}, y: ${hitPoint.y.toFixed(2)}, z: ${hitPoint.z.toFixed(2)} }`);
        console.log(`  Total points: ${railPoints.length}`);
        
        // Auto-export coordinates (only if we have 2+ points to show the line)
        if (railPoints.length >= 2) {
            exportRailPath();
        }
    } else {
        console.log('⚠️ No object clicked - cannot place point');
    }
}

// Update the line connecting all rail points
function updateRailPathLine() {
    // Remove existing line
    if (railPathLine) {
        railPointGroup.remove(railPathLine);
        railPathLine.geometry.dispose();
        railPathLine.material.dispose();
    }
    
    if (railPoints.length < 2) {
        return; // Need at least 2 points for a line
    }
    
    // Create points array for curve
    const points = railPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Create Catmull-Rom spline for smooth curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    
    // Generate points along the curve
    const curvePoints = curve.getPoints(200); // 200 points for smooth line
    
    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        linewidth: 3,
        transparent: true,
        opacity: 0.7
    });
    
    railPathLine = new THREE.Line(geometry, material);
    railPathLine.name = 'RailPathLine';
    railPointGroup.add(railPathLine);
}

// Export rail path coordinates
function exportRailPath() {
    if (railPoints.length === 0) {
        console.log('⚠️ No rail points to export');
        return;
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 RAIL PATH COORDINATES (Copy this to RailPathConfig.js)');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('export const RAIL_PATHS = [');
    railPoints.forEach((point, index) => {
        const isLast = index === railPoints.length - 1;
        console.log(`    {`);
        console.log(`        id: 'path_${index + 1}',`);
        console.log(`        name: 'Path ${index + 1}',`);
        console.log(`        waypoints: [`);
        console.log(`            { x: ${point.x.toFixed(2)}, y: ${point.y.toFixed(2)}, z: ${point.z.toFixed(2)} }`);
        console.log(`        ],`);
        console.log(`        duration: 5000,`);
        console.log(`        lookAt: { x: 0, y: 1.00, z: 0 }, // TODO: Set lookAt point`);
        console.log(`        enemySpawns: []`);
        console.log(`    }${isLast ? '' : ','}`);
    });
    console.log('];\n');
    console.log('═══════════════════════════════════════════════════\n');
}

// Clear all rail points
function clearRailPoints() {
    // Remove all markers
    railPointMarkers.forEach(marker => {
        railPointGroup.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
    });
    railPointMarkers.length = 0;
    
    // Remove line
    if (railPathLine) {
        railPointGroup.remove(railPathLine);
        railPathLine.geometry.dispose();
        railPathLine.material.dispose();
        railPathLine = null;
    }
    
    // Clear array
    railPoints.length = 0;
    
    console.log('🗑️ All rail points cleared');
}

// Teleport function - moves camera to clicked point
function teleportToPoint(event) {
    if (!threeRenderer.isFreeCamera) return;
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Get all objects in the scene that can be intersected
    const intersectableObjects = [];
    scene.traverse((object) => {
        if (object.isMesh && object.visible) {
            intersectableObjects.push(object);
        }
    });
    
    // Calculate intersections
    const intersects = raycaster.intersectObjects(intersectableObjects, true);
    
    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const hitObject = intersects[0].object;
        
        // Teleport camera to the hit point (slightly above to avoid clipping)
        const offsetY = 1.6; // Eye height
        camera.position.set(
            hitPoint.x,
            hitPoint.y + offsetY,
            hitPoint.z
        );
        
        // Update orbit controls target to the new position
        threeRenderer.controls.target.copy(hitPoint);
        threeRenderer.controls.update();
        
        // Console log the coordinates
        console.log('📍 Teleported to coordinates:');
        console.log(`  Position: { x: ${hitPoint.x.toFixed(2)}, y: ${hitPoint.y.toFixed(2)}, z: ${hitPoint.z.toFixed(2)} }`);
        console.log(`  Camera Position: { x: ${camera.position.x.toFixed(2)}, y: ${camera.position.y.toFixed(2)}, z: ${camera.position.z.toFixed(2)} }`);
        console.log(`  Hit Object: ${hitObject.name || 'unnamed'} (${hitObject.type})`);
        console.log('  Use these coordinates for spawn points!');
    } else {
        console.log('⚠️ No object clicked - cannot teleport');
    }
}

window.addEventListener('click', (event) => {
    // Left-click in orbit mode: Place rail point
    if (threeRenderer.isFreeCamera && !event.shiftKey && event.button === 0) {
        event.preventDefault();
        placeRailPoint(event);
        return;
    }
    
    // Shift+Click for teleportation (backward compatibility)
    if (threeRenderer.isFreeCamera && event.shiftKey) {
        event.preventDefault();
        teleportToPoint(event);
        return;
    }
    
    // Normal click for shooting (when not in orbit mode)
    if (!threeRenderer.isFreeCamera || event.shiftKey) {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        shootWeapon(mouseX, mouseY, currentWeaponId);
    }
});

// Right-click for teleportation (when in orbit mode)
window.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent right-click menu
    if (threeRenderer.isFreeCamera) {
        teleportToPoint(event);
    }
});

// Double-click for coordinate logging
window.addEventListener('dblclick', (event) => {
    if (!threeRenderer.isFreeCamera) return;
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Get all objects in the scene that can be intersected
    const intersectableObjects = [];
    scene.traverse((object) => {
        if (object.isMesh && object.visible) {
            intersectableObjects.push(object);
        }
    });
    
    // Calculate intersections
    const intersects = raycaster.intersectObjects(intersectableObjects, true);
    
    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const hitObject = intersects[0].object;
        
        // Console log the coordinates
        console.log('📍 Double-click coordinates:');
        console.log(`  Position: { x: ${hitPoint.x.toFixed(2)}, y: ${hitPoint.y.toFixed(2)}, z: ${hitPoint.z.toFixed(2)} }`);
        console.log(`  Camera Position: { x: ${camera.position.x.toFixed(2)}, y: ${camera.position.y.toFixed(2)}, z: ${camera.position.z.toFixed(2)} }`);
        console.log(`  Hit Object: ${hitObject.name || 'unnamed'} (${hitObject.type})`);
    } else {
        // Log camera position if no object was clicked
        console.log('📍 Double-click coordinates (no object hit):');
        console.log(`  Camera Position: { x: ${camera.position.x.toFixed(2)}, y: ${camera.position.y.toFixed(2)}, z: ${camera.position.z.toFixed(2)} }`);
        console.log(`  Camera Look Direction: { x: ${camera.rotation.x.toFixed(2)}, y: ${camera.rotation.y.toFixed(2)}, z: ${camera.rotation.z.toFixed(2)} }`);
    }
});

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    // WASD movement keys
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keys[key] = true;
        return;
    }
    
    switch(key) {
        case 'r':
            if (gameData.currentState === GameState.GAME_OVER || 
                gameData.currentState === GameState.MISSION_COMPLETE) {
                restartGame();
            } else if (gameData.currentState === GameState.GAMEPLAY) {
                playerManager.reload();
            }
            break;
            
        case ' ':
            if (gameData.currentState === GameState.LOADING && renderManager.isReady()) {
                startGame();
            }
            break;
            
        case 'c':
            if (threeRenderer.isFreeCamera) {
                // In orbit mode: Clear rail points
                clearRailPoints();
            } else {
                // In game mode: Toggle camera
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
            }
            break;
            
        case 'e':
            if (threeRenderer.isFreeCamera) {
                exportRailPath();
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

// Handle key release for WASD movement
window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keys[key] = false;
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================
createUI();

// Clear zombies on startup (disabled in orbit mode)
zombieManager.clearZombies();

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

console.log('✅ Game Initialized (Orbit Controls Enabled)');
console.log('⚠️ Zombies are DISABLED in orbit mode for exploration');
console.log('Controls:');
console.log('  SPACE - Start Game');
console.log('\n═══════════════════════════════════════════════════');
console.log('🎮 ORBIT MODE - RAIL PATH EDITOR');
console.log('═══════════════════════════════════════════════════');
console.log('  Left Click (on object) - Place rail point');
console.log('  Right Click (on object) - Teleport camera');
console.log('  Shift + Click (on object) - Teleport camera');
console.log('  Double Click - Output coordinates to console');
console.log('  C - Clear all rail points');
console.log('  E - Export rail path coordinates');
console.log('  Mouse Drag - Rotate Camera (Orbit Controls)');
console.log('  Mouse Wheel - Zoom');
console.log('  Right Click + Drag - Pan');
console.log('  W/A/S/D - Move camera (in free camera mode)');
console.log('  R - Reload / Restart');
console.log('  H - Toggle Helpers');
console.log('\n📍 Rail points are shown as GREEN spheres');
console.log('📍 Rail path is shown as CYAN line connecting points');
console.log('═══════════════════════════════════════════════════\n');

// Note: Scene pre-rendering happens before revealing to ensure renderer readiness
// This prevents startup glitch by ensuring textures are uploaded to GPU first

