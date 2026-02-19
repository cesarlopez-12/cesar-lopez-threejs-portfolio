import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const manager = new THREE.LoadingManager();

// Configuración de sonidos con Howler.js
const sounds = {
    backgroundMusic: new Howl({
    src: ["./music/pokemon.ogg"], 
    loop: true,
    volume: 0.3,
    preload: true,
    }),

    chestOpen: new Howl({
    src: ["./music/projects.ogg"], 
    volume: 0.6,
    preload: true,
    }),

    animalJump: new Howl({
    src: ["./music/music_pokemon.ogg"], 
    volume: 0.7,
    preload: true,
    }),
    
    playerJump: new Howl({
    src: ["./music/jumpsfx.ogg"], 
    volume: 0.8,
    preload: true,
    }),

    enterClick: new Howl({
    src: ["./music/projects.ogg"], 
    volume: 0.7,
    preload: true,
    }),

    themeSwitch: new Howl({
    src: ["./music/projects.ogg"], 
    volume: 0.6
    }),

    audioClick: new Howl({
    src: ["./music/projects.ogg"], 
    volume: 0.7,
    preload: true,
    }),
};

enterButton.addEventListener("click", () => {
    sounds.enterClick.play();

    if (!sounds.backgroundMusic.playing()) {
    sounds.backgroundMusic.play();
    }

  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 1,
    onComplete: () => {
      loadingScreen.remove();
    }
  });

});

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const Pointer = new THREE.Vector2();
let intersectObjects = [];

const centeredAnimals = {};
const animalsToFix = [];
const animalNames = ['pikachu', 'chick', 'llama', 'duck', 'lapras', 'tortoise', 'cat'];


const GRAVITY = 25;
const CAPSULE_RADIUS = 2;
const CAPSULE_HEIGHT = 1.55;
const JUMP_HEIGHT = 10;
const MOVE_SPEED = 3;

const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);

const themeToggle = document.getElementById("themeToggle");
let isNight = false;

const audioToggle = document.getElementById("audioToggle");
let audioEnabled = true;

audioToggle.addEventListener("click", () => {
    sounds.audioClick.stop();
    sounds.audioClick.play();

    audioEnabled = !audioEnabled;
    audioToggle.classList.toggle("muted");
    Howler.mute(!audioEnabled);
});

themeToggle.addEventListener("click", () => {
    sounds.themeSwitch.stop();
    sounds.themeSwitch.play();

    themeToggle.classList.toggle("active");
    isNight = !isNight; 

    if (isNight) {
        switchToNight();
    } else {
        switchToDay();
    }
});

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;
let originalCharacterPosition = new THREE.Vector3();
let characterMesh = null;
let characterContainer = new THREE.Group();
scene.add(characterContainer);

let character = {
    instance: null,
    isMoving: false
    // moveDistance: 5,
    // jumpHeight: 4,
    // moveDuration: 0.3, Duración del movimiento en segundos
    // moveDistance: 0.2,
    // moveDuration: 0.4,
    // jumpHeight: 0.5,
    // speed: 0.4, unidades por segundo
    // isMoving: false
};

let targetRotation = 0;
const cameraOffset = new THREE.Vector3(30, 20, 30); // distancia de la cámara

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

const loader = new GLTFLoader(manager);

manager.onLoad = function () {
  loadingText.style.display = "none";
  enterButton.style.opacity = "1";
};

enterButton.addEventListener("click", () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 1,
    onComplete: () => {
      loadingScreen.remove();
    }
  });
});

