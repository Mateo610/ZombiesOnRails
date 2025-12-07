import * as THREE from 'three';
import { ZOMBIE_SOUND_MAP } from '../enemies/ZombieSoundConfig.js';

/**
* Zombie Sound Manager
* Handles loading, caching, and playback of zombie sounds
*/
export class ZombieSoundManager {
constructor(audioListener) {
this.audioListener = audioListener;
this.soundCache = new Map(); // Cache loaded audio buffers
this.maxConcurrentSounds = 15; // Limit simultaneous sounds
this.activeSounds = []; // Track active sounds for cleanup
}

/**
* Preload all zombie sounds
*/
async preloadSounds() {
console.log('Preloading zombie sounds...');
const audioLoader = new THREE.AudioLoader();
const soundPaths = new Set();

// Collect all unique sound paths
Object.values(ZOMBIE_SOUND_MAP).forEach(config => {
if (config.attack) soundPaths.add(config.attack);
if (config.groan) soundPaths.add(config.groan);
if (config.move) {
Object.values(config.move).forEach(path => soundPaths.add(path));
}
});

// Load all sounds
const loadPromises = Array.from(soundPaths).map(path => {
return new Promise((resolve, reject) => {
audioLoader.load(
path,
(buffer) => {
this.soundCache.set(path, buffer);
resolve(path);
},
undefined,
(error) => {
console.warn(`Failed to load sound: ${path}`, error);
resolve(null); // Continue even if one fails
}
);
});
});

await Promise.all(loadPromises);
const loadedCount = Array.from(this.soundCache.keys()).length;
console.log(`Preloaded ${loadedCount} zombie sounds`);
}

/**
* Play a groan sound for a zombie type
* @param {string} zombieType - Type of zombie
* @param {THREE.Vector3} position - 3D position of zombie
* @returns {THREE.Audio|null} The audio object or null
*/
playGroan(zombieType, position) {
const soundConfig = ZOMBIE_SOUND_MAP[zombieType];
if (!soundConfig || !soundConfig.groan) {
return null;
}

return this._playSound(soundConfig.groan, position, {
loop: false,
volume: 0.5,
refDistance: 10,
rolloffFactor: 2
});
}

/**
* Play an attack sound for a zombie type
* @param {string} zombieType - Type of zombie
* @param {THREE.Vector3} position - 3D position of zombie
* @returns {THREE.Audio|null} The audio object or null
*/
playAttackSound(zombieType, position) {
const soundConfig = ZOMBIE_SOUND_MAP[zombieType];
if (!soundConfig || !soundConfig.attack) {
return null;
}

return this._playSound(soundConfig.attack, position, {
loop: false,
volume: 0.7,
refDistance: 10,
rolloffFactor: 2
});
}

/**
* Play a movement sound for a zombie type and animation
* @param {string} zombieType - Type of zombie
* @param {string} animationName - Name of the animation (e.g., 'walk', 'run', 'Armature|run')
* @param {THREE.Vector3} position - 3D position of zombie
* @returns {THREE.Audio|null} The audio object or null
*/
playMovementSound(zombieType, animationName, position) {
const soundConfig = ZOMBIE_SOUND_MAP[zombieType];
if (!soundConfig || !soundConfig.move) {
return null;
}

// Try to find sound for specific animation, fallback to any move sound
let soundPath = soundConfig.move[animationName];
if (!soundPath && Object.keys(soundConfig.move).length > 0) {
// Fallback to first available move sound
soundPath = Object.values(soundConfig.move)[0];
}

if (!soundPath) {
return null;
}

return this._playSound(soundPath, position, {
loop: true,
volume: 0.4,
refDistance: 8,
rolloffFactor: 2
});
}

/**
* Internal method to play a sound
* @private
*/
_playSound(soundPath, position, options = {}) {
// Check if we have too many active sounds
this._cleanupFinishedSounds();
if (this.activeSounds.length >= this.maxConcurrentSounds) {
// Stop oldest sound
const oldestSound = this.activeSounds.shift();
if (oldestSound && oldestSound.isPlaying) {
oldestSound.stop();
}
}

// Get cached buffer or return null
const buffer = this.soundCache.get(soundPath);
if (!buffer) {
console.warn(`Sound not loaded: ${soundPath}`);
return null;
}

// Create audio object
const sound = new THREE.Audio(this.audioListener);
sound.setBuffer(buffer);
sound.setLoop(options.loop || false);
sound.setVolume(options.volume || 0.5);

// Set 3D audio properties using panner
if (sound.panner) {
sound.panner.refDistance = options.refDistance || 10;
sound.panner.rolloffFactor = options.rolloffFactor || 2;
sound.panner.distanceModel = 'inverse';
}

sound.position.copy(position);

// Play sound
sound.play();

// Track active sound
this.activeSounds.push(sound);

return sound;
}

/**
* Clean up finished sounds from active list
* @private
*/
_cleanupFinishedSounds() {
this.activeSounds = this.activeSounds.filter(sound => {
if (!sound.isPlaying) {
sound.disconnect();
return false;
}
return true;
});
}

/**
* Stop and cleanup all sounds
*/
cleanup() {
this.activeSounds.forEach(sound => {
if (sound.isPlaying) {
sound.stop();
}
sound.disconnect();
});
this.activeSounds = [];
}
}

