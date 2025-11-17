# Project Context: Three.js Zombie Rail Shooter Game

## Project Overview

This is a **Three.js rail shooter game** built with Vite. The game features:
- **Two scenes**: Warehouse Exterior (Scene 0) and Warehouse Interior (Scene 1)
- **GLB 3D models** for environments and zombies
- **Modular architecture** with separate files for enemies, combat, UI, power-ups, etc.
- **First-person rail shooter** gameplay where camera follows fixed positions between scenes

## Current Problem

**Visual glitch on game startup**: When the game loads, there's a noticeable visual "pop-in" or "jump" that occurs as the factory scene (warehouse exterior) loads. The scene appears abruptly, causing a jarring visual effect.

### Symptoms:
- Scene appears suddenly when factory GLB model loads
- Camera may jump or shift unexpectedly during initialization
- Visual "flash" or "pop-in" effect on first frame

## Technical Architecture

### Key Files:
- `src/main.js` - Main game orchestrator (1211 lines)
- `src/core/SceneLoader.js` - Handles GLB scene loading (170 lines)
- `src/enemies/Zombie.js` - Zombie class with GLB model loading (412 lines)
- `src/enemies/ZombieManager.js` - Manages zombie spawning/updates
- `src/combat/ShootingSystem.js` - Shooting mechanics
- `src/ui/HUD.js` - UI rendering

### Model Paths:
- Factory scene: `/models/models/scenes/factory_scene/source/scene.glb`
- Warehouse interior: `/models/models/scenes/warehouse_interior/source/scene.glb`
- Zombie models: `/models/models/zombies/zombie/source/scene.glb` and `/models/models/zombies/bloated/source/scene.glb`

### Initialization Flow (Current):
1. Scene, renderer, camera, and lights are created
2. `animate()` render loop starts immediately
3. `SceneLoader.loadFactoryScene()` is called asynchronously
4. When factory scene loads:
   - Scene is added to Three.js scene
   - Ground mesh is identified for raycasting
   - Camera position is set
   - Scene is made visible (starts hidden to prevent glitch)
   - Game starts after waiting 3 frames

## Approaches Already Tried

### 1. **Increased Lighting** ✅ (Partially working)
- Increased ambient light from 0.5 to 1.2 intensity
- Added multiple directional lights (main, fill, back)
- Fixed dark scene issue

### 2. **Camera Position Timing**
- **Attempt 1**: Set camera position in `startGame()` - caused camera jump
- **Attempt 2**: Set camera position immediately when scene loads - still glitchy
- **Attempt 3**: Check if camera at origin before setting - doesn't solve pop-in

### 3. **Scene Visibility Control**
- **Current approach**: Scene starts `visible = false` when loaded
- After 3 frames, scene is made visible and game starts
- **Problem**: Still experiencing glitch, suggesting timing issue

### 4. **Frame-Based Delays**
- Used `setTimeout()` delays (500ms, 1000ms) - didn't help
- Switched to `requestAnimationFrame()` with frame counting (3 frames)
- Still seeing glitch

## Current Code State

### SceneLoader.loadFactoryScene() (lines 21-55):
```javascript
async loadFactoryScene(scene, onComplete) {
    const gltf = await this.loader.loadAsync('/models/models/scenes/factory_scene/source/scene.glb');
    this.currentSceneModel = gltf.scene;
    this.currentSceneModel.name = 'factory_scene';
    this.currentSceneModel.visible = false; // Starts hidden
    // ... setup shadows, add to scene
    if (onComplete) onComplete(this.currentSceneModel);
}
```

### main.js Initialization (lines 1088-1213):
```javascript
sceneLoader.loadFactoryScene(scene, (factoryModel) => {
    // Find ground, set factorySceneLoaded = true
    // Set camera position immediately
    // Wait 3 frames via requestAnimationFrame
    // Then make scene visible and call startGame()
});
```

### Render Loop:
```javascript
function animate() {
    requestAnimationFrame(animate);
    // ... update game state
    renderer.render(scene, camera); // Called every frame from start
}
animate(); // Called immediately at script load
```

## Root Cause Hypothesis

The glitch likely occurs because:
1. **Render loop starts immediately** - `animate()` is called before scene loads
2. **Scene is added mid-frame** - When GLB loads, it's added to the scene during a render cycle
3. **Visibility toggle happens after frames** - Scene becomes visible after 3 frames, but renderer may have already processed it
4. **Camera positioning race condition** - Camera position may be set after render has already occurred

## Possible Solutions to Try

### Option 1: **Prevent rendering until scene is ready**
- Don't start `animate()` until factory scene is loaded
- Add a loading flag that prevents rendering
- Only start render loop after scene is fully set up and visible

### Option 2: **Use a loading screen/fade transition**
- Show a black screen or loading overlay
- Load scene fully in background
- Fade in scene smoothly using opacity/alpha
- More user-friendly but adds complexity

### Option 3: **Adjust render timing**
- Only render when `gameData.currentState !== GameState.LOADING`
- Keep scene hidden until first successful render
- Use renderer's needsUpdate flag

### Option 4: **Preload scene before starting render loop**
- Make initialization fully async
- Load factory scene first
- Then set up camera, start render loop
- Most clean solution but requires refactoring

### Option 5: **Use renderer's render target or offscreen canvas**
- Pre-render scene to offscreen canvas
- Swap when ready
- Complex but eliminates pop-in

## Additional Context

- **Lighting is working** - Scene is now bright enough
- **Zombie models loading** - GLB models load asynchronously and replace placeholders
- **Scene transitions work** - When scene 0 is cleared, transitions to scene 1 (warehouse interior)
- **Game mechanics functional** - Shooting, zombies, power-ups all work
- **Only issue is startup glitch** - Everything else appears stable

## What to Debug

1. Check browser console for timing logs
2. Monitor when `renderer.render()` is called vs when scene is added
3. Verify `factoryModel.visible` state during first few frames
4. Check if scene is being rendered before camera is positioned
5. Consider adding a loading state that prevents rendering until ready

## Key Variables to Monitor

- `factorySceneLoaded` - Flag tracking if factory scene is loaded
- `gameData.gameStarted` - Flag tracking if game has started
- `gameData.currentState` - Current game state (LOADING, GAMEPLAY, etc.)
- `factoryModel.visible` - Scene visibility flag
- `camera.position` - Camera position during initialization