loader.load('./public/ProyectoWeb.glb', function (gltf) {

    scene.add(gltf.scene);

    gltf.scene.traverse(child => {

        if (child.name === 'character') {
            characterMesh = child;
            playerCollider.start.copy(child.position).add(new THREE.Vector3(0, -CAPSULE_RADIUS / 2, 0));
            playerCollider.end.copy(child.position).add(new THREE.Vector3(0, -CAPSULE_HEIGHT / 2, 0));
        }

        if (child.name === "collider") {
        colliderOctree.fromGraphNode(child);
        child.visible = false;
        }

        if (child.isMesh) {
            intersectObjects.push(child);
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.metalness = 0;
        }

        const root = getRootObject(child);

        if (root && animalNames.includes(root.name)) {
            if (!animalsToFix.includes(root)) {
                animalsToFix.push(root);
            }
        }
    });

    animalsToFix.forEach(animal => {

        const container = new THREE.Group();
        scene.add(container);
        const box = new THREE.Box3().setFromObject(animal);
        const center = new THREE.Vector3();
        box.getCenter(center);

        animal.position.sub(center);
        container.add(animal);

        container.position.copy(center);
        centeredAnimals[animal.name] = container;
    });

    setupCharacter();

}, undefined, function (error) {
    console.error(error);
});


// Te muestra los objetos y sus padres
/*
loader.load('./public/ProyectoWeb.glb', function (gltf) {
    scene.add(gltf.scene);

    gltf.scene.traverse(child => {
        console.log('OBJ:', child.name, 'PARENT:', child.parent?.name);
    });

    gltf.scene.traverse(child => {
        if (child.isMesh) {
            console.log('OBJ:', child.name, 'PARENT:', child.parent?.name);
            intersectObjects.push(child);
        }
    });
});
*/

const light = new THREE.AmbientLight(0x404040, 4); // soft white light
scene.add(light);
const sun = new THREE.DirectionalLight(0xFFFFFF, 2);
sun.castShadow = true;
sun.position.set(-120, 100, 0);
scene.add(sun.target);

sun.target.position.set(0, 0, 0);
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.left = -330;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 0.2;
sun.shadow.camera.far = 300;
sun.shadow.normalBias = 1;

const moonLight = new THREE.DirectionalLight(0x6cb3ff, 0);
moonLight.position.set(50, 80, -20);
scene.add(moonLight);

scene.add(sun);

const helper = new THREE.DirectionalLightHelper(sun, 5);
// scene.add(helper);

const camera = new THREE.OrthographicCamera(
    -50 * (sizes.width / sizes.height),
    50 * (sizes.width / sizes.height),
    50,
    -50,
    0.1,
    1000
);

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', onWindowResize);

const canvas = document.querySelector('#experience-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.75;

const modalContent = {
    'project': {
        title: 'Hola y bienvenido.👋',
        content: `Te presento mi mundo virtual, donde muestro mis primeros pasos en el gran mundo de Three.js. <br> Si quieres conocer más sobre mis futuros proyectos, por favor visita mi portafolio o mi GitHub: cesarlopez-12.`,
    },
    'project001': {
        title: 'Créditos',
        content: `Este proyecto está inspirado en el trabajo de Bruno Simon y el curso de la academia
                
                <strong> Three.js Journey</strong>.
                <br><br>

                <img 
                src="./images/CreativeWebDev.webp" 
                alt="Créditos" 
                class="modal-image"
                 />

                <br>
                
                 <a href="https://n9.cl/vm10y" target="_blank">
                    https://www.youtube.com/
                </a>`
    },
    'project002': {
        title: 'Tecnologías usadas',
        content: `<ul class="tech-list">
                <li><strong>Blender</strong> – Modelado 3D y exportación GLB</li>
                <li><strong>Three.js</strong> – Renderizado e interacción 3D</li>
                <li><strong>JavaScript</strong> – Lógica e interactividad</li>
                <li><strong>HTML y CSS</strong> – Estructura y estilos</li>
                </ul>`,
    },
    'coffee_chest': {
        title: ` Sobre mí 🧑‍💻 `,
        content: `Mi nombre es César Eduardo López Gómez, tengo 21 años y soy estudiante de 
                    Ingeniería en Tecnologías de la Información e Innovación, con 
                    TSU en Entornos Virtuales y Negocios Digitales, en la Universidad 
                    Tecnológica de León.
                    <br><br>
                    Me apasiona el desarrollo web y el diseño 3D, especialmente la creación 
                    de experiencias interactivas con Three.js.
                    <br><br>
                    Este proyecto forma parte de mi portafolio personal, donde muestro mis 
                    habilidades en programación 3D, diseño interactivo y desarrollo de experiencias 
                    web modernas.`,
    },

}

const modal = document.querySelector('.modal');
const modalTitle = document.querySelector('.modal-title');
const modalProjectDescription = document.querySelector(
    '.modal-project-description'
);

const modalExistButton = document.querySelector('.modal-exit-button');
modalExistButton.addEventListener('click', () => {
    modal.classList.add('hidden');
});

function showModal(id) {
    const content = modalContent[id];
    if (content) {
        modalTitle.textContent = content.title;
        modalProjectDescription.innerHTML = content.content;
        modal.classList.remove('hidden');
    }
}

const intersectedObjectNames = [
    'project',
    'project001',
    'project002',
    'character',
    'cat',
    'tortoise',
    'lapras',
    'pikachu',
    'llama',
    'duck',
    'chick',
    'coffee_chest'
];

// console.log(renderer);
const controls = new OrbitControls(camera, canvas);
camera.position.set(189.25, 104.78, -71.80);
camera.zoom = 2.5;
camera.updateProjectionMatrix();
controls.target.set(80, -30, -190);
controls.update();

function setupCharacter() {

    if (!characterMesh) {
        console.error("No se encontró el personaje");
        return;
    }

    const box = new THREE.Box3().setFromObject(characterMesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    characterMesh.position.sub(center);
    characterContainer.add(characterMesh);
    characterContainer.position.copy(center);
    originalCharacterPosition.copy(characterContainer.position);

    playerCollider.start.copy(characterContainer.position);
    playerCollider.end.copy(characterContainer.position).add(
        new THREE.Vector3(0, CAPSULE_HEIGHT, 0)
    );

    character.instance = characterContainer;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;
  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      playerVelocity.y = 0;
    }
  }
}

