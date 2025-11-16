import * as THREE from 'three';

/**
 * WeaponManager
 * Handles multiple weapons and their stats/behaviour for a rail shooter.
 *
 * This class is game-logic only. It expects you to:
 * - Provide a raycast function for hits
 * - Hook ammo and reload UI using the returned stats
 */
export class WeaponManager {
    constructor() {
        /** @type {Record<string, any>} */
        this.weapons = {
            pistol: {
                id: 'pistol',
                name: 'Pistol',
                clipSize: 12,
                reserveSize: 60,
                reloadTime: 2.0,
                damage: 50,
                pellets: 1,
                spread: 0,           // in radians
                fireRate: 0.5,       // seconds between shots
                currentAmmo: 12,
                reserveAmmo: 60,
                lastShotTime: -Infinity
            },
            shotgun: {
                id: 'shotgun',
                name: 'Shotgun',
                clipSize: 6,
                reserveSize: 24,
                reloadTime: 3.0,
                damage: 40,
                pellets: 5,
                spread: THREE.MathUtils.degToRad(7), // 7° spread
                fireRate: 1.0,
                currentAmmo: 6,
                reserveAmmo: 24,
                lastShotTime: -Infinity
            },
            rifle: {
                id: 'rifle',
                name: 'Rifle',
                clipSize: 30,
                reserveSize: 90,
                reloadTime: 2.5,
                damage: 35,
                pellets: 1,
                spread: THREE.MathUtils.degToRad(1.5), // small spread
                fireRate: 0.2,
                currentAmmo: 30,
                reserveAmmo: 90,
                lastShotTime: -Infinity
            }
        };

        /** @type {'pistol' | 'shotgun' | 'rifle'} */
        this.currentWeaponId = 'pistol';

        this.isReloading = false;
        this.reloadEndTime = 0;

        // Raycasting helpers
        this.raycaster = new THREE.Raycaster();
        this.tempDir = new THREE.Vector3();
    }

    /**
     * Get the currently selected weapon config
     */
    get currentWeapon() {
        return this.weapons[this.currentWeaponId];
    }

    /**
     * Update reloading state (call every frame with current time)
     * @param {number} timeSeconds
     */
    update(timeSeconds) {
        if (this.isReloading && timeSeconds >= this.reloadEndTime) {
            this.finishReload();
        }
    }

    /**
     * Switch weapon by id
     * @param {'pistol' | 'shotgun' | 'rifle'} id
     */
    switchWeapon(id) {
        if (!this.weapons[id]) return;
        if (this.currentWeaponId === id) return;

        if (this.isReloading) {
            // Cancel reload on switch
            this.isReloading = false;
        }

        this.currentWeaponId = id;
    }

    /**
     * Handle number key switching (expects event.key)
     * @param {string} key
     */
    handleKeyInput(key) {
        switch (key) {
            case '1':
                this.switchWeapon('pistol');
                break;
            case '2':
                this.switchWeapon('shotgun');
                break;
            case '3':
                this.switchWeapon('rifle');
                break;
        }
    }

    /**
     * Attempt to fire current weapon.
     * - Uses camera & mouse NDC to build rays.
     * - `targets` should be an array of THREE.Object3D to test against.
     *
     * Returns an array of hit results (can be empty).
     *
     * @param {number} timeSeconds           - current game time (seconds)
     * @param {THREE.Camera} camera
     * @param {THREE.Vector2} mouseNDC       - mouse in normalized device coords (-1..1)
     * @param {THREE.Object3D[]} targets
     * @returns {Array<{ object: THREE.Object3D, point: THREE.Vector3, distance: number }>}
     */
    shoot(timeSeconds, camera, mouseNDC, targets) {
        const weapon = this.currentWeapon;

        if (this.isReloading) return [];
        if (!weapon) return [];

        // Fire rate limit
        if (timeSeconds - weapon.lastShotTime < weapon.fireRate) {
            return [];
        }

        // Ammo check
        if (weapon.currentAmmo <= 0) {
            // Try to auto-reload
            if (weapon.reserveAmmo > 0) {
                this.startReload(timeSeconds);
            }
            return [];
        }

        weapon.currentAmmo--;
        weapon.lastShotTime = timeSeconds;

        const hits = [];

        if (weapon.id === 'shotgun') {
            // 5 pellets spread
            for (let i = 0; i < weapon.pellets; i++) {
                const pelletDir = this._getSpreadDirection(camera, mouseNDC, weapon.spread);
                const hit = this._raycast(camera.position, pelletDir, targets);
                if (hit) hits.push(hit);
            }
        } else {
            // Single ray (pistol / rifle)
            const dir = this._getSpreadDirection(camera, mouseNDC, weapon.spread);
            const hit = this._raycast(camera.position, dir, targets);
            if (hit) hits.push(hit);
        }

        return hits;
    }

    /**
     * Start reloading the current weapon
     * @param {number} timeSeconds
     */
    startReload(timeSeconds) {
        const weapon = this.currentWeapon;
        if (!weapon) return;
        if (this.isReloading) return;
        if (weapon.currentAmmo === weapon.clipSize) return;
        if (weapon.reserveAmmo <= 0) return;

        this.isReloading = true;
        this.reloadEndTime = timeSeconds + weapon.reloadTime;
    }

    /**
     * Finish reload and move ammo from reserve to clip
     */
    finishReload() {
        const weapon = this.currentWeapon;
        if (!weapon) return;

        const needed = weapon.clipSize - weapon.currentAmmo;
        const toLoad = Math.min(needed, weapon.reserveAmmo);
        weapon.currentAmmo += toLoad;
        weapon.reserveAmmo -= toLoad;

        this.isReloading = false;
    }

    /**
     * Get stats for UI display
     */
    getStats() {
        const w = this.currentWeapon;
        return {
            id: w.id,
            name: w.name,
            currentAmmo: w.currentAmmo,
            clipSize: w.clipSize,
            reserveAmmo: w.reserveAmmo,
            reloadTime: w.reloadTime,
            damage: w.damage,
            fireRate: w.fireRate,
            pellets: w.pellets,
            spread: w.spread,
            isReloading: this.isReloading
        };
    }

    /**
     * Internal helper: get direction with random spread around mouse ray
     * @param {THREE.Camera} camera
     * @param {THREE.Vector2} mouseNDC
     * @param {number} spreadRadians
     * @returns {THREE.Vector3}
     * @private
     */
    _getSpreadDirection(camera, mouseNDC, spreadRadians) {
        // Base direction from camera through mouse point
        this.raycaster.setFromCamera(mouseNDC, camera);
        const dir = this.raycaster.ray.direction.clone();

        if (spreadRadians > 0) {
            // Random small rotation around two axes
            const angleX = (Math.random() - 0.5) * spreadRadians;
            const angleY = (Math.random() - 0.5) * spreadRadians;

            const euler = new THREE.Euler(angleX, angleY, 0, 'YXZ');
            dir.applyEuler(euler);
        }

        return dir.normalize();
    }

    /**
     * Internal helper: raycast from origin along direction
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} direction
     * @param {THREE.Object3D[]} targets
     * @returns {{ object: THREE.Object3D, point: THREE.Vector3, distance: number } | null}
     * @private
     */
    _raycast(origin, direction, targets) {
        this.raycaster.set(origin, direction);
        const intersects = this.raycaster.intersectObjects(targets, true);
        if (intersects.length === 0) return null;

        const hit = intersects[0];
        return {
            object: hit.object,
            point: hit.point.clone(),
            distance: hit.distance
        };
    }
}


