import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';



const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const Pointer = new THREE.Vector2();
let intersectObjects = [];

const centeredAnimals = {};
const animalsToFix = [];
const animalNames = ['pikachu', 'chick', 'llama', 'duck', 'lapras', 'tortoise', 'cat'];

/*let isMoving = false;*/

let characterMesh = null;
let characterContainer = new THREE.Group();
scene.add(characterContainer);


let character = {
    instance: null,
    moveDistance: 5,
    jumpHeight: 4,
    moveDuration: 0.3, // Duración del movimiento en segundos
    isMoving: false
    //moveDistance: 0.2,
    //moveDuration: 0.4,
    //jumpHeight: 0.5,
    /*speed: 0.4, // unidades por segundo*/
    /*isMoving: false*/
};



const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};


const loader = new GLTFLoader();

loader.load('./public/ProyectoWeb.glb', function (gltf) {

    scene.add(gltf.scene);

    gltf.scene.traverse(child => {

        // SOLO guardar referencia — NO mover nada aquí
        if (child.name === 'character') {
            characterMesh = child;
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

    //Ahora el personaje REAL será el contenedor
    character.instance = characterContainer;

    //Ajustar altura (puedes cambiar este número)
   //characterContainer.position.y += 9;
}



function onKeyDown(event) {
    
    if (character.isMoving) return; // Evitar iniciar otro movimiento mientras el personaje ya se está moviendo

    /*const targetPosition = new THREE.Vector3().copy(character.instance.position);
    let targetRotation = 0;*/

    const targetPosition = characterContainer.position.clone();

    let targetRotation = characterContainer.rotation.y;

    console.log(event);
    switch (event.key.toLowerCase()) {
        case 'd':
        case 'arrowright':
            targetPosition.z -= character.moveDistance;
            targetRotation = Math.PI / 2; // 90 grados en radianes
            break
        case 'a':
        case 'arrowleft':
            targetPosition.z += character.moveDistance;
            targetRotation = - Math.PI / 2; // 180 grados en radianes
            break
        case 'w':
        case 'arrowup':
            targetPosition.x -= character.moveDistance;
            targetRotation = Math.PI; // 90 grados en radianes
            break
        case 's':
        case 'arrowdown':
            targetPosition.x += character.moveDistance;
            targetRotation = 0; // 270 grados en radianes        
            break
        default:
            return; // Salir si no es una tecla de movimiento
    }
    moverCharacter(targetPosition, targetRotation);
}





// window.addEventListener( 'resize', handleResize );
window.addEventListener('click', onClick);
// window.addEventListener( 'pointermove', onPointerMove );
window.addEventListener('keydown', onKeyDown);

function jumpCharacter(name) {

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


function animate() {

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
