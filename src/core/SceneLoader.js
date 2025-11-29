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
        this.loader = new GLTFLoader(this.loadingManager);
        this.currentSceneModel = null;
        this.warehouseModel = null;
        this.factoryInteriorModel = null;
        this.isWarehouseLoaded = false;
        this.texturesLoaded = false;
        
        // Track texture loading
        this.loadingManager.onLoad = () => {
            // All resources loaded, but need to wait for GPU upload
            console.log('📦 All resources loaded, waiting for GPU upload...');
            this.texturesLoaded = true;
        };
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
            const gltf = await this.loader.loadAsync('/models/scenes/factory_scene/source/scene.glb');
            
            // Remove old scene model if exists
            if (this.currentSceneModel) {
                scene.remove(this.currentSceneModel);
                this.disposeModel(this.currentSceneModel);
            }
            
            this.currentSceneModel = gltf.scene;
            this.currentSceneModel.name = 'factory_scene';

            // Start hidden - will be made visible after pre-render
            this.currentSceneModel.visible = false;
            
            // Enable shadows on all meshes
            this.currentSceneModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
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
            const gltf = await this.loader.loadAsync('/models/scenes/warehouse_interior/source/scene.glb');
            
            this.warehouseModel = gltf.scene;
            this.warehouseModel.name = 'warehouse_interior';
            
            // Calculate bounding box to determine scale
            const box = new THREE.Box3().setFromObject(this.warehouseModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            console.log(`📏 Warehouse interior original size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
            console.log(`📏 Warehouse interior center: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);
            
            // Scale relative to player (player is ~1.6-1.8 units tall)
            // Target: Room height should be ~3-4 units, width ~10-15 units for comfortable gameplay
            // Use the largest dimension to determine scale
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetMaxDimension = 15; // Target max room dimension in units
            const scaleFactor = targetMaxDimension / maxDimension;
            
            // Apply scale
            this.warehouseModel.scale.setScalar(scaleFactor);
            
            // Center the model at origin (or adjust based on expected player position)
            // Move model so its center aligns with origin
            this.warehouseModel.position.sub(center.clone().multiplyScalar(scaleFactor));
            
            console.log(`📏 Applied scale factor: ${scaleFactor.toFixed(4)}`);
            console.log(`📏 Scaled size: ${(size.x * scaleFactor).toFixed(2)} x ${(size.y * scaleFactor).toFixed(2)} x ${(size.z * scaleFactor).toFixed(2)}`);
            
            // Enable shadows
            this.warehouseModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Initially hide warehouse (will be shown when door opens)
            this.warehouseModel.visible = false;
            scene.add(this.warehouseModel);
            this.isWarehouseLoaded = true;
            
            console.log('✅ Warehouse interior loaded and scaled');
            if (onComplete) onComplete(this.warehouseModel);
        } catch (error) {
            console.error('❌ Failed to load warehouse interior:', error);
            if (onComplete) onComplete(null);
        }
    }
    
    /**
     * Load factory interior (alternative interior scene)
     * Uses same scaling approach as warehouse interior
     * @param {THREE.Scene} scene
     * @param {Function} onComplete
     */
    async loadFactoryInterior(scene, onComplete) {
        // Check if there's a factory_interior model, otherwise use warehouse_interior
        const modelPath = '/models/scenes/warehouse_interior/source/scene.glb';
        
        try {
            const gltf = await this.loader.loadAsync(modelPath);
            
            // Remove old factory interior if exists
            if (this.factoryInteriorModel) {
                scene.remove(this.factoryInteriorModel);
                this.disposeModel(this.factoryInteriorModel);
            }
            
            // Clone the scene so we don't share the same object with warehouse interior
            // Both load the same model file, so we need separate instances
            this.factoryInteriorModel = gltf.scene.clone();
            this.factoryInteriorModel.name = 'factory_interior';
            
            // Calculate bounding box to determine scale (same as warehouse interior)
            const box = new THREE.Box3().setFromObject(this.factoryInteriorModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            console.log(`📏 Factory interior original size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
            console.log(`📏 Factory interior center: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);
            
            // Scale relative to player (player is ~1.6-1.8 units tall)
            // Target: Room height should be ~3-4 units, width ~10-15 units for comfortable gameplay
            // Use the largest dimension to determine scale
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetMaxDimension = 15; // Target max room dimension in units
            const scaleFactor = targetMaxDimension / maxDimension;
            
            // Apply scale
            this.factoryInteriorModel.scale.setScalar(scaleFactor);
            
            // Position model relative to camera start position
            // Camera for warehouse interior starts at (0, 1.6, 0) looking at (0, 1.5, -10)
            // Instead of centering at origin, position model so camera is inside it
            // The model center is at (202.24, -283.96, -575.84) in original scale
            // After scaling, center is at (202.24 * 0.0019, -283.96 * 0.0019, -575.84 * 0.0019)
            // = (0.38, -0.54, -1.09)
            // We want camera at (0, 1.6, 0) to be inside the model, so we need to adjust
            // Move model so its center aligns with where camera expects it
            const scaledCenter = center.clone().multiplyScalar(scaleFactor);
            
            // Don't center at origin - instead, position model so camera (0, 1.6, 0) is at appropriate location
            // Camera looks at (0, 1.5, -10), so model should be positioned forward in -Z
            // Move model so its original center position (after scaling) is offset to place camera correctly
            this.factoryInteriorModel.position.sub(scaledCenter);
            
            // Then offset to position camera correctly relative to model
            // Camera is at (0, 1.6, 0), model center after scaling is at scaledCenter
            // We want model positioned so camera is at the right spot
            // Try keeping model near origin but adjusting for camera position
            this.factoryInteriorModel.position.set(0, 0, 0);
            this.factoryInteriorModel.position.sub(scaledCenter);
            
            console.log(`📏 Model center (scaled): ${scaledCenter.x.toFixed(2)}, ${scaledCenter.y.toFixed(2)}, ${scaledCenter.z.toFixed(2)}`);
            console.log(`📏 Model position after adjustment: ${this.factoryInteriorModel.position.x.toFixed(2)}, ${this.factoryInteriorModel.position.y.toFixed(2)}, ${this.factoryInteriorModel.position.z.toFixed(2)}`);
            
            console.log(`📏 Applied scale factor: ${scaleFactor.toFixed(4)}`);
            console.log(`📏 Scaled size: ${(size.x * scaleFactor).toFixed(2)} x ${(size.y * scaleFactor).toFixed(2)} x ${(size.z * scaleFactor).toFixed(2)}`);
            
            // Enable shadows on all meshes
            this.factoryInteriorModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Start hidden - will be made visible when needed
            this.factoryInteriorModel.visible = false;
            scene.add(this.factoryInteriorModel);
            
            console.log('✅ Factory interior loaded and scaled (same as warehouse interior)');
            if (onComplete) onComplete(this.factoryInteriorModel);
        } catch (error) {
            console.error('❌ Failed to load factory interior:', error);
            // Fallback to placeholder ground
            this.createFallbackGround(scene);
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
     * Show factory interior (scaled interior scene)
     */
    showFactoryInterior() {
        if (this.factoryInteriorModel) {
            this.factoryInteriorModel.visible = true;
            // Hide other scenes
            if (this.currentSceneModel) {
                this.currentSceneModel.visible = false;
            }
            if (this.warehouseModel) {
                this.warehouseModel.visible = false;
            }
            console.log('🏭 Factory interior shown');
            console.log(`🏭 Factory interior position: ${this.factoryInteriorModel.position.x.toFixed(2)}, ${this.factoryInteriorModel.position.y.toFixed(2)}, ${this.factoryInteriorModel.position.z.toFixed(2)}`);
            console.log(`🏭 Factory interior scale: ${this.factoryInteriorModel.scale.x.toFixed(4)}, ${this.factoryInteriorModel.scale.y.toFixed(4)}, ${this.factoryInteriorModel.scale.z.toFixed(4)}`);
            console.log(`🏭 Factory interior visible: ${this.factoryInteriorModel.visible}`);
            
            // Debug: Count meshes
            let meshCount = 0;
            this.factoryInteriorModel.traverse((child) => {
                if (child.isMesh) {
                    meshCount++;
                }
            });
            console.log(`🏭 Factory interior mesh count: ${meshCount}`);
        } else {
            console.error('❌ Factory interior model is null!');
        }
    }
    
    /**
     * Hide factory interior
     */
    hideFactoryInterior() {
        if (this.factoryInteriorModel) {
            this.factoryInteriorModel.visible = false;
            console.log('🏭 Factory interior hidden');
        }
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

