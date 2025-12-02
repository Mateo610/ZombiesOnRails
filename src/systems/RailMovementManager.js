import * as THREE from 'three';
import { RAIL_PATHS, getPathById } from './RailPathConfig.js';
import { CAMERA_SCENES } from '../core/SceneConfig.js';

/**
 * Easing function - cubic ease in/out
 * Returns a value between 0 and 1 based on progress (0 to 1)
 */
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * RailMovementManager
 * Manages on-rails camera movement along spline paths with support for
 * multiple waypoints, enemy spawn points, and smooth interpolation
 */
export class RailMovementManager {
    constructor(camera, renderer, gameDataRef, GameStateRef, clock) {
        this.camera = camera;
        this.renderer = renderer;
        this.gameData = gameDataRef;
        this.GameState = GameStateRef;
        this.clock = clock;
        
        this.isOnRails = false;
        this.lookAtDistance = 5.0;
        
        // Path management
        this.paths = RAIL_PATHS;
        this.currentPathIndex = 0;
        this.currentPath = null;
        
        // Spline curve for smooth path interpolation
        this.splineCurve = null;
        this.splinePoints = null;
        
        // Animation state
        this.startTime = null;
        this.duration = 5000;
        this.pathLength = 0;
        
        // Enemy spawn management
        this.enemySpawns = [];
        this.spawnedEnemies = new Set();
        
        // Look-at target for smooth camera rotation
        this.targetLookAt = null;
        
        // Exact target position and lookAt for scene transitions
        this.exactTargetPosition = null;
        this.exactTargetLookAt = null;
        this.onMovementComplete = null;
        
        // Callbacks
        this.onEnemySpawn = null;
        this.onPathComplete = null; // Callback for when a path completes (for zombie spawning)
    }
    
    /**
     * Initialize paths from config
     */
    init() {
        if (this.paths.length === 0) {
            console.warn('⚠️ No rail paths defined');
            return;
        }
        console.log(`✅ RailMovementManager initialized with ${this.paths.length} path(s)`);
        console.log(`  Path indices: 0 to ${this.paths.length - 1}`);
        console.log(`  Current path index: ${this.currentPathIndex}`);
    }
    
    /**
     * Update method - MUST be called every frame in your game loop
     * Handles smooth camera movement along spline paths
     */
    update() {
        if (!this.isOnRails || !this.splineCurve || !this.startTime) {
            return;
        }
        
        // Calculate elapsed time and progress
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1.0); // Clamp to 0-1
        
        // Debug: Log progress occasionally (only first few frames and last few)
        if (!this._updateLogCount) this._updateLogCount = 0;
        this._updateLogCount++;
        if (this._updateLogCount <= 3 || (progress > 0.9 && progress < 1.0) || progress >= 1.0) {
            console.log(`🔄 Rail update: elapsed=${elapsed.toFixed(1)}ms, progress=${progress.toFixed(3)}, eased=${easeInOutCubic(progress).toFixed(3)}`);
        }
        
        // Check if animation is complete BEFORE updating position
        // This prevents completing immediately on first frame
        if (progress >= 1.0) {
            this.completeMovement();
            return;
        }
        
        // Apply easing for smooth acceleration/deceleration
        const easedProgress = easeInOutCubic(progress);
        
        // Get position along spline curve
        const currentPos = this.splineCurve.getPointAt(easedProgress);
        
        // CRITICAL: Update camera position directly - nothing should override this
        this.camera.position.copy(currentPos);
        
        // Calculate smooth look-at direction
        // Look slightly ahead along the curve for natural movement
        const lookAheadT = Math.min(easedProgress + 0.1, 1.0);
        const lookAheadPos = this.splineCurve.getPointAt(lookAheadT);
        
        // Use provided target look-at from path config, or look-ahead along curve
        let target = this.targetLookAt;
        
        // If path has a lookAt point defined, use that (for looking at zombies)
        if (this.currentPath && this.currentPath.lookAt) {
            target = new THREE.Vector3(
                this.currentPath.lookAt.x,
                this.currentPath.lookAt.y,
                this.currentPath.lookAt.z
            );
        } else if (!target) {
            target = lookAheadPos;
        }
        
