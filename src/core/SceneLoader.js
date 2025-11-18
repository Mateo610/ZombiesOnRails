import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * SceneLoader
 * Handles loading GLB scene models and managing scene transitions
 */
export class SceneLoader {
    constructor() {
        // Use LoadingManager to track actual resource loading
        this.loadingManager = new THREE.LoadingManager();
        
        // Add error handling for texture loading failures
        this.loadingManager.onError = (url) => {
            console.warn(`⚠️ Failed to load resource: ${url}`);
            // Don't crash - continue loading other resources
        };
        
        this.loader = new GLTFLoader(this.loadingManager);
        
        // Configure loader to handle unknown extensions gracefully
        // KHR_materials_pbrSpecularGlossiness is not supported - materials will use standard PBR
        this.loader.setDRACOLoader(null); // No DRACO compression needed
        
        this.currentSceneModel = null;
        this.warehouseModel = null;
        this.isWarehouseLoaded = false;
        this.texturesLoaded = false;
        
        // Track texture loading
        this.loadingManager.onLoad = () => {
            // All resources loaded, but need to wait for GPU upload
            console.log('📦 All resources loaded, waiting for GPU upload...');
            this.texturesLoaded = true;
        };
        
        // Note: KHR_materials_pbrSpecularGlossiness warnings are expected for older GLTF files
        // Three.js doesn't support this extension and will use standard PBR materials instead
        // This is usually harmless - materials will still render, just with standard PBR
    }
    
