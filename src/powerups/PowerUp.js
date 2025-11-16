import * as THREE from 'three';

const POWERUP_COLORS = {
    health: 0x00ff00,
    ammo: 0xffff00,
    double_damage: 0xff0000,
    slow_mo: 0x00ffff
};

/**
 * Simple rail-shooter style power‑up.
 * - Glowing rotating mesh
 * - Bobbing animation
 * - Collision with player camera
 * - Optional small "particle" lights around it
 */
export default class PowerUp {
    /**
     * @param {THREE.Vector3} position
     * @param {string} type - 'health' | 'ammo' | 'double_damage' | 'slow_mo'
     * @param {THREE.Scene} scene
     * @param {(type: string) => void} onCollect - callback when collected
     */
    constructor(position, type, scene, onCollect) {
        this.type = type;
        this.scene = scene;
        this.onCollect = onCollect;

        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Base glow color
        const color = POWERUP_COLORS[type] ?? 0xffffff;

        // Main mesh (slightly rounded box via high segment sphere for variety)
        const geometry = new THREE.SphereGeometry(0.25, 24, 24);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.5,
            metalness: 0.3,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;

        // Mark for raycasting / identification
        this.mesh.userData.isPowerUp = true;
        this.mesh.userData.powerUpType = type;
        this.mesh.userData.powerUp = this;

        this.group.add(this.mesh);

        // Particle-like lights
        this.particleLights = [];
        this._createParticleLights(color);

        // Animation state
        this.baseY = position.y;
        this.elapsed = 0;
        this.rotationSpeed = 0.8; // radians per second
        this.bobSpeed = 2.0;
        this.bobAmplitude = 0.25;

        // Collision
        this.collisionRadius = 1.0;
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
     * Update animation and collision.
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

        // Collision with camera
        if (camera) {
            const cameraPos = camera.position;
            const distance = cameraPos.distanceTo(this.group.position);
            if (distance <= this.collisionRadius) {
                this.collect();
            }
        }
    }

    collect() {
        if (this.collected) return;

        this.collected = true;

        // Trigger effect callback
        if (typeof this.onCollect === 'function') {
            this.onCollect(this.type);
        }

        // Simple fade-out / scale-out effect before removal
        const mesh = this.mesh;
        const group = this.group;
        let life = 0.3;

        const fadeUpdate = (delta) => {
            if (!mesh.material) return;
            life -= delta;
            const t = Math.max(life / 0.3, 0);
            mesh.scale.setScalar(t);
            mesh.material.emissiveIntensity = t * 1.5;

            if (life <= 0) {
                this._dispose();
                if (fadeUpdate._removeMe) fadeUpdate._removeMe();
            }
        };

        // Expose hook so external game loop can unregister this temporary updater if needed.
        this._fadeUpdate = fadeUpdate;

        // Immediately hide collision radius
        this.collisionRadius = 0;
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

        this.particleLights.length = 0;
    }
}


