// Rendu des meubles 3D (Furniture Kit de Kenney, CC0) : chaque modèle est photographié en haute définition par Three.js
// sous l'angle de vue du musée, puis affiché comme une image debout dans la salle. Une rotation = une nouvelle photo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PPU = 220; // pixels par unité de modèle
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f73, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-2, 4, 3);
scene.add(sun);
const loader = new GLTFLoader(), models = new Map(), shots = new Map();
const ELEV = THREE.MathUtils.degToRad(24); // la salle est vue un peu d'en haut

const load = id => {
  if (!models.has(id)) models.set(id, loader.loadAsync(`models/${id}.glb`).then(g => g.scene));
  return models.get(id);
};

async function shot(id, rot) {
  const key = id + ':' + rot;
  if (shots.has(key)) return shots.get(key);
  const p = (async () => {
    const obj = (await load(id)).clone();
    obj.rotation.y = rot * Math.PI / 4;
    const holder = new THREE.Group();
    holder.add(obj);
    scene.add(holder);
    // cadrage : boîte englobante vue depuis la caméra
    const box = new THREE.Box3().setFromObject(holder), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const cam = new THREE.OrthographicCamera();
    const dir = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
    cam.position.copy(c).addScaledVector(dir, 20);
    cam.lookAt(c);
    cam.updateMatrixWorld();
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const xs = pts.map(v => v.x), ys = pts.map(v => v.y);
    const l = Math.min(...xs), r = Math.max(...xs), b = Math.min(...ys), t = Math.max(...ys);
    Object.assign(cam, { left: l, right: r, top: t, bottom: b, near: .1, far: 60 });
    cam.updateProjectionMatrix();
    const w = Math.max(8, Math.round((r - l) * PPU)), h = Math.max(8, Math.round((t - b) * PPU));
    renderer.setSize(w, h, false);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(holder);
    // footW : largeur réelle au sol (pour l'échelle dans la salle) ; uw/uh : taille de la photo en unités
    return { url, uw: r - l, uh: t - b, footW: Math.max(size.x, size.z) };
  })();
  shots.set(key, p);
  return p;
}

window.Decor = { shot };
dispatchEvent(new Event('decor-ready'));
