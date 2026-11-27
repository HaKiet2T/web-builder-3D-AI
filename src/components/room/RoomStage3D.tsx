'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { RoomItem } from '@/lib/room/types';
import './room-stage-3d.css';

export interface RoomStage3DProps {
  setup: {
    title?: string;
    bgImageUrl?: string;
    aspectRatio?: number;
  };
  items: RoomItem[];
  mode?: 'edit' | 'view';
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onUpdateItem?: (updatedItem: RoomItem) => void;
  onDeleteItem?: (id: string) => void;
  className?: string;
}

type CameraPreset = 'diorama' | 'front' | 'top' | 'eye';

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// Convert 0-100% room coordinates to 3D room floor coordinates (in an 8m x 8m room)
const ROOM_SPAN = 6.2; // Active furniture area within 8m room

function pctToX(pct: number): number {
  return ((pct - 50) / 100) * ROOM_SPAN;
}

function pctToZ(pct: number): number {
  return ((pct - 50) / 100) * ROOM_SPAN;
}

function xToPct(x: number): number {
  const pct = (x / ROOM_SPAN) * 100 + 50;
  return Math.round(clamp(pct, 5, 95) * 10) / 10;
}

function zToPct(z: number): number {
  const pct = (z / ROOM_SPAN) * 100 + 50;
  return Math.round(clamp(pct, 5, 95) * 10) / 10;
}

