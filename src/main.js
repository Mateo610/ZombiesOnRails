import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================================
// GAME STATE (Simplified for now - we'll add full manager later)
// ============================================================================
const GameState = {
    LOADING: 'LOADING',
    GAMEPLAY: 'GAMEPLAY',
    MISSION_COMPLETE: 'MISSION_COMPLETE',
    PAUSED: 'PAUSED'
};

const gameData = {
    currentState: GameState.LOADING,
    totalZombies: 5,
    zombiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    score: 0,
    // Ammo system
    currentAmmo: 12,
    maxAmmo: 12,
    reserveAmmo: 60,
    isReloading: false,
    reloadTime: 2000 // 2 seconds
};

// ============================================================================
// LOADERS
// ============================================================================
const gltfLoader = new GLTFLoader();

// ============================================================================
// SCENE SETUP
// ============================================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const railCameraPosition = { x: 0, y: 1.6, z: 5 };
const railCameraLookAt = { x: 0, y: 1.5, z: 0 };
camera.position.set(railCameraPosition.x, railCameraPosition.y, railCameraPosition.z);
camera.lookAt(railCameraLookAt.x, railCameraLookAt.y, railCameraLookAt.z);

// Clock for delta time
const clock = new THREE.Clock();

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
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x6a7aff, 0.3);
fillLight.position.set(10, 5, 5);
scene.add(fillLight);

// ============================================================================
// SCENE
// ============================================================================
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// ============================================================================
// ZOMBIE SYSTEM
// ============================================================================
class Zombie {
    constructor(position) {
        // Create zombie mesh (red cube for now)
        const geometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff3300,
            emissiveIntensity: 0.5
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height above ground
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Zombie data
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 0.5; // units per second
        this.isDead = false;
        this.target = new THREE.Vector3(0, 0.75, 5); // Walk toward camera
        
        // Store reference to this zombie in mesh
        this.mesh.userData.zombie = this;
        this.mesh.userData.isZombie = true;
        
        scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (this.isDead) return;
        
        // Move toward target
        const direction = new THREE.Vector3();
        direction.subVectors(this.target, this.mesh.position);
        direction.y = 0; // Don't move vertically
        
        const distance = direction.length();
        
        if (distance > 1.0) { // Stop when close
            direction.normalize();
            
            // Move zombie
            this.mesh.position.x += direction.x * this.speed * deltaTime;
            this.mesh.position.z += direction.z * this.speed * deltaTime;
            
            // Rotate to face target
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        }
    }
    
    takeDamage(amount) {
        if (this.isDead) return false;
        
        this.health -= amount;
        
        // Flash red when hit
        this.mesh.material.emissiveIntensity = 1.0;
        setTimeout(() => {
            if (this.mesh.material) {
                this.mesh.material.emissiveIntensity = 0.5;
            }
        }, 100);
        
        if (this.health <= 0) {
            this.die();
            return true; // Zombie killed
        }
        
        return false; // Still alive
    }
    
    die() {
        this.isDead = true;
        
        // Death animation - fall and fade
        const startY = this.mesh.position.y;
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fall down
            this.mesh.position.y = startY * (1 - progress);
            this.mesh.rotation.x = progress * Math.PI / 2;
            
            // Fade out
            this.mesh.material.opacity = 1 - progress;
            this.mesh.material.transparent = true;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.remove();
            }
        };
        
        animate();
    }
    
    remove() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// Zombie manager
const zombies = [];

function spawnZombie(position) {
    const zombie = new Zombie(position);
    zombies.push(zombie);
    console.log(`🧟 Spawned zombie at`, position);
    updateUI();
}

function updateZombies(deltaTime) {
    zombies.forEach(zombie => zombie.update(deltaTime));
}

function getAliveZombieCount() {
    return zombies.filter(z => !z.isDead).length;
}

