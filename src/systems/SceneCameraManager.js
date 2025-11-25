import * as THREE from 'three';

/**
 * SceneCameraManager
 * Handles camera positioning and initial direction for each scene
 * Provides clean integration between scene coordinates and free look system
 * Modular - won't break existing scene coordinate system
 */

export class SceneCameraManager {
    constructor(camera, mouseLookManager) {
        this.camera = camera;
        this.mouseLookManager = mouseLookManager;
    }
    
    /**
     * Configure camera rotation order and up vector
     * @private
     */
    _configureCamera() {
        this.camera.up.set(0, 1, 0);
        this.camera.rotation.set(0, 0, 0);
        this.camera.rotation.order = 'YXZ'; // Match mouse look rotation order
    }
    
    /**
     * Set camera to look at a target point
     * @private
     * @param {Object} lookAt - Look at point {x, y, z}
     */
    _setCameraLookAt(lookAt) {
        if (!lookAt) return;
        
        this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
        this.camera.updateMatrixWorld(true);
    }
    
    /**
     * Set camera position and initial direction from scene config
     * Then enables free look from that starting direction
     * @param {Object} sceneConfig - Scene config object with position and lookAt {x, y, z}
     * @param {boolean} preservePosition - If true, only set direction, don't move camera position
     */
    setSceneCamera(sceneConfig, preservePosition = false) {
        if (!sceneConfig) {
            console.warn('⚠️ SceneCameraManager: No scene config provided');
            return;
        }
        
        this._configureCamera();
        
        // Set camera position from scene config (unless preserving position)
        if (!preservePosition && sceneConfig.position) {
            this.camera.position.set(
                sceneConfig.position.x,
                sceneConfig.position.y,
                sceneConfig.position.z
            );
        }
        
        // Set initial camera direction to face zombies (from scene config lookAt)
        this._setCameraLookAt(sceneConfig.lookAt);
        
        // Sync mouse look rotation with camera's initial direction and enable free look
        this.enableFreeLook();
    }
    
    /**
     * Set camera initial direction only (preserve position)
     * Useful after rail movement when camera is already positioned
     * @param {Object} sceneConfig - Scene config object with lookAt {x, y, z}
     */
    setInitialDirection(sceneConfig) {
        if (!sceneConfig?.lookAt) {
            console.warn('⚠️ SceneCameraManager: No scene config or lookAt provided');
            return;
        }
        
        this._configureCamera();
        this._setCameraLookAt(sceneConfig.lookAt);
        this.enableFreeLook();
    }
    
    /**
     * Enable free look by syncing mouse look with current camera rotation
     * Called after camera is positioned and facing the correct direction
     */
    enableFreeLook() {
        if (!this.mouseLookManager) return;
        
        // Sync mouse look rotation with current camera rotation
        // This ensures free look starts from the initial scene direction
        this.mouseLookManager.updateRotationFromCamera();
        
        // Unlock mouse look to enable free look
        this.mouseLookManager.unlock();
        
        // Ensure mouse look is enabled
        this.mouseLookManager.enable();
    }
    
    /**
     * Disable free look (e.g., during rail movement or transitions)
     */
    disableFreeLook() {
        if (!this.mouseLookManager) return;
        this.mouseLookManager.lock();
    }
}

