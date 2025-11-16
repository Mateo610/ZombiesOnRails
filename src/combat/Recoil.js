import { MathUtils } from 'three';

// Per-weapon recoil configuration
const RECOIL_CONFIG = {
    pistol:   { kick: 0.02, fovKick: 2,  recovery: 12 },
    shotgun:  { kick: 0.05, fovKick: 5,  recovery: 10 },
    rifle:    { kick: 0.015, fovKick: 3, recovery: 18 }
};

let recoilAngleX = 0;
let recoilFovOffset = 0;
let recoilRecoverySpeed = RECOIL_CONFIG.pistol.recovery;
let lastRecoilAppliedX = 0;

export function setRecoilWeapon(weaponId) {
    const cfg = RECOIL_CONFIG[weaponId];
    if (!cfg) return;
    recoilRecoverySpeed = cfg.recovery;
}

export function applyWeaponRecoil(weaponId) {
    const cfg = RECOIL_CONFIG[weaponId] || RECOIL_CONFIG.pistol;
    // Store positive "kick up"; applied as negative rotation.x later
    recoilAngleX += cfg.kick;
    recoilFovOffset = Math.min(recoilFovOffset + cfg.fovKick, cfg.fovKick);
    recoilRecoverySpeed = cfg.recovery;
}

export function updateRecoil(deltaTime, camera, baseFov) {
    if (recoilAngleX === 0 && recoilFovOffset === 0) return;

    const decay = Math.exp(-recoilRecoverySpeed * deltaTime);
    recoilAngleX *= decay;
    recoilFovOffset *= decay;

    if (Math.abs(recoilAngleX) < 1e-4) recoilAngleX = 0;
    if (Math.abs(recoilFovOffset) < 1e-2) recoilFovOffset = 0;

    const deltaRecoil = recoilAngleX - lastRecoilAppliedX;
    camera.rotation.x -= deltaRecoil;
    lastRecoilAppliedX = recoilAngleX;

    const targetFov = baseFov - recoilFovOffset;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
    }
}


