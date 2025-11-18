import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPON_PATHS, WEAPON_ROTATIONS, WEAPON_SCALE_CONFIG } from '../config/WeaponConfig.js';

/**
 * WeaponLoader
 * Handles loading and processing weapon models
 */
export class WeaponLoader {
    constructor() {
        this.loader = new GLTFLoader();
    }

    /**
     * Load all weapon models
     * @param {Function} onModelLoaded - Callback when each model is loaded
     * @returns {Promise<Object>} Object mapping weapon IDs to loaded models
     */
    async loadAllWeapons(onModelLoaded = null) {
        const loadPromises = Object.entries(WEAPON_PATHS).map(async ([weaponId, path]) => {
            try {
                const gltf = await this.loader.loadAsync(path);
                const model = gltf.scene.clone();

                // Process the model
                this.setupModel(model, weaponId);

                if (onModelLoaded) {
                    onModelLoaded(weaponId, model);
                }

                return { weaponId, model };
            } catch (error) {
                console.error(`❌ Failed to load weapon model ${weaponId}:`, error);
                return { weaponId, model: null };
            }
        });

        const results = await Promise.all(loadPromises);
        const weaponModels = {};
        
        results.forEach(({ weaponId, model }) => {
            if (model) {
                weaponModels[weaponId] = model;
            }
        });

        console.log('✅ All weapon models loaded');
        
        return weaponModels;
    }

    /**
     * Setup a weapon model (scale, center, rotate, configure materials)
     * @param {THREE.Object3D} model - The weapon model
     * @param {string} weaponId - Weapon identifier
     */
    setupModel(model, weaponId) {
        // Basic setup
        model.name = `weapon_${weaponId}`;
        model.visible = false;

        // Configure materials
        this.configureMaterials(model);

        // Scale and center
        this.scaleAndCenterModel(model, weaponId);

        // Apply rotation
        this.applyRotation(model, weaponId);
    }

    /**
     * Configure materials for the model
     * @param {THREE.Object3D} model - The weapon model
     */
    configureMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
                child.renderOrder = 1000;

                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        if (mat) {
                            mat.needsUpdate = true;
                            if (mat.transparent) {
                                mat.transparent = false;
                            }
                            if (mat.opacity !== undefined) {
                                mat.opacity = 1;
                            }
                        }
                    });
                }
            }
        });
    }

    /**
     * Scale and center the model
     * @param {THREE.Object3D} model - The weapon model
     * @param {string} weaponId - Weapon identifier
     */
    scaleAndCenterModel(model, weaponId) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Calculate scale
        const scale = WEAPON_SCALE_CONFIG.targetSize / maxDimension;
        model.scale.setScalar(scale);

        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        model.traverse((child) => {
            if (child.isMesh || child.isGroup) {
                child.position.sub(center);
            }
        });
        model.position.set(0, 0, 0);
    }

    /**
     * Apply rotation to the model
     * @param {THREE.Object3D} model - The weapon model
     * @param {string} weaponId - Weapon identifier
     */
    applyRotation(model, weaponId) {
        const rotation = WEAPON_ROTATIONS[weaponId];
        if (rotation) {
            model.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }
}

