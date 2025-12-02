import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

/**
 * LockManager
 * Manages the lock on the warehouse door in Scene 5 (Front of Door Pivot)
 * Handles loading, shooting, animation, and scene transition
 */
export class LockManager {
    constructor(scene, camera, gameData, onLockOpened) {
        this.scene = scene;
        this.camera = camera;
        this.gameData = gameData;
        this.onLockOpened = onLockOpened; // Callback when lock opens and falls
        
        this.lockModel = null;
        this.lockGroup = null;
        this.mixer = null;
        this.animationAction = null;
        this.isOpened = false;
        this.isFalling = false;
        this.fallVelocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -9.8;
        this.groundY = 0;
        
        this.loader = new GLTFLoader();
    }
    
    /**
     * Load and position the lock model
     * @param {THREE.Vector3} position - Position to place the lock
     */
    async loadLock(position) {
        // Prevent loading if lock is already loaded
        if (this.lockModel || this.lockGroup) {
            console.warn('⚠️ Lock already loaded, skipping duplicate load');
            return false;
        }
        
        try {
            const gltf = await this.loader.loadAsync('/models/objects/lock/scene.glb');
            this.lockModel = gltf.scene.clone();
            
            // Remove duplicate lock - model contains two locks (Base = interactive, Base_1 = static)
            // Find RootNode and remove Base_1 (static/left), keep Base (interactive/right)
            let rootNode = null;
            this.lockModel.traverse((child) => {
                if (child.name === 'RootNode' && child.children && child.children.length === 2) {
                    rootNode = child;
                }
            });
            
            if (rootNode) {
                let baseObject = null;
                let base1Object = null;
                
                rootNode.children.forEach(child => {
                    if (child.name === 'Base') {
                        baseObject = child;
                    } else if (child.name === 'Base_1') {
                        base1Object = child;
                    }
                });
                
                if (baseObject && base1Object) {
                    // Remove Base_1 (static/left lock), keep Base (interactive/right lock)
                    rootNode.remove(base1Object);
                } else if (rootNode.children.length === 2) {
                    // Fallback: remove first child if names don't match
                    rootNode.remove(rootNode.children[0]);
                }
            }
            
            // Scale the lock model (reduced by 20% total from original 1.75)
            this.lockModel.scale.set(1.4175, 1.4175, 1.4175);
            
            // Fix orientation - dial face toward camera, shackle on top
            this.lockModel.rotation.order = 'YXZ';
            this.lockModel.rotation.set(0, 0, 0);
            
            // Create a group to hold the lock (for easier animation)
            this.lockGroup = new THREE.Group();
            this.lockGroup.add(this.lockModel);
            // Position: forward 0.5 units, up 0.75 units
            this.lockGroup.position.set(position.x + 0.5, position.y + 0.75, position.z);
            
            // Add emissive glow for visibility
            this.lockModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Add subtle emissive glow for visibility
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshPhongMaterial) {
                                mat.emissive = new THREE.Color(0x333322);
                                mat.emissiveIntensity = 0.3;
                                
                                // Slightly brighter glow for dial/face parts
                                const childName = child.name ? child.name.toLowerCase() : '';
                                if (childName.includes('dial') || childName.includes('face') || childName.includes('front')) {
                                    mat.emissive = new THREE.Color(0x444433);
                                    mat.emissiveIntensity = 0.4;
                                }
                                
                                if (mat.metalness !== undefined) mat.metalness = 0.8;
                                if (mat.roughness !== undefined) mat.roughness = 0.2;
                            }
                            mat.transparent = false;
                            mat.opacity = 1.0;
                            mat.visible = true;
                        });
                    }
                    child.visible = true;
                }
            });
            
            // Mark as shootable
            this.lockModel.traverse((child) => {
                if (child.isMesh) {
                    child.userData.isLock = true;
                    child.userData.lockManager = this;
                }
            });
            
            // Setup animations if available
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new AnimationMixer(this.lockModel);
                // Find opening animation (usually first animation or one with "open" in name)
                const openAnimation = gltf.animations.find(anim => 
                    anim.name.toLowerCase().includes('open')
                ) || gltf.animations[0];
                
                if (openAnimation) {
                    this.animationAction = this.mixer.clipAction(openAnimation);
                    this.animationAction.setLoop(THREE.LoopOnce);
                    this.animationAction.clampWhenFinished = true;
                }
            }
            
            // Add to scene
            if (!this.scene.children.includes(this.lockGroup)) {
                this.scene.add(this.lockGroup);
            }
            this.groundY = position.y - 0.5;
            
            console.log('✅ Lock loaded and positioned at:', position);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to load lock model:', error);
            return false;
        }
    }
    
    /**
     * Handle lock being shot
     */
    onShot() {
        if (this.isOpened) return; // Already opened
        
        console.log('🔓 Lock shot! Opening...');
        this.isOpened = true;
        
        // Play opening animation if available
        if (this.animationAction) {
            this.animationAction.play();
            // Wait for half the animation duration, then start falling
            const animationDuration = this.animationAction.getClip().duration;
            setTimeout(() => {
                this.startFalling();
            }, animationDuration * 500);
        } else {
            // No animation, start falling immediately
            this.startFalling();
        }
    }
    
    /**
     * Start the lock falling to the ground
     */
    startFalling() {
        if (this.isFalling) return;
        
        this.isFalling = true;
        this.fallVelocity.y = 0; // Start with no downward velocity
        
        // Add slight rotation for realism
        this.lockGroup.rotation.x = Math.random() * 0.2 - 0.1;
        this.lockGroup.rotation.z = Math.random() * 0.2 - 0.1;
        
        console.log('🔓 Lock falling...');
    }
    
    /**
     * Update lock physics (falling)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update falling physics
        if (this.isFalling && this.lockGroup) {
            // Apply gravity
            this.fallVelocity.y += this.gravity * deltaTime;
            
            // Update position
            this.lockGroup.position.y += this.fallVelocity.y * deltaTime;
            
            // Add rotation while falling
            this.lockGroup.rotation.x += 2 * deltaTime;
            this.lockGroup.rotation.z += 1.5 * deltaTime;
            
            // Check if hit ground
            if (this.lockGroup.position.y <= this.groundY) {
                this.lockGroup.position.y = this.groundY;
                this.fallVelocity.y = 0;
                this.isFalling = false;
                
                console.log('🔓 Lock hit the ground, triggering scene transition');
                
                // Trigger scene transition after a brief delay
                setTimeout(() => {
                    if (this.onLockOpened) {
                        this.onLockOpened();
                    }
                }, 500);
            }
        }
    }
    
    /**
     * Get the lock mesh for raycaster intersection
     * @returns {THREE.Object3D[]} Array of meshes to check for hits
     */
    getLockMeshes() {
        if (!this.lockModel || this.isOpened) return [];
        
        const meshes = [];
        this.lockModel.traverse((child) => {
            if (child.isMesh && child.userData.isLock !== false) {
                // Only include meshes that are marked as lock (exclude test objects)
                meshes.push(child);
            }
        });
        return meshes;
    }
    
    /**
     * Check if lock is active (not opened yet)
     * @returns {boolean}
     */
    isActive() {
        return this.lockModel !== null && !this.isOpened;
    }
    
    /**
     * Clean up and remove lock from scene
     */
    dispose() {
        if (this.lockGroup) {
            this.scene.remove(this.lockGroup);
            this.lockGroup.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        if (this.mixer) {
            this.mixer = null;
        }
        
        this.lockModel = null;
        this.lockGroup = null;
        this.animationAction = null;
    }
}

