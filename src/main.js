import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';
import PowerUp from './powerups/PowerUp.js';
import ZombieManager from './enemies/ZombieManager.js';
import { updateRecoil, setRecoilWeapon } from './combat/Recoil.js';
import { initShootingSystem, shoot as shootWeapon, updateImpactSpheres as updateImpactSpheresInternal } from './combat/ShootingSystem.js';
import { initHUD, createUI, updateUI, updateFinalStats, saveLeaderboard } from './ui/HUD.js';

// ============================================================================
// GAME STATE
// ============================================================================
const GameState = {
    LOADING: 'LOADING',
    INTRO: 'INTRO',
    GAMEPLAY: 'GAMEPLAY',
    SCENE_TRANSITION: 'SCENE_TRANSITION',
    GAME_OVER: 'GAME_OVER',
    MISSION_COMPLETE: 'MISSION_COMPLETE'
};

const gameData = {
    currentState: GameState.LOADING,
    currentScene: 0,
    totalScenes: 3,
    
    // Player stats
    health: 100,
    maxHealth: 100,
    
    // Combat stats
    totalZombiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshotKills: 0,
    
    // Combo system
    currentCombo: 0,
    maxCombo: 0,
    comboTimer: 0,
    comboDecayTime: 3, // seconds
    
    // Score
    score: 0,
    
    // Ammo
    currentAmmo: 12,
    maxAmmo: 12,
    reserveAmmo: 60,
    isReloading: false,
    reloadTime: 2000,
    
    // Power-ups
    doubleDamageActive: false,
    doubleDamageTimer: 0,
    slowMoActive: false,
    slowMoTimer: 0,
    
    // Time
    startTime: 0,
    currentTime: 0,
    
    // Leaderboard (localStorage)
    bestScore: 0,
    bestAccuracy: 0,
    bestTime: 0
};

// ============================================================================
// SCENE SETUP
// ============================================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const BASE_FOV = 75;
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
const clock = new THREE.Clock();

// ============================================================================
// RAIL SHOOTER CAMERA POSITIONS (Scenes)
// ============================================================================
const CAMERA_SCENES = [
    {
        name: "Electronics Store",
        position: { x: 0, y: 1.6, z: 5 },
        lookAt: { x: 0, y: 1.5, z: 0 },
        spawnPoints: [
            { x: -3, y: 0, z: -5, type: 'walker' },
            { x: -1, y: 0, z: -7, type: 'runner' },
            { x: -2, y: 0, z: -6, type: 'crawler' },
            { x: 0, y: 0, z: -10, type: 'walker' },
            { x: 2, y: 0, z: -6, type: 'runner' },
            { x: 4, y: 0, z: -8, type: 'tank' },
            { x: 1, y: 0, z: -4, type: 'crawler' }
        ]
    },
    {
        name: "Alley Entrance",
        position: { x: -5, y: 1.6, z: 0 },
        lookAt: { x: -10, y: 1.5, z: -5 },
        spawnPoints: [
            { x: -15, y: 0, z: -8, type: 'runner' },
            { x: -12, y: 0, z: -6, type: 'runner' },
            { x: -14, y: 0, z: -4, type: 'walker' },
            { x: -10, y: 0, z: -10, type: 'tank' },
            { x: -13, y: 0, z: -2, type: 'walker' },
            { x: -11, y: 0, z: -7, type: 'runner' },
            { x: -12, y: 0, z: -9, type: 'crawler' }
        ]
    },
    {
        name: "Street Corner",
        position: { x: 5, y: 1.6, z: -5 },
        lookAt: { x: 10, y: 1.5, z: -10 },
        spawnPoints: [
            { x: 12, y: 0, z: -12, type: 'runner' },
            { x: 14, y: 0, z: -10, type: 'runner' },
            { x: 10, y: 0, z: -14, type: 'walker' },
            { x: 13, y: 0, z: -8, type: 'tank' },
            { x: 11, y: 0, z: -11, type: 'walker' },
            { x: 15, y: 0, z: -13, type: 'runner' },
            { x: 12, y: 0, z: -9, type: 'tank' },
            { x: 11, y: 0, z: -9, type: 'crawler' }
        ]
    }
];

