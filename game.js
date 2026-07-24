import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#space");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080713, 0.00018);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.5, 120000);
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
renderer.toneMappingExposure = 1.24;

scene.add(new THREE.HemisphereLight(0xb7c5ff, 0x241116, 1.45));

const keyLight = new THREE.DirectionalLight(0xfff1df, 5.6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8fa8ff, 1.55);
fillLight.position.set(-10, -4, 12);
scene.add(fillLight);

const player = new THREE.Group();
player.position.set(0, -0.1, 0);
scene.add(player);

const peanutLight = new THREE.PointLight(0xffd7ae, 22, 18, 2);
peanutLight.position.set(-3, 2.5, 4);
const blueLight = new THREE.PointLight(0x7790ff, 12, 16, 2);
blueLight.position.set(3, -2, 3);
player.add(peanutLight, blueLight);

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
controls.zoomToCursor = false;
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
scene.backgroundIntensity = 0.96;

const nebulaTexture = loadTexture("assets/cosmic-cliffs.png");
const distantNebula = new THREE.Mesh(
    new THREE.SphereGeometry(110000, 64, 32),
    new THREE.ShaderMaterial({
        uniforms: {
            map: { value: nebulaTexture },
            tint: { value: new THREE.Color(0xc7b7ff) },
            opacity: { value: 0.86 },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D map;
            uniform vec3 tint;
            uniform float opacity;
            varying vec2 vUv;
            void main() {
                vec2 patchCenter = vec2(0.82, 0.41);
                vec2 patchSize = vec2(0.13, 0.09);
                vec2 imageUv = (vUv - patchCenter) / patchSize + vec2(0.5);
                float inside = step(0.0, imageUv.x) * step(imageUv.x, 1.0)
                    * step(0.0, imageUv.y) * step(imageUv.y, 1.0);
                vec3 image = texture2D(map, clamp(imageUv, 0.0, 1.0)).rgb;
                float luminance = max(image.r, max(image.g, image.b));
                vec2 centered = imageUv - vec2(0.5);
                float vignette = 1.0 - smoothstep(
                    0.3,
                    0.52,
                    length(vec2(centered.x * 0.9, centered.y * 2.2))
                );
                float alpha = smoothstep(0.025, 0.16, luminance)
                    * vignette * opacity * inside;
                gl_FragColor = vec4(image * tint, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        fog: false,
    }),
);
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
    new THREE.Vector3(-1050, 400, -1800),
    260,
    -0.05,
    0.012,
);
const earth = makePlanet(
    "assets/earth-map.jpg",
    new THREE.Vector3(1350, -420, -1650),
    160,
    -0.4,
    0.018,
);
const mars = makePlanet(
    "assets/mars-map.jpg",
    new THREE.Vector3(-950, 480, 1750),
    120,
    0.16,
    0.014,
);
const neptune = makePlanet(
    "assets/neptune-map.jpg",
    new THREE.Vector3(2200, 850, -3300),
    260,
    -0.45,
    0.009,
);
const venus = makePlanet(
    "assets/venus-map.jpg",
    new THREE.Vector3(-2100, -900, 2600),
    150,
    0.08,
    -0.007,
);

const sunDistance = 95000;
const sunElevation = THREE.MathUtils.degToRad(30);
const sunAzimuth = THREE.MathUtils.degToRad(-17);
const sunPosition = new THREE.Vector3(
    Math.sin(sunAzimuth) * Math.cos(sunElevation),
    Math.sin(sunElevation),
    -Math.cos(sunAzimuth) * Math.cos(sunElevation),
).multiplyScalar(sunDistance);
const solarAngularDiameter = THREE.MathUtils.degToRad(0.533);
const sunRadius = Math.tan(solarAngularDiameter / 2) * sunDistance;
keyLight.position.copy(sunPosition);
keyLight.target = player;

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

const lunarTexture = loadTexture("assets/moon-map.jpg");
const tritonTexture = loadTexture("assets/triton-map.jpg");

function addMoon(parent, radius, distance, speed, texture, color, inclination, phase) {
    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 20),
        new THREE.MeshStandardMaterial({ map: texture, color, roughness: 1 }),
    );
    moon.userData = {
        parent,
        distance,
        speed,
        inclination,
        phase,
        rotationSpeed: THREE.MathUtils.randFloat(0.015, 0.04),
    };
    scene.add(moon);
    moons.push(moon);
}

