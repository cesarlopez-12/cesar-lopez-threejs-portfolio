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
    src: ["./music/pokemon.ogg"], // cambia si es .ogg
    loop: true,
    volume: 0.3,
    preload: true,
    }),

    chestOpen: new Howl({
    src: ["./music/projects.ogg"], // cambia si es .ogg
    volume: 0.6,
    preload: true,
    }),

    animalJump: new Howl({
    src: ["./music/music_pokemon.ogg"], // tu archivo
    volume: 0.7,
    preload: true,
    }),
    
    playerJump: new Howl({
    src: ["./music/jumpsfx.ogg"], // tu archivo
    volume: 0.8,
    preload: true,
    }),

    enterClick: new Howl({
    src: ["./music/projects.ogg"], // cambia por tu archivo
    volume: 0.7,
    preload: true,
    }),

    themeSwitch: new Howl({
    src: ["./music/projects.ogg"], // pon aquí tu sonido
    volume: 0.6
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


const GRAVITY = 20;
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

themeToggle.addEventListener("click", () => {
    // sonido
    sounds.themeSwitch.stop();
    sounds.themeSwitch.play();

    // animación del botón (AZUL ↔ AMARILLO)
    themeToggle.classList.toggle("active");

    isNight = !isNight; // cambia entre true y false

    if (isNight) {
        switchToNight();
    } else {
        switchToDay();
    }

});

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;
let originalCharacterPosition = new THREE.Vector3();


/*let isMoving = false;*/

let characterMesh = null;
let characterContainer = new THREE.Group();
scene.add(characterContainer);


let character = {
    instance: null,
    // moveDistance: 5,
    // jumpHeight: 4,
    // moveDuration: 0.3, // Duración del movimiento en segundos
    isMoving: false
    //moveDistance: 0.2,
    //moveDuration: 0.4,
    //jumpHeight: 0.5,
    /*speed: 0.4, // unidades por segundo*/
    /*isMoving: false*/
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


loader.load('./public/ProyectoWebThree.glb', function (gltf) {

    scene.add(gltf.scene);

    gltf.scene.traverse(child => {

        // SOLO guardar referencia — NO mover nada aquí
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

        // Centrar modelo dentro del contenedor
        animal.position.sub(center);
        container.add(animal);

        // Regresar a su posición original
        container.position.copy(center);

        centeredAnimals[animal.name] = container;

        console.log("Animal listo:", animal.name);
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
scene.add(helper);

// const shadowHelper = new THREE.CameraHelper( sun.shadow.camera );
// scene.add( shadowHelper );

const camera = new THREE.OrthographicCamera(
    -50 * (sizes.width / sizes.height),
    50 * (sizes.width / sizes.height),
    50,
    -50,
    0.1,
    1000
);


const canvas = document.querySelector('#experience-canvas');

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

function hideModal() {
    modal.classList.toggle('hidden');
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

console.log(renderer);

/*camera.position.x = 189.2549796831433;
camera.position.y = 104.78391292547539;
camera.position.z = -37.801902476570845;*/

const controls = new OrbitControls(camera, canvas);

camera.position.set(189.25, 104.78, -71.80);
camera.zoom = 2.5;
camera.updateProjectionMatrix();
controls.target.set(80, -30, -190);
controls.update();

/*
function moverCharacter(targetPosition, targetRotation) {

    if (character.isMoving) return;

    character.isMoving = true;

    
    let rotationDiff =
    (((targetRotation - characterContainer.rotation.y) % (2 * Math.PI)) +
    (2 * Math.PI)) % (2 * Math.PI) -
    Math.PI;

    let finalRotation = characterContainer.rotation.y + rotationDiff;

    const startY = characterContainer.position.y;

    const t1 = gsap.timeline({
        onComplete: () => {
            character.isMoving = false;
        }
    });

    
    t1.to(characterContainer.position, {
        x: targetPosition.x,
        z: targetPosition.z,
        duration: character.moveDuration,
        ease: "power2.inOut"
    });

    
    t1.to(characterContainer.rotation, {
        y: finalRotation,
        duration: 0.1,
        ease: "power2.inOut"
    }, 0);

    
    t1.to(characterContainer.position, {
        y: startY + character.jumpHeight,
        duration: character.moveDuration / 2,
        ease: "power1.out",
        yoyo: true,
        repeat: 1
    }, '<');
}
*/

function setupCharacter() {

    if (!characterMesh) {
        console.error("No se encontró el personaje");
        return;
    }

    //Crear caja del modelo
    const box = new THREE.Box3().setFromObject(characterMesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    //Mover el modelo al origen (centrarlo)
    characterMesh.position.sub(center);

    //Meter el modelo dentro del contenedor
    characterContainer.add(characterMesh);

    //Colocar el contenedor donde estaba el personaje
    characterContainer.position.copy(center);
    originalCharacterPosition.copy(characterContainer.position);

    // 🔥 SINCRONIZAR COLLIDER CON EL PERSONAJE
    playerCollider.start.copy(characterContainer.position);
    playerCollider.end.copy(characterContainer.position).add(
        new THREE.Vector3(0, CAPSULE_HEIGHT, 0)
    );

    //Ahora el personaje REAL será el contenedor
    character.instance = characterContainer;

    //Ajustar altura (puedes cambiar este número)
   //characterContainer.position.y += 9;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      //character.isMoving = false;
      playerVelocity.y = 0;
      //playerVelocity.x = 0;
      //playerVelocity.z = 0;
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
  
  // character.instance.position.y += CAPSULE_HEIGHT; // Ajustar para que el personaje esté a la altura correcta
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
    
    // if (character.isMoving) return; // Evitar iniciar otro movimiento mientras el personaje ya se está moviendo

    /*const targetPosition = new THREE.Vector3().copy(character.instance.position);
    let targetRotation = 0;*/

    // const targetPosition = characterContainer.position.clone();

    // let targetRotation = characterContainer.rotation.y;

    console.log(event); 
    switch (event.key.toLowerCase()) {
        case 'd':
        case 'arrowright':
            playerVelocity.z -= MOVE_SPEED;
            targetRotation = - Math.PI / 2; // 90 grados en radianes
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 'a':
        case 'arrowleft':
            playerVelocity.z += MOVE_SPEED;
            targetRotation = Math.PI / 2; // 180 grados en radianes
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 'w':
        case 'arrowup':
            playerVelocity.x -= MOVE_SPEED;
            targetRotation = 0; // 0 grados en radianes
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }
            break
        case 's':
        case 'arrowdown':
            playerVelocity.x += MOVE_SPEED;
            targetRotation = -Math.PI; // 270 grados en radianes 
            if (playerOnFloor) {
                playerVelocity.y = JUMP_HEIGHT;
                sounds.playerJump.stop();
                sounds.playerJump.play();
                
            }       
            break
        default:
            return; // Salir si no es una tecla de movimiento
    }
    // moverCharacter(targetPosition, targetRotation);
    // playerVelocity.y = JUMP_HEIGHT;
    // character.isMoving = true; // Marcar que el personaje está en movimiento
}

function switchToNight() {

    // cielo oscuro
    renderer.setClearColor(0x0b1a2b);

    // bajamos el sol
    sun.intensity = 0.2;

    // activamos luz azul nocturna
    moonLight.intensity = 1.2;

    // ambiente más tenue
    light.intensity = 1;

}

function switchToDay() {

    renderer.setClearColor(0x87ceeb);

    sun.intensity = 2;

    moonLight.intensity = 0;

    light.intensity = 4;

}

// window.addEventListener( 'resize', handleResize );
window.addEventListener('click', onClick);
// window.addEventListener( 'pointermove', onPointerMove );
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

    // subir hasta encontrar el grupo principal
    const root = getRootObject(intersects[0].object);
    if (!root) return;
    console.log('CLICK en:', root.name);

    // Verificar si el objeto intersectado es uno de los objetos interactivos

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

// función de manejo de selección
function getRootObject(object) {
    while (
        object.parent &&
        !intersectedObjectNames.includes(object.parent.name)
    ) {
        object = object.parent;
    }
    return object.parent || object;
}

function handleSelection(name) {
    console.log('CLICK en:', name);
}

// Controles de movil
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
    //Camara sigue al personaje
        if (character.instance) {
        const targetCameraPosition = new THREE.Vector3(
        character.instance.position.x + cameraOffset.x,
        cameraOffset.y, // altura fija
        character.instance.position.z + cameraOffset.z
    );

    // Movimiento suave
    camera.position.lerp(targetCameraPosition, 0.1);

    // Mirar al personaje (sin modificar Y)
    camera.lookAt(
        character.instance.position.x,
        character.instance.position.y,
        character.instance.position.z
    );
    }

    // --- Movimiento móvil continuo ---
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

    // console.log(camera.position);
    raycaster.setFromCamera(Pointer, camera);

    const intersects = raycaster.intersectObjects(intersectObjects, true);
    // const root = getRootObject(intersects[0].object);

    if (intersects.length > 0) {
        const root = getRootObject(intersects[0].object);

        document.body.style.cursor = 'pointer';
        console.log('Hover sobre:', root.name);
    } else {
        document.body.style.cursor = 'default';
    }

    // console.log(camera.position);

    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
