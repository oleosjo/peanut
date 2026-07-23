import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const canvas = document.querySelector("#space");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const finalScoreElement = document.querySelector("#final-score");
const speedBar = document.querySelector("#speed-bar");
const intro = document.querySelector("#intro");
const gameOverPanel = document.querySelector("#game-over");
const startButton = document.querySelector("#start");
const startLabel = document.querySelector("#start-label");
const restartButton = document.querySelector("#restart");
const hint = document.querySelector("#hint");
const flash = document.querySelector("#flash");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050d, 0.019);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 160);
camera.position.set(0, 0.35, 8);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight(0xb8c9ff, 0x160804, 1.5));
const keyLight = new THREE.DirectionalLight(0xffd2a0, 5);
keyLight.position.set(-4, 5, 7);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x4b64ff, 12, 22);
rimLight.position.set(5, -2, 3);
scene.add(rimLight);

const player = new THREE.Group();
player.position.set(2.7, -0.2, 0);
scene.add(player);

const peanutPivot = new THREE.Group();
player.add(peanutPivot);

const trailLight = new THREE.PointLight(0xff5b2b, 4, 8);
trailLight.position.z = 1.6;
player.add(trailLight);

const asteroidGeometry = new THREE.IcosahedronGeometry(1, 2);
const asteroidMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x50463e, roughness: 0.94, metalness: 0.05, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x302e35, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x675044, roughness: 0.9, flatShading: true }),
];

const asteroids = Array.from({ length: 17 }, (_, index) => {
    const mesh = new THREE.Mesh(asteroidGeometry, asteroidMaterials[index % asteroidMaterials.length]);
    mesh.userData.spin = new THREE.Vector3();
    mesh.userData.radius = 1;
    scene.add(mesh);
    return mesh;
});

function makeStarfield() {
    const count = innerWidth < 700 ? 700 : 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        positions[i3] = THREE.MathUtils.randFloatSpread(55);
        positions[i3 + 1] = THREE.MathUtils.randFloatSpread(34);
        positions[i3 + 2] = THREE.MathUtils.randFloat(-120, 8);
        const warm = Math.random() > 0.78;
        colors[i3] = warm ? 1 : 0.65;
        colors[i3 + 1] = warm ? 0.66 : 0.75;
        colors[i3 + 2] = warm ? 0.45 : 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 0.095,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        vertexColors: true,
    });
    return new THREE.Points(geometry, material);
}

const stars = makeStarfield();
scene.add(stars);

const dustGeometry = new THREE.BufferGeometry();
const dustPositions = new Float32Array(75 * 3);
for (let i = 0; i < 75; i += 1) {
    dustPositions[i * 3] = THREE.MathUtils.randFloatSpread(12);
    dustPositions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(8);
    dustPositions[i * 3 + 2] = THREE.MathUtils.randFloat(-55, 6);
}
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ color: 0xffd4a3, size: 0.055, transparent: true, opacity: 0.65 }),
);
scene.add(dust);

const keys = new Set();
const target = new THREE.Vector2(player.position.x, player.position.y);
const clock = new THREE.Clock();
let state = "loading";
let elapsed = 0;
let speed = 15;
let distance = 0;
let playerRadius = 0.52;
let introDrift = 0;

let best = 0;
try {
    best = Number(localStorage.getItem("peanut-space-best")) || 0;
} catch {
    // Storage can be unavailable in privacy-restricted browsers.
}
bestElement.textContent = formatScore(best);

function formatScore(value) {
    return Math.floor(value).toString().padStart(4, "0");
}

function createFallbackPeanut() {
    const fallback = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xb87532, roughness: 0.92 });
    const lobeGeometry = new THREE.SphereGeometry(0.62, 24, 16);
    const top = new THREE.Mesh(lobeGeometry, material);
    const bottom = new THREE.Mesh(lobeGeometry, material);
    top.position.y = 0.43;
    bottom.position.y = -0.43;
    top.scale.set(0.82, 1, 0.72);
    bottom.scale.set(0.82, 1, 0.72);
    top.rotation.z = 0.18;
    bottom.rotation.z = -0.18;
    fallback.add(top, bottom);
    return fallback;
}

function preparePeanut(model) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.8 / Math.max(size.x, size.y, size.z);
    model.position.sub(center);
    model.scale.setScalar(scale);
    peanutPivot.add(model);
    peanutPivot.rotation.set(0.1, -0.1, -0.2);
    playerRadius = 0.57;
    state = "ready";
    startButton.disabled = false;
    startLabel.textContent = "LAUNCH PEANUT";
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/");
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load(
    "peanut.glb",
    ({ scene: model }) => preparePeanut(model),
    undefined,
    () => preparePeanut(createFallbackPeanut()),
);

function resetAsteroid(asteroid, index, initial = false) {
    const angle = Math.random() * Math.PI * 2;
    const radius = THREE.MathUtils.randFloat(1.9, 7.4);
    asteroid.position.x = Math.cos(angle) * radius;
    asteroid.position.y = Math.sin(angle) * radius * 0.68;
    asteroid.position.z = initial
        ? -12 - index * 6.2 - Math.random() * 5
        : -92 - Math.random() * 28;

    const asteroidScale = THREE.MathUtils.randFloat(0.38, 1.45);
    asteroid.scale.set(
        asteroidScale * THREE.MathUtils.randFloat(0.8, 1.18),
        asteroidScale * THREE.MathUtils.randFloat(0.8, 1.2),
        asteroidScale * THREE.MathUtils.randFloat(0.78, 1.15),
    );
    asteroid.userData.radius = asteroidScale * 0.72;
    asteroid.userData.spin.set(
        THREE.MathUtils.randFloat(-0.75, 0.75),
        THREE.MathUtils.randFloat(-0.75, 0.75),
        THREE.MathUtils.randFloat(-0.4, 0.4),
    );
}

