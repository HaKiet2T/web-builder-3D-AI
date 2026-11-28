'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { RoomItem, WindowConfig } from '@/lib/room/types';
import './room-stage-3d.css';

export type { WindowConfig };

export interface RoomStage3DProps {
  setup: {
    id?: string;
    title?: string;
    bgImageUrl?: string;
    aspectRatio?: number;
    wallCount?: number; // 1, 2, or 3 walls
    windows?: WindowConfig[];
  };
  items: RoomItem[];
  mode?: 'edit' | 'view';
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onUpdateItem?: (updatedItem: RoomItem) => void;
  onDeleteItem?: (id: string) => void;
  onUpdateSetup?: (updatedSetup: { wallCount?: number; windows?: WindowConfig[] }) => void;
  className?: string;
}

type CameraPreset = 'diorama' | 'front' | 'top' | 'eye';

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// Room dimensions (8m x 8m square room with 3.8m walls)
const ROOM_SIZE = 8.0;
const WALL_HEIGHT = 3.8;
const WALL_THICKNESS = 0.15;

// Active furniture coordinate boundary allowing objects to sit flush right against the wall surface
// Inner wall face is at: -(ROOM_SIZE / 2 - WALL_THICKNESS / 2) = -3.925m
// Distance from room center to flush placement position is 3.85m
const FLUSH_BOUNDARY = 3.85;
const ROOM_SPAN = 7.7; // Active furniture area spanning right up to the wall surface

function pctToX(pct: number): number {
  return ((pct - 50) / 100) * ROOM_SPAN;
}

function pctToZ(pct: number): number {
  return ((pct - 50) / 100) * ROOM_SPAN;
}

function xToPct(x: number): number {
  const pct = (x / ROOM_SPAN) * 100 + 50;
  return Math.round(clamp(pct, 0, 100) * 10) / 10;
}

function zToPct(z: number): number {
  const pct = (z / ROOM_SPAN) * 100 + 50;
  return Math.round(clamp(pct, 0, 100) * 10) / 10;
}

