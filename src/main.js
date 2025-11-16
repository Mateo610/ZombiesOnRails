import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8B7D6B, 10, 50); // Dark brown fog for moody atmosphere

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Camera - store initial rail shooter position
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const railCameraPosition = { x: 0, y: 1.6, z: 5 };
const railCameraLookAt = { x: 0, y: 1.5, z: 0 };

camera.position.set(railCameraPosition.x, railCameraPosition.y, railCameraPosition.z);
camera.lookAt(railCameraLookAt.x, railCameraLookAt.y, railCameraLookAt.z);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Soft ambient
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Ground plane - dark gray concrete
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Helper objects for visual reference
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// TV Box - large display with blue glow
const tvGeometry = new THREE.BoxGeometry(4, 2, 0.5);
const tvMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    emissive: 0x0066ff,
    emissiveIntensity: 0.3
});
const tv = new THREE.Mesh(tvGeometry, tvMaterial);
tv.position.set(0, 1.5, -3);
tv.castShadow = true;
scene.add(tv);

// Store Window - transparent glass
const windowGeometry = new THREE.BoxGeometry(3, 2, 0.2);
const windowMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.9
});
const storeWindow = new THREE.Mesh(windowGeometry, windowMaterial);
storeWindow.position.set(0, 1.8, -2.5);
storeWindow.castShadow = true;
scene.add(storeWindow);

// Zombie Spawn Point - colorful cube marker
const zombieSpawnGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const zombieSpawnMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    emissive: 0xff3300,
    emissiveIntensity: 0.5
});
const zombieSpawn = new THREE.Mesh(zombieSpawnGeometry, zombieSpawnMaterial);
zombieSpawn.position.set(3, 0.5, 0);
zombieSpawn.castShadow = true;
scene.add(zombieSpawn);

// Store all shootable objects in an array for raycaster
const shootableObjects = [ground, tv, storeWindow, zombieSpawn];

// Raycaster for shooting
const raycaster = new THREE.Raycaster();

// Shooting feedback variables
const muzzleFlash = document.getElementById('muzzle-flash');
let impactSpheres = [];
let screenShakeIntensity = 0;

// Screen shake uses railCameraPosition as the base

// Audio setup (placeholder for now)
let gunshotSound = null;
// TODO: Load audio file when ready
// const audioLoader = new THREE.AudioLoader();
// const listener = new THREE.AudioListener();
// camera.add(listener);
// gunshotSound = new THREE.Audio(listener);
// audioLoader.load('path/to/gunshot.mp3', (buffer) => { gunshotSound.setBuffer(buffer); });

// Muzzle flash effect
function triggerMuzzleFlash() {
    muzzleFlash.style.opacity = '1';
    setTimeout(() => {
        muzzleFlash.style.opacity = '0';
    }, 50);
}

// Play gunshot sound
function playGunshotSound() {
    if (gunshotSound) {
        gunshotSound.stop();
        gunshotSound.play();
    }
}

// Screen shake effect
function triggerScreenShake() {
    screenShakeIntensity = 0.02;
}

// Update screen shake in render loop
function updateScreenShake() {
    if (screenShakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
        const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
        
        // Only apply shake when NOT in free camera mode
        if (!isFreeCamera) {
            camera.position.x = railCameraPosition.x + shakeX;
            camera.position.y = railCameraPosition.y + shakeY;
        }
        
        screenShakeIntensity *= 0.85; // Decay shake
        
        if (screenShakeIntensity < 0.001) {
            screenShakeIntensity = 0;
            // Reset to original position
            if (!isFreeCamera) {
                camera.position.x = railCameraPosition.x;
                camera.position.y = railCameraPosition.y;
            }
        }
    }
}

// Create impact sphere at hit point
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
    
    // Store in array with fade properties
    impactSpheres.push({
        mesh: sphere,
        opacity: 1,
        scale: 1
    });
}

// Update impact spheres in render loop
function updateImpactSpheres() {
    for (let i = impactSpheres.length - 1; i >= 0; i--) {
        const impactSphere = impactSpheres[i];
        
        // Fade out
        impactSphere.opacity -= 0.05;
        
        // Scale up slightly
        impactSphere.scale += 0.1;
        
        if (impactSphere.opacity <= 0) {
            // Remove sphere when fully faded
            scene.remove(impactSphere.mesh);
            impactSphere.mesh.geometry.dispose();
            impactSphere.mesh.material.dispose();
            impactSpheres.splice(i, 1);
        } else {
            // Update sphere appearance
            impactSphere.mesh.material.opacity = impactSphere.opacity;
            impactSphere.mesh.scale.set(impactSphere.scale, impactSphere.scale, impactSphere.scale);
        }
    }
}

// Shooting handler
window.addEventListener('click', (event) => {
    // Trigger immediate feedback effects
    triggerMuzzleFlash();
    triggerScreenShake();
    playGunshotSound();
    
    // Calculate mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster from camera through mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(shootableObjects, false);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPoint = intersects[0].point;
        
        // Log what we hit
        console.log('🎯 SHOT FIRED!');
        console.log('  Hit object:', hitObject);
        console.log('  Hit point:', hitPoint);
        console.log('  Distance:', intersects[0].distance.toFixed(2));
        
        // Create impact sphere at hit point
        createImpactSphere(hitPoint);
    } else {
        console.log('💨 SHOT MISSED - No hit detected');
    }
});

// OrbitControls for development inspection
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 100;

// Camera mode toggle
let isFreeCamera = true; // Start in free camera mode for development
controls.enabled = isFreeCamera;

// Toggle camera with 'C' key
window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
        isFreeCamera = !isFreeCamera;
        controls.enabled = isFreeCamera;
        
        if (!isFreeCamera) {
            // Reset to rail shooter position
            camera.position.set(railCameraPosition.x, railCameraPosition.y, railCameraPosition.z);
            camera.lookAt(railCameraLookAt.x, railCameraLookAt.y, railCameraLookAt.z);
        }
    }
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    
    if (isFreeCamera) {
        controls.update();
    }
    
    // Update visual feedback effects
    updateScreenShake();
    updateImpactSpheres();
    
    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Start the render loop
animate();

