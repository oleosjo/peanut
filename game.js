import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const canvas = document.querySelector("#space");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080713, 0.0065);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 180);
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
renderer.toneMappingExposure = 1;

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

const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function loadTexture(path, colorSpace = THREE.SRGBColorSpace) {
    const texture = textureLoader.load(path);
    texture.colorSpace = colorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
}

const nebulaTexture = loadTexture("assets/cosmic-cliffs.png");
nebulaTexture.minFilter = THREE.LinearMipmapLinearFilter;
nebulaTexture.repeat.set(1, 0.66);
nebulaTexture.offset.set(0, 0.15);

const nebulaMaterial = new THREE.MeshBasicMaterial({
    map: nebulaTexture,
    color: 0x706b86,
    fog: false,
    depthWrite: false,
});
const nebula = new THREE.Mesh(new THREE.PlaneGeometry(350, 130), nebulaMaterial);
nebula.position.set(0, 0, -115);
scene.add(nebula);

function makePlanet(path, position, scale) {
    const material = new THREE.SpriteMaterial({
        map: loadTexture(path),
        transparent: true,
        opacity: 1,
        alphaTest: 0.02,
        depthWrite: false,
        fog: true,
        toneMapped: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(scale.x, scale.y, 1);
    sprite.userData.origin = position.clone();
    scene.add(sprite);
    return sprite;
}

const jupiter = makePlanet(
    "assets/jupiter.png",
    new THREE.Vector3(-17, 7.5, -58),
    new THREE.Vector2(13, 13),
);
const saturn = makePlanet(
    "assets/saturn.png",
    new THREE.Vector3(21, -8, -78),
    new THREE.Vector2(20, 13.1),
);

const starTexture = loadTexture("assets/star-disc.png");
const glowTexture = loadTexture("assets/star-glow.png");

function makeStarfield(count, spread, depth, size, opacity) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        positions[i3] = THREE.MathUtils.randFloatSpread(spread);
        positions[i3 + 1] = THREE.MathUtils.randFloatSpread(spread * 0.62);
        positions[i3 + 2] = THREE.MathUtils.randFloat(-depth, 6);

        const warmth = Math.random();
        colors[i3] = warmth > 0.78 ? 1 : 0.66;
        colors[i3 + 1] = warmth > 0.78 ? 0.73 : 0.77;
        colors[i3 + 2] = warmth > 0.78 ? 0.53 : 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size,
            sizeAttenuation: true,
            map: starTexture,
            alphaTest: 0.08,
            transparent: true,
            opacity,
            vertexColors: true,
            depthWrite: false,
        }),
    );
}

const distantStars = makeStarfield(innerWidth < 700 ? 1050 : 1800, 80, 108, 0.12, 0.75);
const nearStars = makeStarfield(innerWidth < 700 ? 180 : 320, 30, 70, 0.065, 0.62);
scene.add(distantStars, nearStars);

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
const velocity = new THREE.Vector2();
const desiredVelocity = new THREE.Vector2();
const clock = new THREE.Clock();
let driftTime = 0;
let trailAccumulator = 0;

function updatePlayer(delta) {
    const horizontal = Number(keys.has("ArrowRight") || keys.has("KeyD"))
        - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const vertical = Number(keys.has("ArrowUp") || keys.has("KeyW"))
        - Number(keys.has("ArrowDown") || keys.has("KeyS"));

    desiredVelocity.set(horizontal * 0.75, vertical * 0.62);
    velocity.x = THREE.MathUtils.damp(velocity.x, desiredVelocity.x, 1.25, delta);
    velocity.y = THREE.MathUtils.damp(velocity.y, desiredVelocity.y, 1.25, delta);

    player.position.x += velocity.x * delta;
    player.position.y += velocity.y * delta;

    const horizontalLimit = innerWidth < 700 ? 2.3 : 4.2;
    const verticalLimit = innerWidth < 700 ? 3.2 : 2.55;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -horizontalLimit, horizontalLimit);
    player.position.y = THREE.MathUtils.clamp(player.position.y, -verticalLimit, verticalLimit);

    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -velocity.x * 0.32, 1.2, delta);
    player.rotation.x = THREE.MathUtils.damp(player.rotation.x, velocity.y * 0.16, 1.2, delta);
    peanutPivot.rotation.y += delta * 0.16;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.045, 0.65, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.25 + player.position.y * 0.035, 0.65, delta);
    camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, -velocity.x * 0.012, 0.8, delta);
}

function driftStars(starfield, delta, speed, resetDepth) {
    const positions = starfield.geometry.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
        positions[i] += speed * delta;
        if (positions[i] > 7) positions[i] = -resetDepth;
    }
    starfield.geometry.attributes.position.needsUpdate = true;
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
        bloom.position.x = origin.x + Math.sin(driftTime * 0.22 + phase) * 0.16;
        bloom.position.y = origin.y + Math.cos(driftTime * 0.18 + phase) * 0.12;
        const distance = Math.hypot(
            bloom.position.x - player.position.x,
            bloom.position.y - player.position.y,
        );
        const proximity = THREE.MathUtils.clamp(1 - distance / 2.2, 0, 1);
        const pulse = 0.5 + Math.sin(driftTime * 1.25 + phase) * 0.5;
        halo.material.opacity = 0.12 + pulse * 0.08 + proximity * 0.3;
        halo.scale.setScalar(0.62 + pulse * 0.16 + proximity * 0.38);
        core.material.opacity = 0.58 + pulse * 0.22;
        light.intensity = 2 + proximity * 22;
    }
}

function resetComet(comet) {
    comet.position.set(
        THREE.MathUtils.randFloat(-16, 5),
        THREE.MathUtils.randFloat(3, 8),
        THREE.MathUtils.randFloat(-45, -25),
    );
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
    driftStars(distantStars, delta, 0.42, 108);
    driftStars(nearStars, delta, 0.8, 70);
    updateTrail(delta);
    updateBlooms();
    updateComets(delta);

    player.position.z = Math.sin(driftTime * 0.28) * 0.08;
    player.rotation.y = Math.sin(driftTime * 0.18) * 0.05;

    nebula.position.x = Math.sin(driftTime * 0.018) * 2.5 - player.position.x * 0.08;
    nebula.position.y = Math.cos(driftTime * 0.014) * 1.5 - player.position.y * 0.06;

    jupiter.position.x = jupiter.userData.origin.x - player.position.x * 0.04
        + Math.sin(driftTime * 0.025) * 0.45;
    jupiter.position.y = jupiter.userData.origin.y - player.position.y * 0.035
        + Math.cos(driftTime * 0.02) * 0.25;
    saturn.position.x = saturn.userData.origin.x - player.position.x * 0.025
        + Math.cos(driftTime * 0.018) * 0.35;
    saturn.position.y = saturn.userData.origin.y - player.position.y * 0.02
        + Math.sin(driftTime * 0.023) * 0.2;

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
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
    }
    keys.add(event.code);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());

animate();
