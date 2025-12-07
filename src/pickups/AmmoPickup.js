import * as THREE from 'three';
import { modelCache } from '../core/ModelCache.js';

const AMMO_PICKUP_VALUES = {
    pistol: 8,
    shotgun: 5,
    rifle: 10
};

const AMMO_PICKUP_COLORS = {
    pistol: 0xffff00,    // Yellow
    shotgun: 0xff8800,   // Orange
    rifle: 0x00ff00      // Green
};

// Model paths for ammo pickups
const AMMO_PICKUP_MODEL_PATHS = {
    pistol: '/models/objects/power_ups/pistol_ammo.glb',
    shotgun: '/models/objects/power_ups/shotgun_ammo.glb',
    rifle: '/models/objects/power_ups/rifle_ammo.glb'
};

/**
 * Ammo Pickup
 * Weapon-specific ammo pickup that can be shot to collect.
 * - Test cube visual (until models are ready)
 * - Bobbing and rotation animation
 * - Shot-to-collect interaction
 */
export default class AmmoPickup {
    /**
     * @param {THREE.Vector3} position
     * @param {string} weaponType - 'pistol' | 'shotgun' | 'rifle'
     * @param {THREE.Scene} scene
     * @param {(weaponType: string, ammoAmount: number) => void} onCollect - callback when collected
     */
    constructor(position, weaponType, scene, onCollect) {
        this.weaponType = weaponType;
        this.ammoAmount = AMMO_PICKUP_VALUES[weaponType] || 0;
        this.scene = scene;
        this.onCollect = onCollect;

        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Base glow color
        const color = AMMO_PICKUP_COLORS[weaponType] ?? 0xffffff;

        // Create temporary placeholder mesh until model loads
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.2,
            metalness: 0.3,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;

        // Mark for raycasting / identification
        this.mesh.userData.isAmmoPickup = true;
        this.mesh.userData.weaponType = weaponType;
        this.mesh.userData.ammoPickup = this;

        this.group.add(this.mesh);
        
        // Load the actual model
        this._loadModel(weaponType, color);

        // No particle lights for ammo pickups
        this.particleLights = [];

        // Animation state
        this.baseY = position.y;
        this.elapsed = 0;
        this.rotationSpeed = 0.8; // radians per second
        this.bobSpeed = 2.0;
        this.bobAmplitude = 0.25;

        // Collected state
        this.collected = false;
        
        // Model loading state
        this._modelLoading = true;

        // Add to scene but make invisible until model loads
        this.group.visible = false;
        this.scene.add(this.group);
    }

    _createParticleLights(color) {
        const numLights = 4;
        const radius = 0.4;

        for (let i = 0; i < numLights; i++) {
            const angle = (i / numLights) * Math.PI * 2;
            const light = new THREE.PointLight(color, 0.6, 2.0, 2.0);
            light.position.set(
                Math.cos(angle) * radius,
                0.15,
                Math.sin(angle) * radius
            );
            this.group.add(light);
            this.particleLights.push(light);
        }
    }

    /**
     * Update animation
     * @param {number} deltaTime
     * @param {THREE.Camera} camera
     */
    update(deltaTime, camera) {
        if (this.collected) return;

        this.elapsed += deltaTime;

        // Rotate
        this.group.rotation.y += this.rotationSpeed * deltaTime;

        // Bobbing
        const bobOffset = Math.sin(this.elapsed * this.bobSpeed) * this.bobAmplitude;
        this.group.position.y = this.baseY + bobOffset;

        // Subtle light flicker / orbit
        const particleRadius = 0.4;
        this.particleLights.forEach((light, index) => {
            const baseAngle = (index / this.particleLights.length) * Math.PI * 2;
            const angle = baseAngle + this.elapsed * 0.8;
            light.position.x = Math.cos(angle) * particleRadius;
            light.position.z = Math.sin(angle) * particleRadius;
            light.intensity = 0.5 + Math.sin(this.elapsed * 5 + index) * 0.2;
        });
    }

    /**
     * Collect the pickup (called when shot)
     */
    collect() {
        if (this.collected) return;

        this.collected = true;

        // Trigger effect callback
        if (typeof this.onCollect === 'function') {
            this.onCollect(this.weaponType, this.ammoAmount);
        }

        // Immediately hide the pickup when collected (shot)
        this.group.visible = false;
        
        // Dispose immediately
        this._dispose();
    }

    /**
     * Optional helper to run fade-out independently of main update loop.
     * Call this from your global update if you want the fade after collect().
     * @param {number} deltaTime
     */
    updateFade(deltaTime) {
        if (this._fadeUpdate) {
            this._fadeUpdate(deltaTime);
        }
    }

    async _loadModel(weaponType, color) {
        const modelPath = AMMO_PICKUP_MODEL_PATHS[weaponType];
        if (!modelPath) {
            console.warn(`⚠️ No model path for ammo pickup type: ${weaponType}`);
            return;
        }

        try {
            // Load model using cache (browser cache makes this fast)
            const { scene: modelGroup } = await modelCache.load(modelPath);
            
            if (!modelGroup) {
                console.warn(`⚠️ Model loaded but is null for ${weaponType} ammo pickup`);
                return;
            }
            
            // Apply scale - rifle is 1/20th, shotgun is 1/30th of original, pistol is 7x current
            let scale;
            if (weaponType === 'rifle') {
                scale = 0.015; // 1/20th of original
            } else if (weaponType === 'shotgun') {
                scale = 0.01; // 1/30th of original (0.3 / 30)
            } else if (weaponType === 'pistol') {
                scale = 1.05; // 7x current size (0.15 * 7)
            } else {
                scale = 0.3; // Default
            }
            modelGroup.scale.setScalar(scale);
            
            // Setup the model
            modelGroup.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = false;
                    child.userData.isAmmoPickup = true;
                    child.userData.weaponType = this.weaponType;
                    child.userData.ammoPickup = this;

                    // Remove emission from all ammo pickups (no glow)
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                    mat.emissive = new THREE.Color(0x000000);
                                    mat.emissiveIntensity = 0;
                                }
                            });
                        } else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                            child.material.emissive = new THREE.Color(0x000000);
                            child.material.emissiveIntensity = 0;
                        }
                    }
                }
            });

            // Replace placeholder with the actual model
            if (this.mesh && this.mesh.parent) {
                this.group.remove(this.mesh);
                if (this.mesh.geometry) this.mesh.geometry.dispose();
                if (this.mesh.material) {
                    if (Array.isArray(this.mesh.material)) {
                        this.mesh.material.forEach(mat => mat && mat.dispose());
                    } else {
                        this.mesh.material.dispose();
                    }
                }
            }

            // Set the model group as the main mesh for raycasting
            // All meshes are marked for raycasting, but we keep a reference
            this.mesh = modelGroup;
            this.group.add(modelGroup);
            
            // Make visible now that model is loaded
            this.group.visible = true;
            this._modelLoading = false;
            
            console.log(`✅ Loaded GLB model for ammo pickup: ${weaponType}`);
        } catch (error) {
            console.error(`❌ Failed to load ammo pickup model for ${weaponType}:`, error);
            // Keep placeholder mesh if loading fails, but make it visible
            this.group.visible = true;
            this._modelLoading = false;
        }
    }

    _dispose() {
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        if (this.mesh) {
            // Check if it's a placeholder or model
            if (this.mesh.geometry && this.mesh.material) {
                // Placeholder mesh
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            } else if (this.mesh.traverse) {
                // Model group - dispose all meshes
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat && mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
        }

        this.particleLights.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
            light.dispose();
        });
        this.particleLights.length = 0;
    }
}

