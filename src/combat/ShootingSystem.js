import * as THREE from 'three';
import { applyWeaponRecoil } from './Recoil.js';

let scene;
let camera;
let gameData;
let zombieManager;
let powerUpsRef;
let reloadFn;
let updateUIFn;
let resetComboFn;
let createDamageNumberFn;
let showHeadshotIndicatorFn;
let onScreenShake;
let getGroundFn; // Reference to renderer's getGround() method

const raycaster = new THREE.Raycaster();
const muzzleFlash = document.getElementById('muzzle-flash');
let impactSpheres = [];

export function initShootingSystem({
    sceneRef,
    cameraRef,
    gameDataRef,
    zombieManagerRef,
    powerUpsArrayRef,
    reload,
    updateUI,
    resetCombo,
    createDamageNumber,
    showHeadshotIndicator,
    triggerScreenShake,
    getGround // Callback to get the active ground mesh
}) {
    scene = sceneRef;
    camera = cameraRef;
    gameData = gameDataRef;
    zombieManager = zombieManagerRef;
    powerUpsRef = powerUpsArrayRef;
    reloadFn = reload;
    updateUIFn = updateUI;
    resetComboFn = resetCombo;
    createDamageNumberFn = createDamageNumber;
    showHeadshotIndicatorFn = showHeadshotIndicator;
    onScreenShake = triggerScreenShake;
    getGroundFn = getGround;
}

export function shoot(mouseX, mouseY, currentWeaponId) {
    if (gameData.currentState !== 'GAMEPLAY') return;
    if (gameData.isReloading) return;
    if (gameData.currentAmmo <= 0) {
        if (gameData.reserveAmmo > 0 && reloadFn) reloadFn();
        return;
    }
    
    gameData.currentAmmo--;
    gameData.shotsFired++;
    
    triggerMuzzleFlash();
    if (onScreenShake) onScreenShake();
    applyWeaponRecoil(currentWeaponId);
    
    const mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);
    
    const zombies = zombieManager.getZombies();
    const zombieMeshes = zombies.filter(z => !z.isDead).map(z => z.mesh);
    const powerUps = powerUpsRef ? powerUpsRef() : [];
    const powerUpGroups = powerUps.map(p => p.group);
    
    // Use renderer's getGround() to ensure we get the correct active ground
    // This prevents issues when both scenes exist in the scene tree
    const ground = getGroundFn ? getGroundFn() : null;
    const intersects = raycaster.intersectObjects([ground, ...zombieMeshes, ...powerUpGroups].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPoint = intersects[0].point;
        
        createImpactSphere(hitPoint);
        
        // Power-up hit
        if (hitObject.userData.isPowerUp) {
            const powerUpInstance = hitObject.userData.powerUp;
            if (powerUpInstance && !powerUpInstance.collected) {
                powerUpInstance.collect();
            }
            if (updateUIFn) updateUIFn();
            return;
        }
        
        if (hitObject.userData.isZombie) {
            gameData.shotsHit++;
            const zombie = hitObject.userData.zombie;
            
            // Headshot logic
            const zombieHeight = zombie.mesh.scale.y * (zombie.type === 'crawler' ? 0.5 : 1.5);
            const hitHeight = hitPoint.y - (zombie.mesh.position.y - zombieHeight / 2);
            const headshotThreshold = zombie.type === 'crawler' ? 0.9 : 0.7;
            const isHeadshot = hitHeight > zombieHeight * headshotThreshold;
            
            const baseDamage = 50;
            const damageAmount = gameData.doubleDamageActive ? baseDamage * 2 : baseDamage;
            const result = zombie.takeDamage(damageAmount, isHeadshot);
            
            if (createDamageNumberFn) {
                createDamageNumberFn(
                    hitPoint,
                    isHeadshot ? damageAmount * 2 : damageAmount,
                    isHeadshot
                );
            }
            
            if (result.killed) {
                if (result.headshot) {
                    gameData.headshotKills++;
                    if (showHeadshotIndicatorFn) showHeadshotIndicatorFn();
                }
                zombieManager.incrementSceneZombiesKilled();
            } else {
                if (gameData.currentCombo > 0 && resetComboFn) {
                    resetComboFn();
                }
            }
        }
    }
    
    if (updateUIFn) updateUIFn();
}

function triggerMuzzleFlash() {
    if (!muzzleFlash) return;
    muzzleFlash.style.opacity = '1';
    setTimeout(() => muzzleFlash.style.opacity = '0', 50);
}

export function createImpactSphere(hitPoint) {
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

export function updateImpactSpheres() {
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


