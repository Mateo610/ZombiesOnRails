# Refactoring TODO List

## Overview
This document tracks the refactoring of `main.js` into modular manager classes.

## Completed ✅
- [x] Created `SceneTransitionManager.js` - Handles scene transitions
- [x] Created `UIEffectsManager.js` - Handles UI visual effects
- [x] Created `CameraEffectsManager.js` - Handles camera effects
- [x] Created `GameFlowManager.js` - Handles game flow functions
- [x] Created `SceneSetupManager.js` - Handles scene setup logic
- [x] Added imports for new managers in `main.js`

## In Progress 🔄
- [ ] **Area 1: UI Effects Integration** - Replace UI effect functions with UIEffectsManager
- [ ] **Area 2: Camera Effects Integration** - Replace camera effect functions with CameraEffectsManager
- [ ] **Area 3: Scene Setup Integration** - Replace scene setup functions with SceneSetupManager
- [ ] **Area 4: Game Flow Integration** - Replace game flow functions with GameFlowManager
- [ ] **Area 5: Scene Transition Integration** - Replace scene transition functions with SceneTransitionManager

## Area 1: UI Effects Integration

### Tasks
- [ ] Initialize `UIEffectsManager` after camera is available
- [ ] Replace `createDamageNumber()` calls with `uiEffectsManager.createDamageNumber()`
- [ ] Replace `showHeadshotIndicator()` calls with `uiEffectsManager.showHeadshotIndicator()`
- [ ] Replace `showPowerUpMessage()` calls with `uiEffectsManager.showPowerUpMessage()`
- [ ] Replace `showSceneTitle()` calls with `uiEffectsManager.showSceneTitle()`
- [ ] Remove old function definitions:
  - [ ] `createDamageNumber()` function
  - [ ] `showHeadshotIndicator()` function
  - [ ] `showPowerUpMessage()` function
  - [ ] `showSceneTitle()` function
- [ ] Update ShootingSystem to use UIEffectsManager
- [ ] Test damage numbers appear correctly
- [ ] Test headshot indicators work
- [ ] Test power-up messages display
- [ ] Test scene titles show correctly

### Files to Modify
- `src/main.js` - Remove old functions, add manager initialization
- `src/combat/ShootingSystem.js` - Update to use UIEffectsManager

---

## Area 2: Camera Effects Integration

### Tasks
- [ ] Initialize `CameraEffectsManager` after camera is available
- [ ] Replace `updateScreenShake()` calls with `cameraEffectsManager.updateScreenShake()`
- [ ] Replace `updateCameraBreathing()` calls with `cameraEffectsManager.updateCameraBreathing()`
- [ ] Replace `screenShakeIntensity` variable with manager method
- [ ] Replace `triggerScreenShake()` calls with `cameraEffectsManager.triggerShake()`
- [ ] Remove old function definitions:
  - [ ] `updateScreenShake()` function
  - [ ] `updateCameraBreathing()` function
- [ ] Update render loop to use CameraEffectsManager
- [ ] Test screen shake works on weapon fire
- [ ] Test camera breathing animation works
- [ ] Test effects don't interfere with rail movement

### Files to Modify
- `src/main.js` - Remove old functions, add manager initialization
- `src/core/RenderManager.js` - Update render callbacks if needed

---

## Area 3: Scene Setup Integration

### Tasks
- [ ] Initialize `SceneSetupManager` after sceneLoader is available
- [ ] Replace `setupWarehouseVisibility()` calls with `sceneSetupManager.setupWarehouseVisibility()`
- [ ] Replace `loadWarehouseInterior()` calls with `sceneSetupManager.loadWarehouseInterior()`
- [ ] Replace `spawnSceneZombies()` calls with `sceneSetupManager.spawnSceneZombies()`
- [ ] Replace `warehouseLoaded` variable with `sceneSetupManager.isWarehouseLoaded()`
- [ ] Remove old function definitions:
  - [ ] `setupWarehouseVisibility()` function
  - [ ] `loadWarehouseInterior()` function
  - [ ] `spawnSceneZombies()` function
- [ ] Update SceneTransitionManager to use SceneSetupManager
- [ ] Test warehouse loads correctly
- [ ] Test warehouse visibility switches correctly
- [ ] Test zombies spawn correctly per scene
- [ ] Test floor setup works in interior

