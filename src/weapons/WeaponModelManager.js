import * as THREE from 'three';
import { WeaponLoader } from './loaders/WeaponLoader.js';
import { WeaponPositioner } from './positioning/WeaponPositioner.js';
import { WeaponVisibility } from './visibility/WeaponVisibility.js';
import { BulletMeshHandler } from './bullets/BulletMeshHandler.js';

/**
 * WeaponModelManager
 * Main orchestrator for weapon model management
 * Coordinates loading, positioning, visibility, and bullet handling
 */
export class WeaponModelManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.weaponModels = {};
        this.currentWeaponModel = null;
        this.weaponGroup = null;
        this.modelsLoaded = false;

        // Initialize subsystems
        this.loader = new WeaponLoader();
        this.visibility = null; // Will be initialized after weapon group is created
        this.positioner = null; // Will be initialized after weapon group is created
        this.bulletHandler = new BulletMeshHandler();

        // Create weapon group
        this.createWeaponGroup();

        // Load all weapons
        this.loadAllWeapons();
    }

    /**
     * Create the weapon group and add it to the scene
     */
    createWeaponGroup() {
        this.weaponGroup = new THREE.Group();
        this.weaponGroup.name = 'weaponGroup';
        this.weaponGroup.visible = false; // Hidden initially
        this.weaponGroup.renderOrder = 999; // Render on top
        this.scene.add(this.weaponGroup);

        // Initialize subsystems that need weapon group
        this.visibility = new WeaponVisibility(this.weaponModels, this.weaponGroup);
        this.positioner = new WeaponPositioner(this.weaponGroup, this.camera);
    }

    /**
     * Load all weapon models
     */
    async loadAllWeapons() {
        this.weaponModels = await this.loader.loadAllWeapons((weaponId, model) => {
            // Add model to weapon group
            this.weaponGroup.add(model);
            this.weaponModels[weaponId] = model;

            // Detect bullet meshes for pistol
            if (weaponId === 'pistol') {
                const bulletMeshes = this.bulletHandler.detectBulletMeshes(model, weaponId);
                if (bulletMeshes.length > 0) {
                    model.userData.bulletMeshes = bulletMeshes;
                }
            }

        });

        this.modelsLoaded = true;

        // Set initial weapon (pistol)
        if (this.weaponModels['pistol']) {
            this.switchWeapon('pistol');
        } else {
            console.error('❌ Pistol model not found! Available models:', Object.keys(this.weaponModels));
        }
    }

    /**
     * Switch to a different weapon model
     * @param {string} weaponId - 'pistol', 'shotgun', or 'rifle'
     */
    switchWeapon(weaponId) {
        // Hide all weapons
        this.visibility.hideAll();

        // Show new weapon
        const newWeapon = this.weaponModels[weaponId];
        if (newWeapon) {
            this.visibility.show(weaponId, newWeapon);
            this.currentWeaponModel = newWeapon;
        } else {
            console.warn(`⚠️ Weapon model not found: ${weaponId}. Models loaded: ${this.modelsLoaded}`);
        }
    }

    /**
     * Show weapon models (call when game starts)
     */
    showWeapons() {
        if (this.weaponGroup) {
            this.weaponGroup.position.set(0, 0, -1.0);
            this.visibility.showWeaponGroup();
        }

        // Ensure current weapon is visible
        if (this.currentWeaponModel) {
            this.currentWeaponModel.visible = true;
        } else if (this.modelsLoaded && this.weaponModels['pistol']) {
            this.switchWeapon('pistol');
        }
    }

    /**
     * Hide weapon models
     */
    hideWeapons() {
        this.visibility.hideWeaponGroup();
    }

    /**
     * Update weapon position to follow camera (call every frame)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.positioner) return;

        const currentWeaponId = this.getCurrentWeaponId();
        this.positioner.update(deltaTime, currentWeaponId);
    }

    /**
     * Get current weapon ID
     * @returns {string} Current weapon identifier
     */
    getCurrentWeaponId() {
        if (!this.currentWeaponModel) return 'pistol';
        return Object.keys(this.weaponModels).find(
            id => this.weaponModels[id] === this.currentWeaponModel
        ) || 'pistol';
    }

    /**
     * Get the current weapon model
     * @returns {THREE.Object3D|null} Current weapon model
     */
    getCurrentWeaponModel() {
        return this.currentWeaponModel;
    }

    /**
     * Remove bullet meshes from pistol (if they're cosmetic)
     */
    removePistolBullets() {
        const pistol = this.weaponModels['pistol'];
        if (pistol) {
            this.bulletHandler.removeBullets(pistol);
        }
    }

    /**
     * Update bullet visibility based on current ammo
     * @param {number} currentAmmo - Current ammo count
     * @param {number} maxAmmo - Maximum ammo in clip
     */
    updatePistolBullets(currentAmmo, maxAmmo) {
        const pistol = this.weaponModels['pistol'];
        if (pistol) {
            this.bulletHandler.updateBulletVisibility(pistol, currentAmmo, maxAmmo);
        }
    }

    /**
     * Test function to inspect pistol model and find bullet meshes
     */
    testPistolBullets() {
        const pistol = this.weaponModels['pistol'];
        if (pistol) {
            this.bulletHandler.testBulletMeshes(pistol);
        }
    }

    /**
     * Test model visibility (for debugging)
     */
    testModelVisibility() {
        // Debug function - currently disabled
    }

    /**
     * Add debug helper (currently disabled)
     */
    addDebugHelper() {
        // Debug function - currently disabled
    }

    // Legacy methods for backward compatibility
    updateWeaponTransform(position = null, rotation = null) {
        if (!this.weaponGroup) return;
        if (position) {
            this.weaponGroup.position.copy(position);
        }
        if (rotation) {
            this.weaponGroup.rotation.copy(rotation);
        }
    }

    getWeaponPosition() {
        if (!this.weaponGroup) return null;
        return this.weaponGroup.position.clone();
    }

    setWeaponPosition(x, y, z) {
        if (this.weaponGroup) {
            this.weaponGroup.position.set(x, y, z);
        }
    }
}