function updatePlayer() {
  if (!character.instance) return;
    
  if (character.instance.position.y < -20) {
    respawnCharacter();
    return;
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.035;
  }

  if (playerOnFloor){
    playerVelocity.x *= 0.8;
    playerVelocity.z *= 0.8;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.035));
  playerCollisions();
  character.instance.position.copy(playerCollider.start);
  
  character.instance.position.y = playerCollider.start.y + CAPSULE_HEIGHT;
  let rotationDiff =
    ((((targetRotation - character.instance.rotation.y) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;
  let finalRotation = character.instance.rotation.y + rotationDiff;
  character.instance.rotation.y = THREE.MathUtils.lerp(
    character.instance.rotation.y,
    finalRotation,
    0.4
  );
}

function respawnCharacter() {

    playerCollider.start.copy(originalCharacterPosition);
    playerCollider.end.copy(originalCharacterPosition).add(
        new THREE.Vector3(0, CAPSULE_HEIGHT, 0)
    );

    playerVelocity.set(0, 0, 0);

    characterContainer.position.copy(originalCharacterPosition);
}

function onKeyDown(event) {

    // console.log(event); 
    switch (event.key.toLowerCase()) {
        case 'd':
        case 'arrowright':
            playerVelocity.z -= MOVE_SPEED;
            targetRotation = - Math.PI / 2;
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 'a':
        case 'arrowleft':
            playerVelocity.z += MOVE_SPEED;
            targetRotation = Math.PI / 2; 
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 'w':
        case 'arrowup':
            playerVelocity.x -= MOVE_SPEED;
            targetRotation = 0; 
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 's':
        case 'arrowdown':
            playerVelocity.x += MOVE_SPEED;
            targetRotation = -Math.PI; 
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }       
            break
        default:
            return; 
    }
}

function switchToNight() {
    audioToggle.style.color = "#4da6ff";
    renderer.setClearColor(0x0b1a2b);

    sun.intensity = 0.2;
    moonLight.intensity = 1.2;
    light.intensity = 1;

}

function switchToDay() {
    audioToggle.style.color = "#ffffff";
    renderer.setClearColor(0x87ceeb);
    sun.intensity = 2;

    moonLight.intensity = 0;
    light.intensity = 4;
}

window.addEventListener('click', onClick);
window.addEventListener('keydown', onKeyDown);

function jumpCharacter(name) {
    if (!sounds.animalJump.playing()) {
        sounds.animalJump.play();
    }
    const obj = centeredAnimals[name];
    if (!obj) return;

    const startY = obj.position.y;
    const tl = gsap.timeline();

    tl.to(obj.scale, {
        x: 1.15,
        y: 0.85,
        z: 1.15,
        duration: 0.1
    });

    tl.to(obj.position, {
        y: startY + 2,
        duration: 0.25,
        ease: "power2.out"
    });

    tl.to(obj.position, {
        y: startY,
        duration: 0.35,
        ease: "bounce.out"
    });

    tl.to(obj.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.2
    });
}

