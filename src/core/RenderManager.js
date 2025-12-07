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

// Post-processing
this.composer = null;
this.usePostProcessing = () => true; // Default callback that returns true

// Update callbacks
this.updateCallbacks = {
tween: null,
freeCamera: null,
gameplay: [],
camera: [],
ui: []
};
}

setComposer(composer, usePostProcessingCallback) {
this.composer = composer;
if (usePostProcessingCallback) {
this.usePostProcessing = usePostProcessingCallback;
}
}

setSceneLoader(sceneLoader) {
this.sceneLoader = sceneLoader;
}

setUpdateCallbacks(callbacks) {
this.updateCallbacks = { ...this.updateCallbacks, ...callbacks };
}

prepareSceneForDisplay() {
// Make scene visible for pre-rendering (still hidden behind loading overlay)
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
// Show start screen after loading is complete
const startScreen = document.getElementById('start-screen');
if (startScreen) {
startScreen.style.display = 'flex';
// Keep main game canvas hidden when start screen is visible
this.renderer.domElement.style.opacity = '0';
this.renderer.domElement.style.visibility = 'hidden';
this.renderer.domElement.style.zIndex = '-9999';
this.renderer.domElement.style.pointerEvents = 'none';
} else {
// Show canvas now that scene is fully ready (only if no start screen)
this.renderer.domElement.classList.add('visible');
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

// CRITICAL: Update TWEEN FIRST - this handles rail movement camera updates
// This must run before camera breathing/shake to prevent overriding rail movement
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

// Update camera systems (breathing, shake, recoil)
// NOTE: These check railMovementManager.isMoving() to prevent overriding rail movement
// IMPORTANT: The last callback in the camera array is forceCameraUpdate which ALWAYS wins
if (this.updateCallbacks.camera.length > 0) {
this.updateCallbacks.camera.forEach(callback => callback(elapsedTime, deltaTime));
}

// Update UI
if (this.updateCallbacks.ui.length > 0) {
this.updateCallbacks.ui.forEach(callback => callback());
}

// Render with post-processing if enabled, otherwise use standard renderer
if (this.composer && this.usePostProcessing()) {
this.composer.render();
} else {
this.renderer.render(this.scene, this.camera);
}
}

isReady() {
return this.isSceneReady;
}

/**
* Handle window resize - update composer size if post-processing is enabled
*/
handleResize() {
if (this.composer) {
this.composer.setSize(window.innerWidth, window.innerHeight);
// Update bloom pass resolution if it exists
this.composer.passes.forEach(pass => {
if (pass && pass.resolution) {
pass.resolution.set(window.innerWidth, window.innerHeight);
}
});
}
}
}

