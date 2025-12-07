import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * ModelCache
 * Centralized model loading and caching system
 * Prevents duplicate loads and enables predictive/preloading
 */
class ModelCache {
    constructor() {
        // Shared loader instance (more efficient than creating new ones)
        this.loader = new GLTFLoader();
        
        // Cache: path -> GLTF object
        this.cache = new Map();
        
        // Track loading promises to prevent duplicate requests
        this.loadingPromises = new Map();
        
        // Preload queue for background loading
        this.preloadQueue = [];
        this.preloading = false;
    }
    
    /**
     * Load a model (loads fresh instance each time, browser cache handles speed)
     * @param {string} path - Path to the GLB file
     * @returns {Promise<{scene: THREE.Object3D, gltf: Object}>} The loaded scene and GLTF object
     */
    async load(path) {
        // Always load a fresh instance to avoid sharing issues between zombies
        // Browser HTTP cache will make this fast if already loaded
        // We track loading to prevent duplicate simultaneous network requests
        
        // If already loading, wait for it to populate browser cache first
        // This prevents duplicate network requests while still getting fresh instances
        if (this.loadingPromises.has(path)) {
            await this.loadingPromises.get(path);
        }
        
        // Load a fresh instance (browser cache makes this instant if already loaded)
        // Each call to loadAsync creates a new GLTF object with a new scene
        const gltf = await this.loader.loadAsync(path);
        
        // Store GLTF for animation access (but each zombie gets its own scene instance)
        if (!this.cache.has(path)) {
            this.cache.set(path, gltf);
            // Track first load to help subsequent loads wait for browser cache
            this.loadingPromises.set(path, Promise.resolve(gltf));
        }
        
        // Return both scene and GLTF so animations can be set up
        return { scene: gltf.scene, gltf: gltf };
    }
    
    /**
     * Get cached GLTF object (includes animations)
     * @param {string} path - Path to the GLB file
     * @returns {Object|null} The cached GLTF object or null
     */
    getGLTF(path) {
        return this.cache.get(path) || null;
    }
    
    /**
     * Check if a model is cached
     * @param {string} path - Path to the GLB file
     * @returns {boolean}
     */
    isCached(path) {
        return this.cache.has(path);
    }
    
    /**
     * Check if a model is currently loading
     * @param {string} path - Path to the GLB file
     * @returns {boolean}
     */
    isLoading(path) {
        return this.loadingPromises.has(path);
    }
    
    /**
     * Preload models in the background (non-blocking)
     * @param {string[]} paths - Array of model paths to preload
     */
    async preload(paths) {
        const uniquePaths = [...new Set(paths)].filter(path => !this.isCached(path) && !this.isLoading(path));
        
        if (uniquePaths.length === 0) {
            return;
        }
        
        console.log(`📦 Preloading ${uniquePaths.length} models in background...`);
        
        // Load in parallel but don't block
        const loadPromises = uniquePaths.map(path => 
            this.load(path).then(result => result.scene).catch(error => {
                console.warn(`⚠️ Failed to preload ${path}:`, error);
                return null;
            })
        );
        
        // Don't await - let it load in background
        Promise.all(loadPromises).then(() => {
            console.log(`✅ Preloaded ${uniquePaths.length} models`);
        });
    }
    
    /**
     * Preload models for a specific scene
     * @param {number} sceneIndex - Scene index
     * @param {Array} spawnPoints - Array of spawn points with type info
     */
    async preloadSceneModels(sceneIndex, spawnPoints) {
        if (!spawnPoints || spawnPoints.length === 0) return;
        
        // Get unique model paths for this scene
        const { ZOMBIE_TYPES } = await import('../enemies/Zombie.js');
        const paths = spawnPoints
            .map(sp => {
                const type = sp.type || 'walker';
                const config = ZOMBIE_TYPES[type];
                return config?.modelPath;
            })
            .filter(Boolean)
            .filter((path, index, self) => self.indexOf(path) === index); // Unique paths
        
        if (paths.length > 0) {
            await this.preload(paths);
        }
    }
    
    /**
     * Clear cache (useful for memory management)
     */
    clear() {
        // Dispose of cached models
        this.cache.forEach(gltf => {
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        });
        
        this.cache.clear();
        this.loadingPromises.clear();
    }
}

// Export singleton instance
export const modelCache = new ModelCache();

