/**
* Rail Path Configuration
* Defines camera paths with waypoints, timing, and enemy spawn points
* Paths are generated from SceneConfig.js to ensure exact positioning
*/

import { CAMERA_SCENES } from '../core/SceneConfig.js';

/**
* Generate paths for all 14 exterior scenes (0-13)
* Each path goes from current scene to next scene using waypoints from rail-test3.html
* 
* Format for each path:
* - id: Unique identifier
* - name: Descriptive name
* - waypoints: Array of {x, y, z} positions the camera will pass through
* (The camera starts at current position, then goes through each waypoint in order)
* - duration: Time in milliseconds to complete the path
* - lookAt: Optional {x, y, z} point for camera to look at during movement
* - sceneIndex: Target scene index (for zombie spawning)
* - enemySpawns: Optional array of {position: {x,y,z}, type: 'walker'|'runner', timing: 0.0-1.0}
*/
function generateCustomPaths() {
const paths = [];

// Generate paths for scenes 0-15 (16 total paths, one for each scene transition)
// Path N goes from Scene N to Scene N+1
for (let i = 0; i < 16; i++) {
const nextSceneIndex = i + 1;

// Skip if next scene doesn't exist (we stop at Scene 16, which is the final interior scene)
if (nextSceneIndex >= CAMERA_SCENES.length || nextSceneIndex >= 17) {
break;
}

const nextScene = CAMERA_SCENES[nextSceneIndex];
const currentScene = CAMERA_SCENES[i];

// Special case: Scene 5 to Scene 8 - go through Scene 6 and Scene 7 waypoints
// IMPORTANT: Scene 5 must load first as a shooting scene, then travel to Scene 8
// Path 4 (i === 4) goes from Scene 4 to Scene 5 - normal transition, loads Scene 5
// Path 5 (i === 5) goes from Scene 5 to Scene 8 via Scene 6 & 7 waypoints
if (i === 5 && nextSceneIndex === 6) {
// Scene 5 → Scene 6 (waypoint) → Scene 7 (waypoint) → Scene 8 (destination)
// This path starts AFTER Scene 5 is loaded and cleared
const scene6 = CAMERA_SCENES[5]; // Scene 6 - travel scene (waypoint)
const scene7 = CAMERA_SCENES[6]; // Scene 7 - travel scene (waypoint)
const scene8 = CAMERA_SCENES[8]; // Scene 8 - index 8, not 7! - shooting scene (final destination)

paths.push({
id: `path_${i + 1}`,
name: `To Scene 8 via Scene 6 & 7 - ${scene8.name}`,
waypoints: [
{
x: scene6.position.x,
y: scene6.position.y,
z: scene6.position.z
},
{
x: scene7.position.x,
y: scene7.position.y,
z: scene7.position.z
},
{
x: scene8.position.x,
y: scene8.position.y,
z: scene8.position.z
}
],
duration: 4000, // Faster transition - no pauses at waypoints
lookAt: scene8.lookAt, // Use Scene 8's lookAt during entire travel
sceneIndex: 8, // Target Scene 8 - index 8, not 7! directly (skip Scene 6 and 7 as gameplay scenes)
enemySpawns: [],
curveType: 'chordal'
});
} else if (i === 6 && nextSceneIndex === 7) {
// Skip generating paths for Scene 6 and Scene 7 since Scene 5 goes directly to Scene 8
// These scenes will be handled as waypoints in Scene 5's path
// Generate placeholder paths to maintain array indexing
paths.push({
id: `path_${i + 1}`,
name: `Skipped - ${nextScene.name} (waypoint in Scene 5 path)`,
waypoints: [{
x: nextScene.position.x,
y: nextScene.position.y,
z: nextScene.position.z
}],
duration: 1, // Minimal duration (will be skipped)
lookAt: nextScene.lookAt,
sceneIndex: nextSceneIndex,
enemySpawns: [],
curveType: 'chordal'
});
} else {
// Standard path from Scene i to Scene i+1
paths.push({
id: `path_${i + 1}`,
name: `To Scene ${nextSceneIndex} - ${nextScene.name}`,
waypoints: [
{
x: nextScene.position.x,
y: nextScene.position.y,
z: nextScene.position.z
}
],
duration: (() => {
const base = nextScene.transitionDuration || (nextScene.type === 'travel' ? 2000: 3000);
const isEarlySceneTransition = (i >= 1 && i <= 3); // Paths 1-3 (Scene 1→2, 2→3, 3→4) - exclude Path 0
return isEarlySceneTransition ? Math.max(1200, base * 0.5): base;
})(),
lookAt: nextScene.lookAt,
sceneIndex: nextSceneIndex,
enemySpawns: [],
curveType: 'chordal'
});
}
}

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