export function RoomStage3D({
  setup,
  items,
  mode = 'edit',
  selectedItemId = null,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateSetup,
  className = '',
}: RoomStage3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const itemMeshesGroupRef = useRef<THREE.Group | null>(null);
  const windowsGroupRef = useRef<THREE.Group | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const itemMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const windowMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);

  // Wall meshes refs
  const backWallRef = useRef<THREE.Mesh | null>(null);
  const leftWallRef = useRef<THREE.Mesh | null>(null);
  const rightWallRef = useRef<THREE.Mesh | null>(null);

  // Room Wall & Window State
  const [wallCount, setWallCount] = useState<number>(setup.wallCount || 2);
  const wallCountRef = useRef<number>(wallCount);
  useEffect(() => {
    wallCountRef.current = wallCount;
  }, [wallCount]);
  const [windows, setWindows] = useState<WindowConfig[]>(() => {
    if (setup.windows && Array.isArray(setup.windows) && setup.windows.length > 0) {
      return setup.windows;
    }
    return [
      { id: 'win-default-1', wall: 'back', positionPct: 35, width: 2.2, height: 1.6, elevationY: 2.1 },
    ];
  });
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [isSpaceDrawerOpen, setIsSpaceDrawerOpen] = useState(false);
  const [snapFeedback, setSnapFeedback] = useState<string | null>(null);

  // Sync state with incoming setup props
  useEffect(() => {
    if (setup.wallCount !== undefined && setup.wallCount !== wallCount) {
      const timer = setTimeout(() => setWallCount(setup.wallCount ?? 2), 0);
      return () => clearTimeout(timer);
    }
  }, [setup.wallCount, wallCount]);

  useEffect(() => {
    if (setup.windows && Array.isArray(setup.windows)) {
      const timer = setTimeout(() => setWindows(setup.windows ?? []), 0);
      return () => clearTimeout(timer);
    }
  }, [setup.windows]);

  // Dragging state in 3D for Items
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const isDraggingRef = useRef<boolean>(false);
  const draggingItemIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state in 3D for Windows
  const isDraggingWindowRef = useRef<boolean>(false);
  const draggingWindowIdRef = useRef<string | null>(null);
  const windowDragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());

  const [activePreset, setActivePreset] = useState<CameraPreset>('diorama');
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId) || null;
  const selectedWindow = windows.find((w) => w.id === selectedWindowId) || null;

  // Initialize Three.js scene once
  useEffect(() => {
    const mount = mountRef.current;
    const canvas = canvasRef.current;
    if (!mount || !canvas) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(6.8, 5.8, 6.8);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and shadow map
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below floor
    controls.minDistance = 2.0;
    controls.maxDistance = 20.0;
    controls.target.set(0, 0.75, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // Directional sunlight coming through corner/window
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    sunLight.position.set(-6, 8, 4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.camera.left = -6;
    sunLight.shadow.camera.right = 6;
    sunLight.shadow.camera.top = 6;
    sunLight.shadow.camera.bottom = -6;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Fill soft light
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.6);
    fillLight.position.set(5, 4, 3);
    scene.add(fillLight);

    // 6. Build the Square Room (Tường trắng, nền giữ nguyên màu gỗ ấm áp)
    const roomGroup = new THREE.Group();
    roomGroup.name = 'SquareRoomArchitecture';

    // A. Floor (Square with wood parquet finish)
    const floorGeo = new THREE.BoxGeometry(ROOM_SIZE, 0.1, ROOM_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.55,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Subtle grid on floor for spatial alignment
    const grid = new THREE.GridHelper(ROOM_SIZE, 16, 0xbcaaa4, 0xe0d6d0);
    grid.position.y = 0.002;
    roomGroup.add(grid);

    // B. Back Wall (Z = -ROOM_SIZE / 2): Luôn hiển thị
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
    });
    const backWallGeo = new THREE.BoxGeometry(ROOM_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);
    backWallRef.current = backWall;

    // C. Left Wall (X = -ROOM_SIZE / 2): Hiển thị khi wallCount >= 2
    const leftWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE + WALL_THICKNESS);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.visible = wallCountRef.current >= 2;
    roomGroup.add(leftWall);
    leftWallRef.current = leftWall;

    // D. Right Wall (X = +ROOM_SIZE / 2): Hiển thị khi wallCount === 3
    const rightWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE + WALL_THICKNESS);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.visible = wallCountRef.current === 3;
    roomGroup.add(rightWall);
    rightWallRef.current = rightWall;

    scene.add(roomGroup);

    // 7. Group for Windows on walls
    const windowsGroup = new THREE.Group();
    windowsGroup.name = 'RoomWallWindows';
    scene.add(windowsGroup);
    windowsGroupRef.current = windowsGroup;

    // 8. Group for interactive items
    const itemMeshesGroup = new THREE.Group();
    itemMeshesGroup.name = 'InteractiveRoomItems';
    scene.add(itemMeshesGroup);
    itemMeshesGroupRef.current = itemMeshesGroup;

    // 9. Selection Box Helper
    const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01));
    const selectionBox = new THREE.BoxHelper(dummyMesh, 0x0284c7);
    selectionBox.visible = false;
    scene.add(selectionBox);
    selectionBoxRef.current = selectionBox;

    // 10. Resize Observer
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // 11. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (selectionBoxRef.current && selectionBoxRef.current.visible) {
        selectionBoxRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      backWallRef.current = null;
      leftWallRef.current = null;
      rightWallRef.current = null;
    };
  }, []);

  // Update wall visibility when wallCount changes
  useEffect(() => {
    if (leftWallRef.current) {
      leftWallRef.current.visible = wallCount >= 2;
    }
    if (rightWallRef.current) {
      rightWallRef.current.visible = wallCount === 3;
    }
  }, [wallCount]);

  // Handle setting wall count
  const handleSetWallCount = (count: number) => {
    const validCount = clamp(count, 1, 3);
    setWallCount(validCount);
    onUpdateSetup?.({ wallCount: validCount, windows });
  };

  // Build and render 3D Window Meshes on walls
  useEffect(() => {
    const group = windowsGroupRef.current;
    if (!group) return;

    // Clear old window meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    windowMeshMapRef.current.clear();

    const availableSpan = ROOM_SIZE - 2.2; // Width of wall surface for window sliding

    windows.forEach((win) => {
      // If window wall is not currently visible, skip rendering
      if (win.wall === 'left' && wallCount < 2) return;
      if (win.wall === 'right' && wallCount < 3) return;

      const isSelected = selectedWindowId === win.id;
      const winWidth = win.width || 2.0;
      const winHeight = win.height || 1.6;
      const elevationY = win.elevationY || 2.1;

      const winGroup = new THREE.Group();
      winGroup.name = `Window_${win.id}`;
      winGroup.userData = { isWindow: true, windowId: win.id, wall: win.wall };

      // A. Outer Frame (Casing)
      const frameMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x0284c7 : 0x1e293b,
        roughness: 0.35,
        metalness: 0.7,
        emissive: isSelected ? 0x0369a1 : 0x000000,
        emissiveIntensity: isSelected ? 0.4 : 0,
      });
      const frameGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.08);
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      frameMesh.userData = { isWindow: true, windowId: win.id };
      winGroup.add(frameMesh);

      // B. Glass Pane (Translucent light blue sky reflection)
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.45,
        roughness: 0.08,
        metalness: 0.9,
      });
      const glassGeo = new THREE.BoxGeometry(winWidth - 0.12, winHeight - 0.12, 0.02);
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.z = 0.01;
      glassMesh.userData = { isWindow: true, windowId: win.id };
      winGroup.add(glassMesh);

      // C. Sky Backdrop plane behind glass for realistic outdoor daylight feel
      const skyMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
      });
      const skyGeo = new THREE.PlaneGeometry(winWidth - 0.14, winHeight - 0.14);
      const skyMesh = new THREE.Mesh(skyGeo, skyMat);
      skyMesh.position.z = -0.01;
      skyMesh.userData = { isWindow: true, windowId: win.id };
      winGroup.add(skyMesh);

      // D. Mullions (Crossbars dividing window into 4 panes)
      const barMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      // Horizontal bar
      const hBar = new THREE.Mesh(
        new THREE.BoxGeometry(winWidth - 0.12, 0.035, 0.03),
        barMat
      );
      hBar.position.z = 0.02;
      hBar.userData = { isWindow: true, windowId: win.id };
      winGroup.add(hBar);
      // Vertical bar
      const vBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, winHeight - 0.12, 0.03),
        barMat
      );
      vBar.position.z = 0.02;
      vBar.userData = { isWindow: true, windowId: win.id };
      winGroup.add(vBar);

      // E. Window Sill (Bệ cửa nhô nhẹ ra)
      const sillMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.6,
      });
      const sillGeo = new THREE.BoxGeometry(winWidth + 0.14, 0.045, 0.12);
      const sillMesh = new THREE.Mesh(sillGeo, sillMat);
      sillMesh.position.set(0, -winHeight / 2 - 0.02, 0.04);
      sillMesh.castShadow = true;
      sillMesh.userData = { isWindow: true, windowId: win.id };
      winGroup.add(sillMesh);

      // F. Position along wall
      const offsetOnWall = ((win.positionPct - 50) / 100) * availableSpan;

      if (win.wall === 'back') {
        winGroup.position.set(offsetOnWall, elevationY, -ROOM_SIZE / 2 + 0.05);
        winGroup.rotation.y = 0;
      } else if (win.wall === 'left') {
        winGroup.position.set(-ROOM_SIZE / 2 + 0.05, elevationY, offsetOnWall);
        winGroup.rotation.y = Math.PI / 2;
      } else if (win.wall === 'right') {
        winGroup.position.set(ROOM_SIZE / 2 - 0.05, elevationY, offsetOnWall);
        winGroup.rotation.y = -Math.PI / 2;
      }

      group.add(winGroup);
      windowMeshMapRef.current.set(win.id, winGroup);
    });
  }, [windows, wallCount, selectedWindowId]);

  // Set camera preset
  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setActivePreset(preset);

    switch (preset) {
      case 'diorama':
        camera.position.set(6.8, 5.8, 6.8);
        controls.target.set(0, 0.75, 0);
        break;
      case 'front':
        camera.position.set(0, 1.8, 6.2);
        controls.target.set(0, 0.9, 0);
        break;
      case 'top':
        camera.position.set(0, 8.8, 0.01);
        controls.target.set(0, 0, 0);
        break;
      case 'eye':
        camera.position.set(0, 1.25, 2.5);
        controls.target.set(0, 0.95, -0.3);
        break;
    }
    controls.update();
  }, []);

  // Helper to extract 3D world bounding box for stacking
  const getItemBounds = useCallback((mesh: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(mesh);
    return {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
      topY: Math.max(0, box.max.y),
      height: Math.max(0.05, box.max.y - box.min.y),
    };
  }, []);

  // Compute surface height at coordinate (x, z) from all objects beneath
  const getStackingSurfaceHeight = useCallback(
    (
      x: number,
      z: number,
      excludeItemId?: string,
      targetZIndex = 999,
    ): { surfaceY: number; baseLabel: string | null } => {
      let maxTop = 0.0;
      let baseLabel: string | null = null;

      for (const [id, mesh] of itemMeshMapRef.current.entries()) {
        if (id === excludeItemId) continue;
        const otherItem = items.find((i) => i.id === id);
        if (!otherItem) continue;

        // Only stack on top of objects with lower or equal layer index
        if ((otherItem.zIndex ?? 1) > targetZIndex) continue;

        const bounds = getItemBounds(mesh);
        // Snapping margin in meters
        const margin = 0.12;
        if (
          x >= bounds.minX - margin &&
          x <= bounds.maxX + margin &&
          z >= bounds.minZ - margin &&
          z <= bounds.maxZ + margin
        ) {
          if (bounds.topY > maxTop) {
            maxTop = bounds.topY;
            baseLabel = otherItem.label || 'Vật thể bên dưới';
          }
        }
      }

      return { surfaceY: Math.round(maxTop * 1000) / 1000, baseLabel };
    },
    [getItemBounds, items],
  );

  // Load and render item meshes in 3D
  useEffect(() => {
    const group = itemMeshesGroupRef.current;
    if (!group) return;

    if (!gltfLoaderRef.current) {
      gltfLoaderRef.current = new GLTFLoader();
    }
    const gltfLoader = gltfLoaderRef.current;

    // Clear old meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    itemMeshMapRef.current.clear();

    // Helper: clean minimalist representation for objects without custom 3D model
    function createProceduralMesh(item: RoomItem): THREE.Object3D {
      const itemGroup = new THREE.Group();
      const isProduct = item.itemType === 'product';
      const isDesk =
        Boolean(item.label?.toLowerCase().includes('bàn')) ||
        Boolean(item.customImageUrl?.includes('desk')) ||
        Boolean(item.productId?.includes('desk'));

      if (isDesk) {
        // Tabletop
        const topGeo = new THREE.BoxGeometry(1.8, 0.05, 0.85);
        const topMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.4 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.75;
        top.castShadow = true;
        top.receiveShadow = true;
        itemGroup.add(top);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.06);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
        [
          [-0.8, 0.36, -0.35],
          [0.8, 0.36, -0.35],
          [-0.8, 0.36, 0.35],
          [0.8, 0.36, 0.35],
        ].forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, ly, lz);
          leg.castShadow = true;
          itemGroup.add(leg);
        });
        return itemGroup;
      }

      const blockMat = new THREE.MeshStandardMaterial({
        color: isProduct ? 0x0284c7 : 0x10b981,
        metalness: 0.2,
        roughness: 0.5,
      });
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.35), blockMat);
      block.position.y = 0.1;
      block.castShadow = true;
      block.receiveShadow = true;
      itemGroup.add(block);
      return itemGroup;
    }

    // Sort items by zIndex ascending so lower items are built first
    const sortedItems = [...items].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));

    sortedItems.forEach((item) => {
      const itemWrapper = new THREE.Group();
      itemWrapper.name = `Item_${item.id}`;
      itemWrapper.userData = { itemId: item.id, item };

      // Determine 3D position
      const x = pctToX(item.xPct);
      const z = pctToZ(item.yPct);

      // Determine initial elevation
      let y = typeof item.elevation === 'number' && item.elevation > 0 ? item.elevation : 0.0;
      if (y === 0.0) {
        const { surfaceY } = getStackingSurfaceHeight(x, z, item.id, item.zIndex ?? 1);
        y = surfaceY;
      }

      itemWrapper.position.set(x, y, z);
      itemWrapper.rotation.y = (item.rotation * Math.PI) / 180;

      const scaleFactor = Math.max(0.4, item.widthPct / 20.0);
      itemWrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);

      const modelUrl =
        item.customImageUrl ||
        item.product?.media?.find((m) => m.kind === 'model')?.url;
      const isGlbModel =
        Boolean(modelUrl) &&
        (modelUrl!.toLowerCase().endsWith('.glb') ||
          modelUrl!.toLowerCase().includes('.glb?') ||
          modelUrl!.startsWith('blob:') ||
          modelUrl!.includes('/models3d/') ||
          modelUrl!.includes('/product-models/'));

      if (isGlbModel && modelUrl) {
        gltfLoader.load(
          modelUrl,
          (gltf) => {
            const gltfScene = gltf.scene;
            const box = new THREE.Box3().setFromObject(gltfScene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
              const targetSize = 1.0;
              const autoScale = targetSize / maxDim;
              gltfScene.scale.set(autoScale, autoScale, autoScale);
              gltfScene.position.sub(center.multiplyScalar(autoScale));
              gltfScene.position.y += (size.y * autoScale) / 2;
            }

            gltfScene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            itemWrapper.add(gltfScene);
            if (selectedItemId === item.id && selectionBoxRef.current) {
              selectionBoxRef.current.setFromObject(itemWrapper);
              selectionBoxRef.current.visible = true;
            }

            // Recalculate heights for any items stacked on this object
            for (const other of sortedItems) {
              if (other.id === item.id || (other.zIndex ?? 1) <= (item.zIndex ?? 1)) continue;
              const otherMesh = itemMeshMapRef.current.get(other.id);
              if (otherMesh && (other.elevation === undefined || other.elevation === 0)) {
                const ox = pctToX(other.xPct);
                const oz = pctToZ(other.yPct);
                const itemBounds = getItemBounds(itemWrapper);
                if (
                  ox >= itemBounds.minX - 0.12 &&
                  ox <= itemBounds.maxX + 0.12 &&
                  oz >= itemBounds.minZ - 0.12 &&
                  oz <= itemBounds.maxZ + 0.12
                ) {
                  otherMesh.position.y = itemBounds.topY;
                  if (selectedItemId === other.id && selectionBoxRef.current) {
                    selectionBoxRef.current.setFromObject(otherMesh);
                  }
                }
              }
            }
          },
          undefined,
          (err) => {
            console.warn('[RoomStage3D] Notice loading model:', modelUrl, err);
            const procedural = createProceduralMesh(item);
            itemWrapper.add(procedural);
          }
        );
      } else {
        const procedural = createProceduralMesh(item);
        itemWrapper.add(procedural);
      }

      group.add(itemWrapper);
      itemMeshMapRef.current.set(item.id, itemWrapper);
    });

    if (selectedItemId) {
      const selectedMesh = itemMeshMapRef.current.get(selectedItemId);
      if (selectedMesh && selectionBoxRef.current) {
        selectionBoxRef.current.setFromObject(selectedMesh);
        selectionBoxRef.current.visible = true;
      }
    } else if (selectionBoxRef.current) {
      selectionBoxRef.current.visible = false;
    }
  }, [getItemBounds, getStackingSurfaceHeight, items, selectedItemId]);

  // Update selection box on selectedItemId change
  useEffect(() => {
    const selectionBox = selectionBoxRef.current;
    if (!selectionBox) return;

    if (selectedItemId) {
      const selectedMesh = itemMeshMapRef.current.get(selectedItemId);
      if (selectedMesh) {
        selectionBox.setFromObject(selectedMesh);
        selectionBox.visible = true;
        return;
      }
    }
    selectionBox.visible = false;
  }, [selectedItemId]);

  // Raycasting for Selection and Dragging in 3D
  const getPointerRaycaster = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      if (!canvas || !camera) return null;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      return raycaster;
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    if (mode !== 'edit') return;

    const raycaster = getPointerRaycaster(e);
    if (!raycaster) return;

    // A. Check if user clicked a Window on the wall first
    const windowsGroup = windowsGroupRef.current;
    if (windowsGroup && windowsGroup.children.length > 0) {
      const winIntersects = raycaster.intersectObjects(windowsGroup.children, true);
      if (winIntersects.length > 0) {
        let winObj: THREE.Object3D | null = winIntersects[0].object;
        while (winObj && winObj.parent && winObj.parent !== windowsGroup) {
          winObj = winObj.parent;
        }
        if (winObj && winObj.userData?.windowId) {
          const winId = winObj.userData.windowId as string;
          const targetWin = windows.find((w) => w.id === winId);
          if (targetWin) {
            setSelectedWindowId(winId);
            onSelectItem?.(null);

            // Configure dragging plane along this specific wall
            isDraggingWindowRef.current = true;
            draggingWindowIdRef.current = winId;

            if (targetWin.wall === 'back') {
              windowDragPlaneRef.current.set(new THREE.Vector3(0, 0, 1), ROOM_SIZE / 2 - 0.05);
            } else if (targetWin.wall === 'left') {
              windowDragPlaneRef.current.set(new THREE.Vector3(1, 0, 0), ROOM_SIZE / 2 - 0.05);
            } else if (targetWin.wall === 'right') {
              windowDragPlaneRef.current.set(new THREE.Vector3(1, 0, 0), -ROOM_SIZE / 2 + 0.05);
            }

            if (controlsRef.current) {
              controlsRef.current.enabled = false;
            }
            setIsDraggingCanvas(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    // B. Check if user clicked an Interactive Item
    const itemGroup = itemMeshesGroupRef.current;
    if (!itemGroup) return;

    const intersects = raycaster.intersectObjects(itemGroup.children, true);
    if (intersects.length > 0) {
      let targetObj: THREE.Object3D | null = intersects[0].object;
      while (targetObj && targetObj.parent && targetObj.parent !== itemGroup) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.userData?.itemId) {
        const itemId = targetObj.userData.itemId as string;
        onSelectItem?.(itemId);
        setSelectedWindowId(null);
        draggingItemIdRef.current = itemId;

        const itemElevation = targetObj.position.y;
        dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -itemElevation);

        const planeIntersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlaneRef.current, planeIntersection);
        dragOffsetRef.current.copy(targetObj.position).sub(planeIntersection);

        isDraggingRef.current = true;
        setIsDraggingCanvas(true);

        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const raycaster = getPointerRaycaster(e);
    if (!raycaster) return;

    // 1. Dragging a Window horizontally along the wall
    if (isDraggingWindowRef.current && draggingWindowIdRef.current) {
      const planeIntersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(windowDragPlaneRef.current, planeIntersection)) {
        const targetWin = windows.find((w) => w.id === draggingWindowIdRef.current);
        if (targetWin) {
          const availableSpan = ROOM_SIZE - 2.2;
          let newPct = 50;

          if (targetWin.wall === 'back') {
            newPct = clamp(Math.round(((planeIntersection.x / availableSpan) * 100 + 50) * 10) / 10, 10, 90);
          } else if (targetWin.wall === 'left' || targetWin.wall === 'right') {
            newPct = clamp(Math.round(((planeIntersection.z / availableSpan) * 100 + 50) * 10) / 10, 10, 90);
          }

          // Direct mesh update for 60fps responsiveness
          const mesh = windowMeshMapRef.current.get(draggingWindowIdRef.current);
          if (mesh) {
            const offsetOnWall = ((newPct - 50) / 100) * availableSpan;
            if (targetWin.wall === 'back') {
              mesh.position.x = offsetOnWall;
            } else if (targetWin.wall === 'left' || targetWin.wall === 'right') {
              mesh.position.z = offsetOnWall;
            }
          }

          setWindows((prev) =>
            prev.map((w) => (w.id === draggingWindowIdRef.current ? { ...w, positionPct: newPct } : w))
          );
        }
      }
      return;
    }

    // 2. Dragging an Item with Flush-to-Wall and Corner Snapping
    if (isDraggingRef.current && draggingItemIdRef.current) {
      const planeIntersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlaneRef.current, planeIntersection)) {
        const newPos = planeIntersection.add(dragOffsetRef.current);
        const targetObj = itemMeshMapRef.current.get(draggingItemIdRef.current);

        if (targetObj) {
          // Allow objects to reach right up to the wall surface
          let clampedX = clamp(newPos.x, -FLUSH_BOUNDARY, FLUSH_BOUNDARY);
          let clampedZ = clamp(newPos.z, -FLUSH_BOUNDARY, FLUSH_BOUNDARY);

          // Magnetic Snapping threshold (0.22m) for flush wall and corner placement
          const SNAP_THRESHOLD = 0.22;
          let isSnappedBack = false;
          let isSnappedLeft = false;
          let isSnappedRight = false;

          // Snap flush against Back Wall
          if (Math.abs(clampedZ - (-FLUSH_BOUNDARY)) < SNAP_THRESHOLD) {
            clampedZ = -FLUSH_BOUNDARY;
            isSnappedBack = true;
          }

          // Snap flush against Left Wall (if present)
          if (wallCount >= 2 && Math.abs(clampedX - (-FLUSH_BOUNDARY)) < SNAP_THRESHOLD) {
            clampedX = -FLUSH_BOUNDARY;
            isSnappedLeft = true;
          }

          // Snap flush against Right Wall (if present)
          if (wallCount === 3 && Math.abs(clampedX - FLUSH_BOUNDARY) < SNAP_THRESHOLD) {
            clampedX = FLUSH_BOUNDARY;
            isSnappedRight = true;
          }

          // Provide visual feedback for snapping
          if (isSnappedBack && isSnappedLeft) {
            setSnapFeedback('📍 Đã kê sát góc phòng (tường sau + tường trái)!');
          } else if (isSnappedBack && isSnappedRight) {
            setSnapFeedback('📍 Đã kê sát góc phòng (tường sau + tường phải)!');
          } else if (isSnappedBack) {
            setSnapFeedback('🧱 Đã kê sát tường sau!');
          } else if (isSnappedLeft) {
            setSnapFeedback('🧱 Đã kê sát tường trái!');
          } else if (isSnappedRight) {
            setSnapFeedback('🧱 Đã kê sát tường phải!');
          } else {
            setSnapFeedback(null);
          }

          // Calculate dynamic surface height beneath new position for smooth auto-stacking
          const currentItem = items.find((i) => i.id === draggingItemIdRef.current);
          const { surfaceY } = getStackingSurfaceHeight(
            clampedX,
            clampedZ,
            draggingItemIdRef.current,
            currentItem?.zIndex ?? 999,
          );

          targetObj.position.x = clampedX;
          targetObj.position.z = clampedZ;
          targetObj.position.y = surfaceY;

          dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -surfaceY);

          if (selectionBoxRef.current) {
            selectionBoxRef.current.setFromObject(targetObj);
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // A. Handle window drag end
    if (isDraggingWindowRef.current) {
      isDraggingWindowRef.current = false;
      draggingWindowIdRef.current = null;
      setIsDraggingCanvas(false);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      onUpdateSetup?.({ wallCount, windows });
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    // B. Handle item click or drag end
    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    if (dist < 4 && !draggingItemIdRef.current) {
      const raycaster = getPointerRaycaster(e);
      const itemGroup = itemMeshesGroupRef.current;
      const windowsGroup = windowsGroupRef.current;
      if (raycaster) {
        const itemIntersects = itemGroup ? raycaster.intersectObjects(itemGroup.children, true) : [];
        const winIntersects = windowsGroup ? raycaster.intersectObjects(windowsGroup.children, true) : [];
        if (itemIntersects.length === 0 && winIntersects.length === 0) {
          onSelectItem?.(null);
          setSelectedWindowId(null);
          setSnapFeedback(null);
        }
      }
    }

    if (isDraggingRef.current && draggingItemIdRef.current) {
      const targetObj = itemMeshMapRef.current.get(draggingItemIdRef.current);
      if (targetObj) {
        const finalXPct = xToPct(targetObj.position.x);
        const finalYPct = zToPct(targetObj.position.z);
        const finalElevation = Math.round(targetObj.position.y * 1000) / 1000;

        const currentItem = items.find((i) => i.id === draggingItemIdRef.current);
        if (currentItem) {
          onUpdateItem?.({
            ...currentItem,
            xPct: finalXPct,
            yPct: finalYPct,
            elevation: finalElevation,
          });
        }
      }
    }

    isDraggingRef.current = false;
    draggingItemIdRef.current = null;
    setIsDraggingCanvas(false);

    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Quick Action Handlers for Selected Item
  const handleRotateSelected = (deltaDegrees: number) => {
    if (!selectedItem) return;
    const nextRotation = (selectedItem.rotation + deltaDegrees + 360) % 360;
    onUpdateItem?.({
      ...selectedItem,
      rotation: nextRotation,
    });
  };

  const handleScaleSelected = (factor: number) => {
    if (!selectedItem) return;
    const nextWidth = clamp(Math.round(selectedItem.widthPct * factor * 10) / 10, 5, 80);
    onUpdateItem?.({
      ...selectedItem,
      widthPct: nextWidth,
    });
  };

  const handleAdjustElevation = (deltaY: number) => {
    if (!selectedItem) return;
    const mesh = itemMeshMapRef.current.get(selectedItem.id);
    const currentY = mesh ? mesh.position.y : (selectedItem.elevation || 0);
    const targetY = Math.max(0, Math.round((currentY + deltaY) * 100) / 100);

    if (mesh) {
      mesh.position.y = targetY;
      if (selectionBoxRef.current) {
        selectionBoxRef.current.setFromObject(mesh);
      }
    }

    onUpdateItem?.({
      ...selectedItem,
      elevation: targetY,
    });
  };

  const handleToggleElevation = () => {
    if (!selectedItem) return;
    const mesh = itemMeshMapRef.current.get(selectedItem.id);
    if (!mesh) return;

    const currentY = mesh.position.y;
    let targetY = 0.0;
    if (currentY <= 0.1) {
      const { surfaceY } = getStackingSurfaceHeight(
        mesh.position.x,
        mesh.position.z,
        selectedItem.id,
        selectedItem.zIndex ?? 1,
      );
      targetY = surfaceY > 0 ? surfaceY : 0.75;
    } else {
      targetY = 0.0;
    }

    mesh.position.y = targetY;

    if (selectionBoxRef.current) {
      selectionBoxRef.current.setFromObject(mesh);
    }

    onUpdateItem?.({
      ...selectedItem,
      elevation: targetY,
    });
  };

  // Window Management Handlers
  const handleAddWindow = () => {
    const newId = `win-${Date.now().toString(36)}`;
    // If left wall is active and back wall already has windows, add to left wall
    const targetWall: 'back' | 'left' | 'right' =
      wallCount >= 2 && windows.some((w) => w.wall === 'back') ? 'left' : 'back';
    const newWindow: WindowConfig = {
      id: newId,
      wall: targetWall,
      positionPct: 50,
      width: 2.0,
      height: 1.6,
      elevationY: 2.1,
    };
    const nextWindows = [...windows, newWindow];
    setWindows(nextWindows);
    setSelectedWindowId(newId);
    onUpdateSetup?.({ wallCount, windows: nextWindows });
  };

  const handleDeleteWindow = (id: string) => {
    const nextWindows = windows.filter((w) => w.id !== id);
    setWindows(nextWindows);
    if (selectedWindowId === id) {
      setSelectedWindowId(nextWindows[0]?.id || null);
    }
    onUpdateSetup?.({ wallCount, windows: nextWindows });
  };

  const handleUpdateWindowPosition = (id: string, positionPct: number) => {
    const nextWindows = windows.map((w) =>
      w.id === id ? { ...w, positionPct: clamp(positionPct, 10, 90) } : w
    );
    setWindows(nextWindows);
    onUpdateSetup?.({ wallCount, windows: nextWindows });
  };

  const handleUpdateWindowWall = (id: string, wall: 'back' | 'left' | 'right') => {
    const nextWindows = windows.map((w) => (w.id === id ? { ...w, wall } : w));
    setWindows(nextWindows);
    onUpdateSetup?.({ wallCount, windows: nextWindows });
  };

  return (
    <div className={`room-stage-3d-wrapper ${className}`} ref={mountRef}>
      {/* 3D Top Bar: Mode Status + Camera Presets + Space Options */}
      <div className="room-stage-3d-topbar">
        <div className="room-stage-3d-badge">
          <span className="room-stage-3d-badge-dot" />
          {setup.title ? `${setup.title} · ` : ''}Phòng 3D (8m x 8m)
        </div>

        {/* Wall Count & Space Controls */}
        <div className="room-stage-3d-space-controls">
          <div className="room-stage-3d-wall-selector" title="Chọn số mặt tường cho không gian (1 đến 3 tường)">
            <span className="room-stage-3d-wall-label">Mặt tường:</span>
            <button
              type="button"
              className={`room-stage-3d-btn ${wallCount === 1 ? 'room-stage-3d-btn--active' : ''}`}
              onClick={() => handleSetWallCount(1)}
              title="1 mặt tường (Tường sau, không gian mở thoáng)"
            >
              1 tường
            </button>
            <button
              type="button"
              className={`room-stage-3d-btn ${wallCount === 2 ? 'room-stage-3d-btn--active' : ''}`}
              onClick={() => handleSetWallCount(2)}
              title="2 mặt tường (Tường sau + Tường trái, góc Diorama chuẩn)"
            >
              2 tường (Góc)
            </button>
            <button
              type="button"
              className={`room-stage-3d-btn ${wallCount === 3 ? 'room-stage-3d-btn--active' : ''}`}
              onClick={() => handleSetWallCount(3)}
              title="3 mặt tường (Tường sau + Trái + Phải, phòng kín 3 bên)"
            >
              3 tường (Kín 3 bên)
            </button>
          </div>

          <button
            type="button"
            className={`room-stage-3d-btn room-stage-3d-window-toggle-btn ${isSpaceDrawerOpen ? 'room-stage-3d-btn--active' : ''}`}
            onClick={() => setIsSpaceDrawerOpen(!isSpaceDrawerOpen)}
            title="Tùy chỉnh số lượng và kéo vị trí cửa sổ trên tường"
          >
            🪟 Cửa sổ ({windows.length})
          </button>
        </div>

        {/* Camera Presets */}
        <div className="room-stage-3d-camera-presets">
          <button
            type="button"
            className={`room-stage-3d-btn ${activePreset === 'diorama' ? 'room-stage-3d-btn--active' : ''}`}
            onClick={() => applyCameraPreset('diorama')}
            title="Góc nhìn Diorama 3D toàn cảnh"
          >
            📐 Diorama
          </button>
          <button
            type="button"
            className={`room-stage-3d-btn ${activePreset === 'front' ? 'room-stage-3d-btn--active' : ''}`}
            onClick={() => applyCameraPreset('front')}
            title="Góc nhìn chính diện mặt trước"
          >
            🖼️ Mặt trước
          </button>
          <button
            type="button"
            className={`room-stage-3d-btn ${activePreset === 'top' ? 'room-stage-3d-btn--active' : ''}`}
            onClick={() => applyCameraPreset('top')}
            title="Mặt bằng từ trên cao (Top-down)"
          >
            🔝 Mặt bằng
          </button>
          <button
            type="button"
            className={`room-stage-3d-btn ${activePreset === 'eye' ? 'room-stage-3d-btn--active' : ''}`}
            onClick={() => applyCameraPreset('eye')}
            title="Góc nhìn ngang tầm mắt"
          >
            🪑 Tầm mắt
          </button>
        </div>
      </div>

      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className={`room-stage-3d-canvas ${isDraggingCanvas ? 'is-dragging-item' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Snapping Feedback Notification */}
      {snapFeedback && (
        <div className="room-stage-3d-snap-toast" role="status">
          {snapFeedback}
        </div>
      )}

      {/* Floating Space & Window Drawer Modal */}
      {isSpaceDrawerOpen && (
        <div className="room-stage-3d-space-drawer">
          <div className="room-stage-3d-drawer-header">
            <h4 className="room-stage-3d-drawer-title">🪟 Tùy chỉnh cửa sổ trên tường</h4>
            <button
              type="button"
              className="room-stage-3d-drawer-close"
              onClick={() => setIsSpaceDrawerOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="room-stage-3d-drawer-content">
            <div className="room-stage-3d-drawer-desc">
              Kéo thanh trượt hoặc nhấp trực tiếp vào cửa sổ trong phòng 3D để trượt ngang dọc mặt tường.
            </div>

            <div className="room-stage-3d-window-list">
              {windows.map((win, idx) => (
                <div
                  key={win.id}
                  className={`room-stage-3d-window-card ${selectedWindowId === win.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedWindowId(win.id)}
                >
                  <div className="room-stage-3d-window-card-top">
                    <span className="room-stage-3d-window-card-name">
                      Cửa sổ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      className="room-stage-3d-window-card-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWindow(win.id);
                      }}
                      title="Xóa cửa sổ này"
                    >
                      ✕ Xóa
                    </button>
                  </div>

                  {/* Wall selector for this window */}
                  <div className="room-stage-3d-window-row">
                    <label className="room-stage-3d-window-label">Tường gắn:</label>
                    <select
                      className="room-stage-3d-window-select"
                      value={win.wall}
                      onChange={(e) =>
                        handleUpdateWindowWall(win.id, e.target.value as 'back' | 'left' | 'right')
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="back">Tường sau</option>
                      {wallCount >= 2 && <option value="left">Tường trái</option>}
                      {wallCount === 3 && <option value="right">Tường phải</option>}
                    </select>
                  </div>

                  {/* Horizontal Position Slider */}
                  <div className="room-stage-3d-window-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <label className="room-stage-3d-window-label">Vị trí ngang trên tường:</label>
                      <span className="room-stage-3d-window-val">{win.positionPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="1"
                      value={win.positionPct}
                      onChange={(e) =>
                        handleUpdateWindowPosition(win.id, parseInt(e.target.value, 10))
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="room-stage-3d-slider"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="room-stage-3d-add-window-btn"
              onClick={handleAddWindow}
            >
              + Thêm cửa sổ mới vào tường
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD for Selected Window */}
      {selectedWindow && !selectedItem && (
        <div className="room-stage-3d-selected-hud">
          <span className="room-stage-3d-selected-label">
            🪟 Cửa sổ ({selectedWindow.wall === 'back' ? 'Tường sau' : selectedWindow.wall === 'left' ? 'Tường trái' : 'Tường phải'})
          </span>

          <span className="room-stage-3d-hud-elevation-badge">
            Vị trí: {selectedWindow.positionPct}%
          </span>

          <div className="room-stage-3d-hud-divider" />

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleUpdateWindowPosition(selectedWindow.id, selectedWindow.positionPct - 5)}
            title="Trượt sang trái (-5%)"
          >
            ◀ Trái
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleUpdateWindowPosition(selectedWindow.id, selectedWindow.positionPct + 5)}
            title="Trượt sang phải (+5%)"
          >
            Phải ▶
          </button>

          <div className="room-stage-3d-hud-divider" />

          <button
            type="button"
            className="room-stage-3d-hud-btn room-stage-3d-hud-btn--danger"
            onClick={() => handleDeleteWindow(selectedWindow.id)}
            title="Xóa cửa sổ này"
          >
            ✕ Xóa
          </button>
        </div>
      )}

      {/* Floating HUD for Selected Item */}
      {selectedItem && (
        <div className="room-stage-3d-selected-hud">
          <span className="room-stage-3d-selected-label">
            {selectedItem.label || 'Vật phẩm 3D'}
          </span>

          <span
            className="room-stage-3d-hud-elevation-badge"
            title="Độ cao hiện tại so với sàn phòng"
          >
            {(() => {
              const curY = selectedItem.elevation || 0;
              if (curY <= 0.05) return 'Sàn: 0m';
              if (Math.abs(curY - 0.775) <= 0.06 || Math.abs(curY - 0.75) <= 0.06) return 'Mặt bàn (~0.75m)';
              return `Cao: ${curY.toFixed(2)}m`;
            })()}
          </span>

          <div className="room-stage-3d-hud-divider" />

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleAdjustElevation(0.1)}
            title="Nâng cao thêm (+0.1m)"
          >
            ▲ Lên
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleAdjustElevation(-0.1)}
            title="Hạ thấp xuống (-0.1m)"
          >
            ▼ Xuống
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={handleToggleElevation}
            title="Đổi vị trí (Trên bàn / Dưới sàn)"
          >
            ⇅ Bàn / Sàn
          </button>

          <div className="room-stage-3d-hud-divider" />

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleRotateSelected(-45)}
            title="Xoay trái 45°"
          >
            ↺ -45°
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleRotateSelected(45)}
            title="Xoay phải 45°"
          >
            ↻ +45°
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleScaleSelected(0.9)}
            title="Thu nhỏ kích thước"
          >
            - Cỡ
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleScaleSelected(1.1)}
            title="Phóng to kích thước"
          >
            + Cỡ
          </button>

          <div className="room-stage-3d-hud-divider" />

          <button
            type="button"
            className="room-stage-3d-hud-btn room-stage-3d-hud-btn--danger"
            onClick={() => onDeleteItem?.(selectedItem.id)}
            title="Xóa vật phẩm này khỏi phòng 3D"
          >
            ✕ Xóa
          </button>
        </div>
      )}

      {/* Usage Hint */}
      <div className="room-stage-3d-hint">
        Chuột trái: Xoay phòng 3D · Cuộn chuột: Thu phóng · Kéo vật phẩm để kê sát tường/góc · Kéo trực tiếp cửa sổ để trượt vị trí
      </div>
    </div>
  );
}