        const direction = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
        
        const lookAt = new THREE.Vector3()
            .copy(this.camera.position)
            .addScaledVector(direction, this.lookAtDistance);
        
        // Keep lookAt at appropriate height (use target's Y if it's higher)
        lookAt.y = Math.max(this.camera.position.y, target.y) + 0.5;
        
        this.camera.lookAt(lookAt);
        
        // CRITICAL: Force ALL matrix updates to ensure rendering
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
        
        // Also ensure global flag is set every frame
        if (typeof window !== 'undefined') {
            window.isRailMovementActive = true;
        }
        if (this.gameData) {
            this.gameData.isRailMovementActive = true;
        }
        
        // Handle enemy spawns along the path
        this.handleEnemySpawns(easedProgress);
    }
    
    /**
     * Handle enemy spawns based on timing along the path
     * @param {number} progress - 0.0 to 1.0 along the path
     */
    handleEnemySpawns(progress) {
        if (!this.currentPath || !this.currentPath.enemySpawns) {
            return;
        }
        
        this.currentPath.enemySpawns.forEach((spawn, index) => {
            const spawnKey = `${this.currentPath.id}_spawn_${index}`;
            
            // Check if we should spawn this enemy
            if (!this.spawnedEnemies.has(spawnKey) && progress >= spawn.timing) {
                this.spawnedEnemies.add(spawnKey);
                
                // Callback to spawn enemy (will be set by main.js)
                if (this.onEnemySpawn && typeof this.onEnemySpawn === 'function') {
                    this.onEnemySpawn(spawn.position, spawn.type, spawn.path);
                }
            }
        });
    }
    
    /**
     * Complete the current movement
     */
    completeMovement() {
        // CRITICAL: If exact target position is set (from moveToScenePosition), snap to exact values
        if (this.exactTargetPosition && this.exactTargetLookAt) {
            // Snap camera to EXACT position from SceneConfig
            this.camera.position.copy(this.exactTargetPosition);
            
            // Reset camera up vector
            this.camera.up.set(0, 1, 0);
            
            // Set EXACT lookAt from SceneConfig
            this.camera.lookAt(this.exactTargetLookAt);
            
            // Force matrix update
            this.camera.updateMatrixWorld(true);
            
            // Log verification
            console.log('✅ Rail movement complete - snapped to exact scene position');
            console.log(`📍 Target position: { x: ${this.exactTargetPosition.x.toFixed(2)}, y: ${this.exactTargetPosition.y.toFixed(2)}, z: ${this.exactTargetPosition.z.toFixed(2)} }`);
            console.log(`📍 Actual position: { x: ${this.camera.position.x.toFixed(2)}, y: ${this.camera.position.y.toFixed(2)}, z: ${this.camera.position.z.toFixed(2)} }`);
            console.log(`📍 Target lookAt: { x: ${this.exactTargetLookAt.x.toFixed(2)}, y: ${this.exactTargetLookAt.y.toFixed(2)}, z: ${this.exactTargetLookAt.z.toFixed(2)} }`);
            
            // Verify exact match
            const posMatch = this.camera.position.distanceTo(this.exactTargetPosition) < 0.001;
            if (!posMatch) {
                console.warn('⚠️ Position mismatch detected!');
            } else {
                console.log('✅ Position matches exactly');
            }
            
            // Fire completion callback if provided (for moveToScenePosition)
            // This handles scene setup and free look enabling
            if (this.onMovementComplete && typeof this.onMovementComplete === 'function') {
                this.onMovementComplete();
            }
            
            // Clear exact target values
            this.exactTargetPosition = null;
            this.exactTargetLookAt = null;
            this.onMovementComplete = null;
        } else {
            // Standard path completion - check if path has sceneIndex (from SceneConfig)
            let sceneIndex = null;
            if (this.currentPath && typeof this.currentPath.sceneIndex !== 'undefined') {
                sceneIndex = this.currentPath.sceneIndex;
            }
            
            // If path has sceneIndex, snap to exact SceneConfig position
            if (sceneIndex !== null && sceneIndex < CAMERA_SCENES.length) {
                const scene = CAMERA_SCENES[sceneIndex];
                const exactPos = new THREE.Vector3(
                    scene.position.x,
                    scene.position.y,
                    scene.position.z
                );
                const exactLookAt = new THREE.Vector3(
                    scene.lookAt.x,
                    scene.lookAt.y,
                    scene.lookAt.z
                );
                
                // Snap camera to EXACT position from SceneConfig
                this.camera.position.copy(exactPos);
                
                // Reset camera up vector
                this.camera.up.set(0, 1, 0);
                
                // Set EXACT lookAt from SceneConfig
                this.camera.lookAt(exactLookAt);
                
                // Force matrix update
                this.camera.updateMatrixWorld(true);
                
                // Log verification
                console.log(`✅ Rail movement complete - snapped to exact Scene ${sceneIndex + 1} position`);
                console.log(`📍 Scene: ${scene.name}`);
                console.log(`📍 Target position: { x: ${exactPos.x.toFixed(2)}, y: ${exactPos.y.toFixed(2)}, z: ${exactPos.z.toFixed(2)} }`);
                console.log(`📍 Actual position: { x: ${this.camera.position.x.toFixed(2)}, y: ${this.camera.position.y.toFixed(2)}, z: ${this.camera.position.z.toFixed(2)} }`);
                console.log(`📍 Target lookAt: { x: ${exactLookAt.x.toFixed(2)}, y: ${exactLookAt.y.toFixed(2)}, z: ${exactLookAt.z.toFixed(2)} }`);
                
                // Verify exact match
                const posMatch = this.camera.position.distanceTo(exactPos) < 0.001;
                if (!posMatch) {
                    console.warn('⚠️ Position mismatch detected!');
                } else {
                    console.log('✅ Position matches exactly');
                }
                
                // Fire path completion callback for zombie spawning
                // This handles scene setup and free look enabling for RailPathConfig paths
                if (this.onPathComplete && typeof this.onPathComplete === 'function') {
                    this.onPathComplete(sceneIndex, scene);
                }
            } else {
                // Standard path completion (no scene index)
                if (this.splinePoints && this.splinePoints.length > 0) {
                    // Ensure final position
                    const finalPos = this.splineCurve.getPointAt(1.0);
                    this.camera.position.copy(finalPos);
                    
                    // Set final look-at (use path's lookAt if available)
                    let finalTarget = this.targetLookAt;
                    if (!finalTarget && this.currentPath && this.currentPath.lookAt) {
                        finalTarget = new THREE.Vector3(
                            this.currentPath.lookAt.x,
                            this.currentPath.lookAt.y,
                            this.currentPath.lookAt.z
                        );
                    }
                    if (!finalTarget) {
                        finalTarget = finalPos;
                    }
                    
                    const finalDirection = new THREE.Vector3()
                        .subVectors(finalTarget, this.camera.position)
                        .normalize();
                    
                    const finalLookAt = new THREE.Vector3()
                        .copy(this.camera.position)
                        .addScaledVector(finalDirection, this.lookAtDistance);
                    
                    finalLookAt.y = Math.max(this.camera.position.y, finalTarget.y) + 0.5;
                    this.camera.lookAt(finalLookAt);
                    this.camera.updateMatrixWorld();
                }
                
                console.log('✅ Rail movement complete');
                console.log(`📍 Camera at: { x: ${this.camera.position.x.toFixed(2)}, y: ${this.camera.position.y.toFixed(2)}, z: ${this.camera.position.z.toFixed(2)} }`);
                console.log(`📍 Next path index: ${this.currentPathIndex} (total paths: ${this.paths.length})`);
            }
        }
        
        // Store exact target flag before clearing
        const wasExactTarget = this.exactTargetPosition !== null;
        
        // Reset state
        this.isOnRails = false;
        this.splineCurve = null;
        this.splinePoints = null;
        this.startTime = null;
        this.targetLookAt = null;
        this.currentPath = null; // Clear current path reference
        
        // Clear global flag to re-enable camera breathing/shake
        if (typeof window !== 'undefined' && typeof window.isRailMovementActive !== 'undefined') {
            window.isRailMovementActive = false;
        }
        if (this.gameData) {
            this.gameData.isRailMovementActive = false;
        }
        
        // Don't increment currentPathIndex for scene paths - gameData.currentScene is updated by the callback
        // Only increment for non-scene paths (if any)
        if (!wasExactTarget && (this.currentPath === null || typeof this.currentPath.sceneIndex === 'undefined')) {
            this.currentPathIndex++;
        }
        
        // Reset spawned enemies for next path
        this.spawnedEnemies.clear();
        
        // Callbacks are handled in the specific completion branches above:
        // - onMovementComplete for moveToScenePosition (exact target paths)
        // - onPathComplete for RailPathConfig paths with sceneIndex
        // No general onComplete callback needed - each path type handles its own completion
    }
    
    /**
     * Start movement along the next path
     * Uses gameData.currentScene to determine which path to take (path goes to next scene)
     * @returns {boolean} True if movement started, false if conditions not met
     */
    moveToNextPath() {
        console.log('🔘 moveToNextPath called');
        console.log('  - isOnRails:', this.isOnRails);
        console.log('  - gameState:', this.gameData.currentState);
        console.log('  - currentScene:', this.gameData.currentScene);
        console.log('  - currentPathIndex:', this.currentPathIndex);
        console.log('  - paths.length:', this.paths.length);
        console.log('  - paths available:', this.paths.map((p, i) => `${i}:${p.id} -> scene ${p.sceneIndex}`).join(', '));
        
        // CRITICAL: Skip rail movement for transition from Scene 6 (index 5) to Scene 7 (index 6)
        // This transition should use fade-to-black and direct camera jump instead
        if (this.gameData.currentScene === 5) {
            console.log('⚠️ Rail movement: Skipping rail movement for Scene 6 to Scene 7 transition (uses fade-to-black)');
            return false;
        }
        
        // Check if game is in a valid state for rail movement
        // Allow both GAMEPLAY (manual button press) and SCENE_TRANSITION (automatic scene clear)
        const validStates = [this.GameState.GAMEPLAY, this.GameState.SCENE_TRANSITION];
        if (!validStates.includes(this.gameData.currentState)) {
            console.log('⚠️ Rail movement: Game not in valid state for rail movement. Current:', this.gameData.currentState);
            return false;
        }
        
        // Determine which path to use based on current scene
        // Path 0 goes to Scene 1, Path 1 goes to Scene 2, etc.
        // So if we're at Scene 0, use Path 0; if at Scene 1, use Path 1
        const targetPathIndex = this.gameData.currentScene;
        
        // Check if we have a valid path for the next scene
        if (targetPathIndex >= this.paths.length) {
            console.log('⚠️ Rail movement: No more paths available');
            console.log(`  Current scene: ${this.gameData.currentScene}, Total paths: ${this.paths.length}`);
            console.log('  All scenes completed!');
            return false;
        }
        
        // Update currentPathIndex to match the target path
        this.currentPathIndex = targetPathIndex;
        
        // Additional check: ensure paths array is valid
        if (!this.paths || this.paths.length === 0) {
            console.error('❌ Rail movement: Paths array is empty or invalid');
            return false;
        }
        
        // Stop any existing movement
        this.stop();
        
        // Validate path index
        if (this.currentPathIndex < 0 || this.currentPathIndex >= this.paths.length) {
            console.error('❌ Invalid path index:', this.currentPathIndex, '(total paths:', this.paths.length, ')');
            return false;
        }
        
        // Get current path
        this.currentPath = this.paths[this.currentPathIndex];
        
        // Path needs at least 1 waypoint (we add current camera position as start)
        if (!this.currentPath) {
            console.error('❌ Path not found at index:', this.currentPathIndex);
            return false;
        }
        
        if (!this.currentPath.waypoints || this.currentPath.waypoints.length < 1) {
            console.error('❌ Invalid path configuration:', this.currentPath);
            console.error('  Path must have at least 1 waypoint (starting position is current camera position)');
            return false;
        }
        
        // Get waypoints
        const waypoints = this.currentPath.waypoints;
        
        // Start from current camera position (NOT the first waypoint!)
        // This ensures smooth movement from wherever the camera is now
        const startPos = new THREE.Vector3().copy(this.camera.position);
        
        // Convert waypoints to Vector3 array
        const points = [startPos]; // Start from current position
        
        // Add all waypoints
        waypoints.forEach(wp => {
            points.push(new THREE.Vector3(wp.x, wp.y, wp.z));
        });
        
        console.log('🚂 Starting rail movement along path:', this.currentPath.name);
        console.log(`📍 Path has ${points.length} waypoint(s)`);
        console.log(`📍 Starting from: { x: ${startPos.x.toFixed(2)}, y: ${startPos.y.toFixed(2)}, z: ${startPos.z.toFixed(2)} }`);
        console.log(`📍 Ending at: { x: ${points[points.length - 1].x.toFixed(2)}, y: ${points[points.length - 1].y.toFixed(2)}, z: ${points[points.length - 1].z.toFixed(2)} }`);
        console.log(`⏱️ Duration: ${this.currentPath.duration || this.duration}ms`);
        
        // Create Catmull-Rom spline curve for smooth interpolation
        // This creates smooth curves between waypoints
        // Need at least 2 points for a curve (start + at least 1 waypoint)
        if (points.length < 2) {
            console.error('❌ Not enough points for spline curve. Need at least 2 points, got:', points.length);
            return false;
        }
        
        try {
            this.splineCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
            
            // Get curve length for future use (for distance-based timing)
            this.pathLength = this.splineCurve.getLength();
            
            // Store points for reference
            this.splinePoints = points;
        } catch (error) {
            console.error('❌ Error creating spline curve:', error);
            console.error('  Points:', points);
            return false;
        }
        
        // Set target look-at from path config if available, otherwise use last waypoint
        if (this.currentPath && this.currentPath.lookAt) {
            this.targetLookAt = new THREE.Vector3(
                this.currentPath.lookAt.x,
                this.currentPath.lookAt.y,
                this.currentPath.lookAt.z
            );
        } else if (points.length > 1) {
            this.targetLookAt = points[points.length - 1].clone();
        }
        
        // Disable free camera during rail movement
        this.renderer.isFreeCamera = false;
        if (this.renderer.controls) {
            this.renderer.controls.enabled = false;
        }
        
        // Start animation - CRITICAL: Set startTime AFTER everything is ready
        this.duration = this.currentPath.duration || 5000;
        this.isOnRails = true;
        
        // Set global flag to disable camera breathing/shake
        if (typeof window !== 'undefined' && typeof window.isRailMovementActive !== 'undefined') {
            window.isRailMovementActive = true;
        }
        // Also try to set it on gameData if accessible
        if (this.gameData) {
            this.gameData.isRailMovementActive = true;
        }
        
        // Reset spawned enemies for this path
        this.spawnedEnemies.clear();
        
        // Set startTime LAST to ensure accurate timing
        this.startTime = performance.now();
        
        // Reset debug counter
        this._updateLogCount = 0;
        
        console.log('▶️ Rail movement started - using spline interpolation');
        console.log(`  ⏱️ Start time: ${this.startTime}, Duration: ${this.duration}ms`);
        
        return true;
    }
    
    /**
     * Start movement along a specific path by ID
     * @param {string} pathId
     * @returns {boolean}
     */
    moveToPath(pathId) {
        const path = getPathById(pathId);
        if (!path) {
            console.error('❌ Path not found:', pathId);
            return false;
        }
        
        // Find index of this path
        const index = this.paths.findIndex(p => p.id === pathId);
        if (index === -1) {
            console.error('❌ Path index not found:', pathId);
            return false;
        }
        
        this.currentPathIndex = index;
        return this.moveToNextPath();
    }
    
    /**
     * Move camera to exact scene position using rail movement
     * Creates a spline from current position to exact target, then snaps to exact values on completion
     * @param {Object} sceneConfig - Scene object from CAMERA_SCENES with position, lookAt, name
     * @param {Function} onComplete - Callback fired when movement completes
     * @returns {boolean} True if movement started, false otherwise
     */
    moveToScenePosition(sceneConfig, onComplete) {
        if (!sceneConfig || !sceneConfig.position || !sceneConfig.lookAt) {
            console.error('❌ Invalid scene config:', sceneConfig);
            return false;
        }
        
        console.log(`🎬 Starting rail movement to scene: ${sceneConfig.name}`);
        console.log(`📍 Target position: { x: ${sceneConfig.position.x.toFixed(2)}, y: ${sceneConfig.position.y.toFixed(2)}, z: ${sceneConfig.position.z.toFixed(2)} }`);
        console.log(`📍 Target lookAt: { x: ${sceneConfig.lookAt.x.toFixed(2)}, y: ${sceneConfig.lookAt.y.toFixed(2)}, z: ${sceneConfig.lookAt.z.toFixed(2)} }`);
        
        // Store exact target values for snapping on completion
        this.exactTargetPosition = new THREE.Vector3(
            sceneConfig.position.x,
            sceneConfig.position.y,
            sceneConfig.position.z
        );
        this.exactTargetLookAt = new THREE.Vector3(
            sceneConfig.lookAt.x,
            sceneConfig.lookAt.y,
            sceneConfig.lookAt.z
        );
        this.onMovementComplete = onComplete;
        
        // Get current camera position
        const startPos = new THREE.Vector3().copy(this.camera.position);
        
        // Create spline from current position to exact target
        const points = [startPos, this.exactTargetPosition];
        
        try {
            this.splineCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
            this.pathLength = this.splineCurve.getLength();
            this.splinePoints = points;
        } catch (error) {
            console.error('❌ Error creating spline curve:', error);
            this.exactTargetPosition = null;
            this.exactTargetLookAt = null;
            this.onMovementComplete = null;
            return false;
        }
        
        // Set target lookAt for smooth rotation during movement
        this.targetLookAt = this.exactTargetLookAt.clone();
        
        // Disable free camera during rail movement
        this.renderer.isFreeCamera = false;
        if (this.renderer.controls) {
            this.renderer.controls.enabled = false;
        }
        
        // Set duration from sceneConfig or default to 3000ms
        this.duration = sceneConfig.transitionDuration || 3000;
        
        // Start animation
        this.isOnRails = true;
        
        // Set global flag to disable camera breathing/shake
        if (typeof window !== 'undefined' && typeof window.isRailMovementActive !== 'undefined') {
            window.isRailMovementActive = true;
        }
        if (this.gameData) {
            this.gameData.isRailMovementActive = true;
        }
        
        // Reset spawned enemies
        this.spawnedEnemies.clear();
        
        // Set startTime LAST to ensure accurate timing
        this.startTime = performance.now();
        
        // Reset debug counter
        this._updateLogCount = 0;
        
        console.log(`▶️ Rail movement to scene started - duration: ${this.duration}ms`);
        
        return true;
    }
    
    /**
     * Stop current movement
     */
    stop() {
        this.isOnRails = false;
        this.splineCurve = null;
        this.splinePoints = null;
        this.startTime = null;
        this.targetLookAt = null;
        // Don't clear currentPath here - it's needed for the next movement
        // Don't increment currentPathIndex here - that happens in completeMovement()
    }
    
    /**
     * Reset rail movement state (call on game start)
     */
    reset() {
        this.stop();
        this.currentPathIndex = 0;
        this.currentPath = null;
        this.spawnedEnemies.clear();
    }
    
    /**
     * Check if currently moving on rails
     * @returns {boolean}
     */
    isMoving() {
        return this.isOnRails;
    }
    
    /**
     * Force camera position update (safety check)
     * Call this after other camera updates to ensure position is correct
     * This ALWAYS runs and ALWAYS wins - nothing should override rail movement
     */
    forceCameraUpdate() {
        if (!this.isOnRails || !this.splineCurve || !this.startTime) {
            return;
        }
        
        // Recalculate current position from spline
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1.0);
        
        // Don't update if complete (let completeMovement handle it)
        if (progress >= 1.0) {
            return;
        }
        
        const easedProgress = easeInOutCubic(progress);
        const currentPos = this.splineCurve.getPointAt(easedProgress);
        const currentCameraPos = this.camera.position.clone(); // Clone to preserve original
        
        // ALWAYS update camera position - no threshold check
        // This ensures camera position is ALWAYS correct during rail movement
        this.camera.position.copy(currentPos);
        
        // Log if position was overridden (first few times only)
        const distance = currentCameraPos.distanceTo(currentPos);
        if (distance > 0.01) {
            if (!this._overrideCount) this._overrideCount = 0;
            this._overrideCount++;
            if (this._overrideCount <= 5) {
                console.warn(`⚠️ [forceCameraUpdate] Camera position was overridden! Distance: ${distance.toFixed(3)}m`);
                console.warn(`  Camera was at: { x: ${currentCameraPos.x.toFixed(2)}, y: ${currentCameraPos.y.toFixed(2)}, z: ${currentCameraPos.z.toFixed(2)} }`);
                console.warn(`  Correcting to: { x: ${currentPos.x.toFixed(2)}, y: ${currentPos.y.toFixed(2)}, z: ${currentPos.z.toFixed(2)} }`);
                console.warn(`  Progress: ${progress.toFixed(3)}, Elapsed: ${elapsed.toFixed(1)}ms`);
            }
        } else {
            // Log that forceCameraUpdate is running (first few times)
            if (!this._forceUpdateLogCount) this._forceUpdateLogCount = 0;
            this._forceUpdateLogCount++;
            if (this._forceUpdateLogCount <= 3) {
                console.log(`✅ [forceCameraUpdate] Running - position correct, progress: ${progress.toFixed(3)}`);
            }
        }
        
        // Update lookAt (use path's lookAt if available)
        let target = this.targetLookAt;
        if (!target && this.currentPath && this.currentPath.lookAt) {
            target = new THREE.Vector3(
                this.currentPath.lookAt.x,
                this.currentPath.lookAt.y,
                this.currentPath.lookAt.z
            );
        }
        if (!target) {
            const lookAheadT = Math.min(easedProgress + 0.1, 1.0);
            target = this.splineCurve.getPointAt(lookAheadT);
        }
        
        const direction = new THREE.Vector3()
            .subVectors(target, this.camera.position)
            .normalize();
        const lookAt = new THREE.Vector3()
            .copy(this.camera.position)
            .addScaledVector(direction, this.lookAtDistance);
        lookAt.y = Math.max(this.camera.position.y, target.y) + 0.5;
        this.camera.lookAt(lookAt);
        this.camera.updateMatrixWorld();
    }
    
    /**
     * Set callback for enemy spawning
     * @param {Function} callback - (position, type, path) => void
     */
    setEnemySpawnCallback(callback) {
        this.onEnemySpawn = callback;
    }
    
    /**
    /**
     * Set callback for path completion (for zombie spawning)
     * This is called when a RailPathConfig path with sceneIndex completes
     * @param {Function} callback - (sceneIndex, scene) => void
     */
    setPathCompleteCallback(callback) {
        this.onPathComplete = callback;
    }
    
    /**
     * Add a new path dynamically
     * @param {Object} path - { id, name, waypoints, duration, enemySpawns }
     */
    addPath(path) {
        this.paths.push(path);
    }
    
    /**
     * Get current path
     * @returns {Object|null}
     */
    getCurrentPath() {
        return this.currentPath;
    }
    
    /**
     * Get all paths
     * @returns {Array}
     */
    getAllPaths() {
        return this.paths;
    }
}
