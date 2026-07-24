import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#space");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080713, 0.0065);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 0.25, 8);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

scene.add(new THREE.HemisphereLight(0xb7c5ff, 0x241116, 1.55));

const keyLight = new THREE.DirectionalLight(0xffd2a1, 3.8);
keyLight.position.set(18, 12, 15);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8fa8ff, 2.1);
fillLight.position.set(-10, -4, 12);
scene.add(fillLight);

const blueLight = new THREE.PointLight(0x5f79ff, 16, 28);
blueLight.position.set(5, -3, 4);
scene.add(blueLight);

const player = new THREE.Group();
player.position.set(0, -0.1, 0);
scene.add(player);

const peanutPivot = new THREE.Group();
player.add(peanutPivot);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(player.position);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 4.5;
controls.maxDistance = 18;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;
controls.zoomToCursor = true;
controls.mouseButtons.LEFT = -1;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.update();

const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function loadTexture(path, colorSpace = THREE.SRGBColorSpace) {
    const texture = textureLoader.load(path);
    texture.colorSpace = colorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
}

const skyTexture = loadTexture("assets/star-map-360.jpg");
skyTexture.mapping = THREE.EquirectangularReflectionMapping;
skyTexture.minFilter = THREE.LinearMipmapLinearFilter;
scene.background = skyTexture;
scene.backgroundIntensity = 0.82;

const nebulaTexture = loadTexture("assets/cosmic-cliffs.png");
nebulaTexture.repeat.set(1, 0.66);
nebulaTexture.offset.set(0, 0.15);
const distantNebula = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: 0x8b7daf,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
    }),
);
distantNebula.position.set(-95, 45, -165);
distantNebula.scale.set(95, 35, 1);
scene.add(distantNebula);

const planetGeometry = new THREE.SphereGeometry(1, 64, 32);
const planets = [];
const moons = [];

function makePlanet(path, position, radius, tilt, rotationSpeed) {
    const material = new THREE.MeshStandardMaterial({
        map: loadTexture(path),
        roughness: 0.92,
        metalness: 0,
    });
    const planet = new THREE.Mesh(planetGeometry, material);
    planet.position.copy(position);
    planet.scale.setScalar(radius);
    planet.rotation.z = tilt;
    planet.userData.rotationSpeed = rotationSpeed;
    scene.add(planet);
    planets.push(planet);
    return planet;
}

const jupiter = makePlanet(
    "assets/jupiter-map.jpg",
    new THREE.Vector3(-21, 8, -36),
    5.2,
    -0.05,
    0.012,
);
const earth = makePlanet(
    "assets/earth-map.jpg",
    new THREE.Vector3(25, -7, -30),
    3.2,
    -0.4,
    0.018,
);
const mars = makePlanet(
    "assets/mars-map.jpg",
    new THREE.Vector3(-18, 9, 31),
    3.5,
    0.16,
    0.014,
);
const neptune = makePlanet(
    "assets/neptune-map.jpg",
    new THREE.Vector3(85, 32, -135),
    6.5,
    -0.45,
    0.009,
);
const venus = makePlanet(
    "assets/venus-map.jpg",
    new THREE.Vector3(-100, -42, 105),
    5.5,
    0.08,
    -0.007,
);

function addAtmosphere(planet, color, opacity, scale = 1.035) {
    const atmosphere = new THREE.Mesh(
        planetGeometry,
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        }),
    );
    atmosphere.scale.setScalar(scale);
    planet.add(atmosphere);
}

addAtmosphere(earth, 0x6fa9ff, 0.1);
addAtmosphere(neptune, 0x4f75ff, 0.08, 1.045);
addAtmosphere(venus, 0xffa64d, 0.07, 1.025);

function addMoon(parent, radius, distance, speed, color, inclination, phase) {
    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    moon.userData = { parent, distance, speed, inclination, phase };
    scene.add(moon);
    moons.push(moon);
}

addMoon(earth, 0.55, 5.1, 0.09, 0xb8b5ad, 0.35, 0.4);
addMoon(jupiter, 0.42, 7.2, 0.055, 0xd9c7a0, 0.18, 0);
addMoon(jupiter, 0.34, 8.6, 0.042, 0xb5a990, -0.24, 2);
addMoon(jupiter, 0.5, 10.2, 0.03, 0xc2b7a5, 0.3, 4);
addMoon(neptune, 0.7, 9.4, 0.025, 0xb6a894, -0.35, 1.2);