// Spawn initial zombies
function spawnWave() {
    // Spawn 5 zombies at different positions
    spawnZombie(new THREE.Vector3(-3, 0, -5));
    spawnZombie(new THREE.Vector3(-1, 0, -7));
    spawnZombie(new THREE.Vector3(0, 0, -10));
    spawnZombie(new THREE.Vector3(2, 0, -6));
    spawnZombie(new THREE.Vector3(4, 0, -8));
}

// ============================================================================
// UI SYSTEM
// ============================================================================
function createUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'game-ui';
    uiContainer.innerHTML = `
        <!-- HUD -->
        <div id="hud" style="
            position: fixed;
            top: 20px;
            left: 20px;
            font-family: 'Courier New', monospace;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff, 2px 2px 4px #000;
            font-size: 20px;
            z-index: 10;
            pointer-events: none;
        ">
            <div style="margin-bottom: 10px;">
                ZOMBIES: <span id="zombie-count">0</span>/<span id="zombie-total">5</span>
            </div>
            <div style="margin-bottom: 10px;">
                SCORE: <span id="score">0</span>
            </div>
            <div style="margin-bottom: 10px;">
                ACCURACY: <span id="accuracy">0</span>%
            </div>
        </div>
        
        <!-- Ammo Display -->
        <div id="ammo-display" style="
            position: fixed;
            bottom: 40px;
            right: 40px;
            font-family: 'Courier New', monospace;
            text-align: right;
            z-index: 10;
            pointer-events: none;
        ">
            <div style="
                font-size: 48px;
                color: #fff;
                text-shadow: 0 0 15px #fff, 3px 3px 6px #000;
                font-weight: bold;
            ">
                <span id="current-ammo">12</span> / <span id="reserve-ammo">60</span>
            </div>
            <div id="reload-indicator" style="
                font-size: 24px;
                color: #ffff00;
                text-shadow: 0 0 10px #ffff00;
                margin-top: 10px;
                display: none;
            ">
                RELOADING...
            </div>
        </div>
        
        <!-- Mission Complete Screen -->
        <div id="mission-complete" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
        ">
            <div style="text-align: center;">
                <div style="
                    font-size: 72px;
                    color: #ffff00;
                    text-shadow: 0 0 30px #ffff00;
                    margin-bottom: 40px;
                    animation: pulse 1.5s infinite;
                ">
                    MISSION COMPLETE
                </div>
                <div style="font-size: 32px; color: #00ffff; margin-bottom: 20px;">
                    Zombies Eliminated: <span id="final-kills">0</span>
                </div>
                <div style="font-size: 32px; color: #00ffff; margin-bottom: 20px;">
                    Accuracy: <span id="final-accuracy">0</span>%
                </div>
                <div style="font-size: 48px; color: #fff; margin-top: 40px;">
                    FINAL SCORE: <span id="final-score">0</span>
                </div>
                <div style="
                    font-size: 24px;
                    color: #ff1493;
                    margin-top: 60px;
                    animation: blink 1.5s infinite;
                ">
                    Press R to Restart
                </div>
            </div>
        </div>
        
        <!-- Controls Info -->
        <div id="controls-info" style="
            position: fixed;
            top: 20px;
            right: 20px;
            font-family: 'Courier New', monospace;
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            text-align: right;
            z-index: 10;
            pointer-events: none;
        ">
            <div>Click: SHOOT</div>
            <div>R: RELOAD</div>
            <div>C: Toggle Camera</div>
            <div>Space: Start</div>
        </div>
        
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
        </style>
    `;
    
    document.body.appendChild(uiContainer);
}

function updateUI() {
    // Update zombie count
    document.getElementById('zombie-count').textContent = gameData.zombiesKilled;
    document.getElementById('zombie-total').textContent = gameData.totalZombies;
    
    // Update score
    document.getElementById('score').textContent = gameData.score;
    
    // Update accuracy
    const accuracy = gameData.shotsFired > 0 
        ? Math.round((gameData.shotsHit / gameData.shotsFired) * 100)
        : 0;
    document.getElementById('accuracy').textContent = accuracy;
    
    // Update ammo
    document.getElementById('current-ammo').textContent = gameData.currentAmmo;
    document.getElementById('reserve-ammo').textContent = gameData.reserveAmmo;
    
    // Color ammo based on amount
    const ammoElement = document.getElementById('current-ammo');
    if (gameData.currentAmmo === 0) {
        ammoElement.style.color = '#ff0000';
    } else if (gameData.currentAmmo <= 3) {
        ammoElement.style.color = '#ffff00';
    } else {
        ammoElement.style.color = '#ffffff';
    }
}

