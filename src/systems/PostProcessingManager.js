import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
* PostProcessingManager
* Manages retro 8-bit arcade post-processing with orange hue and dark contrast
*/
export class PostProcessingManager {
constructor(renderer, scene, camera) {
this.renderer = renderer;
this.scene = scene;
this.camera = camera;
this.composer = null;
this.enabled = true;

this.setup();
}

/**
* Setup post-processing effects
*/
setup() {
// Create composer
this.composer = new EffectComposer(this.renderer);

// Pass 1: Render the scene
const renderPass = new RenderPass(this.scene, this.camera);
this.composer.addPass(renderPass);

// Pass 2: Pixelation for 8-bit aesthetic
const pixelationShader = {
uniforms: {
tDiffuse: { value: null },
resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
pixelSize: { value: 1.45 } // Pixel size (2-3 = subtle 8-bit feel, 4-6 = very pixelated, 8+ = extreme)
},
vertexShader: `
varying vec2 vUv;
void main() {
vUv = uv;
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
fragmentShader: `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float pixelSize;
varying vec2 vUv;

void main() {
vec2 dxy = pixelSize / resolution;
vec2 coord = dxy * floor(vUv / dxy);
gl_FragColor = texture2D(tDiffuse, coord);
}
`
};

const pixelationPass = new ShaderPass(pixelationShader);
this.composer.addPass(pixelationPass);

// Pass 3: Retro color grading (orange hue, moderate contrast, 8-bit quantization)
const retroColorShader = {
uniforms: {
tDiffuse: { value: null },
contrast: { value: 1.1 }, // Moderate contrast
brightness: { value: 0.015} // Slightly brighter
},
vertexShader: `
varying vec2 vUv;
void main() {
vUv = uv;
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
fragmentShader: `
uniform sampler2D tDiffuse;
uniform float contrast;
uniform float brightness;
varying vec2 vUv;

void main() {
vec4 color = texture2D(tDiffuse, vUv);

// Orange/amber hue (warm apocalyptic feel) - more subtle
color.r *= 1.25; // Boost reds
color.g *= 0.98; // Slightly reduce greens
color.b *= 0.70; // Reduce blues (less reduction)

// Apply moderate contrast
color.rgb = ((color.rgb - 0.5) * contrast) + 0.5 + brightness;

// 8-bit color quantization (64 levels per channel for smoother gradients)
color.rgb = floor(color.rgb * 64.0) / 64.0;

// Light darkening for moody atmosphere
color.rgb *= 0.92;

// Clamp to valid range
color.rgb = clamp(color.rgb, 0.0, 1.0);

gl_FragColor = color;
}
`
};

const colorPass = new ShaderPass(retroColorShader);
this.composer.addPass(colorPass);

// Pass 4: Film grain for texture (reduced intensity)
const filmPass = new FilmPass(
0.30, // noise intensity (reduced for less grain)
0.05, // scanline intensity (reduced for subtler CRT lines)
2048, // scanline count
false // not grayscale
);
this.composer.addPass(filmPass);

// Pass 5: Bloom for neon glow (subtle)
const bloomPass = new UnrealBloomPass(
new THREE.Vector2(window.innerWidth, window.innerHeight),
0.5, // strength (reduced for subtler glow)
0.5, // radius (reduced)
0.85 // threshold (slightly lower to catch more bright objects)
);
this.composer.addPass(bloomPass);

console.log('Post-processing effects enabled');
}

/**
* Toggle post-processing on/off
*/
toggle() {
this.enabled = !this.enabled;
console.log('Post-processing:', this.enabled ? 'ON': 'OFF');
return this.enabled;
}

/**
* Enable post-processing
*/
enable() {
this.enabled = true;
}

/**
* Disable post-processing
*/
disable() {
this.enabled = false;
}

/**
* Check if post-processing is enabled
*/
isEnabled() {
return this.enabled;
}

/**
* Get the composer for rendering
*/
getComposer() {
return this.composer;
}

/**
* Handle window resize
*/
handleResize() {
if (this.composer) {
this.composer.setSize(window.innerWidth, window.innerHeight);
// Update pixelation shader resolution and bloom pass resolution
this.composer.passes.forEach(pass => {
if (pass && pass.uniforms) {
if (pass.uniforms.resolution) {
pass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
}
}
if (pass && pass.resolution) {
pass.resolution.set(window.innerWidth, window.innerHeight);
}
});
}
}

/**
* Set pixelation intensity
* @param {number} pixelSize - Pixel size (1.0 = no pixelation, 2.0 = subtle, 4.0+ = very pixelated)
*/
setPixelation(pixelSize) {
if (this.composer) {
this.composer.passes.forEach(pass => {
if (pass && pass.uniforms && pass.uniforms.pixelSize) {
pass.uniforms.pixelSize.value = pixelSize;
}
});
}
}

/**
* Render with post-processing if enabled, otherwise return false
* @returns {boolean} true if rendered with post-processing, false if standard render needed
*/
render() {
if (this.enabled && this.composer) {
this.composer.render();
return true;
}
return false;
}
}

