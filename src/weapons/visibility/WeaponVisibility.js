/**
 * WeaponVisibility
 * Handles showing/hiding weapon models
 */
export class WeaponVisibility {
    constructor(weaponModels, weaponGroup) {
        this.weaponModels = weaponModels;
        this.weaponGroup = weaponGroup;
    }

    /**
     * Hide all weapons
     */
    hideAll() {
        Object.values(this.weaponModels).forEach(weapon => {
            if (weapon) {
                weapon.visible = false;
                this.hideMeshes(weapon);
            }
        });
    }

    /**
     * Show a specific weapon
     * @param {string} weaponId - Weapon identifier
     * @param {THREE.Object3D} weaponModel - The weapon model to show
     */
    show(weaponId, weaponModel) {
        if (!weaponModel) return;

        weaponModel.visible = true;
        this.showMeshes(weaponModel);
    }

    /**
     * Hide all meshes in a model
     * @param {THREE.Object3D} model - The model to hide meshes in
     */
    hideMeshes(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.visible = false;
            }
        });
    }

    /**
     * Show all meshes in a model and configure materials
     * @param {THREE.Object3D} model - The model to show meshes in
     */
    showMeshes(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        if (mat) {
                            mat.needsUpdate = true;
                            mat.transparent = false;
                            if (mat.opacity !== undefined) mat.opacity = 1;
                        }
                    });
                }
            }
        });
    }

    /**
     * Show weapon group (call when game starts)
     */
    showWeaponGroup() {
        if (this.weaponGroup) {
            this.weaponGroup.visible = true;
        }
    }

    /**
     * Hide weapon group
     */
    hideWeaponGroup() {
        if (this.weaponGroup) {
            this.weaponGroup.visible = false;
        }
    }
}

