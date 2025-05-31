const clock = new THREE.Clock();

const DEFAULT_SETTINGS = {
    ambientIntensity: 0.4,
    directionalIntensity: 0.75,
    backgroundColor: 0x303030,
    cameraPosition: {
        x: 0,
        y: 1.5,
        z: 1.8
    }
};

let container, camera, scene, renderer, controls;
let ambientLight, directionalLight;
let isInitialized = false;

function initializeScene() {
    if (isInitialized) return;

    container = document.getElementById('container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(
        DEFAULT_SETTINGS.cameraPosition.x,
        DEFAULT_SETTINGS.cameraPosition.y,
        DEFAULT_SETTINGS.cameraPosition.z
    );

    ambientLight = new THREE.AmbientLight(0xffffff, DEFAULT_SETTINGS.ambientIntensity);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, DEFAULT_SETTINGS.directionalIntensity);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.GridHelper(10, 10));
    scene.add(new THREE.AxesHelper(5));

    window.addEventListener('resize', onWindowResize);

    animate();
    updateLightControlsUI();

    isInitialized = true;
}

function addVrmToScene(vrm) {
    scene.add(vrm.scene);
}

function resetCamera() {
    camera.position.set(
        DEFAULT_SETTINGS.cameraPosition.x,
        DEFAULT_SETTINGS.cameraPosition.y,
        DEFAULT_SETTINGS.cameraPosition.z
    );
    controls.target.set(0, 1, 0);
    controls.update();
}

function updateAmbientLight(event) {
    const intensity = parseFloat(event.target.value);
    ambientLight.intensity = intensity;
}

function updateDirectionalLight(event) {
    const intensity = parseFloat(event.target.value);
    directionalLight.intensity = intensity;
}

function updateBackgroundColor(event) {
    const color = event.target.value;
    scene.background = new THREE.Color(color);
}

function resetLights() {
    ambientLight.intensity = DEFAULT_SETTINGS.ambientIntensity;
    directionalLight.intensity = DEFAULT_SETTINGS.directionalIntensity;
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);
    updateLightControlsUI();
}

function updateLightControlsUI() {
    document.getElementById('ambient-light').value = ambientLight.intensity;
    document.getElementById('directional-light').value = directionalLight.intensity;
    document.getElementById('background-color').value = '#' +
        new THREE.Color(scene.background).getHexString();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (window.currentVrm) {
        const deltaTime = clock.getDelta();

        if (typeof window.currentVrm.update === 'function') {
            window.currentVrm.update(deltaTime);
        }

        if (window.currentVrm.expressionManager && typeof window.currentVrm.expressionManager.update === 'function') {
            window.currentVrm.expressionManager.update(deltaTime);
        }

        if (window.currentVrm.blendShapeProxy && typeof window.currentVrm.blendShapeProxy.update === 'function') {
            window.currentVrm.blendShapeProxy.update();
        }
    }

    renderer.render(scene, camera);
}

function getCurrentVrm() {
    return window.currentVrm;
}
