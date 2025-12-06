import * as THREE from 'three';

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

        // Main mesh - test cube (temporary until models are ready)
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

        // Particle-like lights for visibility
        this.particleLights = [];
        this._createParticleLights(color);

        // Animation state
        this.baseY = position.y;
        this.elapsed = 0;
        this.rotationSpeed = 0.8; // radians per second
        this.bobSpeed = 2.0;
        this.bobAmplitude = 0.25;

        // Collected state
        this.collected = false;

        // Add to scene
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

    _dispose() {
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
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

