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
        scale: 0.35,
        modelPath: '/models/zombies/walker/scene.glb',
        animations: {
            move: 'walk',
            attack: 'attack',
            die: 'death'
        }
    },
    runner: {
        name: 'Runner',
        health: 100,
        speed: 1.2,
        damage: 15,
        points: 150,
        color: 0xff6600,
        scale: 0.35,
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
        scale: 1.3,
        modelPath: '/models/zombies/walker/scene.glb',
        animations: {
            move: 'walk',
            attack: 'attack',
            die: 'death'
        }
    },
    crawler: {
        name: 'Crawler',
        health: 50,
        speed: 1.5,
        damage: 5,
        points: 75,
        color: 0x00ff00,
        scale: 0.5,
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
        this.mesh.position.y = (this.type === 'crawler' ? 0.25 : 0.75) * this.config.scale;
        this.mesh.scale.setScalar(this.config.scale);
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
        this.isAnimatingDeath = false; // Track if death animation is still playing
        
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
        
        // CRITICAL: Set userData for raycasting
        this.mesh.userData.zombie = this;
        this.mesh.userData.isZombie = true;
        
        this.scene.add(this.mesh);
        
        // Load GLB model asynchronously if path configured
        if (this.config.modelPath) {
            this.loadModel();
        }
        
        console.log(`🧟 Spawned ${this.config.name} at`, position);
    }
    
    /**
     * Load GLB model for this zombie
     */
    async loadModel() {
        try {
            console.log(`📦 Loading zombie model: ${this.config.modelPath}`);
            const gltf = await gltfLoader.loadAsync(this.config.modelPath);
            const model = gltf.scene;
            
            // Enable shadows and SET USERDATA on all child meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // CRITICAL: Set userData on EVERY mesh for raycasting
                    child.userData.zombie = this;
                    child.userData.isZombie = true;
                    
                    // Ensure materials are visible (fix for dark/invisible models)
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat) {
                                    mat.needsUpdate = true;
                                    if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
                                    if (mat.color) {
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
                                if (child.material.color.r < 0.1 && child.material.color.g < 0.1 && child.material.color.b < 0.1) {
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
            
            // Apply scale directly from config (no automatic calculation)
            model.scale.setScalar(this.config.scale);
            
            // Position model at EXACT same location as placeholder
            model.position.copy(this.mesh.position);
            model.rotation.y = this.mesh.rotation.y;
            
            console.log(`📏 ${this.config.name} positioned at: x=${model.position.x.toFixed(2)}, y=${model.position.y.toFixed(2)}, z=${model.position.z.toFixed(2)}, scale: ${this.config.scale}`);
            
            // Setup animations
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                
                const animConfig = this.config.animations;
                const availableAnimations = gltf.animations.map(clip => clip.name);
                
                // Only log animation details if animations are missing (for debugging)
                let hasAllAnimations = true;
                
                ['move', 'attack', 'die'].forEach(animType => {
                    const animName = animConfig[animType];
                    
                    // Try to find exact match first
                    let clip = gltf.animations.find(a => a.name === animName);
                    
                    // If not found, try case-insensitive and partial matches
                    if (!clip && animType === 'die') {
                        clip = gltf.animations.find(a => {
                            const lower = a.name.toLowerCase();
                            return lower.includes('death') || 
                                   lower.includes('die') ||
                                   lower.includes('killed') ||
                                   lower.includes('fall');
                        });
                    }
                    
                    if (clip) {
                        const action = this.mixer.clipAction(clip);
                        action.setLoop(animType === 'die' ? THREE.LoopOnce : THREE.LoopRepeat);
                        action.clampWhenFinished = animType === 'die';
                        this.animations[animType] = action;
                    } else {
                        hasAllAnimations = false;
                        // Only warn if it's a critical animation (move or die)
                        if (animType === 'move' || animType === 'die') {
                            console.warn(`⚠️ Animation "${animName}" not found for ${this.config.name}`);
                        }
                    }
                });
                
                // Log animation summary only if there are issues
                if (!hasAllAnimations) {
                    console.log(`🎬 ${this.config.name} animations:`, availableAnimations);
                }
                
                // Start with move animation if available
                if (this.animations.move) {
                    this.playAnimation('move');
                }
            }
            
            // Replace placeholder with model
            const oldMesh = this.mesh;
            this.mesh = model;
            
            // Set userData on parent too
            this.mesh.userData.zombie = this;
            this.mesh.userData.isZombie = true;
            
            // Remove placeholder and add model
            this.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            oldMesh.material.dispose();
            this.scene.add(this.mesh);
            
            this.isPlaceholder = false;
            console.log(`✅ Loaded GLB model for ${this.config.name}`);
        } catch (error) {
            console.error(`❌ Failed to load zombie model for ${this.config.name}:`, error);
            // Keep placeholder mesh if loading fails
        }
    }
    
    /**
     * Play a specific animation
     * @param {string} animType - 'move', 'attack', or 'die'
     */
    playAnimation(animType) {
        if (!this.mixer) {
            // Only warn once per zombie instance, not every frame
            if (!this._mixerWarningShown) {
                console.warn(`⚠️ No mixer available for ${this.config.name} - animations disabled`);
                this._mixerWarningShown = true;
            }
            return;
        }
        
        // CRITICAL: If dead, ONLY allow die animation
        if (this.isDead && animType !== 'die') {
            return; // Silently refuse to play any animation except die
        }
        
        // If dead and playing die animation, don't interrupt it
        if (this.isDead && animType === 'die') {
            return; // Die animation is already playing, don't restart it
        }
        
        const action = this.animations[animType];
        if (!action) {
            console.warn(`⚠️ No action found for ${animType} on ${this.config.name}`);
            return;
        }
        
        if (this.currentAnimationName === animType && action.isRunning()) {
            return;
        }
        
        console.log(`🎬 Playing animation: ${animType} for ${this.config.name}`);
        console.log(`   Action enabled: ${action.enabled}, weight: ${action.weight}, time: ${action.time}`);
        
        // Fade out current animation
        if (this.currentAnimationAction && this.currentAnimationAction !== action) {
            this.currentAnimationAction.fadeOut(0.2);
        }
        
        // Fade in new animation
        action.reset();
        action.fadeIn(0.2);
        action.play();
        
        console.log(`   After play - isRunning: ${action.isRunning()}, paused: ${action.paused}`);
        
        this.currentAnimationAction = action;
        this.currentAnimationName = animType;
    }
    
    update(deltaTime, slowMoActive) {
        // Always update animation mixer (even when dead for death animation)
        if (this.mixer) {
            this.mixer.update(deltaTime);
            
            // Debug: Log animation state when dead
            if (this.isDead && this.currentAnimationAction) {
                const action = this.currentAnimationAction;
                if (action.isRunning()) {
                    console.log(`💀 Death anim playing - time: ${action.time.toFixed(2)}/${action.getClip().duration.toFixed(2)}, weight: ${action.getEffectiveWeight()}`);
                }
            }
        }
        
        // Don't move or attack if dead, but keep animating
        if (this.isDead) return;
        
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
        
        // Calculate HORIZONTAL distance to player (ignore Y so zombies don't get "stuck"
        // when their height doesn't exactly match the target height)
        const toPlayer = new THREE.Vector3().subVectors(this.target, this.mesh.position);
        toPlayer.y = 0;
        this.distanceToPlayer = toPlayer.length();
        
        // Speed up as zombie gets closer (tension!)
        const speedMultiplier = THREE.MathUtils.mapLinear(
            this.distanceToPlayer,
            10, 2,  // From 10 units away to 2 units away
            1, 2    // Speed goes from 1x to 2x
        );
        const slowFactor = slowMoActive ? 0.5 : 1;
        
        // Apply difficulty speed multiplier
        const difficultyMultipliers = {
            easy: 1.0,
            medium: 1.3,
            hard: 1.6
        };
        const difficultyMultiplier = difficultyMultipliers[this.gameData.difficulty] || 1.0;
        
        this.currentSpeed = this.baseSpeed * Math.max(1, speedMultiplier) * slowFactor * difficultyMultiplier;
        
        // Check if in attack range
        if (this.distanceToPlayer < this.attackRange) {
            if (!this.isAttacking) {
                this.attack();
            }
            return;
        }
        
        // Move toward player (horizontal plane only)
        const direction = toPlayer;
        
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
            
            // Play movement animation
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
        const attackAction = this.animations.attack;
        const duration = attackAction ? attackAction.getClip().duration : 0.5;
        
        setTimeout(() => {
            if (this.mesh && !this.isDead) {
                this.isAttacking = false;
                this.playAnimation('move');
            }
        }, duration * 1000);
    }
    
    takeDamage(amount, isHeadshot = false) {
        if (this.isDead) return { killed: false, headshot: false };
        
        // Use the damage amount directly (headshot damage is already calculated in ShootingSystem)
        // No need to multiply again - the amount parameter already contains the correct headshot damage
        this.health -= amount;
        
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
        
        // Clear hit flash immediately so death animation is visible
        this.hitFlashTimer = 0;
        if (!this.isPlaceholder) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            });
        } else {
            this.mesh.material.emissiveIntensity = 0.3;
        }
        
        // Score and stats
        let points = this.config.points;
        if (wasHeadshot) points *= 2;
        
        this.gameData.score += points;
        this.gameData.totalZombiesKilled++;
        
        // Combo
        this.incrementCombo();
        
        console.log(`💀 ${this.config.name} killed! ${wasHeadshot ? 'HEADSHOT! ' : ''}+${points} points`);
        
        // Play death animation if available
        const dieAction = this.animations.die;
        if (dieAction && this.mixer) {
            console.log(`🎬 Playing death animation for ${this.config.name}`);
            console.log(`   Model visible: ${this.mesh.visible}, position:`, this.mesh.position);
            console.log(`   Model scale:`, this.mesh.scale);
            
            // Mark that we're animating death
            this.isAnimatingDeath = true;
            
            // Don't stop anything - just play death with full weight immediately
            // The high weight will override other animations
            dieAction.reset();
            dieAction.enabled = true;
            dieAction.setLoop(THREE.LoopOnce, 1); // Play once
            dieAction.clampWhenFinished = true;
            dieAction.timeScale = 1.0;
            dieAction.weight = 1.0;
            
            // Play immediately with no fade
            dieAction.play();
            dieAction.setEffectiveWeight(1.0);
            
            // NOW stop other animations after death is playing
            setTimeout(() => {
                Object.keys(this.animations).forEach(key => {
                    if (key !== 'die' && this.animations[key]) {
                        this.animations[key].setEffectiveWeight(0);
                        this.animations[key].stop();
                    }
                });
            }, 50);
            
            this.currentAnimationAction = dieAction;
            this.currentAnimationName = 'die';
            
            const duration = dieAction.getClip().duration;
            console.log(`   Death animation duration: ${duration.toFixed(2)}s`);
            console.log(`   Death action - running: ${dieAction.isRunning()}, paused: ${dieAction.paused}, weight: ${dieAction.weight}`);
            
            // Make sure model stays visible during death
            this.mesh.visible = true;
            
            // Simple timeout approach - remove after animation completes
            setTimeout(() => {
                console.log(`   Death animation finished, removing zombie`);
                this.isAnimatingDeath = false;
                this.remove();
            }, duration * 1000);
        } else {
            console.log(`⚠️ No death animation found for ${this.config.name}, using fallback`);
            // Fallback death animation
            this.isAnimatingDeath = true;
            const startY = this.mesh.position.y;
            const duration = 1000;
            const startTime = Date.now();
            
            const animate = () => {
                if (!this.mesh || !this.scene.children.includes(this.mesh)) return;
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.mesh.position.y = startY * (1 - progress);
                this.mesh.rotation.x = progress * Math.PI / 2;
                
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
                    this.isAnimatingDeath = false;
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