    /**
     * Check if all textures are ready (uploaded to GPU)
     */
    areTexturesReady(model) {
        if (!model) return false;
        
        let allReady = true;
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    if (mat.map && !mat.map.image.complete) {
                        allReady = false;
                    }
                });
            }
        });
        return allReady;
    }

    /**
     * Load factory scene (outdoor environment)
     * @param {THREE.Scene} scene
     * @param {Function} onComplete
     */
    async loadFactoryScene(scene, onComplete) {
        try {
            const gltf = await this.loader.loadAsync('/models/models/scenes/factory_scene/source/scene.glb');
            
            // Remove old scene model if exists
            if (this.currentSceneModel) {
                scene.remove(this.currentSceneModel);
                this.disposeModel(this.currentSceneModel);
            }
            
            this.currentSceneModel = gltf.scene;
            this.currentSceneModel.name = 'factory_scene';

            // Center the model at origin (0, 0, 0) to prevent it from spawning on top of camera
            const box = new THREE.Box3().setFromObject(this.currentSceneModel);
            const center = box.getCenter(new THREE.Vector3());
            this.currentSceneModel.position.sub(center); // Move model so its center is at origin
            
            console.log(`📐 Factory scene bounds:`, {
                min: box.min,
                max: box.max,
                center: center,
                size: box.getSize(new THREE.Vector3())
            });
            console.log(`📐 Factory scene positioned at:`, this.currentSceneModel.position);

            // Remove unwanted meshes (like giant head) from the scene
            this.removeUnwantedMeshes(this.currentSceneModel);

            // Start hidden - will be made visible after pre-render
            this.currentSceneModel.visible = false;
            
            // Enable shadows and validate/fix materials
            this.currentSceneModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Fix invalid or corrupted textures
                    this.validateAndFixMaterials(child);
                }
            });
            
            scene.add(this.currentSceneModel);
            
            console.log('✅ Factory scene loaded');
            if (onComplete) onComplete(this.currentSceneModel);
        } catch (error) {
            console.error('❌ Failed to load factory scene:', error);
            // Fallback to placeholder ground
            this.createFallbackGround(scene);
            if (onComplete) onComplete(null);
        }
    }

    /**
     * Load warehouse interior (second chapter)
     * @param {THREE.Scene} scene
     * @param {Function} onComplete
     */
    async loadWarehouseInterior(scene, onComplete) {
        if (this.isWarehouseLoaded) {
            console.log('⚠️ Warehouse already loaded');
            if (onComplete) onComplete(this.warehouseModel);
            return;
        }

        try {
            const gltf = await this.loader.loadAsync('/models/models/scenes/warehouse_interior/source/scene.glb');
            
            this.warehouseModel = gltf.scene;
            this.warehouseModel.name = 'warehouse_interior';
            
            // Center the model at origin (0, 0, 0) to prevent it from spawning on top of camera
            const box = new THREE.Box3().setFromObject(this.warehouseModel);
            const center = box.getCenter(new THREE.Vector3());
            this.warehouseModel.position.sub(center); // Move model so its center is at origin
            
            console.log(`📐 Warehouse scene bounds:`, {
                min: box.min,
                max: box.max,
                center: center,
                size: box.getSize(new THREE.Vector3())
            });
            console.log(`📐 Warehouse scene positioned at:`, this.warehouseModel.position);
            
            // Enable shadows and validate/fix materials
            this.warehouseModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Fix invalid or corrupted textures
                    this.validateAndFixMaterials(child);
                }
            });
            
            // Initially hide warehouse (will be shown when door opens)
            this.warehouseModel.visible = false;
            scene.add(this.warehouseModel);
            this.isWarehouseLoaded = true;
            
            console.log('✅ Warehouse interior loaded');
            if (onComplete) onComplete(this.warehouseModel);
        } catch (error) {
            console.error('❌ Failed to load warehouse interior:', error);
            if (onComplete) onComplete(null);
        }
    }

    /**
     * Show warehouse interior (called when door opens)
     */
    showWarehouse() {
        if (this.warehouseModel) {
            this.warehouseModel.visible = true;
            console.log('🚪 Warehouse interior revealed');
        }
    }

    /**
     * Show factory scene (exterior)
     */
    showFactory() {
        if (this.currentSceneModel) {
            this.currentSceneModel.visible = true;
        }
        if (this.warehouseModel) {
            this.warehouseModel.visible = false;
        }
        console.log('🏭 Factory scene (exterior) shown');
    }

    /**
     * Hide factory scene and show warehouse
     */
    transitionToWarehouse() {
        if (this.currentSceneModel) {
            this.currentSceneModel.visible = false;
        }
        this.showWarehouse();
    }

    /**
     * Create fallback ground if scene fails to load
     */
    createFallbackGround(scene) {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.name = 'ground';
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
    }

    /**
     * Remove unwanted meshes from the scene (like giant head)
     * Aggressively removes ANY large meshes - scales to zero and hides if removal fails
     */
    removeUnwantedMeshes(model) {
        const meshesToRemove = [];
        const meshesToHide = [];
        const headKeywords = ['head', 'face', 'giant', 'statue', 'monument', 'decorative', 'rock', 'stone'];
        
        model.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                
                // Check if mesh name suggests it's a head/face/decoration
                const isHead = headKeywords.some(keyword => name.includes(keyword));
                
                // Check mesh size - be VERY aggressive
                const box = new THREE.Box3().setFromObject(child);
                const size = box.getSize(new THREE.Vector3());
                const maxDimension = Math.max(size.x, size.y, size.z);
                
                // Remove ANY mesh that is:
                // 1. Named as head/face/etc, OR
                // 2. Larger than 8 units (much more aggressive threshold), OR
                // 3. Suspiciously tall (y > 6 units) which might be decorative
                const isVeryLarge = maxDimension > 8;
                const isVeryTall = size.y > 6;
                
                if (isHead || isVeryLarge || isVeryTall) {
                    console.log(`🗑️ Removing unwanted mesh: "${child.name}" (size: ${maxDimension.toFixed(2)}, isHead: ${isHead}, tall: ${isVeryTall})`);
                    meshesToRemove.push({ mesh: child, size: maxDimension });
                }
            }
        });
        
        // First pass: Try to completely remove meshes
        meshesToRemove.forEach(({ mesh, size }) => {
            try {
                // Remove from parent
                if (mesh.parent) {
                    mesh.parent.remove(mesh);
                }
                
                // Dispose of resources
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    materials.forEach(mat => {
                        if (mat) {
                            try {
                                if (mat.map) mat.map.dispose();
                                if (mat.normalMap) mat.normalMap.dispose();
                                mat.dispose();
                            } catch (e) {
                                // Ignore disposal errors
                            }
                        }
                    });
                }
            } catch (error) {
                // If removal fails, hide it and scale to zero as fallback
                console.warn(`⚠️ Could not remove "${mesh.name}", hiding and scaling to zero instead`);
                mesh.visible = false;
                mesh.scale.set(0, 0, 0);
                mesh.position.set(0, -1000, 0); // Move it far away too
                meshesToHide.push(mesh);
            }
        });
        
        // Second pass: For any that couldn't be removed, make them invisible and tiny
        meshesToHide.forEach(mesh => {
            mesh.visible = false;
            mesh.scale.set(0, 0, 0);
            mesh.position.set(0, -1000, 0);
        });
        
        if (meshesToRemove.length > 0) {
            console.log(`✅ Removed/hid ${meshesToRemove.length} unwanted mesh(es) from factory scene`);
        }
        
        // Additional safety: After all processing, find and kill ANY remaining giant meshes
        setTimeout(() => {
            model.traverse((child) => {
                if (child.isMesh && child.visible) {
                    const box = new THREE.Box3().setFromObject(child);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDimension = Math.max(size.x, size.y, size.z);
                    
                    // If there's still something huge visible, nuke it
                    if (maxDimension > 10) {
                        console.warn(`⚠️ Found remaining giant mesh: "${child.name}" (${maxDimension.toFixed(2)}), removing now`);
                        child.visible = false;
                        child.scale.set(0, 0, 0);
                        child.position.set(0, -1000, 0);
                    }
                }
            });
        }, 100);
    }
    
    /**
     * Validate and fix materials with corrupted or invalid textures
     * Prevents crashes from blob URL errors or invalid texture references
     */
    validateAndFixMaterials(mesh) {
        if (!mesh.material) return;
        
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach(mat => {
            if (!mat) return;
            
            // Check and fix texture maps
            const textureMaps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
            
            textureMaps.forEach(mapName => {
                const texture = mat[mapName];
                if (texture) {
                    try {
                        // Check if texture source is invalid
                        if (texture.image) {
                            // Check for invalid blob URLs
                            if (texture.source && texture.source.data) {
                                const data = texture.source.data;
                                if (typeof data === 'string' && data.startsWith('blob:')) {
                                    // Validate blob URL format
                                    if (!data.includes('/') || data.split('/').length < 4) {
                                        console.warn(`⚠️ Invalid blob URL detected in ${mapName}, removing texture`);
                                        mat[mapName] = null;
                                        mat.needsUpdate = true;
                                        return;
                                    }
                                }
                            }
                            
                            // Check if image failed to load
                            if (texture.image.error) {
                                console.warn(`⚠️ Texture ${mapName} failed to load, removing`);
                                mat[mapName] = null;
                                mat.needsUpdate = true;
                                return;
                            }
                            
                            // Check if image is in an error state
                            if (!texture.image.complete && !texture.image.naturalWidth) {
                                // Set up error handler for images that fail later
                                texture.image.onerror = () => {
                                    console.warn(`⚠️ Texture ${mapName} image failed to load, removing`);
                                    mat[mapName] = null;
                                    mat.needsUpdate = true;
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error validating texture ${mapName}:`, error);
                        // Remove problematic texture
                        mat[mapName] = null;
                        mat.needsUpdate = true;
                    }
                }
            });
            
            // Ensure material has a base color if textures are removed
            if (!mat.color) {
                mat.color = new THREE.Color(0x888888);
            }
            
            mat.needsUpdate = true;
        });
    }
    
    /**
     * Dispose of a model and its resources
     */
    disposeModel(model) {
        if (!model) return;
        
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat) {
                                try {
                                    if (mat.map) mat.map.dispose();
                                    if (mat.normalMap) mat.normalMap.dispose();
                                    mat.dispose();
                                } catch (error) {
                                    console.warn('Error disposing material:', error);
                                }
                            }
                        });
                    } else {
                        try {
                            if (child.material.map) child.material.map.dispose();
                            if (child.material.normalMap) child.material.normalMap.dispose();
                            child.material.dispose();
                        } catch (error) {
                            console.warn('Error disposing material:', error);
                        }
                    }
                }
            }
        });
    }
}