addMoon(earth, 24, 380, 0.09, lunarTexture, 0xc7c5bf, 0.35, 0.4);
addMoon(jupiter, 7, 380, 0.055, lunarTexture, 0xd8b883, 0.18, 0);
addMoon(jupiter, 6, 500, 0.042, lunarTexture, 0xa89d88, -0.24, 2);
addMoon(jupiter, 8, 650, 0.03, lunarTexture, 0xc4b5a1, 0.3, 4);
addMoon(neptune, 12, 450, 0.025, tritonTexture, 0xd0c9bb, -0.35, 1.2);

const starTexture = loadTexture("assets/star-disc.png");
const glowTexture = loadTexture("assets/star-glow.png");

const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xfff0c7,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
    }),
);
sunGlow.position.copy(sunPosition);
sunGlow.scale.set(sunRadius * 12, sunRadius * 12, 1);
scene.add(sunGlow);

const sunCorona = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff8a36,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
    }),
);
sunCorona.position.copy(sunPosition);
sunCorona.scale.set(sunRadius * 32, sunRadius * 32, 1);
scene.add(sunCorona);

function makeStarMaterial(opacity) {
    return new THREE.ShaderMaterial({
        uniforms: {
            map: { value: starTexture },
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() },
            opacity: { value: opacity },
        },
        vertexShader: `
            attribute vec3 color;
            attribute float phase;
            attribute float pointSize;
            uniform float time;
            uniform float pixelRatio;
            varying vec3 vColor;
            varying float vPulse;
            void main() {
                vColor = color;
                vPulse = 0.985 + 0.015 * sin(time * (0.18 + phase * 0.15) + phase * 19.0);
                vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = pointSize * pixelRatio * vPulse;
            }
        `,
        fragmentShader: `
            uniform sampler2D map;
            uniform float opacity;
            varying vec3 vColor;
            varying float vPulse;
            void main() {
                vec4 sprite = texture2D(map, gl_PointCoord);
                if (sprite.a < 0.05) discard;
                gl_FragColor = vec4(vColor * vPulse, sprite.a * opacity * vPulse);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

function setStarColor(colors, index) {
    const temperature = Math.random();
    const brightness = THREE.MathUtils.randFloat(0.78, 1);
    let red;
    let green;
    let blue;
    if (temperature < 0.55) {
        red = 0.9;
        green = 0.93;
        blue = 1;
    } else if (temperature < 0.8) {
        red = 1;
        green = 0.94;
        blue = 0.84;
    } else if (temperature < 0.92) {
        red = 1;
        green = 0.76;
        blue = 0.58;
    } else {
        red = 0.72;
        green = 0.84;
        blue = 1;
    }
    colors[index] = red * brightness;
    colors[index + 1] = green * brightness;
    colors[index + 2] = blue * brightness;
}

const spaceStarCount = innerWidth < 700 ? 4500 : 9000;
const spaceStarPositions = new Float32Array(spaceStarCount * 3);
const spaceStarColors = new Float32Array(spaceStarCount * 3);
const spaceStarPhases = new Float32Array(spaceStarCount);
const spaceStarSizes = new Float32Array(spaceStarCount);
for (let i = 0; i < spaceStarCount; i += 1) {
    const i3 = i * 3;
    spaceStarPositions[i3] = THREE.MathUtils.randFloatSpread(360);
    spaceStarPositions[i3 + 1] = THREE.MathUtils.randFloatSpread(260);
    spaceStarPositions[i3 + 2] = THREE.MathUtils.randFloat(-220, 180);
    setStarColor(spaceStarColors, i3);
    spaceStarPhases[i] = Math.random();
    spaceStarSizes[i] = Math.random() < 0.035
        ? THREE.MathUtils.randFloat(1.35, 2)
        : THREE.MathUtils.randFloat(0.45, 1.05);
}

const spaceStarGeometry = new THREE.BufferGeometry();
spaceStarGeometry.setAttribute("position", new THREE.BufferAttribute(spaceStarPositions, 3));
spaceStarGeometry.setAttribute("color", new THREE.BufferAttribute(spaceStarColors, 3));
spaceStarGeometry.setAttribute("phase", new THREE.BufferAttribute(spaceStarPhases, 1));
spaceStarGeometry.setAttribute("pointSize", new THREE.BufferAttribute(spaceStarSizes, 1));
const spaceStarMaterial = makeStarMaterial(0.86);
const spaceStars = new THREE.Points(spaceStarGeometry, spaceStarMaterial);
scene.add(spaceStars);

const farStarCount = innerWidth < 700 ? 2200 : 4200;
const farStarPositions = new Float32Array(farStarCount * 3);
const farStarColors = new Float32Array(farStarCount * 3);
const farStarPhases = new Float32Array(farStarCount);
const farStarSizes = new Float32Array(farStarCount);
for (let i = 0; i < farStarCount; i += 1) {
    const i3 = i * 3;
    const radius = THREE.MathUtils.randFloat(700, 1050);
    const theta = Math.random() * Math.PI * 2;
    const cosine = THREE.MathUtils.randFloatSpread(2);
    const sine = Math.sqrt(1 - cosine * cosine);
    farStarPositions[i3] = radius * sine * Math.cos(theta);
    farStarPositions[i3 + 1] = radius * cosine;
    farStarPositions[i3 + 2] = radius * sine * Math.sin(theta);
    setStarColor(farStarColors, i3);
    farStarPhases[i] = Math.random();
    farStarSizes[i] = Math.random() < 0.025
        ? THREE.MathUtils.randFloat(1, 1.5)
        : THREE.MathUtils.randFloat(0.35, 0.82);
}
const farStarGeometry = new THREE.BufferGeometry();
farStarGeometry.setAttribute("position", new THREE.BufferAttribute(farStarPositions, 3));
farStarGeometry.setAttribute("color", new THREE.BufferAttribute(farStarColors, 3));
farStarGeometry.setAttribute("phase", new THREE.BufferAttribute(farStarPhases, 1));
farStarGeometry.setAttribute("pointSize", new THREE.BufferAttribute(farStarSizes, 1));
const farStarMaterial = makeStarMaterial(0.56);
const farStars = new THREE.Points(farStarGeometry, farStarMaterial);
scene.add(farStars);

const dustCount = innerWidth < 700 ? 900 : 1600;
const dustPositions = new Float32Array(dustCount * 3);
const dustColors = new Float32Array(dustCount * 3);
const dustSizes = new Float32Array(dustCount);

function placeDust(index) {
    const i3 = index * 3;
    const radius = THREE.MathUtils.randFloat(4, 48);
    const theta = Math.random() * Math.PI * 2;
    const cosine = THREE.MathUtils.randFloatSpread(2);
    const sine = Math.sqrt(1 - cosine * cosine);
    dustPositions[i3] = player.position.x + radius * sine * Math.cos(theta);
    dustPositions[i3 + 1] = player.position.y + radius * cosine;
    dustPositions[i3 + 2] = player.position.z + radius * sine * Math.sin(theta);
}

for (let i = 0; i < dustCount; i += 1) {
    const i3 = i * 3;
    placeDust(i);
    const warmth = Math.random();
    dustColors[i3] = 0.65 + warmth * 0.35;
    dustColors[i3 + 1] = 0.58 + warmth * 0.2;
    dustColors[i3 + 2] = 0.5 + (1 - warmth) * 0.35;
    dustSizes[i] = THREE.MathUtils.randFloat(0.5, 1.35);
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
dustGeometry.setAttribute("pointSize", new THREE.BufferAttribute(dustSizes, 1));
const dustMaterial = new THREE.ShaderMaterial({
    uniforms: {
        map: { value: starTexture },
        pixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
        attribute vec3 color;
        attribute float pointSize;
        uniform float pixelRatio;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            vColor = color;
            vOpacity = 0.2 + pointSize * 0.16;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = pointSize * pixelRatio;
        }
    `,
    fragmentShader: `
        uniform sampler2D map;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            float alpha = texture2D(map, gl_PointCoord).a * vOpacity;
            if (alpha < 0.025) discard;
            gl_FragColor = vec4(vColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
});
const dust = new THREE.Points(dustGeometry, dustMaterial);
scene.add(dust);

const asteroidCount = innerWidth < 700 ? 8 : 14;
const asteroidGeometry = new THREE.IcosahedronGeometry(1, 3);
const asteroidVertices = asteroidGeometry.attributes.position;
for (let i = 0; i < asteroidVertices.count; i += 1) {
    const x = asteroidVertices.getX(i);
    const y = asteroidVertices.getY(i);
    const z = asteroidVertices.getZ(i);
    const deformation = 1
        + Math.sin(x * 5.3 + y * 2.7) * 0.09
        + Math.sin(y * 6.1 + z * 3.4) * 0.07
        + Math.sin(z * 7.2 + x * 2.1) * 0.05;
    asteroidVertices.setXYZ(i, x * deformation, y * deformation, z * deformation);
}
asteroidGeometry.computeVertexNormals();
const asteroidTexture = loadTexture("assets/bennu-map.jpg");
asteroidTexture.repeat.set(1, 0.58);
asteroidTexture.offset.set(0, 0.21);
const asteroidMaterial = new THREE.MeshStandardMaterial({
    map: asteroidTexture,
    color: 0x9b958a,
    emissive: 0x17130f,
    emissiveIntensity: 0.4,
    roughness: 1,
    metalness: 0,
});
const asteroidMesh = new THREE.InstancedMesh(
    asteroidGeometry,
    asteroidMaterial,
    asteroidCount,
);
asteroidMesh.frustumCulled = false;
scene.add(asteroidMesh);

const asteroidDummy = new THREE.Object3D();
const asteroidData = Array.from({ length: asteroidCount }, () => ({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
    ),
    spin: new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.08, 0.08),
        THREE.MathUtils.randFloat(-0.08, 0.08),
        THREE.MathUtils.randFloat(-0.08, 0.08),
    ),
    scale: new THREE.Vector3(),
}));

function placeAsteroid(asteroid) {
    const radius = THREE.MathUtils.randFloat(35, 125);
    const theta = Math.random() * Math.PI * 2;
    const cosine = THREE.MathUtils.randFloatSpread(2);
    const sine = Math.sqrt(1 - cosine * cosine);
    asteroid.position.set(
        player.position.x + radius * sine * Math.cos(theta),
        player.position.y + radius * cosine,
        player.position.z + radius * sine * Math.sin(theta),
    );
    const scale = THREE.MathUtils.randFloat(1.4, 5.2);
    asteroid.scale.set(
        scale * THREE.MathUtils.randFloat(0.75, 1.2),
        scale * THREE.MathUtils.randFloat(0.75, 1.2),
        scale * THREE.MathUtils.randFloat(0.75, 1.2),
    );
}

asteroidData.forEach((asteroid, index) => {
    placeAsteroid(asteroid);
    asteroidDummy.position.copy(asteroid.position);
    asteroidDummy.rotation.copy(asteroid.rotation);
    asteroidDummy.scale.copy(asteroid.scale);
    asteroidDummy.updateMatrix();
    asteroidMesh.setMatrixAt(index, asteroidDummy.matrix);
});
asteroidMesh.instanceMatrix.needsUpdate = true;

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
    canvas.dataset.peanutLoaded = "true";
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

    desiredVelocity.copy(flightForward).multiplyScalar(forward * 24);
    desiredVelocity.addScaledVector(flightRight, strafe * 18.5);
    desiredVelocity.addScaledVector(flightUp, vertical * 16);

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

function updateSpaceStars() {
    spaceStarMaterial.uniforms.time.value = driftTime;
    farStarMaterial.uniforms.time.value = driftTime + 17;
    farStars.position.copy(player.position);
    farStars.rotation.y = driftTime * 0.0012;
    farStars.rotation.x = Math.sin(driftTime * 0.015) * 0.012;

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

function updateDustAndAsteroids(delta) {
    let dustChanged = false;
    for (let i = 0; i < dustCount; i += 1) {
        const i3 = i * 3;
        const dx = dustPositions[i3] - player.position.x;
        const dy = dustPositions[i3 + 1] - player.position.y;
        const dz = dustPositions[i3 + 2] - player.position.z;
        if (dx * dx + dy * dy + dz * dz > 52 * 52) {
            placeDust(i);
            dustChanged = true;
        }
    }
    if (dustChanged) dustGeometry.attributes.position.needsUpdate = true;

    asteroidData.forEach((asteroid, index) => {
        if (asteroid.position.distanceToSquared(player.position) > 175 * 175) {
            placeAsteroid(asteroid);
        }
        asteroid.rotation.x += asteroid.spin.x * delta;
        asteroid.rotation.y += asteroid.spin.y * delta;
        asteroid.rotation.z += asteroid.spin.z * delta;
        asteroidDummy.position.copy(asteroid.position);
        asteroidDummy.rotation.copy(asteroid.rotation);
        asteroidDummy.scale.copy(asteroid.scale);
        asteroidDummy.updateMatrix();
        asteroidMesh.setMatrixAt(index, asteroidDummy.matrix);
    });
    asteroidMesh.instanceMatrix.needsUpdate = true;
}

function updatePlanets(delta) {
    for (const planet of planets) {
        planet.rotation.y += planet.userData.rotationSpeed * delta;
    }
    for (const moon of moons) {
        const { parent, distance, speed, inclination, phase, rotationSpeed } = moon.userData;
        const angle = driftTime * speed + phase;
        moon.position.set(
            parent.position.x + Math.cos(angle) * distance,
            parent.position.y + Math.sin(angle) * distance * inclination,
            parent.position.z + Math.sin(angle) * distance,
        );
        moon.rotation.y += rotationSpeed * delta;
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
    updateSpaceStars();
    updateDustAndAsteroids(delta);
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
    spaceStarMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio();
    farStarMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio();
    dustMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio();
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