const starTexture = loadTexture("assets/star-disc.png");
const glowTexture = loadTexture("assets/star-glow.png");

const spaceStarCount = innerWidth < 700 ? 3000 : 5600;
const spaceStarPositions = new Float32Array(spaceStarCount * 3);
const spaceStarColors = new Float32Array(spaceStarCount * 3);
for (let i = 0; i < spaceStarCount; i += 1) {
    const i3 = i * 3;
    spaceStarPositions[i3] = THREE.MathUtils.randFloatSpread(360);
    spaceStarPositions[i3 + 1] = THREE.MathUtils.randFloatSpread(260);
    spaceStarPositions[i3 + 2] = THREE.MathUtils.randFloat(-220, 180);
    const warmth = Math.random();
    spaceStarColors[i3] = warmth > 0.84 ? 1 : 0.68;
    spaceStarColors[i3 + 1] = warmth > 0.84 ? 0.75 : 0.79;
    spaceStarColors[i3 + 2] = warmth > 0.84 ? 0.58 : 1;
}

const spaceStarGeometry = new THREE.BufferGeometry();
spaceStarGeometry.setAttribute("position", new THREE.BufferAttribute(spaceStarPositions, 3));
spaceStarGeometry.setAttribute("color", new THREE.BufferAttribute(spaceStarColors, 3));
const spaceStars = new THREE.Points(
    spaceStarGeometry,
    new THREE.PointsMaterial({
        size: 1.5,
        sizeAttenuation: false,
        map: starTexture,
        alphaTest: 0.08,
        transparent: true,
        opacity: 0.88,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }),
);
scene.add(spaceStars);

const trailCount = 64;
const trailPositions = new Float32Array(trailCount * 3);
const trailColors = new Float32Array(trailCount * 3);
for (let i = 0; i < trailCount; i += 1) {
    const i3 = i * 3;
    trailPositions[i3] = 1000;
    trailPositions[i3 + 1] = 1000;
    trailPositions[i3 + 2] = 0;
    const fade = (1 - i / trailCount) ** 2;
    trailColors[i3] = fade;
    trailColors[i3 + 1] = fade * 0.48;
    trailColors[i3 + 2] = fade * 0.16;
}

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
const trail = new THREE.Points(
    trailGeometry,
    new THREE.PointsMaterial({
        size: 0.12,
        sizeAttenuation: true,
        map: starTexture,
        transparent: true,
        opacity: 0.7,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }),
);
scene.add(trail);

const bloomColors = [0xffb56f, 0x8fb8ff, 0xd6a0ff, 0x81ffe1];
const bloomOrigins = [
    new THREE.Vector3(-3.45, 1.85, -1.8),
    new THREE.Vector3(3.5, 1.7, -2.2),
    new THREE.Vector3(-2.9, -2.05, -2),
    new THREE.Vector3(3.3, -1.9, -1.7),
];
const blooms = bloomOrigins.map((origin, index) => {
    const group = new THREE.Group();
    const haloMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: bloomColors[index],
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.setScalar(0.8);
    const core = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: starTexture,
            color: bloomColors[index],
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
    );
    core.scale.setScalar(0.1);
    const light = new THREE.PointLight(bloomColors[index], 3, 7, 2);
    group.add(halo, core, light);
    group.position.copy(origin);
    group.userData = { origin, halo, core, light, phase: index * 1.7 };
    scene.add(group);
    return group;
});

function makeComet(delay) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, -3.2, 0.8, -0.3], 3),
    );
    const material = new THREE.LineBasicMaterial({
        color: 0xb9ccff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geometry, material);
    line.position.set(
        THREE.MathUtils.randFloat(-16, 5),
        THREE.MathUtils.randFloat(3, 8),
        THREE.MathUtils.randFloat(-45, -25),
    );
    line.userData = { delay, age: 0, duration: 5.5 };
    scene.add(line);
    return line;
}

const comets = [makeComet(2.5), makeComet(10)];

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/");

const modelLoader = new GLTFLoader();
modelLoader.setDRACOLoader(dracoLoader);
modelLoader.load("peanut.glb", ({ scene: model }) => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.55 / Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    model.scale.setScalar(scale);
    peanutPivot.add(model);
    peanutPivot.rotation.set(0.15, -0.25, -0.3);
});