function resetGame() {
    elapsed = 0;
    distance = 0;
    speed = 15;
    target.set(0, -0.2);
    player.position.set(0, -0.2, 0);
    player.rotation.set(0, 0, 0);
    asteroids.forEach((asteroid, index) => resetAsteroid(asteroid, index, true));
    scoreElement.textContent = "0000";
    speedBar.style.width = "12%";
}

function startGame() {
    resetGame();
    state = "playing";
    intro.classList.add("panel--hidden");
    gameOverPanel.classList.add("panel--hidden");
    hint.classList.add("hint--visible");
    setTimeout(() => hint.classList.remove("hint--visible"), 2600);
}

function endGame() {
    state = "gameover";
    best = Math.max(best, Math.floor(distance));
    bestElement.textContent = formatScore(best);
    finalScoreElement.textContent = `${Math.floor(distance)} km`;
    try {
        localStorage.setItem("peanut-space-best", String(best));
    } catch {
        // The score still works for this session if storage is blocked.
    }
    flash.classList.remove("flash--active");
    void flash.offsetWidth;
    flash.classList.add("flash--active");
    setTimeout(() => gameOverPanel.classList.remove("panel--hidden"), 420);
}

function updatePlayer(delta) {
    const horizontal = Number(keys.has("ArrowRight") || keys.has("KeyD"))
        - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const vertical = Number(keys.has("ArrowUp") || keys.has("KeyW"))
        - Number(keys.has("ArrowDown") || keys.has("KeyS"));

    target.x += horizontal * delta * 5.3;
    target.y += vertical * delta * 4.4;
    target.x = THREE.MathUtils.clamp(target.x, -4.6, 4.6);
    target.y = THREE.MathUtils.clamp(target.y, -2.8, 3.1);

    player.position.x = THREE.MathUtils.damp(player.position.x, target.x, 9, delta);
    player.position.y = THREE.MathUtils.damp(player.position.y, target.y, 9, delta);
    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -horizontal * 0.42, 8, delta);
    player.rotation.x = THREE.MathUtils.damp(player.rotation.x, vertical * 0.18, 8, delta);
    peanutPivot.rotation.y += delta * 0.7;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.09, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.35 + player.position.y * 0.06, 3, delta);
}

function updateField(delta, fieldSpeed) {
    const starPositions = stars.geometry.attributes.position.array;
    for (let i = 2; i < starPositions.length; i += 3) {
        starPositions[i] += fieldSpeed * delta;
        if (starPositions[i] > 8) starPositions[i] = -120;
    }
    stars.geometry.attributes.position.needsUpdate = true;

    const streakPositions = dust.geometry.attributes.position.array;
    for (let i = 2; i < streakPositions.length; i += 3) {
        streakPositions[i] += fieldSpeed * delta * 1.2;
        if (streakPositions[i] > 7) streakPositions[i] = -55;
    }
    dust.geometry.attributes.position.needsUpdate = true;
}

function updateAsteroids(delta) {
    for (const asteroid of asteroids) {
        asteroid.position.z += speed * delta;
        asteroid.rotation.x += asteroid.userData.spin.x * delta;
        asteroid.rotation.y += asteroid.userData.spin.y * delta;
        asteroid.rotation.z += asteroid.userData.spin.z * delta;

        const dx = asteroid.position.x - player.position.x;
        const dy = asteroid.position.y - player.position.y;
        const dz = asteroid.position.z - player.position.z;
        const collisionRadius = asteroid.userData.radius + playerRadius;
        if ((dx * dx + dy * dy + dz * dz) < collisionRadius * collisionRadius) {
            endGame();
            return;
        }
        if (asteroid.position.z > 10) resetAsteroid(asteroid, 0);
    }
}

function animate() {
    const delta = Math.min(clock.getDelta(), 0.05);

    if (state === "playing") {
        elapsed += delta;
        speed = Math.min(34, 15 + elapsed * 0.38);
        distance += speed * delta * 0.46;
        scoreElement.textContent = formatScore(distance);
        speedBar.style.width = `${12 + ((speed - 15) / 19) * 88}%`;
        updatePlayer(delta);
        updateAsteroids(delta);
        updateField(delta, speed);
    } else {
        introDrift += delta;
        peanutPivot.rotation.y += delta * 0.35;
        player.position.y += Math.sin(introDrift * 1.3) * delta * 0.06;
        updateField(delta, state === "gameover" ? 1.2 : 2.6);
        for (const asteroid of asteroids) {
            asteroid.rotation.x += asteroid.userData.spin.x * delta * 0.2;
            asteroid.rotation.y += asteroid.userData.spin.y * delta * 0.2;
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}

window.addEventListener("resize", onResize);
window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
    }
    keys.add(event.code);
    if ((event.code === "Space" || event.code === "Enter") && (state === "ready" || state === "gameover")) {
        startGame();
    }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

asteroids.forEach((asteroid, index) => resetAsteroid(asteroid, index, true));
animate();