let currentCameraScene = CAMERA_SCENES[0];

// ============================================================================
// LIGHTING
// ============================================================================
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffa040, 0.8);
directionalLight.position.set(-10, 10, -5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x6a7aff, 0.3);
fillLight.position.set(10, 5, 5);
scene.add(fillLight);

// ============================================================================
// SCENE OBJECTS
// ============================================================================
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.name = 'ground';
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// ============================================================================
// ZOMBIE MANAGER
// ============================================================================
const zombieManager = new ZombieManager(
    scene,
    camera,
    gameData,
    damagePlayer,
    incrementCombo
);

// ============================================================================
// SHOOTING SYSTEM INIT
// ============================================================================
initShootingSystem({
    sceneRef: scene,
    cameraRef: camera,
    gameDataRef: gameData,
    zombieManagerRef: zombieManager,
    powerUpsArrayRef: () => powerUps,
    reload,
    updateUI,
    resetCombo,
    createDamageNumber,
    showHeadshotIndicator,
    triggerScreenShake
});

// Global screen shake intensity used by camera breathing / shake
let screenShakeIntensity = 0;

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
// WEAPON PLACEHOLDER (current weapon id used by recoil & UI)
// ============================================================================
let currentWeaponId = 'pistol'; // TODO: replace with WeaponManager current weapon

