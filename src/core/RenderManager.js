/**
 * RenderManager
 * Manages render loop, pre-rendering, and scene reveal logic
 * Critical for preventing startup glitch
 */
export class RenderManager {
    constructor(renderer, scene, camera, clock) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.clock = clock;
        
        this.isSceneReady = false;
        this.preRenderFrames = 0;
        this.PRE_RENDER_FRAME_COUNT = 3;
        this.renderLoopActive = false;
        this.sceneLoader = null;
        
        // Update callbacks
        this.updateCallbacks = {
            tween: null,
            freeCamera: null,
            gameplay: [],
            camera: [],
            ui: []
        };
    }
    
    setSceneLoader(sceneLoader) {
        this.sceneLoader = sceneLoader;
    }
    
    setUpdateCallbacks(callbacks) {
        this.updateCallbacks = { ...this.updateCallbacks, ...callbacks };
    }
    
    prepareSceneForDisplay() {
        // Ensure only the active scene is visible for pre-rendering
        // Hide warehouse if it exists (it may have been preloaded)
        if (this.sceneLoader && this.sceneLoader.warehouseModel) {
            this.sceneLoader.warehouseModel.visible = false;
        }
        
        // Make active scene visible for pre-rendering (still hidden behind loading overlay)
        if (this.sceneLoader && this.sceneLoader.currentSceneModel) {
            this.sceneLoader.currentSceneModel.visible = true;
        }
        
        // Start pre-rendering (canvas still hidden via CSS)
        if (!this.isSceneReady) {
            this.preRenderScene();
        }
    }
    
    preRenderScene() {
        // Pre-render a few frames to ensure everything is initialized
        // Check if textures are ready
        const texturesReady = this.sceneLoader && this.sceneLoader.currentSceneModel 
            ? this.sceneLoader.areTexturesReady(this.sceneLoader.currentSceneModel)
            : true;
        
        // Force a render to push textures to GPU
        this.renderer.render(this.scene, this.camera);
        this.preRenderFrames++;
        
        // Wait for textures to upload to GPU and render a few stable frames
        if (this.preRenderFrames >= this.PRE_RENDER_FRAME_COUNT && 
            (texturesReady || this.preRenderFrames >= 5)) {
            // Scene is ready, now reveal it
            this.isSceneReady = true;
            this.revealScene();
        } else {
            // Continue pre-rendering
            requestAnimationFrame(() => this.preRenderScene());
        }
    }
    
    revealScene() {
        console.log('✨ Scene ready, revealing...');
        
        // Start the main render loop
        if (!this.renderLoopActive) {
            this.startRenderLoop();
        }
        
        // Fade out loading screen
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                loadingOverlay.remove();
                // Show canvas now that scene is fully ready
                this.renderer.domElement.classList.add('visible');
                // Show start prompt
                const startPrompt = document.getElementById('start-prompt');
                if (startPrompt) {
                    startPrompt.classList.add('visible');
                }
            }, 800);
        }
    }
    
    startRenderLoop() {
        if (this.renderLoopActive) return;
        this.renderLoopActive = true;
        this.animate();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Update TWEEN for camera transitions
        if (this.updateCallbacks.tween) {
            this.updateCallbacks.tween();
        }
        
        // Update free camera controls
        if (this.updateCallbacks.freeCamera && this.updateCallbacks.freeCamera.enabled) {
            this.updateCallbacks.freeCamera.update();
        }
        
        // Update gameplay systems
        if (this.updateCallbacks.gameplay.length > 0) {
            this.updateCallbacks.gameplay.forEach(callback => callback(deltaTime));
        }
        
        // Update camera systems
        if (this.updateCallbacks.camera.length > 0) {
            this.updateCallbacks.camera.forEach(callback => callback(elapsedTime, deltaTime));
        }
        
        // Update UI
        if (this.updateCallbacks.ui.length > 0) {
            this.updateCallbacks.ui.forEach(callback => callback());
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    isReady() {
        return this.isSceneReady;
    }
}

