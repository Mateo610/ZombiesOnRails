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

