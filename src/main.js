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
    () => {}, // Not needed - PlayerManager handles resetCombo internally
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
    triggerScreenShake: () => { screenShakeIntensity = 0.02; },
    getGround: () => threeRenderer.getGround() // Pass renderer's getGround method
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

// ============================================================================
// RENDER MANAGER UPDATE CALLBACKS
// ============================================================================
renderManager.setUpdateCallbacks({
    tween: () => TWEEN.update(),
    freeCamera: {
        enabled: true, // Enabled by default for debugging
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
        (elapsedTime) => updateCameraBreathing(elapsedTime),
        (elapsedTime, deltaTime) => updateRecoil(deltaTime, camera, threeRenderer.BASE_FOV),
        () => updateScreenShake()
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

/**
 * Find and set ground mesh from a GLB model
 * Uses multiple detection strategies: name, geometry characteristics, position
 */
function findAndSetGround(model, modelName = 'model') {
    if (!model) return false;
    
    let groundFound = false;
    const candidateMeshes = [];
    
    // First pass: Find ground by name/material
    model.traverse((child) => {
        if (child.isMesh) {
            const name = child.name.toLowerCase();
            const matName = child.material?.name?.toLowerCase() || '';
            
            if (name.includes('ground') || name.includes('floor') || 
                matName.includes('ground') || matName.includes('floor')) {
                child.name = 'ground';
                child.receiveShadow = true;
                threeRenderer.setGround(child);
                groundFound = true;
                console.log(`✅ Found ground mesh by name in ${modelName}: "${child.name}"`);
                return;
            }
            
            // Store potential ground candidates (large horizontal meshes)
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            const isHorizontal = size.y < Math.min(size.x, size.z) * 0.1; // Height is much smaller than width/depth
            const isLarge = Math.max(size.x, size.z) > 10; // At least 10 units wide
            const isLow = box.min.y < 0.5 && box.max.y < 2; // Close to ground level
            
            if (isHorizontal && isLarge && isLow) {
                candidateMeshes.push({
                    mesh: child,
                    size: size,
                    y: box.min.y,
                    name: child.name
                });
            }
        }
    });
    
    // Second pass: If no ground found by name, try to find by geometry characteristics
    if (!groundFound && candidateMeshes.length > 0) {
        // Sort by lowest Y position (closest to ground level)
        candidateMeshes.sort((a, b) => a.y - b.y);
        const groundCandidate = candidateMeshes[0].mesh;
        groundCandidate.name = 'ground';
        groundCandidate.receiveShadow = true;
        threeRenderer.setGround(groundCandidate);
        groundFound = true;
        console.log(`✅ Found ground mesh by geometry in ${modelName}: "${groundCandidate.name}" (Y: ${candidateMeshes[0].y.toFixed(2)})`);
    }
    
    // Third pass: Try to find any mesh at y=0 or very low
    if (!groundFound) {
        model.traverse((child) => {
            if (child.isMesh && !groundFound) {
                const box = new THREE.Box3().setFromObject(child);
                const center = box.getCenter(new THREE.Vector3());
                // Check if mesh is near ground level (y < 1)
                if (center.y < 1 && box.min.y < 0.5) {
                    const size = box.getSize(new THREE.Vector3());
                    // Prefer larger meshes (likely ground)
                    if (size.x > 5 || size.z > 5) {
                        child.name = 'ground';
                        child.receiveShadow = true;
                        threeRenderer.setGround(child);
                        groundFound = true;
                        console.log(`✅ Found ground mesh by position in ${modelName}: "${child.name}" at Y: ${center.y.toFixed(2)}`);
                    }
                }
            }
        });
    }
    
    if (!groundFound && candidateMeshes.length > 0) {
        console.log(`⚠️ ${modelName}: Found ${candidateMeshes.length} candidate meshes but none were suitable`);
    }
    
    return groundFound;
}

function spawnSceneZombies() {
    console.log(`🎬 Spawning zombies for Scene ${gameData.currentScene + 1}: ${currentCameraScene.name}`);
    zombieManager.spawnSceneZombies(currentCameraScene.spawnPoints);
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
        // Update ground reference using improved detection
        if (!findAndSetGround(sceneLoader.warehouseModel, 'warehouse')) {
            console.warn('⚠️ No ground found in warehouse, using factory ground');
        }
    } else if (gameData.currentScene === 0) {
        sceneLoader.showFactory();
        // Update ground reference using improved detection
        if (!findAndSetGround(sceneLoader.currentSceneModel, 'factory')) {
            console.warn('⚠️ No ground found in factory, creating fallback');
            const groundGeo = new THREE.PlaneGeometry(200, 200);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
            const fallbackGround = new THREE.Mesh(groundGeo, groundMat);
            fallbackGround.name = 'ground';
            fallbackGround.rotation.x = -Math.PI / 2;
            fallbackGround.position.y = -0.1;
            fallbackGround.receiveShadow = true;
            threeRenderer.setGround(fallbackGround);
        }
    }
    
    zombieManager.clearZombies();
    powerUpManager.clear();
    
    // Animate camera
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
    
    // Camera setup
    currentCameraScene = CAMERA_SCENES[0];
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

window.addEventListener('click', (event) => {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    shootWeapon(mouseX, mouseY, currentWeaponId);
});

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
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

// Load factory scene on startup
sceneLoader.loadFactoryScene(scene, (factoryModel) => {
    if (factoryModel) {
        // Find ground using improved detection
        const groundFound = findAndSetGround(factoryModel, 'factory scene');
        
        // Fallback ground if none found
        if (!groundFound || !threeRenderer.getGround()) {
            console.log('⚠️ No ground found in factory scene, creating fallback');
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
console.log('  C - Toggle Camera (Orbit/Rail)');
console.log('  H - Toggle Helpers');
console.log('');
console.log('🎥 Orbit Controls ENABLED by default:');
console.log('  - Left Click + Drag: Rotate');
console.log('  - Right Click + Drag: Pan');
console.log('  - Scroll Wheel: Zoom');
console.log('  - Press C to toggle between Orbit/Rail camera modes');

// Note: Scene pre-rendering happens before revealing to ensure renderer readiness
// This prevents startup glitch by ensuring textures are uploaded to GPU first

