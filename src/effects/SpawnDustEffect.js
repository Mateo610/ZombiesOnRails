import * as THREE from 'three';

/**
 * Spawn Dust Effect
 * Creates a black dust cloud that rises from the ground before a zombie spawns
 */
export class SpawnDustEffect {
    constructor(position, scene) {
        this.position = position.clone();
        this.scene = scene;
        this.duration = 1.5; // Total duration in seconds
        this.elapsed = 0;
        this.active = true;
        
        // Create particle system - dense cloud to hide zombie spawn
        this.particleCount = 150; // Many particles for dense, opaque cloud
        this.particles = [];
        this.particleGroup = new THREE.Group();
        
        // Create individual particles (simple approach using sprites or small meshes)
        this._createParticles();
        
        // Add to scene
        this.scene.add(this.particleGroup);
        
        console.log(`🌪️ Created dust effect at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
    }
    
    _createParticles() {
        // Create dense black dust particles to completely hide zombie spawn
        for (let i = 0; i < this.particleCount; i++) {
            const size = 0.15 + Math.random() * 0.25; // Larger particles for dense cloud
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a, // Very dark gray/black
                emissive: 0x000000,
                emissiveIntensity: 0.0,
                transparent: false, // Not transparent - fully opaque
                opacity: 1.0, // 100% opaque
                depthWrite: true
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random starting position around spawn point (on ground)
            // Dense distribution to create solid cloud
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 1.2; // Wider spread for full coverage
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + Math.random() * 0.3, // Spread vertically from ground
                this.position.z + Math.sin(angle) * radius
            );
            
            // Random velocity (upward and outward)
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5, // More horizontal spread
                Math.random() * 0.8 + 0.5, // Stronger upward velocity
                (Math.random() - 0.5) * 0.5 // More horizontal spread
            );
            
            // Random rotation
            particle.userData.rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            // Life and fade
            particle.userData.life = 1.0;
            particle.userData.maxLife = 1.0 + Math.random() * 0.5;
            
            this.particles.push(particle);
            this.particleGroup.add(particle);
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Update particles
        this.particles.forEach(particle => {
            // Update position
            particle.position.addScaledVector(particle.userData.velocity, deltaTime);
            
            // Apply gravity/drag
            particle.userData.velocity.y -= 0.5 * deltaTime; // Gravity
            particle.userData.velocity.multiplyScalar(0.98); // Air resistance
            
            // Update rotation
            particle.rotation.x += particle.userData.rotationSpeed.x * deltaTime;
            particle.rotation.y += particle.userData.rotationSpeed.y * deltaTime;
            particle.rotation.z += particle.userData.rotationSpeed.z * deltaTime;
            
            // Update life and fade
            particle.userData.life -= deltaTime / particle.userData.maxLife;
            
            // Keep particles fully opaque for most of the duration
            // Only fade in the last 30% of the effect
            const fadeStartTime = this.duration * 0.7;
            if (this.elapsed < fadeStartTime) {
                // Keep fully opaque during spawn phase
                particle.material.opacity = 1.0;
                particle.material.transparent = false;
            } else {
                // Fade out only in the last 30%
                const fadeProgress = 1 - ((this.elapsed - fadeStartTime) / (this.duration - fadeStartTime));
                particle.material.transparent = true;
                particle.material.opacity = Math.max(0, fadeProgress);
                
                // Scale down as it fades
                const scale = Math.max(0.2, fadeProgress);
                particle.scale.setScalar(scale);
            }
        });
        
        // Check if effect is complete
        if (this.elapsed >= this.duration) {
            this.dispose();
        }
    }
    
    dispose() {
        if (!this.active) return;
        
        this.active = false;
        
        // Remove particles from scene
        this.particles.forEach(particle => {
            if (particle.geometry) particle.geometry.dispose();
            if (particle.material) particle.material.dispose();
            if (particle.parent) particle.parent.remove(particle);
        });
        
        // Remove group from scene
        if (this.particleGroup.parent) {
            this.scene.remove(this.particleGroup);
        }
        
        this.particles = [];
    }
}

