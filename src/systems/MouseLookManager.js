/**
* MouseLookManager
* Handles mouse look (camera rotation) for free-look during shooting scenes
* Simple, direct rotation approach that's easy to understand and debug
*/
export class MouseLookManager {
constructor(camera, gameDataRef, GameStateRef) {
this.camera = camera;
this.gameData = gameDataRef;
this.GameState = GameStateRef;

// Mouse sensitivity
this.mouseSensitivity = 0.002;

// Rotation limits (in radians)
// Small offset (0.1 rad ≈ 5.7°) prevents gimbal lock at extreme angles
const PITCH_OFFSET = 0.1;
this.minPitch = -Math.PI / 2 + PITCH_OFFSET; // ~-85 degrees
this.maxPitch = Math.PI / 2 - PITCH_OFFSET; // ~85 degrees

// Current rotation angles (in radians) - using Euler angles directly
this.yaw = 0; // Horizontal rotation (Y axis)
this.pitch = 0; // Vertical rotation (X axis)

// Smoothing/interpolation
this.enableSmoothing = true;
this.smoothingFactor = 0.15;

// Target rotation (for smoothing)
this.targetYaw = 0;
this.targetPitch = 0;

// State tracking
this.isEnabled = true;
this.isLocked = false;

// Mouse delta tracking
this.lastMouseX = 0;
this.lastMouseY = 0;

// Bound methods
this.onMouseMove = this.onMouseMove.bind(this);
}

/**
* Initialize the mouse look manager
*/
init() {
// Sync rotation from current camera rotation
this.updateRotationFromCamera();

// Set initial target to current rotation
this.targetYaw = this.yaw;
this.targetPitch = this.pitch;

// Add event listeners
window.addEventListener('mousemove', this.onMouseMove);

// Initialize mouse position to center of screen
this.lastMouseX = window.innerWidth / 2;
this.lastMouseY = window.innerHeight / 2;

console.log('MouseLookManager initialized');
return true;
}

/**
* Extract current yaw and pitch from camera's Euler rotation
* This is more reliable than extracting from quaternion
*/
updateRotationFromCamera() {
// Get current camera rotation as Euler angles
// Ensure rotation order is YXZ (yaw then pitch)
this.camera.rotation.order = 'YXZ';
const euler = this.camera.rotation.clone();

// Extract yaw and pitch
// Y rotation is yaw (horizontal)
// X rotation is pitch (vertical)
this.yaw = euler.y;
this.pitch = euler.x;

// Clamp pitch to limits
this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

// Sync target values
this.targetYaw = this.yaw;
this.targetPitch = this.pitch;
}

/**
* Handle mouse move events
* @param {MouseEvent} event - Mouse move event
*/
onMouseMove(event) {
// Early return if mouse look is disabled or locked
if (!this.isEnabled || this.isLocked) return;
if (this.gameData.currentState !== this.GameState.GAMEPLAY) return;

// Calculate mouse delta (movement since last frame)
const deltaX = event.clientX - this.lastMouseX;
const deltaY = event.clientY - this.lastMouseY;

// Update target rotation based on mouse movement
// In Three.js YXZ order: positive Y rotation = rotate left, negative = rotate right
// So we invert deltaX to match natural mouse movement (left = rotate left)
this.targetYaw -= deltaX * this.mouseSensitivity;
this.targetPitch -= deltaY * this.mouseSensitivity; // Y is already inverted naturally

// Clamp pitch to prevent gimbal lock at extreme angles
this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch));

// Store current mouse position for next delta calculation
this.lastMouseX = event.clientX;
this.lastMouseY = event.clientY;
}

/**
* Update mouse look rotation (call every frame)
*/
update(deltaTime = 0.016) {
if (!this.isEnabled || this.isLocked) return;
if (this.gameData.currentState !== this.GameState.GAMEPLAY) return;

// Smooth interpolation towards target rotation
if (this.enableSmoothing) {
// Convert deltaTime to frame-rate independent lerp factor
// Assumes 60fps baseline for consistent smoothing across frame rates
const FRAME_RATE_BASELINE = 60;
const lerp = 1 - Math.pow(1 - this.smoothingFactor, deltaTime * FRAME_RATE_BASELINE);
this.yaw += (this.targetYaw - this.yaw) * lerp;
this.pitch += (this.targetPitch - this.pitch) * lerp;
} else {
this.yaw = this.targetYaw;
this.pitch = this.targetPitch;
}

// Apply rotation to camera using Euler angles directly
// This is simpler and more predictable than quaternions
this.camera.rotation.order = 'YXZ'; // Y first (yaw), then X (pitch)
this.camera.rotation.y = this.yaw; // Horizontal rotation
this.camera.rotation.x = this.pitch; // Vertical rotation
// Z (roll) stays at 0 unless modified by other systems (breathing)
}

/**
* Set mouse sensitivity
*/
setSensitivity(sensitivity) {
this.mouseSensitivity = Math.max(0.0001, Math.min(0.01, sensitivity));
}

/**
* Enable mouse look
*/
enable() {
this.isEnabled = true;
}

/**
* Disable mouse look
*/
disable() {
this.isEnabled = false;
}

/**
* Lock mouse look (e.g., during rail movement)
*/
lock() {
this.isLocked = true;
}

/**
* Unlock mouse look
*/
unlock() {
this.isLocked = false;
}

/**
* Reset rotation to initial state
*/
reset() {
this.yaw = 0;
this.pitch = 0;
this.targetYaw = 0;
this.targetPitch = 0;
this.camera.rotation.order = 'YXZ';
this.camera.rotation.y = 0;
this.camera.rotation.x = 0;
}

/**
* Clean up event listeners
*/
dispose() {
window.removeEventListener('mousemove', this.onMouseMove);
}
}