const keys = new Set();
const velocity = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
const flightForward = new THREE.Vector3();
const flightRight = new THREE.Vector3();
const flightUp = new THREE.Vector3();
const clock = new THREE.Clock();
const lastPlayerPosition = player.position.clone();
const playerDelta = new THREE.Vector3();
const peanutSpinVelocity = new THREE.Vector2();
let driftTime = 0;
let trailAccumulator = 0;
let peanutDragging = false;
let peanutPointerId = null;
let previousPointerX = 0;
let previousPointerY = 0;

function updatePlayer(delta) {
    const strafe = Number(keys.has("ArrowRight") || keys.has("KeyD"))
        - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const forward = Number(keys.has("ArrowUp") || keys.has("KeyW"))
        - Number(keys.has("ArrowDown") || keys.has("KeyS"));
    const vertical = Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));

    camera.updateMatrixWorld();
    camera.getWorldDirection(flightForward).normalize();
    flightRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    flightUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    desiredVelocity.copy(flightForward).multiplyScalar(0.12 + forward * 1.35);
    desiredVelocity.addScaledVector(flightRight, strafe * 1.05);
    desiredVelocity.addScaledVector(flightUp, vertical * 0.9);

    velocity.x = THREE.MathUtils.damp(velocity.x, desiredVelocity.x, 1.4, delta);
    velocity.y = THREE.MathUtils.damp(velocity.y, desiredVelocity.y, 1.4, delta);
    velocity.z = THREE.MathUtils.damp(velocity.z, desiredVelocity.z, 1.4, delta);
    player.position.addScaledVector(velocity, delta);

    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -strafe * 0.28, 1.2, delta);
    player.rotation.x = THREE.MathUtils.damp(
        player.rotation.x,
        forward * 0.08 + vertical * 0.16,
        1.2,
        delta,
    );

    if (!peanutDragging) {
        peanutPivot.rotation.x += peanutSpinVelocity.x * delta;
        peanutPivot.rotation.y += (0.16 + peanutSpinVelocity.y) * delta;
        peanutSpinVelocity.x = THREE.MathUtils.damp(peanutSpinVelocity.x, 0, 2.4, delta);
        peanutSpinVelocity.y = THREE.MathUtils.damp(peanutSpinVelocity.y, 0, 2.4, delta);
    }
}

function updateTrail(delta) {
    if (velocity.lengthSq() < 0.002) return;
    trailAccumulator += delta;
    if (trailAccumulator < 0.035) return;
    trailAccumulator = 0;

    for (let i = trailPositions.length - 1; i >= 3; i -= 1) {
        trailPositions[i] = trailPositions[i - 3];
    }
    trailPositions[0] = player.position.x;
    trailPositions[1] = player.position.y;
    trailPositions[2] = player.position.z + 0.1;
    trailGeometry.attributes.position.needsUpdate = true;
}

function updateBlooms() {
    for (const bloom of blooms) {
        const { origin, halo, core, light, phase } = bloom.userData;
        if (origin.distanceTo(player.position) > 18) {
            origin.set(
                THREE.MathUtils.randFloatSpread(2),
                THREE.MathUtils.randFloatSpread(2),
                THREE.MathUtils.randFloatSpread(2),
            ).normalize().multiplyScalar(THREE.MathUtils.randFloat(6, 11)).add(player.position);
        }
        bloom.position.x = origin.x + Math.sin(driftTime * 0.22 + phase) * 0.16;
        bloom.position.y = origin.y + Math.cos(driftTime * 0.18 + phase) * 0.12;
        bloom.position.z = origin.z + Math.sin(driftTime * 0.16 + phase) * 0.1;
        const distance = bloom.position.distanceTo(player.position);
        const proximity = THREE.MathUtils.clamp(1 - distance / 2.2, 0, 1);
        const pulse = 0.5 + Math.sin(driftTime * 1.25 + phase) * 0.5;
        halo.material.opacity = 0.12 + pulse * 0.08 + proximity * 0.3;
        halo.scale.setScalar(0.62 + pulse * 0.16 + proximity * 0.38);
        core.material.opacity = 0.58 + pulse * 0.22;
        light.intensity = 2 + proximity * 22;
    }
}

