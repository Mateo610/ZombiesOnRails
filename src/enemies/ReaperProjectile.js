import * as THREE from 'three';

/**
* Reaper Projectile
* Lightning bolt projectile that can be shot out of the air
*/
export class ReaperProjectile {
constructor(startPosition, targetPosition, scene) {
this.scene = scene;
this.speed = 3.0; // Projectile speed (slower for better gameplay)
this.damage = 30;
this.isDestroyed = false;

// Calculate direction
this.direction = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
this.position = startPosition.clone();

// Create lightning bolt visual with outline
this.group = new THREE.Group();
this._createLightningBolt();

// Add to scene
this.scene.add(this.group);
}

_createLightningBolt() {
// Main lightning bolt (bright core) - smaller size
const coreGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8);
const coreMaterial = new THREE.MeshStandardMaterial({
color: 0x00ffff,
emissive: 0x00ffff,
emissiveIntensity: 2.0,
transparent: true,
opacity: 0.9
});
this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
this.coreMesh.rotation.z = Math.PI / 2; // Rotate to horizontal
this.group.add(this.coreMesh);

// Outline effect (slightly larger, darker) - smaller size
const outlineGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8);
const outlineMaterial = new THREE.MeshStandardMaterial({
color: 0x0000ff,
emissive: 0x0000ff,
emissiveIntensity: 1.0,
transparent: true,
opacity: 0.6,
side: THREE.BackSide // Render on back faces for outline
});
this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
this.outlineMesh.rotation.z = Math.PI / 2;
this.group.add(this.outlineMesh);

// Glow particles - smaller size
for (let i = 0; i < 5; i++) {
const particleGeometry = new THREE.SphereGeometry(0.015, 8, 8);
const particleMaterial = new THREE.MeshStandardMaterial({
color: 0x00ffff,
emissive: 0x00ffff,
emissiveIntensity: 3.0,
transparent: true,
opacity: 0.8
});
const particle = new THREE.Mesh(particleGeometry, particleMaterial);
particle.position.y = (i / 5 - 0.5) * 0.8; // Distribute along bolt
particle.position.x = (Math.random() - 0.5) * 0.1;
particle.position.z = (Math.random() - 0.5) * 0.1;
this.group.add(particle);
}

// Mark for raycasting
this.coreMesh.userData.isReaperProjectile = true;
this.coreMesh.userData.projectile = this;
this.outlineMesh.userData.isReaperProjectile = true;
this.outlineMesh.userData.projectile = this;

// Set initial position and rotation
this.group.position.copy(this.position);
this.group.lookAt(this.position.clone().add(this.direction));
}

update(deltaTime) {
if (this.isDestroyed) return;

// Move projectile
const moveDistance = this.speed * deltaTime;
this.position.addScaledVector(this.direction, moveDistance);
this.group.position.copy(this.position);

// Rotate to face direction
this.group.lookAt(this.position.clone().add(this.direction));

// Animate glow
const time = Date.now() * 0.01;
this.coreMesh.material.emissiveIntensity = 2.0 + Math.sin(time) * 0.5;
this.outlineMesh.material.emissiveIntensity = 1.0 + Math.sin(time * 1.5) * 0.3;
}

destroy() {
if (this.isDestroyed) return;

this.isDestroyed = true;

// Remove from scene
if (this.group.parent) {
this.scene.remove(this.group);
}

// Dispose resources
if (this.coreMesh) {
this.coreMesh.geometry.dispose();
this.coreMesh.material.dispose();
}
if (this.outlineMesh) {
this.outlineMesh.geometry.dispose();
this.outlineMesh.material.dispose();
}

// Dispose particles
this.group.traverse((child) => {
if (child.isMesh) {
if (child.geometry) child.geometry.dispose();
if (child.material) child.material.dispose();
}
});
}

/**
* Check if projectile hit the player
* @param {THREE.Vector3} playerPosition 
* @param {number} hitRadius 
* @returns {boolean}
*/
checkHit(playerPosition, hitRadius = 0.5) {
const distance = this.position.distanceTo(playerPosition);
return distance < hitRadius;
}
}

