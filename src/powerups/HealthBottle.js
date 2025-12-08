import * as THREE from 'three';

/**
 * Health Bottle Power-Up
 * A white bottle with a red cross that restores health when shot
 */
export default class HealthBottle {
    /**
     * @param {THREE.Vector3} position
     * @param {THREE.Scene} scene
     * @param {(type: string) => void} onCollect - callback when collected
     */
    constructor(position, scene, onCollect) {
        this.type = 'health';
        this.scene = scene;
        this.onCollect = onCollect;

        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Create bottle texture with white background and red cross
        const texture = this._createBottleTexture();

        // Create bottle geometry (cylinder-based bottle shape)
        const bottleGroup = new THREE.Group();

        // Bottle body (main cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.4, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.1;
        body.castShadow = true;
        body.receiveShadow = false;
        bottleGroup.add(body);

        // Bottle neck (smaller cylinder)
        const neckGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16);
        const neckMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.3
        });
        const neck = new THREE.Mesh(neckGeometry, neckMaterial);
        neck.position.y = 0.35;
        neck.castShadow = true;
        bottleGroup.add(neck);

        // Bottle cap (small cylinder on top)
        const capGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.2
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.425;
        cap.castShadow = true;
        bottleGroup.add(cap);

        // Mark for raycasting / identification
        body.userData.isPowerUp = true;
        body.userData.powerUpType = 'health';
        body.userData.powerUp = this;
        neck.userData.isPowerUp = true;
        neck.userData.powerUpType = 'health';
        neck.userData.powerUp = this;

        this.mesh = body; // Primary mesh for raycasting

        this.group.add(bottleGroup);

        // Glowing effect around bottle
        const glowGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0;
        this.group.add(glow);
        this.glow = glow;

        // Particle-like lights
        this.particleLights = [];
        this._createParticleLights(0x00ff00);

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

    /**
     * Create a texture with white bottle and red cross
     */
    _createBottleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512; // Taller for bottle shape
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Red cross in the center
        ctx.fillStyle = '#ff0000';
        const crossWidth = 40;
        const crossThickness = 8;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Horizontal bar of cross
        ctx.fillRect(
            centerX - crossWidth / 2,
            centerY - crossThickness / 2,
            crossWidth,
            crossThickness
        );

        // Vertical bar of cross
        ctx.fillRect(
            centerX - crossThickness / 2,
            centerY - crossWidth / 2,
            crossThickness,
            crossWidth
        );

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        return texture;
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

        // Glow pulsing
        if (this.glow) {
            this.glow.material.opacity = 0.3 + Math.sin(this.elapsed * 3) * 0.1;
        }

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

        // Immediately hide the power-up when collected (shot or picked up)
        this.group.visible = false;

        // Immediately hide collision radius
        this.collisionRadius = 0;

        // Dispose immediately
        this._dispose();
    }

    _dispose() {
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        // Dispose geometries and materials
        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
        });

        this.particleLights.length = 0;
    }
}