function updateSpaceStars() {
    let changed = false;
    for (let i = 0; i < spaceStarCount; i += 1) {
        const i3 = i * 3;
        const dx = spaceStarPositions[i3] - player.position.x;
        const dy = spaceStarPositions[i3 + 1] - player.position.y;
        const dz = spaceStarPositions[i3 + 2] - player.position.z;
        if (dx * dx + dy * dy + dz * dz > 240 * 240) {
            const radius = THREE.MathUtils.randFloat(170, 225);
            const theta = Math.random() * Math.PI * 2;
            const cosine = THREE.MathUtils.randFloatSpread(2);
            const sine = Math.sqrt(1 - cosine * cosine);
            spaceStarPositions[i3] = player.position.x + radius * sine * Math.cos(theta);
            spaceStarPositions[i3 + 1] = player.position.y + radius * cosine;
            spaceStarPositions[i3 + 2] = player.position.z + radius * sine * Math.sin(theta);
            changed = true;
        }
    }
    if (changed) spaceStarGeometry.attributes.position.needsUpdate = true;
}

function updatePlanets(delta) {
    for (const planet of planets) {
        planet.rotation.y += planet.userData.rotationSpeed * delta;
    }
    for (const moon of moons) {
        const { parent, distance, speed, inclination, phase } = moon.userData;
        const angle = driftTime * speed + phase;
        moon.position.set(
            parent.position.x + Math.cos(angle) * distance,
            parent.position.y + Math.sin(angle) * distance * inclination,
            parent.position.z + Math.sin(angle) * distance,
        );
    }
}

function resetComet(comet) {
    camera.updateMatrixWorld();
    camera.getWorldDirection(flightForward).normalize();
    flightRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    flightUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    comet.position.copy(player.position)
        .addScaledVector(flightForward, THREE.MathUtils.randFloat(25, 45))
        .addScaledVector(flightRight, THREE.MathUtils.randFloatSpread(20))
        .addScaledVector(flightUp, THREE.MathUtils.randFloat(3, 10));
    comet.userData.age = 0;
    comet.userData.delay = THREE.MathUtils.randFloat(9, 20);
}

function updateComets(delta) {
    for (const comet of comets) {
        if (comet.userData.delay > 0) {
            comet.userData.delay -= delta;
            continue;
        }
        comet.userData.age += delta;
        const progress = comet.userData.age / comet.userData.duration;
        comet.position.x += delta * 2.25;
        comet.position.y -= delta * 0.56;
        comet.material.opacity = Math.sin(Math.min(progress, 1) * Math.PI) * 0.36;
        if (progress >= 1) resetComet(comet);
    }
}

function animate() {
    const delta = Math.min(clock.getDelta(), 0.05);
    driftTime += delta;

    updatePlayer(delta);
    peanutPivot.position.y = Math.sin(driftTime * 0.28) * 0.04;
    player.rotation.y = Math.sin(driftTime * 0.18) * 0.05;

    updateTrail(delta);
    updateBlooms();
    updateSpaceStars();
    updatePlanets(delta);
    updateComets(delta);

    playerDelta.copy(player.position).sub(lastPlayerPosition);
    camera.position.add(playerDelta);
    controls.target.add(playerDelta);
    lastPlayerPosition.copy(player.position);
    controls.update();

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
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    event.preventDefault();
    peanutDragging = true;
    peanutPointerId = event.pointerId;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    peanutSpinVelocity.set(0, 0);
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
});
canvas.addEventListener("pointermove", (event) => {
    if (!peanutDragging || event.pointerId !== peanutPointerId) return;
    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;

    peanutPivot.rotation.y += deltaX * 0.008;
    peanutPivot.rotation.x = THREE.MathUtils.clamp(
        peanutPivot.rotation.x + deltaY * 0.006,
        -1.25,
        1.25,
    );
    peanutSpinVelocity.set(deltaY * 0.09, deltaX * 0.12);
});
canvas.addEventListener("pointerup", (event) => {
    if (event.pointerId !== peanutPointerId) return;
    peanutDragging = false;
    peanutPointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
    canvas.classList.remove("is-dragging");
});
canvas.addEventListener("pointercancel", () => {
    peanutDragging = false;
    peanutPointerId = null;
    canvas.classList.remove("is-dragging");
});
window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
    }
    keys.add(event.code);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());

animate();
