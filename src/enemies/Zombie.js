import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        scale: 1,
        modelPath: '/models/zombies/walker/scene.glb',
        animations: {
            move: 'walk',
            attack: 'attack',
            die: 'death'
        }
    },
    runner: {
        name: 'Runner',
        health: 50,
        speed: 1.2,
        damage: 15,
        points: 150,
        color: 0xff6600,
        scale: 1,
        modelPath: '/models/zombies/runner/scene.glb',
        animations: {
            move: 'run',
            attack: 'attack',
            die: 'death'
        }
    },
    tank: {
        name: 'Tank',
        health: 200,
        speed: 0.3,
        damage: 25,
        points: 200,
        color: 0x660000,
        scale: 1,
        // Tank uses walker model as fallback (no specific tank model provided)
        modelPath: '/models/zombies/walker/scene.glb',
        animations: {
            move: 'walk',
            attack: 'attack',
            die: 'death'
        }
    },
    crawler: {
        name: 'Crawler',
        health: 30,
        speed: 1.5,
        damage: 5,
        points: 75,
        color: 0x00ff00,
        scale: 1,
        modelPath: '/models/zombies/spider/scene.glb',
        animations: {
            move: 'Armature|run',
            attack: 'Armature|attack',
            die: 'Armature|die'
        }
    }
};

