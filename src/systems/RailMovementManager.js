import * as THREE from 'three';
import { RAIL_PATHS, getPathById } from './RailPathConfig.js';

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
        
        // Reset state
        this.isOnRails = false;
        this.splineCurve = null;
        this.splinePoints = null;
        this.startTime = null;
        this.targetLookAt = null;
        this.currentPath = null; // Clear current path reference
        
        // Clear global flag to re-enable camera breathing/shake
        if (typeof window !== 'undefined' && window.isRailMovementActive !== undefined) {
            window.isRailMovementActive = false;
        }
        if (this.gameData) {
            this.gameData.isRailMovementActive = false;
        }
        
        // Move to next path index BEFORE logging
        this.currentPathIndex++;
        
        console.log('✅ Rail movement complete');
        console.log(`📍 Camera at: { x: ${this.camera.position.x.toFixed(2)}, y: ${this.camera.position.y.toFixed(2)}, z: ${this.camera.position.z.toFixed(2)} }`);
        console.log(`📍 Next path index: ${this.currentPathIndex} (total paths: ${this.paths.length})`);
        
        // Reset spawned enemies for next path
        this.spawnedEnemies.clear();
    }
    
    /**
     * Start movement along the next path
     * @returns {boolean} True if movement started, false if conditions not met
     */
    moveToNextPath() {
        console.log('🔘 moveToNextPath called');
        console.log('  - isOnRails:', this.isOnRails);
        console.log('  - gameState:', this.gameData.currentState);
        console.log('  - currentPathIndex:', this.currentPathIndex);
        console.log('  - paths.length:', this.paths.length);
        console.log('  - paths available:', this.paths.map((p, i) => `${i}:${p.id}`).join(', '));
        
        // Check if game is in gameplay state
        if (this.gameData.currentState !== this.GameState.GAMEPLAY) {
            console.log('⚠️ Rail movement: Game not in gameplay state. Current:', this.gameData.currentState);
            return false;
        }
        
        // Check if we have more paths
        if (this.currentPathIndex >= this.paths.length) {
            console.log('⚠️ Rail movement: No more paths (index:', this.currentPathIndex, ', total:', this.paths.length, ')');
            console.log('  All paths completed!');
            return false;
        }
        
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
        if (typeof window !== 'undefined' && window.isRailMovementActive !== undefined) {
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
