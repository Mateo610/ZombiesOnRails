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
        scale: 1.0,
        modelPath: '/models/models/zombies/zombie/source/scene.glb'
    },
    runner: {
        name: 'Runner',
        health: 50,
        speed: 1.2,
        damage: 15,
        points: 150,
        color: 0xff6600,
        scale: 0.9,
        modelPath: '/models/models/zombies/zombie/source/scene.glb'
    },
    tank: {
        name: 'Tank',
        health: 200,
        speed: 0.3,
        damage: 25,
        points: 200,
        color: 0x660000,
        scale: 1.3,
        modelPath: '/models/models/zombies/bloated/source/scene.glb'
    },
    crawler: {
        name: 'Crawler',
        health: 30,
        speed: 1.5,
        damage: 5,
        points: 75,
        color: 0x00ff00,
        scale: 0.5,
        modelPath: '/models/models/zombies/zombie/source/scene.glb'
    }
};

// Shared loader instance
const gltfLoader = new GLTFLoader();

// Configure loader to handle unknown extensions gracefully
gltfLoader.setDRACOLoader(null); // No DRACO compression needed
// Note: KHR_materials_pbrSpecularGlossiness is not supported by Three.js
// Materials will use standard PBR instead

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
        this.baseX = position.x;
        
        // Create temporary placeholder mesh (will be replaced by GLB)
        // Start hidden to prevent visual pop
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
        this.mesh.visible = false; // Start hidden until model loads
        this.isPlaceholder = true;
        
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
            console.log(`📦 Loading zombie model: ${this.config.modelPath}`);
            const gltf = await gltfLoader.loadAsync(this.config.modelPath);
            
            // Clone the scene, ensuring materials and textures are properly cloned
            const model = gltf.scene.clone(true);
            
            // Ensure textures are uploaded to GPU
            let texturesReady = true;
            
            // Enable shadows and process materials
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Ensure materials are visible and validate textures (fix for dark/invisible models)
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat) {
                                try {
                                    // Validate and fix textures to prevent crashes
                                    const textureMaps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
                                    textureMaps.forEach(mapName => {
                                        const texture = mat[mapName];
                                        if (texture) {
                                            // Check for invalid blob URLs or failed loads
                                            if (texture.image && texture.image.error) {
                                                console.warn(`⚠️ Zombie ${this.config.name}: Texture ${mapName} failed to load, removing`);
                                                mat[mapName] = null;
                                            } else if (texture.source && texture.source.data) {
                                                const data = texture.source.data;
                                                if (typeof data === 'string' && data.startsWith('blob:')) {
                                                    // Validate blob URL format
                                                    if (!data.includes('/') || data.split('/').length < 4) {
                                                        console.warn(`⚠️ Zombie ${this.config.name}: Invalid blob URL in ${mapName}, removing`);
                                                        mat[mapName] = null;
                                                    }
                                                }
                                            }
                                            
                                            // Set up error handler for textures that fail later
                                            if (texture.image && !texture.image.complete) {
                                                texture.image.onerror = () => {
                                                    console.warn(`⚠️ Zombie ${this.config.name}: Texture ${mapName} image failed to load`);
                                                    mat[mapName] = null;
                                                    mat.needsUpdate = true;
                                                };
                                            }
                                        }
                                    });
                                    
                                    // Ensure material is properly initialized
                                    mat.needsUpdate = true;
                                    
                                    // Check if textures are ready
                                    if (mat.map && mat.map.image && !mat.map.image.error) {
                                        if (!mat.map.image.complete) {
                                            texturesReady = false;
                                        } else {
                                            // Force texture update
                                            mat.map.needsUpdate = true;
                                        }
                                    }
                                    
                                    // Increase emissive if material is too dark
                                    if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
                                    if (mat.color) {
                                        // Lighten very dark materials
                                        if (mat.color.r < 0.1 && mat.color.g < 0.1 && mat.color.b < 0.1) {
                                            mat.color.multiplyScalar(2);
                                        }
                                    }
                                    
                                    // Ensure material has a base color if textures are removed
                                    if (!mat.color) {
                                        mat.color = new THREE.Color(0x888888);
                                    }
                                    
                                    // Store original material for hit flash (clone it to avoid reference issues)
                                    if (!child.userData.originalMaterial) {
                                        if (Array.isArray(child.material)) {
                                            child.userData.originalMaterial = materials.map(m => m.clone());
                                        } else {
                                            child.userData.originalMaterial = mat.clone();
                                        }
                                    }
                                } catch (error) {
                                    console.warn(`⚠️ Error processing material for zombie ${this.config.name}:`, error);
                                    // Continue with material even if there's an error
                                }
                            }
                        });
                    }
                }
            });
            
            // Wait a frame for textures to upload to GPU
            if (!texturesReady) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            // Get model bounding box to determine proper scale
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            // Calculate scale based on expected zombie height (roughly 1.8 units)
            // If model is very large or very small, adjust scale accordingly
            let calculatedScale = this.config.scale;
            if (maxDimension > 0) {
                // If model is larger than 10 units, scale it down
                if (maxDimension > 10) {
                    calculatedScale = (this.config.scale * 1.8) / maxDimension;
                } else if (maxDimension < 0.5) {
                    // If model is very small, scale it up
                    calculatedScale = (this.config.scale * 1.8) / maxDimension;
                }
            }
            
            // Store placeholder position/rotation before replacing
            const oldMesh = this.mesh;
            const oldPosition = oldMesh.position.clone();
            const oldRotation = oldMesh.rotation.clone();
            const oldScale = oldMesh.scale.clone();
            
            // Position and scale model to match placeholder exactly
            model.position.copy(oldPosition);
            model.rotation.copy(oldRotation);
            model.scale.copy(oldScale).multiplyScalar(calculatedScale / this.config.scale);
            model.visible = true; // Ensure model is visible
            
            // Replace placeholder with model
            this.mesh = model;
            this.mesh.userData.zombie = this;
            this.mesh.userData.isZombie = true;
            
            // Remove placeholder and add model
            this.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            oldMesh.material.dispose();
            this.scene.add(this.mesh);
            
            this.isPlaceholder = false;
            
            // Force a render to ensure textures are on GPU
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            console.log(`✅ Loaded GLB model for ${this.config.name} (path: ${this.config.modelPath})`);
        } catch (error) {
            console.error(`❌ Failed to load zombie model for ${this.config.name} (path: ${this.config.modelPath}):`, error);
            console.error(`   Error details:`, error.message || error);
            // Show placeholder if loading fails
            this.mesh.visible = true;
            this.isPlaceholder = true;
            console.warn(`   Using placeholder box for ${this.config.name}`);
        }
    }
    
    update(deltaTime, slowMoActive) {
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
                            // Restore original material (clone it again to avoid reference issues)
                            if (Array.isArray(child.userData.originalMaterial)) {
                                child.material = child.userData.originalMaterial.map(m => m.clone());
                            } else {
                                child.material = child.userData.originalMaterial.clone();
                            }
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
        if (this.isPlaceholder) {
            this.mesh.material.emissiveIntensity = 1.0;
        } else {
            // Flash all meshes in the model
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat) {
                                mat.emissive = new THREE.Color(this.config.color);
                                mat.emissiveIntensity = 1.0;
                            }
                        });
                    } else {
                        child.material.emissive = new THREE.Color(this.config.color);
                        child.material.emissiveIntensity = 1.0;
                    }
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
        
        // Death animation
        const startY = this.mesh.position.y;
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.mesh.position.y = startY * (1 - progress);
            this.mesh.rotation.x = progress * Math.PI / 2;
            
            // Update opacity for all meshes (works for both placeholder and GLB models)
            if (this.isPlaceholder) {
                if (this.mesh.material) {
                    this.mesh.material.opacity = 1 - progress;
                    this.mesh.material.transparent = true;
                }
            } else {
                // GLB model - update all meshes
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat) {
                                mat.opacity = 1 - progress;
                                mat.transparent = true;
                            }
                        });
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
    
    remove() {
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


