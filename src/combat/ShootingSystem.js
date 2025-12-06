import * as THREE from 'three';
import { applyWeaponRecoil } from './Recoil.js';
import { soundManager } from '../systems/SoundManager.js';

let scene;
let camera;
let gameData;
let zombieManager;
let powerUpsRef;
let ammoPickupsRef;
let lockManagerRef;
let reloadFn;
let updateUIFn;
let resetComboFn;
let createDamageNumberFn;
let onScreenShake;

const raycaster = new THREE.Raycaster();
const muzzleFlash = document.getElementById('muzzle-flash');
let impactSpheres = [];

// Weapon damage configuration: { body: number, headshot: number }
const WEAPON_DAMAGE = {
    pistol: { body: 25, headshot: 50 },
    shotgun: { body: 100, headshot: 200 },
    rifle: { body: 50, headshot: 100 }
};

export function initShootingSystem({
    sceneRef,
    cameraRef,
    gameDataRef,
    zombieManagerRef,
    powerUpsArrayRef,
    ammoPickupsArrayRef,
    lockManager,
    reload,
    updateUI,
    resetCombo,
    createDamageNumber,
    triggerScreenShake
}) {
    scene = sceneRef;
    camera = cameraRef;
    gameData = gameDataRef;
    zombieManager = zombieManagerRef;
    powerUpsRef = powerUpsArrayRef;
    ammoPickupsRef = ammoPickupsArrayRef;
    lockManagerRef = lockManager;
    reloadFn = reload;
    updateUIFn = updateUI;
    resetComboFn = resetCombo;
    createDamageNumberFn = createDamageNumber;
    onScreenShake = triggerScreenShake;
}

/**
 * Update the lock manager reference
 * @param {LockManager} lockManager - The lock manager instance
 */
export function setLockManager(lockManager) {
    lockManagerRef = lockManager;
}

export function shoot(mouseX, mouseY, currentWeaponId) {
    if (gameData.currentState !== 'GAMEPLAY') return;
    if (gameData.isReloading) return;
    
    // Use per-weapon ammo storage
    const weaponAmmo = gameData.weaponAmmo[currentWeaponId];
    if (!weaponAmmo || weaponAmmo.current <= 0) {
        if (weaponAmmo && weaponAmmo.reserve > 0 && reloadFn) {
            // Reload sound will be played by PlayerManager.reload()
            reloadFn();
        }
        return;
    }
    
    // Decrement ammo from per-weapon storage
    weaponAmmo.current--;
    // Sync legacy properties for UI compatibility
    gameData.currentAmmo = weaponAmmo.current;
    gameData.maxAmmo = weaponAmmo.max;
    gameData.reserveAmmo = weaponAmmo.reserve;
    
    gameData.shotsFired++;
    
    // Play shot sound (can overlap for rapid firing)
    soundManager.playShot(currentWeaponId);
    
    triggerMuzzleFlash(currentWeaponId);
    if (onScreenShake) onScreenShake();
    applyWeaponRecoil(currentWeaponId);
    
    const mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);
    
    const zombies = zombieManager.getZombies();
    const zombieMeshes = zombies.filter(z => !z.isDead).map(z => z.mesh);
    const powerUps = powerUpsRef ? powerUpsRef() : [];
    const powerUpGroups = powerUps.map(p => p.group);
    const ammoPickups = ammoPickupsRef ? ammoPickupsRef() : [];
    const ammoPickupGroups = ammoPickups.map(p => p.group);
    const lockMeshes = lockManagerRef && lockManagerRef.isActive() ? lockManagerRef.getLockMeshes() : [];
    const intersects = raycaster.intersectObjects([scene.getObjectByName('ground') || null, ...zombieMeshes, ...powerUpGroups, ...ammoPickupGroups, ...lockMeshes].filter(Boolean), true);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPoint = intersects[0].point;
        
        // Lock hit
        if (hitObject.userData.isLock && lockManagerRef) {
            console.log('🎯 Lock hit! Opening lock...');
            lockManagerRef.onShot();
            // Create impact effect
            createImpactSphere(hitPoint);
            if (updateUIFn) updateUIFn();
            return;
        }
        
        // Ammo pickup hit
        if (hitObject.userData.isAmmoPickup) {
            const ammoPickupInstance = hitObject.userData.ammoPickup;
            if (ammoPickupInstance && !ammoPickupInstance.collected) {
                ammoPickupInstance.collect();
            }
            // Create impact effect
            createImpactSphere(hitPoint);
            if (updateUIFn) updateUIFn();
            return;
        }
        
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
            
            // Get weapon damage configuration
            const weaponDamage = WEAPON_DAMAGE[currentWeaponId] || WEAPON_DAMAGE.pistol;
            const baseDamage = isHeadshot ? weaponDamage.headshot : weaponDamage.body;
            
            // Apply double damage power-up if active
            const damageAmount = gameData.doubleDamageActive ? baseDamage * 2 : baseDamage;
            const result = zombie.takeDamage(damageAmount, isHeadshot);
            
            if (createDamageNumberFn) {
                createDamageNumberFn(
                    hitPoint,
                    damageAmount,
                    isHeadshot
                );
            }
            
            if (result.killed) {
                if (result.headshot) {
                    gameData.headshotKills++;
                    // Headshot indicator removed - damage number already shows "HEADSHOT"
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

function triggerMuzzleFlash(weaponId = 'pistol') {
    if (!muzzleFlash) return;
    
    // Weapon-specific flash intensity and color
    const flashConfig = {
        pistol: { intensity: 0.6, duration: 80, color: 'rgba(255, 255, 200, 0.8)' },
        shotgun: { intensity: 1.0, duration: 120, color: 'rgba(255, 200, 150, 1.0)' },
        rifle: { intensity: 0.8, duration: 100, color: 'rgba(255, 220, 180, 0.9)' }
    };
    
    const config = flashConfig[weaponId] || flashConfig.pistol;
    
    // Update flash color and intensity based on weapon
    muzzleFlash.style.background = `radial-gradient(circle, ${config.color} 0%, rgba(255, 200, 100, ${config.intensity * 0.7}) 50%, transparent 100%)`;
    
    // Enhanced muzzle flash with smooth animation
    muzzleFlash.style.opacity = config.intensity.toString();
    muzzleFlash.style.transform = 'scale(1)';
    
    // Use requestAnimationFrame for smoother animation
    const startTime = Date.now();
    const duration = config.duration;
    
    const animateFlash = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Fade out smoothly with exponential decay for more realistic flash
            const opacity = config.intensity * Math.pow(1 - progress, 2);
            const scale = 1 + (progress * 0.2); // Slight scale increase as it fades
            muzzleFlash.style.opacity = opacity.toString();
            muzzleFlash.style.transform = `scale(${scale})`;
            requestAnimationFrame(animateFlash);
        } else {
            // Ensure it's fully hidden
            muzzleFlash.style.opacity = '0';
            muzzleFlash.style.transform = 'scale(1)';
        }
    };
    
    requestAnimationFrame(animateFlash);
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


