import * as THREE from 'three';
import AmmoPickup from '../pickups/AmmoPickup.js';
import { AMMO_PICKUP_SPAWN_POSITIONS } from '../core/SceneConfig.js';

/**
* AmmoPickupManager
* Manages ammo pickup spawning, collection, and UI updates
*/
export class AmmoPickupManager {
constructor(scene, camera, gameData, updateUIFn, showAmmoMessageFn, getCurrentWeaponIdFn) {
this.scene = scene;
this.camera = camera;
this.gameData = gameData;
this.updateUI = updateUIFn;
this.showAmmoMessage = showAmmoMessageFn;
this.getCurrentWeaponId = getCurrentWeaponIdFn || (() => 'pistol');
this.ammoPickups = [];
}

/**
* Spawn an ammo pickup at a specific position
* @param {THREE.Vector3|Object} position - Position vector or {x, y, z}
* @param {string} weaponType - 'pistol' | 'shotgun' | 'rifle'
*/
spawnAmmoPickup(position, weaponType) {
let pickup = null;
const onCollect = (collectedWeaponType, ammoAmount) => {
this.handleAmmoPickupCollected(collectedWeaponType, ammoAmount, pickup);
};

const pos = position instanceof THREE.Vector3 
? position 
: new THREE.Vector3(position.x, position.y, position.z);

pickup = new AmmoPickup(pos, weaponType, this.scene, onCollect);
this.ammoPickups.push(pickup);
}

/**
* Spawn ammo pickups for a specific scene
* @param {number} sceneIndex - Scene index
*/
spawnSceneAmmoPickups(sceneIndex) {
const positions = AMMO_PICKUP_SPAWN_POSITIONS[sceneIndex] || [];
if (positions.length === 0) return;

positions.forEach(posData => {
if (posData.weaponType) {
this.spawnAmmoPickup(
{ x: posData.x, y: posData.y, z: posData.z },
posData.weaponType
);
}
});
}

/**
* Handle ammo pickup collection
* @param {string} weaponType - Weapon type that collected the pickup
* @param {number} ammoAmount - Amount of ammo to add
* @param {AmmoPickup} pickupInstance - The pickup instance
*/
handleAmmoPickupCollected(weaponType, ammoAmount, pickupInstance) {
// Remove from active list
const idx = this.ammoPickups.indexOf(pickupInstance);
if (idx !== -1) this.ammoPickups.splice(idx, 1);

// Update the specific weapon's ammo pool
if (this.gameData.weaponAmmo && this.gameData.weaponAmmo[weaponType]) {
const weaponAmmo = this.gameData.weaponAmmo[weaponType];
const maxReserve = this.getMaxReserveForWeapon(weaponType);

// Add ammo to the specific weapon's reserve, capping at max
weaponAmmo.reserve = Math.min(weaponAmmo.reserve + ammoAmount, maxReserve);

// Also sync legacy property for backward compatibility (use current weapon's reserve)
const currentWeaponId = this.getCurrentWeaponId();
if (this.gameData.weaponAmmo[currentWeaponId]) {
this.gameData.reserveAmmo = this.gameData.weaponAmmo[currentWeaponId].reserve;
}
} else {
console.warn(`Weapon ammo pool not found for ${weaponType}`);
}

const weaponLabel = {
pistol: 'PISTOL',
shotgun: 'SHOTGUN',
rifle: 'RIFLE'
}[weaponType] || weaponType.toUpperCase();

if (this.showAmmoMessage) {
this.showAmmoMessage(`${weaponLabel} AMMO +${ammoAmount}`);
}

this.updateUI();
}

/**
* Get max reserve ammo for a weapon type
* @param {string} weaponType 
* @returns {number}
*/
getMaxReserveForWeapon(weaponType) {
// These values match WEAPON_AMMO_CONFIG in main.js
const configs = {
pistol: 22, // 2 clips
shotgun: 12, // 2 clips
rifle: 48 // 2 clips
};
return configs[weaponType] || 0;
}

/**
* Clear all ammo pickups
*/
clear() {
this.ammoPickups.forEach(p => p._dispose && p._dispose());
this.ammoPickups.length = 0;
}

/**
* Update all active pickups
* @param {number} deltaTime 
*/
update(deltaTime) {
// Filter out collected pickups and update remaining ones
this.ammoPickups = this.ammoPickups.filter(p => {
if (p.collected) {
// Already disposed, remove from array
return false;
}
p.update(deltaTime, this.camera);
return true;
});
}

/**
* Get all active (non-collected) ammo pickups for raycasting
* @returns {AmmoPickup[]}
*/
getAmmoPickups() {
return this.ammoPickups.filter(p => !p.collected);
}
}

