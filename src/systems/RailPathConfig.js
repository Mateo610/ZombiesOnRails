/**
 * Rail Path Configuration
 * Defines camera paths with waypoints, timing, and enemy spawn points
 * Paths are generated from SceneConfig.js to ensure exact positioning
 */

import { CAMERA_SCENES } from '../core/SceneConfig.js';

/**
 * Generate rail paths from SceneConfig positions
 * Each path goes from the current scene position to the NEXT scene position
 * Path 0: current position → Scene 1
 * Path 1: current position → Scene 2
 * Path 2: current position → Scene 3
 * Path 3: current position → Scene 4 (Warehouse Interior)
 */
function generatePathsFromScenes() {
    const paths = [];
    
    // Generate paths: each path goes to the NEXT scene (not the current one)
    // We need paths.length - 1 paths (since we start at scene 0, we need paths to scenes 1, 2, 3)
    for (let i = 0; i < CAMERA_SCENES.length - 1; i++) {
        const targetSceneIndex = i + 1; // Path i goes to scene i+1
        const targetScene = CAMERA_SCENES[targetSceneIndex];
        
        paths.push({
            id: `path_${i + 1}`,
            name: `To Scene ${targetSceneIndex + 1}: ${targetScene.name}`,
            waypoints: [
                // Waypoint is the exact target scene position
                {
                    x: targetScene.position.x,
                    y: targetScene.position.y,
                    z: targetScene.position.z
                }
            ],
            duration: targetScene.transitionDuration || 3000,
            lookAt: targetScene.lookAt, // Use exact lookAt from scene config
            sceneIndex: targetSceneIndex, // Store target scene index for zombie spawning
            enemySpawns: []
        });
    }
    
    return paths;
}

// Generate paths from SceneConfig
export const RAIL_PATHS = generatePathsFromScenes();

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