function onClick(event) {
    Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    Pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(Pointer, camera);

    const intersects = raycaster.intersectObjects(intersectObjects, true);
    if (intersects.length === 0) return;

    const root = getRootObject(intersects[0].object);
    if (!root) return;
    // console.log('CLICK en:', root.name);

    if (modalContent[root.name]) {
        
        if (!sounds.chestOpen.playing()) {
            sounds.chestOpen.play();
        }
        
        showModal(root.name);
    }

    if (animalNames.includes(root.name)) {
    jumpCharacter(root.name);
    return;
    }
}

function getRootObject(object) {
    while (
        object.parent &&
        !intersectedObjectNames.includes(object.parent.name)
    ) {
        object = object.parent;
    }
    return object.parent || object;
}

const mobileControls = {
  up: document.querySelector(".mobile-control.up-arrow"),
  left: document.querySelector(".mobile-control.left-arrow"),
  right: document.querySelector(".mobile-control.right-arrow"),
  down: document.querySelector(".mobile-control.down-arrow"),
};

const pressedButtons = {
  up: false,
  left: false,
  right: false,
  down: false,
};

Object.entries(mobileControls).forEach(([direction, element]) => {
  element.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("touchend", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("mouseup", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mouseleave", (e) => {
    pressedButtons[direction] = false;
  });

  element.addEventListener("touchcancel", (e) => {
    pressedButtons[direction] = false;
  });
});

window.addEventListener("blur", () => {
  Object.keys(pressedButtons).forEach((key) => {
    pressedButtons[key] = false;
  });
});

function animate() {
    if (character.instance) {
        const targetCameraPosition = new THREE.Vector3(
        character.instance.position.x + cameraOffset.x,
        cameraOffset.y,
        character.instance.position.z + cameraOffset.z
    );

    camera.position.lerp(targetCameraPosition, 0.1);

    camera.lookAt(
        character.instance.position.x,
        character.instance.position.y,
        character.instance.position.z
    );
    }

    if (pressedButtons.up) {
        playerVelocity.x -= MOVE_SPEED;
        targetRotation = 0;

    if (playerOnFloor) {
        playerVelocity.y = JUMP_HEIGHT;
        sounds.playerJump.stop();
        sounds.playerJump.play();
    }
    }

    if (pressedButtons.down) {
        playerVelocity.x += MOVE_SPEED;
        targetRotation = -Math.PI;

    if (playerOnFloor) {
        playerVelocity.y = JUMP_HEIGHT;
        sounds.playerJump.stop();
        sounds.playerJump.play();
    }
}

if (pressedButtons.left) {
    playerVelocity.z += MOVE_SPEED;
    targetRotation = Math.PI / 2;

  if (playerOnFloor) {
    playerVelocity.y = JUMP_HEIGHT;
    sounds.playerJump.stop();
    sounds.playerJump.play();
  }
}

if (pressedButtons.right) {
    playerVelocity.z -= MOVE_SPEED;
    targetRotation = -Math.PI / 2;

    if (playerOnFloor) {
        playerVelocity.y = JUMP_HEIGHT;
        sounds.playerJump.stop();
        sounds.playerJump.play();
    }
}
    updatePlayer();
    raycaster.setFromCamera(Pointer, camera);

    const intersects = raycaster.intersectObjects(intersectObjects, true);
    if (intersects.length > 0) {

    const root = getRootObject(intersects[0].object);

    if (intersectedObjectNames.includes(root.name)) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
}
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