function showMissionComplete() {
    document.getElementById('final-kills').textContent = gameData.zombiesKilled;
    const accuracy = gameData.shotsFired > 0 
        ? Math.round((gameData.shotsHit / gameData.shotsFired) * 100)
        : 0;
    document.getElementById('final-accuracy').textContent = accuracy;
    document.getElementById('final-score').textContent = gameData.score;
    
    document.getElementById('mission-complete').style.display = 'flex';
}

function createDamageNumber(position, damage) {
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
        font-size: 32px;
        font-weight: bold;
        color: #ff0000;
        text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
        pointer-events: none;
        z-index: 999;
        animation: floatUp 1s ease-out forwards;
    `;
    damageDiv.textContent = `-${damage}`;
    
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
// AMMO & RELOAD SYSTEM
// ============================================================================
function reload() {
    if (gameData.isReloading) return;
    if (gameData.currentAmmo === gameData.maxAmmo) {
        console.log('🔫 Clip already full');
        return;
    }
    if (gameData.reserveAmmo === 0) {
        console.log('❌ No reserve ammo');
        return;
    }
    
    gameData.isReloading = true;
    document.getElementById('reload-indicator').style.display = 'block';
    console.log('🔄 Reloading...');
    
    setTimeout(() => {
        // Calculate ammo to reload
        const ammoNeeded = gameData.maxAmmo - gameData.currentAmmo;
        const ammoToReload = Math.min(ammoNeeded, gameData.reserveAmmo);
        
        gameData.currentAmmo += ammoToReload;
        gameData.reserveAmmo -= ammoToReload;
        gameData.isReloading = false;
        
        document.getElementById('reload-indicator').style.display = 'none';
        console.log('✅ Reload complete!');
        updateUI();
    }, gameData.reloadTime);
}

// ============================================================================
// SHOOTING SYSTEM
// ============================================================================
const raycaster = new THREE.Raycaster();
const muzzleFlash = document.getElementById('muzzle-flash');
let impactSpheres = [];
let screenShakeIntensity = 0;

function triggerMuzzleFlash() {
    muzzleFlash.style.opacity = '1';
    setTimeout(() => muzzleFlash.style.opacity = '0', 50);
}

function triggerScreenShake() {
    screenShakeIntensity = 0.02;
}

function updateScreenShake() {
    if (screenShakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
        const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
        
        if (!isFreeCamera) {
            camera.position.x = railCameraPosition.x + shakeX;
            camera.position.y = railCameraPosition.y + shakeY;
        }
        
        screenShakeIntensity *= 0.85;
        
        if (screenShakeIntensity < 0.001) {
            screenShakeIntensity = 0;
            if (!isFreeCamera) {
                camera.position.set(railCameraPosition.x, railCameraPosition.y, railCameraPosition.z);
            }
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
    
    impactSpheres.push({
        mesh: sphere,
        opacity: 1,
        scale: 1
    });
}

function updateImpactSpheres() {
    for (let i = impactSpheres.length - 1; i >= 0; i--) {
        const impact = impactSpheres[i];
        impact.opacity -= 0.05;
        impact.scale += 0.1;
        
        if (impact.opacity <= 0) {
            scene.remove(impact.mesh);
            impact.mesh.geometry.dispose();
            impact.mesh.material.dispose();
            impactSpheres.splice(i, 1);
        } else {
            impact.mesh.material.opacity = impact.opacity;
            impact.mesh.scale.setScalar(impact.scale);
        }
    }
}

// Shooting handler
window.addEventListener('click', (event) => {
    if (gameData.currentState !== GameState.GAMEPLAY) return;
    if (gameData.isReloading) {
        console.log('⏳ Still reloading...');
        return;
    }
    
    // Check ammo
    if (gameData.currentAmmo <= 0) {
        console.log('🔫 Out of ammo! Press R to reload');
        // Auto reload if reserve ammo available
        if (gameData.reserveAmmo > 0) {
            reload();
        }
        return;
    }
    
    // Use ammo
    gameData.currentAmmo--;
    gameData.shotsFired++;
    
    triggerMuzzleFlash();
    triggerScreenShake();
    
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Get all zombie meshes
    const zombieMeshes = zombies.map(z => z.mesh);
    const intersects = raycaster.intersectObjects([ground, ...zombieMeshes], false);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPoint = intersects[0].point;
        
        createImpactSphere(hitPoint);
        
        // Check if hit zombie
        if (hitObject.userData.isZombie) {
            gameData.shotsHit++;
            const zombie = hitObject.userData.zombie;
            const killed = zombie.takeDamage(50);
            
            createDamageNumber(hitPoint, 50);
            console.log('🎯 HIT! Zombie health:', zombie.health);
            
            if (killed) {
                gameData.zombiesKilled++;
                gameData.score += 100;
                console.log(`💀 ZOMBIE KILLED! ${gameData.zombiesKilled}/${gameData.totalZombies}`);
                
                // Check if all zombies dead
                if (gameData.zombiesKilled >= gameData.totalZombies) {
                    setTimeout(() => {
                        gameData.currentState = GameState.MISSION_COMPLETE;
                        showMissionComplete();
                    }, 1000);
                }
            }
        } else {
            console.log('💨 Hit ground');
        }
    } else {
        console.log('💨 MISS');
    }
    
    updateUI();
});

// ============================================================================
// CAMERA CONTROLS
// ============================================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
let isFreeCamera = false; // Start in rail shooter mode
controls.enabled = isFreeCamera;

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    switch(key) {
        case 'c':
            isFreeCamera = !isFreeCamera;
            controls.enabled = isFreeCamera;
            if (!isFreeCamera) {
                camera.position.set(railCameraPosition.x, railCameraPosition.y, railCameraPosition.z);
                camera.lookAt(railCameraLookAt.x, railCameraLookAt.y, railCameraLookAt.z);
                console.log('🎮 Rail Shooter Mode');
            } else {
                console.log('🎥 Free Camera Mode');
            }
            break;
            
        case 'r':
            if (gameData.currentState === GameState.MISSION_COMPLETE) {
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
            
        case 'h':
            axesHelper.visible = !axesHelper.visible;
            break;
    }
});

// ============================================================================
// GAME FUNCTIONS
// ============================================================================
function startGame() {
    console.log('🚀 Starting Game');
    gameData.currentState = GameState.GAMEPLAY;
    gameData.zombiesKilled = 0;
    gameData.shotsFired = 0;
    gameData.shotsHit = 0;
    gameData.score = 0;
    gameData.currentAmmo = gameData.maxAmmo;
    gameData.reserveAmmo = 60;
    
    spawnWave();
    updateUI();
}

function restartGame() {
    console.log('🔄 Restarting Game');
    
    // Remove all zombies
    zombies.forEach(zombie => zombie.remove());
    zombies.length = 0;
    
    // Hide mission complete
    document.getElementById('mission-complete').style.display = 'none';
    
    // Reset and start
    startGame();
}

// ============================================================================
// RENDER LOOP
// ============================================================================
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    if (isFreeCamera) {
        controls.update();
    }
    
    if (gameData.currentState === GameState.GAMEPLAY) {
        updateZombies(deltaTime);
    }
    
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
console.log('  R - Reload (or Restart when complete)');
console.log('  C - Toggle Camera');
console.log('  H - Toggle Helpers');

// Auto-start after 1 second
setTimeout(() => startGame(), 1000);

// Start render loop
animate();