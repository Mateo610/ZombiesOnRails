# Ammo Pickup Implementation Plan

## Overview
Implement weapon-specific ammo pickups that can be shot by the player to add reserve ammo to the corresponding weapon. Each weapon type (pistol, shotgun, rifle) will have its own pickup model (temporary test cubes until models are available).

## Requirements
- **3 Different Pickup Types**: One for each weapon (pistol, shotgun, rifle)
- **Ammo Values**:
  - Pistol: +8 reserve ammo
  - Shotgun: +5 reserve ammo
  - Rifle: +10 reserve ammo
- **Interaction**: Player shoots the pickup to collect it
- **Visual**: Use test cubes (different colors) until models are ready
- **Integration**: Must work with existing shooting system and ammo management

## Architecture

### 1. New Files to Create

#### `src/pickups/AmmoPickup.js`
- Similar structure to `PowerUp.js` but specialized for ammo
- Properties:
  - `weaponType`: 'pistol' | 'shotgun' | 'rifle'
  - `ammoAmount`: amount to add to reserve (8, 5, or 10)
  - Visual representation (test cube with weapon-specific color)
  - `userData.isAmmoPickup = true` for raycasting
  - `userData.weaponType` for identification
  - Bobbing/rotation animation (similar to PowerUp)

#### `src/systems/AmmoPickupManager.js`
- Manages spawning, updating, and cleanup of ammo pickups
- Similar to `PowerUpManager.js`
- Methods:
  - `spawnAmmoPickup(position, weaponType)`
  - `spawnSceneAmmoPickups(sceneIndex)` - spawn pickups for a scene
  - `update(deltaTime)` - update all active pickups
  - `clear()` - remove all pickups
  - `getAmmoPickups()` - return array for raycasting
  - `handleAmmoPickupCollected(weaponType, ammoAmount)` - add ammo to weapon

### 2. Files to Modify

#### `src/core/SceneConfig.js`
- Add `AMMO_PICKUP_SPAWN_POSITIONS` constant
- Structure: `{ sceneIndex: [{ x, y, z, weaponType }, ...] }`
- Similar to existing `POWERUP_SPAWN_POSITIONS`

#### `src/combat/ShootingSystem.js`
- Add ammo pickup detection in `shoot()` function
- After lock hit check, before power-up check:
  ```javascript
  // Ammo pickup hit
  if (hitObject.userData.isAmmoPickup) {
      const pickupInstance = hitObject.userData.ammoPickup;
      if (pickupInstance && !pickupInstance.collected) {
          pickupInstance.collect();
      }
      if (updateUIFn) updateUIFn();
      return;
  }
  ```
- Add ammo pickup meshes to raycaster targets:
  ```javascript
  const ammoPickups = ammoPickupManagerRef ? ammoPickupManagerRef.getAmmoPickups() : [];
  const ammoPickupGroups = ammoPickups.map(p => p.group);
  // Add to intersects array
  ```

#### `src/main.js`
- Import and initialize `AmmoPickupManager`
- Pass `ammoPickupManager` reference to `initShootingSystem()`
- Call `ammoPickupManager.update(deltaTime)` in render loop
- Call `ammoPickupManager.spawnSceneAmmoPickups(sceneIndex)` when entering new scene
- Call `ammoPickupManager.clear()` when leaving scene or restarting

#### `src/weapons/WeaponManager.js` (if needed)
- Add method `addReserveAmmo(weaponId, amount)` to safely add ammo
- Ensure it respects max reserve limits

#### `src/ui/HUD.js` (optional)
- Add visual feedback when ammo pickup is collected
- Show message like "PISTOL AMMO +8" or similar

## Implementation Details

### AmmoPickup Class Structure

```javascript
class AmmoPickup {
    constructor(position, weaponType, scene, onCollect) {
        this.weaponType = weaponType; // 'pistol' | 'shotgun' | 'rifle'
        this.ammoAmount = AMMO_PICKUP_VALUES[weaponType]; // 8, 5, or 10
        this.scene = scene;
        this.onCollect = onCollect;
        this.collected = false;
        
        // Create test cube (temporary until models are ready)
        this.group = new THREE.Group();
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshStandardMaterial({
                color: AMMO_PICKUP_COLORS[weaponType],
                emissive: AMMO_PICKUP_COLORS[weaponType],
                emissiveIntensity: 1.2
            })
        );
        
        // Mark for raycasting
        this.mesh.userData.isAmmoPickup = true;
        this.mesh.userData.weaponType = weaponType;
        this.mesh.userData.ammoPickup = this;
        
        // Animation properties (bobbing, rotation)
        // Similar to PowerUp
    }
    
    collect() {
        // Trigger onCollect callback
        // Fade out animation
        // Remove from scene
    }
    
    update(deltaTime) {
        // Bobbing animation
        // Rotation animation
    }
}
```

### AmmoPickupManager Class Structure

