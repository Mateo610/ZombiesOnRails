import * as THREE from 'three';

// ============================================================================
// ZOMBIE TYPES CONFIG
// ============================================================================
export const ZOMBIE_TYPES = {
    walker: {
        name: 'Walker',
        health: 100,
        speed: 0.5,
        damage: 10,
        points: 100,
        color: 0xff0000,
        scale: 1.0
    },
    runner: {
        name: 'Runner',
        health: 50,
        speed: 1.2,
        damage: 15,
        points: 150,
        color: 0xff6600,
        scale: 0.9
    },
    tank: {
        name: 'Tank',
        health: 200,
        speed: 0.3,
        damage: 25,
        points: 200,
        color: 0x660000,
        scale: 1.3
    },
    crawler: {
        name: 'Crawler',
        health: 30,
        speed: 1.5,
        damage: 5,
        points: 75,
        color: 0x00ff00,
        scale: 0.5
    }
};

// ============================================================================
// ZOMBIE CLASS
// ============================================================================
export default class Zombie {
    /**
     * @param {THREE.Vector3} position
     * @param {'walker' | 'runner' | 'tank' | 'crawler'} type
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     * @param {object} gameData
     * @param {(amount: number) => void} damagePlayer
     * @param {() => void} incrementCombo
     */
    constructor(position, type = 'walker', scene, camera, gameData, damagePlayer, incrementCombo) {
        this.type = type;
        this.config = ZOMBIE_TYPES[type];
        this.scene = scene;
        this.camera = camera;
        this.gameData = gameData;
        this.damagePlayer = damagePlayer;
        this.incrementCombo = incrementCombo;
        
        // Create mesh
        const geometry = this.type === 'crawler'
            ? new THREE.BoxGeometry(0.8, 0.5, 0.8)
            : new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.config.color,
            emissive: this.config.color,
            emissiveIntensity: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = (this.type === 'crawler' ? 0.25 : 0.75) * this.config.scale;
        this.mesh.scale.setScalar(this.config.scale);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Stats
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.baseSpeed = this.config.speed;
        this.currentSpeed = this.baseSpeed;
        this.isDead = false;
        this.isAttacking = false;
        
        // AI
        this.target = new THREE.Vector3(
            this.camera.position.x,
            0.75,
            this.camera.position.z
        );
        this.distanceToPlayer = 999;
        this.attackRange = 1.5;
        
        // Visual
        this.hitFlashTimer = 0;
        this.scuttleTime = 0;
        this.baseX = this.mesh.position.x;
        
        this.mesh.userData.zombie = this;
        this.mesh.userData.isZombie = true;
        
        this.scene.add(this.mesh);
        
        console.log(`🧟 Spawned ${this.config.name} at`, position);
    }
    
    update(deltaTime, slowMoActive) {
        if (this.isDead) return;
        
        // Update hit flash
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
            if (this.hitFlashTimer <= 0) {
                this.mesh.material.emissiveIntensity = 0.3;
            }
        }
        
        // Calculate distance to player
        this.distanceToPlayer = this.mesh.position.distanceTo(this.target);
        
        // Speed up as zombie gets closer (tension!)
        const speedMultiplier = THREE.MathUtils.mapLinear(
            this.distanceToPlayer,
            10, 2,  // From 10 units away to 2 units away
            1, 2    // Speed goes from 1x to 2x
        );
        const slowFactor = slowMoActive ? 0.5 : 1;
        this.currentSpeed = this.baseSpeed * Math.max(1, speedMultiplier) * slowFactor;
        
        // Check if in attack range
        if (this.distanceToPlayer < this.attackRange) {
            if (!this.isAttacking) {
                this.attack();
            }
            return;
        }
        
        // Move toward player
        const direction = new THREE.Vector3();
        direction.subVectors(this.target, this.mesh.position);
        direction.y = 0;
        
        if (direction.length() > this.attackRange) {
            direction.normalize();
            
            // Forward movement
            this.mesh.position.x += direction.x * this.currentSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.currentSpeed * deltaTime;
            
            // Crawlers "scuttle" side-to-side
            if (this.type === 'crawler') {
                this.scuttleTime += deltaTime * 8;
                const scuttleAmplitude = 0.3 * this.config.scale;
                const sideOffset = Math.sin(this.scuttleTime) * scuttleAmplitude;
                
                // Side vector perpendicular to direction
                const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
                this.mesh.position.x += side.x * sideOffset;
                this.mesh.position.z += side.z * sideOffset;
            }
            
            // Face direction
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        }
    }
    
    attack() {
        if (this.isAttacking) return;
        
        this.isAttacking = true;
        console.log(`💥 ${this.config.name} attacking! Damage: ${this.config.damage}`);
        
        // Deal damage to player
        this.damagePlayer(this.config.damage);
        
        // Attack animation - lunge forward
        const originalZ = this.mesh.position.z;
        this.mesh.position.z += 0.3;
        
        setTimeout(() => {
            if (this.mesh) {
                this.mesh.position.z = originalZ;
            }
            this.isAttacking = false;
        }, 500);
    }
    
    takeDamage(amount, isHeadshot = false) {
        if (this.isDead) return { killed: false, headshot: false };
        
        const actualDamage = isHeadshot ? amount * 2 : amount;
        this.health -= actualDamage;
        
        // Flash effect
        this.mesh.material.emissiveIntensity = 1.0;
        this.hitFlashTimer = 0.1;
        
        console.log(`🎯 ${this.config.name} hit! ${isHeadshot ? '💀 HEADSHOT!' : ''} HP: ${this.health}/${this.maxHealth}`);
        
        if (this.health <= 0) {
            this.die(isHeadshot);
            return { killed: true, headshot: isHeadshot };
        }
        
        return { killed: false, headshot: isHeadshot };
    }
    
    die(wasHeadshot = false) {
        this.isDead = true;
        
        // Score and stats
        let points = this.config.points;
        if (wasHeadshot) points *= 2;
        
        this.gameData.score += points;
        this.gameData.totalZombiesKilled++;
        
        // Combo
        this.incrementCombo();
        
        console.log(`💀 ${this.config.name} killed! ${wasHeadshot ? 'HEADSHOT! ' : ''}+${points} points`);
        
        // Death animation
        const startY = this.mesh.position.y;
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.mesh.position.y = startY * (1 - progress);
            this.mesh.rotation.x = progress * Math.PI / 2;
            this.mesh.material.opacity = 1 - progress;
            this.mesh.material.transparent = true;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.remove();
            }
        };
        
        animate();
    }
    
    remove() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}


