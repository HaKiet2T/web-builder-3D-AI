import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for Node.js environment
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};

const outputDir = path.join(process.cwd(), 'public', 'models3d');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function exportToGlb(object, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (glb) => {
        const dest = path.join(outputDir, filename);
        fs.writeFileSync(dest, Buffer.from(glb));
        console.log(`Generated: ${filename} (${glb.byteLength} bytes)`);
        resolve(dest);
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

// 1. Smart Standing Desk
function createDesk() {
  const group = new THREE.Group();
  group.name = 'SmartStandingDesk';

  // Desktop (tabletop)
  const topGeo = new THREE.BoxGeometry(2.0, 0.05, 0.9);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.4 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.75;
  group.add(top);

  // Legs (two metal columns)
  const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.8, 0.36, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.8, 0.36, 0);
  group.add(rightLeg);

  // Feet
  const footGeo = new THREE.BoxGeometry(0.1, 0.04, 0.65);
  const leftFoot = new THREE.Mesh(footGeo, legMat);
  leftFoot.position.set(-0.8, 0.02, 0);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeo, legMat);
  rightFoot.position.set(0.8, 0.02, 0);
  group.add(rightFoot);

  return group;
}

// 2. Curved Ultrawide Monitor
function createMonitor() {
  const group = new THREE.Group();
  group.name = 'UltrawideMonitor';

  // Bezel / Frame
  const frameGeo = new THREE.BoxGeometry(1.1, 0.45, 0.04);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = 0.45;
  group.add(frame);

  // Screen
  const screenGeo = new THREE.PlaneGeometry(1.06, 0.41);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.45, 0.022);
  group.add(screen);

  // Stand Column
  const colGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 16);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
  const col = new THREE.Mesh(colGeo, colMat);
  col.position.set(0, 0.2, -0.05);
  group.add(col);

  // Stand Base
  const baseGeo = new THREE.BoxGeometry(0.3, 0.015, 0.22);
  const base = new THREE.Mesh(baseGeo, colMat);
  base.position.set(0, 0.01, -0.05);
  group.add(base);

  return group;
}

// 3. Cyberpunk Gaming PC
function createGamingPC() {
  const group = new THREE.Group();
  group.name = 'CyberpunkGamingPC';

  // Case
  const caseGeo = new THREE.BoxGeometry(0.24, 0.5, 0.48);
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.3 });
  const pcCase = new THREE.Mesh(caseGeo, caseMat);
  pcCase.position.y = 0.25;
  group.add(pcCase);

  // Glass side panel
  const glassGeo = new THREE.BoxGeometry(0.01, 0.46, 0.44);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0.125, 0.25, 0);
  group.add(glass);

  // RGB lighting interior
  const rgbGeo = new THREE.BoxGeometry(0.04, 0.25, 0.1);
  const rgbMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.5,
  });
  const rgb = new THREE.Mesh(rgbGeo, rgbMat);
  rgb.position.set(0.05, 0.28, 0.05);
  group.add(rgb);

  return group;
}

// 4. Ergonomic Mesh Chair
function createChair() {
  const group = new THREE.Group();
  group.name = 'ErgonomicChair';

  // Seat
  const seatGeo = new THREE.BoxGeometry(0.52, 0.08, 0.5);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.y = 0.48;
  group.add(seat);

  // Backrest
  const backGeo = new THREE.BoxGeometry(0.48, 0.55, 0.05);
  const back = new THREE.Mesh(backGeo, seatMat);
  back.position.set(0, 0.8, -0.22);
  group.add(back);

  // Headrest
  const headGeo = new THREE.BoxGeometry(0.25, 0.12, 0.06);
  const head = new THREE.Mesh(headGeo, seatMat);
  head.position.set(0, 1.12, -0.2);
  group.add(head);

  // Gas Lift Column
  const gasGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 16);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const gas = new THREE.Mesh(gasGeo, metalMat);
  gas.position.y = 0.22;
  group.add(gas);

  // 5-Star Base
  const baseGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 5);
  const base = new THREE.Mesh(baseGeo, metalMat);
  base.position.y = 0.04;
  group.add(base);

  return group;
}

// 5. Potted Desk Plant
function createDeskPlant() {
  const group = new THREE.Group();
  group.name = 'DeskPlant';

  // Pot
  const potGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.14, 16);
  const potMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.07;
  group.add(pot);

  // Leaves
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const leafGeo = new THREE.ConeGeometry(0.06, 0.22, 6);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.cos(angle) * 0.04, 0.2, Math.sin(angle) * 0.04);
    leaf.rotation.z = Math.cos(angle) * 0.35;
    leaf.rotation.x = Math.sin(angle) * 0.35;
    group.add(leaf);
  }

  return group;
}

// 6. Studio Speakers (Pair)
function createStudioSpeakers() {
  const group = new THREE.Group();
  group.name = 'StudioSpeakers';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

  function createOneSpeaker(xPos) {
    const sp = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.14, 0.22, 0.16);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.11;
    sp.add(body);

    const wooferGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16);
    wooferGeo.rotateX(Math.PI / 2);
    const woofer = new THREE.Mesh(wooferGeo, coneMat);
    woofer.position.set(0, 0.09, 0.082);
    sp.add(woofer);

    const tweeterGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 16);
    tweeterGeo.rotateX(Math.PI / 2);
    const tweeter = new THREE.Mesh(tweeterGeo, coneMat);
    tweeter.position.set(0, 0.16, 0.082);
    sp.add(tweeter);

    sp.position.x = xPos;
    return sp;
  }

  group.add(createOneSpeaker(-0.25));
  group.add(createOneSpeaker(0.25));

  return group;
}

async function main() {
  console.log('Generating 3D GLB preset models...');
  await exportToGlb(createDesk(), 'smart-desk.glb');
  await exportToGlb(createMonitor(), 'ultrawide-monitor.glb');
  await exportToGlb(createGamingPC(), 'gaming-pc.glb');
  await exportToGlb(createChair(), 'ergonomic-chair.glb');
  await exportToGlb(createDeskPlant(), 'desk-plant.glb');
  await exportToGlb(createStudioSpeakers(), 'studio-speakers.glb');
  console.log('All preset GLB models generated successfully in public/models3d/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