### Files to Modify
- `src/main.js` - Remove old functions, add manager initialization
- `src/systems/SceneTransitionManager.js` - Update to use SceneSetupManager

---

## Area 4: Game Flow Integration

### Tasks
- [ ] Initialize `GameFlowManager` after all dependencies are available
- [ ] Replace `startGame()` calls with `gameFlowManager.startGame()`
- [ ] Replace `restartGame()` calls with `gameFlowManager.restartGame()`
- [ ] Replace `gameOver()` calls with `gameFlowManager.gameOver()`
- [ ] Replace `completeMission()` calls with `gameFlowManager.completeMission()`
- [ ] Replace `startMusicOnInteraction()` calls with `gameFlowManager.startMusicOnInteraction()`
- [ ] Remove old function definitions:
  - [ ] `startGame()` function
  - [ ] `restartGame()` function
  - [ ] `gameOver()` function
  - [ ] `completeMission()` function
  - [ ] `startMusicOnInteraction()` function
- [ ] Update PlayerManager callback to use GameFlowManager
- [ ] Update keyboard handlers to use GameFlowManager
- [ ] Test game starts correctly
- [ ] Test game restarts correctly
- [ ] Test game over screen appears
- [ ] Test mission complete screen appears
- [ ] Test music starts on interaction

### Files to Modify
- `src/main.js` - Remove old functions, add manager initialization
- `src/systems/PlayerManager.js` - Update callback if needed

---

## Area 5: Scene Transition Integration

### Tasks
- [ ] Initialize `SceneTransitionManager` after all dependencies are available
- [ ] Replace `fadeToBlackAndJumpToInterior()` calls with `sceneTransitionManager.fadeToBlackAndJumpToInterior()`
- [ ] Replace `jumpToInteriorScene()` calls with `sceneTransitionManager.jumpToInteriorScene()`
- [ ] Replace `onSceneCleared()` calls with `sceneTransitionManager.onSceneCleared()`
- [ ] Replace `advanceToNextSceneWithRail()` calls with `sceneTransitionManager.advanceToNextSceneWithRail()`
- [ ] Replace `stopRailMovement()` calls with `sceneTransitionManager.stopRailMovement()`
- [ ] Replace `startRailMovement()` to use SceneTransitionManager
- [ ] Replace rail movement path completion callback setup
- [ ] Replace `isRailMovementActive` and `wasRailMovementActive` variables with manager methods
- [ ] Remove old function definitions:
  - [ ] `fadeToBlackAndJumpToInterior()` function
  - [ ] `jumpToInteriorScene()` function
  - [ ] `onSceneCleared()` function
  - [ ] `advanceToNextSceneWithRail()` function
  - [ ] `stopRailMovement()` function
  - [ ] `startRailMovement()` function
  - [ ] `enableFreeLookAfterRailMovement()` function (or move to appropriate manager)
- [ ] Update SceneTransitionManager to properly integrate with SceneSetupManager
- [ ] Test fade-to-black transition works
- [ ] Test interior jump works correctly
- [ ] Test rail movement transitions work
- [ ] Test scene clearing triggers correct transitions
- [ ] Test boss music switches at final location

### Files to Modify
- `src/main.js` - Remove old functions, add manager initialization
- `src/systems/SceneTransitionManager.js` - May need updates for integration

---

## Final Cleanup

### Tasks
- [ ] Remove all unused function definitions
- [ ] Remove all unused variables
- [ ] Clean up imports (remove unused)
- [ ] Organize manager initialization in logical order
- [ ] Add JSDoc comments to manager initialization
- [ ] Verify all managers are properly initialized before use
- [ ] Test full game flow from start to finish
- [ ] Test all scene transitions
- [ ] Test all UI effects
- [ ] Test all camera effects
- [ ] Verify no console errors
- [ ] Check for any circular dependencies
- [ ] Update any remaining references to old functions

---

## Notes
- Managers should be initialized in dependency order
- Some managers depend on others (e.g., SceneTransitionManager needs SceneSetupManager)
- Keep backward compatibility during transition
- Test each area thoroughly before moving to next

