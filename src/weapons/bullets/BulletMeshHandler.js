/**
 * BulletMeshHandler
 * Handles detection and management of bullet meshes in weapon models
 */
export class BulletMeshHandler {
    /**
     * Detect bullet meshes in a weapon model
     * @param {THREE.Object3D} model - The weapon model
     * @param {string} weaponId - Weapon identifier
     * @returns {Array<THREE.Mesh>} Array of bullet meshes found
     */
    detectBulletMeshes(model, weaponId) {
        if (weaponId !== 'pistol') return [];

        const bulletMeshes = [];

        model.traverse((child) => {
            if (child.isMesh && this.isBulletMesh(child)) {
                bulletMeshes.push(child);
            }
        });

        return bulletMeshes;
    }

    /**
     * Check if a mesh is a bullet mesh
     * @param {THREE.Mesh} mesh - The mesh to check
     * @returns {boolean} True if the mesh appears to be a bullet
     */
    isBulletMesh(mesh) {
        const name = mesh.name.toLowerCase();
        const parentName = mesh.parent?.name || '';
        const parentNameLower = parentName.toLowerCase();

        return (
            name.includes('bullet') || 
            name.includes('ammo') || 
            name.includes('round') || 
            name.includes('cartridge') || 
            name.includes('shell') ||
            name.includes('projectile') || 
            name.includes('slug') || 
            name.includes('pellet') ||
            parentNameLower.includes('pistola') || // Bullets under "pistola" parent
            (name.includes('círculo') && (name.match(/_?\d+$/) || name.match(/_?\d+_/))) // Numbered circles
        );
    }

    /**
     * Remove bullet meshes from a model
     * @param {THREE.Object3D} model - The weapon model
     */
    removeBullets(model) {
        if (!model.userData.bulletMeshes) return;

        model.userData.bulletMeshes.forEach(bulletMesh => {
            bulletMesh.visible = false;
            if (bulletMesh.parent) {
                bulletMesh.parent.remove(bulletMesh);
            }
        });
    }

    /**
     * Update bullet visibility based on ammo count
     * @param {THREE.Object3D} model - The weapon model
     * @param {number} currentAmmo - Current ammo count
     * @param {number} maxAmmo - Maximum ammo in clip
     */
    updateBulletVisibility(model, currentAmmo, maxAmmo) {
        if (!model.userData.bulletMeshes) return;

        const bulletMeshes = model.userData.bulletMeshes;
        const bulletsToShow = Math.floor((currentAmmo / maxAmmo) * bulletMeshes.length);

        bulletMeshes.forEach((bulletMesh, index) => {
            bulletMesh.visible = index < bulletsToShow;
        });
    }

    /**
     * Test function to inspect model for bullet meshes
     * @param {THREE.Object3D} model - The weapon model
     */
    testBulletMeshes(model) {
        if (!model) {
            console.error('❌ Model not provided');
            return;
        }

        // Store found bullets
        const bulletMeshes = [];
        model.traverse((child) => {
            if (child.isMesh && this.isBulletMesh(child)) {
                bulletMeshes.push(child);
            }
        });
        
        if (bulletMeshes.length > 0) {
            model.userData.bulletMeshes = bulletMeshes;
        }
    }
}