```javascript
class AmmoPickupManager {
    constructor(scene, camera, gameData, weaponManager, updateUIFn) {
        this.scene = scene;
        this.camera = camera;
        this.gameData = gameData;
        this.weaponManager = weaponManager;
        this.updateUI = updateUIFn;
        this.ammoPickups = [];
    }
    
    spawnAmmoPickup(position, weaponType) {
        const pickup = new AmmoPickup(
            position,
            weaponType,
            this.scene,
            (weaponType) => this.handleAmmoPickupCollected(weaponType)
        );
        this.ammoPickups.push(pickup);
    }
    
    handleAmmoPickupCollected(weaponType) {
        const weapon = this.weaponManager.weapons[weaponType];
        if (!weapon) return;
        
        const ammoAmount = AMMO_PICKUP_VALUES[weaponType];
        weapon.reserveAmmo += ammoAmount;
        
        // Also update gameData if needed (check how ammo sync works)
        // May need to sync gameData.reserveAmmo with weaponManager
        
        this.updateUI();
    }
    
    update(deltaTime) {
        this.ammoPickups.forEach(p => {
            p.update(deltaTime, this.camera);
            p.updateFade(deltaTime);
        });
    }
    
    clear() {
        this.ammoPickups.forEach(p => p._dispose && p._dispose());
        this.ammoPickups.length = 0;
    }
    
    getAmmoPickups() {
        return this.ammoPickups.filter(p => !p.collected);
    }
}
```

### Constants

```javascript
// In AmmoPickup.js or a config file
const AMMO_PICKUP_VALUES = {
    pistol: 8,
    shotgun: 5,
    rifle: 10
};

const AMMO_PICKUP_COLORS = {
    pistol: 0xffff00,    // Yellow
    shotgun: 0xff8800,   // Orange
    rifle: 0x00ff00      // Green
};
```

## Integration Points

### 1. Scene Spawning
- Add ammo pickup spawn positions to `SceneConfig.js`
- Call `ammoPickupManager.spawnSceneAmmoPickups(sceneIndex)` when scene loads
- Similar to how `powerUpManager.spawnScenePowerUps()` works

### 2. Shooting System Integration
- Add ammo pickup meshes to raycaster target list
- Check for `userData.isAmmoPickup` in hit detection
- Call `collect()` method when hit

### 3. Ammo Management
- Need to determine if ammo is managed in `gameData` or `WeaponManager`
- Based on code review, both exist - need to sync them
- When pickup is collected, update both:
  - `weaponManager.weapons[weaponType].reserveAmmo += amount`
  - `gameData.reserveAmmo` (if current weapon matches)

### 4. UI Updates
- Call `updateUI()` after collecting pickup
- Optional: Show collection message (similar to power-up messages)

## Testing Plan

1. **Visual Test**: Spawn test cubes in scene, verify they appear with correct colors
2. **Shooting Test**: Shoot pickups, verify they disappear and ammo increases
3. **Ammo Test**: Verify correct amount added to correct weapon
4. **Multi-Weapon Test**: Switch weapons, verify pickups only affect their weapon type
5. **Scene Transition Test**: Verify pickups are cleared when leaving scene
6. **Edge Cases**:
   - Pickup at max ammo (should still work, may cap at max)
   - Multiple pickups of same type
   - Switching weapons after collecting pickup

## Future Enhancements

1. **Replace Test Cubes**: When models are ready, replace test cubes with actual models
2. **Sound Effects**: Add pickup sound when collected
3. **Visual Effects**: Enhanced collection effect (particles, glow)
4. **Spawn Logic**: Smart spawning (don't spawn if player already has max ammo)
5. **Rarity System**: Different spawn rates for different weapon types

## Notes

- **Ammo Sync**: Need to investigate how `gameData.reserveAmmo` and `WeaponManager.weapons[].reserveAmmo` are kept in sync
- **Current Weapon**: When adding ammo, should it only add to current weapon or any weapon?
  - **Decision**: Add to the weapon type of the pickup (not current weapon)
- **Max Ammo Cap**: Should check if adding ammo would exceed max reserve, cap if needed
- **Model Integration**: When models are ready, update `AmmoPickup.js` to load GLTF instead of creating test cube

## File Structure

```
src/
├── pickups/
│   └── AmmoPickup.js          (NEW)
├── systems/
│   └── AmmoPickupManager.js    (NEW)
├── core/
│   └── SceneConfig.js         (MODIFY - add spawn positions)
├── combat/
│   └── ShootingSystem.js      (MODIFY - add pickup detection)
└── main.js                     (MODIFY - initialize manager)
```

## Implementation Order

1. Create `AmmoPickup.js` with test cube visuals
2. Create `AmmoPickupManager.js` with basic spawning/management
3. Add spawn positions to `SceneConfig.js`
4. Integrate into `main.js` (initialize, update loop, scene spawning)
5. Modify `ShootingSystem.js` to detect and collect pickups
6. Test and debug
7. Add UI feedback (optional)
8. Replace test cubes with models when available