function switchCurrentWeapon(id) {
    // Let recoil module validate id
    if (currentWeaponId === id) return;
    
    currentWeaponId = id;
    setRecoilWeapon(id);
    
    const weaponLabel = {
        pistol: 'PISTOL',
        shotgun: 'SHOTGUN',
        rifle: 'RIFLE'
    }[id] || id.toUpperCase();
    
    // Update weapon name in HUD
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
// POWER-UP SYSTEM
// ============================================================================
const powerUps = [];

// Fixed positions per scene for spawning power-ups
const POWERUP_SPAWN_POSITIONS = [
    // Scene 0 - Electronics Store
    [
        new THREE.Vector3(-2, 1, -6),
        new THREE.Vector3(2, 1, -8)
    ],
    // Scene 1 - Alley Entrance
    [
        new THREE.Vector3(-12, 1, -6),
        new THREE.Vector3(-14, 1, -9)
    ],
    // Scene 2 - Street Corner
    [
        new THREE.Vector3(11, 1, -10),
        new THREE.Vector3(13, 1, -12)
    ]
];

function spawnPowerUp(position, type) {
    let powerUp = null;
    const onCollect = (collectedType) => {
        handlePowerUpCollected(collectedType, powerUp);
    };
    
    powerUp = new PowerUp(position, type, scene, onCollect);
    powerUps.push(powerUp);
}

function spawnScenePowerUps() {
    const sceneIndex = gameData.currentScene;
    const positions = POWERUP_SPAWN_POSITIONS[sceneIndex] || [];
    if (positions.length === 0) return;
    
    const numToSpawn = Math.min(
        positions.length,
        1 + Math.floor(Math.random() * 2) // 1–2 per scene
    );
    
    const availableIndices = positions.map((_, i) => i);
    const types = ['health', 'ammo', 'double_damage', 'slow_mo'];
    
    for (let i = 0; i < numToSpawn; i++) {
        if (availableIndices.length === 0) break;
        
        const index = Math.floor(Math.random() * availableIndices.length);
        const posIndex = availableIndices.splice(index, 1)[0];
        
        const type = types[Math.floor(Math.random() * types.length)];
        spawnPowerUp(positions[posIndex], type);
    }
}

function clearPowerUps() {
    powerUps.forEach(p => p._dispose && p._dispose());
    powerUps.length = 0;
}

function handlePowerUpCollected(type, powerUpInstance) {
    // Remove from active list
    const idx = powerUps.indexOf(powerUpInstance);
    if (idx !== -1) powerUps.splice(idx, 1);
    
    const typeLabel = {
        health: 'HEALTH',
        ammo: 'AMMO',
        double_damage: 'DOUBLE DAMAGE',
        slow_mo: 'SLOW MOTION'
    }[type] || type.toUpperCase();
    
    showPowerUpMessage(`POWER-UP: ${typeLabel}`);
    
    switch (type) {
        case 'health':
            gameData.health = Math.min(
                gameData.maxHealth,
                gameData.health + 30
            );
            break;
        case 'ammo':
            gameData.reserveAmmo += 12;
            break;
        case 'double_damage':
            gameData.doubleDamageActive = true;
            gameData.doubleDamageTimer = 10;
            break;
        case 'slow_mo':
            gameData.slowMoActive = true;
            gameData.slowMoTimer = 5;
            break;
    }
    
    updateUI();
}

function updatePowerUps(deltaTime) {
    powerUps.forEach(p => {
        p.update(deltaTime, camera);
        p.updateFade(deltaTime);
    });
}

function updatePowerUpTimers(deltaTime) {
    if (gameData.doubleDamageActive) {
        gameData.doubleDamageTimer -= deltaTime;
        if (gameData.doubleDamageTimer <= 0) {
            gameData.doubleDamageActive = false;
            gameData.doubleDamageTimer = 0;
        }
    }
    
    if (gameData.slowMoActive) {
        gameData.slowMoTimer -= deltaTime;
        if (gameData.slowMoTimer <= 0) {
            gameData.slowMoActive = false;
            gameData.slowMoTimer = 0;
        }
    }
}

function updatePowerUpUI() {
    const msgEl = document.getElementById('powerup-message');
    const ddEl = document.getElementById('double-damage-timer');
    const smEl = document.getElementById('slow-mo-timer');
    
    if (ddEl) {
        if (gameData.doubleDamageActive) {
            ddEl.style.display = 'inline-block';
            ddEl.textContent = `DOUBLE DAMAGE: ${Math.ceil(gameData.doubleDamageTimer)}s`;
        } else {
            ddEl.style.display = 'none';
        }
    }
    
    if (smEl) {
        if (gameData.slowMoActive) {
            smEl.style.display = 'inline-block';
            smEl.textContent = `SLOW MO: ${Math.ceil(gameData.slowMoTimer)}s`;
        } else {
            smEl.style.display = 'none';
        }
    }
    
    // Message element is controlled by showPowerUpMessage
    if (msgEl && !msgEl.dataset.visible) {
        msgEl.style.display = 'none';
    }
}

let powerUpMessageTimeout = null;
function showPowerUpMessage(text) {
    const msgEl = document.getElementById('powerup-message');
    if (!msgEl) return;
    
    msgEl.textContent = text;
    msgEl.style.display = 'block';
    msgEl.dataset.visible = 'true';
    
    if (powerUpMessageTimeout) {
        clearTimeout(powerUpMessageTimeout);
    }
    
    powerUpMessageTimeout = setTimeout(() => {
        msgEl.style.display = 'none';
        delete msgEl.dataset.visible;
    }, 1500);
}

// ============================================================================
// CAMERA BREATHING / SWAY
// ============================================================================
function updateCameraBreathing(elapsedTime) {
    // Only in rail shooter mode during normal gameplay
    if (isFreeCamera) return;
    if (gameData.currentState !== GameState.GAMEPLAY) return;
    
    // Skip if screen shake is active
    if (screenShakeIntensity > 0.001) return;
    
    // Gentle breathing offsets
    const breathY = Math.sin(elapsedTime * 2.0) * 0.005;   // ±0.005
    const breathX = Math.cos(elapsedTime * 1.5) * 0.003;   // ±0.003
    const swayZ   = Math.sin(elapsedTime * 1.8) * 0.002;   // ±0.002 (rotation)
    
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

function spawnSceneZombies() {
    console.log(`🎬 Spawning zombies for Scene ${gameData.currentScene + 1}: ${currentCameraScene.name}`);
    zombieManager.spawnSceneZombies(currentCameraScene.spawnPoints);
    updateUI();
}

function updateZombies(deltaTime) {
    zombieManager.update(
        deltaTime,
        gameData.slowMoActive,
        gameData.currentState,
        GameState.GAMEPLAY,
        onSceneCleared
    );
}

function onSceneCleared() {
    console.log(`✅ Scene ${gameData.currentScene + 1} cleared!`);
    
    // Move to next scene or complete mission
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
    
    // Clear old zombies
    zombieManager.clearZombies();
    
    // Animate camera to new position
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
// PLAYER DAMAGE & HEALTH
// ============================================================================
function damagePlayer(amount) {
    if (gameData.health <= 0) return;
    
    gameData.health = Math.max(0, gameData.health - amount);
    console.log(`💔 Player hit! Health: ${gameData.health}/${gameData.maxHealth}`);
    
    // Reset combo on hit
    resetCombo();
    
    // Screen flash red
    const flash = document.getElementById('damage-flash');
    flash.style.opacity = '0.5';
    setTimeout(() => flash.style.opacity = '0', 200);
    
    updateUI();
    
    if (gameData.health <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameData.currentState = GameState.GAME_OVER;
    console.log('💀 GAME OVER');
    
    document.getElementById('game-over-screen').style.display = 'flex';
    updateFinalStats();
    saveLeaderboard();
}

// ============================================================================
// COMBO SYSTEM
// ============================================================================
function incrementCombo() {
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
    
    updateUI();
}

function resetCombo() {
    if (gameData.currentCombo > 0) {
        console.log(`❌ Combo broken at x${gameData.currentCombo}`);
    }
    gameData.currentCombo = 0;
    gameData.comboTimer = 0;
}

function updateComboTimer(deltaTime) {
    if (gameData.comboTimer > 0) {
        gameData.comboTimer -= deltaTime;
        if (gameData.comboTimer <= 0) {
            resetCombo();
        }
    }
}

// ============================================================================
// SHOOTING SYSTEM (input binding)
// ============================================================================

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

window.addEventListener('click', (event) => {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    shootWeapon(mouseX, mouseY, currentWeaponId);
});

function triggerScreenShake() {
    screenShakeIntensity = 0.02;
}

function updateScreenShake() {
    if (screenShakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
        const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
        
        if (!isFreeCamera) {
            camera.position.x = currentCameraScene.position.x + shakeX;
            camera.position.y = currentCameraScene.position.y + shakeY;
        }
        
        screenShakeIntensity *= 0.85;
        
        if (screenShakeIntensity < 0.001) {
            screenShakeIntensity = 0;
        }
    }
}

function createImpactSphere(hitPoint) {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 1
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(hitPoint);
    scene.add(sphere);
    
    impactSpheres.push({ mesh: sphere, opacity: 1, scale: 1 });
}

function updateImpactSpheres() {
    updateImpactSpheresInternal();
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

// ============================================================================
// RELOAD SYSTEM
// ============================================================================
function reload() {
    if (gameData.isReloading) return;
    if (gameData.currentAmmo === gameData.maxAmmo) return;
    if (gameData.reserveAmmo === 0) return;
    
    gameData.isReloading = true;
    document.getElementById('reload-indicator').style.display = 'block';
    
    setTimeout(() => {
        const ammoNeeded = gameData.maxAmmo - gameData.currentAmmo;
        const ammoToReload = Math.min(ammoNeeded, gameData.reserveAmmo);
        
        gameData.currentAmmo += ammoToReload;
        gameData.reserveAmmo -= ammoToReload;
        gameData.isReloading = false;
        
        document.getElementById('reload-indicator').style.display = 'none';
        updateUI();
    }, gameData.reloadTime);
}

function completeMission() {
    gameData.currentState = GameState.MISSION_COMPLETE;
    console.log('🎉 MISSION COMPLETE!');
    
    // Ending camera sequence
    setTimeout(() => {
        document.getElementById('mission-complete').style.display = 'flex';
        updateFinalStats();
        saveLeaderboard();
    }, 2000);
}

// ============================================================================
// CAMERA CONTROLS
// ============================================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
let isFreeCamera = false;
controls.enabled = isFreeCamera;

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    switch(key) {
        case 'r':
            if (gameData.currentState === GameState.GAME_OVER || 
                gameData.currentState === GameState.MISSION_COMPLETE) {
                restartGame();
            } else if (gameData.currentState === GameState.GAMEPLAY) {
                reload();
            }
            break;
            
        case ' ':
            if (gameData.currentState === GameState.LOADING) {
                startGame();
            }
            break;
            
        case 'c':
            isFreeCamera = !isFreeCamera;
            controls.enabled = isFreeCamera;
            if (!isFreeCamera) {
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
            axesHelper.visible = !axesHelper.visible;
            break;
        
        // Weapon switching (temporary until full WeaponManager integration)
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
// GAME FUNCTIONS
// ============================================================================
function startGame() {
    console.log('🚀 Starting Game');
    
    gameData.currentState = GameState.GAMEPLAY;
    gameData.currentScene = 0;
    gameData.health = gameData.maxHealth;
    gameData.totalZombiesKilled = 0;
    gameData.shotsFired = 0;
    gameData.shotsHit = 0;
    gameData.headshotKills = 0;
    gameData.currentCombo = 0;
    gameData.maxCombo = 0;
    gameData.score = 0;
    gameData.currentAmmo = gameData.maxAmmo;
    gameData.reserveAmmo = 60;
    
    // Reset power-ups
    clearPowerUps();
    gameData.doubleDamageActive = false;
    gameData.doubleDamageTimer = 0;
    gameData.slowMoActive = false;
    gameData.slowMoTimer = 0;
    gameData.startTime = Date.now();
    
    currentCameraScene = CAMERA_SCENES[0];
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
    
    spawnSceneZombies();
    spawnScenePowerUps();
    showSceneTitle();
    updateUI();
}

function restartGame() {
    console.log('🔄 Restarting Game');
    
    zombieManager.clearZombies();
    clearPowerUps();
    
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('mission-complete').style.display = 'none';
    
    startGame();
}

// ============================================================================
// RENDER LOOP
// ============================================================================
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update TWEEN for camera transitions
    TWEEN.update();
    
    if (isFreeCamera) {
        controls.update();
    }
    
    if (gameData.currentState === GameState.GAMEPLAY) {
        updateZombies(deltaTime);
        updateComboTimer(deltaTime);
        updatePowerUps(deltaTime);
        updatePowerUpTimers(deltaTime);
        gameData.currentTime = (Date.now() - gameData.startTime) / 1000;
        updateUI();
    }
    
    updateCameraBreathing(elapsedTime);
    updateRecoil(deltaTime, camera, BASE_FOV);
    updatePowerUpUI();
    updateScreenShake();
    updateImpactSpheres();
    
    renderer.render(scene, camera);
}

// ============================================================================
// WINDOW RESIZE
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// INITIALIZATION
// ============================================================================
createUI();
console.log('✅ Game Initialized');
console.log('Controls:');
console.log('  SPACE - Start Game');
console.log('  Click - Shoot');
console.log('  R - Reload / Restart');
console.log('  C - Toggle Camera');
console.log('  H - Toggle Helpers');

setTimeout(() => startGame(), 1000);
animate();