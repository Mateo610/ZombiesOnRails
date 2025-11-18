# TODO / Development Notes

## Weapon Model Issues

### Pistol Bullet Meshes
- **Issue**: All meshes in the pistol model are being detected as potential bullets, which is incorrect
- **Current Detection**: The detection code is too broad and flags all circular meshes as bullets
- **Actual Bullets**: Based on mesh analysis, likely bullets are:
  - `Círculo095`, `Círculo095_1`, `Círculo095_2` (under "pistola" parent) - Items 4, 5, 6
  - These appear to be the bullets visible on top of the gun
- **Status**: Need to refine detection logic or manually identify specific bullet meshes
- **Options**:
  1. Manually target specific mesh names (Círculo095, Círculo095_1, Círculo095_2)
  2. Improve detection to only catch meshes under "pistola" parent with numbered variants
  3. Remove bullets if they're cosmetic only
  4. Animate bullets to disappear as you shoot (if they can be properly identified)

## Spawn Points

### Player Spawn
- **Position**: `{ x: 16.44, y: -0.00, z: -1.37 }`
- **Description**: Main player spawn point

### Zombie Spawn Points

1. **Left side back of brick building**
   - Position: `{ x: 6.75, y: 0.00, z: 10.49 }`

2. **Right side alley spawn**
   - Position: `{ x: 7.10, y: -0.00, z: -2.24 }`

3. **Courtyard**
   - Position: `{ x: 1.17, y: 0.08, z: 6.70 }`

4. **Across from courtyard**
   - Position: `{ x: -7.70, y: 2.49, z: -1.03 }`

5. **Behind white building across from interior warehouse entrance**
   - Position: `{ x: -1.54, y: 0.01, z: 13.93 }`

6. **Door to warehouse interior**
   - Position: `{ x: -8.80, y: 0.16, z: 13.18 }`

7. **Catwalk (balcony in front of spawn)**
   - Position: `{ x: 7.12, y: 4.26, z: 1.25 }`

## Lock Placement

### Warehouse Interior Door Lock
- **Position**: `{ x: -8.80, y: 0.16, z: 13.18 }`
- **Description**: Where to put lock on the warehouse interior door
- **Note**: Same position as "Door to warehouse interior" spawn point

## Camera Positions for Shooting

### Task: Find Camera Positions
- **Goal**: Use orbit controls to find camera positions that allow the player to shoot at zombies from different angles
- **Method**: Use `mainorbit.js` with orbit controls enabled to explore and find optimal camera positions
- **Requirements**:
  - Camera should be positioned to have good line of sight to zombie spawn points
  - Camera should allow player to aim and shoot effectively
  - Multiple camera positions may be needed for different scenes/sequences
- **Status**: Pending - Need to use orbit controls to explore and document camera positions

## Notes

- All spawn positions are in world coordinates
- Y values vary (some at ground level 0.00, some elevated like catwalk at 4.26)
- Camera positions need to be determined through exploration with orbit controls
- Consider creating a camera position system similar to `SceneConfig.js` for shooting sequences

