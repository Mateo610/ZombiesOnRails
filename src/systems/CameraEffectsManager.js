/**
 * Camera Effects Manager
 * Handles camera effects like screen shake and breathing animation
 */

export class CameraEffectsManager {
    constructor({ 
        camera, 
        gameData, 
        GameState, 
        threeRenderer, 
        getCurrentCameraScene, 
        mouseLookManager,
        railMovementManager 
    }) {
        this.camera = camera;
        this.gameData = gameData;
        this.GameState = GameState;
        this.threeRenderer = threeRenderer;
        this.getCurrentCameraScene = getCurrentCameraScene;
        this.mouseLookManager = mouseLookManager;
        this.railMovementManager = railMovementManager;
        this.currentCameraScene = null;
        
        this.screenShakeIntensity = 0;
        
        // Breathing effect constants
        this.BREATH_FREQUENCY_Y = 2.0;
        this.BREATH_FREQUENCY_X = 1.5;
        this.SWAY_FREQUENCY_Z = 1.8;
        this.BREATH_AMPLITUDE_Y = 0.005;
        this.BREATH_AMPLITUDE_X = 0.003;
        this.SWAY_AMPLITUDE_Z = 0.002;
    }
    
    /**
     * Set current camera scene (called when scene changes)
     */
    setCurrentCameraScene(scene) {
        this.currentCameraScene = scene;
    }
    
    /**
     * Update current camera scene from getter function
     */
    updateCurrentCameraScene() {
        if (this.getCurrentCameraScene) {
            this.currentCameraScene = this.getCurrentCameraScene();
        }
    }
    
    /**
     * Trigger screen shake
     */
    triggerShake(intensity = 0.02) {
        this.screenShakeIntensity = intensity;
    }
    
    /**
     * Get current screen shake intensity
     */
    getShakeIntensity() {
        return this.screenShakeIntensity;
    }
    
    /**
     * Set screen shake intensity (for temporary disabling)
     */
    setShakeIntensity(intensity) {
        this.screenShakeIntensity = intensity;
    }
    
    /**
     * Update screen shake effect
     */
    updateScreenShake(isRailMovementActive = false) {
        if (this.screenShakeIntensity > 0) {
            // CRITICAL: Do NOT apply screen shake during rail movement
            if (isRailMovementActive || (this.railMovementManager && this.railMovementManager.isMoving())) {
                // Rail movement controls camera, ignore shake
                this.screenShakeIntensity *= 0.85;
                if (this.screenShakeIntensity < 0.001) {
                    this.screenShakeIntensity = 0;
                }
                return;
            }
            
            // Update current camera scene reference
            this.updateCurrentCameraScene();
            
            const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
            
            if (!this.threeRenderer.isFreeCamera && this.currentCameraScene?.position) {
                this.camera.position.x = this.currentCameraScene.position.x + shakeX;
                this.camera.position.y = this.currentCameraScene.position.y + shakeY;
            }
            
            this.screenShakeIntensity *= 0.85;
            
            if (this.screenShakeIntensity < 0.001) {
                this.screenShakeIntensity = 0;
            }
        }
    }
    
    /**
     * Update camera breathing effect
     */
    updateCameraBreathing(elapsedTime, isRailMovementActive = false) {
        // Update current camera scene reference
        this.updateCurrentCameraScene();
        
        // Early returns for conditions where breathing should not apply
        if (this.threeRenderer.isFreeCamera) return;
        if (this.gameData.currentState !== this.GameState.GAMEPLAY) return;
        if (this.screenShakeIntensity > 0.001) return;
        
        // Do not override camera during rail movement
        if (isRailMovementActive || (this.railMovementManager?.isMoving())) {
            return;
        }
        
        // Do not modify camera during free look - position should stay at rail endpoint
        if (this.mouseLookManager && !this.mouseLookManager.isLocked) {
            return;
        }
        
        // Calculate breathing offsets
        const breathY = Math.sin(elapsedTime * this.BREATH_FREQUENCY_Y) * this.BREATH_AMPLITUDE_Y;
        const breathX = Math.cos(elapsedTime * this.BREATH_FREQUENCY_X) * this.BREATH_AMPLITUDE_X;
        const swayZ = Math.sin(elapsedTime * this.SWAY_FREQUENCY_Z) * this.SWAY_AMPLITUDE_Z;
        
        // Apply breathing to camera position (only when using scene position)
        if (this.currentCameraScene?.position) {
            this.camera.position.set(
                this.currentCameraScene.position.x + breathX,
                this.currentCameraScene.position.y + breathY,
                this.currentCameraScene.position.z
            );
        }
        
        // Apply lookAt and roll sway only when mouse look is locked
        if (this.mouseLookManager?.isLocked && this.currentCameraScene?.lookAt) {
            this.camera.lookAt(
                this.currentCameraScene.lookAt.x,
                this.currentCameraScene.lookAt.y,
                this.currentCameraScene.lookAt.z
            );
            this.camera.rotation.z = swayZ;
        }
    }
}

