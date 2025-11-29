import * as THREE from 'three';
import { applyWeaponRecoil } from './Recoil.js';
import { soundManager } from '../systems/SoundManager.js';

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
    triggerScreenShake
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
}

export function shoot(mouseX, mouseY, currentWeaponId) {
    if (gameData.currentState !== 'GAMEPLAY') return;
    if (gameData.isReloading) return;
    if (gameData.currentAmmo <= 0) {
        if (gameData.reserveAmmo > 0 && reloadFn) {
            // Reload sound will be played by PlayerManager.reload()
            reloadFn();
        }
        return;
    }
    
    gameData.currentAmmo--;
    gameData.shotsFired++;
    
    // Play shot sound (can overlap for rapid firing)
    soundManager.playShot(currentWeaponId);
    
    triggerMuzzleFlash();
    if (onScreenShake) onScreenShake();
    applyWeaponRecoil(currentWeaponId);
    
    const mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);
    
    const zombies = zombieManager.getZombies();
    const zombieMeshes = zombies.filter(z => !z.isDead).map(z => z.mesh);
    const powerUps = powerUpsRef ? powerUpsRef() : [];
    const powerUpGroups = powerUps.map(p => p.group);
    const intersects = raycaster.intersectObjects([scene.getObjectByName('ground') || null, ...zombieMeshes, ...powerUpGroups].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPoint = intersects[0].point;
        
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
            // Don't create impact sphere for zombie hits - they have death effects
            gameData.shotsHit++;
            const zombie = hitObject.userData.zombie;
            
            const bbox = new THREE.Box3().setFromObject(zombie.mesh);
            const modelHeight = bbox.max.y - bbox.min.y;
            const modelTop = bbox.max.y;

            // Headshot if hit is in top 20% (1/5th) of the model
            const headshotThreshold = modelTop - (modelHeight * 0.2);
            const isHeadshot = hitPoint.y >= headshotThreshold;

            console.log(`Hit at Y: ${hitPoint.y.toFixed(2)}, Headshot threshold: ${headshotThreshold.toFixed(2)}, Top: ${modelTop.toFixed(2)}`);
            
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
        } else {
            // Only create impact sphere for environment hits (ground, walls, etc.)
            // Not for zombies or power-ups
            createImpactSphere(hitPoint);
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

export function updateImpactSpheres(deltaTime = 0.016) {
    for (let i = impactSpheres.length - 1; i >= 0; i--) {
        const impact = impactSpheres[i];
        // Fade out and scale up based on deltaTime for consistent animation speed
        const fadeRate = 2.0 * deltaTime; // Fade out over ~0.5 seconds
        const scaleRate = 6.0 * deltaTime; // Scale up rate
        
        impact.opacity -= fadeRate;
        impact.scale += scaleRate;
        
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


