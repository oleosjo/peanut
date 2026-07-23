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

scene.add(new THREE.HemisphereLight(0x8d9ddd, 0x13080b, 0.75));

const keyLight = new THREE.DirectionalLight(0xffd2a1, 5.2);
keyLight.position.set(18, 12, 15);
scene.add(keyLight);

const blueLight = new THREE.PointLight(0x5f79ff, 9, 25);
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
}

function driftStars(starfield, delta, speed, resetDepth) {
    const positions = starfield.geometry.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
        positions[i] += speed * delta;
        if (positions[i] > 7) positions[i] = -resetDepth;
    }
    starfield.geometry.attributes.position.needsUpdate = true;
}

function animate() {
    const delta = Math.min(clock.getDelta(), 0.05);
    driftTime += delta;

    updatePlayer(delta);
    driftStars(distantStars, delta, 0.42, 108);
    driftStars(nearStars, delta, 0.8, 70);

    player.position.z = Math.sin(driftTime * 0.28) * 0.08;
    player.rotation.y = Math.sin(driftTime * 0.18) * 0.05;

    nebula.position.x = Math.sin(driftTime * 0.018) * 2.5 - player.position.x * 0.08;
    nebula.position.y = Math.cos(driftTime * 0.014) * 1.5 - player.position.y * 0.06;

    jupiter.position.x = jupiter.userData.origin.x - player.position.x * 0.04;
    jupiter.position.y = jupiter.userData.origin.y - player.position.y * 0.035;
    saturn.position.x = saturn.userData.origin.x - player.position.x * 0.025;
    saturn.position.y = saturn.userData.origin.y - player.position.y * 0.02;

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
