import * as THREE from 'three';
import { WEAPON_POSITIONS } from '../config/WeaponConfig.js';

/**
 * WeaponPositioner
 * Handles positioning weapons relative to the camera
 */
export class WeaponPositioner {
    constructor(weaponGroup, camera) {
        this.weaponGroup = weaponGroup;
        this.camera = camera;
    }

    /**
     * Update weapon position to follow camera (call every frame)
     * @param {number} deltaTime - Time since last frame
     * @param {string} currentWeaponId - Current weapon identifier
     */
    update(deltaTime, currentWeaponId) {
        if (!this.weaponGroup || !this.camera) return;

        this.camera.updateMatrixWorld();

        // Get camera vectors
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);

        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.camera.quaternion);

        // Get weapon position config
        const weaponPos = WEAPON_POSITIONS[currentWeaponId] || WEAPON_POSITIONS['pistol'];

        // Calculate world position
        this.weaponGroup.position.copy(this.camera.position);
        this.weaponGroup.position.addScaledVector(forward, weaponPos.z);
        this.weaponGroup.position.addScaledVector(right, weaponPos.x);
        this.weaponGroup.position.addScaledVector(up, weaponPos.y);

        // Match camera rotation
        this.weaponGroup.rotation.copy(this.camera.rotation);
    }
}

