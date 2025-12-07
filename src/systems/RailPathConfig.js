/**
 * Rail Path Configuration
 * Defines camera paths with waypoints, timing, and enemy spawn points
 * Paths are generated from SceneConfig.js to ensure exact positioning
 */

import { CAMERA_SCENES } from '../core/SceneConfig.js';

/**
 * Manual path definitions with custom waypoints
 * Add intermediate waypoints to avoid obstacles (walls, fences, etc.)
 * The camera will smoothly follow a spline curve through all waypoints
 * 
 * Format for each path:
 * - id: Unique identifier
 * - name: Descriptive name
 * - waypoints: Array of {x, y, z} positions the camera will pass through
 *   (The camera starts at current position, then goes through each waypoint in order)
 * - duration: Time in milliseconds to complete the path
 * - lookAt: Optional {x, y, z} point for camera to look at during movement
 * - sceneIndex: Target scene index (for zombie spawning)
 * - enemySpawns: Optional array of {position: {x,y,z}, type: 'walker'|'runner', timing: 0.0-1.0}
 */
function generateCustomPaths() {
    const paths = [];
    
    // Path 0: Scene 0 → Scene 1
    // Add intermediate waypoints here to avoid obstacles
    paths.push({
        id: 'path_1',
        name: 'To Scene 1',
        waypoints: [
            // Add intermediate waypoints here to navigate around obstacles
            // Example: { x: 14.0, y: 1.0, z: 0.0 }, // Go around a fence
            // Example: { x: 12.0, y: 1.0, z: 1.0 }, // Continue around
            // Final waypoint is the target scene position
            {
                x: CAMERA_SCENES[1].position.x,
                y: CAMERA_SCENES[1].position.y,
                z: CAMERA_SCENES[1].position.z
            }
        ],
        duration: CAMERA_SCENES[1].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[1].lookAt,
        sceneIndex: 1,
        enemySpawns: []
    });
    
    // Path 1: Scene 1 → Scene 2
    paths.push({
        id: 'path_2',
        name: 'To Scene 2',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[2].position.x,
                y: CAMERA_SCENES[2].position.y,
                z: CAMERA_SCENES[2].position.z
            }
        ],
        duration: CAMERA_SCENES[2].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[2].lookAt,
        sceneIndex: 2,
        enemySpawns: []
    });
    
    // Path 2: Scene 2 → Scene 3
    paths.push({
        id: 'path_3',
        name: 'To Scene 3',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[3].position.x,
                y: CAMERA_SCENES[3].position.y,
                z: CAMERA_SCENES[3].position.z
            }
        ],
        duration: CAMERA_SCENES[3].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[3].lookAt,
        sceneIndex: 3,
        enemySpawns: []
    });
    
    // Path 3: Scene 3 → Scene 4 (Turn Around)
    paths.push({
        id: 'path_4',
        name: 'To Scene 4 (Turn Around)',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[4].position.x,
                y: CAMERA_SCENES[4].position.y,
                z: CAMERA_SCENES[4].position.z
            }
        ],
        duration: CAMERA_SCENES[4].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[4].lookAt,
        sceneIndex: 4,
        enemySpawns: []
    });
    
    // Path 4: Scene 4 → Scene 5 (Mid Street)
    paths.push({
        id: 'path_5',
        name: 'To Scene 5 (Mid Street)',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[5].position.x,
                y: CAMERA_SCENES[5].position.y,
                z: CAMERA_SCENES[5].position.z
            }
        ],
        duration: CAMERA_SCENES[5].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[5].lookAt,
        sceneIndex: 5,
        enemySpawns: []
    });
    
    // Path 5: Scene 5 → Scene 6 (Front of Door Pivot)
    paths.push({
        id: 'path_6',
        name: 'To Scene 6 (Front of Door Pivot)',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[6].position.x,
                y: CAMERA_SCENES[6].position.y,
                z: CAMERA_SCENES[6].position.z
            }
        ],
        duration: CAMERA_SCENES[6].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[6].lookAt,
        sceneIndex: 6,
        enemySpawns: []
    });
    
    // Path 6: Scene 6 → Scene 7 (Warehouse Interior)
    // Note: This path is typically skipped (uses fade-to-black instead)
    paths.push({
        id: 'path_7',
        name: 'To Scene 7 (Warehouse Interior)',
        waypoints: [
            // Add intermediate waypoints here to avoid obstacles
            {
                x: CAMERA_SCENES[7].position.x,
                y: CAMERA_SCENES[7].position.y,
                z: CAMERA_SCENES[7].position.z
            }
        ],
        duration: CAMERA_SCENES[7].transitionDuration || 3000,
        lookAt: CAMERA_SCENES[7].lookAt,
        sceneIndex: 7,
        enemySpawns: []
    });
    
    return paths;
}

// Generate custom paths with waypoints
export const RAIL_PATHS = generateCustomPaths();

/**
 * Get path by ID
 * @param {string} pathId
 * @returns {Object|null}
 */
export function getPathById(pathId) {
    return RAIL_PATHS.find(path => path.id === pathId) || null;
}

/**
 * Get all paths in order
 * @returns {Array}
 */
export function getAllPaths() {
    return RAIL_PATHS;
}
