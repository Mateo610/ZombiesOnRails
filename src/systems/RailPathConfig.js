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

// Helper function to check if a scene is a travel scene (no zombies)
function isTravelScene(scene) {
return scene.type === 'travel' || (scene.spawnPoints && scene.spawnPoints.length === 0);
}

// Helper function to find the next shooting scene (scene with zombies)
function findNextShootingScene(startIndex) {
for (let i = startIndex + 1; i < CAMERA_SCENES.length; i++) {
const scene = CAMERA_SCENES[i];
// Skip lock scene (Scene 12) as a destination, but allow it as a waypoint
if (i === 12 && scene.spawnPoints && scene.spawnPoints.length === 0) {
continue; // Lock scene - skip as destination but can be waypoint
}
// Return first scene that's not a travel scene
if (!isTravelScene(scene)) {
return i;
}
}
return null; // No more shooting scenes
}

// Generate paths for scenes 0-15 (16 total paths, one for each scene transition)
// Path N goes from Scene N to the next shooting scene, passing through travel scenes as waypoints
for (let i = 0; i < 16; i++) {
const currentScene = CAMERA_SCENES[i];
const nextSceneIndex = i + 1;

// Skip if next scene doesn't exist
if (nextSceneIndex >= CAMERA_SCENES.length || nextSceneIndex >= 17) {
break;
}

// Special case: Scene 5 to Scene 8 - go through Scene 6 and Scene 7 waypoints
// This is already handled correctly, keep it as is
if (i === 5 && nextSceneIndex === 6) {
const scene6 = CAMERA_SCENES[6]; // Scene 6 - travel scene (waypoint) - index 6
const scene7 = CAMERA_SCENES[7]; // Scene 7 - travel scene (waypoint) - index 7
const scene8 = CAMERA_SCENES[8]; // Scene 8 - shooting scene (final destination) - index 8

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
duration: 4000, // Fast transition - no pauses at waypoints
lookAt: scene8.lookAt,
sceneIndex: 8, // Target Scene 8
enemySpawns: [],
curveType: 'chordal'
});
} else if (i === 6 && nextSceneIndex === 7) {
// Skip generating paths for Scene 6 and Scene 7 since Scene 5 goes directly to Scene 8
paths.push({
id: `path_${i + 1}`,
name: `Skipped - ${CAMERA_SCENES[nextSceneIndex].name} (waypoint in Scene 5 path)`,
waypoints: [{
x: CAMERA_SCENES[nextSceneIndex].position.x,
y: CAMERA_SCENES[nextSceneIndex].position.y,
z: CAMERA_SCENES[nextSceneIndex].position.z
}],
duration: 1,
lookAt: CAMERA_SCENES[nextSceneIndex].lookAt,
sceneIndex: nextSceneIndex,
enemySpawns: [],
curveType: 'chordal'
});
} else {
// Find the next shooting scene (skip travel scenes as destinations)
const targetSceneIndex = findNextShootingScene(i);
if (targetSceneIndex === null) {
// No more shooting scenes, create a path to the next scene anyway
const nextScene = CAMERA_SCENES[nextSceneIndex];
paths.push({
id: `path_${i + 1}`,
name: `To Scene ${nextSceneIndex} - ${nextScene.name}`,
waypoints: [{
x: nextScene.position.x,
y: nextScene.position.y,
z: nextScene.position.z
}],
duration: nextScene.transitionDuration || 2000,
lookAt: nextScene.lookAt,
sceneIndex: nextSceneIndex,
enemySpawns: [],
curveType: 'chordal'
});
} else {
// Build waypoints: include all travel scenes between current and target as waypoints
const waypoints = [];
const targetScene = CAMERA_SCENES[targetSceneIndex];

// Collect travel scenes as waypoints between current scene and target
for (let j = i + 1; j < targetSceneIndex; j++) {
const intermediateScene = CAMERA_SCENES[j];
if (isTravelScene(intermediateScene)) {
waypoints.push({
x: intermediateScene.position.x,
y: intermediateScene.position.y,
z: intermediateScene.position.z
});
}
}

// Add target shooting scene as final waypoint
waypoints.push({
x: targetScene.position.x,
y: targetScene.position.y,
z: targetScene.position.z
});

// Calculate duration: base duration for target scene, but faster if passing through travel scenes
// Travel scenes don't add extra time - they're just waypoints
const baseDuration = targetScene.transitionDuration || 3000;
const travelSceneCount = waypoints.length - 1; // Subtract 1 for the target scene
// Add a small amount per travel scene, but much less than a full transition
const duration = baseDuration + (travelSceneCount * 500); // 500ms per travel waypoint

paths.push({
id: `path_${i + 1}`,
name: `To Scene ${targetSceneIndex} - ${targetScene.name}${travelSceneCount > 0 ? ` (via ${travelSceneCount} travel scene${travelSceneCount > 1 ? 's' : ''})` : ''}`,
waypoints: waypoints,
duration: duration,
lookAt: targetScene.lookAt,
sceneIndex: targetSceneIndex, // Target the shooting scene, not the travel scenes
enemySpawns: [],
curveType: 'chordal' // Use chordal for smoother, faster transitions through waypoints
});
}
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