// Shared loader instance
const gltfLoader = new GLTFLoader();

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
        
        // Create temporary placeholder mesh (will be replaced by GLB)
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
        this.mesh.position.y = (this.type === 'crawler' ? 0.25 : 0.75);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.isPlaceholder = true;
        
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
        
        // Animation
        this.mixer = null;
        this.animations = {};
        this.currentAnimationAction = null;
        this.currentAnimationName = null;
        
        this.mesh.userData.zombie = this;
        this.mesh.userData.isZombie = true;
        
        this.scene.add(this.mesh);
        
        // Load GLB model asynchronously
        this.loadModel();
        
        console.log(`🧟 Spawned ${this.config.name} at`, position);
    }
    
    /**
     * Load GLB model for this zombie
     */
    async loadModel() {
        try {
            // Check if modelPath is configured
            if (!this.config.modelPath) {
                console.error(`❌ No modelPath configured for ${this.config.name} (type: ${this.type})`);
                return;
            }
            
            console.log(`📦 Loading zombie model: ${this.config.modelPath} for ${this.config.name}`);
            const gltf = await gltfLoader.loadAsync(this.config.modelPath);
            
            // FIX: Use gltf.scene directly, don't clone
            const model = gltf.scene;
            
            // Apply scale directly from config (like the working example)
            model.scale.setScalar(this.config.scale);
            
            console.log(`   ✅ Applied scale to GLB model: ${this.config.scale} (from config)`);
            console.log(`   ✅ Model scale values: x=${model.scale.x}, y=${model.scale.y}, z=${model.scale.z}`);
            
            // Enable shadows on all meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Ensure materials are visible (fix for dark/invisible models)
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat) {
                                    mat.needsUpdate = true;
                                    // Increase emissive if material is too dark
                                    if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
                                    if (mat.color) {
                                        // Lighten very dark materials
                                        if (mat.color.r < 0.1 && mat.color.g < 0.1 && mat.color.b < 0.1) {
                                            mat.color.multiplyScalar(2);
                                        }
                                    }
                                }
                            });
                        } else {
                            child.material.needsUpdate = true;
                            if (!child.material.emissive) child.material.emissive = new THREE.Color(0x000000);
                            if (child.material.color) {
                                if (child.material.color.r < 0.1 && child.material.g < 0.1 && child.material.color.b < 0.1) {
                                    child.material.color.multiplyScalar(2);
                                }
                            }
                        }
                    }
                    
                    // Store original material for hit flash
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material;
                    }
                }
            });
            
            // Get bounding box AFTER scaling to determine proper positioning
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
            const scaledMaxDimension = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
            
            console.log(`   ✅ Scaled model size: ${scaledMaxDimension.toFixed(4)} units`);
            
            // Store the old position before replacing mesh
            const oldPosition = this.mesh.position.clone();
            const oldRotation = this.mesh.rotation.y;
            
            // Position model at the same location as placeholder
            // Adjust Y so the bottom of the model is at ground level
            const groundY = oldPosition.y;
            const modelBottomY = scaledCenter.y - (scaledSize.y / 2);
            
            // Set position - use the spawn position, not the placeholder position
            model.position.set(
                oldPosition.x,
                groundY - modelBottomY, // Adjust so bottom sits on ground
                oldPosition.z
            );
            model.rotation.y = oldRotation;
            
            console.log(`   📍 Spawn position: x=${oldPosition.x.toFixed(2)}, y=${oldPosition.y.toFixed(2)}, z=${oldPosition.z.toFixed(2)}`);
            console.log(`   📍 Model position: x=${model.position.x.toFixed(2)}, y=${model.position.y.toFixed(2)}, z=${model.position.z.toFixed(2)}`);
            console.log(`   Model scale: x=${model.scale.x.toFixed(4)}, y=${model.scale.y.toFixed(4)}, z=${model.scale.z.toFixed(4)}`);
            
            // Setup animations
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                
                // Create animation actions for each configured animation
                const animConfig = this.config.animations;
                const availableAnimations = gltf.animations.map(clip => clip.name);
                console.log(`🎬 Available animations for ${this.config.name}:`, availableAnimations);
                
                // Find and create actions for move, attack, and die animations
                ['move', 'attack', 'die'].forEach(animType => {
                    const animName = animConfig[animType];
                    const clip = gltf.animations.find(a => a.name === animName);
                    
                    if (clip) {
                        const action = this.mixer.clipAction(clip);
                        action.setLoop(animType === 'die' ? THREE.LoopOnce : THREE.LoopRepeat);
                        action.clampWhenFinished = animType === 'die';
                        this.animations[animType] = action;
                        console.log(`✅ Found ${animType} animation: "${animName}"`);
                    } else {
                        console.warn(`⚠️ Animation "${animName}" not found for ${this.config.name}`);
                    }
                });
                
                // Start with move animation if available
                if (this.animations.move) {
                    this.playAnimation('move');
                }
            } else {
                console.warn(`⚠️ No animations found in model for ${this.config.name}`);
            }
            
            // Replace placeholder with model
            const oldMesh = this.mesh;
            this.mesh = model;
            this.mesh.userData.zombie = this;
            this.mesh.userData.isZombie = true;
            
            // Ensure model is visible
            this.mesh.visible = true;
            
            // Remove placeholder and add model
            this.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            oldMesh.material.dispose();
            this.scene.add(this.mesh);
            
            this.isPlaceholder = false;
            console.log(`✅ Loaded GLB model for ${this.config.name} - model visible: ${this.mesh.visible}, scale: ${this.mesh.scale.x}`);
        } catch (error) {
            console.error(`❌ Failed to load zombie model for ${this.config.name}:`, error);
            console.error(`   Model path attempted: ${this.config.modelPath}`);
            console.error(`   Error details:`, error.message || error);
            // Keep placeholder mesh if loading fails
        }
    }
    
    /**
     * Play a specific animation
     * @param {string} animType - 'move', 'attack', or 'die'
     */
    playAnimation(animType) {
        if (!this.mixer) return;
        
        // Allow die animation to play even when dead
        if (this.isDead && animType !== 'die') return;
        
        const action = this.animations[animType];
        if (!action) return;
        
        // Don't restart the same animation if it's already playing
        if (this.currentAnimationName === animType && action.isRunning()) {
            return;
        }
        
        // Fade out current animation
        if (this.currentAnimationAction && this.currentAnimationAction !== action) {
            this.currentAnimationAction.fadeOut(0.2);
        }
        
        // Fade in new animation
        action.reset();
        action.fadeIn(0.2);
        action.play();
        
        this.currentAnimationAction = action;
        this.currentAnimationName = animType;
    }
    
    update(deltaTime, slowMoActive) {
        if (this.isDead) return;
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update hit flash
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
            if (this.hitFlashTimer <= 0) {
                if (this.isPlaceholder) {
                    this.mesh.material.emissiveIntensity = 0.3;
                } else {
                    // Reset all mesh materials in the model
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.userData.originalMaterial) {
                            child.material = child.userData.originalMaterial;
                        }
                    });
                }
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
            
            // Play movement animation when moving
            if (!this.isAttacking) {
                this.playAnimation('move');
            }
        }
    }
    
    attack() {
        if (this.isAttacking) return;
        
        this.isAttacking = true;
        console.log(`💥 ${this.config.name} attacking! Damage: ${this.config.damage}`);
        
        // Play attack animation
        this.playAnimation('attack');
        
        // Deal damage to player
        this.damagePlayer(this.config.damage);
        
        // Reset attack state after animation duration
        // Get animation duration if available, otherwise use default
        const attackAction = this.animations.attack;
        const duration = attackAction ? attackAction.getClip().duration : 0.5;
        
        setTimeout(() => {
            if (this.mesh && !this.isDead) {
                this.isAttacking = false;
                // Resume movement animation after attack
                this.playAnimation('move');
            }
        }, duration * 1000);
    }
    
    takeDamage(amount, isHeadshot = false) {
        if (this.isDead) return { killed: false, headshot: false };
        
        const actualDamage = isHeadshot ? amount * 2 : amount;
        this.health -= actualDamage;
        
        // Flash effect
        if (this.isPlaceholder) {
            this.mesh.material.emissiveIntensity = 1.0;
        } else {
            // Flash all meshes in the model
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    const flashMaterial = child.material.clone();
                    flashMaterial.emissive = new THREE.Color(this.config.color);
                    flashMaterial.emissiveIntensity = 1.0;
                    child.material = flashMaterial;
                }
            });
        }
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
        
        // Play death animation
        const dieAction = this.animations.die;
        if (dieAction) {
            this.playAnimation('die');
            
            // Get animation duration and remove zombie after it completes
            const duration = dieAction.getClip().duration;
            
            // Listen for animation finish event
            dieAction.addEventListener('finished', () => {
                this.remove();
            });
            
            // Fallback timeout in case event doesn't fire
            setTimeout(() => {
                if (this.mesh) {
                    this.remove();
                }
            }, duration * 1000 + 500);
        } else {
            // Fallback death animation if no die animation exists
            const startY = this.mesh.position.y;
            const duration = 1000;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.mesh.position.y = startY * (1 - progress);
                this.mesh.rotation.x = progress * Math.PI / 2;
                
                // Handle opacity for both placeholder and model
                if (this.isPlaceholder) {
                    this.mesh.material.opacity = 1 - progress;
                    this.mesh.material.transparent = true;
                } else {
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) {
                                        mat.opacity = 1 - progress;
                                        mat.transparent = true;
                                    }
                                });
                            } else {
                                child.material.opacity = 1 - progress;
                                child.material.transparent = true;
                            }
                        }
                    });
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.remove();
                }
            };
            
            animate();
        }
    }
    
    remove() {
        // Stop all animations
        if (this.mixer) {
            Object.values(this.animations).forEach(action => {
                if (action) {
                    action.stop();
                }
            });
            this.mixer = null;
        }
        
        this.scene.remove(this.mesh);
        
        if (this.isPlaceholder) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        } else {
            // Dispose GLB model resources
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat.map) mat.map.dispose();
                                if (mat.normalMap) mat.normalMap.dispose();
                                mat.dispose();
                            });
                        } else {
                            if (child.material.map) child.material.map.dispose();
                            if (child.material.normalMap) child.material.normalMap.dispose();
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    }
}