export function RoomStage3D({
  setup,
  items,
  mode = 'edit',
  selectedItemId = null,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
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
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const itemMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);

  // Dragging state in 3D
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const isDraggingRef = useRef<boolean>(false);
  const draggingItemIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [activePreset, setActivePreset] = useState<CameraPreset>('diorama');
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId) || null;

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
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Directional sunlight coming through corner window
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

    // 6. Build the Square Room (1 Căn phòng hình vuông: tường trắng, nền giữ nguyên màu)
    const roomSize = 8.0;
    const wallHeight = 3.8;
    const wallThickness = 0.15;

    const roomGroup = new THREE.Group();
    roomGroup.name = 'SquareRoomArchitecture';

    // A. Floor (Square with wood parquet finish, giữ nguyên màu)
    const floorGeo = new THREE.BoxGeometry(roomSize, 0.1, roomSize);
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
    const grid = new THREE.GridHelper(roomSize, 16, 0xbcaaa4, 0xe0d6d0);
    grid.position.y = 0.002;
    roomGroup.add(grid);

    // B. Back Wall (Z = -roomSize / 2): Tường trắng trơn
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
    });
    const backWallGeo = new THREE.BoxGeometry(roomSize + wallThickness, wallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, wallHeight / 2, -roomSize / 2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // C. Left Wall (X = -roomSize / 2): Tường trắng trơn
    const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomSize + wallThickness);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    scene.add(roomGroup);

    // 7. Group for interactive items
    const itemMeshesGroup = new THREE.Group();
    itemMeshesGroup.name = 'InteractiveRoomItems';
    scene.add(itemMeshesGroup);
    itemMeshesGroupRef.current = itemMeshesGroup;

    // 8. Selection Box Helper
    const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01));
    const selectionBox = new THREE.BoxHelper(dummyMesh, 0x0284c7);
    selectionBox.visible = false;
    scene.add(selectionBox);
    selectionBoxRef.current = selectionBox;

    // 9. Resize Observer
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

    // 10. Animation Loop
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
    };
  }, []);

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

    // Helper: clean minimalist representation for objects that do not have a 3D GLB file yet
    function createProceduralMesh(item: RoomItem): THREE.Object3D {
      const itemGroup = new THREE.Group();
      const isProduct = item.itemType === 'product';
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

    // Process each room item
    items.forEach((item) => {
      const itemWrapper = new THREE.Group();
      itemWrapper.name = `Item_${item.id}`;
      itemWrapper.userData = { itemId: item.id, item };

      // Determine 3D position on floor
      const x = pctToX(item.xPct);
      const z = pctToZ(item.yPct);
      const y = 0.0;

      itemWrapper.position.set(x, y, z);

      // Rotation around Y axis
      itemWrapper.rotation.y = (item.rotation * Math.PI) / 180;

      // Scale based on widthPct
      const scaleFactor = Math.max(0.4, item.widthPct / 20.0);
      itemWrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Check if customImageUrl is a 3D model (.glb)
      const modelUrl = item.customImageUrl;
      const isGlbModel =
        modelUrl &&
        (modelUrl.toLowerCase().endsWith('.glb') ||
          modelUrl.startsWith('blob:') ||
          modelUrl.includes('/models3d/'));

      if (isGlbModel) {
        gltfLoader.load(
          modelUrl,
          (gltf) => {
            const gltfScene = gltf.scene;

            // Auto-normalize scale and center bounding box
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

            // Enable shadows
            gltfScene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            itemWrapper.add(gltfScene);
          },
          undefined,
          () => {
            // Fallback to procedural model on error
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

    // Update selection box
    if (selectedItemId) {
      const selectedMesh = itemMeshMapRef.current.get(selectedItemId);
      if (selectedMesh && selectionBoxRef.current) {
        selectionBoxRef.current.setFromObject(selectedMesh);
        selectionBoxRef.current.visible = true;
      }
    } else if (selectionBoxRef.current) {
      selectionBoxRef.current.visible = false;
    }
  }, [items, selectedItemId]);

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
    const itemGroup = itemMeshesGroupRef.current;
    if (!raycaster || !itemGroup) return;

    const intersects = raycaster.intersectObjects(itemGroup.children, true);
    if (intersects.length > 0) {
      // Find top-level item wrapper
      let targetObj: THREE.Object3D | null = intersects[0].object;
      while (targetObj && targetObj.parent && targetObj.parent !== itemGroup) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.userData?.itemId) {
        const itemId = targetObj.userData.itemId as string;
        onSelectItem?.(itemId);
        draggingItemIdRef.current = itemId;

        // Setup plane for dragging at the object's current elevation
        const itemElevation = targetObj.position.y;
        dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -itemElevation);

        const planeIntersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlaneRef.current, planeIntersection);
        dragOffsetRef.current.copy(targetObj.position).sub(planeIntersection);

        isDraggingRef.current = true;
        setIsDraggingCanvas(true);

        // Temporarily disable OrbitControls while dragging object
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !draggingItemIdRef.current) return;

    const raycaster = getPointerRaycaster(e);
    if (!raycaster) return;

    const planeIntersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlaneRef.current, planeIntersection)) {
      const newPos = planeIntersection.add(dragOffsetRef.current);
      const targetObj = itemMeshMapRef.current.get(draggingItemIdRef.current);

      if (targetObj) {
        // Clamp within room boundaries
        const clampedX = clamp(newPos.x, -ROOM_SPAN / 2, ROOM_SPAN / 2);
        const clampedZ = clamp(newPos.z, -ROOM_SPAN / 2, ROOM_SPAN / 2);

        targetObj.position.x = clampedX;
        targetObj.position.z = clampedZ;

        if (selectionBoxRef.current) {
          selectionBoxRef.current.setFromObject(targetObj);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If user clicked without moving much and didn't hit an item, deselect
    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    if (dist < 4 && !draggingItemIdRef.current) {
      const raycaster = getPointerRaycaster(e);
      const itemGroup = itemMeshesGroupRef.current;
      if (raycaster && itemGroup) {
        const intersects = raycaster.intersectObjects(itemGroup.children, true);
        if (intersects.length === 0) {
          onSelectItem?.(null);
        }
      }
    }

    if (isDraggingRef.current && draggingItemIdRef.current) {
      const targetObj = itemMeshMapRef.current.get(draggingItemIdRef.current);
      if (targetObj) {
        const finalXPct = xToPct(targetObj.position.x);
        const finalYPct = zToPct(targetObj.position.z);

        const currentItem = items.find((i) => i.id === draggingItemIdRef.current);
        if (currentItem) {
          onUpdateItem?.({
            ...currentItem,
            xPct: finalXPct,
            yPct: finalYPct,
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

  const handleToggleElevation = () => {
    if (!selectedItem) return;
    const mesh = itemMeshMapRef.current.get(selectedItem.id);
    if (!mesh) return;

    // Toggle between Desk top (0.775) and Floor (0.0)
    const isDesk = mesh.position.y > 0.3;
    const targetY = isDesk ? 0.0 : 0.775;
    mesh.position.y = targetY;

    if (selectionBoxRef.current) {
      selectionBoxRef.current.setFromObject(mesh);
    }
  };

  return (
    <div className={`room-stage-3d-wrapper ${className}`} ref={mountRef}>
      {/* 3D Top Bar: Mode Status + Camera Presets */}
      <div className="room-stage-3d-topbar">
        <div className="room-stage-3d-badge">
          <span className="room-stage-3d-badge-dot" />
          {setup.title ? `${setup.title} · ` : ''}Phòng 3D hình vuông (8m x 8m)
        </div>

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
            title="Góc nhìn chính diện bàn làm việc"
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
            title="Góc nhìn ngang tầm mắt (Eye Level)"
          >
            🪑 Góc ngồi
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

      {/* Floating HUD for Selected Item */}
      {selectedItem && (
        <div className="room-stage-3d-selected-hud">
          <span className="room-stage-3d-selected-label">
            {selectedItem.label || 'Vật phẩm 3D'}
          </span>

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
            onClick={handleToggleElevation}
            title="Đổi vị trí (Trên bàn / Dưới sàn)"
          >
            ⇅ Đổi độ cao
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleScaleSelected(0.9)}
            title="Thu nhỏ kích thước"
          >
            - Kích thước
          </button>

          <button
            type="button"
            className="room-stage-3d-hud-btn"
            onClick={() => handleScaleSelected(1.1)}
            title="Phóng to kích thước"
          >
            + Kích thước
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
        Chuột trái: Xoay phòng 3D · Cuộn chuột: Phóng to/nhỏ · Kéo vật phẩm để di chuyển
      </div>
    </div>
  );
}
