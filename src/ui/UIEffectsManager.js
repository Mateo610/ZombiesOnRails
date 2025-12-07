/**
* UI Effects Manager
* Handles visual UI effects like damage numbers, headshot indicators, power-up messages, and scene titles
*/

export class UIEffectsManager {
constructor({ camera }) {
this.camera = camera;
}

/**
* Create a floating damage number at a 3D position
*/
createDamageNumber(position, damage, isHeadshot) {
const vector = position.clone();
vector.project(this.camera);

const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

// Color coding: white for normal hits, red for all headshots
let color, glowColor, fontSize;
if (isHeadshot) {
// Headshot: always red
color = '#ff0000';
glowColor = '#ff0000';
fontSize = '40px'; // Larger for headshots
} else {
// Normal hit: white
color = '#ffffff';
glowColor = '#ffffff';
fontSize = '32px';
}

const damageDiv = document.createElement('div');
damageDiv.style.cssText = `
position: fixed;
left: ${x}px;
top: ${y}px;
font-family: 'Courier New', monospace;
font-size: ${fontSize};
font-weight: bold;
color: ${color};
text-shadow: 
0 0 10px ${glowColor}, 
0 0 20px ${glowColor},
2px 2px 4px #000;
pointer-events: none;
z-index: 999;
animation: floatUp${isHeadshot ? 'Headshot': 'Normal'} 1s ease-out forwards;
transform: translate(-50%, -50%);
`;

// Add "HEADSHOT" prefix for headshots
if (isHeadshot) {
damageDiv.textContent = `HEADSHOT +${damage}`;
// Add extra glow effect for headshots
damageDiv.style.filter = `drop-shadow(0 0 8px ${glowColor})`;
} else {
damageDiv.textContent = `+${damage}`;
}

// Add animation keyframes if not already added
if (!document.getElementById('damage-animations-style')) {
const style = document.createElement('style');
style.id = 'damage-animations-style';
style.textContent = `
@keyframes floatUpNormal {
0% { 
opacity: 1; 
transform: translate(-50%, -50%) translateY(0) scale(1);
}
100% { 
opacity: 0; 
transform: translate(-50%, -50%) translateY(-50px) scale(0.8);
}
}
@keyframes floatUpHeadshot {
0% { 
opacity: 1; 
transform: translate(-50%, -50%) translateY(0) scale(1);
}
50% {
transform: translate(-50%, -50%) translateY(-25px) scale(1.1);
}
100% { 
opacity: 0; 
transform: translate(-50%, -50%) translateY(-60px) scale(0.9);
}
}
`;
document.head.appendChild(style);
}

document.body.appendChild(damageDiv);

setTimeout(() => {
damageDiv.remove();
}, 1000);
}

/**
* Show headshot indicator
*/
showHeadshotIndicator() {
const indicator = document.getElementById('headshot-indicator');
if (!indicator) return;

indicator.style.display = 'block';
indicator.style.opacity = '1';
indicator.style.transform = 'scale(1.2)';

setTimeout(() => {
indicator.style.opacity = '0';
indicator.style.transform = 'scale(1)';
setTimeout(() => {
indicator.style.display = 'none';
}, 300);
}, 500);
}

/**
* Show power-up message
*/
showPowerUpMessage(text) {
const msgEl = document.getElementById('powerup-message');
if (!msgEl) return;

msgEl.textContent = text;
msgEl.style.display = 'block';
msgEl.dataset.visible = 'true';

setTimeout(() => {
msgEl.style.opacity = '0';
setTimeout(() => {
msgEl.style.display = 'none';
msgEl.dataset.visible = 'false';
msgEl.style.opacity = '1';
}, 500);
}, 2000);
}

/**
* Show scene title
*/
showSceneTitle(gameData, CAMERA_SCENES) {
const sceneTitleEl = document.getElementById('scene-title');
if (!sceneTitleEl) return;

const currentScene = CAMERA_SCENES[gameData.currentScene];
if (!currentScene) return;

sceneTitleEl.textContent = currentScene.name.toUpperCase();
sceneTitleEl.style.display = 'block';
sceneTitleEl.style.opacity = '1';

setTimeout(() => {
sceneTitleEl.style.opacity = '0';
setTimeout(() => {
sceneTitleEl.style.display = 'none';
}, 500);
}, 2000);
}
}

